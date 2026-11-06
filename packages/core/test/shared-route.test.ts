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
      return new Response(JSON.stringify({ choices: [{ message: { content: 'hello back' } }] }), {
        status: 200,
      });
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
        credentialRef: 'apiyi-account',
      },
      SECRET,
    );
    await harness.route.saveInstance(
      {
        id: 'kimi-official',
        gateway: 'official',
        vendor: 'moonshot',
        capability: 'chat',
        protocol: 'official-native',
        baseUrl: 'https://api.moonshot.cn/v1',
        models: ['moonshot-v1-8k'],
        credentialRef: 'kimi-account',
      },
      'sk-kimi',
    );
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
    expect(sent).toMatchObject({
      status: 'completed',
      artifact: { kind: 'text', value: 'hello back' },
    });
    expect(seen).toEqual([`POST ${APIYI}/chat/completions`]);
    expect(JSON.stringify(sent)).not.toContain(SECRET);
  });

  it('shares one saved instance between chat and concept art without aliasing image to chat', async () => {
    const harness = open(
      async () => new Response(JSON.stringify({ data: [{ b64_json: 'QUJD' }] }), { status: 200 }),
    );
    await harness.route.saveInstance(
      {
        id: 'apiyi-image',
        gateway: 'apiyi',
        vendor: 'openai',
        capability: 'image',
        protocol: 'openai-images',
        baseUrl: APIYI,
        models: ['gpt-image-2.5-flare'],
        credentialRef: 'apiyi-account',
      },
      SECRET,
    );
    await harness.route.saveInstance({
      id: 'apiyi-chat',
      gateway: 'apiyi',
      vendor: 'openai',
      capability: 'chat',
      protocol: 'openai-chat',
      baseUrl: APIYI,
      models: ['gpt-5.4-mini'],
      credentialRef: 'apiyi-account',
    });
    await expect(
      harness.route.saveInstance({
        id: 'bad-image',
        gateway: 'apiyi',
        vendor: 'openai',
        capability: 'image',
        protocol: 'openai-chat',
        baseUrl: APIYI,
        models: ['gpt-image-2.5-flare'],
        credentialRef: 'apiyi-account',
      }),
    ).rejects.toBeInstanceOf(SharedRouteError);
    await expect(
      harness.route.saveInstance({
        id: 'claude-bad-base',
        gateway: 'apiyi',
        vendor: 'anthropic',
        capability: 'chat',
        protocol: 'anthropic-messages',
        baseUrl: APIYI,
        models: ['claude-sonnet-4-6'],
        credentialRef: 'apiyi-account',
      }),
    ).rejects.toMatchObject({ reason: 'protocol-mismatch' });
    harness.route.lock('concept-art', 'image', 'apiyi-image', 'gpt-image-2.5-flare');
    const image = await harness.route.submit(
      'concept-art',
      'image',
      'project-a',
      'img-1',
      'a lighthouse',
    );
    expect(image).toMatchObject({
      protocol: 'openai-images',
      remoteTaskId: null,
      status: 'completed',
      artifact: { kind: 'base64', value: 'QUJD' },
    });
    expect(JSON.stringify(image)).not.toContain('image/png');
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
        credentialRef: 'apiyi-account',
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
    expect(harness.route.cancel('project-a', 'clip-1')).toMatchObject({
      localStop: true,
      status: 'submit-unknown',
      remoteTaskId: null,
    });
    expect(calls).toBe(1);
    await expect(harness.route.resume('project-b', 'clip-1')).rejects.toMatchObject({
      reason: 'wrong-project',
    });
  });

  it('resumes a known video task id and keeps a failed terminal state', async () => {
    const seen: string[] = [];
    const harness = open(async (url, init) => {
      seen.push(`${init?.method} ${String(url)}`);
      if (init?.method === 'POST')
        return new Response(JSON.stringify({ id: 'remote-9' }), { status: 200 });
      if (init?.method === 'DELETE')
        return new Response(JSON.stringify({ deleted: true }), { status: 200 });
      return new Response(JSON.stringify({ id: 'remote-9', status: 'failed' }), { status: 200 });
    });
    await harness.route.saveInstance(
      {
        id: 'apiyi-video',
        gateway: 'apiyi',
        vendor: 'bytedance',
        capability: 'video',
        protocol: 'apiyi-seedance',
        baseUrl: 'https://api.apiyi.com',
        models: ['doubao-seedance-2-5-260628'],
        credentialRef: 'apiyi-account',
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
    expect(seen[0]).toBe('POST https://api.apiyi.com/seedance/api/v3/contents/generations/tasks');
    const failed = await harness.route.resume('project-a', 'clip-2');
    expect(failed.status).toBe('failed');
    expect(seen[1]).toBe(
      'GET https://api.apiyi.com/seedance/api/v3/contents/generations/tasks/remote-9',
    );
    const stopped = harness.route.cancel('project-a', 'clip-2');
    expect(stopped).toMatchObject({
      localStop: true,
      remoteTaskId: 'remote-9',
      remoteCancel: 'unverified',
    });
    const again = await harness.route.resume('project-a', 'clip-2');
    expect(again).toMatchObject({
      status: 'failed',
      localStop: true,
      remoteTaskId: 'remote-9',
      providerStatus: 'failed',
    });
    expect(seen).toEqual([
      'POST https://api.apiyi.com/seedance/api/v3/contents/generations/tasks',
      'GET https://api.apiyi.com/seedance/api/v3/contents/generations/tasks/remote-9',
      'GET https://api.apiyi.com/seedance/api/v3/contents/generations/tasks/remote-9',
    ]);
    expect(JSON.stringify(again)).not.toContain('video/mp4');
    expect(JSON.stringify(again)).not.toContain(SECRET);
  });

  it('sends Anthropic messages on the root host and records image products without pretending they are files', async () => {
    const calls: Array<{ url: string; headers: Headers; body: unknown }> = [];
    let imageMode: 'base64' | 'url' | 'empty' = 'url';
    const harness = open(async (url, init) => {
      calls.push({
        url: String(url),
        headers: new Headers(init?.headers),
        body: JSON.parse(String(init?.body)),
      });
      if (String(url).endsWith('/v1/messages')) {
        return new Response(JSON.stringify({ content: [{ type: 'text', text: 'native reply' }] }), {
          status: 200,
        });
      }
      if (imageMode === 'empty') return new Response(JSON.stringify({ data: [] }), { status: 200 });
      if (imageMode === 'url') {
        return new Response(
          JSON.stringify({ data: [{ url: 'https://untrusted.example/image' }] }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ data: [{ b64_json: 'QUJD' }] }), { status: 200 });
    });
    await harness.route.saveInstance(
      {
        id: 'apiyi-claude',
        gateway: 'apiyi',
        vendor: 'anthropic',
        capability: 'chat',
        protocol: 'anthropic-messages',
        baseUrl: 'https://api.apiyi.com',
        models: ['claude-sonnet-4-6'],
        credentialRef: 'apiyi-account',
      },
      SECRET,
    );
    harness.route.lock('chat', 'chat', 'apiyi-claude', 'claude-sonnet-4-6');
    const reply = await harness.route.submit('chat', 'chat', 'project-a', 'claude-1', 'hello');
    expect(calls[0]?.url).toBe('https://api.apiyi.com/v1/messages');
    expect(calls[0]?.headers.get('x-api-key')).toBe(SECRET);
    expect(calls[0]?.headers.get('anthropic-version')).toBe('2023-06-01');
    expect(calls[0]?.headers.get('authorization')).toBeNull();
    expect(calls[0]?.body).toEqual({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(reply.artifact).toEqual({ kind: 'text', value: 'native reply' });
    await harness.route.saveInstance({
      id: 'apiyi-image',
      gateway: 'apiyi',
      vendor: 'openai',
      capability: 'image',
      protocol: 'openai-images',
      baseUrl: APIYI,
      models: ['fixture-image-model'],
      credentialRef: 'apiyi-account',
    });
    harness.route.lock('concept-art', 'image', 'apiyi-image', 'fixture-image-model');
    const linked = await harness.route.submit(
      'concept-art',
      'image',
      'project-a',
      'img-url',
      'prompt',
    );
    expect(linked.artifact).toEqual({
      kind: 'untrusted-url',
      url: 'https://untrusted.example/image',
    });
    expect(calls.filter((call) => call.url === 'https://untrusted.example/image')).toHaveLength(0);
    imageMode = 'empty';
    const empty = await harness.route.submit(
      'concept-art',
      'image',
      'project-a',
      'img-empty',
      'prompt',
    );
    expect(empty).toMatchObject({ status: 'failed', error: 'empty-artifact' });
    await expect(harness.route.resume('project-b', 'img-url')).rejects.toMatchObject({
      reason: 'wrong-project',
    });
  });
});
