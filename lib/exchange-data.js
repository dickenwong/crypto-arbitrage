module.exports = {
  bitfinex: {
    coins: {
      btc: { withdrawalFee: 0.00008 },
      eth: { withdrawalFee: 0.0099225 },
      bch: { withdrawalFee: 0.0001 },
      btg: { withdrawalFee: 0 },
      xrp: { withdrawalFee: 0.2 },
      zec: { withdrawalFee: 0.001 },
    },
    takerFeePercent: 0.2,
  },

  bitstamp: {
    coins: {
      btc: { withdrawalFee: 0 },
      eth: { withdrawalFee: 0 },
      ltc: { withdrawalFee: 0 },
      bch: { withdrawalFee: 0 },
      xrp: { withdrawalFee: 0 },
    },
    takerFeePercent: 0.25,
  },

  cex: {
    coins: { // Fee unknown; Copy from Bitfinex
      btc: { withdrawalFee: 0.0008 },
      eth: { withdrawalFee: 0.0099225 },
      bch: { withdrawalFee: 0.0001 },
      btg: { withdrawalFee: 0 },
      xrp: { withdrawalFee: 0.2 },
      zec: { withdrawalFee: 0.001 },
    },
    takerFeePercent: 0.25,
  },

  poloniex: {
    coins: {
      btc: { withdrawalFee: 0.00050000 },
      eth: { withdrawalFee: 0.01000000 },
      bch: { withdrawalFee: 0.00010000 },
      ltc: { withdrawalFee: 0.00100000 },
      xrp: { withdrawalFee: 0.15000000 },
    },
    takerFeePercent: 0.25,
  },

  exmo: {
    coins: {
      btc: { withdrawalFee: 0.001 },
      eth: { withdrawalFee: 0.01 },
      bch: { withdrawalFee: 0.001 },
      ltc: { withdrawalFee: 0.01 },
      xrp: { withdrawalFee: 0.02 },
      zec: { withdrawalFee: 0.001 },
    },
    takerFeePercent: 0.2,
  },
};
