export {
  apply,
  Config,
  createCore,
  DEFAULT_CONFIG,
  inject,
  name,
  PERSONA_SECTION_ORDER,
} from './plugin.js';
export {
  exportProfileBackup,
  inspectProfileBackup,
  profileBackupPreview,
  restoreProfileBackup,
} from './portability/package.js';
export { ProfileBackupError } from './portability/files.js';
export { runProfileRestoreCli } from './portability/cli.js';
export type { BotHarnessConfig, BotHarnessCore } from './plugin.js';
export { createBridgeMethods } from './bridge/methods.js';
export type {
  BridgeError,
  BridgeMethods,
  BridgeMethodsDeps,
  BridgeResult,
  PersonaBotDetail,
  PersonaBotSummary,
} from './bridge/methods.js';
export {
  BRIDGE_NAMESPACE,
  BRIDGE_SERVICE_KEY,
  BotharnessBridgeService,
  registerBridge,
} from './bridge/rpc.js';
export {
  createRosterStore,
  RosterStore,
  RosterUnavailableError,
  RosterUnknownSectionError,
} from './roster/store.js';
export type {
  RosterDomainFacility,
  RosterSection,
  RosterSnapshot,
  RosterStoreOptions,
} from './roster/store.js';
export { rosterDomainSpec, rosterDomainState, rosterSectionRecord } from './roster/spec.js';
export type { RosterDomainState, RosterSectionRecord } from './roster/spec.js';
export { createPersonaBotRegistry } from './bots/registry.js';
export type { PersonaBotRegistry, PersonaBotRegistryOptions } from './bots/registry.js';
export { runBotCreateCli, BOT_CREATE_HELP } from './bots/bot-create-cli.js';
export type {
  BotCreateCliIo,
  BotCreateFailure,
  BotCreateResult,
  BotCreateStep,
} from './bots/bot-create-cli.js';
export {
  dmChannelId,
  groupChannelIdBase,
  isChannelMessage,
  isChannelRecord,
  isValidChannelId,
  slugifyChannelName,
} from './channels/channel.js';
export type {
  ChannelMessage,
  ChannelMessageAuthor,
  ChannelMessageExternal,
  ChannelMessagePerf,
  ChannelRecord,
  ChannelType,
} from './channels/channel.js';
export { createChannelStore, DEFAULT_MESSAGE_PAGE, MAX_MESSAGE_PAGE } from './channels/store.js';
export type {
  ChannelMessageQueryOptions,
  ChannelMessageQueryPage,
  ChannelReadOptions,
  ChannelStore,
  ChannelStoreOptions,
  CreateChannelGroupInput,
} from './channels/store.js';
export { isPersonaBotRecord } from './bots/persona-bot.js';
export type {
  CreatePersonaBotInput,
  CreatePersonaBotResult,
  PersonaBotPatch,
  PersonaBotRecord,
  RemovePersonaBotOptions,
  UpdatePersonaBotResult,
} from './bots/persona-bot.js';
export { isValidSlug, MAX_SLUG_LENGTH, SLUG_PATTERN } from './bots/slug.js';
export { aggregateSessionStates, createBotStateTracker } from './state/bot-state.js';
export type {
  AggregatedState,
  BotStateEvent,
  BotStateSnapshot,
  BotStateTracker,
  PersonaBotActivityEvent,
  PersonaBotActivitySnapshot,
  PersonaBotSessionActivity,
  SessionState,
} from './state/bot-state.js';
export {
  createDshActivityProjection,
  deriveSessionState,
  sessionStateForEvent,
} from './state/dsh-activity.js';
export type {
  DshActivityProjection,
  DshActivityRebuildReport,
  DshActivitySession,
} from './state/dsh-activity.js';
export {
  createSessionOwnership,
  SessionOwnershipConflictError,
  SessionOwnershipError,
} from './sessions/ownership.js';
export type {
  SessionOwnership,
  SessionOwnershipClaim,
  SessionOwnershipProvenance,
  SessionOwnershipRecord,
  SessionOwnershipRepair,
  SessionPersonaSnapshot,
  SessionRootRole,
} from './sessions/ownership.js';
export {
  canonicalizeWorkspacePath,
  createImStoreReader,
  parseImBotsConfig,
  parseWorkspacesDocument,
  resolveBotFromStores,
  resolveDshHome,
} from './im/config-store.js';
export type { ImStoreReaderOptions, ImStoresSnapshot } from './im/config-store.js';
export type {
  DshSession,
  DshSessionEvent,
  DshSessionHeader,
  DshSessionStore,
} from './sessions/source.js';
export { displayNameForBot, emptyWorkspacesDocument, resolveBotIdentity } from './im/identity.js';
export type {
  BotDomain,
  BotIdentity,
  BotResolveResult,
  ImBotRecord,
  ResolveBotIdentityInput,
  WorkspacesDocument,
} from './im/identity.js';
export { createMemoryStore, MemoryWriteError } from './memory/store.js';
export type {
  MemoryEntry,
  MemoryStore,
  MemoryStoreOptions,
  MemoryWriteInput,
  MemoryWriteResult,
} from './memory/store.js';
export type { MemoryCommit } from './memory/git.js';
export type { MemorySearchHit } from './memory/search.js';
export { ensureMemoryRepository, inspectMemoryRepository } from './memory/repository.js';
export type {
  MemoryRepositoryFailureCode,
  MemoryRepositoryInspection,
  MemoryRepositoryResult,
} from './memory/repository.js';
export { createMemoryService } from './memory/service.js';
export type { MemoryAgentRef, MemoryService, MemoryServiceOptions } from './memory/service.js';
export {
  mountOperationalDatabase,
  OPERATIONAL_DATABASE_FILENAME,
  OperationalDatabaseError,
} from './database/owner.js';
export type {
  OperationalDatabaseDiagnostics,
  OperationalDatabaseErrorCode,
  OperationalDatabaseErrorDetails,
  OperationalDatabaseMetrics,
  OperationalDatabaseMode,
  OperationalDatabaseOwner,
  OperationalDatabaseOwnerOptions,
  PostCommitNotification,
  ProfileWriterLeaseMetadata,
} from './database/owner.js';
export { BOT_HARNESS_SCHEMA_PLAN } from './database/schema-plan.js';
export { createBotRuntime } from './runtime/bot-runtime.js';
export type {
  AssignmentAgentRun,
  AssignmentActivity,
  AssignmentDetail,
  AssignmentReport,
  AssignmentReportInput,
  AssignmentReportState,
  AssignmentSummary,
  BotAgentAdapter,
  BotRuntime,
  BotRuntimeOptions,
  ChannelMessageView,
  HandleDmMessageInput,
  OrchestratorAgentRun,
  OrchestratorChannelAccess,
} from './runtime/bot-runtime.js';
export { createDshBotAgentAdapter } from './runtime/dsh-bot-agent-adapter.js';
export type { DshAgentHost, DshBotAgentAdapterOptions } from './runtime/dsh-bot-agent-adapter.js';
export {
  defineSchemaPlan,
  FOUNDATION_SCHEMA_GENERATION,
  FOUNDATION_SCHEMA_PLAN,
  LEGACY_FORWARD_MIGRATION_PLAN,
} from './database/schema.js';
export type {
  LegacyForwardMigrationPlanEntry,
  SchemaMigration,
  SchemaPlan,
} from './database/schema.js';

