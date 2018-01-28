// TODO:
// - Fix ccxt missed trading and funding fees?
// - Handle deposit fee (rare case)

const assert = require('assert');
const chalk = require('chalk');
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
    this.exchange = new ccxt[exchangeName]();
    this.availableCoins = Object.keys(data.coins);
    this.withdrawalFee = {};
    this.availableCoins.forEach((coin) => {
      const { funding } = this.exchange.fees;
      if (funding && funding.withdraw) {
        this.withdrawalFee[coin] = +funding.withdraw[coin.toUpperCase()];
      }
      if (Number.isNaN(+this.withdrawalFee[coin])) {
        console.warn(chalk.gray(`${this.slugname} has no ${coin} funding fee from ccxt`));
        this.withdrawalFee[coin] = +data.coins[coin].withdrawalFee;
      }
      assert(
        !Number.isNaN(+this.withdrawalFee[coin]),
        `${this.slugname} has no withdrawal fee for ${coin.toUpperCase()}.\n` +
        `${JSON.stringify(funding, null, 4)}`,
      );
    });
    this.takerFeePercent = this.exchange.fees.trading.taker * 100;
    assert(
      !Number.isNaN(this.takerFeePercent),
      `${this.slugname} has no trading taker fee.`,
    );
    assert.notStrictEqual(
      this.exchange.fees.trading.percentage,
      false,
      `${this.slugname} trade fee is not percentage.`,
    );
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
    // If fromCoin and toCoin are of same currency, no convert is needed.
    if (fromAsset.coin === toCoin) {
      return fromAsset;
    }

    // Find available pairs in this exchnage.
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
        transactions: [...fromAsset.transactions, {
          id: `${Date.now()}-${`${Math.floor(Math.random() * 999999)}`.padStart(6, '0')}`,
          direction,
          pairName,
          rate: direction === 'buy'
            ? fromAsset.amount / amount
            : amount / fromAsset.amount,
          amount,
        }],
      });
    }

    // If no pair is found, try bridging the conversion with an intermediate
    // coin.
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
    if (fee == null) throw new Error(`No ${asset.coin} withdrawal fee`);
    return new Asset({
      coin: asset.coin,
      amount: asset.amount - fee,
      transactions: [...asset.transactions],
    });
  }

  deposit({ asset }) {
    const coin = asset.coin.toLowerCase();
    let fee = this.depositFee ? this.depositFee[coin] : null;
    if (fee == null) fee = 0;
    return new Asset({
      coin: asset.coin,
      amount: asset.amount - fee,
      transactions: [...asset.transactions],
    });
  }

  async fetchTickers({ base = 'usd', _replace = true }) {
    await Promise.all(this.availableCoins
      .filter(coin => coin !== base)
      .map(coin => this.fetchTicker({ coin, base, _replace })));
  }

  async fetchTicker({ coin, base, _replace = true }) {
    const symbol = `${coin}/${base}`.toLowerCase();
    if (!_replace && this.pairs[symbol]) return;
    const book = await this.exchange.fetchOrderBook(symbol.toUpperCase());
    this.pairs[symbol] = {
      bids: book.bids,
      asks: book.asks,
    };
  }
}

module.exports = Exchange;
