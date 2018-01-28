/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */

const { argv } = require('yargs');
const Exchange = require('./lib/Exchange');
const { main } = require('./main');


async function all() {
  const exchanges = [
    { exchange: new Exchange('bitfinex'), base: 'usd' },
    { exchange: new Exchange('bitstamp'), base: 'usd' },
    { exchange: new Exchange('cex'), base: 'usd' },
    { exchange: new Exchange('poloniex'), base: 'btc' },
    // { exchange: new Exchange('exmo'), base: 'usd' },
    { exchange: new Exchange('binance'), base: 'btc' },
    { exchange: new Exchange('gatecoin'), base: 'btc' },
  ];

  for (const { exchange: exchange1, base: initialCoin } of exchanges) {
    if (initialCoin !== 'usd') continue;
    for (const { exchange: exchange2, base: bridgingCoin } of exchanges) {
      if (exchange1 === exchange2) continue;
      await main({
        exchange1,
        exchange2,
        initialCoin,
        bridgingCoin,
        initialAmount: argv.initialAmount || 1000,
      }).catch(console.error); // Catch here to skip buggy exchange
      console.log('\n');
    }
  }
}


if (require.main === module) {
  all().catch(console.error);
}

module.exports = { all };
