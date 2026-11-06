import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { attachOperationalModule, mountOperationalDatabase } from '../src/database/owner.js';
import { BOT_HARNESS_SCHEMA_PLAN } from '../src/database/schema-plan.js';
import type { AssignmentSummary } from '../src/runtime/bot-runtime.js';
import {
  cancelSuperAgentRun,
  runSuperAgent,
  sealWorkOrders,
} from '../src/runtime/super-agent-dispatch.js';
import { createSuperAgentLedger, parseWorkOrders } from '../src/runtime/super-agent-ledger.js';
import {
  createWorkOrderAuthority,
  noteSuperAgentApproval,
  orchestratorToolScope,
  sealToolInput,
} from '../src/runtime/super-agent-authority.js';
import { createToolApprovalRuleStore } from '../src/workspaces/tool-approval-rules.js';
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
  const database = attachOperationalModule(owner, 'super-agent');
  return { home, owner, grants, ledger, database, authority: createWorkOrderAuthority(database) };
}

function sealTrusted(
  env: ReturnType<typeof open>,
  input: { sessionId: string; orders: Array<typeof ORDER> },
) {
  const sourceEventId = `human-${randomUUID()}`;
  const body = input.orders
    .map((order) => [order.goal, ...order.steps, order.acceptance].join('\n'))
    .join('\n');
  env.database.transaction((db) => {
    db.prepare(
      `INSERT INTO source_events (
         source_event_id, source_kind, bot_slug, body, created_at, attempt_state
       ) VALUES (?, 'human-message', 'ada', ?, ?, 'handled')`,
    ).run(sourceEventId, body, FIXED_NOW().toISOString());
  });
  const workOrders = JSON.stringify(input.orders);
  const sealed = sealWorkOrders(
    env.ledger,
    {
      botSlug: 'ada',
      sessionId: input.sessionId,
      grantId: TEST_GRANT_ID,
      orders: input.orders,
      now: FIXED_NOW().toISOString(),
      sourceEventId,
      scopeKey: orchestratorToolScope('', env.grants.list('ada')),
      toolInput: sealToolInput({
        grant_id: TEST_GRANT_ID,
        work_orders: workOrders,
        source_event_id: sourceEventId,
      }),
    },
    env.authority,
  );
  if (!('orderIds' in sealed)) throw new Error(sealed.reason);
  return sealed;
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
    const env = open();
    const { ledger, grants } = env;
    const sealed = sealTrusted(env, { sessionId: 'orch-1', orders: [ORDER] });
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
    expect(text).toContain('Source: human-message');
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
    const sealed = sealTrusted(first, { sessionId: 'orch-1', orders: [ORDER] });
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
    const database = attachOperationalModule(reopened, 'super-agent');
    const own = sealTrusted(
      {
        home: first.home,
        owner: reopened,
        grants,
        ledger,
        database,
        authority: createWorkOrderAuthority(database),
      },
      { sessionId: 'orch-2', orders: [{ ...ORDER, goal: '换成另一个目标' }] },
    );
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
    const env = open();
    const { ledger, grants } = env;
    const sealed = sealTrusted(env, { sessionId: 'orch-1', orders: [ORDER] });
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
    const env = open();
    const { ledger, grants } = env;
    const second = { ...ORDER, goal: '核对授权目录中的文件数量' };
    const leftSeal = sealTrusted(env, { sessionId: 'orch-a', orders: [ORDER, second] });
    const rightSeal = sealTrusted(env, { sessionId: 'orch-b', orders: [ORDER, second] });
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
    const env = open();
    const { ledger, grants } = env;
    const sealed = sealTrusted(env, {
      sessionId: 'orch-9',
      orders: [ORDER, { ...ORDER, goal: '核对授权目录中的文件数量' }],
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

  it('refuses a model-written goal that has no human message and no exact approval', () => {
    const env = open();
    const refused = sealWorkOrders(
      env.ledger,
      {
        botSlug: 'ada',
        sessionId: 'orch-1',
        grantId: TEST_GRANT_ID,
        orders: [{ ...ORDER, goal: SECRET }],
        now: FIXED_NOW().toISOString(),
        scopeKey: orchestratorToolScope('', env.grants.list('ada')),
        toolInput: sealToolInput({
          grant_id: TEST_GRANT_ID,
          work_orders: JSON.stringify([{ ...ORDER, goal: SECRET }]),
        }),
      },
      env.authority,
    );
    expect(refused).toEqual({ reason: 'approval-required' });
    const count = env.database.read(
      (db) => (db.prepare('SELECT COUNT(*) AS n FROM super_agent_orders').get() as { n: number }).n,
    );
    expect(count).toBe(0);
  });

  it('refuses a cited human message that does not contain the goal', () => {
    const env = open();
    env.database.transaction((db) => {
      db.prepare(
        `INSERT INTO source_events (
           source_event_id, source_kind, bot_slug, body, created_at, attempt_state
         ) VALUES ('human-short', 'human-message', 'ada', ?, ?, 'handled')`,
      ).run('请只列出日志文件名', FIXED_NOW().toISOString());
    });
    const refused = sealWorkOrders(
      env.ledger,
      {
        botSlug: 'ada',
        sessionId: 'orch-1',
        grantId: TEST_GRANT_ID,
        orders: [ORDER],
        now: FIXED_NOW().toISOString(),
        sourceEventId: 'human-short',
        scopeKey: orchestratorToolScope('', env.grants.list('ada')),
        toolInput: sealToolInput({
          grant_id: TEST_GRANT_ID,
          work_orders: JSON.stringify([ORDER]),
          source_event_id: 'human-short',
        }),
      },
      env.authority,
    );
    expect(refused).toEqual({ reason: 'source-mismatch' });
  });

  it('seals from an exact host approval rule and still refuses a revoked grant', () => {
    const env = open();
    const scopeKey = orchestratorToolScope('', env.grants.list('ada'));
    const toolInput = sealToolInput({
      grant_id: TEST_GRANT_ID,
      work_orders: JSON.stringify([ORDER]),
    });
    const rules = createToolApprovalRuleStore(env.database);
    const rule = rules.createPending({
      botSlug: 'ada',
      role: 'orchestrator',
      scopeKey,
      kind: 'exact',
      toolName: 'super_agent_seal',
      input: toolInput,
    });
    rules.activate('ada', rule.id);
    const sealed = sealWorkOrders(
      env.ledger,
      {
        botSlug: 'ada',
        sessionId: 'orch-1',
        grantId: TEST_GRANT_ID,
        orders: [ORDER],
        now: FIXED_NOW().toISOString(),
        scopeKey,
        toolInput,
      },
      env.authority,
    );
    expect(sealed).toMatchObject({ sourceKind: 'approval-rule', sourceRef: rule.id });
    env.grants.revoke('ada', TEST_GRANT_ID);
    const again = sealWorkOrders(
      env.ledger,
      {
        botSlug: 'ada',
        sessionId: 'orch-1',
        grantId: TEST_GRANT_ID,
        orders: [ORDER],
        now: FIXED_NOW().toISOString(),
        scopeKey,
        toolInput,
      },
      env.authority,
    );
    expect(again).toEqual({ reason: 'grant-unauthorized' });
  });

  it('accepts one host-noted approval call and ignores a model token', () => {
    const env = open();
    const toolInput = sealToolInput({
      grant_id: TEST_GRANT_ID,
      work_orders: JSON.stringify([ORDER]),
    });
    noteSuperAgentApproval('host-token', 'call-1', toolInput);
    const sealed = sealWorkOrders(
      env.ledger,
      {
        botSlug: 'ada',
        sessionId: 'orch-1',
        grantId: TEST_GRANT_ID,
        orders: [ORDER],
        now: FIXED_NOW().toISOString(),
        scopeKey: orchestratorToolScope('', env.grants.list('ada')),
        approvalToken: 'host-token',
        toolInput,
      },
      env.authority,
    );
    expect(sealed).toMatchObject({ sourceKind: 'approval-call', sourceRef: 'call-1' });
    const replay = sealWorkOrders(
      env.ledger,
      {
        botSlug: 'ada',
        sessionId: 'orch-1',
        grantId: TEST_GRANT_ID,
        orders: [ORDER],
        now: FIXED_NOW().toISOString(),
        scopeKey: orchestratorToolScope('', env.grants.list('ada')),
        approvalToken: 'model-token',
        toolInput,
      },
      env.authority,
    );
    expect(replay).toEqual({ reason: 'approval-required' });
  });
});
