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

export function sealToolInput(args: {
  grant_id?: string;
  work_orders?: string;
  source_event_id?: string;
}): string {
  const body: Record<string, string> = {
    grant_id: args.grant_id ?? '',
    work_orders: args.work_orders ?? '',
  };
  if (args.source_event_id !== undefined && args.source_event_id !== '') {
    body.source_event_id = args.source_event_id;
  }
  return JSON.stringify(body, null, 2);
}

const noted = new Map<string, { callId: string; input: string }>();

/** Called by the host approval interceptor after a real allow, never by tool arguments. */
export function noteSuperAgentApproval(token: string, callId: string, input: string): void {
  noted.set(token, { callId, input });
}

export function takeSuperAgentApproval(
  token: string | undefined,
  input: string,
): { callId: string } | undefined {
  if (token === undefined || token === '') return undefined;
  const row = noted.get(token);
  if (row === undefined || row.input !== input) return undefined;
  noted.delete(token);
  return { callId: row.callId };
}

export interface WorkOrderAuthority {
  grantActive(botSlug: string, grantId: string): boolean;
  humanSource(botSlug: string, sourceEventId: string): { body: string } | undefined;
  standingExact(
    botSlug: string,
    scopeKey: string,
    toolInput: string,
  ): { ruleId: string } | undefined;
  grantedCall(token: string | undefined, toolInput: string): { callId: string } | undefined;
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
    humanSource(botSlug, sourceEventId) {
      if (sourceEventId.startsWith('direct-') || sourceEventId.trim() === '') return undefined;
      const row = database.read(
        (db) =>
          db
            .prepare(
              `SELECT source_kind, bot_slug, body FROM source_events WHERE source_event_id = ?`,
            )
            .get(sourceEventId) as
            | { source_kind: string; bot_slug: string; body: string }
            | undefined,
      );
      if (row === undefined || row.bot_slug !== botSlug || row.source_kind !== 'human-message') {
        return undefined;
      }
      return { body: row.body };
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
    grantedCall(token, toolInput) {
      return takeSuperAgentApproval(token, toolInput);
    },
  };
}

export function coveredByHumanMessage(body: string, orders: readonly WorkOrder[]): boolean {
  return orders.every(
    (order) =>
      body.includes(order.goal) &&
      body.includes(order.acceptance) &&
      order.steps.every((step) => body.includes(step)),
  );
}

export function workOrdersJson(orders: readonly WorkOrder[]): string {
  return JSON.stringify(orders);
}

export function parsedWorkOrders(value: unknown): WorkOrder[] | { reason: string } {
  return parseWorkOrders(value);
}
