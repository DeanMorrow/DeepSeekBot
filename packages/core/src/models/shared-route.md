# 共享模型路由

聊天和概念图都调用 `createSharedModelRoute`。本仓库没有本机 composer 或概念图插件源码，所以这里不新增页面。

API易按协议使用不同基址，不能收成一个全局 `/v1`：

- `openai-chat` 只用于 `chat`，基址 `https://api.apiyi.com/v1`，路径 `/chat/completions`。
- `openai-images` 只用于 `image`，同一 OpenAI 基址，路径 `/images/generations`。结果没有视频任务号。
- `anthropic-messages` 只用于 `chat`。基址 `https://api.apiyi.com`，实际请求是 `POST /v1/messages`，头是 `x-api-key` 和 `anthropic-version: 2023-06-01`，正文是 `model`、`max_tokens`、`messages`。不走 `/chat/completions`，也不加 `Authorization: Bearer`。
- `openai-videos` 只用于 `video`，OpenAI 基址，`POST /videos` 与 `GET /videos/{id}`。
- `apiyi-seedance` 只用于 `video`，基址 `https://api.apiyi.com`，`POST` 与 `GET /seedance/api/v3/contents/generations/tasks`。成功状态是 `succeeded`。公开文档没有取消端点，本地取消不发 DELETE。

存下的密钥不证明令牌分组已开通该型号。多个实例可以引用同一个 `credentialRef`，消费端不再保存一份密钥。

型号必须写进该实例的 allowlist。没有默认启用的型号。Kimi 走 `gateway: official` 和调用方给出的 https 基址，不会因为官网有这个型号就从 API易 发出。

手选锁优先。没有锁时，Auto 只在同一能力下恰好一个已配置实例、且该实例恰好一个型号时成功。多个供应商或多个型号返回 `auto-ambiguous`。没有密钥返回 `credential-missing`。聊天不能提交图像或视频，概念图不能提交聊天。

`createMemorySecretStore` 只是测试用的内存实现。生产环境的 DSH 凭证服务没有接到这条路由。`createModelCatalog` 也没有调用它。`chat` 和 `concept-art` 只是参数和锁，不是已接上的聊天界面或概念图插件。

密钥只进 `SecretStore`。图像只有能用现有 `inspectImage` 解码并认出格式时才记为 `base64`，并带上宽高。`mediaVerified` 一律是 `false`：这不是概念图可以交付的证明，交付前仍要自己检查格式和大小。解不开或不是 http(s) 的字符串是 `invalid-payload`，不是已完成的媒体。`untrusted-url` 只保留地址，不去请求。没有可取字段时是 `raw-provider-response`，错误是 `empty-artifact`。供应商后来返回成功时会清掉先前的 `provider-failed`。旧记录里的 `cancelled` 且没有 `localStop` 时，读取视为本地停止，但仍按原任务号查询。本地停止不是远端停止。

视频提交若没有任务号，状态是 `submit-unknown`，同一项目和幂等键不会再次创建。`cancel` 只把 `localStop` 设为真，并保留 `remoteTaskId`。之后 `resume` 仍查询该任务号，并写下 `providerStatus`。`remoteCancel` 为 `unverified`。这不是退款，也不表示远端已停止。
