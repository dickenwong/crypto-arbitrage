const ccxt = require('ccxt');
const ExtendableError = require('es6-error');
const Asset = require('./Asset');
const exchangeData = require('./exchange-data');


class InvalidPair extends ExtendableError {}


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

  convert({ fromAsset, toCoin, bridgingCoin }) {
    /**
     * TODO:
     * - Handle slippage
     */
    const fromCoin = fromAsset.coin;
    if (fromCoin === toCoin) {
      return fromAsset;
    }
    let pairName = `${toCoin}/${fromCoin}`.toLowerCase();
    if (this.pairs[pairName]) {
      const ask = this.pairs[pairName].asks[0][0];
      const amount = fromAsset.amount / ask * (1 - this.takerFeePercent / 100);
      return new Asset({ coin: toCoin, amount });
    }
    pairName = `${fromCoin}/${toCoin}`.toLowerCase();
    if (this.pairs[pairName]) {
      const bid = this.pairs[pairName].bids[0][0];
      const amount = fromAsset.amount * bid * (1 - this.takerFeePercent / 100);
      return new Asset({ coin: toCoin, amount });
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
    /**
     * TODO:
     * -  fetch order book instead of simple ticker
     *    to handle slippage.
     */
    const exchange = new ccxt[this.slugname]();
    const symbols = this.availableCoins
      .filter(coin => coin !== base)
      .map(coin => `${coin}/${base}`.toUpperCase());
    const pairs = await Promise
      .all(symbols.map(symbol => exchange.fetchTicker(symbol.toUpperCase())));
    pairs.forEach((pair) => {
      const { symbol, ask, bid } = pair;
      this.pairs[symbol.toLowerCase()] = {
        bids: [[+bid, Infinity]],
        asks: [[+ask, Infinity]],
      };
    });
  }
}

module.exports = Exchange;
