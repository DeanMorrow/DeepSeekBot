# 修正后的 Tobs 候选包

上一包 `1.6.1-fork.e6dab320.1` 能装上，但 `botharness-profile` 一启动就找不到 `@deepseek-ai/dsh-subagent`。原因是插件入口把这个包和 `dsh-tool-bash`、`dsh-tool-pwsh` 留成外部 import，而它们只写在 devDependencies 里。打包时 devDependencies 被去掉，档案里就没有这三个包。`dsh-tools`、`dsh-agent`、`dsh-llm`、`dsh-session`、`dsh-scope` 已经由别的依赖带进来，所以不是这次的缺口。

这不是 Grants 为空，也不是要改宿主版本。DSH 保持 `0.2.2-alpha.2`。档案里补上构建时用的 `0.2.1-rc.3` 库。

## 版本

- 产品版本：`1.6.1-fork.4fb2cc977.1`
- 来源提交：`4fb2cc9774ec248b799ce2984c0bce4648bb0726`
- Core SHA256：`ce203c63900b889778300243a5b5e836f69a2e43ff372e7940812c745d8ff5b5`
- 校验：同目录 `SHA256SUMS`
- 没有发布到 npm 或 GitHub Release

请安装这一目录，不要再装 `tobs-fork-e6dab320`。

## 安装和回滚

用新的 `DSH_HOME`，`--dsh` 指向独立安装的 DSH，不要指向本仓库的 `node_modules/.bin/dsh`。

```bash
node scripts/install-source-profile.mjs \
  --home <新的-DSH_HOME> \
  --profile <新档案名> \
  --artifacts <本目录> \
  --dsh <独立的-dsh>
```

回滚是停掉这个新宿主并删掉这个新的 `DSH_HOME`。不要覆盖正在使用的旧档案。

## 正式工具命令

工具调用用 `deepseekbot` 或 `tobs`，不用 `botharness-profile`。后者只做档案备份的 inspect/restore。

宿主启动时打印的地址是 `--host` 的值，只取 origin，不要自己猜路径。令牌放进文件或 `DEEPSEEKBOT_HOST_TOKEN`，不要写进命令参数。

```bash
deepseekbot bot-tools --host <dsh 打印的 origin> --token-file <令牌文件>
deepseekbot bot-tool <bot-id> pack_catalog --host <同一个 origin> --token-file <令牌文件>
```

`bot-tools` 不列出 `skill` 和 `create_assignment`。这是直接工具边界。`pack_catalog` 在直接工具列表里。

## 这次已核对

在隔离的 DSH `0.2.2-alpha.2` 上安装本包，`componentsVerified` 为 true。档案内有 `@deepseek-ai/dsh-subagent@0.2.1-rc.3`。

`botharness-profile` 不再报缺包，没有参数时返回它自己的用法。`deepseekbot bot-tools` 对这个隔离宿主返回 61 个工具，其中有 `pack_catalog`。对一个没有模型的新 Bot，`bot-tool <bot-id> pack_catalog` 退出码 0。空白记忆先是 `registry-missing`；放入 seed 清单后 `ok: true`，技能是 `active`，`ops-asset-catalog` 是 `unreachable`。没有调用模型，没有创建 Grant。

## 仍未测

模型会话里的原生 `skill` 仍是 `untested`。Workspace Grants 仍可以是空的；那不阻止这次 CLI。空 Grant 时不能 `create_assignment`。
