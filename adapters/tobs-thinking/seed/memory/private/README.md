# 私有记录放哪

把 `private-bank.json` 放在这个 Bot 自己的 Memory 里。文件夹分开并不能阻止别人读取。真正挡住另一个 Bot 的，是它的会话只能读自己的 Memory 和已经批准的工作区。

读写请用 `node bin/adapt.mjs private-add` 和 `private-read`，并带上这个 Bot 的身份。不要把私聊原文抄进共享文件。
