import { requiresHumanDecision } from './approval-templates.js';
import type { Session } from '@deepseek-ai/dsh-session';
import { setSandboxMode, type SandboxPolicyService } from '@deepseek-ai/dsh-sandbox-policy';
import { setApprovalPolicy, type ApprovalService } from '@deepseek-ai/dsh-user-approval';

import { sameDirectory } from '../fs/same-directory.js';
import type { BotHarnessCore } from '../plugin.js';
import { NATIVE_FILE_TOOL_NAMES, nativeFileToolDenial } from './grant-native-tools.js';

type AccessCore = { assignmentAccess?: Pick<BotHarnessCore['assignmentAccess'], 'get'> };

type Owner = NonNullable<ReturnType<BotHarnessCore['ownership']['resolve']>>;

function rootOwner(core: Pick<BotHarnessCore, 'ownership'>, sessionId: string): Owner | undefined {
  let owner = core.ownership.resolve(sessionId);
  const seen = new Set<string>();
  while (owner?.parentSessionId !== undefined) {
    if (seen.has(owner.sessionId)) return undefined;
    seen.add(owner.sessionId);
    const parent = core.ownership.resolve(owner.parentSessionId);
    if (parent === undefined || parent.botSlug !== owner.botSlug) return undefined;
    owner = parent;
  }
  return owner;
}

export function alignOrchestratorSubagentPermission(
  core: Pick<BotHarnessCore, 'ownership'> & AccessCore,
  session: Session,
  policy: SandboxPolicyService | undefined,
  approval: ApprovalService | undefined,
): boolean {
  if (
    core.ownership.resolve(session.id)?.provenance !== 'subagent' ||
    policy === undefined ||
    approval === undefined
  )
    return false;
  const owner = rootOwner(core, session.id);
  if (owner?.rootRole !== 'orchestrator') return false;
  const mode = orchestratorPermission(core, owner.botSlug).mode;
  let changed = false;
  if (policy.resolve({ session }).mode !== mode) {
    setSandboxMode(session, mode);
    changed = true;
  }
  if (approval.overrideOf(session) !== 'never') {
    setApprovalPolicy(session, 'never');
    changed = true;
  }
  return changed;
}

export function alignOrchestratorPermission(
  core: Pick<BotHarnessCore, 'ownership'> & AccessCore,
  session: Session,
  policy: SandboxPolicyService | undefined,
  approval: ApprovalService | undefined,
): boolean | undefined {
  const owner = core.ownership.resolve(session.id);
  if (
    owner?.rootRole !== 'orchestrator' ||
    owner.provenance === 'subagent' ||
    owner.parentSessionId !== undefined ||
    policy === undefined ||
    approval === undefined
  )
    return undefined;
  const expected = orchestratorPermission(core, owner.botSlug);
  if (
    policy.resolve({ session }).mode === expected.mode &&
    approval.overrideOf(session) === expected.approval
  )
    return false;
  setSandboxMode(session, expected.mode);
  setApprovalPolicy(session, expected.approval);
  return true;
}

export function alignAssignmentPermission(
  core: Pick<BotHarnessCore, 'ownership' | 'runtime' | 'grants'>,
  session: Session,
  policy: SandboxPolicyService | undefined,
  approval: ApprovalService | undefined,
): boolean | undefined {
  const owner = core.ownership.resolve(session.id);
  if (
    owner?.rootRole !== 'assignment' ||
    owner.provenance === 'subagent' ||
    owner.parentSessionId !== undefined ||
    policy === undefined ||
    approval === undefined
  )
    return undefined;
  const permission = core.runtime.getAssignment(owner.botSlug, owner.sessionId)?.permission;
  if (permission === undefined || session.header.cwd !== permission.primaryCwd) return undefined;
  try {
    const grant = core.grants.requireActive(owner.botSlug, permission.grantId);
    if (
      grant.workspaceId !== permission.workspaceId ||
      grant.workspacePath !== permission.primaryCwd
    )
      return undefined;
  } catch {
    return undefined;
  }
  if (
    policy.resolve({ session }).mode === permission.mode &&
    approval.overrideOf(session) === permission.approval
  )
    return false;
  setSandboxMode(session, permission.mode);
  setApprovalPolicy(session, permission.approval);
  return true;
}

