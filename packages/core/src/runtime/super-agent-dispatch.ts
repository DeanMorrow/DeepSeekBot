import type { AssignmentActivity, OrchestratorAssignmentAccess } from './bot-runtime.js';

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

const PRIVATE_MARKERS = ['[private-chat]', 'BEGIN PRIVATE', '私聊原文'];
const RUNNING: ReadonlySet<AssignmentActivity> = new Set(['working', 'stopping']);

export interface SuperAgentDispatchResult {
  ok: boolean;
  reason?: string;
  adaptation: 'tobs-assignment';
  fullBundleInstalled: false;
  officialInstalled: false;
  source: typeof SUPER_AGENT_SOURCE;
  limits: typeof SUPER_AGENT_LIMITS;
  executor: 'test-executor' | 'host-assignment';
  liveModelDispatch: false;
  dispatched: Array<{ id: string; sessionId: string; outcome: string }>;
  refused: Array<{ id: string; reason: string }>;
  stopped: string[];
}

function plan(task: string): { pieces: string[]; truncated: boolean } | { reason: string } {
  const pieces = task
    .split(/[；;\n]/u)
    .map((piece) => piece.trim())
    .filter(Boolean);
  if (pieces.length === 0) return { reason: 'empty-task' };
  return {
    pieces: pieces.slice(0, SUPER_AGENT_LIMITS.maxSubtasks),
    truncated: pieces.length > SUPER_AGENT_LIMITS.maxSubtasks,
  };
}

function base(executor: SuperAgentDispatchResult['executor']): SuperAgentDispatchResult {
  return {
    ok: false,
    adaptation: 'tobs-assignment',
    fullBundleInstalled: false,
    officialInstalled: false,
    source: SUPER_AGENT_SOURCE,
    limits: SUPER_AGENT_LIMITS,
    executor,
    liveModelDispatch: false,
    dispatched: [],
    refused: [],
    stopped: [],
  };
}

export async function runSuperAgent(
  input: { task?: string | undefined; grantId?: string | undefined; depth?: number | undefined },
  assignments: OrchestratorAssignmentAccess,
  signal: AbortSignal,
  executor: SuperAgentDispatchResult['executor'] = 'host-assignment',
): Promise<SuperAgentDispatchResult> {
  const result = base(executor);
  const depth = input.depth ?? 1;
  if (!Number.isInteger(depth) || depth < 1 || depth > SUPER_AGENT_LIMITS.maxDepth) {
    return { ...result, reason: 'depth-exceeded' };
  }
  if (depth >= SUPER_AGENT_LIMITS.maxDepth) return { ...result, reason: 'depth-exceeded' };
  const planned = plan(input.task ?? '');
  if ('reason' in planned) return { ...result, reason: planned.reason };
  if (input.grantId === undefined || input.grantId.trim() === '') {
    return { ...result, reason: 'grant-required' };
  }
  const grantId = input.grantId.trim();
  const known = assignments
    .grants()
    .some((grant) => grant.id === grantId && grant.revokedAt === undefined);
  if (!known) return { ...result, reason: 'grant-unauthorized' };
  const existing = assignments
    .list()
    .filter((item) => item.continuityKey?.startsWith('super-agent:'));
  const inflight = existing.filter((item) => RUNNING.has(item.activity)).length;
  if (inflight >= SUPER_AGENT_LIMITS.maxConcurrent) return { ...result, reason: 'concurrency' };
  if (existing.length >= SUPER_AGENT_LIMITS.maxBudget) return { ...result, reason: 'budget' };
  let slots = SUPER_AGENT_LIMITS.maxConcurrent - inflight;
  let budget = SUPER_AGENT_LIMITS.maxBudget - existing.length;
  for (const [index, prompt] of planned.pieces.entries()) {
    const id = `sub-${depth}-${index + 1}`;
    if (signal.aborted) {
      result.reason = 'cancelled';
      for (const item of result.dispatched) {
        await assignments.stop(item.sessionId);
        result.stopped.push(item.sessionId);
      }
      return result;
    }
    if (PRIVATE_MARKERS.some((marker) => prompt.includes(marker))) {
      result.refused.push({ id, reason: 'private-leak' });
      continue;
    }
    if (slots <= 0) {
      result.refused.push({ id, reason: 'concurrency' });
      continue;
    }
    if (budget <= 0) {
      result.refused.push({ id, reason: 'budget' });
      continue;
    }
    let outcome;
    try {
      outcome = assignments.create({
        title: prompt.slice(0, 40),
        description: prompt.slice(0, 200),
        instructions: [
          prompt,
          `super-agent depth ${depth + 1}. Do not call super_agent_run again.`,
          'Private memory is not included. Use only this Workspace Grant.',
        ].join('\n'),
        grantId,
        key: `super-agent:${depth}:${index + 1}`,
      });
    } catch (error) {
      const cause =
        error instanceof Error && error.cause instanceof Error ? error.cause.message : '';
      const message = error instanceof Error ? error.message : 'create-failed';
      result.refused.push({ id, reason: cause === '' ? message : `${message}: ${cause}` });
      continue;
    }
    if (outcome.outcome === 'created' || outcome.outcome === 'reused') {
      result.dispatched.push({
        id,
        sessionId: outcome.assignment.sessionId,
        outcome: outcome.outcome,
      });
      slots -= 1;
      budget -= 1;
      continue;
    }
    result.refused.push({ id, reason: outcome.outcome });
  }
  result.ok = result.dispatched.length > 0;
  if (!result.ok && result.reason === undefined) {
    result.reason = result.refused[0]?.reason ?? 'no-dispatch';
  }
  return result;
}
