# Create Bots from the command line

Installing `@botharness/tobs` provides the `tobs` command; the compatibility package `deepseekbot` provides `deepseekbot`. This guide retains `deepseekbot` examples: with the new package, substitute `tobs` and keep the same arguments.
See the [installation guide](https://tobs.app/en/docs/installation/) for the current install command.

Bot summaries from `list` also include `lastActivityAt` (epoch milliseconds) when committed Bot messages visible to the local Human or an Assignment report record activity. It survives later Channel messages and restart; missing means no recorded activity, not a creation or Channel-visit timestamp.

`deepseekbot create` makes a new PersonaBot without clicking: blank, from a bot bundle (a directory or a zip with the same shape as the [bot-zip export](docs/bot-zip.md)), or from GitHub. It is built for external coding agents driving a DSH install, so its output is machine-first.

## Usage

### Recoverable Zip transfer and import

Use the same authenticated Host as the phone. `bot-zip-upload --from-zip <file> --upload-key <stable-key> --host <url>` returns `sha256`, `sizeBytes`, `offset`, `chunkBytes` and `expiresAt`. It uses `zipUploadBegin` and `zipUploadChunk`, resuming acknowledged chunks with the same key and exact file. Raw chunks are 256 KiB so their base64 envelopes fit the encrypted device transport's 4 MiB request limit.

Before creating a Bot, run `bot-zip-preview --upload-key <key> --archive-sha256 <sha256> --archive-size <bytes> --host <url>`. It validates the full archive through `zipUploadPreview` and returns its descriptor, file count, expanded bytes and history flag. Confirm the name, optional `--description` and repeated `--role` values, then run `bot-zip-import` with those source flags plus `--operation-key <stable-operation-key> --name <name>`. This uses `zipImport` and the existing import owner, creating one Bot and its DM without model execution or grants.

If the import response is lost, use `bot-zip-import-status --archive-sha256 <sha256> --operation-key <key> --name <name>` with exactly the same optional metadata. `zipImportLookup` needs no file or upload session. A completed receipt survives Host restart and upload expiry; repeating `bot-zip-import` returns that same Bot and DM. A different digest or metadata with the same operation key is refused. An incomplete expired upload may be transferred again explicitly; keep the original import key.

Staging is outside canonical Bot storage. Limits match desktop archives: 100 MiB compressed and expanded, and 20,000 entries. The Host reserves at most eight concurrent uploads and 400 MiB total, allowing several large transfers while bounding disk use; sessions expire after 24 hours and are reclaimed when a transfer begins. An upload key binds its digest and size while staged. Identical chunk retries are accepted; changed chunks, unexpected offsets and a mismatched final digest are refused. There is no background-transfer guarantee. Credentials use the existing private token file or environment input and never appear in output. These commands do not expand Tob's CLI authority.

`deepseekbot browser-notification-clients` lists online Client targets. `deepseekbot browser-notifications --client-id <id> --remote-host-id <id>` reads that browser's local choice and revision. To write, add `--expected-revision <revision> --patch-stdin` and pipe `{"enabled":true,"preferences":{"approval":true,"question":true,"private-input":true,"reply":false}}`. These commands use the serving Host's usual online authentication and existing Client control relay; the Host persists no browser choice or Remote Host credential. Writes refuse stale revisions and unknown Hosts. Enabling requires permission already granted in the browser (`notification-permission-required` otherwise); CLI never opens the OS permission prompt. Closing the page ends both its control target and alerts. Enabling a previously inactive kind first refreshes the shared Inbox through every notification page, keeping the old choice until that complete baseline is ready. The successful write is the enable boundary: earlier items stay silent and later group/DM replies can alert. A failed page returns `notification-baseline-unavailable`; a ten-second UI baseline deadline returns `notification-baseline-timeout`. CLI writes also carry the existing appearance relay deadline (currently eight seconds) and its cancellation signal to the same owner. The owner checks both immediately before persistence; a relay timeout or unmount cannot be followed by a late write, and an expired notification command sends no late acknowledgement. Switching Host, closing settings, removing the pairing, losing permission or releasing the page cancels pending activation (`notification-activation-cancelled`); it cannot persist later. Retry explicitly after a refusal. Normal shared Host Feed observation continues while the page remains subscribed.

`deepseekbot phone-notifications --metro-port <port> --target-id <exact-id> --device-name <exact-name>` reads the existing phone preference owner in an assigned Expo development client. Add `--preferences-stdin` with exactly the four boolean kinds to persist through that same owner and copy to every paired Host. It requires the shared-device batch/lease, a running loopback Metro inspector, an exact unique target, the development app ID, `__DEV__`, and the uniquely initialized owner. It never writes storage directly, creates another owner, enables OS permission, or treats Host copies as the phone choice. One JSON result distinguishes `saved` from `syncStatus` (`complete`/`pending`), `syncing`, and `failedHostIds`. A disconnected/timed-out write has an unknown outcome: read again before repeating it. Missing/ambiguous targets, release clients, unready owners and transport failures return coded errors; write outcomes are distinguished below. **This development-only AX path is unavailable in release clients; it is not release CLI parity or completed native QA.** Native real runs remain in the external combined acceptance batch.

The phone command explicitly settles JavaScript Promises through the inspector; it does not rely on Hermes honoring CDP `awaitPromise`. A single 20-second deadline covers starting the operation, polling and consuming its result after connection. Each request has a unique temporary result slot, removed when consumed or cancelled, with a 20-second runtime expiry if the debugger disconnects. Late completion cannot recreate a removed slot. Runtime expiry needs the app's JavaScript event loop to run; a suspended app clears it when timers resume. Only a validated phone-owner result is success; Promise internals or malformed replies return `inspector-result-required`. The transport cannot undo an owner write already started, so a timeout remains an unknown write outcome, not proof that nothing changed. Read back before retrying. The command itself distinguishes these outcomes: if a write may have been dispatched but its result is unavailable, it keeps the underlying error code and explicitly reports an unknown write outcome with instructions to read without `--preferences-stdin`. Read failures and definite pre-write refusals do not use that warning.

`deepseekbot inbox --notifications [--limit 1..100] [--cursor <cursor>]` uses the Host's existing `humanAttention` query with notification discovery enabled. Follow every returned cursor to obtain Host-decided actions, unread group mentions/replies and ordinary unread DM replies. This is independent of Activity's mentions-first page; filters cannot be combined with this mode. `notificationVersion: 1` is required, with a coded refusal on older Hosts. It opens no additional feed connection and does not change attention or unread state.

`deepseekbot device-notifications --device-file <private-pairing.json>` reads the admitted device's send-preference copy from a live Host. Add `--preferences-stdin` and pipe `{"approval":true,"question":true,"private-input":true,"reply":false}` to replace its four kinds, even before a push token is registered. The private file has the saved pairing shape (`hostId`, `hostName`, `routes`, `deviceId`, `credential`); never put its credential in arguments or publish the file. Output is one JSON document without credentials; revoked pairings return `device-revoked`. This edits that Host's delivery copy only; the phone's persisted preference is authoritative and overwrites it on the next sync. Browser notification choices remain local to that browser and do not change Host attention.

`deepseekbot device-activity capability --device-file <private-pairing.json>` checks this Computer's configured Lock Screen service. `prepare`, `register` and `stop` use `--activity-stdin`: prepare receives `channelId`, `messageId`, `bundleIdentifier`; register also receives the actual iOS `clientActivityId`, per-activity `token` and `locale` (`en`/`zh`); stop receives only `clientActivityId`. `status` also receives only `clientActivityId` and reads that device's own registration, even after it ended: it returns the request's `channelId`, `messageId`, `progress` and, when the request created or advanced an Assignment, its `assignmentId` (the Assignment Session id the phone opens at `bot/[slug]/assignment/[id]`); `prepare` and `register` carry the same `assignmentId` when it is already known. Device identity always comes from the saved pairing, never stdin. A token is secret: pipe it privately, never put it in arguments or publish it. The CLI invokes the same authenticated/encrypted Device routes as the phone and prints only a JSON result or coded refusal. `activity-provider-unconfigured`, `activity-app-unsupported`, `activity-ended` and `device-revoked` refuse unavailable or stale operations. `activity-cleanup-pending` reports a temporary stop failure; only cleanup is retried until acknowledgement or registration expiry. Stopping display never stops the underlying request. `send-status <bot> --message-id <id>` now includes `progress` with explicit Inbox resolution; a handled turn is not completion. It also includes `assignmentId` when the request created or advanced an Assignment (the latest one wins). CLI tests cover these contracts; the live Host and real iPhone remote-delivery run remain separate QA gates. See [ADR-0255](adr/0255-live-activities-project-one-admitted-dm-request.md).

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

Exactly one source per create. `--name` is required for blank and GitHub bots; for bundle imports it overrides the name from `.botharness/bot.json` (or the file name). A `--from-git` value accepts a full Git URL (`https://`, `ssh://`, `git@host:path`) or an `owner/repo` shorthand for `https://github.com/owner/repo.git`, which also covers Bot Marketplace entries through their clone URL. A `--from-dir` bundle skips `.git` as files but packs it as history when present.

`--memory-location <absolute-dir>` keeps a blank bot's Memory outside the DSH data folder (for example on another drive): the Bot's Memory repository is created in a new `<dir>/<bot-id>` folder, and `dataDir` reports that path. The path must be an existing absolute folder and the per-Bot folder must not exist yet (`invalid-memory-dir`); imports keep the default location. The create dialog offers the same choice under **Advanced settings → Memory location**.

For a blank bot, `--core-memory <text>` or `--core-memory-stdin` writes the root `MEMORY.md` (Core Memory) instead of the usual template, and `--avatar-file <image>` sets the Avatar from a PNG, JPEG or WebP file of at most 128 KiB (`invalid-avatar` otherwise, `file-unreadable` when the file can't be read). Only one of `--persona-stdin` and `--core-memory-stdin` can read stdin. A Bot can create the same blank Bot from chat with the `bot_create` Bot tool; see [Harness Bot tools without the model](#harness-bot-tools-without-the-model).

`--home` points at the target `DSH_HOME`; a fresh directory works with zero clicks. Without it, `DSH_HOME` from the environment is used. Stop the Host before offline database commands: the profile writer lease is exclusive (`lease-unavailable`). Secret file commands can run online; live commands below use authenticated Host RPC.

## Live Host commands

### Remote Host settings

The browser's Remote Host icon menu → **Host settings** uses the same Host owners as these online commands. Select the source Host with `--host <origin>` and its private `--token-file <file>` (or the existing environment variables); never point a remote-setting command at the serving Host by default. `model-catalog`, `home-model-set`, `model-presets`, `model-preset-create` and `model-preset-update` cover models; `overview-usage` and `overview-memory` cover usage and Memory activity; `storage-usage` and both storage cleanup preview/confirm pairs cover storage. Destructive confirmations still require `--confirmation-stdin --confirm`, using the preview from that same Host. An unavailable or refusing Host never falls back to a local profile. These commands do not read browser pairing secrets or change device-local Host looks. Appearance and Notifications are separate sections in the same dialog and remain available while the Remote Host is offline.

`appearance-clients` lists the open browser Clients. `host-look --client-id <id> --host-id <id>` reads that browser's name, icon, colour and content revision. Add `--patch-stdin --expected-revision <revision>` to write a JSON patch such as `{"name":"Studio","icon":{"kind":"symbol","id":"server"},"color":"teal"}`. An empty name restores the Host's original display name; `color: null` clears the colour. Names are trimmed and limited to 40 characters, matching the phone's shared HostLook rules. Use a paired Remote Host ID or the serving Host's ID; no remote credential is accepted or returned.

This command uses the existing authenticated `appearance-control` relay to reach the same Client-local `HostLooks` owner as the UI. It does not rename the operating-system hostname or sync choices to another device. The browser must be open; select it explicitly. All cooperating same-origin tabs use the exclusive Web Lock `botharness.hostLooks.v1`. Inside that lock the owner rereads storage, compares the selected Host's content revision and merges only that Host; UI edits transform the current field values inside the same lock. A stale revision returns `host-look-revision-stale`. Browsers without usable Web Locks return `host-look-lock-unavailable`; there is no unsafe read/modify/write fallback.

`host-look-storage-read-failed` keeps the last known display state and blocks reads and writes instead of reporting defaults as loaded. Repair browser storage access, then use `host-look --client-id <id> --host-id <id> --refresh` (or Refresh appearance in settings) to recover explicitly. Refresh never writes. A read failure inside a write transaction also prevents persistence. `host-look-storage-failed` means the browser rejected the write; it does not publish an unsaved look. After resolving the storage problem, refresh before sending a new write.

The CLI sets an absolute expiry before stdin and connection setup. The Host caps it at eight seconds from relay admission. The Client rechecks wall time after hydration, after acquiring the lock and immediately before `localStorage.setItem`; an overdue command cannot begin a write even if a timeout callback has not run. Client release and Host removal are also rechecked before writing. This is not a remote cancellation acknowledgement: killing the CLI or disconnecting HTTP before expiry can leave a delivered command running until that deadline. A lost write reply or relay timeout returns `host-look-outcome-unknown` where the CLI can still report it; read the same Client/Host before retrying. A write completed before expiry may have succeeded even when its reply was lost. `browser-notifications` continues to own the Notifications section, including permission, activation baseline and cancellation.

Set `DEEPSEEKBOT_HOST` to the running Host's loopback origin, or a tailnet HTTPS origin. A tailnet origin (for example `tailscale serve` in front of a loopback Host) works only when the Host was started with `--trusted-host <machine>.<tailnet>.ts.net`; otherwise login succeeds but DSH's `/api` Host fence refuses every request and the CLI returns `host-untrusted`. Supply its current launch token through `DEEPSEEKBOT_HOST_TOKEN` or `--token-file <private-file>`, never a token argument. `--host <origin>` overrides the environment. Login happens per invocation, cookies remain in memory, and restarting the Host requires its new token. Live commands never open the profile database. See [ADR-0159](adr/0159-live-cli-verbs-ride-the-dsh-http-carrier.md).

### Online creation and headless debugging

With that Host selection, `create`, `list`, `show`, `model-presets`, `model-preset-create`, `model-preset-apply`, `model-plan` and `channels` call the existing Host owners. Blank, GitHub/Git, Zip and directory creation use the same source/metadata flags above. Zip/directory inputs are packed/read on the caller and uploaded to the existing Bot Zip import endpoint; Git cloning uses the Host's Git environment and credentials. Do not combine explicit `--home` and an online target. Failed Host calls never fall back to local data; database commands without an online adapter refuse a selected Host instead of silently opening an offline owner. Secret file commands and search remain independent. The `schedule*` commands use the Host too; see [Schedules on a live Host](#schedules-on-a-live-host).

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

Creation returns `bot`, `dm`, the Host's Memory `dataDir`, completed/deferred `steps` and `next`. The model preset is applied through its owner, never forwarded as a native Agent preset. A missing specified preset is rejected before creation; other model failures after creation preserve the Bot and return its known identity and steps with `outcome: created`. A lost creation/import response without a stable operation key can return `outcome: unknown`: inspect the Host before creating again; no automatic mutation retry is provided. For blank online creation, use the [receipt-backed operation key](#tob-bot-creation-profiles-and-lifecycle) to reconcile the same identity. A created Bot alone does not prove model usability: use `send` and its exact correlated committed reply.

`bot-attention` supports `--cursor` and the Host's pending/processing/observed/deferred/needs-repair/handled states; it limits pages to 1–100. Session summaries are newest-first and limited to 1–100 (default 50), with `total`; each carries `modelRoute`, the route the Session last called a model on, or the route it is configured to use before it has run; activity limits its session details and reports `sessionCount`. These are bounded summaries, not full tool-call logs or streaming drafts.

`bot-new-session <bot-id>` retires an idle Bot’s Orchestrator Session through the same Host runtime as IM `/new`; the next message starts a fresh Session. It returns `{"started":true}` and refuses with `bot-busy` while the Bot is working; stop the current turn first.

`bot-compact <bot-id>` compacts an idle Bot’s Orchestrator Session through DSH `/compact`, loading the original Session after Host restart without sending a message. It returns `{"outcome":"compacted","tokensBefore":…,"tokensAfter":…}` or `nothing` when no useful smaller summary can be made; either outcome applies a pending Prompt Preset change. A running or queued turn returns `bot-busy`; an unavailable original Session is a coded refusal.

`bot-context <bot-id>` returns the current `sessionId`, estimated `usedTokens` (null if unloaded), `contextWindow`, `capacitySource` (`model` or `estimate`) and `thresholdTokens`. Missing model capacity uses a 200,000-token estimate with output reservation and safety headroom; it is not a verified provider limit. The Web composer shows these current context values; its usage popover still shows cumulative usage.

`bot-system-prompt <bot-id>` returns the system prompt the Bot's Orchestrator Session uses now (`effectiveText`: the latest system message on the live Session surface, since DSH appends a changed prompt to the history instead of rewriting the first one; or from the Session log with `loaded: false` when it is not loaded), the freshly assembled `next` prompt with its named `sections` and per-step runtime `contexts`, and `pending`: true when a Prompt Preset or persona change waits for a new Session or the next compaction. Once applied, the Session's next request appends the new text. `next` is null while the Session is not loaded.

`bot-turn-input <bot-id> [--turns <1-20>] [--session <session-id>]` returns, for the newest turns (default 1), every input message the model received, in order, with its `step`, `source` (`user` for Inbox and steered input, `runtime-context` for the per-step environment note), time and exact `text`, including the reply reminder the Host appends. Steered messages appear at a later step of the same turn. The Web composer's usage popover opens both views.

Prompt Presets let you edit the behavior text of the system prompt and the per-turn templates; the tool and delivery contracts around them stay fixed. `prompt-parts` lists each editable part with its `id`, `kind` (`system` or `turn`), owning `section` and built-in `defaultText`. A preset stores only the parts it changes. Each part resolves per Bot from the Bot's own overrides, then its chosen preset, then the global preset (`prompt-global-set`), then the built-in text; `bot-prompt` shows the result with each part's `source` (`bot`, `preset`, `global` or `built-in`). Part edits are a JSON object of `{"<part-id>": "text"}`; `null` or the built-in text removes the edit so the part inherits again. `bot-prompt-set --preset global` drops the Bot's preset. Deleting a preset returns `clearedBots`, whose Bots fall back to the global one. A running Session keeps the texts it started with: `pending: true` means a change waits for the Bot's next Session or compaction. To apply it now, run `bot-compact <bot-id>` or `bot-new-session <bot-id>`, the same actions as the apply buttons next to Pending in the UI. An edited part reports `defaultChanged: true` when the built-in text changed after the edit; parts you did not edit follow built-in updates.

A preset and a Bot can also set numeric limits with repeatable `--prompt-limit <id>=<integer>` (`<id>=default` removes the setting so it inherits again) on `prompt-preset-create`, `prompt-preset-update` and `bot-prompt-set`. `prompt-parts` lists each limit's `defaultValue`, `min` and `max`: `group-context-chars`, `dm-context-chars` and `context-message-chars` bound how much pending Group and DM context the Bot Inbox adds to a turn; `review-timeout-seconds`, `review-human-messages`, `review-human-message-chars` and `review-tool-calls` bound the Approval Reviewer. Limits resolve through the same layers as parts, are reported under `limits` by `bot-prompt`, and apply from the next Inbox delivery or review without waiting for a new Session.

For explicit cleanup, `bot-delete-preview <bot-id>` returns the owner's current scope and `preview.token`. Review it, then pipe `{"token":"<preview.token>"}` to `bot-delete-confirm <bot-id> --confirmation-stdin --confirm`. Memory is retained unless `--erase-memory` explicitly selects the owner-reviewed directory, and it erases the Bot's private-input secrets during the stop phase. Inspect `deletion.phase`; an incomplete cleanup can be continued with `bot-delete-retry <bot-id> --confirm`. Scope changes remain owner refusals; deletion is not content purge or complete data erasure.

From a built checkout, `node scripts/cli-smoke.mjs --preset <id> [--zip ./shared.zip] [--git owner/repo] [--cleanup]` drives the business CLI against the selected Host, checks a real reply for each source and returns owned IDs. Without an existing preset, provide `--provider <id> --model <id>`. Successful `--cleanup` deletes only that run's Bot identities through preview/confirmation, retaining Memory and any created preset; failed runs retain their resources for diagnosis. Use a disposable isolated Profile. The script does not authorize external messaging or verify UI rendering. See [ADR-0162](adr/0162-online-cli-management-keeps-explicit-host-authority.md).

```bash
deepseekbot send <bot-id> --body "Reply with QA_OK" --timeout 60
deepseekbot send <bot-id> --body-stdin --message-id human-<UUID>
deepseekbot send <bot-id> --body "Yes, this one" --reply-to <message-id>
deepseekbot send-status <bot-id> --message-id <receipt-message-id>
deepseekbot channel-messages <channel-id> --host http://127.0.0.1:31917 --limit 20
deepseekbot tool-approval-status <channel-id> --message-id <card-id>
deepseekbot tool-approval-decide <channel-id> --message-id <card-id> --outcome allowed-once
deepseekbot tool-approval-decide <channel-id> --message-id <card-id> --outcome allowed-always-tool
deepseekbot tool-approval-decide <channel-id> --message-id <card-id> --outcome allowed-always-kind
deepseekbot tool-approval-decide <channel-id> --message-id <card-id> --outcome rejected
deepseekbot user-question-status <channel-id> --message-id <card-id>
deepseekbot user-question-answer <channel-id> --message-id <card-id> --answer-stdin
deepseekbot ask-secret-status <channel-id> --message-id <card-id>
deepseekbot ask-secret-submit <channel-id> --message-id <card-id> --values-stdin
deepseekbot ask-secret-cancel <channel-id> --message-id <card-id>
deepseekbot ask-secret-account-status <channel-id> --message-id <configured-card-id>
deepseekbot ask-secret-replace <channel-id> --message-id <configured-card-id>
deepseekbot ask-secret-revoke <channel-id> --message-id <configured-card-id>
deepseekbot ask-secret-accounts <bot-id>
deepseekbot release-info [--since <version>]
deepseekbot workspace-options
deepseekbot folder-browse [<folder-path>] [--offset <n>]
deepseekbot grant-create <bot-id> --workspace <workspace-id>
```

`tool-approval-status` returns `status` and, while the card is still `pending`, its `expiresAt`, the time the Web card counts down to. `--outcome allowed-always-kind` is the `secret_cli` card's "Always allow this kind": it allows this call and saves a rule for the same program, account and environment variable names, which `tool-approval-rules` lists with kind `secret-cli`; any other card refuses it.

### Agent control

These commands let an agent configure a Bot's capabilities and the Host without the Web UI, through the same Host owners and checks the UI uses:

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

`access-set` refuses `danger-full-access` unless `--acknowledge-risk` is given: full access lets the Bot perform ordinary work and use the Browser and Computer without routine approval cards; permission and approval-policy management still needs an individual Human decision. `--scope chat` also applies it to the Bot's own chat; `assignments` keeps it to new Assignments. `settings` returns `{ns, revision, value}` for one namespace; `settings-set` reads a JSON object of fields from stdin and applies it against that revision, so a concurrent change fails instead of being overwritten. Only fields the Host marks as live can be changed this way. `botHopLimit` (integer 1–1000, default 128, Settings → Messaging) is the maximum depth of a Bot-to-Bot chain started by one Human message. A Bot send that would wake another Bot (an @ mention or a Bot DM) past it is refused with `collaboration-hop-limit` and nothing is committed; a Group message without Bot mentions is still posted but wakes no one. The scoped Tob CLI cannot change it. `workspace-create` takes an absolute path and returns the Host workspace, whose id `grant-create` uses.

### Channels and groups

These commands manage Channels and groups through the same Host owners and checks as the Web UI. Each takes a Channel ID from `channels`:

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

`bot_send_message` resolves only its explicit `source_event_id` when selected in `resolve_inbox_ids`, after confirmed delivery. `channel_action` with `action: "drop"` accepts 1–200 observed completed IDs and preserves protected unfinished work. Both require explicit destinations; no inbound fallback. Inspect `inboxResolution`: repair failed cleanup with `inbox_resolve`, never resend a committed message. The direct `bot-tool <bot> <tool> --args-stdin` uses the same contract. Empty optional fields (`""`, `[]`, `false`, or a zeroed `freshness_override`) count as absent, so exactly one non-empty destination is required; the `destination-required` error names the destination fields it received.

If membership in the initiating opted-in Group is revoked, this run cannot redirect its reply to another Channel. `bot_send_message` returns `refused` with reason `group-reply-source-revoked`. A later independent DM is unaffected.

`group-send-review <channel> --accept` enables the opt-in freshness check for a local Group;
`--off` disables it and no flag reads its state. It does not change wake settings.
A direct `bot-tool <bot> channel_read --args-stdin` returns `observationIds` for enabled Groups.
Pass the target's handle as `observation_id` to `bot_send_message`. A `held` result is not a sent
message: read `review.content` when present. If `review.complete` is true, pass its
`review.observationId` as `observation_id` without another `channel_read`; otherwise read the
missing content first. Then pass `draft_id` with the new observation and revised
(or unchanged) `body`. At most two rechecks are allowed. Use `channel_action` with `action: "drop"`, explicit `channel_id` and `draft_id` to abandon the draft without resolving its Inbox item. `expired`, `refused` and
`requires-review` are terminal for automatic sending. Handles cannot cross Bot owners or Groups.

After an interrupted Group send, use `bot-tool <bot> channel_action --args-stdin` with
`{"channel_id":"...","action":"inspect"}`. This returns at most 20 own
draft/receipt metadata entries (pending first) and `hasMore`; supply `draft_id` for an exact
older record. It sends nothing and does not resolve Inbox work. After a Host restart, read the
current Channel, then send `recover:true`, `draft_id`, the fresh `observation_id`
and corrected `body`. Old observations, expiry and exhausted retry budgets cannot be reset.
For a committed receipt, read its canonical `messageId`; resubmitting that `draft_id` with the
same content returns the same message ID without a new message or Admission. Changed content
returns `draft-commit-content-changed`. Current membership, owner, source and attachment checks
still apply; a revoked Group may be refused by the direct runner before Tool execution.

For deliberate yielding, `bot-tool <bot> channel_action --args-stdin` accepts
`{"channel_id":"...","action":"drop","draft_id":"...","observation_id":"...","yield_to_message_ids":["..."]}`.
Read the cited peer answers first (`review.peerMessageIds` lists fully returned peers).
The result is `dropped` with `reason: explicit-peer-yield` and `yieldedToMessageIds`, retained
in the draft audit and `bot-trace`. Unobserved, changed, purged, own, Human or preview-only
references return `peer-answer-not-observed`; no drop or Inbox completion occurs. The Host
does not decide that the peer answered adequately. Useful additions and new direct questions
still use the existing send path; resolve only explicitly selected completed Inbox items.

`channel <group-channel>` returns `{channel, channelFingerprint, invitationPolicy:{autoAccept}, wakePolicies}` and refuses non-group Channels. Stable creation/invitation inputs and retry semantics are described under [Tob group creation and invitations](#tob-group-creation-and-invitations); Human online commands may use them too.

Renaming a Bot DM renames that Bot, as in the Web UI. `group-avatar-set` reads a PNG, JPEG or WebP file of at most 96 KiB. Invitation and join-request IDs are in the group's `invitations` and `joinRequests`, returned by `channels` and by every group command. `group-wake-set` sets when a member Bot wakes for ordinary group messages: `all`, `mentions`, `digest` (after `--count` messages or `--interval` seconds; defaults 5 and 30) or `silent`; `--inherit` returns the member to its Bot's default. `channel-timeline` and `channel-journal` page messages the way the chat view does; take the `revision` from `channel-timeline` as `--through`. `channel-retry` asks the Bot to answer a Human DM message again after a failed reply. With `--recovery continue` and the failure card's id it instead continues the stopped turn in the same Session: the Bot keeps the tool calls it already completed, sees the cause and is told to check calls with an unknown outcome before repeating them. Continue works after the turn already sent messages or started Assignments, where a plain retry is refused; it is refused with `session-changed` once the Bot's Session was replaced and with `bot-busy` while it is working. A turn that failed with `TRANSPORT`, `TIMEOUT`, `SERVER`, `RATE_LIMIT` or `EMPTY_RESPONSE` continues by itself after 60 seconds and then 180 seconds; the card carries `autoContinue` with the attempt and time. `channel-bot-stop` cancels a waiting continuation; with `--auto-continue-for` and the card's request message id it cancels only that continuation, never stops a running turn, and is refused with `not-working` when that continuation is no longer waiting. A new Human message in that DM replaces it. Turns interrupted by a Host restart continue on start-up the same way. The card's `progress` gives the completed tool calls, the last tool and tools with an unknown outcome. `channel-unread` lists the unread Bot message count of each Channel that has any; these are the numbers the sidebar shows on each row. `channel-mute` mutes a Channel the way the sidebar menu does: it keeps its row greyed and excludes its ordinary messages, mentions and replies from Activity message lists and the global unread total; `--off` restores eligibility under the existing read/dismissal/snooze rules. Actual Channel read positions and explicit pending Human requests remain unchanged. `channel-bot-stop` is a deprecated alias of `bot-stop <bot> --channel <channel>` and prints a deprecation line on stderr; it keeps refusing a Bot with nothing running with `not-working`, which `bot-stop` treats as success. A Bot whose automatic runs fail three times in a row with a non-transient error (for example `INVALID_REQUEST`) is held instead of retrying: until a Human message reaches it, it takes no automatic wake, and the Channel records `turnStop.cause: "failures"`. `channel-react` adds your reaction to one message, or removes it with `--remove`, and returns the message's `reactions`; a message holds at most 20 of your reactions, and the emoji must be a single emoji. Bots react through `channel_action` with `action: "react"`, `channel_id`, `react_to` and `reaction`; `bot-tool <bot> channel_action --args-stdin` runs it without the model. Reactions cannot send text. `channel-search` matches `--query` without case in the messages you can see, newest first, and pages with the `nextCursor` it returns. `message-search` is the global search behind Alt+K and the mobile Chats search: it searches every Bot DM and joined group you can see, leaves out hidden Channels, and returns `hits` of `channelId`, `message` and a one-line `snippet`, newest first. Text of three or more characters uses the full-text index and also matches attachment file names; one or two characters scan for at most 200 hits.

`group-delete` and `channel-purge-confirm` cannot be undone and need `--confirm`. `group-delete` disbands the group and deletes its messages and files that no other conversation shares; it returns `{"deleted": true, "messages": n}`, plus `cleanupPending` while file cleanup retries and `retained` when some messages could not be read for deletion (the group then stays in `channel-history`, and running `group-delete` again retries it). `channel-history` lists groups disbanded before that change, and groups whose deletion did not finish, whose content can still be purged. Purging works in two steps like the history page: `channel-purge-preview` lists the messages, Bot admissions, files and effects the chosen Source Events would remove and returns a short-lived `token`; `channel-purge-confirm` reads `{"token": …}` from stdin for the same Source Events and fails coded when the scope changed. Pick Source Events from `channel-history-sources`, which pages with the `before` cursor it returns.

`channel-media-target` acquires checked source media through current Human Channel authorization and returns its canonical Host file target. `channel-media-download` uses the same authenticated attachment route as the card, writes the original bytes to a new local `--out` file and returns size, MIME and SHA-256 in its JSON result. It refuses an existing output instead of overwriting it. Both commands use `channel + source-event + attachment` without a Bot selector or model call; source revocation remains a coded refusal. The default bound is 25 MiB.

Use `--representation playback` on `channel-media-download` to request the same explicit preparation as the Channel player. For the #1023 Lark parent-video candidate this serves an original whose bytes identify MP4; it does not transcode or validate browser decoding. Omitting the flag always keeps original-download semantics. Unsupported formats return a coded refusal, and the original remains separately downloadable. Real native and installed-product qualification is recorded in [the candidate checkpoint](dev/verification/lark-1023-channel-video.md).

Busy Groups allow an initial hold and at most two rechecks. `budget.exhausted` returns
`requires-review`, `draftVersion` and choices; new source messages do not reset the existing
draft. To defer, drop without `resolve_inbox_ids`, then use `inbox_snooze` for the observed
unfinished work with a time and note. Do not mark waiting work done.
For freshness-only contention, `suggestedSnoozeUntil` supplies a Host-time hint 30 seconds
ahead for `inbox_snooze.until_time`; it schedules nothing itself. A later Human deadline
or unmet condition takes precedence, and cancellation still ends the work.
An exhausted drop without observed peer-yield evidence returns `keepOpenInboxIds` for the
original request's Source Event and Group Message IDs. These are excluded from any composed
`resolve_inbox_ids` selection and reported in `inboxResolution.keptOpen`; other selected
completed FYI items can still resolve. If all selected IDs must stay open, the outcome is
`kept-open`. Continue unfinished work through `inbox_snooze`; if it is genuinely cancelled
or otherwise complete, resolve it explicitly with `inbox_resolve`. Peer-yield completion
remains available. Direct CLI uses the same checks.
The unfinished-request continuation instruction is returned even when completion IDs are
omitted or contain only FYI: resolving background work does not prove the answer was sent.
Inside a native Orchestrator turn, dropping an exhausted draft fences replacement sends
until the turn ends (`dropped-exhausted-draft-defer-turn`). A later turn can read fresh
context and proceed. Separate direct CLI invocations do not share a native turn.

After reading all required content, an answer that remains necessary may use the same direct
command with `freshness_override: {"draftVersion":3,"reason":"Necessary after review"}`,
`draft_id`, `observation_id`, original `channel_id` and the actual `body`. Use the returned
version, never a guessed constant. This explicit attempt is permitted once per exhausted
draft and still atomically checks current content. `override-context-changed-defer` means a
new message or edit arrived: nothing was sent, and the attempt is spent. Read that context,
drop without resolving unfinished work, then snooze briefly and read fresh context on return;
respect a later Human time or condition. `override-already-attempted-defer` refuses repetition.
The attempt does not bypass membership, stopped/archived state, expiry, purge or ownership.
`draft-version-changed`, `override-context-not-observed` and `override-requires-exhausted-draft`
are coded refusals, not delivery. A committed message ID proves the result; tool traces retain
the selected reason. Human requests to wait or cancel must never be overridden.

### Bot profile, roster and Part Library

These commands set a Bot's look and wake rules, arrange the sidebar and manage Custom Parts through the same Host calls as the Web UI ([#1702](https://github.com/BotHarness/DeepSeekBot/issues/1702)):

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

Images are read from a file path: an avatar is a PNG, JPEG or WebP; a banner is a 3:1 PNG; `--clear` returns the avatar to its default and the banner to the seeded scene. `bot-appearance-set` takes the same pixel recipe as the avatar editor and redraws the avatar from it. `--source-class` is `assignment-report` (`--wake conditional|immediate`), `group-ordinary` (`--wake immediate|digest|mentions|silent` with `--digest-count` and `--digest-interval` seconds), or `human-dm`, `bot-dm` and `group-mention` (`--delivery steer|turn`). Roster commands take Channel ids (`dm-<bot-id>` for a DM); `roster-pins-set` and `roster-hidden-set` replace the whole list, so pass no ids to clear it, and `roster-batch move` without `--section` moves to the top level. `roster-section-remove` needs `--confirm` and moves the section's Channels to the top level. With `--host` or `DEEPSEEKBOT_HOST`, `human-name-set` and `channel-human-name-set` use the Host; with `--home` they keep their offline path. `part-library-export` writes the part PNG, or a zip of the whole library, to `--out` and prints its file name and size; `--part-stdin` exports a worn part given as JSON.

### IM apps from the CLI

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

`im-app-add` covers token-based platforms (Discord, Slack, QQ, DingTalk, WeCom, Matrix); Feishu and WeChat keep `im-authorize`. Credentials arrive only on stdin and are never printed; output lists each app's id, name, connection state and error code. `im-bind` binds a connected app (the `id` from `im-app-status`, also the `ref` in `im-status`) to a Bot, and `im-status` shows each binding's `reception`. `channel-connect` attaches an external group conversation to a Channel as context through that Bot's binding; the conversation must already be known to the binding, so mention the app there once and pick the id from the `candidates` in `channel-ingests`. Otherwise the Host refuses with `conversation-unavailable`.

### IM messaging, approvals and failure alerts from the CLI

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

For a qualified WeChat private connector, the update JSON also accepts independent `dmMirror` and `dmForward` booleans; both default to `false`. Read `channel-bridges` first and send its current grant/route revisions with the update. The preference is shared by entries for the same Binding and conversation. Turning a switch off stops uncommitted work, including offline; it does not purge history or revoke normal reply authority. Forwarding requires an existing proactive target in the same account. For example, add `"dmMirror":true,"dmForward":false` to an otherwise unchanged update payload to enable local presentation only.

These call the same Host bridge methods as the Bot's IM settings, the Channel bridge list and the approval and failure-alert cards, so the Host applies the same checks and refuses with the same codes. `messaging-grants` lists the Bot's authorized conversations (grant ids, revisions, reception, group and thread policies) and bindings with their post limits, without target digests or app fingerprints. Structured changes read one JSON object from `--input-stdin` in the shape the Web UI sends, including its `expectedRevision`, so a concurrent change fails instead of being overwritten; `approval-route`, `failure-alerts-set` and `messaging-post-limit` read the current revision themselves. `messaging-send` and `messaging-post` print the `requestId` they used: retrying with the same `--request-id` returns the existing post instead of sending twice, and `messaging-post-status` reads it back without posting. Like the confirmation dialogs in the Web UI, `messaging-revoke`, blocking a conversation, deleting a bridge and `delete-*` sender-access changes need `--confirm`. Send only to IM conversations you are authorized to test in.

### Browser and Computer from the CLI

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

`browser-open` starts the Bot's Browser (Browser Access must be on) and returns its tab and viewer URL. `browser-frame` saves the current picture to an absolute path and reports its size and viewport, so an agent can look at what the Bot sees. `browser-takeover --enabled` pauses the Bot's Browser for Human input and `--disabled` hands it back. `computer-start` carries the explicit authorization the panel button sends; read the result with `computer-status`, whose `status.detail` explains a refusal such as a missing OS permission or display. `grants` lists a Bot's Workspace Grants from a live Host. Route refusals keep the Host's code, or `host-refused` with its message.

`computer-frame` saves the current picture of the Computer desktop (Local or Container) to an absolute path and reports its size, `mimeType` (`image/jpeg`, or `image/png` when the Host cannot encode JPEG), `seq` and target. It is the same frame a paired phone polls from `GET /api/computer/frame?after=<seq>`, which waits for the screen to change and answers 204 when it stays the same. `computer-input --args-stdin` sends one Human action to that desktop: `{"kind":"click","x":10,"y":20}` (optional `"button":"right"`, `"count":2`), `{"kind":"scroll","direction":"down","amount":3}`, `{"kind":"type","text":"hi"}` or `{"kind":"key","key":"return","modifiers":["meta"]}`. Coordinates are pixels of the last frame. Both refuse with `not-running` while the Computer is stopped. Input needs `computer-takeover --enabled` first, or it is refused with `not-paused`. `computer-frame` answers `no-frame` when the Computer has not produced a picture yet. `computer-takeover --enabled` returns once any Bot Computer call already in progress has finished (at most 10 seconds), and a result that finishes after the pause starts is withheld from the Bot. While paused, every Bot Computer tool call is refused, screenshots included, so the Bot cannot move focus or see the screen while you type a password. The pause lasts while the phone keeps polling frames or sending input and lapses 30 seconds after the last one; `computer-takeover --disabled` hands the desktop back at once.

### Local Computer video

Windows and macOS Local Computer use the [native phone video path](local-computer-video.md). The preceding `computer-frame`, `computer-takeover` and `computer-input` descriptions apply to legacy targets; these commands return `update-required` on the migrated Windows/macOS targets. Bot/diagnostic screenshots remain separate capabilities and obey the global Bot pause.

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

All operations use `POST /api/computer/video` and emit one JSON document. `status` reports global `paused`, `viewerCount`, `controlHeld`, media health and runtime; `controller`, binding and grant belong only to the admitted caller. The phone uses its paired device identity; the authenticated local CLI is the Host owner and cannot impersonate the phone by supplying a device ID. Opening a second viewer returns `viewer-limit`.

On the phone, the exact command path travels inside the encrypted LAN channel and dispatches with the Noise-admitted device identity. Connect refuses video before owner execution; envelope route labels cannot override the server listener. Host-owner CLI success does not qualify phone pairing or LAN/native playback. The phone's single Hand back action uses `resume`; it and Reconnect remain available during confirmed stall independently of input eligibility. Low-level `release` keeps pause; reconnect starts observation only. See [recovery and downgrade](local-computer-video.md#recovery-and-downgrade) before reverting a version that has persisted pause.

`open` does not pause Bots. It returns the server-issued `binding` (`computerId`, `runtimeId`, `viewerId`, `attemptId`) and saves its gathered offer to a new private `--out` file; stdout excludes SDP. Supply later command JSON through stdin. `signal` takes `binding` and `answer: {"type":"answer","sdp":"…"}`. `heartbeat` takes `binding` and `playback: {"presentedFrames":42,"presenting":true}` from actual receiver rendering. A fabricated heartbeat is not a playback test. `takeover` takes `binding`; forced takeover additionally needs `force:true` and the CLI's `--confirm`, though T1 refuses a second viewer before this step.

`input` takes `binding`, the granted `generation`, a strictly increasing `sequence`, and `input: {"kind":"click","x":10,"y":20,"button":"left","count":1}` or `input: {"kind":"scroll","direction":"right","amount":2,"x":10,"y":20}`. Scroll directions are `up`, `down`, `left`, `right`, with amount 1–50. Use actual full-display pixel coordinates. Input executes once; `input-result-unknown` means do not retry it. `release` takes `binding` and optionally `generation`, and keeps the durable pause. `close` takes `binding` and closes media while preserving pause. `resume` requires the current `runtimeId`; it works without a viewer/helper after restart, invalidates control and drains Human input before reopening Bot use. Another active controller produces `control-conflict`. Stale runtime/attempt/grant calls are refused.

Inspect `computer-diagnostics` and `computer-logs` for bounded lifecycle evidence. Common refusals include `not-running`, `helper-missing`, `helper-start-failed`, `viewer-limit`, `media-not-live`, `control-required`, `control-disconnected`, `stale-attempt`, `stale-grant`, `pause-write-failed`, `drain-timeout`, `queue-full` and `connect-carrier-required`. Do not print signaling files, credentials or input contents in evidence. A successful CLI signal is not rendered-video or physical-device acceptance.

### Human Inbox, assignments, Sessions and approval rules

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

`session-stop <bot-id> <session-id>` stops one running Session of a Bot, as the stop button on its row in the Sessions panel does. Its Subagents stop with it, and the Bot's other Sessions keep running. It returns `stopped` and `alreadyIdle`, each a list of `{ botSlug, sessionId, role }`: a Session that is idle, already stopped or stopped twice comes back in `alreadyIdle` and still succeeds. A Session the Bot does not own is refused with `unknown-session`. With `--channel`, the Channel the stop came from gets a one-line notice (`turnStop.target`, plus `messageId` in the result), but only when the Session belongs there: the Bot's Orchestrator in a Channel the Bot is in, an Assignment only in the Channel that started it.

`session-stop <bot-id> --activity <activity-id>` stops the Session behind one row of the Bot's live activity snapshot (`sessions[].id`), as the stop on a row of the Messages header popover does. A row that has already gone means the Session finished, so the command returns empty `stopped` and `alreadyIdle` lists and still succeeds. Pass either a Session id or `--activity`, not both.

Stopping an **Assignment** does not wake the Orchestrator. Its next turn reads a Host lifecycle notice that the Human stopped the Assignment and must not be redispatched unless the Human asks. The Assignment keeps its history and stays unarchived; only an Assignment Request from the Orchestrator (`send_assignment_request`) resumes it.

Stopping the **Orchestrator** only interrupts its current turn (or a waiting automatic continuation). Its Assignments keep running, and nothing else changes: the next message, Assignment Report or other wake starts a turn as usual, and that turn carries a Host note about the stop. In the Sessions panel, when Assignments are running, the stop asks first and offers to stop them too (Bot Stop).

`bot-stop <bot-id>` is Bot Stop: it stops the Orchestrator and every running Assignment of the Bot, with their Subagents, with the same interrupt-only semantics. It is idempotent: with nothing running it returns an empty `stopped`. Each stopped Assignment can be resumed by an Assignment Request, like one stopped alone. With `--channel` the notice (`turnStop.target.scope: "bot"`) goes only to that Channel, and only when the Bot is in it. IM `/stop` and the composer's Stop run Bot Stop.

`inbox-status` requests the complete message-category summary and returns `unreadCount`, `hasAction` and, on a supporting Host, `messageCounts: { replies, other }`. The categories partition distinct unread Source Events after visibility and Channel mute rules; read retained personal messages and handled requests do not trigger a message indicator. These are complete counts, independent of Activity pagination or browser filters. A legacy Host may omit `messageCounts`; missing data is not zero. The control-rail indicator preference is browser/Host-origin-local presentation and does not change this CLI state.

`inbox-watch` subscribes to the existing authenticated roster stream before its baseline read. It observes for 1–60 seconds (default 10), then emits one JSON document with `initial`, `current` and the number of `invalidations`. Both snapshots use the same Human Inbox query and filters as `inbox`; intermediate events are invalidations, not a second notification store. An interrupted stream is a coded refusal. Set `--timeout` longer than the observation window.

`inbox --search <text>` searches safe Activity summaries, Channel names and Bot slugs before pagination (maximum 200 characters). `--unread` restricts personal messages to unread entries and leaves pending actions intact. `--sort newest|oldest` orders each category; `--category replies --sort mentions-first` puts mentions before replies. Keep filters unchanged when using `--cursor`. Search, unread filtering and mention ordering require query version 1; an older Host fails with `host-query-unsupported` instead of returning partial results.

`inbox` returns one page of the Human Inbox (`items` and `nextCursor`), filtered like the Inbox tabs by `--category` (`action`, `info`, `unread`, `replies`, `handled`), `--bot` or `--channel`. `inbox-dismiss` takes an item's `id` and, when the item has one, its `sourceEventId` as `--source-key`; `inbox-dismiss-all --confirm` dismisses every active item at once, or only those of one `--kind` (for example `bot-message-needs-repair`) and within `--category`, `--bot` or `--channel`; it also marks the cleared unread conversations, replies and mentions read through their message, and returns `dismissed`, `read` (conversations marked read) and `more` (at most 1000 items per call, `more: true` when items remain) and is the Activity "Clear…" menu on the Web and phone. `inbox --dismissed` lists the dismissed items (the phone's "Cleared" filter) and `inbox-restore` brings one back with the same `id` and `--source-key`, failing on a Host that predates it with `host-query-unsupported`; `inbox-ignore` marks an informational assignment report as read. `inbox-snooze` hides an Action, Info or Replies item until `--until` (at most 30 days away), the Web Inbox's "Remind me later"; `--clear` brings it back now, and `inbox --snoozed` lists the items still snoozed with their `snoozedUntil`. `assignment-context` reads the report behind an `assignment-report` item. `assignments` lists a Bot's Assignments newest first, each with its `title` (Assignment Title) and `description` (Assignment Description), activity, Continuity Key and latest report; `--search` matches the Title, Description, Continuity Key and latest report summary without case, `--activity` keeps a comma list of `working`, `idle`, `error`, `stopping` and `stopped`, `--include-archived` adds archived ones, and `--cursor` continues from the page's `nextCursor` with unchanged filters (`--limit` 1–50, default 20). It is the same Assignment Directory the Bot's `list_assignments` reads. `assignment` inspects one Assignment by `--session`. `assignment-timeline` returns that Assignment with its `rounds` and a timeline in `lanes`. Each round is one turn of the Assignment Agent: round 1 is `created`, later ones are `continued` (the Orchestrator sent it another request), each with its start time and the first 280 characters of the Orchestrator's `instruction`; the newest 20 are kept and `omittedRounds` counts the rest. MAIN entries and Subagent lanes carry the `round` they belong to. The lanes are `main` (the Assignment Agent) first, then each DSH Subagent as `subagent` 1, 2… in creation order (the newest 20; `omittedSubagents` counts the rest). Each lane keeps its latest 40 `entries`, each with the tool name, its `kind`, a `status` (`running`, `done`, `failed`, `denied` or `cancelled`), the time and, only when the tool declares one, a short public `detail`; raw tool input and output never appear. Each lane also has a `state` (`running`, `done`, `failed`, `cancelled` or `idle`), its first and last event time, and, once the Session has called a model, the `route` it actually ran on (`provider`, `model`, `reasoningEffort`). The Work button on an Assignment row in the Sessions panel and the Group Work panel reads it and lists each round with the Orchestrator's instruction, its MAIN steps and the Subagents started in it. `session-subagents` returns the same `subagent` lanes for any root Session a Bot owns, an Orchestrator or an Assignment, which covers Subagents the Orchestrator started itself with `bot_subagent`; the Sessions panel and the Group Work panel read it when a row is expanded. `channel-assignments` lists a group Channel's assignment work; `channel-assign` moves a Channel into a sidebar section (`--unsectioned` takes it out). `session-ids` lists the root Sessions Bots own and `session-owner` names a Session's Bot and role. `tool-approval-rules` lists a Bot's "always allow" rules; each rule's `autoApprovedCount` is how many approval requests it has answered without asking, counted once per request. `tool-approval-history` lists the Human's answers to the Bot's approval cards, newest first: each entry has the tool, its input, the `outcome` (`allowed-once`, `allowed-always-tool`, `allowed-always-exact`, `allowed-always-all` or `rejected`), the `channelId` and both message ids, and `actor` when the answer came from a paired IM account; `--cursor` continues from the page's `nextCursor` (`--limit` 1–100, default 30). Revoking a rule, a Workspace Grant or a private MCP server needs `--confirm`, as the Web UI asks for confirmation. With a Host targeted, `grant-revoke` and `grant-write-set` go through it; with `--home` they stay offline maintenance commands. Private MCP servers are listed by `ask-secret-accounts`; a name the Host does not know fails with `private-mcp-server-unavailable`.

### Schedules on a live Host

```bash
deepseekbot schedules <bot-id>
deepseekbot schedule-create <bot-id> --title Standup --prompt "Summarize yesterday" --daily 09:00 --timezone Asia/Tokyo
deepseekbot schedule-preview --cron "0 9 * * 1-5" --timezone Asia/Tokyo
deepseekbot schedule-update <bot-id> --sid <schedule-id> --every 3600 --disabled
deepseekbot schedule-run-now <bot-id> --sid <schedule-id>
deepseekbot schedule-history <bot-id> --sid <schedule-id>
deepseekbot schedule-delete <bot-id> --sid <schedule-id> --confirm
```

With a Host selected, the schedule commands call the same Host methods as the Schedules panel, so the Host checks the Bot, the trigger, the time zone and the lock, and a refusal keeps its code (`invalid-input`, `not-found`, `locked`, `inactive`). `schedule-preview` returns the trigger and the Host's next occurrences. `schedule-run-now` queues a firing that the running Host executes. `schedule-delete` also removes the schedule's history, so it needs `--confirm`, like the panel's confirmation.

### Takeover Handoffs on a live Host

```bash
deepseekbot takeovers [<bot-id>] [--pending] [--channel <channel-id>] [--limit 20]
deepseekbot takeover-request <bot-id> --target browser --title "Sign in to the shop" --body "Please sign in, then press Done." [--channel <channel-id>] [--minutes 30]
deepseekbot takeover-status --channel <channel-id> --message-id <request-id>
deepseekbot takeover-complete --channel <channel-id> --message-id <request-id> --outcome done|failed
deepseekbot takeover-cancel --channel <channel-id> --message-id <request-id> [--bot <bot-id>]
```

A Takeover Handoff is how a Bot asks the Human to operate its Computer or Bot Browser for one step it must not do itself, such as signing in or a captcha. The Bot calls `takeover_request`; the conversation shows a card with the title, the Bot's sentence and a Take over button that opens the Computer or Browser view, and the Human gets a push when away. The Bot's turn ends at once: the Human can keep chatting, and the Bot answers them. Done, Could not finish, cancel and expiry post a resolution that wakes the Bot through its Inbox, and the Bot observes the screen again before it continues; a Bot withdrawing its own request with `takeover_cancel` does not wake it. A Bot has at most one pending request; it expires after 30 minutes by default (at most 120).

`takeover-request` posts the card as the Bot through the same Host code as the Bot tool, in the Bot's DM unless `--channel` names a Channel the Bot can post in. `takeover-complete` and `takeover-cancel` act as the Human, like the card's buttons, and wake the Bot; `takeover-cancel --bot <bot-id>` withdraws the request as that Bot, like `takeover_cancel`, and wakes nobody. `takeovers <bot-id>` reads what `takeover_list` returns. Refusals keep their code: `unknown-bot`, `invalid-input`, `target-off` (Browser or Computer Access is off), `channel-unavailable`, `already-pending`, `not-found` and `not-pending`. Each request, refusal and outcome is recorded in the diagnostic log under the source `takeover` with ids, counts, lengths and timings only, never the title or sentence; read it with `deepseekbot diagnostic-logs` or `diagnostic-logs-export`.

### Browser and Computer: observation, packages, transfer and logs

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

`browser-observation` with a running local process but no owned current tab returns `viewerUrl: null`; process readiness alone is not viewer readiness. `browser-frame` preserves a stopped/no-tab refusal (404) and reports an unavailable first frame after the bounded wait as `host-refused` (503).

`browser-observation` returns the same state the Browser panel polls: whether the Browser runs, its tabs and focused tab, takeover state, stored profiles and target. The current picture is never printed as base64; it is summarized as `{mimeType, bytes}` and saved to `--out` when given. `browser-takeover-audit` lists a Bot's takeover events in time order. `browser-takeover-recording` reads one takeover and its recorded input; the token is the `takeover=` value from the takeover link and arrives on stdin. `browser-profile-set` picks the Bot's Browser profile (`default` resets it) with the same name rules as the panel.

`browser-open` refuses a machine without Chrome's system libraries with `provision-missing-libs` and lists the packages in its message. `browser-packages` reports whether the Host can install them (`access`) and the last install's progress; `browser-install-packages` installs the named packages and `computer-install-packages` installs what Local Computer reports missing. Both need `--confirm`, like the panel's install button, and `--wait` polls until the install settles. A Host without administrator rights refuses with `needs-administrator`.

`computer-diagnostics` returns the Computer's recent diagnostic events and `computer-logs` the Host's operational log entries, filtered by plugin, Bot (`--bot`), entity, time (`--since`, epoch milliseconds) and count. The archive commands work with Container Computer only (`container-only` otherwise). `computer-export` writes an archive to the export folder (or `--dir`) and, with `--out`, downloads it right away; the one-time download token is never printed. `computer-upload` streams a local `.tar` into the export folder, `computer-exports` lists the archives there, and `computer-import <archive> --confirm` stops the container and restores its data from that archive. `computer-open-dir` opens the export folder in the Host's file manager.

`computer-webrtc` reads whether a phone can call Container Computer over WebRTC (`/api/computer/webrtc`): the tailnet address and UDP port the container advertises, an empty ICE server list, and the number of open calls, or a refusal code with `fallback: "websocket"` (`not-running`, `media-unavailable`, `tailnet-unavailable`, `tailnet-changed`). `browser-webrtc --viewer <id>` does the same for the Container Browser whose viewer path is `/botharness-browser/viewer/<id>/`. `--probe` opens the signalling socket a phone uses (`/api/computer/webrtc/signaling`, `/api/browser/webrtc/signaling?viewer=<id>`), runs the Selkies handshake up to the server's offer and reports its ICE-lite flag and media candidates; while the probe is open the container streams over WebRTC, and closing it switches back to WebSockets, so a desktop viewer reconnects once. A phone reaches the same routes through `/botharness-device/api/…` on its device credential.

The Web Client's live stream socket (`/api/remote.mux`) and its viewer event report (`/api/computer/diagnostics/viewer`) stay UI-only; `browser-frame`, `browser-observation` and `computer-diagnostics` give an agent the same information.

### Debug by layer: with and without the model

Run the same task twice to find the layer that fails:

```bash
# A — through the Bot: model → Harness → tool → Browser
deepseekbot send <bot-id> --body "Open https://example.com and reply with the main heading."

# B — without the model: the same Browser tool code, Browser Access and audit
deepseekbot browser-tools
printf '{"url":"https://example.com"}' | deepseekbot browser-tool <bot-id> browser_open --args-stdin
deepseekbot browser-tool <bot-id> browser_observe
deepseekbot browser-tool <bot-id> browser_screenshot --out /tmp/shot.jpg
```

If B fails, the Browser itself is the problem (for example a site refusing headless Chrome), whatever the model does. If B works and A does not, look at whether the Bot's tool call was refused (Harness: access or approval) or never made or made with wrong arguments (model). `browser-tool` takes the tool's arguments as a JSON object on stdin, accepts the name with or without the `browser_` prefix, and saves the first image result to `--out`. Direct calls are audited with the session `direct`.

The Computer works the same way. Start it first, then call one of the curated tools with a Bot that has Computer Access:

```bash
deepseekbot computer-start --target local
deepseekbot computer-tools
deepseekbot computer-tool <bot-id> computer_list_windows
deepseekbot computer-tool <bot-id> computer_get_desktop_state --out /tmp/desktop.png
```

`computer-tool` refuses a tool that is not in the curated catalog, a Bot without Computer Access, and a Computer that is not running, with the same messages a Bot would get.

To see what the Bot did in path A, read its tool-call trace right after `send`:

```bash
deepseekbot bot-trace <bot-id> --turns 1
```

Each turn lists the tools the model called with bounded arguments, the outcome (`ok`, `error`, `denied` when an approval was rejected, `cancelled`, or `pending`), the approval decision when there was one, and the first part of the result. Arguments and results of `secret_cli`, `secret_http`, `protected_cli`, `secret_mcp_connect` and `ask_secret` are never returned. A `denied` call points at the Harness (access or approval); a missing or wrongly argued call points at the model; an `error` from the same tool that also fails in path B points at the Browser or Computer. `--session` reads another of the Bot's Sessions, such as an Assignment.

### Ops catalog

`deepseekbot catalog` calls the live Host method `catalogView` as the authenticated Owner. `deepseekbot catalog-open <entryRef>` calls `catalogOpen`. The Host reads only `$DSH_HOME/botharness/catalog-source.json`. That file points at the official registry. The registry's `display.audiences` decides who may see it. `profile-owner` is this command. `bot:<slug>` uses that Bot's `pack_catalog` and `pack_catalog_open`. `catalog-open` stays the Owner bridge and a Bot cannot call it to become the Owner. `printf '{"entryRef":"ops:asset-catalog#<id>"}' | deepseekbot bot-tool <bot-id> pack_catalog_open --args-stdin` opens item names and briefs for the registered Bot. A missing file is `unreachable`. A registry without `display` is `unauthorized`. Neither result is filled from a Bot memory catalog. `entryRef` is `ops:asset-catalog#<id>`. The reply omits filesystem paths.

### Harness Bot tools without the model

The Harness tools a Bot uses to talk, read its Inbox and run its Channels and schedules can be called the same way, as that Bot, with no model involved:

```bash
deepseekbot bot-tools
deepseekbot bot-tool <bot-id> channel_list
printf '{"channel_id":"dm-<bot-id>","body":"direct hello"}' | deepseekbot bot-tool <bot-id> bot_send_message --args-stdin
deepseekbot bot-trace <bot-id> --session direct --turns 5
```

For a colleague on an online Host in the same verified Tailscale tailnet or signed-in Connect account, query `list_bot_contacts` first. Remote contacts retain a distinct `botId`, `hostId`, owning device facts, capability facts and public description. Unavailable device facts are `null`.

```bash
deepseekbot bot-tool <bot-id> list_bot_contacts
printf '{"bot_id":"<contact-botId>","body":"Please investigate this iOS bug."}' | deepseekbot bot-tool <bot-id> bot_send_message --cause-event <owned-source-event-id> --args-stdin
```

Connect uses the same commands and Bot identifiers; no Human device pairing is needed between account-owned Hosts. The Host and relay must both support Bot network registration. Account sign-out or removal withdraws that scope; temporary route loss only makes delivery unavailable. A peer reachable through another still-valid collaboration scope remains eligible. This path grants only Bot contact/message access, not Human device management. Refreshing an expired account token can repeat a rejected control-plane request, but never a Bot DM.

Remote text DMs enter the receiving Bot's ordinary Inbox. Acceptance is not reading or completion. Offline sends cannot be delivered; an interrupted acknowledgement can leave delivery unknown. The bridge does not queue outgoing messages, retry them or replay them after reconnection. Inspect existing Channel history before deciding on a new action.

When Tailnet and Connect reach the same Host/Bot, they share one contact and DM. Each explicit send refreshes route facts before choosing a route; if the contact cache was cleared while offline, that send first queries the current directory. A later explicit message can use a restored route without manually listing contacts first. A failed or unknown send is never moved to the other route, including after restart.

Each contact query refreshes public facts, including newly created Bots and changed descriptions or capabilities. Archiving or deleting a Bot also prevents sends from stale contact results. A same-name replacement has a different `botId` and its own conversation history. `channels` refreshes remote conversation facts and returns `remoteAvailability`: `available`, `unavailable` (no current route), `withdrawn` (outside the collaboration scope), or `bot-unavailable` (the reachable Host no longer advertises that Bot). These states do not describe the remote Bot's private work.

Legacy remote DM history without authenticated network membership remains readable. On upgrade, unstarted work from those legacy relationships is retired with a provenance-unavailable reason; a later authenticated contact does not replay it. Already-started local work keeps its existing permissions.

Confirmed scope withdrawal cancels accepted work that has not started; returning online or restarting the Host does not revive it. Started work may finish locally, but its reply still requires current eligibility. Explicitly contacting a third colleague preserves the causal chain and the 32-hop wake limit; one Host's contacts do not grant another Host access to them.

Network refusals use `unable-to-deliver` when the destination cannot be reached, `network-denied` when network membership or Host identity checks fail, and `delivery-unknown` when acceptance may have happened without an authenticated acknowledgement. These codes do not authorize an automatic retry. Remote `botId` values are opaque: reuse the contact's returned identifier. The first authenticated exchange pins the remote Host key in existing Channel metadata; a later key change is refused. `channels` and `channel-messages` expose accepted history through the same Host owner used by the read-only remote DM view.

Unified Channel and external IM messaging is available through the same runner:

```bash
printf '{"channel_id":"dm-<bot-id>","body":"The checks passed."}' | deepseekbot bot-tool <bot-id> bot_send_message --args-stdin
```

Use exactly one of `source_event_id` (a trusted reply source), `channel_id` (an explicit proactive
Channel target), `bot_id` (a colleague), `grant_id` (an authorized external target from `bridge_targets`), or `binding_id` with `conversation_id` (a reachable external conversation). `resolve_inbox_ids` may contain only the referenced
source in this slice. Resolution follows delivery; inspect `inboxResolution` separately and use
`inbox_resolve` to repair failed cleanup without sending again. `end_turn` defaults to false;
inside a native model turn it concludes only after successful delivery and requested cleanup.
The direct CLI has no model turn to conclude. Ordinary CLI invocations without a durable Group `draft_id` are separate messages;
this is not a general durable retry command. Replaying the same Group draft with unchanged content retains its existing message identity. Group sends retain draft review: pass `observation_id`,
`draft_id` and `recover` as needed. Inspection, dropping and reactions remain separate actions.
`attachments` accepts imported references; an external file reply accepts one file with empty
`body`, while proactive external files are refused. External delivery without a confirmed receipt
does not resolve Inbox or conclude the turn. `bot-trace --session direct` records the direct tool result.

`channel_action` runs the same reaction and Group draft code without sending text: use
`action: "inspect" | "drop" | "react"` and explicit `channel_id`, with the required draft or
reaction references. It is available through `bot-tool` as well. The model sees only
`bot_send_message` for delivery; old send names remain direct-CLI compatibility commands.
Proactive colleague text uses `bot_id`; reachable external posting uses `binding_id` with
`conversation_id`. These target forms are exclusive with the other destination fields.

`bot-tools` lists the tools the runner can call with their input schemas. `bot-tool` reads the arguments as a JSON object on stdin and runs the same tool code a Bot turn runs, with the tool's own argument validation, membership and permission checks; it returns `{slug, tool, sessionId: "direct", result}`. There is no inbound Channel, so pass `channel_id` where a turn would default to it. A direct read does not mark Inbox items as seen. A Bot-to-Bot send requires `--cause-event <source-event-id>` naming a real Source Event admitted to this Bot; the Host checks admission ownership, current Channel membership and the source-effect fence. A missing cause still fails, and another Bot's source returns `source-unavailable`. The flag supplies causation separately from the tool's single destination. Failures exit non-zero with a code: `tool-not-direct` for a tool that only works inside a Bot turn (starting or waiting on an Assignment, question cards, Memory branch switches, workspace grant requests, images for the model), `invalid-args`, `unknown-bot`, `bot-paused`, or `tool-failed` with the tool's own message. Each call is kept in the Host's recent direct-call log, which `bot-trace --session direct` returns; it lasts until the Host restarts.

Use `bot-tool <bot-id> inspect_assignment --args-stdin` with `{"session_id":"<assignment-session-id>","report_offset":0}` to select the latest accepted report without a model. Continue with `{"session_id":"<assignment-session-id>","report_offset":2000,"report_source_event_id":"<reportPage.reportSourceEventId>"}`, using the returned `reportPage.nextOffset` rather than assuming a page size. Each page contains at most 2,000 Unicode code points. The report identity pins this read even if a newer report arrives or the Host restarts; omit it at offset 0 to start reading the latest report. A nonzero offset without identity is refused with `REPORT_ID_REQUIRED`; old callers must restart at offset 0 and retain the returned identity. This identity is the Report Source Event, not the Assignment's originating `sourceEventId`.

The Host checks Bot/Assignment ownership and source-content availability on every page, then matches accepted-content metadata against native Session text. Unknown or mismatched report identities return `REPORT_UNAVAILABLE`; purged or missing native content is refused without switching to a newer report. Historic records retain the legacy metadata path and the 64-candidate native lookup limit. The Spill locator remains opaque; report identity does not guarantee indefinite content retention.

`bot_create` creates a blank PersonaBot as that Bot would from chat: `display_name` is required; `description`, `tags`, `avatar_path` (an absolute PNG, JPEG or WebP path in the Bot's Memory Repository or a Workspace Grant), `soul`, `core_memory` and `memory_location` are optional. It returns `bot_id`, `display_name`, `dm_channel_id`, `memory_dir` and `model` (`host-default` when the new Bot answers on the Host default model, `set` once it has its own), opens the new Bot's DM and adds a notice in the creating Bot's Human DM. Refusals are coded: `invalid-input`, `invalid-avatar`, `invalid-memory-dir`, `git-not-found` and `memory-unavailable`. Run directly, it skips the tool approval a Bot turn goes through, because you are the Human running it.

```bash
printf '{"display_name":"Tim","tags":["translator"],"soul":"# Tim\\nCalm and precise."}' | deepseekbot bot-tool <bot-id> bot_create --args-stdin
```

Together with `send` and `bot-trace`, this places a failure: if the direct call works and the same request through `send` does not, look at the model's call in `bot-trace`; if the direct call also fails, the problem is in the Harness or the runtime.

`send` establishes the registered Bot's DM and returns `receipt`, the committed Human `message`, `sourceEventId`, processing `state`, and `replies` associated with that exact request and Bot-owned Session. Other requests, approval/question cards, notices and failures do not count as replies. A real reply verifies the selected model and key together. The deadline defaults to 120 seconds and accepts up to 600. No send is automatically retried. Failures after starting the send include its receipt: inspect `send-status` before resubmitting. A supplied `human-<UUID>` ID with the same body lets the Host deduplicate; a changed body fails coded. Handled-without-reply returns `reply-not-produced`; repair-needed processing returns `send-needs-repair`. `--reply-to <message-id>` sends the message as a reply to an earlier message of that DM, as the phone's swipe-to-reply does; the Host refuses a target that is not in the DM.

Question answer stdin is `{"answers":[{"id":"question-id","selected":["Blue"],"custom":"optional text"}]}`; read IDs and options from live channel history. Host owners apply decisions once and return coded refusals for repeated or competing decisions. Tool approval exposes allow-once and reject. Question status preserves pending/submitted/answered/expired distinctions. `release-info` only reads lifecycle information. Workspace grants take IDs from `workspace-options`.

Private input uses the authenticated Owner and the same inline cards as Web Chat. Read `privateInputRequest.fields` and the card ID from `channel-messages`, then feed a JSON object of those field IDs and confidential strings to `ask-secret-submit --values-stdin` from a trusted source. Keep values out of arguments, shell history and ordinary messages. Submission and cancellation return only `{accepted:true}`; no command reads original values back. `ask-secret-status` returns request settlement, while `ask-secret-account-status` reports current access, including revoked or superseded. Replacement returns a new blank card's `{messageId}` for a separate stdin submission; revocation returns `{accepted:true,stopped,completed,uncertain}` and withdraws local access, without undoing remote effects; the account's stored values are erased at once. `ask-secret-accounts` lists a Bot's current private accounts as `{status,accounts}`: each row has the account name, purpose, field labels, `configured`/`replacing`/`unavailable`, when it was last set, and the configured card's `channelId` and `messageId` for `ask-secret-replace` and `ask-secret-revoke`. It never returns values or references. Private-operation refusals use the static `private-input-not-accepted` error instead of forwarding Host payloads. Mutations never retry automatically; inspect status and history after an uncertain transport outcome. These commands work in every Profile: since ADR-0189 secret input needs no opt-in and no Docker, see the [ordinary Profile guide](dev/guides/private-input-ordinary.md). The [account lifecycle guide](dev/guides/private-input-cli.md) has runnable checks for replacement, revocation and scheduled reuse.

Host-down commands fail `host-unreachable` without submitting a message. Expired tokens fail `host-unauthorized`; a tailnet name missing from the Host's `--trusted-host` list fails `host-untrusted`; malformed responses fail `host-protocol-error`. Bridge and gateway codes pass through unchanged. Stdout remains one JSON document (`--compact` is available); authentication values are never printed or saved.

Credential writes validate actual YAML before and after disk writes and restore exact previous bytes on failure (or remove a failed new file). Empty `refs: {}` becomes a block map while comments and records remain. Multiline values, including blank and trailing lines, round-trip. Null refs, empty stores and nonempty inline refs maps fail `bad-credentials` unchanged; use a block refs mapping for edits.

### To-do example plugin

These commands reach the to-do example plugin (`@botharness/todo`, [ADR-0203](adr/0203-bot-mode-is-a-dockable-layout-that-plugins-extend-with-dock-panels.md)). They work only on a Host where that plugin is installed; elsewhere they fail `todo-plugin-missing`.

```bash
deepseekbot todos
deepseekbot todo-add --title "Renew the passport"
deepseekbot todo-update <todo-id> --done
deepseekbot todo-update <todo-id> --title "Renew both passports" --not-done
deepseekbot todo-remove <todo-id>
deepseekbot todo-tools
printf '{"title":"Water the plants"}' | deepseekbot todo-tool <bot-id> todos_add --args-stdin
```

`todos` returns `{ok, todos}`, oldest first; each to-do has `id`, `title`, `done`, `createdAt`, `updatedAt` and `createdBy` (`{kind:"human"}` or `{kind:"bot", slug}`). `todo-add`, `todo-update` and `todo-remove` change the list as the Human, the same way the To-do panel will. `todo-tools` lists the Bot tools `todos_list`, `todos_add`, `todos_update` and `todos_remove` with their input schemas, and `todo-tool` runs one of them as that Bot with no model involved, returning `{ok, slug, tool, result}`. Refusals carry a code: `invalid-input` (an empty or too long title, an update with nothing to change, an unknown tool), `invalid-args` (tool arguments that fail the tool's schema), `todo-not-found`, `todo-limit` (the list holds 1,000 to-dos) and `unknown-bot`.

### Auto approval (Approval Templates)

A PersonaBot can select one Approval Template ([ADR-0207](adr/0207-an-approval-template-lets-a-reviewer-session-answer-tool-approvals.md)). While one is selected, an Approval Reviewer answers the Bot's approvals by the template before any card is posted: Shell commands that leave the sandbox, file tools, opening an attachment, `secret_cli` and `secret_mcp_connect` calls, and Computer and Browser Authorization. For a secret tool the reviewer sees the program, its arguments, the account and the placeholder names, never a secret value or an environment value; for an Authorization it sees the device and the Session. `cautious` sends secret tools and both Authorizations to the Human; `get-work-done` allows a known program with the account for its own service, and Browser Authorization when the task needs it. Any call that changes approval policy still goes to the Human as a card.

Templates are a Profile-wide library. Two are built in and read-only, `cautious` and `get-work-done`. Every other template is one Markdown file, `$DSH_HOME/botharness/approval-templates/<name>.md`, that the settings page (Settings → Auto approval) and these commands both read and write. A name uses lowercase letters, digits and dashes; the text is at most 32 KiB, and its first `#` heading and first line become the title and description.

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

`list` returns `{templates}` with each template's `name`, `title`, `description`, `builtIn` and `usedBy` (the Bots that select it); with `--bot` it also returns that Bot's `selected` template, or `null`. `show` returns `{template}` with its full Markdown `text`. `create` and `edit` return `{template}`; `create --from` copies another template's text, which is how a built-in is changed. `delete` returns `{template, clearedBots}`: every Bot that used the template has its selection cleared, so its approvals go back to cards. `approval-template-set` returns `{bot}` with the new `approvalTemplate`. `approval-templates` and `approval-template-show` remain as aliases of `list` and `show`.

Self-escalation guard: when a Bot runs these commands from its own Shell, writing a new template or editing one that no Bot uses needs no card, so a Bot can draft a template for you. Selecting a template, and editing or deleting one that some Bot currently uses, requires a Human decision or an explicit saved rule in the management scope, while the model Approval Reviewer cannot answer; when you reject it, the file stays unchanged. Refusals carry a code: `invalid-input` (a bad name, empty or oversized text, an unknown template to select), `template-exists`, `template-read-only` (a built-in), `unknown-template` and `unknown-bot`.

Each call the reviewer rejects becomes an `auto-rejection` item in the Human Inbox. Its `autoRejection` holds the Session, tool, input, template and reason. `inbox-allow-once` is the Inbox's "Allow this once anyway": it covers that exact call only. The Bot is told it may retry, and the next call in that Session with the same tool and identical input runs without review. Later calls are still reviewed.

```bash
deepseekbot inbox --category action --kind auto-rejection
deepseekbot inbox-allow-once autoreject:<source-event-id>
```

`inbox-allow-once` returns `{accepted, channelId, messageId}`, where `messageId` is the Human's override message in the Channel. An item that was already allowed, or whose Bot left the Channel, is refused with `auto-rejection-unavailable`.

**Circuit breaker.** After 3 rejections in a row, or 20 in one Session, auto approval pauses for that Session: every request posts a card, and the Channel shows a notice. The next approval the Human gives in that Session, on a card or from the Inbox, resumes it with fresh counts. The thresholds are fixed. The breaker and unused "allow once" overrides live in Host memory, so a Host restart resumes auto approval with fresh counts and drops an override the Bot has not used yet; the Inbox item stays handled.

### Voice messages (TTS Providers)

A Bot can speak a reply: `bot_send_message` takes `voice: true` before `body`, the text commits first, and the Host then synthesizes it through the Bot's TTS Provider and attaches the audio to the same message. Desktop and iOS show a voice bar above the text. Code blocks, file paths, URLs and tables are replaced by short spoken notes instead of being read out. If synthesis fails the message stays, without a voice bar, and shows why. Only local Channels get voice; a DM to another Bot or an external IM conversation sends the text and reports `unsupported-destination`. The Host never records or stores the Human's voice.

```bash
deepseekbot voice-providers [--bot <bot-id>]
printf '%s' "$FISH_AUDIO_KEY" | deepseekbot voice-provider-add fish-audio --model s2.1-pro-free --voice <reference-id> --key-stdin
deepseekbot voice-provider-add custom --name Kokoro --base-url http://127.0.0.1:8880/v1 --model kokoro --voice af_bella
deepseekbot voice-provider-test <provider-id> [--voice <voice-id>]
deepseekbot voice-set <bot-id> <provider-id> [--voice <voice-id>]
deepseekbot voice-set <bot-id> off
deepseekbot voice-synthesize --bot <bot-id> --text 'Done. See `src/app.ts`.' --markdown --out /tmp/voice.mp3
deepseekbot voice-provider-remove <provider-id>
```

Presets are `custom` (any OpenAI-compatible `/audio/speech` endpoint, for example a local Kokoro-FastAPI or LocalAI; key optional), `local` (the local speech service below; no key), `fish-audio`, `elevenlabs` and `openai` (key required). `voice-providers` returns `{presets, providers, bot?}`; each provider shows `id`, `name`, `preset`, `baseUrl`, `model`, `defaultVoice` and `keySet`, never the key. The key is read only from stdin and kept in the Host credential store. `voice-provider-test` synthesizes a short phrase and returns `{ok: true, latencyMs, bytes, mime}` or `{ok: false, code, message}`. `voice-set` binds the Bot's voice; `off` removes it, and removing a provider clears the Bots that used it (`clearedBots`). `voice-synthesize` uses the Bot's binding (`--bot`) or a provider (`--provider`), reads the text from `--text` or `--text-stdin`, applies the spoken-text rules with `--markdown`, writes the audio to the absolute `--out` path and prints `{providerId, voiceId, mime, bytes, latencyMs, text, out}`. Refusals carry a code: `usage`, `invalid-input`, `key-required`, `unknown-provider`, `voice-not-configured`, `provider-unauthorized`, `provider-rate-limited`, `provider-unavailable`, `provider-timeout`, `provider-rejected` and `provider-bad-response`. Each synthesis writes a `voice` line to `logs.db` with the provider, latency and size, never the text or key.

### Local speech service

A Bot can set up a free, offline speech service on the Host computer (macOS or Windows) with the `setting-up-local-voice` skill: one Python script runs SenseVoice (speech to text) and Kokoro (Chinese and English text to speech) on the CPU and answers the OpenAI audio API at `http://127.0.0.1:8790/v1`. The Host never starts or keeps it alive; the Human starts and stops it.

```bash
deepseekbot voice-local-kit --dir ~/BotHarness/voice      # absolute folder; works offline and in a Bot's shell
cd ~/BotHarness/voice && python3 -m venv .venv
.venv/bin/python -m pip install "sherpa-onnx>=1.13.8,<2" numpy
.venv/bin/python botharness_voice.py download   # SenseVoice 166 MB + Kokoro 365 MB
.venv/bin/python botharness_voice.py start      # also: status, stop, serve, selftest
deepseekbot voice-provider-add local
deepseekbot voice-set <bot-id> <provider-id> --voice zf_001
deepseekbot voice-provider-add local --kind asr --language zh
deepseekbot voice-asr-set <bot-id> <asr-provider-id>
```

`voice-local-kit` writes `botharness_voice.py` and prints `{dir, script, baseUrl, models, steps: {macos, windows}}`. On Windows use `py -3 -m venv .venv` and `.venv\Scripts\python`. Each script command prints one JSON line (`ok: false` carries `code` and `message`); `selftest` speaks a phrase and transcribes it back. The `local` TTS preset needs no key and uses Kokoro voices such as `zf_001`, `zm_009`, `af_maple`, `af_sol` and `bf_vale` (the full list is `GET /v1/models`). The `local` ASR preset (`--kind asr`) uses SenseVoice (model `sensevoice`, `zh`, `en`, `ja`, `ko`, `yue`) for Bot calls. When the service is off, `voice-provider-test`, voice messages and transcriptions report `provider-unavailable` with "The local speech service at … is not running".

Tob's scoped CLI accepts `voice-providers`, `voice-provider-test`, `voice-provider-add` (keyless `local` and `custom` presets only, TTS or `--kind asr`, no key option), `voice-provider-remove`, `voice-set` and `voice-asr-set`; writes show the usual approval card. Keyed providers are added by the Human in Settings › Voice.

### Bot calls and speech recognition (ASR Providers)

A paired iPhone can call a Bot whose Host runs on a Mac or Windows computer. The phone sends microphone audio over WebRTC on the paired LAN route or Tailscale (Connect refuses calls with `connect-carrier-required`). The Host finds each sentence with its built-in voice activity detection, which ignores coughs, knocks and other short noise, transcribes it through the Bot's ASR Provider and sends the text to the DM as the Human's message. When the Human stops talking the Host plays a short "嗯" ("Mm-hm" for non-Chinese ASR) at once, without the model. The Bot answers with `voice: true`; when it writes `voice` before `body`, the Host speaks its reply sentence by sentence from the streamed draft, before the message commits. An abandoned or cancelled draft stops at once and leaves nothing behind. The committed reply keeps the sentences that already played as its voice bar, so the archive matches the call; when `voice` comes after `body`, the reply is spoken after the commit instead. The Human can cut in while the Bot speaks: after about 200 ms of speech the Bot's voice drops to 30%, and after about 500 ms (or a short phrase with two real words) it stops and the Human's sentence goes to the DM. Coughs, knocks, short noise, a murmured "嗯" and the Bot's own echo do not interrupt it, and the volume comes back. An interrupted reply keeps only what was heard as its voice bar. While the Bot is busy with an earlier turn the phone shows a hint and nothing is spoken; the turn that the call's own sentence started never shows that hint. Recordings are never stored: each sentence's audio is dropped once it is transcribed.

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

ASR presets are `custom` (any OpenAI-compatible `/audio/transcriptions` endpoint; key optional), `local` (the local speech service above), `openai`, `groq` and `soniox` (streaming over WebSocket; key required, models `stt-rt-v6` and `stt-rt-v5`). `voice-providers` lists them under `asrPresets` and `asrProviders`, and `bot.asr` shows the binding. `voice-provider-test` on an ASR Provider transcribes half a second of silence. `voice-transcribe` reads a 16-bit PCM WAV and prints `{providerId, text, latencyMs}`. `voice-dictate` runs the composer's dictation path without a microphone: it opens a Host dictation session (the Bot's ASR with `--bot`, which is its own binding or else the Host's default ASR Provider; a Provider with `--provider`; otherwise the Host's default ASR Provider, or the first streaming ASR Provider when no default is set), pushes the WAV in 200 ms chunks of 16 kHz PCM, stops it and prints `{id, providerId, mode, state, text, audioMs, heard}`. `mode` is `stream` for a streaming Provider such as Soniox and `segments` when the Host cuts the audio at pauses with voice activity detection and transcribes each piece; `heard` lists the live text as it grew. Sessions live only in memory, end after 15 s without audio or 2 minutes of speech, and at most 4 run at once (`too-many-dictations`). A WAV over 2 minutes is refused with `invalid-input`, a failed recognition exits with the Host's error code, and a session the Host ended early exits with `dictation-cancelled`. `call-readiness` returns `{ready, missing, asrProviderId, ttsProviderId, media, activeCallId, callElsewhere}`, where `missing` names `asr`, `tts`, `bot`, `media-unsupported`, `media-helper-missing`, `media-unavailable` or `local-voice-off` (a `local` Provider's service is not running); the phone's call button shows the same reasons. `call-simulate` opens a synthetic Host call without a phone, plays the WAV (or a timeline of up to 20 `{"at": ms, "file": "/abs.wav"}` steps; a step with `"after": "playing"` starts `at` ms after the Bot next starts speaking, to test barge-in) into it in real time, waits until every heard sentence has a played reply or `--reply-wait` seconds pass, hangs up, and prints `{callId, heard, replies, ackMs, bargeIns, bargeDismissed, firstTextMs, firstAudioMs, answered, events}`. `ackMs` is the time from the end of speech to the acknowledgement, `firstTextMs` the time from the sent transcript to the Bot's first draft text (the model's first token plus the tool-call prefix), and `firstAudioMs` the time to the first reply audio. Each reply lists `replyId`, `messageId`, played `sentences`, `bytes`, `textMs`, `responseMs` and `audioBeforeCommit`. Events include `ack`, `reply-text`, per-sentence `playing`/`played`, `committed` (with `reused` and `synthesized` sentence counts), `reply-stopped` (reason `interrupted` after a barge-in), `reply-done`, and `barge-suspected`, `barge-in` (`by: duration | words`) and `barge-dismissed` (`reason: ended | filler`). Synthetic playback takes as long as each clip lasts. One call runs per Host: the same device replaces its call and another device gets `call-active`; `callElsewhere` says so before dialing. Desktop and Web windows share the Host owner, so each window sends its own `client` id and a second window is refused like a second device. A call ends after 8 seconds without the phone (`connection-lost`); messages already sent stay in the DM. Each call writes `voice` lines to `logs.db` with timings, never audio or transcripts. A WebRTC call also samples its media every 5 seconds: `call-status` shows `perf` with `samples`, `last` (`uplinkPps`, `uplinkKbps`, `uplinkLossPct`, `concealedPct`, `downlinkPps`, `downlinkKbps`, `jitterMs`, `rttMs`, `helperCpuPct`, `disconnects`, `hostCpuPct`) and `{avg, max}` ranges for the whole call; uplink is phone to Host. `disconnects` counts how often the helper saw the WebRTC link drop; the helper gives up on the media link only after 15 seconds without recovery, while the Host still ends the call after 8 seconds without the phone's heartbeat. The same samples go to `logs.db` as `call-media-stats`, with a `call-media-summary` line when the call ends, so an agent can compare packet rates and CPU before and after a change. With `--video` (camera) or `--screen`, call-simulate shares a video file (read with ffmpeg) or a folder of JPEG frames taken at 2 per second: it runs the same keyframe picker as the clients, sends each keyframe as a `frame` command at its time on the audio timeline, and adds `visual: {source, samples, keyframes, sentFrames, frameBytes, pickMs, prepareMs, framePostMs, grids, unchanged, failed}`; each grid lists `frames`, `dropped`, `layout`, `bytes`, `composeMs`, and the `messageId` and `waitedMs` (how long the message waited for the grid after recognition) of the message it was attached to. Events add `visual`, `frame-received`, `grid-built`, `grid-sent`, `grid-unchanged` and `grid-failed`; `grid-built` and `grid-sent` carry the same `grid` number for one grid. A frame still larger than the Host's frame limit after re-encoding is skipped. While the call runs, `call-frame <message-id> <cell>` returns one tile of a grid at its original size: `{messageId, cell, released, cells, source, width, height, bytes}`, plus `out` when `--out /abs.jpg` wrote the JPEG. The cell is the number printed on the tile (a single-frame view is cell 1); a cell outside the grid is refused with `cell-invalid`. The Host keeps the originals behind the newest 64 tiles in memory only, so after the call ends or newer keyframes replace them the result is `{released: true}`. The Bot tool `call_frame` reads the same originals and adds `frame-zoomed` (message, cell, time) to the call's events. `call-simulate --no-save` shares without saving: grids stay out of the DM (the message records `visual.unsaved`) and `call-frame <message-id> 0` returns the whole grid during the call. With saving on, every 16 keyframes while the Human is silent become a frame record, a system message with a 4x4 grid; the report lists them under `visual.records` (`messageId`, `frames`, `layout`, `bytes`, `composeMs`, `fromMs`, `toMs`), `visual.saved` says whether saving was on, and events add `frame-record`. `--share-ends-at <ms>` ends the share at that time on the timeline as the system would (the shared window closed or the camera disconnected): no more frames go out, the call sends `visual off` with `stopped: true`, `visual.shareEndedAtMs` reports when, and the DM gets a `share-stopped` call record that tells the Bot the call went on with voice only. The Mac, Windows and Web call bar does the same when the browser ends a screen share or a camera. `--share-pause <from>-<to>` pauses the share between those times as the phone app does in the background: `visual off` with `paused: true`, then `visual` with `resumed: true`, reported as `visual.pausedAtMs` and `visual.resumedAtMs`, with `share-paused` and `share-resumed` call records in the DM. Frames due during the pause are dropped.

The Host keeps one default TTS Provider (with an optional voice) and one default ASR Provider (with an optional language). A Bot without its own `voice-set` or `voice-asr-set` binding uses them for voice messages, calls, composer dictation, `voice-transcribe`, `voice-synthesize` and `call-readiness`; a Bot binding always wins. `voice-defaults` prints `{defaults: {tts, asr}}`, and `voice-providers` returns the same `defaults`. `voice-default-set` takes `tts` or `asr` and a Provider of that kind, or `off`; `--voice` applies only to `tts` and `--language` only to `asr`. The first Provider of each kind becomes its default when none is set, and removing a Provider clears the default that used it. `voice-vad-set` sets the Host-wide speech threshold in dBFS, clamped to -70 to -20, or `default` (-50). Put `--` before a negative value (`voice-vad-set -- -55`) so it is not read as an option. The Host's voice activity detection counts a sound as speech only when it is louder than this threshold and 12 dB above the background noise, so a lower value hears a quieter microphone. It applies to pause-cut dictation (an ASR Provider without streaming, such as local SenseVoice) and to speech detection in calls; Soniox dictation sends all audio and lets Soniox find sentence ends. `voice-defaults` and `voice-providers` show it as `speechThreshold: {dbfs, custom, defaultDbfs, min, max}`. Settings › Voice has a Microphone test with a live level meter and the same threshold as a slider. Provider names are optional: without `--name` the Host uses the preset name, numbered when it is already taken (`OpenAI 2`). Settings › Voice shows the same defaults at the top of the TTS and ASR sections, and each Bot's Voice panel offers "Use the default" for both.

### Approval Reviewer model

By default each Bot's Approval Reviewer runs on that Bot's own model. One Profile-wide setting can name a single reviewer model for every Bot instead, for example a cheap, fast one.

```bash
deepseekbot approval-reviewer-model
deepseekbot approval-reviewer-model-set deepseek/<model> [--effort <effort>]
deepseekbot approval-reviewer-model-set bot
```

Both commands return `{follows, model}`: `follows` is `bot` (each Bot's own model, `model` is `null`), `model` (the named model is used for every review) or `invalid` (the setting file cannot be read). For a named model they also return `available` and, when it is `false`, `unavailableReason`. A model that is not in the catalog, or whose provider has no working key, is still saved, but every review then posts the ordinary Human card and writes `fallback=model-unavailable` with the reason to `logs.db`; the reviewer never switches to another model on its own. Each review's `approval-review` line in `logs.db` names the `model` and the `reviewSession` it used. When a Bot runs `approval-reviewer-model-set` from its own Shell, the call requires a Human decision or an explicit management-scope saved rule; the model Approval Reviewer cannot answer it. Refusals carry a code: `usage` (no `<provider>/<model>`, or `--effort` with `bot`) and `invalid-input`.

### Concept art

`deepseekbot concept-art` calls the Host bridge method `conceptArt`. `routes` lists saved chat and image instances and the current locks. It does not print keys. `save-route <id> <openai-chat|openai-images> <credentialRef> <model>` stores one model name from the provider's own list on the fixed API base `https://api.apiyi.com/v1`. Pass `--key-stdin` only when that credential reference has no key yet; the key is read from stdin and is not an argument. A later save of the same reference omits the key and reuses the stored credential. `lock-route <chat|concept-art> <instanceId> <model>` switches the lock to a model already on that instance. `status` reports the manual image lock, whether that lock's credential reference is configured, and that the chat model catalog is not this image route. `open <bot>` resolves that Bot's current Host session and does not create a project. `styles <session>` lists style definitions saved for that session's Bot. `generate-style <session> <ref>` reads one style note from stdin, calls the shared chat lock, and stores the definition for that Bot only. `request` reads one JSON object from stdin. `resume` and `cancel` take a session id and the original operation key. `accept <session> <key> <context-version>` reads the stored task. Bytes that parse inside the Host image limits (`MAX_IMAGE_BYTES`, `MAX_IMAGE_PIXELS` from the existing image inspector) return `accept: true` with reason `BYTES_PARSED_NOT_A_RENDER`. `mediaVerified` and `deliverable` stay false: this is not a verified finished picture. The submitted prompt keeps the user's raw text and any selected style definition; a cleared library definition is not appended, and words in the raw text are not deleted. A reference the route cannot carry is blocked. Refusals include `usage` and `invalid-input`.

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

### Idle Compaction

When a Bot's Orchestrator Session has no running turn and no pending Bot Inbox Admission, the Host compacts it through DSH (the `/compact` path) at half its model route's prompt-cache lifetime, never before 15 minutes, so the long history is condensed while the provider can still read it at the cache-hit price. Only Sessions above half of DSH's default automatic compaction threshold for that route are compacted; Assignment and Approval Review Sessions never are. Nothing appears in the chat. The setting is Profile-wide and on by default.

```bash
deepseekbot idle-compaction
deepseekbot idle-compaction-set on|off
deepseekbot idle-compaction-cache-set deepseek/<model> <seconds>
deepseekbot idle-compaction-cache-set deepseek/<model> auto
deepseekbot compaction-threshold-set <ratio|default|keep> <headroom-tokens|default|keep>
```

All three return `{enabled, settingReadable, minimumIdleSeconds, scheduled, routes}`. Each route lists `cacheLifetimeSeconds`, its `source` and `compactAfterSeconds` (`null` when the route is skipped). The lifetime comes from the per-route value set here (`setting`), the model catalog (`catalog`, Anthropic's short tier), the observed gaps before requests that still read most of their input from the cache (`observed`; a warm gap never shortens the default, and a longer cold gap caps it), or 2 hours for DeepSeek routes (`default`); other routes with nothing known are `unknown` and skipped, as are lifetimes under 15 minutes. `idle-compaction-cache-set ... auto` removes the per-route value. Each run is recorded under `idleCompactions` in `deepseekbot bot-activity-history <bot-id>` with the route, idle gap, tokens before and after, and the compaction request's input, cache-read and output tokens. Refusals carry a code: `usage` (a missing `on`/`off`, `<provider>/<model>` or whole seconds) and `invalid-input`.

DSH compacts any Session automatically once its context reaches the smaller of the context window × `ratio` and the window minus the route's output limit minus `headroom-tokens`. `compaction-threshold-set` changes both for every Bot on the Host from the next step: the ratio from 0.5 to 0.95 (default 0.8) and the headroom from 8192 to 262144 tokens (default 65536). `default` restores one value and `keep` leaves it, so `compaction-threshold-set 0.7 keep` changes only the ratio. Idle compaction uses the same threshold. A headroom that leaves no room under a model's context window after its output limit is too large for that model: DSH logs a warning and skips pressure compaction for it, and a model without a declared window keeps the default headroom. `idle-compaction` reports both under `threshold` with `ratioSet`/`headroomSet` and their ranges.

### LAN Bot collaboration

The separate `approval` field retains the previously approved identity even if a nearby Host advertises a different key. It is `null` without an active local approval. Revoke that old approval explicitly; a newly advertised key never replaces it automatically.

Enable the existing encrypted LAN entry on each Host with `deepseekbot device-lan enable --confirm`, then run `deepseekbot bot-lan list`. The response includes this Host's public identity and nearby candidates, their full public-key fingerprints, and separate `discovered`, `admitted` and `identityChanged` flags. `admitted` means this Host has approved that exact key; both Hosts must approve each other before private Bot contacts or DMs become available. Device names and discovery broadcasts grant no access.

Compare the candidate's Host ID and full fingerprint with the other Host's own `bot-lan list` output. Then run `deepseekbot bot-lan admit <host-id> <public-key> --confirm` on each Host. Public keys may be command arguments. All active Bots become eligible through the existing Bot contact and message tools. To withdraw this Host's approval, use `deepseekbot bot-lan revoke <host-id> --confirm`; this also works for a previously admitted offline Host.

Each command returns one JSON document. Refusals include `confirm-required`, `network-host-invalid`, `network-admission-invalid`, `network-candidate-unavailable`, `network-identity-changed`, `network-admission-limit` and `network-admission-unavailable`. The authenticated operator route is `GET`/`POST /api/botharness/devices/lan-bots`; the unauthenticated LAN listener never serves this route. Discovery uses bounded IPv4 multicast advertisements, and candidates expire after 30 seconds without an advertisement. There is no outgoing message queue, automatic resend or reconnect replay. Turning off `device-lan` closes the LAN entry and discovery; it retains the explicit admission records.

### Encrypted LAN phone access

For model-free device-side qualification, `device-pair --link-file <trusted-private-link> --out <new-private-pairing.json> --confirm` runs the same encrypted enrollment as the phone. While waiting, the pairing process writes one `device-key-confirmation-required` JSON status to stderr containing only its public-key fingerprint. In another CLI process, compare all digits with `devices.pendingKeys[].fingerprint`, then approve the matching exact public key with `device-approve-key`; never approve merely by device name or list position. The final stdout contains only Host/device IDs and the output path; keys and credentials go only to the new private file. `device-probe --device-file <private-pairing.json>` then reads the real Host Feed through the mobile connection owner and reports only route kind and roster counts. It sends no DM and requires no model. Never pass a pairing link or device credential as a command argument.

`deepseekbot device-lan enable --confirm` opens the restricted encrypted entry. `device-lan disable` closes LAN sockets and removes the opt-in; it does not revoke devices or disable Connect. Both return one JSON status (`off` or `listening`, with the port). `devices` includes `lan` status and eligible routes. Refusals include `confirm-required`, `lan-action-invalid`, `lan-listen-failed` and `lan-storage-unavailable`. LAN starts disabled; its enabled port survives ordinary Host restart.

Use `device-offer --out <new-private-file>` and `device-approve-key <receipt> <public-key> --confirm` through the existing pairing owner. The installed app scans the trusted computer code and waits for exact phone-key approval. Public keys are safe arguments; links and credentials stay in protected files. See [the LAN contract](architecture/lan-phone-v1.md) for native build and network requirements.

### Phone route (Tailscale)

Bot settings → Devices → Pair a phone shows a three-step guide while a phone cannot reach this Host: install Tailscale, start and sign in, then publish the Host on the tailnet. The last step can run `tailscale serve --bg <port>` for you after a confirmation, or you copy the command and run it yourself. The same two operations from the CLI:

```bash
deepseekbot phone-route
deepseekbot phone-route-publish --confirm
deepseekbot phone-route-disable --confirm
```

`phone-route` returns `{routes}` with Tailscale availability, each route's readiness, the proposed `serveCommand`, and managed enablement/ownership. `phone-route-publish` explicitly enables managed publishing and restart recovery, returning `{published, changed, routes}`. It keeps the Host port and chooses a free publishing port from 443, then 8443–8452; an existing matching publication is reused without taking ownership. `phone-route-disable` turns off recovery and removes only a still-matching mapping created by this owner. It preserves pairings and other routes. Refusals are `confirm-required`, `tailscale-missing`, `tailscale-stopped`, `serve-other-target` (no candidate is free or configuration changed), `serve-needs-enable` (includes the Tailscale admin `enableUrl`), `serve-denied`, and `serve-failed`. A permission or tailnet HTTPS refusal requires the corresponding setup action; changing ports does not fix those refusals.

### Paired devices

Bot settings → Connections lists paired devices, guides new invitations and revokes a device. `device-requests` reads pending receipts, public keys and full fingerprints without running route checks. The same Devices owner from the CLI:

```bash
deepseekbot devices
deepseekbot device-requests
deepseekbot device-offer --out /absolute/new-private-file
deepseekbot device-lan enable --confirm
deepseekbot device-lan disable
deepseekbot device-offer-status <receipt>
deepseekbot device-revoke <device-id> --confirm
```

`devices` returns `{host, devices, routes}`: this Host's pairing identity, every paired device with `id`, `name`, `pairedAt`, `lastSeenAt` and `revokedAt` once revoked, and the phone routes as `phone-route` reports them. Device credentials are never listed. `device-offer` opens a one-time offer for 10 minutes and writes its `deepseekbot://pair?…` link only to `--out`, a new file created with mode 0600 (an existing file is refused with `output-exists` before any offer opens); stdout carries `{receipt, expiresAt, routes, reachable, link: {path}}`. Open the link on the phone, or pair from the QR code in Devices instead; `device-offer` refuses without `--out` (`out-required`). The receipt names the offer without being able to redeem it. `device-offer-status` returns `state`: `pending` with `expiresAt`, `redeemed` with the new `deviceId`, `expired`, `refused` (a redemption with the wrong verifier used it up), `superseded` (more than 16 offers were open) or `unknown`; offers live in Host memory, so every receipt is `unknown` after a Host restart. `device-revoke` returns `{revoked, closedStreams, device: {id, name}}`; the device's next request is refused with `device-revoked` and its open streams close at once. Refusals: `confirm-required`, `device-unknown`, `device-already-revoked`, `receipt-required` and `usage`.

### Connect a selected browser Client

Keep the target browser open. `connection-clients` lists registered Clients on the serving Host; select the intended `id` explicitly. Prepare an invitation on the Remote Host with `device-offer --out <private-file>`, then securely place that file on the CLI machine. Links never belong in arguments, chat or stdout.

```bash
deepseekbot connection-clients
deepseekbot connection start --client-id <id> --connection-id <attempt> --link-file /absolute/private-link
deepseekbot connection status --client-id <id> --connection-id <attempt>
deepseekbot connection confirm --client-id <id> --connection-id <attempt> --fingerprint '<full Host fingerprint>' --confirm
deepseekbot connection cancel --client-id <id> --connection-id <attempt>
```

`--link-file -` reads stdin. Compare the full Host fingerprint independently before confirming. When status is `approve-device`, compare the displayed device fingerprint on the Remote Host and approve its exact pending receipt/public key using `device-approve-key`. Poll status until `connected`: `saved: true` alone is insufficient; the selected Client must read the Host Feed. An empty Channel list is valid. Credentials stay in that browser's origin-local storage; other Clients receive no enrollment.

States are `connecting`, `verify-host`, `approve-device`, `connected`, `failed` and `cancelled`; failures include a coded `code`. Reusing an attempt ID with the same link reads the existing attempt; a different link is refused. Up to 16 attempts are retained for the mounted Client control session. An accepted attempt lasts at most five minutes. Closing/reloading the Client or losing its relay registration cancels unfinished enrollment. Expired commands cannot start an attempt. Cancellation after `saved: true` keeps the already saved Remote Host; remove it explicitly if desired. Offline/stale targets refuse instead of saving in the CLI or Host. This command does not authorize Tob to compare identities or approve devices.

### Models, usage and activity

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

`model-preset-create` also accepts `--plan-stdin` against an online Host, with only `{"assignmentModels":[...]}` in stdin, to preserve allowed models, reasoning efforts and notes when creating a preset. Creation and update forward the complete policy through the same Host bridge as the mobile editor; neither silently reduces it to the default model.

`model-catalog` lists the models the Host can run and the Profile default, as the model pickers do. `model-plan-set` replaces a Bot's whole plan with stdin `{"orchestrator":{...},"assignmentDefault":{...},"assignmentModels":[...]}`; `model-plan-assignments-set` takes the same object without `orchestrator`. A route is `{"provider","model","reasoningEffort"?}` and an Assignment model is `{"provider","model","allowedEfforts":[...],"defaultEffort","note"?}`. `model-plan-customize` changes only the Bot’s Orchestrator, creating an independent override if necessary while preserving fixed or inherited Assignment settings. `model-plan-inherit` drops the Bot's own model so it follows the Profile default. `model-preset-update` changes a preset's name or routes; flags you leave out keep the current values, and an optional `--plan-stdin` `{"assignmentModels":[...]}` replaces its Assignment models. The Host validates every route against its catalog. Plan and preset writes check a revision: `--expected-revision` makes that check explicit; without it the command reads the current revision first, like `memory-save` does with `--expected-head`. A plan changed meanwhile fails with the Host's `invalid-input`.

The online Human CLI accepts `home-model-set --orchestrator-effort` and `--expected-revision`; the latter names `model-catalog.defaultRevision`, or the command reads the current default revision when omitted. `model-preset-apply` accepts `--expected-revision` for the Bot plan and `--preset-revision` for the preset; omitting these retains the existing Human behavior. Scoped Tob calls require the corresponding explicit revisions and cannot omit them to bypass the reviewed snapshot.

`overview-usage` (`--period today|week|month|quarter`; `month` is the last 28 days and `quarter` the last 84, default `today`) and `overview-memory` return the Overview page's per-Bot rows; pass `nextCursor` back as `--after` for more. In `overview-usage`, each bucket is the sum of what providers reported and is `null` only when nothing in it was reported; `partial: true` on the totals, a day or a Bot means some usage in it went unreported, so its `totalTokens` is a lower bound. `activity-overview` shows what every Bot is doing and `channel-activity-today` today's messages per Channel. The `bot-*` readers address a Bot by id and read the Profile panels through its DM: `bot-usage` needs a non-future `--start`/`--end` range shorter than 182 days, `bot-session-usage` groups usage by Session and Assignment, and `bot-activity-history` returns the activity calendar (`--weeks` 1–104). `group-activity` takes a group Channel id. In `bot-activity-history`, a model row’s `totalTokens` retains the reported lower bound with `partial: true` when other calls are unreported; fully unreported usage stays `null`. The strict `bot-usage` query retains its existing unknown-total semantics.

### Marketplace, releases, usage statistics, Git and pairing review

Marketplace browsing in the Client defaults to most stars and remembers the chosen sort in this browser. `--sort stars` orders by stars, last update, creation time, then repository ID (all descending); pagination preserves this order. The CLI does not read browser preferences.

`marketplace-sections` returns the Market panel's Hot, New and Rising rows from the Worker's latest daily snapshot as `{ sections: [{ section, day, entries: [{ bot, score }] }] }`. `score` is the installs in the last 7 days for Hot, 0 for New and the 7-day growth for Rising; `day` is `null` before the first snapshot.

`marketplace-digest` returns the latest daily Marketplace Digest (the article at the top of the Market panel), or the one for `--day`, as `{ digest: { day, lang, title, lede, sections: [{ heading, body, bot }] } }`; `bot` is `null` when the listing has since been hidden. It answers `digest-not-found` when no digest exists. `marketplace-digests` lists past digests newest first as `{ digests: [{ day, lang, title, lede, picks: [{ id, displayName, banner, avatar }] }] }`; `picks` are up to four Digest Picks still listed, in article order, and stderr prints one line per digest with its date, title and pick names. Both prefer `--lang` and fall back to the other language for a day written only in that one.

These commands call the same Host methods as the Marketplace page, the update card, the usage statistics notice, the Git prompt and the IM pairing panel:

```bash
deepseekbot marketplace-list [--query <words>] [--topic <topic>] [--sort updated|created|stars] [--lang zh|en] [--cursor <next-cursor>] [--include-uploads]
deepseekbot marketplace-topics
deepseekbot marketplace-sections [--lang zh|en]
deepseekbot marketplace-digest [--day YYYY-MM-DD] [--lang zh|en]
deepseekbot marketplace-digests [--lang zh|en]
deepseekbot marketplace-detail <owner/repo> [--lang zh|en]
deepseekbot marketplace-file <listing-id> <path>
deepseekbot marketplace-submit https://github.com/<owner>/<repo>
deepseekbot marketplace-report <owner/repo> [--reason <text>]
deepseekbot marketplace-account
deepseekbot marketplace-author --name <display name> [--accept-terms]
deepseekbot marketplace-author-avatar (--file <image> | --clear)
deepseekbot marketplace-upload-plan <bot-id>
deepseekbot marketplace-upload <bot-id> --name <name> [--description <bio>] [--role <tag> ...] [--replaces <listing-id>] --confirm [--timeout <seconds>]
deepseekbot marketplace-mine [--lang zh|en]
deepseekbot marketplace-delete <listing-id> --confirm
deepseekbot marketplace-install <listing-id> [--lang zh|en]
deepseekbot marketplace-install <listing-id> --review <review-id> --confirm [--operation-key <key>]
deepseekbot share-draft-start <bot-id>
deepseekbot share-draft-show <bot-id>
deepseekbot share-draft-file <bot-id> --path <file path>
deepseekbot share-draft-decide <bot-id> --path <file path> (--keep | --drop | --rewrite-stdin)
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

`release-check --force` bypasses the Host check cache. `available` includes native DSH compatibility and may expose `blockedLatest` when a newer release is incompatible; `blocked` carries incompatible requirements or an unknown-runtime/metadata reason. Compatibility covers the exact Bundle, first-party components and its pinned IM Provider using the running DSH evaluator. Installation rechecks metadata and still uses the native Plugin Manager for final admission. A cached/offline failure is never “up to date”.

`release-info` includes an optional Host-owned `identity`: `development` with source revision/dirty state, `release` with version, or `unknown` with a metadata/composition reason. Old Hosts omit this field; absence is not verified release identity. The internal source version placeholder remains `0.0.0`; About displays source identity instead. `release-check` can return `unknown`; install/restart then refuse with `release-identity-invalid`. Installed/staged and running versions remain separate until the new Host answers with the exact target version.

`plugin-check`, `plugin-install` and `plugin-restart` are the **Bot settings → Plugins** page. They cover installed `@botharness/*` plugin Bundles other than `deepseekbot`, such as `@botharness/vrm-companion`. `plugin-check` returns `installable`, `restartable` and one entry per plugin with `status` `current`, `available`, `blocked`, `restart-required`, `development` or `unavailable`; `--force` bypasses the six-hour check cache. Compatibility uses the running DSH evaluator on that plugin's registry manifest. `plugin-install <package> <version> --confirm` rechecks compatibility, installs through the native Plugin Manager and falls back to the registry tarball when the Manager refuses an installed name; `applied: true` means the Host loaded it already and only the page needs a reload. Otherwise `plugin-restart --confirm` restarts the Host to finish every staged plugin update. Failures exit non-zero with `plugin-<reason>`, such as `plugin-incompatible`, `plugin-unknown-plugin` or `plugin-not-pending`.

`--lang zh|en` asks for listings in that language, as the Marketplace page does in the interface language: the name and bio come from the author's `bot.json` `i18n` translation, then a bio already in that language, then the Marketplace's generated summary (`descriptionGenerated: true`); `marketplace-detail` returns the repository's README in that language and names it in `readmeLanguage`, else `README.md`: for `zh` it takes `README.zh-CN.md`, then `README.zh.md`, then another spelling such as `README_CN.md` or `README-zh.md`; for `en` it takes `README.en.md`. `marketplace-submit` and `marketplace-report` first solve the Host's proof-of-work challenge, as the Web page does, so they can take a few seconds; the Marketplace's own refusals (`repository-missing-topic`, `rate-limited`, …) come back as the error code. A report reason is at most 500 characters. `release-check` returns the update status (`current`, `available`, `restart-required`, `blocked`, `development`, `unknown` or `unavailable`). `release-install` and `release-restart` need `--confirm`; a failed install or restart exits non-zero with `release-<reason>`, such as `release-network` or `release-not-pending`. Restarting stops every running Bot turn, so do it only on a Host you own. `pairing-list` shows a Bot's pairing requests and its roles; `pairing-review` reads the current revisions itself, so a request that changed in between is refused instead of overwritten. Approve with one `--role` for a conversation request or with `--capability` for a management request.

**Uploaded Bots** ([ADR-0267](adr/0267-the-bot-marketplace-hosts-uploaded-bots-under-connect-accounts.md)) sit in the same catalog as GitHub repositories. `marketplace-list --include-uploads` adds them; each entry carries `source` (`github` or `upload`) and, for uploads, `author` (`name`, the immutable Author `id` that tells same-named authors apart, and the `avatar` image URL or `null`). `marketplace-detail` of an Uploaded Bot also returns its `files` (`path`, `size`, `kind`: `text`, `script` or `image`) and a `fileSummary`: `count`, `size` and `types`, the count and bytes per type (`markdown`, `text`, `data`, `script`, `image`), largest first. `marketplace-file <listing-id> <path>` reads one text file as `file` (`path`, `size`, `type`, `text`): Markdown comes prepared and sanitized like the README, with relative links pointing at the Bot's files; scripts and other text come verbatim and are never prepared as Markdown. An image is refused with `file-not-text`, a path that is not listed with `file-not-found`. Uploading needs this Host signed in to Tobs Connect (Settings → Devices); `marketplace-account` shows `signedIn` and the `author`, the signed-in account's **Account Profile** (`name`, `id`, `avatar`, `termsAcceptedAt`), `null` until `marketplace-author --name <name>` creates one; later calls rename it everywhere, including its listings. The first upload also needs the terms, accepted once with `--accept-terms` (`author-required` until then). `marketplace-author-avatar --file <image>` sets the profile avatar from a PNG, JPEG or WebP of at most 1 MB (`avatar-type-refused`, `avatar-too-large`), served publicly and shown on the author's listings; `--clear` removes it. `marketplace-upload-plan` lists the files an upload would include and the ones it skips (`file-type-refused` for binaries and archives, `file-too-large` over 5 MB). `marketplace-upload` publishes the Bot's ready Share Draft, without Git history, under the given name, bio and tags, and needs `--confirm`: the files become public. A Bot that runs it from its own Shell always gets a Human approval card, even with full access. Refusals are coded: `sign-in-required`, `author-required`, `too-many-files` (over 2,000), `too-large` (over 50 MB), `bot-limit` (20 per account), `nothing-to-upload`, `share-draft-required` (no draft yet), `share-draft-not-ready` (a file still has no decision). `marketplace-install` works for both kinds of listing in two steps. First `marketplace-install <listing-id>` stages the files (an Uploaded Bot's files, or the GitHub repository at the commit the catalog indexed, `listing-not-installable` when it has none), has Tob review them with Tob's model and prints `reviewId`, `review` and `installed: false`; it creates nothing. `review.status` is `reviewed` with `findings` (`kind`: `prompt-injection`, `exfiltration` or `script`, the `path`, an optional `note`), `files`, `read` and `partial` when some text was too long to read in full, or `unavailable` with a `reason` (`no-model`, `model-unavailable`, `llm-unavailable`, `timeout`, `model-error`, `unparseable`) when Tob could not review; script files are listed either way. `--lang` picks the language of the notes. Then `marketplace-install <listing-id> --review <review-id> --confirm` installs exactly those staged files (or that commit) as a fresh Bot with the listing's name, bio and tags and one initial commit, returning the new `bot`, its `channelId`, the `listing` and `installed: true`; a review is kept for 30 minutes (`review-expired` after that, `review-mismatch` for another listing), and retrying with the same `--operation-key` returns that Bot instead of installing twice. After the Bot exists, the Host sends one **Install Receipt** keyed by a random marketplace-only Host identifier (`marketplace-host.json` in the Host data folder, never the Telemetry install id); each Host counts once per entry, a failed install sends nothing, and every entry in `marketplace-list` and `marketplace-detail` carries `installs`.

A **Share Draft** is what uploads and GitHub pushes read; the source Memory is never changed. `share-draft-start` copies the Bot's shareable Memory files (the same ones `marketplace-upload-plan` would include) into the Host's own data folder and replaces any earlier draft. `share-draft-show` returns the draft's `state` (`reviewing` or `ready`), a `summary` of counts, and each file's `path`, `kind`, `size`, `status` (`pending`, `kept`, `rewritten` or `dropped`) and `flags` (`secret`, `private-key`, `url-credential`, `email`, `phone`) found by a pattern scan. `share-draft-file --path` returns a text file's current draft text. `share-draft-decide` records one decision: `--keep`, `--drop` (removes the draft copy) or `--rewrite-stdin` (the whole new text, at most 5 MB). Any decision puts a ready draft back to `reviewing`. `share-draft-finish` marks it `ready` once no file is `pending` (`share-draft-pending` names the first one). `share-draft-export` copies a ready draft into a fresh folder in Tob's workspace with no `.git` and returns its `path`, for a GitHub push. `share-draft-discard` deletes the draft. Tob's scoped CLI has `share-draft-show`, `share-draft-file`, `share-draft-decide` and `share-draft-finish` for a draft the Human started; starting, exporting and discarding stay with the Human.

`marketplace-mine` lists the signed-in author's own Uploaded Bots, newest first, each as `{ bot, files, bytes, blocked }`; `blocked` ones are hidden from everyone else but can still be updated or deleted. `marketplace-upload --replaces <listing-id>` replaces all files of one of them with the Bot's current Memory files: there are no versions, the listing keeps its id, the new files become visible only once all are stored, then the old ones are deleted. At most 10 replacements per hour (`replace-limit`); a replacement does not count toward the 20 Bots. `marketplace-delete` erases the listing, its files and counts and needs `--confirm`; like `marketplace-upload`, a Bot running it from its Shell always gets a Human approval card. Installed copies are never touched: an entry from `marketplace-list` or `marketplace-detail` that this Host installed carries `installed` (`bots`, the installed Bot ids, and `authorUpdated`, true once the author replaced the files after an install). Deleting the Connect account also deletes all its Uploaded Bots and its author.

### Clear all BotHarness data

```bash
deepseekbot data-reset-preview
printf '%s' '{"token":"<preview.token>"}' | deepseekbot data-reset-confirm --confirmation-stdin --confirm
```

This is the CLI form of **Settings → Data & privacy → Clear all BotHarness data**. `data-reset-preview` lists exactly what a reset removes: `targets` names each existing folder (`data` is `$DSH_HOME/botharness`, with the database, Bots, Memory in its default place, attachments, channel files and workspaces; `im-settings` is each bundled IM Provider folder under `$DSH_HOME/integrations`; `local-tools` is `~/.botharness`, such as the computer driver), with its size and file count. `kept` lists what stays: DSH's own `$DSH_HOME/.credentials.yaml`, every Memory folder a Human chose for a Bot (kept even when it sits inside a removed folder) and the `BotHarness Exports` folder. The token lasts ten minutes and only for that exact scope; a new Bot, a moved Memory folder or an expired token refuses with `data-reset-preview-stale`, so preview again.

`data-reset-confirm` needs `--confirmation-stdin --confirm`. It stops BotHarness writing, records the reset in `$DSH_HOME/botharness-reset.json` and returns `{reset:{status:"restarting"}}`: the folders are removed when the old Host exits, before it starts again. When the Host cannot restart itself it returns `restart-required`; Bots stay stopped and the removal finishes at the next Host start, including after the plugin is reinstalled. DSH sessions, DSH settings and other plugins stay. Only the Host owner can run it; it is not a Bot tool.

### Storage space

```bash
deepseekbot storage-usage
deepseekbot storage-cleanup-preview --older-than-days 90 [--chat <channel-id> …] [--media image|video|audio|file …] \
  | deepseekbot storage-cleanup-confirm --confirmation-stdin --confirm
```

This is the CLI form of **Settings → Data & privacy → Storage space**. `storage-usage` returns `totalBytes`, `parts` (`media` is the attachment folder, `messages` the operational database, `memory` every Bot's Memory folder, `other` the rest of `$DSH_HOME/botharness`) and `chats`, largest media first, with each chat's `messages`, `oldestAt`, `mediaBytes` and per-kind `media` totals.

`storage-cleanup-preview` takes exactly one of `--before <ISO time>` or `--older-than-days <n>`, optional repeated `--chat` (default: every chat) and `--media` (default: all four kinds). It returns the files and bytes it would clear, `freedBytes` (files nothing else still uses), per-chat and per-kind totals, `kept` counts (`bot-working`, `delivery-pending`, `memory`, `migration`) and a ten-minute `token` with its normalized `scope`. Pipe that JSON into `storage-cleanup-confirm --confirmation-stdin --confirm`; a changed selection or an expired token refuses with `storage-preview-stale`, so preview again.

Clearing keeps every message and its text: each cleared attachment becomes a `clearedAttachments` entry (name, type, size, time) and its file is deleted when nothing else references it. Media mirrored from IM apps and Bot Memory are not touched. A Profile Backup taken earlier still holds the files.

```bash
deepseekbot storage-messages-cleanup-preview --older-than-days 365 [--chat <channel-id> …] \
  | deepseekbot storage-messages-cleanup-confirm --confirmation-stdin --confirm
```

`storage-messages-cleanup-preview` deletes whole messages instead: it takes the same `--before` / `--older-than-days` and `--chat`, but not `--media`. It returns `messages`, `bytes` (their text), `files` that go with them, `chats` with a count each, `kept` counts (`bot-working`, `delivery-pending`, and `shared` for a message that also sits in a chat you did not pick), `memoryReferences` (Bot Memory that mentions them; Memory is not changed), `more` when over 2,000 messages match (clear again afterwards) and a ten-minute `token`. `storage-messages-cleanup-confirm` runs it through Content Purge: each message keeps its place as a tombstone with no text or files, Bot work started from it stops, and its files are deleted when nothing else uses them. It returns `messages` and `freedBytes` measured in the database after it is compacted. A changed selection or an expired token refuses with `storage-preview-stale`.

## IM application authorization

Use the same live Host authentication described above. `im-apps` discovers compatible Feishu and WeChat flows; it does not expose account credentials. The isolated development launcher can install the qualified Provider with `--im-provider`.

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

Feishu credential stdin is JSON with exactly `appId`, `appSecret` and `domain` (`feishu` or `lark`); app IDs start with `cli_`. Keep input files private, or feed stdin directly from a secret manager. WeChat returns a nonsecret `authorization.qrDataUrl` PNG and `next` prompts: display the data URL, scan and confirm it on a phone, then poll the returned `attemptId`. If the state is `needs_verification`, submit the 4–8 digit phone code through stdin. Neither secret belongs in a command argument or chat transcript.

The Provider owns attempts and native accounts. Attempts last at most ten minutes and do not survive Host restart; the Provider QR can expire sooner, so use the returned state and expiresAt. `--wait` stops at `ready`, `credentials` or `needs_verification`; on `authorization-timeout`, poll the same attempt again. Completed output includes the native account reference, fingerprint and actual connection status. `setup-expired` requires a new attempt; terminal states fail `authorization-expired`, `authorization-failed` or `authorization-cancelled`. Cancellation acknowledges the attempt and does not revoke an already authorized account. A failed start without an attempt ID has an unknown outcome: inspect Provider status before retrying.

IM application authorization does not choose a PersonaBot or create a conversation Grant. `pairing-status` polls this Provider attempt; `pairings <bot-id>` lists the Bot's administrator pairing requests. Provider locality checks can be stricter than the CLI's tailnet carrier. See [ADR-0161](adr/0161-cli-im-authorization-keeps-provider-attempt-authority.md).

## Machine contract

`send` waits until the request is handled before returning its committed replies, so sequential commands do not steer a still-running previous turn. Concurrent same-Bot sends retain the Host's DM delivery policy; a handled request with no attributable reply fails honestly. To repeat the live soak on an isolated, model-authorized QA Bot, run `node scripts/e2e-cli-live.mjs --launch <private-launch.json> --bot <id> --rounds 8 --interval-seconds 30 --output <private-report.json>` after `pnpm build`. Use interval `0` to verify immediate sequential sends.

Stdout carries exactly one JSON document. Success exits 0:

```json
{
  "bot": { "id": "bot-…", "name": "…" },
  "dm": { "channelId": "dm-bot-…" },
  "dataDir": "<dsh-home>/botharness/bots/bot-…/memory",
  "steps": [{ "name": "create-bot", "status": "ok" }],
  "next": ["Open DM dm-bot-… in the DSH web client …"]
}
```

Failure exits non-zero with `{"error": {"code", "message"}}` using a stable code (`usage`, `secret-in-argv`, `bad-zip`, `bad-bundle`, `bad-ref`, `bad-credentials`, `unknown-preset`, `unknown-bot`, `unknown-channel`, `unknown-schedule`, `duplicate-preset`, `git-not-found`, `git-clone-failed`, `git-clone-timeout`, `memory-unavailable`, `memory-conflict`, `memory-unknown-commit`, `not-found`, `invalid-grant`, `locked`, `inactive`, `limit-reached`, `lease-unavailable`, `invalid-input`). Human-readable lines go to stderr only, so stdout stays parseable in both cases. Stdout JSON is pretty-printed by default; `--compact` condenses it to one line. `search` finds commands by words against the same verb table the CLI dispatches.

## Identity

The bot name is a label; identity is the id. Without an operation key, every create mints a new bot, so reusing a name returns a second bot and still exits 0. A stable online operation key instead reconciles its original identity.

## Secrets

Never pass secrets as arguments: any `--api-key` / `--token` / `--secret` / `--password` style flag is a hard error (`secret-in-argv`). Model keys and tokens travel in the environment (for example `DEEPSEEK_API_KEY`, `GITHUB_TOKEN`) or a stdin pipe (`--persona-stdin`); result JSON never contains secret values.

`secret-put <NAME>` reads the value from stdin only and writes that entry under top-level `refs:` in `$DSH_HOME/.credentials.yaml`, keeping every other byte intact; a backup is taken first and the write is re-read before it counts. `secret-list` reports names, sources, and writability, never values. `secret-unset <NAME>` deletes the entry. Malformed stores and wide-open file modes fail coded (`bad-credentials`). See ADR-0158.

## Models

Without `--preset`, creation still succeeds and the `model` step reports `no-model-yet`: authorize a model in Bot-mode Settings, then message the Bot to verify a live reply. With `--preset <model-preset-id>`, that preset is applied at creation; an unknown id fails with `unknown-preset` before any bot is minted.

The model verbs manage the same records afterwards: `model-presets` lists the profile presets, `model-preset-create` mints one from explicit provider/model routes, `model-preset-apply` puts it on a Bot, and `model-plan` shows the active plan. Routes are shape-checked plus provider-existence-checked offline (unknown providers fail fast); catalog liveness and readiness inspection stay Host-side, so `model-plan` reports readiness deferred. See ADR-0157.

## Lifecycle and human naming

`pause` and `resume` gate a Bot's execution; `update` relabels it (`--name`, `--description`, `--role`, within the profile tag/bio limits). `human-name-set` writes the Human display name (`--clear` resets it) and `channel-human-name-set` writes the per-channel Human nickname, using the CONTEXT.md terms. Unknown bots and channels fail coded (`unknown-bot`, `unknown-channel`).

## Channels, grants, schedules, pairings

`channels` lists channels and `channel-messages` reads one page newest-first (`--limit`, `--before`). `grants` lists a Bot's workspace grants while `grant-revoke` and `grant-write-set` manage them; creating a grant needs the Host workspace registry and stays a Host-side action. `schedules` lists a Bot's schedules; `schedule-create` takes `--title`, `--prompt`, and exactly one trigger (`--every` seconds, `--daily`/`--weekly` time plus `--weekdays`, `--once-date` plus `--once-time`, or `--cron`), with `--timezone` required for calendar triggers; `schedule-update`/`schedule-delete`/`schedule-history` address a schedule by `--sid`; `schedule-run-now` records a manual firing that the Host executes on start; `schedule-preview` renders upcoming occurrences for a trigger without a bot. `pairings` lists a Bot's IM pairing requests. Missing schedules fail `unknown-schedule`; deleting one reports `removed`.

### Approve one Workspace request online

```bash
deepseekbot inbox --category action --bot <bot-id>
deepseekbot workspace-options
deepseekbot grant-request-approve <bot-id> --channel <channel-id> --request <message-id> --workspace <workspace-id> --confirm
deepseekbot grants <bot-id>
```

`grant-request-approve` uses the same Owner-only Host command as the Web request card. The Host commits persistent read/write authority and the Grant-linked resolution together before continuing the original task through its existing Inbox. It also upgrades an existing read-only Grant after this explicit confirmation. Repeating the same approved request reads back the existing decision; it does not create another Grant or wake. A revoked or changed target is refused. An old tool approval is not a Workspace request: use this command rather than `tool-approval-decide`. Missing `--confirm` is `usage`; unavailable or stale authority returns a coded refusal. This is an online command, not an offline database repair.

### Browse Host folders

```bash
deepseekbot folder-browse
deepseekbot folder-browse 'D:\code'
deepseekbot folder-browse 'D:\code' --offset 500
```

`folder-browse` lists the subfolders of one Host folder, the same way the desktop Workspace Grant browser does, and the phone picker does when the computer uses the system folder dialog. With no path it starts at the Host home. It returns `{path, home, crumbs, entries, truncated, nextOffset?, roots, nativePicker?}`: folder names and paths only, never files, at most 500 per page. While `truncated` is true, pass `nextOffset` back as `--offset` for the next page. `roots` holds the home folder and the drives (Windows, read from the OS drive table without opening any drive) or `/`. `nativePicker: true` means the Host shows the system folder dialog, so the desktop Client opens that instead of this browser. The Host reads folders in a separate process with a 5 second deadline. A relative path fails `folder-browse/invalid-path`; a missing, non-folder or unreadable path fails `folder-browse/not-found`, `folder-browse/not-directory`, `folder-browse/denied` or `folder-browse/unreadable`; a folder that does not answer in time (for example a disconnected network drive) fails `folder-browse/timeout`. Browsing grants nothing: register the chosen path and grant it as above.

## Memory

`memory-snapshot`, `memory-file --path`, `memory-history [--limit]`, and `memory-diff --sha` read the Bot memory store; `memory-save --path (--body | --body-stdin)` writes one file and commits it. `--expected-head` defaults to the current HEAD (pass it explicitly for compare-and-swap); `--edit-id` defaults to a fresh UUID and makes repeat submissions idempotent. A stale head or a no-change write fails with `memory-conflict`, a missing file reads back `null`, and malformed shas fail `invalid-input`.

With a live Host selected, the same commands go through the Host's Memory owner instead of the local store, and `memory-save` then requires `--expected-head`. The live Host also offers the rest of the Memory panel:

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

`memory-graph --path` lists only the commits that touched that file, as the app's Memory file **History** does.

Writes and restores always name the head or checkpoint they expect, so a concurrent change fails with `memory-conflict` instead of being overwritten; `--restore-id` and `--repair-id` default to fresh UUIDs and make a retry idempotent. A restore records a checkpoint first, which `memory-checkpoints` lists.

To move a Bot's Memory repository to another folder, or back to the default one:

```bash
deepseekbot memory-move <bot-id> --memory-location <absolute-dir>
deepseekbot memory-move <bot-id> --default-location
```

The repository moves to `<absolute-dir>/<bot-id>`; the folder must already exist and must not already hold that Bot. The Bot's main session is archived first, so its next turn starts a new main session in the new folder; history, Memory commits and assignments stay. The move is refused with `bot-busy` while the Bot is working, `invalid-memory-dir` for a missing or occupied folder, and `memory-conflict` while a Memory repair is unfinished. Across drives the files are copied, checked against the original HEAD, then the old folder is removed; a `leftover` path in the result names an old folder that could not be removed.

## Home and Tob

`deepseekbot tob-home` prepares/reuses the protected local Tob identity, Memory, managed Workspace and DM, returning their IDs and the canonical attention summary. It does not send a message. `deepseekbot home-model-set --provider <id> --model <id>` updates the native Host default; independent Bot plans remain unchanged.

Tob uses the normal native bash/pwsh Tool to call `deepseekbot`; the dedicated `tob_assignment_limit_read` and `tob_assignment_limit_set` Tools and their direct-runner entries are removed. Existing Assignment Tools are unchanged. The scoped journey supports the Bot creation/profile/lifecycle, group creation/invitation, group settings/member removal, invitation cancellation/join decisions, model, runtime, privacy, Git and update operations listed below; it is an explicit allowlist, not blanket access to every Human CLI command or other Bots' data.

Tob's Host-supplied system guidance is bundled with the plugin and is installed only for the protected Tob Orchestrator; upgrades do not overwrite the Human's editable personality or Memory. A simple question such as “What can you do?” first discovers the installed CLI capabilities, then describes practical outcomes in the Human's language and offers a concrete next step. Capability questions are read-only: they do not propose a mutation or approval. A later specific change request still goes through the existing authority and approval checks.

The npm Bundle ships the core CLI module and product CLI entry. Tob uses a managed executable injected into its eligible Shell environment; it does not depend on a global `deepseekbot`, a source checkout, or manually copied skill files. Missing packaged CLI entries fail release verification; an unavailable runtime CLI is reported rather than replaced with an administrative fallback.

Inside an eligible Tob Shell execution:

```bash
deepseekbot capabilities
deepseekbot settings botharness-client
# Use the previous value and revision returned by the read, not these example values.
printf '%s' '{"assignmentConcurrencyLimit":3}' | deepseekbot settings-set botharness-client --patch-stdin --expected-revision 12 --previous-value '{"assignmentConcurrencyLimit":8}'
```

`capabilities` (also scoped `--help`) reports supported commands, fields, required review inputs and coded refusals. The read returns `{scope, ns, revision, value}`; `value` contains only the allowed fields. The write goes through existing Host approval policy for the parsed namespace, previous value, proposed value and revision. It rechecks the actual Tob root Orchestrator and the exact accepted Human DM source before and after approval and at execution, then reads back the native Settings value. Group/IM requests, Bot-originated input, Assignment Sessions and caller-supplied identities cannot grant this authority.

The Host supplies an ephemeral loopback endpoint and scoped token to this Shell's child environment. This is a short-lived bearer capability, not a Human administrator credential or an isolation boundary against the same OS user; do not print or persist it. It expires when the Shell finishes, aborts or is disposed. Unsupported commands/options, incomplete scoped context and attempts to select another Host, token or offline home refuse rather than falling back to Human/offline access. `stale-setting` requires a new read and proposal; `agent-write-uncertain`, `setting-outcome-uncertain` and `setting-readback-mismatch` require read-back before any retry. A fresh Shell execution is required after context expiry.

Authenticated Human `settings-set` keeps its existing behavior. It additionally accepts the paired `--expected-revision` and `--previous-value` flags to apply a previously reviewed patch; the latter is a JSON object with the same fields as the patch. Omitting both retains the existing read-then-write flow. Tob deletion/archiving still refuses with `protected-bot`.

The [UI/CLI coverage inventory](agents/cli-ui-coverage.md) distinguishes existing Human commands from scoped Tob access and tracks the remaining coverage work. See [ADR-0224](adr/0224-tob-management-uses-scoped-native-shell-cli.md) for authority and lifecycle boundaries.

### Tob Bot creation, profiles and lifecycle

`create` in scoped Tob execution makes a blank Bot in managed Memory storage. A name is the only required user choice; Tob supplies a stable `--operation-key` for the operation. Optional `--description`, repeated `--role` tags, `--avatar-file`, `--persona` / `--persona-stdin`, and `--core-memory` / `--core-memory-stdin` reuse the existing creation validation. Only one content option may consume stdin. Initial personality and Memory become `SOUL.md` and `MEMORY.md`; no unrelated Workspace Grants or credentials are copied.

```bash
deepseekbot create --name Translator --operation-key create-translator-001 --persona 'Translate clearly.' --core-memory 'Prefer concise explanations.'
deepseekbot show <bot-id>
deepseekbot update <bot-id> --expected-profile <profileFingerprint> --name Translator --description 'Translation assistant' --role translator
deepseekbot pause <bot-id> --expected-profile <profileFingerprint>
deepseekbot resume <bot-id> --expected-profile <profileFingerprint>
```

The Host reserves one identity in its durable creation receipt before creating the Memory Repository and DM. After a lost response, repeat the **same operation key and same payload**: an existing completed receipt returns that Bot and DM, while a partially completed operation reconciles the reserved identity. A completed scoped retry performs a checked read instead of another creation approval. A changed payload refuses with `creation-key-conflict`; an archived or deleted identity refuses with `creation-identity-unavailable` and is never recreated by replay. `creation-memory-conflict` means the reserved folder exists without its Registry identity: preserve it for repair rather than deleting it or trying a new key. Receipt-backed creation is not a filesystem/database transaction and does not promise automatic repair of that interrupted state.

The authenticated Human online `create` also accepts `--operation-key` for blank creation or an inspected Git source in managed Memory, without `--preset` or a custom Memory location; apply a model plan or move Memory separately. Calls without a key keep their existing behavior. Scoped Tob does not gain Git/Zip/directory import, Marketplace search or permission to modify another Bot’s Memory.

The Human online `create-status` command performs a read-only receipt lookup on the original Host. Pass the same name, persona, Bio, tags and other blank-create inputs with the original key; changed input is refused. It returns `{receipt:null}` before an operation exists, or `{receipt:{operationKey,botSlug,status,channelId?}}`. A `reserved` receipt can be resumed using `create` with that exact input and key; `created` identifies the existing Bot and DM. Never change Host or mint a new key to recover an uncertain result. Mobile checks this lookup before its first create, so a Host without recovery support cannot silently create an unrecoverable Bot.

```bash
deepseekbot create-status --host <original-host> --name Ada --persona 'Keep replies short.' --description 'Research helper' --role research --operation-key create-ada-001
deepseekbot create --host <original-host> --name Ada --persona 'Keep replies short.' --description 'Research helper' --role research --operation-key create-ada-001
# After a lost reply, repeat create-status with the exact same arguments.
```

Scoped `show` returns `{bot, profileFingerprint}`. Before every `update`, `pause`, `resume`, `bot-avatar-set`, `bot-banner-set`, `bot-appearance-set` or `bot-primary-color-set`, read the target and pass that fingerprint using `--expected-profile`. Presentation commands retain their existing file/recipe/clear/color options. The fingerprint covers the complete Registry record, so a concurrent change to any recorded profile field invalidates the reviewed snapshot. The Host rechecks it after approval and before applying the existing owner operation, then returns the canonical profile and new fingerprint. Re-read after `stale-setting`; do not silently overwrite. Profile metadata updates are limited to name, description and tags, not Workspace Grants, credentials or model configuration. Human online `update` also requires `--expected-profile` from `show` and uses the same Host owner; a stale fingerprint is not silently refreshed. Use `--description ''` to clear the bio and `--role ''` to clear all tags.

```bash
deepseekbot bot-delete-preview <bot-id>
deepseekbot bot-delete-memory-folder <bot-id>
printf '%s' '{"token":"<preview.token>"}' | deepseekbot bot-delete-confirm <bot-id> --confirmation-stdin --confirm
# Only after explicitly reviewing erasure of the owner's displayed Memory folder:
printf '%s' '{"token":"<preview.token>"}' | deepseekbot bot-delete-confirm <bot-id> --confirmation-stdin --confirm --erase-memory
deepseekbot bot-delete-retry <bot-id> --confirm
```

Deletion retains Memory by default. `--erase-memory` selects the exact owner-reviewed Memory directory, only when `preview.eraseAvailable` permits it; caller-selected paths are rejected. `bot-delete-memory-folder` returns the validated `{target:{path,relativePath,kind}}` for inspection, not arbitrary filesystem access. Preview tokens, dependency scope and path ownership checks remain authoritative. Deletion retry continues the already accepted retention/erasure choice; it cannot change that choice. Scoped confirm and retry require a fresh Human decision each time, including under full access, remembered rules or automatic approval. Both Human commands now require `--confirm`, so update existing cleanup scripts. Tob itself cannot be archived or deleted (`protected-bot`), and names, personality text and imports never grant its authority.

See [ADR-0225](adr/0225-bot-creation-receipts-and-reviewed-profile-lifecycle.md) and the [coverage inventory](agents/cli-ui-coverage.md#2089-bot-management-scope). Direct CLI, actual Tob conversation, Web navigation and macOS Desktop are separate verification gates; these command contracts do not imply those runs have passed.

### Tob group creation and invitations

The first [#2090](https://github.com/BotHarness/DeepSeekBot/issues/2090) slice lets Tob create groups and add existing Bots from its accepted Human DM. After the management operation is approved, invited Bots join immediately under the existing default `autoAcceptGroupInvites=true`; no separate invitation decision is needed. It uses the existing Channel owner through the scoped CLI, without a new model Tool. Tob manages other Bots and cannot be an initial member or invitation target.

```bash
deepseekbot channels --limit 25
deepseekbot channel <channel-id>
deepseekbot group-create "Research team" --member <bot-a> --member <bot-b> --operation-key group-research-001
deepseekbot group-create "Planning" --operation-key group-planning-001
deepseekbot group-invite <channel-id> --bot <bot-c> --operation-key invite-research-001 --expected-channel <channelFingerprint>
```

Scoped `channels` returns bounded Channel metadata, not message bodies; use `--limit` from 1 to 100 (default 50) and the returned `nextCursor` with `--cursor`. `channel <group-channel-id>` returns `{channel, channelFingerprint, invitationPolicy:{autoAccept}, wakePolicies}` and refuses a non-group target. The scoped projection keeps at most 100 members, the last 100 invitations and the last 100 join requests, with counts for omitted entries. These reads do not admit Tob as a member or authorize group messages as management instructions.

`group-create` supports an empty group or repeated `--member` values for existing eligible Bots. Explicit initial members join directly, matching the existing Human/UI creation behavior. A later `group-invite` uses the existing invitation owner. With the default `autoAcceptGroupInvites=true`, it records an accepted invitation (`respondedBy: "profile-policy"`) and membership together, without waking the invited Bot for a separate decision. This adds no setting or UI toggle. Only if the Human has already disabled auto-accept does the existing pending-invitation decision flow apply. Tob preserves that choice and reports the returned state.

Scoped creation/invitation writes require a stable `--operation-key` of 8–128 letters, digits, dots, underscores, colons or hyphens, starting with a letter or digit; invitation also requires the `--expected-channel` fingerprint from the preceding read. The reviewed snapshot binds current Channel metadata, membership and invitation policy, plus the target Bot identity. Message arrivals and unread counters do not invalidate that snapshot. Approval and execution recheck the accepted Human DM and current target state. If a relevant setting changes while review is pending, read it again and submit a new proposal rather than refreshing the approved snapshot silently.

The keyed result includes a `receipt` with `operationKey`, `kind`, `channelId`, optional `invitationId` and completion `status`, alongside canonical Channel state and the invitation when applicable. The durable operation receipt reserves the Channel or invitation identity. After an uncertain response, repeat the **same command, key and payload** to reconcile that operation instead of selecting another key. A completed scoped replay reads back the existing result without asking for another mutation approval. Changed payloads, unavailable targets or changed Bot incarnations refuse; replay never recreates a deleted group or duplicates an invitation. Current authority is still required after a Shell or Host restart; the receipt does not preserve the expired Shell capability.

`stale-channel` or `stale-profile` requires a fresh read and review. `operation-key-conflict` means the key is already bound to different input. `channel-operation-unavailable`, `unknown-channel`, `unknown-bot` and `archived-bot` refuse unavailable identities; `protected-bot` refuses Tob as a target. An unavailable invitation returns `group-invite-unavailable`. These failures do not authorize a fallback command or a replacement identity.

Authenticated Human online `group-create` and `group-invite` also support stable operation keys; the invitation command accepts `--expected-channel` for the observed state. These review/retry inputs are optional for Human commands and mandatory for scoped Tob. Existing unkeyed Human operations retain their owner behavior.

The following slices add group rename/avatar, member wake settings, member removal, cancellation of pending invitations and decisions on pending join requests. Personal mute/pin/nickname/visibility, group deletion, attachments and external membership remain outside the scoped allowlist. Some already have Human CLI commands above; that does not grant Tob access. #2090 remains open for its remaining scope. See [ADR-0226](adr/0226-group-management-receipts-preserve-channel-authority.md) and the [coverage inventory](agents/cli-ui-coverage.md#2090-group-management-scope). Direct CLI, real Tob approval/readback, Web membership/history and macOS Desktop are separate verification gates.

### Tob group settings and member removal

From its accepted Human DM, Tob can use existing approval to change a group name, avatar or member wake policy for ordinary group messages, or remove a Bot member. It reuses the same Channel owner, authority and durable data, with no new model Tool, database migration or UI. Scoped `channel-rename` accepts groups only; it cannot rename a Bot DM.

```bash
deepseekbot group-wake-policies <channel-id>
deepseekbot channel-rename <channel-id> --name "Product research" --expected-channel <channelFingerprint>
deepseekbot group-avatar-set <channel-id> --avatar-file ./avatar.png --expected-channel <channelFingerprint>
deepseekbot group-avatar-set <channel-id> --clear --expected-channel <channelFingerprint>
deepseekbot group-wake-set <channel-id> --bot <bot-id> --mode digest --count 5 --interval 30 --expected-channel <channelFingerprint>
deepseekbot group-wake-set <channel-id> --bot <bot-id> --inherit --expected-channel <channelFingerprint>
deepseekbot group-member-remove <channel-id> --bot <bot-id> --expected-channel <channelFingerprint>
```

`group-wake-policies` returns the current group snapshot, `channelFingerprint` and each member's `{botSlug, inherited, policy}`. The fingerprint includes effective wake policies, including inherited Bot defaults: changing a default invalidates an older review. Message traffic and unread changes do not invalidate it. Scoped avatar reads/reviews expose presence, type, size and digest instead of image data.

Every write requires the observed `--expected-channel`; read again after each successful edit before preparing another. Names must be nonempty and at most 120 characters. Avatars use the bounded PNG/JPEG/WebP files described above, or `--clear`. Wake modes are `all`, `mentions`, `digest` and `silent`; `--count` is 1–100 and `--interval` is 1–3600 seconds, defaulting to 5/30. `--inherit` removes the group override and restores the Bot default. Member removal preserves the Bot identity, Memory, other Channels and group history. Removing the group owner clears its ownership, leaving Human management. An archived existing member can be removed; changing wake policy requires an active Bot.

Approval binds the previous state, exact target and proposed values. Execution rechecks the Human's current group access and target Bot identity. Denied/expired approval, a Human who has left, a non-group target, a missing membership or a replaced identity refuses without bypassing checks; Tob still cannot join groups. `stale-channel`/`stale-profile` requires a fresh read and review rather than overwriting a concurrent edit.

These edits do not accept `--operation-key` or add replay receipts. After an uncertain result, inspect `channel`/`group-wake-policies` before doing anything else; do not blindly retry. Any remaining change needs a new proposal against the current snapshot. Existing create/invite receipts and default automatic acceptance are unchanged. Authenticated Human online equivalents may supply `--expected-channel`; omission preserves existing behavior without weakening Tob's mandatory inputs. #2090 remains open for its undelivered scope; these contracts do not claim Web, real-model or macOS verification has passed.

### Tob invitation cancellation and join decisions

From its accepted Human DM, Tob can use existing approval to cancel one **pending** group invitation or accept/decline one **pending** join request. First read `channel <channel-id>` for the exact invitation/request ID, status and `channelFingerprint`, then propose the operation:

```bash
deepseekbot channel <channel-id>
deepseekbot group-invite-cancel <channel-id> --invitation <invitation-id> --expected-channel <channelFingerprint>
deepseekbot group-join-decide <channel-id> --request <request-id> --accept --expected-channel <channelFingerprint>
deepseekbot group-join-decide <channel-id> --request <request-id> --decline --expected-channel <channelFingerprint>
```

Scoped commands require the observed `--expected-channel`; a join decision requires exactly one of `--accept` or `--decline`. Approval binds the current group snapshot, exact pending record, target Bot incarnation and requested decision. Before execution, the Host rechecks the accepted Human DM, current Human membership, fingerprint, target identity and pending status. Denied/expired approval, a Human who has left, a concurrent decision or an unavailable/replaced target cannot authorize a mutation or silently refresh approved inputs.

`unknown-invitation`/`unknown-join-request` refuses an absent record; `invitation-not-pending`/`join-request-not-pending` refuses an already settled target. `stale-channel`/`stale-profile` requires another read and review. These refusals do not authorize a replacement target or a different action.

The default `autoAcceptGroupInvites=true` is unchanged: invited Bots normally join immediately, so cancellation cannot undo an already accepted invitation and never removes an existing member. Cancellation only applies to a still-pending invitation, such as one created after the Human opted out of automatic acceptance. Removing an existing member requires a separate reviewed `group-member-remove`; a failed cancellation must not fall back to removal.

The existing Channel owner persists membership and accepted status together for acceptance; decline does not add membership. It records the existing decision notification once. Tob does not join the group or accept its content as management authority. This slice reuses canonical status and notification handling without another model Tool, schema migration or operation receipt.

Authenticated Human online equivalents may provide `--expected-channel`; `group-join-decide` without it retains existing same-decision idempotent readback of a completed result. Scoped Tob entry points accept pending records only and cannot bypass fresh review by omitting the fingerprint or repeating a terminal decision. After an uncertain response, read the exact record's status and membership first. If it remains pending and action is still needed, propose against a fresh snapshot instead of blindly retrying. Personal presentation, group deletion and external membership remain separate delivery; this slice does not close #2090.

### Tob model and runtime management

Use `deepseekbot capabilities` inside Tob's eligible Shell execution to discover its current commands. The following commands reuse existing Host owners; writes still require the accepted Human DM and existing review policy.

```bash
deepseekbot list
deepseekbot model-catalog
deepseekbot model-plan <bot-id>
deepseekbot model-presets
deepseekbot settings

deepseekbot home-model-set --provider <provider-id> --model <model-id> [--orchestrator-effort <effort>] --expected-revision <default-revision>
deepseekbot model-plan-customize <bot-id> --orchestrator-provider <provider-id> --orchestrator-model <model-id> --expected-revision <plan-revision>
deepseekbot model-plan-inherit <bot-id> --expected-revision <plan-revision>
# Full plan JSON: orchestrator, assignmentDefault and assignmentModels.
deepseekbot model-plan-set <bot-id> --plan-stdin --expected-revision <plan-revision> < plan.json
# Assignment-only JSON omits orchestrator; the Bot must already have a plan.
deepseekbot model-plan-assignments-set <bot-id> --plan-stdin --expected-revision <plan-revision> < assignments.json
deepseekbot model-preset-apply <bot-id> --preset <preset-id> --expected-revision <plan-revision> --preset-revision <preset-revision>
```

`model-catalog` returns available models and `default`/`defaultRevision`; model-plan reads return the Bot plan revision. Changing the Host default preserves other Bots' independent overrides. Customize changes the Orchestrator while preserving Assignment choices; inherit returns the Bot to the Host default. The Host validates route availability both while preparing the operation and before execution. An unavailable route refuses with `model-unavailable`, while a changed reviewed revision refuses with `stale-setting`. Legacy plans requiring repair return `legacy-model-repair-required` rather than being silently rewritten. Credential setup remains native and private: use the existing model/credential interface; Tob receives catalog/readiness information, never credential values.

Preset create/read/update/application reuse the existing preset owner. Scoped `model-preset-create --name <name>` and `model-preset-update <preset-id> --name <name> --expected-revision <revision>` require explicit `--orchestrator-provider`, `--orchestrator-model`, `--assignment-provider` and `--assignment-model`; optional effort flags and `--plan-stdin` with `{"assignmentModels":[...]}` use the existing shapes. Scoped updates require the complete intended name and routes even though the Human command supports partial updates. Applying a preset checks both Bot and preset revisions. There is no preset deletion owner or command; this slice does not invent one or claim complete preset CRUD.

`settings` discovers the supported namespaces; `settings botharness-client` returns exactly four live runtime fields:

| Field                        | Accepted value |
| ---------------------------- | -------------- |
| `assignmentConcurrencyLimit` | Integer 1–32   |
| `showBotSessions`            | Boolean        |
| `showApprovalReviewSessions` | Boolean        |
| `developerMode`              | Boolean        |

Use the paired reviewed flags with `settings-set botharness-client --patch-stdin`; the previous-value JSON must name exactly the patched fields. `settings agent-default-model` reads the default route; change it with `home-model-set`. Unknown fields, other namespaces and direct default-model patches refuse rather than editing configuration files. Motion, theme, language, shortcuts, layout and other preferences are not implied by this scope.

### Tob privacy, Git and updates

```bash
deepseekbot telemetry-status
deepseekbot telemetry-set --enabled
# Or: deepseekbot telemetry-set --disabled
deepseekbot git-status
deepseekbot git-install
deepseekbot release-info
deepseekbot release-check
deepseekbot release-install <version> --confirm
deepseekbot release-restart --confirm
```

These reuse the same telemetry, Git and release owners as Settings. Environment-locked telemetry cannot be overridden; inspect the returned effective/locked state rather than assuming the stored preference controls collection. Git covers availability and installation only, with no new global Git identity editor.

Scoped `release-install` and `release-restart` require explicit `--confirm` and a fresh Human decision for every invocation. Full access, remembered allow rules and automatic approval cannot replace that decision; the flag itself is not approval. `git-install` does not use `--confirm` and retains its existing review policy. Restart can interrupt running turns and disconnect the requesting CLI; do not automatically repeat an install or restart after an uncertain result. Reconnect and inspect release status before deciding another action. Test these operations only in an owned isolated Profile, preserving the Human's active Desktop.

### Recover an exhausted Group draft

After restarting the Host, inspect the draft, read the current Group, and pass both
`recover: true` and `freshness_override` with the current `draftVersion`,
fresh `observation_id`, original `draft_id`, and revised body to the same direct
`bot-tool ... bot_send_message --args-stdin` command. Recovery does not renew the two-recheck
budget or a spent explicit override. A changed context still refuses the final attempt.
A successful override retains a commit receipt; retrying its unchanged intent returns
the same message ID, including after another restart. Inspection cannot include
`freshness_override` or other mutation arguments.

### Cloud Agent connections (UAT)

`deepseekbot cloud list` reads public connection state from the selected live Host. Import an operator-trusted TOB Agent credential with `deepseekbot cloud import --input-stdin < /absolute/private-agent.json`; the Host qualifies its instance/channel/Agent identity before saving the secret in native Credentials. Do not paste credential values into command arguments. Imported accounts appear in `cloud list` and the existing Apps UI; explicitly bind the account to a local Bot through the existing `im-bind <bot> --app <cloud-id>` command/UI. Cloud import never selects a phone/CLI Human organization or creates a Bot.

`deepseekbot cloud policy --input-stdin` accepts `{ "id": "cloud-<fingerprint>", "revision": 1, "policy": { "allowedUsers": ["user_..."], "forwardTargets": [], "environment": "host-a" } }`. This records an explicit local work allow-list; it does not bypass native tool permissions. `deepseekbot cloud remove --input-stdin --confirm` accepts `{ "id": "cloud-<fingerprint>", "revision": 2 }`. Read the actual current revision first. Removal disables traffic before deleting the secret; `credentialRemoved: false` requires retrying cleanup. Two-Host execution and runtime evidence are tracked in #2155, not established by these command examples.

`deepseekbot cloud-work <bot> --input-stdin` invokes the same bounded `cloud_work` Tool as the Bot. Pass `{ "operation": "inspect", "source_event_id": "im-..." }` for the canonical request and configured forward targets. `execute` performs only the fixed runtime health check; `forward` additionally requires `target_actor_id` from those configured targets. The input cannot supply a Human identity, request body or shell command. Current source access, binding and local policy apply to every operation. Retry uncertain operations with the same source/operation/target: result delivery never repeats the local check, while interrupted execution reports `needs-review`. A forward attempt cannot fall back to execution. The fixed model-mediated two-Host UAT path and direct replay after both Host restarts are qualified at `f02c2423b`; this does not qualify arbitrary work or a fresh phone run.

## Desktop onboarding

`deepseekbot onboarding` reads the Profile journey and actual Bot/group result references. Use `--action start|pause|skip|continue|restart|finish` to change tutorial lifecycle. `finish` no longer needs a created Bot or group: the intro's persona templates and interview create them through Tob when the person asks. Restart preserves resources, approvals, layouts and history. Layout tip completion stays on the current Client; this command does not operate the UI or mark provider execution successful.

### Version-bound Memory images

`memory-file`, `memory-working-diff`, and `memory-commit-diff` include optional image metadata for PNG, JPEG/JPG, GIF, WebP and safe static SVG files. `source` identifies the working tree, index, or exact commit; `revision` binds the returned bytes. No image body is printed in JSON.

```bash
deepseekbot memory-image <bot-id> --path preview.png --image-source <source> --image-revision <revision> --out /absolute/new-preview.png
```

Markdown `.md` / `.markdown` results from `memory-file`, `memory-working-diff` and `memory-commit-diff` additionally expose a `markdown` document (or `before` / `after` documents): `source`, `revision` (SHA-256 of the document bytes), `status`, and the exact UTF-8 `body`. Diff previews have independent text budgets: 4 MiB per document and 4 MiB total document bodies per commit query; line-diff limits stay unchanged. No rendered HTML or image bodies enter these JSON results.

For an inline local image, pass the document's source/revision and the authored reference:

```bash
deepseekbot memory-image <bot-id> --path notes/guide.md --image-source <document-source> --image-revision <document-revision> --image-reference ../chart.png --out /absolute/new-chart.png
```

With `--image-reference`, `--path` names the Markdown document and `--image-revision` identifies that document, not the image. The receipt includes `reference`. Relative images resolve from the document directory, `/chart.png` from the Memory Repository root. Percent-encoded spaces/Unicode and in-root parent traversal work; root escape, `.git`, backslashes, URL schemes and symlink escape are refused. The route revalidates mutable document content before and after reading the image; index/commit images never fall back to the worktree. It returns the selected source's image at load time; refresh the view to observe later mutable image changes. External HTTPS images are a Client-only explicit-load action; the Host/CLI do not fetch external URLs.

Use the exact metadata from the selected file/diff side. The authenticated Host returns those original image bytes and their detected MIME, or a coded refusal such as `memory-image-stale`; refresh mutable metadata rather than substituting the current file. `--out` must be absolute and must not already exist. The command prints one JSON receipt. Preview limits are 25 MiB per image, 16,384 pixels per axis and 40 million decoded pixels. GIF/WebP keep their original animation within 256 frames and 40 million canvas pixels across all frames. SVG additionally allows at most 1 MiB UTF-8, 10,000 XML nodes, depth 64, 64 KiB CSS and 20,000 expanded nodes. The static SVG subset accepts ordinary shapes, text, CSS, gradients, markers, clipping and bounded internal references; scripts, event handlers, foreign HTML, images, filters, animation, external references, DTDs, processing instructions and reference cycles are refused. SVG stays an image resource, never inserted markup, and all successful exports preserve the original SVG bytes. Original-file download and Open current file remain separate actions.

## Desktop window zoom (controlled S1)

Tobs 1.5.2 briefly loaded zoom by default by inserting a second `ui-theme` Loader row; DSH 0.2.1-rc.3 Settings then refused every appearance and font write ([#2788](https://github.com/BotHarness/DeepSeekBot/issues/2788)). Product Bundles again leave the native `ui-theme` row alone, so zoom needs the explicit setup below.

The product includes a separate opt-in configuration command. Install the product normally,
quit the target macOS Desktop, then point setup at that application's bundle and explicit
Profile. Setup uses the selected application's bundled pnpm with scripts disabled, under the
same Profile writer lock as the native plugin manager. It refuses a running Desktop Host,
other theme overrides and stale product composition; protocol, platform and payload integrity checks control admission.
It changes one Profile dependency and never edits the installed application:

```sh
deepseekbot-zoom-setup enable --home <absolute-DSH_HOME> --profile desktop --desktop-app "/Applications/DeepSeek Harness.app"
deepseekbot-zoom-setup disable --home <absolute-DSH_HOME> --profile desktop --desktop-app "/Applications/DeepSeek Harness.app"
```

Keep Desktop closed until setup returns, then reopen it. A busy Profile or uncertain package
outcome requires inspection rather than automatic retry. For a non-Desktop isolated Profile,
use `--profile <profile> --dsh <qualified-dsh-cli>` instead. The DSH CLI intentionally refuses
the managed `desktop` Profile; the native plugin manager also refuses this plain-library
replacement, because it resolves the installation-owned theme before Profile Bundle metadata.
Those two paths do not establish Desktop activation.

Run `disable` before uninstalling the product and restart to restore native package resolution.
Manual font preferences remain in the same native `ui-theme` Patch. JSON stdout reports
`restartRequired:true` and `runtimeVerified:false`; a successful package change does not prove
the native window has loaded it. An uncertain package operation is not retried automatically.

### Enable from Bot Settings

On the macOS or Windows Desktop, Bot Settings → General shows **Enable window zoom** (or **Turn off window zoom** once installed). The button asks the Host to start the same `deepseekbot-zoom-setup enable|disable --after-quit <state-file> --request <id>` transaction as a detached helper. The helper waits until the Desktop is fully quit, runs the unchanged checks and Profile change, records the outcome, then reopens the app. Cancel before quitting withdraws it; a newer request supersedes an older one. If the app is not quit within 30 minutes, the helper stops without changes and without reopening. The next Settings visit shows a failed outcome code. The Host reads the target app from its own runtime path and only offers this in the native `desktop` Profile.

```sh
deepseekbot window-zoom-setup-status --host <host> --token-file <private-file>
deepseekbot window-zoom-setup-enable --host <host> --token-file <private-file>
deepseekbot window-zoom-setup-disable --host <host> --token-file <private-file>
deepseekbot window-zoom-setup-cancel --host <host> --token-file <private-file>
```

Status is `{supported:false, code}` outside the Desktop Profile, or `{supported:true, enabled, pending?, last?}`. Refusals include `zoom-setup-not-desktop`, `zoom-setup-desktop-app-unresolved`, `zoom-setup-command-unavailable`, `zoom-setup-already-enabled|disabled` and `zoom-setup-not-pending`; a helper that ended without an outcome reports `zoom-setup-helper-exited`.

`window-zoom-clients` lists active targets. Select one `--client-id`; commands never choose a
window implicitly. `window-zoom-get` reads the Client-owned snapshot. A write requires the
returned `document.revision` as `--expected-revision`:

```sh
deepseekbot window-zoom-clients --host <host> --token-file <private-file>
deepseekbot window-zoom-get --client-id <id> --host <host> --token-file <private-file>
deepseekbot window-zoom-set --client-id <id> --zoom-level=-1 --expected-revision <revision> --host <host> --token-file <private-file>
deepseekbot window-zoom-reset --client-id <id> --expected-revision <revision> --host <host> --token-file <private-file>
```

Levels are integers -8…8; the factor is `1.2 ** level`. Use `--zoom-default` with `window-zoom-set`
to save the device default and apply it to the current window. A normal set changes only the
current window; reset restores its saved default. Negative arguments use `--zoom-level=-1`.
The stable desktop origin stores this locally; the Host only relays requests. Browser Clients
and desktops without the qualified compatibility composition do not register targets.

`zoom-client-stale`, `zoom-client-unavailable`, `zoom-revision-conflict` and storage errors are
refusals, not successful fallback writes. A timeout/cancellation after delivery has an unknown
write outcome: read the same live Client before deciding what to do; never retry blindly.
Restarting the Client changes its delivery ID; list again. The desktop's primary-window state
survives independently. See [S1](https://github.com/BotHarness/DeepSeekBot/issues/2268) for native
qualification limits. No model or Host-side preference copy is involved.

The Windows candidate uses the installed product's `deepseekbot-zoom-setup` command with
`--home <isolated-home> --profile desktop --desktop-app "<app-directory>/DeepSeek Harness.exe"`.
Keep the selected Desktop closed throughout `enable` or `disable`; setup refuses any running
process of that executable. Admission checks the protocol, platform and payload integrity,
not a fixed FileVersion. The native `ui-theme` row and font settings remain in place.
Run `disable` before removing the product. After every cold boot, enumerate Client IDs again.
Ctrl+0 restores the saved default, including 120%; numberpad codes are unsupported by the
pinned protocol. See [Windows qualification #2270](https://github.com/BotHarness/DeepSeekBot/issues/2270)
for the separate native input, guest foreground, DPI and Human-QA gates.

## DeepSeekBot Connect (ADR-0241)

DeepSeekBot Connect lets a paired phone reach this Host through a Cloudflare Tunnel under
`deepseekbot.dev` instead of Tailscale ([#2387](https://github.com/BotHarness/DeepSeekBot/issues/2387)).
Usually the Host signs in to a DeepSeekBot account and the relay provisions the tunnel (see Account
sign-in below). `connect-enable` runs a tunnel whose connector token was made by hand.

```sh
deepseekbot connect-status --host <host> --token-file <private-file>
deepseekbot connect-enable --hostname <name>.deepseekbot.dev --token-stdin --host <host> --token-file <private-file> < <connector-token-file>
deepseekbot connect-disable --host <host> --token-file <private-file>
```

`connect-enable` stores the hostname and connector token in the DSH credential store, opens a
loopback origin that forwards only `/botharness-device/*` to the DSH listener (every other path is
404), and runs `cloudflared tunnel --no-autoupdate run` with the token in `TUNNEL_TOKEN`, never in
its arguments. The JSON reply's `origin` is the address the tunnel's ingress must target. The
Host runs a pinned `cloudflared` (`packages/core/src/devices/cloudflared.json`) and takes the
first of: `DEEPSEEKBOT_CLOUDFLARED`; the optional `@botharness/cloudflared-<platform>-<arch>`
package installed with `deepseekbot`; a copy under `$DSH_HOME/botharness/cloudflared/<version>/`,
downloaded from the cloudflared GitHub release and kept only when its SHA-256 matches the pin; then
`cloudflared` on `PATH`. A cached or packaged binary whose hash differs is refused, and a bad cached
copy is deleted and downloaded again. `connect-status` returns `connect.state` (`off`,
`starting`, `connected`, `error`) with `issue` (`cloudflared-missing`, `cloudflared-exited`,
`cloudflared-download-failed`, `cloudflared-hash-mismatch`, `origin-port-busy`,
`credential-unavailable`), `connect.cloudflared` (`env`, `package`, `cache`, `download` or `path`:
which binary runs) and the phone route list. A refused download is retried with backoff; once
connected, new pairing QR codes include `https://<name>.deepseekbot.dev` after any Tailscale route.
Refusals: `connect-hostname-invalid` (only one label under `deepseekbot.dev`),
`connect-token-invalid`, `credential-unavailable`. `connect-disable` stops the tunnel and deletes
the stored token; paired devices keep their credentials.

### Account sign-in

```sh
deepseekbot connect-sign-in --wait --host <host> --token-file <private-file>
deepseekbot connect-sign-out --host <host> --token-file <private-file>
```

`connect-sign-in` starts WorkOS CLI Auth (the device authorization grant) with the client that the
relay at `https://connect.botharness.ai` publishes (`DEEPSEEKBOT_CONNECT_RELAY` overrides it). The
reply carries `userCode` and `verificationUri`; with `--wait` the CLI prints them to stderr and waits
until the Host finishes. The Host then stores only the refresh token in the DSH credential store,
links itself to the account (at most five Hosts per account), asks the relay for its tunnel and runs
it as `connect-enable` would, with no hand-made token. While signed in it asks the relay again when
the tunnel stops, so a tunnel the relay reclaimed after the Host was offline comes back on the same
`<host-id>.deepseekbot.dev`. `connect-status` adds `connect.account` with `state` (`signed-out`,
`signing-in`, `signed-in`, `error`), `email`, `hostId` and `issue` (`relay-unavailable`,
`sign-in-denied`, `sign-in-expired`, `session-expired`, `account-not-allowed`, `host-limit`,
`credential-unavailable`). While signed in, the Host re-checks the account with the relay every
minute; once the relay or WorkOS refuses the session (for example after `DELETE /v1/account`), it
stops the tunnel, deletes the stored session and reports `error` with `session-expired`.
`connect-sign-out` unlinks the Host at the relay, stops the tunnel and
deletes the session. Any signed-in account can link Hosts.

## Device-local DeepSeekBot appearance

`appearance-clients` lists the online Client ids and platform on the authenticated Host. Select one explicitly; a new mount/reload gets a new id. This controls DeepSeekBot, not the DSH-native Host theme.

```bash
deepseekbot appearance-clients --host http://127.0.0.1:PORT --token-file /private/host-token
deepseekbot appearance-get --client-id CLIENT_ID --host http://127.0.0.1:PORT --token-file /private/host-token
printf '%s' '{"preference":"dark","mode":"dark","preset":"mist-purple","primary":"#9876cb"}' | deepseekbot appearance-set --client-id CLIENT_ID --expected-revision REVISION --patch-stdin --host http://127.0.0.1:PORT --token-file /private/host-token
```

Use `snapshot.config.revision` from the read as `REVISION`. Patch fields: `preference` is `light`, `dark` or `system`; `mode` is `light` or `dark` and is required with `preset` (`classic-blue` / `mist-purple`) or `primary` (six-digit hex). Selecting a preset resets that mode's Primary unless the same patch supplies another. Other mode and unknown future fields are retained.

A successful command emits one JSON document after the target Client acknowledges local storage; read it back and inspect the UI. Web persists per browser/site; Desktop per application regardless of Host. Other browser profiles and Desktop do not receive the command. Same-site tabs share local storage intentionally.

Refusals include `appearance-client-required`, `appearance-client-stale`, `appearance-client-unavailable`, `appearance-client-busy`, `appearance-client-timeout`, `appearance-revision-required`, `appearance-revision-conflict`, `appearance-invalid-input`, `appearance-storage-invalid` and `appearance-storage-unavailable`. A timeout after delivery has an unknown outcome: read again before retrying. There is no offline queue, broadcast, Host preference mirror or model call.

Global materials (T2): the four presets are `classic-blue`, `mist-purple`, `forest-green` and `warm-amber`. Add `materials.header` and/or `materials.body` to a mode patch; each accepts optional `color` (six-digit hex), `opacity` (0–100 percent) and `blur` (0–40 CSS pixels). Fields merge independently. Choosing a preset clears known global adjustments only for that mode. The same Client acknowledgment, revision checks and storage refusals apply.

```bash
printf '%s' '{"mode":"light","materials":{"header":{"color":"#e9ddf6","opacity":75,"blur":16},"body":{"opacity":80,"blur":12}}}' | deepseekbot appearance-set --client-id CLIENT_ID --expected-revision REVISION --patch-stdin --host http://127.0.0.1:PORT --token-file /private/host-token
```

Functional Panels (T3): `deepseekbot appearance-targets --client-id CLIENT_ID` reads the target catalog and snapshot from that Client (use the same Host/auth flags as above). IDs such as `dock:bh:channel-body` identify the Messages function, regardless of its selected Channel. `appearance-get` also returns `targets`.

Use `appearance-set` with `{"mode":"light","panel":{"id":"dock:bh:channel-body","materials":{"header":{"color":"#e0c1ed","opacity":42},"body":{"blur":8}}}}`. Send a field as `null` to follow global, for example `{"mode":"light","panel":{"id":"dock:bh:channel-body","materials":{"header":{"color":null}}}}`. Reset only that target/mode with `{"mode":"light","panel":{"id":"dock:bh:channel-body","reset":true}}`. Panel operations cannot mix global fields in the same patch. All writes require `--patch-stdin` and the last `--expected-revision`.

Target refusals are `appearance-target-unavailable`, `appearance-target-duplicate` and `appearance-target-invalid`; they never redirect to another Panel. Closing a Panel does not delete its override. Global preset changes retain it. Nested targets are introduced separately.

Nested appearance uses the same `appearance-targets` and `appearance-set` commands. Targets include registered Memory files/evolution, Browser/Computer and independent contributions; `dock:memory-details` is shared by file preview, commit detail and working changes. Use `dock:generated-files` for the Channel file side panel. Every omitted field follows the current mode's global setting directly, even inside a customized parent. A hidden panel keeps its appearance; an unregistered contribution refuses writes until it returns. Resetting a parent never clears child overrides.

### Device-local image wallpaper

Use `appearance-clients` to identify one online Web or Desktop Client, then `wallpaper-get --client-id <id>` to read its `wallpaper.revision`. Wallpaper revisions are separate from appearance revisions. All mutations require that exact `--expected-revision` (initially `empty`):

```bash
deepseekbot wallpaper-import --client-id <id> --expected-revision <revision> --file ./image.png
deepseekbot wallpaper-crop --client-id <id> --expected-revision <revision> --patch-stdin < crop.json
deepseekbot wallpaper-remove --client-id <id> --expected-revision <revision>
```

`crop.json` contains exactly `{ "x": 0.5, "y": 0.5, "zoom": 1.5 }`: center coordinates 0–1 and zoom 1–5. Import optionally accepts the same crop through `--patch-stdin`. The file is read on the CLI machine, must be a nonempty decodable image no larger than 20 MiB, and is transferred in ordered bounded chunks. Only the selected Client stores the original bytes. Successful stdout reports metadata and the new revision; no file path or media bytes are returned. Offline/stale Clients, revision conflicts, invalid media/crop, expired uploads and storage failures return coded refusals. A timeout after delivery requires a fresh read before retry; never automatically replay the import. Web and Desktop storage are independent, and neither is keyed by Host.

The same wallpaper commands also accept videos up to 100 MiB. Import must actually play/decode on the selected Client and generate a poster before committing; originals are not transcoded. `wallpaper-get` returns transient `playback.state` (`playing`, `paused`, `poster`, `inactive`) and a coded `reason` when degraded. The saved poster is used if playback fails or a later runtime cannot decode an accepted video. Image limits remain 20 MiB. Support is runtime/codec-specific; a successful transport alone does not prove playback.

Wallpapers form a library of up to 24 items. Import adds the media and shows it. `wallpaper-get` returns `wallpaper.library` with each item's `id`, `kind`, size and crop, the chosen `active` item and the rotation settings; `wallpaper.current` is the item on screen now.

```bash
deepseekbot wallpaper-select --client-id <id> --expected-revision <revision> --wallpaper-item <item-id|none>
deepseekbot wallpaper-remove --client-id <id> --expected-revision <revision> --wallpaper-item <item-id>
deepseekbot wallpaper-crop --client-id <id> --expected-revision <revision> --wallpaper-item <item-id> --patch-stdin < crop.json
echo '{"interval":900000,"shuffle":true}' | deepseekbot wallpaper-rotation --client-id <id> --expected-revision <revision> --patch-stdin
```

Without `--wallpaper-item`, crop and remove act on the item on screen. `none` keeps the library but shows no wallpaper. Removing the item on screen moves on to the next one. `interval` is `0` (off), `60000`, `300000`, `900000` (default), `1800000` or `3600000` milliseconds; `shuffle` picks a random order without repeating an item twice in a row. Rotation follows the clock, so every window of that Client shows the same item without extra writes. Full appearance reset empties the library.

### Appearance recovery

Read `appearance-get --client-id <id>` and `wallpaper-get --client-id <id>` first; their revisions are independent.

```bash
deepseekbot appearance-clear-panels --client-id <id> --mode light --expected-revision <appearance-revision>
deepseekbot appearance-reset --client-id <id> --expected-revision <appearance-revision> --expected-wallpaper-revision <media-revision> --confirm-reset
```

Clear removes all functional Panel overrides only in the explicit mode, including unregistered saved targets; theme/materials/Primary, the other mode, media and layout stay unchanged. Full reset requires `--confirm-reset`, defaults both palettes/mode/overrides, and removes shared media. It never changes DSH, Bot identity or business data. A preference write failure leaves media untouched. `appearance-reset-wallpaper-failed` means defaults were committed but media cleanup failed; reread both owners and retry with fresh revisions. The command does not claim a single transaction across localStorage and IndexedDB, nor automatically replay a delivered timeout.

### Three-action tool approval (#2080)

`tool-approval-decide ... --outcome allowed-always-tool` matches the Web card's Always allow: it approves the current call and persists the current tool in this Bot/role/authorization scope. Later different inputs match; another tool or changed scope does not. `tool-approval-rules` returns kind `tool`; `tool-approval-rule-revoke --confirm` restores prompting. Existing exact/broad/Secret rules are not reinterpreted. Permission/policy changes, Browser/Computer authorization and Tob install/restart/deletion can be remembered through the same command. They use separate scopes so old ordinary/all-opaque rules gain no authority; device target changes and revocation restore prompting. Secret CLI keeps its program/account/variable-name restriction, and MCP service remembering keeps its independent access checks.

Full Access now retains native `ask` so recognized permission changes can reach the Human, while ordinary requests in its explicitly selected scope are automatically answered without routine cards. The selected mode/scope and existing Assignment permissions are not widened. A native `never` policy still means deterministic rejection; it is not bypassed. Directory grants still use `grant-request-approve --confirm`.

Connect uses a Noise XK encrypted channel. `deepseekbot connect-status` includes `connect.encryption` with `protocol`, `required`, `state`, `publicKey` and the Host fingerprint. State is `negotiating`, `encrypted` or `disconnected`; enabling a tunnel alone does not imply an encrypted session. `devices` also lists `pendingKeys`. Compare the full new-device fingerprint with the device display, then approve that exact key with `deepseekbot device-approve-key <receipt> <public-key> --confirm`. Missing confirmation or an invalid key refuses. These status commands expose no pairing offer, private key or bearer.

The phone's native private form and browser remote chat reach the existing credential owner through the same channel. Legacy Connect pairings require a new fingerprint ceremony; failures never retry plaintext. The full phone WebView remains removed, and Connect Browser/Computer viewers are unavailable pending separate qualification. CLI channel state is not native acceptance or proof of a real Cloudflare path.

## SSH tunnel from a computer

Run `ssh-tunnel` on the computer where you use the browser. The Linux Host must already be running and reachable through an SSH alias whose host key and key/agent login you have verified in your normal terminal. This command uses batch authentication and refuses password prompts or unknown/changed SSH host keys. It does not install or start the remote Host. Use an up-to-date local Host browser client with **Add remote**; older clients reject the version 2 tunnel link.

1. On the remote Linux Host, use its existing Owner-authenticated CLI to run `device-offer --out /absolute/private/offer.txt`. Preserve the returned receipt. Transfer the file securely to the initiating computer; do not paste the pairing link into command arguments or logs.
2. Keep this foreground command running on the computer, using a free stable local port and the remote Host's existing loopback port:

   ```text
   deepseekbot ssh-tunnel my-linux --remote-port 39105 --local-port 32451 --pairing-file /absolute/private/offer.txt --out /absolute/private/browser-offer.txt
   ```

   Windows accepts absolute drive paths. Optional `--ssh-config <absolute-file>` chooses an existing config; the default uses system OpenSSH configuration. Input files must be private regular files (0600 on Linux/macOS); output is a new exclusive file. A startup failure can leave an empty output file; choose a new output path on retry.

3. The single JSON stdout document reports readiness only after a Noise handshake authenticates the Host key. Paste the protected output file's link into **Add remote** in your local Host's browser. Compare the Host fingerprint through your trusted remote terminal and approve that exact browser key with `device-approve-key <receipt> <public-key> --confirm` on the remote Host. The tunnel command does neither approval nor enrollment.
4. Open a remote conversation and use the existing Host controls. Stop the tunnel with Ctrl+C; this leaves the remote Host running and the browser pairing intact. Restart with the same local port and a new output path to reconnect. An expired input offer may still identify the Host for an already paired browser, but cannot enroll a new browser; create a fresh offer for enrollment.

The tunnel listens only on `127.0.0.1`. SSH links require encrypted loopback requests and streams after pairing, so a changed listener cannot receive device credentials in plaintext. Use the remote Host's existing `device-revoke <device-id> --confirm` to revoke access; closing the tunnel is not revocation. Do not downgrade the browser client after creating an SSH pairing.

Read structured lifecycle events on stderr to distinguish `ssh-missing`, `ssh-host-key-refused`, `ssh-authentication-refused`, `ssh-local-port-unavailable`, `ssh-host-unready` and `ssh-host-identity-mismatch`. Remote process errors never cause automatic bootstrap or a plaintext fallback. No raw SSH output or pairing link is printed. See [ADR-0246](adr/0246-ssh-tunnels-preserve-paired-host-authority.md) for ownership and qualification boundaries.
`ssh-tunnel` exposes only the encrypted Device Gateway on its public loopback port. It is not a general HTTP proxy: opening that port directly in a browser returns 403. Use Add remote in your local Host browser. Ambient local browser cookies are discarded by the carrier and never reach the remote Host.

### Pinned Git import and recovery

Inspect the selected source on the target Host before confirming a new import. The response contains a normalized Git URL and its current HEAD commit. Keep that URL and commit with the chosen name, Bio, tags and operation key; sending or recovering the operation must not inspect a newer commit automatically.

```bash
deepseekbot bot-import-preview --host <host> --from-git owner/repository
deepseekbot create-status --host <host> --name Helper --from-git <inspected-url> --expected-commit <commit> --operation-key import-helper-001
deepseekbot create --host <host> --name Helper --from-git <inspected-url> --expected-commit <commit> --operation-key import-helper-001
```

The lookup is read-only and accepts the same optional `--description` and repeated `--role` flags as creation. A lost reply or Host restart retains the same Bot, managed Memory and DM. `git-source-changed` refuses a repository whose cloned HEAD differs from the inspected commit before publishing a Bot; the reserved key stays bound to the original input. Review the changed source before explicitly starting a different operation. Reusing a key with a different source or metadata returns `creation-key-conflict`; archived or deleted identities return `creation-identity-unavailable`. No automatic model call or credential copying occurs.

### Mac Local Computer video (#2653)

The existing `computer-start --target local`, `computer-video status`, observation/signaling, takeover, input and resume commands use the same Computer owner on macOS. No additional CLI identity or transport is introduced. Explicit start installs the pinned Mac capture runtime; observation never downloads it. `screen-recording-required` asks for macOS Screen Recording permission and a restart. Mac click coordinates stay in video pixels at the command boundary; the owner validates Retina geometry and leaves the logical-point conversion to the pinned driver. Resume remains available when video is unavailable. Physical iPhone interaction is a separate native check.

When `status` advertises `continuousScroll:true`, iOS and `computer-video input --args-stdin` can send `input:{"kind":"scroll-motion","x":100,"y":100,"vx":0,"vy":-200}` with the same binding/grant/sequence. Coordinates remain full-display pixels; velocity is signed logical pixels/second, bounded to ±200 on each axis. Refresh while held (the iOS client uses 80ms), and send both velocities as zero on release. The macOS owner expires motion after 250ms without refresh and stops it on control invalidation; native frames recheck authority, discard stale packets and never queue behind an unacknowledged frame. This path uses the system native bridge and requires the Host's existing Accessibility authorization; it never requests permission automatically. Older Hosts and Android retain discrete scrolling.

### Native Subagent presets and direct calls

Only Assignment Sessions have `bot_subagent`, `bot_subagent_fork` and `list_bot_subagent_models`. An Orchestrator delegates with `create_assignment`; its native and Bot Subagent tools are refused with a pointer to `create_assignment` (ADR-0265). `bot_subagent` selects an explicitly allowed `agent_preset`, then the configured `subagent.agentPreset`, then the current DSH system default. `subagent.allowedAgentPresets` permits explicit choices; omitting it disables explicit selection. These native presets control tools and persona, independently of allowed LLM routes. `bot_subagent_fork` inherits the parent preset and rejects `agent_preset`.

The `bot-tool` command also supports `bot_subagent`, `bot_subagent_fork` and `list_bot_subagent_models` with `--session <assignment-session-id>`, one of the Bot's Assignment Sessions (`assignments` lists them). The Assignment Agent must be live, including one that is idle after a report. The call uses its native tool pipeline and does not create or resume a parent. `parent-unavailable` means the Session is missing, is not this Bot's Assignment, or has no live Agent; continue the Assignment first. Other Bot tools reject `--session`. Native policy refusals remain errors. Use `bot-trace --session direct` for the direct-call result and the child's Session for its execution history.

A background child's native report may wake that live Assignment. BotRuntime prepares fresh tool context and the current model before the resumed request, without borrowing the previous DM's source or target. Include the intended reply source or explicit destination in the delegated task when a result should be delivered. A foreground CLI call does not block stop or steering of a separate Human turn. See ADR-0252.

```sh
printf '%s' '{"description":"Review","prompt":"Review the supplied task","run_in_background":false}' | deepseekbot bot-tool <slug> bot_subagent --session <assignment-session-id> --args-stdin
printf '%s' '{}' | deepseekbot bot-tool <slug> list_bot_subagent_models --session <assignment-session-id> --args-stdin
```

`computer-open-permission-settings` opens the selected macOS privacy pane on the Local Computer Host; it does not grant permission. The Human enables access in System Settings, restarts the app running DSH when required, then checks again. `computer-status` retains coded setup refusals and individual missing macOS permissions; technical details remain in diagnostics.

## Complete environment backup and restore

The `profile-backup-*` commands use the same Profile Backup owner as Settings. Online commands use `--host` / `DEEPSEEKBOT_HOST` and the existing private token-file or environment authority. They print one JSON document; credential stores are excluded, but chats and Memory can contain secrets.

```bash
tobs profile-backup-preview --host http://127.0.0.1:31967 > preview.json
tobs profile-backup-export --host http://127.0.0.1:31967 --confirmation-stdin --out environment.botharness-backup < preview.json
tobs profile-backup-inspect --host http://127.0.0.1:31967 --file environment.botharness-backup
tobs profile-backup-restore --file environment.botharness-backup --new-home new-environment --confirm
```

Export consumes the current preview token and refuses to overwrite a file. Restore runs **locally and offline**, requires a new target directory, and leaves the Profile stopped. Omit `--host` and `--token-file` for restore. Start the target with a compatible trusted Tobs installation before querying `profile-backup-recovery`. Restored Bots remain cold; `profile-backup-authorize <bot> --confirm` authorizes the chosen target model, and `profile-backup-activate <bot> --confirm --acknowledge-risk` explicitly accepts possible duplicate source execution. These operations do not restore external account authority.

Historical v1 archives remain readable. New v2 archives record Host and resolved DSH tools versions independently; `null` means unavailable provenance. Compatibility follows data contracts and schema migration, not an exact DSH release. An older reader must be upgraded to read an unsupported newer format. `format-upgrade-required`, `upgrade-required` and `dependency-incompatible` identify unsupported data interpretation; `core-contract-invalid` requires a complete backup with a valid required core declaration; `package-invalid` identifies failed validation. `source-unavailable` means the source database must be repaired before export. Existing preview expiry, integrity, cancellation and destination checks still apply.

### Diagnostic logs

Tobs keeps an always-on local diagnostic log in `$DSH_HOME/botharness/logs.db` (30 days, 50 000 rows): Client action and navigation breadcrumbs, uncaught errors and console warnings, UI invariant violations, long frames and slow Host calls, plus Host warnings and BotHarness lifecycle lines. It never records typed text, message bodies or file contents, and nothing leaves the device. The Workspace Control Rail's **Diagnostic logs** button shows the last 24 hours and exports the same ZIP as the CLI.

```bash
deepseekbot diagnostic-logs [--kind all|error|perf|action] [--since <ms>] [--limit 1-1000]
deepseekbot diagnostic-logs-export --out logs.zip [--hours 1-168] [--offline] [--home <DSH_HOME>]
printf '%s' '{"version":1,"session":"agent-qa-0001","entries":[{"ts":1780000000000,"category":"action","level":"info","code":"click","fields":{"label":"Send"}}]}' | deepseekbot diagnostic-log-record
```

`diagnostic-logs` returns newest entries first (`source`, `category`, `level`, `code`, `session`, `fields`). The export ZIP holds `manifest.json` (range, versions, counts, redaction hits), `logs.jsonl` and a readable `timeline.txt`; home paths, tokens, secrets and emails are replaced, and the file is created exclusively. When the Host cannot be reached, cannot log in, or the plugin did not load, `diagnostic-logs-export` reads `$DSH_HOME/botharness/logs.db` directly and builds the same redacted ZIP; `--offline` skips the Host, `--home` points at another DSH home, and the result reports `source: "offline"` with the `fallback` reason. Besides Client entries, the log holds one `bot-turn` row per Bot turn (model, first-token and total time, steps, tool calls and errors, outcome; no message text), one `messaging-inbound` row per IM event (`handled`, `skipped` with a reason, or `refused`), and the Host's structured `{"event","phase"}` lines such as `messaging-outbox` as fielded rows. `diagnostic-log-record` writes Client entries the way the Web Client does, for agent QA; refusals are `invalid-report`, `report-too-large`, `rate-limited` (600 entries per minute) and `persistence-unavailable`.

### Message feedback (#2811)

Single-message feedback is separate from automatic telemetry. The Host owner prepares one frozen,
redacted snapshot. Preview defaults to 20 messages before and after the anchor; each count accepts
0–100. `conversation`, `sessions`, `inbox`, `deliveries`, and `relatedChats` default to true;
`wholeSessions` defaults to false. Inspect `files`, category choices and `summary.omissions` before
submitting. Execution records can contain repeated chat text even with `conversation: false`.

```bash
printf '%s' '{"channelId":"<channel>","messageId":"<message>","before":20,"after":20}' | deepseekbot feedback-preview
printf '%s' '{"token":"<preview-token>"}' | deepseekbot feedback-download --out evidence.zip
printf '%s' '{"token":"<preview-token>","feedback":{"rating":"bad","tags":["no-response"],"comment":"Synthetic QA"}}' | deepseekbot feedback-submit --confirm
```

Each command uses the normal live Host authentication and emits one JSON document. Download
creates a new file exclusively. Submit requires `--confirm`; rating is `good` or `bad`, tags are
optional fixed categories and comment accepts up to 500 Unicode characters. Secrets and content
belong on stdin/files, never command arguments. Preview tokens expire after 30 minutes, are scoped
to this Host connection, and only the last four snapshots remain. `preview-stale` requires a new
preview. A failed submission freezes its rating and snapshot; retry that same request to retain the
same report ID. To edit it, explicitly refresh the preview. Receipt returns `reportId`. Only rating/tags/comment, reference and version are sent to PostHog; diagnostic archives remain local downloads.

Submission uses the existing PostHog ingest path without extra configuration. No dedicated receiver or private archive storage is deployed. See [feedback and local diagnostics](message-feedback.md).

### Failed-turn feedback

`feedback-preview` accepts `failureTurn: true` alongside the canonical failed message's `channelId` and `messageId` in stdin JSON. Its frozen preview includes `uploadEvidence`: only the matching turn input and tool call/result events, redacted and capped at 128 KiB. Ambiguous/missing turn identity and oversized evidence refuse instead of uploading a whole Session. `feedback-submit --confirm` uploads that frozen turn with rating/tags/comment to the existing feedback endpoint. The diagnostic ZIP stays a separate download. Ordinary feedback keeps its existing metadata-only POST.

### Private credential tools in the direct runner

After a Bot has a live Orchestrator Agent, `bot-tools` also lists its registered `ask_secret`, `protected_cli`, `secret_http`, `secret_cli` and `secret_mcp_connect` tools. Invoke them with `bot-tool <bot-id> <tool> --args-stdin`. Arguments are a JSON object on stdin; never put private values or references in shell arguments. The runner uses the existing Agent and native tool execution/approval pipeline without calling the model or creating a new source. Missing live registration is refused. An execution approval can be pending while the command waits; use the usual approval commands or Web card. Private arguments/results are omitted from both direct and native diagnostic traces.

For several IM requests in one turn, call `ask_secret` with the existing account and field declaration plus the exact accepted `source_event_id` of the request being handled before consuming the references. Configured accounts reuse their values without another card or a Web notification address. Web and Schedule reuse omit the selector. `private-source-required` supplies this recovery; `private-source-invalid`, `private-source-unavailable`, `private-source-ambiguous`, `private-source-revoked` and `private-account-unavailable` distinguish the other refusals. Do not retry an unchanged operation, choose a historical source, or treat a Host refusal as a remote outage. Conflicting account associations require a new turn; revocation remains authoritative.