export function orchestratorPermission(
  core: AccessCore,
  botSlug: string,
): { mode: 'workspace-write' | 'danger-full-access'; approval: 'ask' | 'never' } {
  const preset = core.assignmentAccess?.get(botSlug);
  return preset?.mode === 'danger-full-access' && preset.scope === 'chat'
    ? { mode: 'danger-full-access', approval: 'ask' }
    : { mode: 'workspace-write', approval: 'ask' };
}

export function sessionHasFullAccess(
  core: Pick<BotHarnessCore, 'ownership' | 'runtime'> & AccessCore,
  sessionId: string,
): boolean {
  const owner = rootOwner(core, sessionId);
  if (owner === undefined) return false;
  if (owner.rootRole === 'assignment')
    return (
      core.runtime.getAssignment(owner.botSlug, owner.sessionId)?.permission?.mode ===
      'danger-full-access'
    );
  return (
    owner.rootRole === 'orchestrator' &&
    orchestratorPermission(core, owner.botSlug).mode === 'danger-full-access'
  );
}

export function deviceToolAuthorization(
  tools: {
    needsAuthorization?(sessionId: string): boolean;
    authorizationScope?(sessionId?: string): string;
    markAuthorized?(sessionId: string, scope?: string): boolean | void;
  },
  sessionId: string,
  fullAccess: boolean,
): 'authorized' | 'ask' | 'changed' {
  if (tools.needsAuthorization?.(sessionId) !== true) return 'authorized';
  if (!fullAccess) return 'ask';
  return tools.markAuthorized?.(sessionId, tools.authorizationScope?.(sessionId)) === false
    ? 'changed'
    : 'authorized';
}

export function grantExecutionDenial(
  core: Pick<BotHarnessCore, 'ownership' | 'runtime' | 'grants' | 'registry'> & AccessCore,
  session: Session,
  policy: SandboxPolicyService | undefined,
  approval: ApprovalService | undefined,
): string | undefined {
  let owner = core.ownership.resolve(session.id);
  if (owner === undefined) {
    const parent = session.header.parentSession;
    return session.id.startsWith('botharness-') ||
      (parent !== undefined && core.ownership.resolve(parent) !== undefined)
      ? 'BotHarness Session has no durable owner'
      : undefined;
  }
  if (core.registry.get(owner.botSlug) === undefined)
    return 'PersonaBot identity is deleted or unavailable';
  const delegatedSubagent = owner.provenance === 'subagent';
  const seen = new Set<string>();
  while (owner.parentSessionId !== undefined) {
    if (seen.has(owner.sessionId)) return 'BotHarness Session ownership is cyclic';
    seen.add(owner.sessionId);
    const parent = core.ownership.resolve(owner.parentSessionId);
    if (parent === undefined || parent.botSlug !== owner.botSlug) {
      return 'BotHarness Session parent ownership is missing or inconsistent';
    }
    owner = parent;
  }
  if (policy === undefined || approval === undefined) {
    return 'DSH permission services are unavailable for BotHarness Session';
  }
  const mode = policy.resolve({ session }).mode;
  const approvalPolicy = approval.overrideOf(session);
  if (owner.rootRole === 'orchestrator') {
    if (delegatedSubagent) {
      if (mode !== orchestratorPermission(core, owner.botSlug).mode || approvalPolicy !== 'never')
        return "Orchestrator Subagent permission differs from this PersonaBot's access setting";
    } else {
      const expected = orchestratorPermission(core, owner.botSlug);
      if (mode !== expected.mode || approvalPolicy !== expected.approval)
        return "Orchestrator Session permission differs from this PersonaBot's access setting";
    }
    const memoryCwd = core.registry.memoryDirFor(owner.botSlug);
    const cwd = session.header.cwd;
    return memoryCwd !== undefined && cwd !== undefined && sameDirectory(cwd, memoryCwd)
      ? undefined
      : 'Orchestrator Session requires its Memory working directory';
  }
  if (owner.rootRole !== 'assignment') return 'Unknown BotHarness Session role';
  const assignment = core.runtime.getAssignment(owner.botSlug, owner.sessionId);
  const permission = assignment?.permission;
  if (permission === undefined || session.header.cwd !== permission.primaryCwd) {
    return 'Assignment Session permission snapshot is missing or mismatched';
  }
  if (
    mode !== permission.mode ||
    approvalPolicy !== (delegatedSubagent ? 'never' : permission.approval)
  ) {
    return 'Assignment Session permission mode differs from its snapshot';
  }
  try {
    const grant = core.grants.requireActive(owner.botSlug, permission.grantId);
    if (
      grant.workspaceId !== permission.workspaceId ||
      grant.workspacePath !== permission.primaryCwd
    ) {
      return 'Assignment Workspace Grant no longer matches its permission snapshot';
    }
  } catch {
    return 'Assignment Workspace Grant is missing, revoked, or unavailable';
  }
  return undefined;
}

