import type { OperationalDatabaseModulePort } from '../database/owner.js';
// No concept-art plugin file exists in this checkout. Host apply() does not call this module.
import { inspectImage, type ImageMime } from '../media/image-format.js';
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
  status: 'ALLOWED' | 'BLOCKED' | 'INTEGRATION_BLOCKED';
  reasons: string[];
  submitCalls: number;
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

  return {
    submitCount: () => submitCalls,
    projectIdFor: (sessionId: string | null) => sessionProjectId(input.ownership, sessionId),
    async request(request: ConceptArtRequest): Promise<ConceptArtVerdict> {
      const before = submitCalls;
      const reasons: string[] = [];
      if (request.raw_requirement.trim() === '') reasons.push('MISSING_RAW_REQUIREMENT');
      if (
        request.raw_requirement.includes('完全透明') &&
        request.raw_requirement.includes('不透光')
      ) {
        reasons.push('CONFLICT_transparent_vs_opaque');
      }
      for (const reference of request.references ?? []) {
        if (reference.status === 'missing') reasons.push(`MISSING_REFERENCE_${reference.id}`);
        if (reference.status === 'present_local')
          reasons.push('REFERENCE_REQUIRED_BUT_ROUTE_PROMPT_ONLY');
      }
      const prompt = request.submit_prompt ?? '';
      for (const def of forbiddenLibraryText(request)) {
        if (prompt.includes(def)) reasons.push('CLEARED_STYLE_IN_PROMPT');
      }
      if (reasons.length > 0 || request.submit_allowed === false) {
        return { status: 'BLOCKED', reasons, submitCalls: submitCalls - before };
      }
      const bound = sessionProjectId(input.ownership, request.sessionId);
      if ('status' in bound) return { ...bound, submitCalls: 0 };
      const existing = readOp(bound.projectId, request.route_idempotency_key);
      if (existing !== undefined && existing.fingerprint !== request.input_fingerprint) {
        return {
          status: 'BLOCKED',
          reasons: ['IDEMPOTENCY_KEY_PAYLOAD_MISMATCH'],
          submitCalls: 0,
        };
      }
      if (existing !== undefined && existing.context_version !== String(request.context_version)) {
        return { status: 'BLOCKED', reasons: ['CONTEXT_VERSION_MISMATCH'], submitCalls: 0 };
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
                request.input_fingerprint,
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
        prompt,
      );
      return {
        status: 'ALLOWED',
        reasons: [],
        submitCalls: submitCalls - before,
        projectId: bound.projectId,
        idempotencyKey: request.route_idempotency_key,
        prompt,
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
    accept(task: RouteTask, fingerprint: string, limits: ConceptArtLimits | null) {
      const verdict = {
        accept: false,
        staleProviderError: task.error,
        mediaVerified: false as const,
      };
      const bound = readOp(task.projectId, task.idempotencyKey);
      if (bound === undefined || bound.fingerprint !== fingerprint) {
        return { ...verdict, reason: 'FINGERPRINT_MISMATCH' };
      }
      if (limits === null) return { ...verdict, reason: 'LIMITS_UNCONFIGURED' };
      if (task.localStop === true) return { ...verdict, reason: 'LOCAL_STOP' };
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
      } catch {
        return { ...verdict, reason: 'truncated_or_incomplete_image_bytes' };
      }
      return {
        ...verdict,
        accept: true,
        reason: 'BYTES_PARSED_NOT_A_RENDER',
        fingerprint,
      };
    },
  };
}
