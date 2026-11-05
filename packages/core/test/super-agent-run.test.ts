import { describe, expect, it } from 'vitest';

import type { OrchestratorAssignmentAccess } from '../src/runtime/bot-runtime.js';
import { runSuperAgent } from '../src/runtime/super-agent-dispatch.js';

function fake(grants: string[] = ['grant-1']) {
  const created: string[] = [];
  const stopped: string[] = [];
  const assignments = {
    grants: () =>
      grants.map((id) => ({
        id,
        botSlug: 'ada',
        workspaceId: 'w',
        workspacePath: '/w',
        workspaceTitle: 'W',
        createdAt: '',
      })),
    list: () => [],
    create: (input: { title: string; grantId: string; key?: string }) => {
      created.push(input.key ?? input.title);
      return {
        outcome: 'created' as const,
        assignment: {
          sessionId: `sess-${created.length}`,
          title: input.title,
          description: input.title,
          activity: 'working' as const,
          createdAt: '',
          updatedAt: '',
        },
      };
    },
    stop: async (sessionId: string) => {
      stopped.push(sessionId);
      return {
        sessionId,
        title: '',
        description: '',
        activity: 'stopped' as const,
        createdAt: '',
        updatedAt: '',
      };
    },
    inspect: () => undefined,
    request: () => {
      throw new Error('unused');
    },
  };
  return { assignments: assignments as unknown as OrchestratorAssignmentAccess, created, stopped };
}

describe('super_agent_run', () => {
  it('refuses an empty grant and does not create an assignment', async () => {
    const host = fake();
    const signal = new AbortController().signal;
    const result = await runSuperAgent(
      { task: '读日志' },
      host.assignments,
      signal,
      'test-executor',
    );
    expect(result).toMatchObject({
      ok: false,
      reason: 'grant-required',
      officialInstalled: false,
      fullBundleInstalled: false,
      liveModelDispatch: false,
    });
    expect(host.created).toEqual([]);
  });

  it('refuses a grant this Bot does not hold', async () => {
    const host = fake(['grant-1']);
    const result = await runSuperAgent(
      { task: '读日志', grantId: 'other' },
      host.assignments,
      new AbortController().signal,
      'test-executor',
    );
    expect(result.reason).toBe('grant-unauthorized');
    expect(host.created).toEqual([]);
  });

  it('dispatches two pieces and holds the third for the concurrency cap', async () => {
    const host = fake();
    const result = await runSuperAgent(
      { task: '读日志；改测试；写说明', grantId: 'grant-1' },
      host.assignments,
      new AbortController().signal,
      'test-executor',
    );
    expect(result.ok).toBe(true);
    expect(result.dispatched.map((item) => item.sessionId)).toEqual(['sess-1', 'sess-2']);
    expect(result.refused).toEqual([{ id: 'sub-1-3', reason: 'concurrency' }]);
  });

  it('does not send a private marker into an assignment', async () => {
    const host = fake();
    const result = await runSuperAgent(
      { task: '读日志；BEGIN PRIVATE secret', grantId: 'grant-1' },
      host.assignments,
      new AbortController().signal,
      'test-executor',
    );
    expect(result.dispatched).toHaveLength(1);
    expect(result.refused).toEqual([{ id: 'sub-1-2', reason: 'private-leak' }]);
    expect(host.created.some((key) => key.includes('PRIVATE'))).toBe(false);
  });

  it('stops assignments created before cancellation', async () => {
    const controller = new AbortController();
    const host = fake();
    host.assignments.create = () => {
      controller.abort();
      return {
        outcome: 'created',
        assignment: {
          sessionId: 'sess-1',
          title: '读日志',
          description: '读日志',
          activity: 'working',
          createdAt: '',
          updatedAt: '',
        },
      };
    };
    const result = await runSuperAgent(
      { task: '读日志；改测试', grantId: 'grant-1' },
      host.assignments,
      controller.signal,
      'test-executor',
    );
    expect(result.reason).toBe('cancelled');
    expect(result.stopped).toEqual(['sess-1']);
  });

  it('refuses depth 2 before creating anything', async () => {
    const host = fake();
    const result = await runSuperAgent(
      { task: '读日志', grantId: 'grant-1', depth: 2 },
      host.assignments,
      new AbortController().signal,
      'test-executor',
    );
    expect(result.reason).toBe('depth-exceeded');
    expect(host.created).toEqual([]);
  });
});
