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

## 失效和更新

没有事件总线。第三栏自己重新读注册表。`version` 或 `updatedAt` 变了，就刷新。

`checkRegistry` 发现登记为 `active` 但文件不在，问题名是 `dead-entry:<id>`。文件在但没被登记，问题名是 `unlisted-inventory:<路径>`。编号或版本对不上，问题名以 `drift:` 开头。两个清单指向同一个文件，问题名是 `duplicate-truth-source`。

## 本机怎么用

离线就能用：把种子导入 Bot 之后，直接读上面的 JSON。不需要加载 super-agent 插件，也不需要本仓库去改宿主界面。

要等插件或活会话才算数：技能是否出现在 `skill` 工具目录里、`bot-tools` 的真实列表、`create_assignment` 的真实调用、官方 `dsh-superagent` 整包。这些都还没在本机 `0.2.2-alpha.2` 上测过。

无私有样本就是种子里的 `index.json` 和 `skills.json`。不要把某个 Bot 的私有复盘拷进这棵树。
