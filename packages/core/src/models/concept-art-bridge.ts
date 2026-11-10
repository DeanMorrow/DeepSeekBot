import type { AttachmentStore } from '../attachments/store.js';
import type { ConceptArtRequest, createConceptArtConsumer } from './concept-art-consumer.js';
import { accountLockDrift, selectApiyiBinding, type ApiyiAccount } from './apiyi-account.js';
import {
  SharedRouteError,
  verifiedApiyiRoute,
  type createSharedModelRoute,
} from './shared-route.js';

type Consumer = ReturnType<typeof createConceptArtConsumer>;
type Route = ReturnType<typeof createSharedModelRoute>;

type BridgeResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };

function invalid(message: string): BridgeResult<never> {
  return { ok: false, error: { code: 'invalid-input', message } };
}

function failed(error: unknown): BridgeResult<unknown> {
  if (error instanceof SharedRouteError) {
    return { ok: false, error: { code: error.reason, message: error.message } };
  }
  if (typeof error === 'object' && error !== null) {
    const status = (error as { status?: unknown }).status;
    const reasons = (error as { reasons?: unknown }).reasons;
    if (typeof status === 'string' && Array.isArray(reasons)) {
      return { ok: true, value: { status, reasons, submitCalls: 0, optimization: 'chat-model' } };
    }
  }
  return { ok: false, error: { code: 'unavailable', message: 'Concept art is not available.' } };
}

function requestBody(value: unknown): ConceptArtRequest | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const body = value as Record<string, unknown>;
  const style = body['style'];
  if (typeof body['raw_requirement'] !== 'string') return undefined;
  if (typeof style !== 'object' || style === null) return undefined;
  const state = (style as { state?: unknown }).state;
  if (state !== 'none' && state !== 'selected' && state !== 'disabled') return undefined;
  if (typeof body['sessionId'] !== 'string' && body['sessionId'] !== null) return undefined;
  if (typeof body['operation_id'] !== 'string' || typeof body['route_idempotency_key'] !== 'string')
    return undefined;
  if (typeof body['input_fingerprint'] !== 'string' || typeof body['submit_allowed'] !== 'boolean')
    return undefined;
  if (typeof body['context_version'] !== 'string' && typeof body['context_version'] !== 'number')
    return undefined;
  return body as unknown as ConceptArtRequest;
}

