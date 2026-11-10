import { mkdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { attachOperationalModule, mountOperationalDatabase } from '../src/database/owner.js';
import { BOT_HARNESS_SCHEMA_PLAN } from '../src/database/schema-plan.js';
import { readApiyiAccounts } from '../src/models/apiyi-account.js';
import { createConceptArtBridge } from '../src/models/concept-art-bridge.js';
import { createConceptArtConsumer } from '../src/models/concept-art-consumer.js';
import { createSharedModelRoute, type SecretStore } from '../src/models/shared-route.js';
import { createSessionOwnership } from '../src/sessions/ownership.js';
import { createTempRoot, FIXED_NOW, trackTestOwner } from './helpers.js';

const profile = (extra: Record<string, unknown> = {}) => ({
  providers: [
    {
      provider: 'apiyi-studio',
      displayName: 'API易',
      settingsNs: 'llm-pi-ai',
      settingsPath: ['providers', 'apiyi-studio'],
    },
    {
      provider: 'deepseek',
      displayName: 'DeepSeek',
      settingsNs: 'llm-deepseek',
      settingsPath: [],
    },
    {
      provider: 'other-chat',
      displayName: 'Other',
      settingsNs: 'llm-pi-ai',
      settingsPath: ['providers', 'other-chat'],
    },
  ],
  settings: [
    {
      ns: 'llm-pi-ai',
      value: {
        providers: {
          'apiyi-studio': {
            displayName: 'API易',
            api: 'openai-completions',
            baseURL: 'https://api.apiyi.com/v1',
            apiKeyEnv: 'APIYI_STUDIO_API_KEY',
            models: [{ id: 'chat-a' }, { id: 'image-a' }],
            ...extra,
          },
          'other-chat': {
            api: 'openai-completions',
            baseURL: 'https://api.example.test/v1',
            apiKeyEnv: 'OTHER_CHAT_API_KEY',
            models: [{ id: 'local-chat' }],
          },
        },
      },
    },
    {
      ns: 'llm-deepseek',
      value: { apiKeyEnv: 'DEEPSEEK_API_KEY', baseURL: 'https://api.deepseek.com' },
    },
    { ns: 'agent-default-model', value: { provider: 'deepseek', model: 'deepseek-chat' } },
  ],
});

function secrets(configured: string[]): SecretStore & { puts: string[] } {
  const puts: string[] = [];
  return {
    puts,
    async put(id, key) {
      puts.push(`${id}:${key}`);
    },
    async configured(id) {
      return configured.includes(id);
    },
    async read(id) {
      return configured.includes(id) ? 'stored' : undefined;
    },
  };
}

describe('API易 account binding', () => {
  it('reads the Models-page account and leaves other providers and the official key alone', async () => {
    const source = profile();
    const accounts = await readApiyiAccounts({
      ...source,
      configured: async (ref) => ref === 'APIYI_STUDIO_API_KEY',
    });
    expect(accounts).toEqual([
      expect.objectContaining({
        provider: 'apiyi-studio',
        credentialRef: 'APIYI_STUDIO_API_KEY',
        credentialConfigured: true,
        models: ['chat-a', 'image-a'],
        chatProtocol: 'openai-chat',
        allowlist: 'user-entered-not-provider-checked',
      }),
    ]);
    expect(JSON.stringify(accounts)).not.toContain('DEEPSEEK_API_KEY');
    expect(JSON.stringify(accounts)).not.toContain('local-chat');
    expect(source.settings.find((item) => item.ns === 'agent-default-model')?.value).toEqual({
      provider: 'deepseek',
      model: 'deepseek-chat',
    });
  });

  it('adds a model on the same reference, locks chat and image apart, and refuses a removed name', async () => {
    const home = createTempRoot('apiyi-account-');
    mkdirSync(home, { recursive: true });
    const owner = trackTestOwner(
      mountOperationalDatabase({
        dshHome: home,
        schemaPlan: BOT_HARNESS_SCHEMA_PLAN,
        now: FIXED_NOW,
      }),
    );
    const store = secrets(['APIYI_STUDIO_API_KEY']);
    const route = createSharedModelRoute(attachOperationalModule(owner, 'shared-model'), store, {
      now: () => FIXED_NOW().toISOString(),
    });
    let models = ['chat-a', 'image-a'];
    const accounts = () =>
      readApiyiAccounts({
        ...profile({ models: models.map((id) => ({ id })) }),
        configured: async (ref) => ref === 'APIYI_STUDIO_API_KEY',
      });
    const bridge = () =>
      createConceptArtBridge({
        conceptArt: createConceptArtConsumer({
          database: attachOperationalModule(owner, 'concept-art'),
          ownership: createSessionOwnership(attachOperationalModule(owner, 'session-ownership')),
          route,
          limits: {
            maxEncodedBytes: 1000,
            maxDecodedBytes: 1000,
            maxPixels: 1000,
            allowlist: ['image/png'],
          },
        }),
        sharedRoute: route,
        apiyiAccounts: accounts,
      });
    const chat = await bridge().conceptArt({
      action: 'bindAccount',
      bind: { capability: 'chat', provider: 'apiyi-studio', model: 'chat-a' },
    });
    expect(chat.ok).toBe(true);
    models = ['chat-a', 'chat-b', 'image-a'];
    const added = await bridge().conceptArt({
      action: 'bindAccount',
      bind: { capability: 'chat', provider: 'apiyi-studio', model: 'chat-b' },
    });
    expect(added.ok ? added.value : undefined).toMatchObject({
      lock: { model: 'chat-b', credentialConfigured: true },
      hostDefault: 'unchanged',
    });
    const image = await bridge().conceptArt({
      action: 'bindAccount',
      bind: { capability: 'image', provider: 'apiyi-studio', model: 'image-a' },
    });
    expect(image.ok ? image.value : undefined).toMatchObject({
      lock: { model: 'image-a' },
    });
    const restarted = createSharedModelRoute(
      attachOperationalModule(owner, 'shared-model'),
      store,
      {
        now: () => FIXED_NOW().toISOString(),
      },
    );
    expect(await restarted.describeConsumer('chat', 'chat')).toMatchObject({
      model: 'chat-b',
      credentialConfigured: true,
    });
    expect(await restarted.describeConsumer('concept-art', 'image')).toMatchObject({
      model: 'image-a',
    });
    models = ['chat-b'];
    const removed = await createConceptArtBridge({
      sharedRoute: restarted,
      conceptArt: createConceptArtConsumer({
        database: attachOperationalModule(owner, 'concept-art'),
        ownership: createSessionOwnership(attachOperationalModule(owner, 'session-ownership')),
        route: restarted,
        limits: {
          maxEncodedBytes: 1000,
          maxDecodedBytes: 1000,
          maxPixels: 1000,
          allowlist: ['image/png'],
        },
      }),
      apiyiAccounts: accounts,
    }).conceptArt({
      action: 'bindAccount',
      bind: { capability: 'image', provider: 'apiyi-studio', model: 'image-a' },
    });
    expect(removed).toMatchObject({ ok: false, error: { code: 'model-not-on-account' } });
    expect(await restarted.describeConsumer('concept-art', 'image')).toMatchObject({
      model: 'image-a',
    });
    const mismatched = await createConceptArtBridge({
      sharedRoute: restarted,
      conceptArt: createConceptArtConsumer({
        database: attachOperationalModule(owner, 'concept-art'),
        ownership: createSessionOwnership(attachOperationalModule(owner, 'session-ownership')),
        route: restarted,
        limits: {
          maxEncodedBytes: 1000,
          maxDecodedBytes: 1000,
          maxPixels: 1000,
          allowlist: ['image/png'],
        },
      }),
      apiyiAccounts: () =>
        readApiyiAccounts({
          ...profile(),
          configured: async () => false,
        }),
    }).conceptArt({
      action: 'bindAccount',
      bind: { capability: 'chat', provider: 'apiyi-studio', model: 'chat-a' },
    });
    expect(mismatched).toMatchObject({ ok: false, error: { code: 'credential-missing' } });
  });

  it('refuses a non-API易 provider and a key on the binding', async () => {
    const home = createTempRoot('apiyi-refuse-');
    const owner = trackTestOwner(
      mountOperationalDatabase({
        dshHome: home,
        schemaPlan: BOT_HARNESS_SCHEMA_PLAN,
        now: FIXED_NOW,
      }),
    );
    const store = secrets(['APIYI_STUDIO_API_KEY']);
    const route = createSharedModelRoute(attachOperationalModule(owner, 'shared-model'), store, {
      now: () => FIXED_NOW().toISOString(),
    });
    const bridge = createConceptArtBridge({
      sharedRoute: route,
      conceptArt: createConceptArtConsumer({
        database: attachOperationalModule(owner, 'concept-art'),
        ownership: createSessionOwnership(attachOperationalModule(owner, 'session-ownership')),
        route,
        limits: {
          maxEncodedBytes: 1000,
          maxDecodedBytes: 1000,
          maxPixels: 1000,
          allowlist: ['image/png'],
        },
      }),
      apiyiAccounts: () =>
        readApiyiAccounts({
          ...profile(),
          configured: async (ref) => ref === 'APIYI_STUDIO_API_KEY',
        }),
    });
    expect(
      await bridge.conceptArt({
        action: 'bindAccount',
        bind: { capability: 'chat', provider: 'other-chat', model: 'local-chat' },
      }),
    ).toMatchObject({ ok: false, error: { code: 'provider-not-apiyi' } });
    expect(
      await bridge.conceptArt({
        action: 'bindAccount',
        bind: { capability: 'chat', provider: 'apiyi-studio', model: 'chat-a', key: 'sk-no' },
      }),
    ).toMatchObject({ ok: false, error: { code: 'invalid-input' } });
    expect(store.puts).toEqual([]);
    expect(await route.describeConsumer('chat', 'chat')).toMatchObject({ locked: false });
  });
});