const SESSION_REFUSALS: ReadonlyArray<readonly [RegExp, string, string | undefined]> = [
  [
    /requires its Memory working directory/u,
    'MEMORY_CWD_MISMATCH',
    "Start a new Session; it opens in this Bot's Memory directory.",
  ],
  [
    /^Orchestrator (?:Session|Subagent) permission differs/u,
    'SESSION_PERMISSION_MISMATCH',
    "Start a new Session, or check Full access in this Bot's workspace settings.",
  ],
  [
    /^Assignment Session permission/u,
    'ASSIGNMENT_PERMISSION_MISMATCH',
    'Ask the Bot to start a new Assignment.',
  ],
  [
    /^Assignment Workspace Grant/u,
    'GRANT_UNAVAILABLE',
    'Authorize the folder again on a Workspace Grant card, then ask the Bot to start a new Assignment.',
  ],
  [/^DSH permission services are unavailable/u, 'PERMISSION_UNAVAILABLE', 'Restart the Host.'],
  [/^PersonaBot identity/u, 'BOT_UNAVAILABLE', undefined],
  [/ownership|owner|role/u, 'SESSION_OWNER_MISSING', 'Start a new Session.'],
];

export function sessionRefusalMessage(denial: string): string {
  const [, code, fix] = SESSION_REFUSALS.find(([pattern]) => pattern.test(denial)) ?? [
    undefined,
    'SESSION_REFUSED',
    undefined,
  ];
  return `${code}: The Host refused this turn: ${denial}.${fix === undefined ? '' : ' ' + fix}`;
}

export type BotSessionRepair = 'orchestrator' | 'assignment' | 'orchestrator-subagent';

export function admitBotSession(
  core: Pick<BotHarnessCore, 'ownership' | 'runtime' | 'grants' | 'registry'> & AccessCore,
  session: Session,
  role: 'orchestrator' | 'assignment' | undefined,
  policy: SandboxPolicyService | undefined,
  approval: ApprovalService | undefined,
  repaired?: (repair: BotSessionRepair) => void,
): string | undefined {
  const roleDenial = role === undefined ? undefined : borrowedAgentDenial(core, session, role);
  if (roleDenial !== undefined) return roleDenial;
  if (alignOrchestratorPermission(core, session, policy, approval)) repaired?.('orchestrator');
  if (alignAssignmentPermission(core, session, policy, approval)) repaired?.('assignment');
  if (alignOrchestratorSubagentPermission(core, session, policy, approval))
    repaired?.('orchestrator-subagent');
  return grantExecutionDenial(core, session, policy, approval);
}

export function borrowedAgentDenial(
  core: Pick<BotHarnessCore, 'ownership'>,
  session: Session,
  role: 'orchestrator' | 'assignment',
): string | undefined {
  return core.ownership.resolve(session.id)?.rootRole === role
    ? undefined
    : 'BotHarness Agent role mismatch';
}

