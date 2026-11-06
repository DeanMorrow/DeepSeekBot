import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { attachOperationalModule, mountOperationalDatabase } from '../src/database/owner.js';
import { BOT_HARNESS_SCHEMA_PLAN } from '../src/database/schema-plan.js';
import type { AssignmentSummary } from '../src/runtime/bot-runtime.js';
import { cancelSuperAgentRun, runSuperAgent } from '../src/runtime/super-agent-dispatch.js';
import { createSuperAgentLedger, parseWorkOrders } from '../src/runtime/super-agent-ledger.js';
import { createTempRoot, FIXED_NOW, trackTestOwner } from './helpers.js';
import { createTestWorkspaceGrants, TEST_GRANT_ID } from './workspace-grant-fixture.js';

const SECRET = '客户账号 13800000000 的合同原文';
const ORDER = {
  goal: '列出授权目录里的日志文件名',
  steps: ['只读取该 Workspace Grant 对应目录', '把文件名写成清单'],
  acceptance: '清单只含该目录下的文件名',
};

function open(home = createTempRoot('super-agent-ledger-')) {
  mkdirSync(home, { recursive: true });
  const owner = trackTestOwner(
    mountOperationalDatabase({
      dshHome: home,
      schemaPlan: BOT_HARNESS_SCHEMA_PLAN,
      now: FIXED_NOW,
    }),
  );
  const grants = createTestWorkspaceGrants(owner, join(home, 'project'));
  const ledger = createSuperAgentLedger(attachOperationalModule(owner, 'super-agent'));
  return { home, owner, grants, ledger };
}

