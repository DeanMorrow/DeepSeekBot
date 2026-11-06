import { createHash, randomUUID } from 'node:crypto';

import type { OperationalDatabaseModulePort } from '../database/owner.js';

export const SUPER_AGENT_LIMITS = {
  maxDepth: 2,
  maxConcurrent: 2,
  maxSubtasks: 3,
  maxBudget: 3,
  maxGoalChars: 180,
  maxStepChars: 180,
  maxSteps: 4,
  maxAcceptanceChars: 180,
} as const;

export interface WorkOrder {
  goal: string;
  steps: string[];
  acceptance: string;
}

export function parseWorkOrders(value: unknown): WorkOrder[] | { reason: string } {
  const parsed = typeof value === 'string' ? parseJson(value) : value;
  if (!Array.isArray(parsed) || parsed.length === 0) return { reason: 'task-source-required' };
  if (parsed.length > SUPER_AGENT_LIMITS.maxSubtasks) return { reason: 'too-many-subtasks' };
  const orders: WorkOrder[] = [];
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) return { reason: 'task-source-required' };
    const record = item as Record<string, unknown>;
    if ('privateMemory' in record || 'rawParentText' in record)
      return { reason: 'forged-authorization' };
    const goal = typeof record.goal === 'string' ? record.goal.trim() : '';
    const acceptance = typeof record.acceptance === 'string' ? record.acceptance.trim() : '';
    const steps = Array.isArray(record.steps)
      ? record.steps
          .filter((step): step is string => typeof step === 'string')
          .map((step) => step.trim())
      : [];
    if (
      goal === '' ||
      acceptance === '' ||
      steps.length === 0 ||
      steps.some((step) => step === '')
    ) {
      return { reason: 'task-source-required' };
    }
    if (
      goal.length > SUPER_AGENT_LIMITS.maxGoalChars ||
      acceptance.length > SUPER_AGENT_LIMITS.maxAcceptanceChars ||
      steps.length > SUPER_AGENT_LIMITS.maxSteps ||
      steps.some((step) => step.length > SUPER_AGENT_LIMITS.maxStepChars)
    ) {
      return { reason: 'work-order-too-large' };
    }
    orders.push({ goal, steps, acceptance });
  }
  return orders;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

export function workOrderFingerprint(orders: readonly WorkOrder[]): string {
  return createHash('sha256')
    .update(
      JSON.stringify(
        orders.map((order) => ({
          goal: order.goal,
          steps: order.steps,
          acceptance: order.acceptance,
        })),
      ),
    )
    .digest('hex')
    .slice(0, 16);
}

export interface SealedWorkOrder extends WorkOrder {
  orderId: string;
}

export interface SuperAgentRunRow {
  runId: string;
  botSlug: string;
  sessionId: string;
  grantId: string;
  fingerprint: string;
  orderIds: string[];
}

