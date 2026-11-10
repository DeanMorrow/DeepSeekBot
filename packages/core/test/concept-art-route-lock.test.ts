import { mkdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { runConceptArtCommand } from '../src/bots/cli-concept-art.js';
import { attachOperationalModule, mountOperationalDatabase } from '../src/database/owner.js';
import { BOT_HARNESS_SCHEMA_PLAN } from '../src/database/schema-plan.js';
import { createConceptArtBridge } from '../src/models/concept-art-bridge.js';
import { createConceptArtConsumer } from '../src/models/concept-art-consumer.js';
import { createSharedModelRoute, type SecretStore } from '../src/models/shared-route.js';
import { createSessionOwnership } from '../src/sessions/ownership.js';
import { createTempRoot, FIXED_NOW, trackTestOwner } from './helpers.js';

function secrets(): SecretStore & { puts: () => number } {
  const keys = new Map<string, string>();
  let writes = 0;
  return {
    puts: () => writes,
    async put(id, key) {
      writes += 1;
      keys.set(id, key);
    },
    async configured(id) {
      return (keys.get(id) ?? '') !== '';
    },
    async read(id) {
      return keys.get(id);
    },
  };
}

function opened(home: string, store: SecretStore) {
  mkdirSync(home, { recursive: true });
  const owner = trackTestOwner(
    mountOperationalDatabase({
      dshHome: home,
      schemaPlan: BOT_HARNESS_SCHEMA_PLAN,
      now: FIXED_NOW,
    }),
  );
  const database = attachOperationalModule(owner, 'shared-model');
  const route = createSharedModelRoute(database, store, { now: () => FIXED_NOW().toISOString() });
  const conceptArt = createConceptArtConsumer({
    database: attachOperationalModule(owner, 'concept-art'),
    ownership: createSessionOwnership(attachOperationalModule(owner, 'session-ownership')),
    route,
    limits: {
      maxEncodedBytes: 1000,
      maxDecodedBytes: 1000,
      maxPixels: 1000,
      allowlist: ['image/png'],
    },
  });
  return { owner, bridge: createConceptArtBridge({ conceptArt, sharedRoute: route }) };
}

describe('concept art route lock', () => {
  it('reuses a saved credential, survives restart, and refuses an unknown model', async () => {
    const home = createTempRoot('concept-route-');
    const store = secrets();
    const key = 'sk-isolated-test';
    const first = opened(home, store);
    const saved = await first.bridge.conceptArt({
      action: 'saveRoute',
      route: {
        id: 'chat-main',
        protocol: 'openai-chat',
        credentialRef: 'apiyi-account',
        models: ['vendor-chat-a', 'vendor-chat-b'],
        key,
      },
    });
    expect(saved.ok).toBe(true);
    expect(JSON.stringify(saved)).not.toContain(key);
    expect(saved.ok ? saved.value : undefined).toMatchObject({
      baseUrl: 'https://api.apiyi.com/v1',
      credentialConfigured: true,
      models: ['vendor-chat-a', 'vendor-chat-b'],
    });
    const image = await first.bridge.conceptArt({
      action: 'saveRoute',
      route: {
        id: 'image-main',
        protocol: 'openai-images',
        credentialRef: 'apiyi-account',
        models: ['vendor-image-a'],
      },
    });
    expect(image.ok).toBe(true);
    expect(store.puts()).toBe(1);
    await first.bridge.conceptArt({
      action: 'lockRoute',
      lock: { consumer: 'chat', instanceId: 'chat-main', model: 'vendor-chat-a' },
    });
    const switched = await first.bridge.conceptArt({
      action: 'lockRoute',
      lock: { consumer: 'chat', instanceId: 'chat-main', model: 'vendor-chat-b' },
    });
    expect(switched.ok ? switched.value : undefined).toMatchObject({
      locked: true,
      model: 'vendor-chat-b',
      credentialConfigured: true,
    });
    await first.bridge.conceptArt({
      action: 'lockRoute',
      lock: { consumer: 'concept-art', instanceId: 'image-main', model: 'vendor-image-a' },
    });
    const refused = await first.bridge.conceptArt({
      action: 'lockRoute',
      lock: { consumer: 'concept-art', instanceId: 'image-main', model: 'not-on-the-list' },
    });
    expect(refused.ok).toBe(false);
    expect(JSON.stringify(refused)).not.toContain(key);
    const missing = await first.bridge.conceptArt({
      action: 'saveRoute',
      route: {
        id: 'chat-empty',
        protocol: 'openai-chat',
        credentialRef: 'missing-account',
        models: ['vendor-chat-a'],
      },
    });
    expect(missing.ok).toBe(false);
    first.owner.close();

    const restarted = opened(home, store);
    const routes = await restarted.bridge.conceptArt({ action: 'routes' });
    expect(routes.ok ? routes.value : undefined).toMatchObject({
      chat: { locked: true, model: 'vendor-chat-b', credentialConfigured: true },
      image: { locked: true, model: 'vendor-image-a', credentialConfigured: true },
    });
    expect(store.puts()).toBe(1);
    const status = await restarted.bridge.conceptArt({ action: 'status' });
    expect(status.ok ? status.value : undefined).toMatchObject({
      locked: true,
      credentialConfigured: true,
      chatReady: true,
    });

    const other = opened(createTempRoot('concept-route-other-'), secrets());
    const isolated = await other.bridge.conceptArt({ action: 'routes' });
    expect(isolated.ok ? isolated.value : undefined).toMatchObject({
      chat: { locked: false, credentialConfigured: false },
      image: { locked: false, credentialConfigured: false },
    });
    restarted.owner.close();
    other.owner.close();
  });

  it('keeps earlier models when another model is saved and does not drop the other lock', async () => {
    const home = createTempRoot('concept-route-merge-');
    const store = secrets();
    const env = opened(home, store);
    await env.bridge.conceptArt({
      action: 'saveRoute',
      route: {
        id: 'chat-main',
        protocol: 'openai-chat',
        credentialRef: 'apiyi-account',
        models: ['vendor-chat-a'],
        key: 'sk-isolated-test',
      },
    });
    await env.bridge.conceptArt({
      action: 'lockRoute',
      lock: { consumer: 'chat', instanceId: 'chat-main', model: 'vendor-chat-a' },
    });
    const added = await env.bridge.conceptArt({
      action: 'saveRoute',
      route: {
        id: 'chat-main',
        protocol: 'openai-chat',
        credentialRef: 'apiyi-account',
        models: ['vendor-chat-b'],
      },
    });
    expect(added.ok ? added.value : undefined).toMatchObject({
      models: ['vendor-chat-a', 'vendor-chat-b'],
    });
    const repeated = await env.bridge.conceptArt({
      action: 'saveRoute',
      route: {
        id: 'chat-main',
        protocol: 'openai-chat',
        credentialRef: 'apiyi-account',
        models: ['vendor-chat-b'],
      },
    });
    expect(repeated.ok ? (repeated.value as { models: string[] }).models : []).toEqual([
      'vendor-chat-a',
      'vendor-chat-b',
    ]);
    await env.bridge.conceptArt({
      action: 'saveRoute',
      route: {
        id: 'image-main',
        protocol: 'openai-images',
        credentialRef: 'apiyi-account',
        models: ['vendor-image-a'],
      },
    });
    await env.bridge.conceptArt({
      action: 'lockRoute',
      lock: { consumer: 'concept-art', instanceId: 'image-main', model: 'vendor-image-a' },
    });
    await env.bridge.conceptArt({
      action: 'lockRoute',
      lock: { consumer: 'chat', instanceId: 'chat-main', model: 'vendor-chat-b' },
    });
    const kept = await env.bridge.conceptArt({ action: 'routes' });
    expect(kept.ok ? kept.value : undefined).toMatchObject({
      chat: { locked: true, model: 'vendor-chat-b' },
      image: { locked: true, model: 'vendor-image-a' },
    });
    const rejected = await env.bridge.conceptArt({
      action: 'saveRoute',
      route: {
        id: 'chat-main',
        protocol: 'openai-images',
        credentialRef: 'apiyi-account',
        models: ['vendor-image-b'],
      },
    });
    expect(rejected.ok).toBe(false);
    const after = await env.bridge.conceptArt({ action: 'routes' });
    const instances = (after.ok ? after.value : undefined) as {
      instances: { id: string; models: string[]; protocol: string }[];
    };
    expect(instances.instances.find((item) => item.id === 'chat-main')).toMatchObject({
      protocol: 'openai-chat',
      models: ['vendor-chat-a', 'vendor-chat-b'],
    });
    env.owner.close();
  });

  it('accepts a capital credential reference in the instance id and keeps earlier names', async () => {
    const env = opened(createTempRoot('concept-case-'), secrets());
    const first = await env.bridge.conceptArt({
      action: 'saveRoute',
      route: {
        id: 'openai-chat-ISOLATED_TEST_KEY',
        protocol: 'openai-chat',
        credentialRef: 'ISOLATED_TEST_KEY',
        models: ['allowlist-chat-a'],
        key: 'sk-case-test',
      },
    });
    expect(JSON.stringify(first)).not.toContain('sk-case-test');
    expect(first.ok ? first.value : undefined).toMatchObject({
      id: 'openai-chat-isolated_test_key',
      credentialRef: 'ISOLATED_TEST_KEY',
      models: ['allowlist-chat-a'],
    });
    const second = await env.bridge.conceptArt({
      action: 'saveRoute',
      route: {
        id: 'openai-chat-ISOLATED_TEST_KEY',
        protocol: 'openai-chat',
        credentialRef: 'ISOLATED_TEST_KEY',
        models: ['allowlist-chat-c'],
      },
    });
    expect(second.ok ? second.value : undefined).toMatchObject({
      models: ['allowlist-chat-a', 'allowlist-chat-c'],
    });
    const locked = await env.bridge.conceptArt({
      action: 'lockRoute',
      lock: {
        consumer: 'chat',
        instanceId: 'openai-chat-ISOLATED_TEST_KEY',
        model: 'allowlist-chat-c',
      },
    });
    expect(locked.ok ? locked.value : undefined).toMatchObject({
      locked: true,
      model: 'allowlist-chat-c',
      providerId: 'openai-chat-isolated_test_key',
    });
    const image = await env.bridge.conceptArt({
      action: 'saveRoute',
      route: {
        id: 'openai-images-ISOLATED_TEST_KEY',
        protocol: 'openai-images',
        credentialRef: 'ISOLATED_TEST_KEY',
        models: ['allowlist-image-a'],
      },
    });
    expect(image.ok ? image.value : undefined).toMatchObject({
      id: 'openai-images-isolated_test_key',
      models: ['allowlist-image-a'],
    });
    env.owner.close();
  });

  it('reads a new key only from stdin and omits it when the reference is already stored', async () => {
    const seen: Record<string, unknown>[] = [];
    const connect = async () => async (_method: string, payload: Record<string, unknown>) => {
      seen.push(payload);
      return { ok: true };
    };
    await runConceptArtCommand(
      'concept-art',
      ['save-route', 'chat-main', 'openai-chat', 'apiyi-account', 'vendor-chat-a', '--key-stdin'],
      connect,
      async () => 'sk-isolated-test\n',
    );
    expect(
      JSON.stringify(['save-route', 'chat-main', 'openai-chat', 'apiyi-account', 'vendor-chat-a']),
    ).not.toContain('sk-isolated-test');
    expect(seen[0]?.['route']).toMatchObject({
      credentialRef: 'apiyi-account',
      models: ['vendor-chat-a'],
      key: 'sk-isolated-test',
    });
    await runConceptArtCommand(
      'concept-art',
      ['save-route', 'chat-main', 'openai-chat', 'apiyi-account', 'vendor-chat-b'],
      connect,
      async () => '',
    );
    expect(seen[1]?.['route']).not.toHaveProperty('key');
  });
});
