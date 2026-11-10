import { SharedRouteError, verifiedApiyiRoute, type ModelProtocol } from './shared-route.js';

/** DeepSeek's official credential. Concept art never reads or writes it. */
export const OFFICIAL_DEEPSEEK_KEY = 'DEEPSEEK_API_KEY';

const APIYI_HOST = 'api.apiyi.com';

export interface ApiyiAccount {
  provider: string;
  displayName: string;
  /** Wire name stored by the DSH Models page, such as `openai-completions`. */
  api: string;
  baseUrl: string;
  credentialRef: string;
  credentialConfigured: boolean;
  /** Names the user saved on that provider. This list is not a provider check. */
  models: string[];
  /** Null when that Models-page protocol is not a concept-art chat wire. */
  chatProtocol: 'openai-chat' | 'anthropic-messages' | null;
  imageProtocol: 'openai-images';
  allowlist: 'user-entered-not-provider-checked';
}

export interface ConfigurableProviderRow {
  provider: string;
  displayName: string;
  settingsNs: string;
  settingsPath: readonly string[];
}

export function readApiyiAccounts(source: {
  providers: readonly ConfigurableProviderRow[];
  settings: readonly { ns: string; value: unknown }[];
  configured(ref: string): Promise<boolean>;
}): Promise<ApiyiAccount[]> {
  return Promise.all(source.providers.map((row) => oneAccount(row, source))).then((rows) =>
    rows.filter((row): row is ApiyiAccount => row !== undefined),
  );
}

async function oneAccount(
  row: ConfigurableProviderRow,
  source: {
    settings: readonly { ns: string; value: unknown }[];
    configured(ref: string): Promise<boolean>;
  },
): Promise<ApiyiAccount | undefined> {
  if (row.provider === 'deepseek' || row.provider === 'deepseek-account') return undefined;
  const profile = profileAt(
    source.settings.find((item) => item.ns === row.settingsNs)?.value,
    row.settingsPath,
  );
  if (typeof profile !== 'object' || profile === null) return undefined;
  const record = profile as Record<string, unknown>;
  const baseUrl = typeof record['baseURL'] === 'string' ? normalizeBase(record['baseURL']) : '';
  if (!isApiyiBase(baseUrl)) return undefined;
  const api = typeof record['api'] === 'string' ? record['api'] : '';
  const credentialRef = typeof record['apiKeyEnv'] === 'string' ? record['apiKeyEnv'].trim() : '';
  if (credentialRef === OFFICIAL_DEEPSEEK_KEY) return undefined;
  const models = modelIds(record['models']);
  return {
    provider: row.provider,
    displayName:
      typeof record['displayName'] === 'string' && record['displayName'].trim() !== ''
        ? record['displayName'].trim()
        : row.displayName,
    api,
    baseUrl,
    credentialRef,
    credentialConfigured: credentialRef === '' ? false : await source.configured(credentialRef),
    models,
    chatProtocol: chatProtocol(api, baseUrl),
    imageProtocol: 'openai-images',
    allowlist: 'user-entered-not-provider-checked',
  };
}

export function accountProviderFromInstanceId(
  id: string,
): { provider: string; capability: 'chat' | 'image' } | undefined {
  const match = /^apiyi-(.+)-(chat|image)$/u.exec(id);
  if (match === null) return undefined;
  return {
    provider: match[1] ?? '',
    capability: match[2] === 'image' ? 'image' : 'chat',
  };
}

/** Why a saved lock no longer matches the live Models-page account. `ok` does not call the provider. */
export function accountLockDrift(
  accounts: readonly ApiyiAccount[],
  lock: {
    locked: boolean;
    providerId?: string | null;
    model?: string | null;
    credentialRef?: string | null;
    protocol?: string | null;
    baseUrl?: string | null;
    accountProvider?: string | null;
    accountBaseUrl?: string | null;
    accountApi?: string | null;
    capability: 'chat' | 'image';
  },
): string {
  if (!lock.locked || lock.model == null || lock.model === '') return 'unlocked';
  const parsed =
    lock.providerId == null ? undefined : accountProviderFromInstanceId(lock.providerId);
  const provider = lock.accountProvider ?? parsed?.provider;
  if (provider !== undefined && provider !== '') {
    const account = accounts.find((item) => item.provider === provider);
    if (account === undefined) return 'account-gone';
    if (account.credentialRef === '') return 'credential-ref-missing';
    if (account.credentialRef === OFFICIAL_DEEPSEEK_KEY) return 'official-key-not-apiyi';
    if (account.credentialRef !== lock.credentialRef) return 'credential-ref-changed';
    if (lock.accountBaseUrl != null && account.baseUrl !== lock.accountBaseUrl)
      return 'base-changed';
    if (lock.accountApi != null && account.api !== lock.accountApi) return 'protocol-changed';
    const expected = lock.capability === 'image' ? account.imageProtocol : account.chatProtocol;
    if (expected == null || expected !== lock.protocol) return 'protocol-changed';
    if (lock.capability === 'chat' && account.baseUrl !== lock.baseUrl) return 'base-changed';
    if (!account.models.includes(lock.model)) return 'model-not-on-account';
    if (!account.credentialConfigured) return 'credential-missing';
    return 'ok';
  }
  const legacy = accounts.filter(
    (item) =>
      item.credentialRef !== '' &&
      item.credentialRef === lock.credentialRef &&
      item.baseUrl === lock.baseUrl &&
      (lock.capability === 'image'
        ? item.imageProtocol === lock.protocol
        : item.chatProtocol === lock.protocol) &&
      item.models.includes(lock.model ?? ''),
  );
  if (legacy.length === 1) return 'ok';
  return legacy.length > 1 ? 'account-ambiguous' : 'account-stale';
}

