---
name: super-agent
description: 每个 Bot 的规划与子任务入口。只借鉴官方原型的限额和审批边界，不是 dsh-superagent 整包，也不切换 Bot 预设。
whenToUse: 要把一件事拆开并交给有限的子任务时加载。不要用它接 GitHub 或飞书，也不要声称原型已经安装。
---

# 只借鉴纪律，不是整包

准确来源是 `deepseek-ai/dsh-superagent-prototype`，提交 `6337fc823ce20251c8de8085948165c81aaa701e`，MIT，tag 未知。它在该提交的 README 里写明是 DeepSeek Harness 的 bundle 研究原型，不是正式产品，也不是一份技能文件。

该提交的部署文档要求：单独的 `superagent` 档案、先构建、再用 `dsh plugin --profile superagent add "link:…"` 接上。`package.json` 声明宿主 `^0.2.1-alpha.2`，例子是 `0.2.1-rc.3`。本机 `0.2.2-alpha.2` 没有按这条路径实测。

同一文档写明：`dsh-superagent-router` 和 `dsh-superagent-worker` 以 `danger-full-access` 用操作系统用户跑，插件还会改进程 PATH 和 git。授权文档管的是谁可以开工、Mandate 和策略版本。执行文档管的是 Ticket、工人槽位和汇总。这些都依赖那套 bundle。

本 Bot 没有安装那套 bundle，也没有把预设改成 router 或 worker。仓库里的 `bot_subagent`、本仓库未提供的 oar、以及 Agent Teams，都不是这个原型。把 `SKILL.md` 放进记忆，不等于装完。

可调用入口是 Host 工具 `super_agent_run`。它把任务拆成最多 3 段，经现有 Assignment 创建发出。深度最多 2，同时最多 2 个，总共最多 3 次。没有有效 Workspace Grant 时拒绝，不创建子任务。子任务不继承私有记录。不接 GitHub，不接飞书，不打开 Panel，不自动合并，不换 danger-full-access preset。

这不是原型整包已安装。`fullBundleInstalled` 必须是 false，`adaptation` 是 `tobs-assignment`。离线测试执行器不是活模型实派工。
