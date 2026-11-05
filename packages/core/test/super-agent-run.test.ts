import { writeFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { AssignmentSummary } from '../src/runtime/bot-runtime.js';
import {
  cancelSuperAgentRun,
  occupiesSuperAgentSlot,
  runSuperAgent,
  type SuperAgentExecutor,
} from '../src/runtime/super-agent-dispatch.js';

const SECRET = '客户账号 13800000000 的合同原文';
const ORDER = {
  goal: '列出授权目录里的日志文件名',
  steps: ['只读取该 Workspace Grant 对应目录', '把文件名写成清单'],
  acceptance: '清单只含该目录下的文件名',
};

function assignment(
  partial: Partial<AssignmentSummary> & Pick<AssignmentSummary, 'sessionId'>,
): AssignmentSummary {
  const { continuityKey, executionWait, latestReport, permission, archivedAt, ...rest } = partial;
  return {
    title: 'Subtask',
    description: 'bounded',
    activity: 'working',
    createdAt: '',
    updatedAt: '',
    ...rest,
    ...(continuityKey === undefined ? {} : { continuityKey }),
    ...(executionWait === undefined ? {} : { executionWait }),
    ...(latestReport === undefined ? {} : { latestReport }),
    ...(permission === undefined ? {} : { permission }),
    ...(archivedAt === undefined ? {} : { archivedAt }),
  };
}

function executor(list: AssignmentSummary[] = []): SuperAgentExecutor & {
  created: Array<{ title: string; description: string; instructions?: string; key?: string }>;
  stopped: string[];
  box: { failOn: number | undefined; stopFail: string | undefined };
} {
  const created: Array<{
    title: string;
    description: string;
    instructions?: string;
    key?: string;
  }> = [];
  const stopped: string[] = [];
  const box = {
    failOn: undefined as number | undefined,
    stopFail: undefined as string | undefined,
  };
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
      const row = assignment({
        sessionId: `sess-${calls}`,
        activity: 'working',
        ...(input.key === undefined ? {} : { continuityKey: input.key }),
        permission: {
          grantId: input.grantId,
          workspaceId: 'w',
          primaryCwd: '/w',
          mode: 'workspace-write',
          approval: 'ask',
          presetRevision: 0,
        },
      });
      list.push(row);
      return { outcome: 'created', assignment: row };
    },
    stop: async (sessionId) => {
      if (box.stopFail === sessionId) throw new Error('stop-broke');
      stopped.push(sessionId);
      return assignment({ sessionId, activity: 'stopped' });
    },
  };
  return Object.assign(host, { created, stopped, box });
}

const caller = { sessionId: 'orch-1', botSlug: 'ada', grantId: 'grant-1' };

