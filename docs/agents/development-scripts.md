# Development scripts

Source-file comments were removed under [#449](https://github.com/BotHarness/BotHarness/issues/449). These are the operational instructions that should remain readable without opening implementation files. Use the pinned toolchain in [AGENTS.md](../../AGENTS.md); secrets stay machine-local.

Vitest runs test files in parallel workers, one isolated worker per file; Git-backed fixtures each use their own temporary repository. Run `pnpm test` and `pnpm docs:build` sequentially; Vitest cannot coordinate a separately launched docs build.

## Group evaluation completion

`scripts/e2e-group-busy-review.mjs` v3 ends an episode early only after an output or exposed
revocation, completed interventions, settled responsibility, and 12 seconds of idle, stable
usage. `scripts/e2e-group-responsibility.mjs` reads the isolated loopback Profile's existing
database without writing: the acting Bot's original Admission and every episode Bot's
observed or snoozed Admission must be resolved or ignored. Unopened silent peer copies do
not owe work. Use fresh Bots per episode; the reader deliberately includes their work across
Channels, including prelude and DM work. Missing source facts or read errors fail collection
instead of implying an empty Inbox. The retained pending list is bounded to 100 entries;
the count and completion decision include all entries.

Keep the 240-second logical outcome cutoff separate from actual stop and final usage
settlement. A reply before cutoff can be correct while accounting remains censored because
the original request is still snoozed. Conversely, resolved Admissions do not prove semantic
completion: the reviewer must read the full Session, Tools and conversations. Preserve older
frozen cohorts and report any unobserved future cost; never silently replace their protocol
or treat a preparation reply as the final task outcome.

## CI test plan

The `verify` workflow runs lint, format, workspace typecheck (including mobile) and repository build on every pull request. `scripts/ci-plan.mjs` selects tests, the docs site build, and mobile verification independently:

- **Full**: pushes to `main`, the nightly schedule, manual dispatch, the `ci:full` label, and any pull request that changes a full-run input below. The suite runs in parallel shards.
- **Affected**: every other pull request uses Vitest related-test selection on its changed files, plus every test-area file that names a changed path as a string (for example a fixture, migration, workflow or script read with `fs` or run as a subprocess) and the import closure of such a named script.
- **None**: a pull request whose changed paths cannot reach any test, such as screenshots, change fragments and prose.

The `mobile-export` job runs Expo Doctor and both iOS/Android bundle exports only for mobile app, config, resource or native-module changes, transitive shared imports, or full-run configuration inputs. The existing Babel parser reads JavaScript/TypeScript imports, re-exports and literal `require` calls; the planner follows relative paths and platform variants from mobile source and config; workspace package imports conservatively include the package. Mobile tests, store copy and prose alone do not trigger bundle exports. The workspace typecheck and related tests still cover them. Unknown paths, incomplete diffs, removed/renamed shared code, or imports that cannot be traced safely retain mobile verification. Main pushes, nightly/manual/release verification and `ci:full` also retain it. The plan summary explains each mobile decision. Both platforms stay in one Expo invocation because their work already overlaps. Bundle exports do not replace native compilation or device QA.

The `perf-budget` job launches an isolated Host, seeds a 600-message Group and runs `scripts/perf-idle-timeline.mjs` against [`scripts/perf-budgets/timeline.json`](../../scripts/perf-budgets/timeline.json). It runs when a pull request changes Client source (`packages/client/src/`), the performance scripts or budgets, or the workflow, and on every full run. Structure budgets (mounted messages, DOM nodes, heap, scroll jumps, blank gaps, page errors) fail the job; timing budgets only warn, because shared runners are noisy. The run makes no model calls; a placeholder `DEEPSEEK_API_KEY` only lets the Client open Bot mode. The summary, the budget result and a page screenshot on failure are uploaded as the `timeline-perf` artifact. See [performance observation and verification](ax-performance.md).

The optional `mobile-native-ios` job runs only when a manual `verify.yml` dispatch sets `ios_hardware_send_tests=true`; its default is false, including pull requests, main, schedules and release verification. It uses the standard `xcode-27` runner with read-only repository access and no account, signing or release credentials. CNG enables only the local HardwareSend test specification. The independent Pods test-host scheme first proves ordinary command delivery, then exercises the two composition/focus regressions without building the Tobs app. The aggregate requires this job only when selected. Artifacts retain only synthetic test logs/results and scheme/simulator metadata for seven days; they do not include DerivedData, Pods, app profiles or real user data. See [HardwareSend](../../apps/mobile/modules/hardware-send/README.md#ios-composition-regression-target) for the test boundary and remaining device checks.

For affected tests, `scripts/ci-affected.mjs` asks the pinned Vitest dependency graph for the exact test files once. Zero files finish successfully; fewer than 60 run on that same planning runner. The planner installs the frozen dependencies once for both Babel and Vitest. Selections of 60 or more files run in three deterministic, disjoint shards on separate runners. Shards execute exact Vitest test specifications, reject missing files, and fail on incomplete runs or test errors. The docs-site test stays in its separate job. The threshold limits duplicated checkout/install overhead on small PRs; file-count balancing does not promise equal execution time.

The required aggregate check keeps its existing name. Planned skips are accepted; selected jobs must succeed, including the planning job and any dispatched affected shards. Failures and cancellations block the check. Every job uses the frozen workspace lockfile and pinned toolchain when installing dependencies.

The docs site build test (`apps/docs/test/changelog-public-surfaces.test.ts`) runs in its own job: on full runs, when a changed path is a docs site input below, when it is imported by `apps/docs/astro.config.ts`, `scripts/sync-docs.mjs` or `scripts/sync-slides.mjs`, or when the test names it.

A removed or renamed code file, or a path that no rule classifies, falls back to a full run. `pnpm lint` runs `node scripts/ci-plan.mjs --check`, which fails when a tracked file matches no rule, a rule matches no tracked file, a test file is outside the Vitest include, the workflow's aggregate job does not depend on every job or loses the required check name, the workflow filters paths, or this table is stale. Regenerate the table with `node scripts/ci-plan.mjs --write`.

Run `node scripts/ci-plan.mjs --base origin/main` to print the plan and the exact commands for your branch, committed and uncommitted changes included.

<!-- BEGIN generated by scripts/ci-plan.mjs -->

| Path                                                                                                                                                      | Pull request runs   | Docs site | Why                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------- | ------------------------------------------------------------------------------- |
| `package.json`                                                                                                                                            | Full suite          | Yes       | Workspace manifest                                                              |
| `*/*/package.json`                                                                                                                                        | Full suite          | Yes       | Package manifests                                                               |
| `pnpm-lock.yaml`                                                                                                                                          | Full suite          | Yes       | Lockfile                                                                        |
| `pnpm-workspace.yaml`                                                                                                                                     | Full suite          | Yes       | Workspace layout and catalog                                                    |
| `patches/**`                                                                                                                                              | Full suite          | Yes       | Dependency patches                                                              |
| `.node-version`                                                                                                                                           | Full suite          | Yes       | Node version                                                                    |
| `vitest.config.ts`                                                                                                                                        | Full suite          | Yes       | Test runner config                                                              |
| `tsconfig.json`                                                                                                                                           | Full suite          | Yes       | Root TypeScript config                                                          |
| `*/*/tsconfig.json`                                                                                                                                       | Full suite          | Yes       | Package TypeScript configs                                                      |
| `tsdown*.config.ts`                                                                                                                                       | Full suite          | Yes       | Bundle configs                                                                  |
| `scripts/stylex-plugin.mjs`                                                                                                                               | Full suite          | Yes       | StyleX transform used by every test                                             |
| `.github/workflows/verify.yml`                                                                                                                            | Full suite          | Yes       | The verify workflow itself                                                      |
| `.github/workflows/npm-release.yml`                                                                                                                       | Full suite          | Yes       | Release verification and package gates                                          |
| `scripts/published-product-provider.json`                                                                                                                 | Full suite          | Yes       | Published Provider reuse qualification                                          |
| `scripts/ci-plan.mjs`                                                                                                                                     | Full suite          | Yes       | This test plan                                                                  |
| `scripts/ci-affected.mjs`                                                                                                                                 | Full suite          | Yes       | Affected test selection and execution                                           |
| `packages/core/src/**`                                                                                                                                    | Related tests       | Yes       | Core source; the docs site also reads it for reference pages                    |
| `packages/*/src/**`                                                                                                                                       | Related tests       |           | Package source                                                                  |
| `packages/core/test/fixtures/profile-backup/**`                                                                                                           | Full suite          | Yes       | Historical backup archives are loaded dynamically by restore and CLI tests      |
| `packages/core/test/fixtures/memory-images/**`                                                                                                            | Full suite          | Yes       | Binary image fixtures are loaded dynamically by Host, CLI and mobile tests      |
| `packages/*/test/**`                                                                                                                                      | Related tests       |           | Package tests and helpers                                                       |
| `packages/*/lib/**`                                                                                                                                       | Related tests       |           | Committed client bundles read by stylesheet tests                               |
| `packages/*/extension/**`                                                                                                                                 | Related tests       |           | Browser extension sources                                                       |
| `packages/*/profile-extension/**`                                                                                                                         | Related tests       |           | Browser profile extension sources                                               |
| `packages/*/assets/**`                                                                                                                                    | Related tests       |           | Package assets                                                                  |
| `packages/computer/native/**`                                                                                                                             | Related tests       |           | Windows Local Computer media helper source and protocol fixtures                |
| `packages/*/migrations/**`                                                                                                                                | Related tests       |           | D1 migrations read by worker test harnesses                                     |
| `packages/client/appearance-palette.LICENSE`                                                                                                              | No tests of its own |           | License notice for the scoped upstream palette                                  |
| `packages/*/scripts/**`                                                                                                                                   | Related tests       |           | Package scripts                                                                 |
| `packages/cloudflared/*/package.json`                                                                                                                     | Related tests       |           | Pinned cloudflared platform package scaffolds read by the release packer        |
| `packages/*/*.yml`                                                                                                                                        | Related tests       |           | Product patches                                                                 |
| `packages/*/wrangler.jsonc`                                                                                                                               | Related tests       |           | Worker configs                                                                  |
| `packages/*/{README.md,THIRD_PARTY_NOTICES.md,LICENSE,.gitignore}`                                                                                        | No tests of its own |           | Package prose and ignores                                                       |
| `apps/docs/test/**`                                                                                                                                       | Related tests       | Yes       | Docs tests and fixtures                                                         |
| `apps/docs/**`                                                                                                                                            | Related tests       | Yes       | Docs site                                                                       |
| `apps/presentations/**`                                                                                                                                   | No tests of its own | Yes       | Slides embedded in the docs site                                                |
| `apps/mobile/{app,src,test,scripts}/**`                                                                                                                   | Related tests       |           | Mobile app source, tests and scripts                                            |
| `apps/mobile/modules/**/app.plugin.js`                                                                                                                    | Related tests       |           | Local native config plugins                                                     |
| `apps/mobile/modules/**/ios/**`                                                                                                                           | No tests of its own |           | Apple Expo adapters, compiled and exercised in the reserved Mac native QA batch |
| `apps/mobile/modules/**`                                                                                                                                  | No tests of its own |           | Local Expo modules, checked by Android native unit tests                        |
| `apps/mobile/targets/**`                                                                                                                                  | No tests of its own |           | Apple extension targets, built on a Mac by Expo prebuild                        |
| `apps/mobile/{app.json,app.config.js,eas.json,metro.config.js}`                                                                                           | Related tests       |           | Mobile app config                                                               |
| `apps/mobile/with-*.js`                                                                                                                                   | Related tests       |           | Mobile native config plugins                                                    |
| `apps/mobile/locales/**`                                                                                                                                  | Related tests       |           | Translated iOS permission prompts                                               |
| `apps/mobile/assets/**`                                                                                                                                   | Related tests       |           | Mobile app icons and bundled images                                             |
| `apps/mobile/.maestro/**`                                                                                                                                 | No tests of its own |           | Maestro flows, run on a Mac simulator                                           |
| `apps/mobile/store/**`                                                                                                                                    | No tests of its own |           | Store listing answers, entered in the store consoles                            |
| `apps/mobile/{README.md,AGENTS.md,CLAUDE.md,DESIGN.md,OVERLAYS.md,OVERLAYS.zh.md,.gitignore}`                                                             | No tests of its own |           | Mobile app prose, agent rules and ignores                                       |
| `scripts/test/**`                                                                                                                                         | Related tests       |           | Script tests                                                                    |
| `.github/workflows/readme-status.yml`                                                                                                                     | Related tests       |           | README status collection and publication                                        |
| `docs/assets/readme/pixel/source/**`                                                                                                                      | Related tests       |           | README renderer source geometry and licenses                                    |
| `scripts/fixtures/**`                                                                                                                                     | Related tests       |           | Script test fixtures                                                            |
| `adapters/tobs-thinking/**`                                                                                                                               | Related tests       |           | Installable Tobs thinking seed; a script test imports it                        |
| `scripts/product-provider/**`                                                                                                                             | Related tests       |           | Product provider scripts                                                        |
| `scripts/perf-budgets/**`                                                                                                                                 | Related tests       |           | Performance budgets, checked by the timeline budget job                         |
| `scripts/*`                                                                                                                                               | Related tests       |           | Repository scripts                                                              |
| `docs/**`                                                                                                                                                 | No tests of its own | Yes       | Documentation synced into the docs site                                         |
| `{CHANGELOG,CHANGELOG.zh,CONTEXT,CONTEXT.zh}.md`                                                                                                          | No tests of its own | Yes       | Release Ledger and glossary pages                                               |
| `.agents/skills/dsh-plugin-dev/**`                                                                                                                        | No tests of its own | Yes       | DSH skill pages on the docs site                                                |
| `.agents/**`                                                                                                                                              | No tests of its own |           | Locked agent skills                                                             |
| `agent/**`                                                                                                                                                | No tests of its own |           | Agent skill mirrors                                                             |
| `.claude/**`                                                                                                                                              | No tests of its own |           | Claude Code settings and skills                                                 |
| `.humanlayer/**`                                                                                                                                          | No tests of its own |           | PR description drafts                                                           |
| `changes/**`                                                                                                                                              | No tests of its own |           | Change fragments, checked by lint                                               |
| `.github/pr-screenshots/**`                                                                                                                               | No tests of its own |           | PR evidence images                                                              |
| `.github/pr-assets/**`                                                                                                                                    | No tests of its own |           | PR evidence assets                                                              |
| `.github/{ISSUE_TEMPLATE,DISCUSSION_TEMPLATE}/**`                                                                                                         | No tests of its own |           | Issue and discussion templates                                                  |
| `.github/pull_request_template.md`                                                                                                                        | No tests of its own |           | PR template                                                                     |
| `.github/workflows/*.yml`                                                                                                                                 | No tests of its own |           | Release workflows                                                               |
| `{prototype,dsh_research,design}/**`                                                                                                                      | No tests of its own |           | Prototypes and research notes                                                   |
| `*.md`                                                                                                                                                    | No tests of its own |           | Root prose                                                                      |
| `{LICENSE,.lintstagedrc.json,.husky/pre-commit,.gitignore,.easignore,.gitattributes,.oxlintrc.json,.oxfmtrc.json,skills-lock.json,vps.local.example.env}` | No tests of its own |           | Root metadata; lint and format always run                                       |

<!-- END generated by scripts/ci-plan.mjs -->

## Real-model scenarios

Unit tests script the Orchestrator, so they cannot catch a model that stops calling a tool the way a flow needs. `scripts/e2e-llm-scenarios.mjs` runs multi-Bot scenarios against a real model on an isolated Host and asserts on canonical Channel state (mentions, deliveries, replies), never on wording. `node scripts/e2e-llm-scenarios.mjs --list` prints each scenario and the paths it guards.

```bash
pnpm build
node scripts/e2e-llm-scenarios.mjs --launch                       # every scenario
node scripts/e2e-llm-scenarios.mjs --launch --scenario two-workers-report --attempts 3
node scripts/e2e-llm-scenarios.mjs --launch --changed-from origin/main  # only what your branch touches
```

A scenario passes when any of its `--attempts` (default 2) passes; the JSON report under `.humanlayer/llm-e2e/` keeps every attempt and its transcript, so a flaky flow stays visible. The Host needs a model credential (see [AX shared default model](ax-model.md)); in a cloud container whose proxy injects `opencode.ai`, run `node scripts/dev-model.mjs setup --from-env --model deepseek-v4.1-flash` once (`OPENCODE_GO_API_KEY` is set in the environment).

### Tokens and models

Each attempt also records what its Bots spent: uncached input, output, cache-read and cache-write tokens, summed from DSH's own per-Session token totals for the scenario's Bots (a bucket a provider leaves out counts as zero, as in DSH). The Host's usage records (`deepseekbot bot-usage`) are read alongside as `host`; they keep a bucket unknown when any request omitted it (ADR-0094), so on routes that omit cache tokens on a cache miss the Host shows cache read as unknown while the Session totals carry the exact number. `hostMatches` is false when the Host's known total disagrees. Use this to judge a design change on cost and on how each model copes, not only on pass/fail:

```bash
# Measure: 5 independent runs per scenario on each model (no retry), saved as the baseline.
node scripts/e2e-llm-scenarios.mjs --launch --runs 5 \
  --model opencode-go/deepseek-v4.1-flash --model opencode-go/glm-5.3-flash@low \
  --report .humanlayer/llm-e2e/baseline.json
# After the change: same runs, with deltas against the baseline.
node scripts/e2e-llm-scenarios.mjs --launch --runs 5 \
  --model opencode-go/deepseek-v4.1-flash --model opencode-go/glm-5.3-flash@low \
  --baseline .humanlayer/llm-e2e/baseline.json
# Compare two saved reports without running anything.
node scripts/e2e-llm-scenarios.mjs --compare before.json after.json
```

Every run uses `opencode-go/deepseek-v4.1-flash` unless `--model` names others (`--model host-default` keeps the Host's own default). `--model provider/model[@effort]` applies a Model Preset to every scenario Bot; the route must be in the Host's model catalog (`deepseekbot model-catalog`), and an attempt whose usage shows a different route is flagged `routeMismatch`. `--runs` counts every run, so the pass rate is measured; `--attempts` keeps retrying until one passes and suits a gate. Each report gets a Markdown table next to it (`.md`, and the workflow's job summary) with pass rate, mean tokens per run in each bucket and the cache-hit rate (cache read over all prompt tokens); with `--baseline` it adds the pass-rate change and token delta per scenario and model. Usage is read after the totals stop moving for `--settle` seconds (default 12), since Bots keep working after the asserted state; a run whose usage never settled says `settled: false`. A table cell marked `(Host differs)` means the Host's usage total disagreed with the Session totals.

The `llm e2e` workflow runs them nightly, after a push to `main` that touches a scenario's paths (only those scenarios), on manual dispatch, and on a pull request labeled `ci:llm-e2e`. It uses the OpenCode Go subscription through the `OPENCODE_GO_API_KEY` repository secret on `deepseek-v4.1-flash` (selected with `scripts/dev-model.mjs setup --from-env --model deepseek-v4.1-flash`) and skips with a notice without it. It is never part of the required `verify` check. When a feature adds a model-driven flow, add a scenario with the paths it depends on.

> > > > > > > origin/claude/bot-mention-wake-te5p0m

## Generated assets and pages

| Command or script                | Source and output contract                                                                                                                                                                                                                                                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm bot:icons`                 | Edit the mascot PNGs under `packages/client/assets/bot/`, then regenerate `packages/client/src/client/bot-icon-assets.ts`. The single-file Client Bundle carries the images as data URIs; do not edit the generated module. See [ADR-0057](../adr/0057-the-bot-mark-is-a-user-chosen-asset.md).                                          |
| `scripts/sync-docs.mjs`          | Repo documentation and the DSH skill are canonical. The script rebuilds the English `docs` and Chinese `docs-zh` content trees, development reference, changelog pages, and DSH pages. Missing translations are marked as such. Do not edit generated `apps/docs/src/content/**/dev/**`, `**/dsh/**`, or changelog content.              |
| `pnpm og:font`                   | After changing Chinese page titles or descriptions, regenerate the committed Noto Sans SC subset for CanvasKit OG cards. The script derives glyphs from published frontmatter plus printable ASCII, downloads the pinned full font into an ignored cache, and needs network access. Run a docs build first when generated pages changed. |
| `pnpm slides:build`              | Edit decks under `apps/presentations/slides/<id>/`; the generated `apps/docs/public/slides/` tree is ignored. The script builds assets for `/slides/`, writes static copies for deep links and presenter routes, and marks presenter copies `noindex`. See [presentation authoring](../../apps/presentations/AGENTS.md).                 |
| `scripts/development-status.mjs` | Projects data is reduced to public, in-progress Issue and PR facts before it reaches the docs status surface. Private or unsupported entries are excluded; a changed Project field schema fails explicitly.                                                                                                                              |

For `pnpm slides:build`, each deck supplies `apps/presentations/slides/<id>/index.tsx` and a `meta.title` value. The build sets `OPEN_SLIDE_BASE=/slides/` and writes the public tree served at `https://botharness.ai/slides/`. It creates static deep-link copies at `apps/docs/public/slides/s/<id>/index.html` and `apps/docs/public/slides/s/<id>/presenter/index.html`. The home route gets the shared title and description; deck routes add the deck title. Each page gets a canonical URL, favicon, Open Graph and Twitter metadata. Presenter copies point at the deck canonical URL and add `noindex`.

## Installed-profile checks

- `node scripts/e2e-personabot-create.mjs` builds and links an isolated DSH Web Profile, creates a native Workspace and PersonaBot through the authenticated Gateway, restarts the Host, and verifies the same Memory Git HEAD. Add `--with-dm` to check a real DM after restart. This path does not require a model reply. See the [local development loop](../client-bridge.md).
- To check a first DM and its Bot reply, follow the [Bot DM reply](../../.agents/skills/verify-deepseekbot/features/bot-dm-reply.md) journey of the verify-deepseekbot skill.
- `node scripts/e2e-mobile-sim.mjs` (Mac) installs the phone app on its own erased iOS Simulator (rebuilding only when the native fingerprint changes), pairs it with two isolated Hosts by deep link, switches computers and opens notifications delivered with `xcrun simctl push`, including a real Tool approval (needs a model; `--no-approval` skips it). See [the mobile README](../../apps/mobile/README.md#drive-it-on-the-ios-simulator-mac).
- The other `scripts/e2e-*.mjs` files are issue-specific installed-profile regressions for Channel, Group, Assignment, roster, composer, and tool approval behavior. Their associated Issue and the [development loop](../client-bridge.md) define prerequisites. `scripts/e2e-harvest.mjs` boots its own Profile and requires a real model; `--keep` leaves the isolated home for inspection.
- `scripts/probe-computer-*.mjs` exercise Computer export and shared viewing paths against the installed Host. Use isolated Profiles and review the corresponding Issues [#154](https://github.com/BotHarness/BotHarness/issues/154) and [#150](https://github.com/BotHarness/BotHarness/issues/150) before running them.

### Release verification reuse

Main verification is isolated by source commit, so a later main push cannot cancel the commit
selected for release. PR verification still cancels obsolete runs for the same PR. The concurrency
key also includes the caller workflow, keeping normal verification separate from release fallback.

The npm release workflow checks tag ancestry and looks for a successful `verify.yml` push run on
that exact SHA. It waits for an existing run, then calls the same reusable verification workflow if
no success is available. Tag-push context selects the full three-shard test plan, including the
normal static, docs, mobile and Host smoke gates. Failed or cancelled verification blocks packing;
a skipped fallback permits packing only when exact-SHA reuse succeeded.

The package build, frozen release plan, supported-DSH fresh installation checks and Human
`npm-release` environment approval remain required. Reusing source verification never substitutes
for qualification of the exact tarballs that will be published.

### Published Provider reuse

Product preparation uses `scripts/published-product-provider.json` to verify an already
published Provider before reusing its exact registry archive. It records the independently
verified package integrity, upstream source, runtime file digest/count and qualification run.
After publishing a new Provider with the product, refresh this record from the frozen inventory
and registry readback before preparing later product releases. A different runtime or registry
archive still fails closed; an unpublished Provider continues through first-publication preparation.
The historical `scripts/provider-release-plan.json` belongs to the separate standalone Provider
publication workflow and is not the product's reuse authority.
