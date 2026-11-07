---
name: recall-and-memory
description: 任务前按 Bot 身份召回私有复盘和已批准的共享教训，出错后写回。共享只收脱敏后的项目事实，不收私聊。
whenToUse: 开始一个可能重复踩坑的任务之前，以及一次失败或修复收工、准备留下教训时加载。
---

# 召回和记忆

目录分开不是权限。记录能不能读，由命令里的 Bot 身份决定，再由会话本身的工作区授权挡住文件。

## 任务前

运行：

`node bin/adapt.mjs recall --actor <当前 Bot> --private memory/private-bank.json --shared <已授权的共享文件> --task "<任务提要>"`

先看返回的私有条目和共享条目，再动手。没有共享文件就不要编一个路径。共享文件里只应有已批准且脱敏的教训。

## 出错之后

只属于这一次、这一个 Bot 的教训：

`node bin/adapt.mjs private-add --actor <当前 Bot> --bank memory/private-bank.json --task "<任务提要>" --lesson "<教训>"`

反复出现、其他 Bot 也该避免的习惯问题，先去掉私聊、姓名和原文，再发布：

`node bin/adapt.mjs publish --actor <当前 Bot> --bank <共享文件> --task "<提要>" --lesson "<脱敏教训>" --approved yes --desensitized yes`

没被批准，或教训里还带着私聊原文，命令会拒绝，不能改用复制文件绕过。审查别人时只交出命令返回的简短材料，不要附上私有记录。

不要把私聊写进按代码仓库共享的外部记忆库。那个库默认会让同一个仓库上的人一起看见。

新 Bot 用本种子创建时，会带上这些技能。指定的旧 Bot 只复制技能目录，不改它的灵魂文件，也不碰其他 Bot。
