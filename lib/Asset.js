class Asset {
  constructor({ coin, amount }) {
    this.coin = coin;
    this.amount = amount;
  }

  toString() {
    return `${this.amount.toFixed(4)} ${this.coin}`;
  }
}

module.exports = Asset;
