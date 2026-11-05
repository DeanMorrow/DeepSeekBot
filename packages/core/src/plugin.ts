import { BotNetworkDeliveryError } from './runtime/bot-network.js';
import type { AssignmentReportContent } from './runtime/assignment-report.js';
import { createWindowZoomControl, WINDOW_ZOOM_CONTROL_PATH } from './window-zoom/control.js';
import {
  compactUnknownContext,
  contextCapacity,
  createTargetCompaction,
  type PricedSurface,
} from './runtime/context-window.js';
import { createBotRequestRetry } from './runtime/bot-request-retry.js';
import { messageText, systemPromptFromLog } from './runtime/prompt-inspection.js';

import { createWindowZoomSetup, WINDOW_ZOOM_SETUP_PATH } from './window-zoom/setup.js';
import { nativeReleaseRuntime } from './release/compatibility.js';
import { createFolderBrowser } from './workspaces/folder-browse.js';
import { APPEARANCE_CONTROL_PATH, createAppearanceControl } from './appearance/control.js';
import { VoiceProviders } from './voice/providers.js';
import { createVoiceMessages, type VoiceMessages } from './voice/messages.js';
import { createVoiceCalls, type VoiceCallMedia, type VoiceCalls } from './voice/calls.js';
import { withVoiceDefaults } from './voice/defaults.js';
import { voiceCallRecordBody } from './channels/voice-call-record.js';
import { VOICE_CALL_PATH } from './voice/call-contract.js';
import { createVoiceCallHttp } from './voice/call-http.js';
import { CloudConnections } from './cloud/connections.js';
import { createCloudProvider } from './cloud/provider.js';
import { createChannelManagement, type ChannelManagementService } from './channels/management.js';
import { CloudWork } from './cloud/work.js';
import { createCloudWorkTool } from './cloud/work-tool.js';
import {
  createTobChannelOperations,
  TOB_CHANNEL_CAPABILITIES,
} from './tob/cli-channel-operations.js';
import { createBotCreation, type BotCreationService } from './bots/creation.js';
import { createBotImports } from './bots/imports.js';
import { createBotZipImport, type BotZipImportService } from './bots/zip-import.js';
import { createBotZipUploads } from './bots/zip-upload.js';
import {
  createTobBotCreationOperations,
  TOB_BOT_CREATE_CAPABILITIES,
} from './tob/cli-bot-create.js';
import {
  createTobBotProfileOperations,
  TOB_BOT_PROFILE_CAPABILITIES,
} from './tob/cli-bot-profile-operations.js';
import {
  createTobShareDraftOperations,
  TOB_SHARE_DRAFT_CAPABILITIES,
} from './tob/cli-share-draft-operations.js';
import { followCompanion } from './companions/live.js';
import {
  createTobService,
  TobError,
  type TobService,
  type TobSettingsProvider,
} from './tob/service.js';
import {
  createTobModelOperations,
  TOB_MODEL_CAPABILITIES,
  type TobNativeSettings,
} from './tob/cli-model-operations.js';
import {
  createTobMaintenanceOperations,
  TOB_MAINTENANCE_CAPABILITIES,
} from './tob/cli-maintenance-operations.js';
import { installTobCliShell } from './tob/cli-shell.js';
import { createTobVoiceOperations, TOB_VOICE_CAPABILITIES } from './tob/cli-voice-operations.js';
import {
  LOCAL_VOICE_SKILL_CONTENT,
  LOCAL_VOICE_SKILL_DESCRIPTION,
  LOCAL_VOICE_SKILL_INVOCATION,
  LOCAL_VOICE_SKILL_NAME,
  LOCAL_VOICE_SKILL_PROVIDER,
  LOCAL_VOICE_SKILL_SOURCE,
  LOCAL_VOICE_SKILL_WHEN_TO_USE,
} from './voice/skill.js';
import { approveTobCliOperation } from './tob/cli-approval.js';
import { onboardingNewsAvailable } from './onboarding/search.js';
import { nativeTimedQuestions } from './channels/native-timed-questions.js';
import { credentialStoreDenial } from './credentials/store-guard.js';
import { secretCommandDenial } from './credentials/secret-command.js';
import { rememberedStarts, secretMcpDenial } from './credentials/secret-mcp.js';
import { createSecretMcpStore } from './credentials/secret-mcp-store.js';
import { createBotOnboarding, type BotOnboarding } from './onboarding/service.js';
import { createPartLibrary, type PartLibrary } from './bots/part-library.js';
import {
  PART_SLOTS,
  isAvatarAppearance,
  wornAvatarPart,
  type PartSlot,
} from './bots/avatar-appearance.js';
import { createOutboundMessaging, type OutboundMessaging } from './messaging/outbound.js';
import { createProfileRecovery, type ProfileRecovery } from './portability/recovery.js';
import { createProfileBackupHttp, PROFILE_BACKUP_PATH } from './portability/http.js';
import {
  createDiagnosticBundleHttp,
  DIAGNOSTIC_BUNDLE_PATH,
  DIAGNOSTIC_BUNDLE_PREVIEW_PATH,
  type DiagnosticBundleHttpOptions,
} from './diagnostics/bundle-http.js';
import {
  createMessageFeedbackHttp,
  MESSAGE_FEEDBACK_PATH,
  MESSAGE_FEEDBACK_ACTIONS,
} from './diagnostics/message-feedback-http.js';
import { feedbackUploader } from './diagnostics/feedback-upload.js';
import { feedbackLinks } from './diagnostics/feedback-links.js';
import { mountContentPurge } from './purge/owner.js';
import type { ContentPurge } from './purge/contracts.js';
import { createDshImProvider } from './messaging/dsh-im.js';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createCompanionFeed, COMPANION_PATH, type CompanionFeed } from './companions/feed.js';

import type { Context } from '@deepseek-ai/cordis';
import { assembleContextFor, type Agent } from '@deepseek-ai/dsh-agent';
import type { SessionSeq } from '@deepseek-ai/dsh-session';
import { renderContextSections, renderPrompt } from '@deepseek-ai/dsh-system-prompt';
import type {} from '@deepseek-ai/dsh-tools';
import { setApprovalPolicy, type ApprovalService } from '@deepseek-ai/dsh-user-approval';
import { setSandboxMode } from '@deepseek-ai/dsh-sandbox-policy';
import { randomUUID } from 'node:crypto';
import Schema from '@deepseek-ai/schemastery';

import { installOrchestratorFileTools } from './workspaces/orchestrator-file-tools.js';
import { ProtectedExecution } from './credentials/protected-execution.js';
import { privateInputLog } from './credentials/diagnostics.js';
import { nativeExecutionRoot } from './workspaces/grant-native-tools.js';
import { createAttachmentStore, type AttachmentStore } from './attachments/store.js';
import { startAttachmentSweep } from './attachments/sweep.js';
import { startMediaBackfill } from './attachments/media-backfill.js';
import { createStorageCleanup } from './storage/media-cleanup.js';
import { memoryAttachmentReferences } from './memory/backup.js';
import { createMemoryImageHttp, MEMORY_IMAGE_PATH } from './memory/image-http.js';
import { createMemoryFileHttp, MEMORY_FILE_DOWNLOAD_PATH } from './memory/file-http.js';
import {
  BOT_ZIP_EXPORT_PATH,
  BOT_ZIP_FILES_PATH,
  BOT_ZIP_IMPORT_PATH,
  createBotZipHttp,
} from './bots/bot-zip-http.js';
import {
  createAttachmentHttp,
  CHANNEL_ATTACHMENT_PATH,
  CHANNEL_ATTACHMENT_UPLOAD_PATH,
} from './attachments/http.js';
import { createBridgeMethods } from './bridge/methods.js';
import { composerRecoveryIdentity } from './bridge/composer-recovery.js';
import { homedir } from 'node:os';
import type { BotAgentSetupInfo } from './runtime/dsh-bot-agent-adapter.js';
import { registerBridge } from './bridge/rpc.js';
import { mountClientDiagnostics } from './diagnostics/client-diagnostics.js';
import { mountDiagnosticLog } from './diagnostics/diagnostic-log.js';
import { createCoreTakeoverHandoffs, mountTakeoverTools } from './takeover/mount.js';
import { createTurnLog } from './diagnostics/turn-log.js';
import { mountDevicePairing } from './devices/mount.js';
import { humanInboxPushSource } from './push/source.js';
import { createMarketplaceClient } from './marketplace/client.js';
import { createInstallReceipts } from './marketplace/install-receipts.js';
import { createMarketplaceUploads } from './marketplace/uploaded-bots.js';
import {
  createMarketplaceInstallReviews,
  INSTALL_REVIEW_SYSTEM_PROMPT,
  INSTALL_REVIEW_TIMEOUT_MS,
} from './marketplace/install-review.js';
import { createShareDrafts } from './marketplace/share-draft.js';
import type { ConnectAccount } from './devices/connect-account.js';
import {
  createLoadingReleaseService,
  installedRelease,
  type ReleaseInstaller,
} from './release/service.js';
import { loadedReleaseComponents, stampReleaseComponent } from './release/component.js';
import { createGitService } from './memory/managed-git.js';
import { createProcessRestarter, type ReleaseRestarter } from './release/restart.js';
import { createPluginUpdateService } from './release/plugins.js';
import {
  createTelemetryService,
  installedDshVersion,
  telemetryDecision,
  type TelemetryCapture,
} from './telemetry/service.js';
import { readDailyUsageCounts, startDailyUsage } from './telemetry/daily-usage.js';
import {
  createActiveDay,
  readHumanMessageCounts,
  startActiveDayWatch,
} from './telemetry/active-day.js';
import { createClientIssueReporter, type ClientIssueReporter } from './telemetry/client-issues.js';
import { deliverPendingExceptions, installExceptionCapture } from './telemetry/exceptions.js';
import { createPersonaBotRegistry, type PersonaBotRegistry } from './bots/registry.js';
import { createPersonaBotDeletions, type PersonaBotDeletions } from './bots/deletion.js';
import {
  backfillBotBanners,
  backfillBotDescriptors,
  syncBotDescriptor,
} from './bots/bot-descriptor-sync.js';
import { createModelPresetStore, type ModelPresetStore } from './models/presets.js';
import { createModelCatalog } from './models/catalog.js';
import { createCredentialReadiness } from './models/credential-readiness.js';
import { createProviderCredentialHealth } from './models/credential-health.js';
import { createModelRouteReadiness } from './models/readiness.js';
import { createBotAvatarHttp, botAvatarUrl, BOT_AVATAR_PATH } from './bots/avatar-http.js';
import { BOT_BANNER_PATH, createBotBannerHttp } from './bots/banner-http.js';
import { coalesce } from './runtime/coalesce.js';
import { watchHumanAttention } from './runtime/human-attention-live.js';
import { createMediaVersions, type MediaVersions } from './attachments/media-versions.js';
import { loadImageProcessor } from './attachments/thumbnails.js';
import { createChannelLiveHub, CHANNEL_STREAM_PATH, type ChannelLiveHub } from './channels/live.js';
import type { ChannelDraftEvent } from './channels/draft.js';
import { DeveloperModeSkillGate } from './logs/skill.js';
import { openLogDatabase, type LogDatabase } from './logs/log-db.js';
import type { ChannelStore } from './channels/store.js';
import {
  personaBotOutputCommitted,
  emitPersonaBotOutputCommitted,
  type PersonaBotOutputCommitted,
} from './channels/output.js';
import { createSqliteChannelStore } from './channels/sqlite-store.js';
import {
  attachOperationalModule,
  failOperationalDatabase,
  mountOperationalDatabase,
  onOperationalDatabaseClose,
  type OperationalDatabaseOwner,
} from './database/owner.js';
import { applyPendingDataReset, createDataReset } from './data-reset/reset.js';
import { BOT_HARNESS_SCHEMA_PLAN } from './database/schema-plan.js';
import { resolveDshHome } from './im/config-store.js';
import { ensureMemoryRepository } from './memory/repository.js';
import { cloneMemoryRepository } from './memory/clone.js';
import { migrateLegacySouls } from './memory/soul.js';
import { createMemoryService, type MemoryService } from './memory/service.js';
import { createRosterStore, type RosterStore } from './roster/store.js';
import {
  createBotRuntime,
  DEFAULT_ASSIGNMENT_CONCURRENCY_LIMIT,
  type AssignmentEventTail,
  type BotAgentAdapter,
  type BotRuntime,
  type NativeSessionArchive,
} from './runtime/bot-runtime.js';
import { createBotAttentionQuery, type BotAttentionQuery } from './runtime/attention.js';
import { createInboxHistoryQuery, type InboxHistoryQuery } from './runtime/inbox-history.js';
import { createBotSourcePolicyStore, type BotSourcePolicyStore } from './runtime/source-policy.js';
import { createBotScheduleStore, type BotScheduleStore } from './schedules/bot-schedules.js';
import {
  createHumanAttentionQuery,
  createHumanAttentionDecisions,
  type HumanAttentionQuery,
  type HumanAttentionDecisions,
} from './runtime/human-attention.js';
import {
  admitBotSession,
  borrowedAgentDenial,
  type BotSessionRepair,
  deviceToolAuthorization,
  grantExecutionDenial,
  sessionRefusalMessage,
  grantToolExecutionDenial,
  orchestratorPermission,
  isDshGovernedTool,
  requiresHumanToolApproval,
  approvalTemplateInUse,
  sessionHasFullAccess,
} from './workspaces/grant-execution.js';
import {
  ChannelToolApproval,
  registerChannelToolApproval,
  type ToolAutoApproval,
} from './workspaces/tool-approval.js';
import {
  changesApprovalPolicy,
  deletesMarketplaceBot,
  publishesBotMemory,
  requiresHumanDecision,
  createApprovalTemplateLibrary,
} from './workspaces/approval-templates.js';
import {
  APPROVAL_REVIEW_SESSION_PREFIX,
  ApprovalReviewError,
  type ApprovalReviewerRoute,
  createApprovalReviewRunner,
  isApprovalReviewSession,
  routeLabel,
  runReviewerTurn,
} from './workspaces/approval-reviewer.js';
import { createApprovalReviewerSettings } from './workspaces/approval-reviewer-settings.js';
import {
  compactionThresholdTokens,
  type CompactionThresholdPolicy,
  createIdleCompaction,
  IdleCompactionError,
  runCompactCommand,
  type CompactCommandRunner,
} from './runtime/idle-compaction.js';
import { createIdleCompactionSettings } from './runtime/idle-compaction-settings.js';
import { ChannelUserQuestions, registerChannelUserQuestions } from './channels/user-questions.js';
import { mountPrivateInputs } from './credentials/mount.js';
import type { PrivateInputs } from './credentials/private-inputs.js';
import {
  createAssignmentAccessStore,
  type AssignmentAccessStore,
} from './workspaces/assignment-access.js';
import {
  createToolApprovalRuleStore,
  type ToolApprovalRuleStore,
} from './workspaces/tool-approval-rules.js';
import {
  createWorkspaceGrantStore,
  type DshWorkspaceLookup,
  type WorkspaceGrantStore,
} from './workspaces/grants.js';
import {
  createDshBotAgentAdapter,
  type DshAgentPresetHost,
  type DshDefaultModelHost,
} from './runtime/dsh-bot-agent-adapter.js';
import { createSessionOwnership, type SessionOwnership } from './sessions/ownership.js';
import {
  readAssignmentReportPage,
  readBoundedAssignmentTail,
  type AssignmentSessionQuery,
  type AssignmentReportPage,
} from './runtime/assignment-tail.js';
import type { DshSessionEvent, DshSessionStore } from './sessions/source.js';
import { turnProgress } from './bots/tool-trace.js';
import type { ChannelCallVisual, SessionFailureProgress } from './channels/channel.js';
import type { ChannelAttachmentRef } from './attachments/ref.js';
import { DEFAULT_BOT_HOP_LIMIT, isBotHopLimit } from './channels/channel.js';
import {
  createBotStateTracker,
  personaBotActivitySnapshot,
  type BotStateTracker,
  type PersonaBotActivityEvent,
} from './state/bot-state.js';
import { ActivityToolDetails, createToolDetailIndex } from './state/tool-details.js';
import { createDshActivityProjection } from './state/dsh-activity.js';
import { readPublicToolDetail, toolKindForView } from './state/tool-activity.js';
import { createUsageProjection, type UsageProjection } from './usage/usage.js';
import { createMessagePerfTracker, type MessagePerfTracker } from './usage/message-perf.js';
import {
  createBotSubagentModelTools,
  installBotSubagentModelTools,
  installOrchestratorSubagentGuard,
  type BotSubagentPresetConfig,
} from './runtime/subagent-model-tools.js';
import { installNativeSubagentWake } from './runtime/native-subagent-wake.js';
import { restartEmptyToolSeries } from './runtime/tool-declaration-series.js';
import { promptTextOf } from './prompts/prompt-parts.js';
import { createPromptPresetLibrary, promptPartTexts } from './prompts/prompt-presets.js';
import { createPromptSettings, type PromptSettings } from './prompts/prompt-settings.js';

export const name = 'botharness-core';

const PUSH_TOPICS = new Set([
  'source-event',
  'channel',
  'human-attention',
  'bot-inbox',
  'assignments',
]);

const installedPackage = installedRelease(import.meta.url);
stampReleaseComponent(apply, import.meta.url);
const runningRelease = {
  version: installedPackage.version(),
  ledgers: installedPackage.ledgers(),
};

export const inject = [
  'tools',
  'systemPrompt',
  'sessions',
  'agents',
  'agentDefaultModel',
  'llm',
  'credentials',
];

export const PERSONA_SECTION_ORDER = 10400;

const COMPACTION_END_EVENT: string = 'compaction/end';

interface PressureCompactionEngine {
  config?: Record<string, unknown>;
  compactIfNeeded?(
    agent: Agent,
    trigger: 'pressure' | 'context-overflow',
    signal: AbortSignal,
  ): Promise<unknown>;
  compactRegion?(
    start: SessionSeq,
    end: SessionSeq,
    agent: Agent,
    signal: AbortSignal,
  ): Promise<unknown>;
}

