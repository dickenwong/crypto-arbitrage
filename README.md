# crypto-arbitrage


This repo is to figure out if one can profit by doing following steps:
1. Convert **10,000 USD** to **Coin X** in *Exchange 1*.
2. Transfer **Coin X** to *Exchange 2*.
3. Convert **Coin X** to **Coin Y** in *Exchange 2*.
4. Transfer **Coin Y** to *Exchange 1*.
5. Convert **Coin Y** back to **USD** in *Exchange 1*.


---
## Command:
```sh
node main.js \
    --exchange1=<Exchange1> \
    --exchange2=<Exchange2> \
    --initialCoin=usd\
    --bridgingCoin=usd

# Currently supported exchanges:
# - bitfinex
# - bitstamp
# - cex
# - exmo
```

| Params | Explanation |
|---|---|
| --exchange1 | Name of *Exchange 1* |
| --exchange2 | Name of *Exchange 2* |
| --initialCoin | (Default: usd) The currency spent to buy **Coin X** in *Exchange 1* |
| --bridgingCoin | (Default: usd) The bridging currency used to convert **Coin X** to **Coin Y** in *Exchange 2* |


---
## Result:
The format is `[CoinX] <--> [CoinY]  %Profit`. For example:
```sh
BCH <--> ZEC  -3.15%  # Lose 3.15%
BTG <--> BTC  1.37%   # Earn 1.37%

# Note that trade fee and withdrawal fee are considered.
```



---
## Notes:
* Tickers are fetched by **cctx** (a great package for cryptocurrency data).
* Slippage is neglected in this calculation.
* Transaction time is also neglected.
* More profit can be achieved by lowering exchange trade fee (i.e. by a larger principal).
* In fact, such arbitrage opportunity happen rarely. This repo somehow proves it is not the best money-making method.
