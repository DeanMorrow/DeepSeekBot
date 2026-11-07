# 本轮评分卡

版本：`2026-11-06.2`。这不是交付闸的通过分，也不把任何百分比写成已经提升。

## 这一轮要证明的

宿主工具用会话里的 Bot 身份读写私有记忆，共享只进有效 Workspace Grant，迁移和回滚只动该 Bot 的 Memory。命令行不能伪造身份。

## 已测

Linux 上的测试执行器调用了 `runDirectBotTool`。没有调用付费模型，也没有 Windows 实测。

## 不能记成完成

super-agent 的规划、派工、执行、汇总还没有在活 Host 上跑通。下一步入口是 `create_assignment`，依赖 `list_workspace_grants` 的真实 grant 和另一个独立执行上下文。没有第二次 run 证据，交付闸不通过。
