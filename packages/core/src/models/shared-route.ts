import { randomUUID } from 'node:crypto';
import { isCredentialRefName } from '@deepseek-ai/dsh-credentials';

import type { OperationalDatabaseModulePort } from '../database/owner.js';
import { inspectImage } from '../media/image-format.js';

export type ModelCapability = 'chat' | 'image' | 'video';
export type ModelProtocol =
  | 'openai-chat'
  | 'openai-images'
  | 'openai-videos'
  | 'anthropic-messages'
  | 'apiyi-seedance'
  | 'official-native';
export type ModelGateway = 'apiyi' | 'official';
export type RouteConsumer = 'chat' | 'concept-art';

export interface SecretStore {
  put(id: string, key: string): Promise<void>;
  configured(id: string): Promise<boolean>;
  read(id: string): Promise<string | undefined>;
}

export interface PublicInstance {
  id: string;
  gateway: ModelGateway;
  vendor: string;
  capability: ModelCapability;
  protocol: ModelProtocol;
  baseUrl: string;
  models: string[];
  credentialRef: string;
  credentialConfigured: boolean;
  /** A stored key does not prove the token group covers this model. */
  groupCoverage: 'unverified';
}

export interface InstanceSpec {
  id: string;
  gateway: ModelGateway;
  vendor: string;
  capability: ModelCapability;
  protocol: ModelProtocol;
  baseUrl: string;
  models: readonly string[];
  credentialRef: string;
}

const APIYI_OPENAI = 'https://api.apiyi.com/v1';
const APIYI_ROOT = 'https://api.apiyi.com';

export function verifiedApiyiRoute(protocol: Exclude<ModelProtocol, 'official-native'>): {
  gateway: 'apiyi';
  protocol: Exclude<ModelProtocol, 'official-native'>;
  capability: ModelCapability;
  baseUrl: string;
} {
  const verified = APIYI_PROTOCOL[protocol];
  return { gateway: 'apiyi', protocol, capability: verified.capability, baseUrl: verified.baseUrl };
}

const APIYI_PROTOCOL: Record<
  Exclude<ModelProtocol, 'official-native'>,
  { capability: ModelCapability; baseUrl: string }
> = {
  'openai-chat': { capability: 'chat', baseUrl: APIYI_OPENAI },
  'openai-images': { capability: 'image', baseUrl: APIYI_OPENAI },
  'openai-videos': { capability: 'video', baseUrl: APIYI_OPENAI },
  'anthropic-messages': { capability: 'chat', baseUrl: APIYI_ROOT },
  'apiyi-seedance': { capability: 'video', baseUrl: APIYI_ROOT },
};

export class SharedRouteError extends Error {
  constructor(
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = 'SharedRouteError';
  }
}

interface StoredInstance extends InstanceSpec {
  createdAt: string;
}

export interface StoredArtifact {
  kind: 'text' | 'base64' | 'untrusted-url' | 'raw-provider-response';
  /** Always false. Kind is not proof that a consumer may deliver the bytes. */
  mediaVerified: false;
  /** Present only for text or base64 that decoded. Not a delivery approval. */
  value?: string;
  /** http(s) text copied from the provider. It is not fetched. */
  url?: string;
  body?: string;
  inspected?: { mime: string; width: number; height: number };
  reason?: 'invalid-payload' | 'empty-artifact';
}

interface StoredTask {
  id: string;
  projectId: string;
  idempotencyKey: string;
  providerId: string;
  capability: ModelCapability;
  protocol: ModelProtocol;
  model: string;
  remoteTaskId: string | null;
  status: 'submit-unknown' | 'running' | 'completed' | 'failed';
  /** Local stop only. The provider may still be running and billing. */
  localStop: boolean;
  providerStatus: string | null;
  artifact: StoredArtifact | null;
  error: string | null;
  remoteCancel: 'unverified';
}

function acceptedCredentialRef(value: string): string {
  const text = value.trim();
  if (isCredentialRefName(text)) return text;
  return cleanId(text, 'Credential reference');
}

