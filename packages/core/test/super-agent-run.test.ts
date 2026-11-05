import { describe, expect, it } from 'vitest';

import type { AssignmentSummary } from '../src/runtime/bot-runtime.js';
import { runSuperAgent, type SuperAgentExecutor } from '../src/runtime/super-agent-dispatch.js';

const SENSITIVE = '客户账号 13800000000 的合同在抽屉里';

function assignment(
  partial: Partial<AssignmentSummary> & Pick<AssignmentSummary, 'sessionId'>,
): AssignmentSummary {
  const { continuityKey, executionWait, ...rest } = partial;
  return {
    title: 'Subtask',
    description: 'Grant grant-1. No parent text.',
    activity: 'working',
    createdAt: '',
    updatedAt: '',
    ...rest,
    ...(continuityKey === undefined ? {} : { continuityKey }),
    ...(executionWait === undefined ? {} : { executionWait }),
  };
}

function executor(list: AssignmentSummary[] = []): SuperAgentExecutor & {
  created: Array<{ title: string; description: string; instructions?: string; key?: string }>;
  stopped: string[];
  box: { failOn: number | undefined };
} {
  const created: Array<{
    title: string;
    description: string;
    instructions?: string;
    key?: string;
  }> = [];
  const stopped: string[] = [];
  const box = { failOn: undefined as number | undefined };
  let calls = 0;
  const host: SuperAgentExecutor = {
    kind: 'test-executor',
    grants: () => [
      {
        id: 'grant-1',
        botSlug: 'ada',
        workspaceId: 'w',
        workspacePath: '/w',
        workspaceTitle: 'W',
        createdAt: '',
      },
    ],
    list: () => list,
    create: (input) => {
      calls += 1;
      if (box.failOn !== undefined && calls === box.failOn) throw new Error('create-broke');
      created.push(input);
      return {
        outcome: 'created',
        assignment: assignment({
          sessionId: `sess-${calls}`,
          ...(input.key === undefined ? {} : { continuityKey: input.key }),
        }),
      };
    },
    stop: async (sessionId) => {
      stopped.push(sessionId);
      return assignment({ sessionId, activity: 'stopped' });
    },
  };
  return Object.assign(host, { created, stopped, box });
}

describe('super_agent_run regressions', () => {
  it('does not copy unmarked parent text into the child brief', async () => {
    const host = executor();
    const result = await runSuperAgent(
      { task: SENSITIVE, grantId: 'grant-1' },
      host,
      new AbortController().signal,
    );
    expect(result.ok).toBe(true);
    expect(result.liveModelDispatch).toBe(false);
    expect(result.mayIncurModelCost).toBe(false);
    const child = host.created[0];
    expect(JSON.stringify(child)).not.toContain('13800000000');
    expect(JSON.stringify(child)).not.toContain('抽屉');
    expect(child?.instructions).toContain('"rawParentText":false');
    expect(child?.instructions).toContain('"scope":"workspace-grant-only"');
  });

  it('gives a new run its own continuity keys and reuses them on retry', async () => {
    const first = executor();
    const started = await runSuperAgent(
      { task: '读日志', grantId: 'grant-1', runId: 'run-a' },
      first,
      new AbortController().signal,
    );
    const second = executor();
    await runSuperAgent(
      { task: '另一件事', grantId: 'grant-1', runId: 'run-b' },
      second,
      new AbortController().signal,
    );
    expect(first.created[0]?.key).toBe('super-agent:run-a:1');
    expect(second.created[0]?.key).toBe('super-agent:run-b:1');
    expect(started.runId).toBe('run-a');
    const retry = executor([
      assignment({ sessionId: 'sess-old', continuityKey: 'super-agent:run-a:1', activity: 'idle' }),
    ]);
    retry.create = (input) => ({
      outcome: 'reused',
      assignment: assignment({
        sessionId: 'sess-old',
        activity: 'idle',
        ...(input.key === undefined ? {} : { continuityKey: input.key }),
      }),
    });
    const again = await runSuperAgent(
      { task: '读日志', grantId: 'grant-1', runId: 'run-a' },
      retry,
      new AbortController().signal,
    );
    expect(again.dispatched[0]).toMatchObject({ sessionId: 'sess-old', outcome: 'reused' });
  });

  it('stops the assignment created before a later create fails', async () => {
    const host = executor();
    host.box.failOn = 2;
    const result = await runSuperAgent(
      { task: '读日志；改测试', grantId: 'grant-1' },
      host,
      new AbortController().signal,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('create-failed');
    expect(result.stopped).toEqual(['sess-1']);
  });

  it('stops created assignments when the caller cancels after the first create', async () => {
    const controller = new AbortController();
    const host = executor();
    const original = host.create.bind(host);
    host.create = (input) => {
      const outcome = original(input);
      controller.abort();
      return outcome;
    };
    const result = await runSuperAgent(
      { task: '读日志；改测试', grantId: 'grant-1' },
      host,
      controller.signal,
    );
    expect(result.reason).toBe('cancelled');
    expect(result.stopped).toEqual(['sess-1']);
  });

  it('counts a queued assignment as non-terminal concurrency', async () => {
    const host = executor([
      assignment({
        sessionId: 'queued',
        continuityKey: 'super-agent:other:1',
        activity: 'idle',
        executionWait: 'waiting-capacity',
      }),
      assignment({
        sessionId: 'working',
        continuityKey: 'super-agent:other:2',
        activity: 'working',
      }),
    ]);
    const result = await runSuperAgent(
      { task: '读日志', grantId: 'grant-1', runId: 'fresh' },
      host,
      new AbortController().signal,
    );
    expect(result.reason).toBe('concurrency');
    expect(host.created).toEqual([]);
  });

  it('refuses a missing or foreign grant before create', async () => {
    const host = executor();
    expect(
      (await runSuperAgent({ task: '读日志' }, host, new AbortController().signal)).reason,
    ).toBe('grant-required');
    expect(
      (
        await runSuperAgent(
          { task: '读日志', grantId: 'other' },
          host,
          new AbortController().signal,
        )
      ).reason,
    ).toBe('grant-unauthorized');
    expect(host.created).toEqual([]);
  });
});
