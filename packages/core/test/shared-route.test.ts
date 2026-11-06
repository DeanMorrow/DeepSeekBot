import { mkdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { attachOperationalModule, mountOperationalDatabase } from '../src/database/owner.js';
import { BOT_HARNESS_SCHEMA_PLAN } from '../src/database/schema-plan.js';
import {
  createMemorySecretStore,
  createSharedModelRoute,
  SharedRouteError,
} from '../src/models/shared-route.js';
import { createTempRoot, FIXED_NOW, trackTestOwner } from './helpers.js';

const SECRET = 'sk-test-secret';
const APIYI = 'https://api.apiyi.com/v1';

function open(fetchImpl?: typeof fetch) {
  const home = createTempRoot('shared-route-');
  mkdirSync(home, { recursive: true });
  const owner = trackTestOwner(
    mountOperationalDatabase({
      dshHome: home,
      schemaPlan: BOT_HARNESS_SCHEMA_PLAN,
      now: FIXED_NOW,
    }),
  );
  const database = attachOperationalModule(owner, 'shared-model');
  const secrets = createMemorySecretStore();
  const route = createSharedModelRoute(database, secrets, {
    ...(fetchImpl === undefined ? {} : { fetch: fetchImpl }),
    now: () => FIXED_NOW().toISOString(),
  });
  return { home, owner, database, secrets, route };
}

describe('shared model route', () => {
  it('keeps a manual lock inside one provider and refuses a silent auto hop', async () => {
    const seen: string[] = [];
    const harness = open(async (url, init) => {
      seen.push(`${init?.method} ${String(url)}`);
      expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${SECRET}`);
      return new Response(JSON.stringify({ id: 'chat-1', choices: [] }), { status: 200 });
    });
    await harness.route.saveInstance(
      {
        id: 'apiyi-chat',
        gateway: 'apiyi',
        vendor: 'openai',
        capability: 'chat',
        protocol: 'openai-chat',
        baseUrl: APIYI,
        models: ['gpt-5.4-mini'],
      },
      SECRET,
    );
    await harness.route.saveInstance({
      id: 'kimi-official',
      gateway: 'official',
      vendor: 'moonshot',
      capability: 'chat',
      protocol: 'official-native',
      baseUrl: 'https://api.moonshot.cn/v1',
      models: ['moonshot-v1-8k'],
    });
    await harness.secrets.put('kimi-official', 'sk-kimi');
    await expect(harness.route.resolve('chat', 'chat', 'auto')).rejects.toMatchObject({
      reason: 'auto-ambiguous',
    });
    harness.route.lock('chat', 'chat', 'apiyi-chat', 'gpt-5.4-mini');
    await expect(harness.route.resolve('chat', 'chat', 'auto')).resolves.toMatchObject({
      model: 'gpt-5.4-mini',
    });
    await expect(harness.route.resolve('chat', 'image', 'locked')).rejects.toMatchObject({
      reason: 'capability-mismatch',
    });
    const listed = JSON.stringify(await harness.route.listInstances());
    expect(listed).not.toContain(SECRET);
    expect(listed).not.toContain('sk-kimi');
    const sent = await harness.route.submit('chat', 'chat', 'project-a', 'once', 'hello');
    expect(sent.status).toBe('completed');
    expect(seen).toEqual([`POST ${APIYI}/chat/completions`]);
    expect(JSON.stringify(sent)).not.toContain(SECRET);
  });

  it('shares one saved instance between chat and concept art without aliasing image to chat', async () => {
    const harness = open(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
    await harness.route.saveInstance(
      {
        id: 'apiyi-image',
        gateway: 'apiyi',
        vendor: 'openai',
        capability: 'image',
        protocol: 'openai-images',
        baseUrl: APIYI,
        models: ['gpt-image-2.5-flare'],
      },
      SECRET,
    );
    await expect(
      harness.route.saveInstance({
        id: 'bad-image',
        gateway: 'apiyi',
        vendor: 'openai',
        capability: 'image',
        protocol: 'openai-chat',
        baseUrl: APIYI,
        models: ['gpt-image-2.5-flare'],
      }),
    ).rejects.toBeInstanceOf(SharedRouteError);
    harness.route.lock('concept-art', 'image', 'apiyi-image', 'gpt-image-2.5-flare');
    const image = await harness.route.submit(
      'concept-art',
      'image',
      'project-a',
      'img-1',
      'a lighthouse',
    );
    expect(image.protocol).toBe('openai-images');
    await expect(
      harness.route.submit('chat', 'image', 'project-a', 'img-2', 'a lighthouse'),
    ).rejects.toMatchObject({
      reason: 'capability-mismatch',
    });
    const reopened = createSharedModelRoute(harness.database, harness.secrets, {
      now: () => FIXED_NOW().toISOString(),
    });
    expect(await reopened.listInstances()).toEqual(await harness.route.listInstances());
    await expect(reopened.resolve('concept-art', 'image', 'locked')).resolves.toMatchObject({
      model: 'gpt-image-2.5-flare',
    });
  });

  it('does not create a second video task when the first response is unknown', async () => {
    let calls = 0;
    const harness = open(async () => {
      calls += 1;
      return new Response('not-json', { status: 200 });
    });
    await harness.route.saveInstance(
      {
        id: 'apiyi-video',
        gateway: 'apiyi',
        vendor: 'az8',
        capability: 'video',
        protocol: 'openai-videos',
        baseUrl: APIYI,
        models: ['oxygen-1.0'],
      },
      SECRET,
    );
    harness.route.lock('concept-art', 'video', 'apiyi-video', 'oxygen-1.0');
    const first = await harness.route.submit(
      'concept-art',
      'video',
      'project-a',
      'clip-1',
      'a sphere',
    );
    const second = await harness.route.submit(
      'concept-art',
      'video',
      'project-a',
      'clip-1',
      'a sphere',
    );
    expect(first.status).toBe('submit-unknown');
    expect(first.remoteTaskId).toBeNull();
    expect(second.id).toBe(first.id);
    expect(calls).toBe(1);
    await expect(harness.route.resume('project-b', 'clip-1')).rejects.toMatchObject({
      reason: 'wrong-project',
    });
    const cancelled = harness.route.cancel('project-a', 'clip-1');
    expect(cancelled).toMatchObject({ status: 'cancelled', remoteCancel: 'unverified' });
  });

  it('resumes a known video task id and keeps a failed terminal state', async () => {
    const harness = open(async (url, init) => {
      if (init?.method === 'POST')
        return new Response(JSON.stringify({ id: 'remote-9' }), { status: 200 });
      return new Response(JSON.stringify({ id: 'remote-9', status: 'failed' }), { status: 200 });
    });
    await harness.route.saveInstance(
      {
        id: 'apiyi-video',
        gateway: 'apiyi',
        vendor: 'az8',
        capability: 'video',
        protocol: 'openai-videos',
        baseUrl: APIYI,
        models: ['oxygen-1.0'],
      },
      SECRET,
    );
    const created = await harness.route.submit(
      'concept-art',
      'video',
      'project-a',
      'clip-2',
      'a sphere',
    );
    expect(created).toMatchObject({ status: 'running', remoteTaskId: 'remote-9' });
    const failed = await harness.route.resume('project-a', 'clip-2');
    expect(failed.status).toBe('failed');
    const again = await harness.route.resume('project-a', 'clip-2');
    expect(again.status).toBe('failed');
    expect(JSON.stringify(again)).not.toContain(SECRET);
  });
});
