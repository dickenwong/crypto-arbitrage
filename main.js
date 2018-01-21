const { argv } = require('yargs');
const chalk = require('chalk');
const Asset = require('./Asset');
const Exchange = require('./Exchange');
const arbitrage = require('./arbitrage');


async function allCombinations({
  exchange1,
  exchange2,
  initialCoin = 'usd',
  bridgingCoin = 'usd',
  initialAmount = 10000,
}) {
  await Promise.all([
    exchange1.fetchTickers({ base: initialCoin }),
    exchange2.fetchTickers({ base: bridgingCoin }),
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
      console.log(chalk[asset.amount - initialAmount > 0 ? 'green' : 'red'](
        `${coin.toUpperCase()} <--> ${baseCoin.toUpperCase()} `,
        `${((asset.amount / initialAmount - 1) * 100).toFixed(2)}%`,
      ));
    });
  });
}


if (!argv.exchange1) throw new Error('missing --exchange1');
if (!argv.exchange2) throw new Error('missing --exchange2');

const exchange1 = new Exchange(argv.exchange1);
const exchange2 = new Exchange(argv.exchange2);
const initialCoin = argv.initialCoin || 'usd';
const bridgingCoin = argv.bridgingCoin || 'usd';

allCombinations({
  exchange1,
  exchange2,
  initialCoin,
  bridgingCoin,
}).catch(console.error);
