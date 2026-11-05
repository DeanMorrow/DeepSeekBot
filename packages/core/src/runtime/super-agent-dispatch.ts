import { createHash, randomUUID } from 'node:crypto';

import type { AssignmentSummary, OrchestratorAssignmentAccess } from './bot-runtime.js';

/** MIT prototype. This module does not install that bundle or its presets. */
export const SUPER_AGENT_SOURCE = {
  repository: 'deepseek-ai/dsh-superagent-prototype',
  commit: '6337fc823ce20251c8de8085948165c81aaa701e',
  license: 'MIT',
  fullBundleInstalled: false,
  officialInstalled: false,
  adaptation: 'tobs-assignment',
  presetReplaced: false,
  githubSource: false,
  feishuSource: false,
  autoMerge: false,
} as const;

export const SUPER_AGENT_LIMITS = {
  maxDepth: 2,
  maxConcurrent: 2,
  maxSubtasks: 3,
  maxBudget: 3,
  maxGoalChars: 180,
  maxStepChars: 180,
  maxSteps: 4,
  maxAcceptanceChars: 180,
} as const;

export interface WorkOrder {
  goal: string;
  steps: string[];
  acceptance: string;
}

export interface SuperAgentExecutor {
  kind: 'test-executor' | 'host-assignment';
  grants: OrchestratorAssignmentAccess['grants'];
  list: OrchestratorAssignmentAccess['list'];
  create: OrchestratorAssignmentAccess['create'];
  stop: OrchestratorAssignmentAccess['stop'];
}

export interface SuperAgentDispatchResult {
  ok: boolean;
  reason?: string;
  runId: string;
  adaptation: 'tobs-assignment';
  fullBundleInstalled: false;
  officialInstalled: false;
  source: typeof SUPER_AGENT_SOURCE;
  limits: typeof SUPER_AGENT_LIMITS;
  executor: SuperAgentExecutor['kind'];
  liveModelDispatch: boolean;
  scheduled: boolean;
  mayIncurModelCost: boolean;
  dispatched: Array<{ id: string; sessionId: string; outcome: string; key: string }>;
  refused: Array<{ id: string; reason: string }>;
  stopped: string[];
  stopErrors: Array<{ sessionId: string; reason: string }>;
}

interface RunOwner {
  runId: string;
  sessionId: string;
  botSlug: string;
  grantId: string;
  fingerprint: string;
}

const owners = new Map<string, RunOwner>();
const lanes = new Map<string, Promise<unknown>>();

/** Host-visible occupancy. Idle after a finished turn does not hold a slot; a capacity wait does. */
export function occupiesSuperAgentSlot(item: AssignmentSummary): boolean {
  if (item.archivedAt !== undefined || item.activity === 'stopped') return false;
  if (item.activity === 'working' || item.activity === 'stopping') return true;
  return item.executionWait === 'waiting-capacity' || item.executionWait === 'waiting-human';
}

export function parseWorkOrders(value: unknown): WorkOrder[] | { reason: string } {
  const parsed = typeof value === 'string' ? parseJson(value) : value;
  if (!Array.isArray(parsed) || parsed.length === 0) return { reason: 'task-source-required' };
  if (parsed.length > SUPER_AGENT_LIMITS.maxSubtasks) return { reason: 'too-many-subtasks' };
  const orders: WorkOrder[] = [];
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) return { reason: 'task-source-required' };
    const record = item as Record<string, unknown>;
    const goal = typeof record.goal === 'string' ? record.goal.trim() : '';
    const acceptance = typeof record.acceptance === 'string' ? record.acceptance.trim() : '';
    const steps = Array.isArray(record.steps)
      ? record.steps
          .filter((step): step is string => typeof step === 'string')
          .map((step) => step.trim())
      : [];
    if (
      goal === '' ||
      acceptance === '' ||
      steps.length === 0 ||
      steps.some((step) => step === '')
    ) {
      return { reason: 'task-source-required' };
    }
    if (
      goal.length > SUPER_AGENT_LIMITS.maxGoalChars ||
      acceptance.length > SUPER_AGENT_LIMITS.maxAcceptanceChars ||
      steps.length > SUPER_AGENT_LIMITS.maxSteps ||
      steps.some((step) => step.length > SUPER_AGENT_LIMITS.maxStepChars)
    ) {
      return { reason: 'work-order-too-large' };
    }
    orders.push({ goal, steps, acceptance });
  }
  return orders;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

export function workOrderFingerprint(orders: readonly WorkOrder[]): string {
  return createHash('sha256')
    .update(
      JSON.stringify(
        orders.map((order) => ({
          goal: order.goal,
          steps: order.steps,
          acceptance: order.acceptance,
        })),
      ),
    )
    .digest('hex')
    .slice(0, 16);
}

