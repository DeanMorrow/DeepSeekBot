import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { attachOperationalModule, mountOperationalDatabase } from '../src/database/owner.js';
import { BOT_HARNESS_SCHEMA_PLAN } from '../src/database/schema-plan.js';
import { createConceptArtConsumer } from '../src/models/concept-art-consumer.js';
import { createMemorySecretStore, createSharedModelRoute } from '../src/models/shared-route.js';
import { createSessionOwnership } from '../src/sessions/ownership.js';
import { createTempRoot, FIXED_NOW, trackTestOwner } from './helpers.js';

const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const FIXTURES = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures/concept-art-fixtures.json'), 'utf8'),
) as {
  cases: Array<{ id: string; input: Record<string, unknown>; expected: Record<string, unknown> }>;
};
const TEST_LIMITS = {
  maxEncodedBytes: 2_000_000,
  maxDecodedBytes: 2_000_000,
  maxPixels: 4_000_000,
  allowlist: ['image/png', 'image/jpeg', 'image/webp'] as const,
};

function harness() {
  const home = createTempRoot('concept-art-');
  mkdirSync(home, { recursive: true });
  const owner = trackTestOwner(
    mountOperationalDatabase({
      dshHome: home,
      schemaPlan: BOT_HARNESS_SCHEMA_PLAN,
      now: FIXED_NOW,
    }),
  );
  const database = attachOperationalModule(owner, 'concept-art');
  const ownership = createSessionOwnership(attachOperationalModule(owner, 'session-ownership'));
  ownership.claim({
    sessionId: 'fixture-ctx-1',
    botSlug: 'ada',
    rootRole: 'orchestrator',
    at: FIXED_NOW().toISOString(),
  });
  ownership.claim({
    sessionId: 'fixture-ctx-2',
    botSlug: 'ada',
    rootRole: 'orchestrator',
    at: FIXED_NOW().toISOString(),
  });
  let posts = 0;
  const scripts: unknown[] = [];
  const route = createSharedModelRoute(database, createMemorySecretStore(), {
    now: () => FIXED_NOW().toISOString(),
    fetch: async () => {
      posts += 1;
      const body = scripts.length > 0 ? scripts.shift() : { data: [{ b64_json: PNG }] };
      return new Response(JSON.stringify(body), { status: 200 });
    },
  });
  return { database, ownership, route, posts: () => posts, scripts };
}

const caseById = (id: string) => FIXTURES.cases.find((item) => item.id === id)!;

