import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Official research prototype. Not SuperAGI, and not a Tobs persona. */
export const OFFICIAL_SUPER_AGENT = {
  repository: 'deepseek-ai/dsh-superagent-prototype',
  license: 'MIT',
  kind: 'dedicated-dsh-profile-bundle',
  routerPreset: 'dsh-superagent-router',
  workerPreset: 'dsh-superagent-worker',
  installedHere: false,
};

export const SUPER_AGENT_LIMITS = {
  maxDepth: 2,
  maxConcurrent: 2,
  maxSubtasks: 3,
  maxBudget: 3,
};

export const MANIFEST_PATH = '.botharness/super-agent.json';
export const SKILL_NAME = 'super-agent';

const ORCHESTRATOR_FORBIDDEN = ['bot_subagent', 'subagent', 'subagent_fork'];

export function readManifest(botDir) {
  const path = join(botDir, MANIFEST_PATH);
  if (!existsSync(path)) return undefined;
  const value = JSON.parse(readFileSync(path, 'utf8'));
  if (value?.role !== 'super-agent-contract' || value.officialInstalled !== false) return undefined;
  return value;
}

/**
 * A Soul sentence is not a mount. The Bot is equipped only when the contract
 * file and the skill bundle are both in its Memory. That still does not mean
 * the official package is installed or that a live tool has been called.
 */
export function inspectBot(botDir, liveCalls = []) {
  const manifest = readManifest(botDir);
  const skill = existsSync(join(botDir, '.dsh', 'skills', SKILL_NAME, 'SKILL.md'));
  const calls = liveCalls.filter((call) => call?.botId && call.callId);
  return {
    botDir,
    equipped: Boolean(manifest && skill),
    officialPackage: OFFICIAL_SUPER_AGENT.repository,
    officialInstalled: false,
    soulAlone: false,
    parentTool: manifest?.parentTool ?? null,
    forbiddenOnOrchestrator: manifest ? ORCHESTRATOR_FORBIDDEN : [],
    limits: manifest?.limits ?? null,
    inheritsPrivateMemory: false,
    liveCalls: calls,
    invocation: calls.length > 0 ? 'evidenced' : 'untested',
  };
}

export function planTask(task, depth = 1) {
  if (depth > SUPER_AGENT_LIMITS.maxDepth) {
    return { ok: false, reason: 'depth-exceeded', subtasks: [] };
  }
  const pieces = String(task)
    .split(/[；;\n]/u)
    .map((piece) => piece.trim())
    .filter(Boolean);
  if (pieces.length === 0) return { ok: false, reason: 'empty-task', subtasks: [] };
  const kept = pieces.slice(0, SUPER_AGENT_LIMITS.maxSubtasks);
  return {
    ok: true,
    officialInstalled: false,
    parentTool: 'create_assignment',
    forbiddenOnOrchestrator: ORCHESTRATOR_FORBIDDEN,
    truncated: pieces.length > kept.length,
    subtasks: kept.map((prompt, index) => ({
      id: `sub-${depth}-${index + 1}`,
      prompt,
      depth,
      permission: 'assignment-grant-only',
      privateMemory: null,
    })),
  };
}

export function childPacket(subtask, privateRecords = []) {
  const leaked = privateRecords.some(
    (record) => typeof record?.lesson === 'string' && subtask.prompt.includes(record.lesson),
  );
  if (leaked) return { ok: false, reason: 'private-leak' };
  return {
    ok: true,
    id: subtask.id,
    prompt: subtask.prompt,
    permission: 'assignment-grant-only',
    privateMemory: null,
    tool: 'create_assignment',
  };
}

export function invokeSubtask({
  subtask,
  executor,
  inflight = 0,
  budgetUsed = 0,
  privateRecords = [],
}) {
  if (inflight >= SUPER_AGENT_LIMITS.maxConcurrent)
    return { invoked: false, reason: 'concurrency' };
  if (budgetUsed >= SUPER_AGENT_LIMITS.maxBudget) return { invoked: false, reason: 'budget' };
  if (subtask.depth > SUPER_AGENT_LIMITS.maxDepth)
    return { invoked: false, reason: 'depth-exceeded' };
  const packet = childPacket(subtask, privateRecords);
  if (!packet.ok) return { invoked: false, reason: packet.reason };
  if (typeof executor !== 'function') return { invoked: false, reason: 'no-live-executor', packet };
  const result = executor(packet);
  if (!result?.callId) return { invoked: false, reason: 'no-call-evidence', packet };
  return {
    invoked: true,
    officialInstalled: false,
    callId: result.callId,
    tool: result.tool ?? packet.tool,
    packet,
  };
}

export function aggregate(results) {
  const done = results.filter((item) => item.invoked === true && item.callId);
  return {
    count: done.length,
    callIds: done.map((item) => item.callId),
    officialInstalled: false,
    verified: false,
    reason: done.length === 0 ? 'no-calls' : 'needs-delivery-gate',
  };
}
