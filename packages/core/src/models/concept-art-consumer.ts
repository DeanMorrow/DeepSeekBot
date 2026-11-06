import { createHash } from 'node:crypto';

import type { OperationalDatabaseModulePort } from '../database/owner.js';
import { inspectImage, ImageFormatError, type ImageMime } from '../media/image-format.js';
import type { SessionOwnership } from '../sessions/ownership.js';
import type { StoredArtifact } from './shared-route.js';

export interface ConceptArtLimits {
  maxEncodedBytes: number;
  maxDecodedBytes: number;
  maxPixels: number;
  allowlist: readonly ImageMime[];
}

export interface ConceptArtRequest {
  raw_requirement: string;
  submit_prompt?: string;
  style: {
    state: 'none' | 'selected' | 'disabled';
    styleRef?: string | null;
    version?: string | null;
  };
  style_history_audit_only?: readonly { styleRef?: string; def?: string }[];
  references?: readonly { id: string; status: string }[];
  sessionId: string | null;
  context_version: string | number;
  operation_id: string;
  route_idempotency_key: string;
  input_fingerprint: string;
  submit_allowed: boolean;
}

export interface ConceptArtVerdict {
  status: 'ALLOWED' | 'BLOCKED' | 'INTEGRATION_BLOCKED' | 'NEEDS_CLARIFICATION';
  reasons: string[];
  submitCalls: number;
  /** The consumer does not extract or optimize style. */
  optimization: 'not-performed';
  projectId?: string;
  idempotencyKey?: string;
  prompt?: string;
  task?: RouteTask;
}

type RouteTask = {
  status: string;
  localStop?: boolean;
  remoteTaskId: string | null;
  error: string | null;
  artifact: StoredArtifact | null;
  projectId: string;
  idempotencyKey: string;
};

type ConceptRoute = {
  submit(
    consumer: 'concept-art',
    capability: 'image',
    projectId: string,
    idempotencyKey: string,
    prompt: string,
  ): Promise<RouteTask>;
  resume(projectId: string, idempotencyKey: string): Promise<RouteTask>;
  cancel(projectId: string, idempotencyKey: string): RouteTask;
};

export function sessionProjectId(
  ownership: Pick<SessionOwnership, 'resolve'>,
  sessionId: string | null,
):
  | { projectId: string }
  | { status: 'INTEGRATION_BLOCKED'; reasons: ['HOST_CONTEXT_CONTRACT_MISSING'] } {
  if (sessionId === null || sessionId.trim() === '') {
    return { status: 'INTEGRATION_BLOCKED', reasons: ['HOST_CONTEXT_CONTRACT_MISSING'] };
  }
  const record = ownership.resolve(sessionId);
  if (record === undefined) {
    return { status: 'INTEGRATION_BLOCKED', reasons: ['HOST_CONTEXT_CONTRACT_MISSING'] };
  }
  return { projectId: `session:${record.sessionId}` };
}

/** Same-object contradiction, two different heads, or not enough structure to decide. */
export function transparencyMaterial(raw: string): 'conflict' | 'separate' | 'unclear' | 'none' {
  const transparent = raw.includes('完全透明');
  const opaque = raw.includes('不透光');
  if (!transparent || !opaque) return 'none';
  if (/完全透明但不透光的\S{1,32}/u.test(raw)) return 'conflict';
  const paired = raw.match(/完全透明的(\S{1,32}?)[，,]?配不透光的?(\S{1,32})/u);
  if (paired !== null) return paired[1] === paired[2] ? 'conflict' : 'separate';
  const head = (marker: string) =>
    [...raw.matchAll(new RegExp(`${marker}的([^，。；、配和与\\s]{1,32})`, 'gu'))].map(
      (match) => match[1] ?? '',
    );
  const clearHeads = head('完全透明');
  const opaqueHeads = head('不透光');
  if (clearHeads.length === 1 && opaqueHeads.length === 1) {
    return clearHeads[0] === opaqueHeads[0] ? 'conflict' : 'separate';
  }
  return 'unclear';
}

