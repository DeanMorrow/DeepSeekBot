import type { AssignmentSummary, OrchestratorAssignmentAccess } from './bot-runtime.js';
import {
  newSuperAgentRunId,
  parseWorkOrders,
  SUPER_AGENT_LIMITS,
  workOrderFingerprint,
  type SealedWorkOrder,
  type SuperAgentLedger,
} from './super-agent-ledger.js';

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

/** Host occupancy. A finished idle turn does not hold a slot. A capacity wait does. */
export function occupiesSuperAgentSlot(item: AssignmentSummary): boolean {
  if (item.archivedAt !== undefined || item.activity === 'stopped') return false;
  if (item.activity === 'working' || item.activity === 'stopping') return true;
  return item.executionWait === 'waiting-capacity' || item.executionWait === 'waiting-human';
}

function childText(order: SealedWorkOrder, runId: string, grantId: string): string {
  const steps = order.steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
  return [
    `Goal: ${order.goal}`,
    'Steps:',
    steps,
    `Acceptance: ${order.acceptance}`,
    `Authorization: Workspace Grant ${grantId} only. Private memory is not included. Parent chat text is not included.`,
    `Order: ${order.orderId}`,
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

export async function runSuperAgent(
  input: {
    orderIds?: readonly string[] | undefined;
    grantId?: string | undefined;
    depth?: number | undefined;
    runId?: string | undefined;
    sessionId: string;
    botSlug: string;
    now: string;
    rawParentText?: string | undefined;
  },
  ledger: SuperAgentLedger,
  executor: SuperAgentExecutor,
  signal: AbortSignal,
): Promise<SuperAgentDispatchResult> {
  const runId = input.runId?.trim() || newSuperAgentRunId();
  const result = blank(executor.kind, runId);
  const depth = input.depth ?? 1;
  if (!Number.isInteger(depth) || depth < 1 || depth >= SUPER_AGENT_LIMITS.maxDepth) {
    return { ...result, reason: 'depth-exceeded' };
  }
  if (input.grantId === undefined || input.grantId.trim() === '') {
    return { ...result, reason: 'grant-required' };
  }
  const grantId = input.grantId.trim();
  const known = executor
    .grants()
    .some((grant) => grant.id === grantId && grant.revokedAt === undefined);
  if (!known) return { ...result, reason: 'grant-unauthorized' };
  const loaded = ledger.load({
    botSlug: input.botSlug,
    sessionId: input.sessionId,
    grantId,
    orderIds: input.orderIds ?? [],
  });
  if (!Array.isArray(loaded)) return { ...result, reason: loaded.reason };
  const fingerprint = workOrderFingerprint(loaded);
  const occupying = executor
    .list()
    .filter((item) => occupiesSuperAgentSlot(item) && !item.continuityKey?.includes(runId)).length;
  const claimed = ledger.claimRun({
    runId,
    botSlug: input.botSlug,
    sessionId: input.sessionId,
    grantId,
    fingerprint,
    orderIds: loaded.map((order) => order.orderId),
    now: input.now,
    occupying,
    opening: loaded.length,
    concurrent: SUPER_AGENT_LIMITS.maxConcurrent,
    budget: SUPER_AGENT_LIMITS.maxBudget,
  });
  if (!claimed.ok) return { ...result, reason: claimed.reason };
  if (claimed.reused) {
    const existing = ledger.assignmentIds(runId);
    if (existing.length === loaded.length) {
      result.ok = true;
      result.dispatched = existing.map((item, index) => ({
        id: `sub-${depth}-${index + 1}`,
        sessionId: item.sessionId,
        outcome: 'reused',
        key: `super-agent:${runId}:${fingerprint}:${index + 1}`,
      }));
      return result;
    }
  }

  const createdThisCall: string[] = [];
  const fail = async (reason: string): Promise<SuperAgentDispatchResult> => {
    await stopEach(executor, createdThisCall, result.stopped, result.stopErrors);
    for (const [index] of createdThisCall.entries()) ledger.markStopped(runId, index + 1);
    result.ok = false;
    result.reason = reason;
    result.liveModelDispatch = executor.kind === 'host-assignment' && createdThisCall.length > 0;
    result.scheduled = result.liveModelDispatch;
    result.mayIncurModelCost = result.liveModelDispatch;
    return result;
  };

  for (let index = 0; index < loaded.length; index += 1) {
    const order = loaded[index]!;
    const id = `sub-${depth}-${index + 1}`;
    const key = `super-agent:${runId}:${fingerprint}:${index + 1}`;
    if (signal.aborted) return fail('cancelled');
    const text = childText(order, runId, grantId);
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
      result.refused.push({ id, reason: error instanceof Error ? error.message : 'create-failed' });
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
    ledger.markWorking(runId, index + 1, outcome.assignment.sessionId);
    result.dispatched.push({
      id,
      sessionId: outcome.assignment.sessionId,
      outcome: outcome.outcome,
      key,
    });
    if (outcome.outcome === 'created') createdThisCall.push(outcome.assignment.sessionId);
    if (signal.aborted) return fail('cancelled');
  }
  result.ok = result.dispatched.length > 0 && result.stopErrors.length === 0;
  return result;
}

export async function cancelSuperAgentRun(
  input: { runId: string; sessionId: string; botSlug: string; grantId: string },
  ledger: SuperAgentLedger,
  executor: SuperAgentExecutor,
): Promise<SuperAgentDispatchResult> {
  const result = blank(executor.kind, input.runId);
  const row = ledger.readRun(input.runId);
  if (row === undefined) return { ...result, reason: 'run-unknown' };
  if (row.botSlug !== input.botSlug || row.sessionId !== input.sessionId) {
    return { ...result, reason: 'run-owner-mismatch' };
  }
  if (row.grantId !== input.grantId) return { ...result, reason: 'run-grant-mismatch' };
  const ids = ledger.assignmentIds(input.runId);
  await stopEach(
    executor,
    ids.map((item) => item.sessionId),
    result.stopped,
    result.stopErrors,
  );
  for (const item of ids) {
    if (result.stopped.includes(item.sessionId)) ledger.markStopped(input.runId, item.slotIndex);
  }
  result.ok = result.stopErrors.length === 0;
  if (!result.ok) result.reason = 'stop-incomplete';
  return result;
}

export function sealWorkOrders(
  ledger: SuperAgentLedger,
  input: {
    botSlug: string;
    sessionId: string;
    grantId: string;
    orders: unknown;
    now: string;
  },
): { orderIds: string[] } | { reason: string } {
  const orders = parseWorkOrders(input.orders);
  if (!Array.isArray(orders)) return orders;
  return ledger.seal({ ...input, orders });
}
