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
    const logs = this.transactions.map(({
      direction,
      pairName,
      rate,
      amount,
    }) => (
      `direction=${direction}\tpair=${pairName.toUpperCase()}\t` +
      `rate=${+rate.toFixed(6)}\tamount=${amount}`
    ));
    return logs.join('\n');
  }
}

module.exports = Asset;
