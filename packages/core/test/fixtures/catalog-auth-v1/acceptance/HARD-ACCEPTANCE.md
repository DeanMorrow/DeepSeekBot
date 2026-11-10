# 冻结硬验收 · catalog-metadata-auth-v1（合成）· draft-rev2-20261106

生成：2026-11-06T15:50:14+08:00 Asia/Shanghai · **草案修订，未实施**

**真实双 Bot 运行待云端新合同实现才测；当前不可假报支持。**

## 元数据字段：意图 allowlist vs 封存实现实况

| 面                    | 字段                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------- |
| 授权意图 allowlist    | id, name, purpose, trigger, brief, entryRef, status, version, updatedAt                       |
| 封存 view 实投影      | id, brief, sourceRef, version, updatedAt, entryRef, status（**无**独立 name/purpose/trigger） |
| 封存 open item 实投影 | id, name, brief                                                                               |
| 技术元数据可列        | version, status, updatedAt, sourceRef                                                         |
| 禁止                  | 私扩正文；跟随 entry/item 指针读 skill/文档正文                                               |

新实现可将 purpose/trigger 映射进 brief 或显式投影，但须写明映射，且不得扩到正文。

## H1–H12（保留编号）+ H13–H20（追加）

| ID  | 断言                                                                                                |
| --- | --------------------------------------------------------------------------------------------------- |
| H1  | 两可信 Bot 同 owner **且**绑定本 catalogOwner/approvalOwner → view/open 元数据                      |
| H2  | 外 owner Bot → 拒                                                                                   |
| H3  | 伪 actor（无 Host 证明）→ 拒                                                                        |
| H4  | 正文/无关文件 → 拒；open 不跟指针读正文                                                             |
| H5  | view/open 门禁一致                                                                                  |
| H6  | 撤权立即生效                                                                                        |
| H7  | 合成 fixtures 在新实现上正例                                                                        |
| H8  | 绝对路径仅经 Host 受信源映射/允许根；realpath/symlink/越界拒；缺文件 unreachable 不造目录           |
| H9  | 未知受众 → 层拒                                                                                     |
| H10 | 仅指纹绑定的已知 string 散文/指针可适配且须执行 §7；未知/对象/新版本/未证明 → 拒层；只留字节≠已执行 |
| H11 | 更窄 private 仍拒                                                                                   |
| H12 | all-bots / bot:* 不生效                                                                             |
| H13 | 跨 catalog owner → 拒                                                                               |
| H14 | 仅 session==bot.ownerId、无 catalogOwner/approvalOwner 绑定 → 拒                                    |
| H15 | registry.owner / 调用参数冒充 approvalOwner → 拒                                                    |
| H16 | 已知 legacy 适配却不执行 §7 → 不合规/拒                                                             |
| H17 | privacy/contract 对象化或未绑定字符串或新 contract_version → 拒层                                   |
| H18 | 绝对路径越允许根 / symlink 逃逸 → 拒且不泄路径                                                      |
| H19 | 迁移镜像无真实文件 → unreachable，不 mkdir                                                          |
| H20 | open 只投影 item 元数据 allowlist                                                                   |

机器可读：`HARD-ACCEPTANCE.frozen.json`
