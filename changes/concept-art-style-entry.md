---
section: Added
---

## en

- Added Concept art on the Bot chat and `deepseekbot concept-art open`, `styles`, and `generate-style`. Concept art is also registered in the existing Bot sidebar, in the same entry list as memory and sessions. The image route receives the raw requirement plus a selected style, or one held model addition after the user accepts that same proposal. Changing the requirement, Bot, or cancelling drops the old proposal. A rejected confirmation stays on the page and is not sent again until the user confirms. Accepting an addition does not mean the original requirement was optimized faithfully. The page shows and saves the bytes read back from the attachment store. `mediaVerified` stays false ([#1](https://github.com/DeanMorrow/DeepSeekBot/pull/1)).

## zh

- 在 Bot 对话里加入概念图，并提供 `deepseekbot concept-art open`、`styles` 和 `generate-style`。概念图同时登记在既有 Bot 侧栏，和记忆、会话用同一份入口表。图像路由只提交原始需求加已选风格；模型多写的一条提案要用户确认这条本身后才提交。需求、Bot 变了或已取消，旧提案不会送出。确认被拒绝后按钮仍在，不会自动再送。接受补充不等于原始需求已被忠实优化。页面展示并保存从附件库读回的字节。`mediaVerified` 仍为 false（[#1](https://github.com/DeanMorrow/DeepSeekBot/pull/1)）。
