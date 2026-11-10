import type { OperationalDatabaseModulePort } from '../database/owner.js';
import type { WorkspaceGrant } from '../workspaces/grants.js';
import { createToolApprovalRuleStore } from '../workspaces/tool-approval-rules.js';
import { parseWorkOrders, type WorkOrder } from './super-agent-ledger.js';

/** Same scope string ChannelToolApproval stores for an Orchestrator tool rule. */
export function orchestratorToolScope(
  cwd: string,
  grants: readonly Pick<WorkspaceGrant, 'id' | 'revokedAt' | 'writeRevision'>[],
): string {
  const activeIds = grants
    .filter((grant) => grant.revokedAt === undefined)
    .map((grant) => `${grant.id}:${grant.writeRevision ?? 0}`)
    .sort();
  return JSON.stringify(['orchestrator', cwd, activeIds]);
}

export function sealToolInput(args: { grant_id?: string; work_orders?: string }): string {
  return JSON.stringify(
    {
      grant_id: args.grant_id ?? '',
      work_orders: args.work_orders ?? '',
    },
    null,
    2,
  );
}

interface NotedApproval {
  callId: string;
  botSlug: string;
  sessionId: string;
  grantId: string;
  toolInput: string;
}

const noted = new Map<string, NotedApproval>();

export interface SuperAgentApprovalNote {
  token: string;
  callId: string;
  botSlug: string;
  sessionId: string;
  grantId: string;
  toolInput: string;
}

function completeNote(input: SuperAgentApprovalNote): boolean {
  return (
    input.token !== '' &&
    input.callId !== '' &&
    input.botSlug !== '' &&
    input.sessionId !== '' &&
    input.grantId !== '' &&
    input.toolInput !== ''
  );
}

/** Host interceptor only, after a real allow. A blank identity is not stored. */
export function noteSuperAgentApproval(input: SuperAgentApprovalNote): boolean {
  if (!completeNote(input)) return false;
  noted.set(input.token, {
    callId: input.callId,
    botSlug: input.botSlug,
    sessionId: input.sessionId,
    grantId: input.grantId,
    toolInput: input.toolInput,
  });
  return true;
}

export function takeSuperAgentApproval(
  input: SuperAgentApprovalNote,
): { callId: string } | undefined {
  if (!completeNote(input)) return undefined;
  const row = noted.get(input.token);
  if (
    row === undefined ||
    row.botSlug !== input.botSlug ||
    row.sessionId !== input.sessionId ||
    row.grantId !== input.grantId ||
    row.toolInput !== input.toolInput ||
    row.callId !== input.callId
  ) {
    return undefined;
  }
  noted.delete(input.token);
  return { callId: row.callId };
}

export interface WorkOrderAuthority {
  grantActive(botSlug: string, grantId: string): boolean;
  standingExact(
    botSlug: string,
    scopeKey: string,
    toolInput: string,
  ): { ruleId: string } | undefined;
  grantedCall(input: SuperAgentApprovalNote): { callId: string } | undefined;
}

export function createWorkOrderAuthority(
  database: OperationalDatabaseModulePort,
): WorkOrderAuthority {
  const rules = createToolApprovalRuleStore(database);
  return {
    grantActive(botSlug, grantId) {
      const row = database.read(
        (db) =>
          db
            .prepare(`SELECT revoked_at FROM workspace_grants WHERE bot_slug = ? AND id = ?`)
            .get(botSlug, grantId) as { revoked_at: string | null } | undefined,
      );
      return row !== undefined && row.revoked_at === null;
    },
    standingExact(botSlug, scopeKey, toolInput) {
      const rule = rules.match({
        botSlug,
        role: 'orchestrator',
        scopeKey,
        toolName: 'super_agent_seal',
        input: toolInput,
      });
      if (rule === undefined || rule.kind !== 'exact' || rule.revokedAt !== undefined) {
        return undefined;
      }
      return { ruleId: rule.id };
    },
    grantedCall(input) {
      return takeSuperAgentApproval(input);
    },
  };
}

export function workOrdersJson(orders: readonly WorkOrder[]): string {
  return JSON.stringify(orders);
}

export function parsedWorkOrders(value: unknown): WorkOrder[] | { reason: string } {
  return parseWorkOrders(value);
}
