function arbitrage({
  exchange1,
  exchange2,
  coin,
  baseCoin,
  initialAsset,
  bridgingCoin = 'usd',
}) {
  let asset = exchange1.convert({ fromAsset: initialAsset, toCoin: coin });
  asset = exchange1.withdraw({ asset });
  asset = exchange2.deposit({ asset });
  asset = exchange2.convert({ fromAsset: asset, toCoin: baseCoin, bridgingCoin });
  asset = exchange2.withdraw({ asset });
  asset = exchange1.deposit({ asset });
  asset = exchange1.convert({ fromAsset: asset, toCoin: initialAsset.coin });
  return asset;
}

module.exports = arbitrage;
