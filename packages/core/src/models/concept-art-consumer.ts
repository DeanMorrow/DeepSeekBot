import { createHash } from 'node:crypto';

import type { OperationalDatabaseModulePort } from '../database/owner.js';
import {
  inspectImage,
  ImageFormatError,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  type ImageMime,
} from '../media/image-format.js';
import type { SessionOwnership } from '../sessions/ownership.js';
import { SharedRouteError, type StoredArtifact } from './shared-route.js';

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
    def?: string | null;
    def_fixture?: string | null;
  };
  style_history_audit_only?: readonly { styleRef?: string; def?: string }[];
  references?: readonly { id: string; status: string }[];
  sessionId: string | null;
  context_version: string | number;
  operation_id: string;
  route_idempotency_key: string;
  input_fingerprint: string;
  submit_allowed: boolean;
  botSlug?: string;
  confirmedPrompt?: string;
}

export interface ConceptArtVerdict {
  status:
    | 'ALLOWED'
    | 'BLOCKED'
    | 'INTEGRATION_BLOCKED'
    | 'NEEDS_CLARIFICATION'
    | 'NEEDS_CONFIRMATION'
    | 'NOT_READY';
  reasons: string[];
  submitCalls: number;
  /** chat-model: the shared chat route ran. promptSource says whether its text was kept. */
  optimization: 'chat-model';
  promptSource?: 'echo-only' | 'model-addition-held' | 'user-accepted-model-addition';
  rawRequirement?: string;
  modelPrompt?: string;
  rawEchoMatched?: boolean;
  /** raw-plus-selected-only is not an optimization. Additions stay unverified until the user accepts them. */
  fidelity?:
    | 'raw-plus-selected-only'
    | 'unverified-model-addition'
    | 'user-accepted-unverified'
    | 'note-echo-def-distinct';
  proposedPrompt?: string;
  styleRef?: string;
  def?: string;
  note?: string;
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
    consumer: 'concept-art' | 'chat',
    capability: 'image' | 'chat',
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
  const paired = raw.match(
    /完全透明的?([^，。；不透光\s]{1,16})[，,]?\s*配不透光的?([^，。；\s]{1,16})/u,
  );
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
      def: request.style.def ?? request.style.def_fixture ?? null,
    },
    references: [...(request.references ?? [])]
      .map((item) => ({ id: item.id, status: item.status }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    operation_id: request.operation_id,
    confirmedPrompt: request.confirmedPrompt ?? '',
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
  const raw = request.raw_requirement;
  const selected =
    request.style.state === 'selected'
      ? (request.style.def ?? request.style.def_fixture ?? '').trim()
      : '';
  const disabled =
    request.style.state === 'disabled'
      ? [request.style.def ?? '', request.style.def_fixture ?? '']
      : [];
  return [...(request.style_history_audit_only ?? []).map((item) => item.def ?? ''), ...disabled]
    .map((def) => def.trim())
    .filter((def) => def !== '' && def !== selected && !raw.includes(def));
}

function librarySpans(defs: readonly string[]): string[] {
  const spans = new Set<string>();
  for (const def of defs) {
    const trimmed = def.trim();
    if (trimmed !== '') spans.add(trimmed);
    for (const part of trimmed.split(/[、,，;；]/u)) {
      const span = part.trim();
      if (span.length >= 2) spans.add(span);
      if (/[一-鿿]/u.test(span)) {
        for (const word of span.split(/\s+/u)) {
          if (word.length >= 2) spans.add(word);
        }
      }
    }
    if (/[一-鿿]/u.test(trimmed)) {
      for (const word of trimmed.split(/\s+/u)) {
        if (word.length >= 2) spans.add(word);
      }
    }
  }
  return [...spans].sort((left, right) => right.length - left.length);
}

/** Remove library-style spans that are not already the user's own raw words. Keep the rest of the sentence. */
export function exciseLibrarySpans(
  text: string,
  defs: readonly string[],
  raw: string,
  keep = '',
): string {
  let next = text;
  for (const span of librarySpans(defs)) {
    if (raw.includes(span) || (keep !== '' && keep.includes(span))) continue;
    next = next.split(span).join('');
  }
  return next
    .replace(/(^|[。！？\n\s])[、,，;；]+/gu, '$1')
    .replace(/[、,，;；]+(?=[。！？\n]|$)/gu, '')
    .replace(/\s{2,}/gu, ' ')
    .trim();
}

/** Keep the user's raw words. Add only the selected style def. Strip library spans from an added sentence without dropping the rest of it. */
export function composeConceptPrompt(request: ConceptArtRequest): string {
  const raw = request.raw_requirement.trim();
  const selected =
    request.style.state === 'selected'
      ? (request.style.def ?? request.style.def_fixture ?? '').trim()
      : '';
  const parts = [raw];
  if (selected !== '' && !raw.includes(selected)) parts.push(selected);
  const extra = exciseLibrarySpans(request.submit_prompt ?? '', forbiddenLibraryText(request), raw);
  const addition = extra.split(raw).join('');
  const contradicts = /removed|换成|改成|改为|不要|别用|don't|do not use/iu.test(addition);
  if (extra !== '' && extra !== raw && !contradicts) parts.push(extra);
  return parts.join('\n');
}

export function conceptArtMediaLimits(): ConceptArtLimits {
  return {
    maxEncodedBytes: MAX_IMAGE_BYTES,
    maxDecodedBytes: MAX_IMAGE_BYTES,
    maxPixels: MAX_IMAGE_PIXELS,
    allowlist: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  };
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
  ): ConceptArtVerdict => ({ status, reasons, submitCalls, optimization: 'chat-model' });

  const mechanicalPrompt = (request: ConceptArtRequest): string => {
    const raw = request.raw_requirement.trim();
    const selected =
      request.style.state === 'selected'
        ? (request.style.def ?? request.style.def_fixture ?? '').trim()
        : '';
    const parts = [raw];
    if (selected !== '' && !raw.includes(selected)) parts.push(selected);
    return parts.join('\n');
  };

  const promptFromModel = (
    request: ConceptArtRequest,
    text: string,
  ): { kind: 'echo'; prompt: string } | { kind: 'addition'; proposed: string } | undefined => {
    const raw = request.raw_requirement.trim();
    if (!text.includes(`RAW_START\n${raw}\nRAW_END`)) return undefined;
    if (text.includes('CLARIFY_START')) return undefined;
    const prompt = text.split('PROMPT_START\n')[1]?.split('\nPROMPT_END')[0]?.trim() ?? '';
    if (!prompt.includes(raw)) return undefined;
    const selected =
      request.style.state === 'selected'
        ? (request.style.def ?? request.style.def_fixture ?? '').trim()
        : '';
    const kept = exciseLibrarySpans(prompt, forbiddenLibraryText(request), raw, selected);
    if (!kept.includes(raw)) return undefined;
    const composed = composeConceptPrompt(request);
    if (kept === mechanicalPrompt(request) || kept === composed) {
      return { kind: 'echo', prompt: composed };
    }
    return { kind: 'addition', proposed: kept };
  };

  const optimizeWithChat = async (
    request: ConceptArtRequest,
    projectId: string,
  ): Promise<
    | { status: 'ok'; prompt: string }
    | {
        status: 'NEEDS_CONFIRMATION';
        reasons: string[];
        proposedPrompt: string;
      }
    | { status: ConceptArtVerdict['status']; reasons: string[] }
  > => {
    const raw = request.raw_requirement.trim();
    const selected =
      request.style.state === 'selected'
        ? (request.style.def ?? request.style.def_fixture ?? '').trim()
        : '';
    const cleared = forbiddenLibraryText(request);
    const instruction = [
      'Optimize one concept-art requirement.',
      'Copy the raw requirement unchanged into the prompt, then add only detail that keeps it.',
      'If you are unsure or would have to change the raw requirement, ask instead of sending a prompt.',
      selected === '' ? 'Do not add a library style.' : 'The selected style may be repeated.',
      'Do not use a cleared style definition.',
      'Reply using these markers exactly.',
      `RAW_START\n${raw}\nRAW_END`,
      `SELECTED_STYLE:\n${selected}`,
      `CLEARED_STYLES:\n${cleared.join('\n')}`,
      'PROMPT_START',
      mechanicalPrompt(request),
      'PROMPT_END',
      'Or, instead of PROMPT, use CLARIFY_START and CLARIFY_END.',
    ].join('\n');
    const read = async (suffix: string): Promise<string | undefined> => {
      const task = await wrapped.submit(
        'chat',
        'chat',
        projectId,
        `${request.route_idempotency_key}:${suffix}`,
        instruction,
      );
      return task.status === 'completed' && task.artifact?.kind === 'text'
        ? task.artifact.value
        : undefined;
    };
    try {
      const first = await read('optimize');
      if (first === undefined) return { status: 'BLOCKED', reasons: ['OPTIMIZE_FAILED'] };
      const accepted =
        promptFromModel(request, first) ??
        promptFromModel(request, (await read('optimize-rework')) ?? '');
      if (accepted === undefined) {
        return { status: 'NEEDS_CLARIFICATION', reasons: ['FIDELITY_CONTRADICTION'] };
      }
      if (accepted.kind === 'addition') {
        return {
          status: 'NEEDS_CONFIRMATION',
          reasons: ['MODEL_ADDITION_UNVERIFIED'],
          proposedPrompt: accepted.proposed,
        };
      }
      return { status: 'ok', prompt: accepted.prompt };
    } catch (error) {
      if (
        error instanceof SharedRouteError &&
        (error.reason === 'unconfigured' || error.reason === 'credential-missing')
      )
        return { status: 'NOT_READY', reasons: ['MODEL_NOT_READY'] };
      throw error;
    }
  };

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
      if ('status' in bound) return { ...bound, submitCalls: 0, optimization: 'chat-model' };
      if (request.sessionId === null) {
        return {
          status: 'INTEGRATION_BLOCKED',
          reasons: ['HOST_CONTEXT_CONTRACT_MISSING'],
          submitCalls: 0,
          optimization: 'chat-model',
        };
      }
      const owner = input.ownership.resolve(request.sessionId)?.botSlug;
      if (request.botSlug !== undefined && request.botSlug !== '' && owner !== request.botSlug) {
        return refused('BLOCKED', ['BOT_SESSION_MISMATCH'], 0);
      }
      const fingerprint = canonicalFingerprint(request);
      const existing = readOp(bound.projectId, request.route_idempotency_key);
      if (existing !== undefined && existing.context_version !== String(request.context_version)) {
        return refused('BLOCKED', ['CONTEXT_VERSION_MISMATCH'], 0);
      }
      if (
        existing !== undefined &&
        (existing.fingerprint !== fingerprint || existing.operation_id !== request.operation_id)
      ) {
        return refused('BLOCKED', ['IDEMPOTENCY_KEY_PAYLOAD_MISMATCH'], 0);
      }
      const raw = request.raw_requirement.trim();
      let prompt = existing?.prompt;
      let promptSource: ConceptArtVerdict['promptSource'] = 'echo-only';
      let fidelity: ConceptArtVerdict['fidelity'] = 'raw-plus-selected-only';
      if (prompt === undefined && request.confirmedPrompt !== undefined) {
        if (!request.confirmedPrompt.includes(raw)) {
          return {
            status: 'NEEDS_CLARIFICATION',
            reasons: ['FIDELITY_CONTRADICTION'],
            submitCalls: 0,
            optimization: 'chat-model',
            fidelity: 'unverified-model-addition',
            promptSource: 'model-addition-held',
            rawRequirement: raw,
          };
        }
        const confirmed = request.confirmedPrompt;
        prompt = confirmed;
        promptSource = 'user-accepted-model-addition';
        fidelity = 'user-accepted-unverified';
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
                confirmed,
              ),
          ['concept-art'],
        );
      }
      if (prompt === undefined) {
        const model = await optimizeWithChat(request, bound.projectId);
        if (model.status === 'NEEDS_CONFIRMATION' && 'proposedPrompt' in model) {
          const proposedPrompt = model.proposedPrompt;
          return {
            status: 'NEEDS_CONFIRMATION',
            reasons: model.reasons,
            submitCalls: submitCalls - before,
            optimization: 'chat-model',
            promptSource: 'model-addition-held',
            fidelity: 'unverified-model-addition',
            proposedPrompt,
            rawRequirement: raw,
          };
        }
        if (model.status !== 'ok') return refused(model.status, model.reasons, 0);
        const storedPrompt = model.prompt;
        prompt = storedPrompt;
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
                storedPrompt,
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
        rawRequirement: request.raw_requirement.trim(),
        modelPrompt: existing?.prompt ?? prompt,
        rawEchoMatched: prompt.includes(raw),
        fidelity,
        optimization: 'chat-model',
        promptSource,
        projectId: bound.projectId,
        idempotencyKey: request.route_idempotency_key,
        prompt: existing?.prompt ?? prompt,
        task,
      };
    },
    ownerBot(sessionId: string): string | undefined {
      return input.ownership.resolve(sessionId)?.botSlug;
    },
    listStyles(botSlug: string) {
      return input.database.read((db) => {
        return db
          .prepare(
            `SELECT style_ref AS styleRef, version, def
             FROM concept_art_styles
             WHERE bot_slug = ? AND ownership = 'assigned'
             ORDER BY created_at, style_ref`,
          )
          .all(botSlug) as { styleRef: string; version: string; def: string }[];
      });
    },
    listUnassigned() {
      return input.database.read((db) => {
        return db
          .prepare(
            `SELECT style_ref AS styleRef, version, created_at AS createdAt, ownership
             FROM concept_art_styles
             WHERE ownership = 'unassigned' OR bot_slug IS NULL
             ORDER BY created_at, style_ref`,
          )
          .all() as {
          styleRef: string;
          version: string;
          createdAt: string;
          ownership: 'unassigned';
        }[];
      });
    },
    async generateStyle(inputStyle: { sessionId: string | null; styleRef: string; note: string }) {
      const before = submitCalls;
      const bound = sessionProjectId(input.ownership, inputStyle.sessionId);
      if ('status' in bound)
        return { ...bound, submitCalls: 0, optimization: 'chat-model' as const };
      const botSlug = input.ownership.resolve(inputStyle.sessionId ?? '')?.botSlug;
      if (botSlug === undefined) {
        return refused('INTEGRATION_BLOCKED', ['HOST_CONTEXT_CONTRACT_MISSING'], 0);
      }
      const projectId = bound.projectId;
      const note = inputStyle.note.trim();
      const styleRef = inputStyle.styleRef.trim();
      if (note === '' || styleRef === '') return refused('BLOCKED', ['STYLE_NOTE_REQUIRED'], 0);
      const instruction = [
        'TASK:generate-style',
        'Write one reusable concept-art style definition. Do not reply with only the note.',
        `NOTE_START\n${note}\nNOTE_END`,
        'DEF_START',
        'DEF_END',
      ].join('\n');
      try {
        const task = await wrapped.submit(
          'chat',
          'chat',
          projectId,
          `style:${styleRef}`,
          instruction,
        );
        const text = task.artifact?.kind === 'text' ? task.artifact.value : undefined;
        if (task.status !== 'completed' || text === undefined)
          return refused('BLOCKED', ['STYLE_DEF_MISSING'], submitCalls - before);
        if (!text.includes(`NOTE_START\n${note}\nNOTE_END`))
          return refused('BLOCKED', ['STYLE_NOTE_MISMATCH'], submitCalls - before);
        const def = text.split('DEF_START\n')[1]?.split('\nDEF_END')[0]?.trim() ?? '';
        if (def === '' || def === note)
          return refused('BLOCKED', ['STYLE_DEF_MISSING'], submitCalls - before);
        input.database.transaction(
          (db) => {
            const own = db
              .prepare(
                `SELECT def FROM concept_art_styles
               WHERE bot_slug = ? AND style_ref = ? AND version = 'v1' AND ownership = 'assigned'`,
              )
              .get(botSlug, styleRef) as { def: string } | undefined;
            if (own !== undefined) {
              db.prepare(
                `UPDATE concept_art_styles SET def = ?
               WHERE bot_slug = ? AND style_ref = ? AND version = 'v1' AND ownership = 'assigned'`,
              ).run(def, botSlug, styleRef);
              return;
            }
            db.prepare(
              `INSERT INTO concept_art_styles
               (bot_slug, style_ref, version, def, created_at, ownership)
             VALUES (?, ?, 'v1', ?, ?, 'assigned')`,
            ).run(botSlug, styleRef, def, new Date().toISOString());
          },
          ['concept-art'],
        );
        return {
          status: 'ALLOWED' as const,
          reasons: [],
          submitCalls: submitCalls - before,
          optimization: 'chat-model' as const,
          styleRef,
          def,
          note,
          botSlug,
          fidelity: 'note-echo-def-distinct' as const,
        };
      } catch (error) {
        if (
          error instanceof SharedRouteError &&
          (error.reason === 'unconfigured' || error.reason === 'credential-missing')
        )
          return refused('NOT_READY', ['MODEL_NOT_READY'], 0);
        throw error;
      }
    },
    resume(sessionId: string, idempotencyKey: string) {
      const bound = sessionProjectId(input.ownership, sessionId);
      if ('status' in bound) return Promise.reject(Object.assign(new Error(bound.status), bound));
      return wrapped.resume(bound.projectId, idempotencyKey).then((task) =>
        task.localStop === true
          ? {
              ...task,
              artifact: null,
              deliverable: false as const,
              mediaVerified: false as const,
            }
          : task,
      );
    },
    cancel(sessionId: string, idempotencyKey: string) {
      const bound = sessionProjectId(input.ownership, sessionId);
      if ('status' in bound) throw Object.assign(new Error(bound.status), bound);
      const task = wrapped.cancel(bound.projectId, idempotencyKey);
      return {
        ...task,
        artifact: null,
        deliverable: false as const,
        mediaVerified: false as const,
      };
    },
    accept(task: RouteTask, contextVersion: string | number) {
      const limits = input.limits;
      const verdict = {
        accept: false,
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
        accept: true,
        deliverable: false,
        parsed: true,
        mediaVerified: false,
        reason: 'BYTES_PARSED_NOT_A_RENDER',
        delivery: 'not-mounted' as const,
      };
    },
  };
}
