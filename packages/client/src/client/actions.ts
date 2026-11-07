import { approveWorkspaceGrantRequest } from './bridge.js';
import type { ClientTelemetryEventName } from '../../../core/src/telemetry/events.js';
import { telemetrySurface } from './telemetry-surface.js';
import type { PixelBannerRecipe } from '@botharness/pixel-banner';
import { onboardingFor } from './onboarding.js';
import { loadAveragePerf, type AveragePerfView } from './message-perf.js';
import { invalidateInheritedModelPlans } from './model-plan-store.js';
import type { ProviderAppSetup } from './provider-app-setup.js';
import type { OnboardingSnapshot, TutorialAction } from '../../../core/src/onboarding/types.js';
import type {} from '@deepseek-ai/dsh-api-session-controller/client';
import type {
  ChannelHistoryItem,
  PurgeSource,
  PurgePreview,
} from '../../../core/src/purge/contracts.js';
import type {
  PersonaBotDeletionPreview,
  PersonaBotDeletion,
} from '../../../core/src/bots/deletion.js';
import type { PairingRequest, PairingReviewInput } from '../../../core/src/messaging/pairing.js';
import type { SenderAccessInput } from '../../../core/src/messaging/sender-access.js';
import { unreadAfterAnchor } from './timeline-position.js';
import {
  reactToChannelMessage,
  searchAllMessages,
  searchChannelMessages,
  type MessageSearchPage,
} from './bridge.js';
import { toggledReactions } from './message-reactions-model.js';
import {
  gitInstalling,
  loadGitAvailability,
  reviewPairing,
  changeExternalSenderAccess,
  startGitInstall,
  setApprovalRoute,
  testApprovalRoute,
  retryApprovalNotification,
  retryQuestionNotification,
  setFailureAlerts,
  testFailureAlerts,
  retryFailureAlerts,
} from './bridge.js';
import { prependChannelJournal } from './channel-live.js';
import type { GroupMemberWakePolicy } from '../../../core/src/channels/channel.js';
import type { ChannelAssignmentSummary } from '../../../core/src/runtime/bot-runtime.js';
import { parsePrivateAccountList, type PrivateAccountList } from './private-accounts.js';
import type {
  MarketplaceAuthoredBot,
  MarketplaceAuthorAccount,
  MarketplaceDetail,
  MarketplaceEntry,
  MarketplaceFileView,
  MarketplacePage,
  MarketplaceQuery,
  MarketplaceDigest,
  MarketplaceDigestSummary,
  MarketplaceSection,
  MarketplaceTopic,
  MarketplaceInstallSource,
} from '../../../core/src/marketplace/client.js';
import type { AltchaChallenge } from '../../../core/src/marketplace/altcha.js';
import type {
  MarketplaceAccount,
  UploadPlan,
} from '../../../core/src/marketplace/uploaded-bots.js';
import type { ShareDraftView } from '../../../core/src/marketplace/share-draft.js';
import type { MarketplaceLanguage } from '../../../core/src/marketplace/language.js';
import type { InstallReviewResult } from '../../../core/src/marketplace/install-review.js';
import { loadAllBotPreview } from './bridge.js';
import { loadComposerIdentity, validateComposerDraft } from './bridge.js';
import type { AllBotPreview, AllBotMention } from '../../../core/src/channels/all-bot-mention.js';

import type {
  ChannelBridgeInput,
  ChannelBridgeSnapshot,
} from '../../../core/src/messaging/channel-bridge.js';
import type {
  ConversationIngestInput,
  ConversationIngestSnapshot,
} from '../../../core/src/messaging/conversation-ingest.js';
import type {
  MessagingIdentity,
  MessagingIdentityInput,
} from '../../../core/src/messaging/identity.js';
import type { ChannelActivityToday } from '../../../core/src/channels/activity-today.js';
import type { BotAttentionPage, HumanAttentionPage, HumanInboxState } from './store.js';
import type { GroupReceptionInput } from '../../../core/src/messaging/group-policy.js';
import type { MessagingConversationInput } from '../../../core/src/messaging/conversations.js';
import { publishWorkspaceGrantChange } from './workspace-grant-events.js';
import type { ExternalSource } from '../../../core/src/messaging/inbound.js';
import type {
  MessagingSnapshot,
  MessagingGrant,
  OutboxIntent,
} from '../../../core/src/messaging/outbound.js';
import type { MessagingTarget } from '../../../core/src/messaging/provider.js';
import {
  loadChannelBridges,
  manageChannelBridge,
  loadChannelIngests,
  manageChannelIngest,
  loadMessagingSnapshot,
  loadMessagingReachable,
  postMessagingConversation,
  readMessagingPostRequest,
  setMessagingPostLimit,
  manageMessagingIdentity,
  manageMessagingConversation,
  loadMessagingTargets,
  authorizeMessaging,
  revokeMessaging,
  sendMessaging,
  setMessagingReceive,
  setMessagingGroupPolicy,
  setMessagingThreadPolicy,
  setMessagingChannelTarget,
  readMessagingSource,
  loadMessageAttachmentTarget,
  loadChannelMediaTarget,
  parseBotCompactResult,
  type BotCompactResult,
} from './bridge.js';
import {
  applyRosterBatch,
  assignRosterChannel,
  BridgeCallError,
  createGroupChannel,
  inviteGroupBot,
  setGroupAvatar as setGroupAvatarViaBridge,
  setChannelHumanName,
  loadHumanIdentity,
  setBotAvatar as setBotAvatarViaBridge,
  setBotBanner as setBotBannerViaBridge,
  updateBotProfile as updateBotProfileViaBridge,
  setBotAppearance as setBotAppearanceViaBridge,
  setBotPrimaryColor as setBotPrimaryColorViaBridge,
  type BotPrimaryColorChoice,
  loadPartLibrary as loadPartLibraryViaBridge,
  addLibraryPart as addLibraryPartViaBridge,
  exportLibraryParts as exportLibraryPartsViaBridge,
  importLibraryParts as importLibraryPartsViaBridge,
  importLibraryImage as importLibraryImageViaBridge,
  type PartImageInfo,
  cancelGroupInvitation,
  decideGroupJoin,
  removeGroupMember,
  setGroupWakePolicy,
  loadGroupWakePolicies,
  loadChannelAssignments,
  loadSessionSubagents,
  loadAssignmentWork,
  type SessionSubagent,
  type AssignmentWork,
  deleteGroupChannel,
  createPersonaBot,
  type CreatedBot,
  downloadBotZip,
  importBotZip,
  loadBotZipFiles,
  type BotZipExportChoice,
  type BotZipFileListing,
  createRosterSection,
  errorMessage,
  loadWorkspaceOptions,
  loadHostFolders,
  loadWorkspaceGrants,
  loadToolApprovalRules,
  loadApprovalTemplates,
  setBotApprovalTemplate,
  loadApprovalReviewerModel,
  setApprovalReviewerModel,
  type ApprovalReviewerModelView,
  type ApprovalTemplateView,
  loadAssignmentAccess,
  setAssignmentAccess,
  type AssignmentAccessPresetView,
  revokeToolApprovalRule,
  type ToolApprovalRuleView,
  createWorkspaceGrant,
  createGroupWorkspaceGrant,
  readGroupWorkspaceGrant,
  revokeWorkspaceGrant,
  setWorkspaceGrantWrite,
  loadToolApprovalStatus,
  loadToolApprovalExecutionState,
  loadToolApprovalState,
  type ToolApprovalExecutionState,
  decideToolApproval,
  loadUserQuestionStatus,
  loadPrivateInputStatus,
  submitPrivateInput,
  cancelPrivateInput,
  settleTakeover,
  answerUserQuestion,
  type WorkspaceOption,
  type WorkspaceGrantView,
  loadBotAttention,
  loadChannelActivityToday,
  loadHumanAttention,
  loadHumanAttentionStatus,
  loadChannelUnreadCounts,
  loadHumanAssignmentContext,
  type HumanAssignmentContext,
  ignoreHumanAssignmentReport,
  dismissHumanInboxItem,
  dismissAllHumanInboxItems,
  overrideAutoRejection,
  snoozeHumanInboxItem,
  type TimelinePage,
  type TimelinePageRequest,
  loadSessions,
  setSessionArchived,
  stopSession,
  stopBot,
  moveMemoryLocation,
  loadBots,
  loadMemorySnapshot,
  loadMemoryFile,
  loadMemoryFileTarget,
  loadWorkspaceFileTarget,
  loadMemoryHistory,
  loadMemoryDiff,
  loadMemoryGitGraph,
  loadMemoryGitCommitDiff,
  loadProfileActivity,
  loadProfileSessionUsage,
  type ProfileSessionUsage,
  loadProfileUsage,
  loadOverviewMemory,
  loadOverviewUsage,
  loadMarketplaceDetail,
  loadMarketplaceFile,
  loadMarketplacePage,
  loadMarketplaceTopics,
  loadMarketplaceSections,
  loadMarketplaceDigests,
  loadMarketplaceDigest,
  submitMarketplaceRepository,
  loadMarketplaceChallenge,
  reportMarketplaceBot,
  installMarketplaceBot,
  reviewMarketplaceInstall,
  loadMyMarketplaceUploads,
  uploadMarketplaceBot,
  type UsageFilter,
  type UsageQueryResult,
  loadGroupProfileActivity,
  loadModelCatalog,
  loadModelPresets,
  loadModelPlan,
  loadModelPlanState,
  type ModelPlanStateView,
  createModelPreset,
  updateModelPreset,
  applyModelPreset,
  customizeModelPlan,
  setModelPlanAssignments,
  setModelPlan,
  setStandingLimits,
  type ModelCatalogView,
  type ModelPresetView,
  type ModelPlanView,
  type ModelRouteView,
  type AssignmentModelOptionView,
  loadBotSourcePolicies,
  loadBotSchedules,
  createBotSchedule,
  updateBotSchedule,
  deleteBotSchedule,
  loadBotScheduleHistory,
  runBotScheduleNow,
  previewBotSchedule,
  type BotSourcePolicyEdit,
  setBotSourcePolicy,
  resetBotSourcePolicy,
  loadMemoryWorkingChanges,
  loadMemoryWorkingDiff,
  loadMemoryRecoveryHistory,
  restoreMemoryCheckpoint,
  restoreMemoryCommit,
  nameMemoryVersion,
  loadMemoryVersions,
  removeMemoryVersionName,
  saveMemoryFile,
  repairMemory,
  loadTimelinePage,
  loadFilesPage,
  type FilesPage,
  loadReadPosition,
  markReadPosition,
  markAllReadPositions,
  loadChannels,
  loadRoster,
  openDmChannel,
  removeRosterSection,
  renameChannel as renameChannelViaBridge,
  renameRosterSection,
  reorderRosterSections,
  reorderTopOrder,
  sendChannelMessage,
  setRosterHidden,
  setChannelMute,
  setRosterPins,
  type BridgeCall,
  type MemoryAcceptedCommit,
  type MemorySnapshot,
  type MemoryGitGraph,
  type MemoryGitCommitDiff,
  type MemoryWorkingChange,
  type MemoryWorkingDiff,
  type MemoryWorkingKind,
  type MemoryRecoveryCheckpoint,
  type MemoryVersion,
  type MemoryVersionName,
  type MemoryRepairEvent,
  type ProfileActivity,
  type ProfileActivityWindow,
  type GroupProfileActivity,
  type BotSourcePolicyView,
  type BotScheduleView,
  type BotScheduleChange,
  type BotScheduleFiringView,
  type BotScheduleInput,
  type BotScheduleTrigger,
  type CreatePersonaBotInput,
  type RosterBatchInput,
} from './bridge.js';
import {
  planSectionChannelOrder,
  sameIds,
  type RosterSection,
  type TopOrderEntry,
} from './roster.js';
import { initialTimeline } from './store.js';
import {
  completeFlatEntries,
  flatRosterChannelIds,
  resolvePinnedChannelIds,
} from './roster-order.js';
import type {
  BotSummary,
  StandingLimitsView,
  ChannelAttachmentRef,
  ChannelMessage,
  ChannelSummary,
  ClientStore,
  OwnedSessionSummary,
  ConversationSelection,
  HumanAttentionItem,
  HumanInboxCategory,
  HumanInboxFilters,
  UserQuestionAnswerItem,
} from './store.js';

import {
  memoryDownloadUrl,
  type HostFileTarget,
  type HostFileOptions,
  type HostFileOpen,
  type NativeHostFiles,
} from './host-file-actions.js';
import { createFileOpenPreferences, type FileOpenPreferences } from './file-open-preferences.js';
import {
  ComposerSubmissionStore,
  type SubmissionAttempt,
  type SubmissionSnapshot,
} from './composer-submission-store.js';
import { createVoiceDictationPort } from './composer-dictation.js';
import {
  addVoiceProvider,
  loadVoiceProviders,
  removeVoiceProvider,
  setBotAsr,
  setBotVoice,
  setSpeechThreshold,
  setVoiceDefault,
  synthesizeVoice,
  testVoiceProvider,
  type BotAsrView,
  type BotVoiceView,
  type VoiceDefaultsView,
  type VoiceSpeechThresholdView,
  type VoiceProviderAddInput,
  type VoiceProviderHealthView,
  type VoiceProvidersView,
  type VoiceProviderView,
  type VoiceSynthesisView,
} from './voice-bridge.js';

const GIT_INSTALL_POLL_MS = 500;

export interface HostDirectoryListing {
  path: string;
  home: string;
  crumbs: { name: string; path: string; hidden: boolean }[];
  entries: { name: string; path: string; hidden: boolean }[];
  truncated: boolean;
  nextOffset?: number;
  roots?: { name: string; path: string; hidden: boolean }[];
  nativePicker?: boolean;
}

export interface BridgeActions {
  humanIdentity(signal?: AbortSignal): Promise<import('./bridge.js').LocalHumanIdentity>;
  tobHome(): Promise<
    import('../../../core/src/tob/service.js').TobHome & {
      attention?: { unreadCount: number; hasAction: boolean };
    }
  >;
  sendHome(
    channelId: string,
    body: string,
    messageId: string,
    attachments?: ChannelAttachmentRef[],
  ): Promise<void>;
  validateComposerDraft(
    channelId: string,
    attachments: ChannelAttachmentRef[],
    replyTo?: string,
  ): Promise<{
    reply?: ChannelMessage;
    attachments: Array<ChannelAttachmentRef | null>;
  }>;
  onboarding(slug?: string, action?: TutorialAction): Promise<OnboardingSnapshot>;
  onboardingModel(
    slug: string | undefined,
    expectedRevision: number,
    route: ModelRouteView,
    globalDefault: boolean,
  ): Promise<{ revision: number }>;
  inheritModel(slug: string, expectedRevision: number): Promise<{ revision: number }>;
  telemetryEvent(
    event: ClientTelemetryEventName,
    properties?: Record<string, string | boolean>,
  ): void;
  retryMessage(
    channelId: string,
    messageId: string,
    recovery?: {
      action: 'continue' | 'compact' | 'new-session';
      failureMessageId: string;
    },
  ): Promise<void>;
  stopBot(channelId: string, botSlug: string): Promise<'stopped' | 'not-working'>;
  cancelAutoContinue(channelId: string, botSlug: string, requestMessageId: string): Promise<void>;
  compactBot(botSlug: string): Promise<BotCompactResult>;
  newBotSession(botSlug: string): Promise<void>;
  botContext(
    botSlug: string,
  ): Promise<import('../../../core/src/runtime/context-window.js').BotContextWindow>;
  botSystemPrompt(
    botSlug: string,
  ): Promise<import('../../../core/src/runtime/prompt-inspection.js').BotSystemPromptView>;
  promptParts?(): Promise<{
    parts: import('../../../core/src/bridge/methods.js').PromptPartView[];
    limits: import('../../../core/src/bridge/methods.js').PromptLimitView[];
  }>;
  promptPresets?(): Promise<{
    presets: import('../../../core/src/prompts/prompt-presets.js').PromptPreset[];
    globalPresetId: string | null;
  }>;
  promptPresetCreate?(
    name: string,
    parts: Record<string, string | null>,
    limits?: Record<string, number | null>,
  ): Promise<{
    preset: import('../../../core/src/prompts/prompt-presets.js').PromptPreset;
  }>;
  promptPresetUpdate?(
    id: string,
    change: {
      name?: string;
      parts?: Record<string, string | null>;
      limits?: Record<string, number | null>;
      expectedRevision?: number;
    },
  ): Promise<{
    preset: import('../../../core/src/prompts/prompt-presets.js').PromptPreset;
  }>;
  promptPresetDelete?(id: string): Promise<{ id: string; clearedBots: string[] }>;
  promptGlobalSet?(presetId: string | null): Promise<{ presetId: string | null }>;
  botPrompt?(slug: string): Promise<import('../../../core/src/bridge/methods.js').BotPromptView>;
  botPromptSet?(
    slug: string,
    change: {
      presetId?: string | null;
      parts?: Record<string, string | null>;
      limits?: Record<string, number | null>;
    },
  ): Promise<import('../../../core/src/bridge/methods.js').BotPromptView>;
  botTurnInput(
    botSlug: string,
    turns?: number,
  ): Promise<{
    slug: string;
    sessionId: string;
    turns: import('../../../core/src/runtime/prompt-inspection.js').TurnInputView[];
  }>;