export { createOutboundMessaging } from './messaging/outbound.js';
export type {
  OutboundMessaging,
  MessagingGrant,
  MessagingSnapshot,
  OutboxIntent,
} from './messaging/outbound.js';
export { createDshImProvider } from './messaging/dsh-im.js';
export type { DshImOutboundService } from './messaging/dsh-im.js';
export { MessagingError, MessagingProviderError } from './messaging/provider.js';
export type {
  MessagingProvider,
  MessagingAccount,
  MessagingTarget,
  MessagingInboundEvent,
  MessagingReplyRoute,
} from './messaging/provider.js';
export type { InboundMessaging, ExternalSource } from './messaging/inbound.js';

export { activityEffectForToolKind } from './state/tool-activity.js';
export type {
  PersonaBotToolActivity,
  ActivityEffect,
  ActivitySourceRole,
  ActivitySourceCount,
} from './state/tool-activity.js';

export { withPublicToolDetail } from './state/tool-activity.js';
export type { PublicToolActivityDeclaration } from './state/tool-activity.js';

export type { ToolDetail, ToolDetailRead, ToolDetailRefusal } from './state/tool-details.js';

export { PERSONABOT_OUTPUT_COMMITTED, personaBotOutputCommitted } from './channels/output.js';
export type { PersonaBotOutputCommitted } from './channels/output.js';
export type { ChannelMessageOrigin } from './channels/store.js';

export {
  cancelSuperAgentRun,
  runSuperAgent,
  sealWorkOrders,
} from './runtime/super-agent-dispatch.js';
export { createSuperAgentLedger, parseWorkOrders } from './runtime/super-agent-ledger.js';
export {
  createWorkOrderAuthority,
  noteSuperAgentApproval,
  orchestratorToolScope,
  sealToolInput,
} from './runtime/super-agent-authority.js';
export { createToolApprovalRuleStore } from './workspaces/tool-approval-rules.js';
