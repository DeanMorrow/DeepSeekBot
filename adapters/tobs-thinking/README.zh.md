# 思考与排错适配包

给已经装好的 Tobs 1.6.1 用。不升级、不降级 DSH，不改 Electron，不换头像，不换 IDE，也不往用户自己的技能目录里写文件。

## 版本

本仓库没有 `v1.6.1` 标签。更新日志写着 1.6.1 之后还没有新的发布条目，但 `main` 在 2026-11-02 之后仍有提交，所以不能把现在的 `main` 当成你机器上的 1.6.1。

这个目录不要求你安装本仓库编译出来的 Tobs。它使用 1.6.1 已经有的两件事：

- `tobs create --from-dir`、`--from-zip`、`--from-git`
- PersonaBot 预设 `deepseekbot` 重新挂上的技能目录和 `skill` 工具

宿主顶层把 filesystem / tool-skill 关掉，不影响这条预设。所以这里不另写一套加载器，也不改 `cordis.patch.yml`。

你的 DSH 是 `0.2.2-alpha.2`。Tobs 文档里验证过的是 `0.2.0-rc.2`、`0.2.1-rc.2`、`0.2.1-rc.3`。alpha.2 不在这份名单里。种子按当前技能目录规则放置：会话工作目录所属项目根下的 `.dsh/skills/<名字>/SKILL.md`。`tobs create` 会给这份 Memory 单独建一个 Git 仓库，项目根就是 Memory 自己。如果只把文件放进另一个仓库的子目录，扫描会去看外层仓库，这些技能不会挂上。和 Bot 私聊时，会话就开在这份 Memory 里，所以技能有资格出现在目录中。派去工作区里干活的会话，工作目录是那个授权文件夹，技能扫描跟的是那里，不是 Memory。灵魂文字仍可能被放进提示，但那不等于技能正文已经读到。导入之后必须用活 Bot 实测，不能靠目录算通过。

## super-agent

准确来源是 `deepseek-ai/dsh-superagent-prototype` 的提交 `6337fc823ce20251c8de8085948165c81aaa701e`（MIT，tag 未知）。该提交的 README 把它写成 DeepSeek Harness 的 bundle 研究原型。部署文档的安装是：单独的 `superagent` 档案、`pnpm build`、再 `dsh plugin --profile superagent add "link:…"`。`package.json` 声明宿主 `^0.2.1-alpha.2`，文档例子是 `0.2.1-rc.3`。本机 `0.2.2-alpha.2` 没有按这条路径实测。

同一部署文档写明：`dsh-superagent-router` 和 `dsh-superagent-worker` 以 `danger-full-access` 运行，插件改进程 PATH 和 git。授权文档管允许名单和 Mandate。执行文档管 Ticket、工人槽位和汇总。飞书源默认在补丁里关掉，但整包仍包含它。这些都不是往记忆里放一个 `SKILL.md` 就能装上的。

不能把每个 Tobs Bot 的预设改成 router 或 worker，否则会换掉现有 Bot 配置、审批和目录权限。`bot_subagent`、本仓库没有的 oar、以及 Agent Teams，都不是这个原型。

因此这里没有安装整包，也没有接 GitHub、飞书、Panel 或自动合并。每个新种子和被点名迁移的旧 Bot 只带一份纪律入口：`node bin/adapt.mjs super-agent-plan`。状态命令必须报 `adaptation: discipline-only` 和 `fullBundleInstalled: false`。限额是深度 2、同时 2 个、一共 3 次。子任务不继承私有记录，审批仍用 Tobs 现有的工作区授权和写生产代码前的明确确认。

本环境没有活 Bot。种子「思考基线」有入口，没有真实调用编号。未迁移的 Bot 没有这份入口。

## 安装一个新 Bot

在放着本仓库的机器上，进入 `adapters/tobs-thinking`。默认种子是 `seed`。代码岗先复制额外技能再创建：

```text
node pack.mjs 某个空目录/default.zip
node pack.mjs --code 某个空目录/code.zip
```

也可以不打包，直接用 `seed` 目录。

在装了 Tobs 1.6.1 的机器上：

```text
tobs create --name 验收思考 --from-dir seed的绝对路径
```

或：

```text
tobs create --name 验收思考 --from-zip 打出来的.zip
```

不要把整个 DeepSeekBot 仓库当 `--from-dir`。不要加 `--avatar-file`。不要把文件放进 `~/.dsh/skills` 或 `~/.agents/skills`，那会碰到所有会话，也会碰到你原有的技能树。

`config-surface/bot-seed/skills/*.md` 这种平铺文件不在扫描范围内。文件在那里，不等于技能目录里已经有它。