function canonicalFingerprint(request: ConceptArtRequest): string {
  const snapshot = {
    raw_requirement: request.raw_requirement,
    submit_prompt: request.submit_prompt ?? '',
    style: {
      state: request.style.state,
      styleRef: request.style.styleRef ?? null,
      version: request.style.version ?? null,
    },
    references: [...(request.references ?? [])]
      .map((item) => ({ id: item.id, status: item.status }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    operation_id: request.operation_id,
  };
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

function pngPixelCount(prefix: Buffer): number | undefined {
  if (prefix.length < 24) return undefined;
  if (prefix.subarray(0, 8).toString('latin1') !== '\x89PNG\r\n\x1a\n') return undefined;
  const view = new DataView(prefix.buffer, prefix.byteOffset, prefix.byteLength);
  if (view.getUint32(8) !== 13) return undefined;
  if (prefix.subarray(12, 16).toString('latin1') !== 'IHDR') return undefined;
  return view.getUint32(16) * view.getUint32(20);
}

function forbiddenLibraryText(request: ConceptArtRequest): string[] {
  return (request.style_history_audit_only ?? [])
    .map((item) => item.def?.trim() ?? '')
    .filter((def) => def !== '');
}

export function createConceptArtConsumer(input: {
  database: OperationalDatabaseModulePort;
  ownership: Pick<SessionOwnership, 'resolve'>;
  route: ConceptRoute;
  limits: ConceptArtLimits | null;
}) {
  let submitCalls = 0;
  const wrapped: ConceptRoute = {
    submit: async (consumer, capability, projectId, idempotencyKey, prompt) => {
      submitCalls += 1;
      return input.route.submit(consumer, capability, projectId, idempotencyKey, prompt);
    },
    resume: (projectId, idempotencyKey) => input.route.resume(projectId, idempotencyKey),
    cancel: (projectId, idempotencyKey) => input.route.cancel(projectId, idempotencyKey),
  };

  const readOp = (sessionId: string, key: string) =>
    input.database.read((db) => {
      return db
        .prepare(
          `SELECT operation_id, context_version, fingerprint, prompt
           FROM concept_art_operations WHERE session_id = ? AND idempotency_key = ?`,
        )
        .get(sessionId, key) as
        | { operation_id: string; context_version: string; fingerprint: string; prompt: string }
        | undefined;
    });

  const refused = (
    status: ConceptArtVerdict['status'],
    reasons: string[],
    submitCalls: number,
  ): ConceptArtVerdict => ({ status, reasons, submitCalls, optimization: 'not-performed' });

  return {
    submitCount: () => submitCalls,
    limitsConfigured: () => input.limits !== null,
    projectIdFor: (sessionId: string | null) => sessionProjectId(input.ownership, sessionId),
    async request(request: ConceptArtRequest): Promise<ConceptArtVerdict> {
      const before = submitCalls;
      const reasons: string[] = [];
      const material = transparencyMaterial(request.raw_requirement);
      if (request.raw_requirement.trim() === '') reasons.push('MISSING_RAW_REQUIREMENT');
      if (material === 'conflict') reasons.push('CONFLICT_transparent_vs_opaque');
      if (material === 'unclear') reasons.push('CONFLICT_NEEDS_CLARIFICATION');
      for (const reference of request.references ?? []) {
        if (reference.status === 'missing') reasons.push(`MISSING_REFERENCE_${reference.id}`);
        else if (reference.status === 'present_local' || reference.status === 'ready')
          reasons.push('REFERENCE_REQUIRED_BUT_ROUTE_PROMPT_ONLY');
        else reasons.push(`REFERENCE_STATUS_UNKNOWN_${reference.status}`);
      }
      const prompt = request.submit_prompt ?? '';
      for (const def of forbiddenLibraryText(request)) {
        if (prompt.includes(def)) reasons.push('CLEARED_STYLE_IN_PROMPT');
      }
      if (
        request.submit_allowed &&
        reasons.length === 1 &&
        reasons[0] === 'CONFLICT_NEEDS_CLARIFICATION'
      ) {
        return refused('NEEDS_CLARIFICATION', reasons, 0);
      }
      if (reasons.length > 0 || request.submit_allowed === false) {
        return refused('BLOCKED', reasons, submitCalls - before);
      }
      const bound = sessionProjectId(input.ownership, request.sessionId);
      if ('status' in bound) return { ...bound, submitCalls: 0, optimization: 'not-performed' };
      const fingerprint = canonicalFingerprint(request);
      const existing = readOp(bound.projectId, request.route_idempotency_key);
      if (existing !== undefined && existing.context_version !== String(request.context_version)) {
        return refused('BLOCKED', ['CONTEXT_VERSION_MISMATCH'], 0);
      }
      if (
        existing !== undefined &&
        (existing.fingerprint !== fingerprint ||
          existing.prompt !== prompt ||
          existing.operation_id !== request.operation_id)
      ) {
        return refused('BLOCKED', ['IDEMPOTENCY_KEY_PAYLOAD_MISMATCH'], 0);
      }
      if (existing === undefined) {
        input.database.transaction(
          (db) =>
            db
              .prepare(
                `INSERT INTO concept_art_operations
                 (session_id, idempotency_key, operation_id, context_version, fingerprint, prompt)
                 VALUES (?, ?, ?, ?, ?, ?)`,
              )
              .run(
                bound.projectId,
                request.route_idempotency_key,
                request.operation_id,
                String(request.context_version),
                fingerprint,
                prompt,
              ),
          ['concept-art'],
        );
      }
      const task = await wrapped.submit(
        'concept-art',
        'image',
        bound.projectId,
        request.route_idempotency_key,
        existing?.prompt ?? prompt,
      );
      return {
        status: 'ALLOWED',
        reasons: [],
        submitCalls: submitCalls - before,
        optimization: 'not-performed',
        projectId: bound.projectId,
        idempotencyKey: request.route_idempotency_key,
        prompt: existing?.prompt ?? prompt,
        task,
      };
    },
    resume(sessionId: string, idempotencyKey: string) {
      const bound = sessionProjectId(input.ownership, sessionId);
      if ('status' in bound) return Promise.reject(Object.assign(new Error(bound.status), bound));
      return wrapped.resume(bound.projectId, idempotencyKey);
    },
    cancel(sessionId: string, idempotencyKey: string) {
      const bound = sessionProjectId(input.ownership, sessionId);
      if ('status' in bound) throw Object.assign(new Error(bound.status), bound);
      return wrapped.cancel(bound.projectId, idempotencyKey);
    },
    accept(task: RouteTask, contextVersion: string | number) {
      const limits = input.limits;
      const verdict = {
        accept: false as const,
        deliverable: false as const,
        parsed: false,
        staleProviderError: task.error,
        mediaVerified: false as const,
      };
      const bound = readOp(task.projectId, task.idempotencyKey);
      if (bound === undefined) return { ...verdict, reason: 'FINGERPRINT_MISMATCH' };
      if (String(contextVersion) !== bound.context_version) {
        return { ...verdict, reason: 'CONTEXT_VERSION_MISMATCH' };
      }
      if (task.localStop === true) return { ...verdict, reason: 'LOCAL_STOP' };
      if (limits === null) return { ...verdict, reason: 'LIMITS_UNCONFIGURED' };
      if (task.status !== 'completed' || task.artifact === null)
        return { ...verdict, reason: 'NOT_COMPLETED' };
      if (task.artifact.kind === 'untrusted-url') return { ...verdict, reason: 'UNTRUSTED_URL' };
      if (task.artifact.kind !== 'base64' || task.artifact.value === undefined) {
        return { ...verdict, reason: 'NOT_IMAGE' };
      }
      if (task.artifact.value.length > limits.maxEncodedBytes)
        return { ...verdict, reason: 'ENCODED_LIMIT' };
      const estimated = Math.floor((task.artifact.value.length * 3) / 4);
      if (estimated > limits.maxDecodedBytes) return { ...verdict, reason: 'DECODED_LIMIT' };
      const prefixChars = Math.min(task.artifact.value.length, 48);
      const aligned = prefixChars - (prefixChars % 4);
      if (aligned >= 32) {
        const pixels = pngPixelCount(Buffer.from(task.artifact.value.slice(0, aligned), 'base64'));
        if (pixels !== undefined && pixels > limits.maxPixels)
          return { ...verdict, reason: 'PIXEL_LIMIT' };
      }
      if (task.artifact.mediaVerified !== false)
        return { ...verdict, reason: 'ROUTE_VERIFIED_CLAIM' };
      let bytes: Buffer;
      try {
        bytes = Buffer.from(task.artifact.value, 'base64');
      } catch {
        return { ...verdict, reason: 'syntax_or_decode' };
      }
      if (bytes.toString('base64') !== task.artifact.value)
        return { ...verdict, reason: 'syntax_or_decode' };
      const asText = bytes.toString('utf8');
      if (asText.startsWith('{') || asText.startsWith('[')) {
        return { ...verdict, reason: 'decoded_bytes_are_json_not_complete_image' };
      }
      try {
        const inspected = inspectImage(bytes);
        if (!limits.allowlist.includes(inspected.mime))
          return { ...verdict, reason: 'FORMAT_NOT_ALLOWED' };
        if (inspected.width * inspected.height > limits.maxPixels)
          return { ...verdict, reason: 'PIXEL_LIMIT' };
      } catch (error) {
        if (error instanceof ImageFormatError && error.status === 'too-large') {
          return { ...verdict, reason: 'PIXEL_LIMIT' };
        }
        return { ...verdict, reason: 'truncated_or_incomplete_image_bytes' };
      }
      return {
        ...verdict,
        parsed: true,
        reason: 'BYTES_PARSED_NOT_A_RENDER',
      };
    },
  };
}
