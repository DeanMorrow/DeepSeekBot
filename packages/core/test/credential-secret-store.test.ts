import {
  credentialKey,
  type CredentialProvider,
  type CredentialRecord,
} from '@deepseek-ai/dsh-credentials';
import { describe, expect, it } from 'vitest';

import { createCredentialSecretStore } from '../src/models/credential-secret-store.js';
import { createSharedModelRoute, SharedRouteError } from '../src/models/shared-route.js';
import { attachOperationalModule, mountOperationalDatabase } from '../src/database/owner.js';
import { BOT_HARNESS_SCHEMA_PLAN } from '../src/database/schema-plan.js';
import { createTempRoot, trackTestOwner } from './helpers.js';

function syntheticCredentials() {
  const records = new Map<string, CredentialRecord>();
  const credentials = {
    async readRecord(key: string) {
      return records.get(key);
    },
    async modifyRecord(
      key: string,
      mutate: (current: CredentialRecord | undefined) => Promise<CredentialRecord | undefined>,
    ) {
      const next = await mutate(records.get(key));
      if (next !== undefined) records.set(key, next);
      return records.get(key);
    },
  } as Pick<CredentialProvider, 'readRecord' | 'modifyRecord'>;
  return { records, credentials };
}

describe('route credential references', () => {
  it('refuses route references the credential key grammar cannot store', async () => {
    const { records, credentials } = syntheticCredentials();
    const store = createCredentialSecretStore(() => credentials);
    for (const id of ['1image', 'apiyi.account']) {
      await expect(store.put(id, 'sk-synthetic-route')).rejects.toMatchObject({
        reason: 'credential-ref-not-storable',
      });
    }
    await expect(store.put('apiyi_account', 'sk-synthetic-route')).rejects.toMatchObject({
      reason: 'credential-unavailable',
    });
    expect(records.size).toBe(0);
    await store.put('apiyi-account', 'sk-synthetic-route');
    expect(records.get(credentialKey('botharness-route', 'apiyi-account'))).toMatchObject({
      kind: 'api-key',
    });
    expect(records.has(credentialKey('botharness-core', 'apiyi-account'))).toBe(false);
  });

  it('does not replace a botharness-core grant or an unrelated route record', async () => {
    const { records, credentials } = syntheticCredentials();
    const grant = {
      kind: 'grant' as const,
      payload: { owner: 'voice-or-cloud', marker: 'synthetic-grant' },
    };
    records.set(credentialKey('botharness-core', 'apiyi-account'), grant);
    records.set(credentialKey('botharness-route', 'taken-id'), {
      kind: 'grant',
      payload: { owner: 'unrelated', marker: 'keep' },
    });
    const store = createCredentialSecretStore(() => credentials);
    await store.put('apiyi-account', 'sk-synthetic-route');
    expect(records.get(credentialKey('botharness-core', 'apiyi-account'))).toEqual(grant);
    expect(await store.read('apiyi-account')).toBe('sk-synthetic-route');
    await expect(store.put('taken-id', 'sk-synthetic-route')).rejects.toBeInstanceOf(
      SharedRouteError,
    );
    await expect(store.put('taken-id', 'sk-synthetic-route')).rejects.toMatchObject({
      reason: 'credential-record-conflict',
    });
    expect(records.get(credentialKey('botharness-route', 'taken-id'))).toEqual({
      kind: 'grant',
      payload: { owner: 'unrelated', marker: 'keep' },
    });
    expect(await store.read('taken-id')).toBeUndefined();
  });

  it('resolves a native credential reference without copying it into botharness-route', async () => {
    const refs = new Map<string, string>([['DEEPSEEK_API_KEY', 'sk-native-only']]);
    const records = new Map<string, CredentialRecord>();
    const credentials = {
      async readRecord(key: string) {
        return records.get(key);
      },
      async modifyRecord() {
        throw new Error('native reference must not be copied');
      },
      async describe(ref: string) {
        return { configured: refs.has(ref), writable: true };
      },
      async resolve(ref: string) {
        const value = refs.get(ref);
        return value === undefined ? undefined : { value, source: 'file' };
      },
      async set(ref: string, value: string) {
        if (refs.has(ref)) throw new Error('overwrite');
        refs.set(ref, value);
      },
    } as Pick<CredentialProvider, 'readRecord' | 'modifyRecord' | 'describe' | 'resolve' | 'set'>;
    const store = createCredentialSecretStore(() => credentials);
    expect(await store.configured('DEEPSEEK_API_KEY')).toBe(true);
    expect(await store.read('DEEPSEEK_API_KEY')).toBe('sk-native-only');
    expect(records.size).toBe(0);
    await expect(store.put('DEEPSEEK_API_KEY', 'sk-second')).rejects.toMatchObject({
      reason: 'credential-already-configured',
    });
    expect(refs.get('DEEPSEEK_API_KEY')).toBe('sk-native-only');
    const home = createTempRoot('route-native-ref-');
    const owner = trackTestOwner(
      mountOperationalDatabase({ dshHome: home, schemaPlan: BOT_HARNESS_SCHEMA_PLAN }),
    );
    const route = createSharedModelRoute(attachOperationalModule(owner, 'shared-model'), store);
    const saved = await route.saveInstance({
      id: 'chat-native',
      gateway: 'apiyi',
      vendor: 'apiyi',
      capability: 'chat',
      protocol: 'openai-chat',
      baseUrl: 'https://api.apiyi.com/v1',
      models: ['vendor-chat-a'],
      credentialRef: 'DEEPSEEK_API_KEY',
    });
    expect(saved.credentialConfigured).toBe(true);
    expect(records.size).toBe(0);
    expect(JSON.stringify(saved)).not.toContain('sk-native-only');
    await expect(
      route.saveInstance(
        {
          id: 'chat-native',
          gateway: 'apiyi',
          vendor: 'apiyi',
          capability: 'chat',
          protocol: 'openai-chat',
          baseUrl: 'https://api.apiyi.com/v1',
          models: ['vendor-chat-a'],
          credentialRef: 'DEEPSEEK_API_KEY',
        },
        'sk-second',
      ),
    ).rejects.toMatchObject({ reason: 'credential-already-configured' });
    expect(refs.get('DEEPSEEK_API_KEY')).toBe('sk-native-only');
    owner.close();
  });

  it('surfaces the same refusal from the shared route', async () => {
    const home = createTempRoot('route-credential-ref-');
    const owner = trackTestOwner(
      mountOperationalDatabase({ dshHome: home, schemaPlan: BOT_HARNESS_SCHEMA_PLAN }),
    );
    const { credentials } = syntheticCredentials();
    const route = createSharedModelRoute(
      attachOperationalModule(owner, 'shared-model'),
      createCredentialSecretStore(() => credentials),
    );
    await expect(
      route.saveInstance(
        {
          id: 'apiyi-image',
          gateway: 'apiyi',
          vendor: 'openai',
          capability: 'image',
          protocol: 'openai-images',
          baseUrl: 'https://api.apiyi.com/v1',
          models: ['fixture-image-model'],
          credentialRef: '1image',
        },
        'sk-synthetic-route',
      ),
    ).rejects.toMatchObject({ reason: 'credential-ref-not-storable' });
  });
});