export interface CompactionRefreshSink {
  ownership: { resolve(sessionId: string): { botSlug: string } | undefined };
  memory: {
    refreshPersonaAfterCompaction(botSlug: string, sessionId: string): { refreshed: boolean };
  };
  prompts?: {
    refreshAfterCompaction(sessionId: string): { refreshed: boolean };
  };
  warn(message: string): void;
}

export function handleCompactionEvent(
  sink: CompactionRefreshSink,
  sessionId: string,
  eventType: string,
): void {
  if (eventType !== COMPACTION_END_EVENT) return;
  refreshSessionTexts(sink, sessionId);
}

export function refreshSessionTexts(sink: CompactionRefreshSink, sessionId: string): void {
  const owner = sink.ownership.resolve(sessionId);
  if (owner === undefined) return;
  try {
    sink.memory.refreshPersonaAfterCompaction(owner.botSlug, sessionId);
  } catch (error) {
    sink.warn(`botharness: persona refresh after compaction failed: ${String(error)}`);
  }
  try {
    sink.prompts?.refreshAfterCompaction(sessionId);
  } catch (error) {
    sink.warn(`botharness: prompt refresh after compaction failed: ${String(error)}`);
  }
}

export interface BotHarnessConfig {
  enabled: boolean;
  privateInputExecution?: boolean;
  privateInputWebUrl?: string;

  agentPreset?: string;
  subagent?: BotSubagentPresetConfig;
  activityDetailConsumers?: string[];
  marketplaceUrl?: string;
  telemetry?: boolean;
}

export const DEFAULT_AGENT_PRESET = 'standard';
export const DEFAULT_MARKETPLACE_URL = 'https://market.botharness.ai';

export const DEFAULT_CONFIG: BotHarnessConfig = {
  enabled: true,
  agentPreset: DEFAULT_AGENT_PRESET,
  telemetry: true,
};

export const Config: Schema<BotHarnessConfig> = Schema.object({
  privateInputWebUrl: Schema.string().description(
    'Explicit credential-free Web origin for IM private input links; never use a login token URL.',
  ),
  privateInputExecution: Schema.boolean()
    .default(false)
    .description(
      'Removed. The Docker-protected Profile no longer exists; a Profile that sets this starts as an ordinary Profile and logs a warning.',
    ),
  enabled: Schema.boolean().default(DEFAULT_CONFIG.enabled).description('启用 BotHarness core'),
  activityDetailConsumers: Schema.array(Schema.string())
    .default([])
    .description('Explicitly trusted Host Plugin names allowed to read Activity Tool details'),
  agentPreset: Schema.string()
    .default(DEFAULT_AGENT_PRESET)
    .description('PersonaBot 会话加入的 DSH agent preset（提供 file/Shell/grep 等普通工具）'),
  subagent: Schema.object({
    agentPreset: Schema.string()
      .min(1)
      .description(
        'Independent Subagent native Agent preset; omitted uses the current system default preset.',
      ),
    allowedAgentPresets: (
      Schema.array(Schema.string().min(1)).min(1) as Schema<string[] | undefined>
    )
      .default(undefined)
      .description(
        'Explicit native preset allowlist for bot_subagent; omitted disables agent_preset selection.',
      ),
  }).default(undefined as unknown as BotSubagentPresetConfig),
  marketplaceUrl: Schema.string()
    .default(DEFAULT_MARKETPLACE_URL)
    .description('Bot Marketplace 服务地址'),
  telemetry: Schema.boolean()
    .default(true)
    .description(
      '发送匿名使用统计（Anonymous usage telemetry）；DO_NOT_TRACK=1 或 BOTHARNESS_TELEMETRY=0 也会关闭',
    ),
});

export interface BotHarnessCore {
  prompts: PromptSettings;
  profileRecovery: ProfileRecovery;
  rootDir: string;
  onboarding: BotOnboarding;
  tob: TobService;
  creations: BotCreationService;
  zipImports: BotZipImportService;
  channelManagement: ChannelManagementService;
  partLibrary: PartLibrary;
  operationalDatabase: OperationalDatabaseOwner;
  registry: PersonaBotRegistry;
  deletions: PersonaBotDeletions;
  contentPurge: ContentPurge;
  modelPresets: ModelPresetStore;

  contributeBotAgentSetup(contribute: BotAgentSetup): () => void;

  configureGroupInvitations(autoAccept: () => boolean): () => void;
  configureAssignmentConcurrencyLimit(read: () => number): () => void;
  configureBotHopLimit(read: () => number): () => void;

  hostTools: Set<string>;

  runBotAgentSetups(
    agentCtx: Context,
    agent: import('@deepseek-ai/dsh-agent').Agent,
    info: BotAgentSetupInfo,
  ): void;
  states: BotStateTracker;
  ownership: SessionOwnership;
  memory: MemoryService;

  usage?: UsageProjection;
  messagePerf: MessagePerfTracker;
  channels: ChannelStore;
  attachments: AttachmentStore;
  mediaVersions: MediaVersions;
  live: ChannelLiveHub;
  companions: CompanionFeed;
  roster: RosterStore;
  runtime: BotRuntime;
  attention: BotAttentionQuery;
  inboxHistory: InboxHistoryQuery;
  sourcePolicy: BotSourcePolicyStore;
  schedules: BotScheduleStore;
  humanAttention: HumanAttentionQuery;
  humanAttentionDecisions: HumanAttentionDecisions;
  grants: WorkspaceGrantStore;
  externalMessaging: OutboundMessaging;
  cloudConnections?: CloudConnections;
  voiceProviders: VoiceProviders;
  voiceMessages: VoiceMessages;
  voiceSpeech: { speak?: Parameters<typeof createVoiceMessages>[0]['speak'] };
  voiceZoom: { zoom?: VoiceCalls['zoom'] | undefined };
  cloudWork?: CloudWork;
  toolRules: ToolApprovalRuleStore;
  assignmentAccess: AssignmentAccessStore;
}

function describeToolCall(
  ctx: Context,
  sessionId: string,
  name: string,
  args: unknown,
  unscoped = false,
) {
  const agent = ctx.agents.list().find((candidate) => candidate.session.id === sessionId);
  if (agent === undefined && !unscoped) return undefined;
  const definition = agent === undefined ? ctx.tools.get(name) : ctx.tools.get(name, agent);
  if (definition === undefined) return undefined;
  const view = definition.presentCall?.(args);
  const publicDetail = readPublicToolDetail(definition, args);
  return {
    name: definition.name,
    ...(view === undefined ? {} : { view }),
    ...(publicDetail === undefined ? {} : { publicDetail }),
  };
}

function reviewerRejectionText(reason: string): string {
  return (
    "The Approval Reviewer rejected this call under the Bot's Approval Template: " +
    reason +
    ' Try another way that the template allows, or ask the Human. The Human can still allow this exact call once from the Inbox; you will be told if they do.'
  );
}

function unavailableAgentAdapter(): BotAgentAdapter {
  const unavailable = () =>
    Promise.reject(new Error('BotHarness Agent runtime is unavailable outside a DSH Host'));
  return {
    runOrchestrator: unavailable,
    runAssignment: unavailable,
    requestAssignment: () => {
      throw new Error('BotHarness Agent runtime is unavailable outside a DSH Host');
    },
    close: async () => undefined,
  };
}

type BotAgentSetup = (
  agentCtx: import('@deepseek-ai/cordis').Context,
  agent: import('@deepseek-ai/dsh-agent').Agent,
  info: BotAgentSetupInfo,
) => void;

