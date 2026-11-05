---
name: super-agent
description: 每个 Bot 都要带的规划与子任务契约。官方 dsh-superagent 原型没有装进本 Bot。编排会话用已有的 create_assignment，不把 subagent 工具当成已经启用。
whenToUse: 要把一件事拆开、交给独立子任务、再汇总结果时加载。不要用它声称官方 super-agent 包已经安装。
---

# super-agent 契约

用户要的是 DeepSeek 开源的 `deepseek-ai/dsh-superagent-prototype`（MIT，研究原型，不是正式产品）。它不是商业 SuperAGI，也不是某一个 Bot 人设。

那个原型是单独的 DSH 档案包：自己的 `dsh-superagent-router` 和 `dsh-superagent-worker`，看一个 GitHub 仓库，工人会话以操作系统用户身份跑命令且默认不再次审批，还会改进程里的 PATH 和 git。官方说明要求放在独立档案，不要和日常档案混用。

Tobs 的 Bot 预设已经换成自己的执行方式：编排会话禁止直接启动 `bot_subagent` / `subagent`，要拆工作必须用 `create_assignment`。子任务只在派工会话里才能再开。仓库里有这些工具，不等于每个 Bot 已经启用官方 super-agent。

所以本文件只记录契约，`officialInstalled` 固定为 false。不要改 Bot 的执行核，也不要把它的权限放大到不审批。

## 能做的

用 `node bin/adapt.mjs super-agent-plan --task "..."` 把任务拆成最多 3 段。深度最多 2，同时最多 2 个，总共最多 3 次调用。再深就拒绝，避免无限往下派。

真正开工时，编排会话只调用已有的 `create_assignment`。子任务只拿这次授权的工作区，不继承私有复盘。没有返回调用编号，就不能写成已经调用。

汇总之后仍要走 delivery-gate。子任务跑完不等于审查通过。

活 Host 上还要用 `bot-tools` 看 `create_assignment` 是否真的在目录里，并留下一次真实调用编号。没有编号，这份 Bot 的调用证据就是未测。
