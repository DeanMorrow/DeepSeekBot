import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import {
  appendDelegatedPolicyOverrides,
  captureDelegatedPolicyOverrides,
} from '@deepseek-ai/dsh-subagent';

import {
  alignAssignmentPermission,
  alignOrchestratorPermission,
  alignOrchestratorSubagentPermission,
  admitBotSession,
  borrowedAgentDenial,
  deviceToolAuthorization,
  grantExecutionDenial,
  isDshGovernedTool,
  sessionRefusalMessage,
  grantToolExecutionDenial,
  orchestratorPermission,
  requiresHumanToolApproval,
  sessionHasFullAccess,
} from '../src/workspaces/grant-execution.js';

const botSlug = 'ada';
const assignmentSessionId = 'botharness-assignment';
const grantId = 'grant-1';
const cwd = '/tmp/grant-workspace';

function fixture() {
  const resolve = vi.fn((sessionId: string) =>
    sessionId === assignmentSessionId
      ? {
          sessionId,
          botSlug,
          rootRole: 'assignment',
          parentSessionId: undefined,
        }
      : sessionId === 'botharness-orchestrator'
        ? {
            sessionId,
            botSlug,
            rootRole: 'orchestrator',
            parentSessionId: undefined,
          }
        : undefined,
  );
  const requireActive = vi.fn(() => ({
    id: grantId,
    workspaceId: 'workspace-1',
    workspacePath: cwd,
  }));
  const getAssignment = vi.fn(() => ({
    permission: {
      grantId,
      workspaceId: 'workspace-1',
      primaryCwd: cwd,
      mode: 'workspace-write',
      approval: 'ask',
      presetRevision: 0,
    },
  }));
  const overrideOf = vi.fn(() => 'ask');
  const getBot = vi.fn((): { slug: string } | undefined => ({ slug: botSlug }));
  const memoryDirFor = vi.fn(() => '/tmp/memory');
  const core = {
    ownership: { resolve },
    runtime: { getAssignment },
    grants: { requireActive, list: () => [] },
    registry: { memoryDirFor, get: getBot },
    hostTools: new Set<string>(),
  } as never;
  const resolvePolicy = vi.fn(() => ({ mode: 'workspace-write' }));
  const policy = { resolve: resolvePolicy } as never;
  const approval = { overrideOf } as never;
  const assignment = { id: assignmentSessionId, header: { cwd } } as never;
  return {
    core,
    policy,
    approval,
    assignment,
    requireActive,
    resolvePolicy,
    getAssignment,
    overrideOf,
    memoryDirFor,
    getBot,
  };
}

