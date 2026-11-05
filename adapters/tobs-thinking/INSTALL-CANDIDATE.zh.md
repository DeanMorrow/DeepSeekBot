# 候选包的复现边界

`botharness-profile` 是档案备份的恢复命令，不是 Host 工具入口。它执行 `import { runProfileRestoreCli } from '@botharness/core'`，因此加载 Core 主包 `dist/index.mjs`。主包顶层有：

```js
import { delegationDepthOf, parentAgentOptionsForDelegation } from '@deepseek-ai/dsh-subagent';
```

在 `1.6.1-fork.e6dab320.1` 里，这个包只出现在 devDependencies，peerDependencies 是空的，打包时被去掉，档案的 lock 没有安装它。用裸 Node 跑该 CLI 得到 `ERR_MODULE_NOT_FOUND`。

这不表示 Host 失败。Windows 上的 Host 仍在 `4211`，匿名请求是 401，日志里没有 subagent 错误。DSH `0.2.2-alpha.2` 自己的安装树里有 `@deepseek-ai/dsh-subagent`，插件由 Host 加载时走那棵树。裸 Node 从档案脚本向上找，找不到 DSH 安装树里的包。

`deepseekbot` 走的是 `@botharness/core/cli`。这份 CLI 把 `@deepseek-ai/*` 打进包内，所以 `deepseekbot --help` 能成功，不依赖档案里有没有 `dsh-subagent`。

## 修正包

不要安装 `1.6.1-fork.0e1461c18.1`。替换包是 `1.6.1-fork.1c6ade932.1`，来源提交 `1c6ade9320e409a2e94576b17b71400d15d31771`，Core SHA256 `aa07048f015c354b383a509cb9976e7d97c96b0d5f17a83ffc8724f49c9020ec`，目录 `tobs-fork-1c6ade932`。子任务 brief 不复制父任务原文。Host 上的创建可能启动模型并产生费用。离线回归只用测试执行器。

实际写入 dependencies 的是 8 个，不只下面曾经点名的 3 个：`dsh-agent`、`dsh-llm`、`dsh-scope`、`dsh-session`、`dsh-subagent`、`dsh-tool-bash`、`dsh-tool-pwsh`、`dsh-tools`。交付目录 `closure/` 有这 8 个 registry tarball，sha512 与 lock 一致。peer 不在其中。13 个产品包加这 8 个文件不是离线整包。

在独立 DSH `0.2.2-alpha.2` 上，Host 加载 Core 时这 8 个解析到档案里的 `0.2.1-rc.3`，DSH 自己的安装树是 `0.2.2-alpha.2`。`SessionId` 运行时是原字符串，两边 Map 能对上。同一进程的 `bot-sessions` 和 `bot-tool pack_catalog` 都退出码 0。没有会话身份异常，所以没有改解析器。

不要改 DSH 版本，也不要另装 latest。来源提交 `4fb2cc9774ec248b799ce2984c0bce4648bb0726`。Core SHA256：`ce203c63900b889778300243a5b5e836f69a2e43ff372e7940812c745d8ff5b5`。交付目录 `tobs-fork-4fb2cc977`。

## 本包里的可测入口

对这份包的 `node_modules/.bin/deepseekbot help` 和 `tobs help` 运行结果相同，共 315 行。里面有这两行，没有 `pack_catalog` 这个词：

```text
tobs bot-tools
tobs bot-tool <id> <tool> [--args-stdin] [--session <assignment-session-id>]
```

`pack_catalog` 是 `<tool>` 的名字，由正在运行的 Host 通过 `bot-tools` 列出来，不是帮助里的子命令。帮助里的 Live Host 约定是：`--host` 用该 Host 已经在听的 loopback origin，或 `DEEPSEEKBOT_HOST`；令牌用 `DEEPSEEKBOT_HOST_TOKEN` 或 `--token-file`，不要写进参数。当前 Windows Host 的 origin 是 `http://127.0.0.1:4211`。

用本档案里的 `deepseekbot`，不要用 PATH 上另一份旧 `tobs`：

```bash
deepseekbot bot-tools --host http://127.0.0.1:4211 --token-file <该 Host 启动令牌文件>
deepseekbot bot-tool <bot-id> pack_catalog --host http://127.0.0.1:4211 --token-file <同一个文件>
```

隔离 Linux、DSH `0.2.2-alpha.2` 上，后一条对没有模型的 Bot 退出码 0。空白记忆返回 `registry-missing`；放入 seed 清单后 `ok: true`。Windows 上的这条调用还没有做。模型会话里的原生 `skill` 仍未测。
