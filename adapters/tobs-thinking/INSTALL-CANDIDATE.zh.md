# Tobs 候选安装包

这是本 fork 提交 `e6dab320ecf26ed66bfa84f7af8e561e702fe7ad` 的本地候选包，不是 npm 上的 `deepseekbot@1.6.1`，也没有发布到 npm 或 GitHub Release。

## 版本

- 产品版本：`1.6.1-fork.e6dab320.1`
- 来源提交：`e6dab320ecf26ed66bfa84f7af8e561e702fe7ad`
- 构建：Node `24.21.0`，pnpm `12.4.2`，`node scripts/product-artifacts.mjs`
- 构建时钉住的 DSH：`0.2.1-rc.3`
- 包内声明的宿主范围：`engines.dsh >=0.2.0-0`
- Provider：`@botharness/im-provider@4.32.0-botharness.27`，上游提交 `bb0c7956896f5f5845950a0707837cd7938a11b3`
- 校验：同目录 `SHA256SUMS` 与 `artifacts.json`

本分支的发布账本仍把 `1.6.1` 写成最近一次已发布版本。这个候选包在那份源码上加入了本 fork 尚未发布的 Host 工具。它替换的是整套产品：Core、Client、Browser、Computer、Provider、Tobs 和 cloudflared。不能把它当成往已装 `1.6.1` 的 `node_modules` 里补几个 `pack_*` 文件。

## 宿主约束

`0.2.2-alpha.2` 落在声明的版本范围里。这次只在 Linux 上用独立的 DSH `0.2.1-rc.3` 装进一个新档案并核对了组件。没有在 `0.2.2-alpha.2` 上安装，没有启动 Windows 宿主，没有跑模型。

不要把 `--dsh` 指到本仓库 `node_modules/.bin/dsh`。那个安装树里有源码包 `deepseekbot@0.0.0`，DSH 会先解析到它的 `cordis.patch.yml`，组件核对会失败。要用一份独立安装的 `dsh`。

## 安装

用新的 `DSH_HOME` 和新的档案名。安装器拒绝覆盖已有档案。

```bash
node scripts/install-source-profile.mjs \
  --home <新的-DSH_HOME> \
  --profile fork-e6dab320 \
  --artifacts <本目录> \
  --dsh <独立的-dsh>
```

装好后，档案里的 `@botharness/core` 应为 `1.6.1-fork.e6dab320.1`，其 `dist/index.mjs` 含 `pack_catalog`。`dsh --profile fork-e6dab320 --dump-config` 应出现 `xmanrui-dsh-im`、`botharness-core`，以及预设 `deepseekbot` 里的 `@deepseek-ai/dsh-skill-filesystem` 和 `@deepseek-ai/dsh-tool-skill`。

## 回滚

这次没有启动宿主。回滚是删掉这个新的 `DSH_HOME`。不要在未备份时把本包装进正在使用的 1.6.1 档案。已装的 1.6.1 只要没被这个命令碰到，就保持原样。

## 这次已核对

- 包内 Core 含 `pack_catalog` 和 `create_assignment`。
- 用独立 DSH `0.2.1-rc.3` 安装到新档案，安装器返回 `componentsVerified: true`。
- 安装后的 Core 文件里有 `pack_catalog`。
- 预设里挂着 `skill-filesystem` 和 `tool-skill`。这只说明配置层有这两项。

## 模型侧 skill 自测（本环境未做）

`bot-tools` 只列直接工具。列表里没有 `skill`、直接调用得到 `tool-not-direct`，不能当成模型加载失败。

本机可在装好本包并导入 seed 之后这样看：

1. 开一个真实模型 Orchestrator 会话。
2. 让模型调用原生工具 `skill`，读取 `the-top-thinking` 或 `fix-bug-doctor`。
3. 通过的证据是这次模型工具调用返回了技能正文。文件在磁盘上、`--dump-config` 里有插件名，都不算加载成功。

没有 Windows 和模型环境，这一步标为未测。

## 派工还不能当成已能用

`create_assignment` 在这个包里是 Orchestrator 会话工具，不是直接工具。`bot-tool create_assignment` 返回 `tool-not-direct` 是这条边界，不是缺包。

它要求 `grant_id`。当前 Workspace Grants 是空的时候，模型只能调用 `request_workspace_grant`，然后结束这一轮，等人在卡片上批准。本包不创建 Grant。

`list_assignment_models` 在没有模型预设时返回 `configured: false`。可用预设和配额这次没有核。第二个独立执行上下文也没有建。所以宿主源码里有这个工具，不等于现在可以派工。
