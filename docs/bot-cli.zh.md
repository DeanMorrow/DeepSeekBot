# 用命令行创建 Bot

安装 `@botharness/tobs` 后使用 `tobs` 命令；安装兼容包 `deepseekbot` 后使用 `deepseekbot` 命令。本页保留 `deepseekbot` 示例，使用新包时将命令名替换为 `tobs`，其余参数相同。
安装命令见[安装指南](https://tobs.app/docs/installation/)。

`list` 返回的 Bot 摘要在有记录时包含 `lastActivityAt`（毫秒时间戳），来自本地用户可见的 Bot 消息或 Assignment 汇报。后续频道消息和重启不会覆盖它；缺省表示没有记录到活动，不会用创建时间或频道访问时间代替。

`deepseekbot create` 无需点击即可创建新的 PersonaBot：空白创建、从 Bot 包导入（目录或 zip，与[ Bot 打包导出](docs/bot-zip.md)形状相同）、或从 GitHub 导入。它为驱动 DSH 的外部编程智能体而建，因此输出以机器读取优先。

## 用法

`deepseekbot catalog` 通过已认证 Owner 调用 Host 的 `catalogView`。`deepseekbot catalog-open <entryRef>` 调用 `catalogOpen`。Host 只读 `$DSH_HOME/botharness/catalog-source.json` 指向的正式 registry。谁能看由 registry 里的 `display.audiences` 决定：`profile-owner` 对应这条命令。`bot:<slug>` 用那个 Bot 的 `pack_catalog` 和 `pack_catalog_open`。`catalog-open` 仍是 Owner 桥，Bot 不能借它变成 Owner。`printf '{"entryRef":"ops:asset-catalog#<id>"}' | deepseekbot bot-tool <bot-id> pack_catalog_open --args-stdin` 为已登记 Bot 打开条目的名称和简介。没有配置文件是 `unreachable`，没有 `display` 是 `unauthorized`。两种都不会用 Bot 记忆里的清单填上。`entryRef` 是 `ops:asset-catalog#<id>`，响应里没有文件系统路径。

### 可恢复的 Zip 上传与导入

连接手机使用的同一个已认证 Host，运行 `bot-zip-upload --from-zip <文件> --upload-key <稳定键> --host <地址>`。结果包含 `sha256`、`sizeBytes`、`offset`、`chunkBytes` 和 `expiresAt`。命令通过 `zipUploadBegin` 和 `zipUploadChunk` 上传，使用相同键和文件可继续已确认的分块。每块原始数据为 256 KiB，base64 请求封装后仍小于加密设备通道的 4 MiB 限制。

创建前运行 `bot-zip-preview --upload-key <键> --archive-sha256 <摘要> --archive-size <字节数> --host <地址>`。`zipUploadPreview` 校验完整压缩包并返回名称等信息、文件数、解压字节数和历史标志。确认名称、可选 `--description` 和重复的 `--role` 后，使用相同来源参数运行 `bot-zip-import`，并增加 `--operation-key <稳定操作键> --name <名称>`。`zipImport` 通过既有导入 owner 创建一个 Bot 及其私聊，不启动模型或授予工作区权限。

导入响应丢失后，运行 `bot-zip-import-status --archive-sha256 <摘要> --operation-key <键> --name <名称>`，并原样携带可选描述和标签。`zipImportLookup` 不需要文件或上传会话。已完成回执在 Host 重启和上传过期后仍保留；重复 `bot-zip-import` 返回同一个 Bot 和私聊。相同操作键换摘要或元数据会被拒绝。未完成的上传过期后可明确重新传输，继续使用原导入操作键。

暂存区独立于 Bot 的权威存储。沿用桌面端的压缩包限制：压缩及解压大小均最多 100 MiB、20,000 个文件项。Host 最多保留八个并行上传、共预留 400 MiB，以支持多个大文件并限制磁盘占用；会话 24 小时过期，在开始上传时回收。在暂存期间，上传键绑定摘要和大小。相同分块可重试，内容改变、偏移错误和最终摘要不匹配均拒绝。不保证后台传输。认证凭据沿用私有 token 文件或环境输入，不出现在输出中，也不扩大 Tob 的 CLI 权限。

`deepseekbot browser-notification-clients` 列出在线 Client。`deepseekbot browser-notifications --client-id <id> --remote-host-id <id>` 读取该浏览器的本地选择和 revision。写入时加 `--expected-revision <revision> --patch-stdin`，从标准输入传入 `{"enabled":true,"preferences":{"approval":true,"question":true,"private-input":true,"reply":false}}`。命令使用提供页面的 Host 的现有认证及 Client 定向控制通道；Host 不保存浏览器选择或远程凭据。版本过期或远程不存在时明确拒绝。开启前须已在浏览器授予通知权限，否则返回 `notification-permission-required`；CLI 不弹出系统授权。页面关闭后，控制目标和提醒都会结束。 开启原先未启用的类型时，先通过共享 Inbox 读完全部通知分页，完整基线就绪前保持旧选择；写入成功才是启用边界，此前条目静默，此后的群回复和 DM 可提醒。部分页失败返回 `notification-baseline-unavailable`，UI 基线的十秒期限返回 `notification-baseline-timeout`。CLI 写入还将既有 appearance relay 的请求期限（当前八秒）和取消信号传到同一 owner，并在落盘前再次检查；relay 超时或卸载后，迟到分页不能写入，已过期的通知命令不发送迟到回执。切换 Host、关闭设置、移除配对、权限丢失或释放页面会取消待完成的启用（`notification-activation-cancelled`），迟到结果不能落盘。拒绝后显式重试；页面仍订阅时，正常共享 Host Feed 观察继续。

`deepseekbot phone-notifications --metro-port <端口> --target-id <精确ID> --device-name <精确名称>` 在已分配的 Expo development client 中读取现有手机偏好 owner。加 `--preferences-stdin`，仅传入四类布尔值，由同一 owner 持久化并复制到全部已配对 Host。前提是共享设备 batch/lease、运行中的 loopback Metro inspector、精确且唯一的目标、开发版 app ID、`__DEV__` 和唯一已初始化的 owner。命令不直接写存储、不新建 owner、不弹系统授权、不把 Host 副本当手机选择。单个 JSON 分别返回 `saved`、`syncStatus`（`complete`/`pending`）、`syncing` 和 `failedHostIds`。断开/超时后的写入结果未知，应先重新读取再决定是否重试。目标缺失/歧义、release、owner 未就绪及传输失败均返回明确错误码；写入是否已开始按下段区分。**该 AX 路径仅限 development client，release 不可用，也不代表 release CLI parity 或原生 QA 已通过。** 原生真实运行仍交外部统一批次验收。

手机命令通过 inspector 显式等待 JavaScript Promise 完成，不依赖 Hermes 执行 CDP 的 `awaitPromise`。连接后，启动操作、轮询和取结果共用一个 20 秒期限。每次请求使用唯一的临时结果槽，取走结果或取消时删除；debugger 断开后由运行时的 20 秒到期清理兜底，迟到完成不能重建槽。运行时到期清理需要应用的 JavaScript 事件循环运行；应用暂停时，定时器恢复后执行清理。只有通过结构校验的手机 owner 结果才算成功，Promise 内部字段或不合规响应返回 `inspector-result-required`。传输层无法撤回 owner 已开始的写入，因此超时仍表示写入结果未知，不能据此认定未改变；重试前先读回。命令自身也会区分这些结果：可能已经发出的写入若无法取得结果，会保留底层错误码，并明确提示写入结果未知、先不带 `--preferences-stdin` 读回；只读失败和确定发生在写入前的拒绝不使用该提示。

`deepseekbot inbox --notifications [--limit 1..100] [--cursor <游标>]` 使用 Host 现有 `humanAttention` 的通知发现模式。遍历全部返回游标，取得 Host 判定的待办、未读群提及/回复和普通未读 DM 回复。它独立于 Activity 的 mentions-first 分页窗口，不可混用筛选条件。响应须有 `notificationVersion: 1`，旧 Host 明确拒绝；不增加 Feed 连接，不修改 attention 或已读状态。

`deepseekbot device-notifications --device-file <私有配对.json>` 从运行中的 Host 读取当前配对设备的通知发送副本。加上 `--preferences-stdin`，从标准输入传入 `{"approval":true,"question":true,"private-input":true,"reply":false}`，即可替换四种通知选择，无需先注册推送 token。私有文件使用已保存配对的结构（`hostId`、`hostName`、`routes`、`deviceId`、`credential`）；凭据不能放入参数或公开文件。标准输出仅有一个不含凭据的 JSON，配对撤销后返回 `device-revoked`。命令只修改该 Host 的发送副本；手机持久化选择仍是权威，下次同步会覆盖副本。浏览器通知选择只保存在该浏览器，不影响 Host attention。

`deepseekbot device-activity capability --device-file <私有配对.json>` 检查此电脑的锁屏状态服务。`prepare`、`register`、`stop` 通过 `--activity-stdin` 接收 JSON：prepare 需要 `channelId`、`messageId`、`bundleIdentifier`；register 另需 iOS 实际生成的 `clientActivityId`、每项活动的 `token` 和 `locale`（`en`/`zh`）；stop 只需 `clientActivityId`。`status` 同样只需 `clientActivityId`，读取本设备自己的登记（活动结束后也可读）：返回请求的 `channelId`、`messageId`、`progress`；若该请求创建或推进了某个任务（Assignment），另含 `assignmentId`（即 Assignment Session id，手机据此打开 `bot/[slug]/assignment/[id]`）；`prepare`、`register` 在已知时也带同一 `assignmentId`。设备身份来自配对凭据，不能由输入指定。token 属于秘密，只能私下传入标准输入，不能放在参数或公开文件中。命令调用与手机相同的鉴权/加密路由，只输出一个 JSON 结果或拒绝码；未配置、不支持、已结束或撤销配对会明确拒绝。停止显示不会停止原请求。`activity-cleanup-pending` 表示停止投递尚未确认；Host 只重试清理，到确认或登记到期为止。`send-status <bot> --message-id <id>` 新增 `progress`，仅显式 Inbox 解决事实表示完成，单轮处理结束不算完成；若该请求创建或推进了任务，另含 `assignmentId`（以最近一次为准）。CLI 源码测试与真实 Host、iPhone 后台送达仍是独立验收项，参见 [ADR-0255](adr/0255-live-activities-project-one-admitted-dm-request.md)。

```bash
deepseekbot create --name <name> [--persona <text> | --persona-stdin]
                   [--core-memory <text> | --core-memory-stdin]
                   [--description <text>] [--role <tag> ...] [--avatar-file <image>]
                   [--preset <model-preset-id>] [--memory-location <absolute-dir>]
                   [--home <dsh-home>]
deepseekbot create --name <name> --from-git <url | owner/repo> [...]
deepseekbot create [--name <name>] --from-zip <file> [...]
deepseekbot create [--name <name>] --from-dir <directory> [...]
deepseekbot list [--home <dsh-home>]
deepseekbot show <id> [--home <dsh-home>]
deepseekbot model-presets [--home <dsh-home>]
deepseekbot model-preset-create --name <preset> --orchestrator-provider <p> --orchestrator-model <m>
                                [--orchestrator-effort <e>] --assignment-provider <p>
                                --assignment-model <m> [--assignment-effort <e>] [--home <dsh-home>]
deepseekbot model-preset-apply <id> --preset <preset-id> [--home <dsh-home>]
deepseekbot model-plan <id> [--home <dsh-home>]
deepseekbot pause <id> [--home <dsh-home>]
deepseekbot resume <id> [--home <dsh-home>]
deepseekbot update <id> [--name <name>] [--description <text>] [--role <tag> ...] [--home <dsh-home>]
deepseekbot human-name-set (--name <text> | --clear) [--home <dsh-home>]
deepseekbot channel-human-name-set <channel> (--nickname <text> | --clear) [--home <dsh-home>]
deepseekbot channels [--home <dsh-home>]
deepseekbot channel-messages <channel> [--limit <n>] [--before <id>] [--home <dsh-home>]
deepseekbot grants <id> [--home <dsh-home>]
deepseekbot grant-revoke <id> --grant <grant> [--home <dsh-home>]
deepseekbot grant-write-set <id> --grant <grant> (--enabled | --disabled) [--home <dsh-home>]
deepseekbot schedules <id> [--home <dsh-home>]
deepseekbot schedule-create <id> --title <t> --prompt <p> (--every <s> | --daily <HH:MM> |
                                --weekly <HH:MM> --weekdays <0-6,..> | --once-date <d> --once-time <t> |
                                --cron <expr>) [--timezone <tz>] [--enabled|--disabled] [--locked] [--home <dsh-home>]
deepseekbot schedule-update <id> --sid <schedule> [--title ...] [--prompt ...] [trigger ...] [--home <dsh-home>]
deepseekbot schedule-delete <id> --sid <schedule> [--confirm] [--home <dsh-home>]
deepseekbot schedule-history <id> --sid <schedule> [--home <dsh-home>]
deepseekbot schedule-run-now <id> --sid <schedule> [--home <dsh-home>]
deepseekbot schedule-preview (--every <s> | --daily ... | ...) [--home <dsh-home>]
deepseekbot pairings <id> [--home <dsh-home>]
deepseekbot search <words>
```

每次创建只能指定一种来源。空白创建和 GitHub 导入必须传 `--name`；包导入时 `--name` 会覆盖 `.botharness/bot.json`（或文件名）中的名字。`--from-git` 接受完整 Git 地址（`https://`、`ssh://`、`git@host:path`）或 `owner/repo` 简写（即 `https://github.com/owner/repo.git`），Bot 市场条目可用其克隆地址走同一路径。`--from-dir` 会跳过 `.git` 下的文件，但存在时将其打包为历史记录。

`--memory-location <绝对路径>` 让空白 Bot 的记忆存放在 DSH 数据目录之外（例如另一块磁盘）：记忆仓库会建在新的 `<目录>/<bot-id>` 文件夹中，`dataDir` 返回该路径。路径必须是已存在文件夹的绝对路径，且这个 Bot 的文件夹不能已存在（`invalid-memory-dir`）；导入的 Bot 仍使用默认位置。创建对话框的 **进阶设置 → 记忆文件位置** 提供同样的选择。

空白 Bot 还可以用 `--core-memory <文本>` 或 `--core-memory-stdin` 写入根目录的 `MEMORY.md`（核心记忆）以代替默认模板，用 `--avatar-file <图片>` 从不超过 128 KiB 的 PNG、JPEG 或 WebP 文件设置头像（否则返回 `invalid-avatar`，文件无法读取时返回 `file-unreadable`）。`--persona-stdin` 和 `--core-memory-stdin` 只能有一个读取标准输入。Bot 也可以在聊天中用 `bot_create` 工具创建同样的空白 Bot，见下文“绕过模型调用 Harness Bot 工具”。

`--home` 指向目标 `DSH_HOME`；全新目录零点击可用。不传时使用环境中的 `DSH_HOME`。离线数据库命令须先停 Host，否则独占写租约返回 `lease-unavailable`。凭据文件命令可在线执行；以下在线命令走已认证的 Host RPC。

## 在线 Host 命令

### 远程设置

`appearance-clients` 列出打开的浏览器 Client。`host-look --client-id <id> --host-id <id>` 读取该浏览器内的 Host 名称、图标、颜色和内容修订。写入时加 `--patch-stdin --expected-revision <revision>`，从 stdin 传入 JSON，例如 `{"name":"Studio","icon":{"kind":"symbol","id":"server"},"color":"teal"}`。空名称恢复 Host 原始显示名；`color: null` 清除颜色。名称去除首尾空格并限制为 40 字符，与手机共享 HostLook 规则。Host ID 可为已配对的远程 Host 或本机 Host；命令不接收或返回远程凭据。

命令复用已认证的 `appearance-control` relay，直达 UI 使用的同一 Client 本地 `HostLooks`，不修改操作系统 hostname，也不同步到其他设备。浏览器须保持打开并显式选择 Client。同源标签页共同使用名为 `botharness.hostLooks.v1` 的独占 Web Lock；owner 在锁内重读持久数据、比较目标 Host 的内容 revision，再只合并该 Host。UI 字段变换也在锁内应用于当前值，不携带旧整份外观覆盖其他字段。旧 revision 返回 `host-look-revision-stale`；Web Locks 不可用时返回 `host-look-lock-unavailable`，不降级为不安全的读改写。

`host-look-storage-read-failed` 会保留内存中已知的显示状态，但阻止读取和写入，不把默认值当成成功加载。修复浏览器存储访问后，执行 `host-look --client-id <id> --host-id <id> --refresh`，或在设置中选择「刷新外观」，显式恢复；刷新本身不写入。事务锁内重读失败同样阻止落盘。`host-look-storage-failed` 表示浏览器拒绝写入，不发布未保存的外观；解决存储问题并刷新后才能重新提交。

CLI 在读取 stdin 和连接前记录绝对期限；Host 将期限限制为 relay 接收后最多八秒。Client 在加载后、获得锁后和实际 `localStorage.setItem` 前复核墙上时间，即使定时回调尚未运行，越期命令也不能开始写入。Client 释放与 Host 移除也在写入前复核。这不代表远端取消已确认：期限前杀掉 CLI 或断开 HTTP，已送达命令仍可能在期限内执行。写入回执丢失或 relay 超时，在 CLI 仍能输出时报告 `host-look-outcome-unknown`；重试前须读回相同 Client/Host。期限内已完成的写入可能成功而回执丢失。Host 设置统一包含外观、通知、模型、用量和存储；离线时仍可进入外观和通知。通知继续使用 `browser-notifications`，保留权限、激活基线和取消语义。

浏览器远程图标菜单中的「Host 设置」与以下在线命令使用同一个 Host 所有者。通过 `--host <origin>` 和私有的 `--token-file <file>`（或已有环境变量）指定来源 Host，不要默认指向提供当前网页的本机。模型使用 `model-catalog`、`home-model-set`、`model-presets`、`model-preset-create` 和 `model-preset-update`；用量与 Memory 活动使用 `overview-usage`、`overview-memory`；存储使用 `storage-usage` 及两组清理预览／确认命令。删除仍须传入 `--confirmation-stdin --confirm`，且预览必须来自同一 Host。连接失败或被拒绝时，不会改用本地 Profile。这些命令不读取浏览器的配对密钥，也不修改本设备保存的 Host 外观。

将 `DEEPSEEKBOT_HOST` 设为运行中 Host 的 loopback origin 或 tailnet HTTPS origin。使用 tailnet origin（例如 loopback Host 前面的 `tailscale serve`）时，Host 必须以 `--trusted-host <machine>.<tailnet>.ts.net` 启动；否则登录能成功，但 DSH 的 `/api` Host 校验会拒绝每个请求，CLI 返回 `host-untrusted`。`--host <origin>` 可覆盖它。当前启动令牌通过 `DEEPSEEKBOT_HOST_TOKEN` 或 `--token-file <私有文件>` 提供，不得把令牌值放入参数。每次调用重新登录，cookie 只留在内存；Host 重启后须使用新令牌。在线命令不打开 Profile 数据库。参见 [ADR-0159](adr/0159-live-cli-verbs-ride-the-dsh-http-carrier.md)。

### 在线创建与无浏览器调试

选定 Host 后，`create`、`list`、`show`、`model-presets`、`model-preset-create`、`model-preset-apply`、`model-plan` 和 `channels` 调用已有 Host owner。空白、GitHub/Git、Zip、目录创建沿用上文来源与元数据参数。Zip／目录在调用者机器读取或打包，上传到既有 Bot Zip 导入入口；Git 拉取使用 Host 自己的 Git 环境和凭据。不要同时指定 `--home` 与在线目标。Host 调用失败不会回退写本地数据；尚无在线适配的数据库命令会拒绝已选 Host，而不是静默打开离线 owner。凭据文件操作和 search 保持独立。`schedule*` 命令也走 Host，见[在线 Host 上的定时任务](#在线-host-上的定时任务)。

```bash
deepseekbot create --name QA --preset <preset-id>
deepseekbot create --from-zip ./shared.zip --name Imported --preset <preset-id>
deepseekbot create --name GitBot --from-git owner/repo --preset <preset-id>
deepseekbot model-plan <bot-id>
deepseekbot channels
deepseekbot bot-attention <bot-id> --limit 20 --state handled
deepseekbot bot-sessions <bot-id> --limit 20
deepseekbot bot-activity <bot-id> --limit 20
deepseekbot bot-new-session <bot-id>
deepseekbot bot-compact <bot-id>
deepseekbot bot-context <bot-id>
deepseekbot bot-system-prompt <bot-id>
deepseekbot bot-turn-input <bot-id> --turns 1
deepseekbot prompt-parts
deepseekbot prompt-presets
echo '{"triage":"Close what is done."}' | deepseekbot prompt-preset-create --name Quiet --parts-stdin
deepseekbot prompt-preset-update <preset-id> --name Calm --expected-revision 1
deepseekbot prompt-preset-delete <preset-id> --confirm
deepseekbot prompt-global-set <preset-id>|built-in
deepseekbot bot-prompt <bot-id>
echo '{"silence":null}' | deepseekbot bot-prompt-set <bot-id> --preset <preset-id>|global --parts-stdin
deepseekbot bot-prompt-set <bot-id> --prompt-limit dm-context-chars=4000 --prompt-limit review-tool-calls=default
```

创建返回 `bot`、`dm`、Host 的 Memory `dataDir`、完成／延后阶段 `steps` 和 `next`。模型预设经其 owner 应用，不会被误传为原生 Agent preset。已确定不存在的预设在创建前拒绝；创建后的模型失败保留 Bot，返回已知身份、完成阶段与 `outcome: created`。不带稳定 operation key 的创建／导入响应丢失时可能返回 `outcome: unknown`，先检查 Host 再决定是否重建，CLI 不自动重试修改。空白在线创建可用下文的持久创建回执核对同一个身份。创建成功不证明模型可用：使用 `send` 和准确关联的持久回复验证。

`bot-attention` 支持 `--cursor` 及 Host 的 pending/processing/observed/deferred/needs-repair/handled 状态，分页上限 1–100。Session 摘要按创建时间倒序，限制 1–100（默认 50），返回 `total`；每条带 `modelRoute`，即该会话最近一次调用模型的路由，尚未运行时为它配置的路由；活动摘要限制 Session 明细并返回 `sessionCount`。这些是有界摘要，不是完整工具调用日志或流式草稿。

`bot-new-session <bot-id>` 通过与 IM `/new` 相同的 Host 运行时退役空闲 Bot 的编排会话，下一条消息开启新会话。成功返回 `{"started":true}`；Bot 正在工作时以 `bot-busy` 拒绝，需先停止当前轮次。

`bot-compact <bot-id>` 通过 DSH `/compact` 压缩空闲 Bot 的编排会话；Host 重启后会加载原会话，无需先发消息。成功返回 `{"outcome":"compacted","tokensBefore":…,"tokensAfter":…}`；没有可用的更小摘要时返回 `nothing`。两种结果都会让待生效的 Prompt Preset 改动生效。有运行中或排队轮次时返回 `bot-busy`；原会话不可用时返回明确错误。

`bot-context <bot-id>` 返回当前 `sessionId`、估算占用 `usedTokens`（会话未加载时为 null）、`contextWindow`、容量来源 `capacitySource`（`model` 或 `estimate`）及压缩阈值 `thresholdTokens`。模型容量缺失时按 200,000 tokens 估算，再扣除输出预留和安全余量；该估算不是已验证的服务商上限。Web 输入框显示当前上下文数据，点击后仍可查看累计用量。

`bot-system-prompt <bot-id>` 返回 Bot 编排会话当前使用的 System Prompt（`effectiveText`：会话 surface 上最新的一条 system 消息，因为 DSH 会把变化后的提示词追加到历史里，而不是改写第一条；会话已加载时读自会话 surface，未加载时读自会话日志并返回 `loaded: false`）、最新组装出的 `next`（含具名分段 `sections` 和每步附加的运行时上下文 `contexts`），以及 `pending`：Prompt Preset 或人设改动在等新会话或下一次压缩时为 true。生效后，会话的下一次请求会追加新文字。会话未加载时 `next` 为 null。

`bot-turn-input <bot-id> [--turns <1-20>] [--session <session-id>]` 返回最近几轮（默认 1 轮）模型收到的全部输入消息，按顺序给出 `step`、`source`（Inbox 和 steer 进来的输入为 `user`，每步的环境说明为 `runtime-context`）、时间和原文 `text`，包括 Host 附加的回复提醒。steer 进来的消息出现在同一轮的后续 step。Web 输入框的用量弹层可以打开这两个视图。

Prompt Preset 用于编辑 System Prompt 和每轮模板里的行为文字；围绕它们的工具与投递约定保持固定。`prompt-parts` 列出每个可编辑部件的 `id`、`kind`（`system` 或 `turn`）、所属 `section` 和内置 `defaultText`。预设只保存它改动的部件。每个部件按 Bot 解析：先取 Bot 自己的覆盖，再取它选的预设，再取全局预设（`prompt-global-set`），最后取内置文字；`bot-prompt` 返回结果和每个部件的 `source`（`bot`、`preset`、`global` 或 `built-in`）。部件改动是 `{"<part-id>": "text"}` 形式的 JSON 对象；`null` 或内置原文会删掉改动，让部件重新继承。`bot-prompt-set --preset global` 取消 Bot 的预设。删除预设会返回 `clearedBots`，这些 Bot 回到全局预设。运行中的会话保持它开始时的文字：`pending: true` 表示改动要等 Bot 的新会话或下一次压缩才生效。要立即生效，可运行 `bot-compact <bot-id>` 或 `bot-new-session <bot-id>`，与界面上“待生效”旁的两个按钮相同。改过的部件在内置原文之后又更新时返回 `defaultChanged: true`；没改过的部件跟随内置更新。

预设和 Bot 还可以用可重复的 `--prompt-limit <id>=<整数>` 设置数值上限（`<id>=default` 删除设置、重新继承），适用于 `prompt-preset-create`、`prompt-preset-update` 和 `bot-prompt-set`。`prompt-parts` 列出每个上限的 `defaultValue`、`min` 和 `max`：`group-context-chars`、`dm-context-chars`、`context-message-chars` 限制 Bot Inbox 每轮带入的 Group 和私聊上下文；`review-timeout-seconds`、`review-human-messages`、`review-human-message-chars`、`review-tool-calls` 限制审批审查员。上限和部件走同样的分层，`bot-prompt` 在 `limits` 里返回，从下一次 Inbox 投递或审查起生效，不等新会话。

显式清理先用 `bot-delete-preview <bot-id>` 查看 owner 的当前范围与 `preview.token`，审核后将 `{"token":"<preview.token>"}` 从 stdin 交给 `bot-delete-confirm <bot-id> --confirmation-stdin --confirm`。默认保留 Memory，仅显式 `--erase-memory` 才选择擦除 owner 审核的目录，并在停止阶段删除这个 Bot 通过私密输入保存的密钥。检查 `deletion.phase`；未完成的清理可用 `bot-delete-retry <bot-id> --confirm` 继续。范围变化由 owner 拒绝；删除身份不是内容清除或全部数据擦除。

私密信息（密钥）使用已认证的 Owner 身份，和 Web Chat 里的卡片是同一套：先用 `channel-messages` 读出卡片 ID 和 `privateInputRequest.fields`，再把字段 ID 到值的 JSON 从 stdin 交给 `ask-secret-submit <channel-id> --message-id <card-id> --values-stdin`。值不要出现在参数、shell 历史或普通消息里；任何命令都不会把原值读回来。`ask-secret-status`、`ask-secret-cancel` 处理待填写的卡片，`ask-secret-account-status`、`ask-secret-replace`、`ask-secret-revoke` 处理已配置的账号，`ask-secret-accounts <bot-id>` 列出某个 Bot 的账号（不含值和引用）。这些命令在所有 Profile 中可用：ADR-0189 之后密钥输入默认开启，不需要 Docker，见[普通 Profile 指南](dev/guides/private-input-ordinary.zh.md)。

在已构建 checkout 中运行 `node scripts/cli-smoke.mjs --preset <id> [--zip ./shared.zip] [--git owner/repo] [--cleanup]`，脚本通过业务 CLI 驱动选定 Host，为每种来源检查真实回复并返回本轮拥有的 ID。没有已有预设时可提供 `--provider <id> --model <id>`。成功时的 `--cleanup` 只经预览／确认删除本轮 Bot 身份，保留 Memory 与本轮新建的预设；失败保留资源供诊断。应使用一次性隔离 Profile。脚本不授权外部消息、不验证 UI 渲染。见 [ADR-0162](adr/0162-online-cli-management-keeps-explicit-host-authority.md)。

```bash
deepseekbot send <bot-id> --body "回复 QA_OK" --timeout 60
deepseekbot send <bot-id> --body-stdin --message-id human-<UUID>
deepseekbot send <bot-id> --body "就这条" --reply-to <消息-id>
deepseekbot send-status <bot-id> --message-id <回执中的消息-id>
deepseekbot channel-messages <channel-id> --host http://127.0.0.1:31917 --limit 20
deepseekbot tool-approval-status <channel-id> --message-id <卡片-id>
deepseekbot tool-approval-decide <channel-id> --message-id <卡片-id> --outcome allowed-once
deepseekbot tool-approval-decide <channel-id> --message-id <card-id> --outcome allowed-always-tool
deepseekbot tool-approval-decide <channel-id> --message-id <卡片-id> --outcome allowed-always-kind
deepseekbot tool-approval-decide <channel-id> --message-id <卡片-id> --outcome rejected
deepseekbot user-question-status <channel-id> --message-id <卡片-id>
deepseekbot user-question-answer <channel-id> --message-id <卡片-id> --answer-stdin
deepseekbot release-info [--since <版本>]
deepseekbot workspace-options
deepseekbot folder-browse [<文件夹路径>] [--offset <n>]
deepseekbot grant-create <bot-id> --workspace <workspace-id>
```

`tool-approval-status` 返回 `status`；卡片仍为 `pending` 时还返回 `expiresAt`，即网页卡片倒计时的截止时间。`--outcome allowed-always-kind` 对应 `secret_cli` 卡片上的“总是允许此类”：批准这一次，并为同一程序、账号和环境变量名保存一条规则；`tool-approval-rules` 会以 `secret-cli` 类型列出它。其他卡片会拒绝这个选项。

### Agent 控制

这些命令让 Agent 不经 Web 界面就能配置 Bot 的能力和 Host，走的是界面所用的同一套 Host 接口与检查：

```bash
deepseekbot browser-access-set <bot-id> --enabled
deepseekbot computer-access-set <bot-id> --disabled
deepseekbot access <bot-id>
deepseekbot access-set <bot-id> --mode danger-full-access --scope chat --acknowledge-risk
deepseekbot access-set <bot-id> --mode workspace-write
deepseekbot settings botharness-client
printf '{"assignmentConcurrencyLimit":3}' | deepseekbot settings-set botharness-client --patch-stdin
printf '{"autoCollapseMessages":true}' | deepseekbot settings-set botharness-client --patch-stdin
printf '{"showDeliveryReceipts":true}' | deepseekbot settings-set botharness-client --patch-stdin
printf '{"streamReplies":true}' | deepseekbot settings-set botharness-client --patch-stdin
printf '{"botHopLimit":128}' | deepseekbot settings-set botharness-client --patch-stdin
deepseekbot workspace-create /srv/bots/workspace
deepseekbot group-create "Skill Lab" --member <bot-id> --member <bot-id>
```

`access-set` 设置 `danger-full-access` 时必须带 `--acknowledge-risk`：完全访问下普通工具请求不再逐次弹卡；识别出的权限／策略变更仍需 Human 本次决定，浏览器和 Computer 保留各自能力检查。`--scope chat` 同时作用于 Bot 自己的对话；`assignments` 只作用于新的 Assignment。`settings` 返回一个命名空间的 `{ns, revision, value}`；`settings-set` 从标准输入读取一个字段 JSON 对象，并基于该版本号应用，所以并发修改会失败而不是被覆盖。只有 Host 标记为可在线修改的字段才能这样改。 `botHopLimit`（1–1000 的整数，默认 128，「设置 → 消息」）是由一条 Human 消息开始的 Bot 接力链的最大层数。会唤醒其他 Bot 的发送（@ 提及或 Bot 私信）超限时以 `collaboration-hop-limit` 被拒，且不会写入任何消息；不 @ 任何 Bot 的群消息仍会发出，只是不唤醒任何 Bot。Tob 的受限 CLI 不能修改它。`workspace-create` 接受绝对路径并返回 Host 工作区，其 id 供 `grant-create` 使用。

### 频道与群组

这些命令通过与 Web 界面相同的 Host 接口和检查来管理频道和群组。频道 ID 取自 `channels`：

```bash
deepseekbot channel <group-channel>
deepseekbot group-create "Skill Lab" [--member <bot-id> ...] [--operation-key <stable-key>]
deepseekbot channel-rename <channel> --name "Skill Lab" [--expected-channel <channelFingerprint>]
deepseekbot channel-media-target <channel> --source-event <source-event-id> --attachment <attachment-id>
deepseekbot channel-media-download <channel> --source-event <source-event-id> --attachment <attachment-id> --out ./original.csv
deepseekbot channel-media-download <channel> --source-event <source-event-id> --attachment <video-id> --representation playback --out ./playback.mp4
deepseekbot group-avatar-set <channel> --avatar-file ./avatar.png [--expected-channel <channelFingerprint>]
deepseekbot group-avatar-set <channel> --clear [--expected-channel <channelFingerprint>]
deepseekbot group-invite <channel> --bot <bot-id> [--operation-key <stable-key>] [--expected-channel <channelFingerprint>]
deepseekbot group-invite-cancel <channel> --invitation <invitation-id> [--expected-channel <channelFingerprint>]
deepseekbot group-join-decide <channel> --request <request-id> --accept [--expected-channel <channelFingerprint>]
deepseekbot group-join-decide <channel> --request <request-id> --decline [--expected-channel <channelFingerprint>]
deepseekbot group-member-remove <channel> --bot <bot-id> [--expected-channel <channelFingerprint>]
deepseekbot group-send-review <channel> [--accept | --off]
deepseekbot group-wake-policies <channel>
deepseekbot group-wake-set <channel> --bot <bot-id> --mode digest --count 5 --interval 30 [--expected-channel <channelFingerprint>]
deepseekbot group-wake-set <channel> --bot <bot-id> --inherit [--expected-channel <channelFingerprint>]
deepseekbot group-delete <channel> --confirm
deepseekbot channel-timeline <channel> [--direction older|newer|around] [--cursor <cursor>] [--around <message-id>] [--limit <n>] [--older-limit <n>] [--newer-limit <n>]
deepseekbot channel-journal <channel> --through <revision> [--before <position>] [--limit <n>]
deepseekbot channel-mark-read <channel> --message-id <message-id>
deepseekbot channel-mark-all-read [--channel <channel>] [--bot <bot-id>]
deepseekbot channel-react <channel> --message-id <message-id> --emoji 👍 [--remove]
deepseekbot channel-search <channel> --query <text> [--cursor <cursor>] [--limit <n>]
deepseekbot message-search --query <text> [--cursor <cursor>] [--limit <n>]
deepseekbot channel-unread
deepseekbot channel-mute <channel> [--off]
deepseekbot channel-retry <dm-channel> --message-id <human-message-id>
deepseekbot channel-retry <dm-channel> --message-id <human-message-id> --recovery continue --failure-message-id <failure-card-id>
deepseekbot channel-retry <dm-channel> --message-id <human-message-id> --recovery compact --failure-message-id <failure-card-id>
deepseekbot channel-retry <dm-channel> --message-id <human-message-id> --recovery new-session --failure-message-id <failure-card-id>
deepseekbot channel-bot-stop <channel> --bot <id> [--auto-continue-for <message-id>]
deepseekbot channel-history
deepseekbot channel-history-sources <channel> [--before <cursor>]
deepseekbot channel-purge-preview <channel> --source-event <id> [--source-event <id> …]
deepseekbot channel-purge-preview <channel> --source-event <id> | jq '{token}' \
  | deepseekbot channel-purge-confirm <channel> --source-event <id> --confirm --confirmation-stdin
```

`bot_send_message` 仅在确认送达后，结清 `resolve_inbox_ids` 中显式选择的同一个 `source_event_id`。`channel_action` 的 `action: "drop"` 可指定 1–200 个已观察且完成的事项，并保护未完成责任。两者都需要明确目标，不再回退到入站 Channel。检查 `inboxResolution`，失败时用 `inbox_resolve` 修复，不重发消息。CLI `bot-tool <bot> <tool> --args-stdin` 使用相同合同。空的可选字段（`""`、`[]`、`false` 或归零的 `freshness_override`）视为未提供，因此只需恰好一个非空目标；`destination-required` 错误会列出实际收到的目标字段。

若本轮发起来源是启用复核的 Group，成员资格被撤销后不能把回复改道其他 Channel；`bot_send_message` 返回 `refused`，reason 为 `group-reply-source-revoked`。后续独立私聊请求不受影响。

`group-send-review <channel> --accept` 在本地 Group 启用发送复核；`--off` 关闭，无标志时读取状态。
该设置不修改唤醒策略。直接调用 `bot-tool <bot> channel_read --args-stdin`，从 `observationIds`
取得目标群的观察凭据，作为 `observation_id` 传给 `bot_send_message`。`held` 表示尚未发送：读取变化后，
携带 `draft_id`、新观察凭据和改写（或保持原文）的 `body` 复核，最多两次。`channel_action` 的 `action: "drop"` 配合明确的 `channel_id` 和 `draft_id` 放弃草稿，不会解决 Inbox 事项。`expired`、`refused`、`requires-review` 停止自动发送。
凭据不能跨 Bot owner 或 Group 使用。

发送中断后，通过 `bot-tool <bot> channel_action --args-stdin` 传入
`{"channel_id":"...","action":"inspect"}`，读取自己最多 20 条草稿／回执元数据，
待处理记录优先，并返回 `hasMore`；指定 `draft_id` 可查更早的准确记录。检查不发送消息、不结清 Inbox。
Host 重启后，先读取当前群聊，再用 `recover:true`、`draft_id`、新 `observation_id`
和修正后的 `body` 恢复。旧观察无效，过期时间及已消耗的复核预算不重置。
已提交回执给出原 `messageId`，可读取规范消息核实；同 `draft_id`、同正文重放只返回原消息 ID，
不新增消息或 Admission。正文变化返回 `draft-commit-content-changed`。成员、owner、来源和附件仍须
通过当前授权检查；直接 runner 可能在 Tool 执行前拒绝已撤权的群。

主动让话使用 `bot-tool <bot> channel_action --args-stdin`，传入
`{"channel_id":"...","action":"drop","draft_id":"...","observation_id":"...","yield_to_message_ids":["..."]}`。
先读同伴完整答复；`review.peerMessageIds` 标出已完整返回的同伴消息。成功返回
`dropped`、`reason: explicit-peer-yield` 和 `yieldedToMessageIds`，依据保留在草稿审计与
`bot-trace` 中。未观察、已变更、已清除、自己的消息、Human 消息或仅预览的引用返回
`peer-answer-not-observed`，不会放弃草稿或结清 Inbox。Host 不替模型判断答复是否充分；
独立补充与新直接问题仍走原发送路径，Inbox 只结清显式选择的已完成事项。
`held.review.content` 包含有限新增正文；`review.complete` 为 true 时，可直接把
`review.observationId` 作为 `observation_id` 复核，无需额外 `channel_read`。内容未完整返回时仍须读取缺失部分；省略的内容不会计作已观察。

`channel <group-channel>` 返回 `{channel, channelFingerprint, invitationPolicy:{autoAccept}, wakePolicies}`，拒绝非群频道。稳定创建／邀请参数及重试语义见 [Tob 建群与邀请](#tob-建群与邀请)，Human 在线命令也可使用。

与 Web 界面一样，重命名 Bot 私聊会同时重命名该 Bot。`group-avatar-set` 读取不超过 96 KiB 的 PNG、JPEG 或 WebP 文件。邀请 ID 和入群申请 ID 位于群组的 `invitations` 和 `joinRequests` 中，`channels` 和每个群组命令都会返回。`group-wake-set` 设置成员 Bot 对普通群消息何时唤醒：`all`、`mentions`、`digest`（累计 `--count` 条消息或经过 `--interval` 秒后唤醒，默认 5 和 30）或 `silent`；`--inherit` 让该成员恢复其 Bot 的默认设置。`channel-timeline` 和 `channel-journal` 按聊天视图的方式分页读取消息；`channel-journal` 的 `--through` 取 `channel-timeline` 返回的 `revision`。`channel-retry` 在 Bot 回复失败后让它重新回答一条 Human 私聊消息。加上 `--recovery continue` 和失败卡片的 id 则改为在同一个 Session 里继续中断的回合：Bot 保留已经完成的工具调用，看到中断原因，并被要求先检查结果未知的调用再决定是否重做。即使这一回合已经发过消息或建过 Assignment（普通重试此时会被拒绝）也可以继续；Bot 的 Session 已被替换时以 `session-changed` 拒绝，Bot 正在工作时以 `bot-busy` 拒绝。因 `TRANSPORT`、`TIMEOUT`、`SERVER`、`RATE_LIMIT` 或 `EMPTY_RESPONSE` 失败的回合会在 60 秒后、再失败则 180 秒后自动继续；卡片上的 `autoContinue` 给出第几次和时间。`channel-bot-stop` 取消等待中的自动继续；加上 `--auto-continue-for` 和卡片的请求消息 id 时只取消这一次自动继续，不会停止正在运行的回合，该自动继续已不在等待时以 `not-working` 拒绝。私聊里的新 Human 消息也会取代它。Host 重启打断的回合在启动时以同样方式继续。卡片的 `progress` 给出已完成的工具调用数、最后一个工具和结果未知的工具。`channel-unread` 列出每个有未读的频道的 Bot 未读消息数，即侧边栏每行显示的数字。`channel-mute` 与侧边栏菜单一样把频道设为免打扰：该行变灰，普通消息、提及和回复在搜索与分页之前退出 Activity 消息列表，也不计入全局未读；`--off` 依原有已读、隐藏和稍后提醒规则恢复资格。真实 Channel 已读位置与待审批、问答等明确 Human 请求保持不变。`channel-bot-stop` 是 `bot-stop <bot> --channel <channel>` 的已弃用别名，会在 stderr 打印一行弃用提示；Bot 没有任何运行中的工作时它仍以 `not-working` 拒绝，而 `bot-stop` 视为成功。Bot 的自动运行连续三次因非临时性错误（例如 `INVALID_REQUEST`）失败时，Host 不再重试，而是让它保持停止：在有 Human 消息到达之前不接受自动唤醒，Channel 记录为 `turnStop.cause: "failures"`。`channel-react` 给一条消息加上你的表情回应，带 `--remove` 则撤回，并返回该消息的 `reactions`；每条消息最多保留你的 20 个回应，表情必须是单个 emoji。Bot 通过 `channel_action` 的 `action: "react"`、`channel_id`、`react_to` 和 `reaction` 回应；`bot-tool <bot> channel_action --args-stdin` 可直接执行。表情工具不发送正文。`channel-search` 在你可见的消息中不区分大小写地匹配 `--query`，按时间从新到旧返回，并用返回的 `nextCursor` 翻页。 `message-search` 是 Alt+K 和移动端 Chats 搜索背后的全局搜索：在你可见的所有 Bot 私聊和已加入的群里搜索，不含已隐藏的频道，按时间从新到旧返回 `hits`，每项含 `channelId`、`message` 和单行 `snippet`。三个字及以上走全文索引，也会匹配附件文件名；一到两个字逐条扫描，最多返回 200 条。

`group-delete` 和 `channel-purge-confirm` 无法撤销，必须带 `--confirm`。`group-delete` 解散群聊，并删除群里没有被其他会话共享的消息和文件，返回 `{"deleted": true, "messages": n}`；文件清理仍在重试时另含 `cleanupPending`，有消息无法读取删除时另含 `retained`（该群仍留在 `channel-history` 中，再次运行 `group-delete` 会重试删除）。`channel-history` 列出在此变更之前解散的群组，以及删除没有完成的群组，它们的内容仍可清除。清除与历史页面一样分两步：`channel-purge-preview` 列出所选 Source Event 将删除的消息、Bot 受理记录、文件和后续效果，并返回短时有效的 `token`；`channel-purge-confirm` 从标准输入读取 `{"token": …}`，针对同一组 Source Event 执行，范围变化时以错误码拒绝。Source Event 从 `channel-history-sources` 中选取，它用返回的 `before` 游标分页。

`channel-media-target` 通过当前 Human Channel 授权取得受检来源媒体，返回其 canonical Host 文件目标。`channel-media-download` 使用与卡片相同的认证附件路径，将原件字节写入新的本地 `--out` 文件，并在 JSON 中返回大小、MIME 和 SHA-256；目标已存在时拒绝覆盖。两条命令只使用 Channel、Source Event 和 attachment，不选择 Bot，也不调用模型；来源撤销仍返回明确错误码。默认上限为 25 MiB。

对 `channel-media-download` 明确传入 `--representation playback`，可使用与 Channel 播放器相同的准备路径。#1023 Lark 引用视频候选只返回字节识别为 MP4 的原件，不转码，也不能代替浏览器解码验收。不传该参数始终下载原件；不支持播放的格式返回明确错误码，原件仍可独立下载。真实平台和安装包资格见[候选检查点](dev/verification/lark-1023-channel-video.md)。

忙群的草稿初次 held 后最多复核两次。预算耗尽返回 `requires-review`、`budget.exhausted`、
`draftVersion` 和可选动作；新来源消息不能重置已有草稿预算。需要延后时，不带
`resolve_inbox_ids` 放弃草稿，再通过既有 `inbox_snooze` 为已观察且未完成的事项设置时间和说明。
等待中的事项不能标为完成。
预算耗尽后放弃草稿且没有已观察的同伴让话证据时，`keepOpenInboxIds` 返回原请求的
Source Event 和群内 Message ID。这些 ID 不会被同次 `resolve_inbox_ids` 顺带结清，
而会显示在 `inboxResolution.keptOpen`；其它已完成的旁话仍可结清。若选中的 ID 都需保留，
结果为 `kept-open`。未完成的请求使用 `inbox_snooze` 延后；确已取消或完成的事项可另行
显式调用 `inbox_resolve`。有依据的同伴让话仍保留正常结清路径，直接 CLI 使用相同检查。
即使未提供结清 ID 或只结清旁话，也会返回保留原请求并继续处理的指引；结清旁话不代表答案已发送。
仅因消息持续变化而延后时，`suggestedSnoozeUntil` 提供 Host 当前时间之后 30 秒的
`inbox_snooze.until_time` 建议值，本身不创建调度；Human 指定的更晚时间或未满足的
条件优先，取消指令仍终止事项。
在同一原生 Orchestrator turn 内，放弃耗尽预算的草稿后不能重新发送，返回
`dropped-exhausted-draft-defer-turn`；后续一轮可以读取最新上下文继续处理。
独立的直接 CLI 调用不共享原生 turn。

读全要求的上下文后，仍有必要发送的答案可通过同一直接 CLI 传入
`freshness_override: {"draftVersion":3,"reason":"复核后仍有必要回答"}`，同时传原群的
`channel_id`、`draft_id`、`observation_id` 和实际 `body`。版本必须使用结果返回的值，不能猜。
每条预算耗尽草稿只能显式申请继续一次，提交时仍原子核对当前内容。
`override-context-changed-defer` 表示又有新消息或编辑：尚未发送，本次申请已经用完。
读完返回内容，不结清未完成事项，放弃草稿后短暂 snooze，恢复时再读最新消息；
Human 指定的更晚时间或条件仍须遵守。`override-already-attempted-defer` 拒绝重复申请。
成员、停止/归档、过期、purge 和 owner 检查始终生效。
`draft-version-changed`、`override-context-not-observed`、`override-requires-exhausted-draft`
是拒绝结果，不是发送成功。正式 message ID 证明结果，工具 trace 留下选择理由。
Human 要求等待或取消时不得使用 override。

### Bot 资料、侧边栏与部件库

这些命令设置 Bot 的外观和唤醒规则、整理侧边栏、管理自定义部件，走的是 Web 界面所用的同一组 Host 调用（[#1702](https://github.com/BotHarness/DeepSeekBot/issues/1702)）：

```bash
deepseekbot bot-avatar-set <bot-id> --file ./avatar.png
deepseekbot bot-banner-set <bot-id> --file ./banner.png
printf '{"scene":"…","seed":7}' | deepseekbot bot-banner-set <bot-id> --recipe-stdin
deepseekbot bot-banner-set <bot-id> --clear
deepseekbot bot-appearance-set <bot-id> --recipe-stdin < recipe.json
deepseekbot bot-primary-color-set <bot-id> --color '#3366ff'
deepseekbot bot-primary-color-set <bot-id> --automatic
deepseekbot bot-source-policies <bot-id>
deepseekbot bot-source-policy-set <bot-id> --source-class group-ordinary --wake digest --digest-count 5 --digest-interval 600
deepseekbot bot-source-policy-set <bot-id> --source-class human-dm --delivery turn
deepseekbot bot-source-policy-reset <bot-id> --source-class group-ordinary
deepseekbot bot-standing-limits-set <bot-id> --soul 4000 --core-memory 8000
deepseekbot developer-mode-set --enabled
deepseekbot roster
deepseekbot roster-section-create "Work bots"
deepseekbot roster-batch move <channel-id> <channel-id> --section <section-id>
deepseekbot roster-batch pin <channel-id>
deepseekbot roster-pins-set <channel-id> <channel-id>
deepseekbot roster-hidden-set
deepseekbot roster-section-rename <section-id> --name "Play"
deepseekbot roster-section-reorder <section-id> <section-id>
deepseekbot roster-top-reorder section:<section-id> channel:<channel-id>
deepseekbot roster-section-remove <section-id> --confirm
deepseekbot human-identity
deepseekbot human-name-set --name "Vain"
deepseekbot channel-human-name-set <channel-id> --nickname "Boss"
deepseekbot part-library
deepseekbot part-library-import --file ./parts.zip
deepseekbot part-library-import-image --file ./hat.png --slot <slot> --colors 4 --name Hat
deepseekbot part-library-add --part-stdin --name Bob < part.json
deepseekbot part-library-export --out /tmp/part-library.zip
deepseekbot part-library-export --part-id <part-id> --out /tmp/part.png
```

图片从文件路径读取：头像可以是 PNG、JPEG 或 WebP；横幅是 3:1 的 PNG；`--clear` 把头像恢复默认、把横幅恢复为按名字生成的场景。`bot-appearance-set` 接受与头像编辑器相同的像素配方，并据此重绘头像。`--source-class` 取 `assignment-report`（`--wake conditional|immediate`）、`group-ordinary`（`--wake immediate|digest|mentions|silent`，配合 `--digest-count` 和以秒计的 `--digest-interval`），或 `human-dm`、`bot-dm`、`group-mention`（`--delivery steer|turn`）。侧边栏命令使用 Channel id（私聊为 `dm-<bot-id>`）；`roster-pins-set` 和 `roster-hidden-set` 整体替换列表，不传 id 即清空；`roster-batch move` 不带 `--section` 时移到顶层。`roster-section-remove` 必须带 `--confirm`，分组里的 Channel 会移到顶层。设置了 `--host` 或 `DEEPSEEKBOT_HOST` 时，`human-name-set` 和 `channel-human-name-set` 走 Host；带 `--home` 时仍走离线路径。`part-library-export` 把部件 PNG 或整个部件库的 zip 写入 `--out`，并输出文件名和大小；`--part-stdin` 导出以 JSON 给出的已穿戴部件。

### 用命令行管理 IM 应用

```bash
printf '{"token":"…"}' | deepseekbot im-app-add discord --credentials-stdin
deepseekbot im-app-status discord
deepseekbot im-bind <bot-id> --app <app-id>
deepseekbot im-status <bot-id>
deepseekbot channel-ingests <channel>
deepseekbot channel-connect <channel> --bot <bot-id> --conversation <external-id>
deepseekbot im-unbind <bot-id> --app <app-id>
deepseekbot im-app-remove discord --app <app-id>
```

`im-app-add` 适用于基于 token 的平台（Discord、Slack、QQ、钉钉、企业微信、Matrix）；飞书和微信仍用 `im-authorize`。凭证只从标准输入读取，绝不打印；输出列出每个应用的 id、名称、连接状态和错误码。`im-bind` 把已连接的应用（`im-app-status` 里的 `id`，即 `im-status` 里的 `ref`）绑定到 Bot，`im-status` 显示每个绑定的 `reception`。`channel-connect` 通过该 Bot 的绑定，把外部群聊作为上下文接入 Channel；这个会话必须已被该绑定知晓，所以先在那里 @ 一次应用，再从 `channel-ingests` 的 `candidates` 里选 id。否则 Host 会以 `conversation-unavailable` 拒绝。

### 用命令行管理 IM 消息、审批和失败提醒

```bash
deepseekbot messaging-defaults discord
printf '{"expectedRevision":1,"collection":"mentions","wake":"digest","count":5,"intervalSeconds":30,"identityEnabled":true}' \
  | deepseekbot messaging-defaults-set discord --input-stdin
deepseekbot messaging-grants <bot-id>
deepseekbot messaging-targets <app-ref>
deepseekbot messaging-authorize <bot-id> --app <app-ref> --target <target-ref>
deepseekbot messaging-receive <bot-id> --grant <grant-id> --enabled
deepseekbot messaging-channel-target <bot-id> --grant <grant-id> --channel <channel-id|none>
printf '{"collection":"all","wake":"digest","count":5,"intervalSeconds":30}' \
  | deepseekbot messaging-group-policy <bot-id> --grant <grant-id> --input-stdin
printf '{"mode":"follow","expectedRevision":0,"wake":null}' \
  | deepseekbot messaging-thread-policy <bot-id> --source <source-event-id> --input-stdin
deepseekbot messaging-source <bot-id> --source <source-event-id>
printf '{"kind":"mute","grantId":"<grant-id>","expectedRevision":2,"muted":true}' \
  | deepseekbot messaging-conversation <bot-id> --input-stdin
deepseekbot messaging-send <bot-id> --grant <grant-id> --body-stdin [--request-id <id>]
deepseekbot messaging-reachable <bot-id> --binding <binding-id> [--cursor <cursor>]
deepseekbot messaging-post <bot-id> --binding <binding-id> --conversation <group-id> --body-stdin [--request-id <id>]
deepseekbot messaging-post-status <bot-id> --binding <binding-id> --conversation <group-id> --body-stdin --request-id <id>
deepseekbot messaging-post-limit <bot-id> --binding <binding-id> --limit <1-10000|none>
deepseekbot messaging-revoke <bot-id> --grant <grant-id> --confirm
printf '{"kind":"policy","restricted":true,"expectedRevision":0}' | deepseekbot sender-access <bot-id> --input-stdin
deepseekbot channel-bridges <channel-id>
printf '{"kind":"add","grantId":"<grant-id>","expectedGrantRevision":2,"name":"QA","enabled":true,"collection":"mentions"}' \
  | deepseekbot channel-bridge <channel-id> --input-stdin
deepseekbot approval-routes <bot-id>
deepseekbot approval-route <bot-id> --pairing <pairing-id|none>
deepseekbot approval-test <bot-id>
deepseekbot approval-retry <bot-id> --delivery <delivery-id>
deepseekbot question-deliveries <bot-id>
deepseekbot question-retry <bot-id> --delivery <delivery-id>
deepseekbot failure-alerts <bot-id>
deepseekbot failure-alerts-set <bot-id> --enabled
deepseekbot failure-alerts-test <bot-id>
deepseekbot failure-alerts-retry <bot-id> --delivery <delivery-id>
```

对于已核验的微信私聊连接器，update JSON 支持独立的 `dmMirror` 与 `dmForward` 布尔值，两者默认均为 `false`。先读取 `channel-bridges`，再携带当前 Grant／route revision 提交设置。同一 Binding 与会话的入口共享偏好；离线时仍可关闭，关闭停止未提交操作，不清除历史、不撤销正常回复权限。转发需要同一账户中已有的主动发送目标。例如，在其他字段不变的 update payload 中加入 `"dmMirror":true,"dmForward":false`，即可只开启本地镜像。

这些命令调用的 Host bridge 方法，与 Bot 的 IM 设置、Channel 桥接列表以及审批和失败提醒卡片相同，所以 Host 会做同样的检查，并以同样的错误码拒绝。`messaging-grants` 列出 Bot 已授权的会话（授权 id、版本、接收状态、群聊和话题策略）以及各绑定的发帖上限，不输出目标摘要和应用指纹。结构化修改从 `--input-stdin` 读取一个 JSON 对象，格式与 Web UI 发送的一致，包括其中的 `expectedRevision`，因此并发修改会失败而不会被覆盖；`approval-route`、`failure-alerts-set` 和 `messaging-post-limit` 会自己读取当前版本。`messaging-send` 和 `messaging-post` 会打印所用的 `requestId`：用同一个 `--request-id` 重试会返回已有的帖子而不会重复发送，`messaging-post-status` 只读回结果、不会再发。与 Web UI 的确认对话框一致，`messaging-revoke`、屏蔽会话、删除桥接以及 `delete-*` 类发送者权限修改都需要 `--confirm`。只向你有权测试的 IM 会话发送消息。

### 用命令行操作浏览器和 Computer

```bash
deepseekbot browser-open <bot-id>
deepseekbot browser-frame <bot-id> --out /tmp/frame.jpg
deepseekbot browser-takeover <bot-id> --enabled
deepseekbot browser-takeover <bot-id> --disabled
deepseekbot browser-stop <bot-id>
deepseekbot computer-status
deepseekbot computer-start --target local
deepseekbot computer-stop
deepseekbot computer-frame --out /tmp/desktop.jpg
deepseekbot computer-takeover --enabled
echo '{"kind":"click","x":10,"y":20}' | deepseekbot computer-input --args-stdin
deepseekbot computer-takeover --disabled
deepseekbot grants <bot-id>
```

`browser-open` 启动 Bot 的浏览器（需要已开启浏览器权限），返回标签页和查看地址。`browser-frame` 把当前画面保存到一个绝对路径，并报告大小和视口，Agent 可以借此看到 Bot 看到的内容。`browser-takeover --enabled` 暂停 Bot 的浏览器以便人工操作，`--disabled` 交还。`computer-start` 带上面板按钮发送的同一个显式授权；用 `computer-status` 读取结果，被拒时 `status.detail` 会说明原因，例如缺少系统权限或显示器。`grants` 从在线 Host 列出 Bot 的工作区授权。路由拒绝时保留 Host 的错误码，或返回 `host-refused` 加上它的说明。

`computer-frame` 把 Computer 桌面（本机或容器）的当前画面保存到一个绝对路径，并报告大小、`mimeType`（`image/jpeg`；Host 无法编码 JPEG 时为 `image/png`）、`seq` 和目标。已配对的手机轮询的也是这一帧：`GET /api/computer/frame?after=<seq>` 会等到画面变化，画面不变时返回 204。`computer-input --args-stdin` 向这个桌面发送一次人工操作：`{"kind":"click","x":10,"y":20}`（可加 `"button":"right"`、`"count":2`）、`{"kind":"scroll","direction":"down","amount":3}`、`{"kind":"type","text":"hi"}` 或 `{"kind":"key","key":"return","modifiers":["meta"]}`。坐标是上一帧画面的像素。Computer 停止时两者都会以 `not-running` 拒绝。发送操作前要先执行 `computer-takeover --enabled`，否则会以 `not-paused` 拒绝。Computer 还没有产生画面时，`computer-frame` 以 `no-frame` 拒绝。`computer-takeover --enabled` 会等 Bot 正在进行的 Computer 调用结束（最多 10 秒）后再返回，暂停开始后才完成的调用结果不会交给 Bot。暂停期间 Bot 的所有 Computer 工具调用都会被拒绝，包括截图，所以你输密码时 Bot 不能移走焦点，也看不到屏幕。手机持续轮询画面或发送操作时暂停一直有效，最后一次之后 30 秒自动结束；`computer-takeover --disabled` 立即交还。

### Human Inbox、委派、会话与审批规则

```bash
deepseekbot inbox --category action --limit 20
deepseekbot inbox --category replies --search budget --unread --sort mentions-first
deepseekbot inbox-watch --category unread --watch-seconds 10
deepseekbot inbox-status
deepseekbot inbox-dismiss <item-id> --source-key <source-event-id>
deepseekbot inbox-dismiss-all --confirm [--kind <kind>] [--category action|info|unread|replies] [--bot <id>] [--channel <id>]
deepseekbot inbox --category replies --dismissed
deepseekbot inbox-restore <item-id> --source-key <source-event-id>
deepseekbot inbox-snooze <item-id> --source-key <source-event-id> --until 2026-10-15T09:00:00Z
deepseekbot inbox-snooze <item-id> --source-key <source-event-id> --clear
deepseekbot inbox --category action --snoozed
deepseekbot inbox-ignore <report-source-event-id>
deepseekbot assignment-context <bot-id> --session <session-id> --source <source-event-id>
deepseekbot assignments <bot-id> [--search <text>] [--activity idle,working] [--include-archived] [--limit 20] [--cursor <next>]
deepseekbot assignment <bot-id> --session <session-id>
deepseekbot assignment-timeline <bot-id> --session <session-id>
deepseekbot session-subagents <bot-id> --session <root-session-id>
deepseekbot channel-assignments <group-channel>
deepseekbot channel-assign <channel> --section <section-id> --index 0
deepseekbot session-ids
deepseekbot session-owner <session-id>
deepseekbot session-archive-set <bot-id> --session <session-id> --archived
deepseekbot session-stop <bot-id> <session-id> [--channel <channel-id>]
deepseekbot session-stop <bot-id> --activity <activity-id> [--channel <channel-id>]
deepseekbot bot-stop <bot-id> [--channel <channel-id>]
deepseekbot tool-approval-rules <bot-id>
deepseekbot tool-approval-history <bot-id> [--limit 30] [--cursor <next>]
deepseekbot tool-approval-rule-revoke <bot-id> --rule <rule-id> --confirm
deepseekbot grant-revoke <bot-id> --grant <grant-id> --confirm
deepseekbot grant-write-set <bot-id> --grant <grant-id> --disabled
deepseekbot private-mcp-set <bot-id> --server <name> --enabled
deepseekbot private-mcp-remove <bot-id> --server <name> --confirm
```

`session-stop <bot-id> <session-id>` 停止 Bot 的一个运行中的 Session，与 Sessions 面板中该行的停止按钮相同。它的 Subagent 随之停止，Bot 的其他 Session 继续运行。返回 `stopped` 和 `alreadyIdle`，均为 `{ botSlug, sessionId, role }` 列表：空闲、已停止或重复停止的 Session 出现在 `alreadyIdle` 中，命令仍然成功。Bot 不拥有的 Session 以 `unknown-session` 拒绝。带 `--channel` 时，发起停止的 Channel 会收到一行通知（`turnStop.target`，结果中另有 `messageId`），但只在该 Session 属于这个 Channel 时才发：Orchestrator 对应 Bot 所在的 Channel，Assignment 只对应发起它的 Channel。

`session-stop <bot-id> --activity <activity-id>` 停止 Bot 实时活动快照中某一行（`sessions[].id`）对应的 Session，与消息面板顶部弹出框中该行的停止按钮相同。该行已消失表示 Session 已结束，命令返回空的 `stopped` 和 `alreadyIdle` 列表，仍然成功。Session id 和 `--activity` 只能传其中一个。

停止 **Assignment** 不会唤醒 Orchestrator；它的下一轮会读到一条 Host 生命周期通知，说明 Human 停止了该 Assignment，除非 Human 要求，否则不要重新派发。该 Assignment 保留历史且不会被归档；只有 Orchestrator 发来的 Assignment Request（`send_assignment_request`）能让它继续。

停止 **Orchestrator** 只打断它当前的回合（或等待中的自动继续）。它的 Assignment 继续运行，其他一切不变：下一条消息、Assignment 汇报或其他唤醒照常开启新回合，这一回合会带上一条关于停止的 Host 说明。在 Sessions 面板中，如果有正在运行的 Assignment，停止前会先询问，并可选择一并停止它们（Bot Stop）。

`bot-stop <bot-id>` 即 Bot Stop：停止 Bot 的 Orchestrator 和所有运行中的 Assignment 及其 Subagent，语义同样只是打断。它是幂等的：没有运行中的工作时返回空的 `stopped`。每个被停止的 Assignment 都可以像单独停止的一样，用 Assignment Request 继续。带 `--channel` 时通知（`turnStop.target.scope: "bot"`）只发到该 Channel，且只在 Bot 属于该 Channel 时发。IM 的 `/stop` 和输入框的停止按钮都执行 Bot Stop。

`inbox-status` 请求完整的消息分类摘要，返回 `unreadCount`、`hasAction`，以及支持该能力的 Host 返回的 `messageCounts: { replies, other }`。分类在可见性与 Channel 免打扰过滤后，对未读 Source Event 去重并分成个人消息和其他消息；已读保留的提及／回复、已处理请求不点亮消息红点。该摘要不受 Activity 分页和浏览器筛选影响。旧 Host 可能省略 `messageCounts`，缺失不代表零。control rail 红点偏好只在当前浏览器和 Host origin 保存，不改动 CLI 返回的真实状态。

`inbox-watch` 先订阅现有已认证 roster 实时流，再读取基线。观测 1–60 秒（默认 10 秒）后，仅输出一个 JSON，包含 `initial`、`current` 和 `invalidations` 数量。两次快照沿用 `inbox` 的 Human Inbox 查询与筛选；中间事件仅通知数据失效，不另存通知。流提前中断返回编码拒绝。`--timeout` 应长于观测窗口。

`inbox --search <文字>` 在分页前搜索安全的 Activity 摘要、Channel 名称和 Bot slug（最多 200 字符）。`--unread` 仅保留未读的个人消息，不隐藏待处理事项。`--sort newest|oldest` 按时间排序；`--category replies --sort mentions-first` 将提及排在回复前。使用 `--cursor` 时须保持筛选条件不变。搜索、未读筛选和提及排序要求查询版本 1；旧 Host 返回 `host-query-unsupported`，不会静默返回部分结果。

`inbox` 返回 Human Inbox 的一页（`items` 和 `nextCursor`），可以像 Inbox 的标签页一样按 `--category`（`action`、`info`、`unread`、`replies`、`handled`）、`--bot` 或 `--channel` 筛选。`inbox-dismiss` 接收条目的 `id`，条目带有 `sourceEventId` 时把它作为 `--source-key` 传入；`inbox-dismiss-all --confirm` 一次移除所有活动条目，或只移除某个 `--kind`（例如 `bot-message-needs-repair`）的条目，并可用 `--category`、`--bot`、`--channel` 限定范围；被清理的未读会话、回复和提及会一并标为已读（读到该条消息为止）；返回 `dismissed`、`read`（标为已读的会话数）和 `more`（每次最多 1000 条，仍有剩余时 `more: true`），对应网页和手机「活动」里的「清理…」菜单。`inbox --dismissed` 列出已移除的条目（对应手机上的「已清理」筛选），`inbox-restore` 用同样的 `id` 和 `--source-key` 把一条恢复回来，旧版 Host 会以 `host-query-unsupported` 失败；`inbox-ignore` 把一条仅供知悉的委派汇报标为已读。`inbox-snooze` 把需要处理、通知或回复里的条目隐藏到 `--until`（最多 30 天后），对应网页 Inbox 的「稍后提醒」；`--clear` 立即让它回来，`inbox --snoozed` 列出仍在延后的条目及其 `snoozedUntil`。`assignment-context` 读取 `assignment-report` 条目背后的汇报。`assignments` 按最近更新顺序列出 Bot 的委派任务，每条都带 `title`（委派标题）和 `description`（委派描述）、活动状态、Continuity Key 和最新汇报；`--search` 不区分大小写地匹配标题、描述、Continuity Key 和最新汇报摘要，`--activity` 用逗号列出要保留的 `working`、`idle`、`error`、`stopping`、`stopped`，`--include-archived` 同时列出已归档的，`--cursor` 用上一页的 `nextCursor` 在相同筛选下继续（`--limit` 为 1–50，默认 20）。它读取的就是 Bot 的 `list_assignments` 所用的 Assignment Directory。`assignment` 按 `--session` 查看一个委派任务。`assignment-timeline` 返回该委派任务、它的 `rounds`（轮次）及 `lanes` 中的时间线。每一轮是委派 Agent 的一个 turn：第 1 轮为 `created`，之后为 `continued`（Orchestrator 又发来一个请求），每轮带开始时间和 Orchestrator 指令 `instruction` 的前 280 个字符；保留最新 20 轮，`omittedRounds` 统计其余。MAIN 条目和 Subagent 泳道带有所属的 `round`。泳道先是 `main`（委派 Agent），再按创建顺序列出每个 DSH Subagent，记为 `subagent` 1、2…（最多最近 20 个，其余数量见 `omittedSubagents`）。每条泳道保留最近 40 条 `entries`，每条带工具名、`kind`、`status`（`running`、`done`、`failed`、`denied` 或 `cancelled`）、时间，以及仅在工具声明时才有的简短公开 `detail`；原始工具输入和输出不会出现。每条泳道还带 `state`（`running`、`done`、`failed`、`cancelled` 或 `idle`）、首末事件时间，以及该会话调用过模型后实际使用的 `route`（`provider`、`model`、`reasoningEffort`）。Sessions 面板和群组 Work 面板里 Assignment 行上的“执行过程”按钮读取的就是它：按轮次列出 Orchestrator 的指示、MAIN 步骤和这一轮开出的 Subagent。`session-subagents` 对 Bot 拥有的任一根会话（Orchestrator 或 Assignment）返回同样的 `subagent` 泳道，因此也覆盖 Orchestrator 自己用 `bot_subagent` 派出的 Subagent；会话面板和群聊 Work 面板展开某一行时读取它。`channel-assignments` 列出群组 Channel 的委派工作；`channel-assign` 把 Channel 移到侧栏的某个分组（`--unsectioned` 移出分组）。`session-ids` 列出 Bot 拥有的根会话，`session-owner` 说明某个会话属于哪个 Bot、以什么角色运行。`tool-approval-rules` 列出 Bot 的"始终允许"规则；每条规则的 `autoApprovedCount` 是它不经询问就批准的请求次数，每个请求只计一次。`tool-approval-history` 按从新到旧列出 Human 对该 Bot 批准卡片的答复：每条包含工具、输入、`outcome`（`allowed-once`、`allowed-always-tool`、`allowed-always-exact`、`allowed-always-all` 或 `rejected`）、`channelId` 和两条消息 ID；答复来自已配对的 IM 账号时还带 `actor`。`--cursor` 用上一页的 `nextCursor` 继续（`--limit` 为 1–100，默认 30）。撤销规则、工作区授权或私有 MCP 服务器都需要 `--confirm`，与 Web UI 的确认一致。指定了 Host 时，`grant-revoke` 和 `grant-write-set` 经由 Host 执行；使用 `--home` 时仍是离线维护命令。私有 MCP 服务器由 `ask-secret-accounts` 列出；Host 不认识的名称会以 `private-mcp-server-unavailable` 失败。

### 在线 Host 上的定时任务

```bash
deepseekbot schedules <bot-id>
deepseekbot schedule-create <bot-id> --title Standup --prompt "总结昨天" --daily 09:00 --timezone Asia/Tokyo
deepseekbot schedule-preview --cron "0 9 * * 1-5" --timezone Asia/Tokyo
deepseekbot schedule-update <bot-id> --sid <schedule-id> --every 3600 --disabled
deepseekbot schedule-run-now <bot-id> --sid <schedule-id>
deepseekbot schedule-history <bot-id> --sid <schedule-id>
deepseekbot schedule-delete <bot-id> --sid <schedule-id> --confirm
```

选定 Host 后，定时任务命令调用与「定时任务」面板相同的 Host 方法，由 Host 检查 Bot、触发器、时区和锁定状态；被拒时保留 Host 的错误码（`invalid-input`、`not-found`、`locked`、`inactive`）。`schedule-preview` 返回触发器和 Host 算出的接下来几次时刻。`schedule-run-now` 排入一次触发，由运行中的 Host 执行。`schedule-delete` 会连同该任务的历史一起删除，所以和面板上的确认一样，需要 `--confirm`。

### 在线 Host 上的接管交接（Takeover Handoff）

```bash
deepseekbot takeovers [<bot-id>] [--pending] [--channel <channel-id>] [--limit 20]
deepseekbot takeover-request <bot-id> --target browser --title "登录商店" --body "请登录后点完成。" [--channel <channel-id>] [--minutes 30]
deepseekbot takeover-status --channel <channel-id> --message-id <request-id>
deepseekbot takeover-complete --channel <channel-id> --message-id <request-id> --outcome done|failed
deepseekbot takeover-cancel --channel <channel-id> --message-id <request-id> [--bot <bot-id>]
```

接管交接是 Bot 请 Human 操作它的 Computer 或 Bot 浏览器完成一步它自己不能做的事，例如登录或验证码。Bot 调用 `takeover_request`；对话里出现一张卡片，含标题、Bot 的一句话和打开 Computer 或浏览器视图的「接管」按钮，Human 不在应用里时会收到推送。Bot 的这一轮立即结束：Human 可以继续聊天，Bot 照常回复。完成、无法完成、取消和过期都会发布一条结果，经 Bot Inbox 唤醒 Bot，Bot 先重新观察画面再继续；Bot 用 `takeover_cancel` 撤回自己的请求时不会唤醒自己。每个 Bot 同时最多一个待处理请求，默认 30 分钟后过期（最多 120 分钟）。

`takeover-request` 以 Bot 身份、通过与 Bot 工具相同的 Host 代码发布卡片，默认在 Bot 的私聊里，`--channel` 可指定 Bot 能发言的 Channel。`takeover-complete` 和 `takeover-cancel` 以 Human 身份操作，与卡片按钮相同，并唤醒 Bot；`takeover-cancel --bot <bot-id>` 以该 Bot 身份撤回请求，与 `takeover_cancel` 相同，不唤醒任何人。`takeovers <bot-id>` 读取与 `takeover_list` 相同的内容。被拒时保留错误码：`unknown-bot`、`invalid-input`、`target-off`（浏览器或 Computer 权限未开启）、`channel-unavailable`、`already-pending`、`not-found` 和 `not-pending`。每次请求、拒绝和结果都以来源 `takeover` 记入诊断日志，只含 id、数量、长度和耗时，从不含标题或那句话；用 `deepseekbot diagnostic-logs` 或 `diagnostic-logs-export` 读取。

### Local Computer 视频

Windows 本机 Computer 使用 [Android 纯视频路径](local-computer-video.zh.md)。前文 `computer-frame`、`computer-takeover`、`computer-input` 的描述只适用于旧目标；迁移后的 Windows 目标返回 `update-required`。Bot／诊断截图仍是独立能力，并遵守全局 Bot 暂停。

```bash
deepseekbot computer-video status
deepseekbot computer-video open --out /private/absolute/offer.json
deepseekbot computer-video signal --args-stdin
deepseekbot computer-video heartbeat --args-stdin
deepseekbot computer-video takeover --args-stdin
deepseekbot computer-video input --args-stdin
deepseekbot computer-video release --args-stdin
deepseekbot computer-video resume --args-stdin
deepseekbot computer-video close --args-stdin
```

所有操作使用 `POST /api/computer/video`，stdout 输出一个 JSON 文档。`status` 报告全局 `paused`、`viewerCount`、`controlHeld`、媒体健康与 runtime；`controller`、binding 和 grant 仅属于认证调用者。手机使用已配对设备身份，本机认证 CLI 使用 Host owner 身份，不能通过提交设备 ID 冒充手机。第二观看端收到 `viewer-limit`。

手机只在加密 LAN 通道内发送准确的命令路径，并使用 Noise 准入后的设备身份直接分派。Connect 在 owner 执行之前拒绝视频；请求里的 route 标签不能覆盖服务端 listener。Host owner CLI 成功不能证明手机配对或 LAN／原生播放。手机单一「交还 Bot」动作使用 `resume`，它与重新连接在确认停滞时仍可用，独立于输入资格；底层 `release` 保持暂停，重连只恢复观察。回滚曾写入暂停状态的版本前，先阅读[恢复与降级](local-computer-video.zh.md#恢复与降级)。

`open` 不暂停 Bot。它返回服务端生成的 `binding`（`computerId`、`runtimeId`、`viewerId`、`attemptId`），把 gathered offer 写入全新的私密 `--out` 文件，stdout 不含 SDP。后续命令 JSON 从 stdin 读取：`signal` 接收 `binding` 和 `answer: {"type":"answer","sdp":"…"}`；`heartbeat` 接收 `binding` 和真实接收端呈现产生的 `playback: {"presentedFrames":42,"presenting":true}`。伪造心跳不算播放验证。`takeover` 接收 `binding`；强制接管还需 `force:true` 与 CLI 的 `--confirm`，但 T1 会更早拒绝第二观看端。

`input` 接收 `binding`、grant 的 `generation`、严格递增的 `sequence`，以及 `input: {"kind":"click","x":10,"y":20,"button":"left","count":1}` 或 `input: {"kind":"scroll","direction":"right","amount":2,"x":10,"y":20}`。滚动支持 `up`、`down`、`left`、`right`，步数为 1–50；坐标为完整显示器的实际像素。输入只执行一次；`input-result-unknown` 表示不可重发。`release` 接收 `binding` 和可选 `generation`，保持持久暂停；`close` 接收 `binding`，关闭媒体但不恢复 Bot。`resume` 必须提交当前 `runtimeId`，重启后无需 viewer/helper 也可执行：先作废控制、排空 Human 输入，再恢复 Bot。有其他控制者时返回 `control-conflict`；旧 runtime/attempt/grant 均被拒绝。

`computer-diagnostics` 和 `computer-logs` 提供有界生命周期证据。常见拒绝包括 `not-running`、`helper-missing`、`helper-start-failed`、`viewer-limit`、`media-not-live`、`control-required`、`control-disconnected`、`stale-attempt`、`stale-grant`、`pause-write-failed`、`drain-timeout`、`queue-full` 和 `connect-carrier-required`。证据中不打印信令文件、凭据或输入内容。CLI 信令成功不等于视频呈现或真机验收。

### 浏览器和 Computer：观察、系统包、传输与日志

```bash
deepseekbot browser-observation <bot-id> [--tab <tab-id>] [--out /tmp/frame.png]
deepseekbot browser-takeover-audit <bot-id>
printf '%s' "<takeover-token>" | deepseekbot browser-takeover-recording --token-stdin
deepseekbot browser-profile-set <bot-id> --profile work
deepseekbot browser-packages
deepseekbot browser-install-packages --package libnss3 --package libgbm1 --confirm --wait
deepseekbot computer-install-packages --confirm --wait
deepseekbot computer-diagnostics
deepseekbot computer-logs [--bot <bot-id>] [--plugin <name>] [--entity <id>] [--since <ms>] [--limit 100]
deepseekbot computer-exports
deepseekbot computer-export [--dir /abs/exports] [--out /tmp/computer.tar]
deepseekbot computer-upload /abs/path/backup.tar [--name restore.tar]
deepseekbot computer-import restore.tar --confirm
deepseekbot computer-open-dir [--dir /abs/exports]
deepseekbot computer-open-permission-settings --permission accessibility|screen-recording --confirm
deepseekbot computer-webrtc [--probe]
deepseekbot browser-webrtc --viewer <id> [--probe]
```

本地 Browser 进程已运行但尚无所属当前标签页时，`browser-observation` 返回 `viewerUrl: null`；进程就绪不等于画面就绪。`browser-frame` 区分已停止/无标签页的拒绝（404）与有界等待后首帧不可用的 `host-refused`（503）。

`browser-observation` 返回浏览器面板轮询的同一份状态：浏览器是否在运行、标签页和当前标签页、接管状态、已保存的 profile 和目标。当前画面不会以 base64 打印，只汇总为 `{mimeType, bytes}`，给出 `--out` 时保存到该文件。`browser-takeover-audit` 按时间顺序列出 Bot 的接管事件。`browser-takeover-recording` 读取一次接管及其录下的输入；token 是接管链接里 `takeover=` 的值，从 stdin 传入。`browser-profile-set` 为 Bot 选择浏览器 profile（`default` 恢复默认），命名规则与面板相同。

机器缺少 Chrome 所需的系统库时，`browser-open` 以 `provision-missing-libs` 拒绝，并在说明里列出需要的包。`browser-packages` 报告 Host 能否安装这些包（`access`）以及上次安装的进度；`browser-install-packages` 安装指定的包，`computer-install-packages` 安装本机 Computer 报告缺少的包。两者都和面板上的安装按钮一样需要 `--confirm`，`--wait` 会轮询到安装结束。Host 没有管理员权限时以 `needs-administrator` 拒绝。

`computer-diagnostics` 返回 Computer 最近的诊断事件，`computer-logs` 返回 Host 的运行日志，可按插件、Bot（`--bot`）、实体、时间（`--since`，毫秒时间戳）和条数过滤。归档命令只适用于容器 Computer，否则返回 `container-only`。`computer-export` 把归档写入导出文件夹（或 `--dir`），带 `--out` 时立即下载；一次性下载 token 不会被打印。`computer-upload` 把本地 `.tar` 流式上传到导出文件夹，`computer-exports` 列出其中的归档，`computer-import <archive> --confirm` 会停止容器并用该归档恢复数据。`computer-open-dir` 在 Host 的文件管理器中打开导出文件夹。

`computer-webrtc` 读取手机能否通过 WebRTC 呼叫容器 Computer（`/api/computer/webrtc`）：容器公布的 tailnet 地址和 UDP 端口、空的 ICE 服务器列表和当前通话数；不可用时返回拒绝码和 `fallback: "websocket"`（`not-running`、`media-unavailable`、`tailnet-unavailable`、`tailnet-changed`）。`browser-webrtc --viewer <id>` 对查看器路径为 `/botharness-browser/viewer/<id>/` 的容器 Browser 做同样的事。`--probe` 会打开手机使用的信令连接（`/api/computer/webrtc/signaling`、`/api/browser/webrtc/signaling?viewer=<id>`），完成 Selkies 握手直到收到服务端 offer，并报告其中的 ICE-lite 标志和媒体候选地址；试连期间容器改走 WebRTC，结束后切回 WebSocket，所以桌面端查看器会重连一次。手机用设备凭据通过 `/botharness-device/api/…` 访问同样的路由。

Web 端的实时画面通道（`/api/remote.mux`）和查看器事件上报（`/api/computer/diagnostics/viewer`）保持仅限 UI；`browser-frame`、`browser-observation` 和 `computer-diagnostics` 为 Agent 提供同样的信息。

### 分层排查：经过模型与绕过模型

同一个任务跑两遍，就能定位出问题的那一层：

```bash
# A：经由 Bot，模型 → Harness → 工具 → 浏览器
deepseekbot send <bot-id> --body "打开 https://example.com，只回复页面主标题。"

# B：绕过模型，执行同一段浏览器工具代码，同样检查浏览器权限并记审计
deepseekbot browser-tools
printf '{"url":"https://example.com"}' | deepseekbot browser-tool <bot-id> browser_open --args-stdin
deepseekbot browser-tool <bot-id> browser_observe
deepseekbot browser-tool <bot-id> browser_screenshot --out /tmp/shot.jpg
```

B 失败，说明问题在浏览器本身（例如网站拒绝 headless Chrome），与模型无关。B 成功而 A 失败，就看 Bot 的工具调用是被拒绝了（Harness：权限或审批），还是根本没调用、或参数填错（模型）。`browser-tool` 从标准输入读取工具参数 JSON 对象，工具名带不带 `browser_` 前缀都可以，第一个图片结果保存到 `--out`。直接调用会以会话 `direct` 记入审计。

Computer 的用法相同。先启动它，再用一个有 Computer 权限的 Bot 调用经过筛选的工具：

```bash
deepseekbot computer-start --target local
deepseekbot computer-tools
deepseekbot computer-tool <bot-id> computer_list_windows
deepseekbot computer-tool <bot-id> computer_get_desktop_state --out /tmp/desktop.png
```

不在筛选目录里的工具、没有 Computer 权限的 Bot、未启动的 Computer，`computer-tool` 都会拒绝，提示与 Bot 收到的一致。

要看路径 A 中 Bot 实际做了什么，在 `send` 之后读取它的工具调用记录：

```bash
deepseekbot bot-trace <bot-id> --turns 1
```

每一轮列出模型调用的工具及截断后的参数、结果（`ok`、`error`、审批被拒时为 `denied`、`cancelled` 或 `pending`）、如有审批则附上审批决定，以及结果的开头部分。`secret_cli`、`secret_mcp_connect` 和 `ask_secret` 的参数与结果永远不会返回。`denied` 指向 Harness（权限或审批）；该调的工具没调或参数错，指向模型；同一个工具在路径 B 也失败而这里报 `error`，指向浏览器或 Computer 本身。`--session` 可读取该 Bot 的其他会话，例如某个 Assignment。

### 绕过模型调用 Harness Bot 工具

Bot 用来发言、读取 Inbox、管理 Channel 和计划的 Harness 工具，也可以用同样的方式以该 Bot 的身份直接调用，不经过模型：

```bash
deepseekbot bot-tools
deepseekbot bot-tool <bot-id> channel_list
printf '{"channel_id":"dm-<bot-id>","body":"direct hello"}' | deepseekbot bot-tool <bot-id> bot_send_message --args-stdin
deepseekbot bot-trace <bot-id> --session direct --turns 5
```

联系同一已验证 Tailscale tailnet 或已登录同一 Connect 账号的在线 Host 上的 Bot 时，先查询 `list_bot_contacts`。远端联系人保留独立的 `botId`、`hostId`、所属设备信息、可用能力和公开简介；无法取得的设备信息为 `null`。

Connect 沿用相同命令与 Bot 标识；同账号 Host 之间不需要 Human 设备配对。Host 与 Relay 都必须支持 Bot 网络身份登记。退出账号或移除设备会撤销该协作范围，暂时断网只影响送达；若另一协作网络的关系仍有效，双方仍可联系。该路径只开放 Bot 联系人和消息能力，不授予 Human 设备管理权限。账号令牌过期时可以刷新并重做被认证层拒绝的控制面请求，但不会重发 Bot DM。

Tailnet 和 Connect 通向同一个 Host/Bot 时，共用一个联系人和 DM。每次明确发送都会先刷新路由事实，再选择路线；如果离线期间联系人缓存已清空，本次发送会先查询当前目录。网络恢复后可直接明确发送新消息，不必先手动列出联系人。失败或结果未知的消息不会转到另一条路线重发，重启后也不会补发。

```bash
deepseekbot bot-tool <bot-id> list_bot_contacts
printf '{"bot_id":"<contact-botId>","body":"请检查这个 iOS 问题。"}' | deepseekbot bot-tool <bot-id> bot_send_message --cause-event <owned-source-event-id> --args-stdin
```

远端文字 DM 进入接收 Bot 的普通 Inbox。接收不代表已读或完成；离线时无法送达，确认中断时可能结果不确定。设备桥不保存待发送队列、不自动重试，也不在重连后补发。决定下一步前先检查已有 Channel 历史。

网络拒绝码包括：目标不可达时的 `unable-to-deliver`、网络成员或 Host 身份校验失败时的 `network-denied`，以及可能已接收但缺少认证回执时的 `delivery-unknown`。这些错误不授权自动重试。远端 `botId` 是不透明标识，应直接使用联系人查询返回的值。首次认证通信将远端 Host 公钥固定在已有 Channel 元数据中，之后密钥变化会被拒绝。`channels` 和 `channel-messages` 与只读远端 DM 视图使用同一个 Host owner，读取已接收历史。

每次联系人查询都会刷新公开资料，包括新建 Bot、简介和能力变化。归档或删除 Bot 后，使用旧联系人结果发送也会被拒绝。同名新 Bot 拥有不同的 `botId` 和独立对话历史。`channels` 刷新远端对话资料并返回 `remoteAvailability`：`available`（可联系）、`unavailable`（当前路线不可达）、`withdrawn`（已退出协作范围）或 `bot-unavailable`（可达 Host 不再公开该 Bot）。这些状态不描述远端 Bot 的私有工作。

缺少已认证网络成员信息的旧版远端 DM 历史仍可读取。升级时，这些关系中尚未开始的工作会因来源无法确认而停止；之后重新建立认证联系也不会重放。已经开始的本地工作继续沿用原有权限。

确认退出协作范围后，已接收但尚未开始的工作会被取消；重新上线或重启 Host 不会恢复它。已开始的工作可以在本地完成，但回复仍须通过当前资格校验。显式联系第三位同事会保留因果链和 32 跳唤醒上限；一个 Host 的联系人不会自动授权另一个 Host 联系他们。

Channel 和外部 IM 可通过统一发送工具发送：

```bash
printf '{"channel_id":"dm-<bot-id>","body":"检查已通过。"}' | deepseekbot bot-tool <bot-id> bot_send_message --args-stdin
```

回复明确引用可信 `source_event_id`；主动发送明确指定目标。此切片的 `resolve_inbox_ids` 只能包含明确引用的这一来源，送达后才结清；单独检查 `inboxResolution`，失败时用 `inbox_resolve` 补状态，不要重发已送达消息。`end_turn` 默认 false，在原生模型回合中仅在发送及请求的结清成功后结束回合；直接 CLI 没有模型回合需要结束。未提供持久 Group `draft_id` 的普通 CLI 调用是新消息，不是通用持久重试命令；相同草稿与内容的重放保留原消息标识。当前统一入口也支持群聊、Bot DM 和外部 IM：回复使用可信 `source_event_id`，主动发送明确指定 `channel_id`、同事 `bot_id`、`bridge_targets` 返回的 `grant_id`，或 `binding_id` 与 `conversation_id` 的组合；这些目标形式与回复来源互斥。群聊保留原有草稿审查，修订时传入 `draft_id` 与 `observation_id`；重启恢复使用 `recover`。`attachments` 接受导入的附件引用；外部文件回复仅支持一个文件和空正文，主动外部文件发送会被拒绝。没有确认回执的外部发送不会结清 Inbox 或结束回合。

`bot-trace --session direct` 可查看直接调用结果。

`channel_action` 通过同一 `bot-tool` 执行表情与草稿动作：明确指定 `channel_id`，`action` 使用 `inspect`、`drop` 或 `react`，并提供相应草稿或消息引用。它不能发送正文。模型仅看到 `bot_send_message` 发送入口，旧发送名仅供直接 CLI 兼容。主动联系同事使用 `bot_id`；可达外部会话使用 `binding_id` 与 `conversation_id`，均与其他目标形式互斥。

`bot-tools` 列出可直接调用的工具及其输入 schema。`bot-tool` 从标准输入读取参数 JSON 对象，执行与 Bot 回合中完全相同的工具代码，保留工具自身的参数校验、成员资格和权限检查，返回 `{slug, tool, sessionId: "direct", result}`。直接调用没有入站 Channel，回合中默认使用入站 Channel 的地方要显式传 `channel_id`。直接读取不会把 Inbox 条目标为已读。Bot 之间发送时，使用 `--cause-event <source-event-id>` 指定本 Bot 已接收的真实 Source Event；Host 检查接收归属、当前 Channel 成员资格及来源副作用限制。缺少来源仍会拒绝；其他 Bot 的来源返回 `source-unavailable`。该参数独立于工具的唯一发送目标。失败时以非零退出并给出错误码：只能在 Bot 回合内运行的工具（创建或等待 Assignment、提问卡片、切换 Memory 分支、申请工作区授权、交给模型的图片）返回 `tool-not-direct`，此外还有 `invalid-args`、`unknown-bot`、`bot-paused`，以及带工具原始消息的 `tool-failed`。每次调用都记入 Host 的近期直接调用记录，`bot-trace --session direct` 可读取，Host 重启后清空。

通过 `bot-tool <bot-id> inspect_assignment --args-stdin` 传入 `{"session_id":"<assignment-session-id>","report_offset":0}`，无需模型即可选定最新已接受报告。续读传入 `{"session_id":"<assignment-session-id>","report_offset":2000,"report_source_event_id":"<reportPage.reportSourceEventId>"}`，偏移量使用返回的 `reportPage.nextOffset`，不要假定页长。每页最多 2,000 个 Unicode 码点。新报告到达或 Host 重启后，携带身份仍读取原报告；从偏移 0 开始且不带身份时才重新选择最新报告。非零偏移缺少身份会以 `REPORT_ID_REQUIRED` 拒绝；旧调用者应从偏移 0 重新开始并保留返回的身份。该身份属于报告 Source Event，不是 Assignment 起因的 `sourceEventId`。

Host 每页核验 Bot/Assignment 归属和正文可用性，再按已接受元数据匹配原生 Session 正文。未知或不匹配的报告身份返回 `REPORT_UNAVAILABLE`；正文已删除或原生内容缺失时明确拒绝，不切换到新报告。历史记录保留旧元数据兼容路径及最多 64 个原生候选的查询限制。Spill locator 始终是不透明引用；报告身份不保证正文永久保留。

`bot_create` 以该 Bot 的身份创建一个空白 PersonaBot，与 Bot 在聊天中创建时相同：`display_name` 必填；`description`、`tags`、`avatar_path`（Bot 记忆仓库或工作区授权内 PNG、JPEG 或 WebP 文件的绝对路径）、`soul`、`core_memory` 和 `memory_location` 可选。返回 `bot_id`、`display_name`、`dm_channel_id`、`memory_dir` 和 `model`（新 Bot 使用 Host 默认模型时为 `host-default`，有自己的模型后为 `set`），同时打开新 Bot 的私聊，并在创建者 Bot 的 Human 私聊中留下一条提示。拒绝时返回错误码：`invalid-input`、`invalid-avatar`、`invalid-memory-dir`、`git-not-found` 和 `memory-unavailable`。直接运行时不经过 Bot 回合中的工具审批，因为运行命令的就是 Human 本人。

```bash
printf '{"display_name":"Tim","tags":["translator"],"soul":"# Tim\\nCalm and precise."}' | deepseekbot bot-tool <bot-id> bot_create --args-stdin
```

结合 `send` 与 `bot-trace` 即可定位问题：直接调用成功而同一请求经 `send` 失败，去 `bot-trace` 看模型的调用；直接调用也失败，问题在 Harness 或运行时。

`send` 由 Host 建立已注册 Bot 的 DM，返回 `receipt`、已提交的人类 `message`、`sourceEventId`、处理 `state` 和 `replies`。回复必须关联这一条请求及归该 Bot 所有的 Session；其他请求、审批／提问卡片、通知和失败不算回复。真实回复同时验证当前模型和 key。默认期限 120 秒，最多 600 秒；发送不会自动重试。开始发送后的错误包含回执，请先用 `send-status` 查结果。指定同一 `human-<UUID>` ID 与正文可由 Host 去重，改变正文则返回错误码。已处理但无回复返回 `reply-not-produced`，需要修复返回 `send-needs-repair`。`--reply-to <消息-id>` 把这条消息作为对该 DM 中某条旧消息的回复发出，与手机上左滑回复相同；目标不在这个 DM 中时 Host 拒绝。

问题答案由 stdin 提供：`{"answers":[{"id":"question-id","selected":["Blue"],"custom":"可选文字"}]}`；从在线历史获取问题 ID 与选项。Host owner 只应用一次决定，重复或竞争操作返回原有错误码。工具审批提供仅允许一次和拒绝；问题状态保留 pending/submitted/answered/expired。`release-info` 只读生命周期，工作区授权使用 `workspace-options` 返回的 ID。

Host 离线时返回 `host-unreachable`，不提交消息；过期令牌返回 `host-unauthorized`，tailnet 名称不在 Host 的 `--trusted-host` 列表中时返回 `host-untrusted`，无效响应返回 `host-protocol-error`。Bridge 和 gateway 错误码原样透传。stdout 仍只有一份 JSON，支持 `--compact`；认证值不打印、不保存。

凭据写入在落盘前后验证真实 YAML；失败恢复原文件字节，新文件失败则删除。空的 `refs: {}` 转成块映射，保留注释与 records；含空行及尾换行的多行值可完整读回。null ref 值、空文件、非空内联 refs 映射返回 `bad-credentials` 且不改文件；编辑前请将 refs 改成块映射。

### 待办示例插件

这些命令对应待办示例插件（`@botharness/todo`，[ADR-0203](adr/0203-bot-mode-is-a-dockable-layout-that-plugins-extend-with-dock-panels.md)）。只有安装了该插件的 Host 才能使用，其他 Host 返回 `todo-plugin-missing`。

```bash
deepseekbot todos
deepseekbot todo-add --title "续签护照"
deepseekbot todo-update <todo-id> --done
deepseekbot todo-update <todo-id> --title "续签两本护照" --not-done
deepseekbot todo-remove <todo-id>
deepseekbot todo-tools
printf '{"title":"给植物浇水"}' | deepseekbot todo-tool <bot-id> todos_add --args-stdin
```

`todos` 返回 `{ok, todos}`，按创建时间从早到晚排列；每条待办包含 `id`、`title`、`done`、`createdAt`、`updatedAt` 和 `createdBy`（`{kind:"human"}` 或 `{kind:"bot", slug}`）。`todo-add`、`todo-update` 和 `todo-remove` 以 Human 身份修改列表，与之后的待办面板相同。`todo-tools` 列出 Bot 工具 `todos_list`、`todos_add`、`todos_update` 和 `todos_remove` 及其输入 schema；`todo-tool` 以指定 Bot 的身份直接运行其中一个工具，不经过模型，返回 `{ok, slug, tool, result}`。拒绝时带错误码：`invalid-input`（标题为空或过长、更新时没有要改的内容、未知工具）、`invalid-args`（工具参数不符合工具 schema）、`todo-not-found`、`todo-limit`（列表已有 1,000 条待办）和 `unknown-bot`。

### 自动审批（审批模板）

PersonaBot 可以选择一个审批模板（[ADR-0207](adr/0207-an-approval-template-lets-a-reviewer-session-answer-tool-approvals.md)）。选中后，审批员会先按模板回答此 Bot 的审批，再决定是否发卡片：越出沙箱的 Shell 命令、文件工具、打开附件、`secret_cli` 和 `secret_mcp_connect` 调用，以及电脑和浏览器授权。对密钥工具，审批员只看到程序、参数、账号和占位符名称，看不到任何密钥值或环境变量值；对授权，它看到设备和 Session。`cautious` 把密钥工具和两种授权都交给 Human；`get-work-done` 允许已知程序配合它自己服务的账号，并在任务需要时允许浏览器授权。任何修改审批策略的调用仍然以卡片交给 Human。

模板是整个 Profile 共用的模板库。内置两个只读模板：`cautious` 和 `get-work-done`。其余每个模板都是一个 Markdown 文件 `$DSH_HOME/botharness/approval-templates/<name>.md`，设置页（设置 → 自动审批）和下面的命令读写的是同一个文件。名称只用小写字母、数字和短横线；内容最多 32 KiB，第一个 `#` 标题和第一行正文分别作为标题和简介。

```bash
deepseekbot approval-template list [--bot <bot-id>]
deepseekbot approval-template show cautious
deepseekbot approval-template create night-shift --file night-shift.md
cat night-shift.md | deepseekbot approval-template create night-shift --text-stdin
deepseekbot approval-template create my-cautious --from cautious
deepseekbot approval-template edit night-shift --file night-shift.md
deepseekbot approval-template delete night-shift
deepseekbot approval-template-set <bot-id> night-shift
deepseekbot approval-template-set <bot-id> off
```

`list` 返回 `{templates}`，每个模板含 `name`、`title`、`description`、`builtIn` 和 `usedBy`（选用它的 Bot）；加 `--bot` 时还返回该 Bot 当前选中的 `selected`，未选为 `null`。`show` 返回 `{template}`，含完整 Markdown `text`。`create` 和 `edit` 返回 `{template}`；`create --from` 复制另一个模板的内容，内置模板就是这样改的。`delete` 返回 `{template, clearedBots}`：所有选用了它的 Bot 都会清空选择，审批改回卡片。`approval-template-set` 返回 `{bot}`，其中是新的 `approvalTemplate`。`approval-templates` 和 `approval-template-show` 仍可用，分别等同于 `list` 和 `show`。

Bot 在自己的 Shell 里运行这些命令时，新建模板、或编辑没有任何 Bot 在用的模板，都不需要卡片，所以 Bot 可以替你起草模板。选择模板，以及编辑或删除某个 Bot 正在使用的模板，需要 Human 决定，或在独立管理范围中显式保存的授权规则；模型审批员不能代答。你拒绝后，文件保持不变。拒绝时带错误码：`invalid-input`（名称不合法、内容为空或过大、要选择的模板不存在）、`template-exists`、`template-read-only`（内置模板）、`unknown-template` 和 `unknown-bot`。

审批员拒绝的每次调用都会成为 Human Inbox 里的一条 `auto-rejection`。它的 `autoRejection` 含会话、工具、参数、模板和理由。`inbox-allow-once` 就是收件箱里的“仍然允许这一次”：只放行那一次完全相同的调用。Bot 会收到通知并可以重试，同一会话里同一工具、参数完全相同的下一次调用不经审核直接运行。之后的调用仍按模板审核。

```bash
deepseekbot inbox --category action --kind auto-rejection
deepseekbot inbox-allow-once autoreject:<source-event-id>
```

`inbox-allow-once` 返回 `{accepted, channelId, messageId}`，其中 `messageId` 是 Human 在 Channel 里的放行消息。已经放行过的条目，或 Bot 已不在该 Channel 时，返回错误码 `auto-rejection-unavailable`。

**熔断。** 同一会话连续 3 次被拒绝，或累计 20 次被拒绝后，此会话的自动审批暂停：之后每个请求都发卡片，Channel 里会出现一条提示。Human 在此会话里给出的下一次批准（卡片上或收件箱里）会恢复自动审批并重新计数。阈值固定。熔断状态和尚未使用的“允许这一次”只保存在 Host 内存里，所以 Host 重启后自动审批会重新计数并恢复，Bot 还没用掉的放行会失效，收件箱条目仍算已处理。

### 语音消息（TTS Provider）

Bot 可以把回复读出来：`bot_send_message` 在 `body` 之前接受 `voice: true`，文字先提交，然后 Host 用 Bot 绑定的 TTS Provider 合成，把音频挂到同一条消息上。桌面端和 iOS 在文字上方显示语音条。代码块、文件路径、链接和表格不会照读，而是换成简短的口头提示。合成失败时消息照常显示，没有语音条，并说明原因。只有本地 Channel 支持语音；发给其他 Bot 的私信或外部 IM 会话只发文字，并返回 `unsupported-destination`。Host 从不录制或保存 Human 的声音。

```bash
deepseekbot voice-providers [--bot <bot-id>]
printf '%s' "$FISH_AUDIO_KEY" | deepseekbot voice-provider-add fish-audio --model s2.1-pro-free --voice <reference-id> --key-stdin
deepseekbot voice-provider-add custom --name Kokoro --base-url http://127.0.0.1:8880/v1 --model kokoro --voice af_bella
deepseekbot voice-provider-test <provider-id> [--voice <voice-id>]
deepseekbot voice-set <bot-id> <provider-id> [--voice <voice-id>]
deepseekbot voice-set <bot-id> off
deepseekbot voice-synthesize --bot <bot-id> --text '完成了，见 `src/app.ts`。' --markdown --out /tmp/voice.mp3
deepseekbot voice-provider-remove <provider-id>
```

预设有 `custom`（任何兼容 OpenAI `/audio/speech` 的端点，例如本地 Kokoro-FastAPI 或 LocalAI，密钥可选）、`local`（下文的本地语音服务，无需密钥）、`fish-audio`、`elevenlabs` 和 `openai`（需要密钥）。`voice-providers` 返回 `{presets, providers, bot?}`，每个 provider 列出 `id`、`name`、`preset`、`baseUrl`、`model`、`defaultVoice` 和 `keySet`，从不返回密钥。密钥只从 stdin 读取，保存在 Host 凭据存储中。`voice-provider-test` 合成一小段话，返回 `{ok: true, latencyMs, bytes, mime}` 或 `{ok: false, code, message}`。`voice-set` 绑定 Bot 的声音，`off` 解除绑定；移除 provider 会清掉使用它的 Bot（`clearedBots`）。`voice-synthesize` 使用 Bot 的绑定（`--bot`）或指定 provider（`--provider`），文字来自 `--text` 或 `--text-stdin`，加 `--markdown` 时套用朗读规则，把音频写到绝对路径 `--out`，输出 `{providerId, voiceId, mime, bytes, latencyMs, text, out}`。拒绝时带错误码：`usage`、`invalid-input`、`key-required`、`unknown-provider`、`voice-not-configured`、`provider-unauthorized`、`provider-rate-limited`、`provider-unavailable`、`provider-timeout`、`provider-rejected` 和 `provider-bad-response`。每次合成会在 `logs.db` 写一条 `voice` 记录，包含 provider、延迟和大小，不含文字或密钥。

### 本地语音服务

Bot 可以用 `setting-up-local-voice` skill 在 Host 所在的电脑（macOS 或 Windows）上部署一个免费、离线的语音服务：一个 Python 脚本在 CPU 上运行 SenseVoice（语音转文字）和 Kokoro（中英文语音合成），在 `http://127.0.0.1:8790/v1` 提供 OpenAI 音频接口。Host 不会启动或保活它，由用户自己启动和停止。

```bash
deepseekbot voice-local-kit --dir ~/BotHarness/voice      # 绝对路径；离线可用，Bot 的 shell 里也能用
cd ~/BotHarness/voice && python3 -m venv .venv
.venv/bin/python -m pip install "sherpa-onnx>=1.13.8,<2" numpy
.venv/bin/python botharness_voice.py download   # SenseVoice 166 MB + Kokoro 365 MB
.venv/bin/python botharness_voice.py start      # 另有 status、stop、serve、selftest
deepseekbot voice-provider-add local
deepseekbot voice-set <bot-id> <provider-id> --voice zf_001
deepseekbot voice-provider-add local --kind asr --language zh
deepseekbot voice-asr-set <bot-id> <asr-provider-id>
```

`voice-local-kit` 写出 `botharness_voice.py`，输出 `{dir, script, baseUrl, models, steps: {macos, windows}}`。Windows 上用 `py -3 -m venv .venv` 和 `.venv\Scripts\python`。脚本每个命令输出一行 JSON（`ok: false` 带 `code` 和 `message`）；`selftest` 先合成一句话再识别回来。`local` TTS 预设不需要密钥，使用 Kokoro 音色，例如 `zf_001`、`zm_009`、`af_maple`、`af_sol` 和 `bf_vale`（完整列表见 `GET /v1/models`）。`local` ASR 预设（`--kind asr`）使用 SenseVoice（模型 `sensevoice`，支持 `zh`、`en`、`ja`、`ko`、`yue`），供 Bot 通话使用。服务没启动时，`voice-provider-test`、语音消息和语音识别会报 `provider-unavailable`，并说明“The local speech service at … is not running”。

Tob 的受限 CLI 支持 `voice-providers`、`voice-provider-test`、`voice-provider-add`（只限无密钥的 `local` 和 `custom` 预设，TTS 或 `--kind asr`，没有密钥参数）、`voice-provider-remove`、`voice-set` 和 `voice-asr-set`；写操作会弹出审批卡片。需要密钥的 Provider 由用户在设置 › 语音中添加。

### Bot 通话与语音识别（ASR Provider）

已配对的 iPhone 可以给 Bot 打电话，前提是 Host 运行在 Mac 或 Windows 电脑上。手机通过 WebRTC 在已配对的局域网线路或 Tailscale 上发送麦克风音频（Connect 不承载通话，会返回 `connect-carrier-required`）。Host 用内置的语音活动检测切出每一句话（咳嗽、敲击等短噪声会被忽略），通过 Bot 的 ASR Provider 转成文字，并以 Human 消息发到 DM。Human 说完后，Host 会立即播放一声短的“嗯”（ASR 语言不是中文时为 “Mm-hm”），不经过模型。Bot 用 `voice: true` 回复；如果 `voice` 写在 `body` 之前，Host 会从流式草稿里按句合成并播放，不等消息提交。草稿被放弃或回合被取消时立即停止，不留下任何内容。消息提交后，已经播放的句子拼成它的语音条，所以存档和通话里听到的一致；如果 `voice` 写在 `body` 之后，则在提交后再播放。Bot 说话时 Human 可以直接插话：说话约 200 ms 后 Bot 的音量降到 30%，约 500 ms（或一句有两个实词的短话）后停止播放，Human 这句话进入 DM。咳嗽、敲击、短噪声、一声“嗯”以及 Bot 自己的回声都不会打断它，音量随后恢复。被打断的回复只把已经听到的部分存成语音条。Bot 还在忙上一轮时，手机只显示提示，不会发声；通话里刚说的那句话引起的这一轮不会显示这个提示。录音从不保存：每句话的音频在转写后立即丢弃。

```bash
printf '%s' "$OPENAI_API_KEY" | deepseekbot voice-provider-add openai --kind asr --model gpt-4o-mini-transcribe --key-stdin
deepseekbot voice-provider-add custom --kind asr --name Whisper --base-url http://127.0.0.1:8000/v1 --model whisper-1 --language zh
deepseekbot voice-asr-set <bot-id> <asr-provider-id> [--language zh]
deepseekbot voice-asr-set <bot-id> off
deepseekbot voice-defaults
deepseekbot voice-default-set asr <asr-provider-id> [--language zh]
deepseekbot voice-default-set tts <tts-provider-id> [--voice <voice-id>]
deepseekbot voice-default-set <tts|asr> off
deepseekbot voice-vad-set -- <dbfs>
deepseekbot voice-vad-set default
deepseekbot voice-transcribe --bot <bot-id> --file /abs/question.wav [--language zh]
deepseekbot voice-dictate --file /abs/question.wav [--bot <bot-id> | --provider <asr-provider-id>] [--language zh]
deepseekbot call-readiness <bot-id>
deepseekbot call-simulate <bot-id> --file /abs/question.wav [--reply-wait 90]
deepseekbot call-simulate <bot-id> --script /abs/timeline.json
deepseekbot call-simulate <bot-id> --file /abs/question.wav --video /abs/camera.mp4
deepseekbot call-simulate <bot-id> --file /abs/question.wav --screen /abs/frames-folder
deepseekbot call-simulate <bot-id> --file /abs/question.wav --screen /abs/screen.mp4 --no-save
deepseekbot call-frame <message-id> <cell> [--out /abs/cell.jpg]
deepseekbot call-status
deepseekbot call-hangup <call-id>
```

ASR 预设有 `custom`（任何兼容 OpenAI `/audio/transcriptions` 的端点，密钥可选）、`local`（上文的本地语音服务）、`openai`、`groq` 和 `soniox`（WebSocket 流式识别，需要密钥，模型 `stt-rt-v6` 和 `stt-rt-v5`）。`voice-providers` 在 `asrPresets` 和 `asrProviders` 下列出它们，`bot.asr` 显示绑定。对 ASR Provider 运行 `voice-provider-test` 会转写半秒静音。`voice-transcribe` 读取 16 位 PCM WAV，输出 `{providerId, text, latencyMs}`。`voice-dictate` 不用麦克风跑输入框的语音输入链路：打开一个 Host 听写会话（`--bot` 用 Bot 的 ASR：它自己的绑定，没有绑定时用 Host 的默认 ASR Provider；`--provider` 用指定 Provider；都不带时用 Host 的默认 ASR Provider，还没有默认时才用第一个流式 ASR Provider），把 WAV 按 200 ms 一块的 16 kHz PCM 推进去，结束后输出 `{id, providerId, mode, state, text, audioMs, heard}`。流式 Provider（如 Soniox）的 `mode` 是 `stream`；否则是 `segments`，由 Host 用语音活动检测按停顿切段逐段转写。`heard` 列出实时文字的增长过程。会话只在内存里，15 秒没有音频或说满 2 分钟就结束，同时最多 4 个（`too-many-dictations`）。超过 2 分钟的 WAV 会以 `invalid-input` 拒绝；识别失败时按 Host 的错误码退出；会话被 Host 提前结束时以 `dictation-cancelled` 退出。`call-readiness` 返回 `{ready, missing, asrProviderId, ttsProviderId, media, activeCallId, callElsewhere}`，`missing` 可能是 `asr`、`tts`、`bot`、`media-unsupported`、`media-helper-missing`、`media-unavailable` 或 `local-voice-off`（`local` Provider 的本地服务没在运行）；手机上的通话按钮显示同样的原因。`call-simulate` 不需要手机，直接打开一个合成的 Host 通话，按真实时间播放 WAV（或最多 20 步的 `{"at": 毫秒, "file": "/abs.wav"}` 时间线；带 `"after": "playing"` 的一步会在 Bot 下一次开口后 `at` 毫秒开始，用来测试插话），等到每句被听到的话都有已播放的回复，或 `--reply-wait` 秒用完，然后挂断并输出 `{callId, heard, replies, ackMs, bargeIns, bargeDismissed, firstTextMs, firstAudioMs, answered, events}`。`ackMs` 是从说完到应答声的时间，`firstTextMs` 是从发出转写到 Bot 草稿里出现第一段文字的时间（模型首字加工具调用前缀），`firstAudioMs` 是到第一段回复音频的时间。每条回复列出 `replyId`、`messageId`、已播放的 `sentences`、`bytes`、`textMs`、`responseMs` 和 `audioBeforeCommit`。事件包括 `ack`、`reply-text`、逐句的 `playing`/`played`、`committed`（带 `reused` 和 `synthesized` 句数）、`reply-stopped`（插话后原因为 `interrupted`）、`reply-done`，以及 `barge-suspected`、`barge-in`（`by: duration | words`）和 `barge-dismissed`（`reason: ended | filler`）。合成通话的播放时长与每段音频一致。每个 Host 同时只有一通电话：同一设备会替换自己的通话，其他设备会收到 `call-active`；`callElsewhere` 在拨打前就会说明这一点。桌面端和 Web 窗口共用 Host owner，所以每个窗口会发送自己的 `client` id，第二个窗口会像第二台设备一样被拒绝。手机断开 8 秒后通话结束（`connection-lost`），已发送的消息仍留在 DM。每通电话会在 `logs.db` 写入带耗时的 `voice` 日志，从不记录音频或转写内容。WebRTC 通话每 5 秒采样一次媒体：`call-status` 里的 `perf` 包含 `samples`、`last`（`uplinkPps`、`uplinkKbps`、`uplinkLossPct`、`concealedPct`、`downlinkPps`、`downlinkKbps`、`jitterMs`、`rttMs`、`helperCpuPct`、`disconnects`、`hostCpuPct`）和整通电话的 `{avg, max}` 区间；上行指手机到 Host。`disconnects` 统计 helper 看到 WebRTC 连接断开的次数；helper 在媒体链路断开 15 秒仍未恢复时才放弃；手机心跳中断 8 秒时 Host 仍会结束通话。同样的采样以 `call-media-stats` 写入 `logs.db`，通话结束时再写一行 `call-media-summary`，agent 可以据此比较改动前后的包率和 CPU。加上 `--video`（摄像头）或 `--screen` 时，call-simulate 会共享一个视频文件（用 ffmpeg 读取）或一个按每秒 2 帧截取的 JPEG 文件夹：它运行与客户端相同的关键帧选择逻辑，按音频时间线把每个关键帧作为 `frame` 命令发出，并在输出中加入 `visual: {source, samples, keyframes, sentFrames, frameBytes, pickMs, prepareMs, framePostMs, grids, unchanged, failed}`；每张宫格图列出 `frames`、`dropped`、`layout`、`bytes`、`composeMs`，以及它所附消息的 `messageId` 和 `waitedMs`（识别完成后消息等待宫格图的时间）。事件增加 `visual`、`frame-received`、`grid-built`、`grid-sent`、`grid-unchanged` 和 `grid-failed`；同一张宫格图的 `grid-built` 和 `grid-sent` 带相同的 `grid` 编号。重新编码后仍超过 Host 帧大小上限的帧会被跳过。通话进行中，`call-frame <message-id> <cell>` 返回宫格里某一格的原图：`{messageId, cell, released, cells, source, width, height, bytes}`；用 `--out /abs.jpg` 写出 JPEG 时还会带上 `out`。格子编号就是格子上标的数字（单图视为第 1 格），超出范围会被拒绝并返回 `cell-invalid`。Host 只在内存里保留最近 64 个格子背后的原图，通话结束或被更新的关键帧挤出后返回 `{released: true}`。Bot 工具 `call_frame` 读取同一批原图，并在通话事件里加入 `frame-zoomed`（消息、格子、耗时）。`call-simulate --no-save` 共享但不保存：宫格图不进 DM（消息记录 `visual.unsaved`），通话中 `call-frame <message-id> 0` 返回整张宫格图。保存开启时，Human 沉默期间每 16 个关键帧会生成一条画面记录，即一条带 4x4 宫格图的系统消息；报告在 `visual.records` 列出它们（`messageId`、`frames`、`layout`、`bytes`、`composeMs`、`fromMs`、`toMs`），`visual.saved` 说明是否保存，事件增加 `frame-record`。`--share-ends-at <ms>` 在时间线上的这个时刻像系统那样结束共享（共享的窗口被关闭，或摄像头断开）：之后不再发帧，通话发送带 `stopped: true` 的 `visual off`，`visual.shareEndedAtMs` 报告结束时刻，DM 里会出现一条 `share-stopped` 通话记录，告诉 Bot 通话已改为仅语音。Mac、Windows 和 Web 的通话栏在浏览器结束屏幕共享或摄像头时也会这样做。`--share-pause <from>-<to>` 像手机 App 切到后台那样在这段时间暂停共享：先发带 `paused: true` 的 `visual off`，再发带 `resumed: true` 的 `visual`，报告为 `visual.pausedAtMs` 和 `visual.resumedAtMs`，DM 里出现 `share-paused` 和 `share-resumed` 通话记录。暂停期间到点的帧会被丢弃。

Host 保存一个默认 TTS Provider（可带音色）和一个默认 ASR Provider（可带语言）。没有用 `voice-set` 或 `voice-asr-set` 单独绑定的 Bot，在语音消息、通话、输入框语音输入、`voice-transcribe`、`voice-synthesize` 和 `call-readiness` 中都使用它们；Bot 自己的绑定始终优先。`voice-defaults` 输出 `{defaults: {tts, asr}}`，`voice-providers` 也返回同样的 `defaults`。`voice-default-set` 接 `tts` 或 `asr` 和一个同类型的 Provider，或者 `off`；`--voice` 只用于 `tts`，`--language` 只用于 `asr`。每种类型添加的第一个 Provider 会在还没有默认值时自动成为默认；移除 Provider 时，用它的默认值也会一起清除。`voice-vad-set` 设置 Host 的说话阈值（dBFS，限制在 -70 到 -20），`default` 恢复默认的 -50。负数前要加 `--`（`voice-vad-set -- -55`），否则会被当成选项。Host 的语音活动检测只把比这个阈值响、并且比背景噪声高 12 dB 的声音算作说话，所以数值越低，越能听到小声的麦克风。它影响按停顿分段的语音输入（不支持流式的 ASR Provider，例如本地 SenseVoice）和通话里的说话检测；Soniox 语音输入会发送全部音频，由 Soniox 自己判断断句。`voice-defaults` 和 `voice-providers` 以 `speechThreshold: {dbfs, custom, defaultDbfs, min, max}` 显示它。设置 › 语音里的「麦克风测试」有实时音量条，同一个阈值可以用滑块调。Provider 名称可以不填：不带 `--name` 时 Host 使用预设名，重名时自动加编号（`OpenAI 2`）。设置 › 语音在 TTS 和 ASR 两部分顶部显示同样的默认值，每个 Bot 的语音面板里两项都有「跟随全局默认」。

### 审批员模型

默认情况下，每个 Bot 的审批员用这个 Bot 自己的模型。一个 Profile 级设置可以改成所有 Bot 共用一个审批员模型，比如一个便宜又快的模型。

```bash
deepseekbot approval-reviewer-model
deepseekbot approval-reviewer-model-set deepseek/<model> [--effort <effort>]
deepseekbot approval-reviewer-model-set bot
```

两个命令都返回 `{follows, model}`：`follows` 为 `bot`（跟随每个 Bot 自己的模型，`model` 为 `null`）、`model`（所有审批都用指定模型）或 `invalid`（设置文件读不出来）。指定模型时还会返回 `available`，为 `false` 时附带 `unavailableReason`。不在模型目录里、或服务商没有可用密钥的模型仍会保存，但之后每次审批都会改发普通的人类审批卡片，并在 `logs.db` 里写入 `fallback=model-unavailable` 和原因；审批员绝不会自己换用别的模型。`logs.db` 里每条 `approval-review` 记录都写明这次用的 `model` 和 `reviewSession`。Bot 在自己的 Shell 里运行 `approval-reviewer-model-set` 时，这次调用需要人类决定，或在独立管理范围中显式保存的授权规则；模型审批员不能代答。拒绝时带错误码：`usage`（没有 `<provider>/<model>`，或对 `bot` 加了 `--effort`）和 `invalid-input`。

### 概念图

`deepseekbot concept-art` 调用宿主 bridge 方法 `conceptArt`。`routes` 列出已保存的聊天和图像实例以及当前的锁，不打印密钥。`save-route <id> <openai-chat|openai-images> <credentialRef> <model>` 把供应商列表里的一个模型名存到固定基址 `https://api.apiyi.com/v1`。只有该凭证引用还没有密钥时才加 `--key-stdin`，密钥从标准输入读取，不能写在参数里。同一引用再次保存时省略密钥，继续用已保存的凭证。环境变量形式的凭证引用，例如 DSH 模型设置里已有的 `apiKeyEnv`，由宿主凭证服务直接解析，不会复制进 `botharness-route`。引用已经配置时再送密钥会被拒绝，不会覆盖。`lock-route <chat|concept-art> <instanceId> <model>` 把锁换到该实例已有的模型。`status` 报告手选的图像锁、该锁的凭证引用是否已配置，以及聊天模型目录不是这条图像路由。`open <bot>` 解析该 Bot 当前的宿主会话，不创建项目。`styles <session>` 只列出这个会话所属 Bot 保存的风格。`generate-style <session> <ref>` 从标准输入读一条风格笔记，调用同一条聊天锁，并只保存给这个 Bot。`request` 从标准输入读一个 JSON。`resume` 和 `cancel` 需要会话号和原来的操作键。`accept <session> <key> <context-version>` 读取已存任务。字节若能在宿主既有图像限额内解析（图像检查器的 `MAX_IMAGE_BYTES` 和 `MAX_IMAGE_PIXELS`），`accept` 为 true，原因是 `BYTES_PARSED_NOT_A_RENDER`。`mediaVerified` 和 `deliverable` 仍是 false：这不是已核验的成品图。提交的提示词保留用户原文和当前选中的风格定义；已停用的库风格定义不会附上，原文里的词也不会被删掉。路由带不了的参考图会被阻断。拒绝码包括 `usage` 和 `invalid-input`。

```bash
deepseekbot concept-art status
deepseekbot concept-art routes
deepseekbot concept-art save-route <id> <openai-chat|openai-images> <credentialRef> <model> [--key-stdin]
deepseekbot concept-art lock-route <chat|concept-art> <instanceId> <model>
deepseekbot concept-art open <bot>
deepseekbot concept-art styles <session>
deepseekbot concept-art generate-style <session> <ref>
deepseekbot concept-art request
deepseekbot concept-art resume <session> <key>
deepseekbot concept-art cancel <session> <key>
deepseekbot concept-art accept <session> <key> <context-version>
```

### 空闲压缩（Idle Compaction）

Bot 的 Orchestrator Session 没有进行中的轮次、也没有待处理的 Bot Inbox Admission 时，Host 会在所用模型线路提示缓存寿命的一半（最少 15 分钟）通过 DSH（与 `/compact` 同一路径）压缩它，让长历史在服务商仍按缓存命中价读取时就被压缩。只压缩超过该线路 DSH 默认自动压缩阈值一半的会话；Assignment 和审批复核会话从不压缩。聊天中不显示任何内容。该设置对整个 Profile 生效，默认开启。

```bash
deepseekbot idle-compaction
deepseekbot idle-compaction-set on|off
deepseekbot idle-compaction-cache-set deepseek/<model> <seconds>
deepseekbot idle-compaction-cache-set deepseek/<model> auto
deepseekbot compaction-threshold-set <ratio|default|keep> <headroom-tokens|default|keep>
```

三个命令都返回 `{enabled, settingReadable, minimumIdleSeconds, scheduled, routes}`。每条线路列出 `cacheLifetimeSeconds`、来源 `source` 和 `compactAfterSeconds`（跳过时为 `null`）。缓存寿命依次取自这里为该线路设置的值（`setting`）、模型目录（`catalog`，Anthropic 的短档）、观测到的请求前空闲间隔中仍大部分命中缓存的最长值（`observed`；命中的间隔不会缩短默认值，更长的未命中间隔会把它封顶），或 DeepSeek 线路的 2 小时（`default`）；其它没有任何信息的线路为 `unknown` 并跳过，寿命不足 15 分钟的也跳过。`idle-compaction-cache-set ... auto` 删除该线路的设置值。每次执行都记录在 `deepseekbot bot-activity-history <bot-id>` 的 `idleCompactions` 中，包含线路、空闲时长、压缩前后 token 数，以及压缩请求的输入、缓存读取和输出 token。拒绝时带错误码：`usage`（缺少 `on`/`off`、`<provider>/<model>` 或整数秒）和 `invalid-input`。

DSH 在 Session 上下文达到“上下文窗口 × `ratio`”与“窗口 − 线路输出上限 − `headroom-tokens`”中较小者时自动压缩。`compaction-threshold-set` 修改这两个值，对本机所有 Bot 从下一步开始生效：比例 0.5–0.95（默认 0.8），余量 8192–262144 token（默认 65536）。`default` 恢复某一项默认值，`keep` 保持不变，例如 `compaction-threshold-set 0.7 keep` 只改比例。空闲压缩使用同一阈值。如果余量加上输出上限超过某个模型的上下文窗口，这个余量对该模型过大：DSH 会记录警告并跳过它的压力压缩，没有声明窗口的模型则继续使用默认余量。`idle-compaction` 在 `threshold` 下返回两者，以及 `ratioSet`/`headroomSet` 和取值范围。

### 局域网 Bot 协作

独立的 `approval` 字段保留之前批准的身份，即使附近 Host 广播了不同公钥；没有有效本机批准时为 `null`。旧批准仍可明确撤销，新广播的公钥不会自动替换它。

在两台 Host 上分别运行 `deepseekbot device-lan enable --confirm`，启用现有加密 LAN 入口，再运行 `deepseekbot bot-lan list`。结果包含本机公开身份、附近候选主机、完整公钥指纹，以及独立的 `discovered`、`admitted`、`identityChanged` 字段。`admitted` 只表示本机已批准该准确公钥；两台 Host 必须互相批准，才能查询 Bot 联系人或发送 DM。设备名和发现广播不授予任何权限。

将候选的 Host ID 和完整指纹与对方自己的 `bot-lan list` 输出逐位核对，再在两端分别运行 `deepseekbot bot-lan admit <host-id> <公钥> --confirm`。公钥可作为命令参数。准入后，所有活跃 Bot 沿用现有联系人和消息工具。撤销本机批准使用 `deepseekbot bot-lan revoke <host-id> --confirm`；已批准的主机离线时也可撤销。

每条命令只返回一个 JSON 文档。拒绝码包括 `confirm-required`、`network-host-invalid`、`network-admission-invalid`、`network-candidate-unavailable`、`network-identity-changed`、`network-admission-limit`、`network-admission-unavailable`。管理入口为经过认证的 `GET`/`POST /api/botharness/devices/lan-bots`，公开 LAN 监听器不提供这个管理入口。发现使用有界的 IPv4 多播广播，30 秒未收到广播的候选会过期。不保存待发消息，不自动重发，也不在重连后回放。关闭 `device-lan` 会关闭 LAN 入口和发现，保留显式准入记录。

### 加密局域网手机连接

无需模型的设备侧验收使用 `device-pair --link-file <可信私有链接文件> --out <新私有配对.json> --confirm`，执行与手机相同的加密注册。等待批准时，配对进程向标准错误输出一条 `device-key-confirmation-required` JSON 状态，只包含本端公钥指纹。在另一个 CLI 进程将其与 `devices.pendingKeys[].fingerprint` 完整逐位比较，再用 `device-approve-key` 批准该条目的准确公钥；不得只按设备名或列表位置批准。最终标准输出只有 Host/设备 ID 和输出路径，密钥及凭据只写入新私有文件。之后用 `device-probe --device-file <私有配对.json>` 通过手机连接模块读取真实 Host Feed，只报告路由类型与列表数量，不发送 DM，也不需要模型。配对链接和凭据不得放入命令参数。

`deepseekbot device-lan enable --confirm` 开启受限的加密入口。`device-lan disable` 关闭 LAN 连接并移除启用记录，不撤销设备，也不关闭 Connect。两者只返回一个 JSON 状态（`off` 或带端口的 `listening`）。`devices` 增加 `lan` 状态和可用路由。拒绝码包括 `confirm-required`、`lan-action-invalid`、`lan-listen-failed`、`lan-storage-unavailable`。LAN 默认关闭；启用后端口在普通 Host 重启时保留。

继续使用现有配对命令 `device-offer --out <新私有文件>` 和 `device-approve-key <receipt> <公钥> --confirm`。已安装的 App 扫描可信电脑上的二维码，然后等待电脑批准准确的手机公钥。公钥可作为参数；链接和凭据只放在受保护文件中。原生构建与网络要求见 [LAN 协议](architecture/lan-phone-v1.md)。

### 手机连接（Tailscale）

手机连不上这台 Host 时，Bot 设置 → 设备 → 配对手机会显示三步指引：安装 Tailscale、启动并登录、把 Host 发布到 tailnet。最后一步可以确认后由 DeepSeekBot 代为运行 `tailscale serve --bg <port>`，也可以复制命令自己运行。CLI 中的对应操作：

```bash
deepseekbot phone-route
deepseekbot phone-route-publish --confirm
deepseekbot phone-route-disable --confirm
```

`phone-route` 返回 `{routes}`，包含 Tailscale 可用性、每条路线是否就绪、建议的 `serveCommand`，以及托管启用与归属状态。`phone-route-publish` 明确启用托管发布和重启恢复，返回 `{published, changed, routes}`。Host 端口不变，发布端口依次从 443、8443–8452 中选取空闲项；已有匹配发布直接复用，不取得其所有权。`phone-route-disable` 关闭恢复，仅删除当前仍匹配的自有映射，保留配对和其他路线。拒绝码为 `confirm-required`、`tailscale-missing`、`tailscale-stopped`、`serve-other-target`（候选端口全满或配置已变化）、`serve-needs-enable`（带 Tailscale 后台 `enableUrl`）、`serve-denied` 和 `serve-failed`。权限或 tailnet HTTPS 未启用需要完成对应设置，换端口不能解决。

### 已配对设备

Bot 设置 → 设备 会列出已配对的手机、显示配对二维码并撤销设备。CLI 使用同一个设备所有者：

```bash
deepseekbot devices
deepseekbot device-requests
deepseekbot device-offer --out /absolute/new-private-file
deepseekbot device-lan enable --confirm
deepseekbot device-lan disable
deepseekbot device-offer-status <receipt>
deepseekbot device-revoke <device-id> --confirm
```

`devices` 返回 `{host, devices, routes}`：本 Host 的配对身份，每台已配对设备的 `id`、`name`、`pairedAt`、`lastSeenAt` 以及撤销后的 `revokedAt`，和 `phone-route` 相同的手机路由。设备凭据不会出现在列表里。`device-offer` 打开一个 10 分钟有效的一次性配对邀请，只把它的 `deepseekbot://pair?…` 链接写入 `--out`：一个以 0600 权限新建的文件（文件已存在时在打开邀请前以 `output-exists` 拒绝）；标准输出只有 `{receipt, expiresAt, routes, reachable, link: {path}}`。在手机上打开这个链接，或改用设备页里的二维码配对；没有 `--out` 时 `device-offer` 以 `out-required` 拒绝。回执能指代邀请，但不能用来兑换。`device-offer-status` 返回 `state`：`pending`（带 `expiresAt`）、`redeemed`（带新设备的 `deviceId`）、`expired`、`refused`（用错误的验证值兑换而作废）、`superseded`（同时打开了超过 16 个邀请）或 `unknown`；邀请只保存在 Host 内存中，Host 重启后所有回执都是 `unknown`。`device-revoke` 返回 `{revoked, closedStreams, device: {id, name}}`；该设备的下一个请求会以 `device-revoked` 被拒绝，已打开的连接立即关闭。拒绝码：`confirm-required`、`device-unknown`、`device-already-revoked`、`receipt-required` 和 `usage`。

### 接入指定浏览器客户端

保持目标浏览器打开。`connection-clients` 列出当前 Host 上已登记的 Client，必须明确选择目标 `id`。在远端 Host 用 `device-offer --out <私有文件>` 生成邀请，再安全传输文件到 CLI 所在电脑；链接不能进入命令参数、聊天或标准输出。

```bash
deepseekbot connection-clients
deepseekbot connection start --client-id <id> --connection-id <attempt> --link-file /absolute/private-link
deepseekbot connection status --client-id <id> --connection-id <attempt>
deepseekbot connection confirm --client-id <id> --connection-id <attempt> --fingerprint '<完整 Host 指纹>' --confirm
deepseekbot connection cancel --client-id <id> --connection-id <attempt>
```

`--link-file -` 从 stdin 读取。确认前独立核对完整 Host 指纹。状态到达 `approve-device` 后，在远端核对设备指纹，并用 `device-approve-key` 批准对应的准确 receipt/public key。继续查询直到 `connected`：只有 `saved: true` 不代表完成，目标 Client 必须实际读到 Host Feed；频道列表为空可以成功。凭据只保存在目标浏览器的 origin-local 存储，不会接入其他 Client。

状态包括 `connecting`、`verify-host`、`approve-device`、`connected`、`failed` 和 `cancelled`，失败带有 `code`。同一操作 ID 和链接返回原操作状态，换链接则拒绝；每个挂载的 Client 控制会话最多保留 16 次操作。已接受操作最长等待五分钟；关闭或刷新页面、控制登记丢失都会取消未完成接入。过期命令不能启动操作。`saved: true` 后取消会保留已经保存的 Remote Host，需要时应明确移除。离线或失效目标直接拒绝，不回退到 CLI 或 Host 保存。该命令不授予 Tob 判断身份或批准设备的权限。

### 模型、用量与活动

```bash
deepseekbot model-catalog
printf '%s' "$PLAN_JSON" | deepseekbot model-plan-set <bot-id> --plan-stdin
deepseekbot model-plan-customize <bot-id> --orchestrator-provider deepseek --orchestrator-model deepseek-reasoner
printf '%s' "$ASSIGNMENTS_JSON" | deepseekbot model-plan-assignments-set <bot-id> --plan-stdin
deepseekbot model-plan-inherit <bot-id>
deepseekbot model-preset-update <preset-id> --name Nightly --orchestrator-effort high
deepseekbot home-model-set --provider <provider-id> --model <model-id> [--orchestrator-effort <effort>] [--expected-revision <default-revision>]
deepseekbot model-preset-apply <bot-id> --preset <preset-id> [--expected-revision <plan-revision>] [--preset-revision <preset-revision>]
deepseekbot overview-usage --period week
deepseekbot overview-memory
deepseekbot activity-overview
deepseekbot channel-activity-today
deepseekbot bot-usage <bot-id> --start 2026-10-01 --end 2026-10-14 [--purpose assignment] [--model <m>] [--provider <p>]
deepseekbot bot-session-usage <bot-id>
deepseekbot bot-activity-history <bot-id> [--before 2026-10-14] [--weeks 26]
deepseekbot group-activity <group-channel>
```

连接在线 Host 时，`model-preset-create` 也支持 `--plan-stdin`，stdin 仅包含 `{"assignmentModels":[...]}`，创建预设时保留可选模型、推理强度和备注。创建与更新都通过移动端编辑器使用的同一 Host bridge 转发完整策略，不会悄悄缩减为默认模型。

`model-catalog` 列出 Host 能运行的模型和 Profile 默认模型，与模型选择器看到的一致。`model-plan-set` 用 stdin 中的 `{"orchestrator":{...},"assignmentDefault":{...},"assignmentModels":[...]}` 替换 Bot 的整个模型方案；`model-plan-assignments-set` 接受去掉 `orchestrator` 的同一对象。路由写作 `{"provider","model","reasoningEffort"?}`，Assignment 模型写作 `{"provider","model","allowedEfforts":[...],"defaultEffort","note"?}`。`model-plan-customize` 只修改 Bot 的 Orchestrator；原本继承全局时建立独立覆盖，Assignment 的固定配置或全局继承保持不变。`model-plan-inherit` 去掉 Bot 自己的模型，改为跟随 Profile 默认模型。`model-preset-update` 修改预设的名称或路由；没有给出的参数保持当前值，可选的 `--plan-stdin` `{"assignmentModels":[...]}` 替换它的 Assignment 模型。每条路由都由 Host 按模型目录校验。方案和预设的写入会核对版本：`--expected-revision` 显式指定版本；不指定时命令先读取当前版本，与 `memory-save` 的 `--expected-head` 相同。方案在此期间被改过时，返回 Host 的 `invalid-input`。

在线 Human CLI 的 `home-model-set` 支持 `--orchestrator-effort` 和 `--expected-revision`；后者对应 `model-catalog.defaultRevision`，省略时先读取当前默认模型 revision。`model-preset-apply` 可通过 `--expected-revision` 约束 Bot 计划、`--preset-revision` 约束预设；省略这些参数时保留原有 Human 行为。受限 Tob 调用必须明确传入对应 revision，不能借省略参数跳过已审核快照。

`overview-usage`（`--period today|week|month|quarter`，`month` 为近 28 天，`quarter` 为近 84 天，默认 `today`）和 `overview-memory` 返回总览页上每个 Bot 的数据行；把返回的 `nextCursor` 作为 `--after` 传回可以继续读取。`activity-overview` 显示每个 Bot 正在做什么，`channel-activity-today` 显示每个 Channel 今天的消息。`bot-*` 读取命令按 Bot ID 定位，通过它的私聊读取 Profile 面板：`bot-usage` 需要不晚于今天、跨度小于 182 天的 `--start`/`--end`，`bot-session-usage` 按会话和 Assignment 汇总用量，`bot-activity-history` 返回活动日历（`--weeks` 为 1–104）。`group-activity` 接受群组 Channel ID。

`bot-activity-history` 的模型行在混有未报告调用时保留已上报的 `totalTokens` 下界，并标记 `partial: true`；完全未报告时保持 `null`。严格的 `bot-usage` 查询继续保留原来的未知总计语义。

### 市场、版本更新、使用统计、Git 与配对审核

客户端市场默认按最多 Star 排序，并在当前浏览器记住选择。`--sort stars` 依次按 Star、最后更新、创建时间、仓库 ID 降序排列，翻页保持同一顺序。CLI 不读取浏览器偏好。

`marketplace-sections` 返回市场面板的热门、新上架和上升最快三行，来自 Worker 最近一次每日快照，格式为 `{ sections: [{ section, day, entries: [{ bot, score }] }] }`。热门的 `score` 是近 7 天安装数，新上架为 0，上升最快是 7 天增长数；首次快照之前 `day` 为 `null`。

`marketplace-digest` 返回最近一篇每日精选（市场面板顶部的文章），或 `--day` 指定日期的那篇，格式为 `{ digest: { day, lang, title, lede, sections: [{ heading, body, bot }] } }`；条目之后被隐藏时 `bot` 为 `null`。没有精选时返回 `digest-not-found`。`marketplace-digests` 按日期从新到旧列出往期精选：`{ digests: [{ day, lang, title, lede, picks: [{ id, displayName, banner, avatar }] }] }`；`picks` 是文章中仍在上架的最多四个精选 Bot，按文章顺序排列，stderr 每篇一行，列出日期、标题和精选 Bot 名称。两者都优先用 `--lang`，某天只有另一种语言时返回那种语言。

这些命令调用的 Host 方法与市场页面、更新卡片、使用统计提示、Git 提示和 IM 配对面板相同：

```bash
deepseekbot marketplace-list [--query <关键词>] [--topic <主题>] [--sort updated|created|stars] [--lang zh|en] [--cursor <next-cursor>] [--include-uploads]
deepseekbot marketplace-topics
deepseekbot marketplace-sections [--lang zh|en]
deepseekbot marketplace-digest [--day YYYY-MM-DD] [--lang zh|en]
deepseekbot marketplace-digests [--lang zh|en]
deepseekbot marketplace-detail <owner/repo> [--lang zh|en]
deepseekbot marketplace-file <listing-id> <path>
deepseekbot marketplace-submit https://github.com/<owner>/<repo>
deepseekbot marketplace-report <owner/repo> [--reason <说明>]
deepseekbot marketplace-account
deepseekbot marketplace-author --name <显示名> [--accept-terms]
deepseekbot marketplace-author-avatar (--file <图片> | --clear)
deepseekbot marketplace-upload-plan <bot-id>
deepseekbot marketplace-upload <bot-id> --name <名称> [--description <简介>] [--role <标签> ...] [--replaces <listing-id>] --confirm [--timeout <秒>]
deepseekbot marketplace-mine [--lang zh|en]
deepseekbot marketplace-delete <listing-id> --confirm
deepseekbot marketplace-install <listing-id> [--lang zh|en]
deepseekbot marketplace-install <listing-id> --review <review-id> --confirm [--operation-key <key>]
deepseekbot share-draft-start <bot-id>
deepseekbot share-draft-show <bot-id>
deepseekbot share-draft-file <bot-id> --path <文件路径>
deepseekbot share-draft-decide <bot-id> --path <文件路径> (--keep | --drop | --rewrite-stdin)
deepseekbot share-draft-finish <bot-id>
deepseekbot share-draft-export <bot-id>
deepseekbot share-draft-discard <bot-id>
deepseekbot release-check [--force]
deepseekbot release-install <version> --confirm
deepseekbot release-restart --confirm
deepseekbot plugin-check [--force]
deepseekbot plugin-install <package> <version> --confirm
deepseekbot plugin-restart --confirm
deepseekbot telemetry-status
deepseekbot telemetry-set --enabled | --disabled
deepseekbot git-status
deepseekbot git-install
deepseekbot pairing-list <bot-id>
deepseekbot pairing-review <bot-id> <pairing-id> --decision approve --role <role-id>
deepseekbot pairing-review <bot-id> <pairing-id> --decision approve --capability approve [--capability answer ...]
deepseekbot pairing-review <bot-id> <pairing-id> --decision reject
deepseekbot pairing-review <bot-id> <pairing-id> --decision revoke --confirm
```

`release-check --force` 会绕过 Host 的检查缓存。`available` 包含运行中 DSH 的兼容判断；若最新版不兼容，还会返回 `blockedLatest`。`blocked` 会说明不满足的版本要求或运行时／元数据未知原因。检查覆盖准确的 Bundle、产品组件及固定版本 IM Provider，复用运行中 DSH 的兼容评估器。安装前会再次校验，最终仍由原生 Plugin Manager 决定是否允许安装；离线或检查失败不会显示为“已是最新版”。

`release-info` 包含可选的 Host 所有 `identity`：带源码 revision／dirty 的 `development`、带版本的 `release`，或带元数据／组合原因的 `unknown`。旧 Host 缺少该字段，不代表发布身份已经核实。源码内部版本占位仍为 `0.0.0`，关于页面显示源码身份。`release-check` 可返回 `unknown`，此时安装／重启以 `release-identity-invalid` 拒绝。已安装／待生效版本与运行版本分开，直到新 Host 返回精确目标版本。

`plugin-check`、`plugin-install` 和 `plugin-restart` 对应 **Bot 设置 → 插件** 页面，覆盖除 `deepseekbot` 以外已安装的 `@botharness/*` 插件 Bundle，例如 `@botharness/vrm-companion`。`plugin-check` 返回 `installable`、`restartable`，以及每个插件一条记录，`status` 为 `current`、`available`、`blocked`、`restart-required`、`development` 或 `unavailable`；`--force` 绕过六小时的检查缓存。兼容判断复用运行中 DSH 的评估器，读取该插件在 registry 上的清单。`plugin-install <package> <version> --confirm` 会再次检查兼容性，通过原生 Plugin Manager 安装；Manager 拒绝覆盖已安装的包名时，改用 registry 的安装包地址。返回 `applied: true` 表示 Host 已经加载新版本，只需刷新页面；否则用 `plugin-restart --confirm` 重启 Host，让所有待生效的插件更新生效。失败时以非零退出，错误码为 `plugin-<原因>`，例如 `plugin-incompatible`、`plugin-unknown-plugin` 或 `plugin-not-pending`。

`--lang zh|en` 按该语言读取列表，与市场页面按界面语言读取一致：名称和简介依次取作者 `bot.json` 里 `i18n` 的翻译、本来就是该语言的简介、市场生成的摘要（`descriptionGenerated: true`）；`marketplace-detail` 返回仓库里该语言的 README，并在 `readmeLanguage` 里注明，没有就返回 `README.md`：`zh` 依次取 `README.zh-CN.md`、`README.zh.md`，再取 `README_CN.md`、`README-zh.md` 等其他写法；`en` 取 `README.en.md`。`marketplace-submit` 和 `marketplace-report` 会像网页一样先完成 Host 下发的工作量证明，因此可能需要几秒；市场本身的拒绝（`repository-missing-topic`、`rate-limited` 等）作为错误码返回。举报说明最多 500 个字符。`release-check` 返回更新状态（`current`、`available`、`restart-required`、`development`、`unknown` 或 `unavailable`）。`release-install` 和 `release-restart` 必须带 `--confirm`；安装或重启失败时以非零退出，错误码为 `release-<原因>`，例如 `release-network` 或 `release-not-pending`。重启会中断所有正在运行的 Bot 回合，只在自己负责的 Host 上执行。`pairing-list` 列出 Bot 的配对请求和角色；`pairing-review` 自行读取当前版本号，期间被改动过的请求会被拒绝而不是被覆盖。对话类请求用一个 `--role` 批准，管理类请求用 `--capability` 批准。

**上传的 Bot**（[ADR-0267](adr/0267-the-bot-marketplace-hosts-uploaded-bots-under-connect-accounts.md)）和 GitHub 仓库在同一个目录里。`marketplace-list --include-uploads` 会把它们加进来；每个条目带 `source`（`github` 或 `upload`），上传的条目还带 `author`（`name`、区分同名作者且永不改变的作者 `id`，以及头像图片地址 `avatar` 或 `null`）。上传的 Bot 的 `marketplace-detail` 还返回 `files`（`path`、`size`、`kind`：`text`、`script` 或 `image`）和 `fileSummary`：`count`、`size` 和 `types`，即每种类型（`markdown`、`text`、`data`、`script`、`image`）的文件数和字节数，按大小从大到小。`marketplace-file <listing-id> <path>` 以 `file`（`path`、`size`、`type`、`text`）读取一个文本文件：Markdown 像 README 一样经过整理和清洗，相对链接指向这个 Bot 的文件；脚本和其他文本原样返回，从不当作 Markdown 整理。图片被拒绝，错误码 `file-not-text`；不在列表里的路径返回 `file-not-found`。上传要求这个 Host 已登录 Tobs Connect（设置 → 设备）；`marketplace-account` 返回 `signedIn` 和 `author`，即已登录账户的**账户资料**（`name`、`id`、`avatar`、`termsAcceptedAt`），在 `marketplace-author --name <名称>` 创建资料之前为 `null`；之后再调用会改名，它的条目也随之更新。第一次上传还需要用 `--accept-terms` 接受一次条款（之前返回 `author-required`）。`marketplace-author-avatar --file <图片>` 用不超过 1 MB 的 PNG、JPEG 或 WebP 设置资料头像（`avatar-type-refused`、`avatar-too-large`），头像公开提供，并显示在作者的条目上；`--clear` 移除头像。`marketplace-upload-plan` 列出上传会包含的文件和跳过的文件（二进制和压缩包为 `file-type-refused`，超过 5 MB 为 `file-too-large`）。`marketplace-upload` 用给定的名称、简介和标签发布 Bot 已就绪的分享草稿（不含 Git 历史），必须带 `--confirm`：文件会公开。Bot 在自己的 Shell 里运行它时总会弹出给人类的批准卡片，即使开了完全访问。拒绝带错误码：`sign-in-required`、`author-required`、`too-many-files`（超过 2,000 个）、`too-large`（超过 50 MB）、`bot-limit`（每个账号 20 个）、`nothing-to-upload`、`share-draft-required`（还没有草稿）、`share-draft-not-ready`（还有文件没有结论）。`marketplace-install` 对两种条目都分两步。先运行 `marketplace-install <listing-id>`：暂存文件（上传的 Bot 的文件，或按目录索引到的提交克隆的 GitHub 仓库，没有索引提交时返回 `listing-not-installable`），由 Tob 用 Tob 的模型检查，输出 `reviewId`、`review` 和 `installed: false`，不会创建任何东西。`review.status` 为 `reviewed` 时带 `findings`（`kind`：`prompt-injection`、`exfiltration` 或 `script`，`path`，可选的 `note`）、`files`、`read`，有文本太长没读完时 `partial` 为 true；Tob 没能检查时为 `unavailable`，带 `reason`（`no-model`、`model-unavailable`、`llm-unavailable`、`timeout`、`model-error`、`unparseable`）。脚本文件无论如何都会列出。`--lang` 决定说明的语言。然后运行 `marketplace-install <listing-id> --review <review-id> --confirm`，把刚才暂存的这些文件（或这个提交）安装成全新的 Bot，用条目的名称、简介和标签，只有一次初始提交，返回新的 `bot`、它的 `channelId`、`listing` 和 `installed: true`。检查结果保留 30 分钟（过期为 `review-expired`，换了条目为 `review-mismatch`）；用同一个 `--operation-key` 重试会返回那个 Bot，不会装两次。Bot 建好之后，Host 发送一次**安装回执**，用一个只给市场用的随机 Host 标识（Host 数据目录里的 `marketplace-host.json`，从不使用遥测安装 ID）；每个 Host 对每个条目只计一次，安装失败不发送；`marketplace-list` 和 `marketplace-detail` 的每个条目都带 `installs`。

上传和推送到 GitHub 读的都是**分享草稿**，源 Memory 不会被改动。`share-draft-start` 把 Bot 可分享的记忆文件（和 `marketplace-upload-plan` 会包含的一样）复制到 Host 自己的数据目录，并替换之前的草稿。`share-draft-show` 返回草稿的 `state`（`reviewing` 或 `ready`）、计数 `summary`，以及每个文件的 `path`、`kind`、`size`、`status`（`pending`、`kept`、`rewritten` 或 `dropped`）和模式扫描发现的 `flags`（`secret`、`private-key`、`url-credential`、`email`、`phone`）。`share-draft-file --path` 返回一个文本文件在草稿里的当前内容。`share-draft-decide` 记录一个结论：`--keep`、`--drop`（删除草稿里的副本）或 `--rewrite-stdin`（完整的新内容，最多 5 MB）。任何结论都会让已就绪的草稿回到 `reviewing`。`share-draft-finish` 在没有 `pending` 文件时把草稿标为 `ready`（`share-draft-pending` 会给出第一个未决文件）。`share-draft-export` 把已就绪的草稿复制到 Tob 工作区里一个不带 `.git` 的新文件夹并返回 `path`，用于推送到 GitHub。`share-draft-discard` 删除草稿。Tob 的受限 CLI 只有 `share-draft-show`、`share-draft-file`、`share-draft-decide` 和 `share-draft-finish`，而且只能处理人类已开始的草稿；开始、导出和删除草稿由人类操作。

`marketplace-mine` 按时间从新到旧列出已登录作者自己上传的 Bot，每项为 `{ bot, files, bytes, blocked }`；`blocked` 的条目别人看不到，但仍可更新或删除。`marketplace-upload --replaces <listing-id>` 用这个 Bot 当前的记忆文件整体替换其中一个：没有版本，条目 id 不变，新文件全部存好后才对外可见，随后删除旧文件。每小时最多替换 10 次（`replace-limit`）；替换不占 20 个 Bot 的名额。`marketplace-delete` 删除条目、文件和计数，必须带 `--confirm`；和 `marketplace-upload` 一样，Bot 在自己的 Shell 里运行它时总会弹出给人类的批准卡片。已安装的副本永远不会被改动：本 Host 装过的条目在 `marketplace-list` 和 `marketplace-detail` 里带 `installed`（`bots` 为装出来的 Bot id，作者在安装之后替换过文件时 `authorUpdated` 为 true）。注销 Connect 账号会一并删除它上传的所有 Bot 和作者信息。

### 清除全部 BotHarness 数据

```bash
deepseekbot data-reset-preview
printf '%s' '{"token":"<preview.token>"}' | deepseekbot data-reset-confirm --confirmation-stdin --confirm
```

这是**设置 → 数据与隐私 → 清除全部 BotHarness 数据**的 CLI 形式。`data-reset-preview` 列出清除会删除的全部内容：`targets` 给出每个存在的文件夹及其大小和文件数（`data` 是 `$DSH_HOME/botharness`，含数据库、Bot、默认位置的记忆、附件、频道文件和工作区；`im-settings` 是 `$DSH_HOME/integrations` 下内置 IM Provider 的各个文件夹；`local-tools` 是 `~/.botharness`，例如电脑操控驱动）。`kept` 列出会保留的内容：DSH 自己的 `$DSH_HOME/.credentials.yaml`、Human 为 Bot 选择的每个记忆文件夹（即使位于要删除的文件夹内也保留），以及 `BotHarness Exports` 文件夹。token 十分钟内有效，且只对应这一次的范围；新建了 Bot、移动了记忆文件夹或 token 过期时会以 `data-reset-preview-stale` 拒绝，请重新预览。

`data-reset-confirm` 需要 `--confirmation-stdin --confirm`。它会让 BotHarness 停止写入，在 `$DSH_HOME/botharness-reset.json` 记录本次清除，并返回 `{reset:{status:"restarting"}}`：旧 Host 退出时、重新启动之前删除这些文件夹。Host 不能自动重启时返回 `restart-required`；Bot 保持停止，删除会在下一次 Host 启动时完成，插件重新安装后也一样。DSH 会话、DSH 设置和其他插件保持不变。只有 Host owner 能执行，它不是 Bot 工具。

### 存储空间

```bash
deepseekbot storage-usage
deepseekbot storage-cleanup-preview --older-than-days 90 [--chat <channel-id> …] [--media image|video|audio|file …] \
  | deepseekbot storage-cleanup-confirm --confirmation-stdin --confirm
```

这是**设置 → 数据与隐私 → 存储空间**的 CLI 形式。`storage-usage` 返回 `totalBytes`、`parts`（`media` 是附件文件夹，`messages` 是运行数据库，`memory` 是全部 Bot 的 Memory 文件夹，`other` 是 `$DSH_HOME/botharness` 中其余内容），以及按媒体大小从大到小排列的 `chats`，其中包含每个聊天的 `messages`、`oldestAt`、`mediaBytes` 和按类型的 `media` 统计。

`storage-cleanup-preview` 需要且只能传 `--before <ISO 时间>` 或 `--older-than-days <天数>` 之一，可重复传 `--chat`（默认全部聊天）和 `--media`（默认四种类型）。它返回将清理的文件数与字节数、`freedBytes`（没有其他地方再引用的文件）、按聊天和类型的统计、`kept` 计数（`bot-working`、`delivery-pending`、`memory`、`migration`），以及十分钟有效的 `token` 和规范化后的 `scope`。把这段 JSON 通过管道交给 `storage-cleanup-confirm --confirmation-stdin --confirm`；范围有变化或 token 过期时返回 `storage-preview-stale`，请重新预览。

清理会保留每条消息及其文字：每个被清理的附件会变成一条 `clearedAttachments` 记录（名称、类型、大小、时间），没有其他引用时删除其文件。来自 IM 应用的媒体和 Bot 的 Memory 不受影响。之前做的 Profile Backup 仍包含这些文件。

```bash
deepseekbot storage-messages-cleanup-preview --older-than-days 365 [--chat <channel-id> …] \
  | deepseekbot storage-messages-cleanup-confirm --confirmation-stdin --confirm
```

`storage-messages-cleanup-preview` 删除的是整条消息：参数同样是 `--before` / `--older-than-days` 和 `--chat`，但不接受 `--media`。它返回 `messages`、`bytes`（这些消息的文字）、随消息一起删除的 `files`、每个聊天的条数 `chats`、`kept` 计数（`bot-working`、`delivery-pending`，以及消息同时出现在没选的聊天里时的 `shared`）、`memoryReferences`（提到这些消息的 Bot 记忆，记忆不会改动）、超过 2,000 条时的 `more`（完成后再清理一次），以及十分钟有效的 `token`。`storage-messages-cleanup-confirm` 通过 Content Purge 执行：每条消息保留位置，变成没有文字和文件的占位；从它开始的 Bot 工作会停止；没有其他引用的文件会被删除。它返回 `messages` 和数据库压缩后测得的 `freedBytes`。范围有变化或 token 过期时返回 `storage-preview-stale`。

## IM 应用授权

复用上文的在线 Host 认证。`im-apps` 查询兼容的飞书／微信授权流程，不暴露账号凭据。隔离开发启动器可用 `--im-provider` 安装已资格验证的 Provider。

```bash
deepseekbot im-apps
deepseekbot im-authorize weixin
deepseekbot pairing-status <attempt-id>
deepseekbot pairing-status <attempt-id> --wait --timeout 120
deepseekbot im-authorize feishu
deepseekbot im-credentials <attempt-id> --credentials-stdin < /private/app-credentials.json
deepseekbot im-verify <attempt-id> --verification-stdin < /private/phone-code.txt
deepseekbot im-cancel <attempt-id>
```

飞书凭据 stdin 是只含 `appId`、`appSecret`、`domain` 的 JSON；domain 为 `feishu` 或 `lark`，appId 以 `cli_` 开头。输入文件须保持私有，也可从密码管理器直接送入 stdin。微信返回非敏感的 `authorization.qrDataUrl` PNG 和 `next` 提示：展示该 data URL，用手机扫码确认，再查询原 `attemptId`。状态为 `needs_verification` 时，将手机收到的 4–8 位验证码送入 stdin。凭据及验证码均不得放在命令参数或聊天记录中。

Provider 拥有授权 attempt 与原生账号。attempt 最长十分钟，Host 重启也会丢失；Provider 二维码可能更早失效，以返回状态和 expiresAt 为准。`--wait` 遇到 `ready`、`credentials` 或 `needs_verification` 即返回；报 `authorization-timeout` 后应继续查同一 attempt。完成输出含原生账号引用、指纹和实际连接状态。`setup-expired` 需要新 attempt；终态返回 `authorization-expired`、`authorization-failed` 或 `authorization-cancelled`。取消确认不会撤销已授权的原生账号。启动失败却没有 attempt ID 时，结果未知；先检查 Provider 状态再重试。

IM 应用授权不选择 PersonaBot，也不创建会话 Grant。`pairing-status` 查询这个 Provider attempt；`pairings <bot-id>` 列出 Bot 的管理员配对请求。Provider 的本地访问限制可能严于 CLI 的 tailnet carrier。参见 [ADR-0161](adr/0161-cli-im-authorization-keeps-provider-attempt-authority.md)。

## 机器契约

`send` 等到请求处理完成后才返回已提交回复，使串行命令不会追加到尚未结束的上一轮。对同一 Bot 的并发发送仍遵循 Host 的 DM 投递策略；已处理但没有归属该请求的回复会如实报错。用已授权模型的隔离 QA Bot 复跑 soak：先 `pnpm build`，再执行 `node scripts/e2e-cli-live.mjs --launch <私有-launch.json> --bot <id> --rounds 8 --interval-seconds 30 --output <私有报告.json>`；将间隔设为 `0` 可验证紧接的串行发送。

标准输出恰好是一个 JSON 文档。成功时退出码为 0：

```json
{
  "bot": { "id": "bot-…", "name": "…" },
  "dm": { "channelId": "dm-bot-…" },
  "dataDir": "<dsh-home>/botharness/bots/bot-…/memory",
  "steps": [{ "name": "create-bot", "status": "ok" }],
  "next": ["Open DM dm-bot-… in the DSH web client …"]
}
```

失败时退出码非零并输出 `{"error": {"code", "message"}}`，错误码保持稳定（`usage`、`secret-in-argv`、`bad-zip`、`bad-bundle`、`bad-ref`、`bad-credentials`、`unknown-preset`、 `unknown-bot`、`unknown-channel`、`unknown-schedule`、`duplicate-preset`、`git-not-found`、`git-clone-failed`、`git-clone-timeout`、`memory-unavailable`、`memory-conflict`、`memory-unknown-commit`、`not-found`、`invalid-grant`、`locked`、`inactive`、`limit-reached`、`lease-unavailable`、`invalid-input`）。人类可读的信息只写到 stderr，因此两种情况下标准输出都可解析。标准输出 JSON 默认美化打印；`--compact` 压成一行。`search` 按词在 CLI 实际分发的动词表里找命令。

## 身份

Bot 名字只是标签，身份是 id。不带 operation key 时，每次创建都会生成新的 Bot，重复使用名字会返回第二个 Bot，且退出码仍为 0；稳定的在线 operation key 则核对并返回原身份。

## 密钥

切勿把密钥放在命令行参数里：任何 `--api-key` / `--token` / `--secret` / `--password` 形式的开关都是硬错误（`secret-in-argv`）。模型密钥和令牌走环境变量（例如 `DEEPSEEK_API_KEY`、`GITHUB_TOKEN`）或标准输入管道（`--persona-stdin`）；结果 JSON 永不包含密钥内容。

`secret-put <NAME>` 只从标准输入读值，写入 `$DSH_HOME/.credentials.yaml` 顶层 `refs:` 下的对应条目，其余字节原样保留；写前备份、写后回读校验。`secret-list` 只报告名字、来源与是否可写，永不返回值。`secret-unset <NAME>` 删除条目。损坏的存储文件与过宽的文件权限按错误码失败（`bad-credentials`）。见 ADR-0158。

## 模型

不传 `--preset` 时创建依然成功，`model` 步骤会报告 `no-model-yet`：请在 Bot 模式设置中授权模型，再给 Bot 发消息验证实时回复。传入 `--preset <model-preset-id>` 会在创建时应用该预设；未知 id 会在生成 Bot 之前以 `unknown-preset` 失败。

模型动词管理创建之后的同一批记录：`model-presets` 列出该 Profile 的预设，`model-preset-create` 用显式 provider/model 路由新建预设，`model-preset-apply` 把预设应用到 Bot，`model-plan` 查看生效中的方案。路由离线做形状加 provider 存在性检查（未知 provider 直接失败）；目录活性与就绪检查仍在 Host 侧，`model-plan` 的就绪状态报 deferred。见 ADR-0157。

## 生命周期与人类命名

`pause`/`resume` 开关 Bot 的执行；`update` 改名改标签（`--name`、`--description`、`--role`，遵守 profile 标签/简介长度限制）。`human-name-set` 写人类显示名（`--clear` 重置），`channel-human-name-set` 写分 channel 人类昵称，用词与 CONTEXT.md 一致。未知 Bot/Channel 按错误码失败（`unknown-bot`、`unknown-channel`）。

## Channel、授权、计划与配对

`channels` 列出 Channel，`channel-messages` 读一页消息（从新到旧，`--limit`、`--before` 分页）。`grants` 列出 Bot 的 workspace 授权，`grant-revoke`/`grant-write-set` 管理它们；新建授权需要 Host 的 workspace 注册表，仍是 Host 侧动作。`schedules` 列出 Bot 的计划；`schedule-create` 要 `--title`、`--prompt` 和唯一一种触发器（`--every` 秒数、`--daily`/`--weekly` 时间加 `--weekdays`、`--once-date` 加 `--once-time`、`--cron`），日历触发器必须传 `--timezone`；`schedule-update`/`schedule-delete`/`schedule-history` 用 `--sid` 指定计划；`schedule-run-now` 记录一次手动触发，Host 启动后执行；`schedule-preview` 不指定 Bot、只渲染触发器的未来时刻。`pairings` 列出 Bot 的 IM 配对请求。不存在的计划报 `unknown-schedule`；删除返回 `removed`。

### 在线批准工作区请求

```bash
deepseekbot inbox --category action --bot <bot-id>
deepseekbot workspace-options
deepseekbot grant-request-approve <bot-id> --channel <channel-id> --request <message-id> --workspace <workspace-id> --confirm
deepseekbot grants <bot-id>
```

`grant-request-approve` 与 Web 请求卡使用同一个仅 Owner 可调用的 Host 命令。Host 在同一事务中保存持续读写权限和关联 Grant 的决议，再沿既有 Inbox 继续原任务；已有只读 Grant 也可经这次明确确认升级。重复批准同一请求只读回既有决定，不重复创建 Grant 或唤醒；已撤销或改变的目标会被拒绝。目录卡不是工具批准，应使用此命令，而非 `tool-approval-decide`。缺少 `--confirm` 返回 `usage`，失效或不可用权限返回稳定拒绝代码。这是在线操作，不是直接修改数据库的离线修复。

### 浏览电脑上的文件夹

```bash
deepseekbot folder-browse
deepseekbot folder-browse 'D:\code'
deepseekbot folder-browse 'D:\code' --offset 500
```

`folder-browse` 列出 Host 上某个文件夹的子文件夹，与桌面工作区授权浏览器相同，也用于电脑使用系统文件夹选择器时的手机文件夹选择。不传路径时从 Host 主目录开始。返回 `{path, home, crumbs, entries, truncated, nextOffset?, roots, nativePicker?}`：只有文件夹名称和路径，不含文件，每页最多 500 个。`truncated` 为 true 时，把 `nextOffset` 作为 `--offset` 传回即可取下一页。`roots` 是主目录和各个磁盘（Windows 上读系统盘符表，不打开任何磁盘）或 `/`。`nativePicker: true` 表示 Host 使用系统文件夹对话框，桌面 Client 会改为打开它。Host 在单独的进程里读取文件夹，截止时间 5 秒。相对路径返回 `folder-browse/invalid-path`；不存在、不是文件夹、无权读取或读取失败分别返回 `folder-browse/not-found`、`folder-browse/not-directory`、`folder-browse/denied`、`folder-browse/unreadable`；文件夹没有按时响应（例如网络盘断开）返回 `folder-browse/timeout`。浏览不授予任何权限：选好路径后按上文登记并授权。

## Memory

`memory-snapshot`、`memory-file --path`、`memory-history [--limit]`、`memory-diff --sha` 读取 Bot 记忆库；`memory-save --path (--body | --body-stdin)` 写一个文件并提交。`--expected-head` 默认取当前 HEAD（要做 compare-and-swap 请显式传）；`--edit-id` 默认生成新的 UUID，重复提交幂等。HEAD 过期或无变化的写入报 `memory-conflict`，不存在的文件读回 `null`，非法 sha 报 `invalid-input`。

选定在线 Host 时，上述命令改为通过 Host 的 Memory 模块执行，而不是读写本地存储，此时 `memory-save` 必须带 `--expected-head`。在线 Host 还提供 Memory 面板的其余功能：

```bash
deepseekbot memory-graph <bot-id> [--offset <n>] [--path <file>]
deepseekbot memory-commit-diff <bot-id> --sha <commit>
deepseekbot memory-changes <bot-id>
deepseekbot memory-working-diff <bot-id> --path <file> --kind staged|unstaged|untracked|current
deepseekbot memory-file-target <bot-id> --path <file>
deepseekbot memory-versions <bot-id>
deepseekbot memory-version-name <bot-id> --sha <commit> --name <version>
deepseekbot memory-version-unname <bot-id> --tag <version>
deepseekbot memory-checkpoints <bot-id>
deepseekbot memory-restore <bot-id> --checkpoint <id> --expected-current <id>
deepseekbot memory-restore-commit <bot-id> --sha <commit> --expected-head <commit> [--name <version>]
deepseekbot memory-repair <bot-id> --expected-head <commit>
```

`memory-graph --path` 只列出改过这个文件的提交，和 App 里 Memory 文件页的「修改记录」一致。

写入和恢复都必须指明预期的 head 或检查点，所以并发修改会以 `memory-conflict` 失败，而不会被覆盖；`--restore-id` 和 `--repair-id` 默认是新的 UUID，使重试保持幂等。恢复前会先记录一个检查点，可以用 `memory-checkpoints` 查看。

把 Bot 的记忆仓库移到别的文件夹，或移回默认位置：

```bash
deepseekbot memory-move <bot-id> --memory-location <absolute-dir>
deepseekbot memory-move <bot-id> --default-location
```

仓库会移到 `<absolute-dir>/<bot-id>`；该文件夹必须已存在，且其中还没有这个 Bot。移动前会先归档 Bot 的主会话，下一轮对话会在新文件夹里开启新的主会话；聊天记录、记忆提交和任务都会保留。Bot 正在工作时返回 `bot-busy`，文件夹不存在或已被占用时返回 `invalid-memory-dir`，记忆修复未完成时返回 `memory-conflict`。跨磁盘移动时会先复制、核对 HEAD 与原仓库一致，再删除旧文件夹；结果里若有 `leftover`，表示该旧文件夹未能删除。

## Home 与 Tob

`deepseekbot tob-home` 幂等准备受保护的本地 Tob、Memory、管理 Workspace 与 DM，返回标识及权威 Attention 摘要，不发送消息。`deepseekbot home-model-set --provider <id> --model <id>` 修改原生 Host 默认模型，保留其他 Bot 的独立计划。

Tob 通过普通原生 bash／pwsh Tool 调用 `deepseekbot`；专用的 `tob_assignment_limit_read`、`tob_assignment_limit_set` Tool 及直接运行入口已移除。既有 Assignment Tools 不变。受限 CLI 流程支持下方列出的 Bot 创建／资料／生命周期、建群／邀请、群设置／成员移除、取消邀请／入群决定、模型、运行、隐私、Git 和更新操作；这是明确的允许清单，不代表开放全部 Human CLI 命令或其他 Bot 的数据。

在具备权限的 Tob Shell 执行中：

Tob 的受信任系统说明随插件打包，只注入受保护的 Tob Orchestrator；升级不会覆盖用户修改过的人格或记忆。用户只需问“你能做什么？”，Tob 会先发现当前安装版本的 CLI 能力，再用用户的语言解释可完成的事情，并提出一个具体的下一步。能力询问只读，不提交变更或审批；后续明确的修改请求仍走现有权限与审批校验。

npm Bundle 自带 core CLI 模块和产品 CLI 入口。Tob 使用 Host 注入当前 Shell 的受管执行入口，不依赖全局安装的 `deepseekbot`、源码目录或手动复制的 skill。发布校验会拒绝缺少 CLI 入口的包；运行时缺失入口则报告安装问题，不回退到其他管理通道。

```bash
deepseekbot capabilities
deepseekbot settings botharness-client
# 使用读取结果中的旧值和 revision，而不是直接照抄下面的示例数值。
printf '%s' '{"assignmentConcurrencyLimit":3}' | deepseekbot settings-set botharness-client --patch-stdin --expected-revision 12 --previous-value '{"assignmentConcurrencyLimit":8}'
```

`capabilities`（以及受限模式的 `--help`）列出支持的命令、字段、必需的审核输入和带代码的拒绝原因。读取返回 `{scope, ns, revision, value}`，`value` 只包含授权字段。写入将解析后的命名空间、旧值、新值和 revision 交给现有 Host 审批策略；审批前后和执行时重验真实 Tob root Orchestrator 与准确的已准入 Human DM 来源，随后读回 native Settings 的值。群聊／外部 IM、Bot 来源、Assignment Sessions 和调用方自报身份均不能授予此权限。

Host 将短期 loopback endpoint 与受限 token 注入这次 Shell 的子进程环境。它是短期 bearer capability，不是 Human 管理员凭据，也不构成同一 OS 用户之间的隔离边界；不要打印或持久化它。Shell 完成、取消或释放后立即撤销。不支持的命令／参数、不完整的受限上下文、指定其他 Host／token／离线 home 的尝试均会拒绝，不回退到 Human 或离线访问。`stale-setting` 要求重新读取并提案；`agent-write-uncertain`、`setting-outcome-uncertain` 和 `setting-readback-mismatch` 要求重试前先读回。上下文过期后必须发起新的 Shell 执行。

已认证 Human 的 `settings-set` 保持原行为，新增成对的 `--expected-revision` 与 `--previous-value` 参数，用于提交已审核的 patch；后者为与 patch 字段一致的 JSON 对象。同时省略这两个参数仍使用原有先读再写流程。Tob 的删除／归档仍返回 `protected-bot`。

[UI／CLI 覆盖清单](agents/cli-ui-coverage.md) 区分既有 Human 命令和 Tob 受限访问，并跟踪后续缺口。身份与生命周期边界见 [ADR-0224](adr/0224-tob-management-uses-scoped-native-shell-cli.md)。

### Tob 创建 Bot、资料与生命周期

Tob 的受限 `create` 只在受管 Memory 位置创建空白 Bot。用户只需提供名称；Tob 为本次操作准备稳定的 `--operation-key`。可选 `--description`、重复的 `--role` 标签、`--avatar-file`、`--persona`／`--persona-stdin` 和 `--core-memory`／`--core-memory-stdin` 复用现有创建校验。仅一个内容参数可读取 stdin。初始人格和记忆写入 `SOUL.md`、`MEMORY.md`，不复制其他 Workspace Grants 或凭据。

```bash
deepseekbot create --name Translator --operation-key create-translator-001 --persona 'Translate clearly.' --core-memory 'Prefer concise explanations.'
deepseekbot show <bot-id>
deepseekbot update <bot-id> --expected-profile <profileFingerprint> --name Translator --description 'Translation assistant' --role translator
deepseekbot pause <bot-id> --expected-profile <profileFingerprint>
deepseekbot resume <bot-id> --expected-profile <profileFingerprint>
```

Host 先通过持久创建回执保留一个身份，再创建 Memory Repository 和 DM。响应丢失后重复**同一个 operation key 和同一份 payload**：已完成的回执返回原 Bot 与 DM，部分完成的操作沿用预留身份进行核对。受限模式已完成的重试走权限检查后的读取，不再申请一次创建审批。相同 key 配不同 payload 返回 `creation-key-conflict`；身份已归档或删除返回 `creation-identity-unavailable`，不会因重放而重建。`creation-memory-conflict` 表示预留目录已经存在但 Registry 身份未落地，应保留现场修复，不要删除目录或换 key 再建。回执不构成文件系统与数据库之间的原子事务，也不承诺自动修复该中断状态。

已认证 Human 的在线 `create` 同样支持 `--operation-key`，适用于受管 Memory 中的空白创建或已检查的 Git 来源，不可同时传 `--preset` 或自定义 Memory 位置；模型计划和 Memory 迁移另行操作。不传 key 保留原行为。本片不向 Tob 授予 Git／Zip／目录导入、市场搜索或修改其他 Bot 既有 Memory 的权限。

Human 在线命令 `create-status` 在原 Host 只读查询创建回执。名称、人格、简介、标签等空白创建输入和 key 必须与原请求一致；不同输入会被拒绝。尚无操作时返回 `{receipt:null}`，否则返回 `{receipt:{operationKey,botSlug,status,channelId?}}`。`reserved` 可用完全相同的输入和 key 再次执行 `create` 恢复；`created` 指向已创建的同一个 Bot 和私聊。结果不确定时不要换 Host 或生成新 key。移动端在首次创建前先查询，以免旧 Host 不支持恢复却仍创建 Bot。

```bash
deepseekbot create-status --host <原Host> --name Ada --persona 'Keep replies short.' --description 'Research helper' --role research --operation-key create-ada-001
deepseekbot create --host <原Host> --name Ada --persona 'Keep replies short.' --description 'Research helper' --role research --operation-key create-ada-001
# 响应丢失后，用完全相同的参数再次执行 create-status。
```

受限 `show` 返回 `{bot, profileFingerprint}`。每次执行 `update`、`pause`、`resume`、`bot-avatar-set`、`bot-banner-set`、`bot-appearance-set` 或 `bot-primary-color-set` 前，先读取目标，再用 `--expected-profile` 传入该指纹。展示命令保留既有文件／recipe／清除／颜色参数。指纹覆盖完整 Registry record，因此任何已记录资料字段的并发变更都会使审核快照失效。Host 在审批后、调用原 owner 前重新检查，完成后返回规范资料及新指纹。遇到 `stale-setting` 重新读取，不静默覆盖。资料更新仅包含名称、简介和标签，不包含 Workspace Grants、凭据或模型配置。Human 的在线 `update` 同样必须传入 `show` 返回的 `--expected-profile`，复用原 Host owner；不会静默刷新已过期的指纹。`--description ''` 清空简介，`--role ''` 清空全部标签。

```bash
deepseekbot bot-delete-preview <bot-id>
deepseekbot bot-delete-memory-folder <bot-id>
printf '%s' '{"token":"<preview.token>"}' | deepseekbot bot-delete-confirm <bot-id> --confirmation-stdin --confirm
# 仅在明确审核擦除 owner 展示的 Memory 目录后：
printf '%s' '{"token":"<preview.token>"}' | deepseekbot bot-delete-confirm <bot-id> --confirmation-stdin --confirm --erase-memory
deepseekbot bot-delete-retry <bot-id> --confirm
```

删除默认保留 Memory。仅在 `preview.eraseAvailable` 允许时，`--erase-memory` 才选择擦除 owner 审核过的准确目录；不接受调用方另选路径。`bot-delete-memory-folder` 返回经校验的 `{target:{path,relativePath,kind}}` 供检查，不提供任意文件系统访问。预览 token、依赖范围和路径所有权检查仍具权威性。重试沿用已接受的保留／擦除选择，不得改变选择。受限 confirm 与 retry 每次都需 Human 新作决定，full access、已记住规则和自动审批不能替代。Human 的这两个命令也新增必需的 `--confirm`，已有清理脚本需更新。Tob 自身不能归档或删除（`protected-bot`）；名称、人格文本和导入内容都不能赋予其权限。

详见 [ADR-0225](adr/0225-bot-creation-receipts-and-reviewed-profile-lifecycle.md) 与[覆盖清单](agents/cli-ui-coverage.md#2089-bot-management-scope)。直接 CLI、真实 Tob 对话、Web 导航和 macOS Desktop 是独立验收入口，命令契约不代表这些验证已通过。

### Tob 建群与邀请

[#2090](https://github.com/BotHarness/DeepSeekBot/issues/2090) 的首个切片允许 Tob 从已准入的 Human DM 建群并加入现有 Bot。管理操作审批通过后，受邀 Bot 按既有默认值 `autoAcceptGroupInvites=true` 立即入群，无需另作邀请决定。受限 CLI 复用现有 Channel owner，不新增模型 Tool。Tob 管理其他 Bot，自身不能作为初始成员或邀请目标。

```bash
deepseekbot channels --limit 25
deepseekbot channel <channel-id>
deepseekbot group-create "研究小组" --member <bot-a> --member <bot-b> --operation-key group-research-001
deepseekbot group-create "计划" --operation-key group-planning-001
deepseekbot group-invite <channel-id> --bot <bot-c> --operation-key invite-research-001 --expected-channel <channelFingerprint>
```

受限 `channels` 返回有界频道元数据，不返回消息正文；`--limit` 为 1–100，默认 50，将返回的 `nextCursor` 传入 `--cursor` 继续读取。`channel <group-channel-id>` 返回 `{channel, channelFingerprint, invitationPolicy:{autoAccept}, wakePolicies}`，拒绝非群频道。受限投影最多保留 100 个成员、最近 100 条邀请和最近 100 条入群申请，并报告被省略的数量。这些读取不会让 Tob 加入群聊，也不把群消息变成管理指令来源。

`group-create` 支持空群，或用重复的 `--member` 指定现有可用 Bot。明确指定的初始成员直接加入，与现有 Human／UI 创建行为一致。之后的 `group-invite` 复用现有邀请 owner。默认 `autoAcceptGroupInvites=true` 时，同一事务记录已接受邀请（`respondedBy: "profile-policy"`）和成员关系，不唤醒受邀 Bot 单独决定。本片不新增设置或 UI 开关。仅当 Human 已主动关闭自动接受时，才沿用待处理邀请的原有决定流程；Tob 保留这一选择并报告实际状态。

受限建群／邀请写入必须提供稳定的 `--operation-key`：长度 8–128，以字母或数字开头，只含字母、数字、点、下划线、冒号或连字符；邀请还必须传入前一次读取的 `--expected-channel` 指纹。审核快照绑定当前频道元数据、成员、邀请策略及目标 Bot 身份；消息到达和未读计数不会使其过期。审批和执行重新检查已准入 Human DM 与当前目标状态。审核期间相关设置发生变化时，应重新读取并提案，不能悄悄刷新已批准的快照。

带 key 的结果包含 `receipt`，字段为 `operationKey`、`kind`、`channelId`、可选 `invitationId` 及完成 `status`，同时返回规范频道状态及适用的邀请。持久操作回执预留频道或邀请身份。响应不确定时，使用**相同命令、key 和 payload**重试以核对原操作，不要换新 key。已完成的受限重放读回原结果，不再次请求变更审批。输入变化、目标不可用或 Bot 身份代次变化均拒绝；重放不会重建已删除群或重复邀请。Shell／Host 重启后仍须具备当前权限；回执不保留已过期的 Shell capability。

`stale-channel` 或 `stale-profile` 要求重新读取并审核；`operation-key-conflict` 表示该 key 已绑定不同输入。`channel-operation-unavailable`、`unknown-channel`、`unknown-bot` 和 `archived-bot` 拒绝不可用身份；`protected-bot` 拒绝以 Tob 为目标。不可用邀请返回 `group-invite-unavailable`。这些失败不允许回退到其他命令或另造身份。

已认证 Human 的在线 `group-create` 和 `group-invite` 也支持稳定 operation key；邀请支持 `--expected-channel` 绑定已读取状态。这些审核／重试参数对 Human 命令可选，对受限 Tob 必需。原有不带 key 的 Human 操作保持既有 owner 行为。

后续切片加入下节所述的群名称／头像、成员唤醒设置、移除成员、取消待处理邀请和决定待处理入群申请；个人免打扰／置顶／昵称／显隐、删除群、附件和外部成员管理仍不在受限允许清单内。部分已有上文的 Human CLI 命令，不等于已向 Tob 开放。#2090 保留未完成范围，不因本切片关闭。详见 [ADR-0226](adr/0226-group-management-receipts-preserve-channel-authority.md) 和[覆盖清单](agents/cli-ui-coverage.md#2090-group-management-scope)。直接 CLI、真实 Tob 审批／读回、Web 成员／历史和 macOS Desktop 分别验收。

### Tob 群设置与成员移除

从已准入的 Human DM，Tob 可经现有审批修改群名称、头像和成员的普通群消息唤醒策略，或将 Bot 移出群聊。它沿用相同 Channel owner、权限和持久数据，不新增模型 Tool、数据库迁移或 UI。受限 `channel-rename` 仅接受群频道，不能通过此命令重命名 Bot 私聊。

```bash
deepseekbot group-wake-policies <channel-id>
deepseekbot channel-rename <channel-id> --name "产品研究" --expected-channel <channelFingerprint>
deepseekbot group-avatar-set <channel-id> --avatar-file ./avatar.png --expected-channel <channelFingerprint>
deepseekbot group-avatar-set <channel-id> --clear --expected-channel <channelFingerprint>
deepseekbot group-wake-set <channel-id> --bot <bot-id> --mode digest --count 5 --interval 30 --expected-channel <channelFingerprint>
deepseekbot group-wake-set <channel-id> --bot <bot-id> --inherit --expected-channel <channelFingerprint>
deepseekbot group-member-remove <channel-id> --bot <bot-id> --expected-channel <channelFingerprint>
```

`group-wake-policies` 返回当前群快照、`channelFingerprint`，以及每个成员的 `{botSlug, inherited, policy}`。指纹包含有效唤醒策略，包括从 Bot 继承的默认值；默认值变化也会使旧审核过期。消息到达和未读变化不会使审核过期。受限头像读取／审批仅展示存在状态、类型、大小及摘要，不展开图像数据。

这些写入都必须传入刚读取的 `--expected-channel`；每次成功修改后重新读取，再准备下一次修改。群名为非空文本，最多 120 个字符；头像使用上述有界 PNG／JPEG／WebP 或 `--clear`。唤醒模式为 `all`、`mentions`、`digest`、`silent`；`--count` 为 1–100，`--interval` 为 1–3600 秒，默认 5／30；`--inherit` 移除该群覆盖并恢复 Bot 默认值。移除成员保留 Bot 身份、Memory、其他频道与该群历史；若被移除的是群 owner，清除其群管理身份，群改由 Human 管理。可移除已归档的现有成员；修改唤醒策略要求目标 Bot 活跃。

审批绑定旧状态、准确目标及新值，执行前重验当前 Human 的群访问权限和目标 Bot 身份。已拒绝／过期审批、Human 已离群、非群目标、目标非成员、身份被替换均拒绝，不绕过检查；Tob 仍不能入群。`stale-channel`／`stale-profile` 要求重新读取和审核，不自动覆盖并发修改。

这些编辑不接受 `--operation-key`，不新增重放回执。结果不确定时，先用 `channel`／`group-wake-policies` 核对实际状态，不能盲目重试；仍需修改时按最新快照重新提案。原建群／邀请回执和默认自动入群行为不变。已认证 Human 的对应在线命令可选 `--expected-channel`，省略时保留现有行为；这不放宽 Tob 的必需输入。#2090 仍保留未交付范围；命令说明不是 Web、真实模型或 macOS 验收通过的证据。

### Tob 取消邀请与入群决定

Tob 可从已准入的 Human DM，经现有审批取消一条**待处理**群邀请，或接受／拒绝一条**待处理**入群申请。先用 `channel <channel-id>` 读取准确的邀请／申请 ID、状态及 `channelFingerprint`，再提出对应操作：

```bash
deepseekbot channel <channel-id>
deepseekbot group-invite-cancel <channel-id> --invitation <invitation-id> --expected-channel <channelFingerprint>
deepseekbot group-join-decide <channel-id> --request <request-id> --accept --expected-channel <channelFingerprint>
deepseekbot group-join-decide <channel-id> --request <request-id> --decline --expected-channel <channelFingerprint>
```

受限命令必须提供已读取的 `--expected-channel`；入群决定必须且只能选择 `--accept` 或 `--decline`。审批绑定当前群快照、准确的待处理记录、目标 Bot 身份代次和所选决定。执行前重验已准入 Human DM、当前 Human 群成员资格、指纹、目标身份和记录仍待处理。拒绝／过期审批、Human 已离群、并发决定、目标被替换或已失效均不能继续变更，也不自动更新已批准的输入。

`unknown-invitation`／`unknown-join-request` 拒绝不存在的记录，`invitation-not-pending`／`join-request-not-pending` 拒绝已结束的目标；`stale-channel`／`stale-profile` 要求重新读取并审核。这些拒绝不允许自动换目标或改用其他动作。

默认 `autoAcceptGroupInvites=true` 不变：受邀 Bot 通常已经立即入群，不能用取消邀请撤销已接受的邀请，也不会因此移除现有成员。取消仅适用于尚待处理的邀请，例如 Human 先前关闭自动接受后产生的邀请。需要移除已入群 Bot 时，另行使用经审核的 `group-member-remove`；不要把取消失败回退成移除。

接受申请由原 Channel owner 持久保存成员关系与接受状态，拒绝则不增加成员；既有决定通知只记录一次。Tob 不加入群，也不把群内容当作管理授权来源。此切片复用原状态与通知流程，不增加模型 Tool、数据库迁移或操作回执。

已认证 Human 的同名在线命令可选 `--expected-channel`；`group-join-decide` 省略时保留既有的同向已完成决定幂等读回。Tob 的受限入口仅接受待处理记录，不能通过省略指纹或重复终态决定绕过新审核。结果不确定时先读回准确记录的状态与成员关系；若仍待处理且需要继续，再基于新快照提案，不盲目重试。其他个人展示、整群删除与外部成员能力仍另行交付，#2090 不因本片关闭。

### Tob 模型与运行设置

在 Tob 具备权限的 Shell 执行中使用 `deepseekbot capabilities` 查看当前命令。下列命令复用已有 Host owner；写入仍须满足已准入 Human DM 和现有审核策略。

```bash
deepseekbot list
deepseekbot model-catalog
deepseekbot model-plan <bot-id>
deepseekbot model-presets
deepseekbot settings

deepseekbot home-model-set --provider <provider-id> --model <model-id> [--orchestrator-effort <effort>] --expected-revision <default-revision>
deepseekbot model-plan-customize <bot-id> --orchestrator-provider <provider-id> --orchestrator-model <model-id> --expected-revision <plan-revision>
deepseekbot model-plan-inherit <bot-id> --expected-revision <plan-revision>
# 完整计划 JSON：orchestrator、assignmentDefault、assignmentModels。
deepseekbot model-plan-set <bot-id> --plan-stdin --expected-revision <plan-revision> < plan.json
# 仅 Assignment 的 JSON 省略 orchestrator；Bot 必须已经有独立计划。
deepseekbot model-plan-assignments-set <bot-id> --plan-stdin --expected-revision <plan-revision> < assignments.json
deepseekbot model-preset-apply <bot-id> --preset <preset-id> --expected-revision <plan-revision> --preset-revision <preset-revision>
```

`model-catalog` 返回可用模型及 `default`／`defaultRevision`；读取 model-plan 返回 Bot 计划的 revision。修改 Host 默认模型保留其他 Bot 的独立配置。Customize 修改 Orchestrator 并保留 Assignment 选择；inherit 让 Bot 恢复跟随 Host 默认值。Host 在准备操作和执行前均检查模型可用性：不可用路由返回 `model-unavailable`，已审核 revision 发生变化返回 `stale-setting`。需要修复的旧计划返回 `legacy-model-repair-required`，不会静默重写。凭据配置仍使用原生私密输入和既有凭据界面；Tob 只获取目录／就绪状态，不获取密钥值。

预设的创建、读取、更新和应用复用既有 preset owner。受限 `model-preset-create --name <name>` 与 `model-preset-update <preset-id> --name <name> --expected-revision <revision>` 必须显式提供 `--orchestrator-provider`、`--orchestrator-model`、`--assignment-provider`、`--assignment-model`；可选 effort 参数和包含 `{"assignmentModels":[...]}` 的 `--plan-stdin` 沿用既有格式。受限更新要求完整的目标名称与模型路由，Human 命令仍可局部更新。应用预设同时校验 Bot 和 preset revision。当前没有预设删除 owner 或命令，本片不新增删除操作，也不宣称完整 preset CRUD。

`settings` 列出支持的命名空间；`settings botharness-client` 只返回以下四个实时运行字段：

| 字段                         | 接受值      |
| ---------------------------- | ----------- |
| `assignmentConcurrencyLimit` | 1–32 的整数 |
| `showBotSessions`            | 布尔值      |
| `showApprovalReviewSessions` | 布尔值      |
| `developerMode`              | 布尔值      |

`settings-set botharness-client --patch-stdin` 必须配合成对的审核参数；previous-value JSON 必须与 patch 使用完全一致的字段。`settings agent-default-model` 读取默认模型路由，通过 `home-model-set` 修改。未知字段、其他命名空间和直接 patch 默认模型均拒绝，不绕过 owner 编辑配置文件。本片范围不包含动效、主题、语言、快捷键、布局等其他偏好。

### Tob 隐私、Git 与更新

```bash
deepseekbot telemetry-status
deepseekbot telemetry-set --enabled
# 或：deepseekbot telemetry-set --disabled
deepseekbot git-status
deepseekbot git-install
deepseekbot release-info
deepseekbot release-check
deepseekbot release-install <version> --confirm
deepseekbot release-restart --confirm
```

这些命令与设置页复用同一套 telemetry、Git 和 release owner。环境锁定的 telemetry 不能覆盖；应读取实际生效／锁定状态，不能假定已保存的偏好一定控制数据收集。Git 仅覆盖可用性和安装，不新增全局 Git 身份编辑器。

受限 `release-install` 和 `release-restart` 必须带显式 `--confirm`，而且每次调用都需要新的 Human 决定。Full access、记住的允许规则和自动审批都不能替代这次决定；该参数本身不等于审批。`git-install` 不使用 `--confirm`，继续沿用其既有审核策略。重启可能中断运行中的轮次并断开请求 CLI；结果不确定时不得自动重复安装或重启，应重新连接并读取发布状态后再决定下一步。仅在自己拥有的隔离 Profile 中验证这些操作，保留 Human 当前 Desktop。

### 恢复已耗尽复核额度的群聊草稿

Host 重启后先检查草稿、重新读取群聊，再通过同一个
`bot-tool ... bot_send_message --args-stdin` 命令同时传入 `recover: true`、
`freshness_override`（当前 `draftVersion` 与理由）、新 `observation_id`、原 `draft_id`
和修正后的正文。恢复不会重置两次复核额度或已消耗的显式继续机会；提交前又有未读变化
仍会拒绝。成功的显式继续也保留提交回执，重启后以相同意图重试只返回原消息 ID。
仅检查元数据时不能携带 `freshness_override` 或其他修改参数。

### 云端 Agent 连接（UAT）

`deepseekbot cloud list` 从选定的在线 Host 读取公开连接状态。用 `deepseekbot cloud import --input-stdin < /absolute/private-agent.json` 导入操作者确认可信的 TOB Agent 凭证；Host 核验实例、频道和 Agent 身份后，才把秘密写入原生 Credentials。不要把凭证值放在命令参数中。导入的账号出现在 `cloud list` 和已有 Apps 界面，再通过已有 `im-bind <bot> --app <cloud-id>` 命令／界面明确绑定本地 Bot。导入不切换手机／CLI 的 Human 组织，也不创建 Bot。

`deepseekbot cloud policy --input-stdin` 接收 `{ "id": "cloud-<fingerprint>", "revision": 1, "policy": { "allowedUsers": ["user_..."], "forwardTargets": [], "environment": "host-a" } }`。它记录本地工作授权范围，不绕过原生工具权限。`deepseekbot cloud remove --input-stdin --confirm` 接收 `{ "id": "cloud-<fingerprint>", "revision": 2 }`；先读取实际最新修订号。移除会先停用流量再删除秘密，返回 `credentialRemoved: false` 时需要重试清理。两个 Host 的执行与运行证据仍由 #2155 跟踪，以上命令示例不代表验收通过。

`deepseekbot cloud-work <bot> --input-stdin` 调用与 Bot 相同的受限 `cloud_work` 工具。传入 `{ "operation": "inspect", "source_event_id": "im-..." }` 读取权威请求和已配置的转交目标；`execute` 只执行固定运行时检查；`forward` 另需指定这些目标中的 `target_actor_id`。输入不能指定 Human 身份、请求正文或任意命令。每次操作均核验当前来源访问、绑定和本地策略。不确定时使用相同来源、操作和目标重试：结果补发不会重复检查；中断执行返回 `needs-review`；尝试转交后不能改为本地执行。`f02c2423b` 已通过模型介导的双 Host 固定检查，以及两端重启后的直接重试；不代表任意工作或新一轮手机闭环已验证。

## Desktop 新手引导

`deepseekbot onboarding` 读取 Profile 引导及实际 Bot／群聊结果引用。`--action start|pause|skip|continue|restart|finish` 控制生命周期；finish 不再要求已实际创建 Bot 与群聊：引导的身份模板和采访会在用户需要时由托布创建。重新开始保留资源、审批、布局和历史。布局教学完成记录属于当前 Client；CLI 不操作界面，也不把模型配置视为执行成功。

### 绑定版本的 Memory PNG 图片

`memory-file`、`memory-working-diff` 和 `memory-commit-diff` 为 PNG、JPEG/JPG、GIF、WebP 和安全静态 SVG 文件返回可选图片元数据。`source` 标识当前工作树、暂存区或确切提交，`revision` 绑定实际字节；JSON 不包含图片正文。

```bash
deepseekbot memory-image <bot-id> --path preview.png --image-source <source> --image-revision <revision> --out /absolute/new-preview.png
```

`memory-file`、`memory-working-diff` 和 `memory-commit-diff` 对 `.md` / `.markdown` 额外返回 `markdown` 文档（或 `before` / `after` 文档）：包括 `source`、文档字节 SHA-256 `revision`、`status` 和原始 UTF-8 `body`。每个文档最多 4 MiB，单次提交查询返回的文档正文合计最多 4 MiB；原有逐行 diff 限制独立保留。JSON 不携带渲染 HTML 或图片字节。

导出内嵌本地 PNG 时，传入文档版本和原始引用：

```bash
deepseekbot memory-image <bot-id> --path notes/guide.md --image-source <document-source> --image-revision <document-revision> --image-reference ../chart.png --out /absolute/new-chart.png
```

指定 `--image-reference` 后，`--path` 表示 Markdown 文档，`--image-revision` 表示该文档的版本；回执另含 `reference`。相对路径从文档所在目录解析，`/chart.png` 从 Memory Repository 根解析。支持百分号编码的空格和 Unicode，以及仍在仓库内的上级路径；拒绝根目录越界、`.git`、反斜线、URL 协议和逃逸符号链接。图片读取前后均检查可变文档版本；index 和历史图片不会回退到工作区。图片来自加载时的所选来源，后续可变图片变更通过刷新查看。外部 HTTPS 图片只由 Client 在明确点击后加载，Host 与 CLI 不请求外部 URL。

使用所选文件或 diff 一侧的原始元数据。认证 Host 返回对应的原始图片字节、检测所得 MIME 或 `memory-image-stale` 等明确拒绝；可变版本过期时应刷新，不得用当前文件替代。`--out` 必须是尚不存在的绝对路径。命令只输出一个 JSON 回执。图片上限为 25 MiB、单边 16,384 像素及解码后 4000 万像素。GIF/WebP 保留原动画，上限 256 帧，全部帧画布像素之和不超过 4000 万。SVG 另有 1 MiB UTF-8 源文件、10,000 XML 节点、64 层深度、64 KiB CSS 和 20,000 展开节点预算。静态 SVG 子集支持常用形状、文字、CSS、渐变、箭头标记、裁剪及有界内部引用；拒绝脚本、事件处理器、外来 HTML、图片、滤镜、动画、外部引用、DTD、处理指令和引用循环。SVG 始终作为图片资源，不插入页面标记；成功导出保留原始 SVG 字节。原文件下载与“打开当前文件”仍为独立操作。

## 桌面整页缩放（S1 受控切片）

Tobs 1.5.2 曾通过再插入一行 `ui-theme` Loader 行默认加载缩放，导致 DSH 0.2.1-rc.3 设置拒绝所有外观与字体写入（[#2788](https://github.com/BotHarness/DeepSeekBot/issues/2788)）。产品 Bundle 现已不再改动原生 `ui-theme` 行，缩放需通过下面的显式命令启用。

产品附带独立的显式启用命令。普通安装产品后，先退出目标 macOS 桌面，再明确指定应用 Bundle
和 Profile。命令使用所选应用附带的 pnpm，禁用安装脚本，并持有与原生插件管理器相同的 Profile
写锁。桌面 Host 仍在运行、存在其他主题覆盖或产品仍采用旧组合时拒绝；准入检查依据协议、平台及包内容完整性。
只改变一个 Profile 依赖，不修改已安装应用：

```sh
deepseekbot-zoom-setup enable --home <绝对路径-DSH_HOME> --profile desktop --desktop-app "/Applications/DeepSeek Harness.app"
deepseekbot-zoom-setup disable --home <绝对路径-DSH_HOME> --profile desktop --desktop-app "/Applications/DeepSeek Harness.app"
```

命令返回前保持桌面关闭，完成后再打开。Profile 被占用或包操作结果不确定时须检查，不会自动重试。
非桌面的隔离 Profile 继续使用 `--profile <profile> --dsh <已验证的-dsh-cli>`。
DSH CLI 明确拒绝管理 `desktop` Profile；原生插件管理器会优先解析应用自带的同名主题，因此也拒绝
这一普通库替换。两条路径的无窗口测试结果不能作为桌面启用验收。

卸载产品前先 `disable`，并重启以恢复原生包解析。手动字体偏好仍由原生 `ui-theme` Patch 保存。
JSON 标准输出包含 `restartRequired:true`、`runtimeVerified:false`；包配置成功不表示原生窗口已加载。
包操作结果不确定时不会自动重试。

### 在 Bot 设置中启用

在 macOS 或 Windows 桌面端，Bot 设置 → 通用会显示「启用窗口缩放」（已安装时显示「关闭窗口缩放」）。按钮让 Host 以独立后台进程运行同一个 `deepseekbot-zoom-setup enable|disable --after-quit <状态文件> --request <id>` 事务。后台进程等到桌面端完全退出后，执行原有检查与 Profile 修改，记录结果并重新打开应用。退出前可点「取消」撤回；新的请求会取代旧的。30 分钟内未退出应用时，后台进程不做任何修改、也不重新打开应用便结束。下次打开设置会显示失败代码。Host 根据自身运行路径确定目标应用，只在原生 `desktop` Profile 中提供此入口。

```sh
deepseekbot window-zoom-setup-status --host <host> --token-file <私有文件>
deepseekbot window-zoom-setup-enable --host <host> --token-file <私有文件>
deepseekbot window-zoom-setup-disable --host <host> --token-file <私有文件>
deepseekbot window-zoom-setup-cancel --host <host> --token-file <私有文件>
```

在非桌面 Profile 中状态为 `{supported:false, code}`，否则为 `{supported:true, enabled, pending?, last?}`。拒绝代码包括 `zoom-setup-not-desktop`、`zoom-setup-desktop-app-unresolved`、`zoom-setup-command-unavailable`、`zoom-setup-already-enabled|disabled` 与 `zoom-setup-not-pending`；后台进程未写结果即结束时报告 `zoom-setup-helper-exited`。

`window-zoom-clients` 列出在线目标，必须明确传入 `--client-id`，不会隐式选择窗口。
`window-zoom-get` 读取 Client 持有的状态；写入必须携带其 `document.revision`：

```sh
deepseekbot window-zoom-clients --host <host> --token-file <private-file>
deepseekbot window-zoom-get --client-id <id> --host <host> --token-file <private-file>
deepseekbot window-zoom-set --client-id <id> --zoom-level=-1 --expected-revision <revision> --host <host> --token-file <private-file>
deepseekbot window-zoom-reset --client-id <id> --expected-revision <revision> --host <host> --token-file <private-file>
```

级别为 -8…8 的整数，倍率为 `1.2 ** level`。`window-zoom-set` 加 `--zoom-default` 时，
保存设备默认值并应用于当前窗口；普通设置只改变当前窗口，重置恢复已保存的默认值。
负数采用 `--zoom-level=-1` 写法。偏好保存在稳定桌面 origin 的本地存储中，Host 仅转发请求。
浏览器 Client 和没有合格兼容组合的桌面不会注册目标。

`zoom-client-stale`、`zoom-client-unavailable`、`zoom-revision-conflict` 和存储错误均表示拒绝，
不会降级写入。投递后的超时或取消意味着写入结果未知，必须先读取同一在线 Client，不能盲目重试。
Client 重启后投递 ID 会改变，需要重新列出；主窗口偏好独立保存。原生验证范围见
[S1](https://github.com/BotHarness/DeepSeekBot/issues/2268)。这条路径不需要模型，也没有 Host 偏好副本。

Windows 候选版使用已安装产品的 `deepseekbot-zoom-setup` 命令，显式传入
`--home <隔离-home> --profile desktop --desktop-app "<应用目录>/DeepSeek Harness.exe"`。
整个 `enable` 或 `disable` 事务期间须关闭所选 Desktop；该可执行文件有运行进程即拒绝事务。
准入检查依据协议、平台及包内容完整性，不限制为某个固定 FileVersion。
原生 `ui-theme` 行和字体设置保持原有身份。移除产品前先执行 `disable`；每次冷启动后重新枚举 Client ID。
Ctrl+0 恢复已保存的默认值，包括 120%；固定原生协议不支持数字小键盘键码。
原生输入、guest 前台恢复、DPI 和 Human QA 的独立门槛见
[Windows 资格 #2270](https://github.com/BotHarness/DeepSeekBot/issues/2270)。

## DeepSeekBot Connect（ADR-0241）

DeepSeekBot Connect 让已配对的手机经 `deepseekbot.dev` 下的 Cloudflare Tunnel 连到本 Host，不再需要
Tailscale（[#2387](https://github.com/BotHarness/DeepSeekBot/issues/2387)）。通常由 Host 登录
DeepSeekBot 账号、中继分配隧道（见下面的账号登录）；`connect-enable` 运行手工创建 connector token 的隧道。

```sh
deepseekbot connect-status --host <host> --token-file <private-file>
deepseekbot connect-enable --hostname <name>.deepseekbot.dev --token-stdin --host <host> --token-file <private-file> < <connector-token-file>
deepseekbot connect-disable --host <host> --token-file <private-file>
```

`connect-enable` 把主机名和 connector token 存进 DSH 凭据存储，开一个只把
`/botharness-device/*` 转给 DSH 监听口的回环入口（其他路径一律 404），并以
`cloudflared tunnel --no-autoupdate run` 运行隧道；token 只放在 `TUNNEL_TOKEN` 环境变量里，
不出现在参数中。返回 JSON 的 `origin` 是隧道 ingress 要指向的地址。Host 运行固定版本的
`cloudflared`（`packages/core/src/devices/cloudflared.json`），按顺序取第一个可用的：
`DEEPSEEKBOT_CLOUDFLARED`；随 `deepseekbot` 安装的可选包 `@botharness/cloudflared-<平台>-<架构>`；
`$DSH_HOME/botharness/cloudflared/<版本>/` 下的副本（从 cloudflared 的 GitHub 发布下载，SHA-256
与固定值一致才保留）；最后是 `PATH` 上的 `cloudflared`。哈希不符的缓存或包内二进制会被拒绝，
损坏的缓存会被删除并重新下载。`connect-status` 返回 `connect.state`（`off`、`starting`、
`connected`、`error`）及 `issue`（`cloudflared-missing`、`cloudflared-exited`、
`cloudflared-download-failed`、`cloudflared-hash-mismatch`、`origin-port-busy`、
`credential-unavailable`）、`connect.cloudflared`（`env`、`package`、`cache`、`download` 或
`path`，即实际运行的是哪个二进制）和手机路由列表。下载被拒绝后会退避重试；连上后，新的配对二维码会在 Tailscale 路由之后带上
`https://<name>.deepseekbot.dev`。拒绝码：`connect-hostname-invalid`（只接受
`deepseekbot.dev` 下一级）、`connect-token-invalid`、`credential-unavailable`。
`connect-disable` 停掉隧道并删除已存的 token，已配对设备的凭据不受影响。

### 账号登录

```sh
deepseekbot connect-sign-in --wait --host <host> --token-file <private-file>
deepseekbot connect-sign-out --host <host> --token-file <private-file>
```

`connect-sign-in` 用 `https://connect.botharness.ai` 上 relay 公布的 WorkOS client 发起 CLI Auth
（设备授权流程；可用 `DEEPSEEKBOT_CONNECT_RELAY` 覆盖 relay 地址）。返回里有 `userCode` 和
`verificationUri`；加 `--wait` 时 CLI 把它们打印到 stderr，并等 Host 完成登录。之后 Host 只把 refresh
token 存进 DSH 凭据存储，把自己关联到账号（每个账号最多 5 台 Host），向 relay 申请隧道并像
`connect-enable` 一样运行，不再需要手工 token。登录期间隧道停掉时 Host 会重新向 relay 申请，所以
Host 离线后被回收的隧道会在同一个 `<host-id>.deepseekbot.dev` 上恢复。`connect-status` 增加
`connect.account`：`state`（`signed-out`、`signing-in`、`signed-in`、`error`）、`email`、`hostId`
和 `issue`（`relay-unavailable`、`sign-in-denied`、`sign-in-expired`、`session-expired`、
`account-not-allowed`、`host-limit`、`credential-unavailable`）。登录期间 Host 每分钟向 relay
复查一次账号；relay 或 WorkOS 拒绝会话后（例如 `DELETE /v1/account` 之后），Host 停掉隧道、删除
保存的会话，并报告 `error` 和 `session-expired`。`connect-sign-out` 在 relay 上解除
关联、停掉隧道并删除会话。任何已登录的账号都能关联 Host。

## 设备本地 DeepSeekBot 外观

`appearance-clients` 列出已认证 Host 上在线 Client 的 id 和平台。必须明确选择一个；重载后会生成新 id。此功能控制 DeepSeekBot 自己的外观，不修改 DSH 原生 Host 主题。

```bash
deepseekbot appearance-clients --host http://127.0.0.1:PORT --token-file /private/host-token
deepseekbot appearance-get --client-id CLIENT_ID --host http://127.0.0.1:PORT --token-file /private/host-token
printf '%s' '{"preference":"dark","mode":"dark","preset":"mist-purple","primary":"#9876cb"}' | deepseekbot appearance-set --client-id CLIENT_ID --expected-revision REVISION --patch-stdin --host http://127.0.0.1:PORT --token-file /private/host-token
```

`REVISION` 使用读取结果中的 `snapshot.config.revision`。`preference` 可为 `light`、`dark`、`system`。设置 `preset`（`classic-blue` / `mist-purple`）或六位十六进制 `primary` 时必须明确 `mode`（`light` / `dark`）。选预设会清除该模式的 Primary 覆盖；同一补丁仍可指定新 Primary。保留另一模式和未知后续字段。

成功输出一份 JSON，代表目标 Client 已确认本地保存；再读取并检查 UI。Web 按浏览器/站点保存；Desktop 按应用保存，不含 Host 键。其他浏览器配置与 Desktop 不会收到该命令；同站点标签页按设计共享本地存储。

拒绝码包括 `appearance-client-required`、`appearance-client-stale`、`appearance-client-unavailable`、`appearance-client-busy`、`appearance-client-timeout`、`appearance-revision-required`、`appearance-revision-conflict`、`appearance-invalid-input`、`appearance-storage-invalid`、`appearance-storage-unavailable`。已投递后的超时结果不确定，应先重读再重试。不提供离线队列、广播、Host 偏好副本，也不调用模型。

全局材质（T2）：四套预设为 `classic-blue`、`mist-purple`、`forest-green`、`warm-amber`。模式补丁可含 `materials.header` 和/或 `materials.body`，各自接受可选 `color`（六位十六进制）、`opacity`（0–100，不透明度百分比）、`blur`（0–40 CSS 像素）。各属性独立合并。选择预设仅清除该模式的已知全局调整。使用相同的 Client 回执、版本检查与存储拒绝语义。

```bash
printf '%s' '{"mode":"light","materials":{"header":{"color":"#e9ddf6","opacity":75,"blur":16},"body":{"opacity":80,"blur":12}}}' | deepseekbot appearance-set --client-id CLIENT_ID --expected-revision REVISION --patch-stdin --host http://127.0.0.1:PORT --token-file /private/host-token
```

功能 Panel（T3）：`deepseekbot appearance-targets --client-id CLIENT_ID` 从指定 Client 读取功能目标和本地快照，Host/认证参数同上。`dock:bh:channel-body` 表示 Messages 功能，不随当前频道改变。`appearance-get` 也返回 `targets`。

使用 `appearance-set` 补丁 `{"mode":"light","panel":{"id":"dock:bh:channel-body","materials":{"header":{"color":"#e0c1ed","opacity":42},"body":{"blur":8}}}}`。字段传 `null` 恢复跟随全局，例如 `{"mode":"light","panel":{"id":"dock:bh:channel-body","materials":{"header":{"color":null}}}}`。仅恢复该目标和模式：`{"mode":"light","panel":{"id":"dock:bh:channel-body","reset":true}}`。Panel 操作不能与全局属性混在一个补丁中。写入仍要求 `--patch-stdin` 和刚读取的 `--expected-revision`。

目标拒绝码：`appearance-target-unavailable`、`appearance-target-duplicate`、`appearance-target-invalid`，不会替换成另一个 Panel。关闭 Panel 保留覆盖，切换全局主题也保留。嵌套目标在后续切片接入。

嵌套外观复用 `appearance-targets` 和 `appearance-set`。已注册的 Memory 文件／演化、Browser／Computer 和独立贡献均使用稳定功能目标；`dock:memory-details` 由文件预览、提交详情和工作区变更共享，`dock:generated-files` 对应频道文件侧面板。未覆盖字段直接继承当前模式全局设置。隐藏面板保留外观；卸载贡献后拒绝写入，重新注册可恢复。恢复父面板不会清除子面板覆盖。

### 本机图片壁纸

先用 `appearance-clients` 明确选择在线 Web 或桌面 Client，再用 `wallpaper-get --client-id <id>` 读取 `wallpaper.revision`。壁纸修订号独立于外观修订号；写操作必须传入该 `--expected-revision`（初始为 `empty`）：

```bash
deepseekbot wallpaper-import --client-id <id> --expected-revision <revision> --file ./image.png
deepseekbot wallpaper-crop --client-id <id> --expected-revision <revision> --patch-stdin < crop.json
deepseekbot wallpaper-remove --client-id <id> --expected-revision <revision>
```

`crop.json` 只含 `{ "x": 0.5, "y": 0.5, "zoom": 1.5 }`：中心坐标范围 0–1，缩放 1–5。导入也可用 `--patch-stdin` 指定裁切。文件在 CLI 所在机器读取，须为非空、可解码且不超过 20 MiB 的图片，再按顺序分块传给指定 Client。原始字节只保存在该 Client，成功输出只有元数据和新修订号。离线或过期目标、修订冲突、无效媒体或裁切、上传过期及存储失败均返回明确错误码。请求送达后超时须先重读，不能自动重放导入。Web 与桌面各自保存，不以 Host 为键。

同一组壁纸命令也支持最大 100 MiB 的视频。提交前，指定 Client 必须实际播放解码并生成封面；不会转码原文件。`wallpaper-get` 返回临时观测的 `playback.state`（`playing`、`paused`、`poster`、`inactive`），降级时附带明确 `reason`。播放失败或之后的运行环境无法解码时使用已保存封面。图片上限仍为 20 MiB；兼容性按运行环境与编码分别验证，传输成功不等于可播放。

壁纸是最多 24 项的壁纸库。导入会加入媒体并立即显示。`wallpaper-get` 返回 `wallpaper.library`：每项的 `id`、`kind`、大小和裁切，选中的 `active` 项以及轮播设置；`wallpaper.current` 是当前显示的那一项。

```bash
deepseekbot wallpaper-select --client-id <id> --expected-revision <revision> --wallpaper-item <item-id|none>
deepseekbot wallpaper-remove --client-id <id> --expected-revision <revision> --wallpaper-item <item-id>
deepseekbot wallpaper-crop --client-id <id> --expected-revision <revision> --wallpaper-item <item-id> --patch-stdin < crop.json
echo '{"interval":900000,"shuffle":true}' | deepseekbot wallpaper-rotation --client-id <id> --expected-revision <revision> --patch-stdin
```

不带 `--wallpaper-item` 时，裁切和删除作用于当前显示的那一项。`none` 保留壁纸库但不显示壁纸。删除当前显示项会切到下一项。`interval` 取 `0`（关闭）、`60000`、`300000`、`900000`（默认）、`1800000` 或 `3600000` 毫秒；`shuffle` 随机顺序，且不会连续两次显示同一项。轮播按时钟计算，同一 Client 的所有窗口显示同一项，无需额外写入。全部恢复会清空壁纸库。

### 外观恢复

先读取 `appearance-get --client-id <id>` 与 `wallpaper-get --client-id <id>`，两者修订号独立。

```bash
deepseekbot appearance-clear-panels --client-id <id> --mode light --expected-revision <appearance-revision>
deepseekbot appearance-reset --client-id <id> --expected-revision <appearance-revision> --expected-wallpaper-revision <media-revision> --confirm-reset
```

清除只移除指定模式的全部功能面板覆盖，包含已保存但当前未注册的目标；主题、全局材质、主色、另一模式、媒体和布局不变。全部恢复必须带 `--confirm-reset`，重置两套配色、模式和覆盖，并移除共享媒体；不修改 DSH、Bot 身份或业务数据。偏好写入失败时不开始媒体清理。`appearance-reset-wallpaper-failed` 表示默认配色已保存、媒体清理失败；须重读两个 owner，再用新修订号重试。不宣称 localStorage 与 IndexedDB 是同一事务，不自动重放已送达但超时的操作。

### 三个审批动作（#2080）

`tool-approval-decide ... --outcome allowed-always-tool` 对应网页的“始终允许”：批准本次并记住此 Bot、角色及当前授权范围中的当前工具。参数变化仍可匹配；其他工具和变化后的范围不能匹配。`tool-approval-rules` 返回 `tool` 类型；`tool-approval-rule-revoke --confirm` 撤销后恢复询问。旧 exact／broad／Secret 规则不改义。权限与策略变更、浏览器与电脑授权，以及 Tob 安装更新、重启和删除 Bot 均可用相同命令保存“始终允许”。这些操作使用独立范围，旧普通规则不会自动扩大权限；撤销规则或切换设备目标后恢复询问。Secret CLI 仍只记住程序、账号及环境变量名；MCP 服务记忆保留独立检查。

Full Access 保留原生 `ask`，使识别出的权限变更可以到达 Human；明确范围内的普通请求自动回答，不再逐次弹卡。不会扩大选定 mode／scope 或已有 Assignment 权限。原生 `never` 仍表示直接拒绝，没有绕过它。目录授权仍使用 `grant-request-approve --confirm`。

Connect 使用 Noise XK 加密通道。`deepseekbot connect-status` 的 `connect.encryption` 字段包含 `protocol`、`required`、`state`、`publicKey` 和 Host 指纹；`state` 为 `negotiating`、`encrypted` 或 `disconnected`，仅开启 tunnel 不代表已有加密会话。`devices` 同时返回待批准的 `pendingKeys`。核对新设备显示的完整指纹与设备页后，使用 `deepseekbot device-approve-key <receipt> <public-key> --confirm` 批准准确的公钥；缺少确认或公钥无效会拒绝。配对链接、设备私钥和 bearer 不出现在这些状态输出中。

手机原生私密表单和浏览器远程聊天通过同一个加密通道调用既有凭据 owner。旧 Connect 配对必须重新核对指纹；失败不会重试明文。手机完整 Host WebView 仍已移除，Connect 的 Browser/Computer 查看器暂不可用。加密 CLI 状态不替代原生验收或实际 Cloudflare 链路验证。

## 从电脑建立 SSH 隧道

在使用浏览器的电脑上运行 `ssh-tunnel`。Linux Host 必须已运行；先用普通终端验证 SSH alias 的主机密钥和密钥／agent 登录。此命令使用批处理认证，遇到密码提示或未知、变化的 SSH 主机密钥会拒绝，不会安装或启动远端 Host。电脑上需运行支持“添加远程”的新版 Host 浏览器客户端；旧客户端会拒绝版本 2 的隧道链接。

1. 在远端 Linux Host，用已有 Owner 认证的 CLI 执行 `device-offer --out /absolute/private/offer.txt`，保存返回的 receipt。安全传输该文件到电脑；不要把配对链接放入命令参数或日志。
2. 在电脑运行下面的前台命令并保持运行。local port 选择空闲且固定的端口，remote port 填远端 Host 已有的回环端口：

   ```text
   deepseekbot ssh-tunnel my-linux --remote-port 39105 --local-port 32451 --pairing-file /absolute/private/offer.txt --out /absolute/private/browser-offer.txt
   ```

   Windows 使用带盘符的绝对路径。可选 `--ssh-config <absolute-file>` 指定已有配置，默认使用系统 OpenSSH 配置。输入必须是私有普通文件（Linux/macOS 权限为 0600）；输出只新建，不覆盖。启动失败可能留下空输出文件，重试时选择新的输出路径。

3. Noise 握手校验 Host 密钥成功后，stdout 输出单个就绪 JSON。在本机 Host 浏览器的“添加远程”中粘贴私有输出文件里的链接。通过可信远端终端核对 Host 指纹，并在远端执行 `device-approve-key <receipt> <public-key> --confirm`，批准这个浏览器的准确设备密钥。隧道命令不会自动配对或批准。
4. 打开远端会话并使用已有 Host 操作。Ctrl+C 只停止隧道，远端 Host 和浏览器配对仍保留。用相同 local port、新的输出文件重启命令即可重连。过期输入链接仍可标识已配对 Host，但不会恢复过期 offer；新浏览器需新建 offer。

隧道只监听 `127.0.0.1`。SSH 配对后的回环请求与流继续使用加密设备通道，端口被替换时不会明文发送设备凭据。吊销使用远端已有的 `device-revoke <device-id> --confirm`；关闭隧道不等于吊销。建立 SSH 配对后不要降级浏览器客户端。

stderr 提供结构化生命周期诊断，区分 `ssh-missing`、`ssh-host-key-refused`、`ssh-authentication-refused`、`ssh-local-port-unavailable`、`ssh-host-unready` 与 `ssh-host-identity-mismatch`。错误不会触发远端安装或明文重试，也不会打印原始 SSH 输出或配对链接。所有权与验证边界见 [ADR-0246](adr/0246-ssh-tunnels-preserve-paired-host-authority.md)。
`ssh-tunnel` 的本地端口只提供加密 Device Gateway，直接在浏览器打开会返回 403。请在本地 Host 浏览器中使用“添加远端”。载体会丢弃浏览器自动附带的本地登录 Cookie，不会将它发送给远端 Host。

### 固定 Git 来源并恢复导入

确认新导入前，先在目标 Host 检查所选来源。返回值包含规范化的 Git URL 和当前 HEAD 提交。把 URL、提交、名称、简介、标签及操作 key 一起保留；提交和恢复时不会自动改用更新的提交。

```bash
deepseekbot bot-import-preview --host <host> --from-git owner/repository
deepseekbot create-status --host <host> --name Helper --from-git <已检查的URL> --expected-commit <提交> --operation-key import-helper-001
deepseekbot create --host <host> --name Helper --from-git <已检查的URL> --expected-commit <提交> --operation-key import-helper-001
```

查询只读，可携带与创建一致的可选 `--description` 和重复 `--role` 参数。响应丢失或 Host 重启后仍指向同一个 Bot、受管 Memory 和私聊。若克隆后的 HEAD 与检查的提交不同，`git-source-changed` 会在发布 Bot 前拒绝；已保留的 key 仍绑定原输入。重新查看来源后，才可明确开始另一项导入。同 key 换来源或元数据返回 `creation-key-conflict`；原身份已归档或删除时返回 `creation-identity-unavailable`。不会自动调用模型或复制凭据。

### Mac 本机电脑视频（#2653）

macOS 继续使用现有 `computer-start --target local`、`computer-video status`、观看／信令、接管、输入与恢复命令及同一个 Computer owner，不增加 CLI 身份或传输。明确启动时安装固定 Mac 采集运行时，观看不下载。`screen-recording-required` 要求授予 macOS 屏幕录制权限并重启。命令边界的点击仍使用视频像素，由 owner 校验 Retina 尺寸，再由固定版本驱动转换为逻辑点。视频不可用时仍可明确恢复 Bot；iPhone 实际交互需另做原生验证。

当 `status` 返回 `continuousScroll:true` 时，iOS 与 `computer-video input --args-stdin` 可沿用相同 binding、grant 和递增 sequence，发送 `input:{"kind":"scroll-motion","x":100,"y":100,"vx":0,"vy":-200}`。坐标仍是完整画面的像素，速度为每秒逻辑像素，每轴限制为 ±200。按住期间持续刷新（iOS 为 80ms），松手发送两轴速度为零。Mac 在 250ms 未刷新或控制失效时停止；每帧重新检查权限，丢弃过期帧且不积压未确认帧。该路径使用系统原生桥接并要求 Host 已有辅助功能授权，不自动请求权限。旧 Host 和 Android 保留逐格滚动。

### 原生 Subagent preset 与直接调用

只有 Assignment 会话带有 `bot_subagent`、`bot_subagent_fork` 和 `list_bot_subagent_models`。Orchestrator 用 `create_assignment` 委派；它调用原生或 Bot Subagent 工具时会被拒绝，并提示改用 `create_assignment`（ADR-0265）。`bot_subagent` 依次选择允许的显式 `agent_preset`、配置的 `subagent.agentPreset`、当前 DSH 系统默认 preset。`subagent.allowedAgentPresets` 允许显式选择；省略时不允许显式选择。这些原生 preset 控制工具和人格，与允许的 LLM 路由独立。`bot_subagent_fork` 继承父 preset，并拒绝 `agent_preset`。

`bot-tool` 支持 `bot_subagent`、`bot_subagent_fork` 和 `list_bot_subagent_models`，需用 `--session <assignment-session-id>` 指定该 Bot 的一个 Assignment 会话（`assignments` 可列出）。该 Assignment Agent 必须存活，包括汇报后处于 idle 的 Agent。调用经过其原生工具执行链，不会创建或恢复父 Agent。`parent-unavailable` 表示该会话不存在、不是这个 Bot 的 Assignment，或没有存活 Agent，应先继续该 Assignment。其他 Bot 工具不接受 `--session`。原生策略拒绝仍返回错误。通过 `bot-trace --session direct` 查看直接调用结果，通过子 Session 查看实际执行历史。

后台子任务的原生回报可以唤醒该存活的 Assignment。BotRuntime 在恢复请求前准备新的工具上下文和当前模型，不借用上一条私聊的来源或目标。如需投递结果，应在委派任务中明确回复来源或发送目标。前台 CLI 调用不会遮蔽另一个用户回合的停止与追加指令。参见 ADR-0252。

```sh
printf '%s' '{"description":"Review","prompt":"Review the supplied task","run_in_background":false}' | deepseekbot bot-tool <slug> bot_subagent --session <assignment-session-id> --args-stdin
printf '%s' '{}' | deepseekbot bot-tool <slug> list_bot_subagent_models --session <assignment-session-id> --args-stdin
```

`computer-open-permission-settings` 在本机 Computer 所在的 macOS Host 上打开指定隐私设置页，不会自动授权。用户在系统设置里开启权限，必要时重启运行 DSH 的应用，再重新检查。`computer-status` 返回稳定的安装失败原因与各项缺失的 macOS 权限；技术细节保留在诊断信息中。

## 完整环境备份与恢复

`profile-backup-*` 命令与 Settings 使用同一个 Profile Backup owner。在线命令沿用 `--host` / `DEEPSEEKBOT_HOST` 和私有 token 文件或环境凭证，每次在 stdout 输出一份 JSON；不导出凭证存储，但聊天和 Memory 中仍可能含有秘密。

```bash
tobs profile-backup-preview --host http://127.0.0.1:31967 > preview.json
tobs profile-backup-export --host http://127.0.0.1:31967 --confirmation-stdin --out environment.botharness-backup < preview.json
tobs profile-backup-inspect --host http://127.0.0.1:31967 --file environment.botharness-backup
tobs profile-backup-restore --file environment.botharness-backup --new-home new-environment --confirm
```

导出消费当前预览 token，不覆盖已有文件。恢复在**本机离线执行**，目标目录必须尚不存在，完成后环境保持停止状态。恢复时不传 `--host` 或 `--token-file`。用兼容的可信 Tobs 安装启动目标环境后，通过 `profile-backup-recovery` 查看准备度。恢复的 Bot 保持冷状态；`profile-backup-authorize <bot> --confirm` 授权所选目标模型，`profile-backup-activate <bot> --confirm --acknowledge-risk` 明确接受源环境可能重复运行的风险。这些操作不会恢复外部账号授权。

继续支持历史 v1 备份。新 v2 备份分别记录 Host 与实际解析的 DSH tools 版本，`null` 表示无法确定来源信息。兼容性由数据契约和 schema 迁移决定，不要求 DSH 精确版本相同。旧 reader 遇到不支持的新格式需要升级。`format-upgrade-required`、`upgrade-required` 和 `dependency-incompatible` 表示无法解释所需数据；`core-contract-invalid` 表示需要具备有效核心声明的完整备份；`package-invalid` 表示文件验证失败；`source-unavailable` 表示需先修复源数据库再导出。预览过期、完整性、取消和目标目录检查继续生效。

### 诊断日志

Tobs 会一直在本地记录诊断日志，保存在 `$DSH_HOME/botharness/logs.db`（30 天，最多 5 万条）：Client 的操作与导航轨迹、未捕获错误和控制台警告、UI 不变量被破坏、长帧和慢的 Host 调用，以及 Host 警告和 BotHarness 生命周期日志。不会记录输入的文字、消息正文或文件内容，也不会离开这台设备。Workspace Control Rail 上的 **诊断日志** 按钮可查看最近 24 小时，并导出与 CLI 相同的 ZIP。

```bash
deepseekbot diagnostic-logs [--kind all|error|perf|action] [--since <ms>] [--limit 1-1000]
deepseekbot diagnostic-logs-export --out logs.zip [--hours 1-168] [--offline] [--home <DSH_HOME>]
printf '%s' '{"version":1,"session":"agent-qa-0001","entries":[{"ts":1780000000000,"category":"action","level":"info","code":"click","fields":{"label":"Send"}}]}' | deepseekbot diagnostic-log-record
```

`diagnostic-logs` 按时间倒序返回条目（`source`、`category`、`level`、`code`、`session`、`fields`）。导出的 ZIP 包含 `manifest.json`（时间范围、版本、计数、脱敏次数）、`logs.jsonl` 和易读的 `timeline.txt`；用户目录路径、token、密钥和邮箱会被替换，文件只会新建不会覆盖。当 Host 无法连接、无法登录或插件没有加载时，`diagnostic-logs-export` 会直接读取 `$DSH_HOME/botharness/logs.db`，生成同样已脱敏的 ZIP；`--offline` 跳过 Host，`--home` 指定其他 DSH 目录，结果会带上 `source: "offline"` 和 `fallback` 原因。除 Client 条目外，日志还为每个 Bot 回合记录一条 `bot-turn`（模型、首字耗时和总耗时、步数、工具调用和错误、结果，不含消息内容），为每条 IM 入站事件记录一条 `messaging-inbound`（`handled`、带原因的 `skipped` 或 `refused`），并把 Host 的结构化 `{"event","phase"}` 日志（如 `messaging-outbox`）存成带字段的条目。`diagnostic-log-record` 以 Web Client 相同的方式写入条目，用于 agent QA；拒绝码为 `invalid-report`、`report-too-large`、`rate-limited`（每分钟 600 条）和 `persistence-unavailable`。

### 消息反馈（#2811）

单条消息反馈独立于匿名遥测。Host 生成冻结并脱敏的材料，默认选择锚点前后各 20 条消息，
各侧可设为 0–100。`conversation`、`sessions`、`inbox`、`deliveries`、`relatedChats` 默认开启，
`wholeSessions` 默认关闭。提交前检查 `files`、类别选择与 `summary.omissions`。
即使关闭 `conversation`，执行记录仍可能包含重复的聊天文本。

```bash
printf '%s' '{"channelId":"<channel>","messageId":"<message>","before":20,"after":20}' | deepseekbot feedback-preview
printf '%s' '{"token":"<preview-token>"}' | deepseekbot feedback-download --out evidence.zip
printf '%s' '{"token":"<preview-token>","feedback":{"rating":"bad","tags":["no-response"],"comment":"合成测试"}}' | deepseekbot feedback-submit --confirm
```

命令沿用在线 Host 鉴权，stdout 只输出一个 JSON。下载不覆盖已有文件。提交必须带 `--confirm`，
评分为 `good` 或 `bad`，固定标签可选，评价最多 500 个 Unicode 字符。内容通过 stdin 或文件输入，
不要放在命令参数中。预览令牌属于当前 Host 连接，30 分钟后失效，最多保留最近四份。
`preview-stale` 需要重新预览。提交失败后材料与评分被冻结，重试原请求沿用同一反馈编号；
修改内容时请主动刷新预览。成功返回 `reportId`。仅评分、标签、短评、编号与版本发送到 PostHog，诊断包仍是本地下载。

提交沿用现有 PostHog 接入地址，无需额外配置，不部署专用接收服务或私有诊断存储。见[反馈与本地诊断](message-feedback.md)。

### Failed-turn feedback

`feedback-preview` accepts `failureTurn: true` alongside the canonical failed message's `channelId` and `messageId` in stdin JSON. Its frozen preview includes `uploadEvidence`: only the matching turn input and tool call/result events, redacted and capped at 128 KiB. Ambiguous/missing turn identity and oversized evidence refuse instead of uploading a whole Session. `feedback-submit --confirm` uploads that frozen turn with rating/tags/comment to the existing feedback endpoint. The diagnostic ZIP stays a separate download. Ordinary feedback keeps its existing metadata-only POST.

### 直接调用凭据工具与来源恢复

Bot 已有存活的 Orchestrator Agent 后，`bot-tools` 也会列出其注册的 `ask_secret`、`protected_cli`、`secret_http`、`secret_cli` 和 `secret_mcp_connect`。用 `bot-tool <bot-id> <tool> --args-stdin` 调用，参数 JSON 从 stdin 传入；不要把原值或引用放进命令行参数。执行复用已有 Agent 的原生工具与审批链，不调用模型、不创建新的来源；没有存活的工具注册时拒绝。命令可等待执行审批，由通常的审批命令或 Web 卡片处理。直接调用与原生诊断轨迹都省略私密工具参数和结果。

同轮存在多条 IM 请求时，先用原账号和字段声明调用 `ask_secret`，并传入正在处理的那条已接受请求的精确 `source_event_id`，再消费引用。已配置账号会复用原值，不新建卡片，也不要求 Web 通知地址。Web 与 Schedule 复用不传来源选择器。`private-source-required` 给出这条恢复路径；`private-source-invalid`、`private-source-unavailable`、`private-source-ambiguous`、`private-source-revoked`、`private-account-unavailable` 分别区分其他拒绝原因。不要重复原样调用、选择历史来源，或把 Host 拒绝当成远端故障。同账号来源冲突需要新一轮；撤销检查始终保留。
