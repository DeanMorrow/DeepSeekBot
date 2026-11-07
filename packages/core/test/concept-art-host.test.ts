import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Context } from '@deepseek-ai/cordis';
import LocalCredentialProvider from '@deepseek-ai/dsh-credentials-local';
import { describe, expect, it } from 'vitest';

import { apply, createCore, type BotHarnessCore } from '../src/plugin.js';
import { createBridgeMethods } from '../src/bridge/methods.js';
import { runConceptArtCommand } from '../src/bots/cli-concept-art.js';
import { callConceptArt } from '../../client/src/client/concept-art-bridge.js';
import type { BridgeCall } from '../../client/src/client/bridge.js';
import { createTempRoot, trackTestOwner } from './helpers.js';

const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const FIXTURES = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures/concept-art-fixtures.json'), 'utf8'),
) as {
  cases: Array<{ id: string; input: Record<string, unknown>; expected: Record<string, unknown> }>;
};

/** Which chain actually executes each fixture. One consumer test is not 21 host behaviors. */
const FIXTURE_CHAIN: Record<string, 'host'> = {
  F_STYLE_NONE: 'host',
  F_STYLE_SELECTED: 'host',
  F_STYLE_SWITCH_SELECTED: 'host',
  F_STYLE_NONE_RAW_WATERCOLOR: 'host',
  F_STYLE_DISABLED_SUCCESS: 'host',
  F_BLOCK_CONFLICT: 'host',
  F_EMPTY_RAW: 'host',
  F_MISSING_HOST_CONTEXT: 'host',
  F_RETRY_SAME_OPERATION: 'host',
  F_EXPLICIT_NEW_GENERATION: 'host',
  F_IDEM_DIFF_PAYLOAD_REJECT: 'host',
  F_CONTEXT_VERSION_REJECT: 'host',
  F_CROSS_PROJECT: 'host',
  F_CANCEL_LATE: 'host',
  F_BAD_BASE64: 'host',
  F_JSON_AS_B64: 'host',
  F_TRUNCATED_PNG_HEADER: 'host',
  F_FAKE_URL: 'host',
  F_EMPTY_ARTIFACT: 'host',
  F_ERROR_RESIDUAL_ACCEPT_GATE: 'host',
  F_REF_LOCAL_BUT_ROUTE_PROMPT_ONLY: 'host',
};

const NOT_RUN = [
  'paid-provider-network',
  'url-byte-download',
  'host-accept-as-deliverable-image',
  'web-ui-screen',
  'forged-stale-provider-error-on-bridge',
] as const;

const caseById = (id: string) => FIXTURES.cases.find((item) => item.id === id)!;

function stubContext() {
  const ctx = new Context();
  ctx.provide('tools', { register: () => () => undefined, guard: () => () => undefined });
  ctx.provide('systemPrompt', { section: () => () => undefined });
  ctx.provide('sessions', { list: () => [], get: () => undefined });
  ctx.provide('agents', { create: () => undefined, resume: () => undefined, list: () => [] });
  ctx.provide('skills', { register: () => () => undefined });
  return ctx;
}