function cleanId(value: string, label: string): string {
  const text = value.trim();
  if (text === '' || text.length > 80 || !/^[a-z0-9][a-z0-9._-]*$/u.test(text)) {
    throw new SharedRouteError(
      'invalid-input',
      `${label} is empty or uses unsupported characters.`,
    );
  }
  return text;
}

/** Instance ids are lowercase. A credential reference may contain capitals. */
function storedInstanceId(value: string): string {
  return cleanId(value.trim().toLowerCase(), 'Instance id');
}

function assertProtocol(spec: InstanceSpec): void {
  if (spec.gateway === 'apiyi') {
    if (spec.protocol === 'official-native') {
      throw new SharedRouteError('protocol-mismatch', 'API易 needs one of its verified protocols.');
    }
    const verified = APIYI_PROTOCOL[spec.protocol];
    if (verified.capability !== spec.capability) {
      throw new SharedRouteError(
        'protocol-mismatch',
        'That API易 protocol does not serve this capability.',
      );
    }
    if (spec.baseUrl !== verified.baseUrl) {
      throw new SharedRouteError(
        'protocol-mismatch',
        'That API易 protocol uses a different base URL.',
      );
    }
    return;
  }
  if (spec.protocol !== 'official-native') {
    throw new SharedRouteError(
      'protocol-mismatch',
      'An official instance cannot use an API易 protocol.',
    );
  }
  if (!spec.baseUrl.startsWith('https://')) {
    throw new SharedRouteError('invalid-input', 'An official base URL must start with https://.');
  }
}

export function createMemorySecretStore(): SecretStore {
  const keys = new Map<string, string>();
  return {
    async put(id, key) {
      keys.set(id, key);
    },
    async configured(id) {
      return keys.has(id) && keys.get(id) !== '';
    },
    async read(id) {
      return keys.get(id);
    },
  };
}

