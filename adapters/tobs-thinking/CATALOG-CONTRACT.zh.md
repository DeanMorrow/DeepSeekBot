# 清单树读取契约

给本机已有的功能树 / 技能树实现者加第三栏用。本仓库没有 `packages/extensions/mgmt-viz`，这里不重造宿主三树，也没有把它接上。

## 没有单独的服务

本 fork 没有清单 HTTP 接口，也没有推送通知。数据就是 Bot Memory 里的两个 JSON 文件。调用者只读文件。

固定入口只有一个：`.botharness/catalog/index.json`。维护责任人是 `tobs-thinking-seed`。schema 版本是 `1`。不要再套一层“清单的清单”。

## 结构

注册表登记每一份清单，不登记清单里的条目：

- `id`：稳定编号
- `brief`：职责范围，一句话
- `entry`：这份清单的唯一文件
- `owner`：谁维护
- `version` 和 `updatedAt`：版本和更新时间
- `status`：`active` 或 `disabled`。停用必须带 `replacement`

清单文件再登记条目：稳定编号、名称、一句简介、入口、状态、版本、维护人。简介不是全文。

## 身份和权限

这层文件读取不知道当前是哪个 Bot。宿主在把数据交给界面之前过滤。

公开栏只能使用 `publicView` 的结果。私有复盘的标题和路径本来就不在注册表里。即使有人把私有路径写进注册表，`publicView` 也会在组客户端数据之前丢掉它。检查会把这种情况标成 `private-path-in-public-registry`，不能先发给界面再隐藏。

## 两个权威域

Bot Memory 的 `.botharness/catalog/index.json` 只登记这个 Bot 自己的清单。`sourceRef` 以 `bot-memory:` 开头的，文件在这份 Memory 里。`sourceRef` 为 `ops:asset-catalog` 的那一条指向盒上的全局资产目录，条目不复制进来。Host 只读一份显式配置，不读调用方传入的路径。配置文件是 `$DSH_HOME/botharness/catalog-source.json`，形状是 `{ "sourceRef": "ops:asset-catalog", "registryPath": "<相对该文件或绝对路径的正式 registry.json>" }`。正式 registry 必须自带 `display.audiences`。只写 `profile-owner` 时，只有已认证 Owner 的界面能看，Bot 看不到。分类和条目还要再过自己的 `audiences` 或 `private`；不认识的字段整条不返回。根上的允许盖不住子级拒绝。查看和打开用同一条规则。没有 `display`、或只有 `owner` / `active` / `id`，状态是 `unauthorized`，条目为空。正式 registry 目前没有 `display.audiences`，所以 Owner 也是 `unauthorized`。这是授权合同缺项，确认前不写 `public`，也不改那份全局源。`categories` 映射成清单行，`updated_at` 映射成 `updatedAt`，纯数字的字符串版本按数字比较，其余字符串版本原样保留。`scorecard`、`anti_nesting` 和 `machine_*` 不使整表 invalid，但 `machine_*` 和绝对路径不投影。`privacy` 必须是与 Host 配置指纹一致的限制散文。`contract` 是允许根内的合同文件，`contract_version` 是文档版。文件字节的 SHA-256 必须等于配置里的指纹。同字节可以读，改字节、删除或符号链接逃逸会马上拒绝。`synthetic://` 不能代替这份文件。对象或未知版本也拒绝该层。`authorizationGaps` 只在拒绝时审计。`catalogOwner` 和 `approvalOwner` 只来自 Host 配置，而且要等于当前 Host 会话身份。这个身份来自本 Profile，Bot 还必须在本 Profile 的注册表里。不能把配置里的所有者抄成调用者。`profile-owner`、`bot:<slug>` 和 `owner-bots` 都走这条绑定。`all-bots` 和 `bot:*` 不是受众。配置文件如果组或其他人可写，绑定作废。绝对入口只在允许根内解析。Owner 用 `catalog-open`。已登记 Bot 用公开工具 `pack_catalog_open`，参数是不透明的 `entryRef`。两条路都只返回条目的名称和简介，不跟随入口去读正文。Bot 的证明来自 Host 登记的执行上下文，不能改走 Owner 桥。文件不存在、是符号链接、或路径越出 registry 目录，状态是 `unreachable`。这两种情况都不会改用 Bot 记忆里的技能清单。普通斜线仍是简介，例如 `UI/UX`、`a/b`、`技能/模块`，以及 `https://` 用途链接。绝对路径、UNC、盘符、`..` 逃逸、`file:` 和百分号编码后的这些形式会变成 `invalid`，原文不返回。重复编号使整份 registry 为 `invalid`。`visibility: private` 的清单和条目不进入视图。打开前会再检查符号链接。打开用 `deepseekbot catalog-open <entryRef>`，`entryRef` 形如 `ops:asset-catalog#skills`，不是文件路径。`fingerprint` 随版本和状态变化，再调一次就是重读。

`bot-tools` 只列出 direct 工具。列表里没有 `skill`、直接调用得到 `tool-not-direct`，不能当成模型会话加载失败。模型侧技能目录这次仍是 `untested`。这里不另装 loader。

## 状态

- `active`：本地清单文件在，编号和版本与注册表一致。
- `unpopulated`：这一类还没有条目文件。
- `unreachable`：注册了入口或 ops 引用，但这次授权下读不到。
- `stale`：文件在，但版本和注册表不一致。
- `invalid`：文件在，但编号对不上。
- `disabled`：注册表标明停用。

视图字段有 `sourceRef`、`version`、`updatedAt`、`status`。没有推送。再调一次 `pack_catalog` 就是重读。身份是 Host 会话里的 Bot。参数里的 actor 若不一致就拒绝。私有标题和路径在返回前去掉。

## 失效和更新

没有事件总线。第三栏自己重新读注册表。`version` 或 `updatedAt` 变了，就刷新。

`checkRegistry` 发现登记为 `active` 但文件不在，问题名是 `dead-entry:<id>`。文件在但没被登记，问题名是 `unlisted-inventory:<路径>`。编号或版本对不上，问题名以 `drift:` 开头。两个清单指向同一个文件，问题名是 `duplicate-truth-source`。

## 本机怎么用

离线就能用：把种子导入 Bot 之后，直接读上面的 JSON。不需要加载 super-agent 插件，也不需要本仓库去改宿主界面。

要等插件或活会话才算数：技能是否出现在 `skill` 工具目录里、`bot-tools` 的真实列表、`create_assignment` 的真实调用、官方 `dsh-superagent` 整包。这些都还没在本机 `0.2.2-alpha.2` 上测过。

无私有样本就是种子里的 `index.json` 和 `skills.json`。不要把某个 Bot 的私有复盘拷进这棵树。