灵魂和核心记忆会在每个新会话里注入，上限大约 5000 和 3000 字。长流程在技能文件里，Bot 要用 `skill` 工具按名字读取。写在灵魂里不等于已经读过。

## 指定旧 Bot

只对那一个 Bot 的 Memory 目录执行：

```text
node seed/bin/adapt.mjs migrate --seed seed的绝对路径 --target 该Bot的Memory目录
```

这只补充还没有的技能目录，不改它的 `SOUL.md` 和 `MEMORY.md`，也不写其他 Bot。代码岗再把 `extras/ecc-code-baseline` 拷进该 Memory 的 `.dsh/skills/ecc-code-baseline`。

## 回滚

新 Bot：用 Tobs 自己的删除确认删掉这一个 Bot。

旧 Bot：

```text
node seed/bin/adapt.mjs rollback --target 该Bot的Memory目录
```

只删除本包的五个技能目录名。别的技能、灵魂、核心记忆和私有记录都留着。

## 记忆怎么分

私有复盘放在该 Bot 自己的 Memory，例如 `memory/private-bank.json`。另一个 Bot 的会话读不到这条路径：编排会话只能读自己的 Memory，外加已经批准的工作区。这是现成的路径检查，不是“文件夹起了不同的名字”。

共享教训放在双方工作区授权都能读到的文件里，而且只能是批准过、去掉私聊之后的项目事实。发布命令会拒绝私聊原文。审查时只拿命令返回的短材料。

不要把私聊放进按代码仓库共享的外部记忆库。

任务前：

```text
node bin/adapt.mjs recall --actor 当前Bot --private memory/private-bank.json --shared 共享文件 --task "任务提要"
```

这条命令要在该 Bot 的 Memory 目录里运行，因为 `bin` 会跟着种子进 Memory。

## 交付闸

记录写成 JSON，交给：

```text
node bin/adapt.mjs gate --record 记录.json
```

固定评分是 `2026-11-06.1`，正确 40、证据 25、安全 20、完整 15，满分 100。置信度要高于 80，并且写明证据。它不是概率。每一轮要比上一版至少高 5%。96 分再加到 100 分不够 5%，即使写了“没有更好的办法”，结果仍然是不通过。不要抬高满分，也不要改低基线。最多 3 轮。进度和审查消息本身不能当成成果。审批不能跳过。

改生产代码前，确认语只能是「开工」「按这个改」或「可以动手」。

## 活 Bot 上的加载探针

创建并打开这个 Bot 之后，在连着同一个 Host 的机器上：

```text
tobs bot-tools --host 你的Host
tobs bot-tool 验收Bot的id skill --args-stdin --host 你的Host
```

第二步的 JSON 字段必须抄 `bot-tools` 打印出来的 `skill` 输入说明。不要猜字段名。返回正文里能看到技能名字，才算加载通过。

本仓库当前的 `main` 源码里，`bot-tools` 只列出 Tobs 自己的直接工具，原生 `skill` 不在这份清单里，直接调用会得到 `tool-not-direct`。你机器上的 1.6.1 以当时的真实输出为准。如果列表里没有 `skill`，这次加载就是未通过。不要为此再装一个加载器，也不要把目录当成成功。

本环境没有活 Bot，所以上面两步标为未测。

## 插件

没有安装 ModLens、Computer、Hindsight、Kanban 或侧栏替换。桌面操作继续用 Tobs 自带的那一个，不要同时再开一个。代码岗只多一个 ECC 摘录技能，出处是 affaan-m/ECC（MIT）。不是整包，也没有 Claude 钩子。

## 这次已经测了什么

在本仓库里用测试检查了：技能文件的位置算不算可被扫描、平铺 `skills/*.md` 不算、另一个项目目录看不到这份技能、灵魂和核心记忆没超字数、没有带头像、私有记录换进程还能读、另一个身份读私有会被拒绝、未批准或带私聊的内容不能进共享、新身份能召回共享教训、迁移只改一个目录、回滚只删本包技能、交付闸的通过和各种不能通过、96 分升不到 5% 不能通过、生产写码确认语。

另外用现成的路径检查证明：两个 Memory 挨在一起时，对方仍读不到；多一个“已批准”字段也不能读到对方的私有文件；共享工作区里的文件，被授权的一方可以读。

## 还不能算做完

活 Host 上的 `bot-tools` / `bot-tool skill`、界面、导入后的真实会话、两个模型的交叉辩论，都还没有跑。没有第二次真实执行的记录，交付闸不会给通过。服务当时是停的，生产环境没有动。