const BOT_TOOL_NAMES = new Set([
  'create_assignment',
  'super_agent_run',
  'super_agent_cancel',
  'pack_private_add',
  'pack_private_read',
  'pack_shared_publish',
  'pack_recall',
  'pack_migrate',
  'pack_rollback',
  'pack_catalog',
  'list_assignment_models',
  'list_bot_subagent_models',
  'bot_subagent',
  'bot_subagent_fork',
  'subagent',
  'subagent_fork',
  'list_subagent_models',
  'request_workspace_grant',
  'list_workspace_grants',
  'list_assignments',
  'archive_assignment',
  'unarchive_assignment',
  'inspect_assignment',
  'wait_for_assignment',
  'send_assignment_request',
  'stop_assignment',
  'channel_list',
  'channel_read',
  'bridge_sender_permissions',
  'bridge_directory',
  'bridge_targets',
  'bridge_reachable_groups',
  'bridge_outbox',
  'bridge_read',
  'bridge_share',
  'cloud_work',
  'bridge_context',
  'bridge_group_policy_list',
  'bridge_group_policy_set',
  'bridge_thread_policy_list',
  'bridge_thread_policy_set',
  'bridge_attachment_save',
  'inbox_list',
  'inbox_resolve',
  'inbox_snooze',
  'inbox_ignore',
  'inbox_history',
  'channel_read_image',
  'call_frame',
  'channel_attachment_save',
  'channel_attachment_import',
  'list_bot_contacts',
  'group_create',
  'group_invite_bot',
  'group_invite_respond',
  'group_join_request',
  'group_join_decide',
  'group_rename',
  'group_remove_member',
  'group_attention_get',
  'group_attention_set',
  'source_attention_get',
  'source_attention_set',
  'source_attention_reset',
  'bot_schedule_list',
  'bot_schedule_create',
  'bot_schedule_update',
  'bot_schedule_delete',
  'takeover_request',
  'takeover_cancel',
  'takeover_list',
  'group_leave',
  'bot_create',
  'bot_send_message',
  'channel_action',

  'ask_user_question',
  'ask_secret',
  'secret_mcp_disconnect',
  'memory_switch_branch',
  'memory_continue_from_commit',
  'report_to_orchestrator',
]);

export function requiresHumanToolApproval(
  name: string,
  args?: unknown,
  templateInUse?: (template: string) => boolean,
): boolean {
  if (name === 'channel_attachment_open')
    return (
      typeof args !== 'object' ||
      args === null ||
      (args as Record<string, unknown>).access !== 'read'
    );
  if (name === 'secret_cli' || name === 'secret_mcp_connect' || name === 'bot_create') return true;
  return isDshGovernedTool(name) && requiresHumanDecision(policyInput(args), templateInUse);
}

export function approvalTemplateInUse(
  registry: Pick<BotHarnessCore['registry'], 'list'>,
): (template: string) => boolean {
  return (template) => registry.list().some((record) => record.approvalTemplate === template);
}

function policyInput(args: unknown): string {
  try {
    return JSON.stringify(args) ?? '';
  } catch {
    return '';
  }
}

export function isDshGovernedTool(name: string): boolean {
  return (
    !BOT_TOOL_NAMES.has(name) &&
    !NATIVE_FILE_TOOL_NAMES.has(name) &&
    name !== 'channel_attachment_open'
  );
}

export function grantToolExecutionDenial(
  core: Pick<BotHarnessCore, 'ownership' | 'runtime' | 'grants' | 'registry' | 'hostTools'> &
    AccessCore,
  session: Session,
  policy: SandboxPolicyService | undefined,
  approval: ApprovalService | undefined,
  name: string,
  args: unknown,
  allowedOnce = false,
): string | undefined {
  const denial = grantExecutionDenial(core, session, policy, approval);
  if (denial !== undefined) return denial;
  if (core.ownership.resolve(session.id) === undefined) return undefined;
  if (
    name === 'ask_user_question' &&
    core.ownership.resolve(session.id)?.rootRole !== 'orchestrator'
  )
    return 'Assignment questions must go through the Orchestrator';
  if (name === 'channel_attachment_open')
    return !requiresHumanToolApproval(name, args) || allowedOnce
      ? undefined
      : 'Original attachment edit access requires Human approval';
  if (name === 'bot_create')
    return allowedOnce || sessionHasFullAccess(core, session.id)
      ? undefined
      : 'Creating a PersonaBot requires Human tool approval';
  if (BOT_TOOL_NAMES.has(name)) return undefined;

  if (core.hostTools.has(name)) return undefined;
  if (sessionHasFullAccess(core, session.id)) return undefined;
  if (NATIVE_FILE_TOOL_NAMES.has(name)) return nativeFileToolDenial(core, session, name, args);
  if (requiresHumanToolApproval(name, args, approvalTemplateInUse(core.registry)) && !allowedOnce)
    return name + ' requires Human approval';
  return undefined;
}
