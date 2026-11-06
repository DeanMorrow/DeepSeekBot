import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Context } from '@deepseek-ai/cordis';
import LocalCredentialProvider from '@deepseek-ai/dsh-credentials-local';
import { describe, expect, it } from 'vitest';

import { apply, createCore, type BotHarnessCore } from '../src/plugin.js';
import { createTempRoot, trackTestOwner } from './helpers.js';

const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const FIXTURES = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures/concept-art-fixtures.json'), 'utf8'),
) as {
  cases: Array<{ id: string; input: Record<string, unknown>; expected: Record<string, unknown> }>;
};

/** Which chain actually executes each fixture. One consumer test is not 21 host behaviors. */
const FIXTURE_CHAIN: Record<string, 'host' | 'consumer-only'> = {
  F_STYLE_NONE: 'host',
  F_STYLE_SELECTED: 'consumer-only',
  F_STYLE_SWITCH_SELECTED: 'host',
  F_STYLE_NONE_RAW_WATERCOLOR: 'consumer-only',
  F_STYLE_DISABLED_SUCCESS: 'consumer-only',
  F_BLOCK_CONFLICT: 'host',
  F_EMPTY_RAW: 'host',
  F_MISSING_HOST_CONTEXT: 'consumer-only',
  F_RETRY_SAME_OPERATION: 'host',
  F_EXPLICIT_NEW_GENERATION: 'consumer-only',
  F_IDEM_DIFF_PAYLOAD_REJECT: 'host',
  F_CONTEXT_VERSION_REJECT: 'consumer-only',
  F_CROSS_PROJECT: 'host',
  F_CANCEL_LATE: 'host',
  F_BAD_BASE64: 'consumer-only',
  F_JSON_AS_B64: 'consumer-only',
  F_TRUNCATED_PNG_HEADER: 'consumer-only',
  F_FAKE_URL: 'consumer-only',
  F_EMPTY_ARTIFACT: 'consumer-only',
  F_ERROR_RESIDUAL_ACCEPT_GATE: 'consumer-only',
  F_REF_LOCAL_BUT_ROUTE_PROMPT_ONLY: 'host',
};

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
    const fetchImpl: typeof fetch = async (_input, init) => {
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
      submitCalls: 1,
    });
    expect(JSON.stringify(opened)).not.toContain('sk-host-test');
    expect(opened.task?.artifact).toMatchObject({ kind: 'base64', mediaVerified: false });
    expect(
      core.conceptArt.accept(opened.task!, String(none.input.input_fingerprint)),
    ).toMatchObject({
      accept: false,
      reason: 'LIMITS_UNCONFIGURED',
      mediaVerified: false,
    });
    expect(posts).toBe(1);

    const switched = caseById('F_STYLE_SWITCH_SELECTED');
    const poisoned = await core.conceptArt.request({
      ...(switched.input as object),
      sessionId: 'fixture-ctx-1',
      submit_prompt: '平涂、粗轮廓、暖灰橙',
      submit_allowed: true,
    } as never);
    expect(poisoned).toMatchObject({ status: 'BLOCKED', submitCalls: 0 });
    expect(poisoned.reasons).toContain('CLEARED_STYLE_IN_PROMPT');
    const clean = await core.conceptArt.request({
      ...(switched.input as object),
      sessionId: 'fixture-ctx-1',
      submit_prompt: String(switched.expected.submit_prompt),
      submit_allowed: true,
    } as never);
    expect(clean).toMatchObject({ status: 'ALLOWED', submitCalls: 1 });
    expect(clean.prompt).not.toContain('平涂');
    expect(posts).toBe(2);

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
    expect(posts).toBe(2);

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
    expect(posts).toBe(3);

    const mismatch = await core.conceptArt.request({
      ...(none.input as object),
      sessionId: 'fixture-ctx-1',
      submit_prompt: 'DIFFERENT PROMPT BETA',
      submit_allowed: true,
      input_fingerprint: 'fp-t1-v2-diff',
    } as never);
    expect(mismatch).toMatchObject({
      status: 'BLOCKED',
      reasons: ['IDEMPOTENCY_KEY_PAYLOAD_MISMATCH'],
      submitCalls: 0,
    });
    expect(posts).toBe(3);

    const stopped = core.conceptArt.cancel(
      'fixture-ctx-1',
      String(none.input.route_idempotency_key),
    );
    expect(stopped.localStop).toBe(true);
    const late = await core.conceptArt.resume(
      'fixture-ctx-1',
      String(none.input.route_idempotency_key),
    );
    expect(core.conceptArt.accept(late, String(none.input.input_fingerprint))).toMatchObject({
      accept: false,
      reason: 'LOCAL_STOP',
      mediaVerified: false,
    });
    expect(posts).toBe(3);

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
    expect(posts).toBe(3);
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
});