function childText(order: WorkOrder, runId: string, subtaskId: string, grantId: string): string {
  const steps = order.steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
  return [
    `Goal: ${order.goal}`,
    'Steps:',
    steps,
    `Acceptance: ${order.acceptance}`,
    `Authorization: Workspace Grant ${grantId} only. Private memory is not included. Parent chat text is not included.`,
    JSON.stringify({
      source: {
        repository: SUPER_AGENT_SOURCE.repository,
        commit: SUPER_AGENT_SOURCE.commit,
        runId,
        subtaskId,
        origin: 'explicit-work-order',
      },
      authorization: {
        grantId,
        scope: 'workspace-grant-only',
        privateMemory: false,
        rawParentText: false,
      },
      work: order,
    }),
  ].join('\n');
}

function blank(kind: SuperAgentExecutor['kind'], runId: string): SuperAgentDispatchResult {
  return {
    ok: false,
    runId,
    adaptation: 'tobs-assignment',
    fullBundleInstalled: false,
    officialInstalled: false,
    source: SUPER_AGENT_SOURCE,
    limits: SUPER_AGENT_LIMITS,
    executor: kind,
    liveModelDispatch: false,
    scheduled: false,
    mayIncurModelCost: false,
    dispatched: [],
    refused: [],
    stopped: [],
    stopErrors: [],
  };
}

async function stopEach(
  executor: SuperAgentExecutor,
  sessionIds: readonly string[],
  stopped: string[],
  stopErrors: Array<{ sessionId: string; reason: string }>,
): Promise<void> {
  for (const sessionId of sessionIds) {
    if (stopped.includes(sessionId)) continue;
    try {
      await executor.stop(sessionId);
      stopped.push(sessionId);
    } catch (error) {
      stopErrors.push({
        sessionId,
        reason: error instanceof Error ? error.message : 'stop-failed',
      });
    }
  }
}

async function dispatchSuperAgent(
  input: {
    workOrders: unknown;
    grantId?: string | undefined;
    depth?: number | undefined;
    runId?: string | undefined;
    sessionId: string;
    botSlug: string;
    rawParentText?: string | undefined;
  },
  executor: SuperAgentExecutor,
  signal: AbortSignal,
): Promise<SuperAgentDispatchResult> {
  const requested = input.runId?.trim() ?? '';
  const runId = requested || randomUUID();
  const result = blank(executor.kind, runId);
  const depth = input.depth ?? 1;
  if (!Number.isInteger(depth) || depth < 1 || depth >= SUPER_AGENT_LIMITS.maxDepth) {
    return { ...result, reason: 'depth-exceeded' };
  }
  const orders = parseWorkOrders(input.workOrders);
  if (!Array.isArray(orders)) return { ...result, reason: orders.reason };
  if (input.grantId === undefined || input.grantId.trim() === '') {
    return { ...result, reason: 'grant-required' };
  }
  const grantId = input.grantId.trim();
  const known = executor
    .grants()
    .some((grant) => grant.id === grantId && grant.revokedAt === undefined);
  if (!known) return { ...result, reason: 'grant-unauthorized' };
  const fingerprint = workOrderFingerprint(orders);
  const owner = owners.get(runId);
  if (requested !== '' && owner === undefined) {
    const prior = executor
      .list()
      .filter((item) => item.continuityKey?.startsWith(`super-agent:${runId}:`));
    const priorFingerprint = prior
      .map((item) => item.continuityKey?.split(':')[2])
      .find((value) => value !== undefined);
    if (prior.length === 0 || priorFingerprint !== fingerprint)
      return { ...result, reason: 'run-unknown' };
    if (
      prior.some(
        (item) => item.permission?.grantId !== undefined && item.permission.grantId !== grantId,
      )
    ) {
      return { ...result, reason: 'run-grant-mismatch' };
    }
  }
  if (owner !== undefined) {
    if (owner.botSlug !== input.botSlug || owner.sessionId !== input.sessionId) {
      return { ...result, reason: 'run-owner-mismatch' };
    }
    if (owner.grantId !== grantId) return { ...result, reason: 'run-grant-mismatch' };
    if (owner.fingerprint !== fingerprint) return { ...result, reason: 'run-fingerprint-mismatch' };
  }
  owners.set(runId, {
    runId,
    sessionId: input.sessionId,
    botSlug: input.botSlug,
    grantId,
    fingerprint,
  });

  const prefix = `super-agent:${runId}:${fingerprint}:`;
  const existing = executor.list().filter((item) => item.continuityKey?.startsWith('super-agent:'));
  const foreign = existing.filter(
    (item) =>
      !item.continuityKey?.startsWith(`super-agent:${runId}:`) && occupiesSuperAgentSlot(item),
  );
  if (foreign.length >= SUPER_AGENT_LIMITS.maxBudget) return { ...result, reason: 'budget' };
  if (foreign.length >= SUPER_AGENT_LIMITS.maxConcurrent)
    return { ...result, reason: 'concurrency' };

  const createdThisCall: string[] = [];
  const fail = async (reason: string): Promise<SuperAgentDispatchResult> => {
    await stopEach(executor, createdThisCall, result.stopped, result.stopErrors);
    result.ok = false;
    result.reason = reason;
    result.liveModelDispatch = executor.kind === 'host-assignment' && createdThisCall.length > 0;
    result.scheduled = result.liveModelDispatch;
    result.mayIncurModelCost = result.liveModelDispatch;
    return result;
  };

  try {
    let opened = foreign.length;
    for (let index = 0; index < orders.length; index += 1) {
      const order = orders[index]!;
      const id = `sub-${depth}-${index + 1}`;
      const key = `${prefix}${index + 1}`;
      if (signal.aborted) return fail('cancelled');
      const already = existing.find((item) => item.continuityKey === key);
      const retry = already !== undefined;
      if (!retry && opened >= SUPER_AGENT_LIMITS.maxConcurrent) {
        result.refused.push({ id, reason: 'concurrency' });
        continue;
      }
      if (!retry && opened >= SUPER_AGENT_LIMITS.maxBudget) {
        result.refused.push({ id, reason: 'budget' });
        continue;
      }
      const text = childText(order, runId, id, grantId);
      if (
        input.rawParentText !== undefined &&
        input.rawParentText !== '' &&
        text.includes(input.rawParentText)
      ) {
        return fail('parent-text-refused');
      }
      let outcome;
      try {
        outcome = executor.create({
          title: [...order.goal].length <= 80 ? order.goal : `Subtask ${index + 1}`,
          description: `${order.goal} Acceptance: ${order.acceptance}`.slice(0, 600),
          instructions: text,
          grantId,
          key,
        });
      } catch (error) {
        result.refused.push({
          id,
          reason: error instanceof Error ? error.message : 'create-failed',
        });
        return fail('create-failed');
      }
      if (executor.kind === 'host-assignment') {
        result.liveModelDispatch = true;
        result.scheduled = true;
        result.mayIncurModelCost = true;
      }
      if (outcome.outcome !== 'created' && outcome.outcome !== 'reused') {
        result.refused.push({ id, reason: outcome.outcome });
        return fail(outcome.outcome);
      }
      result.dispatched.push({
        id,
        sessionId: outcome.assignment.sessionId,
        outcome: outcome.outcome,
        key,
      });
      if (outcome.outcome === 'created') createdThisCall.push(outcome.assignment.sessionId);
      if (!retry) opened += 1;
      if (signal.aborted) return fail('cancelled');
    }
  } catch (error) {
    result.refused.push({
      id: 'run',
      reason: error instanceof Error ? error.message : 'create-failed',
    });
    return fail('create-failed');
  }
  result.ok =
    result.dispatched.length > 0 && result.stopped.length === 0 && result.stopErrors.length === 0;
  if (!result.ok && result.reason === undefined)
    result.reason = result.refused[0]?.reason ?? 'no-dispatch';
  return result;
}