  channelBridges(channelId: string): Promise<ChannelBridgeSnapshot>;
  channelBridge(channelId: string, input: ChannelBridgeInput): Promise<void>;
  channelIngests(channelId: string): Promise<ConversationIngestSnapshot>;
  channelIngest(channelId: string, input: ConversationIngestInput): Promise<void>;
  messagingChannelTarget(slug: string, grantId: string, channelId: string | null): Promise<void>;
  messagingThreadPolicy(
    slug: string,
    sourceEventId: string,
    policy: import('../../../core/src/messaging/thread-policy.js').ThreadReceptionInput,
  ): Promise<void>;
  messagingGroupPolicy(slug: string, grantId: string, policy: GroupReceptionInput): Promise<void>;
  messagingReceive(slug: string, grantId: string, enabled: boolean): Promise<void>;
  messagingSource(slug: string, sourceEventId: string): Promise<ExternalSource>;
  approvalRoute(slug: string, pairingId: string | null, expectedRevision: number): Promise<void>;
  approvalTest(slug: string): Promise<void>;
  approvalRetry(slug: string, id: string): Promise<void>;
  questionRetry(slug: string, id: string): Promise<void>;
  failureAlertsSet(slug: string, enabled: boolean, expectedRevision: number): Promise<void>;
  failureAlertsTest(slug: string): Promise<void>;
  failureAlertsRetry(slug: string, id: string): Promise<void>;
  pairingReview(slug: string, input: PairingReviewInput): Promise<PairingRequest>;
  senderAccess(slug: string, input: SenderAccessInput): Promise<void>;
  messagingIdentity(slug: string, input: MessagingIdentityInput): Promise<MessagingIdentity>;
  messagingConversation(slug: string, input: MessagingConversationInput): Promise<void>;
  appSetup?: ProviderAppSetup;
  messagingSnapshot(slug: string): Promise<MessagingSnapshot>;
  messagingReachable?(
    slug: string,
    bindingId: string,
    cursor?: string,
  ): Promise<import('../../../core/src/messaging/provider.js').MessagingReachablePage>;
  messagingPostConversation?(
    slug: string,
    bindingId: string,
    conversationId: string,
    requestId: string,
    text: string,
  ): Promise<OutboxIntent>;
  messagingPostRequest?(
    slug: string,
    bindingId: string,
    conversationId: string,
    requestId: string,
    text: string,
  ): Promise<OutboxIntent | undefined>;
  messagingPostLimit?(
    slug: string,
    bindingId: string,
    expectedRevision: number,
    limit: number | null,
  ): Promise<void>;
  messagingTargets(providerId: string, accountRef: string): Promise<MessagingTarget[]>;
  messagingAuthorize(input: {
    botSlug: string;
    providerId: string;
    accountRef: string;
    targetRef: string;
    fingerprint: string;
    targetDigest: string;
  }): Promise<MessagingGrant>;
  messagingRevoke(slug: string, grantId: string): Promise<void>;
  messagingSend(
    slug: string,
    grantId: string,
    requestId: string,
    text: string,
  ): Promise<OutboxIntent>;

  modelCatalog(): Promise<ModelCatalogView>;
  modelPresets(): Promise<ModelPresetView[]>;
  modelPlan(slug: string): Promise<ModelPlanView | undefined>;
  modelPlanState(slug: string): Promise<ModelPlanStateView>;
  createModelPreset(
    name: string,
    orchestrator: ModelRouteView,
    assignmentDefault: ModelRouteView,
    assignmentModels?: AssignmentModelOptionView[],
  ): Promise<ModelPresetView>;
  updateModelPreset(
    id: string,
    expectedRevision: number,
    name: string,
    orchestrator: ModelRouteView,
    assignmentDefault: ModelRouteView,
  ): Promise<ModelPresetView>;
  applyModelPreset(slug: string, presetId: string): Promise<ModelPlanView>;
  customizeModelPlan(
    slug: string,
    orchestrator: ModelRouteView,
    expectedRevision?: number,
  ): Promise<ModelPlanView>;
  setStandingLimits(slug: string, limits: StandingLimitsView): Promise<BotSummary>;
  setModelPlanAssignments(
    slug: string,
    expectedRevision: number,
    assignmentDefault: ModelRouteView,
    assignmentModels: AssignmentModelOptionView[],
  ): Promise<ModelPlanView>;
  setModelPlan(
    slug: string,
    expectedRevision: number,
    orchestrator: ModelRouteView,
    assignmentDefault: ModelRouteView,
    assignmentModels: AssignmentModelOptionView[],
  ): Promise<ModelPlanView>;
  listHostFolders(
    path?: string,
    signal?: AbortSignal,
    offset?: number,
  ): Promise<HostDirectoryListing>;
  pickWorkspaceFolder(): Promise<string | null>;
  addWorkspaceFolder(slug: string): Promise<WorkspaceGrantView | undefined>;
  authorizeWorkspacePath(slug: string, path: string): Promise<WorkspaceGrantView>;
  resolveWorkspaceFolder(path: string): Promise<WorkspaceOption>;
  authorizeGroupWorkspacePath(
    channelId: string,
    slug: string,
    path: string,
  ): Promise<{ grant: WorkspaceGrantView; created: boolean }>;
  readGroupWorkspaceGrant(
    channelId: string,
    slug: string,
    path: string,
  ): Promise<WorkspaceGrantView | undefined>;
  memoryDirectory(slug: string): Promise<string | undefined>;
  moveMemoryLocation(slug: string, location: string | null): Promise<string>;
  load(signal?: AbortSignal): Promise<void>;
  deletionPreview(slug: string): Promise<PersonaBotDeletionPreview>;
  deletionConfirm(slug: string, token: string, eraseMemory: boolean): Promise<PersonaBotDeletion>;
  deletionRetry(slug: string): Promise<PersonaBotDeletion>;
  deletionFolderApplications(slug: string): Promise<HostFileOptions>;
  deletionFolderOpen(slug: string, choice?: HostFileOpen): Promise<void>;
  refreshRoster(signal?: AbortSignal): Promise<void>;
  refreshGit(signal?: AbortSignal): Promise<void>;
  installGit(): Promise<void>;
  openBot(slug: string, view?: 'profile' | 'inbox'): Promise<void>;
  refreshBotInbox(slug: string): Promise<void>;
  openActivityCenter(): Promise<void>;
  attachActivityCenterPanel(): () => void;
  activityPage(
    category: HumanInboxCategory,
    filters: HumanInboxFilters & { search?: string; mentionsFirst?: boolean },
    cursor?: string,
  ): Promise<HumanAttentionPage>;
  openHumanInbox(): Promise<void>;
  refreshHumanInboxStatus(): Promise<void>;
  refreshHumanInbox(category?: HumanInboxCategory, background?: boolean): Promise<void>;
  setHumanInboxFilters(filters: HumanInboxFilters): Promise<void>;
  loadMoreHumanInbox(): Promise<void>;
  dismissHumanInbox(item: HumanAttentionItem): Promise<void>;
  dismissAllHumanInbox(filter: {
    kind?: HumanAttentionItem['kind'] | undefined;
    categories: ReadonlyArray<'action' | 'info' | 'replies' | 'unread'>;
    botSlug?: string | undefined;
    channelId?: string | undefined;
  }): Promise<{ dismissed: number; more: boolean }>;
  allowAutoRejectionOnce(item: HumanAttentionItem): Promise<void>;
  snoozeHumanInbox(item: HumanAttentionItem, until: string | null): Promise<void>;
  humanInboxContextPage(
    channelId: string,
    request: TimelinePageRequest,
    signal?: AbortSignal,
  ): Promise<TimelinePage>;
  channelFilesPage(
    channelId: string,
    request: { before?: number; limit?: number },
    signal?: AbortSignal,
  ): Promise<FilesPage>;
  ignoreHumanReport(sourceEventId: string): Promise<void>;
  loadMoreBotInbox(slug: string): Promise<void>;
  botInboxPage(slug: string, cursor?: string): Promise<BotAttentionPage>;
  openChannel(channelId: string): Promise<void>;
  openChannelAtMessage(channelId: string, messageId: string): Promise<void>;
  averageReplyPerf(channelId: string, signal?: AbortSignal): Promise<AveragePerfView | undefined>;
  humanInboxContext(
    channelId: string,
    messageId: string,
    signal?: AbortSignal,
  ): Promise<ChannelMessage[]>;
  replyFromHumanInbox(
    channelId: string,
    messageId: string,
    body: string,
    clientMessageId: string,
  ): Promise<ChannelMessage>;
  resolveWorkspaceGrantRequest(
    slug: string,
    messageId: string,
    path: string,
    body: (workspaceTitle: string) => string,
    channelId?: string,
  ): Promise<void>;
  humanAssignmentContext(
    slug: string,
    sessionId: string,
    sourceEventId: string,
    signal?: AbortSignal,
  ): Promise<HumanAssignmentContext>;
  replyToHumanAssignment(
    slug: string,
    sessionId: string,
    sourceEventId: string,
    body: string,
    clientMessageId: string,
  ): Promise<ChannelMessage>;
  loadOlder(channelId: string): Promise<void>;
  loadNewer(channelId: string): Promise<void>;
  openLatest(channelId: string): Promise<void>;
  openAround(channelId: string, messageId: string): Promise<void>;
  markAllRead(scope?: {
    channelId?: string | undefined;
    botSlug?: string | undefined;
  }): Promise<void>;
  markRead(channelId: string, messageId: string): Promise<void>;
  reactToMessage?(
    channelId: string,
    messageId: string,
    emoji: string,
    active: boolean,
  ): Promise<void>;
  searchChannel?(
    channelId: string,
    text: string,
    cursor?: string,
  ): Promise<{ messages: ChannelMessage[]; nextCursor?: string }>;
  searchMessages?(text: string, cursor?: string): Promise<MessageSearchPage>;
  markChannelRead(channelId: string): Promise<void>;
  refreshChannelMessages(channelId: string): Promise<void>;
  applyChannelTail(
    channelId: string,
    page: {
      entries: ChannelMessage[];
      olderCursor: string | null;
      hasOlder: boolean;
    },
  ): void;
  dismissFailedMessage(channelId: string, messageId: string): boolean;
  openSession(sessionId: string): void;
  refreshSessions(slug: string): Promise<void>;
  conceptArt?(payload: Record<string, unknown>): Promise<unknown>;
  readSessions(slug: string): Promise<OwnedSessionSummary[]>;
  setSessionArchived(slug: string, sessionId: string, archived: boolean): Promise<void>;
  stopSession(
    slug: string,
    session: string | { activityId: string },
    channelId?: string,
  ): Promise<void>;
  messageAttachmentTarget(
    channelId: string,
    messageId: string,
    fileId: string,
  ): Promise<HostFileTarget>;
  messageAttachmentApplications(
    channelId: string,
    messageId: string,
    fileId: string,
  ): Promise<HostFileOptions>;
  messageAttachmentOpen(
    channelId: string,
    messageId: string,
    fileId: string,
    choice: HostFileOpen,
  ): Promise<void>;
  messageAttachmentDownload(channelId: string, messageId: string, fileId: string): Promise<void>;
  bridgeFileCommands?(sourceEventId: string):
    | (import('./host-file-menu.js').HostFileCommands & {
        available(): Promise<boolean>;
      })
    | undefined;
  workspaceFileTarget(slug: string, grantId: string): Promise<HostFileTarget>;
  workspaceFileApplications(slug: string, grantId: string): Promise<HostFileOptions>;
  workspaceFileOpen(slug: string, grantId: string, choice: HostFileOpen): Promise<void>;
  memoryFileTarget(slug: string, path: string): Promise<HostFileTarget>;
  memoryFileApplications(slug: string, path: string): Promise<HostFileOptions>;
  memoryFileOpen(slug: string, path: string, choice: HostFileOpen): Promise<void>;
  memoryFileDownload(slug: string, path: string): Promise<void>;
  fileOpenPreferences: FileOpenPreferences;
  memorySnapshot(channelId: string): Promise<MemorySnapshot>;
  memoryFile(
    channelId: string,
    path: string,
  ): Promise<
    | {
        path: string;
        body: string;
        head: string;
        binary?: boolean;
        image?: import('./bridge.js').MemoryImage;
        markdown?: import('./bridge.js').MemoryMarkdown;
      }
    | undefined
  >;
  memoryHistory(channelId: string): Promise<MemoryAcceptedCommit[]>;
  memoryDiff(channelId: string, sha: string): Promise<string>;
  memoryGitGraph(channelId: string, offset: number): Promise<MemoryGitGraph>;
  memoryGitCommitDiff(channelId: string, sha: string): Promise<MemoryGitCommitDiff>;
  profileActivity(channelId: string, window?: ProfileActivityWindow): Promise<ProfileActivity>;
  profileSessionUsage(channelId: string): Promise<ProfileSessionUsage>;
  overviewMemory(
    after?: string,
  ): Promise<import('../../../core/src/memory/overview.js').OverviewMemory>;
  overviewUsage(
    period: import('../../../core/src/usage/overview.js').UsageOverviewPeriod,
    after?: string,
  ): Promise<import('../../../core/src/bridge/methods.js').OverviewUsage>;
  profileUsage(channelId: string, filter: UsageFilter): Promise<UsageQueryResult>;
  channelActivityToday(): Promise<ChannelActivityToday>;
  groupProfileActivity(channelId: string): Promise<GroupProfileActivity>;
  botSourcePolicies(slug: string): Promise<BotSourcePolicyView[]>;
  botSchedules(slug: string): Promise<BotScheduleView[]>;
  createBotSchedule(slug: string, input: BotScheduleInput): Promise<BotScheduleView>;
  updateBotSchedule(slug: string, id: string, change: BotScheduleChange): Promise<BotScheduleView>;
  deleteBotSchedule(slug: string, id: string): Promise<void>;
  botScheduleHistory(slug: string, id: string): Promise<BotScheduleFiringView[]>;
  runBotScheduleNow(slug: string, id: string): Promise<BotScheduleFiringView>;
  botSchedulePreview(trigger: BotScheduleTrigger): Promise<string[]>;
  setBotSourcePolicy(slug: string, edit: BotSourcePolicyEdit): Promise<void>;
  resetBotSourcePolicy(
    slug: string,
    sourceClass: BotSourcePolicyEdit['sourceClass'],
  ): Promise<void>;
  memoryWorkingChanges(channelId: string): Promise<MemoryWorkingChange[]>;
  memoryWorkingDiff(
    channelId: string,
    path: string,
    kind: MemoryWorkingKind,
  ): Promise<MemoryWorkingDiff>;
  memoryRecoveryHistory(channelId: string): Promise<MemoryRecoveryCheckpoint[]>;
  memoryRestore(input: {
    channelId: string;
    checkpointId: string;
    expectedCurrentId: string;
  }): Promise<{ checkpoint: MemoryRecoveryCheckpoint; archivePath: string }>;
  memoryRestoreCommit(input: {
    channelId: string;
    sha: string;
    expectedHead: string;
    restoreId: string;
    name?: string;
  }): Promise<{
    head: string;
    backup: string | null;
    version: MemoryVersionName | null;
    saved: MemoryRecoveryCheckpoint;
  }>;
  memoryNameVersion(input: {
    channelId: string;
    sha: string;
    name: string;
  }): Promise<MemoryVersionName>;
  memoryRemoveVersionName(input: { channelId: string; tag: string }): Promise<void>;
  memoryVersions(channelId: string): Promise<MemoryVersion[]>;
  memoryRepair(input: {
    channelId: string;
    expectedHead: string;
    repairId: string;
  }): Promise<MemoryRepairEvent>;
  memorySave(input: {
    channelId: string;
    path: string;
    body: string;
    expectedHead: string;
    editId: string;
  }): Promise<MemoryAcceptedCommit>;
  listWorkspaceOptions(): Promise<WorkspaceOption[]>;
  listWorkspaceGrants(slug: string): Promise<WorkspaceGrantView[]>;
  createWorkspaceGrant(slug: string, workspaceId: string): Promise<WorkspaceGrantView>;
  revokeWorkspaceGrant(slug: string, grantId: string): Promise<WorkspaceGrantView>;
  setWorkspaceGrantWrite(
    slug: string,
    grantId: string,
    enabled: boolean,
  ): Promise<WorkspaceGrantView>;
  assignmentAccess(slug: string): Promise<AssignmentAccessPresetView>;
  setAssignmentAccess(
    slug: string,
    mode: AssignmentAccessPresetView['mode'],
    acknowledgeRisk: boolean,
    scope?: 'chat' | 'assignments',
  ): Promise<AssignmentAccessPresetView>;
  listToolApprovalRules(slug: string): Promise<ToolApprovalRuleView[]>;
  approvalTemplates?(
    slug: string,
  ): Promise<{ templates: ApprovalTemplateView[]; selected: string | null }>;
  setBotApprovalTemplate?(slug: string, template: string | null): Promise<void>;
  approvalReviewerModel?(): Promise<ApprovalReviewerModelView>;
  voiceProviders?(slug?: string): Promise<VoiceProvidersView>;
  dictationPort?(slug?: string): import('./composer-dictation.js').VoiceDictationPort;
  addVoiceProvider?(input: VoiceProviderAddInput): Promise<VoiceProviderView>;
  removeVoiceProvider?(id: string): Promise<string[]>;
  testVoiceProvider?(id: string, voiceId?: string): Promise<VoiceProviderHealthView>;
  synthesizeVoice?(input: {
    text: string;
    slug?: string;
    providerId?: string;
    voiceId?: string;
  }): Promise<VoiceSynthesisView>;
  setBotVoice?(
    slug: string,
    providerId: string | null,
    voiceId?: string,
  ): Promise<BotVoiceView | null>;
  setBotAsr?(slug: string, providerId: string | null): Promise<BotAsrView | null>;
  setVoiceDefault?(
    kind: 'tts' | 'asr',
    providerId: string | null,
    voiceId?: string,
  ): Promise<VoiceDefaultsView>;
  setSpeechThreshold?(dbfs: number | null): Promise<VoiceSpeechThresholdView>;
  setApprovalReviewerModel?(model: ModelRouteView | null): Promise<ApprovalReviewerModelView>;
  revokeToolApprovalRule(slug: string, id: string): Promise<void>;
  toolApprovalStatus(
    channelId: string,
    messageId: string,
  ): Promise<import('./bridge.js').ToolApprovalStatus>;
  privateInputStatus?(
    channelId: string,
    messageId: string,
  ): Promise<import('../../../core/src/credentials/contracts.js').PrivateInputStatus>;
  privateInputSubmit?(
    channelId: string,
    messageId: string,
    values: Record<string, string>,
  ): Promise<void>;
  privateInputCancel?(channelId: string, messageId: string): Promise<void>;
  settleTakeover?(
    channelId: string,
    messageId: string,
    outcome: 'done' | 'failed' | 'cancelled',
  ): Promise<'done' | 'failed' | 'cancelled' | 'expired' | undefined>;
  privateAccountStatus?(
    channelId: string,
    messageId: string,
  ): Promise<import('../../../core/src/credentials/contracts.js').PrivateAccountStatus>;
  privateInputReplace?(channelId: string, messageId: string): Promise<string>;
  privateAccounts?(slug: string): Promise<PrivateAccountList>;
  privateMcpServerRemove?(slug: string, serverName: string): Promise<boolean>;
  privateMcpServerEnable?(slug: string, serverName: string, enabled: boolean): Promise<boolean>;
  privateAccountRevoke?(
    channelId: string,
    messageId: string,
  ): Promise<import('../../../core/src/credentials/contracts.js').PrivateRevocationResult>;
  toolApprovalState?(
    channelId: string,
    messageId: string,
  ): Promise<{ status: import('./bridge.js').ToolApprovalStatus; expiresAt?: string }>;
  toolApprovalExecutionState?(
    channelId: string,
    messageId: string,
  ): Promise<ToolApprovalExecutionState | undefined>;
  decideToolApproval(
    channelId: string,
    messageId: string,
    outcome:
      | 'allowed-once'
      | 'allowed-always-tool'
      | 'allowed-always-exact'
      | 'allowed-always-all'
      | 'rejected',
  ): Promise<void>;
  userQuestionStatus(
    channelId: string,
    messageId: string,
  ): Promise<'pending' | 'submitted' | 'answered' | 'expired'>;
  answerUserQuestion(
    channelId: string,
    messageId: string,
    answers: UserQuestionAnswerItem[],
  ): Promise<void>;
  allBotPreview(channelId: string): Promise<AllBotPreview>;
  send(
    body: string,
    replyTo?: string,
    attachments?: ChannelAttachmentRef[],
    memorySwitchTarget?: string,
    mentions?: ChannelMessage['mentions'],
    channelRefs?: ChannelMessage['channelRefs'],
    grantRequestResolution?: ChannelMessage['grantRequestResolution'],
    allBotMention?: AllBotMention,
    submissionId?: string,
  ): Promise<boolean>;
  submissions: {
    subscribe(listener: () => void): () => void;
    snapshot(channelId: string): SubmissionSnapshot | undefined;
    begin(
      channelId: string,
      attempt: Pick<SubmissionAttempt, 'text' | 'mentions' | 'channelRefs'> &
        Partial<Pick<SubmissionAttempt, 'replyTo' | 'attachments'>>,
    ): { id: string; persisted: boolean } | undefined;
    cancel(channelId: string, id: string): void;
    sync(channelId: string): void;
    check(channelId: string, id: string): Promise<'committed' | 'absent' | 'unknown'>;
    reconcile(channelId: string): Promise<void>;
  };
  createBot(input: CreatePersonaBotInput, sectionId?: string): Promise<CreatedBot>;
  openCreatedBot(bot: BotSummary, sectionId?: string): Promise<void>;
  importBotZip(file: File, sectionId?: string): Promise<BotSummary>;
  botZipFiles(slug: string): Promise<BotZipFileListing>;
  exportBotZip(slug: string, displayName: string, choice?: BotZipExportChoice): Promise<void>;
  marketplaceList(query?: MarketplaceQuery): Promise<MarketplacePage>;
  marketplaceChallenge(): Promise<AltchaChallenge>;
  marketplaceSubmit(url: string, altcha: string): Promise<MarketplaceEntry>;
  marketplaceReport(id: string, altcha: string, reason?: string): Promise<void>;
  marketplaceTopics(): Promise<MarketplaceTopic[]>;
  marketplaceSections(lang?: MarketplaceLanguage): Promise<MarketplaceSection[]>;
  marketplaceDigests(lang?: MarketplaceLanguage): Promise<MarketplaceDigestSummary[]>;
  marketplaceDigest(day?: string, lang?: MarketplaceLanguage): Promise<MarketplaceDigest>;
  marketplaceDetail(id: string, lang?: MarketplaceLanguage): Promise<MarketplaceDetail>;
  marketplaceFile(id: string, path: string): Promise<MarketplaceFileView>;
  marketplaceAccount(): Promise<MarketplaceAccount>;
  marketplaceAuthorSave(
    displayName: string,
    acceptTerms: boolean,
  ): Promise<MarketplaceAuthorAccount>;
  marketplaceAuthorAvatarSet(avatar: string | null): Promise<MarketplaceAuthorAccount>;
  marketplaceUploadPlan(slug: string): Promise<UploadPlan>;
  marketplaceUpload(
    slug: string,
    presentation: {
      displayName: string;
      bio?: string;
      tags?: string[];
      replaces?: string;
    },
  ): Promise<{ bot: MarketplaceEntry; skipped: UploadPlan['skipped'] }>;
  marketplaceMine(lang?: MarketplaceLanguage): Promise<MarketplaceAuthoredBot[]>;
  marketplaceDelete(id: string): Promise<void>;
  shareDraftStart(slug: string): Promise<ShareDraftView>;
  shareDraftGet(slug: string): Promise<ShareDraftView | undefined>;
  shareDraftDiscard(slug: string): Promise<void>;
  shareDraftExport(slug: string): Promise<{ path: string; files: number }>;
  marketplaceInstallReview(id: string, lang?: MarketplaceLanguage): Promise<InstallReviewResult>;
  marketplaceInstall(
    id: string,
    reviewId: string,
    sectionId?: string,
    source?: MarketplaceInstallSource,
  ): Promise<BotSummary>;
  createGroup(name: string, sectionId?: string): Promise<ChannelSummary | undefined>;
  renameChannel(channelId: string, name: string): Promise<boolean>;
  setHumanNickname(channelId: string, nickname: string | null): Promise<boolean>;
  setGroupAvatar(channelId: string, avatar: string | null): Promise<boolean>;
  setBotAvatar(channelId: string, avatar: string | null): Promise<boolean>;
  setBotBanner(
    channelId: string,
    banner: { recipe: PixelBannerRecipe } | { image: string } | null,
  ): Promise<boolean>;
  setBotPrimaryColor(channelId: string, primaryColor: BotPrimaryColorChoice): Promise<boolean>;
  updateBotProfile(
    slug: string,
    patch: { roles?: string[]; description?: string },
  ): Promise<boolean>;
  setBotAppearance(
    channelId: string,
    recipe: import('../../../core/src/bots/avatar-appearance.js').AvatarRecipe,
  ): Promise<boolean>;
  exportLibraryParts(
    id?: string,
    part?: import('../../../core/src/bots/avatar-appearance.js').PixelCustomPart,
  ): Promise<{ fileName: string; data: string } | undefined>;
  importLibraryParts(data: string): Promise<
    | {
        added: import('../../../core/src/bots/part-library.js').PartLibraryEntry[];
        refused: number;
        image?: PartImageInfo;
      }
    | { error: string }
  >;
  importLibraryImage(
    data: string,
    slot: string,
    colors: number,
    name: string,
  ): Promise<import('../../../core/src/bots/part-library.js').PartLibraryEntry | { error: string }>;
  loadPartLibrary(): Promise<
    import('../../../core/src/bots/part-library.js').PartLibraryEntry[] | undefined
  >;
  addLibraryPart(
    part: import('../../../core/src/bots/avatar-appearance.js').PixelCustomPart,
    name: string,
    parent?: string,
  ): Promise<import('../../../core/src/bots/part-library.js').PartLibraryEntry | undefined>;
  inviteGroupBot(channelId: string, botSlug: string): Promise<boolean>;
  cancelGroupInvitation(channelId: string, invitationId: string): Promise<boolean>;
  decideGroupJoin(channelId: string, requestId: string, accept: boolean): Promise<boolean>;
  removeGroupMember(channelId: string, botSlug: string): Promise<boolean>;
  groupWakePolicies(channelId: string): Promise<GroupMemberWakePolicy[]>;
  channelAssignments(channelId: string): Promise<ChannelAssignmentSummary[]>;
  sessionSubagents?(
    slug: string,
    sessionId: string,
  ): Promise<{ subagents: SessionSubagent[]; omitted: number }>;
  assignmentWork?(slug: string, sessionId: string): Promise<AssignmentWork>;
  setGroupWakePolicy(
    channelId: string,
    botSlug: string,
    policy: {
      mode: 'all' | 'mentions' | 'digest' | 'silent';
      count: number;
      intervalSeconds: number;
      inherit?: boolean;
    },
  ): Promise<boolean>;
  deleteGroupChannel(channelId: string): Promise<boolean>;
  channelHistory(): Promise<ChannelHistoryItem[]>;
  channelHistorySources(
    channelId: string,
    before?: string,
  ): Promise<{ sources: PurgeSource[]; before?: string }>;
  channelPurgePreview(channelId: string, sourceEventIds: string[]): Promise<PurgePreview>;
  channelPurgeConfirm(
    channelId: string,
    sourceEventIds: string[],
    token: string,
  ): Promise<{ accepted: number; cleanupPending?: number }>;
  createSection(name: string): Promise<RosterSection | undefined>;
  renameSection(sectionId: string, name: string): Promise<boolean>;
  removeSection(sectionId: string): Promise<boolean>;
  setChannelPinned(channelId: string, pinned: boolean): Promise<boolean>;
  reorderPinnedChannels(order: readonly string[], beforePublish: () => void): Promise<boolean>;
  setChannelHidden(channelId: string, hidden: boolean): Promise<boolean>;
  setChannelMuted(channelId: string, muted: boolean): Promise<boolean>;
  batchRoster(input: RosterBatchInput): Promise<boolean>;
  movePinnedChannel(
    channelId: string,
    sectionId: string,
    order: readonly string[],
  ): Promise<boolean>;
  movePinnedChannelToFlat(channelId: string, order: readonly TopOrderEntry[]): Promise<boolean>;
  assignChannel(channelId: string, sectionId: string | undefined, index?: number): Promise<boolean>;
  setSectionChannelOrder(sectionId: string, order: readonly string[]): Promise<boolean>;
  moveChannel(channelId: string, sectionId: string, order: readonly string[]): Promise<boolean>;
  reorderSections(order: readonly string[]): Promise<boolean>;
  reorderFlat(order: readonly TopOrderEntry[]): Promise<boolean>;
  moveToFlat(channelId: string, order: readonly TopOrderEntry[]): Promise<boolean>;
  ensureChannelPins(): Promise<boolean>;
  ensureFlatTopOrder(): Promise<boolean>;
}

