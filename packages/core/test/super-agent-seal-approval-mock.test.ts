import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { attachOperationalModule, mountOperationalDatabase } from '../src/database/owner.js';
import { BOT_HARNESS_SCHEMA_PLAN } from '../src/database/schema-plan.js';
import { sealWorkOrders } from '../src/runtime/super-agent-dispatch.js';
import { createSuperAgentLedger } from '../src/runtime/super-agent-ledger.js';
import {
  createWorkOrderAuthority,
  noteSuperAgentApproval,
  orchestratorToolScope,
  sealToolInput,
} from '../src/runtime/super-agent-authority.js';
import { createTempRoot, FIXED_NOW, trackTestOwner } from './helpers.js';
import { createTestWorkspaceGrants, TEST_GRANT_ID } from './workspace-grant-fixture.js';

const ORDER = {
  goal: '列出合成目录里的文件名',
  steps: ['只读取这次测试插入的合成 Grant 目录'],
  acceptance: '不读取测试目录以外的文件',
};

function open() {
  const home = createTempRoot('seal-approval-mock-');
  mkdirSync(home, { recursive: true });
  const owner = trackTestOwner(
    mountOperationalDatabase({
      dshHome: home,
      schemaPlan: BOT_HARNESS_SCHEMA_PLAN,
      now: FIXED_NOW,
    }),
  );
  const grants = createTestWorkspaceGrants(owner, join(home, 'project'));
  const database = attachOperationalModule(owner, 'super-agent');
  return {
    grants,
    ledger: createSuperAgentLedger(database),
    database,
    authority: createWorkOrderAuthority(database),
  };
}

function orders(env: ReturnType<typeof open>): number {
  return env.database.read(
    (db) => db.prepare(`SELECT COUNT(*) AS n FROM super_agent_orders`).get() as { n: number },
  ).n;
}

function input(
  env: ReturnType<typeof open>,
  patch: Partial<{
    botSlug: string;
    sessionId: string;
    grantId: string;
    approvalToken: string;
    approvalCallId: string;
    toolInput: string;
  }> = {},
) {
  const workOrders = JSON.stringify([ORDER]);
  const toolInput = sealToolInput({ grant_id: TEST_GRANT_ID, work_orders: workOrders });
  return {
    botSlug: patch.botSlug ?? 'ada',
    sessionId: patch.sessionId ?? 'orch-1',
    grantId: patch.grantId ?? TEST_GRANT_ID,
    orders: [ORDER],
    now: FIXED_NOW().toISOString(),
    scopeKey: orchestratorToolScope('', env.grants.list(patch.botSlug ?? 'ada')),
    approvalToken: patch.approvalToken,
    approvalCallId: patch.approvalCallId,
    toolInput: patch.toolInput ?? toolInput,
  };
}

describe('synthetic seal approval, not a Human card', () => {
  it('keeps an active synthetic grant from writing orders without a noted approval', () => {
    const env = open();
    expect(env.authority.grantActive('ada', TEST_GRANT_ID)).toBe(true);
    const refused = sealWorkOrders(env.ledger, input(env), env.authority);
    expect(refused).toEqual({ reason: 'approval-required' });
    expect(orders(env)).toBe(0);
  });

  it('rejects a caller-supplied token the interceptor never noted', () => {
    const env = open();
    const refused = sealWorkOrders(
      env.ledger,
      input(env, { approvalToken: 'forged-token', approvalCallId: 'call-forged' }),
      env.authority,
    );
    expect(refused).toEqual({ reason: 'approval-required' });
    expect(orders(env)).toBe(0);
  });

  it('accepts one interceptor note and rejects replay, another bot, and another session', () => {
    const env = open();
    const toolInput = sealToolInput({
      grant_id: TEST_GRANT_ID,
      work_orders: JSON.stringify([ORDER]),
    });
    const noted = noteSuperAgentApproval({
      token: 'interceptor-token',
      callId: 'call-1',
      botSlug: 'ada',
      sessionId: 'orch-1',
      grantId: TEST_GRANT_ID,
      toolInput,
    });
    expect(noted).toBe(true);
    env.database.transaction((db) => {
      db.prepare(
        `INSERT INTO workspace_grants (
           id, bot_slug, workspace_id, workspace_path, workspace_title, created_at
         ) VALUES ('bee-grant', 'bee', 'test-workspace', '/bee', 'Bee', ?)`,
      ).run(FIXED_NOW().toISOString());
    });
    const beeInput = sealToolInput({
      grant_id: 'bee-grant',
      work_orders: JSON.stringify([ORDER]),
    });
    const otherBot = sealWorkOrders(
      env.ledger,
      input(env, {
        botSlug: 'bee',
        sessionId: 'orch-bee',
        grantId: 'bee-grant',
        approvalToken: 'interceptor-token',
        approvalCallId: 'call-1',
        toolInput: beeInput,
      }),
      env.authority,
    );
    expect(env.authority.grantActive('bee', 'bee-grant')).toBe(true);
    expect(otherBot).toEqual({ reason: 'approval-required' });
    const otherSession = sealWorkOrders(
      env.ledger,
      input(env, {
        sessionId: 'orch-2',
        approvalToken: 'interceptor-token',
        approvalCallId: 'call-1',
        toolInput,
      }),
      env.authority,
    );
    expect(otherSession).toEqual({ reason: 'approval-required' });
    expect(orders(env)).toBe(0);
    const sealed = sealWorkOrders(
      env.ledger,
      input(env, {
        approvalToken: 'interceptor-token',
        approvalCallId: 'call-1',
        toolInput,
      }),
      env.authority,
    );
    expect(sealed).toMatchObject({ sourceKind: 'approval-call', sourceRef: 'call-1' });
    expect(orders(env)).toBe(1);
    const replay = sealWorkOrders(
      env.ledger,
      input(env, {
        approvalToken: 'interceptor-token',
        approvalCallId: 'call-1',
        toolInput,
      }),
      env.authority,
    );
    expect(replay).toEqual({ reason: 'approval-required' });
    expect(orders(env)).toBe(1);
  });
});