describe('concept art host chain', () => {
  it('registers the consumer on apply and blocks while submission is allowed', async () => {
    expect(Object.keys(FIXTURE_CHAIN).sort()).toEqual(FIXTURES.cases.map((item) => item.id).sort());
    const home = createTempRoot('concept-art-apply-');
    const previous = process.env['DSH_HOME'];
    process.env['DSH_HOME'] = home;
    const ctx = stubContext();
    try {
      apply(ctx, { enabled: true, telemetry: false });
      const core = ctx.get('botharness') as BotHarnessCore;
      trackTestOwner(core.operationalDatabase);
      expect(core.conceptArt).toBeDefined();
      expect(core.sharedRoute).toBeDefined();
      core.ownership.claim({
        sessionId: 'fixture-ctx-1',
        botSlug: 'ada',
        rootRole: 'orchestrator',
        at: '2026-09-17T00:00:00.000Z',
      });
      for (const id of ['F_BLOCK_CONFLICT', 'F_EMPTY_RAW', 'F_REF_LOCAL_BUT_ROUTE_PROMPT_ONLY']) {
        const item = caseById(id);
        const verdict = await core.conceptArt.request({
          ...(item.input as object),
          sessionId: 'fixture-ctx-1',
          submit_prompt: 'a prompt that would otherwise be allowed',
          submit_allowed: true,
          input_fingerprint: id,
          route_idempotency_key: id,
          operation_id: id,
          context_version: 1,
        } as never);
        expect(verdict).toMatchObject({ status: 'BLOCKED', submitCalls: 0 });
        expect(verdict.reasons).toEqual(item.expected.reasons);
      }
      await core.runtime.close();
      core.externalMessaging.close();
    } finally {
      if (previous === undefined) delete process.env['DSH_HOME'];
      else process.env['DSH_HOME'] = previous;
      await ctx.fiber.dispose();
    }
  });

  it('keeps session project ids across a host restart without a second provider post', async () => {
    const home = createTempRoot('concept-art-host-');
    const ctx = new Context();
    const fiber = ctx.plugin(LocalCredentialProvider, {
      path: join(home, '.credentials.yaml'),
      watch: false,
    });
    await fiber.await();
    let posts = 0;
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes('/chat/completions') || url.includes('/v1/messages')) {
        const content =
          (JSON.parse(String(init?.body)) as { messages?: { content?: string }[] }).messages?.[0]
            ?.content ?? '';
        const raw = content.split('RAW_START\n')[1]?.split('\nRAW_END')[0] ?? '';
        const selected =
          content.split('SELECTED_STYLE:\n')[1]?.split('\nCLEARED_STYLES:')[0]?.trim() ?? '';
        const prompt = selected === '' || raw.includes(selected) ? raw : `${raw}\n${selected}`;
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: `RAW_START\n${raw}\nRAW_END\nPROMPT_START\n${prompt}\nPROMPT_END`,
                },
              },
            ],
          }),
          { status: 200 },
        );
      }
      posts += 1;
      const authorization = new Headers(init?.headers).get('authorization');
      expect(authorization).toBe('Bearer sk-host-test');
      return new Response(JSON.stringify({ data: [{ b64_json: PNG }] }), { status: 200 });
    };
    const open = () => {
      const core = createCore({
        dshHome: home,
        credentials: () => ctx.credentials,
        sharedRouteFetch: fetchImpl,
      });
      trackTestOwner(core.operationalDatabase);
      return core;
    };
    const core = open();
    await core.sharedRoute.saveInstance(
      {
        id: 'apiyi-image',
        gateway: 'apiyi',
        vendor: 'openai',
        capability: 'image',
        protocol: 'openai-images',
        baseUrl: 'https://api.apiyi.com/v1',
        models: ['fixture-image-model'],
        credentialRef: 'apiyi-account',
      },
      'sk-host-test',
    );
    core.sharedRoute.lock('concept-art', 'image', 'apiyi-image', 'fixture-image-model');
    await core.sharedRoute.saveInstance(
      {
        id: 'apiyi-chat',
        gateway: 'apiyi',
        vendor: 'openai',
        capability: 'chat',
        protocol: 'openai-chat',
        baseUrl: 'https://api.apiyi.com/v1',
        models: ['fixture-chat-model'],
        credentialRef: 'apiyi-account',
      },
      'sk-host-test',
    );
    core.sharedRoute.lock('chat', 'chat', 'apiyi-chat', 'fixture-chat-model');
    core.ownership.claim({
      sessionId: 'fixture-ctx-1',
      botSlug: 'ada',
      rootRole: 'orchestrator',
      at: '2026-09-17T00:00:00.000Z',
    });
    const none = caseById('F_STYLE_NONE');
    const opened = await core.conceptArt.request({
      ...(none.input as object),
      sessionId: 'fixture-ctx-1',
      submit_prompt: String(none.expected.submit_prompt),
      submit_allowed: true,
    } as never);
    expect(opened).toMatchObject({
      status: 'ALLOWED',
      projectId: 'session:fixture-ctx-1',
      submitCalls: 2,
    });
    expect(JSON.stringify(opened)).not.toContain('sk-host-test');
    expect(opened.task?.artifact).toMatchObject({ kind: 'base64', mediaVerified: false });
    expect(core.conceptArt.accept(opened.task!, 1)).toMatchObject({
      accept: true,
      deliverable: true,
      parsed: true,
      reason: 'BYTES_PARSED_NOT_A_RENDER',
      mediaVerified: false,
    });
    expect(posts).toBe(1);

    const switched = caseById('F_STYLE_SWITCH_SELECTED');
    const poisoned = await core.conceptArt.request({
      ...(switched.input as object),
      sessionId: 'fixture-ctx-1',
      submit_prompt: '平涂、粗轮廓、暖灰橙',
      submit_allowed: true,
      operation_id: 'op-t3-poison',
      route_idempotency_key: 'op-t3-poison',
      input_fingerprint: 'fp-t3-poison',
    } as never);
    expect(poisoned.status).toBe('ALLOWED');
    expect(poisoned.prompt).toContain('水彩');
    expect(poisoned.prompt).not.toContain('平涂');
    expect(posts).toBe(2);
    const clean = await core.conceptArt.request({
      ...(switched.input as object),
      sessionId: 'fixture-ctx-1',
      submit_prompt: String(switched.expected.submit_prompt),
      submit_allowed: true,
    } as never);
    expect(clean).toMatchObject({ status: 'ALLOWED', submitCalls: 2 });
    expect(clean.prompt).not.toContain('平涂');
    expect(clean.prompt).toContain('水彩、低饱和蓝绿');
    expect(posts).toBe(3);

    for (const id of ['F_BLOCK_CONFLICT', 'F_EMPTY_RAW', 'F_REF_LOCAL_BUT_ROUTE_PROMPT_ONLY']) {
      const item = caseById(id);
      const verdict = await core.conceptArt.request({
        ...(item.input as object),
        sessionId: 'fixture-ctx-1',
        submit_prompt: 'a prompt that would otherwise be allowed',
        submit_allowed: true,
        input_fingerprint: id,
        route_idempotency_key: id,
        operation_id: id,
        context_version: 1,
      } as never);
      expect(verdict).toMatchObject({ status: 'BLOCKED', submitCalls: 0 });
      expect(verdict.reasons).toEqual(item.expected.reasons);
    }
    expect(posts).toBe(3);

    const shield = await core.conceptArt.request({
      raw_requirement: '透明护罩加不透明底座，正面，不要多视图。',
      submit_prompt: 'A clear shield over an opaque base.',
      style: { state: 'none' },
      sessionId: 'fixture-ctx-1',
      context_version: 1,
      operation_id: 'op-shield-host',
      route_idempotency_key: 'op-shield-host',
      input_fingerprint: 'fp-shield-host',
      submit_allowed: true,
    });
    expect(shield.reasons).not.toContain('CONFLICT_transparent_vs_opaque');
    expect(shield.status).toBe('ALLOWED');
    expect(posts).toBe(4);

    const mismatch = await core.conceptArt.request({
      ...(none.input as object),
      sessionId: 'fixture-ctx-1',
      submit_prompt: 'DIFFERENT PROMPT BETA',
      submit_allowed: true,
      operation_id: 'op-t1-renamed',
    } as never);
    expect(mismatch).toMatchObject({
      status: 'BLOCKED',
      reasons: ['IDEMPOTENCY_KEY_PAYLOAD_MISMATCH'],
      submitCalls: 0,
    });
    expect(posts).toBe(4);

    const stopped = core.conceptArt.cancel(
      'fixture-ctx-1',
      String(none.input.route_idempotency_key),
    );
    expect(stopped.localStop).toBe(true);
    const late = await core.conceptArt.resume(
      'fixture-ctx-1',
      String(none.input.route_idempotency_key),
    );
    expect(core.conceptArt.accept(late, 1)).toMatchObject({
      accept: false,
      deliverable: false,
      reason: 'LOCAL_STOP',
      mediaVerified: false,
    });
    expect(posts).toBe(4);

    await core.runtime.close();
    core.externalMessaging.close();
    core.operationalDatabase.close();

    const restarted = open();
    const resumed = await restarted.conceptArt.resume(
      'fixture-ctx-1',
      String(none.input.route_idempotency_key),
    );
    expect(resumed.projectId).toBe('session:fixture-ctx-1');
    expect(resumed.localStop).toBe(true);
    const retry = await restarted.conceptArt.request({
      ...(caseById('F_RETRY_SAME_OPERATION').input as object),
      sessionId: 'fixture-ctx-1',
      submit_allowed: true,
    } as never);
    expect(retry.idempotencyKey).toBe(none.input.route_idempotency_key);
    expect(posts).toBe(4);
    restarted.ownership.claim({
      sessionId: 'fixture-ctx-2',
      botSlug: 'ada',
      rootRole: 'orchestrator',
      at: '2026-09-17T00:00:00.000Z',
    });
    await expect(
      restarted.conceptArt.resume('fixture-ctx-2', String(none.input.route_idempotency_key)),
    ).rejects.toMatchObject({ reason: 'wrong-project' });
    await restarted.runtime.close();
    restarted.externalMessaging.close();
    await fiber.dispose();
  });

  it('runs the remaining fixtures through the client bridge without delivering media', async () => {
    expect(NOT_RUN).toContain('host-accept-as-deliverable-image');
    expect(NOT_RUN).toContain('url-byte-download');
    const home = createTempRoot('concept-art-entry-');
    const ctx = new Context();
    const fiber = ctx.plugin(LocalCredentialProvider, {
      path: join(home, '.credentials.yaml'),
      watch: false,
    });
    await fiber.await();
    const fetchedUrls: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      fetchedUrls.push(url);
      if (url.includes('/chat/completions') || url.includes('/v1/messages')) {
        const content =
          (JSON.parse(String(init?.body)) as { messages?: { content?: string }[] }).messages?.[0]
            ?.content ?? '';
        if (content.includes('TASK:generate-style')) {
          const note = content.split('NOTE_START\n')[1]?.split('\nNOTE_END')[0] ?? '';
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: `NOTE_START\n${note}\nNOTE_END\nDEF_START\nflat color, thick outline\nDEF_END`,
                  },
                },
              ],
            }),
            { status: 200 },
          );
        }
        const raw = content.split('RAW_START\n')[1]?.split('\nRAW_END')[0] ?? '';
        const selected =
          content.split('SELECTED_STYLE:\n')[1]?.split('\nCLEARED_STYLES:')[0]?.trim() ?? '';
        const prompt = selected === '' || raw.includes(selected) ? raw : `${raw}\n${selected}`;
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: `RAW_START\n${raw}\nRAW_END\nPROMPT_START\n${prompt}\nPROMPT_END`,
                },
              },
            ],
          }),
          { status: 200 },
        );
      }
      const raw = String(init?.body ?? '');
      const body = raw.includes('BAD_B64')
        ? { data: [{ b64_json: '%%%not-base64%%%' }] }
        : raw.includes('BAD_JSON')
          ? { data: [{ b64_json: caseById('F_JSON_AS_B64').input.value_b64 }] }
          : raw.includes('BAD_TRUNC')
            ? { data: [{ b64_json: caseById('F_TRUNCATED_PNG_HEADER').input.value_b64 }] }
            : raw.includes('BAD_URL')
              ? { data: [{ url: caseById('F_FAKE_URL').input.provider_url }] }
              : raw.includes('BAD_EMPTY')
                ? { data: [{}] }
                : { data: [{ b64_json: PNG }] };
      return new Response(JSON.stringify(body), { status: 200 });
    };
    const core = createCore({
      dshHome: home,
      credentials: () => ctx.credentials,
      sharedRouteFetch: fetchImpl,
    });
    trackTestOwner(core.operationalDatabase);
    await core.sharedRoute.saveInstance(
      {
        id: 'apiyi-image',
        gateway: 'apiyi',
        vendor: 'openai',
        capability: 'image',
        protocol: 'openai-images',
        baseUrl: 'https://api.apiyi.com/v1',
        models: ['fixture-image-model'],
        credentialRef: 'apiyi-account',
      },
      'sk-host-test',
    );
    core.sharedRoute.lock('concept-art', 'image', 'apiyi-image', 'fixture-image-model');
    await core.sharedRoute.saveInstance(
      {
        id: 'apiyi-chat',
        gateway: 'apiyi',
        vendor: 'openai',
        capability: 'chat',
        protocol: 'openai-chat',
        baseUrl: 'https://api.apiyi.com/v1',
        models: ['fixture-chat-model'],
        credentialRef: 'apiyi-account',
      },
      'sk-host-test',
    );
    core.sharedRoute.lock('chat', 'chat', 'apiyi-chat', 'fixture-chat-model');
    core.ownership.claim({
      sessionId: 'fixture-ctx-1',
      botSlug: 'ada',
      rootRole: 'orchestrator',
      at: '2026-09-17T00:00:00.000Z',
    });
    const methods = createBridgeMethods({
      ...core,
      conceptArt: core.conceptArt,
      sharedRoute: core.sharedRoute,
    });
    const call = (async (endpoint, payload) => {
      if (endpoint !== 'conceptArt') throw new Error(endpoint);
      return methods.conceptArt(payload);
    }) as BridgeCall;
    const status = await callConceptArt(call, { action: 'status' });
    expect(status).toMatchObject({
      locked: true,
      model: 'fixture-image-model',
      credentialConfigured: true,
      groupCoverage: 'unverified',
      catalog: 'not-the-image-route',
      limitsConfigured: true,
      mediaDelivery: 'parsed-not-verified',
      referenceImages: 'blocked-prompt-only',
    });
    const cliStatus = await runConceptArtCommand(
      'concept-art',
      ['status'],
      async () => async (_method, payload) => {
        const result = await methods.conceptArt(payload);
        if (!result.ok) throw new Error(result.error.code);
        return result.value;
      },
      async () => '',
    );
    expect(cliStatus).toMatchObject({ limitsConfigured: true, catalog: 'not-the-image-route' });

    const ask = async (itemId: string, extra: Record<string, unknown> = {}) => {
      const item = caseById(itemId);
      return callConceptArt(call, {
        action: 'request',
        request: {
          ...item.input,
          sessionId: 'fixture-ctx-1',
          submit_prompt: String(
            item.expected.submit_prompt ?? item.input.submit_prompt ?? 'prompt',
          ),
          submit_allowed: true,
          context_version: item.input.context_version ?? 1,
          ...extra,
        },
      }) as Promise<Record<string, unknown>>;
    };
    expect(await ask('F_STYLE_SELECTED')).toMatchObject({ status: 'ALLOWED' });
    expect(String((await ask('F_STYLE_NONE_RAW_WATERCOLOR')).prompt)).toContain('水彩');
    expect(await ask('F_STYLE_DISABLED_SUCCESS')).toMatchObject({ status: 'ALLOWED' });
    const opened = await ask('F_STYLE_NONE');
    const fresh = await ask('F_EXPLICIT_NEW_GENERATION');
    expect(fresh.idempotencyKey).toBe('op-t1-2');
    const version = await ask('F_CONTEXT_VERSION_REJECT', {
      raw_requirement: '一张图',
      submit_prompt: 'same',
      style: { state: 'none' },
      input_fingerprint: 'fp-t1-v1',
      context_version: 2,
    });
    expect(version).toMatchObject({ status: 'BLOCKED', reasons: ['CONTEXT_VERSION_MISMATCH'] });
    expect(opened).toMatchObject({ status: 'ALLOWED', optimization: 'chat-model' });
    const missing = (await callConceptArt(call, {
      action: 'request',
      request: {
        ...caseById('F_MISSING_HOST_CONTEXT').input,
        sessionId: null,
        raw_requirement: '一张图',
        submit_prompt: 'a picture',
        submit_allowed: true,
        style: { state: 'none' },
        input_fingerprint: 'fp-missing',
        route_idempotency_key: 'op-missing',
        operation_id: 'op-missing',
        context_version: 1,
      },
    })) as { status: string; reasons: string[] };
    expect(missing).toMatchObject({
      status: 'INTEGRATION_BLOCKED',
      reasons: ['HOST_CONTEXT_CONTRACT_MISSING'],
    });
    expect(
      await callConceptArt(call, {
        action: 'accept',
        sessionId: 'fixture-ctx-1',
        idempotencyKey: 'op-t1-1',
        contextVersion: 1,
      }),
    ).toMatchObject({
      accept: true,
      deliverable: true,
      parsed: true,
      reason: 'BYTES_PARSED_NOT_A_RENDER',
      mediaVerified: false,
    });
    const stopped = await callConceptArt(call, {
      action: 'cancel',
      sessionId: 'fixture-ctx-1',
      idempotencyKey: 'op-t1-1',
    });
    expect(stopped).toMatchObject({ localStop: true });
    expect(
      await callConceptArt(call, {
        action: 'accept',
        sessionId: 'fixture-ctx-1',
        idempotencyKey: 'op-t1-1',
        contextVersion: 1,
      }),
    ).toMatchObject({ accept: false, reason: 'LOCAL_STOP', mediaVerified: false });

    for (const [marker, key, error] of [
      ['BAD_B64', 'bad-b64', 'invalid-payload'],
      ['BAD_JSON', 'bad-json', 'invalid-payload'],
      ['BAD_TRUNC', 'bad-trunc', 'invalid-payload'],
      ['BAD_URL', 'bad-url', 'invalid-payload'],
      ['BAD_EMPTY', 'bad-empty', 'empty-artifact'],
    ] as const) {
      const task = await core.sharedRoute.submit(
        'concept-art',
        'image',
        'session:fixture-ctx-1',
        key,
        marker,
      );
      expect(task.error).toBe(error);
    }
    expect(fetchedUrls.some((url) => url.includes('/chat/completions'))).toBe(true);
    expect(fetchedUrls.some((url) => url.endsWith('/images/generations'))).toBe(true);
    expect(fetchedUrls.every((url) => url.startsWith('https://api.apiyi.com/'))).toBe(true);
    const separated = await runConceptArtCommand(
      'concept-art',
      ['request'],
      async () => async (_method, payload) => {
        const result = await methods.conceptArt(payload);
        if (!result.ok) throw new Error(result.error.code);
        return result.value;
      },
      async () =>
        JSON.stringify({
          raw_requirement: '完全透明的护罩配不透光底座',
          submit_prompt: 'A transparent shield on an opaque base.',
          style: { state: 'none' },
          sessionId: 'fixture-ctx-1',
          context_version: 1,
          operation_id: 'op-shield-entry',
          route_idempotency_key: 'op-shield-entry',
          input_fingerprint: 'fp-shield-entry',
          submit_allowed: true,
        }),
    );
    expect(separated).toMatchObject({ status: 'ALLOWED' });
    const generated = await runConceptArtCommand(
      'concept-art',
      ['generate-style', 'fixture-ctx-1', 'harbor-flat'],
      async () => async (_method, payload) => {
        const result = await methods.conceptArt(payload);
        if (!result.ok) throw new Error(result.error.code);
        return result.value;
      },
      async () => '暖灰橙的平涂',
    );
    expect(generated).toMatchObject({
      status: 'ALLOWED',
      styleRef: 'harbor-flat',
      def: 'flat color, thick outline',
      optimization: 'chat-model',
    });
    const listed = await runConceptArtCommand(
      'concept-art',
      ['styles', 'fixture-ctx-1'],
      async () => async (_method, payload) => {
        const result = await methods.conceptArt(payload);
        if (!result.ok) throw new Error(result.error.code);
        return result.value;
      },
      async () => '',
    );
    expect(listed).toMatchObject({
      styles: [{ styleRef: 'harbor-flat', version: 'v1', def: 'flat color, thick outline' }],
    });
    const missingCancel = await methods.conceptArt({
      action: 'cancel',
      sessionId: 'missing-session',
      idempotencyKey: 'missing',
    });
    expect(missingCancel).toMatchObject({
      ok: true,
      value: {
        status: 'INTEGRATION_BLOCKED',
        reasons: ['HOST_CONTEXT_CONTRACT_MISSING'],
      },
    });
    await core.runtime.close();
    core.externalMessaging.close();
    await fiber.dispose();
  });
});