export function createConceptArtBridge(input: {
  conceptArt?: Consumer;
  sharedRoute?: Route;
  attachments?: AttachmentStore;
  sessionForBot?: (botSlug: string) => string | null;
  /** Live DSH Models-page accounts. Concept art does not write this store or the Host default. */
  apiyiAccounts?: () => Promise<ApiyiAccount[]>;
}) {
  return {
    async conceptArt(payload: unknown): Promise<BridgeResult<unknown>> {
      if (input.conceptArt === undefined || input.sharedRoute === undefined) {
        return {
          ok: false,
          error: { code: 'unavailable', message: 'Concept art is not on this Host.' },
        };
      }
      const body =
        typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
      const action = body['action'];
      try {
        if (action === 'routes') {
          const instances = await input.sharedRoute.listInstances();
          const chat = await input.sharedRoute.describeConsumer('chat', 'chat');
          const image = await input.sharedRoute.describeConsumer('concept-art', 'image');
          const accounts = input.apiyiAccounts === undefined ? [] : await input.apiyiAccounts();
          return {
            ok: true,
            value: {
              protocols: (['openai-chat', 'openai-images', 'anthropic-messages'] as const).map(
                (protocol) => verifiedApiyiRoute(protocol),
              ),
              instances,
              accounts,
              chat,
              image,
              hostDefault: 'unchanged',
              allowlist: 'user-entered-not-provider-checked',
            },
          };
        }
        if (action === 'accounts') {
          return {
            ok: true,
            value: {
              accounts: input.apiyiAccounts === undefined ? [] : await input.apiyiAccounts(),
              allowlist: 'user-entered-not-provider-checked',
              hostDefault: 'unchanged',
            },
          };
        }
        if (action === 'bindAccount') {
          if (input.apiyiAccounts === undefined) {
            return {
              ok: false,
              error: {
                code: 'unavailable',
                message: 'The DSH model directory is not available on this Host.',
              },
            };
          }
          const bind = body['bind'];
          if (typeof bind !== 'object' || bind === null)
            return invalid('Account binding is required.');
          const record = bind as Record<string, unknown>;
          const capability = record['capability'];
          if (
            (capability !== 'chat' && capability !== 'image') ||
            typeof record['provider'] !== 'string' ||
            typeof record['model'] !== 'string'
          ) {
            return invalid(
              'Choose chat or image, the Models-page provider, and one of its models.',
            );
          }
          if ('key' in record) {
            return invalid(
              'The key stays on the DSH Models page. This binding does not accept one.',
            );
          }
          const binding = selectApiyiBinding(await input.apiyiAccounts(), {
            provider: record['provider'],
            model: record['model'],
            capability,
          });
          const verified = verifiedApiyiRoute(binding.protocol);
          const saved = await input.sharedRoute.saveInstance({
            id: binding.instanceId,
            gateway: verified.gateway,
            vendor: 'apiyi',
            capability: verified.capability,
            protocol: verified.protocol,
            baseUrl: verified.baseUrl,
            models: binding.account.models,
            credentialRef: binding.account.credentialRef,
            accountProvider: binding.account.provider,
            accountBaseUrl: binding.account.baseUrl,
            accountApi: binding.account.api,
          });
          input.sharedRoute.lock(binding.consumer, binding.capability, saved.id, binding.model);
          return {
            ok: true,
            value: {
              saved,
              lock: await input.sharedRoute.describeConsumer(binding.consumer, binding.capability),
              hostDefault: 'unchanged',
            },
          };
        }
        if (action === 'saveRoute') {
          const route = body['route'];
          if (typeof route !== 'object' || route === null) return invalid('Route is required.');
          const record = route as Record<string, unknown>;
          const protocol = record['protocol'];
          if (protocol !== 'openai-chat' && protocol !== 'openai-images') {
            return invalid('Choose openai-chat or openai-images. The base URL is fixed.');
          }
          if (typeof record['id'] !== 'string' || typeof record['credentialRef'] !== 'string') {
            return invalid('Instance id and credential reference are required.');
          }
          if (
            !Array.isArray(record['models']) ||
            record['models'].some((item) => typeof item !== 'string')
          ) {
            return invalid('Models must be the names from the provider list.');
          }
          const verified = verifiedApiyiRoute(protocol);
          const key = record['key'];
          if (key !== undefined && typeof key !== 'string') return invalid('Key must be a string.');
          if (input.apiyiAccounts !== undefined) {
            if (key !== undefined) {
              return {
                ok: false,
                error: {
                  code: 'account-key-not-accepted',
                  message:
                    'A new key is stored on the DSH Models page. save-route does not accept one.',
                },
              };
            }
            const accounts = await input.apiyiAccounts();
            const models = record['models'] as string[];
            const match = accounts.find(
              (item) =>
                item.credentialRef === record['credentialRef'] &&
                (protocol === 'openai-images'
                  ? item.imageProtocol === protocol
                  : item.chatProtocol === protocol) &&
                models.every((model) => item.models.includes(model)),
            );
            if (match === undefined) {
              return {
                ok: false,
                error: {
                  code: 'account-mismatch',
                  message:
                    'That model is not on a current API易 account. The stored rows were left as they are.',
                },
              };
            }
          }
          const saved = await input.sharedRoute.saveInstance(
            {
              id: record['id'],
              gateway: verified.gateway,
              vendor: 'apiyi',
              capability: verified.capability,
              protocol: verified.protocol,
              baseUrl: verified.baseUrl,
              models: record['models'] as string[],
              credentialRef: record['credentialRef'],
            },
            typeof key === 'string' ? key : undefined,
          );
          return { ok: true, value: saved };
        }
        if (action === 'lockRoute') {
          const lock = body['lock'];
          if (typeof lock !== 'object' || lock === null) return invalid('Lock is required.');
          const record = lock as Record<string, unknown>;
          const consumer = record['consumer'];
          const instanceId = record['instanceId'];
          const model = record['model'];
          if (
            (consumer !== 'chat' && consumer !== 'concept-art') ||
            typeof instanceId !== 'string' ||
            typeof model !== 'string'
          ) {
            return invalid('Choose chat or concept-art, an instance, and a saved model.');
          }
          const capability = consumer === 'chat' ? 'chat' : 'image';
          const instances = await input.sharedRoute.listInstances();
          const wanted = instanceId.trim().toLowerCase();
          const instance = instances.find((item) => item.id === wanted);
          if (
            instance === undefined ||
            instance.capability !== capability ||
            !instance.models.includes(model)
          ) {
            return {
              ok: false,
              error: {
                code: 'model-not-allowed',
                message: 'That model is not allowed on this instance.',
              },
            };
          }
          if (!instance.credentialConfigured) {
            return {
              ok: false,
              error: {
                code: 'credential-missing',
                message: 'That credential reference has no key.',
              },
            };
          }
          if (input.apiyiAccounts !== undefined) {
            const drift = accountLockDrift(await input.apiyiAccounts(), {
              locked: true,
              providerId: instance.id,
              model,
              credentialRef: instance.credentialRef,
              protocol: instance.protocol,
              baseUrl: instance.baseUrl,
              accountProvider: instance.accountProvider ?? null,
              accountBaseUrl: instance.accountBaseUrl ?? null,
              accountApi: instance.accountApi ?? null,
              capability,
            });
            if (drift !== 'ok') {
              return {
                ok: false,
                error: {
                  code: drift,
                  message: 'That lock does not match the current API易 account.',
                },
              };
            }
          }
          input.sharedRoute.lock(consumer, capability, instance.id, model);
          const current = await input.sharedRoute.describeConsumer(consumer, capability);
          return { ok: true, value: current };
        }
        if (action === 'status') {
          const image = await input.sharedRoute.describeConsumer('concept-art', 'image');
          const chat = await input.sharedRoute.describeConsumer('chat', 'chat');
          return {
            ok: true,
            value: {
              ...image,
              chatReady: chat.locked && chat.credentialConfigured,
              limitsConfigured: input.conceptArt.limitsConfigured(),
              mediaDelivery: input.conceptArt.limitsConfigured() ? 'parsed-not-verified' : 'closed',
              referenceImages: 'blocked-prompt-only',
            },
          };
        }
        if (action === 'open') {
          const botSlug = body['botSlug'];
          if (typeof botSlug !== 'string' || botSlug.trim() === '')
            return invalid('Bot is required.');
          const sessionId = input.sessionForBot?.(botSlug) ?? null;
          if (sessionId === null) {
            return {
              ok: true,
              value: {
                status: 'INTEGRATION_BLOCKED',
                reasons: ['HOST_CONTEXT_CONTRACT_MISSING'],
                botSlug,
              },
            };
          }
          const owner = input.conceptArt.ownerBot(sessionId);
          if (owner !== botSlug) {
            return {
              ok: true,
              value: { status: 'BLOCKED', reasons: ['BOT_SESSION_MISMATCH'], botSlug },
            };
          }
          const project = input.conceptArt.projectIdFor(sessionId);
          if ('status' in project) return { ok: true, value: { ...project, botSlug } };
          return {
            ok: true,
            value: { status: 'READY', botSlug, sessionId, projectId: project.projectId },
          };
        }
        if (action === 'styles') {
          const sessionId = body['sessionId'];
          const explicit = body['botSlug'];
          const botSlug =
            typeof explicit === 'string'
              ? explicit
              : typeof sessionId === 'string'
                ? input.conceptArt.ownerBot(sessionId)
                : undefined;
          if (botSlug === undefined) return invalid('Bot or session is required.');
          if (typeof sessionId === 'string' && input.conceptArt.ownerBot(sessionId) !== botSlug) {
            return {
              ok: true,
              value: { status: 'BLOCKED', reasons: ['BOT_SESSION_MISMATCH'], botSlug },
            };
          }
          return {
            ok: true,
            value: {
              styles: input.conceptArt.listStyles(botSlug),
              unassignedCount: input.conceptArt.listUnassigned().length,
            },
          };
        }
        if (action === 'generateStyle') {
          const styleRef = body['styleRef'];
          const note = body['note'];
          const sessionId = body['sessionId'];
          if (typeof styleRef !== 'string' || typeof note !== 'string')
            return invalid('Style reference and note are required.');
          if (typeof sessionId !== 'string' && sessionId !== null)
            return invalid('Session is required.');
          return {
            ok: true,
            value: await input.conceptArt.generateStyle({
              sessionId: sessionId as string | null,
              styleRef,
              note,
            }),
          };
        }
        if (action === 'request') {
          const request = requestBody(body['request']);
          if (request === undefined) return invalid('Concept art request is incomplete.');
          return { ok: true, value: await input.conceptArt.request(request) };
        }
        if (action === 'resume' || action === 'cancel') {
          if (typeof body['sessionId'] !== 'string' || typeof body['idempotencyKey'] !== 'string')
            return invalid('Session and operation key are required.');
          const task =
            action === 'resume'
              ? await input.conceptArt.resume(body['sessionId'], body['idempotencyKey'])
              : input.conceptArt.cancel(body['sessionId'], body['idempotencyKey']);
          return { ok: true, value: task };
        }
        if (action === 'accept') {
          if (
            typeof body['sessionId'] !== 'string' ||
            typeof body['idempotencyKey'] !== 'string' ||
            (typeof body['contextVersion'] !== 'string' &&
              typeof body['contextVersion'] !== 'number')
          )
            return invalid('Session, operation key and context version are required.');
          const project = input.conceptArt.projectIdFor(body['sessionId']);
          if ('status' in project)
            return { ok: true, value: { ...project, optimization: 'not-performed' } };
          const task = input.sharedRoute.read(project.projectId, body['idempotencyKey']);
          const verdict = input.conceptArt.accept(task, body['contextVersion'] as string | number);
          if (
            !verdict.accept ||
            task.localStop === true ||
            task.artifact?.kind !== 'base64' ||
            task.artifact.value === undefined ||
            input.attachments === undefined
          ) {
            return {
              ok: true,
              value: { ...verdict, delivery: 'not-mounted', mediaVerified: false },
            };
          }
          const bytes = Buffer.from(task.artifact.value, 'base64');
          const ref = await input.attachments.upload({
            data: (async function* () {
              yield bytes;
            })(),
            name: 'concept-art.png',
          });
          const saved = input.attachments.current(ref);
          if (saved.size !== bytes.length || saved.fileId === undefined) {
            return {
              ok: true,
              value: {
                ...verdict,
                delivery: 'not-mounted',
                userVisible: false,
                mediaVerified: false,
              },
            };
          }
          const downloaded = await input.attachments.download(saved.fileId, saved.name);
          const chunks: Uint8Array[] = [];
          const reader = downloaded.body.getReader();
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            if (chunk.value !== undefined) chunks.push(chunk.value);
          }
          const stored = Buffer.concat(chunks);
          if (!stored.equals(bytes)) {
            return {
              ok: true,
              value: {
                ...verdict,
                delivery: 'not-mounted',
                userVisible: false,
                mediaVerified: false,
              },
            };
          }
          return {
            ok: true,
            value: {
              ...verdict,
              parsed: true,
              deliverable: true,
              userVisible: true,
              mediaVerified: false,
              quality: 'unverified',
              reason: 'BYTES_PARSED_NOT_A_RENDER',
              delivery: 'mounted-unverified',
              imageSource: 'attachment-readback',
              file: { fileId: saved.fileId, name: saved.name, size: saved.size },
              preview: stored.toString('base64'),
            },
          };
        }
        return invalid('Concept art action is not status, request, resume, cancel or accept.');
      } catch (error) {
        return failed(error);
      }
    },
  };
}