describe('concept art consumer', () => {
  it('runs every fixture against the shared route without copying a key', async () => {
    expect(FIXTURES.cases).toHaveLength(21);
    const driven = new Set<string>();
    const env = harness();
    await env.route.saveInstance(
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
      'sk-test-secret',
    );
    env.route.lock('concept-art', 'image', 'apiyi-image', 'fixture-image-model');
    const consumer = createConceptArtConsumer({
      database: env.database,
      ownership: env.ownership,
      route: env.route,
      limits: TEST_LIMITS,
    });
    const none = caseById('F_STYLE_NONE');
    driven.add(none.id);
    const opened = await consumer.request({
      ...(none.input as object),
      sessionId: 'fixture-ctx-1',
      submit_prompt: String(none.expected.submit_prompt),
      submit_allowed: true,
    } as never);
    expect(opened.status).toBe('ALLOWED');
    expect(opened.prompt).toBe(none.expected.submit_prompt);
    expect(opened.projectId).toBe('session:fixture-ctx-1');
    expect(opened.task?.projectId).toBe('session:fixture-ctx-1');
    expect(opened.task?.idempotencyKey).toBe(none.input.route_idempotency_key);
    expect(consumer.accept(opened.task!, 1)).toMatchObject({
      accept: false,
      deliverable: false,
      parsed: true,
      reason: 'BYTES_PARSED_NOT_A_RENDER',
      mediaVerified: false,
    });
    const unconfigured = createConceptArtConsumer({
      database: env.database,
      ownership: env.ownership,
      route: env.route,
      limits: null,
    });
    expect(unconfigured.accept(opened.task!, 1)).toMatchObject({
      accept: false,
      reason: 'LIMITS_UNCONFIGURED',
      mediaVerified: false,
    });
    expect(JSON.stringify(opened)).not.toContain('sk-test-secret');

    const selected = caseById('F_STYLE_SELECTED');
    driven.add(selected.id);
    expect(
      (
        await consumer.request({
          ...(selected.input as object),
          sessionId: 'fixture-ctx-1',
          submit_prompt: String(selected.expected.submit_prompt),
          submit_allowed: true,
        } as never)
      ).status,
    ).toBe('ALLOWED');

    const switched = caseById('F_STYLE_SWITCH_SELECTED');
    driven.add(switched.id);
    const poisoned = await consumer.request({
      ...(switched.input as object),
      sessionId: 'fixture-ctx-1',
      submit_prompt: '平涂、粗轮廓、暖灰橙',
      submit_allowed: true,
    } as never);
    expect(poisoned).toMatchObject({ status: 'BLOCKED', submitCalls: 0 });
    expect(
      (
        await consumer.request({
          ...(switched.input as object),
          sessionId: 'fixture-ctx-1',
          submit_prompt: String(switched.expected.submit_prompt),
          submit_allowed: true,
        } as never)
      ).prompt,
    ).not.toContain('平涂');

    const watercolor = caseById('F_STYLE_NONE_RAW_WATERCOLOR');
    driven.add(watercolor.id);
    expect(
      (
        await consumer.request({
          ...(watercolor.input as object),
          sessionId: 'fixture-ctx-1',
          submit_prompt: String(watercolor.expected.submit_prompt),
          submit_allowed: true,
        } as never)
      ).prompt,
    ).toContain('watercolor');

    const disabled = caseById('F_STYLE_DISABLED_SUCCESS');
    driven.add(disabled.id);
    expect(
      (
        await consumer.request({
          ...(disabled.input as object),
          sessionId: 'fixture-ctx-1',
          submit_prompt: String(disabled.expected.submit_prompt),
          submit_allowed: true,
        } as never)
      ).status,
    ).toBe('ALLOWED');

    for (const id of ['F_BLOCK_CONFLICT', 'F_EMPTY_RAW', 'F_REF_LOCAL_BUT_ROUTE_PROMPT_ONLY']) {
      const item = caseById(id);
      driven.add(item.id);
      const blockedByFlag = await consumer.request({
        ...(item.input as object),
        sessionId: 'fixture-ctx-1',
        submit_prompt: '',
        submit_allowed: false,
        input_fingerprint: id,
        route_idempotency_key: id,
        operation_id: id,
        context_version: 1,
      } as never);
      expect(blockedByFlag.submitCalls).toBe(0);
      expect(blockedByFlag.reasons).toEqual(
        expect.arrayContaining(item.expected.reasons as string[]),
      );
      const blockedByReason = await consumer.request({
        ...(item.input as object),
        sessionId: 'fixture-ctx-1',
        submit_prompt: 'a prompt that would otherwise be allowed',
        submit_allowed: true,
        input_fingerprint: `${id}-allowed`,
        route_idempotency_key: `${id}-allowed`,
        operation_id: `${id}-allowed`,
        context_version: 1,
      } as never);
      expect(blockedByReason).toMatchObject({ status: 'BLOCKED', submitCalls: 0 });
      expect(blockedByReason.reasons).toEqual(item.expected.reasons);
    }
    const ready = await consumer.request({
      raw_requirement: '保持参考图',
      submit_prompt: 'keep the reference',
      style: { state: 'none' },
      references: [{ id: 'R9', status: 'ready' }],
      sessionId: 'fixture-ctx-1',
      context_version: 1,
      operation_id: 'op-ready',
      route_idempotency_key: 'op-ready',
      input_fingerprint: 'fp-ready',
      submit_allowed: true,
    });
    expect(ready).toMatchObject({
      status: 'BLOCKED',
      reasons: ['REFERENCE_REQUIRED_BUT_ROUTE_PROMPT_ONLY'],
      submitCalls: 0,
    });
    const unknownRef = await consumer.request({
      raw_requirement: '保持参考图',
      submit_prompt: 'keep the reference',
      style: { state: 'none' },
      references: [{ id: 'R10', status: 'sideways' }],
      sessionId: 'fixture-ctx-1',
      context_version: 1,
      operation_id: 'op-unknown-ref',
      route_idempotency_key: 'op-unknown-ref',
      input_fingerprint: 'fp-unknown-ref',
      submit_allowed: true,
    });
    expect(unknownRef).toMatchObject({ status: 'BLOCKED', submitCalls: 0 });
    expect(unknownRef.reasons).toContain('REFERENCE_STATUS_UNKNOWN_sideways');
    const shield = await consumer.request({
      raw_requirement: '透明护罩加不透明底座，正面，不要多视图。',
      submit_prompt: 'A clear shield over an opaque base, front view, no multi-view.',
      style: { state: 'none' },
      sessionId: 'fixture-ctx-1',
      context_version: 1,
      operation_id: 'op-shield-1',
      route_idempotency_key: 'op-shield-1',
      input_fingerprint: 'fp-shield',
      submit_allowed: true,
    });
    expect(shield.reasons).not.toContain('CONFLICT_transparent_vs_opaque');
    expect(shield).toMatchObject({ status: 'ALLOWED', submitCalls: 1 });
    const separated = await consumer.request({
      raw_requirement: '完全透明的护罩，配不透光的底座',
      submit_prompt: 'A fully transparent shield with an opaque base.',
      style: { state: 'none' },
      sessionId: 'fixture-ctx-1',
      context_version: 1,
      operation_id: 'op-shield-2',
      route_idempotency_key: 'op-shield-2',
      input_fingerprint: 'fp-shield-2',
      submit_allowed: true,
    });
    expect(separated).toMatchObject({ status: 'ALLOWED', submitCalls: 1 });
    expect(separated.reasons).not.toContain('CONFLICT_transparent_vs_opaque');
    const separatedTight = await consumer.request({
      raw_requirement: '完全透明的护罩配不透光底座',
      submit_prompt: 'A transparent shield fitted to an opaque base.',
      style: { state: 'none' },
      sessionId: 'fixture-ctx-1',
      context_version: 1,
      operation_id: 'op-shield-3',
      route_idempotency_key: 'op-shield-3',
      input_fingerprint: 'fp-shield-3',
      submit_allowed: true,
    });
    expect(separatedTight).toMatchObject({
      status: 'ALLOWED',
      submitCalls: 1,
      optimization: 'not-performed',
    });
    const unclear = await consumer.request({
      raw_requirement: '既要完全透明，也要不透光',
      submit_prompt: 'both',
      style: { state: 'none' },
      sessionId: 'fixture-ctx-1',
      context_version: 1,
      operation_id: 'op-unclear-1',
      route_idempotency_key: 'op-unclear-1',
      input_fingerprint: 'fp-unclear',
      submit_allowed: true,
    });
    expect(unclear).toMatchObject({
      status: 'NEEDS_CLARIFICATION',
      reasons: ['CONFLICT_NEEDS_CLARIFICATION'],
      submitCalls: 0,
    });

    driven.add('F_MISSING_HOST_CONTEXT');
    const missing = await consumer.request({
      ...(caseById('F_MISSING_HOST_CONTEXT').input as object),
      sessionId: null,
      raw_requirement: '一张图',
      submit_prompt: 'a picture',
      submit_allowed: true,
      style: { state: 'none' },
      input_fingerprint: 'fp-missing',
      route_idempotency_key: 'op-missing',
      operation_id: 'op-missing',
      context_version: 1,
    } as never);
    expect(missing).toMatchObject({
      status: 'INTEGRATION_BLOCKED',
      reasons: ['HOST_CONTEXT_CONTRACT_MISSING'],
      submitCalls: 0,
    });

    const retry = caseById('F_RETRY_SAME_OPERATION');
    driven.add(retry.id);
    const again = await consumer.request({
      ...(retry.input as object),
      sessionId: 'fixture-ctx-1',
      submit_allowed: true,
    } as never);
    expect(again.idempotencyKey).toBe('op-t1-1');
    expect(env.posts()).toBe(8);

    const fresh = caseById('F_EXPLICIT_NEW_GENERATION');
    driven.add(fresh.id);
    expect(
      (
        await consumer.request({
          ...(fresh.input as object),
          sessionId: 'fixture-ctx-1',
          submit_allowed: true,
        } as never)
      ).idempotencyKey,
    ).toBe('op-t1-2');
    expect(env.posts()).toBe(9);

    const idem = caseById('F_IDEM_DIFF_PAYLOAD_REJECT');
    driven.add(idem.id);
    const mismatch = await consumer.request({
      raw_requirement: '一张图',
      submit_prompt: String(idem.input.new_submit_prompt),
      style: { state: 'none' },
      sessionId: 'fixture-ctx-1',
      context_version: Number(idem.input.context_version),
      operation_id: 'op-t1-renamed',
      route_idempotency_key: String(idem.input.route_idempotency_key),
      input_fingerprint: String(none.input.input_fingerprint),
      submit_allowed: true,
    });
    expect(mismatch).toMatchObject({
      status: 'BLOCKED',
      reasons: ['IDEMPOTENCY_KEY_PAYLOAD_MISMATCH'],
      submitCalls: 0,
    });

    const versionCase = caseById('F_CONTEXT_VERSION_REJECT');
    driven.add(versionCase.id);
    const version = await consumer.request({
      raw_requirement: '一张图',
      submit_prompt: 'same',
      style: { state: 'none' },
      sessionId: String(versionCase.input.host_context_id),
      context_version: Number(versionCase.input.current_context_version),
      operation_id: String(versionCase.input.operation_id),
      route_idempotency_key: String(versionCase.input.route_idempotency_key),
      input_fingerprint: String(none.input.input_fingerprint),
      submit_allowed: true,
    });
    expect(version).toMatchObject({
      status: 'BLOCKED',
      reasons: ['CONTEXT_VERSION_MISMATCH'],
      submitCalls: 0,
    });

    const cross = caseById('F_CROSS_PROJECT');
    driven.add(cross.id);
    await expect(
      consumer.resume('fixture-ctx-2', String(none.input.route_idempotency_key)),
    ).rejects.toMatchObject({ reason: 'wrong-project' });
    expect(cross.input.project_first).not.toBe(cross.input.project_second);

    const cancelLate = caseById('F_CANCEL_LATE');
    driven.add(cancelLate.id);
    const stopped = consumer.cancel('fixture-ctx-1', 'op-t1-1');
    expect(stopped.localStop).toBe(true);
    const late = await consumer.resume('fixture-ctx-1', 'op-t1-1');
    expect(consumer.accept(late, 1)).toMatchObject({
      accept: false,
      reason: 'LOCAL_STOP',
    });
    expect(cancelLate.expected.accept_as_image).toBe(false);
    expect(env.posts()).toBe(9);

    const badB64 = caseById('F_BAD_BASE64');
    const jsonB64 = caseById('F_JSON_AS_B64');
    const truncated = caseById('F_TRUNCATED_PNG_HEADER');
    const fakeUrl = caseById('F_FAKE_URL');
    const emptyArtifact = caseById('F_EMPTY_ARTIFACT');
    const residual = caseById('F_ERROR_RESIDUAL_ACCEPT_GATE');
    for (const item of [badB64, jsonB64, truncated, fakeUrl, emptyArtifact, residual])
      driven.add(item.id);
    env.scripts.push(
      { data: [{ b64_json: badB64.input.provider_b64_json }] },
      { data: [{ b64_json: jsonB64.input.value_b64 }] },
      { data: [{ b64_json: truncated.input.value_b64 }] },
      { data: [{ url: fakeUrl.input.provider_url }] },
      { data: [{}] },
    );
    expect(badB64.expected.route_observed_prior).toMatchObject({
      status: 'completed',
      kind: 'base64',
    });
    expect(fakeUrl.expected.route_observed_prior).toMatchObject({
      status: 'completed',
      kind: 'untrusted-url',
    });
    const bad = await env.route.submit(
      'concept-art',
      'image',
      'session:fixture-ctx-1',
      'bad-b64',
      'prompt',
    );
    expect(bad).toMatchObject({ status: 'failed', error: 'invalid-payload' });
    expect(
      (
        await env.route.submit(
          'concept-art',
          'image',
          'session:fixture-ctx-1',
          'bad-json',
          'prompt',
        )
      ).error,
    ).toBe('invalid-payload');
    expect(
      (
        await env.route.submit(
          'concept-art',
          'image',
          'session:fixture-ctx-1',
          'bad-trunc',
          'prompt',
        )
      ).error,
    ).toBe('invalid-payload');
    expect(
      (await env.route.submit('concept-art', 'image', 'session:fixture-ctx-1', 'bad-url', 'prompt'))
        .error,
    ).toBe('invalid-payload');
    expect(
      (
        await env.route.submit(
          'concept-art',
          'image',
          'session:fixture-ctx-1',
          'bad-empty',
          'prompt',
        )
      ).error,
    ).toBe('empty-artifact');
    expect(consumer.accept(bad, 1).accept).toBe(false);
    const boundMedia = {
      projectId: 'session:fixture-ctx-1',
      idempotencyKey: 'op-t1-1',
      remoteTaskId: null,
      error: null,
      localStop: false,
      status: 'completed' as const,
    };
    expect(
      consumer.accept(
        {
          ...boundMedia,
          artifact: {
            kind: 'base64',
            mediaVerified: false,
            value: String(badB64.input.provider_b64_json),
          },
        },
        1,
      ).reason,
    ).toBe(badB64.expected.fail_stage);
    expect(
      consumer.accept(
        {
          ...boundMedia,
          artifact: {
            kind: 'base64',
            mediaVerified: false,
            value: String(jsonB64.input.value_b64),
          },
        },
        1,
      ).reason,
    ).toBe(jsonB64.expected.reason);
    expect(
      consumer.accept(
        {
          ...boundMedia,
          artifact: {
            kind: 'base64',
            mediaVerified: false,
            value: String(truncated.input.value_b64),
          },
        },
        1,
      ).reason,
    ).toBe(truncated.expected.reason);
    expect(
      consumer.accept(
        {
          ...boundMedia,
          artifact: {
            kind: 'untrusted-url',
            mediaVerified: false,
            url: 'https://untrusted.example/x',
          },
        },
        1,
      ).reason,
    ).toBe('UNTRUSTED_URL');
    expect(
      consumer.accept(
        { ...boundMedia, status: 'failed', error: 'empty-artifact', artifact: null },
        1,
      ).accept,
    ).toBe(false);
    expect(
      consumer.accept(
        {
          ...boundMedia,
          error: String(residual.input.error),
          localStop: false,
          artifact: {
            kind: 'untrusted-url',
            mediaVerified: false,
            url: 'https://untrusted.example/x',
          },
        },
        1,
      ),
    ).toMatchObject({
      accept: false,
      reason: 'UNTRUSTED_URL',
      staleProviderError: residual.input.error,
    });
    expect(consumer.accept(opened.task!, 99).reason).toBe('CONTEXT_VERSION_MISMATCH');
    const huge = Buffer.alloc(24);
    huge.write('\x89PNG\r\n\x1a\n', 0, 'latin1');
    huge.writeUInt32BE(13, 8);
    huge.write('IHDR', 12, 'latin1');
    huge.writeUInt32BE(100_000, 16);
    huge.writeUInt32BE(100_000, 20);
    expect(
      consumer.accept(
        {
          ...boundMedia,
          artifact: { kind: 'base64', mediaVerified: false, value: huge.toString('base64') },
        },
        1,
      ),
    ).toMatchObject({ accept: false, deliverable: false, reason: 'PIXEL_LIMIT' });
    expect(driven).toEqual(new Set(FIXTURES.cases.map((item) => item.id)));
  });
});