export function runSuperAgent(
  input: {
    workOrders: unknown;
    grantId?: string | undefined;
    depth?: number | undefined;
    runId?: string | undefined;
    sessionId: string;
    botSlug: string;
    rawParentText?: string | undefined;
  },
  executor: SuperAgentExecutor,
  signal: AbortSignal,
): Promise<SuperAgentDispatchResult> {
  const prior = lanes.get(input.botSlug) ?? Promise.resolve();
  const next = prior.then(
    () => dispatchSuperAgent(input, executor, signal),
    () => dispatchSuperAgent(input, executor, signal),
  );
  lanes.set(
    input.botSlug,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

export async function cancelSuperAgentRun(
  input: { runId: string; sessionId: string; botSlug: string; grantId: string },
  executor: SuperAgentExecutor,
): Promise<SuperAgentDispatchResult> {
  const prior = lanes.get(input.botSlug) ?? Promise.resolve();
  const next = prior.then(
    () => cancelBody(input, executor),
    () => cancelBody(input, executor),
  );
  lanes.set(
    input.botSlug,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

async function cancelBody(
  input: { runId: string; sessionId: string; botSlug: string; grantId: string },
  executor: SuperAgentExecutor,
): Promise<SuperAgentDispatchResult> {
  const result = blank(executor.kind, input.runId);
  const owner = owners.get(input.runId);
  if (owner !== undefined) {
    if (owner.botSlug !== input.botSlug || owner.sessionId !== input.sessionId) {
      return { ...result, reason: 'run-owner-mismatch' };
    }
    if (owner.grantId !== input.grantId) return { ...result, reason: 'run-grant-mismatch' };
  }
  const mine = executor
    .list()
    .filter((item) => item.continuityKey?.startsWith(`super-agent:${input.runId}:`))
    .filter(
      (item) => item.permission?.grantId === undefined || item.permission.grantId === input.grantId,
    )
    .filter((item) => item.activity !== 'stopped' && item.archivedAt === undefined);
  if (owner === undefined && mine.length === 0) return { ...result, reason: 'run-unknown' };
  await stopEach(
    executor,
    mine.map((item) => item.sessionId),
    result.stopped,
    result.stopErrors,
  );
  result.ok = result.stopErrors.length === 0;
  if (!result.ok) result.reason = 'stop-incomplete';
  return result;
}
