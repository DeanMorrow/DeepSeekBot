# N6 脱敏同构 Fixture · 字段契约说明（交云端）

**性质**：全部 SYNTHETIC。不是正式 registry dump，不是 Owner 正式授权。  
**候选**：对照 `tobs-fork-965b628f5`（**未改实现、未改候选包**）。  
**Owner 卡**：仍等待用户；本包内 `display.audiences` 仅为测试样例。

## 1. 同构意图（categories → inventories → entry）

| 层                 | 关联方式（结构保留）                               | 本 fixture 取值                                                                 |
| ------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| 根 `categories[]`  | 分类目录列表；`id` + 相对 `entry` 路径             | `syn-cat-alpha` / `syn-cat-beta`；路径 `categories/syn-cat-*.json`（synthetic） |
| 根 `inventories[]` | 与分类同 `id`；`entry` 指向同一相对路径            | 同 id；含真实形元数据键（purpose/scope/machine_* 等）但值全 synthetic           |
| entry 文件         | `id`/`registryId` = inventory id；`items[]` 为条目 | `syn-item-001` 等；`entry` 字段用 `synthetic://…` URI，非真实路径               |

版本映射要点：

- 真实 KB 常用 `updated_at`（snake）；catalog-source 白名单偏 `updatedAt`（camel）及 `brief`。
- 同构 fixture **故意双写** `updated_at` +（在 inventory/entry 上）`updatedAt`/`brief`/`registryId`，以表达「正式源形 → Host 契约」映射意图；**当前实现仍可能在根键白名单处整表 invalid**（见复现）。
- `version`：根可为 string（真实形）；catalog-source inventory/entry 期望 number —— 清洁对照用 number。

## 2. 当前 965 公开 API 白名单（只读摘自交付 dist，不改实现）

- **ROOT_FIELDS**：`schemaVersion,sourceRef,version,updatedAt,display,inventories,id,role,entry,owner,brief,status,revisions`
- **CATEGORY_FIELDS**：`id,brief,name,version,updatedAt,entry,status,sourceRef,owner,visibility,private,display,audiences`
- **ENTRY_FILE_FIELDS**：`registryId,version,updatedAt,items,sourceRef,visibility,private,display,audiences`
- **ITEM_FIELDS**：`id,name,brief,visibility,private,display,audiences`

真实形多出的普通元数据键示例（结构键可保留，值必须 synthetic）：  
`anti_nesting,categories,contract,privacy,scorecard,purpose,scope,machine_entry,count,denominator_definition,…`

**兼容策略声明（审查方建议，未改实现）**：

1. **未知授权字段**（如 `permissionMode`、非 boolean 的 `private`、非 public/private 的 `visibility`、display 多余键、未知 audience token）→ **必须拒绝该层**（本包 `unknown-auth-field-deny` 复现）。
2. **普通非授权元数据**（purpose/scope/machine_*/count/scorecard/…）→ 建议 **忽略并保留清单**，勿整表 `invalid`；当前 965 对根未知键是整表 invalid（N6 缺口）。

## 3. 三套 fixture 对照

| 目录                                   | 意图                                                             | 期望（965 现状）                                |
| -------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| `fixtures/isomorphic-real-shape/`      | 同构正例意图：根含真实形键 + categories/inventories/entry 链完整 | **invalid**（根白名单）                         |
| `fixtures/clean-catalog-source-shape/` | 同关联、白名单安全的正例                                         | **active** + 两分类可见 + open items            |
| `fixtures/unknown-auth-field-deny/`    | 未知授权字段仍拒                                                 | active 但 `syn-cat-deny` **不出现**；无标题泄漏 |

## 4. 禁止项

- 不复制真实描述/治理正文；不出现真实用户名/目录/机器名/真实条目 id。
- 不把本包 `display` 写成正式授权；不改正式 registry；不改 965 候选实现。
