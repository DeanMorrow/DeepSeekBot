# direct-bot-tools 集合契约修订

旧断言 `listed.every(name => BOT_TOOL_NAMES)` 仍以红日志保留，不改成期望 `false`，也不把 `super_agent_seal` 加回免审名单。

`BOT_TOOL_NAMES` 的生产消费者是 `grantToolExecutionDenial`：命中就跳过后面的人工批准分支。它不是全部可见工具。

新契约把三件事分开：

- 可见：`directBotTools()` 列出的名字，包含 `pack_catalog`、`pack_catalog_open` 和 `super_agent_seal`。
- 相对免审：可见名字与 `BOT_TOOL_NAMES` 的交集仍按原来的豁免过滤对齐。
- 显式受审：可见但不在免审名单里的名字，必须 `requiresHumanToolApproval` 为真，并且 `grantToolExecutionDenial` 在没有 `allowedOnce` 时返回 `<name> requires Human approval`。`allowedOnce` 只打开这一闸，不是真人点过卡片。

`super_agent_seal` 必须同时满足：可见、不在免审名单、`requiresHumanToolApproval` 为真。

`pack_catalog_open` 的可见性和 `entryRef` schema 留在这个列表测试里。打开结果不含正文的行为仍由 `catalog-auth-v1.test.ts` 覆盖。

`super-agent-seal-approval-mock.test.ts` 使用测试夹具里的合成 Grant。它调用 `noteSuperAgentApproval`，这是 Host 拦截器在 `allowed-once` 之后写的记录，不是真人界面。有效合成 Grant 但没有这条记录时不写工作单。伪造 token 拒绝。记录对上之后只成功一次；另一个会话重放失败。另一个 Bot 因为不是这条记录的 Grant 而拒绝，并且不消耗记录。