export function selectApiyiBinding(
  accounts: readonly ApiyiAccount[],
  input: { provider: string; model: string; capability: 'chat' | 'image' },
): {
  account: ApiyiAccount;
  protocol: Exclude<ModelProtocol, 'official-native'>;
  consumer: 'chat' | 'concept-art';
  capability: 'chat' | 'image';
  instanceId: string;
  model: string;
} {
  const account = accounts.find((item) => item.provider === input.provider);
  if (account === undefined) {
    throw new SharedRouteError(
      'provider-not-apiyi',
      'That provider is not an API易 account on the DSH Models page.',
    );
  }
  if (account.credentialRef === OFFICIAL_DEEPSEEK_KEY) {
    throw new SharedRouteError(
      'official-key-not-apiyi',
      'Concept art does not use the DeepSeek official key.',
    );
  }
  if (account.credentialRef === '') {
    throw new SharedRouteError(
      'credential-ref-missing',
      'This API易 account has no credential reference. Set it on the DSH Models page.',
    );
  }
  if (!account.models.includes(input.model)) {
    throw new SharedRouteError(
      'model-not-on-account',
      'That model is not on this API易 account. Add it on the DSH Models page.',
    );
  }
  if (!account.credentialConfigured) {
    throw new SharedRouteError(
      'credential-missing',
      'That API易 credential reference has no key. Store it once on the DSH Models page.',
    );
  }
  if (input.capability === 'chat') {
    if (account.chatProtocol === null) {
      throw new SharedRouteError(
        'protocol-unsupported',
        'That Models-page protocol is not a concept-art chat wire. The Host chat route is left as it is.',
      );
    }
    verifiedApiyiRoute(account.chatProtocol);
    return {
      account,
      protocol: account.chatProtocol,
      consumer: 'chat',
      capability: 'chat',
      instanceId: `apiyi-${account.provider}-chat`,
      model: input.model,
    };
  }
  verifiedApiyiRoute('openai-images');
  return {
    account,
    protocol: 'openai-images',
    consumer: 'concept-art',
    capability: 'image',
    instanceId: `apiyi-${account.provider}-image`,
    model: input.model,
  };
}

function chatProtocol(api: string, baseUrl: string): 'openai-chat' | 'anthropic-messages' | null {
  if (api === 'openai-completions' && baseUrl === 'https://api.apiyi.com/v1') return 'openai-chat';
  if (api === 'anthropic-messages' && baseUrl === 'https://api.apiyi.com')
    return 'anthropic-messages';
  return null;
}

function isApiyiBase(baseUrl: string): boolean {
  if (baseUrl === '') return false;
  try {
    const url = new URL(baseUrl);
    return url.protocol === 'https:' && url.hostname === APIYI_HOST;
  } catch {
    return false;
  }
}

function normalizeBase(value: string): string {
  const trimmed = value.trim().replace(/\/+$/u, '');
  try {
    const url = new URL(trimmed);
    if (
      url.protocol !== 'https:' ||
      url.username !== '' ||
      url.password !== '' ||
      url.search !== '' ||
      url.hash !== ''
    )
      return '';
    return `${url.origin}${url.pathname.replace(/\/+$/u, '')}`;
  } catch {
    return '';
  }
}

function profileAt(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function modelIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && item.trim() !== '') ids.push(item.trim());
    else if (
      typeof item === 'object' &&
      item !== null &&
      typeof (item as { id?: unknown }).id === 'string'
    ) {
      const id = (item as { id: string }).id.trim();
      if (id !== '') ids.push(id);
    }
  }
  return [...new Set(ids)];
}