export function createSuperAgentLedger(database: OperationalDatabaseModulePort) {
  return {
    seal(input: {
      botSlug: string;
      sessionId: string;
      grantId: string;
      orders: WorkOrder[];
      now: string;
    }): { orderIds: string[] } {
      const orderIds = input.orders.map(() => randomUUID());
      database.transaction(
        (db) => {
          const insert = db.prepare(
            `INSERT INTO super_agent_orders (
             order_id, bot_slug, session_id, grant_id, goal, steps_json, acceptance, sealed_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          );
          input.orders.forEach((order, index) => {
            const orderId = orderIds[index];
            if (orderId === undefined) throw new Error('super-agent order id was not issued');
            insert.run(
              orderId,
              input.botSlug,
              input.sessionId,
              input.grantId,
              order.goal,
              JSON.stringify(order.steps),
              order.acceptance,
              input.now,
            );
          });
        },
        ['super-agent'],
      );
      return { orderIds };
    },

    load(input: {
      botSlug: string;
      sessionId: string;
      grantId: string;
      orderIds: readonly string[];
    }): SealedWorkOrder[] | { reason: string } {
      if (input.orderIds.length === 0) return { reason: 'task-source-required' };
      const rows = database.read((db) =>
        input.orderIds.map(
          (orderId) =>
            db
              .prepare(
                `SELECT order_id, bot_slug, session_id, grant_id, goal, steps_json, acceptance
                 FROM super_agent_orders WHERE order_id = ?`,
              )
              .get(orderId) as
              | {
                  order_id: string;
                  bot_slug: string;
                  session_id: string;
                  grant_id: string;
                  goal: string;
                  steps_json: string;
                  acceptance: string;
                }
              | undefined,
        ),
      );
      const orders: SealedWorkOrder[] = [];
      for (const row of rows) {
        if (row === undefined) return { reason: 'order-not-found' };
        if (row.bot_slug !== input.botSlug || row.session_id !== input.sessionId) {
          return { reason: 'order-owner-mismatch' };
        }
        if (row.grant_id !== input.grantId) return { reason: 'order-grant-mismatch' };
        orders.push({
          orderId: row.order_id,
          goal: row.goal,
          steps: JSON.parse(row.steps_json) as string[],
          acceptance: row.acceptance,
        });
      }
      return orders;
    },

    readRun(runId: string): SuperAgentRunRow | undefined {
      return database.read((db) => {
        const row = db
          .prepare(
            `SELECT run_id, bot_slug, session_id, grant_id, fingerprint, order_ids_json
               FROM super_agent_runs WHERE run_id = ?`,
          )
          .get(runId) as
          | {
              run_id: string;
              bot_slug: string;
              session_id: string;
              grant_id: string;
              fingerprint: string;
              order_ids_json: string;
            }
          | undefined;
        if (row === undefined) return undefined;
        return {
          runId: row.run_id,
          botSlug: row.bot_slug,
          sessionId: row.session_id,
          grantId: row.grant_id,
          fingerprint: row.fingerprint,
          orderIds: JSON.parse(row.order_ids_json) as string[],
        };
      });
    },

    claimRun(input: {
      runId: string;
      botSlug: string;
      sessionId: string;
      grantId: string;
      fingerprint: string;
      orderIds: readonly string[];
      now: string;
      occupying: number;
      opening: number;
      concurrent: number;
      budget: number;
    }): { ok: true; reused: boolean } | { ok: false; reason: string } {
      return database.transaction(
        (db) => {
          const row = db
            .prepare(
              `SELECT bot_slug, session_id, grant_id, fingerprint FROM super_agent_runs WHERE run_id = ?`,
            )
            .get(input.runId) as
            | { bot_slug: string; session_id: string; grant_id: string; fingerprint: string }
            | undefined;
          if (row !== undefined) {
            if (row.bot_slug !== input.botSlug || row.session_id !== input.sessionId) {
              return { ok: false, reason: 'run-owner-mismatch' };
            }
            if (row.grant_id !== input.grantId) return { ok: false, reason: 'run-grant-mismatch' };
            if (row.fingerprint !== input.fingerprint) {
              return { ok: false, reason: 'run-fingerprint-mismatch' };
            }
            return { ok: true, reused: true };
          }
          const occupied = db
            .prepare(
              `SELECT COUNT(*) AS n FROM super_agent_slots
              WHERE bot_slug = ? AND state IN ('queued', 'working')`,
            )
            .get(input.botSlug) as { n: number };
          const live = Math.max(occupied.n, input.occupying);
          if (live >= input.budget) return { ok: false, reason: 'budget' };
          if (live + input.opening > input.concurrent && input.opening > 0) {
            return { ok: false, reason: 'concurrency' };
          }
          db.prepare(
            `INSERT INTO super_agent_runs (
             run_id, bot_slug, session_id, grant_id, fingerprint, order_ids_json, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          ).run(
            input.runId,
            input.botSlug,
            input.sessionId,
            input.grantId,
            input.fingerprint,
            JSON.stringify([...input.orderIds]),
            input.now,
          );
          const insertSlot = db.prepare(
            `INSERT INTO super_agent_slots (run_id, slot_index, bot_slug, state, assignment_session_id)
           VALUES (?, ?, ?, 'queued', NULL)`,
          );
          for (let index = 0; index < input.opening; index += 1) {
            insertSlot.run(input.runId, index + 1, input.botSlug);
          }
          return { ok: true, reused: false };
        },
        ['super-agent'],
      );
    },

    markWorking(runId: string, slotIndex: number, assignmentSessionId: string): void {
      database.transaction(
        (db) => {
          db.prepare(
            `UPDATE super_agent_slots SET state = 'working', assignment_session_id = ?
            WHERE run_id = ? AND slot_index = ?`,
          ).run(assignmentSessionId, runId, slotIndex);
        },
        ['super-agent'],
      );
    },

    markStopped(runId: string, slotIndex: number): void {
      database.transaction(
        (db) => {
          db.prepare(
            `UPDATE super_agent_slots SET state = 'stopped' WHERE run_id = ? AND slot_index = ?`,
          ).run(runId, slotIndex);
        },
        ['super-agent'],
      );
    },

    assignmentIds(runId: string): Array<{ slotIndex: number; sessionId: string }> {
      return database.read((db) =>
        (
          db
            .prepare(
              `SELECT slot_index, assignment_session_id FROM super_agent_slots
                WHERE run_id = ? AND assignment_session_id IS NOT NULL AND state != 'stopped'
                ORDER BY slot_index`,
            )
            .all(runId) as Array<{ slot_index: number; assignment_session_id: string }>
        ).map((row) => ({ slotIndex: row.slot_index, sessionId: row.assignment_session_id })),
      );
    },
  };
}

export function newSuperAgentRunId(): string {
  return randomUUID();
}

export function ordersFromUnknown(value: unknown): WorkOrder[] | { reason: string } {
  return parseWorkOrders(value);
}

export type SuperAgentLedger = ReturnType<typeof createSuperAgentLedger>;
