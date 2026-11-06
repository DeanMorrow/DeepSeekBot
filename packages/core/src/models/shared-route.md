# 共享模型路由

聊天和概念图都调用 `createSharedModelRoute`。本仓库没有本机 composer 或概念图插件源码，所以这里不新增页面。

API易只接受已经核对过的三种协议，基址是 `https://api.apiyi.com/v1`：

- `openai-chat` 只用于 `chat`，路径 `/chat/completions`。文档：<https://docs.apiyi.com/api-capabilities/openai/compatible>
- `openai-images` 只用于 `image`，路径 `/images/generations`。文档：<https://docs.apiyi.com/en/api-capabilities/gpt-image-2/text-to-image>
- `openai-videos` 只用于 `video`，提交 `POST /videos`，恢复 `GET /videos/{taskId}`。文档：<https://docs.apiyi.com/api-capabilities/oxygen/video-generation>

型号必须写进该实例的 allowlist。没有默认启用的型号。Kimi 走 `gateway: official` 和调用方给出的 https 基址，不会因为官网有这个型号就从 API易 发出。

手选锁优先。没有锁时，Auto 只在同一能力下恰好一个已配置实例、且该实例恰好一个型号时成功。多个供应商或多个型号返回 `auto-ambiguous`。没有密钥返回 `credential-missing`。聊天不能提交图像或视频，概念图不能提交聊天。

密钥只进 `SecretStore`。实例和任务的公开对象不含密钥。视频提交若没有解析出任务号，状态是 `submit-unknown`，同一项目和幂等键不会再次创建。取消只改本地状态，`remoteCancel` 为 `unverified`，不表示供应商退款或不会重复计费。
