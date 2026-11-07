import type { BotImportsService } from '../bots/imports.js';
import { isAuthenticatedOwner } from './owner-compat.js';
import type {
  VoiceProvidersView,
  VoiceSynthesisView,
  VoiceTranscriptionView,
} from '../voice/bridge.js';
import type { VoiceDictationReadiness, VoiceDictationView } from '../voice/dictation.js';
import type {
  ProviderHealth,
  VoiceDefaults,
  VoiceProviderView,
  VoiceSpeechThreshold,
} from '../voice/providers.js';
import type { PersonaBotAsr, PersonaBotVoice } from '../bots/persona-bot.js';
import type { CloudManagementInput, CloudManagementResult } from '../cloud/management.js';
import type { ChannelManagementResult } from '../channels/management.js';
import type { BotCreationReceipt } from '../bots/creation.js';
import type { BotZipUploadStatus } from '../bots/zip-upload.js';
import type { BotZipPreview } from '../bots/zip-import.js';
import type { TurnTrace } from '../bots/tool-trace.js';
import type { AssignmentTimelineLane } from '../runtime/assignment-timeline.js';
import type { SessionRootRole } from '../sessions/ownership.js';
import type { PartLibraryEntry } from '../bots/part-library.js';
import type { OnboardingSnapshot, TutorialAction } from '../onboarding/service.js';
import type { HttpsFallback } from '../memory/clone.js';
import type { PairingRequest, PairingReviewInput } from '../messaging/pairing.js';
import type { SenderAccessInput } from '../messaging/sender-access.js';
import type {
  ChannelHistoryItem,
  GroupDisbandResult,
  PurgeSource,
  PurgePreview,
  TextCleanupPreview,
  TextCleanupResult,
} from '../purge/contracts.js';
import type {
  MediaCleanupPreview,
  MediaCleanupResult,
  StorageMediaKind,
  StorageUsage,
} from '../storage/media-cleanup.js';
import type { GroupMemberWakePolicy } from '../channels/channel.js';
import { LiveRefused } from '../channels/live-frames.js';
import type {
  ChannelFilesPage,
  ChannelFilesRequest,
  ChannelChangeCursor,
  ChannelChanges,
  ChannelChangesRequest,
  ChannelJournalPage,
  ChannelJournalRequest,
} from '../channels/timeline.js';
import type { CompanionLiveFrame } from '../companions/live.js';
import type { CloudWork, CloudWorkInput } from '../cloud/work.js';
import {
  ChannelLiveRefused,
  LiveUnavailable,
  type ActivityLiveFrame,
  type ChannelLiveFrame,
  type DraftDelivery,
  type RosterLiveFrame,
} from '../channels/live.js';
import type { AllBotPreview, AllBotMention } from '../channels/all-bot-mention.js';
import type {
  MessagingDefaults,
  MessagingDefaultsInput,
  MessagingDefaultsPlatform,
} from '../messaging/defaults.js';
import type { MessagingIdentity, MessagingIdentityInput } from '../messaging/identity.js';
import type { MessagingConversationInput } from '../messaging/conversations.js';
import type { ChannelBridgeInput, ChannelBridgeSnapshot } from '../messaging/channel-bridge.js';
import type {
  ConversationIngestInput,
  ConversationIngestSnapshot,
} from '../messaging/conversation-ingest.js';
import type { UsageOverviewPeriod } from '../usage/overview.js';
import type {
  MarketplaceAuthoredBot,
  MarketplaceAuthorAccount,
  MarketplaceDetail,
  MarketplaceDigest,
  MarketplaceDigestSummary,
  MarketplaceEntry,
  MarketplaceFileView,
  MarketplaceInstallSource,
  MarketplacePage,
  MarketplaceQuery,
  MarketplaceSection,
  MarketplaceTopic,
} from '../marketplace/client.js';
import type { AltchaChallenge } from '../marketplace/altcha.js';
import type { MarketplaceAccount, UploadPlan } from '../marketplace/uploaded-bots.js';
import type { InstallReviewResult } from '../marketplace/install-review.js';
import type { ShareDraftView } from '../marketplace/share-draft.js';
import type { MarketplaceLanguage } from '../marketplace/language.js';
import type {
  ReleaseInfo,
  ReleaseInstall,
  ReleaseRestart,
  ReleaseUpdate,
} from '../release/service.js';
import type { PluginInstall, PluginRestart, PluginUpdates } from '../release/plugins.js';
import type { TelemetryStatus } from '../telemetry/service.js';
import type { OverviewMemory } from '../memory/overview.js';
import type {
  ApprovalReviewerModelView,
  BotPromptView,
  IdleCompactionView,
  OverviewUsage,
  PromptLimitView,
  PromptPartView,
} from './methods.js';
import type { PromptPreset } from '../prompts/prompt-presets.js';
import type { ManualCompactionResult } from '../runtime/idle-compaction.js';
import type { PersonaBotActivitySnapshot } from '../state/bot-state.js';
import type { HumanAssignmentContext } from '../runtime/assignment-human-context.js';
import type { ThreadReceptionInput } from '../messaging/thread-policy.js';
import type { GroupReceptionInput } from '../messaging/group-policy.js';
import type { ExternalSource } from '../messaging/inbound.js';
import type { MessagingSnapshot, MessagingGrant, OutboxIntent } from '../messaging/outbound.js';
import type { MessagingTarget } from '../messaging/provider.js';
import type { PersonaBotDeletionPreview, PersonaBotDeletion } from '../bots/deletion.js';
import type { DataResetPreview, DataResetResult } from '../data-reset/reset.js';
import type { MemoryFileTarget } from '../memory/file-actions.js';
import type { Context } from '@deepseek-ai/cordis';
import type { UsageFilter, UsageQueryResult } from '../usage/query.js';
import { RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { PrivateInputs } from '../credentials/private-inputs.js';
import type { PrivateAccountSummary, PrivateInputStatus } from '../credentials/contracts.js';

import type { PersonaBotPatch } from '../bots/persona-bot.js';
import type { ModelCatalogEntry } from '../models/catalog.js';
import type { ModelPlanState } from '../models/readiness.js';
import type {
  AssignmentModelOption,
  ModelPreset,
  ModelRoute,
  PersonaBotModelPlan,
} from '../models/presets.js';
import type {
  BridgeError,
  BridgeMethods,
  BridgeResult,
  ChannelListItem,
  ChannelListChanges,
  MessagingAppsView,
  PersonaBotDetail,
  ApprovalTemplateEntry,
  PersonaBotSummary,
  OwnedSessionSummary,
  OwnedSessionBot,
  ProfileActivity,
  ProfileSessionUsage,
} from './methods.js';
import type { ChannelActivityToday } from '../channels/activity-today.js';
import type { GroupProfileActivity } from '../channels/profile-activity.js';
import type { ChannelMessage, ChannelReaction, ChannelRecord } from '../channels/channel.js';
import type { ChannelSendStatus, HumanMessageSearchPage } from '../channels/store.js';
import type { ChannelAttachmentRef } from '../attachments/ref.js';
import type { ChannelReadPosition } from '../channels/store.js';
import type { RosterSection, RosterSnapshot } from '../roster/store.js';
import type { TopOrderEntry } from '../roster/spec.js';
import type { ChannelTimelinePage, TimelineDirection } from '../channels/timeline.js';
import type {
  AssignmentDetail,
  AssignmentActivity,
  AssignmentSummary,
  ChannelAssignmentSummary,
  DirectBotToolSpec,
} from '../runtime/bot-runtime.js';
import type { BotAttentionPage, BotAttentionState } from '../runtime/attention.js';
import type { TakeoverHandoff } from '../takeover/contracts.js';
import type {
  BotSchedule,
  BotScheduleChange,
  BotScheduleFiring,
  BotScheduleInput,
  BotScheduleTrigger,
} from '../schedules/bot-schedules.js';
import type { BotSourcePolicy } from '../runtime/source-policy.js';
import type {
  HumanAttentionCategory,
  HumanAttentionPage,
  HumanAttentionStatus,
} from '../runtime/human-attention.js';
import type {
  MemoryAcceptedCommit,
  MemoryAcceptedSnapshot,
  MemoryGitGraph,
  MemoryVersion,
  MemoryVersionName,
  MemoryGitCommitDiff,
  MemoryWorkingChange,
  MemoryWorkingDiff,
  MemoryWorkingKind,
  MemoryRepairEvent,
} from '../memory/accepted.js';
import type { GitStatus } from '../memory/managed-git.js';
import type { MemoryRecoveryCheckpoint } from '../memory/recovery.js';
import type { WorkspaceGrant } from '../workspaces/grants.js';
import type { FolderListing } from '../workspaces/folder-browse.js';
import type { ToolApprovalRule } from '../workspaces/tool-approval-rules.js';
import type { ToolApprovalHistoryEntry } from '../channels/approval-history.js';
import type {
  AssignmentAccessPreset,
  AssignmentAccessMode,
} from '../workspaces/assignment-access.js';

export const BRIDGE_NAMESPACE = 'botharness';
export const BRIDGE_SERVICE_KEY = 'botharnessBridge';

declare module '@deepseek-ai/dsh-typert-protocol/types' {
  interface RemoteErrorDetailsMap {
    'all-bot-preview-changed': { preview: AllBotPreview };
    'invalid-input': Record<string, never>;
    'invalid-slug': Record<string, never>;
    duplicate: Record<string, never>;
    'not-found': Record<string, never>;
    'storage-unavailable': Record<string, never>;
    'unknown-workspace': Record<string, never>;
    'unavailable-workspace': Record<string, never>;
    'invalid-grant': Record<string, never>;
    'invalid-git-url': Record<string, never>;
    'git-clone-failed': Record<string, never>;
    'git-clone-timeout': Record<string, never>;
    'marketplace-unavailable': Record<string, never>;
  }
}

export { SECRET_ROUTE_METHODS, secretRouteRefusal } from './secret-route.js';

const REMOTE_METHOD_DESCRIPTOR = '@deepseek-ai/dsh-typert-protocol/remote-methods';

interface RemoteMethodDescriptor {
  readonly version: 1;
  readonly methods: readonly {
    readonly method: string;
    readonly mode?: 'stream';
    readonly invocation: { readonly kind: 'direct' };
  }[];
}

function markRemoteMethods(prototype: object, methods: readonly string[]): void {
  const descriptor: RemoteMethodDescriptor = {
    version: 1,
    methods: methods.map((method) =>
      Object.freeze({ method, invocation: Object.freeze({ kind: 'direct' }) }),
    ),
  };
  Object.defineProperty(prototype, REMOTE_METHOD_DESCRIPTOR, {
    configurable: true,
    value: Object.freeze(descriptor),
  });
}

export interface BridgeLive {
  followRoster(signal: AbortSignal): AsyncIterable<RosterLiveFrame>;
  followActivity(signal: AbortSignal): AsyncIterable<ActivityLiveFrame>;
  followChannel(
    channelId: string,
    limit: number,
    signal: AbortSignal,
    drafts?: DraftDelivery,
  ): AsyncIterable<ChannelLiveFrame>;
  journalPage(channelId: string, request: ChannelJournalRequest): ChannelJournalPage | undefined;
  filesPage(channelId: string, request: ChannelFilesRequest): ChannelFilesPage | undefined;
  changes(channelId: string, request: ChannelChangesRequest): ChannelChanges | undefined;
  changeCursor(): ChannelChangeCursor | undefined;
  followCompanion(
    resume: string,
    lastEventId: string,
    signal: AbortSignal,
  ): AsyncIterable<CompanionLiveFrame>;
}

function markRemoteStreams(prototype: object, streams: readonly string[]): void {
  const marked = (prototype as Record<string, RemoteMethodDescriptor | undefined>)[
    REMOTE_METHOD_DESCRIPTOR
  ];
  const descriptor: RemoteMethodDescriptor = {
    version: 1,
    methods: [
      ...(marked?.methods ?? []),
      ...streams.map((method) =>
        Object.freeze({
          method,
          mode: 'stream' as const,
          invocation: Object.freeze({ kind: 'direct' as const }),
        }),
      ),
    ],
  };
  Object.defineProperty(prototype, REMOTE_METHOD_DESCRIPTOR, {
    configurable: true,
    value: Object.freeze(descriptor),
  });
}

function toRemoteError(error: BridgeError): RemoteError {
  return new RemoteError(error.code as RemoteError['code'], error.message, error.details ?? {});
}

function unwrap<T>(result: BridgeResult<T>): T {
  if (result.ok) return result.value;
  throw toRemoteError(result.error);
}

async function unwrapAsync<T>(result: Promise<BridgeResult<T>>): Promise<T> {
  return unwrap(await result);
}

export class BotharnessBridgeService extends TypertRemoteService {
  private readonly methods: BridgeMethods;

  constructor(
    ctx: Context,
    methods: BridgeMethods,
    private readonly privateInputs?: PrivateInputs,
    private readonly live?: BridgeLive,
  ) {
    super(ctx, BRIDGE_SERVICE_KEY, { namespace: BRIDGE_NAMESPACE });
    this.methods = methods;
  }

  followRoster(signal: AbortSignal): AsyncIterable<RosterLiveFrame> {
    if (this.live === undefined)
      throw toRemoteError({
        code: 'unavailable',
        message: 'Live stream is unavailable',
      });
    return this.live.followRoster(signal);
  }

  async *followActivity(signal: AbortSignal): AsyncGenerator<ActivityLiveFrame> {
    if (this.live === undefined)
      throw toRemoteError({
        code: 'unavailable',
        message: 'Live stream is unavailable',
      });
    try {
      yield* this.live.followActivity(signal);
    } catch (error) {
      if (error instanceof LiveUnavailable)
        throw toRemoteError({ code: 'unavailable', message: error.message });
      throw error;
    }
  }

  channelJournalPage(
    channelId: string,
    through: number,
    before?: number,
    limit?: number,
  ): ChannelJournalPage {
    const page = this.live?.journalPage(channelId, { through, before, limit });
    if (page === undefined)
      throw toRemoteError({
        code: 'not-found',
        message: 'Channel journal page is unavailable',
      });
    return page;
  }

  channelFilesPage(channelId: string, before?: number, limit?: number): ChannelFilesPage {
    const page = this.live?.filesPage(channelId, { before, limit });
    if (page === undefined)
      throw toRemoteError({
        code: 'not-found',
        message: 'Channel files page is unavailable',
      });
    return page;
  }

  channelChanges(
    channelId: string,
    sinceSeq: number,
    epoch?: string,
    limit?: number,
  ): ChannelChanges {
    const changes = this.live?.changes(channelId, { sinceSeq, epoch, limit });
    if (changes === undefined)
      throw toRemoteError({ code: 'not-found', message: 'Channel changes are unavailable' });
    return changes;
  }

  channelChangeCursor(): ChannelChangeCursor {
    const cursor = this.live?.changeCursor();
    if (cursor === undefined)
      throw toRemoteError({ code: 'unavailable', message: 'Channel changes are unavailable' });
    return cursor;
  }

  async *followChannel(
    channelId: string,
    limit: number,
    drafts: DraftDelivery | undefined,
    signal: AbortSignal,
  ): AsyncGenerator<ChannelLiveFrame> {
    if (this.live === undefined)
      throw toRemoteError({
        code: 'unavailable',
        message: 'Live stream is unavailable',
      });
    try {
      yield* this.live.followChannel(channelId, limit, signal, drafts ?? 'full');
    } catch (error) {
      if (error instanceof ChannelLiveRefused)
        throw toRemoteError({ code: error.code, message: error.message });
      throw error;
    }
  }

  async *followCompanion(
    resume: string,
    lastEventId: string,
    signal: AbortSignal,
  ): AsyncGenerator<CompanionLiveFrame> {
    if (this.live === undefined)
      throw toRemoteError({
        code: 'unavailable',
        message: 'Live stream is unavailable',
      });
    try {
      yield* this.live.followCompanion(resume, lastEventId, signal);
    } catch (error) {
      if (error instanceof LiveRefused)
        throw toRemoteError({ code: error.code, message: error.message });
      throw error;
    }
  }

  privateInputStatus(channelId: string, messageId: string): { status: PrivateInputStatus } {
    this.requirePrivateOwner();
    return {
      status: this.privateInputs?.status(channelId, messageId) ?? 'expired',
    };
  }

  async privateInputSubmit(
    channelId: string,
    messageId: string,
    values: Record<string, string>,
  ): Promise<{ accepted: boolean; reason?: string }> {
    this.requirePrivateOwner();
    if (this.privateInputs === undefined) return { accepted: false, reason: 'store-unavailable' };
    return await this.privateInputs.submission(true, {
      channelId,
      messageId,
      values,
    });
  }

  async privateInputCancel(channelId: string, messageId: string): Promise<{ accepted: boolean }> {
    this.requirePrivateOwner();
    return {
      accepted: (await this.privateInputs?.cancel(true, channelId, messageId)) ?? false,
    };
  }

  async privateAccountStatus(channelId: string, messageId: string) {
    this.requirePrivateOwner();
    return (
      this.privateInputs?.accountStatus(true, channelId, messageId) ?? {
        status: 'unavailable',
        references: {},
      }
    );
  }

  async privateInputReplace(channelId: string, messageId: string): Promise<{ messageId?: string }> {
    this.requirePrivateOwner();
    const replacement = await this.privateInputs?.replace(true, channelId, messageId);
    return replacement === undefined ? {} : { messageId: replacement };
  }

  async privateAccounts(slug: string): Promise<{
    status: 'ready' | 'unavailable';
    accounts: PrivateAccountSummary[];
    replaceable: boolean;
    mcpServers: ReturnType<NonNullable<PrivateInputs['mcpServers']>['list']>;
  }> {
    this.requirePrivateOwner();
    const accounts =
      typeof slug === 'string' ? await this.privateInputs?.accounts(true, slug) : undefined;
    const replaceable = (await this.privateInputs?.replaceable().catch(() => false)) ?? false;
    const mcpServers =
      typeof slug === 'string' ? (this.privateInputs?.mcpServers?.list(slug) ?? []) : [];
    return accounts === undefined
      ? { status: 'unavailable', accounts: [], replaceable: false, mcpServers }
      : { status: 'ready', accounts, replaceable, mcpServers };
  }

  async privateMcpServerEnable(
    slug: string,
    serverName: string,
    enabled: boolean,
  ): Promise<{ accepted: boolean }> {
    this.requirePrivateOwner();
    return {
      accepted:
        typeof slug === 'string' && typeof serverName === 'string' && typeof enabled === 'boolean'
          ? ((await this.privateInputs?.mcpServers?.setEnabled(slug, serverName, enabled)) ?? false)
          : false,
    };
  }

  async privateMcpServerRemove(slug: string, serverName: string): Promise<{ removed: boolean }> {
    this.requirePrivateOwner();
    return {
      removed:
        typeof slug === 'string' && typeof serverName === 'string'
          ? ((await this.privateInputs?.mcpServers?.remove(slug, serverName)) ?? false)
          : false,
    };
  }

  async privateAccountRevoke(channelId: string, messageId: string) {
    this.requirePrivateOwner();
    return (
      this.privateInputs?.revoke(true, channelId, messageId) ?? {
        accepted: false,
        stopped: 0,
        completed: 0,
        uncertain: 0,
      }
    );
  }

  private requirePrivateOwner(message = 'Private input requires the authenticated Owner'): void {
    if (!isAuthenticatedOwner(this.ctx.invocation?.peer, this.ctx.get('connection')))
      throw new RemoteError('forbidden' as RemoteError['code'], message, {});
  }

  messagingChannelTarget(
    slug: string,
    grantId: string,
    channelId: string | null,
  ): Promise<{ updated: true }> {
    return unwrapAsync(this.methods.messagingChannelTarget({ slug, grantId, channelId }));
  }
  messagingThreadPolicy(
    slug: string,
    sourceEventId: string,
    policy: ThreadReceptionInput,
  ): Promise<{ updated: true }> {
    return unwrapAsync(this.methods.messagingThreadPolicy({ slug, sourceEventId, policy }));
  }
  messagingGroupPolicy(
    slug: string,
    grantId: string,
    policy: GroupReceptionInput,
  ): Promise<{ updated: true }> {
    return unwrapAsync(this.methods.messagingGroupPolicy({ slug, grantId, policy }));
  }
  messagingDefaults(platform?: MessagingDefaultsPlatform): Promise<MessagingDefaults> {
    return unwrapAsync(this.methods.messagingDefaults(platform === undefined ? {} : { platform }));
  }
  messagingDefaultsSet(input: MessagingDefaultsInput): Promise<MessagingDefaults> {
    return unwrapAsync(this.methods.messagingDefaultsSet(input));
  }
  channelBridges(channelId: string): Promise<ChannelBridgeSnapshot> {
    return unwrapAsync(this.methods.channelBridges({ channelId }));
  }
  channelIngests(channelId: string): Promise<ConversationIngestSnapshot> {
    return unwrapAsync(this.methods.channelIngests({ channelId }));
  }
  channelIngest(channelId: string, input: ConversationIngestInput): Promise<{ updated: true }> {
    return unwrapAsync(this.methods.channelIngest({ channelId, input }));
  }
  channelBridge(channelId: string, input: ChannelBridgeInput): Promise<{ updated: true }> {
    return unwrapAsync(this.methods.channelBridge({ channelId, input }));
  }
  messagingReceive(slug: string, grantId: string, enabled: boolean): Promise<{ updated: true }> {
    return unwrapAsync(this.methods.messagingReceive({ slug, grantId, enabled }));
  }
  messagingSource(slug: string, sourceEventId: string): Promise<{ source: ExternalSource }> {
    return unwrapAsync(this.methods.messagingSource({ slug, sourceEventId }));
  }
  approvalRoute(
    slug: string,
    pairingId: string | null,
    expectedRevision: number,
  ): Promise<{ updated: true }> {
    return unwrapAsync(this.methods.approvalRoute({ slug, pairingId, expectedRevision }));
  }
  approvalTest(slug: string): Promise<{
    delivery: import('../messaging/approval-messaging.js').ApprovalDelivery;
  }> {
    return unwrapAsync(this.methods.approvalTest({ slug }));
  }
  questionRetry(slug: string, id: string): Promise<{ updated: true }> {
    return unwrapAsync(this.methods.questionRetry({ slug, id }));
  }
  approvalRetry(
    slug: string,
    id: string,
  ): Promise<{
    delivery: import('../messaging/approval-messaging.js').ApprovalDelivery;
  }> {
    return unwrapAsync(this.methods.approvalRetry({ slug, id }));
  }
  failureAlertsSet(
    slug: string,
    enabled: boolean,
    expectedRevision: number,
  ): Promise<{ updated: true }> {
    return unwrapAsync(this.methods.failureAlertsSet({ slug, enabled, expectedRevision }));
  }
  failureAlertsTest(slug: string): Promise<{
    delivery: import('../messaging/failure-alerts.js').FailureAlertDelivery;
  }> {
    return unwrapAsync(this.methods.failureAlertsTest({ slug }));
  }
  failureAlertsRetry(
    slug: string,
    id: string,
  ): Promise<{
    delivery: import('../messaging/failure-alerts.js').FailureAlertDelivery;
  }> {
    return unwrapAsync(this.methods.failureAlertsRetry({ slug, id }));
  }
  pairingReview(slug: string, input: PairingReviewInput): Promise<{ pairing: PairingRequest }> {
    return unwrapAsync(this.methods.pairingReview({ slug, input }));
  }
  senderAccess(slug: string, input: SenderAccessInput): Promise<void> {
    return unwrapAsync(this.methods.senderAccess({ slug, input }));
  }
  messagingIdentity(
    slug: string,
    input: MessagingIdentityInput,
  ): Promise<{ identity: MessagingIdentity }> {
    return unwrapAsync(this.methods.messagingIdentity({ slug, input }));
  }
  cloudConnections(input: CloudManagementInput): Promise<CloudManagementResult> {
    return unwrapAsync(this.methods.cloudConnections(input));
  }
  cloudWork(slug: string, input: CloudWorkInput): Promise<Awaited<ReturnType<CloudWork['run']>>> {
    return unwrapAsync(this.methods.cloudWork({ slug, input }));
  }
  messagingApps(): Promise<MessagingAppsView> {
    return unwrapAsync(this.methods.messagingApps());
  }
  messagingSnapshot(slug: string): Promise<MessagingSnapshot> {
    return unwrapAsync(this.methods.messagingSnapshot({ slug }));
  }
  messagingReachable(
    slug: string,
    bindingId: string,
    cursor?: string,
  ): Promise<import('../messaging/provider.js').MessagingReachablePage> {
    return unwrapAsync(
      this.methods.messagingReachable({
        slug,
        bindingId,
        ...(cursor ? { cursor } : {}),
      }),
    );
  }
  messagingPostRequest(
    slug: string,
    bindingId: string,
    conversationId: string,
    requestId: string,
    text: string,
  ): Promise<{ intent: OutboxIntent | null }> {
    return unwrapAsync(
      this.methods.messagingPostRequest({
        slug,
        bindingId,
        conversationId,
        requestId,
        text,
      }),
    );
  }
  messagingPostConversation(
    slug: string,
    bindingId: string,
    conversationId: string,
    requestId: string,
    text: string,
  ): Promise<{ intent: OutboxIntent }> {
    return unwrapAsync(
      this.methods.messagingPostConversation({
        slug,
        bindingId,
        conversationId,
        requestId,
        text,
      }),
    );
  }
  messagingPostLimit(
    slug: string,
    bindingId: string,
    expectedRevision: number,
    limit: number | null,
  ): Promise<{ identity: MessagingIdentity }> {
    return unwrapAsync(
      this.methods.messagingPostLimit({
        slug,
        bindingId,
        expectedRevision,
        limit,
      }),
    );
  }
  messagingTargets(
    providerId: string,
    accountRef: string,
  ): Promise<{ targets: MessagingTarget[] }> {
    return unwrapAsync(this.methods.messagingTargets({ providerId, accountRef }));
  }
  messagingAuthorize(
    botSlug: string,
    providerId: string,
    accountRef: string,
    targetRef: string,
    fingerprint: string,
    targetDigest: string,
  ): Promise<{ grant: MessagingGrant }> {
    return unwrapAsync(
      this.methods.messagingAuthorize({
        botSlug,
        providerId,
        accountRef,
        targetRef,
        fingerprint,
        targetDigest,
      }),
    );
  }
  messagingRevoke(slug: string, grantId: string): Promise<{ revoked: true }> {
    return unwrapAsync(this.methods.messagingRevoke({ slug, grantId }));
  }
  messagingConversation(
    slug: string,
    input: MessagingConversationInput,
  ): Promise<{ updated: true }> {
    return unwrapAsync(this.methods.messagingConversation({ slug, input }));
  }
  messagingSend(
    slug: string,
    grantId: string,
    requestId: string,
    text: string,
  ): Promise<{ intent: OutboxIntent }> {
    return unwrapAsync(this.methods.messagingSend({ slug, grantId, requestId, text }));
  }

  tobHome() {
    return unwrapAsync(this.methods.tobHome({}));
  }
  onboarding(slug?: string, action?: TutorialAction): Promise<OnboardingSnapshot> {
    return unwrapAsync(this.methods.onboarding({ slug, action }));
  }
  onboardingModel(
    slug: string | undefined,
    expectedRevision: number,
    route: ModelRoute,
    globalDefault: boolean,
    expectedDefaultRevision?: number,
  ): Promise<{ revision: number }> {
    return unwrapAsync(
      this.methods.onboardingModel({
        slug,
        expectedRevision,
        route,
        globalDefault,
        expectedDefaultRevision,
      }),
    );
  }
  telemetryEvent(event: string, properties?: Record<string, string | boolean>): null {
    return unwrap(this.methods.telemetryEvent({ event, properties: properties ?? {} }));
  }
  modelPlanInherit(slug: string, expectedRevision: number): { revision: number } {
    return unwrap(this.methods.modelPlanInherit({ slug, expectedRevision }));
  }
  channelRetry(
    channelId: string,
    messageId: string,
    recovery?: 'continue' | 'compact' | 'new-session',
    failureMessageId?: string,
  ): Promise<{ accepted: true }> {
    return unwrapAsync(
      this.methods.channelRetry({
        channelId,
        messageId,
        recovery,
        failureMessageId,
      }),
    );
  }
  botNewSession(slug: string): Promise<{ started: true }> {
    return unwrapAsync(this.methods.botNewSession({ slug }));
  }

  botCompact(slug: string): Promise<ManualCompactionResult> {
    return unwrapAsync(this.methods.botCompact({ slug }));
  }
  botContext(slug: string): Promise<import('../runtime/context-window.js').BotContextWindow> {
    return unwrapAsync(this.methods.botContext({ slug }));
  }
  botSystemPrompt(
    slug: string,
  ): Promise<import('../runtime/prompt-inspection.js').BotSystemPromptView> {
    return unwrapAsync(this.methods.botSystemPrompt({ slug }));
  }
  botTurnInput(
    slug: string,
    sessionId?: string,
    turns?: number,
  ): Promise<{
    slug: string;
    sessionId: string;
    turns: import('../runtime/prompt-inspection.js').TurnInputView[];
  }> {
    return unwrapAsync(
      this.methods.botTurnInput({
        slug,
        ...(sessionId === undefined ? {} : { sessionId }),
        ...(turns === undefined ? {} : { turns }),
      }),
    );
  }
  channelBotStop(
    channelId: string,
    botSlug: string,
    autoContinueFor?: string,
  ): Promise<{
    stopped: { botSlug: string; sessionId: string; messageId: string };
  }> {
    return unwrapAsync(
      this.methods.channelBotStop({
        channelId,
        botSlug,
        ...(autoContinueFor === undefined ? {} : { autoContinueFor }),
      }),
    );
  }
  sessionStop(
    botSlug: string,
    sessionId?: string,
    channelId?: string,
    activityId?: string,
  ): Promise<{
    stopped: import('../runtime/bot-runtime.js').StoppedSessionRef[];
    alreadyIdle: import('../runtime/bot-runtime.js').StoppedSessionRef[];
    messageId?: string;
  }> {
    return unwrapAsync(
      this.methods.sessionStop({
        botSlug,
        ...(sessionId === undefined ? {} : { sessionId }),
        ...(channelId === undefined ? {} : { channelId }),
        ...(activityId === undefined ? {} : { activityId }),
      }),
    );
  }
  botStop(
    botSlug: string,
    channelId?: string,
    autoContinueFor?: string,
  ): Promise<{
    stopped: import('../runtime/bot-runtime.js').StoppedSessionRef[];
    alreadyIdle: import('../runtime/bot-runtime.js').StoppedSessionRef[];
    messageId?: string;
  }> {
    return unwrapAsync(
      this.methods.botStop({
        botSlug,
        ...(channelId === undefined ? {} : { channelId }),
        ...(autoContinueFor === undefined ? {} : { autoContinueFor }),
      }),
    );
  }
  modelCatalog(): Promise<{
    models: ModelCatalogEntry[];
    default?: ModelRoute;
    defaultRevision?: number;
  }> {
    return unwrapAsync(this.methods.modelCatalog({}));
  }

  modelPresets(): { presets: ModelPreset[] } {
    return unwrap(this.methods.modelPresets({}));
  }

  modelPresetCreate(
    name: string,
    orchestrator: ModelRoute,
    assignmentDefault: ModelRoute,
    assignmentModels?: AssignmentModelOption[],
  ): Promise<{ preset: ModelPreset }> {
    return unwrapAsync(
      this.methods.modelPresetCreate({
        name,
        orchestrator,
        assignmentDefault,
        ...(assignmentModels === undefined ? {} : { assignmentModels }),
      }),
    );
  }

  modelPresetUpdate(
    id: string,
    expectedRevision: number,
    name: string,
    orchestrator: ModelRoute,
    assignmentDefault: ModelRoute,
    assignmentModels?: AssignmentModelOption[],
  ): Promise<{ preset: ModelPreset }> {
    return unwrapAsync(
      this.methods.modelPresetUpdate({
        id,
        expectedRevision,
        name,
        orchestrator,
        assignmentDefault,
        ...(assignmentModels === undefined ? {} : { assignmentModels }),
      }),
    );
  }

  modelPresetApply(
    slug: string,
    presetId: string,
    expectedRevision?: number,
    expectedPresetRevision?: number,
  ): Promise<{ plan: PersonaBotModelPlan }> {
    return unwrapAsync(
      this.methods.modelPresetApply({
        slug,
        presetId,
        expectedRevision,
        expectedPresetRevision,
      }),
    );
  }

  modelPlan(slug: string): Promise<ModelPlanState> {
    return unwrapAsync(this.methods.modelPlan({ slug }));
  }

  modelPlanCustomize(
    slug: string,
    orchestrator: ModelRoute,
    expectedRevision?: number,
  ): Promise<{ plan: PersonaBotModelPlan }> {
    return unwrapAsync(this.methods.modelPlanCustomize({ slug, orchestrator, expectedRevision }));
  }

  modelPlanAssignmentsSet(
    slug: string,
    expectedRevision: number,
    assignmentDefault: ModelRoute,
    assignmentModels: AssignmentModelOption[],
  ): Promise<{ plan: PersonaBotModelPlan }> {
    return unwrapAsync(
      this.methods.modelPlanAssignmentsSet({
        slug,
        expectedRevision,
        assignmentDefault,
        assignmentModels,
      }),
    );
  }

  modelPlanSet(
    slug: string,
    expectedRevision: number,
    orchestrator: ModelRoute,
    assignmentDefault: ModelRoute,
    assignmentModels: AssignmentModelOption[],
  ): Promise<{ plan: PersonaBotModelPlan }> {
    return unwrapAsync(
      this.methods.modelPlanSet({
        slug,
        expectedRevision,
        orchestrator,
        assignmentDefault,
        assignmentModels,
      }),
    );
  }

  list(query?: string): { bots: PersonaBotSummary[] } {
    return unwrap(this.methods.list({ query }));
  }

  activitySnapshot(): PersonaBotActivitySnapshot {
    return unwrap(this.methods.activitySnapshot({}));
  }

  get(slug: string): { bot: PersonaBotDetail; profileFingerprint: string } {
    return unwrap(this.methods.get({ slug }));
  }

  create(
    displayName: string,
    roles?: string[],
    persona?: string,
    description?: string,
    model?: string,
    preset?: string,
    workspaces?: string[],
    avatar?: string,
    memoryLocation?: string,
    coreMemory?: string,
    operationKey?: string,
  ): {
    bot: PersonaBotDetail;
    channelId?: string;
    receipt?: BotCreationReceipt;
  } {
    return unwrap(
      this.methods.create({
        displayName,
        roles,
        persona,
        description,
        model,
        preset,
        workspaces,
        avatar,
        memoryLocation,
        coreMemory,
        operationKey,
      }),
    );
  }

  createLookup(
    operationKey: string,
    displayName: string,
    roles?: string[],
    persona?: string,
    description?: string,
    model?: string,
    preset?: string,
    workspaces?: string[],
    avatar?: string,
    memoryLocation?: string,
    coreMemory?: string,
  ): { receipt: BotCreationReceipt | null } {
    return unwrap(
      this.methods.createLookup({
        displayName,
        roles,
        persona,
        description,
        model,
        preset,
        workspaces,
        avatar,
        memoryLocation,
        coreMemory,
        operationKey,
      }),
    );
  }

  async botImportPreview(
    gitUrl: string,
  ): Promise<Awaited<ReturnType<BotImportsService['previewGit']>>> {
    return unwrapAsync(this.methods.botImportPreview({ gitUrl }));
  }
  botImportLookup(
    operationKey: string,
    gitUrl: string,
    expectedCommit: string,
    displayName: string,
    roles?: string[],
    description?: string,
  ): { receipt: BotCreationReceipt | null } {
    return unwrap(
      this.methods.botImportLookup({
        operationKey,
        gitUrl,
        expectedCommit,
        displayName,
        roles,
        description,
      }),
    );
  }
  zipUploadBegin(uploadKey: string, sha256: string, sizeBytes: number): BotZipUploadStatus {
    return unwrap(this.methods.zipUploadBegin({ uploadKey, sha256, sizeBytes }));
  }

  zipUploadChunk(
    uploadKey: string,
    sha256: string,
    sizeBytes: number,
    offset: number,
    dataBase64: string,
  ): BotZipUploadStatus {
    return unwrap(
      this.methods.zipUploadChunk({
        uploadKey,
        sha256,
        sizeBytes,
        offset,
        dataBase64,
      }),
    );
  }

  zipUploadPreview(uploadKey: string, sha256: string, sizeBytes: number): BotZipPreview {
    return unwrap(this.methods.zipUploadPreview({ uploadKey, sha256, sizeBytes }));
  }

  zipImportLookup(
    operationKey: string,
    sha256: string,
    displayName: string,
    roles?: string[],
    description?: string,
  ): { receipt: BotCreationReceipt | null } {
    return unwrap(
      this.methods.zipImportLookup({
        operationKey,
        sha256,
        displayName,
        roles,
        description,
      }),
    );
  }

  async zipImport(
    operationKey: string,
    uploadKey: string,
    sha256: string,
    sizeBytes: number,
    displayName: string,
    roles?: string[],
    description?: string,
  ): Promise<{
    bot: PersonaBotDetail;
    channelId: string;
    receipt?: BotCreationReceipt;
  }> {
    return unwrapAsync(
      this.methods.zipImport({
        operationKey,
        uploadKey,
        sha256,
        sizeBytes,
        displayName,
        roles,
        description,
      }),
    );
  }

  async createFromGit(
    displayName: string,
    gitUrl: string,
    roles?: string[],
    description?: string,
    origin?: 'marketplace',
    operationKey?: string,
    expectedCommit?: string,
    listingId?: string,
  ): Promise<{
    bot: PersonaBotDetail;
    httpsFallback?: HttpsFallback;
    receipt?: BotCreationReceipt;
    channelId?: string;
  }> {
    return unwrapAsync(
      this.methods.createFromGit({
        displayName,
        gitUrl,
        roles,
        description,
        origin,
        operationKey,
        expectedCommit,
        listingId,
      }),
    );
  }

  update(
    slug: string,
    patch: PersonaBotPatch,
    expectedProfile?: string,
  ): { bot: PersonaBotDetail } {
    return unwrap(this.methods.update({ slug, patch, expectedProfile }));
  }

  dataResetPreview(): { preview: DataResetPreview } {
    return unwrap(this.methods.dataResetPreview());
  }
  dataResetConfirm(token: string): { reset: DataResetResult } {
    return unwrap(this.methods.dataResetConfirm({ token }));
  }
  deletionPreview(slug: string): { preview: PersonaBotDeletionPreview } {
    return unwrap(this.methods.deletionPreview({ slug }));
  }
  async deletionConfirm(
    slug: string,
    token: string,
    eraseMemory: boolean,
  ): Promise<{ deletion: PersonaBotDeletion }> {
    return unwrapAsync(this.methods.deletionConfirm({ slug, token, eraseMemory }));
  }
  async deletionRetry(slug: string): Promise<{ deletion: PersonaBotDeletion }> {
    return unwrapAsync(this.methods.deletionRetry({ slug }));
  }
  deletionMemoryFolder(slug: string): {
    target: { path: string; relativePath: string; kind: 'directory' };
  } {
    return unwrap(this.methods.deletionMemoryFolder({ slug }));
  }
  pause(slug: string): { bot: PersonaBotDetail } {
    return unwrap(this.methods.pause({ slug }));
  }

  resume(slug: string): { bot: PersonaBotDetail } {
    return unwrap(this.methods.resume({ slug }));
  }
  computerAccessSet(slug: string, enabled: boolean): { bot: PersonaBotDetail } {
    return unwrap(this.methods.computerAccessSet({ slug, enabled }));
  }

  browserAccessSet(slug: string, enabled: boolean): { bot: PersonaBotDetail } {
    return unwrap(this.methods.browserAccessSet({ slug, enabled }));
  }

  browserProfileSet(slug: string, profile: string): { bot: PersonaBotDetail } {
    return unwrap(this.methods.browserProfileSet({ slug, profile }));
  }

  approvalTemplates(slug?: string): {
    templates: ApprovalTemplateEntry[];
    selected?: string | null;
  } {
    return unwrap(this.methods.approvalTemplates(slug === undefined ? {} : { slug }));
  }

  approvalTemplateCreate(
    name: string,
    text?: string,
    from?: string,
  ): { template: ApprovalTemplateEntry } {
    return unwrap(
      this.methods.approvalTemplateCreate({
        name,
        ...(text === undefined ? {} : { text }),
        ...(from === undefined ? {} : { from }),
      }),
    );
  }

  approvalTemplateUpdate(name: string, text: string): { template: ApprovalTemplateEntry } {
    return unwrap(this.methods.approvalTemplateUpdate({ name, text }));
  }

  promptParts(): { parts: PromptPartView[]; limits: PromptLimitView[] } {
    return unwrap(this.methods.promptParts({}));
  }

  promptPresets(): { presets: PromptPreset[]; globalPresetId: string | null } {
    return unwrap(this.methods.promptPresets({}));
  }

  promptPresetCreate(
    name: string,
    parts?: Record<string, unknown>,
    limits?: Record<string, unknown>,
  ): { preset: PromptPreset } {
    return unwrap(
      this.methods.promptPresetCreate({
        name,
        ...(parts === undefined ? {} : { parts }),
        ...(limits === undefined ? {} : { limits }),
      }),
    );
  }

  promptPresetUpdate(
    id: string,
    name?: string,
    parts?: Record<string, unknown>,
    expectedRevision?: number,
    limits?: Record<string, unknown>,
  ): { preset: PromptPreset } {
    return unwrap(
      this.methods.promptPresetUpdate({
        id,
        ...(name === undefined ? {} : { name }),
        ...(parts === undefined ? {} : { parts }),
        ...(limits === undefined ? {} : { limits }),
        ...(expectedRevision === undefined ? {} : { expectedRevision }),
      }),
    );
  }

  promptPresetDelete(id: string): { id: string; clearedBots: string[] } {
    return unwrap(this.methods.promptPresetDelete({ id }));
  }

  promptGlobalSet(presetId: string | null): { presetId: string | null } {
    return unwrap(this.methods.promptGlobalSet({ presetId }));
  }

  botPrompt(slug: string): BotPromptView {
    return unwrap(this.methods.botPrompt({ slug }));
  }

  botPromptSet(
    slug: string,
    presetId?: string | null,
    parts?: Record<string, unknown>,
    limits?: Record<string, unknown>,
  ): BotPromptView {
    return unwrap(
      this.methods.botPromptSet({
        slug,
        ...(presetId === undefined ? {} : { presetId }),
        ...(parts === undefined ? {} : { parts }),
        ...(limits === undefined ? {} : { limits }),
      }),
    );
  }

  approvalTemplateDelete(name: string): {
    template: { name: string };
    clearedBots: string[];
  } {
    return unwrap(this.methods.approvalTemplateDelete({ name }));
  }

  botApprovalTemplateSet(slug: string, template: string | null): { bot: PersonaBotDetail } {
    return unwrap(this.methods.botApprovalTemplateSet({ slug, template }));
  }

  voiceProviders(slug?: string): VoiceProvidersView {
    return unwrap(this.methods.voiceProviders(slug === undefined ? {} : { slug }));
  }

  conceptArt(
    action:
      | 'status'
      | 'open'
      | 'styles'
      | 'generateStyle'
      | 'request'
      | 'resume'
      | 'cancel'
      | 'accept',
    sessionId?: string | null,
    botSlug?: string,
    styleRef?: string,
    note?: string,
    idempotencyKey?: string,
    contextVersion?: string | number,
    request?: {
      raw_requirement: string;
      submit_prompt?: string;
      style: {
        state: 'none' | 'selected' | 'disabled';
        styleRef?: string | null;
        version?: string | null;
        def?: string | null;
        def_fixture?: string | null;
      };
      style_history_audit_only?: { styleRef?: string; def?: string }[];
      references?: { id: string; status: string }[];
      sessionId: string | null;
      context_version: string | number;
      operation_id: string;
      route_idempotency_key: string;
      input_fingerprint: string;
      submit_allowed: boolean;
      botSlug?: string;
      confirmedPrompt?: string;
    },
  ): Promise<unknown> {
    return unwrapAsync(
      this.methods.conceptArt({
        action,
        ...(sessionId === undefined ? {} : { sessionId }),
        ...(botSlug === undefined ? {} : { botSlug }),
        ...(styleRef === undefined ? {} : { styleRef }),
        ...(note === undefined ? {} : { note }),
        ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
        ...(contextVersion === undefined ? {} : { contextVersion }),
        ...(request === undefined ? {} : { request }),
      }),
    );
  }

  voiceProviderAdd(
    preset: string,
    name?: string,
    baseUrl?: string,
    model?: string,
    defaultVoice?: string,
    key?: string,
    kind?: string,
    language?: string,
  ): Promise<{ provider: VoiceProviderView }> {
    return unwrapAsync(
      this.methods.voiceProviderAdd({
        preset,
        name,
        baseUrl,
        model,
        defaultVoice,
        key,
        kind,
        language,
      }),
    );
  }

  voiceProviderRemove(id: string): Promise<{ provider: VoiceProviderView; clearedBots: string[] }> {
    return unwrapAsync(this.methods.voiceProviderRemove({ id }));
  }

  voiceProviderTest(id: string, voiceId?: string): Promise<ProviderHealth> {
    return unwrapAsync(this.methods.voiceProviderTest({ id, voiceId }));
  }

  voiceSynthesize(
    text: string,
    slug?: string,
    providerId?: string,
    voiceId?: string,
    markdown?: boolean,
  ): Promise<VoiceSynthesisView> {
    return unwrapAsync(this.methods.voiceSynthesize({ text, slug, providerId, voiceId, markdown }));
  }

  botVoiceSet(
    slug: string,
    providerId: string | null,
    voiceId?: string,
  ): { slug: string; voice: PersonaBotVoice | null } {
    return unwrap(this.methods.botVoiceSet({ slug, providerId, voiceId }));
  }

  voiceTranscribe(
    audio: string,
    slug?: string,
    providerId?: string,
    language?: string,
  ): Promise<VoiceTranscriptionView> {
    return unwrapAsync(this.methods.voiceTranscribe({ audio, slug, providerId, language }));
  }

  botAsrSet(
    slug: string,
    providerId: string | null,
    language?: string,
  ): { slug: string; asr: PersonaBotAsr | null } {
    return unwrap(this.methods.botAsrSet({ slug, providerId, language }));
  }

  voiceDefaultSet(
    kind: string,
    providerId: string | null,
    voiceId?: string,
    language?: string,
  ): { defaults: VoiceDefaults } {
    return unwrap(this.methods.voiceDefaultSet({ kind, providerId, voiceId, language }));
  }

  voiceSpeechThresholdSet(dbfs: number | null): { speechThreshold: VoiceSpeechThreshold } {
    return unwrap(this.methods.voiceSpeechThresholdSet({ dbfs }));
  }

  voiceDictation(
    kind: string,
    id?: string,
    pcm?: string,
    slug?: string,
    providerId?: string,
    language?: string,
  ): Promise<{ readiness: VoiceDictationReadiness } | { dictation: VoiceDictationView }> {
    return unwrapAsync(this.methods.voiceDictation({ kind, id, pcm, slug, providerId, language }));
  }

  approvalReviewerModel(): Promise<ApprovalReviewerModelView> {
    return unwrapAsync(this.methods.approvalReviewerModel({}));
  }

  approvalReviewerModelSet(model: ModelRoute | null): Promise<ApprovalReviewerModelView> {
    return unwrapAsync(this.methods.approvalReviewerModelSet({ model }));
  }

  idleCompaction(): IdleCompactionView {
    return unwrap(this.methods.idleCompaction({}));
  }

  idleCompactionSet(enabled: boolean): IdleCompactionView {
    return unwrap(this.methods.idleCompactionSet({ enabled }));
  }

  compactionThresholdSet(
    thresholdRatio?: number | null,
    headroomTokens?: number | null,
  ): IdleCompactionView {
    return unwrap(
      this.methods.compactionThresholdSet({
        ...(thresholdRatio === undefined ? {} : { thresholdRatio }),
        ...(headroomTokens === undefined ? {} : { headroomTokens }),
      }),
    );
  }

  idleCompactionCacheLifetimeSet(
    provider: string,
    model: string,
    seconds: number | null,
  ): IdleCompactionView {
    return unwrap(this.methods.idleCompactionCacheLifetimeSet({ provider, model, seconds }));
  }

  standingLimitsSet(slug: string, soul: number, coreMemory: number): { bot: PersonaBotDetail } {
    return unwrap(this.methods.standingLimitsSet({ slug, soul, coreMemory }));
  }

  botAvatarSet(channelId: string, avatar: string | null): { bot: PersonaBotDetail } {
    return unwrap(this.methods.botAvatarSet({ channelId, avatar }));
  }

  partLibraryList(): { parts: PartLibraryEntry[] } {
    return unwrap(this.methods.partLibraryList());
  }

  partLibraryExport(id?: string, part?: unknown): { fileName: string; data: string } {
    return unwrap(
      this.methods.partLibraryExport(
        part !== undefined ? { part } : id === undefined ? {} : { id },
      ),
    );
  }

  partLibraryImport(data: string): {
    added: PartLibraryEntry[];
    refused: { name: string; reason: string }[];
  } {
    return unwrap(this.methods.partLibraryImport({ data }));
  }

  partLibraryImportImage(
    data: string,
    slot: string,
    colors: number,
    name: string,
  ): { entry: PartLibraryEntry } {
    return unwrap(this.methods.partLibraryImportImage({ data, slot, colors, name }));
  }

  partLibraryAdd(part: unknown, name: string, parent?: string): { entry: PartLibraryEntry } {
    return unwrap(this.methods.partLibraryAdd({ part, name, parent }));
  }

  botBannerSet(channelId: string, banner: unknown): { bot: PersonaBotDetail } {
    return unwrap(this.methods.botBannerSet({ channelId, banner }));
  }

  botAppearanceSet(channelId: string, recipe: unknown): { bot: PersonaBotDetail } {
    return unwrap(this.methods.botAppearanceSet({ channelId, recipe }));
  }

  botPrimaryColorSet(channelId: string, primaryColor: unknown): { bot: PersonaBotDetail } {
    return unwrap(this.methods.botPrimaryColorSet({ channelId, primaryColor }));
  }

  async channels(): Promise<{ channels: ChannelListItem[] }> {
    return unwrap(await this.methods.channels({}));
  }

  async channelListChanges(sinceSeq: number, epoch?: string): Promise<ChannelListChanges> {
    return unwrap(await this.methods.channelListChanges({ sinceSeq, epoch }));
  }

  channelDm(slug: string, displayName?: string): { channel: ChannelRecord } {
    return unwrap(this.methods.channelDm({ slug, displayName }));
  }

  channelGet(channelId: string): ChannelManagementResult {
    return unwrap(this.methods.channelGet({ channelId }));
  }

  channelCreate(
    name: string,
    members: string[],
    operationKey?: string,
  ): { channel: ChannelRecord } | ChannelManagementResult {
    return unwrap(this.methods.channelCreate({ name, members, operationKey }));
  }

  channelRename(
    channelId: string,
    name: string,
    expectedChannel?: string,
  ): { channel: ChannelRecord; bot?: PersonaBotDetail } {
    return unwrap(
      this.methods.channelRename({
        channelId,
        name,
        ...(expectedChannel === undefined ? {} : { expectedChannel }),
      }),
    );
  }

  channelGroupAvatarSet(
    channelId: string,
    avatar: string | null,
    expectedChannel?: string,
  ): { channel: ChannelRecord } {
    return unwrap(
      this.methods.channelGroupAvatarSet({
        channelId,
        avatar,
        ...(expectedChannel === undefined ? {} : { expectedChannel }),
      }),
    );
  }

  channelGroupInvite(
    channelId: string,
    botSlug: string,
    operationKey?: string,
    expectedChannel?: string,
  ): { channel: ChannelRecord } | ChannelManagementResult {
    return unwrap(
      this.methods.channelGroupInvite({
        channelId,
        botSlug,
        operationKey,
        expectedChannel,
      }),
    );
  }

  channelGroupInviteCancel(
    channelId: string,
    invitationId: string,
    expectedChannel?: string,
  ): { channel: ChannelRecord } {
    return unwrap(
      this.methods.channelGroupInviteCancel({
        channelId,
        invitationId,
        ...(expectedChannel === undefined ? {} : { expectedChannel }),
      }),
    );
  }

  channelGroupJoinDecide(
    channelId: string,
    requestId: string,
    accept: boolean,
    expectedChannel?: string,
  ): { channel: ChannelRecord } {
    return unwrap(
      this.methods.channelGroupJoinDecide({
        channelId,
        requestId,
        accept,
        ...(expectedChannel === undefined ? {} : { expectedChannel }),
      }),
    );
  }

  channelGroupMemberRemove(
    channelId: string,
    botSlug: string,
    expectedChannel?: string,
  ): { channel: ChannelRecord } {
    return unwrap(
      this.methods.channelGroupMemberRemove({
        channelId,
        botSlug,
        ...(expectedChannel === undefined ? {} : { expectedChannel }),
      }),
    );
  }

  channelGroupSendReview(channelId: string, enabled?: boolean): { enabled: boolean } {
    return unwrap(this.methods.channelGroupSendReview({ channelId, enabled }));
  }

  channelGroupWakePolicies(channelId: string): {
    members: GroupMemberWakePolicy[];
  } {
    return unwrap(this.methods.channelGroupWakePolicies({ channelId }));
  }

  channelGroupWakeSet(
    channelId: string,
    botSlug: string,
    mode: 'all' | 'mentions' | 'digest' | 'silent',
    count: number,
    intervalSeconds: number,
    inherit?: boolean,
    expectedChannel?: string,
  ): { channel: ChannelRecord } {
    return unwrap(
      this.methods.channelGroupWakeSet({
        channelId,
        botSlug,
        mode,
        count,
        intervalSeconds,
        ...(inherit === undefined ? {} : { inherit }),
        ...(expectedChannel === undefined ? {} : { expectedChannel }),
      }),
    );
  }

  ping() {
    return unwrap(this.methods.ping({}));
  }

  humanIdentity() {
    return unwrap(this.methods.humanIdentity({}));
  }

  composerIdentity() {
    return unwrap(this.methods.composerIdentity({}));
  }

  composerValidate(channelId: string, attachments: ChannelAttachmentRef[], replyTo?: string) {
    return unwrap(
      this.methods.composerValidate({
        channelId,
        attachments,
        ...(replyTo === undefined ? {} : { replyTo }),
      }),
    );
  }

  channelHumanNameSet(channelId: string, nickname: string | null) {
    return unwrap(this.methods.channelHumanNameSet({ channelId, nickname }));
  }

  humanNameSet(displayName: string | null) {
    return unwrap(this.methods.humanNameSet({ displayName }));
  }

  channelGroupDelete(channelId: string): { deleted: boolean } & GroupDisbandResult {
    return unwrap(this.methods.channelGroupDelete({ channelId }));
  }

  channelHistory(): { channels: ChannelHistoryItem[] } {
    return unwrap(this.methods.channelHistory({}));
  }
  channelHistorySources(
    channelId: string,
    before?: string,
  ): { sources: PurgeSource[]; before?: string } {
    return unwrap(
      this.methods.channelHistorySources({
        channelId,
        ...(before === undefined ? {} : { before }),
      }),
    );
  }
  storageUsage(): StorageUsage {
    return unwrap(this.methods.storageUsage({}));
  }
  storageCleanupPreview(
    before: string,
    channelIds?: string[],
    kinds?: StorageMediaKind[],
  ): MediaCleanupPreview {
    return unwrap(
      this.methods.storageCleanupPreview({
        before,
        ...(channelIds === undefined ? {} : { channelIds }),
        ...(kinds === undefined ? {} : { kinds }),
      }),
    );
  }
  storageCleanupConfirm(
    before: string,
    channelIds: string[] | undefined,
    kinds: StorageMediaKind[] | undefined,
    token: string,
  ): MediaCleanupResult {
    return unwrap(
      this.methods.storageCleanupConfirm({
        before,
        ...(channelIds === undefined ? {} : { channelIds }),
        ...(kinds === undefined ? {} : { kinds }),
        token,
      }),
    );
  }
  storageMessagesCleanupPreview(before: string, channelIds?: string[]): TextCleanupPreview {
    return unwrap(
      this.methods.storageMessagesCleanupPreview({
        before,
        ...(channelIds === undefined ? {} : { channelIds }),
      }),
    );
  }
  storageMessagesCleanupConfirm(
    before: string,
    channelIds: string[] | undefined,
    token: string,
  ): TextCleanupResult {
    return unwrap(
      this.methods.storageMessagesCleanupConfirm({
        before,
        ...(channelIds === undefined ? {} : { channelIds }),
        token,
      }),
    );
  }
  channelPurgePreview(channelId: string, sourceEventIds: string[]): PurgePreview {
    return unwrap(this.methods.channelPurgePreview({ channelId, sourceEventIds }));
  }
  channelPurgeConfirm(
    channelId: string,
    sourceEventIds: string[],
    token: string,
  ): { accepted: number } {
    return unwrap(this.methods.channelPurgeConfirm({ channelId, sourceEventIds, token }));
  }

  channelMessages(
    channelId: string,
    before?: string,
    limit?: number,
  ): { messages: ChannelMessage[]; revision: number } {
    return unwrap(this.methods.channelMessages({ channelId, before, limit }));
  }

  channelTimeline(
    channelId: string,
    direction?: TimelineDirection,
    cursor?: string,
    around?: string,
    limit?: number,
    olderLimit?: number,
    newerLimit?: number,
  ): { page: ChannelTimelinePage; revision: number } {
    return unwrap(
      this.methods.channelTimeline({
        channelId,
        direction,
        cursor,
        around,
        limit,
        olderLimit,
        newerLimit,
      }),
    );
  }

  channelReadPosition(channelId: string): { position?: ChannelReadPosition } {
    return unwrap(this.methods.channelReadPosition({ channelId }));
  }

  async channelMarkAllRead(channelId?: string, botSlug?: string): Promise<{ channels: number }> {
    return unwrap(await this.methods.channelMarkAllRead({ channelId, botSlug }));
  }
  async channelMarkRead(
    channelId: string,
    messageId: string,
  ): Promise<{ position: ChannelReadPosition }> {
    return unwrap(await this.methods.channelMarkRead({ channelId, messageId }));
  }

  channelReact(
    channelId: string,
    messageId: string,
    emoji: string,
    active: boolean,
  ): { reactions: ChannelReaction[] } {
    return unwrap(this.methods.channelReact({ channelId, messageId, emoji, active }));
  }

  channelSearch(
    channelId: string,
    text: string,
    cursor?: string,
    limit?: number,
  ): { messages: ChannelMessage[]; nextCursor?: string } {
    return unwrap(this.methods.channelSearch({ channelId, text, cursor, limit }));
  }

  messageSearch(text: string, cursor?: string, limit?: number): HumanMessageSearchPage {
    return unwrap(this.methods.messageSearch({ text, cursor, limit }));
  }

  channelAllBotPreview(channelId: string): AllBotPreview {
    return unwrap(this.methods.channelAllBotPreview({ channelId }));
  }
  channelSendStatus(channelId: string, messageId: string): ChannelSendStatus {
    return unwrap(this.methods.channelSendStatus({ channelId, messageId }));
  }

  async channelSend(
    channelId: string,
    body: string,
    replyTo?: string,
    attachments?: ChannelAttachmentRef[],
    messageId?: string,
    memorySwitchTarget?: string,
    mentions?: ChannelMessage['mentions'],
    channelRefs?: ChannelMessage['channelRefs'],
    grantRequestResolution?: ChannelMessage['grantRequestResolution'],
    assignmentReply?: ChannelMessage['assignmentReply'],
    allBotMention?: AllBotMention,
  ): Promise<{ message: ChannelMessage }> {
    return unwrap(
      await this.methods.channelSend({
        channelId,
        body,
        ...(allBotMention === undefined ? {} : { allBotMention }),
        ...(replyTo === undefined ? {} : { replyTo }),
        ...(attachments === undefined ? {} : { attachments }),
        ...(messageId === undefined ? {} : { messageId }),
        ...(memorySwitchTarget === undefined ? {} : { memorySwitchTarget }),
        ...(mentions === undefined ? {} : { mentions }),
        ...(channelRefs === undefined ? {} : { channelRefs }),
        ...(grantRequestResolution === undefined ? {} : { grantRequestResolution }),
        ...(assignmentReply === undefined ? {} : { assignmentReply }),
      }),
    );
  }

  botAttention(
    slug: string,
    limit?: number,
    cursor?: string,
    state?: BotAttentionState,
  ): BotAttentionPage {
    return unwrap(this.methods.botAttention({ slug, limit, cursor, state }));
  }

  botSourcePolicies(slug: string): { policies: BotSourcePolicy[] } {
    return unwrap(this.methods.botSourcePolicies({ slug }));
  }

  botSourcePolicySet(
    slug: string,
    wake: 'conditional' | 'immediate' | 'digest' | 'mentions' | 'silent',
    sourceClass?: 'assignment-report' | 'group-ordinary' | 'human-dm' | 'bot-dm' | 'group-mention',
    digestCount?: number,
    digestIntervalSeconds?: number,
    delivery?: 'steer' | 'turn',
  ): { policy: BotSourcePolicy } {
    return unwrap(
      this.methods.botSourcePolicySet({
        slug,
        wake,
        sourceClass,
        digestCount,
        digestIntervalSeconds,
        delivery,
      }),
    );
  }

  botSourcePolicyReset(
    slug: string,
    sourceClass?: 'assignment-report' | 'group-ordinary' | 'human-dm' | 'bot-dm' | 'group-mention',
  ): { policy: BotSourcePolicy } {
    return unwrap(this.methods.botSourcePolicyReset({ slug, sourceClass }));
  }

  channelActivityToday(): ChannelActivityToday {
    return unwrap(this.methods.channelActivityToday({}));
  }

  activityOverview() {
    return unwrap(this.methods.activityOverview({}));
  }

  humanAttention(
    category?: HumanAttentionCategory,
    botSlug?: string,
    channelId?: string,
    limit?: number,
    cursor?: string,
    sort?: 'newest' | 'oldest' | 'mentions-first',
    snoozed?: boolean,
    kind?: 'auto-rejection',
    search?: string,
    unreadOnly?: boolean,
    queryVersion?: number,
    dismissed?: boolean,
    notifications?: boolean,
  ): HumanAttentionPage {
    return unwrap(
      this.methods.humanAttention({
        category,
        botSlug,
        channelId,
        limit,
        cursor,
        sort,
        snoozed,
        kind,
        search,
        unreadOnly,
        queryVersion,
        dismissed,
        notifications,
      }),
    );
  }
  humanAttentionStatus(messageCounts?: boolean): HumanAttentionStatus {
    return unwrap(this.methods.humanAttentionStatus({ messageCounts }));
  }
  channelUnreadCounts(): {
    channels: Array<{ channelId: string; unreadCount: number }>;
  } {
    return unwrap(this.methods.channelUnreadCounts({}));
  }
  humanAssignmentContext(
    slug: string,
    sessionId: string,
    sourceEventId: string,
  ): { context: HumanAssignmentContext } {
    return unwrap(this.methods.humanAssignmentContext({ slug, sessionId, sourceEventId }));
  }
  humanAttentionDismiss(itemId: string, sourceKey: string): { accepted: boolean } {
    return unwrap(this.methods.humanAttentionDismiss({ itemId, sourceKey }));
  }
  humanAttentionRestore(itemId: string, sourceKey: string): { accepted: boolean } {
    return unwrap(this.methods.humanAttentionRestore({ itemId, sourceKey }));
  }
  async humanAttentionDismissAll(
    kind?: string,
    category?: string,
    botSlug?: string,
    channelId?: string,
  ): Promise<{ accepted: boolean; dismissed: number; read: number; more: boolean }> {
    return unwrap(
      await this.methods.humanAttentionDismissAll({ kind, category, botSlug, channelId }),
    );
  }
  humanAttentionIgnore(sourceEventId: string): { accepted: boolean } {
    return unwrap(this.methods.humanAttentionIgnore({ sourceEventId }));
  }
  humanAttentionSnooze(
    itemId: string,
    sourceKey: string,
    until: string | null,
  ): { accepted: boolean } {
    return unwrap(this.methods.humanAttentionSnooze({ itemId, sourceKey, until }));
  }

  assignments(
    slug: string,
    query?: string,
    activity?: AssignmentActivity[],
    includeArchived?: boolean,
    limit?: number,
    cursor?: string,
  ): { assignments: AssignmentSummary[]; nextCursor?: string } {
    return unwrap(
      this.methods.assignments({
        slug,
        query,
        activity,
        includeArchived,
        limit,
        cursor,
      }),
    );
  }

  channelAssignments(channelId: string): {
    assignments: ChannelAssignmentSummary[];
  } {
    return unwrap(this.methods.channelAssignments({ channelId }));
  }

  assignment(slug: string, sessionId: string): { assignment: AssignmentDetail } {
    return unwrap(this.methods.assignment({ slug, sessionId }));
  }

  assignmentTimeline(
    slug: string,
    sessionId: string,
  ): Promise<{
    assignment: AssignmentDetail;
    lanes: AssignmentTimelineLane[];
    omittedSubagents: number;
  }> {
    return unwrapAsync(this.methods.assignmentTimeline({ slug, sessionId }));
  }

  sessionSubagents(
    slug: string,
    sessionId: string,
  ): Promise<{
    sessionId: string;
    role: SessionRootRole;
    lanes: AssignmentTimelineLane[];
    omittedSubagents: number;
  }> {
    return unwrapAsync(this.methods.sessionSubagents({ slug, sessionId }));
  }

  workspaceOptions(): {
    workspaces: { id: string; path: string; title: string }[];
  } {
    return unwrap(this.methods.workspaceOptions({}));
  }

  channelMediaTarget(
    channelId: string,
    sourceEventId: string,
    attachmentId: string,
  ): Promise<{ target: MemoryFileTarget }> {
    return unwrapAsync(
      this.methods.channelMediaTarget({
        channelId,
        sourceEventId,
        attachmentId,
      }),
    );
  }

  messageAttachmentTarget(
    channelId: string,
    messageId: string,
    fileId: string,
  ): { target: MemoryFileTarget } {
    return unwrap(this.methods.messageAttachmentTarget({ channelId, messageId, fileId }));
  }

  folderBrowse(path?: string, offset?: number): Promise<FolderListing> {
    return unwrapAsync(
      this.methods.folderBrowse({
        ...(path === undefined ? {} : { path }),
        ...(offset === undefined ? {} : { offset }),
      }),
    );
  }

  workspaceFileTarget(
    slug: string,
    grantId: string,
  ): { target: { path: string; relativePath: ''; kind: 'directory' } } {
    return unwrap(this.methods.workspaceFileTarget({ slug, grantId }));
  }

  grants(slug: string, scope?: { channelId: string; path: string }): { grants: WorkspaceGrant[] } {
    return unwrap(this.methods.grants({ slug, ...(scope === undefined ? {} : { scope }) }));
  }

  grantCreate(
    slug: string,
    workspaceId: string,
    scope?: { channelId: string; path: string },
  ): Promise<{ grant: WorkspaceGrant; created?: boolean }> {
    return unwrapAsync(
      this.methods.grantCreate({
        slug,
        workspaceId,
        ...(scope === undefined ? {} : { scope }),
      }),
    );
  }

  grantRevoke(slug: string, grantId: string): { grant: WorkspaceGrant } {
    return unwrap(this.methods.grantRevoke({ slug, grantId }));
  }

  grantRequestApprove(
    slug: string,
    channelId: string,
    requestMessageId: string,
    workspaceId: string,
    acknowledgeReadWrite: boolean,
  ) {
    this.requirePrivateOwner('Workspace authorization requires the authenticated Owner');
    return unwrapAsync(
      this.methods.grantRequestApprove({
        slug,
        channelId,
        requestMessageId,
        workspaceId,
        acknowledgeReadWrite,
      }),
    );
  }

  grantWriteSet(slug: string, grantId: string, enabled: boolean): { grant: WorkspaceGrant } {
    return unwrap(this.methods.grantWriteSet({ slug, grantId, enabled }));
  }

  assignmentAccessGet(slug: string): { preset: AssignmentAccessPreset } {
    return unwrap(this.methods.assignmentAccessGet({ slug }));
  }

  assignmentAccessSet(
    slug: string,
    mode: AssignmentAccessMode,
    acknowledgeRisk: boolean,
    scope?: 'chat' | 'assignments',
  ): { preset: AssignmentAccessPreset } {
    return unwrap(this.methods.assignmentAccessSet({ slug, mode, acknowledgeRisk, scope }));
  }

  toolApprovalRules(slug: string): { rules: ToolApprovalRule[] } {
    return unwrap(this.methods.toolApprovalRules({ slug }));
  }

  toolApprovalRuleRevoke(slug: string, id: string): { rule: ToolApprovalRule } {
    return unwrap(this.methods.toolApprovalRuleRevoke({ slug, id }));
  }

  toolApprovalHistory(
    slug: string,
    page?: { cursor?: string; limit?: number },
  ): { entries: ToolApprovalHistoryEntry[]; nextCursor?: string } {
    return unwrap(this.methods.toolApprovalHistory({ slug, ...page }));
  }

  toolApprovalStatus(
    channelId: string,
    messageId: string,
  ): {
    status: 'pending' | 'expired' | 'stopped';
    execution?: 'waiting-human' | 'waiting-capacity' | 'running' | 'settled' | 'needs-repair';
  } {
    return unwrap(this.methods.toolApprovalStatus({ channelId, messageId }));
  }

  toolApprovalDecide(
    channelId: string,
    messageId: string,
    outcome:
      | 'allowed-once'
      | 'allowed-always-tool'
      | 'allowed-always-exact'
      | 'allowed-always-all'
      | 'rejected',
  ): Promise<{ accepted: boolean }> {
    return unwrapAsync(this.methods.toolApprovalDecide({ channelId, messageId, outcome }));
  }

  toolAutoRejectionOverride(
    itemId: string,
  ): Promise<{ accepted: true; channelId: string; messageId: string }> {
    return unwrapAsync(this.methods.toolAutoRejectionOverride({ itemId }));
  }

  userQuestionStatus(
    channelId: string,
    messageId: string,
  ): { status: 'pending' | 'submitted' | 'answered' | 'expired' } {
    return unwrap(this.methods.userQuestionStatus({ channelId, messageId }));
  }

  userQuestionAnswer(
    channelId: string,
    messageId: string,
    answer: { answers: { id: string; selected: string[]; custom?: string }[] },
  ): Promise<{ accepted: boolean }> {
    return unwrapAsync(this.methods.userQuestionAnswer({ channelId, messageId, answer }));
  }

  sessions(slug: string): { sessions: OwnedSessionSummary[] } {
    return unwrap(this.methods.sessions({ slug }));
  }

  botToolTrace(
    slug: string,
    sessionId?: string,
    turns?: number,
  ): Promise<{ slug: string; sessionId: string; turns: TurnTrace[] }> {
    return unwrapAsync(
      this.methods.botToolTrace({
        slug,
        ...(sessionId === undefined ? {} : { sessionId }),
        ...(turns === undefined ? {} : { turns }),
      }),
    );
  }

  botTools(): { sessionId: 'direct'; tools: DirectBotToolSpec[] } {
    return unwrap(this.methods.botTools({}));
  }

  catalogView(): { catalog: unknown } {
    this.requirePrivateOwner('Catalog view requires the authenticated Owner');
    return unwrap(this.methods.catalogView({}));
  }

  catalogOpen(entryRef: string): { catalog: unknown } {
    this.requirePrivateOwner('Catalog view requires the authenticated Owner');
    return unwrap(this.methods.catalogOpen({ entryRef }));
  }

  botToolRun(
    slug: string,
    tool: string,
    args?: Record<string, unknown>,
    sessionId?: string,
    sourceEventId?: string,
  ): Promise<{
    slug: string;
    tool: string;
    sessionId: 'direct';
    result: unknown;
  }> {
    return unwrapAsync(
      this.methods.botToolRun({
        slug,
        tool,
        ...(args === undefined ? {} : { args }),
        ...(sessionId === undefined ? {} : { sessionId }),
        ...(sourceEventId === undefined ? {} : { sourceEventId }),
      }),
    );
  }

  sessionArchiveSet(
    slug: string,
    sessionId: string,
    archived: boolean,
  ): Promise<{ archived: boolean }> {
    return unwrapAsync(this.methods.sessionArchiveSet({ slug, sessionId, archived }));
  }

  memoryMove(
    slug: string,
    location: string | null,
  ): Promise<{ memoryDir: string; moved: boolean; leftover?: string }> {
    return unwrapAsync(this.methods.memoryMove({ slug, location }));
  }

  sessionOwner(sessionId: string): { owner: OwnedSessionBot | null } {
    return unwrap(this.methods.sessionOwner({ sessionId }));
  }

  botSessionIds(): {
    sessionIds: string[];
    groups: { botSlug: string; displayName: string; sessionIds: string[] }[];
  } {
    return unwrap(this.methods.botSessionIds({}));
  }

  memoryFileTarget(slug: string, path: string): { target: MemoryFileTarget } {
    return unwrap(this.methods.memoryFileTarget({ slug, path }));
  }

  memorySnapshot(channelId: string): { snapshot: MemoryAcceptedSnapshot } {
    return unwrap(this.methods.memorySnapshot({ channelId }));
  }

  memoryFile(
    channelId: string,
    path: string,
  ): {
    file?: {
      path: string;
      body: string;
      head: string;
      binary?: boolean;
      image?: import('../memory/image.js').MemoryImage;
      markdown?: import('../memory/markdown.js').MemoryMarkdown;
    };
  } {
    return unwrap(this.methods.memoryFile({ channelId, path }));
  }

  memoryHistory(channelId: string): { commits: MemoryAcceptedCommit[] } {
    return unwrap(this.methods.memoryHistory({ channelId }));
  }

  memoryDiff(channelId: string, sha: string): { sha: string; diff: string } {
    return unwrap(this.methods.memoryDiff({ channelId, sha }));
  }

  memoryGitGraph(channelId: string, offset: number): MemoryGitGraph {
    return unwrap(this.methods.memoryGitGraph({ channelId, offset }));
  }

  memoryGitCommitDiff(channelId: string, sha: string): MemoryGitCommitDiff {
    return unwrap(this.methods.memoryGitCommitDiff({ channelId, sha }));
  }

  memoryWorkingChanges(channelId: string): { changes: MemoryWorkingChange[] } {
    return unwrap(this.methods.memoryWorkingChanges({ channelId }));
  }

  memoryWorkingDiff(channelId: string, path: string, kind: MemoryWorkingKind): MemoryWorkingDiff {
    return unwrap(this.methods.memoryWorkingDiff({ channelId, path, kind }));
  }

  memoryRecoveryHistory(channelId: string): {
    checkpoints: MemoryRecoveryCheckpoint[];
  } {
    return unwrap(this.methods.memoryRecoveryHistory({ channelId }));
  }

  memoryRestore(
    channelId: string,
    checkpointId: string,
    expectedCurrentId: string,
  ): {
    checkpoint: MemoryRecoveryCheckpoint;
    archivePath: string;
  } {
    return unwrap(
      this.methods.memoryRestore({
        channelId,
        checkpointId,
        expectedCurrentId,
      }),
    );
  }

  memoryRestoreCommit(
    channelId: string,
    sha: string,
    expectedHead: string,
    restoreId: string,
    name?: string,
  ): {
    head: string;
    backup: string | null;
    version: MemoryVersionName | null;
    saved: MemoryRecoveryCheckpoint;
  } {
    return unwrap(
      this.methods.memoryRestoreCommit({
        channelId,
        sha,
        expectedHead,
        restoreId,
        name,
      }),
    );
  }

  memoryNameVersion(channelId: string, sha: string, name: string): { version: MemoryVersionName } {
    return unwrap(this.methods.memoryNameVersion({ channelId, sha, name }));
  }

  memoryVersions(channelId: string): { versions: MemoryVersion[] } {
    return unwrap(this.methods.memoryVersions({ channelId }));
  }

  memoryRemoveVersionName(channelId: string, tag: string): { removed: true } {
    return unwrap(this.methods.memoryRemoveVersionName({ channelId, tag }));
  }

  memorySave(
    channelId: string,
    path: string,
    body: string,
    expectedHead: string,
    editId: string,
  ): { commit: MemoryAcceptedCommit } {
    return unwrap(this.methods.memorySave({ channelId, path, body, expectedHead, editId }));
  }

  memoryRepair(
    channelId: string,
    expectedHead: string,
    repairId: string,
  ): { repair: MemoryRepairEvent } {
    return unwrap(this.methods.memoryRepair({ channelId, expectedHead, repairId }));
  }

  overviewMemory(after?: string): Promise<OverviewMemory> {
    return unwrapAsync(this.methods.overviewMemory({ after }));
  }

  overviewUsage(period: UsageOverviewPeriod, after?: string): OverviewUsage {
    return unwrap(this.methods.overviewUsage({ period, after }));
  }
  profileUsage(channelId: string, filter: UsageFilter): UsageQueryResult {
    return unwrap(this.methods.profileUsage({ channelId, filter }));
  }

  profileActivity(channelId: string, before?: string, weeks?: number): ProfileActivity {
    return unwrap(this.methods.profileActivity({ channelId, before, weeks }));
  }

  async profileSessionUsage(channelId: string): Promise<ProfileSessionUsage> {
    return unwrap(await this.methods.profileSessionUsage({ channelId }));
  }

  groupProfileActivity(channelId: string): GroupProfileActivity {
    return unwrap(this.methods.groupProfileActivity({ channelId }));
  }

  rosterGet(): RosterSnapshot {
    return unwrap(this.methods.rosterGet({}));
  }

  sectionCreate(name: string): Promise<{ section: RosterSection }> {
    return unwrapAsync(this.methods.sectionCreate({ name }));
  }

  sectionRename(sectionId: string, name: string): Promise<{ section: RosterSection }> {
    return unwrapAsync(this.methods.sectionRename({ sectionId, name }));
  }

  sectionRemove(sectionId: string): Promise<{ removed: boolean }> {
    return unwrapAsync(this.methods.sectionRemove({ sectionId }));
  }

  channelAssign(
    channelId: string,
    sectionId?: string | null,
    index?: number,
  ): Promise<Record<string, never>> {
    return unwrapAsync(this.methods.channelAssign({ channelId, sectionId, index }));
  }

  sectionReorder(order: string[]): Promise<{ sectionOrder: string[] }> {
    return unwrapAsync(this.methods.sectionReorder({ order }));
  }

  topReorder(order: TopOrderEntry[]): Promise<{ topOrder: TopOrderEntry[] }> {
    return unwrapAsync(this.methods.topReorder({ order }));
  }

  pinsSet(pins: string[]): Promise<{ pins: string[] }> {
    return unwrapAsync(this.methods.pinsSet({ pins }));
  }

  hiddenSet(hidden: string[]): Promise<{ hidden: string[] }> {
    return unwrapAsync(this.methods.hiddenSet({ hidden }));
  }
  channelMuteSet(channelId: string, muted: boolean): Promise<{ muted: string[] }> {
    return unwrapAsync(this.methods.channelMuteSet({ channelId, muted }));
  }

  rosterBatch(
    action: 'pin' | 'unpin' | 'hide' | 'move',
    channelIds: string[],
    sectionId?: string | null,
  ): Promise<RosterSnapshot> {
    return unwrapAsync(this.methods.rosterBatch({ action, channelIds, sectionId }));
  }

  developerModeSet(enabled: boolean): { accepted: boolean } {
    return unwrap(this.methods.developerModeSet({ enabled }));
  }

  async marketplaceList(query?: MarketplaceQuery): Promise<MarketplacePage> {
    return unwrapAsync(this.methods.marketplaceList(query ?? {}));
  }

  async marketplaceSubmit(url: string, altcha: string): Promise<{ bot: MarketplaceEntry }> {
    return unwrapAsync(this.methods.marketplaceSubmit({ url, altcha }));
  }

  async marketplaceChallenge(): Promise<AltchaChallenge> {
    return unwrapAsync(this.methods.marketplaceChallenge());
  }

  async marketplaceReport(
    id: string,
    altcha: string,
    reason?: string,
  ): Promise<{ received: true }> {
    return unwrapAsync(
      this.methods.marketplaceReport({
        id,
        altcha,
        ...(reason === undefined ? {} : { reason }),
      }),
    );
  }

  async marketplaceTopics(): Promise<MarketplaceTopic[]> {
    return unwrapAsync(this.methods.marketplaceTopics());
  }

  async marketplaceSections(
    lang?: MarketplaceLanguage,
  ): Promise<{ sections: MarketplaceSection[] }> {
    return unwrapAsync(this.methods.marketplaceSections(lang === undefined ? {} : { lang }));
  }

  async marketplaceDigests(
    lang?: MarketplaceLanguage,
  ): Promise<{ digests: MarketplaceDigestSummary[] }> {
    return unwrapAsync(this.methods.marketplaceDigests(lang === undefined ? {} : { lang }));
  }

  async marketplaceDigest(
    day?: string,
    lang?: MarketplaceLanguage,
  ): Promise<{ digest: MarketplaceDigest }> {
    return unwrapAsync(
      this.methods.marketplaceDigest({
        ...(day === undefined ? {} : { day }),
        ...(lang === undefined ? {} : { lang }),
      }),
    );
  }

  async marketplaceDetail(id: string, lang?: MarketplaceLanguage): Promise<MarketplaceDetail> {
    return unwrapAsync(this.methods.marketplaceDetail(lang === undefined ? { id } : { id, lang }));
  }

  async marketplaceFileView(id: string, path: string): Promise<MarketplaceFileView> {
    return unwrapAsync(this.methods.marketplaceFileView({ id, path }));
  }

  async marketplaceAccount(): Promise<MarketplaceAccount> {
    return unwrapAsync(this.methods.marketplaceAccount());
  }

  async marketplaceAuthorSave(
    displayName: string,
    acceptTerms?: boolean,
  ): Promise<MarketplaceAuthorAccount> {
    return unwrapAsync(this.methods.marketplaceAuthorSave({ displayName, acceptTerms }));
  }

  async marketplaceAuthorAvatarSet(avatar: string | null): Promise<MarketplaceAuthorAccount> {
    return unwrapAsync(this.methods.marketplaceAuthorAvatarSet({ avatar }));
  }

  marketplaceUploadPlan(slug: string): UploadPlan {
    return unwrap(this.methods.marketplaceUploadPlan({ slug }));
  }

  async marketplaceUpload(
    slug: string,
    displayName: string,
    bio?: string,
    tags?: string[],
    replaces?: string,
  ): Promise<{ bot: MarketplaceEntry; skipped: UploadPlan['skipped'] }> {
    return unwrapAsync(
      this.methods.marketplaceUpload({
        slug,
        displayName,
        bio,
        tags,
        replaces,
      }),
    );
  }

  async marketplaceMine(lang?: MarketplaceLanguage): Promise<{ bots: MarketplaceAuthoredBot[] }> {
    return unwrapAsync(this.methods.marketplaceMine(lang === undefined ? {} : { lang }));
  }

  async marketplaceDelete(id: string): Promise<{ deleted: true }> {
    return unwrapAsync(this.methods.marketplaceDelete({ id }));
  }

  async marketplaceInstallReview(id: string, lang?: 'en' | 'zh'): Promise<InstallReviewResult> {
    return unwrapAsync(
      this.methods.marketplaceInstallReview(lang === undefined ? { id } : { id, lang }),
    );
  }

  shareDraftStart(slug: string): ShareDraftView {
    return unwrap(this.methods.shareDraftStart({ slug }));
  }

  shareDraftGet(slug: string): ShareDraftView {
    return unwrap(this.methods.shareDraftGet({ slug }));
  }

  shareDraftFile(slug: string, path: string): { path: string; kind: string; text?: string } {
    return unwrap(this.methods.shareDraftFile({ slug, path }));
  }

  shareDraftDecide(
    slug: string,
    path: string,
    decision: 'keep' | 'drop' | 'rewrite',
    text?: string,
  ): ShareDraftView {
    return unwrap(this.methods.shareDraftDecide({ slug, path, decision, text }));
  }

  shareDraftFinish(slug: string): ShareDraftView {
    return unwrap(this.methods.shareDraftFinish({ slug }));
  }

  shareDraftDiscard(slug: string): { discarded: boolean } {
    return unwrap(this.methods.shareDraftDiscard({ slug }));
  }

  async shareDraftExport(slug: string): Promise<{ path: string; files: number }> {
    return unwrapAsync(this.methods.shareDraftExport({ slug }));
  }

  async marketplaceInstall(
    id: string,
    reviewId: string,
    operationKey?: string,
    source?: MarketplaceInstallSource,
  ): Promise<{
    bot: PersonaBotDetail;
    channelId: string;
    receipt?: BotCreationReceipt;
    listing: MarketplaceEntry;
  }> {
    return unwrapAsync(this.methods.marketplaceInstall({ id, reviewId, operationKey, source }));
  }

  async releaseInfo(since?: string): Promise<ReleaseInfo> {
    return unwrap(this.methods.releaseInfo(since === undefined ? {} : { since }));
  }

  async releaseUpdate(force?: boolean): Promise<ReleaseUpdate> {
    return unwrapAsync(this.methods.releaseUpdate({ force }));
  }

  async releaseInstall(version: string): Promise<ReleaseInstall> {
    return unwrapAsync(this.methods.releaseInstall({ version }));
  }

  async releaseRestart(): Promise<ReleaseRestart> {
    return unwrapAsync(this.methods.releaseRestart({}));
  }

  async pluginUpdates(force?: boolean): Promise<PluginUpdates> {
    return unwrapAsync(this.methods.pluginUpdates({ force }));
  }

  async pluginInstall(name: string, version: string): Promise<PluginInstall> {
    return unwrapAsync(this.methods.pluginInstall({ name, version }));
  }

  async pluginRestart(): Promise<PluginRestart> {
    return unwrapAsync(this.methods.pluginRestart({}));
  }

  telemetryStatus(): TelemetryStatus {
    return unwrap(this.methods.telemetryStatus());
  }

  gitStatus(): GitStatus {
    return unwrap(this.methods.gitStatus());
  }

  gitInstall(): GitStatus {
    return unwrap(this.methods.gitInstall());
  }

  telemetrySet(enabled: boolean): TelemetryStatus {
    return unwrap(this.methods.telemetrySet({ enabled }));
  }

  takeoverList(query: {
    slug?: string;
    channelId?: string;
    pendingOnly?: boolean;
    limit?: number;
  }): { takeovers: TakeoverHandoff[] } {
    return unwrap(this.methods.takeoverList(query ?? {}));
  }

  takeoverStatus(channelId: string, messageId: string): { takeover: TakeoverHandoff } {
    return unwrap(this.methods.takeoverStatus({ channelId, messageId }));
  }

  async takeoverRequest(
    slug: string,
    input: { channelId?: string; target: string; title: string; message: string; minutes?: number },
  ): Promise<{ takeover: TakeoverHandoff }> {
    return unwrapAsync(this.methods.takeoverRequest({ ...input, slug }));
  }

  async takeoverComplete(
    channelId: string,
    messageId: string,
    outcome: 'done' | 'failed',
    surface?: string,
  ): Promise<{ takeover: TakeoverHandoff }> {
    return unwrapAsync(this.methods.takeoverComplete({ channelId, messageId, outcome, surface }));
  }

  async takeoverCancel(
    channelId: string,
    messageId: string,
    surface?: string,
    bot?: string,
  ): Promise<{ takeover: TakeoverHandoff }> {
    return unwrapAsync(
      this.methods.takeoverCancel({
        channelId,
        messageId,
        surface,
        ...(bot === undefined ? {} : { bot }),
      }),
    );
  }

  scheduleList(slug: string): { schedules: BotSchedule[] } {
    return unwrap(this.methods.scheduleList({ slug }));
  }

  scheduleCreate(slug: string, input: BotScheduleInput): { schedule: BotSchedule } {
    return unwrap(this.methods.scheduleCreate({ ...input, slug }));
  }

  scheduleUpdate(slug: string, id: string, change: BotScheduleChange): { schedule: BotSchedule } {
    return unwrap(this.methods.scheduleUpdate({ ...change, slug, id }));
  }

  scheduleDelete(slug: string, id: string): { removed: boolean } {
    return unwrap(this.methods.scheduleDelete({ slug, id }));
  }

  scheduleHistory(slug: string, id: string): { firings: BotScheduleFiring[] } {
    return unwrap(this.methods.scheduleHistory({ slug, id }));
  }

  scheduleRunNow(slug: string, id: string): { firing: BotScheduleFiring } {
    return unwrap(this.methods.scheduleRunNow({ slug, id }));
  }

  schedulePreview(trigger: BotScheduleTrigger): { occurrences: string[] } {
    return unwrap(this.methods.schedulePreview({ trigger }));
  }
}

markRemoteMethods(BotharnessBridgeService.prototype, [
  'privateInputStatus',
  'privateInputSubmit',
  'privateInputCancel',
  'privateAccountStatus',
  'privateInputReplace',
  'privateAccountRevoke',
  'privateAccounts',
  'privateMcpServerRemove',
  'privateMcpServerEnable',
  'messagingDefaults',
  'messagingDefaultsSet',
  'channelBridges',
  'channelBridge',
  'channelIngests',
  'channelIngest',
  'messagingChannelTarget',
  'messagingReceive',
  'messagingGroupPolicy',
  'messagingThreadPolicy',
  'messagingSource',
  'messagingIdentity',
  'approvalRoute',
  'approvalTest',
  'approvalRetry',
  'questionRetry',
  'failureAlertsSet',
  'failureAlertsTest',
  'failureAlertsRetry',
  'pairingReview',
  'senderAccess',
  'cloudConnections',
  'cloudWork',
  'messagingApps',
  'messagingSnapshot',
  'messagingTargets',
  'messagingReachable',
  'messagingPostConversation',
  'messagingPostRequest',
  'messagingPostLimit',
  'messagingAuthorize',
  'messagingRevoke',
  'messagingConversation',
  'messagingSend',
  'tobHome',
  'onboarding',
  'onboardingModel',
  'telemetryEvent',
  'modelPlanInherit',
  'channelRetry',
  'botNewSession',
  'botCompact',
  'botContext',
  'botSystemPrompt',
  'botTurnInput',
  'channelBotStop',
  'sessionStop',
  'botStop',
  'modelCatalog',
  'modelPresets',
  'modelPresetCreate',
  'modelPresetUpdate',
  'modelPresetApply',
  'modelPlan',
  'modelPlanCustomize',
  'modelPlanAssignmentsSet',
  'modelPlanSet',
  'list',
  'activitySnapshot',
  'get',
  'create',
  'createLookup',
  'zipUploadBegin',
  'zipUploadChunk',
  'zipUploadPreview',
  'zipImportLookup',
  'zipImport',
  'botImportPreview',
  'botImportLookup',
  'createFromGit',
  'update',
  'dataResetPreview',
  'dataResetConfirm',
  'deletionPreview',
  'deletionConfirm',
  'deletionRetry',
  'deletionMemoryFolder',
  'pause',
  'resume',
  'channels',
  'ping',
  'humanIdentity',
  'composerIdentity',
  'composerValidate',
  'humanNameSet',
  'channelHumanNameSet',
  'channelDm',
  'channelGet',
  'channelCreate',
  'channelRename',
  'channelGroupAvatarSet',
  'channelGroupInvite',
  'channelGroupInviteCancel',
  'channelGroupMemberRemove',
  'channelGroupJoinDecide',
  'channelGroupSendReview',
  'channelGroupWakeSet',
  'channelGroupWakePolicies',
  'channelGroupDelete',
  'channelHistory',
  'channelHistorySources',
  'channelPurgePreview',
  'channelPurgeConfirm',
  'storageUsage',
  'storageCleanupPreview',
  'storageCleanupConfirm',
  'storageMessagesCleanupPreview',
  'storageMessagesCleanupConfirm',
  'channelMessages',
  'channelTimeline',
  'channelReadPosition',
  'channelMarkRead',
  'channelMarkAllRead',
  'channelReact',
  'channelSearch',
  'messageSearch',
  'channelUnreadCounts',
  'channelAllBotPreview',
  'channelSend',
  'channelSendStatus',
  'botAttention',
  'botSourcePolicies',
  'botSourcePolicySet',
  'botSourcePolicyReset',
  'activityOverview',
  'channelActivityToday',
  'humanAttention',
  'humanAssignmentContext',
  'humanAttentionStatus',
  'humanAttentionIgnore',
  'humanAttentionDismiss',
  'humanAttentionRestore',
  'humanAttentionDismissAll',
  'humanAttentionSnooze',
  'assignments',
  'channelAssignments',
  'assignment',
  'assignmentTimeline',
  'sessionSubagents',
  'workspaceOptions',
  'messageAttachmentTarget',
  'channelMediaTarget',
  'workspaceFileTarget',
  'folderBrowse',
  'grants',
  'grantCreate',
  'grantRevoke',
  'grantWriteSet',
  'grantRequestApprove',
  'assignmentAccessGet',
  'assignmentAccessSet',
  'toolApprovalRules',
  'toolApprovalRuleRevoke',
  'toolApprovalHistory',
  'toolApprovalStatus',
  'toolApprovalDecide',
  'toolAutoRejectionOverride',
  'userQuestionStatus',
  'userQuestionAnswer',
  'sessions',
  'botToolTrace',
  'botTools',
  'botToolRun',
  'catalogView',
  'catalogOpen',
  'sessionArchiveSet',
  'memoryMove',
  'sessionOwner',
  'botSessionIds',
  'memoryFileTarget',
  'memorySnapshot',
  'memoryFile',
  'memoryHistory',
  'memoryDiff',
  'memoryGitGraph',
  'memoryGitCommitDiff',
  'memoryWorkingChanges',
  'memoryWorkingDiff',
  'memoryRecoveryHistory',
  'memoryRestore',
  'memorySave',
  'memoryRestoreCommit',
  'memoryNameVersion',
  'memoryRemoveVersionName',
  'memoryVersions',
  'memoryRepair',
  'profileActivity',
  'profileSessionUsage',
  'overviewMemory',
  'overviewUsage',
  'profileUsage',
  'groupProfileActivity',
  'rosterGet',
  'sectionCreate',
  'sectionRename',
  'sectionRemove',
  'channelAssign',
  'sectionReorder',
  'topReorder',
  'pinsSet',
  'hiddenSet',
  'channelMuteSet',
  'rosterBatch',
  'developerModeSet',
  'computerAccessSet',
  'browserAccessSet',
  'browserProfileSet',
  'approvalTemplates',
  'promptParts',
  'promptPresets',
  'promptPresetCreate',
  'promptPresetUpdate',
  'promptPresetDelete',
  'promptGlobalSet',
  'botPrompt',
  'botPromptSet',
  'approvalTemplateCreate',
  'approvalTemplateUpdate',
  'approvalTemplateDelete',
  'botApprovalTemplateSet',
  'approvalReviewerModel',
  'approvalReviewerModelSet',
  'voiceProviders',
  'conceptArt',
  'voiceProviderAdd',
  'voiceProviderRemove',
  'voiceProviderTest',
  'voiceSynthesize',
  'botVoiceSet',
  'voiceTranscribe',
  'botAsrSet',
  'voiceDefaultSet',
  'voiceSpeechThresholdSet',
  'voiceDictation',
  'idleCompaction',
  'idleCompactionSet',
  'idleCompactionCacheLifetimeSet',
  'compactionThresholdSet',
  'standingLimitsSet',
  'botAvatarSet',
  'botAppearanceSet',
  'botPrimaryColorSet',
  'partLibraryList',
  'partLibraryAdd',
  'partLibraryExport',
  'partLibraryImport',
  'partLibraryImportImage',
  'botBannerSet',
  'marketplaceList',
  'marketplaceSubmit',
  'marketplaceTopics',
  'marketplaceSections',
  'marketplaceDigests',
  'marketplaceDigest',
  'marketplaceDetail',
  'marketplaceFileView',
  'marketplaceChallenge',
  'marketplaceReport',
  'marketplaceAccount',
  'marketplaceAuthorSave',
  'marketplaceAuthorAvatarSet',
  'marketplaceUploadPlan',
  'marketplaceUpload',
  'marketplaceInstallReview',
  'marketplaceMine',
  'marketplaceDelete',
  'shareDraftStart',
  'shareDraftGet',
  'shareDraftFile',
  'shareDraftDecide',
  'shareDraftFinish',
  'shareDraftDiscard',
  'shareDraftExport',
  'marketplaceInstall',
  'releaseInfo',
  'releaseUpdate',
  'releaseInstall',
  'releaseRestart',
  'pluginUpdates',
  'pluginInstall',
  'pluginRestart',
  'telemetryStatus',
  'telemetrySet',
  'gitStatus',
  'gitInstall',
  'scheduleList',
  'takeoverList',
  'takeoverStatus',
  'takeoverRequest',
  'takeoverComplete',
  'takeoverCancel',
  'scheduleCreate',
  'scheduleUpdate',
  'scheduleDelete',
  'scheduleHistory',
  'scheduleRunNow',
  'schedulePreview',
  'channelJournalPage',
  'channelFilesPage',
  'channelChanges',
  'channelChangeCursor',
  'channelListChanges',
]);
markRemoteStreams(BotharnessBridgeService.prototype, [
  'followRoster',
  'followActivity',
  'followChannel',
  'followCompanion',
]);

export function registerBridge(
  ctx: Context,
  methods: BridgeMethods,
  privateInputs?: PrivateInputs,
  live?: BridgeLive,
): BotharnessBridgeService {
  return new BotharnessBridgeService(ctx, methods, privateInputs, live);
}
