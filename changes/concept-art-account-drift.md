---
section: Fixed
---

## en

- Switching API易 accounts no longer looks like the saved lock moved when two accounts share a model name. A lock taken from the Models page is checked again before a call, and `save-route` no longer stores a new key when that page is readable ([#1](https://github.com/DeanMorrow/DeepSeekBot/pull/1)).

## zh

- 两个 API易 账户有同名模型时，切换账户不再看起来像已经换了锁。从「模型」页绑定的锁会在调用前再核对，宿主能读到该页时 `save-route` 不再写入新密钥（[#1](https://github.com/DeanMorrow/DeepSeekBot/pull/1)）。