export function createSharedModelRoute(
  database: OperationalDatabaseModulePort,
  secrets: SecretStore,
  options: { fetch?: typeof fetch; now?: () => string } = {},
) {
  const now = options.now ?? (() => new Date().toISOString());
  const fetchImpl = options.fetch ?? fetch;

  const readInstance = (id: string): StoredInstance | undefined =>
    database.read((db) => {
      const row = db.prepare('SELECT body FROM shared_model_instances WHERE id = ?').get(id) as
        | { body: string }
        | undefined;
      return row === undefined ? undefined : (JSON.parse(row.body) as StoredInstance);
    });

  const publicInstance = async (stored: StoredInstance): Promise<PublicInstance> => ({
    id: stored.id,
    gateway: stored.gateway,
    vendor: stored.vendor,
    capability: stored.capability,
    protocol: stored.protocol,
    baseUrl: stored.baseUrl,
    models: [...stored.models],
    credentialRef: stored.credentialRef,
    credentialConfigured: await secrets.configured(stored.credentialRef),
    groupCoverage: 'unverified',
  });

  const assertConsumer = (consumer: RouteConsumer, capability: ModelCapability): void => {
    if (consumer === 'chat' && capability !== 'chat') {
      throw new SharedRouteError('capability-mismatch', 'Chat cannot use an image or video model.');
    }
    if (consumer === 'concept-art' && capability === 'chat') {
      throw new SharedRouteError('capability-mismatch', 'Concept art cannot use a chat model.');
    }
  };

  const requireRoute = async (
    consumer: RouteConsumer,
    capability: ModelCapability,
    mode: 'locked' | 'auto',
  ): Promise<{ instance: StoredInstance; model: string }> => {
    assertConsumer(consumer, capability);
    const lock = database.read((db) => {
      const row = db
        .prepare(
          'SELECT provider_id, model FROM shared_model_locks WHERE consumer = ? AND capability = ?',
        )
        .get(consumer, capability) as { provider_id: string; model: string } | undefined;
      return row;
    });
    if (lock !== undefined || mode === 'locked') {
      if (lock === undefined) {
        throw new SharedRouteError('unconfigured', 'No model is locked for this consumer.');
      }
      const instance = readInstance(lock.provider_id);
      if (instance === undefined || instance.capability !== capability) {
        throw new SharedRouteError('unconfigured', 'The locked model is not available.');
      }
      if (!instance.models.includes(lock.model)) {
        throw new SharedRouteError(
          'model-not-allowed',
          'The locked model is not on the allowlist.',
        );
      }
      if (!(await secrets.configured(instance.credentialRef))) {
        throw new SharedRouteError('credential-missing', 'The locked provider has no key.');
      }
      return { instance, model: lock.model };
    }
    const rows = database.read(
      (db) => db.prepare('SELECT body FROM shared_model_instances').all() as { body: string }[],
    );
    const ready: Array<{ instance: StoredInstance }> = [];
    for (const row of rows) {
      const instance = JSON.parse(row.body) as StoredInstance;
      if (instance.capability !== capability || instance.models.length === 0) continue;
      if (await secrets.configured(instance.credentialRef)) ready.push({ instance });
    }
    const gateways = new Set(ready.map((item) => item.instance.gateway));
    if (ready.length === 0) {
      throw new SharedRouteError('unconfigured', 'No configured model serves this capability.');
    }
    if (ready.length !== 1 || gateways.size !== 1) {
      throw new SharedRouteError('auto-ambiguous', 'Auto will not choose across providers.');
    }
    const only = ready[0]!;
    if (only.instance.models.length !== 1) {
      throw new SharedRouteError('auto-ambiguous', 'Auto will not choose among models.');
    }
    return { instance: only.instance, model: only.instance.models[0]! };
  };

  const requestHeaders = (protocol: ModelProtocol, key: string): Record<string, string> =>
    protocol === 'anthropic-messages'
      ? {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        }
      : { authorization: `Bearer ${key}`, 'content-type': 'application/json' };

  const authorizedFetch = async (
    instance: StoredInstance,
    path: string,
    init: { method: string; body?: string },
  ): Promise<{ status: number; json: unknown | undefined; text: string }> => {
    const key = await secrets.read(instance.credentialRef);
    if (key === undefined || key === '') {
      throw new SharedRouteError('credential-missing', 'The provider has no key.');
    }
    let response: Response;
    try {
      response = await fetchImpl(`${instance.baseUrl}${path}`, {
        method: init.method,
        headers: requestHeaders(instance.protocol, key),
        ...(init.body === undefined ? {} : { body: init.body }),
      });
    } catch {
      return { status: 0, json: undefined, text: '' };
    }
    const text = await response.text();
    try {
      return { status: response.status, json: JSON.parse(text) as unknown, text };
    } catch {
      return { status: response.status, json: undefined, text };
    }
  };

  const textField = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() !== '' ? value : undefined;

  const httpUrl = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
    } catch {
      return undefined;
    }
  };

  const imageBytes = (value: string | undefined): Uint8Array | undefined => {
    if (value === undefined || !/^[A-Za-z0-9+/]+={0,2}$/u.test(value) || value.length % 4 !== 0) {
      return undefined;
    }
    const bytes = Buffer.from(value, 'base64');
    if (bytes.length === 0 || bytes.toString('base64') !== value) return undefined;
    try {
      inspectImage(bytes);
      return bytes;
    } catch {
      return undefined;
    }
  };

  const interpret = (protocol: ModelProtocol, json: unknown, raw: string): StoredArtifact => {
    if (typeof json !== 'object' || json === null) {
      return { kind: 'raw-provider-response', mediaVerified: false, body: raw };
    }
    const record = json as Record<string, unknown>;
    if (protocol === 'openai-images') {
      const data = Array.isArray(record.data) ? record.data[0] : undefined;
      const item =
        typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
      const encoded = textField(item.b64_json);
      const bytes = imageBytes(encoded);
      if (bytes !== undefined && encoded !== undefined) {
        const inspected = inspectImage(bytes);
        return {
          kind: 'base64',
          mediaVerified: false,
          value: encoded,
          inspected: { mime: inspected.mime, width: inspected.width, height: inspected.height },
        };
      }
      if (encoded !== undefined) {
        return {
          kind: 'raw-provider-response',
          mediaVerified: false,
          body: raw,
          reason: 'invalid-payload',
        };
      }
      const url = httpUrl(textField(item.url));
      if (url !== undefined) return { kind: 'untrusted-url', mediaVerified: false, url };
      if (textField(item.url) !== undefined) {
        return {
          kind: 'raw-provider-response',
          mediaVerified: false,
          body: raw,
          reason: 'invalid-payload',
        };
      }
      return { kind: 'raw-provider-response', mediaVerified: false, body: raw };
    }
    if (protocol === 'apiyi-seedance' || protocol === 'openai-videos') {
      const content =
        typeof record.content === 'object' && record.content !== null
          ? (record.content as Record<string, unknown>)
          : {};
      const videoText = textField(content.video_url) ?? textField(record.video_url);
      const url = httpUrl(videoText);
      if (url !== undefined) return { kind: 'untrusted-url', mediaVerified: false, url };
      if (videoText !== undefined) {
        return {
          kind: 'raw-provider-response',
          mediaVerified: false,
          body: raw,
          reason: 'invalid-payload',
        };
      }
      return {
        kind: 'raw-provider-response',
        mediaVerified: false,
        body: raw,
        reason: 'empty-artifact',
      };
    }
    if (protocol === 'anthropic-messages') {
      const blocks = Array.isArray(record.content) ? record.content : [];
      const text = blocks
        .map((block) =>
          typeof block === 'object' &&
          block !== null &&
          (block as { type?: unknown }).type === 'text'
            ? textField((block as { text?: unknown }).text)
            : undefined,
        )
        .filter((item): item is string => item !== undefined)
        .join('');
      if (text !== '') return { kind: 'text', mediaVerified: false, value: text };
      return { kind: 'raw-provider-response', mediaVerified: false, body: raw };
    }
    const choice = Array.isArray(record.choices) ? record.choices[0] : undefined;
    const message =
      typeof choice === 'object' && choice !== null
        ? (choice as { message?: { content?: unknown } }).message
        : undefined;
    const content = textField(message?.content);
    if (content !== undefined) return { kind: 'text', mediaVerified: false, value: content };
    return {
      kind: 'raw-provider-response',
      mediaVerified: false,
      body: raw,
      reason: 'empty-artifact',
    };
  };

  const saveTask = (task: StoredTask): void => {
    database.transaction(
      (db) =>
        db
          .prepare(
            `INSERT INTO shared_model_tasks (id, project_id, idempotency_key, body, created_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(project_id, idempotency_key) DO UPDATE SET body = excluded.body`,
          )
          .run(task.id, task.projectId, task.idempotencyKey, JSON.stringify(task), now()),
      ['shared-model'],
    );
  };

  const readTask = (projectId: string, idempotencyKey: string): StoredTask | undefined =>
    database.read((db) => {
      const row = db
        .prepare('SELECT body FROM shared_model_tasks WHERE project_id = ? AND idempotency_key = ?')
        .get(projectId, idempotencyKey) as { body: string } | undefined;
      if (row === undefined) return undefined;
      const task = JSON.parse(row.body) as StoredTask;
      if ((JSON.parse(row.body) as { status?: unknown }).status === 'cancelled') {
        task.localStop = true;
        task.status = task.remoteTaskId === null ? 'submit-unknown' : 'running';
      }
      return task;
    });

  return {
    async saveInstance(spec: InstanceSpec, key?: string): Promise<PublicInstance> {
      const stored: StoredInstance = {
        id: storedInstanceId(spec.id),
        gateway: spec.gateway,
        vendor: cleanId(spec.vendor, 'Vendor'),
        capability: spec.capability,
        protocol: spec.protocol,
        baseUrl: spec.baseUrl.trim(),
        models: [...new Set(spec.models.map((model) => cleanId(model, 'Model')))],
        credentialRef: acceptedCredentialRef(spec.credentialRef),
        createdAt: now(),
      };
      assertProtocol(stored);
      const previous = readInstance(stored.id);
      if (previous !== undefined) {
        if (
          previous.gateway !== stored.gateway ||
          previous.vendor !== stored.vendor ||
          previous.capability !== stored.capability ||
          previous.protocol !== stored.protocol ||
          previous.baseUrl !== stored.baseUrl ||
          previous.credentialRef !== stored.credentialRef
        ) {
          throw new SharedRouteError(
            'instance-identity-mismatch',
            'This instance already stores a different protocol or credential. The previous models were kept.',
          );
        }
        stored.models = [...new Set([...previous.models, ...stored.models])];
        stored.createdAt = previous.createdAt;
      }
      if (key !== undefined) {
        if (key.trim() === '') throw new SharedRouteError('invalid-input', 'The key is empty.');
        if (await secrets.configured(stored.credentialRef)) {
          if ((await secrets.read(stored.credentialRef)) !== key) {
            throw new SharedRouteError(
              'credential-already-configured',
              'That credential reference is already stored. It is reused and not overwritten.',
            );
          }
        } else {
          await secrets.put(stored.credentialRef, key);
        }
      } else if (!(await secrets.configured(stored.credentialRef))) {
        throw new SharedRouteError('credential-missing', 'That credential reference has no key.');
      }
      database.transaction(
        (db) =>
          db
            .prepare(
              `INSERT INTO shared_model_instances (id, body, created_at) VALUES (?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET body = excluded.body`,
            )
            .run(stored.id, JSON.stringify(stored), stored.createdAt),
        ['shared-model'],
      );
      return publicInstance(stored);
    },
    async listInstances(): Promise<PublicInstance[]> {
      const rows = database.read(
        (db) => db.prepare('SELECT body FROM shared_model_instances').all() as { body: string }[],
      );
      const listed: PublicInstance[] = [];
      for (const row of rows)
        listed.push(await publicInstance(JSON.parse(row.body) as StoredInstance));
      return listed;
    },
    async describeConsumer(consumer: RouteConsumer, capability: ModelCapability) {
      const lock = database.read((db) => {
        return db
          .prepare(
            'SELECT provider_id, model FROM shared_model_locks WHERE consumer = ? AND capability = ?',
          )
          .get(consumer, capability) as { provider_id: string; model: string } | undefined;
      });
      if (lock === undefined) {
        return {
          locked: false as const,
          providerId: null,
          model: null,
          credentialConfigured: false,
          groupCoverage: 'unverified' as const,
          catalog: 'not-the-image-route' as const,
        };
      }
      const instance = readInstance(lock.provider_id);
      return {
        locked: true as const,
        providerId: lock.provider_id,
        model: lock.model,
        credentialConfigured:
          instance !== undefined && (await secrets.configured(instance.credentialRef)),
        groupCoverage: 'unverified' as const,
        catalog: 'not-the-image-route' as const,
      };
    },
    read(projectId: string, idempotencyKey: string): StoredTask {
      const task = readTask(projectId, idempotencyKey);
      if (task === undefined) {
        throw new SharedRouteError('wrong-project', 'No task belongs to this project.');
      }
      return task;
    },
    lock(consumer: RouteConsumer, capability: ModelCapability, providerId: string, model: string) {
      const storedId = storedInstanceId(providerId);
      const instance = readInstance(storedId);
      if (
        instance === undefined ||
        instance.capability !== capability ||
        !instance.models.includes(model)
      ) {
        throw new SharedRouteError(
          'model-not-allowed',
          'That model is not allowed on this instance.',
        );
      }
      database.transaction(
        (db) =>
          db
            .prepare(
              `INSERT INTO shared_model_locks (consumer, capability, provider_id, model)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(consumer, capability) DO UPDATE SET
                 provider_id = excluded.provider_id, model = excluded.model`,
            )
            .run(consumer, capability, storedId, model),
        ['shared-model'],
      );
    },
    resolve: requireRoute,
    async submit(
      consumer: RouteConsumer,
      capability: ModelCapability,
      projectId: string,
      idempotencyKey: string,
      prompt: string,
    ): Promise<StoredTask> {
      const existing = readTask(projectId, idempotencyKey);
      if (existing !== undefined) return existing;
      const { instance, model } = await requireRoute(consumer, capability, 'auto');
      const task: StoredTask = {
        id: randomUUID(),
        projectId,
        idempotencyKey,
        providerId: instance.id,
        capability,
        protocol: instance.protocol,
        model,
        remoteTaskId: null,
        status: 'submit-unknown',
        localStop: false,
        providerStatus: null,
        artifact: null,
        error: null,
        remoteCancel: 'unverified',
      };
      saveTask(task);
      if (capability === 'video') {
        const path =
          instance.protocol === 'apiyi-seedance'
            ? '/seedance/api/v3/contents/generations/tasks'
            : '/videos';
        const body =
          instance.protocol === 'apiyi-seedance'
            ? {
                model,
                content: [{ type: 'text', text: prompt }],
                duration: 5,
                generate_audio: false,
              }
            : { model, prompt, seconds: '4' };
        const response = await authorizedFetch(instance, path, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        const remoteId =
          typeof response.json === 'object' &&
          response.json !== null &&
          typeof (response.json as { id?: unknown }).id === 'string'
            ? (response.json as { id: string }).id
            : undefined;
        if (response.status !== 200 || remoteId === undefined) return task;
        task.remoteTaskId = remoteId;
        task.status = 'running';
        saveTask(task);
        return task;
      }
      const anthropic = instance.protocol === 'anthropic-messages';
      const path = anthropic
        ? '/v1/messages'
        : capability === 'chat'
          ? '/chat/completions'
          : '/images/generations';
      const body = anthropic
        ? { model, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }
        : capability === 'chat'
          ? { model, messages: [{ role: 'user', content: prompt }] }
          : { model, prompt };
      const response = await authorizedFetch(instance, path, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (response.status === 0 || response.json === undefined) return task;
      if (response.status !== 200) {
        task.status = 'failed';
        task.error = 'provider-rejected';
        saveTask(task);
        return task;
      }
      const artifact = interpret(instance.protocol, response.json, response.text);
      task.artifact = artifact;
      if (artifact.kind === 'raw-provider-response') {
        task.status = 'failed';
        task.error = artifact.reason ?? 'empty-artifact';
      } else {
        task.status = 'completed';
        task.error = null;
      }
      saveTask(task);
      return task;
    },
    async resume(projectId: string, idempotencyKey: string): Promise<StoredTask> {
      const task = readTask(projectId, idempotencyKey);
      if (task === undefined)
        throw new SharedRouteError('wrong-project', 'No task belongs to this project.');
      if (task.remoteTaskId === null) return task;
      const instance = readInstance(task.providerId);
      if (instance === undefined)
        throw new SharedRouteError('unconfigured', 'The provider is gone.');
      const path =
        task.protocol === 'apiyi-seedance'
          ? `/seedance/api/v3/contents/generations/tasks/${task.remoteTaskId}`
          : `/videos/${task.remoteTaskId}`;
      const response = await authorizedFetch(instance, path, { method: 'GET' });
      const status =
        typeof response.json === 'object' && response.json !== null
          ? (response.json as { status?: unknown }).status
          : undefined;
      if (typeof status === 'string') task.providerStatus = status;
      const succeeded =
        task.protocol === 'apiyi-seedance' ? status === 'succeeded' : status === 'completed';
      if (succeeded) {
        const artifact = interpret(task.protocol, response.json, response.text);
        task.artifact = artifact;
        task.status = artifact.kind === 'raw-provider-response' ? 'failed' : 'completed';
        task.error = task.status === 'failed' ? (artifact.reason ?? 'empty-artifact') : null;
      } else if (status === 'failed' || status === 'expired') {
        task.status = 'failed';
        task.error = 'provider-failed';
      }
      saveTask(task);
      return task;
    },
    cancel(projectId: string, idempotencyKey: string): StoredTask {
      const task = readTask(projectId, idempotencyKey);
      if (task === undefined)
        throw new SharedRouteError('wrong-project', 'No task belongs to this project.');
      task.localStop = true;
      saveTask(task);
      return task;
    },
  };
}