describe('super_agent_run product contract', () => {
  it('gives the child a goal, steps and acceptance, and drops an unauthorized parent blob', async () => {
    const host = executor();
    const result = await runSuperAgent(
      {
        workOrders: [ORDER],
        rawParentText: SECRET,
        ...caller,
      },
      host,
      new AbortController().signal,
    );
    expect(result.ok).toBe(true);
    expect(result.liveModelDispatch).toBe(false);
    expect(result.mayIncurModelCost).toBe(false);
    const child = JSON.stringify(host.created[0]);
    expect(child).toContain(ORDER.goal);
    expect(child).toContain(ORDER.steps[0]);
    expect(child).toContain(ORDER.acceptance);
    expect(child).toContain('rawParentText');
    expect(child).not.toContain('13800000000');
    writeFileSync(
      '/tmp/super-agent-brief.stdout.txt',
      `${JSON.stringify(
        {
          source: 'packages/core/src/runtime/super-agent-dispatch.ts',
          childKnows: ORDER.goal,
          secretPresent: child.includes('13800000000'),
          instructions: host.created[0]?.instructions,
        },
        null,
        2,
      )}\n`,
    );
  });

  it('refuses a raw transcript that is not a work order and creates nothing', async () => {
    const host = executor();
    const result = await runSuperAgent(
      { workOrders: SECRET, ...caller },
      host,
      new AbortController().signal,
    );
    expect(result.reason).toBe('task-source-required');
    expect(host.created).toEqual([]);
  });

  it('refuses another session of the same Bot replaying a different payload', async () => {
    const host = executor();
    const started = await runSuperAgent(
      { workOrders: [ORDER], ...caller, runId: undefined },
      host,
      new AbortController().signal,
    );
    const hijack = await runSuperAgent(
      {
        workOrders: [{ ...ORDER, goal: '改成别的目标' }],
        sessionId: 'orch-2',
        botSlug: 'ada',
        grantId: 'grant-1',
        runId: started.runId,
      },
      host,
      new AbortController().signal,
    );
    expect(hijack.reason).toBe('run-owner-mismatch');
    expect(host.created).toHaveLength(1);
  });

  it('does not let a finished idle assignment keep a concurrency slot', () => {
    expect(
      occupiesSuperAgentSlot(
        assignment({
          sessionId: 'done',
          activity: 'idle',
          latestReport: { state: 'completed', summary: 'done', at: 't' },
        }),
      ),
    ).toBe(false);
    expect(
      occupiesSuperAgentSlot(
        assignment({
          sessionId: 'queued',
          activity: 'idle',
          executionWait: 'waiting-capacity',
        }),
      ),
    ).toBe(true);
  });

  it('counts two queued waits as full and still allows work after a completed idle one', async () => {
    const blocked = executor([
      assignment({
        sessionId: 'q1',
        continuityKey: 'super-agent:old:aaaaaaaaaaaaaaaa:1',
        activity: 'idle',
        executionWait: 'waiting-capacity',
      }),
      assignment({
        sessionId: 'q2',
        continuityKey: 'super-agent:old:aaaaaaaaaaaaaaaa:2',
        activity: 'working',
      }),
    ]);
    const refused = await runSuperAgent(
      { workOrders: [ORDER], ...caller },
      blocked,
      new AbortController().signal,
    );
    expect(refused.reason).toBe('concurrency');
    expect(blocked.created).toEqual([]);
    const open = executor([
      assignment({
        sessionId: 'done',
        continuityKey: 'super-agent:old:bbbbbbbbbbbbbbbb:1',
        activity: 'idle',
        latestReport: { state: 'completed', summary: 'done', at: 't' },
      }),
    ]);
    const again = await runSuperAgent(
      { workOrders: [ORDER], ...caller, sessionId: 'orch-3' },
      open,
      new AbortController().signal,
    );
    expect(again.ok).toBe(true);
  });

  it('continues stopping the rest when one stop throws', async () => {
    const host = executor();
    const controller = new AbortController();
    let created = 0;
    const original = host.create.bind(host);
    host.create = (input) => {
      const outcome = original(input);
      created += 1;
      if (created === 2) controller.abort();
      return outcome;
    };
    host.box.stopFail = 'sess-1';
    const result = await runSuperAgent(
      {
        workOrders: [ORDER, { ...ORDER, goal: '第二项只核对文件数量' }],
        ...caller,
        sessionId: 'orch-4',
      },
      host,
      controller.signal,
    );
    expect(result.reason).toBe('cancelled');
    expect(result.stopErrors).toEqual([{ sessionId: 'sess-1', reason: 'stop-broke' }]);
    expect(result.stopped).toEqual(['sess-2']);
  });

  it('cancels only that run after the tool has returned', async () => {
    const host = executor();
    const started = await runSuperAgent(
      { workOrders: [ORDER], ...caller, sessionId: 'orch-5' },
      host,
      new AbortController().signal,
    );
    expect(started.ok).toBe(true);
    const cancelled = await cancelSuperAgentRun(
      { runId: started.runId, sessionId: 'orch-5', botSlug: 'ada', grantId: 'grant-1' },
      host,
    );
    expect(cancelled.stopped).toEqual(['sess-1']);
    const other = await cancelSuperAgentRun(
      { runId: started.runId, sessionId: 'orch-9', botSlug: 'ada', grantId: 'grant-1' },
      host,
    );
    expect(other.reason).toBe('run-owner-mismatch');
  });

  it('serializes two same-Bot requests so the second sees the first slot', async () => {
    const list: AssignmentSummary[] = [
      assignment({
        sessionId: 'busy',
        continuityKey: 'super-agent:held:cccccccccccccccc:1',
        activity: 'working',
      }),
    ];
    const host = executor(list);
    const signal = new AbortController().signal;
    const [first, second] = await Promise.all([
      runSuperAgent({ workOrders: [ORDER], ...caller, sessionId: 'orch-6' }, host, signal),
      runSuperAgent(
        { workOrders: [{ ...ORDER, goal: '同时来的另一项' }], ...caller, sessionId: 'orch-7' },
        host,
        signal,
      ),
    ]);
    const created = [first, second].filter((item) => item.ok);
    expect(created).toHaveLength(1);
    expect(host.created).toHaveLength(1);
  });
});
