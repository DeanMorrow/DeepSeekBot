---
section: Added
---

## en

- The Host can read one configured ops catalog for the authenticated Owner. `deepseekbot catalog` and `catalog-open` use `catalogView` and `catalogOpen`. A registered Bot opens the same metadata with `pack_catalog_open` and an opaque `entryRef`; that tool does not use the Owner bridge. A registry without `display.audiences` stays unauthorized, and a missing source stays unreachable ([#1](https://github.com/DeanMorrow/DeepSeekBot/pull/1)).

## zh

- Host 可以按已认证 Owner 读取一份显式配置的全局清单。`deepseekbot catalog` 和 `catalog-open` 分别调用 `catalogView` 和 `catalogOpen`。已登记 Bot 用 `pack_catalog_open` 和不透明的 `entryRef` 打开同一份元数据，不走 Owner 桥。正式 registry 没有 `display.audiences` 时保持未授权，源缺失时保持不可达（[#1](https://github.com/DeanMorrow/DeepSeekBot/pull/1)）。
