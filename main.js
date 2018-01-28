const { argv } = require('yargs');
const chalk = require('chalk');
const Asset = require('./lib/Asset');
const Exchange = require('./lib/Exchange');
const arbitrage = require('./lib/arbitrage');


async function main({
  exchange1,
  exchange2,
  initialCoin = 'usd',
  bridgingCoin = 'usd',
  initialAmount = 10000,
}) {
  console.log(chalk.yellow(`${exchange1.slugname} <--> ${exchange2.slugname}`));
  console.log('Date: ', (new Date()).toISOString());
  console.log(`Principal: ${initialCoin.toUpperCase()} ${initialAmount}`);

  await Promise.all([
    exchange1.fetchTickers({ base: initialCoin, _replace: false }),
    exchange2.fetchTickers({ base: bridgingCoin, _replace: false }),
  ]);

  const coins = exchange1.availableCoins
    .filter(coin => exchange2.availableCoins.includes(coin));
  coins.forEach((coin) => {
    coins.forEach((baseCoin) => {
      if (coin === baseCoin) return;
      const initialAsset = new Asset({ coin: initialCoin, amount: initialAmount });
      const asset = arbitrage({
        exchange1,
        exchange2,
        coin,
        baseCoin,
        initialAsset,
        bridgingCoin,
      });
      const profit = asset.amount - initialAmount;
      const msg = (
        `${coin.toUpperCase()} <--> ${baseCoin.toUpperCase()} ` +
        `${(profit / initialAmount * 100).toFixed(2)}%`
      );
      console.log(chalk[profit > 0 ? 'green' : 'red'](msg));
      if (profit > 0) {
        console.log(asset.getTransactionLog());
      }
    });
  });
}


if (require.main === module) {
  if (!argv.exchange1) throw new Error('missing --exchange1');
  if (!argv.exchange2) throw new Error('missing --exchange2');

  const exchange1 = new Exchange(argv.exchange1);
  const exchange2 = new Exchange(argv.exchange2);
  const initialCoin = (argv.initialCoin || 'usd').toLowerCase();
  const bridgingCoin = (argv.bridgingCoin || 'usd').toLowerCase();

  main({
    exchange1,
    exchange2,
    initialCoin,
    bridgingCoin,
    initialAmount: argv.initialAmount || 1000,
  }).catch(console.error);
}

module.exports = { main };
