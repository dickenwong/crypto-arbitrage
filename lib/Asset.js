const Table = require('cli-table');


class Asset {
  constructor({ coin, amount, transactions }) {
    this.coin = coin;
    this.amount = amount;
    this.transactions = transactions || [];
  }

  toString() {
    return `${this.amount.toFixed(4)} ${this.coin}`;
  }

  getTransactionLog() {
    const table = new Table({
      // head: ['Exchange', 'Direction', 'Symbol', 'Rate', 'Amount'],
      chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    });
    const rows = this.transactions.map(transaction => [
      transaction.exchange,
      transaction.direction.toUpperCase(),
      transaction.pairName.toUpperCase(),
      +transaction.rate.toFixed(6),
      +transaction.amount.toFixed(6),
    ]);
    table.push(...rows);
    return table.toString();
  }
}

module.exports = Asset;