function recording(
  grants: ReturnType<typeof createTestWorkspaceGrants>,
  list: AssignmentSummary[] = [],
) {
  const created: Array<{ instructions?: string; key?: string; title: string }> = [];
  const stopped: string[] = [];
  const box = {
    stopFail: undefined as string | undefined,
    failOn: undefined as number | undefined,
  };
  let calls = 0;
  return {
    created,
    stopped,
    box,
    executor: {
      kind: 'test-executor' as const,
      grants: () => grants.list('ada'),
      list: () => list,
      create: (input: { title: string; instructions?: string; key?: string; grantId: string }) => {
        calls += 1;
        if (box.failOn === calls) throw new Error('create-broke');
        created.push(input);
        const row: AssignmentSummary = {
          sessionId: `sess-${calls}`,
          title: input.title,
          description: input.title,
          activity: 'working',
          createdAt: '',
          updatedAt: '',
          ...(input.key === undefined ? {} : { continuityKey: input.key }),
        };
        list.push(row);
        return { outcome: 'created' as const, assignment: row };
      },
      stop: async (sessionId: string) => {
        if (box.stopFail === sessionId) throw new Error('stop-broke');
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
    },
  };
}

describe('durable super-agent ledger', () => {
  it('seals a work order the child can execute and does not copy an outside secret', async () => {
    const { ledger, grants } = open();
    const sealed = ledger.seal({
      botSlug: 'ada',
      sessionId: 'orch-1',
      grantId: TEST_GRANT_ID,
      orders: [ORDER],
      now: FIXED_NOW().toISOString(),
    });
    const host = recording(grants);
    const result = await runSuperAgent(
      {
        orderIds: sealed.orderIds,
        grantId: TEST_GRANT_ID,
        sessionId: 'orch-1',
        botSlug: 'ada',
        now: FIXED_NOW().toISOString(),
        rawParentText: SECRET,
      },
      ledger,
      host.executor,
      new AbortController().signal,
    );
    expect(result.ok).toBe(true);
    expect(result.liveModelDispatch).toBe(false);
    const text = host.created[0]?.instructions ?? '';
    expect(text).toContain(ORDER.goal);
    expect(text).toContain(ORDER.acceptance);
    expect(text).not.toContain('13800000000');
    expect(text).toContain('Private memory is not included');
    writeFileSync(
      '/tmp/super-agent-brief.stdout.txt',
      `${JSON.stringify({ source: 'packages/core/src/runtime/super-agent-ledger.ts', secretPresent: text.includes('13800000000'), instructions: text }, null, 2)}\n`,
    );
  });

  it('refuses a forged authorization flag instead of sealing it', () => {
    const parsed = parseWorkOrders([{ ...ORDER, privateMemory: false, rawParentText: false }]);
    expect(parsed).toEqual({ reason: 'forged-authorization' });
  });

  it('rejects another session after the process ledger is reopened', async () => {
    const first = open();
    const sealed = first.ledger.seal({
      botSlug: 'ada',
      sessionId: 'orch-1',
      grantId: TEST_GRANT_ID,
      orders: [ORDER],
      now: FIXED_NOW().toISOString(),
    });
    const host = recording(first.grants);
    const started = await runSuperAgent(
      {
        orderIds: sealed.orderIds,
        grantId: TEST_GRANT_ID,
        sessionId: 'orch-1',
        botSlug: 'ada',
        now: FIXED_NOW().toISOString(),
      },
      first.ledger,
      host.executor,
      new AbortController().signal,
    );
    first.owner.close();
    const reopened = trackTestOwner(
      mountOperationalDatabase({
        dshHome: first.home,
        schemaPlan: BOT_HARNESS_SCHEMA_PLAN,
        now: FIXED_NOW,
      }),
    );
    const ledger = createSuperAgentLedger(attachOperationalModule(reopened, 'super-agent'));
    const grants = createTestWorkspaceGrants(reopened, join(first.home, 'project'));
    const attack = recording(grants);
    const hijack = await runSuperAgent(
      {
        orderIds: sealed.orderIds,
        grantId: TEST_GRANT_ID,
        sessionId: 'orch-2',
        botSlug: 'ada',
        runId: started.runId,
        now: FIXED_NOW().toISOString(),
      },
      ledger,
      attack.executor,
      new AbortController().signal,
    );
    expect(hijack.reason).toBe('order-owner-mismatch');
    expect(attack.created).toEqual([]);
    const own = ledger.seal({
      botSlug: 'ada',
      sessionId: 'orch-2',
      grantId: TEST_GRANT_ID,
      orders: [{ ...ORDER, goal: '换成另一个目标' }],
      now: FIXED_NOW().toISOString(),
    });
    const replay = await runSuperAgent(
      {
        orderIds: own.orderIds,
        grantId: TEST_GRANT_ID,
        sessionId: 'orch-2',
        botSlug: 'ada',
        runId: started.runId,
        now: FIXED_NOW().toISOString(),
      },
      ledger,
      attack.executor,
      new AbortController().signal,
    );
    expect(replay.reason).toBe('run-owner-mismatch');
    expect(attack.created).toEqual([]);
  });

  it('refuses dispatch after the Workspace Grant is revoked', async () => {
    const { ledger, grants } = open();
    const sealed = ledger.seal({
      botSlug: 'ada',
      sessionId: 'orch-1',
      grantId: TEST_GRANT_ID,
      orders: [ORDER],
      now: FIXED_NOW().toISOString(),
    });
    grants.revoke('ada', TEST_GRANT_ID);
    const host = recording(grants);
    const result = await runSuperAgent(
      {
        orderIds: sealed.orderIds,
        grantId: TEST_GRANT_ID,
        sessionId: 'orch-1',
        botSlug: 'ada',
        now: FIXED_NOW().toISOString(),
      },
      ledger,
      host.executor,
      new AbortController().signal,
    );
    expect(result.reason).toBe('grant-unauthorized');
    expect(host.created).toEqual([]);
  });

  it('reserves slots so a second concurrent run cannot create the same capacity', async () => {
    const { ledger, grants } = open();
    const second = { ...ORDER, goal: '核对授权目录中的文件数量' };
    const leftSeal = ledger.seal({
      botSlug: 'ada',
      sessionId: 'orch-a',
      grantId: TEST_GRANT_ID,
      orders: [ORDER, second],
      now: FIXED_NOW().toISOString(),
    });
    const rightSeal = ledger.seal({
      botSlug: 'ada',
      sessionId: 'orch-b',
      grantId: TEST_GRANT_ID,
      orders: [ORDER, second],
      now: FIXED_NOW().toISOString(),
    });
    const host = recording(grants);
    const signal = new AbortController().signal;
    const [left, right] = await Promise.all([
      runSuperAgent(
        {
          orderIds: leftSeal.orderIds,
          grantId: TEST_GRANT_ID,
          sessionId: 'orch-a',
          botSlug: 'ada',
          now: FIXED_NOW().toISOString(),
        },
        ledger,
        host.executor,
        signal,
      ),
      runSuperAgent(
        {
          orderIds: rightSeal.orderIds,
          grantId: TEST_GRANT_ID,
          sessionId: 'orch-b',
          botSlug: 'ada',
          now: FIXED_NOW().toISOString(),
        },
        ledger,
        host.executor,
        signal,
      ),
    ]);
    expect([left, right].filter((item) => item.ok)).toHaveLength(1);
    expect([left, right].some((item) => item.reason === 'concurrency')).toBe(true);
    expect(host.created).toHaveLength(2);
  });

  it('stops the first child when the next create fails, and continues if one stop throws', async () => {
    const { ledger, grants } = open();
    const sealed = ledger.seal({
      botSlug: 'ada',
      sessionId: 'orch-9',
      grantId: TEST_GRANT_ID,
      orders: [ORDER, { ...ORDER, goal: '核对授权目录中的文件数量' }],
      now: FIXED_NOW().toISOString(),
    });
    const host = recording(grants);
    host.box.failOn = 2;
    host.box.stopFail = 'sess-1';
    const result = await runSuperAgent(
      {
        orderIds: sealed.orderIds,
        grantId: TEST_GRANT_ID,
        sessionId: 'orch-9',
        botSlug: 'ada',
        now: FIXED_NOW().toISOString(),
      },
      ledger,
      host.executor,
      new AbortController().signal,
    );
    expect(result.reason).toBe('create-failed');
    expect(result.stopErrors).toEqual([{ sessionId: 'sess-1', reason: 'stop-broke' }]);
  });
});