export function createCore(
  options: {
    botNetwork?: import('./runtime/bot-network.js').BotNetworkPort;
    dshHome?: string;
    companionProfileDir?: string | undefined;
    warn?: (message: string) => void;
    agents?: BotAgentAdapter;
    saveReportSpill?: (input: {
      sessionId: string;
      content: string;
    }) => Promise<{ locator: string; bytes: number; retrievalHint: string }>;
    readAssignmentTail?: (sessionId: string) => Promise<AssignmentEventTail>;
    readTurnProgress?: (sessionId: string) => Promise<SessionFailureProgress | undefined>;
    autoContinueDelaysMs?: readonly number[];
    stopSettleTimeoutMs?: number;
    closeSessionApprovals?: (sessionIds: readonly string[]) => void;
    readAssignmentReportPage?: (
      sessionId: string,
      acceptedSummary: string,
      offset: number,
      content?: AssignmentReportContent,
    ) => Promise<AssignmentReportPage>;
    workspaces?: () => DshWorkspaceLookup | undefined;
    ensureTobWorkspace?: (path: string) => Promise<{ id: string }>;
    tobSettings?: () => TobSettingsProvider | undefined;
    sessionArchive?: () => NativeSessionArchive | undefined;
    autoAcceptGroupInvitations?: () => boolean;
    botHopLimit?: () => number;
    triageContinuation?: boolean;
    imCommands?: () => import('./messaging/im-commands.js').ImCommandServices | undefined;
    onOutputCommitted?: (event: PersonaBotOutputCommitted) => void;
    activeQuestionMessageIds?: () => readonly string[];
    activeToolApprovalMessageIds?: () => readonly string[];
    activePrivateInputMessageIds?: () => readonly string[];
    erasePrivateAccounts?: (slug: string) => Promise<unknown>;
    capture?: TelemetryCapture;
    credentials?: () =>
      | Pick<
          import('@deepseek-ai/dsh-credentials').CredentialProvider,
          'readRecord' | 'modifyRecord' | 'deleteRecord'
        >
      | undefined;
    voiceLog?: (phase: string, fields: Record<string, string | number>) => void;
    voiceFetch?: typeof fetch;
  } = {},
): BotHarnessCore {
  const dshHome = options.dshHome ?? resolveDshHome();
  const rootDir = join(dshHome, 'botharness', 'bots');
  const operationalDatabase = mountOperationalDatabase({
    dshHome,
    schemaPlan: BOT_HARNESS_SCHEMA_PLAN,
  });
  if (operationalDatabase.recovery !== undefined)
    options.warn?.(
      `operational-database initiator=host-startup phase=recovery code=${operationalDatabase.recovery.code} path=${JSON.stringify(operationalDatabase.databasePath)} reason=${JSON.stringify(operationalDatabase.recovery.message)}`,
    );
  if (operationalDatabase.foreignKeyOrphans !== undefined)
    options.warn?.(
      `operational-database initiator=host-startup phase=foreign-key-orphans path=${JSON.stringify(operationalDatabase.databasePath)} orphans=${JSON.stringify(operationalDatabase.foreignKeyOrphans)}`,
    );
  let usage: UsageProjection | undefined;
  const partLibrary = createPartLibrary({
    database: attachOperationalModule(operationalDatabase, 'avatar-part-library'),
  });
  let registry: PersonaBotRegistry;
  let modelPresets: ModelPresetStore;
  let roster: RosterStore;
  let live: ChannelLiveHub | undefined;
  try {
    registry = createPersonaBotRegistry({
      rootDir,
      database: operationalDatabase,
      onImport: (event) =>
        options.warn?.(
          `bot-registry-import initiator=host-startup phase=${event.phase} count=${event.count ?? 0} durationMs=${Math.round(event.durationMs)}`,
        ),
      onAppearanceImported: (record) => {
        const recipe = isAvatarAppearance(record.appearance) ? record.appearance.recipe : undefined;
        if (recipe?.family !== 'illustrated') return;
        for (const slot of Object.keys(PART_SLOTS) as PartSlot[]) {
          const part = wornAvatarPart(recipe, slot);
          if (part)
            partLibrary.add({
              part,
              name: '',
              origin: 'imported-bot',
              author: record.displayName,
            });
        }
      },
      onDisplayNameChanged: () => {
        try {
          live?.publishRosterCommitted();
        } catch {
          options.warn?.('bot-name-publication-failed');
        }
      },
      onAvatarChanged: () => live?.publishRosterCommitted(),
      cloneMemory: (destination, url) => cloneMemoryRepository({ destination, url }),
      ...(options.capture === undefined ? {} : { capture: options.capture }),
      syncDescriptor: (memoryDir, record, sync) => {
        try {
          syncBotDescriptor(memoryDir, record, sync);
        } catch (error) {
          options.warn?.(
            `bot-descriptor-sync-failed slug=${record.slug} reason=${error instanceof Error ? error.name : 'unknown'}`,
          );
        }
      },
      initializeMemory: (memoryDir) => {
        const repository = ensureMemoryRepository({ memoryDir });
        return repository.ok
          ? { ok: true }
          : {
              ok: false,
              ...(repository.code === 'git-not-found' ? { code: 'git-not-found' as const } : {}),
              message: `${repository.code}: ${repository.message}`,
            };
      },
    });
    roster = createRosterStore({
      database: operationalDatabase,
      warn: options.warn,
      onCommitted: () => live?.publishRosterCommitted(),
    });
    modelPresets = createModelPresetStore({
      rootDir: join(dshHome, 'botharness'),
      database: operationalDatabase,
      onImport: (event) =>
        options.warn?.(
          `model-presets-import initiator=host-startup phase=${event.phase} count=${event.count ?? 0} durationMs=${Math.round(event.durationMs)}`,
        ),
    });
  } catch (error) {
    operationalDatabase.close();
    throw error;
  }
  if (operationalDatabase.mode === 'ready') {
    backfillBotBanners(registry, options.warn);
    backfillBotDescriptors(registry, options.warn);
    migrateLegacySouls(registry, options.warn);
  }
  const states = createBotStateTracker();
  const attachments = createAttachmentStore({
    rootDir: join(dshHome, 'botharness', 'attachments'),
  });
  const mediaVersions = createMediaVersions(attachments, () => loadImageProcessor(options.warn));
  const contentPurge = mountContentPurge({
    dshHome,
    database: operationalDatabase,
    attachments,
    derivatives: (ids, botSlugs) => {
      const references = memory.sourceReferences(ids);
      const slugs = [...new Set([...botSlugs, ...references.map((ref) => ref.botSlug)])].sort();
      return [
        ...references.map((ref) => ({
          kind: 'memory' as const,
          botSlug: ref.botSlug,
          location: ref.memoryDir ?? '',
          reference: ref.sha,
          tracking: ref.available ? ('recorded' as const) : ('unavailable' as const),
        })),
        ...slugs.flatMap((slug) =>
          grants.list(slug).map((grant) => ({
            kind: 'workspace' as const,
            botSlug: slug,
            location: grant.workspacePath,
            reference: grant.id,
            tracking: 'possible' as const,
          })),
        ),
      ];
    },
    ...(options.warn === undefined ? {} : { warn: options.warn }),
  });
  let runtime: BotRuntime | undefined;
  let companions: CompanionFeed | undefined;
  let reconcileToolRuleCreators: ((botSlug: string) => void) | undefined;
  const sourcePolicy = createBotSourcePolicyStore(
    attachOperationalModule(operationalDatabase, 'bot-inbox'),
  );
  const externalMessaging = createOutboundMessaging({
    channels: {
      get: (id) => channels.get(id),
      getOrCreateDm: (slug) => channels.getOrCreateDm(slug),
    },
    ownsFailure: (slug, sessionId, role) => {
      const owner = ownership.resolve(sessionId);
      return owner?.botSlug === slug && owner.rootRole === role;
    },
    onAuthorizationChanged: (slug) => reconcileToolRuleCreators?.(slug),
    onDefaultsChanged: () => live?.publishRosterCommitted(),
    onReceptionChanged: () => live?.publishRosterCommitted(),
    ...(options.capture === undefined ? {} : { capture: options.capture }),
    attachments,
    database: attachOperationalModule(operationalDatabase, 'messaging'),
    sourcePolicy,
    onAdmitted: (slug, sourceEventId) => runtime?.admitExternalSource?.(slug, sourceEventId),
    onPlaced: (commit) => live?.publishCommitted(commit),
    onShared: (slugs) => {
      for (const slug of slugs) runtime?.resumePendingDigests?.(slug);
    },
    onIngested: (channelId, messageId) => runtime?.admitGroupMessage(channelId, messageId),
    ...(options.imCommands === undefined ? {} : { imCommands: options.imCommands }),
    recover: operationalDatabase.mode === 'ready',
    isBotActive: (slug) => {
      const bot = registry.get(slug);
      return operationalDatabase.mode === 'ready' && bot !== undefined && bot.paused !== true;
    },
    ...(options.warn === undefined ? {} : { warn: options.warn }),
  });
  const initialGroupInvitationPolicy = options.autoAcceptGroupInvitations ?? (() => true);
  const assignmentLimits: { read: () => number }[] = [];
  const botHopLimits: { read: () => number }[] = [];
  const botHopLimit = (): number => {
    const value = (botHopLimits.at(-1)?.read ?? options.botHopLimit)?.();
    return isBotHopLimit(value) ? value : DEFAULT_BOT_HOP_LIMIT;
  };
  const groupInvitationPolicies: { policy: () => boolean }[] = [];
  const channels = createSqliteChannelStore({
    botHopLimit,
    autoAcceptGroupInvitations: () =>
      (groupInvitationPolicies.at(-1)?.policy ?? initialGroupInvitationPolicy)(),
    database: attachOperationalModule(operationalDatabase, 'messaging'),
    sourcePolicy,
    databaseOwnerReady: operationalDatabase.mode === 'ready',
    isBotActive: (botSlug) => {
      const bot = registry.get(botSlug);
      return bot !== undefined && bot.paused !== true;
    },
    attachments,
    mediaVersions,
    botDisplayName: (botSlug) => registry.getHistorical(botSlug)?.displayName,
    rootDir: join(dshHome, 'botharness', 'channels'),
    onCommitted: (commit) => {
      try {
        externalMessaging.failureAlerts.committed(commit);
      } catch {
        options.warn?.('failure-alert-notification-enqueue-failed');
      }
      try {
        const output = personaBotOutputCommitted(commit, ownership);
        if (output !== undefined) companions?.publish(output);
      } catch {
        options.warn?.('companion-output-publication-failed');
      }
      if (options.onOutputCommitted !== undefined) {
        try {
          const event = personaBotOutputCommitted(commit, ownership);
          if (event !== undefined) options.onOutputCommitted(event);
        } catch {
          options.warn?.('personabot-output-publication-failed');
        }
      }
      let publicationFailed = false;
      try {
        live?.publishCommitted(commit);
      } catch {
        publicationFailed = true;
      }
      void externalMessaging.forwardWebDm(commit);
      if (commit.message.memberDeparture !== undefined) {
        try {
          runtime?.admitGroupMessage(commit.channelId, commit.message.id);
        } catch {
          runtime?.retryGroupMessageAdmission?.(commit.channelId, commit.message.id);
          options.warn?.('group-admission-wake-failed-retrying');
        }
      }
      if (publicationFailed) options.warn?.('channel-live-publication-failed');
    },
    onRecordChanged: () => live?.publishRosterCommitted(),
    onAdmissionChanged: (channelId, messageId, message) =>
      live?.publishAdmission(channelId, messageId, message),
    onHumanReadChanged: (channelId, humanId, revision) =>
      live?.publishHumanRead(channelId, humanId, revision),
    onReactionChanged: (channelId, messageId, reactions) =>
      live?.publishReaction(channelId, messageId, reactions),
    onVoiceChanged: (channelId, messageId, message) =>
      live?.publishVoice(channelId, messageId, message),
    ...(options.warn === undefined ? {} : { warn: options.warn }),
  });
  const attention = createBotAttentionQuery(
    attachOperationalModule(operationalDatabase, 'messaging'),
    channels,
  );
  const inboxHistory = createInboxHistoryQuery(
    attachOperationalModule(operationalDatabase, 'messaging'),
    channels,
  );
  const humanAttentionDatabase = attachOperationalModule(operationalDatabase, 'human-attention');
  const humanAttention = createHumanAttentionQuery(
    humanAttentionDatabase,
    options.activeQuestionMessageIds,
    options.activeToolApprovalMessageIds,
    options.activePrivateInputMessageIds,
    () => {
      try {
        return roster.snapshot().muted;
      } catch {
        return [];
      }
    },
  );
  const humanAttentionDecisions = createHumanAttentionDecisions(humanAttentionDatabase);
  if (operationalDatabase.mode === 'ready') {
    const refreshDurableAttention = () =>
      states.replaceDurableAttention(
        humanAttention.durableAttention().filter((row) => registry.get(row.botSlug) !== undefined),
      );
    refreshDurableAttention();
    const durableAttention = coalesce(refreshDurableAttention, {
      delayMs: 100,
      maxWaitMs: 500,
    });
    states.syncDurableAttentionWith(durableAttention.flush);
    onOperationalDatabaseClose(operationalDatabase, () => {
      states.syncDurableAttentionWith(() => {});
      durableAttention.cancel();
    });
    operationalDatabase.subscribe(({ topics }) => {
      if (topics.includes('content-purge')) live?.publishContentPurged();
      if (
        topics.some((topic) =>
          ['bindings', 'grants', 'bot-schedules', 'content-purge', 'assignment-report'].includes(
            topic,
          ),
        )
      )
        live?.publishRosterCommitted();
      if (
        topics.some((topic) =>
          ['assignments', 'source-event', 'bot-inbox', 'channel', 'human-attention'].includes(
            topic,
          ),
        )
      )
        durableAttention.schedule();
    });
  }
  live = createChannelLiveHub(
    channels,
    {
      snapshot: () =>
        personaBotActivitySnapshot(
          registry.list().map((bot) => bot.slug),
          states,
        ),
      onChange: (changed) => states.onActivity((event) => changed(event)),
    },
    () => contentPurge.redactions(),
    (changed) =>
      watchHumanAttention(
        operationalDatabase,
        (notify) =>
          states.onActivity((event) => {
            if (event.cause === 'attention-changed') notify();
          }),
        changed,
      ),
  );
  if (operationalDatabase.mode === 'ready')
    for (const bot of registry.list())
      if (bot.paused === true) channels.cancelInvitationsForBot(bot.slug);
  const ownership = createSessionOwnership(
    attachOperationalModule(operationalDatabase, 'session-ownership'),
  );
  companions = createCompanionFeed({
    profileId: createHash('sha256')
      .update(options.companionProfileDir ?? dshHome)
      .digest('hex'),
    bot: (slug) => {
      const bot = registry.get(slug);
      return bot === undefined
        ? undefined
        : {
            slug,
            name: bot.displayName,
            paused: bot.paused === true,
            ...(bot.appearance === undefined ? {} : { appearance: bot.appearance }),
            ...(bot.avatarSeed === undefined ? {} : { avatarSeed: bot.avatarSeed }),
            ...(bot.avatar === undefined
              ? {}
              : {
                  avatar: bot.avatar.startsWith('data:image/')
                    ? botAvatarUrl(slug, bot.avatar)
                    : bot.avatar,
                }),
          };
    },
    activity: () =>
      personaBotActivitySnapshot(
        registry.list().map((bot) => bot.slug),
        states,
      ),
    onActivity: (changed) => states.onActivity(() => changed()),
    onIdentity: (changed) =>
      operationalDatabase.subscribe(({ topics }) => {
        if (topics.includes('bot-registry')) changed();
      }),
    observeOutput: (id, messageId) => channels.observeOutput(id, messageId),
    checkpoint: () => channels.outputCheckpoint(),
  });
  const memory = createMemoryService({
    registry,
    ownership,
    database: operationalDatabase,
    ...(options.warn === undefined ? {} : { warn: options.warn }),
  });
  usage =
    operationalDatabase.mode === 'ready'
      ? createUsageProjection({
          ownership,
          database: operationalDatabase,
          botCreatedAt: (slug) => registry.getHistorical(slug)?.createdAt,
        })
      : undefined;
  const grants = createWorkspaceGrantStore({
    database: attachOperationalModule(operationalDatabase, 'workspace-grants'),
    workspaces: options.workspaces ?? (() => undefined),
  });
  const toolRules = createToolApprovalRuleStore(
    attachOperationalModule(operationalDatabase, 'tool-approval-rules'),
    (botSlug, creator) => externalMessaging.toolRuleCreatorAuthorized(botSlug, creator),
  );
  reconcileToolRuleCreators = (slug) => {
    toolRules.reconcileExternal(slug);
    externalMessaging.approvals.refreshRules(slug);
  };
  const assignmentAccess = createAssignmentAccessStore(
    attachOperationalModule(operationalDatabase, 'assignment-access'),
  );
  const tob = createTobService({
    database: attachOperationalModule(operationalDatabase, 'tob'),
    registry,
    channels,
    grants,
    workspaceRoot: join(dshHome, 'botharness', 'tob-workspaces'),
    ...(options.ensureTobWorkspace ? { ensureWorkspace: options.ensureTobWorkspace } : {}),
    ...(options.tobSettings ? { settings: options.tobSettings } : {}),
  });
  const creations = createBotCreation({
    database: attachOperationalModule(operationalDatabase, 'bot-creation'),
    registry,
    channels,
    ...(options.warn === undefined ? {} : { log: options.warn }),
  });
  const zipImports = createBotZipImport({
    uploads: createBotZipUploads({
      rootDir: join(dshHome, 'botharness', 'zip-uploads'),
    }),
    imports: createBotImports(creations),
    registry,
    log: (event) => options.warn?.(JSON.stringify(event)),
  });
  const channelManagement = createChannelManagement({
    database: attachOperationalModule(operationalDatabase, 'channel-management'),
    channels,
    registry,
    isProtectedBot: (slug) => tob.isTob(slug),
    autoAcceptGroupInvitations: () =>
      (groupInvitationPolicies.at(-1)?.policy ?? initialGroupInvitationPolicy)(),
    onInvitation: (dmId, invitationId) => runtime?.admitGroupInvitation(dmId, invitationId),
    onJoinDecision: (dmId, requestId) => runtime?.admitGroupJoinDecision?.(dmId, requestId),
  });
  const profileRecovery = createProfileRecovery(operationalDatabase, registry, ownership);
  const orchestratorCwd = (bot: { slug: string }): string | undefined =>
    registry.memoryDirFor(bot.slug);
  const hostTools = new Set<string>();
  const botAgentSetups = new Set<BotAgentSetup>();
  const contributeBotAgentSetup = (contribute: BotAgentSetup): (() => void) => {
    botAgentSetups.add(contribute);
    return () => {
      botAgentSetups.delete(contribute);
    };
  };
  const runBotAgentSetups = (
    agentCtx: import('@deepseek-ai/cordis').Context,
    agent: import('@deepseek-ai/dsh-agent').Agent,
    info: BotAgentSetupInfo,
  ): void => {
    for (const contribute of [...botAgentSetups]) contribute(agentCtx, agent, info);
  };

  const schedules = createBotScheduleStore({
    database: attachOperationalModule(operationalDatabase, 'bot-schedules'),
    isBotActive: (slug) => {
      const bot = registry.get(slug);
      return operationalDatabase.mode === 'ready' && bot !== undefined && bot.paused !== true;
    },
    onAdmitted: (slug) => runtime?.admitScheduleFiring?.(slug),
    ...(options.warn === undefined ? {} : { warn: options.warn }),
  });
  const messagePerf: MessagePerfTracker = createMessagePerfTracker();
  const prompts = createPromptSettings({
    library: createPromptPresetLibrary(join(dshHome, 'botharness', 'prompt-presets')),
    registry,
    ownership,
  });
  const voiceProviders = new VoiceProviders({
    database: attachOperationalModule(operationalDatabase, 'voice'),
    credentials: options.credentials ?? (() => undefined),
    ...(options.voiceFetch === undefined ? {} : { fetch: options.voiceFetch }),
    ...(options.voiceLog === undefined ? {} : { log: options.voiceLog }),
  });
  const voiceSpeech: {
    speak?: Parameters<typeof createVoiceMessages>[0]['speak'];
  } = {};
  const voiceMessages = createVoiceMessages({
    providers: voiceProviders,
    bot: (slug) => withVoiceDefaults(registry.get(slug), () => voiceProviders.defaults()),
    channels,
    attachments: () => attachments,
    speak: async (input) => voiceSpeech.speak?.(input),
    ...(options.voiceLog === undefined ? {} : { log: options.voiceLog }),
  });
  const voiceZoom: { zoom?: VoiceCalls['zoom'] | undefined } = {};
  runtime = createBotRuntime({
    voiceMessages,
    callFrames: {
      zoom: (input) =>
        voiceZoom.zoom?.(input) ?? { released: true, messageId: input.messageId, cell: input.cell },
    },
    ...(options.botNetwork === undefined ? {} : { botNetwork: options.botNetwork }),
    ...(options.readTurnProgress === undefined
      ? {}
      : { readTurnProgress: options.readTurnProgress }),
    ...(options.autoContinueDelaysMs === undefined
      ? {}
      : { autoContinueDelaysMs: options.autoContinueDelaysMs }),
    ...(options.stopSettleTimeoutMs === undefined
      ? {}
      : { stopSettleTimeoutMs: options.stopSettleTimeoutMs }),
    ...(options.closeSessionApprovals === undefined
      ? {}
      : { closeSessionApprovals: options.closeSessionApprovals }),
    onTobDelegation: () => options.capture?.('tob:delegation_send', { surface: 'bot_tool' }),
    promptText: (slug) => {
      const sessionId = runtime?.currentOrchestratorSessionId?.(slug);
      return sessionId === undefined
        ? promptTextOf(promptPartTexts(prompts.resolved(slug)))
        : prompts.textForSession(sessionId);
    },
    promptLimits: (slug) => prompts.limits(slug),
    tob,
    triageContinuation: options.triageContinuation === true,
    inboxHistory,
    messagePerf,
    requireExecution: (slug) => profileRecovery.requireExecution(slug),
    schedules,
    assignmentConcurrencyLimit: () =>
      assignmentLimits.at(-1)?.read() ?? DEFAULT_ASSIGNMENT_CONCURRENCY_LIMIT,
    botHopLimit,
    ...(options.sessionArchive === undefined ? {} : { sessionArchive: options.sessionArchive }),
    beginAssignmentWait: (slug, sessionId) => states.beginAssignmentWait(slug, sessionId),
    database: operationalDatabase,
    externalMessaging,
    sourcePolicy,
    registry,
    channels,
    attachments,
    agents: options.agents ?? unavailableAgentAdapter(),
    ...(options.saveReportSpill === undefined ? {} : { saveReportSpill: options.saveReportSpill }),
    ...(options.readAssignmentTail === undefined
      ? {}
      : { readAssignmentTail: options.readAssignmentTail }),
    ...(options.readAssignmentReportPage === undefined
      ? {}
      : { readAssignmentReportPage: options.readAssignmentReportPage }),
    memory,
    ownership,
    grants,
    assignmentAccess,
    workspaceRoot: join(dshHome, 'botharness', 'runtime-workspaces'),
    orchestratorCwd,
    sessionArchived: (sessionId) =>
      options.workspaces?.()?.archivedSessionIds?.includes(sessionId) === true,
    ...(options.warn === undefined ? {} : { warn: options.warn }),
  });
  if (operationalDatabase.mode === 'ready') runtime.reconcileMemoryChangesOnStartup?.();
  const deletions = createPersonaBotDeletions({
    ...(options.capture === undefined ? {} : { capture: options.capture }),
    protectedPaths: [dshHome],
    database: operationalDatabase,
    registry,
    dependencies: (slug) => ({
      sessions: ownership
        .rootsFor(slug)
        .flatMap((root) => [
          root.sessionId,
          ...ownership.descendantsOf(root.sessionId).map((child) => child.sessionId),
        ])
        .sort(),
      workspaces: grants
        .list(slug)
        .filter((grant) => grant.revokedAt === undefined)
        .map((grant) => grant.workspacePath)
        .sort(),
      grants: [
        ...grants
          .list(slug)
          .filter((grant) => grant.revokedAt === undefined)
          .map((grant) => grant.id),
        ...toolRules.list(slug).map((rule) => rule.id),
        ...externalMessaging.deletionDependencies(slug).grants,
      ].sort(),
      identities: externalMessaging.deletionDependencies(slug).identities,
      channels: channels
        .list()
        .filter((channel) => channel.members.includes(slug) || channel.botSlug === slug)
        .map((channel) => channel.id)
        .sort(),
    }),
    allWorkspacePaths: () => [
      ...(options.workspaces?.()?.list() ?? []).map((workspace) => workspace.path),
      ...registry
        .listHistorical()
        .flatMap((bot) => [
          ...bot.workspaces,
          ...grants.list(bot.slug).map((grant) => grant.workspacePath),
          ...ownership
            .rootsFor(bot.slug, 'assignment')
            .flatMap((root) => (root.cwdReference === undefined ? [] : [root.cwdReference])),
        ]),
    ],
    stop: async (slug) => {
      channels.cancelInvitationsForBot(slug);
      for (const grant of grants.list(slug))
        if (grant.revokedAt === undefined) grants.revoke(slug, grant.id);
      for (const rule of toolRules.list(slug)) toolRules.revoke(slug, rule.id);
      await runtime?.stopBot?.(slug);
      await externalMessaging.disableBot(slug);
      await options.erasePrivateAccounts?.(slug);
    },
    changed: () => live?.publishRosterCommitted(),
    log: (event) => options.warn?.(JSON.stringify(event)),
  });
  const onboarding = createBotOnboarding({
    database: attachOperationalModule(operationalDatabase, 'bot-onboarding'),
    tob,
    registry,
    channels,
  });
  if (operationalDatabase.mode === 'ready') schedules.start();
  return {
    voiceProviders,
    voiceMessages,
    voiceSpeech,
    voiceZoom,
    prompts,
    deletions,
    profileRecovery,
    contentPurge,
    onboarding,
    tob,
    creations,
    zipImports,
    channelManagement,
    partLibrary,
    rootDir,
    operationalDatabase,
    externalMessaging,
    registry,
    modelPresets,
    configureBotHopLimit: (read) => {
      const registration = { read };
      botHopLimits.push(registration);
      return () => {
        const index = botHopLimits.indexOf(registration);
        if (index !== -1) botHopLimits.splice(index, 1);
      };
    },
    configureAssignmentConcurrencyLimit: (read) => {
      const registration = { read };
      assignmentLimits.push(registration);
      return () => {
        const index = assignmentLimits.indexOf(registration);
        if (index !== -1) assignmentLimits.splice(index, 1);
      };
    },
    configureGroupInvitations: (autoAccept) => {
      const registration = { policy: autoAccept };
      groupInvitationPolicies.push(registration);
      return () => {
        const index = groupInvitationPolicies.indexOf(registration);
        if (index !== -1) groupInvitationPolicies.splice(index, 1);
      };
    },
    contributeBotAgentSetup,
    runBotAgentSetups,
    hostTools,
    states,
    ownership,
    memory,
    ...(usage === undefined ? {} : { usage }),
    messagePerf,
    grants,
    toolRules,
    assignmentAccess,
    channels,
    attention,
    inboxHistory,
    sourcePolicy,
    schedules,
    humanAttention,
    humanAttentionDecisions,
    attachments,
    mediaVersions,
    live,
    companions,
    roster,
    runtime,
  };
}