let localEchoSequence = 0;

function nextLocalEchoId(): string {
  localEchoSequence += 1;
  const fallback = `${localEchoSequence.toString(16).padStart(8, '0').slice(-8)}-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`;
  const unique = globalThis.crypto?.randomUUID?.() ?? fallback;
  return `human-${unique}`;
}

function reconcileCommittedMessage(
  messages: readonly ChannelMessage[],
  localId: string,
  committed: ChannelMessage,
): ChannelMessage[] {
  if (committed.id !== localId && messages.some((message) => message.id === committed.id)) {
    return messages.filter((message) => message.id !== localId);
  }
  const index = messages.findIndex((message) => message.id === localId);
  if (index < 0) return [...messages, committed];
  return messages.map((message) => (message.id === localId ? committed : message));
}

function mergeLatestWindow(
  previous: readonly ChannelMessage[],
  incoming: readonly ChannelMessage[],
): { messages: ChannelMessage[]; keptPrefix: boolean } {
  const first = incoming[0];
  const overlap = first === undefined ? -1 : previous.findIndex((item) => item.id === first.id);
  const committed = previous.filter((item) => item.channelRevision !== undefined);
  const continues =
    overlap < 0 &&
    first?.channelRevision !== undefined &&
    committed.at(-1)?.channelRevision === first.channelRevision - 1;
  const prefix = continues ? committed : overlap < 0 ? [] : previous.slice(0, overlap);
  const seen = new Set<string>();
  const messages = [
    ...prefix,
    ...incoming,
    ...previous.filter((item) => item.pending === true || item.failed !== undefined),
  ].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return { messages, keptPrefix: overlap >= 0 || continues };
}

const APPROVAL_DECISIONS = {
  'allowed-once': 'allow_once',
  'allowed-always-tool': 'allow_always',
  'allowed-always-exact': 'allow_always',
  'allowed-always-all': 'allow_always',
  rejected: 'reject',
} as const;

async function recorded<T>(work: Promise<T>, record: () => void): Promise<T> {
  const value = await work;
  record();
  return value;
}