describe('Workspace Grant execution boundary', () => {
  it.each([
    { fork: false, nested: false },
    { fork: true, nested: false },
    { fork: false, nested: true },
  ])(
    'keeps Full access for a delegated Orchestrator child (fork: $fork, nested: $nested)',
    ({ fork, nested }) => {
      const state = fixture();
      const rootId = 'botharness-orchestrator';
      const childId = 'dsh-full-access-child';
      const parentId = nested ? 'dsh-parent-child' : rootId;
      const access = { mode: 'danger-full-access', scope: 'chat' };
      const core = {
        ...(state.core as object),
        ownership: {
          resolve: (sessionId: string) =>
            sessionId === childId
              ? {
                  sessionId,
                  botSlug,
                  rootRole: 'assignment',
                  provenance: 'subagent',
                  parentSessionId: parentId,
                }
              : nested && sessionId === parentId
                ? {
                    sessionId,
                    botSlug,
                    rootRole: 'assignment',
                    provenance: 'subagent',
                    parentSessionId: rootId,
                  }
                : sessionId === rootId
                  ? { sessionId, botSlug, rootRole: 'orchestrator' }
                  : undefined,
        },
        assignmentAccess: { get: () => access },
      } as never;
      const append = vi.fn((type: string, data: { mode?: string; policy?: string }) => {
        if (type === 'sandbox/mode' && data.mode !== undefined)
          state.resolvePolicy.mockReturnValue({ mode: data.mode });
        if (type === 'approval/policy' && data.policy !== undefined)
          state.overrideOf.mockReturnValue(data.policy);
      });
      const child = {
        id: childId,
        header: { cwd: '/tmp/memory', parentSession: parentId },
        append,
      } as never;
      if (fork) {
        append('sandbox/mode', { mode: 'workspace-write' });
        append('approval/policy', { policy: 'ask' });
      }
      const parent = {
        session: { id: rootId },
        ctx: {
          get: (name: string) =>
            name === 'sandboxPolicy'
              ? { overrideOf: () => 'danger-full-access' }
              : name === 'approval'
                ? {}
                : undefined,
        },
      } as never;
      appendDelegatedPolicyOverrides(child, captureDelegatedPolicyOverrides(parent));
      expect(state.resolvePolicy()).toEqual({ mode: 'danger-full-access' });
      append.mockClear();
      alignOrchestratorSubagentPermission(core, child, state.policy, state.approval);
      expect(append).not.toHaveBeenCalledWith('sandbox/mode', expect.anything());
      expect(grantExecutionDenial(core, child, state.policy, state.approval)).toBeUndefined();
      expect(sessionHasFullAccess(core, childId)).toBe(true);
      expect(
        grantToolExecutionDenial(core, child, state.policy, state.approval, 'write', {
          file_path: '/outside/project/file',
          content: 'x',
        }),
      ).toBeUndefined();
      const calls = append.mock.calls.length;
      alignOrchestratorSubagentPermission(core, child, state.policy, state.approval);
      expect(append).toHaveBeenCalledTimes(calls);
      state.overrideOf.mockReturnValue('ask');
      alignOrchestratorSubagentPermission(core, child, state.policy, state.approval);
      expect(append).toHaveBeenLastCalledWith('approval/policy', { policy: 'never' });
      access.mode = 'workspace-write';
      expect(grantExecutionDenial(core, child, state.policy, state.approval)).toMatch(
        /differs from this PersonaBot's access setting/,
      );
      alignOrchestratorSubagentPermission(core, child, state.policy, state.approval);
      expect(append).toHaveBeenLastCalledWith('sandbox/mode', { mode: 'workspace-write' });
      expect(grantExecutionDenial(core, child, state.policy, state.approval)).toBeUndefined();
      expect(sessionHasFullAccess(core, childId)).toBe(false);
      expect(
        grantToolExecutionDenial(core, child, state.policy, state.approval, 'write', {
          file_path: '/outside/project/file',
          content: 'x',
        }),
      ).toMatch(/outside/);
      state.memoryDirFor.mockReturnValue('/another-memory');
      expect(grantExecutionDenial(core, child, state.policy, state.approval)).toContain(
        'requires its Memory working directory',
      );
      state.getBot.mockReturnValue(undefined);
      expect(grantExecutionDenial(core, child, state.policy, state.approval)).toContain(
        'identity is deleted',
      );
    },
  );

  it('does not change Assignment Subagents, independent roots or unowned native sessions', () => {
    const state = fixture();
    const append = vi.fn();
    for (const id of [assignmentSessionId, 'botharness-orchestrator', 'native-session']) {
      const session = { id, header: { cwd }, append } as never;
      alignOrchestratorSubagentPermission(state.core, session, state.policy, state.approval);
    }
    const assignmentChildCore = {
      ownership: {
        resolve: (sessionId: string) =>
          sessionId === 'assignment-child'
            ? {
                sessionId,
                botSlug,
                rootRole: 'assignment',
                provenance: 'subagent',
                parentSessionId: assignmentSessionId,
              }
            : { sessionId, botSlug, rootRole: 'assignment' },
      },
    } as never;
    alignOrchestratorSubagentPermission(
      assignmentChildCore,
      { id: 'assignment-child', append } as never,
      state.policy,
      state.approval,
    );
    expect(append).toHaveBeenCalledTimes(0);
  });

  it('recognizes full access from an Assignment snapshot or the chat-scoped preset only', () => {
    const state = fixture();
    const get = vi.fn((): { mode: string; scope: string } | undefined => undefined);
    const core = {
      ...(state.core as object),
      assignmentAccess: { get },
    } as never;
    expect(sessionHasFullAccess(core, assignmentSessionId)).toBe(false);
    expect(sessionHasFullAccess(core, 'botharness-orchestrator')).toBe(false);
    expect(sessionHasFullAccess(core, 'native-session')).toBe(false);
    state.getAssignment.mockReturnValue({
      permission: {
        grantId,
        workspaceId: 'workspace-1',
        primaryCwd: cwd,
        mode: 'danger-full-access',
        approval: 'ask',
        presetRevision: 1,
      },
    });
    expect(sessionHasFullAccess(core, assignmentSessionId)).toBe(true);
    get.mockReturnValue({ mode: 'danger-full-access', scope: 'assignments' });
    expect(sessionHasFullAccess(core, 'botharness-orchestrator')).toBe(false);
    get.mockReturnValue({ mode: 'danger-full-access', scope: 'chat' });
    expect(sessionHasFullAccess(core, 'botharness-orchestrator')).toBe(true);
  });

  it('authorizes Browser and Computer tools for full access without asking the Human', () => {
    const granted = new Set<string>();
    const markAuthorized = vi.fn((sessionId: string, _scope?: string): boolean | void => {
      granted.add(sessionId);
    });
    const tools = {
      needsAuthorization: (sessionId: string) => !granted.has(sessionId),
      authorizationScope: () => 'local:default',
      markAuthorized,
    };
    expect(deviceToolAuthorization(tools, 'ask-session', false)).toBe('ask');
    expect(markAuthorized).not.toHaveBeenCalled();
    expect(deviceToolAuthorization(tools, 'full-session', true)).toBe('authorized');
    expect(markAuthorized).toHaveBeenCalledWith('full-session', 'local:default');
    expect(deviceToolAuthorization(tools, 'full-session', false)).toBe('authorized');
    markAuthorized.mockReturnValue(false);
    expect(deviceToolAuthorization(tools, 'changed-session', true)).toBe('changed');
    expect(deviceToolAuthorization({}, 'bare-session', true)).toBe('authorized');
  });

  it('denies deleted native roots and saved tool approvals even with retained Memory cwd', () => {
    const state = fixture();
    state.getBot.mockReturnValue(undefined);
    const session = {
      id: 'botharness-orchestrator',
      header: { cwd: '/tmp/memory' },
    } as never;
    expect(grantExecutionDenial(state.core, session, state.policy, state.approval)).toBe(
      'PersonaBot identity is deleted or unavailable',
    );
    expect(
      grantToolExecutionDenial(state.core, session, state.policy, state.approval, 'read', {
        file_path: '/tmp/memory/PERSONA.md',
      }),
    ).toBe('PersonaBot identity is deleted or unavailable');
    expect(grantExecutionDenial(state.core, state.assignment, state.policy, state.approval)).toBe(
      'PersonaBot identity is deleted or unavailable',
    );
    expect(state.overrideOf).not.toHaveBeenCalled();
    expect(state.requireActive).not.toHaveBeenCalled();
  });

  it('treats Host-checked Bot DM contact tools as internal Messaging tools', () => {
    expect(requiresHumanToolApproval('list_bot_contacts')).toBe(false);
    expect(requiresHumanToolApproval('bridge_reachable_groups')).toBe(false);
    expect(requiresHumanToolApproval('channel_list')).toBe(false);
    expect(requiresHumanToolApproval('inbox_ignore')).toBe(false);
    expect(requiresHumanToolApproval('inbox_history')).toBe(false);
    expect(requiresHumanToolApproval('inbox_list')).toBe(false);
    expect(requiresHumanToolApproval('inbox_resolve')).toBe(false);
    expect(requiresHumanToolApproval('inbox_snooze')).toBe(false);
    expect(requiresHumanToolApproval('archive_assignment')).toBe(false);
    expect(requiresHumanToolApproval('unarchive_assignment')).toBe(false);
    for (const tool of [
      'group_create',
      'group_invite_bot',
      'group_invite_respond',
      'group_rename',
      'group_remove_member',
      'group_leave',
    ])
      expect(requiresHumanToolApproval(tool)).toBe(false);
    expect(requiresHumanToolApproval('bot_send_message')).toBe(false);
    for (const tool of [
      'bot_schedule_list',
      'bot_schedule_create',
      'bot_schedule_update',
      'bot_schedule_delete',
    ])
      expect(requiresHumanToolApproval(tool)).toBe(false);
  });

  it('leaves Shell, plugin tools and their DSH escalation asks to the Session mode', () => {
    const state = fixture();
    const session = {
      id: 'botharness-orchestrator',
      header: { cwd: '/tmp/memory' },
    } as never;
    for (const tool of [
      'bridge_sender_permissions',
      'bridge_directory',
      'bridge_attachment_save',
      'bot_send_message',
    ]) {
      expect(requiresHumanToolApproval(tool)).toBe(false);
      expect(isDshGovernedTool(tool)).toBe(false);
      expect(
        grantToolExecutionDenial(state.core, session, state.policy, state.approval, tool, {}),
      ).toBeUndefined();
    }
    for (const tool of ['bash', 'pwsh', 'ops_bash', 'terminal', 'run_code']) {
      expect(requiresHumanToolApproval(tool)).toBe(false);
      expect(isDshGovernedTool(tool)).toBe(true);
      for (const args of [
        { command: 'unzip source-orders.zip' },
        {
          command: 'touch /outside',
          sandbox_permissions: 'require_escalated',
          justification: 'x',
        },
      ])
        expect(
          grantToolExecutionDenial(state.core, session, state.policy, state.approval, tool, args),
        ).toBeUndefined();
    }
    expect(isDshGovernedTool('read')).toBe(false);
    expect(isDshGovernedTool('channel_attachment_open')).toBe(false);
  });

  it('does not treat an active Workspace Grant as approval for every child tool', () => {
    const state = fixture();
    expect(isDshGovernedTool('super_agent_run')).toBe(false);
    expect(isDshGovernedTool('secret_cli')).toBe(true);
    expect(
      grantToolExecutionDenial(
        state.core,
        state.assignment,
        state.policy,
        state.approval,
        'secret_cli',
        {},
      ),
    ).toMatch(/requires Human approval/);
    expect(state.requireActive).toHaveBeenCalledWith(botSlug, grantId);
  });

  it('keeps each-use approval for secret tools', () => {
    const state = fixture();
    for (const tool of ['secret_cli', 'secret_mcp_connect']) {
      expect(requiresHumanToolApproval(tool)).toBe(true);
      expect(
        grantToolExecutionDenial(
          state.core,
          state.assignment,
          state.policy,
          state.approval,
          tool,
          {},
        ),
      ).toMatch(/requires Human approval/);
      expect(
        grantToolExecutionDenial(
          state.core,
          state.assignment,
          state.policy,
          state.approval,
          tool,
          {},
          true,
        ),
      ).toBeUndefined();
    }
  });

  it('requires approval for original editing while allowing exact read acquisition', () => {
    const state = fixture();
    const session = {
      id: 'botharness-orchestrator',
      header: { cwd: '/tmp/memory' },
    } as never;
    expect(requiresHumanToolApproval('channel_attachment_open', { access: 'read' })).toBe(false);
    expect(
      requiresHumanToolApproval('channel_attachment_open', {
        access: 'edit-original',
      }),
    ).toBe(true);
    expect(requiresHumanToolApproval('channel_attachment_open', {})).toBe(true);
    const gate = (access: string, approved = false) =>
      grantToolExecutionDenial(
        state.core,
        session,
        state.policy,
        state.approval,
        'channel_attachment_open',
        { access },
        approved,
      );
    expect(gate('read')).toBeUndefined();
    expect(gate('edit-original')).toMatch(/Human approval/);
    expect(gate('edit-original', true)).toBeUndefined();
  });

  it('puts bot_create through Human tool approval unless allowed or full access', () => {
    const state = fixture();
    const session = {
      id: 'botharness-orchestrator',
      header: { cwd: '/tmp/memory' },
    } as never;
    expect(requiresHumanToolApproval('bot_create', { display_name: 'Tim' })).toBe(true);
    expect(isDshGovernedTool('bot_create')).toBe(false);
    const gate = (approved = false) =>
      grantToolExecutionDenial(
        state.core,
        session,
        state.policy,
        state.approval,
        'bot_create',
        { display_name: 'Tim' },
        approved,
      );
    expect(gate()).toMatch(/Human tool approval/);
    expect(gate(true)).toBeUndefined();
    (state.core as { assignmentAccess?: unknown }).assignmentAccess = {
      get: () => ({ mode: 'danger-full-access', scope: 'chat' }),
    };
    state.resolvePolicy.mockReturnValue({ mode: 'danger-full-access' });
    state.overrideOf.mockReturnValue('ask');
    expect(gate()).toBeUndefined();
  });

  it('allows a valid Assignment and rejects native resume after revoke', () => {
    const state = fixture();
    expect(
      grantExecutionDenial(state.core, state.assignment, state.policy, state.approval),
    ).toBeUndefined();
    state.requireActive.mockImplementation(() => {
      throw new Error('revoked');
    });
    expect(
      grantExecutionDenial(state.core, state.assignment, state.policy, state.approval),
    ).toMatch(/revoked/);
  });

  it('allows DSH Subagents with native never approval only under the inherited Assignment Grant', () => {
    const state = fixture();
    const childId = 'dsh-child';
    const child = {
      id: childId,
      header: { cwd, parentSession: assignmentSessionId },
    } as never;
    const resolve = (state.core as { ownership: { resolve: ReturnType<typeof vi.fn> } }).ownership
      .resolve;
    resolve.mockImplementation((sessionId: string) =>
      sessionId === childId
        ? {
            sessionId,
            botSlug,
            rootRole: 'assignment',
            provenance: 'subagent',
            parentSessionId: assignmentSessionId,
          }
        : sessionId === assignmentSessionId
          ? {
              sessionId,
              botSlug,
              rootRole: 'assignment',
              parentSessionId: undefined,
            }
          : undefined,
    );
    state.overrideOf.mockReturnValue('never');
    expect(grantExecutionDenial(state.core, child, state.policy, state.approval)).toBeUndefined();
    state.resolvePolicy.mockReturnValue({ mode: 'danger-full-access' });
    expect(grantExecutionDenial(state.core, child, state.policy, state.approval)).toMatch(
      /mode differs/,
    );
    state.resolvePolicy.mockReturnValue({ mode: 'workspace-write' });
    resolve.mockImplementation((sessionId: string) =>
      sessionId === childId
        ? {
            sessionId,
            botSlug,
            rootRole: 'assignment',
            provenance: 'subagent',
            parentSessionId: assignmentSessionId,
          }
        : undefined,
    );
    expect(grantExecutionDenial(state.core, child, state.policy, state.approval)).toMatch(
      /parent ownership is missing/,
    );
  });

  it('denies a mid-step native danger mode switch before a tool body', () => {
    const state = fixture();
    state.resolvePolicy.mockReturnValue({ mode: 'danger-full-access' });
    expect(
      grantExecutionDenial(state.core, state.assignment, state.policy, state.approval),
    ).toMatch(/mode differs/);
  });

  it('honors an immutable dangerous Assignment snapshot but still checks its Grant', () => {
    const state = fixture();
    state.getAssignment.mockReturnValue({
      permission: {
        grantId,
        workspaceId: 'workspace-1',
        primaryCwd: cwd,
        mode: 'danger-full-access',
        approval: 'ask',
        presetRevision: 1,
      },
    });
    state.resolvePolicy.mockReturnValue({ mode: 'danger-full-access' });
    state.overrideOf.mockReturnValue('ask');
    expect(
      grantExecutionDenial(state.core, state.assignment, state.policy, state.approval),
    ).toBeUndefined();
    expect(
      grantToolExecutionDenial(state.core, state.assignment, state.policy, state.approval, 'read', {
        file_path: '/outside/secret.txt',
      }),
    ).toBeUndefined();
    expect(
      grantToolExecutionDenial(state.core, state.assignment, state.policy, state.approval, 'bash', {
        command: 'pwd',
      }),
    ).toBeUndefined();
    state.requireActive.mockImplementation(() => {
      throw new Error('revoked');
    });
    expect(
      grantToolExecutionDenial(state.core, state.assignment, state.policy, state.approval, 'bash', {
        command: 'pwd',
      }),
    ).toMatch(/revoked/);
  });

  it('extends a dangerous Assignment snapshot to its delegated Subagents (#2870)', () => {
    const state = fixture();
    const childId = 'dsh-assignment-child';
    const child = { id: childId, header: { cwd, parentSession: assignmentSessionId } } as never;
    const resolve = (state.core as { ownership: { resolve: ReturnType<typeof vi.fn> } }).ownership
      .resolve;
    resolve.mockImplementation((sessionId: string) =>
      sessionId === childId
        ? {
            sessionId,
            botSlug,
            rootRole: 'assignment',
            provenance: 'subagent',
            parentSessionId: assignmentSessionId,
          }
        : sessionId === assignmentSessionId
          ? { sessionId, botSlug, rootRole: 'assignment', parentSessionId: undefined }
          : undefined,
    );
    const outside = { file_path: '/outside/project/file', content: 'x' };
    state.overrideOf.mockReturnValue('never');
    expect(sessionHasFullAccess(state.core, childId)).toBe(false);
    expect(
      grantToolExecutionDenial(state.core, child, state.policy, state.approval, 'write', outside),
    ).toBeDefined();
    state.getAssignment.mockImplementation(((_slug: string, sessionId: string) =>
      sessionId === assignmentSessionId
        ? {
            permission: {
              grantId,
              workspaceId: 'workspace-1',
              primaryCwd: cwd,
              mode: 'danger-full-access',
              approval: 'ask',
              presetRevision: 1,
            },
          }
        : undefined) as never);
    state.resolvePolicy.mockReturnValue({ mode: 'danger-full-access' });
    expect(sessionHasFullAccess(state.core, childId)).toBe(true);
    expect(
      grantToolExecutionDenial(state.core, child, state.policy, state.approval, 'write', outside),
    ).toBeUndefined();
  });

  it('lets only the Orchestrator reach the native Human-question answerer', () => {
    const state = fixture();
    const orchestrator = {
      id: 'botharness-orchestrator',
      header: { cwd: '/tmp/memory' },
    } as never;
    expect(
      grantToolExecutionDenial(
        state.core,
        orchestrator,
        state.policy,
        state.approval,
        'ask_user_question',
        {},
      ),
    ).toBeUndefined();
    expect(
      grantToolExecutionDenial(
        state.core,
        state.assignment,
        state.policy,
        state.approval,
        'ask_user_question',
        {},
      ),
    ).toMatch(/Orchestrator/);
  });

  it('lets registered host-owned and unknown plugin tools through the Grant gate', () => {
    const state = fixture();
    const core = state.core as unknown as { hostTools: Set<string> };
    core.hostTools.add('computer_click');
    expect(
      grantToolExecutionDenial(
        state.core,
        state.assignment,
        state.policy,
        state.approval,
        'computer_click',
        {},
      ),
    ).toBeUndefined();
    expect(
      grantToolExecutionDenial(
        state.core,
        state.assignment,
        state.policy,
        state.approval,
        'computer_unregistered',
        {},
      ),
    ).toBeUndefined();
  });

  it('still rechecks the Grant before a Shell call runs', () => {
    const state = fixture();
    expect(
      grantToolExecutionDenial(state.core, state.assignment, state.policy, state.approval, 'bash', {
        command: 'pwd',
      }),
    ).toBeUndefined();
    state.requireActive.mockImplementation(() => {
      throw new Error('revoked');
    });
    expect(
      grantToolExecutionDenial(state.core, state.assignment, state.policy, state.approval, 'bash', {
        command: 'pwd',
      }),
    ).toMatch(/revoked/);
  });
  it('keeps DSH native file tools inside the Grant', () => {
    const state = fixture();
    expect(
      grantToolExecutionDenial(state.core, state.assignment, state.policy, state.approval, 'read', {
        file_path: 'missing.txt',
      }),
    ).toMatch(/cannot be resolved|outside/);
  });
  it('fails closed if a BotHarness-created Session loses its durable owner', () => {
    const state = fixture();
    const orphaned = { id: 'botharness-orphaned', header: { cwd } } as never;
    expect(grantExecutionDenial(state.core, orphaned, state.policy, state.approval)).toMatch(
      /no durable owner/,
    );
  });
  it('fails closed for an unclaimed native fork of an owned Session', () => {
    const state = fixture();
    const fork = {
      id: 'native-fork-id',
      header: { cwd, parentSession: assignmentSessionId },
    } as never;
    expect(grantExecutionDenial(state.core, fork, state.policy, state.approval)).toMatch(
      /no durable owner/,
    );
  });
  it('denies a native Orchestrator mode switch and ignores unrelated DSH sessions', () => {
    const state = fixture();
    state.resolvePolicy.mockReturnValue({ mode: 'danger-full-access' });
    const orchestrator = {
      id: 'botharness-orchestrator',
      header: { cwd: '/tmp/memory' },
    } as never;
    expect(grantExecutionDenial(state.core, orchestrator, state.policy, state.approval)).toMatch(
      /differs from this PersonaBot's access setting/,
    );
    const ordinary = { id: 'native-dsh', header: { cwd } } as never;
    expect(
      grantExecutionDenial(state.core, ordinary, state.policy, state.approval),
    ).toBeUndefined();
    expect(
      grantToolExecutionDenial(state.core, ordinary, state.policy, state.approval, 'bash', {
        sandbox_permissions: 'danger-full-access',
      }),
    ).toBeUndefined();
  });
  it('runs the Orchestrator unconfined only while the PersonaBot access setting is full access', () => {
    const state = fixture();
    const orchestrator = {
      id: 'botharness-orchestrator',
      header: { cwd: '/tmp/memory' },
    } as never;
    let mode: 'workspace-write' | 'danger-full-access' = 'danger-full-access';
    let scope: 'chat' | 'assignments' = 'assignments';
    const core = {
      ...(state.core as object),
      assignmentAccess: { get: () => ({ botSlug, mode, scope, revision: 1 }) },
    } as never;
    expect(orchestratorPermission(core, botSlug)).toEqual({
      mode: 'workspace-write',
      approval: 'ask',
    });
    expect(grantExecutionDenial(core, orchestrator, state.policy, state.approval)).toBeUndefined();
    scope = 'chat';
    expect(orchestratorPermission(core, botSlug)).toEqual({
      mode: 'danger-full-access',
      approval: 'ask',
    });
    expect(grantExecutionDenial(core, orchestrator, state.policy, state.approval)).toMatch(
      /differs from this PersonaBot's access setting/,
    );
    state.resolvePolicy.mockReturnValue({ mode: 'danger-full-access' });
    state.overrideOf.mockReturnValue('ask');
    expect(grantExecutionDenial(core, orchestrator, state.policy, state.approval)).toBeUndefined();
    expect(
      grantToolExecutionDenial(core, orchestrator, state.policy, state.approval, 'bash', {
        command: 'touch /outside/project/file',
      }),
    ).toBeUndefined();
    expect(
      grantToolExecutionDenial(core, orchestrator, state.policy, state.approval, 'write', {
        file_path: '/outside/project/file',
        content: 'x',
      }),
    ).toBeUndefined();
    mode = 'workspace-write';
    expect(orchestratorPermission(core, botSlug)).toEqual({
      mode: 'workspace-write',
      approval: 'ask',
    });
    expect(grantExecutionDenial(core, orchestrator, state.policy, state.approval)).toMatch(
      /differs from this PersonaBot's access setting/,
    );
  });
  it.each([
    [
      'Orchestrator Session requires its Memory working directory',
      'MEMORY_CWD_MISMATCH',
      'Start a new Session',
    ],
    [
      "Orchestrator Session permission differs from this PersonaBot's access setting",
      'SESSION_PERMISSION_MISMATCH',
      'Full access',
    ],
    [
      "Orchestrator Subagent permission differs from this PersonaBot's access setting",
      'SESSION_PERMISSION_MISMATCH',
      'Full access',
    ],
    [
      'Assignment Session permission snapshot is missing or mismatched',
      'ASSIGNMENT_PERMISSION_MISMATCH',
      'new Assignment',
    ],
    [
      'Assignment Session permission mode differs from its snapshot',
      'ASSIGNMENT_PERMISSION_MISMATCH',
      'new Assignment',
    ],
    [
      'Assignment Workspace Grant is missing, revoked, or unavailable',
      'GRANT_UNAVAILABLE',
      'Authorize the folder again',
    ],
    [
      'Assignment Workspace Grant no longer matches its permission snapshot',
      'GRANT_UNAVAILABLE',
      'Authorize the folder again',
    ],
    [
      'DSH permission services are unavailable for BotHarness Session',
      'PERMISSION_UNAVAILABLE',
      'Restart the Host',
    ],
    ['BotHarness Session has no durable owner', 'SESSION_OWNER_MISSING', 'Start a new Session'],
    ['BotHarness Session ownership is cyclic', 'SESSION_OWNER_MISSING', 'Start a new Session'],
    ['Unknown BotHarness Session role', 'SESSION_OWNER_MISSING', 'Start a new Session'],
    ['PersonaBot identity is deleted or unavailable', 'BOT_UNAVAILABLE', undefined],
    ['Something new', 'SESSION_REFUSED', undefined],
  ])('names the refusal %s and its Human fix', (denial, code, fix) => {
    const message = sessionRefusalMessage(denial);
    expect(message.startsWith(`${code}: The Host refused this turn: ${denial}.`)).toBe(true);
    if (fix === undefined) expect(message).toBe(`${code}: The Host refused this turn: ${denial}.`);
    else expect(message).toContain(fix);
  });
  it('aligns a natively resumed Orchestrator whose access setting changed while it was idle', () => {
    const state = fixture();
    let mode: 'workspace-write' | 'danger-full-access' = 'workspace-write';
    const core = {
      ...(state.core as object),
      assignmentAccess: { get: () => ({ botSlug, mode, scope: 'chat', revision: 1 }) },
    } as never;
    const appended: Array<[string, unknown]> = [];
    const orchestrator = {
      id: 'botharness-orchestrator',
      header: { cwd: '/tmp/memory' },
      append: (type: string, data: unknown) => appended.push([type, data]),
    } as never;
    expect(alignOrchestratorPermission(core, orchestrator, state.policy, state.approval)).toBe(
      false,
    );
    mode = 'danger-full-access';
    expect(grantExecutionDenial(core, orchestrator, state.policy, state.approval)).toMatch(
      /Orchestrator Session permission differs/,
    );
    expect(alignOrchestratorPermission(core, orchestrator, state.policy, state.approval)).toBe(
      true,
    );
    expect(appended).toEqual([
      ['sandbox/mode', { mode: 'danger-full-access' }],
      ['approval/policy', { policy: 'ask' }],
    ]);
    state.resolvePolicy.mockReturnValue({ mode: 'danger-full-access' });
    expect(grantExecutionDenial(core, orchestrator, state.policy, state.approval)).toBeUndefined();
    const assignment = { ...(state.assignment as object), append: vi.fn() } as never;
    expect(
      alignOrchestratorPermission(core, assignment, state.policy, state.approval),
    ).toBeUndefined();
    expect(
      alignOrchestratorPermission(core, orchestrator, undefined, state.approval),
    ).toBeUndefined();
  });
  it('lets the Host borrow a native Orchestrator after its access setting changed', () => {
    const state = fixture();
    const core = {
      ...(state.core as object),
      assignmentAccess: {
        get: () => ({ botSlug, mode: 'danger-full-access', scope: 'chat', revision: 2 }),
      },
    } as never;
    const orchestrator = {
      id: 'botharness-orchestrator',
      header: { cwd: '/tmp/memory' },
      append: (type: string, data: { mode?: string }) => {
        if (type === 'sandbox/mode') state.resolvePolicy.mockReturnValue({ mode: data.mode! });
      },
    } as never;
    expect(grantExecutionDenial(core, orchestrator, state.policy, state.approval)).toMatch(
      /Orchestrator Session permission differs/,
    );
    expect(
      admitBotSession(core, orchestrator, 'orchestrator', state.policy, state.approval),
    ).toBeUndefined();
    expect(admitBotSession(core, orchestrator, 'assignment', state.policy, state.approval)).toBe(
      'BotHarness Agent role mismatch',
    );
    state.getAssignment.mockReturnValue(undefined as never);
    expect(
      admitBotSession(core, state.assignment, 'assignment', state.policy, state.approval),
    ).toMatch(/snapshot is missing/);
  });

  it('admits an Orchestrator whose working directory is a symlink to its Memory directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'botharness-memory-cwd-'));
    try {
      const memory = join(root, 'home', 'bots', botSlug, 'memory');
      mkdirSync(memory, { recursive: true });
      symlinkSync(join(root, 'home'), join(root, 'linked-home'), 'dir');
      const state = fixture();
      state.memoryDirFor.mockReturnValue(memory);
      const spelled = (cwd: string) =>
        ({ id: 'botharness-orchestrator', header: { cwd } }) as never;
      for (const cwd of [join(root, 'linked-home', 'bots', botSlug, 'memory'), memory + '/']) {
        expect(
          grantExecutionDenial(state.core, spelled(cwd), state.policy, state.approval),
        ).toBeUndefined();
        expect(
          admitBotSession(state.core, spelled(cwd), 'orchestrator', state.policy, state.approval),
        ).toBeUndefined();
      }
      const other = join(root, 'other-memory');
      mkdirSync(other);
      expect(
        grantExecutionDenial(state.core, spelled(other), state.policy, state.approval),
      ).toMatch(/requires its Memory working directory/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('lets the Host borrow a native Assignment whose mode drifted from its snapshot', () => {
    const state = fixture();
    const appended: Array<[string, unknown]> = [];
    const assignment = {
      id: assignmentSessionId,
      header: { cwd },
      append: (type: string, data: { mode?: string; policy?: string }) => {
        appended.push([type, data]);
        if (type === 'sandbox/mode') state.resolvePolicy.mockReturnValue({ mode: data.mode! });
        if (type === 'approval/policy') state.overrideOf.mockReturnValue(data.policy!);
      },
    } as never;
    state.resolvePolicy.mockReturnValue({ mode: 'danger-full-access' });
    state.overrideOf.mockReturnValue('never');
    expect(grantExecutionDenial(state.core, assignment, state.policy, state.approval)).toMatch(
      /differs from its snapshot/,
    );
    expect(
      admitBotSession(state.core, assignment, 'assignment', state.policy, state.approval),
    ).toBeUndefined();
    expect(appended).toEqual([
      ['sandbox/mode', { mode: 'workspace-write' }],
      ['approval/policy', { policy: 'ask' }],
    ]);
    expect(alignAssignmentPermission(state.core, assignment, state.policy, state.approval)).toBe(
      false,
    );
  });
  it('keeps refusing a drifted Assignment whose Grant or working directory no longer matches', () => {
    const state = fixture();
    const append = vi.fn();
    state.resolvePolicy.mockReturnValue({ mode: 'danger-full-access' });
    const moved = { id: assignmentSessionId, header: { cwd: '/tmp/elsewhere' }, append } as never;
    expect(admitBotSession(state.core, moved, 'assignment', state.policy, state.approval)).toMatch(
      /snapshot is missing or mismatched/,
    );
    const assignment = { id: assignmentSessionId, header: { cwd }, append } as never;
    state.requireActive.mockImplementation(() => {
      throw new Error('revoked');
    });
    expect(
      admitBotSession(state.core, assignment, 'assignment', state.policy, state.approval),
    ).toMatch(/permission mode differs from its snapshot/);
    expect(append).not.toHaveBeenCalled();
  });
  it('leaves delegated Assignment Subagents to their own snapshot check', () => {
    const state = fixture();
    const core = {
      ...(state.core as object),
      ownership: {
        resolve: (sessionId: string) =>
          sessionId === 'assignment-child'
            ? {
                sessionId,
                botSlug,
                rootRole: 'assignment',
                provenance: 'subagent',
                parentSessionId: assignmentSessionId,
              }
            : { sessionId, botSlug, rootRole: 'assignment' },
      },
    } as never;
    const append = vi.fn();
    const child = {
      id: 'assignment-child',
      header: { cwd, parentSession: assignmentSessionId },
      append,
    } as never;
    expect(alignAssignmentPermission(core, child, state.policy, state.approval)).toBeUndefined();
    expect(append).not.toHaveBeenCalled();
  });
});

it('does not keep retired Tob management tools in the Bot tool policy', () => {
  expect(isDshGovernedTool('tob_assignment_limit_read')).toBe(true);
  expect(isDshGovernedTool('tob_assignment_limit_set')).toBe(true);
});

describe('Bot Session admission', () => {
  type Role = 'orchestrator' | 'assignment';
  type Entry = (
    state: ReturnType<typeof fixture>,
    core: never,
    session: never,
    role: Role,
  ) => string | undefined;
  const admitStep = (state: ReturnType<typeof fixture>, core: never, session: never) =>
    admitBotSession(core, session, undefined, state.policy, state.approval);
  const ENTRY_PATHS: ReadonlyArray<readonly [string, Entry]> = [
    ['create', (state, core, session) => admitStep(state, core, session)],
    ['resume', (state, core, session) => admitStep(state, core, session)],
    [
      'borrow',
      (state, core, session, role) =>
        borrowedAgentDenial(core, session, role) ?? admitStep(state, core, session),
    ],
    ['native wake', (state, core, session) => admitStep(state, core, session)],
  ];
  const memoryRoot = mkdtempSync(join(tmpdir(), 'botharness-admission-'));
  const memory = join(memoryRoot, 'home', 'bots', botSlug, 'memory');
  mkdirSync(memory, { recursive: true });
  symlinkSync(join(memoryRoot, 'home'), join(memoryRoot, 'linked-home'), 'dir');
  afterAll(() => rmSync(memoryRoot, { recursive: true, force: true }));
  const STATES: ReadonlyArray<{
    name: string;
    role: Role;
    access: 'workspace-write' | 'danger-full-access';
    mode: string;
    approval: string;
    cwd?: string;
  }> = [
    {
      name: 'Full access switched on while DSH held the Session',
      role: 'orchestrator',
      access: 'danger-full-access',
      mode: 'workspace-write',
      approval: 'ask',
    },
    {
      name: 'Full access switched off while DSH held the Session',
      role: 'orchestrator',
      access: 'workspace-write',
      mode: 'danger-full-access',
      approval: 'ask',
    },
    {
      name: 'Orchestrator approval policy changed inside the Session',
      role: 'orchestrator',
      access: 'workspace-write',
      mode: 'workspace-write',
      approval: 'never',
    },
    {
      name: 'Memory path spelled through a symlink',
      role: 'orchestrator',
      access: 'workspace-write',
      mode: 'workspace-write',
      approval: 'ask',
      cwd: join(memoryRoot, 'linked-home', 'bots', botSlug, 'memory'),
    },
    {
      name: 'Assignment mode changed outside its snapshot',
      role: 'assignment',
      access: 'workspace-write',
      mode: 'danger-full-access',
      approval: 'never',
    },
  ];
  const cases = STATES.flatMap((state) =>
    ENTRY_PATHS.map(([path, entry]) => ({ ...state, path, entry })),
  );

  it.each(cases)('repairs "$name" on $path before it checks', (testCase) => {
    const state = fixture();
    state.memoryDirFor.mockReturnValue(memory);
    state.resolvePolicy.mockReturnValue({ mode: testCase.mode });
    state.overrideOf.mockReturnValue(testCase.approval);
    const core = {
      ...(state.core as object),
      assignmentAccess: {
        get: () => ({ botSlug, mode: testCase.access, scope: 'chat', revision: 1 }),
      },
    } as never;
    const writes: string[] = [];
    const session = {
      id: testCase.role === 'orchestrator' ? 'botharness-orchestrator' : assignmentSessionId,
      header: { cwd: testCase.cwd ?? (testCase.role === 'orchestrator' ? memory : cwd) },
      append: (type: string, data: { mode?: string; policy?: string }) => {
        writes.push(type);
        if (type === 'sandbox/mode') state.resolvePolicy.mockReturnValue({ mode: data.mode! });
        if (type === 'approval/policy') state.overrideOf.mockReturnValue(data.policy!);
      },
    } as never;

    expect(testCase.entry(state, core, session, testCase.role)).toBeUndefined();
    expect(grantExecutionDenial(core, session, state.policy, state.approval)).toBeUndefined();
    const repaired = writes.length;
    expect(admitStep(state, core, session)).toBeUndefined();
    expect(writes).toHaveLength(repaired);
  });

  it('leaves every refusal after ownership and role to admission, which names the fix', () => {
    const state = fixture();
    state.requireActive.mockImplementation(() => {
      throw new Error('revoked');
    });
    const assignment = { id: assignmentSessionId, header: { cwd }, append: vi.fn() } as never;
    expect(borrowedAgentDenial(state.core, assignment, 'assignment')).toBeUndefined();
    expect(borrowedAgentDenial(state.core, assignment, 'orchestrator')).toBe(
      'BotHarness Agent role mismatch',
    );
    const denial = admitBotSession(
      state.core,
      assignment,
      'assignment',
      state.policy,
      state.approval,
    );
    expect(denial).toBe('Assignment Workspace Grant is missing, revoked, or unavailable');
    expect(sessionRefusalMessage(denial!)).toMatch(/^GRANT_UNAVAILABLE: .*Authorize the folder/);
  });

  it('reports each repair it made', () => {
    const state = fixture();
    state.resolvePolicy.mockReturnValue({ mode: 'danger-full-access' });
    const repairs: string[] = [];
    const assignment = { id: assignmentSessionId, header: { cwd }, append: vi.fn() } as never;
    admitBotSession(state.core, assignment, undefined, state.policy, state.approval, (repair) =>
      repairs.push(repair),
    );
    expect(repairs).toEqual(['assignment']);
  });
});