export function apply(ctx: Context, config: BotHarnessConfig): void {
  if (!config.enabled) return;
  const profile = ctx.get('profileContext') as { installAnchor: string; dir: string } | undefined;
  const releaseAnchors =
    profile === undefined ? [] : [profile.installAnchor, join(profile.dir, 'package.json')];
  installedPackage.identity(releaseAnchors);
  const dshHome = resolveDshHome();
  applyPendingDataReset({
    dshHome,
    home: homedir(),
    log: (message) => ctx.logger.info(message),
  });
  mountClientDiagnostics(ctx, dshHome);
  let clientIssues: ClientIssueReporter | undefined;
  const diagnosticEvents = mountDiagnosticLog(ctx, {
    onClientEntries: (session, entries) => clientIssues?.observe(session, entries),
    dshHome,
    homes: [
      { path: dshHome, label: '$DSH_HOME' },
      { path: homedir(), label: '~' },
    ],
    environment: () => {
      const dshVersion = installedDshVersion();
      return {
        version: runningRelease.version,
        ...(dshVersion === undefined ? {} : { dshVersion }),
        platform: process.platform,
        arch: process.arch,
        node: process.version,
      };
    },
  });
  const release = installedRelease(import.meta.url);
  const telemetryChoice = telemetryDecision(config.telemetry);
  const telemetryDir = join(dshHome, 'botharness');
  const telemetry = createTelemetryService({
    decision: telemetryChoice,
    dataDir: telemetryDir,
    pluginVersion: release.version(),
    dshVersion: installedDshVersion(),
    log: (message) => ctx.logger.info(message),
  });
  const telemetryState = telemetry.status();
  ctx.logger.info(
    telemetryState.enabled
      ? 'telemetry phase=enabled'
      : `telemetry phase=disabled reason=${telemetryState.lockedBy ?? 'preference'}`,
  );
  ctx.effect(() => () => void telemetry.close(), 'botharness: telemetry');
  telemetry.capture('app:host_start');
  clientIssues = createClientIssueReporter({ telemetry });
  const activeDay = createActiveDay({ telemetry, dataDir: telemetryDir });
  deliverPendingExceptions(telemetry, telemetryDir);
  if (telemetryState.lockedBy === undefined)
    ctx.effect(
      () =>
        installExceptionCapture({
          dataDir: telemetryDir,
          enabled: () => telemetry.enabled,
        }),
      'botharness: telemetry exceptions',
    );
  const git = createGitService({
    dshHome,
    log: (message) => ctx.logger.info(message),
  });
  const resolvedGit = git.resolve();
  ctx.logger.info(
    resolvedGit.available
      ? `git phase=resolved source=${resolvedGit.source} version=${resolvedGit.version}`
      : `git phase=resolved unavailable=${resolvedGit.reason}`,
  );
  let publishDraft: (event: ChannelDraftEvent) => void = () => undefined;
  let voiceDrafts: (event: ChannelDraftEvent) => void = () => undefined;
  const defaultModel = (ctx as unknown as { agentDefaultModel: DshDefaultModelHost })
    .agentDefaultModel;
  const providerCredentials = createProviderCredentialHealth();
  const forgetCredentialFailures = (): void => providerCredentials.reset();
  const events = ctx as unknown as {
    on(event: string, listener: () => void): () => void;
  };
  for (const event of [
    'credentials/reference-updated',
    'credentials/record-updated',
    'settings/document-updated',
    'llm/adapters-updated',
  ])
    events.on(event, forgetCredentialFailures);
  const modelCatalog = createModelCatalog(ctx.llm, {
    credentials: providerCredentials,
    credentialFailure: createCredentialReadiness({
      providers: () => ctx.llm.listConfigurableProviders(),
      settings: () =>
        (
          ctx.get('settings') as unknown as
            | {
                describe(options: { redactSecrets: boolean }): { ns: string; value: unknown }[];
              }
            | undefined
        )?.describe({ redactSecrets: true }) ?? [],
      describe: async (ref) => {
        const credentials = ctx.get('credentials') as unknown as
          | { describe(ref: string): Promise<{ configured: boolean }> }
          | undefined;
        if (!credentials) throw new Error('Native credentials service is unavailable');
        return credentials.describe(ref);
      },
    }),
    defaultRoute: () => {
      const selection = defaultModel.currentSelection();
      return {
        provider: selection.provider,
        model: selection.model,
        ...(selection.reasoningEffort === undefined
          ? {}
          : { reasoningEffort: selection.reasoningEffort }),
      };
    },
  });
  const modelReadiness = createModelRouteReadiness(
    {
      get: (slug) => core.registry.get(slug),
      migrateLegacyModel: (slug, expectedModel, route) =>
        core.registry.migrateLegacyModel(slug, expectedModel, route),
    },
    modelCatalog,
  );
  const privateExecution = new ProtectedExecution(
    privateInputLog((format, value) => ctx.logger.info(format, value), diagnosticEvents),
  );
  const turnRefusals = new Map<string, string>();
  ctx.effect(() => () => turnRefusals.clear(), 'botharness: refused Turn reasons');
  const agentAdapter = createDshBotAgentAdapter({
    agents: ctx.agents,
    promptText: (sessionId) => core.prompts.textForSession(sessionId),
    defaultModel,
    observeTurnFailure: (provider, code) => providerCredentials.observe(provider, code),
    turnRefusal: (sessionId) => turnRefusals.get(sessionId),
    resolveModelPlan: (slug) => core.registry.get(slug)?.modelPlan,
    subagentTools: (slug) =>
      createBotSubagentModelTools(ctx, () => core.registry.get(slug)?.modelPlan, config.subagent),
    hasSession: async (sessionId) => {
      const persistence = ctx.get('sessionPersistence') as unknown as
        | { stat(id: string): Promise<unknown> }
        | undefined;
      if (persistence === undefined) throw new Error('DSH Session Persistence is unavailable');
      return (await persistence.stat(sessionId)) !== undefined;
    },
    prepareModelRoute: (slug, role, retainedRoute) => {
      core.profileRecovery.requireExecution(slug);
      return modelReadiness.prepare(slug, role, retainedRoute);
    },
    orchestratorCwd: (bot) => core.registry.memoryDirFor(bot.slug),
    workspaceGrants: (slug) => core.grants.list(slug),
    observePreparation: (slug, sessionId, preparing) => {
      if (!preparing && core.states.snapshot(slug).sessions[sessionId] !== 'thinking') return;
      core.states.setSessionState(
        slug,
        sessionId,
        preparing ? 'thinking' : 'done',
        undefined,
        'orchestrator',
      );
    },
    defaultAgentPreset: config.agentPreset ?? DEFAULT_AGENT_PRESET,
    resolveAgentPresets: () => ctx.get('agentPresets') as DshAgentPresetHost | undefined,
    publishDraft: (event) => publishDraft(event),
    onAgentSetup: (agentCtx, agent, info) => core.runBotAgentSetups(agentCtx, agent, info),
    onOrchestratorFileSetup: (agentCtx, agent) =>
      installOrchestratorFileTools(
        agentCtx,
        agent,
        ctx.get('agentPresets') as DshAgentPresetHost | undefined,
        (name, args) => nativeExecutionRoot(core, agent.session, name, args),
        (shellCtx, shell) =>
          installTobCliShell(shellCtx, shell, {
            capture: (execution) => {
              const actor = execution.agent;
              if (
                !actor ||
                !core.tob.isTob(core.ownership.resolve(actor.session.id)?.botSlug ?? '')
              )
                return undefined;

              let source: (() => void) & { markSideEffect?: () => void };
              try {
                source =
                  core.runtime.captureTobCliAuthority?.(actor.session.id) ??
                  (() => {
                    throw new TobError('tob-authority-required');
                  });
              } catch (error) {
                source = () => {
                  throw error;
                };
              }
              const authorize = () => {
                if (execution.signal.aborted) throw new TobError('agent-context-expired');
                source();
                const denial = grantExecutionDenial(
                  core,
                  actor.session,
                  ctx.get('sandboxPolicy'),
                  ctx.get('approval'),
                );
                if (denial) throw new TobError('tob-authority-required');
              };
              const started = Date.now();
              return {
                signal: execution.signal,
                authorize,
                prepareOperation: async (command, args) => {
                  const prepared =
                    (await tobModelOperations(command, args)) ??
                    (await tobMaintenanceOperations(command, args)) ??
                    (await tobBotCreationOperations(command, args)) ??
                    (await tobBotProfileOperations(command, args)) ??
                    (await tobShareDraftOperations(command, args)) ??
                    (await tobChannelOperations(command, args)) ??
                    (await tobVoiceOperations(command, args));
                  if (!prepared || !['create', 'group-create'].includes(command)) return prepared;
                  return {
                    ...prepared,
                    run: async (guard, beforeEffect) => {
                      guard();
                      core.onboarding.trackCreation(
                        command,
                        String(args.operationKey),
                        actor.session.id,
                        started,
                      );
                      return prepared.run(guard, beforeEffect);
                    },
                  };
                },
                capabilities: [
                  ...TOB_MODEL_CAPABILITIES,
                  ...TOB_MAINTENANCE_CAPABILITIES,
                  ...TOB_BOT_CREATE_CAPABILITIES,
                  ...TOB_BOT_PROFILE_CAPABILITIES,
                  ...TOB_SHARE_DRAFT_CAPABILITIES,
                  ...TOB_CHANNEL_CAPABILITIES,
                  ...TOB_VOICE_CAPABILITIES,
                ],
                beforeWrite: () => source.markSideEffect?.(),
                readSetting: () => core.tob.readSetting(),
                writeSetting: (value, revision, guard) =>
                  core.tob.writeSetting(value, revision, () => {
                    guard();
                    source.markSideEffect?.();
                  }),
                approve: async (operation, signal) => {
                  source();
                  return approveTobCliOperation({
                    execution,
                    operation,
                    signal,
                    authorize: source,
                    approval: ctx.get('approval') as ApprovalService | undefined,
                    channelApproval: toolApproval,
                    fullAccess: () => sessionHasFullAccess(core, actor.session.id),
                  });
                },
                log: (phase, details) =>
                  ctx.logger.info('tob-cli %j', {
                    phase,
                    sessionId: actor.session.id,
                    callId: execution.callId,
                    initiator: 'tob-native-shell',
                    durationMs: Date.now() - started,
                    ...details,
                  }),
              };
            },
          }),
      ),
    authorizeBorrow: (agent, role) => {
      const denial = borrowedAgentDenial(core, agent.session, role);
      if (denial !== undefined) throw new Error(denial);
    },
    admitSession: (agent) =>
      void admitBotSession(
        core,
        agent.session,
        undefined,
        ctx.get('sandboxPolicy'),
        ctx.get('approval'),
      ),
  });
  let userQuestions: ChannelUserQuestions | undefined;
  let toolApproval: ChannelToolApproval | undefined;
  let privateInputs: PrivateInputs | undefined;
  let imCommandServices: import('./messaging/im-commands.js').ImCommandServices | undefined;
  let botNetwork: import('./runtime/bot-network.js').BotNetworkPort | undefined;
  const core = createCore({
    credentials: () => ctx.get('credentials'),
    voiceLog: (phase, fields) => diagnosticEvents.record('voice', phase, fields),
    botNetwork: {
      contacts: () => botNetwork?.contacts() ?? [],
      availability: (hostId, botSlug) =>
        botNetwork?.availability?.(hostId, botSlug) ?? 'unavailable',
      refresh: async () => {
        await botNetwork?.refresh?.();
      },
      membership: (hostId) => botNetwork?.membership?.(hostId) ?? Promise.resolve('unavailable'),
      send: (hostId, message) =>
        botNetwork === undefined
          ? Promise.reject(new BotNetworkDeliveryError('unable-to-deliver'))
          : botNetwork.send(hostId, message),
    },
    dshHome,
    triageContinuation: true,
    companionProfileDir: (ctx.get('profileContext') as { dir: string } | undefined)?.dir,
    onOutputCommitted: (event) =>
      emitPersonaBotOutputCommitted(ctx, event, (message) => ctx.logger.warn(message)),
    activeQuestionMessageIds: () => userQuestions?.activeMessageIds() ?? [],
    activeToolApprovalMessageIds: () => toolApproval?.activeMessageIds() ?? [],
    closeSessionApprovals: (sessionIds) => toolApproval?.closeSessions(sessionIds),
    activePrivateInputMessageIds: () => privateInputs?.activeMessageIds() ?? [],
    erasePrivateAccounts: async (slug) => {
      await privateInputs?.mcpServers?.erase(slug);
      await privateInputs?.eraseBot(slug);
    },
    capture: (event, properties) => telemetry.capture(event, properties),
    warn: (message) => ctx.logger.warn(message),
    agents: agentAdapter,
    saveReportSpill: async ({ sessionId, content }) => {
      const spillStore = ctx.get('spillStore') as unknown as
        | {
            saveText(input: {
              owner: { sessionId: string };
              source: {
                kind: 'session-reference';
                sessionId: string;
                label: string;
              };
              suggestedName: string;
              content: string;
            }): Promise<{
              locator: string;
              bytes: number;
              retrievalHint: string;
            }>;
          }
        | undefined;
      if (spillStore === undefined) throw new Error('DSH Spill service is unavailable');
      return spillStore.saveText({
        owner: { sessionId },
        source: {
          kind: 'session-reference',
          sessionId,
          label: 'Assignment report',
        },
        suggestedName: 'assignment-report.txt',
        content,
      });
    },
    readAssignmentTail: async (sessionId) => {
      const query = ctx.get('sessionQuery') as unknown as AssignmentSessionQuery | undefined;
      if (query === undefined) throw new Error('DSH Session Query is unavailable');
      return readBoundedAssignmentTail(query, sessionId);
    },
    readTurnProgress: async (sessionId) => {
      const query = ctx.get('sessionQuery') as unknown as
        | {
            readSession(id: string): Promise<{ events: readonly DshSessionEvent[] }>;
          }
        | undefined;
      if (query === undefined) return undefined;
      return turnProgress((await query.readSession(sessionId)).events);
    },
    readAssignmentReportPage: async (sessionId, acceptedSummary, offset, content) => {
      const query = ctx.get('sessionQuery') as unknown as AssignmentSessionQuery | undefined;
      if (query === undefined) throw new Error('DSH Session Query is unavailable');
      return readAssignmentReportPage(query, sessionId, acceptedSummary, offset, content);
    },
    ensureTobWorkspace: async (path) => {
      const owner = ctx.get('workspaceRegistry') as unknown as
        | { create(path: string, title: string): Promise<{ id: string }> }
        | undefined;
      if (!owner) throw new Error('workspace-unavailable');
      return owner.create(path, 'Tob');
    },
    tobSettings: () => ctx.get('settings') as unknown as TobSettingsProvider | undefined,
    workspaces: () => ctx.get('workspaceRegistry') as unknown as DshWorkspaceLookup | undefined,
    sessionArchive: () =>
      ctx.get('workspaceRegistry') as unknown as NativeSessionArchive | undefined,
    imCommands: () => imCommandServices,
  });
  publishDraft = (event) => {
    core.live.publishDraft(event);
    try {
      voiceDrafts(event);
    } catch (error) {
      diagnosticEvents.record('voice', 'call-draft-failed', {
        error: String(error).slice(0, 200),
      });
    }
  };
  ctx.effect(() => () => core.operationalDatabase.close(), 'botharness: operational database');
  ctx.effect(() => () => core.contentPurge.close(), 'botharness: purge ledger');
  const storage = createStorageCleanup({
    dshHome,
    database: core.operationalDatabase,
    attachments: core.attachments,
    channels: core.channels,
    memoryDirs: () =>
      core.registry.listHistorical().flatMap((bot) => core.registry.memoryDirFor(bot.slug) ?? []),
    memoryReferences: () => memoryAttachmentReferences(core.registry, core.deletions),
    botName: (slug) => core.registry.get(slug)?.displayName,
  });
  ctx.effect(
    () =>
      startAttachmentSweep({
        attachments: core.attachments,
        database: core.operationalDatabase,
        channelReferences: () => core.channels.referencedAttachmentHashes(),
        memoryReferences: () => memoryAttachmentReferences(core.registry, core.deletions),
        log: (message) => ctx.logger.info(message),
      }),
    'botharness: attachment sweep',
  );
  ctx.effect(
    () =>
      startMediaBackfill({
        fileIds: () => core.channels.referencedAttachmentHashes(),
        versions: core.mediaVersions,
        log: (message) => ctx.logger.info(message),
      }),
    'botharness: media backfill',
  );
  let connectAccount: ConnectAccount | undefined;
  let voiceCalls: VoiceCalls | undefined;
  mountDevicePairing(ctx, {
    calls: () => voiceCalls,
    botNetwork: {
      registry: core.registry,
      channels: core.channels,
      admitBotDmMessage: (channelId, messageId) =>
        core.runtime.admitBotDmMessage(channelId, messageId),
      withdrawNetworkMembership: (hostId) => core.runtime.withdrawNetworkMembership(hostId),
      available: (port) => {
        botNetwork = port;
      },
    },
    telemetry,
    onAccount: (account) => {
      connectAccount = account;
    },
    requestStatus: (channelId, messageId) => core.channels.humanSendStatus?.(channelId, messageId),
    database: core.operationalDatabase,
    dshHome,
    packageAnchors: releaseAnchors,
    credentials: () => ctx.get('credentials'),
    push: {
      source: humanInboxPushSource(
        core.humanAttention,
        (slug) => core.registry.get(slug)?.displayName,
        (channelId, messageId) => core.channels.message(channelId, messageId)?.toolApprovalRequest,
      ),
      watch: (changed) => {
        const offDatabase = core.operationalDatabase.subscribe(({ topics }) => {
          if (topics.some((topic) => PUSH_TOPICS.has(topic))) changed();
        });
        const offActivity = core.states.onActivity((event) => {
          if (event.cause === 'attention-changed') changed();
        });
        return () => {
          offDatabase();
          offActivity();
        };
      },
    },
  });
  if (core.operationalDatabase.mode === 'ready' && telemetryState.lockedBy === undefined) {
    const usageDatabase = attachOperationalModule(core.operationalDatabase, 'telemetry');
    ctx.effect(
      () =>
        startDailyUsage({
          telemetry,
          dataDir: telemetryDir,
          counts: (since, until) => readDailyUsageCounts(usageDatabase, since, until),
          log: (message) => ctx.logger.info(message),
        }),
      'botharness: telemetry daily usage',
    );
    ctx.effect(
      () =>
        startActiveDayWatch({
          activeDay,
          counts: (since) => readHumanMessageCounts(usageDatabase, since),
          log: (message) => ctx.logger.info(message),
        }),
      'botharness: telemetry active day',
    );
  }
  ctx.effect(() => () => core.roster.detach(), 'botharness: roster');
  ctx.effect(() => {
    const controller = new AbortController();
    if (core.operationalDatabase.mode === 'ready')
      void core.channels.migrateAttachments?.(controller.signal).catch(() => {
        if (!controller.signal.aborted)
          ctx.logger.warn('attachment-migration phase=failed action=inspect-database-and-restart');
      });
    return () => controller.abort();
  }, 'botharness: retained attachment migration');
  ctx.effect(() => () => core.runtime.close(), 'botharness: bot runtime');
  ctx.effect(() => () => core.schedules.close(), 'botharness: bot schedules');
  ctx.effect(() => () => core.live.close(), 'botharness: Channel live hub');
  ctx.effect(() => () => core.companions.close(), 'botharness: Window Companion feed');
  ctx.provide('botharness', core);
  if (config.privateInputExecution === true)
    ctx.logger.warn(
      'botharness: privateInputExecution is set, but the Docker-protected Profile was removed. This Profile runs as an ordinary Profile: secret input stays available, and Agent tools are no longer fenced by a container.',
    );
  const secretMcpStore = createSecretMcpStore(
    attachOperationalModule(core.operationalDatabase, 'secret-mcp'),
  );
  privateInputs = mountPrivateInputs(
    ctx,
    core,
    privateExecution,
    config.privateInputWebUrl,
    undefined,
    secretMcpStore,
    diagnosticEvents,
  );
  const takeovers = createCoreTakeoverHandoffs(ctx, core, diagnosticEvents);
  mountTakeoverTools(ctx, core, takeovers);
  ctx.effect(() => () => core.externalMessaging.close(), 'botharness: external messaging');
  const cloudConnections = new CloudConnections(
    attachOperationalModule(core.operationalDatabase, 'messaging'),
    () => ctx.get('credentials'),
    undefined,
    (phase, id) => ctx.logger.info('cloud-connection %j', { phase, id }),
  );
  core.cloudConnections = cloudConnections;
  const cloudWork = new CloudWork(
    attachOperationalModule(core.operationalDatabase, 'messaging'),
    cloudConnections,
    core.externalMessaging.inbound,
    (slug) => {
      const bot = core.registry.get(slug);
      return bot !== undefined && bot.paused !== true;
    },
    (phase, requestId) => ctx.logger.info('cloud-work %j', { phase, requestId }),
  );
  core.cloudWork = cloudWork;
  ctx.effect(() => () => cloudWork.close(), 'botharness: cloud work');
  core.hostTools.add('cloud_work');
  ctx.effect(
    () => () => {
      core.hostTools.delete('cloud_work');
    },
    'botharness: cloud work tool name',
  );
  ctx.effect(
    () =>
      core.contributeBotAgentSetup((agentCtx, agent, info) => {
        if (info.rootRole === 'orchestrator')
          agentCtx.tools.register(
            createCloudWorkTool(
              cloudWork,
              info.botSlug,
              (call) =>
                call.agent === agent &&
                ctx.agents.get(agent.id) === agent &&
                core.ownership.resolve(agent.session.id)?.botSlug === info.botSlug,
            ),
          );
      }),
    'botharness: cloud work tool',
  );
  ctx.effect(() => () => cloudConnections.close(), 'botharness: cloud connections');
  if (core.operationalDatabase.mode === 'ready')
    ctx.effect(() =>
      core.externalMessaging.register(
        createCloudProvider(cloudConnections, (phase, id, code) =>
          ctx.logger.info('cloud-messaging %j', { phase, id, code }),
        ),
      ),
    );
  ctx.inject(['dshIm'], (child) => {
    for (const platform of ['feishu', 'slack', 'discord', 'weixin', 'qq'] as const) {
      const provider = createDshImProvider(child.get('dshIm'), platform);
      if (provider !== undefined) child.effect(() => core.externalMessaging.register(provider));
    }
  });

  const permissionDenial = (session: import('@deepseek-ai/dsh-session').Session) =>
    grantExecutionDenial(core, session, ctx.get('sandboxPolicy'), ctx.get('approval'));

  const appliedPermission = new Map<string, string>();
  ctx.effect(() => () => appliedPermission.clear(), 'botharness: Orchestrator permission record');
  const recordOrchestratorPermission = (
    session: import('@deepseek-ai/dsh-session').Session,
    changed: boolean,
  ): void => {
    const owner = core.ownership.resolve(session.id);
    if (
      owner?.rootRole !== 'orchestrator' ||
      owner.provenance === 'subagent' ||
      owner.parentSessionId !== undefined
    )
      return;
    const expected = orchestratorPermission(core, owner.botSlug);
    const key = expected.mode + '+' + expected.approval;
    const changedOutside = changed && appliedPermission.get(session.id) === key;
    appliedPermission.set(session.id, key);
    if (!changedOutside) return;
    ctx.logger.warn(
      'botharness: restored the permission mode of an Orchestrator Session that was changed outside the PersonaBot access setting',
    );
    const channel = core.channels.getOrCreateDm(owner.botSlug);
    if (channel !== undefined)
      void core.channels
        .appendMessage(channel.id, {
          id: randomUUID(),
          at: new Date().toISOString(),
          author: { kind: 'bot', slug: owner.botSlug },
          body: '这个会话的权限模式被单独改动过，Host 已把它恢复。聊天会话的权限由此 Bot 工作区设置里的“完全访问”开关决定，不能在会话里单独修改。',
        })
        .catch(() => undefined);
  };
  const reviewing = new Set<string>();
  const idleCompactionSettings = createIdleCompactionSettings(join(dshHome, 'botharness'));
  const compactionPolicy = (): CompactionThresholdPolicy => {
    const value = idleCompactionSettings.read();
    if (value === 'invalid') return {};
    return {
      ...(value.thresholdRatio === undefined ? {} : { thresholdRatio: value.thresholdRatio }),
      ...(value.headroomTokens === undefined ? {} : { headroomTokens: value.headroomTokens }),
    };
  };
  let compactionBaseConfig: Record<string, unknown> | undefined;
  const targetCompactionEngines = new WeakSet<object>();
  const installTargetCompaction = (engine: PressureCompactionEngine): void => {
    if (targetCompactionEngines.has(engine)) return;
    const original = engine.compactIfNeeded;
    if (typeof original !== 'function' || typeof engine.compactRegion !== 'function') return;
    targetCompactionEngines.add(engine);
    const fallback = original.bind(engine);
    const compactToTarget = createTargetCompaction({
      measure: (session) =>
        (
          ctx.get('tokenMeter') as unknown as {
            measure(session: unknown): PricedSurface;
          }
        ).measure(session),
      prune: (session) =>
        (
          ctx.get('toolResultPruner') as unknown as
            | { pruneSession(session: unknown): void }
            | undefined
        )?.pruneSession(session),
      compactRegion: (start, end, agent, signal) =>
        engine.compactRegion!(start, end, agent, signal),
      log: (level, event) => ctx.logger[level](`context-compaction ${JSON.stringify(event)}`),
    });
    engine.compactIfNeeded = async (agent, trigger, signal) => {
      if (trigger !== 'pressure' || core.ownership.resolve(agent.session.id) === undefined)
        return fallback(agent, trigger, signal);
      const route = agent.session.requestHeader()?.config;
      if (route === undefined || ctx.get('tokenMeter') === undefined)
        return fallback(agent, trigger, signal);
      const info = await ctx.llm.resolveModelInfo(route.provider, route.model, signal);
      const contextWindow = info.context?.contextWindow;
      if (contextWindow === undefined) return fallback(agent, trigger, signal);
      const modelPolicies = (compactionBaseConfig ?? engine.config)?.['modelPolicies'];
      const threshold = compactionThresholdTokens(
        {
          ...(Array.isArray(modelPolicies)
            ? {
                modelPolicies: modelPolicies as NonNullable<
                  CompactionThresholdPolicy['modelPolicies']
                >,
              }
            : {}),
          ...compactionPolicy(),
        },
        route,
        contextWindow,
        route.maxTokens ?? info.defaultMaxTokens ?? 0,
      );
      if (threshold <= 0) return fallback(agent, trigger, signal);
      return compactToTarget(agent, threshold, signal);
    };
  };
  const applyCompactionPolicy = (): void => {
    const engine = ctx.get('compaction') as unknown as PressureCompactionEngine | undefined;
    if (engine !== undefined) installTargetCompaction(engine);
    const config = engine?.config;
    if (engine === undefined || typeof config !== 'object' || !('thresholdRatio' in config)) return;
    compactionBaseConfig ??= config;
    const policy = compactionPolicy();
    const thresholdRatio = policy.thresholdRatio ?? compactionBaseConfig['thresholdRatio'];
    const headroomTokens = policy.headroomTokens ?? compactionBaseConfig['headroomTokens'];
    if (config['thresholdRatio'] === thresholdRatio && config['headroomTokens'] === headroomTokens)
      return;
    engine.config = Object.freeze({
      ...compactionBaseConfig,
      thresholdRatio,
      headroomTokens,
    });
  };
  installNativeSubagentWake(ctx, core.runtime);
  applyCompactionPolicy();
  ctx.on(
    'agent/pre-step',
    async ({ agent, signal }, next) => {
      applyCompactionPolicy();
      if (isApprovalReviewSession(agent.session.id))
        return reviewing.has(agent.session.id) ? next() : { kind: 'reject' };
      try {
        await core.runtime.ensureAssignmentCapacity?.(agent.session.id, signal);
      } catch {
        return { kind: 'reject' };
      }
      const repairs = new Set<BotSessionRepair>();
      const denial = admitBotSession(
        core,
        agent.session,
        undefined,
        ctx.get('sandboxPolicy'),
        ctx.get('approval'),
        (repair) => repairs.add(repair),
      );
      if (ctx.get('sandboxPolicy') !== undefined && ctx.get('approval') !== undefined)
        recordOrchestratorPermission(agent.session, repairs.has('orchestrator'));
      if (repairs.has('assignment'))
        ctx.logger.warn(
          'botharness: restored the permission mode of an Assignment Session that was changed outside its permission snapshot',
        );
      if (denial !== undefined) {
        turnRefusals.set(agent.session.id, sessionRefusalMessage(denial));
        return { kind: 'reject' };
      }
      turnRefusals.delete(agent.session.id);
      const contextOwner = core.ownership.resolve(agent.session.id);
      if (contextOwner?.rootRole === 'orchestrator' && contextOwner.parentSessionId === undefined)
        await compactUnknownContext(
          agent,
          signal,
          compactionPolicy(),
          agentAdapter.modelSelection(agent.session.id),
        );
      const decision = await next();
      return contextOwner === undefined
        ? decision
        : restartEmptyToolSeries(agent.session, decision);
    },
    { global: true },
  );
  ctx.on(
    'agent/request-error',
    createBotRequestRetry({
      isBotSession: (sessionId) => core.ownership.resolve(sessionId) !== undefined,
      log: (message) => ctx.logger.info(message),
    }),
    { global: true },
  );
  const approvalTemplates = createApprovalTemplateLibrary(
    join(dshHome, 'botharness', 'approval-templates'),
  );
  const approvalReviewer = createApprovalReviewerSettings(join(dshHome, 'botharness'));
  const liveAgent = (sessionId: string) =>
    ctx.agents.list().find((agent) => agent.session.id === sessionId);
  const idleCompaction = createIdleCompaction({
    settings: idleCompactionSettings,
    orchestratorBot: (sessionId) => {
      const owner = core.ownership.resolve(sessionId);
      if (owner?.rootRole !== 'orchestrator' || owner.parentSessionId !== undefined)
        return undefined;
      return core.runtime.currentOrchestratorSessionId?.(owner.botSlug) === sessionId
        ? owner.botSlug
        : undefined;
    },
    botBusy: (botSlug) =>
      (core.runtime.hasPendingInbox?.(botSlug) ?? true) ||
      (core.runtime.turnRunning?.(botSlug) ?? true),
    agent: liveAgent,
    measure: (agent) =>
      (
        ctx.get('tokenMeter') as unknown as
          | { measure(session: unknown): { totalTokens: number } }
          | undefined
      )?.measure(agent.session).totalTokens,
    threshold: async (agent, route) => {
      const info = await ctx.llm.resolveModelInfo(route.provider, route.model);
      return compactionThresholdTokens(
        compactionPolicy(),
        route,
        contextCapacity(info.context?.contextWindow).contextWindow,
        agent.session.requestHeader()?.config.maxTokens ?? info.defaultMaxTokens ?? 0,
      );
    },
    compactNow: async (agent, signal) => {
      const commands = ctx.get('commands') as unknown as CompactCommandRunner | undefined;
      if (commands === undefined) throw new IdleCompactionError('unavailable');
      return runCompactCommand(commands, agent, signal);
    },
    record: (record) => core.usage?.recordIdleCompaction(record),
    log: (event) => ctx.logger.info(`idle-compaction ${JSON.stringify(event)}`),
  });
  ctx.effect(() => () => idleCompaction.close(), 'botharness: idle compaction');
  const compactReservedSession = async (sessionId: string) => {
    const result = await idleCompaction.compactNow(sessionId, true);
    if (result.outcome === 'nothing')
      refreshSessionTexts(
        {
          ownership: core.ownership,
          memory: core.memory,
          prompts: core.prompts,
          warn: (message) => ctx.logger.warn(message),
        },
        sessionId,
      );
    return result;
  };
  const compactBot = (slug: string) =>
    core.runtime.compactOrchestrator
      ? core.runtime.compactOrchestrator(slug, compactReservedSession)
      : Promise.resolve({
          outcome: 'not-loaded' as const,
          tokensBefore: null,
          tokensAfter: null,
        });
  let reviewLogs: LogDatabase | undefined;
  try {
    reviewLogs = openLogDatabase({ dir: join(dshHome, 'botharness') });
  } catch {
    reviewLogs = undefined;
  }
  ctx.effect(() => () => reviewLogs?.close(), 'botharness: approval review logs');
  const templateInUse = approvalTemplateInUse(core.registry);
  const autoApproval: ToolAutoApproval = {
    template: (slug) => {
      const name = core.registry.get(slug)?.approvalTemplate;
      const template = name === undefined ? undefined : approvalTemplates.get(name);
      return template === undefined ? undefined : { name: template.name, text: template.text };
    },
    templateInUse,
    excerptLimits: (slug) => {
      const limits = core.prompts.limits(slug);
      return {
        humanMessages: limits['review-human-messages'],
        humanMessageChars: limits['review-human-message-chars'],
        toolCalls: limits['review-tool-calls'],
      };
    },
    review: createApprovalReviewRunner({
      setting: () => approvalReviewer.model(),
      botRoute: (slug) => {
        const own = core.registry.get(slug)?.modelPlan?.orchestrator;
        if (own !== undefined) return own;
        try {
          return defaultModel.currentSelection();
        } catch {
          return undefined;
        }
      },
      validate: (route) => modelCatalog.validate(route),
      agents: () => ctx.agents,
      session: (request) => {
        const sessionId = APPROVAL_REVIEW_SESSION_PREFIX + randomUUID();
        const cwd = join(dshHome, 'botharness', 'approval-reviews');
        mkdirSync(cwd, { recursive: true });
        const titles = ctx.get('sessionTitle') as
          | { rename?: (session: unknown, title: string) => void }
          | undefined;
        reviewing.add(sessionId);
        return {
          sessionId,
          cwd,
          timeoutMs: core.prompts.limits(request.botSlug)['review-timeout-seconds'] * 1000,
          botName: core.registry.get(request.botSlug)?.displayName ?? request.botSlug,
          ...(typeof titles?.rename === 'function'
            ? { rename: (session, title) => titles.rename!(session, title) }
            : {}),
        };
      },
      settle: (sessionId) => reviewing.delete(sessionId),
    }),
    log: (entry) => {
      const detail =
        `approval-review bot=${entry.botSlug} template=${entry.template} tool=${entry.toolName}` +
        (entry.model === undefined ? '' : ` model=${entry.model}`) +
        (entry.reviewSession === undefined ? '' : ` reviewSession=${entry.reviewSession}`) +
        ` outcome=${entry.outcome} latencyMs=${entry.latencyMs}` +
        (entry.fallback === undefined ? '' : ` fallback=${entry.fallback}`) +
        (entry.detail === undefined ? '' : ` detail=${JSON.stringify(entry.detail)}`);
      ctx.logger.info(detail);
      try {
        reviewLogs?.write({
          plugin: 'approval-reviewer',
          owner: `bot:${entry.botSlug}`,
          kind: entry.fallback === undefined ? entry.outcome : 'fallback',
          detail,
          bot: entry.botSlug,
        });
      } catch {}
    },
  };
  toolApproval = new ChannelToolApproval(
    core.channels,
    core.ownership,
    core.toolRules,
    (agent, owner) => {
      const cwd = agent.session.header.cwd ?? '';
      if (owner.rootRole === 'assignment') {
        const assignment = core.runtime.getAssignment(owner.botSlug, owner.sessionId);
        const grantId = assignment?.permission?.grantId;
        if (grantId === undefined) return undefined;
        try {
          core.grants.requireActive(owner.botSlug, grantId);
        } catch {
          return undefined;
        }
        return JSON.stringify(['assignment', cwd, grantId]);
      }
      const activeIds = core.grants
        .list(owner.botSlug)
        .filter((grant) => grant.revokedAt === undefined)
        .map((grant) => `${grant.id}:${grant.writeRevision ?? 0}`)
        .sort();
      return JSON.stringify(['orchestrator', cwd, activeIds]);
    },
    {
      changed: (slug, count) => core.states.setApprovalCount(slug, count),
      warn: (message) => ctx.logger.warn(message),
    },
    (sessionId, callId, signal) =>
      core.runtime.beginAssignmentApprovalWait?.(sessionId, callId, signal),
    (sessionId) => core.runtime.askChannel?.(sessionId),
    autoApproval,
    (sessionId) => sessionHasFullAccess(core, sessionId),
  );
  ctx.effect(
    () => core.externalMessaging.approvals.attach(toolApproval, core.channels),
    'botharness: approved IM tool controls',
  );
  ctx.effect(
    () => core.companions.attachApprovals(toolApproval),
    'botharness: companion approval observation',
  );
  userQuestions = new ChannelUserQuestions(
    core.channels,
    core.ownership,
    (agent) => ctx.agents.get(agent.id) === agent,
    (message) => ctx.logger.warn(message),
    (slug, count) => core.states.setQuestionCount(slug, count),
    nativeTimedQuestions(
      ctx,
      core.runtime,
      (ctx as unknown as { sessions: DshSessionStore }).sessions,
    ),
    (sessionId) => core.runtime.askChannel?.(sessionId),
  );
  ctx.effect(() => () => userQuestions.close(), 'botharness: Channel user questions');
  ctx.inject(['sessionProjections', 'sessionQuery', 'userQuestions'], () => {
    void userQuestions
      .recover(core.humanAttention.openTimedQuestionCards())
      .catch(() => ctx.logger.warn('user-question-recovery-failed'));
  });
  ctx.effect(
    () => core.companions.attachQuestions(userQuestions),
    'botharness: companion question observation',
  );
  registerChannelUserQuestions(ctx, userQuestions);
  if (core.operationalDatabase.mode === 'ready')
    ctx.effect(
      () => core.externalMessaging.questions.attach(userQuestions, core.channels),
      'botharness: checked IM question answers',
    );
  const approvedCalls = new Map<symbol, (name: string, args: unknown) => boolean>();
  const deviceCallReleases = new Map<symbol, () => void>();
  ctx.effect(() => () => approvedCalls.clear(), 'botharness: one-call approval execution fences');
  ctx.effect(
    () => () => {
      for (const release of deviceCallReleases.values()) release();
      deviceCallReleases.clear();
    },
    'botharness: device approval execution leases',
  );
  ctx.effect(() => () => toolApproval.close(), 'botharness: Channel tool approvals');
  registerChannelToolApproval(ctx, toolApproval);
  ctx.on(
    'tools/pre-execute',
    async (execution, next) => {
      const agent = execution.agent;
      if (agent === undefined || core.ownership.resolve(agent.session.id) === undefined)
        return next();
      if (
        !isDshGovernedTool(execution.name) &&
        !requiresHumanToolApproval(execution.name, execution.arguments, templateInUse)
      )
        return next();
      const storeDenial = credentialStoreDenial(
        execution.name,
        execution.arguments,
        resolveDshHome(),
        agent.session.header.cwd,
      );
      if (storeDenial !== undefined) return { kind: 'deny', reason: storeDenial };
      if (execution.name === 'secret_cli') {
        const commandDenial = secretCommandDenial(execution.arguments);
        if (commandDenial !== undefined) return { kind: 'deny', reason: commandDenial };
      }
      if (execution.name === 'secret_mcp_connect') {
        const serverDenial = secretMcpDenial(execution.arguments);
        if (serverDenial !== undefined) return { kind: 'deny', reason: serverDenial };
      }

      const computerTools = ctx.get('botharnessComputerTools') as
        | {
            ownsTool?(name: string): boolean;
            needsAuthorization?(sessionId: string): boolean;
            authorizationScope?(): string;
            approvalScope?(sessionId: string): string;
            authorizeCall?(token: symbol, authorized: () => boolean): () => void;
            markAuthorized?(sessionId: string, scope?: string): boolean | void;
          }
        | undefined;
      if (computerTools?.ownsTool?.(execution.name) === true) {
        const computerAuthorization = deviceToolAuthorization(
          computerTools,
          agent.session.id,
          sessionHasFullAccess(core, agent.session.id),
        );
        if (computerAuthorization === 'authorized') return next();
        if (computerAuthorization === 'changed')
          return {
            kind: 'deny',
            reason: 'Computer Target changed while awaiting Human approval; request a new action.',
          };
        const authorizationScope = computerTools.authorizationScope?.();
        if (!computerTools.approvalScope || !computerTools.authorizeCall)
          return {
            kind: 'deny',
            reason: 'Computer approval Provider is unavailable',
          };
        const computerApproval = ctx.get('approval') as ApprovalService | undefined;
        const untrackComputer = toolApproval.track(
          execution,
          'operation',
          false,
          'computer',
          undefined,
          {
            authorizationScope: () => computerTools.approvalScope!(agent.session.id),
          },
        );
        if (computerApproval === undefined || untrackComputer === undefined) {
          return {
            kind: 'deny',
            reason: 'The tool call cannot be presented for Human approval',
          };
        }
        try {
          const outcome = await computerApproval.request({
            agent,
            toolName: execution.name,
            callId: execution.callId,
            reason: "This PersonaBot wants to act on the profile's shared Computer.",
            signal: execution.signal,
          });
          if (outcome !== 'allowed-once') {
            const reviewed = toolApproval.takeReviewRejection(agent.session.id, execution.callId);
            return {
              kind: 'deny',
              reason:
                reviewed === undefined
                  ? 'Human approval was ' + outcome
                  : reviewerRejectionText(reviewed),
            };
          }
          if (
            !toolApproval.usesStandingRule(agent, execution.callId) &&
            computerTools.markAuthorized?.(agent.session.id, authorizationScope) === false
          )
            return {
              kind: 'deny',
              reason:
                'Computer Target changed while awaiting Human approval; request a new action.',
            };
          const guard = toolApproval.executionGuard(agent, execution.callId);
          if (!guard || !guard(execution.name, execution.arguments))
            return {
              kind: 'deny',
              reason: 'Approval authority changed before execution',
            };
          if (toolApproval.usesStandingRule(agent, execution.callId))
            deviceCallReleases.set(
              execution.token,
              computerTools.authorizeCall(execution.token, () =>
                guard(execution.name, execution.arguments),
              ),
            );
          approvedCalls.set(execution.token, guard);
          return await next();
        } catch {
          return { kind: 'deny', reason: 'Human approval is unavailable' };
        } finally {
          untrackComputer();
        }
      }
      const browserTools = ctx.get('botharnessBrowserTools') as
        | {
            ownsTool?(name: string): boolean;
            executionSignal?(sessionId: string): AbortSignal | undefined;
            needsAuthorization?(sessionId: string): boolean;
            authorizationScope?(sessionId?: string): string;
            approvalScope?(sessionId: string): string;
            authorizeCall?(token: symbol, authorized: () => boolean): () => void;
            markAuthorized?(sessionId: string, scope?: string): boolean | void;
          }
        | undefined;
      if (browserTools?.ownsTool?.(execution.name) === true) {
        const browserSignal = browserTools.executionSignal?.(agent.session.id);
        if (browserTools.executionSignal !== undefined && browserSignal === undefined)
          return {
            kind: 'deny',
            reason: 'Browser Access is off for this PersonaBot',
          };
        const browserAuthorization = deviceToolAuthorization(
          browserTools,
          agent.session.id,
          sessionHasFullAccess(core, agent.session.id),
        );
        if (browserAuthorization === 'authorized') return next();
        if (browserAuthorization === 'changed')
          return {
            kind: 'deny',
            reason:
              'Browser authority changed while awaiting Human approval; request a new action.',
          };
        const browserAuthorizationScope = browserTools.authorizationScope?.(agent.session.id);
        if (!browserTools.approvalScope || !browserTools.authorizeCall)
          return {
            kind: 'deny',
            reason: 'Browser approval Provider is unavailable',
          };
        const browserApproval = ctx.get('approval') as ApprovalService | undefined;
        const untrackBrowser = toolApproval.track(
          execution,
          'operation',
          false,
          'browser',
          undefined,
          {
            authorizationScope: () => browserTools.approvalScope!(agent.session.id),
          },
        );
        if (browserApproval === undefined || untrackBrowser === undefined) {
          return {
            kind: 'deny',
            reason: 'The tool call cannot be presented for Human approval',
          };
        }
        try {
          const outcome = await browserApproval.request({
            agent,
            toolName: execution.name,
            callId: execution.callId,
            reason: 'This PersonaBot wants to use the Browser authorized by the Human.',
            signal: AbortSignal.any([execution.signal, browserSignal ?? execution.signal]),
          });
          if (outcome !== 'allowed-once') {
            const reviewed = toolApproval.takeReviewRejection(agent.session.id, execution.callId);
            return {
              kind: 'deny',
              reason:
                reviewed === undefined
                  ? 'Human approval was ' + outcome
                  : reviewerRejectionText(reviewed),
            };
          }
          if (
            !toolApproval.usesStandingRule(agent, execution.callId) &&
            browserTools.markAuthorized?.(agent.session.id, browserAuthorizationScope) === false
          )
            return {
              kind: 'deny',
              reason:
                'Browser authority changed while awaiting Human approval; request a new action.',
            };
          const guard = toolApproval.executionGuard(agent, execution.callId);
          if (!guard || !guard(execution.name, execution.arguments))
            return {
              kind: 'deny',
              reason: 'Approval authority changed before execution',
            };
          if (toolApproval.usesStandingRule(agent, execution.callId))
            deviceCallReleases.set(
              execution.token,
              browserTools.authorizeCall(execution.token, () =>
                guard(execution.name, execution.arguments),
              ),
            );
          approvedCalls.set(execution.token, guard);
          return await next();
        } catch {
          return { kind: 'deny', reason: 'Human approval is unavailable' };
        } finally {
          untrackBrowser();
        }
      }
      const denial = permissionDenial(agent.session);
      if (denial !== undefined) return { kind: 'deny', reason: denial };
      if (!requiresHumanToolApproval(execution.name, execution.arguments, templateInUse))
        return next();
      const eachUse = execution.name === 'secret_cli' || execution.name === 'secret_mcp_connect';
      const fullAccess = sessionHasFullAccess(core, agent.session.id);
      if (
        fullAccess &&
        !requiresHumanDecision(JSON.stringify(execution.arguments) ?? '', templateInUse)
      )
        return next();
      const approval = ctx.get('approval') as ApprovalService | undefined;
      const owner = core.ownership.resolve(agent.session.id);
      const untrack = toolApproval.track(
        execution,
        execution.name === 'secret_mcp_connect' ? 'each-use' : 'operation',
        execution.name === 'secret_mcp_connect',
        undefined,
        execution.name === 'bot_create' && owner !== undefined
          ? core.runtime.botCreatePreview?.(owner.botSlug, execution.arguments)
          : undefined,
      );
      if (approval === undefined || untrack === undefined) {
        return {
          kind: 'deny',
          reason: 'The tool call cannot be presented for Human approval',
        };
      }
      try {
        const outcome = eachUse
          ? ((await toolApproval.ask({
              agent,
              toolName: execution.name,
              callId: execution.callId,
              signal: execution.signal,
            })) ?? 'unavailable')
          : await approval.request({
              agent,
              toolName: execution.name,
              callId: execution.callId,
              reason:
                execution.name === 'channel_attachment_open'
                  ? 'This PersonaBot wants to edit the selected original attachment. All references to this file will show its current contents.'
                  : execution.name === 'bot_create'
                    ? 'This PersonaBot wants to create a new PersonaBot with a new Memory folder. The new Bot gets no grants, accesses or secrets from it.'
                    : publishesBotMemory(JSON.stringify(execution.arguments) ?? '')
                      ? 'This PersonaBot wants to upload a Bot to the Bot Marketplace. Its Memory files become public. Check them for secrets and private details first.'
                      : deletesMarketplaceBot(JSON.stringify(execution.arguments) ?? '')
                        ? 'This PersonaBot wants to delete one of your Uploaded Bots from the Bot Marketplace. Its files and counts are erased and cannot be restored.'
                        : changesApprovalPolicy(
                              JSON.stringify(execution.arguments) ?? '',
                              templateInUse,
                            )
                          ? 'This PersonaBot wants to change persistent permissions or its approval policy. A Human can approve once or save Always allow for this tool in the current scope.'
                          : 'This PersonaBot wants to run a command-line tool with a secret you entered. The program receives the secret and could reveal it. Check the program and every argument.',
              signal: execution.signal,
            });
        if (outcome !== 'allowed-once') {
          const reviewed = toolApproval.takeReviewRejection(agent.session.id, execution.callId);
          return {
            kind: 'deny',
            reason:
              reviewed === undefined
                ? 'Human approval was ' + outcome
                : reviewerRejectionText(reviewed),
          };
        }
        if (!toolApproval.validAfterDecision(agent, execution.callId))
          return { kind: 'deny', reason: 'Approval rule scope changed' };
        if (toolApproval.remembered(agent, execution.callId)) rememberedStarts.add(execution.token);
        const guard = toolApproval.executionGuard(agent, execution.callId);
        if (!guard || !guard(execution.name, execution.arguments))
          return {
            kind: 'deny',
            reason: 'Approval authority changed before execution',
          };
        approvedCalls.set(execution.token, guard);
        return await next();
      } catch {
        return { kind: 'deny', reason: 'Human approval is unavailable' };
      } finally {
        untrack();
      }
    },
    { global: true },
  );

  ctx.on(
    'tools/post-execute',
    async (execution, result, next) => {
      const reason =
        execution.agent === undefined
          ? undefined
          : toolApproval.takeReviewRejection(execution.agent.session.id, execution.callId);
      const decision = await next();
      if (reason === undefined || decision.kind !== 'accept' || decision.value !== undefined)
        return decision;
      const note = {
        type: 'text' as const,
        text: reviewerRejectionText(reason),
      };
      return {
        ...decision,
        content: result.isError ? [note] : [...(decision.content ?? result.content), note],
      };
    },
    { global: true },
  );

  ctx.tools.guard(({ agent, name, arguments: args, token }) => {
    const approvalGuard = approvedCalls.get(token);
    if (approvalGuard && !approvalGuard(name, args))
      return 'Approval authority or operation changed before execution';
    const allowedOnce = approvalGuard !== undefined;
    return agent === undefined
      ? undefined
      : grantToolExecutionDenial(
          core,
          agent.session,
          ctx.get('sandboxPolicy'),
          ctx.get('approval'),
          name,
          args,
          allowedOnce,
        );
  });
  ctx.on(
    'tools/execute',
    async (execution, next) => {
      const owner =
        execution.agent === undefined
          ? undefined
          : core.ownership.resolve(execution.agent.session.id);
      if (owner === undefined) return next();
      const untrack =
        isDshGovernedTool(execution.name) &&
        !requiresHumanToolApproval(execution.name, execution.arguments, templateInUse)
          ? toolApproval.track(execution)
          : undefined;
      try {
        if (owner.rootRole !== 'assignment' || core.runtime.runAssignmentTool === undefined)
          return await next();
        return await core.runtime.runAssignmentTool(
          execution.agent!.session.id,
          execution.callId,
          execution.token,
          execution.signal,
          () => {
            const approvalGuard = approvedCalls.get(execution.token);
            if (approvalGuard && !approvalGuard(execution.name, execution.arguments))
              throw new Error('Approval authority or operation changed before execution');
            const denial = grantToolExecutionDenial(
              core,
              execution.agent!.session,
              ctx.get('sandboxPolicy'),
              ctx.get('approval'),
              execution.name,
              execution.arguments,
              approvalGuard !== undefined,
            );
            if (denial !== undefined) throw new Error(denial);
            return next();
          },
        );
      } finally {
        untrack?.();
      }
    },
    { global: true },
  );
  ctx.on(
    'tools/result',
    (execution) => {
      deviceCallReleases.get(execution.token)?.();
      deviceCallReleases.delete(execution.token);
      approvedCalls.delete(execution.token);
      if (execution.agent !== undefined)
        core.runtime.settleAssignmentTool?.(execution.agent.session.id, execution.callId);
    },
    { global: true },
  );

  ctx.on(
    'agent/assistant-stream',
    ({ agent, frame }) => agentAdapter.acceptAssistantStream(agent.session.id, frame),
    { global: true },
  );

  const dshSessions = (ctx as unknown as { sessions: DshSessionStore }).sessions;

  const developerModeTarget: { gate?: DeveloperModeSkillGate } = {};
  const syncDeveloperMode = () => {
    let enabled = false;
    try {
      const settings = ctx.get('settings') as unknown as TobNativeSettings | undefined;
      const value = settings
        ?.describe({ redactSecrets: true })
        .find((entry) => entry.ns === 'botharness-client')?.value;
      enabled =
        typeof value === 'object' &&
        value !== null &&
        'developerMode' in value &&
        value.developerMode === true;
    } catch {}
    developerModeTarget.gate?.set(enabled);
  };
  ctx.inject(['settings'], (settingsCtx) => {
    const events = settingsCtx as unknown as {
      on(event: 'settings/document-updated', listener: (namespace: string) => void): void;
    };
    events.on('settings/document-updated', (namespace) => {
      if (namespace === 'botharness-client') syncDeveloperMode();
    });
    settingsCtx.effect(() => {
      syncDeveloperMode();
      return () => developerModeTarget.gate?.set(false);
    }, 'botharness: developer mode settings');
  });
  const releaseInstaller: { current: ReleaseInstaller | undefined } = {
    current: undefined,
  };
  ctx.inject(['pluginManager'], (managerCtx) => {
    managerCtx.effect(() => {
      releaseInstaller.current = (
        managerCtx as unknown as { pluginManager: ReleaseInstaller }
      ).pluginManager;
      return () => {
        releaseInstaller.current = undefined;
      };
    }, 'botharness: release installer');
  });
  const releaseRestarter: { current: ReleaseRestarter | undefined } = {
    current: undefined,
  };
  ctx.inject(['appExit'], (exitCtx) => {
    exitCtx.effect(() => {
      releaseRestarter.current = createProcessRestarter({
        exit: (exitCtx as unknown as { appExit: (code: number) => void }).appExit,
      });
      return () => {
        releaseRestarter.current = undefined;
      };
    }, 'botharness: release restarter');
  });
  const dataReset = createDataReset({
    dshHome,
    home: homedir(),
    bots: () => {
      const bots = core.registry.listHistorical();
      return {
        count: bots.length,
        chosenMemoryDirs: bots.flatMap((bot) => {
          const memoryDir = core.registry.memoryDirFor(bot.slug);
          return memoryDir === undefined ||
            memoryDir === core.registry.defaultMemoryDirFor(bot.slug)
            ? []
            : [memoryDir];
        }),
      };
    },
    restarter: () => releaseRestarter.current,
    stopWriting: () =>
      failOperationalDatabase(
        core.operationalDatabase,
        'BotHarness data is being cleared; restart the Host to finish',
      ),
    log: (message) => ctx.logger.info(message),
  });
  const releaseService = createLoadingReleaseService({
    version: () => runningRelease.version,
    ...(profile === undefined
      ? {}
      : {
          profileId: createHash('sha256').update(profile.dir).digest('hex').slice(0, 24),
        }),
    identity: () =>
      installedPackage.identity(releaseAnchors, loadedReleaseComponents(ctx.registry.values())),
    ledgers: () => runningRelease.ledgers,
    installer: () => releaseInstaller.current,
    restarter: () => releaseRestarter.current,
    warn: (message) => ctx.logger.warn(message),
  });
  const pluginUpdates = createPluginUpdateService({
    installer: () => releaseInstaller.current,
    restarter: () => releaseRestarter.current,
  });
  const tobModelOperations = createTobModelOperations({
    registry: core.registry,
    presets: core.modelPresets,
    catalog: modelCatalog,
    settings: () => ctx.get('settings') as unknown as TobNativeSettings | undefined,
    defaultModel,
    runtimeChanged: (patch) => {
      if (typeof patch.developerMode === 'boolean')
        developerModeTarget.gate?.set(patch.developerMode);
    },
  });
  const tobMaintenanceOperations = createTobMaintenanceOperations({
    telemetry,
    git,
    release: releaseService,
  });
  const folders = createFolderBrowser({
    nativePicker: () =>
      (
        ctx.get('directoryPicker') as unknown as { capability?(): { kind?: string } } | undefined
      )?.capability?.().kind === 'native',
  });
  ctx.effect(() => () => folders.close(), 'botharness: folder reader');
  const marketplaceClient = createMarketplaceClient({
    baseUrl: config.marketplaceUrl ?? DEFAULT_MARKETPLACE_URL,
  });
  const shareDrafts = createShareDrafts({
    root: join(dshHome, 'botharness', 'share-drafts'),
    memoryDir: (slug) =>
      core.registry.get(slug) === undefined ? undefined : core.registry.memoryDirFor(slug),
    log: (event) => ctx.logger.info(JSON.stringify(event)),
  });
  const marketplaceUploads = createMarketplaceUploads({
    client: marketplaceClient,
    account: () => connectAccount,
    drafts: shareDrafts,
    log: (event) => ctx.logger.info(JSON.stringify(event)),
  });
  const bridgeMethods = createBridgeMethods({
    voiceProviders: core.voiceProviders,
    voiceLog: (phase, fields) => diagnosticEvents.record('voice', phase, fields),
    prompts: core.prompts,
    botContext: async (slug) => {
      const sessionId = core.runtime.currentOrchestratorSessionId?.(slug) ?? null;
      const agent = sessionId === null ? undefined : liveAgent(sessionId);
      const request = agent?.session.requestHeader()?.config;
      const route =
        request ??
        core.registry.get(slug)?.modelPlan?.orchestrator ??
        defaultModel.currentSelection();
      const info = await ctx.llm.resolveModelInfo(route.provider, route.model);
      const capacity = contextCapacity(info.context?.contextWindow);
      return {
        sessionId,
        usedTokens: agent
          ? (agent.ctx.get('tokenMeter')?.measure(agent.session).totalTokens ?? null)
          : null,
        ...capacity,
        thresholdTokens: compactionThresholdTokens(
          compactionPolicy(),
          route,
          capacity.contextWindow,
          request?.maxTokens ?? info.defaultMaxTokens ?? 0,
        ),
      };
    },
    botSystemPrompt: async (slug) => {
      const sessionId =
        core.runtime.currentOrchestratorSessionId?.(slug) ??
        [...core.ownership.rootsFor(slug)]
          .reverse()
          .find((root) => root.rootRole === 'orchestrator')?.sessionId ??
        null;
      const agent = sessionId === null ? undefined : liveAgent(sessionId);
      if (agent === undefined) {
        const query = ctx.get('sessionQuery') as unknown as
          | {
              readSession(id: string): Promise<{ events: readonly DshSessionEvent[] }>;
            }
          | undefined;
        const logged =
          sessionId === null || query === undefined
            ? null
            : systemPromptFromLog((await query.readSession(sessionId)).events);
        return {
          sessionId,
          loaded: false,
          effectiveText: logged,
          effectiveSource: logged === null ? 'none' : 'log',
          next: null,
          pending: sessionId !== null && core.prompts.pending(slug, sessionId),
        };
      }
      const nodes = agent.session.surface.nodes
        .map((seq) => agent.session.eventAt(seq))
        .filter((event) => event?.type === 'system/message')
        .map((event) => messageText((event!.data as { message: unknown }).message))
        .filter((text) => text !== '');
      const effectiveText = nodes.at(-1) ?? null;
      const assembly = await agent.ctx.systemPrompt.assemble(assembleContextFor(agent));
      const text = renderPrompt(assembly);
      return {
        sessionId,
        loaded: true,
        effectiveText,
        effectiveSource: effectiveText === null ? 'none' : 'session',
        next: {
          text,
          sections: assembly.sections.map(({ name, text }) => ({ name, text })),
          contexts: renderContextSections(assembly).map(({ name, text }) => ({
            name,
            text,
          })),
        },
        pending:
          core.prompts.pending(slug, sessionId ?? undefined) ||
          (sessionId !== null && core.memory.personaPending?.(sessionId) === true),
      };
    },
    cloudConnections,
    cloudWork,
    approvalReviewer,
    idleCompaction: {
      settings: idleCompactionSettings,
      scheduler: idleCompaction,
      applyThreshold: applyCompactionPolicy,
      routes: () => {
        let fallback: { provider: string; model: string } | undefined;
        try {
          const selection = defaultModel.currentSelection();
          fallback = { provider: selection.provider, model: selection.model };
        } catch {
          fallback = undefined;
        }
        return core.registry.list().flatMap((bot) => {
          const route = bot.modelPlan?.orchestrator ?? fallback;
          return route === undefined ? [] : [{ provider: route.provider, model: route.model }];
        });
      },
      rescan: () => idleCompaction.rescan(ctx.agents.list().map((agent) => agent.session.id)),
      compactBot,
      compactReservedSession,
    },
    composerIdentity: () =>
      composerRecoveryIdentity(
        join(homedir(), '.config', 'botharness', 'composer-host-id'),
        join(core.rootDir, '..', 'composer-profile-id'),
        core.channels.humanIdentity().humanId,
      ),
    warn: (message) => ctx.logger.warn(message),
    registry: core.registry,
    approvalTemplates,
    deletions: core.deletions,
    contentPurge: core.contentPurge,
    storage,
    dataReset,
    defaultModelSettings: () => ctx.get('settings') as unknown as TobNativeSettings | undefined,
    modelPresets: core.modelPresets,
    modelCatalog,
    modelReadiness,
    onboarding: core.onboarding,
    tob: core.tob,
    creations: core.creations,
    zipImports: core.zipImports,
    channelManagement: core.channelManagement,
    partLibrary: core.partLibrary,
    onboardingNews: (slug) =>
      onboardingNewsAvailable(
        ctx,
        (slug === undefined ? undefined : core.registry.get(slug)?.preset) ??
          config.agentPreset ??
          DEFAULT_AGENT_PRESET,
      ),
    defaultModel: defaultModel as DshDefaultModelHost & {
      saveSelection(route: import('./models/presets.js').ModelRoute): Promise<void>;
    },
    states: core.states,
    runningSessionIds: () =>
      new Set(
        ctx.agents
          .list()
          .filter((agent) => agent.status === 'running')
          .map((agent) => agent.id),
      ),
    channels: core.channels,
    attachments: core.attachments,
    ownership: core.ownership,
    memory: core.memory,
    ...(core.usage === undefined ? {} : { usage: core.usage }),
    describeToolCall: (sessionId, name, args) => {
      const call = describeToolCall(ctx, sessionId, name, args, true);
      if (call === undefined) return undefined;
      return {
        kind: toolKindForView(call.view),
        ...(call.publicDetail === undefined ? {} : { detail: call.publicDetail }),
      };
    },
    readUsageSessionLog: async (sessionId) => {
      const query = ctx.get('sessionQuery') as unknown as
        | {
            readSession(id: string): Promise<{
              events: readonly DshSessionEvent[];
              inheritedEventCount?: number;
            }>;
          }
        | undefined;
      if (query === undefined) return undefined;
      const snapshot = await query.readSession(sessionId);
      return {
        events: snapshot.events,
        inheritedEventCount: snapshot.inheritedEventCount ?? 0,
      };
    },
    roster: core.roster,
    runtime: core.runtime,
    attention: core.attention,
    sourcePolicy: core.sourcePolicy,
    schedules: core.schedules,
    takeovers,
    humanAttention: core.humanAttention,
    humanAttentionDecisions: core.humanAttentionDecisions,
    grants: core.grants,
    folders,
    externalMessaging: core.externalMessaging,
    toolApproval,
    userQuestions,
    toolRules: core.toolRules,
    assignmentAccess: core.assignmentAccess,
    marketplace: marketplaceClient,
    marketplaceUploads,
    marketplaceInstallReviews: createMarketplaceInstallReviews({
      uploads: marketplaceUploads,
      reviewer: async (prompt, botName) => {
        const tob = core.tob.slug();
        let route: ApprovalReviewerRoute | undefined =
          tob === undefined ? undefined : core.registry.get(tob)?.modelPlan?.orchestrator;
        if (route === undefined) {
          try {
            route = defaultModel.currentSelection();
          } catch {
            route = undefined;
          }
        }
        if (route === undefined) throw new ApprovalReviewError('no-model');
        try {
          await modelCatalog.validate(route);
        } catch (error) {
          throw new ApprovalReviewError(
            'model-unavailable',
            error instanceof Error ? error.message : String(error),
          );
        }
        const sessionId = APPROVAL_REVIEW_SESSION_PREFIX + 'install-' + randomUUID();
        const cwd = join(dshHome, 'botharness', 'approval-reviews');
        mkdirSync(cwd, { recursive: true });
        const titles = ctx.get('sessionTitle') as
          | { rename?: (session: unknown, title: string) => void }
          | undefined;
        reviewing.add(sessionId);
        try {
          const text = await runReviewerTurn(
            ctx.agents,
            route,
            {
              systemPrompt: INSTALL_REVIEW_SYSTEM_PROMPT,
              sectionName: 'botharness:install-review',
              prompt,
              title: `Install review · ${botName}`,
              signal: new AbortController().signal,
              maxTokens: 4_000,
            },
            {
              sessionId,
              cwd,
              timeoutMs: INSTALL_REVIEW_TIMEOUT_MS,
              ...(typeof titles?.rename === 'function'
                ? { rename: (session, title) => titles.rename!(session, title) }
                : {}),
            },
          );
          return { text, model: routeLabel(route) };
        } finally {
          reviewing.delete(sessionId);
        }
      },
    }),
    shareDrafts,
    marketplaceReceipts: createInstallReceipts({
      client: marketplaceClient,
      dataDir: telemetryDir,
      log: (event) => ctx.logger.info(JSON.stringify(event)),
    }),
    release: releaseService,
    plugins: pluginUpdates,
    telemetry,
    activeDay,
    git,
    developerMode: {
      set: (enabled: boolean) => developerModeTarget.gate?.set(enabled),
    },
    computerAccess: {
      changed: (slug: string) => {
        const provider = ctx.get('botharnessComputerTools') as unknown as
          | { reconcileBot?: (slug: string) => Promise<void> }
          | undefined;
        const pending = provider?.reconcileBot?.(slug);
        void pending?.catch((error: unknown) => {
          ctx.logger.warn(
            `botharness: Computer tool reconcile failed for ${slug}: ${String(error)}`,
          );
        });
      },
    },
    browserAccess: {
      changed: (slug: string) => {
        const provider = ctx.get('botharnessBrowserTools') as unknown as
          | { reconcileBot?: (slug: string) => Promise<void> }
          | undefined;
        const pending = provider?.reconcileBot?.(slug);
        void pending?.catch((error: unknown) => {
          ctx.logger.warn(
            `botharness: Browser tool reconcile failed for ${slug}: ${String(error)}`,
          );
        });
      },
    },
    browserProfile: {
      changed: (slug: string) => {
        const provider = ctx.get('botharnessBrowserTools') as unknown as
          | { resetBot?: (slug: string) => void }
          | undefined;
        provider?.resetBot?.(slug);
      },
    },
  });
  imCommandServices = {
    botDisplayName: (slug) =>
      core.registry.get(slug)?.displayName ?? core.registry.getHistorical(slug)?.displayName,
    plan: async (slug) => {
      const state = await bridgeMethods.modelPlan({ slug });
      if (!state.ok) throw new Error(state.error.message);
      return state.value.plan;
    },
    catalog: () => modelCatalog.list(),
    defaultRoute: () => modelCatalog.defaultRoute?.(),
    applyModel: async (slug, route, assertCurrent) => {
      const state = await bridgeMethods.modelPlan({ slug });
      if (!state.ok) throw new Error(state.error.message);
      assertCurrent?.();
      const result = await bridgeMethods.modelPlanCustomize(
        {
          slug,
          expectedRevision: state.value.revision ?? 0,
          orchestrator: route,
        },
        assertCurrent,
      );
      if (!result.ok) throw new Error(result.error.message);
    },
    stopTurn: async (slug) => {
      const channel = core.channels.getOrCreateDm(slug);
      if (channel === undefined) throw new Error('Bot DM is unavailable');
      const stopped = await bridgeMethods.channelBotStop({
        channelId: channel.id,
        botSlug: slug,
      });
      if (stopped.ok) return { sessionId: stopped.value.stopped.sessionId };
      if (stopped.error.code === 'not-working') return undefined;
      throw new Error(stopped.error.message);
    },
    startFreshOrchestrator: (slug, assertCurrent) =>
      core.runtime.startFreshOrchestrator!(slug, assertCurrent),
    turnRunning: (slug) => core.runtime.turnRunning!(slug),
    compact: compactBot,
  };
  const tobBotCreationOperations = createTobBotCreationOperations({
    registry: core.registry,
    creations: core.creations,
    bridge: bridgeMethods,
  });
  const tobBotProfileOperations = createTobBotProfileOperations({
    registry: core.registry,
    bridge: () => bridgeMethods,
    isProtectedBot: (slug) => core.tob.isTob(slug),
  });
  const tobShareDraftOperations = createTobShareDraftOperations({
    bridge: () => bridgeMethods,
  });
  const tobChannelOperations = createTobChannelOperations({
    management: core.channelManagement,
    channels: core.channels,
    registry: core.registry,
    isProtectedBot: (slug) => core.tob.isTob(slug),
  });
  voiceCalls = createVoiceCalls({
    bot: (slug) => withVoiceDefaults(core.registry.get(slug), () => core.voiceProviders.defaults()),
    speechDbfs: () => core.voiceProviders.speechThreshold().dbfs,
    async seesImages(slug) {
      const route =
        core.registry.get(slug)?.modelPlan?.orchestrator ?? modelCatalog.defaultRoute?.();
      if (route === undefined) return true;
      const info = await ctx.llm.resolveModelInfo(route.provider, route.model);
      return info.inputModalities === undefined || info.inputModalities.includes('image');
    },
    providers: core.voiceProviders,
    media: () =>
      (ctx.get('botharnessComputer') as { callMedia?: VoiceCallMedia } | undefined)?.callMedia,
    async send({ channelId, messageId, body, callId, visual }) {
      let attachments: ChannelAttachmentRef[] | undefined;
      let meta: ChannelCallVisual | undefined;
      const records =
        visual?.records === undefined || visual.records.length === 0
          ? {}
          : { records: [...visual.records] };
      if (visual !== undefined && 'image' in visual) {
        const image = visual.image.jpeg;
        if (visual.saved)
          attachments = [
            await core.attachments.upload({
              data: (async function* () {
                yield image;
              })(),
              name: `call-${visual.source}-${messageId.slice(-12)}.jpg`,
            }),
          ];
        meta = {
          source: visual.source,
          frames: visual.frames,
          layout: visual.image.layout,
          ...(visual.saved ? {} : { unsaved: true as const }),
          ...(visual.unseen === true ? { unseen: true as const } : {}),
          ...records,
        };
      } else if (visual !== undefined)
        meta = { source: visual.source, sameAs: visual.sameAs, ...records };
      const result = await bridgeMethods.channelSend({
        channelId,
        messageId,
        body,
        ...(attachments === undefined ? {} : { attachments }),
        voiceCall: meta === undefined ? { callId } : { callId, visual: meta },
      });
      if (!result.ok)
        throw Object.assign(new Error(result.error.message), {
          code: result.error.code,
        });
    },
    async recordFrames({
      slug,
      channelId,
      callId,
      startedAt,
      source,
      image,
      frames,
      fromMs,
      toMs,
    }) {
      if (core.channels.get(channelId) === undefined) return undefined;
      const record = {
        callId,
        botSlug: slug,
        state: 'frames' as const,
        startedAt,
        source,
        frames,
        layout: image.layout,
        fromMs,
        toMs,
      };
      const attachment = await core.attachments.upload({
        data: (async function* () {
          yield image.jpeg;
        })(),
        name: `call-${source}-record-${Math.round(toMs / 1000)}s.jpg`,
      });
      const appended = await core.channels.appendMessage(channelId, {
        id: `voice-call-frames-${callId}-${toMs}`,
        at: new Date().toISOString(),
        author: { kind: 'system' },
        body: voiceCallRecordBody(record),
        attachments: [attachment],
        voiceCallRecord: record,
      });
      return appended?.id;
    },
    async record({ slug, channelId, record }) {
      const bot = core.registry.get(slug);
      if (core.channels.get(channelId) === undefined)
        core.channels.getOrCreateDm(slug, bot?.displayName);
      const appended = await core.channels.appendMessage(channelId, {
        id:
          'atMs' in record
            ? `voice-call-${record.state}-${record.callId}-${record.atMs}`
            : `voice-call-${record.state}-${record.callId}`,
        at:
          record.state === 'started'
            ? record.startedAt
            : record.state === 'ended'
              ? record.endedAt
              : new Date(Date.parse(record.startedAt) + record.atMs).toISOString(),
        author: { kind: 'system' },
        body: voiceCallRecordBody(record),
        voiceCallRecord: record,
      });
      return appended?.id;
    },
    busy: (slug) => {
      const overview = bridgeMethods.activityOverview({});
      return (
        overview.ok &&
        overview.value.bots.some(
          (bot) =>
            bot.slug === slug && bot.sessions.some((session) => session.role === 'orchestrator'),
        )
      );
    },
    log: (phase, fields) => diagnosticEvents.record('voice', phase, fields),
  });
  const calls = voiceCalls;
  core.voiceSpeech.speak = (input) => calls.speak(input);
  core.voiceZoom.zoom = (input) => calls.zoom(input);
  voiceDrafts = (event) => calls.draft(event);
  ctx.effect(
    () => async () => {
      core.voiceSpeech.speak = undefined;
      core.voiceZoom.zoom = undefined;
      voiceDrafts = () => undefined;
      voiceCalls = undefined;
      await calls.dispose();
    },
    'botharness: voice calls',
  );
  const tobVoiceOperations = createTobVoiceOperations({
    providers: () => core.voiceProviders,
    registry: core.registry,
    isProtectedBot: (slug) => core.tob.isTob(slug),
  });
  registerBridge(ctx, bridgeMethods, privateInputs, {
    followRoster: (signal) => core.live.followRoster(signal),
    followActivity: (signal) => core.live.followActivity(signal),
    followChannel: (channelId, limit, signal, drafts) =>
      core.live.followChannel(channelId, limit, signal, drafts),
    journalPage: (channelId, request) => core.channels.readHumanJournalPage(channelId, request),
    filesPage: (channelId, request) => core.channels.readHumanFilesPage(channelId, request),
    changes: (channelId, request) => core.channels.readHumanChanges?.(channelId, request),
    changeCursor: () => core.channels.changeCursor?.(),
    followCompanion: (resume, lastEventId, signal) =>
      followCompanion((request) => core.companions.open(request), resume, lastEventId, signal),
  });

  ctx.inject(['skills'], (skillsCtx) => {
    const skills = (
      skillsCtx as unknown as {
        skills: {
          register(skill: {
            readonly name: string;
            readonly description: string;
            readonly whenToUse: string;
            readonly content: string;
            readonly invocation: {
              readonly modelInvocable: boolean;
              readonly userInvocable: boolean;
            };
            readonly source: string;
            readonly provider: string;
          }): () => void;
        };
      }
    ).skills;
    const gate = new DeveloperModeSkillGate({
      register: (definition) => {
        let dispose: (() => void) | undefined;
        skillsCtx.effect(() => {
          dispose = skills.register(definition);
          return () => dispose?.();
        }, 'botharness: operational logs skill');
        return () => dispose?.();
      },
    });
    developerModeTarget.gate = gate;
    skillsCtx.effect(
      () =>
        skills.register({
          name: LOCAL_VOICE_SKILL_NAME,
          description: LOCAL_VOICE_SKILL_DESCRIPTION,
          whenToUse: LOCAL_VOICE_SKILL_WHEN_TO_USE,
          content: LOCAL_VOICE_SKILL_CONTENT,
          invocation: LOCAL_VOICE_SKILL_INVOCATION,
          source: LOCAL_VOICE_SKILL_SOURCE,
          provider: LOCAL_VOICE_SKILL_PROVIDER,
        }),
      'botharness: local voice skill',
    );
    skillsCtx.effect(() => {
      syncDeveloperMode();
      return () => {
        gate.set(false);
        if (developerModeTarget.gate === gate) delete developerModeTarget.gate;
      };
    }, 'botharness: developer mode skill gate');
  });

  ctx.inject(['connection'], (connectionCtx) => {
    const connection = (
      connectionCtx as unknown as {
        connection: {
          fetch: {
            register(route: {
              path: string;
              methods: readonly ('GET' | 'POST')[];
              requestBody: 'buffered' | 'streaming';
              fetch(request: Request): Promise<Response>;
            }): () => Promise<void>;
          };
        };
      }
    ).connection;
    connectionCtx.effect(() => {
      const control = createWindowZoomControl(Date.now, (phase, detail) =>
        ctx.logger.info('window-zoom-control %j', { phase, ...detail }),
      );
      const off = connection.fetch.register({
        path: WINDOW_ZOOM_CONTROL_PATH,
        methods: ['GET', 'POST'],
        requestBody: 'buffered',
        fetch: control.fetch,
      });
      return async () => {
        control.dispose();
        await off();
      };
    }, 'botharness: targeted window zoom delivery');
    connectionCtx.effect(() => {
      const setup = createWindowZoomSetup({
        dshHome,
        profileDir: profile?.dir,
        log: (phase, detail) => ctx.logger.info('window-zoom-setup %j', { phase, ...detail }),
      });
      return connection.fetch.register({
        path: WINDOW_ZOOM_SETUP_PATH,
        methods: ['GET', 'POST'],
        requestBody: 'buffered',
        fetch: setup.fetch,
      });
    }, 'botharness: desktop window zoom setup after quit');
    connectionCtx.effect(() => {
      const control = createAppearanceControl();
      const off = connection.fetch.register({
        path: APPEARANCE_CONTROL_PATH,
        methods: ['GET', 'POST'],
        requestBody: 'buffered',
        fetch: control.fetch,
      });
      return async () => {
        control.dispose();
        await off();
      };
    }, 'botharness: explicit Client-local appearance control');
    connectionCtx.effect(
      () =>
        connection.fetch.register({
          path: VOICE_CALL_PATH,
          methods: ['POST'],
          requestBody: 'buffered',
          fetch: createVoiceCallHttp(() => voiceCalls),
        }),
      'botharness: Bot calls (Host owner and CLI)',
    );
    connectionCtx.effect(() => {
      return connection.fetch.register({
        path: CHANNEL_STREAM_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: async (request) => {
          return core.live.open(request);
        },
      });
    }, 'botharness: Channel live stream');
    connectionCtx.effect(
      () =>
        connection.fetch.register({
          path: COMPANION_PATH,
          methods: ['GET', 'POST'],
          requestBody: 'buffered',
          fetch: async (request) =>
            request.method === 'POST'
              ? core.companions.update(request)
              : core.companions.open(request),
        }),
      'botharness: authenticated Window Companion consumption',
    );
    connectionCtx.effect(
      () =>
        connection.fetch.register({
          path: MEMORY_FILE_DOWNLOAD_PATH,
          methods: ['GET'],
          requestBody: 'buffered',
          fetch: createMemoryFileHttp(core.memory),
        }),
      'botharness: current Memory file download',
    );
    connectionCtx.effect(
      () =>
        connection.fetch.register({
          path: MEMORY_IMAGE_PATH,
          methods: ['GET'],
          requestBody: 'buffered',
          fetch: createMemoryImageHttp(core.memory),
        }),
      'botharness: version-bound Memory PNG preview',
    );
    const attachmentHttp = createAttachmentHttp(
      core.attachments,
      core.channels,
      async (input) => {
        const ref = await (
          input.representation === 'playback'
            ? core.externalMessaging.prepareAudio
            : core.externalMessaging.acquireFile
        )(input.slug, input.sourceEventId, input.attachmentId, input.signal);
        const signal = AbortSignal.any([
          input.signal,
          core.externalMessaging.inbound.sourceSignal(input.slug, input.sourceEventId),
        ]);
        const downloaded = await core.attachments.download(ref.fileId!, ref.name, signal);
        return downloaded;
      },
      (input) => core.externalMessaging.readChannelMedia(input),
      core.mediaVersions,
    );
    connectionCtx.effect(
      () =>
        connection.fetch.register({
          path: CHANNEL_ATTACHMENT_UPLOAD_PATH,
          methods: ['POST'],
          requestBody: 'streaming',
          fetch: attachmentHttp,
        }),
      'botharness: Channel attachment upload',
    );
    connectionCtx.effect(
      () =>
        connection.fetch.register({
          path: CHANNEL_ATTACHMENT_PATH,
          methods: ['GET'],
          requestBody: 'buffered',
          fetch: attachmentHttp,
        }),
      'botharness: Channel attachment download',
    );
    const botBannerHttp = createBotBannerHttp(core.registry);
    connectionCtx.effect(
      () =>
        connection.fetch.register({
          path: BOT_BANNER_PATH,
          methods: ['GET'],
          requestBody: 'buffered',
          fetch: botBannerHttp,
        }),
      'botharness: Bot banner',
    );
    const botAvatarHttp = createBotAvatarHttp(core.registry);
    connectionCtx.effect(
      () =>
        connection.fetch.register({
          path: BOT_AVATAR_PATH,
          methods: ['GET'],
          requestBody: 'buffered',
          fetch: botAvatarHttp,
        }),
      'botharness: PersonaBot avatar',
    );
    const botZipHttp = createBotZipHttp({
      registry: core.registry,
      detail: (slug) => bridgeMethods.get({ slug }),
      log: (message) => ctx.logger.info(message),
    });
    const profileBackupHttp = createProfileBackupHttp(
      {
        database: core.operationalDatabase,
        registry: core.registry,
        deletions: core.deletions,
        attachments: core.attachments,
        purge: core.contentPurge,
        version: runningRelease.version,
        sessionCount: () => core.ownership.list().length,
        runtimeVersions: async () => ({
          host: (await nativeReleaseRuntime())?.version ?? null,
          tools: installedDshVersion() ?? null,
        }),
        log: (message) => ctx.logger.info(message),
      },
      join(dshHome, 'botharness', 'backup-staging'),
      core.profileRecovery,
      modelCatalog,
    );
    for (const suffix of ['', '/inspect', '/recovery', '/authorize', '/activate'])
      connectionCtx.effect(
        () =>
          connection.fetch.register({
            path: PROFILE_BACKUP_PATH + suffix,
            methods: ['GET', 'POST'],
            requestBody: suffix === '/inspect' ? 'streaming' : 'buffered',
            fetch: profileBackupHttp,
          }),
        'botharness: complete environment backup ' + suffix,
      );
    const dshVersion = installedDshVersion();
    const diagnosticOptions: DiagnosticBundleHttpOptions = {
      source: {
        channels: core.channels,
        inboxHistory: core.inboxHistory,
        ownership: core.ownership,
        feedbackLinks: (channelId, messageIds) =>
          feedbackLinks(
            attachOperationalModule(core.operationalDatabase, 'message-feedback'),
            channelId,
            messageIds,
          ),
        botName: (slug) => core.registry.get(slug)?.displayName,
        readDeliveries: async (slug) => (await core.externalMessaging.snapshot(slug)).intents,
        readSession: async (sessionId) => {
          const query = ctx.get('sessionQuery') as unknown as
            | {
                readSession(id: string): Promise<{ events: readonly DshSessionEvent[] }>;
              }
            | undefined;
          if (query !== undefined) return (await query.readSession(sessionId)).events;
          return dshSessions.get(sessionId)?.snapshotEvents();
        },
        environment: {
          version: runningRelease.version,
          ...(dshVersion === undefined ? {} : { dshVersion }),
          platform: process.platform,
          arch: process.arch,
          node: process.version,
        },
      },
      homes: [
        { path: dshHome, label: '$DSH_HOME' },
        { path: homedir(), label: '~' },
      ],
      log: (message) => ctx.logger.info(message),
    };
    const diagnosticBundleHttp = createDiagnosticBundleHttp(diagnosticOptions);
    const feedbackHttp = createMessageFeedbackHttp({
      ...diagnosticOptions,
      readTimeline: (id, request) => core.channels.readHumanTimeline(id, request),
      submit: feedbackUploader(),
    });
    for (const action of MESSAGE_FEEDBACK_ACTIONS)
      connectionCtx.effect(
        () =>
          connection.fetch.register({
            path: `${MESSAGE_FEEDBACK_PATH}/${action}`,
            methods: ['POST'],
            requestBody: 'buffered',
            fetch: feedbackHttp,
          }),
        'botharness: message feedback ' + action,
      );
    for (const path of [DIAGNOSTIC_BUNDLE_PATH, DIAGNOSTIC_BUNDLE_PREVIEW_PATH])
      connectionCtx.effect(
        () =>
          connection.fetch.register({
            path,
            methods: ['POST'],
            requestBody: 'buffered',
            fetch: diagnosticBundleHttp,
          }),
        'botharness: diagnostic bundle ' + path,
      );
    connectionCtx.effect(
      () =>
        connection.fetch.register({
          path: BOT_ZIP_EXPORT_PATH,
          methods: ['GET', 'POST'],
          requestBody: 'buffered',
          fetch: botZipHttp,
        }),
      'botharness: Bot Zip export',
    );
    connectionCtx.effect(
      () =>
        connection.fetch.register({
          path: BOT_ZIP_FILES_PATH,
          methods: ['GET'],
          requestBody: 'buffered',
          fetch: botZipHttp,
        }),
      'botharness: Bot Zip file list',
    );
    connectionCtx.effect(
      () =>
        connection.fetch.register({
          path: BOT_ZIP_IMPORT_PATH,
          methods: ['POST'],
          requestBody: 'streaming',
          fetch: botZipHttp,
        }),
      'botharness: Bot Zip import',
    );
  });
  const toolDetails = createToolDetailIndex({
    owner: (sessionId) => core.ownership.resolve(sessionId),
    repairRevision: (sessionId) => core.ownership.repairRevision(sessionId),
    events: (sessionId) => dshSessions.get(sessionId)?.snapshotEvents(),
  });
  new ActivityToolDetails(
    ctx,
    toolDetails,
    [...(config.activityDetailConsumers ?? [])],
    (event) => {
      ctx.logger.info(
        `activity-tool-detail consumer=${event.consumer} outcome=${event.outcome} bytes=${event.bytes}`,
      );
    },
  );
  ctx.effect(() => () => toolDetails.clear(), 'botharness: Activity Tool detail references');
  const activity = createDshActivityProjection({
    details: toolDetails,
    ownership: core.ownership,
    states: core.states,
    running: (sessionId) =>
      ctx.agents
        .list()
        .some((agent) => agent.session.id === sessionId && agent.status === 'running'),
    describeCall: (sessionId, name, args) => describeToolCall(ctx, sessionId, name, args),
    assignmentTitle: (botSlug, sessionId) => core.runtime.getAssignment(botSlug, sessionId)?.title,
  });
  ctx.effect(() =>
    core.states.onActivity((event) => ctx.emit('botharness/personabot/activity', event)),
  );

  const turnLog = createTurnLog({
    events: diagnosticEvents,
    owner: (sessionId) => core.ownership.resolve(sessionId),
  });
  ctx.on(
    'session/event',
    (session, event) => {
      queueMicrotask(() => {
        void userQuestions
          .reconcileSession(session.id)
          .catch(() => ctx.logger.warn('user-question-reconciliation-failed'));
      });
      activity.handleSessionEvent(session.id, event);
      try {
        core.externalMessaging.approvals.result(session.id, event);
      } catch {
        ctx.logger.warn('approval-result-publication-failed');
      }
      core.usage?.handleSessionEvent(session.id, event);
      core.messagePerf.observeSessionEvent(session.id, event);
      turnLog.observe(session.id, event);
      idleCompaction.observeEvent(session.id, event);
      handleCompactionEvent(
        {
          ownership: core.ownership,
          memory: core.memory,
          prompts: core.prompts,
          warn: (message) => ctx.logger.warn(message),
        },
        session.id,
        event.type,
      );
    },
    { global: true },
  );
  ctx.on(
    'agent/created',
    async ({ agent }) => {
      activity.handleAgentCreated(agent.session);
      core.usage?.primeSession(agent.session.id, agent.session.snapshotEvents());
      const owner = core.ownership.resolve(agent.session.id);
      if (owner?.rootRole === 'orchestrator') installOrchestratorSubagentGuard(agent.ctx);
      else if (owner !== undefined) {
        await installBotSubagentModelTools(
          agent.ctx,
          () => core.registry.get(owner.botSlug)?.modelPlan,
          config.subagent,
        );
      }
    },
    { global: true },
  );
  ctx.on(
    'agent/status',
    ({ agent, status }) => {
      if (status === 'idle') activity.handleAgentIdle(agent.session.id);
      idleCompaction.agentStatus(agent.session.id, status);
    },
    { global: true },
  );
  ctx.on(
    'agent/disposed',
    ({ agent }) => {
      agentAdapter.forgetAgent(agent);
      userQuestions.cancelSession(agent.session.id);
      idleCompaction.forget(agent.session.id);
      turnLog.forget(agent.session.id);
      activity.handleSessionDisposed(agent.session.id);
      core.messagePerf.clear(agent.session.id);
    },
    { global: true },
  );
  activity.rebuild(dshSessions.list());
  idleCompaction.rescan(ctx.agents.list().map((agent) => agent.session.id));
  ctx.on(
    'agent/inbox/discarded',
    ({ agent, message }) => {
      const source: unknown = message.source;
      if (
        typeof source === 'object' &&
        source !== null &&
        'kind' in source &&
        source.kind === 'user-question-reply' &&
        'callId' in source &&
        typeof source.callId === 'string'
      )
        userQuestions.discardReply(agent.session.id, source.callId);
    },
    { global: true },
  );
  for (const session of dshSessions.list())
    core.usage?.primeSession(session.id, session.snapshotEvents());
  if (core.usage !== undefined) {
    const usage = core.usage;

    ctx.inject(['sessionQuery'], (sessionCtx) => {
      const query = sessionCtx.get('sessionQuery') as unknown as
        | {
            readSession(id: string): Promise<{
              events: readonly DshSessionEvent[];
              inheritedEventCount?: number;
            }>;
          }
        | undefined;
      if (query === undefined) return;
      const readUsageLog = async (sessionId: string) => {
        try {
          const snapshot = await query.readSession(sessionId);
          return {
            events: snapshot.events,
            inheritedEventCount: snapshot.inheritedEventCount ?? 0,
          };
        } catch (error) {
          ctx.logger.warn(`botharness: usage log read failed for ${sessionId}: ${String(error)}`);
          return undefined;
        }
      };
      const tracked = core.ownership.list().map((record) => record.sessionId);
      void usage.rebuild(tracked, readUsageLog).then(
        (report) => {
          if (report.legacyBaselineBots !== undefined) {
            ctx.logger.warn(
              `botharness: usage legacy baseline retained; phase=reconcile bots=${report.legacyBaselineBots} historical_backfill=unverifiable`,
            );
          }
          ctx.logger.info(
            `botharness: usage reconciliation completed (${report.folded} attempts, ${report.failed} failed sessions)`,
          );
        },
        (error: unknown) => {
          ctx.logger.warn(`botharness: usage projection rebuild failed: ${String(error)}`);
        },
      );
    });
  }

  ctx.inject(['storageDomain'], (storageCtx) => {
    void core.roster.attach(storageCtx.storageDomain).catch(() => {
      ctx.logger.warn(
        'roster-import initiator=host-startup phase=unavailable arrangement=read-only',
      );
    });
  });

  ctx.systemPrompt.section({
    name: 'botharness:persona',
    order: PERSONA_SECTION_ORDER,
    text: ({ agent }) => core.memory.personaForSession(agent?.session?.id),
  });
}

declare module '@deepseek-ai/cordis' {
  interface Events {
    'botharness/personabot/activity'(event: PersonaBotActivityEvent): void;
  }
}