export function createActions(
  call: BridgeCall,
  clientStore: ClientStore,
  folderAccess?: {
    pickDirectory(): Promise<string | null>;
    createWorkspace(input: { path: string }): Promise<{ workspaceId: string }>;
    openSession?(sessionId: string): void;
    nativeFiles?: NativeHostFiles;
    fileOpenPreferences?: FileOpenPreferences;
    submissions?: ComposerSubmissionStore;
  },
): BridgeActions {
  clientStore.setComposerIdentity(undefined);
  let openingFile = false;
  const fileOpenPreferences =
    folderAccess?.fileOpenPreferences ?? createFileOpenPreferences({ storage: undefined });
  const submissions =
    folderAccess?.submissions ??
    new ComposerSubmissionStore(
      (() => {
        try {
          return typeof localStorage === 'undefined' ? undefined : localStorage;
        } catch {
          return undefined;
        }
      })(),
    );
  const submissionScope = (channelId: string): string | undefined => {
    const identity = clientStore.getSnapshot().composerIdentity;
    return identity === undefined
      ? undefined
      : JSON.stringify([identity.hostId, identity.profileId, identity.humanId, channelId]);
  };
  const submissionEcho = (attempt: SubmissionAttempt): ChannelMessage => ({
    id: attempt.id,
    at: attempt.at,
    author: { kind: 'human' },
    body: attempt.text,
    ...(attempt.mentions.length === 0 ? {} : { mentions: attempt.mentions }),
    ...(attempt.channelRefs.length === 0 ? {} : { channelRefs: attempt.channelRefs }),
    ...(attempt.attachments === undefined ? {} : { attachments: attempt.attachments }),
    ...(attempt.replyTo === undefined ? {} : { replyTo: attempt.replyTo, replyToPreview: null }),
    pending: false,
    failed: attempt.error ?? '',
    ...(attempt.state === 'unknown' ? { unconfirmed: true } : {}),
  });
  const settleSubmission = (
    channelId: string,
    id: string,
    state: SubmissionAttempt['state'],
    error?: string,
  ): void => {
    const scope = submissionScope(channelId);
    if (scope !== undefined) submissions.settle(scope, id, state, error);
  };
  const failedByChannel = new Map<string, ChannelMessage[]>();
  const localFailedFor = (id: string): ChannelMessage[] => {
    const held = failedByChannel.get(id) ?? [];
    const scope = submissionScope(id);
    if (scope === undefined) return held;
    const heldIds = new Set(held.map((message) => message.id));
    const active = new Set(
      clientStore
        .getSnapshot()
        .conversation.messages.filter((message) => message.pending === true)
        .map((message) => message.id),
    );
    return [
      ...held,
      ...submissions
        .read(scope)
        .attempts.filter(
          (attempt) =>
            (attempt.state === 'failed' || attempt.state === 'unknown') &&
            !heldIds.has(attempt.id) &&
            !active.has(attempt.id),
        )
        .map(submissionEcho),
    ];
  };
  const remainingFailures = (
    channelId: string,
    committed: readonly ChannelMessage[],
  ): ChannelMessage[] => {
    const committedIds = new Set(committed.map((message) => message.id));
    const current = localFailedFor(channelId);
    const next = current.filter((message) => !committedIds.has(message.id));
    if (next.length !== current.length) {
      for (const message of current)
        if (committedIds.has(message.id)) settleSubmission(channelId, message.id, 'sent');
      failedByChannel.set(
        channelId,
        (failedByChannel.get(channelId) ?? []).filter((message) => !committedIds.has(message.id)),
      );
    }
    return next;
  };
  const checkSubmission = async (
    channelId: string,
    id: string,
  ): Promise<'committed' | 'absent' | 'unknown'> => {
    try {
      const { page } = await loadTimelinePage(call, channelId, {
        direction: 'around',
        around: id,
        olderLimit: 0,
        newerLimit: 0,
      });
      return page.entries.some((message) => message.id === id) ? 'committed' : 'absent';
    } catch (error) {
      return error instanceof BridgeCallError && error.code === 'invalid-input'
        ? 'absent'
        : 'unknown';
    }
  };
  const currentSelection = (): ConversationSelection | undefined =>
    clientStore.getSnapshot().selection;
  const selectedBotSlug = (selection: ConversationSelection | undefined): string | undefined => {
    if (selection?.kind === 'bot') return selection.slug;
    if (selection?.kind !== 'channel') return undefined;
    const channel = clientStore.getSnapshot().conversation.channel;
    return channel?.id === selection.channelId && channel.type === 'dm'
      ? channel.botSlug
      : undefined;
  };

  let followingGitInstall = false;
  const followGitInstall = async (): Promise<void> => {
    if (followingGitInstall) return;
    followingGitInstall = true;
    try {
      while (gitInstalling(clientStore.getSnapshot().git)) {
        await new Promise((resolve) => setTimeout(resolve, GIT_INSTALL_POLL_MS));
        clientStore.setGit(await loadGitAvailability(call));
      }
    } catch (error) {
      console.warn('botharness: Git install status check failed', error);
    } finally {
      followingGitInstall = false;
    }
  };

  const refreshGit = async (signal?: AbortSignal): Promise<void> => {
    try {
      const git = await loadGitAvailability(call, signal);
      if (signal?.aborted === true) return;
      clientStore.setGit(git);
      if (gitInstalling(git)) void followGitInstall();
    } catch (error) {
      if (signal?.aborted !== true) console.warn('botharness: Git status check failed', error);
    }
  };

  const installGit = async (): Promise<void> => {
    try {
      clientStore.setGit(await startGitInstall(call));
      await followGitInstall();
    } catch (error) {
      console.warn('botharness: Git install failed to start', error);
    }
  };

  const refreshRoster = async (signal?: AbortSignal): Promise<void> => {
    const [rosterResult, channelResult, botResult, identityResult] = await Promise.allSettled([
      loadRoster(call, signal),
      loadChannels(call, signal),
      loadBots(call, signal),
      loadComposerIdentity(call, signal),
    ]);
    if (signal?.aborted === true) return;
    clientStore.setComposerIdentity(
      identityResult.status === 'fulfilled' ? identityResult.value : undefined,
    );
    if (botResult.status === 'fulfilled')
      clientStore.setRoster(botResult.value, clientStore.getSnapshot().channels);
    if (channelResult.status === 'fulfilled') {
      const channels = channelResult.value;
      const current = clientStore.getSnapshot().conversation.channel;
      clientStore.setRoster(clientStore.getSnapshot().bots, channels);
      if (current !== undefined) {
        const updated = channels.find((item) => item.id === current.id);
        if (updated !== undefined) clientStore.setConversation({ channel: updated });
      }
    } else {
      console.warn('botharness: channel refresh failed', channelResult.reason);
    }
    if (rosterResult.status === 'fulfilled') {
      const snapshot = rosterResult.value;
      const previousMuted = clientStore.getSnapshot().roster.muted;
      clientStore.setRosterState({
        pins: snapshot.pins,
        hidden: snapshot.hidden,
        muted: snapshot.muted,
        sections: snapshot.sections,
        topOrder: snapshot.topOrder,
        readOnly: false,
      });
      if (!sameIds([...previousMuted].sort(), [...snapshot.muted].sort()))
        void refreshHumanInboxStatus();
    } else if (
      rosterResult.reason instanceof BridgeCallError &&
      rosterResult.reason.code === 'storage-unavailable'
    ) {
      clientStore.setRosterState({ readOnly: true });
    } else {
      console.warn('botharness: roster refresh failed', rosterResult.reason);
    }
  };

  const reportRosterFailure = (error: unknown): void => {
    if (error instanceof BridgeCallError && error.code === 'storage-unavailable') {
      clientStore.setRosterState({ readOnly: true });
    }
    console.warn('botharness: roster write failed', error);
  };

  const rosterMutate = async (operation: () => Promise<void>): Promise<boolean> => {
    try {
      await operation();
      await refreshRoster();
      return true;
    } catch (error) {
      reportRosterFailure(error);
      return false;
    }
  };

  const placeCreatedChannelFirst = async (
    channelId: string,
    sectionId: string | undefined,
  ): Promise<boolean> => {
    if (sectionId !== undefined) {
      return rosterMutate(async () => {
        await assignRosterChannel(call, channelId, sectionId, 0);
      });
    }
    const snapshot = clientStore.getSnapshot();
    const sectioned = new Set(snapshot.roster.sections.flatMap((section) => section.channelIds));
    const pinnedChannelIds = resolvePinnedChannelIds(snapshot.channels, snapshot.roster.pins);
    const flat = completeFlatEntries(
      snapshot.roster.topOrder,
      snapshot.roster.sections.map((section) => section.id),
      flatRosterChannelIds(snapshot.channels, new Set(pinnedChannelIds)),
      sectioned,
    );
    const order: TopOrderEntry[] = [
      { kind: 'channel', id: channelId },
      ...flat.filter((entry) => entry.kind !== 'channel' || entry.id !== channelId),
    ];
    return rosterMutate(async () => {
      await reorderTopOrder(call, order);
    });
  };

  let sessionsRequestSeq = 0;
  const loadSessionsFor = async (slug: string, selection: ConversationSelection): Promise<void> => {
    const requestSeq = ++sessionsRequestSeq;
    const prior = clientStore.getSnapshot().sessions;
    if (prior.status === 'idle' || prior.items.length === 0)
      clientStore.setSessions({ status: 'loading', error: undefined });
    try {
      const items = await loadSessions(call, slug);
      if (currentSelection() !== selection || requestSeq !== sessionsRequestSeq) return;
      clientStore.setSessions({ status: 'ready', items, error: undefined });
    } catch (error) {
      if (currentSelection() !== selection || requestSeq !== sessionsRequestSeq) return;
      clientStore.setSessions({ status: 'error', error: errorMessage(error) });
    }
  };

  let botInboxRequestSeq = 0;
  const loadBotInboxFor = async (
    slug: string,
    selection: ConversationSelection,
    cursor?: string,
  ): Promise<void> => {
    const requestSeq = ++botInboxRequestSeq;
    if (cursor === undefined && clientStore.getSnapshot().botInbox.status === 'idle')
      clientStore.setBotInbox({ status: 'loading', error: undefined });
    try {
      const page = await loadBotAttention(call, slug, 50, cursor);
      if (currentSelection() !== selection || requestSeq !== botInboxRequestSeq) return;
      const priorState = clientStore.getSnapshot().botInbox;
      const prior = priorState.items;
      const seen = new Set(page.items.map((item) => item.id));
      const items =
        cursor === undefined
          ? [...page.items, ...prior.filter((item) => !seen.has(item.id))]
          : [...prior, ...page.items.filter((item) => !prior.some((seen) => seen.id === item.id))];
      const nextCursor =
        cursor === undefined && prior.length > 50 ? priorState.nextCursor : page.nextCursor;
      clientStore.setBotInbox({
        status: 'ready',
        items,
        nextCursor,
        error: undefined,
      });
    } catch (error) {
      if (currentSelection() !== selection || requestSeq !== botInboxRequestSeq) return;
      clientStore.setBotInbox({ status: 'error', error: errorMessage(error) });
    }
  };

  let activityPanelScope: object | undefined;
  const humanInboxScope = (): object | undefined => {
    const selection = currentSelection();
    return selection?.kind === 'inbox' ? selection : activityPanelScope;
  };
  let humanInboxHeadSeq = 0;
  let humanInboxPageSeq = 0;
  let humanInboxPagesPending = 0;
  let humanInboxScopeVersion = 0;
  const loadInboxStatus = async (): Promise<
    Partial<
      Pick<
        HumanInboxState,
        'unreadCount' | 'hasAction' | 'channelUnread' | 'messageCounts' | 'attentionStatus'
      >
    >
  > => {
    const [status, channelUnread] = await Promise.allSettled([
      loadHumanAttentionStatus(call),
      loadChannelUnreadCounts(call),
    ]);
    if (status.status === 'rejected') throw status.reason;
    return {
      ...status.value,
      attentionStatus: 'ready',
      ...(channelUnread.status === 'fulfilled' ? { channelUnread: channelUnread.value } : {}),
    };
  };
  let humanInboxStatusReading: Promise<void> | undefined;
  let humanInboxStatusAgain = false;
  const readHumanInboxStatus = async (): Promise<void> => {
    try {
      const status = await loadInboxStatus();
      if (!humanInboxStatusAgain) clientStore.setHumanInbox(status);
    } catch {
      if (!humanInboxStatusAgain) clientStore.setHumanInbox({ attentionStatus: 'error' });
    }
  };
  const refreshHumanInboxStatus = (): Promise<void> => {
    if (humanInboxStatusReading !== undefined) {
      humanInboxStatusAgain = true;
      return humanInboxStatusReading;
    }
    humanInboxStatusReading = (async () => {
      try {
        do {
          humanInboxStatusAgain = false;
          await readHumanInboxStatus();
        } while (humanInboxStatusAgain);
      } finally {
        humanInboxStatusReading = undefined;
      }
    })();
    return humanInboxStatusReading;
  };
  const loadHumanInboxFor = async (
    category: HumanInboxCategory,
    scope: object,
    cursor?: string,
    retainedCount = clientStore.getSnapshot().humanInbox.items.length,
    background = false,
  ): Promise<void> => {
    const head = cursor === undefined;
    const requestSeq = head ? ++humanInboxHeadSeq : ++humanInboxPageSeq;
    const scopeVersion = humanInboxScopeVersion;
    const headVersion = humanInboxHeadSeq;
    const { botSlug, channelId, sort, snoozed } = clientStore.getSnapshot().humanInbox;
    const isCurrent = (): boolean =>
      humanInboxScope() === scope &&
      scopeVersion === humanInboxScopeVersion &&
      requestSeq === (head ? humanInboxHeadSeq : humanInboxPageSeq);
    if (cursor === undefined && clientStore.getSnapshot().humanInbox.status === 'idle')
      clientStore.setHumanInbox({ status: 'loading', error: undefined });
    try {
      const page = await loadHumanAttention(call, category, 50, cursor, {
        botSlug,
        channelId,
        sort,
        snoozed,
      });
      if (!isCurrent()) return;
      const priorState = clientStore.getSnapshot().humanInbox;
      if (priorState.category !== category) return;
      const prior = priorState.items;
      if (background && (humanInboxPagesPending > 0 || prior.length > 150)) return;
      if (!head && headVersion !== humanInboxHeadSeq) {
        await loadHumanInboxFor(category, scope, undefined, prior.length + page.items.length);
        return;
      }
      let canonicalItems = page.items;
      let nextCursor = page.nextCursor;

      const desiredCount = Math.min(150, Math.max(retainedCount, prior.length));
      for (
        let pageNumber = 1;
        head &&
        nextCursor !== undefined &&
        canonicalItems.length < desiredCount &&
        pageNumber < Math.ceil(desiredCount / 50);
        pageNumber++
      ) {
        const older = await loadHumanAttention(call, category, 50, nextCursor, {
          botSlug,
          channelId,
          sort,
          snoozed,
        });
        if (!isCurrent()) return;
        const seen = new Set(canonicalItems.map((item) => item.id));
        canonicalItems = [...canonicalItems, ...older.items.filter((item) => !seen.has(item.id))];
        nextCursor = older.nextCursor;
      }
      if (!isCurrent()) return;
      if (
        background &&
        (humanInboxPagesPending > 0 || clientStore.getSnapshot().humanInbox.items.length > 150)
      )
        return;
      const items = head
        ? canonicalItems
        : [
            ...prior,
            ...canonicalItems.filter((item) => !prior.some((seen) => seen.id === item.id)),
          ];
      clientStore.setHumanInbox({
        status: 'ready',
        items,
        nextCursor,
        error: undefined,
      });
    } catch (error) {
      if (!isCurrent() || clientStore.getSnapshot().humanInbox.category !== category) return;
      clientStore.setHumanInbox({
        status: 'error',
        error: errorMessage(error),
      });
    }
  };
  const loadOpeningTimeline = async (channelId: string, active: ConversationSelection) => {
    const controller = new AbortController();
    const unsubscribe = clientStore.subscribe(() => {
      if (currentSelection() !== active) controller.abort();
    });
    try {
      if (currentSelection() !== active) return;
      const anchor = await loadReadPosition(call, channelId, controller.signal);
      if (currentSelection() !== active) return;
      if (anchor !== undefined) {
        try {
          const opened = await loadTimelinePage(
            call,
            channelId,
            { direction: 'around', around: anchor },
            controller.signal,
          );
          return {
            ...opened,
            focusMessageId: undefined,
            unreadAfterMessageId: unreadAfterAnchor(
              opened.page.entries,
              anchor,
              opened.page.hasNewer,
            ),
          };
        } catch (error) {
          if (!(error instanceof BridgeCallError) || error.code !== 'invalid-input') throw error;
        }
      }
      if (currentSelection() !== active) return;
      return {
        ...(await loadTimelinePage(call, channelId, {}, controller.signal)),
        focusMessageId: undefined,
        unreadAfterMessageId: undefined,
      };
    } finally {
      unsubscribe();
    }
  };
  const refreshUnreadDivider = async (
    channelId: string,
    active: ConversationSelection,
  ): Promise<void> => {
    const anchor = await loadReadPosition(call, channelId).catch(() => undefined);
    const conversation = clientStore.getSnapshot().conversation;
    if (currentSelection() !== active || conversation.channel?.id !== channelId) return;
    const unreadAfterMessageId = unreadAfterAnchor(
      conversation.messages,
      anchor,
      conversation.timeline.hasNewer,
    );
    if (unreadAfterMessageId !== undefined) clientStore.setConversation({ unreadAfterMessageId });
  };

  const openChannelById = async (channelId: string, messageId?: string): Promise<void> => {
    const snapshot = clientStore.getSnapshot();
    const requestedFrom = currentSelection();
    let channel = snapshot.channels.find((candidate) => candidate.id === channelId);
    if (channel === undefined && messageId !== undefined) {
      const channels = await loadChannels(call);
      if (currentSelection() !== requestedFrom) return;
      clientStore.setRoster(clientStore.getSnapshot().bots, channels);
      channel = channels.find((candidate) => candidate.id === channelId);
    }
    if (channel === undefined) {
      if (messageId !== undefined) throw new Error('Source Channel is no longer available');
      return;
    }
    const sourcePage =
      messageId === undefined
        ? undefined
        : await loadTimelinePage(call, channelId, {
            direction: 'around',
            around: messageId,
          });
    if (sourcePage !== undefined && currentSelection() !== requestedFrom) return;
    const selection: ConversationSelection = { kind: 'channel', channelId };
    clientStore.select(selection, {
      deferConversation: messageId !== undefined,
    });
    const active = currentSelection();
    if (active === undefined) return;
    if (messageId === undefined && clientStore.getSnapshot().conversation.status === 'ready') {
      clientStore.setConversation({ channel, error: undefined });
      try {
        await actions.refreshChannelMessages(channelId);
        await refreshUnreadDivider(channelId, active);
      } catch (error) {
        if (currentSelection() === active)
          clientStore.setConversation({ error: errorMessage(error) });
      }
      if (channel.type === 'dm' && channel.botSlug !== undefined)
        await loadSessionsFor(channel.botSlug, active);
      return;
    }
    clientStore.setConversation({
      status: 'loading',
      channel,
      messages: [],
      revision: 0,
      timeline: initialTimeline(),
      focusMessageId: undefined,
      error: undefined,
      sending: false,
    });
    try {
      const opened =
        sourcePage === undefined
          ? await loadOpeningTimeline(channelId, active)
          : {
              ...sourcePage,
              focusMessageId: messageId,
              unreadAfterMessageId: undefined,
            };
      if (opened === undefined) return;
      const { page, revision, focusMessageId, unreadAfterMessageId } = opened;
      const failures = remainingFailures(channelId, page.entries);
      const messages = page.hasNewer ? page.entries : [...page.entries, ...failures];
      if (currentSelection() !== active) return;
      clientStore.setConversation({
        status: 'ready',
        channel,
        messages,
        revision,
        timeline: { ...initialTimeline(), ...page },
        focusMessageId,
        unreadAfterMessageId,
        error: undefined,
        sending: false,
      });
    } catch (error) {
      if (currentSelection() !== active) return;
      clientStore.setConversation({
        status: 'error',
        error: errorMessage(error),
        sending: false,
      });
    }
    if (channel.type === 'dm' && channel.botSlug !== undefined) {
      await loadSessionsFor(channel.botSlug, active);
    }
  };

  const settleNativeInboxAction = async (
    kind: 'tool-approval' | 'user-question' | 'workspace-grant-request',
    channelId: string,
    messageId: string,
    submit: () => Promise<void>,
    loadStatus: () => Promise<'pending' | 'submitted' | 'answered' | 'expired' | 'stopped'>,
  ): Promise<void> => {
    let resolved = false;
    try {
      await submit();
      resolved = true;
    } finally {
      if (!resolved) {
        try {
          const status = await loadStatus();
          resolved = status === 'expired' || status === 'stopped' || status === 'answered';
        } catch {}
      }
      if (resolved)
        clientStore.setHumanInbox({
          items: clientStore
            .getSnapshot()
            .humanInbox.items.filter(
              (item) =>
                item.kind !== kind || item.channelId !== channelId || item.messageId !== messageId,
            ),
        });
      const scope = humanInboxScope();
      await Promise.allSettled([
        refreshHumanInboxStatus(),
        ...(scope !== undefined
          ? [loadHumanInboxFor(clientStore.getSnapshot().humanInbox.category, scope)]
          : []),
      ]);
    }
  };

  const openCreatedBot = async (
    bot: BotSummary,
    sectionId: string | undefined,
  ): Promise<BotSummary> => {
    const channel = await openDmChannel(call, bot.slug, bot.displayName);
    clientStore.upsertBot(bot);
    clientStore.upsertChannel(channel);
    await placeCreatedChannelFirst(channel.id, sectionId);
    await actions.openBot(bot.slug);
    return bot;
  };

  const invoke = async <T>(endpoint: string, payload: Record<string, unknown>): Promise<T> => {
    const result = await call(endpoint, payload);
    if (!result.ok)
      throw new BridgeCallError(result.error.code, result.error.message, result.error.details);
    return result.value as T;
  };
  const actions: BridgeActions = {
    tobHome: () => invoke('tobHome', {}),
    humanIdentity: (signal) => loadHumanIdentity(call, signal),
    async sendHome(channelId, body, messageId, attachments) {
      const message = await sendChannelMessage(
        call,
        channelId,
        body,
        undefined,
        attachments,
        messageId,
      );
      if (message.id !== messageId || message.body !== body || message.author.kind !== 'human')
        throw new Error('Home message could not be confirmed');
      await actions.load();
      await openChannelById(channelId);
    },
    onboarding: (slug, action) => invoke('onboarding', { slug, action }),
    onboardingModel: async (slug, expectedRevision, route, globalDefault) => {
      const result = await invoke<{ revision: number }>('onboardingModel', {
        slug,
        expectedRevision,
        route,
        globalDefault,
      });
      if (globalDefault) invalidateInheritedModelPlans();
      return result;
    },
    inheritModel: (slug, expectedRevision) =>
      recorded(invoke('modelPlanInherit', { slug, expectedRevision }), () =>
        actions.telemetryEvent('model:plan_update', { via: 'inherit' }),
      ),
    telemetryEvent: (event, properties = {}) => {
      void invoke('telemetryEvent', {
        event,
        properties: { ...properties, surface: telemetrySurface() },
      }).catch(() => {});
    },
    async botContext(botSlug) {
      return invoke('botContext', { slug: botSlug });
    },
    async botSystemPrompt(botSlug) {
      return invoke('botSystemPrompt', { slug: botSlug });
    },
    promptParts: () => invoke('promptParts', {}),
    promptPresets: () => invoke('promptPresets', {}),
    promptPresetCreate: (name, parts, limits) =>
      invoke('promptPresetCreate', {
        name,
        parts,
        ...(limits === undefined ? {} : { limits }),
      }),
    promptPresetUpdate: (id, change) => invoke('promptPresetUpdate', { id, ...change }),
    promptPresetDelete: (id) => invoke('promptPresetDelete', { id }),
    promptGlobalSet: (presetId) => invoke('promptGlobalSet', { presetId }),
    botPrompt: (slug) => invoke('botPrompt', { slug }),
    botPromptSet: (slug, change) => invoke('botPromptSet', { slug, ...change }),
    async botTurnInput(botSlug, turns = 1) {
      return invoke('botTurnInput', { slug: botSlug, turns });
    },
    async newBotSession(botSlug) {
      await invoke('botNewSession', { slug: botSlug });
    },
    async retryMessage(channelId, messageId, recovery) {
      await invoke('channelRetry', {
        channelId,
        messageId,
        ...(recovery
          ? {
              recovery: recovery.action,
              failureMessageId: recovery.failureMessageId,
            }
          : {}),
      });
      await actions.refreshChannelMessages(channelId);
    },
    async compactBot(botSlug) {
      try {
        return parseBotCompactResult(await invoke('botCompact', { slug: botSlug }));
      } catch (error) {
        if (error instanceof BridgeCallError && error.code === 'bot-busy')
          return { outcome: 'busy', tokensBefore: null, tokensAfter: null };
        throw error;
      }
    },
    async stopBot(channelId, botSlug) {
      const stopped = await stopBot(call, botSlug, channelId);
      if (stopped.stopped.length === 0) return 'not-working';
      await actions.refreshChannelMessages(channelId).catch(() => undefined);
      return 'stopped';
    },
    async cancelAutoContinue(channelId, botSlug, requestMessageId) {
      await invoke('botStop', {
        channelId,
        botSlug,
        autoContinueFor: requestMessageId,
      });
      await actions.refreshChannelMessages(channelId).catch(() => undefined);
    },
    modelCatalog: () => loadModelCatalog(call),
    modelPresets: () => loadModelPresets(call),
    modelPlan: (slug) => loadModelPlan(call, slug),
    modelPlanState: (slug) => loadModelPlanState(call, slug),
    createModelPreset: (name, orchestrator, assignmentDefault, assignmentModels) =>
      createModelPreset(call, name, orchestrator, assignmentDefault, assignmentModels),
    updateModelPreset: (id, expectedRevision, name, orchestrator, assignmentDefault) =>
      updateModelPreset(call, id, expectedRevision, name, orchestrator, assignmentDefault),
    applyModelPreset: (slug, presetId) =>
      recorded(applyModelPreset(call, slug, presetId), () =>
        actions.telemetryEvent('model:plan_update', { via: 'preset' }),
      ),
    customizeModelPlan: (slug, orchestrator, expectedRevision) =>
      recorded(customizeModelPlan(call, slug, orchestrator, expectedRevision), () =>
        actions.telemetryEvent('model:plan_update', { via: 'custom' }),
      ),
    setStandingLimits: (slug, limits) => setStandingLimits(call, slug, limits),
    setModelPlanAssignments: (slug, expectedRevision, assignmentDefault, assignmentModels) =>
      recorded(
        setModelPlanAssignments(call, slug, expectedRevision, assignmentDefault, assignmentModels),
        () => actions.telemetryEvent('model:plan_update', { via: 'assignments' }),
      ),
    setModelPlan: (slug, expectedRevision, orchestrator, assignmentDefault, assignmentModels) =>
      recorded(
        setModelPlan(
          call,
          slug,
          expectedRevision,
          orchestrator,
          assignmentDefault,
          assignmentModels,
        ),
        () => actions.telemetryEvent('model:plan_update', { via: 'plan' }),
      ),
    listHostFolders: (path, signal, offset) => loadHostFolders(call, path, signal, offset),
    async addWorkspaceFolder(slug) {
      if (folderAccess === undefined) throw new Error('DSH folder picker is unavailable');
      const path = await folderAccess.pickDirectory();
      if (path === null) return undefined;
      const workspace = await folderAccess.createWorkspace({ path });
      return createWorkspaceGrant(call, slug, workspace.workspaceId);
    },
    async authorizeWorkspacePath(slug, path) {
      if (folderAccess === undefined) throw new Error('DSH Workspace controller is unavailable');
      const workspace = await folderAccess.createWorkspace({ path });
      return createWorkspaceGrant(call, slug, workspace.workspaceId);
    },
    async resolveWorkspaceFolder(path) {
      if (folderAccess === undefined) throw new Error('DSH Workspace controller is unavailable');
      const workspace = await folderAccess.createWorkspace({ path });
      const resolved = (await loadWorkspaceOptions(call)).find(
        (row) => row.id === workspace.workspaceId,
      );
      if (resolved === undefined) throw new Error('Resolved DSH Workspace is unavailable');
      return resolved;
    },
    async authorizeGroupWorkspacePath(channelId, slug, path) {
      if (folderAccess === undefined) throw new Error('DSH Workspace controller is unavailable');
      const workspace = await folderAccess.createWorkspace({ path });
      return createGroupWorkspaceGrant(call, slug, workspace.workspaceId, channelId, path);
    },
    readGroupWorkspaceGrant: (channelId, slug, path) =>
      readGroupWorkspaceGrant(call, slug, channelId, path),
    async memoryDirectory(slug) {
      const result = await call('get', { slug });
      if (!result.ok) throw new BridgeCallError(result.error.code, result.error.message);
      const bot = (result.value as { bot?: { memoryDir?: unknown } }).bot;
      return typeof bot?.memoryDir === 'string' ? bot.memoryDir : undefined;
    },
    moveMemoryLocation: (slug, location) => moveMemoryLocation(call, slug, location),
    listWorkspaceOptions: () => loadWorkspaceOptions(call),
    listWorkspaceGrants: (slug) => loadWorkspaceGrants(call, slug),
    createWorkspaceGrant: (slug, workspaceId) => createWorkspaceGrant(call, slug, workspaceId),
    revokeWorkspaceGrant: (slug, grantId) => revokeWorkspaceGrant(call, slug, grantId),
    setWorkspaceGrantWrite: (slug, grantId, enabled) =>
      setWorkspaceGrantWrite(call, slug, grantId, enabled),
    assignmentAccess: (slug) => loadAssignmentAccess(call, slug),
    setAssignmentAccess: (slug, mode, acknowledgeRisk, scope) =>
      setAssignmentAccess(call, slug, mode, acknowledgeRisk, scope),
    listToolApprovalRules: (slug) => loadToolApprovalRules(call, slug),
    approvalTemplates: (slug) => loadApprovalTemplates(call, slug),
    setBotApprovalTemplate: (slug, template) => setBotApprovalTemplate(call, slug, template),
    approvalReviewerModel: () => loadApprovalReviewerModel(call),
    voiceProviders: (slug) => loadVoiceProviders(call, slug),
    dictationPort: (slug) => createVoiceDictationPort(call, { slug }),
    addVoiceProvider: (input) => addVoiceProvider(call, input),
    removeVoiceProvider: (id) => removeVoiceProvider(call, id),
    testVoiceProvider: (id, voiceId) => testVoiceProvider(call, id, voiceId),
    synthesizeVoice: (input) => synthesizeVoice(call, input),
    setBotVoice: (slug, providerId, voiceId) => setBotVoice(call, slug, providerId, voiceId),
    setBotAsr: (slug, providerId) => setBotAsr(call, slug, providerId),
    setVoiceDefault: (kind, providerId, voiceId) =>
      setVoiceDefault(call, kind, providerId, voiceId),
    setSpeechThreshold: (dbfs) => setSpeechThreshold(call, dbfs),
    setApprovalReviewerModel: (model) => setApprovalReviewerModel(call, model),
    revokeToolApprovalRule: (slug, id) => revokeToolApprovalRule(call, slug, id),
    toolApprovalStatus: (channelId, messageId) =>
      loadToolApprovalStatus(call, channelId, messageId),
    privateInputStatus: (channelId, messageId) =>
      loadPrivateInputStatus(call, channelId, messageId),
    privateInputSubmit: (channelId, messageId, values) =>
      submitPrivateInput(call, channelId, messageId, values),
    privateInputCancel: (channelId, messageId) => cancelPrivateInput(call, channelId, messageId),
    settleTakeover: (channelId, messageId, outcome) =>
      settleTakeover(call, channelId, messageId, outcome),
    privateAccountStatus: async (channelId, messageId) => {
      const result = await call('privateAccountStatus', {
        channelId,
        messageId,
      });
      if (!result.ok) throw new Error('Private account status is unavailable');
      const value =
        result.value as import('../../../core/src/credentials/contracts.js').PrivateAccountStatus;
      if (
        !['configured', 'revoked', 'superseded', 'unavailable'].includes(value.status) ||
        typeof value.references !== 'object' ||
        value.references === null ||
        !Object.values(value.references).every(
          (reference) =>
            typeof reference === 'string' &&
            /^private:[0-9a-f-]{36}:[a-z][a-z0-9_]{0,47}$/.test(reference),
        )
      )
        throw new Error('Private account status is invalid');
      return value;
    },
    privateInputReplace: async (channelId, messageId) => {
      const result = await call('privateInputReplace', {
        channelId,
        messageId,
      });
      const replacement = result.ok
        ? (result.value as { messageId?: unknown }).messageId
        : undefined;
      if (typeof replacement !== 'string')
        throw new Error('Private input replacement is unavailable');
      return replacement;
    },
    privateAccounts: async (slug) => {
      const result = await call('privateAccounts', { slug });
      if (!result.ok) throw new Error('Private accounts are unavailable');
      return parsePrivateAccountList(result.value);
    },
    privateMcpServerEnable: async (slug, serverName, enabled) => {
      const result = await call('privateMcpServerEnable', {
        slug,
        serverName,
        enabled,
      });
      if (!result.ok) throw new Error('MCP server setting is unavailable');
      return (result.value as { accepted?: unknown }).accepted === true;
    },
    privateMcpServerRemove: async (slug, serverName) => {
      const result = await call('privateMcpServerRemove', { slug, serverName });
      if (!result.ok) throw new Error('MCP server removal is unavailable');
      return (result.value as { removed?: unknown }).removed === true;
    },
    privateAccountRevoke: async (channelId, messageId) => {
      const result = await call('privateAccountRevoke', {
        channelId,
        messageId,
      });
      if (!result.ok) throw new Error('Private account revocation is unavailable');
      const value =
        result.value as import('../../../core/src/credentials/contracts.js').PrivateRevocationResult;
      if (
        value.accepted !== true ||
        ![value.stopped, value.completed, value.uncertain].every(
          (count) => Number.isSafeInteger(count) && count >= 0,
        )
      )
        throw new Error('Private account revocation was not accepted');
      return value;
    },
    toolApprovalState: (channelId, messageId) => loadToolApprovalState(call, channelId, messageId),
    toolApprovalExecutionState: (channelId, messageId) =>
      loadToolApprovalExecutionState(call, channelId, messageId),
    decideToolApproval: (channelId, messageId, outcome) =>
      recorded(
        settleNativeInboxAction(
          'tool-approval',
          channelId,
          messageId,
          () => decideToolApproval(call, channelId, messageId, outcome),
          () => loadToolApprovalStatus(call, channelId, messageId),
        ),
        () =>
          actions.telemetryEvent('activity:approval_submit', {
            decision: APPROVAL_DECISIONS[outcome],
          }),
      ),
    userQuestionStatus: (channelId, messageId) =>
      loadUserQuestionStatus(call, channelId, messageId),
    answerUserQuestion: (channelId, messageId, answers) =>
      recorded(
        settleNativeInboxAction(
          'user-question',
          channelId,
          messageId,
          () => answerUserQuestion(call, channelId, messageId, answers),
          () => loadUserQuestionStatus(call, channelId, messageId),
        ),
        () => actions.telemetryEvent('activity:question_submit'),
      ),
    async load(signal) {
      clientStore.setRosterStatus('loading', undefined);
      void refreshGit(signal);
      try {
        const [bots, channels] = await Promise.all([
          loadBots(call, signal),
          loadChannels(call, signal),
        ]);
        if (signal?.aborted === true) return;
        clientStore.setRoster(bots, channels);
      } catch (error) {
        if (signal?.aborted === true) return;
        clientStore.setRosterStatus('error', errorMessage(error));
        return;
      }
      await refreshRoster(signal);
    },
    async deletionPreview(slug) {
      const result = await call('deletionPreview', { slug });
      if (!result.ok) throw new Error(result.error.message);
      return (result.value as { preview: PersonaBotDeletionPreview }).preview;
    },
    async deletionConfirm(slug, token, eraseMemory) {
      const result = await call('deletionConfirm', {
        slug,
        token,
        eraseMemory,
      });
      if (!result.ok) throw new Error(result.error.message);
      await refreshRoster();
      return (result.value as { deletion: PersonaBotDeletion }).deletion;
    },
    async deletionRetry(slug) {
      const result = await call('deletionRetry', { slug });
      if (!result.ok) throw new Error(result.error.message);
      await refreshRoster();
      return (result.value as { deletion: PersonaBotDeletion }).deletion;
    },
    async deletionFolderApplications(slug) {
      const result = await call('deletionMemoryFolder', { slug });
      if (!result.ok) throw new Error(result.error.message);
      const target = (result.value as { target: HostFileTarget }).target;
      return (
        folderAccess?.nativeFiles?.applications(target) ?? {
          available: false,
          applications: [],
        }
      );
    },
    async deletionFolderOpen(slug, choice) {
      if (openingFile) throw new Error('A Host file open is already in progress');
      openingFile = true;
      try {
        const result = await call('deletionMemoryFolder', { slug });
        if (!result.ok) throw new Error(result.error.message);
        const target = (result.value as { target: HostFileTarget }).target;
        const native = folderAccess?.nativeFiles;
        if (native === undefined) throw new Error('DSH Host opening is unavailable');
        if (choice === undefined) {
          const handlers = await native.applications(target);
          const manager = handlers.applications.find((app) =>
            ['finder', 'explorer', 'filemanager'].includes(app.id),
          );
          if (manager === undefined) throw new Error('No installed Host file manager is available');
          choice = { application: manager.id };
        }
        await native.open(target, choice);
      } finally {
        openingFile = false;
      }
    },
    refreshRoster,
    refreshGit,
    installGit,
    async openBot(slug, view) {
      const snapshot = clientStore.getSnapshot();
      const bot = snapshot.bots.find((candidate) => candidate.slug === slug);
      if (bot === undefined) return;
      const selection: ConversationSelection = {
        kind: 'bot',
        slug,
        ...(view === 'profile' ? { profile: true } : {}),
        ...(view === 'inbox'
          ? {
              inboxRequest:
                (snapshot.selection?.kind === 'bot' ? (snapshot.selection.inboxRequest ?? 0) : 0) +
                1,
            }
          : {}),
      };
      clientStore.select(selection);
      const active = currentSelection();
      if (active === undefined) return;
      let cached = clientStore.getSnapshot().conversation.status === 'ready';
      if (!cached)
        clientStore.setConversation({
          status: 'loading',
          channel: undefined,
          messages: [],
          revision: 0,
          timeline: initialTimeline(),
          focusMessageId: undefined,
          error: undefined,
          sending: false,
        });
      try {
        const channel = await openDmChannel(call, slug, bot.displayName);
        if (currentSelection() !== active) return;
        if (cached && clientStore.getSnapshot().conversation.channel?.id === channel.id) {
          clientStore.upsertChannel(channel);
          clientStore.setConversation({ channel, error: undefined });
          await actions.refreshChannelMessages(channel.id);
          await refreshUnreadDivider(channel.id, active);
          await Promise.all([loadSessionsFor(slug, active), loadBotInboxFor(slug, active)]);
          return;
        }
        if (cached) {
          cached = false;
          clientStore.setConversation({
            status: 'loading',
            channel,
            messages: [],
            drafts: [],
            revision: 0,
            timeline: initialTimeline(),
            focusMessageId: undefined,
            error: undefined,
          });
        }
        const opened = await loadOpeningTimeline(channel.id, active);
        if (opened === undefined) return;
        const { page, revision, focusMessageId, unreadAfterMessageId } = opened;
        const messages = page.entries;
        if (currentSelection() !== active) return;
        const listedChannel = clientStore
          .getSnapshot()
          .channels.find((candidate) => candidate.id === channel.id);
        const latestMessage = page.hasNewer ? undefined : messages.at(-1);
        const projectedChannel =
          listedChannel?.latestMessage !== undefined
            ? listedChannel
            : latestMessage === undefined
              ? (listedChannel ?? channel)
              : {
                  ...(listedChannel ?? channel),
                  updatedAt: latestMessage.at,
                  latestMessage,
                };
        clientStore.upsertChannel(projectedChannel);
        clientStore.setConversation({
          status: 'ready',
          channel: projectedChannel,
          messages: page.hasNewer
            ? messages
            : [...messages, ...remainingFailures(channel.id, page.entries)],
          revision,
          timeline: { ...initialTimeline(), ...page },
          focusMessageId,
          unreadAfterMessageId,
          error: undefined,
          sending: false,
        });
      } catch (error) {
        if (currentSelection() !== active) return;
        clientStore.setConversation({
          status: cached ? 'ready' : 'error',
          error: errorMessage(error),
          sending: false,
        });
      }
      await Promise.all([loadSessionsFor(slug, active), loadBotInboxFor(slug, active)]);
    },
    refreshBotInbox(slug) {
      const selection = currentSelection();
      if (selection?.kind !== 'bot' || selection.slug !== slug) return Promise.resolve();
      return loadBotInboxFor(slug, selection);
    },
    loadMoreBotInbox(slug) {
      const selection = currentSelection();
      const cursor = clientStore.getSnapshot().botInbox.nextCursor;
      if (selection?.kind !== 'bot' || selection.slug !== slug || cursor === undefined)
        return Promise.resolve();
      return loadBotInboxFor(slug, selection, cursor);
    },
    openActivityCenter() {
      return actions.openHumanInbox();
    },
    attachActivityCenterPanel() {
      const scope = {};
      activityPanelScope = scope;
      humanInboxScopeVersion += 1;
      return () => {
        if (activityPanelScope !== scope) return;
        activityPanelScope = undefined;
        humanInboxScopeVersion += 1;
      };
    },
    botInboxPage: (slug, cursor) => loadBotAttention(call, slug, 50, cursor),
    activityPage: (category, filters, cursor) =>
      loadHumanAttention(call, category, 50, cursor, filters),
    openHumanInbox() {
      clientStore.select({ kind: 'inbox' });
      actions.telemetryEvent('activity:inbox_open');
      void refreshHumanInboxStatus();
      const scope = humanInboxScope();
      if (scope === undefined) return Promise.resolve();
      return loadHumanInboxFor(clientStore.getSnapshot().humanInbox.category, scope);
    },
    refreshHumanInboxStatus,
    refreshHumanInbox(category, background = false) {
      const scope = humanInboxScope();
      if (scope === undefined) return Promise.resolve();
      const prior = clientStore.getSnapshot().humanInbox;
      if (background && (humanInboxPagesPending > 0 || prior.items.length > 150))
        return Promise.resolve();
      const nextCategory = category ?? prior.category;
      if (nextCategory !== prior.category) {
        humanInboxScopeVersion += 1;
        clientStore.setHumanInbox({
          category: nextCategory,
          sort: nextCategory === 'action' ? 'oldest' : 'newest',
          botSlug: nextCategory === 'unread' ? undefined : prior.botSlug,
          channelId: undefined,
          snoozed: nextCategory === 'unread' || nextCategory === 'handled' ? false : prior.snoozed,
          status: 'loading',
          items: [],
          nextCursor: undefined,
          error: undefined,
        });
      }
      return loadHumanInboxFor(nextCategory, scope, undefined, prior.items.length, background);
    },
    setHumanInboxFilters(filters) {
      const scope = humanInboxScope();
      if (scope === undefined) return Promise.resolve();
      const prior = clientStore.getSnapshot().humanInbox;
      if (
        prior.botSlug === filters.botSlug &&
        prior.channelId === filters.channelId &&
        prior.sort === filters.sort &&
        prior.snoozed === (filters.snoozed ?? prior.snoozed)
      )
        return Promise.resolve();
      humanInboxScopeVersion += 1;
      clientStore.setHumanInbox({
        ...filters,
        snoozed: filters.snoozed ?? prior.snoozed,
        status: 'loading',
        items: [],
        nextCursor: undefined,
        error: undefined,
      });
      return loadHumanInboxFor(prior.category, scope);
    },
    loadMoreHumanInbox() {
      const scope = humanInboxScope();
      const state = clientStore.getSnapshot().humanInbox;
      if (scope === undefined || state.nextCursor === undefined) return Promise.resolve();
      humanInboxPagesPending += 1;
      return loadHumanInboxFor(state.category, scope, state.nextCursor).finally(() => {
        humanInboxPagesPending -= 1;
      });
    },
    async allowAutoRejectionOnce(item) {
      await overrideAutoRejection(call, item.id);
      humanInboxScopeVersion += 1;
      humanInboxHeadSeq += 1;
      humanInboxPageSeq += 1;
      const state = clientStore.getSnapshot().humanInbox;
      clientStore.setHumanInbox({
        items: state.items.filter(
          (entry) => entry.id !== item.id || entry.sourceEventId !== item.sourceEventId,
        ),
      });
      void Promise.all([actions.refreshHumanInbox(), actions.refreshHumanInboxStatus()]).catch(
        () => undefined,
      );
    },
    async dismissHumanInbox(item) {
      await dismissHumanInboxItem(call, item.id, item.sourceEventId ?? '');
      actions.telemetryEvent('activity:inbox_item_dismiss');
      humanInboxScopeVersion += 1;
      humanInboxHeadSeq += 1;
      humanInboxPageSeq += 1;
      const state = clientStore.getSnapshot().humanInbox;
      clientStore.setHumanInbox({
        items: state.items.filter(
          (entry) => entry.id !== item.id || entry.sourceEventId !== item.sourceEventId,
        ),
      });
      void Promise.all([actions.refreshHumanInbox(), actions.refreshHumanInboxStatus()]).catch(
        () => undefined,
      );
    },
    async dismissAllHumanInbox(filter) {
      let dismissed = 0;
      let more = false;
      try {
        for (const category of filter.categories) {
          const result = await dismissAllHumanInboxItems(call, {
            kind: filter.kind,
            category,
            botSlug: filter.botSlug,
            channelId: filter.channelId,
          });
          dismissed += result.dismissed;
          more ||= result.more;
        }
      } finally {
        humanInboxScopeVersion += 1;
        humanInboxHeadSeq += 1;
        humanInboxPageSeq += 1;
        void Promise.all([actions.refreshHumanInbox(), actions.refreshHumanInboxStatus()]).catch(
          () => undefined,
        );
      }
      return { dismissed, more };
    },
    channelFilesPage: (channelId, request, signal) =>
      loadFilesPage(call, channelId, request, signal),
    async humanInboxContextPage(channelId, request, signal) {
      const { page } = await loadTimelinePage(call, channelId, request, signal);
      if (
        request.direction === 'around' &&
        !page.entries.some(
          (message) => message.id === request.around && !message.pending && !message.failed,
        )
      )
        throw new Error('Source message is no longer available');
      return page;
    },
    averageReplyPerf(channelId, signal) {
      return loadAveragePerf(async (request) => {
        signal?.throwIfAborted();
        const { page } = await loadTimelinePage(call, channelId, request, signal);
        return page;
      });
    },
    async snoozeHumanInbox(item, until) {
      await snoozeHumanInboxItem(call, item.id, item.sourceEventId ?? '', until);
      actions.telemetryEvent('activity:inbox_item_snooze');
      humanInboxScopeVersion += 1;
      humanInboxHeadSeq += 1;
      humanInboxPageSeq += 1;
      const state = clientStore.getSnapshot().humanInbox;
      clientStore.setHumanInbox({
        items: state.items.filter(
          (entry) => entry.id !== item.id || entry.sourceEventId !== item.sourceEventId,
        ),
      });
      void Promise.all([actions.refreshHumanInbox(), actions.refreshHumanInboxStatus()]).catch(
        () => undefined,
      );
    },
    async ignoreHumanReport(sourceEventId) {
      await ignoreHumanAssignmentReport(call, sourceEventId);
      humanInboxScopeVersion += 1;
      humanInboxHeadSeq += 1;
      humanInboxPageSeq += 1;
      const state = clientStore.getSnapshot().humanInbox;
      clientStore.setHumanInbox({
        items: state.items.filter((item) => item.sourceEventId !== sourceEventId),
      });
    },
    openChannel(channelId) {
      return openChannelById(channelId);
    },
    openChannelAtMessage(channelId, messageId) {
      return openChannelById(channelId, messageId);
    },
    async humanInboxContext(channelId, messageId, signal) {
      const { page } = await loadTimelinePage(
        call,
        channelId,
        {
          direction: 'around',
          around: messageId,
          olderLimit: 2,
          newerLimit: 2,
        },
        signal,
      );
      if (
        !page.entries.some(
          (message) => message.id === messageId && !message.pending && !message.failed,
        )
      )
        throw new Error('Source message is no longer available');
      return page.entries;
    },
    async replyFromHumanInbox(channelId, messageId, body, clientMessageId) {
      const text = body.trim();
      const message = await sendChannelMessage(
        call,
        channelId,
        text,
        messageId,
        undefined,
        clientMessageId,
      );
      if (
        message.id !== clientMessageId ||
        message.replyTo !== messageId ||
        message.body !== text ||
        message.author.kind !== 'human'
      )
        throw new Error('Channel reply could not be confirmed');
      actions.telemetryEvent('activity:inbox_reply_send', {
        target: 'message',
      });
      return message;
    },
    pickWorkspaceFolder() {
      if (folderAccess === undefined) throw new Error('DSH folder picker is unavailable');
      return folderAccess.pickDirectory();
    },
    async resolveWorkspaceGrantRequest(slug, messageId, path, _body, sourceChannelId) {
      const channelId = sourceChannelId ?? 'dm-' + slug;
      const readRequest = async () => {
        const messages = await actions.humanInboxContext(channelId, messageId);
        return messages.find((message) => message.id === messageId);
      };
      await settleNativeInboxAction(
        'workspace-grant-request',
        channelId,
        messageId,
        async () => {
          const request = await readRequest();
          if (
            request?.grantRequest !== true ||
            request.grantRequestResolved === true ||
            request.author.kind !== 'bot' ||
            request.author.slug !== slug
          )
            throw new Error('Workspace request is no longer pending for this Bot');
          if (folderAccess === undefined)
            throw new Error('DSH Workspace controller is unavailable');
          const workspace = await folderAccess.createWorkspace({ path });
          await approveWorkspaceGrantRequest(
            call,
            slug,
            channelId,
            messageId,
            workspace.workspaceId,
          );
          publishWorkspaceGrantChange(slug);
        },
        async () => ((await readRequest())?.grantRequestResolved === true ? 'expired' : 'pending'),
      );
      actions.telemetryEvent('activity:grant_request_submit');
    },
    async markAllRead(scope) {
      try {
        await markAllReadPositions(call, scope);
      } catch (error) {
        await refreshHumanInboxStatus();
        throw error;
      }
      await refreshHumanInboxStatus();
      if (humanInboxScope() !== undefined) await actions.refreshHumanInbox();
    },
    async markRead(channelId, messageId) {
      await markReadPosition(call, channelId, messageId);
      await refreshHumanInboxStatus();
      if (humanInboxScope() !== undefined) await actions.refreshHumanInbox();
    },
    async reactToMessage(channelId, messageId, emoji, active) {
      const apply = (reactions: (current: ChannelMessage) => ChannelMessage['reactions']) => {
        const snapshot = clientStore.getSnapshot();
        if (snapshot.conversation.channel?.id !== channelId) return;
        clientStore.setConversation({
          messages: snapshot.conversation.messages.map((message) => {
            if (message.id !== messageId) return message;
            const next = reactions(message);
            const { reactions: _previous, ...rest } = message;
            return next === undefined || next.length === 0 ? rest : { ...rest, reactions: next };
          }),
        });
      };
      const before = clientStore
        .getSnapshot()
        .conversation.messages.find((message) => message.id === messageId)?.reactions;
      apply((message) => toggledReactions(message.reactions, emoji, active));
      try {
        const reactions = await reactToChannelMessage(call, channelId, messageId, emoji, active);
        apply(() => reactions);
      } catch (error) {
        apply(() => before);
        throw error;
      }
    },
    searchChannel(channelId, text, cursor) {
      return searchChannelMessages(call, channelId, text, cursor);
    },
    searchMessages(text, cursor) {
      return searchAllMessages(call, text, cursor);
    },
    async markChannelRead(channelId) {
      const messageId = clientStore
        .getSnapshot()
        .channels.find((channel) => channel.id === channelId)?.latestMessage?.id;
      if (messageId === undefined) return;
      clientStore.setHumanInbox({
        channelUnread: Object.fromEntries(
          Object.entries(clientStore.getSnapshot().humanInbox.channelUnread).filter(
            ([id]) => id !== channelId,
          ),
        ),
      });
      try {
        await actions.markRead(channelId, messageId);
      } catch (error) {
        await refreshHumanInboxStatus();
        throw error;
      }
    },
    humanAssignmentContext(slug, sessionId, sourceEventId, signal) {
      return loadHumanAssignmentContext(call, slug, sessionId, sourceEventId, signal);
    },
    async replyToHumanAssignment(slug, sessionId, sourceEventId, body, clientMessageId) {
      try {
        const text = body.trim();
        const message = await sendChannelMessage(
          call,
          'dm-' + slug,
          text,
          undefined,
          undefined,
          clientMessageId,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          { sessionId, sourceEventId },
        );
        if (
          message.id !== clientMessageId ||
          message.author.kind !== 'human' ||
          message.body !== text ||
          message.assignmentReply?.sessionId !== sessionId ||
          message.assignmentReply.sourceEventId !== sourceEventId
        )
          throw new Error('Assignment response could not be confirmed');
        actions.telemetryEvent('activity:inbox_reply_send', {
          target: 'assignment',
        });
        return message;
      } finally {
        await Promise.allSettled([
          refreshHumanInboxStatus(),
          ...(humanInboxScope() !== undefined ? [actions.refreshHumanInbox()] : []),
        ]);
      }
    },
    async loadOlder(channelId) {
      const snapshot = clientStore.getSnapshot();
      const timeline = snapshot.conversation.timeline;
      if (
        snapshot.conversation.channel?.id !== channelId ||
        !timeline.hasOlder ||
        timeline.olderCursor === null ||
        timeline.loadingOlder
      )
        return;
      clientStore.setConversation({
        timeline: { ...timeline, loadingOlder: true, olderError: undefined },
      });
      const viaJournal = prependChannelJournal(channelId);
      if (viaJournal !== undefined) {
        let olderError: string | undefined;
        try {
          await viaJournal;
        } catch (error) {
          olderError = errorMessage(error);
        }
        const latest = clientStore.getSnapshot();
        if (latest.conversation.channel?.id !== channelId) return;
        clientStore.setConversation({
          timeline: {
            ...latest.conversation.timeline,
            loadingOlder: false,
            olderError,
          },
        });
        return;
      }
      try {
        const { page } = await loadTimelinePage(call, channelId, {
          direction: 'older',
          cursor: timeline.olderCursor,
        });
        const latest = clientStore.getSnapshot();
        if (
          latest.conversation.channel?.id !== channelId ||
          !latest.conversation.timeline.loadingOlder ||
          latest.conversation.timeline.olderCursor !== timeline.olderCursor
        )
          return;
        const pageIds = new Set(page.entries.map((entry) => entry.id));
        clientStore.setConversation({
          messages: [
            ...page.entries,
            ...latest.conversation.messages.filter((entry) => !pageIds.has(entry.id)),
          ],
          timeline: {
            ...latest.conversation.timeline,
            olderCursor: page.olderCursor,
            hasOlder: page.hasOlder,
            loadingOlder: false,
            olderError: undefined,
          },
        });
      } catch (error) {
        const latest = clientStore.getSnapshot();
        if (
          latest.conversation.channel?.id !== channelId ||
          !latest.conversation.timeline.loadingOlder ||
          latest.conversation.timeline.olderCursor !== timeline.olderCursor
        )
          return;
        clientStore.setConversation({
          timeline: {
            ...latest.conversation.timeline,
            loadingOlder: false,
            olderError: errorMessage(error),
          },
        });
      }
    },
    async loadNewer(channelId) {
      const snapshot = clientStore.getSnapshot();
      const timeline = snapshot.conversation.timeline;
      if (
        snapshot.conversation.channel?.id !== channelId ||
        !timeline.hasNewer ||
        timeline.newerCursor === null ||
        timeline.loadingNewer
      )
        return;
      clientStore.setConversation({
        timeline: { ...timeline, loadingNewer: true, newerError: undefined },
      });
      try {
        const { page, revision } = await loadTimelinePage(call, channelId, {
          direction: 'newer',
          cursor: timeline.newerCursor,
        });
        const latest = clientStore.getSnapshot();
        if (
          latest.conversation.channel?.id !== channelId ||
          !latest.conversation.timeline.loadingNewer ||
          latest.conversation.timeline.newerCursor !== timeline.newerCursor
        )
          return;
        const cursorDidNotAdvance =
          page.hasNewer && (page.newerCursor === null || page.newerCursor === timeline.newerCursor);
        const pageIds = new Set(page.entries.map((entry) => entry.id));
        const existing = latest.conversation.messages.filter((entry) => !pageIds.has(entry.id));
        const seen = new Set(existing.map((entry) => entry.id));
        const incoming = page.entries.filter((entry) => !seen.has(entry.id));
        const failures = remainingFailures(channelId, page.entries);
        clientStore.setConversation({
          messages: [...existing, ...incoming, ...(page.hasNewer ? [] : failures)].filter(
            (entry, index, entries) =>
              entries.findIndex((candidate) => candidate.id === entry.id) === index,
          ),
          revision: Math.max(revision, latest.conversation.revision),
          timeline: {
            ...latest.conversation.timeline,
            newerCursor: cursorDidNotAdvance
              ? latest.conversation.timeline.newerCursor
              : (page.newerCursor ?? latest.conversation.timeline.newerCursor),
            hasNewer: cursorDidNotAdvance ? false : page.hasNewer,
            loadingNewer: false,
            newerError: cursorDidNotAdvance ? 'Timeline newer cursor did not advance' : undefined,
          },
        });
      } catch (error) {
        const latest = clientStore.getSnapshot();
        if (
          latest.conversation.channel?.id !== channelId ||
          !latest.conversation.timeline.loadingNewer ||
          latest.conversation.timeline.newerCursor !== timeline.newerCursor
        )
          return;
        clientStore.setConversation({
          timeline: {
            ...latest.conversation.timeline,
            loadingNewer: false,
            newerError: errorMessage(error),
          },
        });
      }
    },
    async openLatest(channelId) {
      const { page, revision } = await loadTimelinePage(call, channelId);
      if (clientStore.getSnapshot().conversation.channel?.id !== channelId) return;
      clientStore.setConversation({
        messages: [...page.entries, ...remainingFailures(channelId, page.entries)],
        revision,
        timeline: { ...initialTimeline(), ...page },
        focusMessageId: undefined,
        error: undefined,
      });
    },
    async openAround(channelId, messageId) {
      try {
        const { page, revision } = await loadTimelinePage(call, channelId, {
          direction: 'around',
          around: messageId,
        });
        if (clientStore.getSnapshot().conversation.channel?.id !== channelId) return;
        clientStore.setConversation({
          messages: page.entries,
          revision,
          timeline: { ...initialTimeline(), ...page },
          focusMessageId: messageId,
          error: undefined,
        });
      } catch (error) {
        if (clientStore.getSnapshot().conversation.channel?.id !== channelId) return;
        clientStore.setConversation({ error: errorMessage(error) });
      }
    },
    applyChannelTail(channelId, page) {
      const snapshot = clientStore.getSnapshot();
      if (snapshot.conversation.channel?.id !== channelId) return;
      const revision = Math.max(
        snapshot.conversation.revision,
        page.entries.at(-1)?.channelRevision ?? 0,
      );
      if (snapshot.conversation.timeline.hasNewer) {
        clientStore.setConversation({ revision });
        return;
      }
      const merged = mergeLatestWindow(snapshot.conversation.messages, page.entries);
      clientStore.setConversation({
        messages: merged.messages,
        revision,
        timeline: {
          ...snapshot.conversation.timeline,
          olderCursor: merged.keptPrefix
            ? snapshot.conversation.timeline.olderCursor
            : page.olderCursor,
          hasOlder: merged.keptPrefix ? snapshot.conversation.timeline.hasOlder : page.hasOlder,
          hasNewer: false,
        },
      });
    },
    async refreshChannelMessages(channelId) {
      const before = clientStore.getSnapshot().conversation.messages;
      const beforeById = new Map(before.map((message) => [message.id, message]));
      const { page, revision } = await loadTimelinePage(call, channelId);
      const snapshot = clientStore.getSnapshot();
      if (snapshot.conversation.channel?.id !== channelId) return;
      if (revision < snapshot.conversation.revision) return;
      if (snapshot.conversation.timeline.hasNewer) {
        clientStore.setConversation({ revision });
        return;
      }
      const merged = mergeLatestWindow(snapshot.conversation.messages, page.entries);
      const concurrent = snapshot.conversation.messages.filter((message) => {
        const previous = beforeById.get(message.id);
        return (
          previous === undefined ||
          previous.pending !== message.pending ||
          previous.failed !== message.failed
        );
      });
      const concurrentById = new Map(concurrent.map((message) => [message.id, message]));
      const mergedIds = new Set(merged.messages.map((message) => message.id));
      clientStore.setConversation({
        messages: [
          ...merged.messages.map((message) => concurrentById.get(message.id) ?? message),
          ...concurrent.filter((message) => !mergedIds.has(message.id)),
        ],
        revision,
        timeline: {
          ...snapshot.conversation.timeline,
          olderCursor: merged.keptPrefix
            ? snapshot.conversation.timeline.olderCursor
            : page.olderCursor,
          newerCursor: page.newerCursor,
          hasOlder: merged.keptPrefix ? snapshot.conversation.timeline.hasOlder : page.hasOlder,
          hasNewer: page.hasNewer,
        },
      });
    },
    bridgeFileCommands: (sourceEventId) =>
      folderAccess?.nativeFiles === undefined
        ? undefined
        : {
            available: () => folderAccess.nativeFiles!.available?.() ?? Promise.resolve(false),
            target: (channelId, attachmentId) =>
              loadChannelMediaTarget(call, channelId, sourceEventId, attachmentId),
            applications: async (channelId, attachmentId) => {
              const target = await loadChannelMediaTarget(
                call,
                channelId,
                sourceEventId,
                attachmentId,
              );
              return folderAccess.nativeFiles!.applications(target);
            },
            open: async (channelId, attachmentId, choice) => {
              if (openingFile) throw new Error('A Host file open is already in progress');
              openingFile = true;
              try {
                const target = await loadChannelMediaTarget(
                  call,
                  channelId,
                  sourceEventId,
                  attachmentId,
                );
                await folderAccess.nativeFiles!.open(target, choice);
              } finally {
                openingFile = false;
              }
            },
            preferences: fileOpenPreferences,
          },
    messageAttachmentTarget: (channelId, messageId, fileId) =>
      loadMessageAttachmentTarget(call, channelId, messageId, fileId),
    async messageAttachmentApplications(channelId, messageId, fileId) {
      const target = await loadMessageAttachmentTarget(call, channelId, messageId, fileId);
      return (
        folderAccess?.nativeFiles?.applications(target) ?? {
          available: false,
          applications: [],
        }
      );
    },
    async messageAttachmentOpen(channelId, messageId, fileId, choice) {
      if (openingFile) throw new Error('A Host file open is already in progress');
      openingFile = true;
      try {
        const target = await loadMessageAttachmentTarget(call, channelId, messageId, fileId);
        if (folderAccess?.nativeFiles === undefined)
          throw new Error('DSH Host opening is unavailable');
        await folderAccess.nativeFiles.open(target, choice);
      } finally {
        openingFile = false;
      }
    },
    async messageAttachmentDownload(channelId, messageId, fileId) {
      const target = await loadMessageAttachmentTarget(call, channelId, messageId, fileId);
      const anchor = document.createElement('a');
      anchor.href =
        './api/botharness/attachment?' + new URLSearchParams({ channelId, messageId, fileId });
      anchor.download = target.relativePath;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    },
    workspaceFileTarget: (slug, grantId) => loadWorkspaceFileTarget(call, slug, grantId),
    async workspaceFileApplications(slug, grantId) {
      const target = await loadWorkspaceFileTarget(call, slug, grantId);
      return (
        folderAccess?.nativeFiles?.applications(target) ?? {
          available: false,
          applications: [],
        }
      );
    },
    async workspaceFileOpen(slug, grantId, choice) {
      if (openingFile) throw new Error('A Host file open is already in progress');
      openingFile = true;
      try {
        const target = await loadWorkspaceFileTarget(call, slug, grantId);
        if (folderAccess?.nativeFiles === undefined)
          throw new Error('DSH Host opening is unavailable');
        await folderAccess.nativeFiles.open(target, choice);
      } finally {
        openingFile = false;
      }
    },
    fileOpenPreferences,
    memoryFileTarget: (slug, path) => loadMemoryFileTarget(call, slug, path),
    async memoryFileApplications(slug, path) {
      const target = await loadMemoryFileTarget(call, slug, path);
      return (
        folderAccess?.nativeFiles?.applications(target) ?? {
          available: false,
          applications: [],
        }
      );
    },
    async memoryFileOpen(slug, path, choice) {
      if (openingFile) throw new Error('A Host file open is already in progress');
      openingFile = true;
      try {
        const target = await loadMemoryFileTarget(call, slug, path);
        if (folderAccess?.nativeFiles === undefined)
          throw new Error('DSH Host opening is unavailable');
        await folderAccess.nativeFiles.open(target, choice);
      } finally {
        openingFile = false;
      }
    },
    async memoryFileDownload(slug, path) {
      const target = await loadMemoryFileTarget(call, slug, path);
      if (target.kind !== 'file') throw new Error('Only files can be downloaded');
      const anchor = document.createElement('a');
      anchor.href = memoryDownloadUrl(slug, path);
      anchor.download = path.split('/').at(-1) ?? '';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    },
    memorySnapshot: (channelId) => loadMemorySnapshot(call, channelId),
    memoryFile: (channelId, path) => loadMemoryFile(call, channelId, path),
    memoryHistory: (channelId) => loadMemoryHistory(call, channelId),
    memoryDiff: (channelId, sha) => loadMemoryDiff(call, channelId, sha),
    memoryGitGraph: (channelId, offset) => loadMemoryGitGraph(call, channelId, offset),
    memoryGitCommitDiff: (channelId, sha) => loadMemoryGitCommitDiff(call, channelId, sha),
    profileActivity: (channelId, window) => loadProfileActivity(call, channelId, window),
    profileSessionUsage: (channelId) => loadProfileSessionUsage(call, channelId),
    overviewMemory: (after) => loadOverviewMemory(call, after),
    overviewUsage: (period, after) => loadOverviewUsage(call, period, after),
    marketplaceList: (query) => loadMarketplacePage(call, query),
    marketplaceChallenge: () => loadMarketplaceChallenge(call),
    marketplaceSubmit: (url, altcha) => submitMarketplaceRepository(call, url, altcha),
    marketplaceReport: (id, altcha, reason) => reportMarketplaceBot(call, id, altcha, reason),
    marketplaceTopics: () => loadMarketplaceTopics(call),
    marketplaceSections: (lang) => loadMarketplaceSections(call, lang),
    marketplaceDigests: (lang) => loadMarketplaceDigests(call, lang),
    marketplaceDigest: (day, lang) => loadMarketplaceDigest(call, day, lang),
    marketplaceDetail: (id, lang) => loadMarketplaceDetail(call, id, lang),
    marketplaceFile: (id, path) => loadMarketplaceFile(call, id, path),
    marketplaceAccount: () => invoke('marketplaceAccount', {}),
    marketplaceAuthorSave: (displayName, acceptTerms) =>
      invoke('marketplaceAuthorSave', { displayName, acceptTerms }),
    marketplaceAuthorAvatarSet: (avatar) => invoke('marketplaceAuthorAvatarSet', { avatar }),
    marketplaceUploadPlan: (slug) => invoke('marketplaceUploadPlan', { slug }),
    marketplaceUpload: (slug, presentation) => uploadMarketplaceBot(call, slug, presentation),
    marketplaceMine: (lang) => loadMyMarketplaceUploads(call, lang),
    async marketplaceDelete(id) {
      await invoke('marketplaceDelete', { id });
    },
    shareDraftStart: (slug) => invoke('shareDraftStart', { slug }),
    async shareDraftGet(slug) {
      const result = await call('shareDraftGet', { slug });
      if (result.ok) return result.value as ShareDraftView;
      if (result.error.code === 'share-draft-not-found') return undefined;
      throw new BridgeCallError(result.error.code, result.error.message, result.error.details);
    },
    async shareDraftDiscard(slug) {
      await invoke('shareDraftDiscard', { slug });
    },
    shareDraftExport: (slug) => invoke('shareDraftExport', { slug }),
    marketplaceInstallReview: (id, lang) => reviewMarketplaceInstall(call, id, lang),
    async marketplaceInstall(id, reviewId, sectionId, source) {
      return openCreatedBot(await installMarketplaceBot(call, id, reviewId, source), sectionId);
    },
    profileUsage: (channelId, filter) => loadProfileUsage(call, channelId, filter),
    channelActivityToday: () => loadChannelActivityToday(call),
    groupProfileActivity: (channelId) => loadGroupProfileActivity(call, channelId),
    messagingChannelTarget: (slug, grantId, channelId) =>
      setMessagingChannelTarget(call, slug, grantId, channelId),
    messagingThreadPolicy: (slug, sourceEventId, policy) =>
      setMessagingThreadPolicy(call, slug, sourceEventId, policy),
    messagingGroupPolicy: (slug, grantId, policy) =>
      setMessagingGroupPolicy(call, slug, grantId, policy),
    messagingReceive: (slug, grantId, enabled) => setMessagingReceive(call, slug, grantId, enabled),
    messagingSource: (slug, sourceEventId) => readMessagingSource(call, slug, sourceEventId),
    channelBridges: (channelId) => loadChannelBridges(call, channelId),
    channelBridge: (channelId, input) => manageChannelBridge(call, channelId, input),
    channelIngests: (channelId) => loadChannelIngests(call, channelId),
    channelIngest: (channelId, input) => manageChannelIngest(call, channelId, input),
    approvalRoute: (slug, pairingId, expectedRevision) =>
      setApprovalRoute(call, slug, pairingId, expectedRevision),
    approvalTest: (slug) => testApprovalRoute(call, slug),
    approvalRetry: (slug, id) => retryApprovalNotification(call, slug, id),
    questionRetry: (slug, id) => retryQuestionNotification(call, slug, id),
    failureAlertsSet: (slug, enabled, expectedRevision) =>
      setFailureAlerts(call, slug, enabled, expectedRevision),
    failureAlertsTest: (slug) => testFailureAlerts(call, slug),
    failureAlertsRetry: (slug, id) => retryFailureAlerts(call, slug, id),
    pairingReview: (slug, input) => reviewPairing(call, slug, input),
    senderAccess: (slug, input) => changeExternalSenderAccess(call, slug, input),
    messagingIdentity: (slug, input) => manageMessagingIdentity(call, slug, input),
    messagingConversation: (slug, input) => manageMessagingConversation(call, slug, input),
    messagingSnapshot: (slug) => loadMessagingSnapshot(call, slug),
    messagingReachable: (slug, bindingId, cursor) =>
      loadMessagingReachable(call, slug, bindingId, cursor),
    messagingPostConversation: (slug, bindingId, conversationId, requestId, text) =>
      postMessagingConversation(call, slug, bindingId, conversationId, requestId, text),
    messagingPostRequest: (slug, bindingId, conversationId, requestId, text) =>
      readMessagingPostRequest(call, slug, bindingId, conversationId, requestId, text),
    messagingPostLimit: (slug, bindingId, expectedRevision, limit) =>
      setMessagingPostLimit(call, slug, bindingId, expectedRevision, limit),
    messagingTargets: (providerId, accountRef) =>
      loadMessagingTargets(call, providerId, accountRef),
    messagingAuthorize: (input) => authorizeMessaging(call, input),
    messagingRevoke: (slug, grantId) => revokeMessaging(call, slug, grantId),
    messagingSend: (slug, grantId, requestId, text) =>
      sendMessaging(call, slug, grantId, requestId, text),
    botSourcePolicies: (slug) => loadBotSourcePolicies(call, slug),
    botSchedules: (slug) => loadBotSchedules(call, slug),
    createBotSchedule: (slug, input) => createBotSchedule(call, slug, input),
    updateBotSchedule: (slug, id, change) => updateBotSchedule(call, slug, id, change),
    deleteBotSchedule: (slug, id) => deleteBotSchedule(call, slug, id),
    botScheduleHistory: (slug, id) => loadBotScheduleHistory(call, slug, id),
    runBotScheduleNow: (slug, id) => runBotScheduleNow(call, slug, id),
    botSchedulePreview: (trigger) => previewBotSchedule(call, trigger),
    setBotSourcePolicy: (slug, edit) => setBotSourcePolicy(call, slug, edit),
    resetBotSourcePolicy: (slug, sourceClass) => resetBotSourcePolicy(call, slug, sourceClass),
    memoryWorkingChanges: (channelId) => loadMemoryWorkingChanges(call, channelId),
    memoryWorkingDiff: (channelId, path, kind) =>
      loadMemoryWorkingDiff(call, channelId, path, kind),
    memoryRecoveryHistory: (channelId) => loadMemoryRecoveryHistory(call, channelId),
    memoryRestore: (input) => restoreMemoryCheckpoint(call, input),
    memoryRestoreCommit: (input) => restoreMemoryCommit(call, input),
    memoryNameVersion: (input) => nameMemoryVersion(call, input),
    memoryRemoveVersionName: (input) => removeMemoryVersionName(call, input),
    memoryVersions: (channelId) => loadMemoryVersions(call, channelId),
    memorySave: (input) => saveMemoryFile(call, input),
    memoryRepair: (input) => repairMemory(call, input),
    conceptArt(payload) {
      return invoke('conceptArt', payload);
    },
    openSession(sessionId) {
      if (folderAccess?.openSession === undefined)
        throw new Error('DSH Session navigation is unavailable');
      folderAccess.openSession(sessionId);
    },
    readSessions: (slug) => loadSessions(call, slug),
    async refreshSessions(slug) {
      const selection = currentSelection();
      if (selection === undefined || selectedBotSlug(selection) !== slug) return;
      await loadSessionsFor(slug, selection);
    },
    async setSessionArchived(slug, sessionId, archived) {
      await setSessionArchived(call, slug, sessionId, archived);
      const selection = currentSelection();
      if (selection === undefined || selectedBotSlug(selection) !== slug) return;
      await loadSessionsFor(slug, selection);
    },
    async stopSession(slug, session, channelId) {
      const stopped = await stopSession(call, slug, session, channelId);
      if (stopped.messageId !== undefined && channelId !== undefined)
        await actions.refreshChannelMessages(channelId).catch(() => undefined);
      const selection = currentSelection();
      if (selection === undefined || selectedBotSlug(selection) !== slug) return;
      await loadSessionsFor(slug, selection);
    },
    allBotPreview: (channelId) => loadAllBotPreview(call, channelId),
    validateComposerDraft: (channelId, attachments, replyTo) =>
      validateComposerDraft(call, channelId, attachments, replyTo),
    async send(
      body,
      replyTo,
      attachments,
      memorySwitchTarget,
      mentions,
      channelRefs,
      grantRequestResolution,
      allBotMention,
      submissionId,
    ) {
      let snapshot = clientStore.getSnapshot();
      const channel = snapshot.conversation.channel;
      const text = body.trim();
      if (
        channel === undefined ||
        (text.length === 0 && !attachments?.length) ||
        snapshot.conversation.sending
      )
        return false;
      if (
        channel.type === 'dm' &&
        channel.botSlug !== undefined &&
        !attachments?.length &&
        !replyTo &&
        !mentions?.length &&
        !channelRefs?.length &&
        !memorySwitchTarget &&
        !grantRequestResolution
      ) {
        const prepared = onboardingFor(actions).prepareSend(channel.id, channel.botSlug, text);
        if (!(typeof prepared === 'boolean' ? prepared : await prepared)) return false;
      }
      const replyTarget = snapshot.conversation.messages.find((message) => message.id === replyTo);
      if (snapshot.conversation.timeline.hasNewer) {
        try {
          const { page, revision } = await loadTimelinePage(call, channel.id);
          if (clientStore.getSnapshot().conversation.channel?.id !== channel.id) return false;
          clientStore.setConversation({
            messages: [...page.entries, ...remainingFailures(channel.id, page.entries)],
            revision,
            timeline: { ...initialTimeline(), ...page },
            focusMessageId: undefined,
          });
          snapshot = clientStore.getSnapshot();
        } catch (error) {
          if (clientStore.getSnapshot().conversation.channel?.id === channel.id) {
            clientStore.setConversation({ error: errorMessage(error) });
          }
          return false;
        }
      }
      snapshot = clientStore.getSnapshot();
      if (snapshot.conversation.channel?.id !== channel.id || snapshot.conversation.sending)
        return false;
      const localId = submissionId ?? nextLocalEchoId();
      const scope = submissionScope(channel.id);
      if (
        scope !== undefined &&
        !submissions.read(scope).attempts.some((attempt) => attempt.id === localId)
      )
        submissions.record(scope, {
          id: localId,
          at: new Date().toISOString(),
          text,
          mentions: mentions ?? [],
          channelRefs: channelRefs ?? [],
          ...(replyTo === undefined ? {} : { replyTo }),
          ...(attachments === undefined || attachments.length === 0 ? {} : { attachments }),
        });
      onboardingFor(actions).markSubmitted(channel.id, text);
      clientStore.setConversation({
        sending: true,
        error: undefined,
        messages: [
          ...snapshot.conversation.messages,
          {
            id: localId,
            at: new Date().toISOString(),
            author: { kind: 'human' },
            body: text,
            ...(attachments === undefined ? {} : { attachments }),
            ...(mentions === undefined ? {} : { mentions }),
            ...(channelRefs === undefined ? {} : { channelRefs }),
            ...(grantRequestResolution === undefined ? {} : { grantRequestResolution }),
            ...(replyTo === undefined
              ? {}
              : {
                  replyTo,
                  replyToPreview:
                    replyTarget === undefined
                      ? null
                      : { author: replyTarget.author, body: replyTarget.body },
                }),
            pending: true,
          },
        ],
      });
      const localEcho = clientStore
        .getSnapshot()
        .conversation.messages.find((message) => message.id === localId)!;
      try {
        const message = await sendChannelMessage(
          call,
          channel.id,
          text,
          replyTo,
          attachments,
          localId,
          undefined,
          memorySwitchTarget,
          mentions,
          channelRefs,
          grantRequestResolution,
          undefined,
          allBotMention,
        );
        remainingFailures(channel.id, [message]);
        settleSubmission(channel.id, localId, 'sent');
        const selection = currentSelection();
        const latest = clientStore.getSnapshot();
        if (latest.conversation.channel?.id === channel.id) {
          const visibleChannel = latest.conversation.channel;
          if (
            visibleChannel.latestMessage === undefined ||
            visibleChannel.latestMessage.at <= message.at
          ) {
            clientStore.upsertChannel({
              ...visibleChannel,
              updatedAt: message.at,
              latestMessage: message,
            });
          }
          clientStore.setConversation({
            sending: false,
            messages: reconcileCommittedMessage(latest.conversation.messages, localId, message),
          });
        } else {
          clientStore.updateCachedConversation(channel.id, (cached) => ({
            ...cached,
            messages: reconcileCommittedMessage(cached.messages, localId, message),
          }));
        }
        const slug = selectedBotSlug(selection);
        if (selection !== undefined && slug !== undefined) {
          void loadSessionsFor(slug, selection);
        }
        return true;
      } catch (error) {
        const latest = clientStore.getSnapshot();
        const matching =
          latest.conversation.channel?.id === channel.id
            ? latest.conversation.messages.find((message) => message.id === localId)
            : undefined;
        if (matching !== undefined && matching.pending !== true && matching.failed === undefined) {
          remainingFailures(channel.id, [matching]);
          settleSubmission(channel.id, localId, 'sent');
          clientStore.setConversation({ sending: false, error: undefined });
          return true;
        }
        if (
          allBotMention !== undefined ||
          (error instanceof BridgeCallError &&
            error.code === 'invalid-input' &&
            error.message.includes('Mentioned PersonaBot'))
        ) {
          if (latest.conversation.channel?.id === channel.id) {
            clientStore.setConversation({
              sending: false,
              error: errorMessage(error),
              messages: latest.conversation.messages.filter((message) => message.id !== localId),
            });
          } else {
            clientStore.updateCachedConversation(channel.id, (cached) => ({
              ...cached,
              messages: cached.messages.filter((message) => message.id !== localId),
            }));
          }
          if (scope !== undefined) submissions.discard(scope, localId);
          if (error instanceof BridgeCallError && error.code === 'all-bot-preview-changed')
            throw error;
          return false;
        }
        const unconfirmed = !(error instanceof BridgeCallError);
        settleSubmission(
          channel.id,
          localId,
          unconfirmed ? 'unknown' : 'failed',
          errorMessage(error),
        );
        const failedEcho: ChannelMessage = {
          ...localEcho,
          pending: false,
          failed: errorMessage(error),
          ...(unconfirmed ? { unconfirmed: true } : {}),
        };
        failedByChannel.set(channel.id, [
          ...(failedByChannel.get(channel.id) ?? []).filter((message) => message.id !== localId),
          failedEcho,
        ]);
        if (latest.conversation.channel?.id === channel.id) {
          clientStore.setConversation({
            sending: false,
            error: errorMessage(error),
            messages: latest.conversation.messages.some((message) => message.id === localId)
              ? latest.conversation.messages.map((message) =>
                  message.id === localId ? failedEcho : message,
                )
              : [...latest.conversation.messages, failedEcho],
          });
        } else {
          clientStore.updateCachedConversation(channel.id, (cached) => ({
            ...cached,
            messages: cached.messages.some((message) => message.id === localId)
              ? cached.messages.map((message) => (message.id === localId ? failedEcho : message))
              : [...cached.messages, failedEcho],
          }));
        }
        return false;
      }
    },
    submissions: {
      subscribe: submissions.subscribe,
      snapshot(channelId) {
        const scope = submissionScope(channelId);
        return scope === undefined ? undefined : submissions.read(scope);
      },
      begin(channelId, attempt) {
        const scope = submissionScope(channelId);
        if (scope === undefined) return undefined;
        const id = nextLocalEchoId();
        const persisted = submissions.record(scope, {
          ...attempt,
          id,
          at: new Date().toISOString(),
        });
        return { id, persisted };
      },
      cancel(channelId, id) {
        const scope = submissionScope(channelId);
        if (scope !== undefined) submissions.discard(scope, id);
      },
      sync(channelId) {
        const scope = submissionScope(channelId);
        if (scope === undefined) return;
        submissions.sync(scope);
        const states = new Map(
          submissions.read(scope).attempts.map((attempt) => [attempt.id, attempt.state]),
        );
        const settledElsewhere = (id: string): boolean =>
          states.get(id) === 'sent' || states.get(id) === 'restored';
        failedByChannel.set(
          channelId,
          (failedByChannel.get(channelId) ?? []).filter((item) => !settledElsewhere(item.id)),
        );
        const conversation = clientStore.getSnapshot().conversation;
        if (conversation.channel?.id !== channelId || conversation.timeline.hasNewer) return;
        const failures = localFailedFor(channelId);
        const failureIds = new Set(failures.map((item) => item.id));
        let changed = false;
        const kept = conversation.messages.flatMap((message) => {
          if (message.failed === undefined || !states.has(message.id)) return [message];
          if (!failureIds.has(message.id)) {
            changed = true;
            return [];
          }
          const unconfirmed = states.get(message.id) === 'unknown';
          if ((message.unconfirmed === true) === unconfirmed) return [message];
          changed = true;
          const { unconfirmed: _stale, ...rest } = message;
          return [unconfirmed ? { ...rest, unconfirmed: true } : rest];
        });
        const shown = new Set(kept.map((message) => message.id));
        const added = failures.filter((item) => !shown.has(item.id));
        if (!changed && added.length === 0) return;
        clientStore.setConversation({ messages: [...kept, ...added] });
      },
      check: checkSubmission,
      async reconcile(channelId) {
        const scope = submissionScope(channelId);
        if (scope === undefined) return;
        let committed = false;
        let changed = false;
        for (const attempt of submissions.reconcilable(scope)) {
          const status = await checkSubmission(channelId, attempt.id);
          if (status === 'unknown') continue;
          if (!submissions.reconcilable(scope).some((current) => current.id === attempt.id))
            continue;
          changed = true;
          committed ||= status === 'committed';
          submissions.settle(
            scope,
            attempt.id,
            status === 'committed' ? 'sent' : 'failed',
            status === 'committed' ? undefined : attempt.error,
          );
          failedByChannel.set(
            channelId,
            (failedByChannel.get(channelId) ?? []).filter((item) => item.id !== attempt.id),
          );
        }
        const conversation = clientStore.getSnapshot().conversation;
        if (!changed || conversation.channel?.id !== channelId) return;
        const failures = new Map(localFailedFor(channelId).map((item) => [item.id, item]));
        clientStore.setConversation({
          messages: conversation.messages.flatMap((message) =>
            message.failed === undefined
              ? [message]
              : failures.has(message.id)
                ? [failures.get(message.id)!]
                : [],
          ),
        });
        if (committed) await actions.refreshChannelMessages(channelId);
      },
    },
    dismissFailedMessage(channelId, messageId) {
      const conversation = clientStore.getSnapshot().conversation;
      if (conversation.channel?.id !== channelId) return false;
      const failed = conversation.messages.find(
        (message) => message.id === messageId && message.failed !== undefined,
      );
      if (failed === undefined) return false;
      failedByChannel.set(
        channelId,
        (failedByChannel.get(channelId) ?? []).filter((item) => item.id !== messageId),
      );
      settleSubmission(channelId, messageId, 'restored');
      clientStore.setConversation({
        messages: conversation.messages.filter((message) => message.id !== messageId),
        error: undefined,
      });
      return true;
    },
    async createBot(input, sectionId) {
      const created = await createPersonaBot(call, input);
      if (created.httpsFallback === undefined) await openCreatedBot(created, sectionId);
      return created;
    },
    async openCreatedBot(bot, sectionId) {
      await openCreatedBot(bot, sectionId);
    },
    async importBotZip(file, sectionId) {
      return openCreatedBot(await importBotZip(file), sectionId);
    },
    botZipFiles(slug) {
      return loadBotZipFiles(slug);
    },
    async exportBotZip(slug, displayName, choice) {
      const { blob, name } = await downloadBotZip(slug, displayName, choice);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    async createGroup(name, sectionId) {
      const channel = await createGroupChannel(call, name);
      clientStore.upsertChannel(channel);
      await placeCreatedChannelFirst(channel.id, sectionId);
      await openChannelById(channel.id);
      return channel;
    },
    async setHumanNickname(channelId, nickname) {
      try {
        const channel = await setChannelHumanName(call, channelId, nickname);
        clientStore.upsertChannel(channel);
        if (clientStore.getSnapshot().conversation.channel?.id === channelId)
          clientStore.setConversation({ channel });
        return true;
      } catch {
        return false;
      }
    },
    async renameChannel(channelId, name) {
      try {
        const result = await renameChannelViaBridge(call, channelId, name);
        clientStore.upsertChannel(result.channel);
        if (result.bot !== undefined) clientStore.upsertBot(result.bot);
        if (clientStore.getSnapshot().conversation.channel?.id === channelId) {
          clientStore.setConversation({ channel: result.channel });
        }
        return true;
      } catch (error) {
        console.warn('botharness: channel rename failed', error);
        return false;
      }
    },
    async setBotAppearance(channelId, recipe) {
      try {
        const bot = await setBotAppearanceViaBridge(call, channelId, recipe);
        clientStore.upsertBot(bot);
        return true;
      } catch {
        return false;
      }
    },
    async loadPartLibrary() {
      try {
        return await loadPartLibraryViaBridge(call);
      } catch {
        return undefined;
      }
    },
    async exportLibraryParts(id, part) {
      try {
        return await exportLibraryPartsViaBridge(call, id, part);
      } catch {
        return undefined;
      }
    },
    async importLibraryParts(data) {
      try {
        return await importLibraryPartsViaBridge(call, data);
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    async importLibraryImage(data, slot, colors, name) {
      try {
        return await importLibraryImageViaBridge(call, data, slot, colors, name);
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    async addLibraryPart(part, name, parent) {
      try {
        return await addLibraryPartViaBridge(call, part, name, parent);
      } catch {
        return undefined;
      }
    },
    async updateBotProfile(slug, patch) {
      try {
        const bot = await updateBotProfileViaBridge(call, slug, patch);
        clientStore.upsertBot(bot);
        return true;
      } catch (error) {
        console.warn('botharness: PersonaBot profile update failed', error);
        return false;
      }
    },
    async setBotAvatar(channelId, avatar) {
      try {
        const bot = await setBotAvatarViaBridge(call, channelId, avatar);
        clientStore.upsertBot(bot);
        return true;
      } catch (error) {
        console.warn('botharness: PersonaBot avatar update failed', error);
        return false;
      }
    },
    async setBotBanner(channelId, banner) {
      try {
        const bot = await setBotBannerViaBridge(call, channelId, banner);
        clientStore.upsertBot(bot);
        return true;
      } catch (error) {
        console.warn('botharness: Bot banner update failed', error);
        return false;
      }
    },
    async setBotPrimaryColor(channelId, primaryColor) {
      try {
        const bot = await setBotPrimaryColorViaBridge(call, channelId, primaryColor);
        clientStore.upsertBot(bot);
        return true;
      } catch (error) {
        console.warn('botharness: Bot Primary Color update failed', error);
        return false;
      }
    },
    async setGroupAvatar(channelId, avatar) {
      try {
        const channel = await setGroupAvatarViaBridge(call, channelId, avatar);
        clientStore.upsertChannel(channel);
        if (clientStore.getSnapshot().conversation.channel?.id === channelId)
          clientStore.setConversation({ channel });
        return true;
      } catch (error) {
        console.warn('botharness: Group avatar update failed', error);
        return false;
      }
    },
    async inviteGroupBot(channelId, botSlug) {
      try {
        const channel = await inviteGroupBot(call, channelId, botSlug);
        clientStore.upsertChannel(channel);
        if (clientStore.getSnapshot().conversation.channel?.id === channelId)
          clientStore.setConversation({ channel });
        return true;
      } catch (error) {
        console.warn('botharness: Group invitation failed', error);
        return false;
      }
    },
    async cancelGroupInvitation(channelId, invitationId) {
      try {
        const channel = await cancelGroupInvitation(call, channelId, invitationId);
        clientStore.upsertChannel(channel);
        if (clientStore.getSnapshot().conversation.channel?.id === channelId)
          clientStore.setConversation({ channel });
        return true;
      } catch (error) {
        console.warn('botharness: Group invitation cancellation failed', error);
        return false;
      }
    },
    async decideGroupJoin(channelId, requestId, accept) {
      try {
        const channel = await decideGroupJoin(call, channelId, requestId, accept);
        clientStore.upsertChannel(channel);
        if (clientStore.getSnapshot().conversation.channel?.id === channelId)
          clientStore.setConversation({ channel });
        return true;
      } catch (error) {
        console.warn('botharness: Group join decision failed', error);
        return false;
      }
    },
    async removeGroupMember(channelId, botSlug) {
      try {
        const channel = await removeGroupMember(call, channelId, botSlug);
        clientStore.upsertChannel(channel);
        if (clientStore.getSnapshot().conversation.channel?.id === channelId)
          clientStore.setConversation({ channel });
        return true;
      } catch (error) {
        console.warn('botharness: Group member removal failed', error);
        return false;
      }
    },
    channelAssignments(channelId) {
      return loadChannelAssignments(call, channelId);
    },
    sessionSubagents(slug, sessionId) {
      return loadSessionSubagents(call, slug, sessionId);
    },
    assignmentWork(slug, sessionId) {
      return loadAssignmentWork(call, slug, sessionId);
    },
    groupWakePolicies(channelId) {
      return loadGroupWakePolicies(call, channelId);
    },
    async setGroupWakePolicy(channelId, botSlug, policy) {
      try {
        const channel = await setGroupWakePolicy(call, channelId, botSlug, policy);
        clientStore.upsertChannel(channel);
        if (clientStore.getSnapshot().conversation.channel?.id === channelId)
          clientStore.setConversation({ channel });
        return true;
      } catch (error) {
        console.warn('botharness: Group wake policy update failed', error);
        return false;
      }
    },
    async channelHistory() {
      const result = await call('channelHistory', {});
      if (!result.ok) throw new Error(result.error.message);
      return (result.value as { channels: ChannelHistoryItem[] }).channels;
    },
    async channelHistorySources(channelId, before) {
      const result = await call('channelHistorySources', {
        channelId,
        ...(before === undefined ? {} : { before }),
      });
      if (!result.ok) throw new Error(result.error.message);
      return result.value as { sources: PurgeSource[]; before?: string };
    },
    async channelPurgePreview(channelId, sourceEventIds) {
      const result = await call('channelPurgePreview', {
        channelId,
        sourceEventIds,
      });
      if (!result.ok) throw new Error(result.error.message);
      return result.value as PurgePreview;
    },
    async channelPurgeConfirm(channelId, sourceEventIds, token) {
      const result = await call('channelPurgeConfirm', {
        channelId,
        sourceEventIds,
        token,
      });
      if (!result.ok) throw new Error(result.error.message);
      return result.value as { accepted: number; cleanupPending?: number };
    },
    async deleteGroupChannel(channelId) {
      try {
        await deleteGroupChannel(call, channelId);
      } catch (error) {
        console.warn('botharness: Group deletion failed', error);
        return false;
      }
      const snapshot = clientStore.getSnapshot();
      if (snapshot.conversation.channel?.id === channelId) clientStore.select(undefined);
      clientStore.setRoster(
        snapshot.bots,
        snapshot.channels.filter((channel) => channel.id !== channelId),
      );
      try {
        await actions.load();
      } catch (error) {
        console.warn('botharness: Group deletion refresh failed', error);
      }
      return true;
    },
    async createSection(name) {
      try {
        const section = await createRosterSection(call, name);
        await refreshRoster();
        return section;
      } catch (error) {
        reportRosterFailure(error);
        return undefined;
      }
    },
    async renameSection(sectionId, name) {
      return rosterMutate(async () => {
        await renameRosterSection(call, sectionId, name);
      });
    },
    async removeSection(sectionId) {
      return rosterMutate(async () => {
        await removeRosterSection(call, sectionId);
      });
    },
    async setChannelPinned(channelId, pinned) {
      const snapshot = clientStore.getSnapshot();
      const current = resolvePinnedChannelIds(snapshot.channels, snapshot.roster.pins);
      const next = pinned
        ? [...current.filter((candidate) => candidate !== channelId), channelId]
        : current.filter((candidate) => candidate !== channelId);
      if (
        next.length === current.length &&
        next.every((candidate, index) => candidate === current[index])
      ) {
        return true;
      }
      return rosterMutate(async () => {
        await setRosterPins(call, next);
      });
    },
    async reorderPinnedChannels(order, beforePublish) {
      const snapshot = clientStore.getSnapshot();
      const current = resolvePinnedChannelIds(snapshot.channels, snapshot.roster.pins);
      const selected = new Set(order);
      if (
        order.length !== current.length ||
        selected.size !== current.length ||
        current.some((id) => !selected.has(id))
      ) {
        return false;
      }
      if (sameIds(order, current)) {
        beforePublish();
        return true;
      }
      try {
        await setRosterPins(call, [...order]);
        beforePublish();
        await refreshRoster();
        return true;
      } catch (error) {
        reportRosterFailure(error);
        await refreshRoster();
        return false;
      }
    },
    async setChannelHidden(channelId, hidden) {
      const current = [...clientStore.getSnapshot().roster.hidden];
      const next = hidden
        ? [...current.filter((candidate) => candidate !== channelId), channelId]
        : current.filter((candidate) => candidate !== channelId);
      if (sameIds(next, current)) return true;
      return rosterMutate(async () => {
        await setRosterHidden(call, next);
      });
    },
    async setChannelMuted(channelId, muted) {
      if (clientStore.getSnapshot().roster.muted.includes(channelId) === muted) return true;
      return rosterMutate(async () => {
        await setChannelMute(call, channelId, muted);
      });
    },
    async batchRoster(input) {
      try {
        const snapshot = await applyRosterBatch(call, input);
        clientStore.setRosterState({
          pins: snapshot.pins,
          hidden: snapshot.hidden,
          muted: snapshot.muted,
          sections: snapshot.sections,
          topOrder: snapshot.topOrder,
          readOnly: false,
        });
        return true;
      } catch (error) {
        reportRosterFailure(error);
        await refreshRoster();
        return false;
      }
    },
    async movePinnedChannel(channelId, sectionId, order) {
      const snapshot = clientStore.getSnapshot();
      const nextPins = resolvePinnedChannelIds(snapshot.channels, snapshot.roster.pins).filter(
        (candidate) => candidate !== channelId,
      );
      return rosterMutate(async () => {
        for (let index = 0; index < order.length; index += 1) {
          await assignRosterChannel(call, order[index] as string, sectionId, index);
        }
        await setRosterPins(call, nextPins);
      });
    },
    async movePinnedChannelToFlat(channelId, order) {
      const snapshot = clientStore.getSnapshot();
      const nextPins = resolvePinnedChannelIds(snapshot.channels, snapshot.roster.pins).filter(
        (candidate) => candidate !== channelId,
      );
      return rosterMutate(async () => {
        await assignRosterChannel(call, channelId, undefined);
        await reorderTopOrder(call, order);
        await setRosterPins(call, nextPins);
      });
    },
    async assignChannel(channelId, sectionId, index) {
      return rosterMutate(async () => {
        await assignRosterChannel(call, channelId, sectionId, index);
      });
    },
    async setSectionChannelOrder(sectionId, order) {
      const section = clientStore
        .getSnapshot()
        .roster.sections.find((candidate) => candidate.id === sectionId);
      if (section === undefined) return false;
      const target = planSectionChannelOrder(section, order);
      if (target === undefined) return true;
      return rosterMutate(async () => {
        for (let index = 0; index < target.length; index += 1) {
          await assignRosterChannel(call, target[index] as string, sectionId, index);
        }
      });
    },
    async moveChannel(channelId, sectionId, order) {
      return rosterMutate(async () => {
        for (let index = 0; index < order.length; index += 1) {
          await assignRosterChannel(call, order[index] as string, sectionId, index);
        }
      });
    },
    async reorderSections(order) {
      return rosterMutate(async () => {
        await reorderRosterSections(call, order);
      });
    },
    async reorderFlat(order) {
      return rosterMutate(async () => {
        await reorderTopOrder(call, order);
      });
    },
    async moveToFlat(channelId, order) {
      return rosterMutate(async () => {
        await assignRosterChannel(call, channelId, undefined);
        await reorderTopOrder(call, order);
      });
    },
    async ensureChannelPins() {
      const snapshot = clientStore.getSnapshot();
      if (snapshot.roster.readOnly) return true;
      const pins = resolvePinnedChannelIds(snapshot.channels, snapshot.roster.pins);
      if (
        pins.length === snapshot.roster.pins.length &&
        pins.every((channelId, index) => channelId === snapshot.roster.pins[index])
      ) {
        return true;
      }
      return rosterMutate(async () => {
        await setRosterPins(call, pins);
      });
    },
    async ensureFlatTopOrder() {
      const snapshot = clientStore.getSnapshot();
      if (snapshot.roster.readOnly || snapshot.roster.topOrder !== undefined) return true;
      const sectioned = new Set(snapshot.roster.sections.flatMap((section) => section.channelIds));
      const pinnedChannelIds = resolvePinnedChannelIds(snapshot.channels, snapshot.roster.pins);
      const order = completeFlatEntries(
        undefined,
        snapshot.roster.sections.map((section) => section.id),
        flatRosterChannelIds(snapshot.channels, new Set(pinnedChannelIds)),
        sectioned,
      );
      if (order.length === 0) return true;
      return rosterMutate(async () => {
        await reorderTopOrder(call, order);
      });
    },
  };
  return actions;
}
