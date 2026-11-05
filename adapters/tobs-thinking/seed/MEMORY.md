# 核心记忆

细节不在本文件里。需要时用工具去读，不要假设它们已经在上下文中。

- 技能：`.dsh/skills/` 下的 the-top-thinking、fix-bug-doctor、delivery-gate、recall-and-memory、super-agent。代码岗另有 ecc-code-baseline。super-agent 的契约在 `.botharness/super-agent.json`，官方包未安装。
- 命令：`node bin/adapt.mjs`。私有记录在 `memory/private-bank.json`。共享记录只放已批准且脱敏的教训，放在双方都有授权的工作区里，不要和私有记录混在一个文件。
- 交付记录交给 `gate`。没有第二次执行的调用证据，就不能写成通过。
- 常驻上限大约是灵魂 5000 字、核心记忆 3000 字。超出的部分会被截断。截断不是加载成功。
