/**
 * TODO:
 * - use trading and funding fee from ccxt?
 */

const ccxt = require('ccxt');
const ExtendableError = require('es6-error');
const Asset = require('./Asset');
const exchangeData = require('./exchange-data');

const debug = (...args) => {
  if (process.env.DEBUG) console.log(...args);
};


class InvalidPair extends ExtendableError {}
class NotEnoughDepth extends ExtendableError {}


class Exchange {
  constructor(exchangeName) {
    const data = exchangeData[exchangeName];
    this.slugname = exchangeName;
    this.availableCoins = Object.keys(data.coins);
    this.withdrawalFee = {};
    this.availableCoins.forEach((coin) => {
      this.withdrawalFee[coin] = data.coins[coin].withdrawalFee;
    });
    this.takerFeePercent = data.takerFeePercent;
    this.pairs = {};
    /**
     * The above initiation is doing things like this:
     *
     * this.slugname = 'bitfinex';
     * this.availableCoins = ['btc', 'eth'];
     * this.withdrawalFee = {
     *   btc: 0.0008,
     *   eth: 0.0099225,
     * };
     * this.takerFeePercent = 0.25;
     */
  }

  _getAvailableToAssetAmount({
    pair,
    pairName,
    direction,
    fromAssetAmountLeft,
    toAssetAmountCumulated = 0,
    bookDepth = 0,
  }) {
    const record = direction === 'buy'
      ? pair.asks[bookDepth]
      : pair.bids[bookDepth];
    if (!record) {
      throw new NotEnoughDepth(
        `${this.slugname} ${pairName} has no depth ${bookDepth}.`
      );
    }
    const rate = direction === 'buy' ? record[0] : (1 / record[0]);
    const size = direction === 'buy' ? record[1] : record[1] / rate;
    const maxCanBuyAmount = fromAssetAmountLeft / rate;
    debug(
      `[Depth ${bookDepth}]\t` +
      `Rate=${rate}\t` +
      `Size=${size}\t` +
      `MaxAmount=${maxCanBuyAmount}\t` +
      `MoneyLeft=${fromAssetAmountLeft}\t` +
      `AmountStacked=${toAssetAmountCumulated}\t`
    );
    if (maxCanBuyAmount <= size) {
      toAssetAmountCumulated += maxCanBuyAmount;
      return toAssetAmountCumulated;
    }
    return this._getAvailableToAssetAmount({
      pair,
      pairName,
      direction,
      fromAssetAmountLeft: fromAssetAmountLeft - size * rate,
      toAssetAmountCumulated: toAssetAmountCumulated + size,
      bookDepth: bookDepth + 1,
    });
  }

  findPair({ fromCoin, toCoin }) {
    let pairName = `${toCoin}/${fromCoin}`.toLowerCase();
    if (this.pairs[pairName]) {
      return { direction: 'buy', pairName, pair: this.pairs[pairName] };
    }
    pairName = `${fromCoin}/${toCoin}`.toLowerCase();
    if (this.pairs[pairName]) {
      return { direction: 'sell', pairName, pair: this.pairs[pairName] };
    }
    return {};
  }

  convert({ fromAsset, toCoin, bridgingCoin }) {
    if (fromAsset.coin === toCoin) {
      return fromAsset;
    }
    const { pair, pairName, direction } = this.findPair({
      fromCoin: fromAsset.coin,
      toCoin,
    });
    if (pair && direction) {
      debug(`===> Found a pair ${pairName} to ${direction}`);
      const amount = this._getAvailableToAssetAmount({
        pair,
        pairName,
        direction,
        fromAssetAmountLeft: fromAsset.amount,
      });
      debug(`===> Final: ${amount} ${toCoin}`);
      return new Asset({
        coin: toCoin,
        amount: amount * (1 - this.takerFeePercent / 100),
      });
    }
    if (bridgingCoin &&
        fromAsset.coin !== bridgingCoin &&
        toCoin !== bridgingCoin) {
      const asset = this.convert({ fromAsset, toCoin: bridgingCoin });
      return this.convert({ fromAsset: asset, toCoin });
    }
    throw new InvalidPair(`No ${pairName} in this exchange`);
  }

  withdraw({ asset }) {
    const fee = this.withdrawalFee[asset.coin.toLowerCase()];
    if (fee == null) throw new Error('No such coin in this exchange');
    return new Asset({
      coin: asset.coin,
      amount: asset.amount - fee,
    });
  }

  deposit({ asset }) {
    const coin = asset.coin.toLowerCase();
    let fee = this.depositFee ? this.depositFee[coin] : null;
    if (fee == null) fee = 0;
    return new Asset({
      coin: asset.coin,
      amount: asset.amount - fee,
    });
  }

  async fetchTickers({ base = 'usd' }) {
    const exchange = new ccxt[this.slugname]();
    const symbols = this.availableCoins
      .filter(coin => coin !== base)
      .map(coin => `${coin}/${base}`.toUpperCase());

    const promises = symbols.map(async (symbol) => {
      const book = await exchange.fetchOrderBook(symbol.toUpperCase());
      this.pairs[symbol.toLowerCase()] = {
        bids: book.bids,
        asks: book.asks,
      };
    });
    await Promise.all(promises);
  }
}

module.exports = Exchange;
