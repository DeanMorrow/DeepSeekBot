# 共享模型路由

聊天和概念图都调用 `createSharedModelRoute`。本仓库没有本机 composer 或概念图插件源码，所以这里不新增页面。

API易按协议使用不同基址，不能收成一个全局 `/v1`：

- `openai-chat` 只用于 `chat`，基址 `https://api.apiyi.com/v1`，路径 `/chat/completions`。
- `openai-images` 只用于 `image`，同一 OpenAI 基址，路径 `/images/generations`。结果没有视频任务号。
- `anthropic-messages` 只用于 `chat`，基址 `https://api.apiyi.com`，路径 `/v1/messages`。再加上 `/v1` 会被拒绝。
- `openai-videos` 只用于 `video`，OpenAI 基址，`POST /videos` 与 `GET /videos/{id}`。
- `apiyi-seedance` 只用于 `video`，基址 `https://api.apiyi.com`，`POST` 与 `GET /seedance/api/v3/contents/generations/tasks`。成功状态是 `succeeded`。公开文档没有取消端点，本地取消不发 DELETE。

存下的密钥不证明令牌分组已开通该型号。多个实例可以引用同一个 `credentialRef`，消费端不再保存一份密钥。

型号必须写进该实例的 allowlist。没有默认启用的型号。Kimi 走 `gateway: official` 和调用方给出的 https 基址，不会因为官网有这个型号就从 API易 发出。

手选锁优先。没有锁时，Auto 只在同一能力下恰好一个已配置实例、且该实例恰好一个型号时成功。多个供应商或多个型号返回 `auto-ambiguous`。没有密钥返回 `credential-missing`。聊天不能提交图像或视频，概念图不能提交聊天。

密钥只进 `SecretStore`。实例和任务的公开对象不含密钥。视频提交若没有解析出任务号，状态是 `submit-unknown`，同一项目和幂等键不会再次创建。取消只改本地状态，`remoteCancel` 为 `unverified`，不表示供应商退款或不会重复计费。
