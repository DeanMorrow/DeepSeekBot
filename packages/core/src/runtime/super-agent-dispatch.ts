import { randomUUID } from 'node:crypto';

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
  /** True only after the host assignment path has scheduled work that can start a model. */
  liveModelDispatch: boolean;
  scheduled: boolean;
  mayIncurModelCost: boolean;
  dispatched: Array<{ id: string; sessionId: string; outcome: string; key: string }>;
  refused: Array<{ id: string; reason: string }>;
  stopped: string[];
}

function pieceCount(task: string): number | { reason: string } {
  const count = task
    .split(/[；;\n]/u)
    .map((piece) => piece.trim())
    .filter(Boolean).length;
  if (count === 0) return { reason: 'empty-task' };
  return Math.min(count, SUPER_AGENT_LIMITS.maxSubtasks);
}

function nonTerminal(item: AssignmentSummary): boolean {
  if (item.archivedAt !== undefined || item.activity === 'stopped') return false;
  return true;
}

function brief(runId: string, subtaskId: string, grantId: string): string {
  return JSON.stringify({
    source: {
      repository: SUPER_AGENT_SOURCE.repository,
      commit: SUPER_AGENT_SOURCE.commit,
      runId,
      subtaskId,
    },
    authorization: {
      grantId,
      scope: 'workspace-grant-only',
      privateMemory: false,
      rawParentText: false,
    },
  });
}

async function stopCreated(
  executor: SuperAgentExecutor,
  sessionIds: readonly string[],
  stopped: string[],
): Promise<void> {
  for (const sessionId of sessionIds) {
    if (stopped.includes(sessionId)) continue;
    await executor.stop(sessionId);
    stopped.push(sessionId);
  }
}

export async function runSuperAgent(
  input: {
    task?: string | undefined;
    grantId?: string | undefined;
    depth?: number | undefined;
    runId?: string | undefined;
  },
  executor: SuperAgentExecutor,
  signal: AbortSignal,
): Promise<SuperAgentDispatchResult> {
  const runId = input.runId?.trim() || randomUUID();
  const result: SuperAgentDispatchResult = {
    ok: false,
    runId,
    adaptation: 'tobs-assignment',
    fullBundleInstalled: false,
    officialInstalled: false,
    source: SUPER_AGENT_SOURCE,
    limits: SUPER_AGENT_LIMITS,
    executor: executor.kind,
    liveModelDispatch: false,
    scheduled: false,
    mayIncurModelCost: false,
    dispatched: [],
    refused: [],
    stopped: [],
  };
  const depth = input.depth ?? 1;
  if (!Number.isInteger(depth) || depth < 1 || depth >= SUPER_AGENT_LIMITS.maxDepth) {
    return { ...result, reason: 'depth-exceeded' };
  }
  const count = pieceCount(input.task ?? '');
  if (typeof count !== 'number') return { ...result, reason: count.reason };
  if (input.grantId === undefined || input.grantId.trim() === '') {
    return { ...result, reason: 'grant-required' };
  }
  const grantId = input.grantId.trim();
  const known = executor
    .grants()
    .some((grant) => grant.id === grantId && grant.revokedAt === undefined);
  if (!known) return { ...result, reason: 'grant-unauthorized' };

  const prefix = `super-agent:${runId}:`;
  const existing = executor.list().filter((item) => item.continuityKey?.startsWith('super-agent:'));
  const foreign = existing.filter(
    (item) => !item.continuityKey?.startsWith(prefix) && nonTerminal(item),
  );
  if (foreign.length >= SUPER_AGENT_LIMITS.maxBudget) return { ...result, reason: 'budget' };
  if (foreign.length >= SUPER_AGENT_LIMITS.maxConcurrent)
    return { ...result, reason: 'concurrency' };

  const createdThisCall: string[] = [];
  const fail = async (reason: string): Promise<SuperAgentDispatchResult> => {
    await stopCreated(executor, createdThisCall, result.stopped);
    result.ok = false;
    result.reason = reason;
    result.liveModelDispatch = executor.kind === 'host-assignment' && createdThisCall.length > 0;
    result.scheduled = result.liveModelDispatch;
    result.mayIncurModelCost = result.liveModelDispatch;
    return result;
  };

  try {
    let opened = foreign.length;
    for (let index = 0; index < count; index += 1) {
      const id = `sub-${depth}-${index + 1}`;
      const key = `${prefix}${index + 1}`;
      if (signal.aborted) return fail('cancelled');
      const already = existing.find((item) => item.continuityKey === key);
      const retry = already !== undefined && nonTerminal(already);
      if (!retry && opened >= SUPER_AGENT_LIMITS.maxConcurrent) {
        result.refused.push({ id, reason: 'concurrency' });
        continue;
      }
      if (!retry && opened >= SUPER_AGENT_LIMITS.maxBudget) {
        result.refused.push({ id, reason: 'budget' });
        continue;
      }
      const text = brief(runId, id, grantId);
      let outcome;
      try {
        outcome = executor.create({
          title: `Subtask ${index + 1}`,
          description: `Grant ${grantId}. No parent text.`,
          instructions: text,
          grantId,
          key,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'create-failed';
        result.refused.push({ id, reason: message });
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
  result.ok = result.dispatched.length > 0 && result.stopped.length === 0;
  if (!result.ok && result.reason === undefined)
    result.reason = result.refused[0]?.reason ?? 'no-dispatch';
  return result;
}
