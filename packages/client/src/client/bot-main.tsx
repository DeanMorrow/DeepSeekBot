import { CONVERSATION_STATE_KEYS, type ConversationStateView } from './store.js';
import { PendingDelivery } from './message-delivery.js';
import { AppearanceContext } from './appearance-context.js';
import type { Appearance } from './appearance.js';
import { onboardingFor, type OnboardingViewState } from './onboarding.js';
import { PointerMenu } from './ds/pointer-menu.js';
import { useScopedRef, useScopedState } from './scoped-state.js';
import { PanelEmptyState } from './ds/empty-state.js';
import { Workspace, type WorkspaceOptions } from './workspace.js';
import { WorkspaceContext } from './workspace-context.js';
import { OnboardingMemoryNavigation } from './onboarding-memory.js';
import { useTimelineWindow } from './timeline-window.js';
import { OnboardingOverlay } from './onboarding-view.js';
import { BotIntro } from './bot-intro.js';
import type { Wallpaper } from './wallpaper.js';
import type { VoiceDictationPort } from './composer-dictation.js';
import {
  ChannelMark,
  ChannelMenuCaret,
  ConversationTitle,
  GroupChannelHeader,
} from './group-channel-header.js';
import { GroupChannelIcon } from './group-avatar-stack.js';
import { MobileConversationHeader } from './mobile-conversation-header.js';
import { useDmComposerContext } from './dm-composer-context.js';
import { useGroupComposerContext } from './group-composer-context.js';
import type { WindowCompanions } from './window-companions.js';
import { COMPANION_READ_INSET } from './companion-surface.js';
import { BridgeCallError, parseAllBotPreview } from './bridge.js';
import type { AllBotPreview, AllBotMention } from '../../../core/src/channels/all-bot-mention.js';
import { ComposerSendKeyContext } from './composer-send-key.js';
import { ConversationFileDropOverlay, useConversationFileDrop } from './conversation-file-drop.js';
import type { ComposerShortcut } from './composer-shortcuts.js';
import {
  memo,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';

import {
  IconWarningTriangleOutlineRegular,
  IconCheckOutlineRegular,
  IconChevronDownOutlineRegular,
  IconChecklistOutlineRegular,
  IconCopyOutlineRegular,
  IconNewChatOutlineRegular,
  IconPanelLeftOutlineRegular,
  IconUserOutlineRegular,
  Toast,
} from '@deepseek-ai/dsh-client-ui-primitives';
import { Tooltip } from './ds/tooltip.js';

import type { BridgeActions } from './actions.js';
import {
  uploadChannelAttachment,
  type MemoryWorkingChange,
  type ProfileActivity,
  type GroupProfileActivity,
} from './bridge.js';
import {
  PersonaBotAvatar,
  PersonaBotFacepile,
  personaBotPresentationSummary,
  type PersonaBotFacepileItem,
} from './avatar.js';
import { useClientStore } from './use-client-store.js';
import { sameConversationBots } from './conversation-bots.js';
import type { BotModePrefs } from './bot-mode-prefs.js';
import {
  ChannelComposer,
  type ChannelComposerActivity,
  type ChannelComposerUpload,
} from './channel-composer.js';
import { PanelDialog } from './ds/panel-dialog.js';
import { ConversationSessionStop, useHeaderSessionStop } from './header-session-stop.js';
import { runningSessionCount, runningSessionGroups } from './session-stop-model.js';
import { ChannelFiles, GeneratedFilesContext } from './generated-files-panel.js';
import { attachmentIdentity } from '../../../core/src/attachments/ref.js';
import type { SelectedMention } from './mentions.js';
import type { SelectedChannelRef } from './channel-refs.js';
import { recallEntries, stepRecall, SUBMISSION_PREFIX } from './composer-submission-store.js';
import {
  conversationDraftKey,
  useConversationDraft,
  useComposerRecovery,
} from './conversation-draft.js';
import { insertAttachmentReferences, removeAttachmentReferences } from './attachment-refs.js';
import { appendMention, quoteMention, rebaseMentions } from './mentions.js';
import { AtSignIcon } from './at-sign-icon.js';
import { rebaseChannelRefs } from './channel-refs.js';
import { channelHumanName, humanLabel } from './actor-names.js';
import { ChannelHeaderMenu, type ChannelMenuTrigger } from './human-channel-name.js';
import { ChannelSidebarIcon } from './channel-sidebar-icon.js';
import type { ChannelHumanMember } from './store.js';
import {
  ChannelMessageBody,
  MessageDeveloperMode,
  type NativeChatFailureText,
} from './channel-message-body.js';
import { BridgeSourceAuthor } from './bridge-source-author.js';
import {
  botNameColor,
  botNameSource,
  humanBubbleColors,
  useConversationSurface,
} from './bot-primary-color.js';
import {
  ChannelDeliveryReceipt,
  DeliveryReceiptsVisible,
  readingBots,
} from './channel-delivery-receipt.js';
import { BubbleBadges } from './bubble-badges.js';
import { BotInboxDialog } from './bot-inbox-dialog.js';
import { StreamReplies } from './stream-replies.js';
import { useMessageArrivals } from './message-arrivals.js';
import { MessageCopyAction } from './message-copy-action.js';
import {
  MessageAuthorHoverCard,
  messageAuthorCardModel,
  networkContactAvailabilityLabel,
} from './message-author-card.js';
import { botDmTitle, isBotDmChannel, isHumanReadOnlyDmChannel } from './channel-kind.js';
import { zhTranslate, type BotHarnessTranslate } from './locale.js';
import { toolApprovalReplyPreview } from './approval-text.js';
import type { NativeSessionCatalog } from './sessions-entry.js';
import { ActivityCenterView } from './activity-center-view.js';
import {
  resolveChannelSidebarContext,
  type ChannelSidebarEntryProps,
  type ChannelSidebarRegistry,
} from './channel-sidebar.js';
import { ChannelAttentionDot } from './channel-options.js';
import { ChannelSettingsAttention, ChannelSettingsDialog } from './channel-settings.js';
import {
  channelSettings,
  channelSettingsAttentionSections,
  channelSettingsSections,
  isChannelSettingsSection,
} from './channel-settings-state.js';
import { ChannelSidebar, useChannelSidebar } from './channel-sidebar-view.js';
import { ChannelDock, useChannelDockActive } from './channel-dock.js';
import { dockPanelsFromEntries, type DockPanelChannel, type DockPanelHost } from './dock-panels.js';
import { TAKEOVER_PANELS, TakeoverTimeline, takeoverResolutions } from './takeover-card.js';
import type { TakeoverTarget } from '../../../core/src/takeover/contracts.js';
import { MemoryCommitView } from './memory-commit-view.js';
import { MemoryFileView, MemoryWorkingView } from './memory-current-view.js';
import { LoadingSkeleton } from './loading-skeleton.js';
import { groupChannelMessages, type MessageGroup } from './message-groups.js';
import { ProfileView } from './personabot-profile.js';
import { ShareFlowHost } from './share-flow.js';
import { GroupProfileView } from './group-profile.js';
import { personaBotActivity } from './persona-activity.js';
import { BotDmActionLabel } from './bot-dm-action-line.js';
import { MemoryCommitLine } from './memory-commit-line.js';
import { AutoApprovalLine, AutoApprovalPauseLine } from './approval-template-entry.js';
import { BotChannelPostLine, elsewhereAction } from './bot-channel-post-line.js';
import {
  hiddenDmActionsSnapshot,
  dmMemoryDisplaySnapshot,
  subscribeHiddenDmActions,
  visibleDmMessages,
} from './dm-actions.js';
import {
  timelineWorkingRows,
  HeaderWorkingStatus,
  WorkingAnnouncement,
  WorkingSummary,
} from './timeline-working-rows.js';
import { groupComposerActivity } from './group-composer-activity.js';
import { attentionCount } from './activity-attention.js';
import { EMPTY_PROFILE_CARDS, type ProfileCardRegistry } from './profile-cards.js';
import {
  store,
  type BotSummary,
  type ChannelAttachmentRef,
  type ChannelMessage,
  type ChannelReaction,
  type ChannelSummary,
  type ClientState,
} from './store.js';
import { MessageFeedbackDialog } from './message-feedback.js';
import {
  MessageSelectionBar,
  MessageImagePreview,
  MessageSelectionContext,
  useMessageSelection,
} from './message-selection.js';
import { buildMessageSnapshot, renderMessageSnapshot } from './message-snapshot.js';
import {
  conversationText,
  selectableMessage,
  selectionRange,
  toggleSelection,
  type MessageSelection,
} from './message-selection-state.js';
import { useAvatarFollow } from './avatar-follow.js';
import { useMountedResource } from './mounted-resource.js';
import * as stylex from '@stylexjs/stylex';
import { IconButton } from './ds/icon-button.js';
import { DmCallControl } from './dm-call.js';
import { color, radius, text } from './ds/tokens.stylex.js';
import type { ReleaseNotesController } from './release-notes.js';
import { ReleaseNotesAnnouncement } from './release-notes-view.js';
import type { TelemetryNoticeController } from './telemetry-notice.js';
import { TelemetryNotice } from './telemetry-notice-view.js';
import {
  followsLatest,
  rememberTimelineScroll,
  rememberedTimelineScroll,
  restoreTimelineScroll,
  timelineScrollAnchor,
} from './timeline-position.js';
import { observeSingleLineBubble } from './bubble-line.js';
import { TimelineUnreadDivider } from './timeline-unread-divider.js';
import { AutoCollapseMessages, foldableMessage, MessageFold } from './message-fold.js';
import {
  MessageReactionPicker,
  MessageReactionSurface,
  ReactionIcon,
} from './message-reactions.js';
import { useFooterPreferences } from './composer-footer-preferences.js';
import { useReplyPerf } from './use-reply-perf.js';
import { ConversationSearch } from './conversation-search.js';
import { reactableMessage } from './message-reactions-model.js';
import {
  galleryImageKey,
  ImageGalleryScope,
  useMessageImageGallery,
  type Gallery,
  type GalleryImage,
} from './message-image-gallery.js';
import { inlineImageAttachment } from './message-attachment.js';
import { channelAttachmentUrl } from './bridge.js';
import { turnStopText } from './turn-stop.js';
import { VoiceCallRecordBubble } from './voice-call-record.js';

export function committedMessageIds(messages: readonly ChannelMessage[]): Set<string> {
  return new Set(
    messages
      .filter(
        (message) =>
          message.pending !== true && message.streaming !== true && message.failed === undefined,
      )
      .map((message) => message.id),
  );
}

export function resolvedGrantRequestIds(messages: readonly ChannelMessage[]): Set<string> {
  const committed = committedMessageIds(messages);
  return new Set(
    messages
      .filter(
        (item) =>
          committed.has(item.id) &&
          item.author.kind === 'human' &&
          item.replyTo !== undefined &&
          item.grantRequestResolution?.requestMessageId === item.replyTo,
      )
      .map((item) => item.replyTo!)
      .concat(
        messages
          .filter((item) => committed.has(item.id) && item.grantRequestResolved === true)
          .map((item) => item.id),
      ),
  );
}

function memberName(bots: readonly BotSummary[], slug: string): string {
  return bots.find((bot) => bot.slug === slug)?.displayName ?? slug;
}

function authorLabel(
  message: ChannelMessage,
  bots: readonly BotSummary[],
  t: BotHarnessTranslate,
  humanName = 'Human',
  remoteBot?: ChannelSummary['remoteBot'],
): string {
  switch (message.author.kind) {
    case 'human':
      return humanLabel(humanName, t);
    case 'system':
      return t('main.author.system');
    case 'bot':
      return memberName(bots, message.author.slug);
    case 'remote-bot':
      return remoteBot?.hostId === message.author.hostId &&
        remoteBot.botSlug === message.author.slug
        ? remoteBot.displayName
        : message.author.slug;
    case 'bridged':
      return message.author.source;
  }
}

const timeFormats = new Map<string, Intl.DateTimeFormat>();
function timeFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = timeFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale || undefined, options);
    timeFormats.set(key, format);
  }
  return format;
}

function clockTime(at: string): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '';
  return timeFormat('', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function fullTime(at: string, t: BotHarnessTranslate): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '';
  return timeFormat(t('main.date.locale'), { dateStyle: 'full', timeStyle: 'short' }).format(date);
}

const messageStyles = stylex.create({
  channelIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: text.titleLine,
    height: text.titleLine,
    overflow: 'hidden',
    borderRadius: radius.xs,
  },
  emptyContainer: { display: 'flex', flexDirection: 'column', flexGrow: 1 },
  metaTime: {
    color: color.subtle,
    fontSize: text.metaSize,
    lineHeight: text.metaLine,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    display: { default: 'inline', '@media (hover: none)': 'none' },
  },
});

function Welcome({
  state,
  t,
}: {
  state: ConversationStateView;
  t: BotHarnessTranslate;
}): ReactElement {
  return (
    <div className="bh-root bh-main">
      <div className="bh-content" {...stylex.props(messageStyles.emptyContainer)}>
        <PanelEmptyState icon="messages-circle">
          {t(state.bots.length === 0 ? 'main.welcome.empty' : 'main.welcome.hint')}
        </PanelEmptyState>
      </div>
    </div>
  );
}

interface MessageMenuRequest {
  message: ChannelMessage;
  x: number;
  y: number;
}

function ReplyQuote({
  humanName,
  message,
  bots,
  onJump,
  t,
}: {
  message: ChannelMessage;
  bots: readonly BotSummary[];
  humanName: string;
  onJump(messageId: string): void;
  t: BotHarnessTranslate;
}): ReactElement | null {
  const targetId = message.replyTo;
  if (targetId === undefined) return null;
  const preview = message.replyToPreview;
  if (preview === undefined || preview === null) {
    return (
      <div className="bh-bubble-reply bh-bubble-reply-unavailable">
        {t('message.replyUnavailable')}
      </div>
    );
  }
  return (
    <button
      type="button"
      className="bh-bubble-reply"
      onClick={() => onJump(targetId)}
      aria-label={t('message.replyJump', {
        author: authorLabel({ ...message, author: preview.author }, bots, t, humanName),
      })}
    >
      <span className="bh-bubble-reply-author">
        {authorLabel({ ...message, author: preview.author }, bots, t, humanName)}
      </span>
      <span className="bh-bubble-reply-body">
        {toolApprovalReplyPreview(message, preview.body, t)}
      </span>
    </button>
  );
}

function ReplyIcon(): ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 7 4 12l5 5M4 12h9a7 7 0 0 1 7 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SEARCH_PANEL_GAP_PX = 8;
const BUBBLE_LONG_PRESS_MS = 500;
const BUBBLE_LONG_PRESS_TOLERANCE_PX = 10;

export function MessageBubbleWrap({
  message,
  entering = false,
  focused,
  onContextMenu,
  children,
}: {
  message: ChannelMessage;
  entering?: boolean;
  focused: boolean;
  onContextMenu(message: ChannelMessage, x: number, y: number): void;
  children?: ReactNode;
}): ReactElement {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const origin = useRef<{ x: number; y: number } | undefined>(undefined);
  const fired = useRef(false);
  const selection = useMessageSelection();
  const selectable = selection !== undefined && selectableMessage(message);
  const checked = selection?.selected.has(message.id) === true;
  const clearTimer = useCallback(() => {
    if (timer.current !== undefined) {
      clearTimeout(timer.current);
      timer.current = undefined;
    }
  }, []);
  const mount = useMountedResource<HTMLDivElement>((node) => {
    const unobserve = observeSingleLineBubble(node);
    return () => {
      unobserve?.();
      if (timer.current !== undefined) clearTimeout(timer.current);
    };
  }, []);
  const cancel = (): void => {
    clearTimer();
    origin.current = undefined;
  };
  return (
    <div
      ref={mount}
      className={`bh-bubble-wrap${entering ? ' bh-bubble-enter' : ''}${focused ? ' bh-bubble-focused' : ''}${message.failed === undefined ? '' : ' bh-bubble-wrap-failed'}${selection?.active === true ? ' bh-bubble-selecting' : ''}`}
      data-message-id={message.id}
      {...(selection?.active === true && selectable
        ? {
            role: 'checkbox',
            'aria-checked': checked,
            tabIndex: 0,
            'data-selected': checked ? 'true' : 'false',
          }
        : {})}
      onContextMenu={(event) => {
        event.preventDefault();
        if (selection?.active === true) return;
        onContextMenu(message, event.clientX, event.clientY);
      }}
      onClickCapture={(event) => {
        if (selection?.active !== true) return;
        event.preventDefault();
        event.stopPropagation();
        selection.toggle(message);
      }}
      onKeyDown={(event) => {
        if (selection?.active !== true || event.target !== event.currentTarget) return;
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          selection.toggle(message);
        }
      }}
      onTouchStart={(event) => {
        if (event.touches.length !== 1) {
          cancel();
          return;
        }
        const touch = event.touches[0];
        if (touch === undefined) {
          cancel();
          return;
        }
        const x = touch.clientX;
        const y = touch.clientY;
        clearTimer();
        origin.current = { x, y };
        fired.current = false;
        timer.current = setTimeout(() => {
          timer.current = undefined;
          fired.current = true;
          try {
            if (typeof navigator.vibrate === 'function') navigator.vibrate(10);
          } catch {}
          if (selection?.active === true) return;
          onContextMenu(message, x, y);
        }, BUBBLE_LONG_PRESS_MS);
      }}
      onTouchMove={(event) => {
        const start = origin.current;
        const touch = event.touches[0];
        if (start === undefined || touch === undefined || timer.current === undefined) return;
        if (
          Math.abs(touch.clientX - start.x) > BUBBLE_LONG_PRESS_TOLERANCE_PX ||
          Math.abs(touch.clientY - start.y) > BUBBLE_LONG_PRESS_TOLERANCE_PX
        )
          cancel();
      }}
      onTouchEnd={(event) => {
        const wasFired = fired.current;
        cancel();
        fired.current = false;
        if (wasFired) event.preventDefault();
      }}
      onTouchCancel={() => {
        cancel();
        fired.current = false;
      }}
    >
      {selection?.active === true && selectable ? (
        <span className="bh-bubble-check" aria-hidden="true" data-checked={checked}>
          {checked ? <IconCheckOutlineRegular size={12} /> : null}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function humanBubbleStyle(
  source: string | undefined,
  background: string,
): CSSProperties | undefined {
  if (source === undefined) return undefined;
  const light = humanBubbleColors(source, 'light', background);
  const dark = humanBubbleColors(source, 'dark', background);
  if (light === undefined || dark === undefined) return undefined;
  return {
    '--bh-bubble-me-fill-light': light.fill,
    '--bh-bubble-me-ink-light': light.ink,
    '--bh-bubble-me-fill-dark': dark.fill,
    '--bh-bubble-me-ink-dark': dark.ink,
  } as CSSProperties;
}

interface InboxTarget {
  botSlug: string;
  messageId: string;
  missing: boolean;
}

const NO_HUMAN_MEMBERS: readonly ChannelHumanMember[] = [];
const NO_REACTIONS: readonly ChannelReaction[] = [];
const NO_READERS: readonly string[] = [];

const MessageGroupView = memo(function MessageGroupView({
  humanMembers = [],
  group,
  arrivals,
  channelId,
  bots,
  focusMessageId,
  currentDmBotSlug,
  remoteBot,
  remoteContact,
  remoteAvailability,
  onContextMenu,
  onAvatarMenu,
  onOpenInbox,
  onReply,
  onReact,
  onJumpReply,
  onRestoreFailed,
  reading,
  actions,
  resolvedGrantRequests,
  toolApprovalDecisions,
  userQuestionResolutions,
  gallery,
  nativeChatT,
  t,
}: {
  humanMembers?: readonly ChannelHumanMember[];
  gallery?: Gallery | undefined;
  group: MessageGroup;
  arrivals?: ReadonlySet<string> | undefined;
  channelId?: string | undefined;
  focusMessageId?: string | undefined;
  currentDmBotSlug?: string | undefined;
  remoteBot?: ChannelSummary['remoteBot'] | undefined;
  remoteContact?: ChannelSummary['remoteContact'] | undefined;
  remoteAvailability?: ChannelSummary['remoteAvailability'];
  bots: readonly BotSummary[];
  onContextMenu(message: ChannelMessage, x: number, y: number): void;
  onAvatarMenu?: ((botSlug: string, x: number, y: number) => void) | undefined;
  onOpenInbox?: ((target: InboxTarget) => void) | undefined;
  onReply?: ((message: ChannelMessage) => void) | undefined;
  onReact?: ((message: ChannelMessage, emoji: string, active: boolean) => void) | undefined;
  onRestoreFailed?: ((message: ChannelMessage) => void) | undefined;
  onJumpReply(messageId: string): void;
  reading?: ReadonlyMap<string, readonly string[]> | undefined;
  actions: BridgeActions;
  resolvedGrantRequests: ReadonlySet<string>;
  toolApprovalDecisions: ReadonlyMap<
    string,
    | 'allowed-once'
    | 'allowed-always-tool'
    | 'allowed-always-exact'
    | 'allowed-always-all'
    | 'rejected'
  >;
  userQuestionResolutions: ReadonlyMap<string, 'answered' | 'cancelled'>;
  t: BotHarnessTranslate;
  nativeChatT?: NativeChatFailureText | undefined;
}): ReactElement {
  const humanName = channelHumanName({ humanMembers: [...humanMembers] });
  const first = group.messages[0]!;
  const author = first.author;
  const human = author.kind === 'human';
  const authorBot =
    author.kind === 'bot' ? bots.find((candidate) => candidate.slug === author.slug) : undefined;
  const welcomeBot =
    first.onboardingWelcome === undefined || currentDmBotSlug === undefined
      ? undefined
      : bots.find((candidate) => candidate.slug === currentDmBotSlug);
  const displayBot = authorBot ?? welcomeBot;
  const reactorName = (actor: { kind: 'human' | 'bot'; id: string }): string =>
    actor.kind === 'human'
      ? actor.id === 'local-human'
        ? t('message.reaction.you')
        : (humanMembers.find((member) => member.humanId === actor.id)?.displayName ?? actor.id)
      : (bots.find((candidate) => candidate.slug === actor.id)?.displayName ?? actor.id);
  const surface = useConversationSurface();
  const nameSource = first.bridgeOrigin ? undefined : botNameSource(displayBot);
  const nameColor =
    nameSource === undefined ? undefined : botNameColor(nameSource, surface.background);
  const avatar =
    displayBot === undefined ? undefined : (
      <PersonaBotAvatar
        t={t}
        personaBotId={displayBot.slug}
        name={displayBot.displayName}
        src={displayBot.avatar}
        appearance={displayBot.appearance}
        avatarSeed={displayBot.avatarSeed}
        size={28}
        indicator={false}
        nativeTitle={false}
      />
    );
  const authorName = welcomeBot?.displayName ?? authorLabel(first, bots, t, humanName, remoteBot);
  const authorCard =
    author.kind === 'remote-bot' &&
    remoteBot?.hostId === author.hostId &&
    remoteBot.botSlug === author.slug
      ? {
          kind: 'remote-bot' as const,
          peer: remoteBot,
          contact: remoteContact,
          availability: remoteAvailability,
        }
      : first.bridgeOrigin !== undefined
        ? undefined
        : displayBot !== undefined
          ? messageAuthorCardModel({ kind: 'bot', bot: displayBot }, currentDmBotSlug, t)
          : human
            ? messageAuthorCardModel({ kind: 'human', name: authorName }, currentDmBotSlug, t)
            : undefined;
  const withAuthorCard = (anchor: ReactElement): ReactElement =>
    authorCard === undefined ? (
      anchor
    ) : (
      <MessageAuthorHoverCard
        anchor={anchor}
        model={authorCard}
        bot={displayBot}
        onMessage={
          displayBot === undefined ? undefined : () => void actions.openBot(displayBot.slug)
        }
        onProfile={
          displayBot === undefined
            ? undefined
            : () => void actions.openBot(displayBot.slug, 'profile')
        }
        t={t}
      />
    );
  const dmBot =
    human && currentDmBotSlug !== undefined
      ? bots.find((candidate) => candidate.slug === currentDmBotSlug)
      : undefined;
  const bubbleStyle = humanBubbleStyle(botNameSource(dmBot), surface.background);
  const lastId = group.messages[group.messages.length - 1]!.id;
  const arriving = arrivals?.has(lastId) === true;
  const follow = useAvatarFollow(lastId, arriving);
  return (
    <div
      className={`bh-message-group${human ? ' bh-message-group-me' : ''}${arriving && group.messages.length === 1 ? ' bh-message-group-enter' : ''}`}
      data-group-size={group.messages.length}
      style={bubbleStyle}
    >
      {avatar === undefined ? null : (
        <span ref={follow} className="bh-message-group-avatar">
          {withAuthorCard(
            author.kind === 'bot' && currentDmBotSlug !== author.slug ? (
              <button
                type="button"
                className="bh-message-group-avatar-link"
                aria-label={t('message.mention.openDm', { bot: displayBot?.displayName ?? '' })}
                {...(onAvatarMenu === undefined ? {} : { 'aria-haspopup': 'menu' as const })}
                onClick={() => void actions.openBot(author.slug)}
                onContextMenu={
                  onAvatarMenu === undefined
                    ? undefined
                    : (event) => {
                        event.preventDefault();
                        const box = event.currentTarget.getBoundingClientRect();
                        const keyboard = event.clientX === 0 && event.clientY === 0;
                        onAvatarMenu(
                          author.slug,
                          keyboard ? box.left : event.clientX,
                          keyboard ? box.bottom : event.clientY,
                        );
                      }
                }
              >
                {avatar}
              </button>
            ) : (
              <span
                className="bh-message-group-avatar-focus"
                role="group"
                tabIndex={0}
                aria-label={t('message.authorCard.label', {
                  name: displayBot?.displayName ?? '',
                })}
              >
                {avatar}
              </span>
            ),
          )}
        </span>
      )}
      <div className="bh-message-stack">
        <div className="bh-message-identity">
          {first.bridgeOrigin ? (
            <BridgeSourceAuthor origin={first.bridgeOrigin} t={t} />
          ) : (
            withAuthorCard(
              <span
                className="bh-bubble-author"
                ref={surface.probe}
                {...(author.kind === 'remote-bot'
                  ? {
                      role: 'group',
                      tabIndex: 0,
                      'aria-label': t('message.authorCard.label', { name: authorName }),
                    }
                  : {})}
                data-bot-name-color={nameColor}
                style={nameColor === undefined ? undefined : { color: nameColor }}
              >
                {authorName}
              </span>,
            )
          )}
          <time className="bh-bubble-time" dateTime={first.at} title={fullTime(first.at, t)}>
            {clockTime(first.at)}
          </time>
        </div>
        {group.messages.map((message, index) => {
          const position =
            group.messages.length === 1
              ? 'solo'
              : index === 0
                ? 'first'
                : index === group.messages.length - 1
                  ? 'last'
                  : 'middle';
          return (
            <MessageBubbleWrap
              key={message.id}
              message={message}
              entering={arrivals?.has(message.id) === true}
              focused={focusMessageId === message.id}
              onContextMenu={onContextMenu}
            >
              <div
                className={`bh-bubble-surface${message.failed === undefined ? '' : ' bh-bubble-surface-failed'}`}
              >
                {human && message.pending === true && message.failed === undefined ? (
                  <PendingDelivery message={message} t={t} />
                ) : null}
                {message.failed === undefined ? null : onRestoreFailed === undefined ? (
                  <span
                    className="bh-bubble-failed-action"
                    role="img"
                    aria-label={t(
                      message.unconfirmed === true ? 'message.unconfirmed' : 'message.failed',
                    )}
                    title={message.failed}
                  >
                    <IconWarningTriangleOutlineRegular size={16} />
                  </span>
                ) : (
                  <button
                    type="button"
                    className="bh-bubble-failed-action"
                    aria-label={t(
                      message.unconfirmed === true
                        ? 'message.unconfirmedRestore'
                        : 'message.failedRestore',
                    )}
                    title={message.failed}
                    onClick={() => onRestoreFailed(message)}
                  >
                    <IconWarningTriangleOutlineRegular size={16} />
                  </button>
                )}
                <div
                  className={`bh-bubble${human ? ' bh-bubble-me' : ''}${message.pending === true || message.streaming === true ? ' bh-bubble-pending' : ''}${message.failed === undefined ? '' : ' bh-bubble-failed'}`}
                  data-group-position={position}
                >
                  <ReplyQuote
                    humanName={humanName}
                    message={message}
                    bots={bots}
                    onJump={onJumpReply}
                    t={t}
                  />
                  <ImageGalleryScope value={gallery}>
                    <MessageFold messageId={message.id} enabled={foldableMessage(message)} t={t}>
                      <ChannelMessageBody
                        message={message}
                        channelId={channelId}
                        t={t}
                        nativeChatT={nativeChatT}
                        actions={actions}
                        bots={bots}
                        humanMembers={humanMembers}
                        grantRequestResolved={resolvedGrantRequests.has(message.id)}
                        toolApprovalDecision={toolApprovalDecisions.get(message.id)}
                        userQuestionResolution={userQuestionResolutions.get(message.id)}
                      />
                    </MessageFold>
                  </ImageGalleryScope>
                  {message.streaming === true ? (
                    <span className="bh-bubble-status" role="status">
                      {t(message.streaming === true ? 'message.generating' : 'message.sending')}
                    </span>
                  ) : null}
                </div>
                <BubbleBadges
                  reactions={message.reactions ?? NO_REACTIONS}
                  readers={reading?.get(message.id) ?? NO_READERS}
                  mine={human}
                  names={reactorName}
                  onReact={
                    onReact === undefined || !reactableMessage(message)
                      ? undefined
                      : (emoji, active) => onReact(message, emoji, active)
                  }
                  bots={bots}
                  t={t}
                />
                <div className="bh-bubble-toolbar">
                  <div className="bh-bubble-actions">
                    {onReact !== undefined && reactableMessage(message) ? (
                      <MessageReactionPicker
                        message={message}
                        onReact={(emoji, active) => onReact(message, emoji, active)}
                        t={t}
                      />
                    ) : null}
                    {onReply !== undefined &&
                    message.pending !== true &&
                    message.streaming !== true &&
                    message.failed === undefined ? (
                      <Tooltip label={t('message.reply')} side="top" portal delayMs={400}>
                        <IconButton
                          size="inline"
                          data-bubble-action=""
                          aria-label={t('message.reply')}
                          onClick={() => onReply(message)}
                        >
                          <ReplyIcon />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                    <MessageCopyAction body={message.body} t={t} />
                  </div>
                </div>
              </div>
              <div className="bh-bubble-side">
                <ChannelDeliveryReceipt
                  message={message}
                  bots={bots}
                  humanMembers={humanMembers}
                  onOpenInbox={
                    onOpenInbox === undefined
                      ? undefined
                      : (target) => onOpenInbox({ ...target, messageId: message.id })
                  }
                  t={t}
                />
                <div className="bh-bubble-meta">
                  {index === 0 || clockTime(message.at) === '' ? null : (
                    <time
                      dateTime={message.at}
                      title={fullTime(message.at, t)}
                      {...stylex.props(messageStyles.metaTime)}
                    >
                      {clockTime(message.at)}
                    </time>
                  )}
                </div>
              </div>
            </MessageBubbleWrap>
          );
        })}
      </div>
    </div>
  );
});

function MessageActionMenu({
  onReply,
  onFeedback,
  onSelect,
  onReact,
  request,
  onClose,
  t,
}: {
  onReply(message: ChannelMessage): void;
  onFeedback?(message: ChannelMessage): void;
  onSelect?(message: ChannelMessage): void;
  onReact?(request: MessageMenuRequest): void;
  request: MessageMenuRequest;
  onClose(): void;
  t: BotHarnessTranslate;
}): ReactElement {
  const proxy = useRef<HTMLSpanElement | null>(null);
  const menuMount = useMountedResource<HTMLSpanElement>(() => {
    const timer = window.setTimeout(() => {
      const lists = document.querySelectorAll<HTMLElement>('div[role="menu"]');
      lists
        .item(lists.length - 1)
        ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
        ?.focus();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);
  return (
    <span ref={menuMount} hidden>
      <PointerMenu
        point={request}
        dense
        autoFocus
        anchor={<span ref={proxy} aria-hidden="true" />}
        items={[
          ...(request.message.pending === true || request.message.streaming === true
            ? []
            : [{ id: 'reply', label: t('message.reply'), icon: <ReplyIcon /> }]),
          ...(onReact === undefined
            ? []
            : [{ id: 'react', label: t('message.react'), icon: <ReactionIcon /> }]),
          { id: 'copy', label: t('message.copy'), icon: <IconCopyOutlineRegular /> },
          ...(onSelect === undefined || !selectableMessage(request.message)
            ? []
            : [
                {
                  id: 'select',
                  label: t('message.select'),
                  icon: <IconChecklistOutlineRegular />,
                },
              ]),
          ...(onFeedback === undefined || !selectableMessage(request.message)
            ? []
            : [{ id: 'feedback', label: t('feedback.title'), icon: <ReactionIcon /> }]),
        ]}
        onSelect={(id) => {
          if (id === 'reply') onReply(request.message);
          else if (id === 'react') onReact?.(request);
          else if (id === 'feedback') onFeedback?.(request.message);
          else if (id === 'copy') {
            void navigator.clipboard?.writeText(request.message.body);
          } else if (id === 'select') onSelect?.(request.message);
          onClose();
        }}
        onClose={onClose}
      />
    </span>
  );
}

export interface AvatarMenuRequest {
  botSlug: string;
  x: number;
  y: number;
}

export function BotAvatarMenu({
  request,
  canMention,
  onMessage,
  onMention,
  onProfile,
  onClose,
  t,
}: {
  request: AvatarMenuRequest;
  canMention: boolean;
  onMessage(botSlug: string): void;
  onMention(botSlug: string): void;
  onProfile(botSlug: string): void;
  onClose(): void;
  t: BotHarnessTranslate;
}): ReactElement {
  const proxy = useRef<HTMLSpanElement | null>(null);
  return (
    <span hidden>
      <PointerMenu
        point={request}
        dense
        autoFocus
        anchor={<span ref={proxy} aria-hidden="true" />}
        items={[
          {
            id: 'message',
            label: t('message.avatar.message'),
            icon: <IconNewChatOutlineRegular />,
          },
          ...(canMention
            ? [{ id: 'mention', label: t('message.avatar.mention'), icon: <AtSignIcon /> }]
            : []),
          { id: 'profile', label: t('message.avatar.profile'), icon: <IconUserOutlineRegular /> },
        ]}
        onSelect={(id) => {
          if (id === 'message') onMessage(request.botSlug);
          else if (id === 'mention') onMention(request.botSlug);
          else if (id === 'profile') onProfile(request.botSlug);
          onClose();
        }}
        onClose={onClose}
      />
    </span>
  );
}

function EmptyConversation({
  channel,
  bot,
  t,
}: {
  channel: ChannelSummary | undefined;
  bot: BotSummary | undefined;
  t: BotHarnessTranslate;
}): ReactElement {
  return (
    <div className="bh-chat-empty" {...stylex.props(messageStyles.emptyContainer)}>
      <PanelEmptyState icon="messages-circle">
        {channel?.type === 'group'
          ? `${channel.name} · ${t('main.group.note')}`
          : `${bot === undefined ? t('main.localChat') : t('main.localChat.with', { name: bot.displayName })} · ${t('main.localChat.hint')}`}
      </PanelEmptyState>
    </div>
  );
}

function ConversationView({
  onMobileBack,
  scopeKey,
  state,
  actions,
  companion,
  channelSidebar,
  dockPanels,
  profileCards = EMPTY_PROFILE_CARDS,
  nativeChatT,
  nativeSessions,
  t,
}: {
  onMobileBack?: (() => void) | undefined;
  scopeKey: string;
  state: ConversationStateView;
  actions: BridgeActions;
  companion?: WindowCompanions | undefined;
  channelSidebar: ChannelSidebarRegistry;
  dockPanels?: DockPanelHost | undefined;
  nativeSessions?: NativeSessionCatalog | undefined;
  profileCards?: ProfileCardRegistry | undefined;
  nativeChatT?: NativeChatFailureText | undefined;
  t: BotHarnessTranslate;
}): ReactElement {
  const sidebar = useChannelSidebar(state);
  const docked = useChannelDockActive();
  const workspaceEnabled = useContext(WorkspaceContext) !== undefined;
  const [detail, setDetail] = useScopedState<'files' | 'inbox' | undefined>(
    scopeKey,
    state.selection?.kind === 'bot' && state.selection.inboxRequest ? 'inbox' : undefined,
  );
  const filesOpen = detail === 'files';
  const conceptPanel =
    dockPanels?.available() === true &&
    dockPanels.panels().some((panel) => panel.id === 'concept-art')
      ? dockPanels
      : undefined;
  const conceptExpanded =
    conceptPanel !== undefined
      ? conceptPanel.isOpen('concept-art')
      : sidebar.mode !== 'hidden' && sidebar.isEntryExpanded('concept-art');
  const toggleConcept = (): void => {
    if (conceptPanel !== undefined) {
      if (conceptPanel.canOpen?.('concept-art') === false) {
        conceptPanel.close('concept-art');
        return;
      }
      conceptPanel.toggle('concept-art');
      return;
    }
    if (sidebar.mode === 'hidden') {
      sidebar.toggle();
      if (!sidebar.isEntryExpanded('concept-art')) sidebar.toggleEntry('concept-art');
      return;
    }
    sidebar.toggleEntry('concept-art');
  };
  const inboxOpen = detail === 'inbox';
  const setFilesOpen = (open: boolean) => setDetail(open ? 'files' : undefined);
  const setInboxOpen = (open: boolean) => setDetail(open ? 'inbox' : undefined);
  const dockBotEntries = useSyncExternalStore(
    channelSidebar.subscribe,
    () => channelSidebar.entries('personabot'),
    () => channelSidebar.entries('personabot'),
  );
  const dockGroupEntries = useSyncExternalStore(
    channelSidebar.subscribe,
    () => channelSidebar.entries('channel'),
    () => channelSidebar.entries('channel'),
  );
  const registeredDockPanels = useSyncExternalStore(
    dockPanels?.subscribe ?? subscribeWithoutPrefs,
    () => dockPanels?.panels(),
    () => dockPanels?.panels(),
  );
  const dockEntryPanels = useMemo(
    () =>
      dockPanelsFromEntries(
        [
          ...new Map(
            [...dockBotEntries, ...dockGroupEntries].map((entry) => [entry.id, entry]),
          ).values(),
        ].filter((entry) => !isChannelSettingsSection(entry)),
      ),
    [dockBotEntries, dockGroupEntries],
  );
  const dockPanelList = registeredDockPanels ?? dockEntryPanels;
  const dockChannelContext = resolveChannelSidebarContext(state);
  const dockChannelSummary = dockChannelContext?.channel;
  const dockBotDeleted = state.bots.some(
    (candidate) => candidate.slug === dockChannelContext?.botSlug && candidate.deleted === true,
  );
  const dockChannelBotSlug = dockBotDeleted ? undefined : dockChannelSummary?.botSlug;
  const dockChannel = useMemo<DockPanelChannel | undefined>(
    () =>
      dockChannelSummary === undefined
        ? undefined
        : {
            id: dockChannelSummary.id,
            type: dockChannelSummary.type,
            botSlug: dockChannelBotSlug,
          },
    [dockChannelSummary?.id, dockChannelSummary?.type, dockChannelBotSlug],
  );
  const dockBotSlug = dockBotDeleted ? undefined : dockChannelContext?.botSlug;
  const dockInboxMount = useMountedResource<HTMLSpanElement>(() => {
    if (!inboxOpen || dockBotSlug === undefined) return;
    void actions.refreshBotInbox(dockBotSlug);
    const timer = window.setInterval(() => void actions.refreshBotInbox(dockBotSlug), 10_000);
    return () => window.clearInterval(timer);
  }, [inboxOpen, dockBotSlug, actions]);
  const sendKey = useContext(ComposerSendKeyContext);
  const streamReplies = useContext(StreamReplies);
  const settingsScope = resolveChannelSidebarContext(state)?.scope ?? 'channel';
  const settingsEntries = useSyncExternalStore(
    channelSidebar.subscribe,
    () => channelSidebar.entries(settingsScope),
    () => channelSidebar.entries(settingsScope),
  );
  const settingsSections = channelSettingsSections(settingsEntries, state);
  const hasChannelSettings = !dockBotDeleted && settingsSections.length > 0;
  const settingsAttentionIds = useSyncExternalStore(
    channelSettings.subscribe,
    () => channelSettings.attentionOf(resolveChannelSidebarContext(state)?.channel?.id),
    () => channelSettings.attentionOf(resolveChannelSidebarContext(state)?.channel?.id),
  );
  const settingsAttention = channelSettingsAttentionSections(
    settingsSections,
    settingsAttentionIds,
  );
  const scrollRef = useScopedRef<HTMLDivElement | null>(scopeKey, null);
  const draftScope = conversationDraftKey(state);
  const recovery = useComposerRecovery(draftScope, store.getSnapshot, actions);
  const [draft, setDraft] = useConversationDraft(draftScope, 'text', '');
  const [allBotPreview, setAllBotPreview] = useScopedState<AllBotPreview>(scopeKey);
  const [allBotNotice, setAllBotNotice] = useScopedState<string>(scopeKey);
  const [mentionTokens, setMentionTokens] = useConversationDraft(draftScope, 'mentions', []);
  const [channelRefTokens, setChannelRefTokens] = useConversationDraft(
    draftScope,
    'channelRefs',
    [],
  );
  const [selectedMemoryView, setSelectedMemoryView] = useScopedState<
    { channelId: string } & (
      | { kind: 'commit'; sha: string }
      | { kind: 'file'; path: string }
      | { kind: 'working'; change: MemoryWorkingChange }
    )
  >(scopeKey);
  const chatScrollBeforeDiff = useScopedRef(scopeKey, 0);
  const [uploadItems, setUploadItems] = useConversationDraft(draftScope, 'uploads', []);
  const [restoreBlocked, setRestoreBlocked] = useScopedState(scopeKey, false);
  const [restoreFocusSignal, setRestoreFocusSignal] = useScopedState(scopeKey, 0);
  const uploadControllers = useScopedRef(scopeKey, new Map<string, AbortController>());
  const [replyTarget, setReplyTarget] = useConversationDraft(draftScope, 'reply', undefined);
  const submitting = useScopedRef(scopeKey, false);
  const recall = useScopedRef<
    | {
        scope: string;
        index: number;
        text: string;
        saved: { text: string; mentions: SelectedMention[]; channelRefs: SelectedChannelRef[] };
      }
    | undefined
  >(scopeKey, undefined);
  const [recallNotice, setRecallNotice] = useScopedState<string>(scopeKey);
  const [submissionNotice, setSubmissionNotice] = useScopedState<string>(scopeKey);
  const [compactNotice, setCompactNotice] = useScopedState<{
    seq: number;
    text: string;
    tone?: 'success';
    holdMs: number;
  }>(scopeKey);
  const [compacting, setCompacting] = useScopedState(scopeKey, false);
  const compactSeq = useRef(0);
  const submissionChannelId = draftScope === undefined ? undefined : state.conversation.channel?.id;
  const readSubmissions = () =>
    submissionChannelId === undefined
      ? undefined
      : actions.submissions.snapshot(submissionChannelId);
  const submissionSnapshot = useSyncExternalStore(
    actions.submissions.subscribe,
    readSubmissions,
    readSubmissions,
  );
  const submissionMount = useMountedResource<HTMLSpanElement>(() => {
    if (submissionChannelId === undefined) return;
    const sync = (event: StorageEvent): void => {
      if (event.key === null || event.key.startsWith(SUBMISSION_PREFIX))
        actions.submissions.sync(submissionChannelId);
    };
    window.addEventListener('storage', sync);
    void actions.submissions.reconcile(submissionChannelId);
    return () => window.removeEventListener('storage', sync);
  }, [actions, submissionChannelId]);
  const recallInput = (direction: 'older' | 'newer'): boolean => {
    if (draftScope === undefined || recovery.blocked) return false;
    const entries = recallEntries(submissionSnapshot?.attempts ?? []);
    const active = recall.current?.scope === draftScope ? recall.current : undefined;
    const step = stepRecall(active, direction, draft, entries);
    if (step.kind === 'ignore') {
      if (recall.current !== undefined) {
        recall.current = undefined;
        setRecallNotice(undefined);
      }
      return false;
    }
    if (step.kind === 'stay') return true;
    const saved =
      active !== undefined && active.text === draft
        ? active.saved
        : { text: draft, mentions: mentionTokens, channelRefs: channelRefTokens };
    if (step.kind === 'restore') {
      recall.current = undefined;
      setRecallNotice(undefined);
      recovery.update(saved);
      return true;
    }
    const entry = step.entry;
    const mentions = entry.mentions.filter(
      (mention) =>
        state.bots.some(
          (bot) => bot.slug === mention.botSlug && bot.paused !== true && !bot.deleted,
        ) &&
        (channel?.type !== 'group' || channel.members.includes(mention.botSlug)),
    );
    const channelRefs = entry.channelRefs.filter((ref) =>
      state.channels.some((item) => item.id === ref.channelId && item.type === 'group'),
    );
    recall.current = { scope: draftScope, ...step.cursor, saved };
    recovery.update({ text: entry.text, mentions, channelRefs });
    const dropped =
      mentions.length !== entry.mentions.length || channelRefs.length !== entry.channelRefs.length;
    const omitted = entry.replyTo !== undefined || (entry.attachments?.length ?? 0) > 0;
    const notice =
      (omitted ? t('composer.recallOmitted') : '') + (dropped ? t('composer.recallDropped') : '');
    setRecallNotice(notice === '' ? undefined : notice.trim());
    return true;
  };
  const followingLatest = useScopedRef(scopeKey, true);
  const lastTimelineTop = useScopedRef(scopeKey, 0);
  const pinTimelineToLatest = (element: HTMLElement): void => {
    element.scrollTop = element.scrollHeight;
    lastTimelineTop.current = element.scrollTop;
  };
  const companionReadMount = useMountedResource<HTMLElement>(
    (pane) => {
      let visible: boolean | undefined;
      const sync = () => {
        const next = (companion?.getSnapshot().companions.length ?? 0) > 0;
        if (visible === next) return;
        visible = next;
        if (next) pane.style.setProperty('--bh-companion-read-inset', COMPANION_READ_INSET + 'px');
        else pane.style.removeProperty('--bh-companion-read-inset');
        const timeline = pane.querySelector<HTMLElement>('.bh-chat-body');
        if (
          timeline &&
          followingLatest.current &&
          !store.getSnapshot().conversation.timeline.hasNewer
        ) {
          pinTimelineToLatest(timeline);
        }
      };
      sync();
      return companion?.subscribe(sync);
    },
    [companion, scopeKey],
  );
  const prependAnchor = useScopedRef<{
    firstId: string | undefined;
    y: number | undefined;
    top: number;
    height: number;
  } | null>(scopeKey, null);
  const lastRevision = useScopedRef<number | undefined>(scopeKey, undefined);
  const positioned = useScopedRef(scopeKey, false);
  const restoredScroll = useScopedRef(scopeKey, false);
  const placedUnreadDivider = useScopedRef<string | undefined>(scopeKey, undefined);
  const readMarkTimer = useScopedRef<number | undefined>(scopeKey, undefined);
  const [unseen, setUnseen] = useScopedState(scopeKey, 0);
  const [atLatest, setAtLatest] = useScopedState(scopeKey, true);
  const [messageMenu, setMessageMenu] = useScopedState<MessageMenuRequest | undefined>(scopeKey);
  const [reactionMenu, setReactionMenu] = useScopedState<MessageMenuRequest | undefined>(scopeKey);
  const [feedbackMessage, setFeedbackMessage] = useScopedState<string | undefined>(scopeKey);
  const [avatarMenu, setAvatarMenu] = useScopedState<AvatarMenuRequest | undefined>(scopeKey);
  const [inboxTarget, setInboxTarget] = useScopedState<InboxTarget | undefined>(scopeKey);
  const [selectedMessages, setSelectedMessages] = useScopedState<
    { channelId: string; ids: readonly string[] } | undefined
  >(scopeKey);
  const [profileViewOpen, setProfileViewOpen] = useScopedState(
    scopeKey,
    state.selection?.kind === 'bot' && state.selection.profile === true,
  );
  const [profileActivity, setProfileActivity] = useScopedState<ProfileActivity | undefined>(
    scopeKey,
    undefined,
  );
  const [profileUsageLoading, setProfileUsageLoading] = useScopedState(scopeKey, true);
  const [groupProfileActivity, setGroupProfileActivity] =
    useScopedState<GroupProfileActivity>(scopeKey);
  const conversation = state.conversation;
  const channel = conversation.channel;
  const dictationSlug = channel?.type === 'dm' ? channel.botSlug : undefined;
  const dictationPort = useMemo(() => {
    const port: unknown = actions.dictationPort?.(dictationSlug);
    if (port instanceof Promise) port.catch(() => undefined);
    return typeof (port as VoiceDictationPort | undefined)?.readiness === 'function'
      ? (port as VoiceDictationPort)
      : undefined;
  }, [actions, dictationSlug]);
  const botNames = new Map(state.bots.map((member) => [member.slug, member.displayName]));
  const dmBotSlug = channel?.type === 'dm' ? channel.botSlug : undefined;
  const hiddenActions = useSyncExternalStore(
    subscribeHiddenDmActions,
    () => hiddenDmActionsSnapshot(dmBotSlug),
    () => hiddenDmActionsSnapshot(dmBotSlug),
  );
  const memoryDisplay = useSyncExternalStore(
    subscribeHiddenDmActions,
    () => dmMemoryDisplaySnapshot(dmBotSlug),
    () => dmMemoryDisplaySnapshot(dmBotSlug),
  );
  const messages = conversation.messages;
  const timelineDrafts =
    conversation.timeline.hasNewer || !streamReplies ? undefined : conversation.drafts;
  const visibleMessages = useMemo(
    () =>
      visibleDmMessages(messages, hiddenActions).filter(
        (message) => message.takeoverResolution === undefined,
      ),
    [messages, hiddenActions],
  );
  const takeoverTimeline = useMemo(
    () => ({
      resolutions: takeoverResolutions(messages),
      open: (target: TakeoverTarget, botSlug: string): boolean => {
        const panel = TAKEOVER_PANELS[target];
        if (dockPanels === undefined || !dockPanels.panels().some((entry) => entry.id === panel))
          return false;
        if (channel?.type !== 'dm' || channel.botSlug !== botSlug) {
          void actions.openBot(botSlug).then(() => dockPanels.open(panel));
          return true;
        }
        if (dockPanels.canOpen?.(panel) === false) return false;
        dockPanels.open(panel);
        return true;
      },
    }),
    [messages, dockPanels, channel, actions],
  );
  const displayMessages = useMemo<readonly ChannelMessage[]>(() => {
    if (timelineDrafts === undefined || timelineDrafts.length === 0) return visibleMessages;
    return [
      ...visibleMessages,
      ...timelineDrafts.map((item) => ({
        id: item.draftId,
        at: '',
        author: { kind: 'bot' as const, slug: item.botSlug },
        body: item.body,
        streaming: true,
      })),
    ];
  }, [visibleMessages, timelineDrafts]);
  const timelineDecisions = useMemo(
    () => ({
      resolvedGrantRequests: resolvedGrantRequestIds(visibleMessages),
      toolApprovalDecisions: new Map(
        visibleMessages
          .filter((item) => item.toolApprovalDecision !== undefined)
          .map((item) => [
            item.toolApprovalDecision!.requestMessageId,
            item.toolApprovalDecision!.outcome,
          ]),
      ),
      userQuestionResolutions: new Map(
        visibleMessages
          .filter((item) => item.userQuestionResolution !== undefined)
          .map((item) => [
            item.userQuestionResolution!.requestMessageId,
            item.userQuestionResolution!.state,
          ]),
      ),
    }),
    [visibleMessages],
  );
  const reading = useMemo(() => readingBots(messages), [messages]);
  const selection = state.selection;
  const bot =
    selection?.kind === 'bot'
      ? state.bots.find((candidate) => candidate.slug === selection.slug)
      : undefined;
  const botDm = isBotDmChannel(channel);
  const deletedBotDm =
    channel?.type === 'dm' &&
    state.bots.find((candidate) => candidate.slug === channel.botSlug)?.deleted === true;
  const readOnlyDm = isHumanReadOnlyDmChannel(channel) || deletedBotDm;
  const profileBot =
    channel?.type === 'dm' && channel.botSlug !== undefined
      ? state.bots.find((candidate) => candidate.slug === channel.botSlug)
      : undefined;
  const profileBotActivity =
    profileBot === undefined ? undefined : personaBotActivity(state, profileBot);
  const title =
    channel?.type === 'dm'
      ? botDm
        ? botDmTitle(channel, state.bots)
        : (bot?.displayName ??
          state.bots.find((candidate) => candidate.slug === channel.botSlug)?.displayName ??
          channel.name)
      : (channel?.name ?? bot?.displayName ?? t('main.group.title'));
  const botActivity = bot === undefined ? undefined : personaBotActivity(state, bot);
  const channelBots =
    channel !== undefined && (channel.type === 'group' || botDm)
      ? channel.members.flatMap((slug) => {
          const member = state.bots.find((candidate) => candidate.slug === slug);
          return member === undefined ? [] : [member];
        })
      : [];
  const channelFacepile: PersonaBotFacepileItem[] = channelBots.map((member) => ({
    personaBotId: member.slug,
    name: member.displayName,
    src: member.avatar,
    appearance: member.appearance,
    avatarSeed: member.avatarSeed,
    state: personaBotActivity(state, member),
    activity: member.activity,
    attention: member.attention,
    sessions: member.sessionActivity,
  }));
  const activeFacepile = channelFacepile.filter(
    (item) => item.state !== 'idle' || item.attention !== undefined,
  );
  const dmBot = bot ?? (channel?.type === 'dm' && !botDm ? profileBot : undefined);
  const sessionStop = useHeaderSessionStop();
  const sessionStopGroups = runningSessionGroups(
    readOnlyDm || channel === undefined
      ? []
      : channel.type === 'group'
        ? channelBots.filter((member) => member.deleted !== true)
        : channel.type === 'dm' && !botDm && profileBot !== undefined
          ? [profileBot]
          : [],
  );
  const sessionStopCount = runningSessionCount(sessionStopGroups);
  const dmBotActivity = dmBot === undefined ? undefined : personaBotActivity(state, dmBot);
  const composerFacepile: PersonaBotFacepileItem[] =
    dmBot === undefined
      ? activeFacepile
      : dmBotActivity === undefined ||
          (dmBotActivity === 'idle' && attentionCount(dmBot.attention) === 0)
        ? []
        : [
            {
              personaBotId: dmBot.slug,
              name: dmBot.displayName,
              src: dmBot.avatar,
              appearance: dmBot.appearance,
              avatarSeed: dmBot.avatarSeed,
              state: dmBotActivity,
              activity: dmBot.activity,
              attention: dmBot.attention,
              sessions: dmBot.sessionActivity,
            },
          ];
  const composerActivity: ChannelComposerActivity | undefined =
    channel?.type === 'group'
      ? groupComposerActivity(channelFacepile, t)
      : composerFacepile.length === 0
        ? undefined
        : {
            items: composerFacepile,
            summary:
              composerFacepile.length === 1
                ? `${composerFacepile[0]?.name ?? 'PersonaBot'} ${personaBotPresentationSummary(composerFacepile[0]?.state ?? 'idle', composerFacepile[0]?.activity, composerFacepile[0]?.attention, t)}`
                : t('main.activity.bots', { count: composerFacepile.length }),
          };
  const streamingBotSlugs = new Set(timelineDrafts?.map((item) => item.botSlug));
  const latestMessage = messages.findLast(
    (item) =>
      item.botDmAction === undefined &&
      item.botCreateAction === undefined &&
      item.botChannelPost === undefined &&
      item.memoryCommit === undefined &&
      item.memberDeparture === undefined &&
      item.turnStop === undefined &&
      item.voiceCallRecord === undefined &&
      item.toolAutoApproval === undefined &&
      item.toolAutoApprovalPause === undefined,
  );
  const workingRows = timelineWorkingRows(
    conversation.status === 'ready' ? composerActivity : undefined,
    streamingBotSlugs,
    latestMessage?.author.kind === 'bot' ? latestMessage.author.slug : undefined,
  );
  const dmWorking = channel?.type !== 'group' && workingRows.items.length > 0;
  const channelId = channel?.id;
  const reactToMessage =
    readOnlyDm || channelId === undefined || actions.reactToMessage === undefined
      ? undefined
      : (message: ChannelMessage, emoji: string, active: boolean) =>
          void actions
            .reactToMessage?.(channelId, message.id, emoji, active)
            .catch((error: unknown) => {
              console.warn('botharness: reaction failed', error);
            });
  const selectedIds =
    selectedMessages !== undefined && selectedMessages.channelId === channelId
      ? selectedMessages.ids
      : undefined;
  const messageSelection = useMemo<MessageSelection | undefined>(
    () =>
      channelId === undefined
        ? undefined
        : {
            selected: new Set(selectedIds ?? []),
            active: selectedIds !== undefined,
            begin: (message) => {
              setMessageMenu(undefined);
              setSelectedMessages({ channelId, ids: toggleSelection([], message) });
            },
            toggle: (message) =>
              setSelectedMessages((current) =>
                current === undefined || current.channelId !== channelId
                  ? current
                  : { channelId, ids: toggleSelection(current.ids, message) },
              ),
          },
    [channelId, selectedIds],
  );
  const cancelSelection = useCallback(() => setSelectedMessages(undefined), [scopeKey]);
  const [selectionBusy, setSelectionBusy] = useScopedState(scopeKey, false);
  const [selectionImage, setSelectionImage] = useScopedState<Blob | undefined>(scopeKey);
  const snapshotScope = useRef(scopeKey);
  snapshotScope.current = scopeKey;
  const [selectionNotice, setSelectionNotice] = useScopedState<string>(scopeKey);
  const flashSelectionNotice = (notice: string): void => {
    setSelectionNotice(notice);
    window.setTimeout(
      () => setSelectionNotice((current) => (current === notice ? undefined : current)),
      2500,
    );
  };
  const selectionAuthor = (message: ChannelMessage): string =>
    authorLabel(message, state.bots, t, channelHumanName(channel));
  const copySelection = async (ids: readonly string[]): Promise<void> => {
    const text = conversationText(ids, messages, {
      title,
      author: selectionAuthor,
      attachment: t('selection.attachment'),
    });
    try {
      await navigator.clipboard.writeText(text);
      flashSelectionNotice(t('selection.copied', { count: String(ids.length) }));
    } catch {
      flashSelectionNotice(t('selection.failed'));
    }
  };
  const exportSelectionImage = async (ids: readonly string[]): Promise<void> => {
    const timeline = scrollRef.current;
    const range = selectionRange(ids, messages);
    if (timeline === null || range === undefined) return;
    const first = messages.find((message) => message.id === range.fromMessageId);
    const last = messages.find(
      (message) => message.id === (range.toMessageId ?? range.fromMessageId),
    );
    const sheet = buildMessageSnapshot(
      timeline,
      ids,
      title,
      [first, last]
        .filter((message) => message !== undefined)
        .map((message) =>
          new Date(message.at).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        )
        .filter((value, index, all) => all.indexOf(value) === index)
        .join(' – '),
    );
    if (sheet === undefined) return;
    setSelectionBusy(true);
    try {
      const blob = await renderMessageSnapshot(timeline, sheet);
      if (blob === undefined) throw new Error('snapshot-empty');
      if (snapshotScope.current === scopeKey) setSelectionImage(blob);
    } catch {
      flashSelectionNotice(t('selection.failed'));
    } finally {
      setSelectionBusy(false);
    }
  };
  const memoryCommitIntent = state.memoryCommitIntent;
  const activeMemoryView =
    selectedMemoryView?.channelId === channelId
      ? selectedMemoryView
      : memoryCommitIntent !== undefined && memoryCommitIntent.channelId === channelId
        ? { channelId, kind: 'commit' as const, sha: memoryCommitIntent.sha }
        : undefined;
  const selectedMemoryCommitSha =
    activeMemoryView?.kind === 'commit' ? activeMemoryView.sha : undefined;
  const openMemoryView = (
    view:
      | { kind: 'commit'; sha: string }
      | { kind: 'file'; path: string }
      | { kind: 'working'; change: MemoryWorkingChange },
  ): void => {
    if (activeMemoryView === undefined)
      chatScrollBeforeDiff.current = scrollRef.current?.scrollTop ?? 0;
    setProfileViewOpen(false);
    if (memoryCommitIntent !== undefined) store.setMemoryCommitIntent(undefined);
    if (channelId !== undefined) setSelectedMemoryView({ channelId, ...view });
  };
  const closeMemoryView = (): void => {
    if (memoryCommitIntent !== undefined) store.setMemoryCommitIntent(undefined);
    setSelectedMemoryView(undefined);
    window.requestAnimationFrame(() => {
      const element = scrollRef.current;
      if (element === null) return;
      element.scrollTop = chatScrollBeforeDiff.current;
      lastTimelineTop.current = element.scrollTop;
    });
  };
  const scheduleReadMark = (): void => {
    const element = scrollRef.current;
    if (channelId === undefined || element === null || conversation.status !== 'ready') return;
    const committedIds = committedMessageIds(messages);
    const viewport = element.getBoundingClientRect();
    const visible = Array.from(element.querySelectorAll<HTMLElement>('[data-message-id]'))
      .filter((candidate) => {
        const id = candidate.dataset['messageId'];
        if (id === undefined || !committedIds.has(id)) return false;
        const bounds = candidate.getBoundingClientRect();
        return bounds.top < viewport.bottom && bounds.bottom > viewport.top;
      })
      .at(-1);
    const messageId = visible?.dataset['messageId'];
    if (messageId === undefined) return;
    window.clearTimeout(readMarkTimer.current);
    readMarkTimer.current = window.setTimeout(() => {
      if (currentChannel.current !== channelId) return;
      void actions.markRead(channelId, messageId).catch((error: unknown) => {
        console.warn('botharness: channel read position failed', error);
      });
    }, 250);
  };

  const currentChannel = useRef(channelId);
  currentChannel.current = channelId;
  const previewRoster = channelBots
    .map((bot) => [bot.slug, bot.paused, bot.displayName].join(':'))
    .join('|');
  const allBotPreviewMount = useMountedResource<HTMLSpanElement>(() => {
    let cancelled = false;
    setAllBotPreview(undefined);
    if (channel?.type === 'group')
      void actions
        .allBotPreview(channel.id)
        .then((preview) => {
          if (!cancelled) setAllBotPreview(preview);
        })
        .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [scopeKey, channelId, previewRoster]);
  const [searchTop, setSearchTop] = useScopedState<number | undefined>(scopeKey, undefined);
  const searchAvailable = useScopedRef(scopeKey, false);
  const searchReturnFocus = useScopedRef<HTMLElement | null>(scopeKey, null);
  searchAvailable.current =
    channelId !== undefined &&
    actions.searchChannel !== undefined &&
    activeMemoryView === undefined &&
    !profileViewOpen;
  const searchShortcutMount = useMountedResource<HTMLSpanElement>(
    (node) => {
      const onKeyDown = (event: KeyboardEvent): void => {
        if (
          !(event.metaKey || event.ctrlKey) ||
          event.altKey ||
          event.shiftKey ||
          event.key.toLowerCase() !== 'f' ||
          !searchAvailable.current ||
          document.querySelector('[aria-modal="true"]') !== null
        )
          return;
        const pane = node.parentElement?.querySelector<HTMLElement>('.bh-chat-pane');
        const bar = pane?.querySelector<HTMLElement>('.bh-topbar');
        if (pane == null) return;
        event.preventDefault();
        const field = pane.querySelector<HTMLInputElement>('[data-conversation-search] input');
        if (field === null && document.activeElement instanceof HTMLElement)
          searchReturnFocus.current = document.activeElement;
        const offset =
          bar == null ? 0 : bar.getBoundingClientRect().bottom - pane.getBoundingClientRect().top;
        setSearchTop(Math.max(0, offset) + SEARCH_PANEL_GAP_PX);
        field?.select();
      };
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    },
    [scopeKey],
  );
  const conversationMount = useMountedResource<HTMLDivElement>(() => {
    currentChannel.current = channelId;
    setAllBotNotice(undefined);
    return () => {
      currentChannel.current = undefined;
      window.clearTimeout(readMarkTimer.current);
      for (const controller of uploadControllers.current.values()) controller.abort();
      uploadControllers.current.clear();
      setUploadItems((items) =>
        items.map((item) =>
          item.status === 'uploading' ? { ...item, status: 'error', error: undefined } : item,
        ),
      );
    };
  }, [channelId, scopeKey]);

  const profileMount = useMountedResource<HTMLDivElement>(() => {
    if (channel?.type !== 'dm' && !profileViewOpen) return;
    let cancelled = false;
    let fetching = false;
    const refreshUsage = (): void => {
      if (fetching || channelId === undefined || channel?.type !== 'dm') return;
      fetching = true;
      setProfileUsageLoading(true);
      void actions
        .profileActivity(channelId)
        .then(
          (activity) => {
            if (!cancelled)
              setProfileActivity(activity?.slug === channel.botSlug ? activity : undefined);
          },
          () => {
            if (!cancelled) setProfileActivity(undefined);
          },
        )
        .finally(() => {
          fetching = false;
          if (!cancelled) setProfileUsageLoading(false);
        });
    };
    if (channelId !== undefined) {
      if (channel?.type === 'group')
        void actions.groupProfileActivity(channelId).then(
          (activity) => {
            if (!cancelled) setGroupProfileActivity(activity);
          },
          (error: unknown) => {
            console.warn('botharness: Group Profile activity failed', error);
          },
        );
      else refreshUsage();
    }
    const usageTimer =
      channel?.type === 'dm' ? window.setInterval(refreshUsage, 30_000) : undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!profileViewOpen) return;
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]') !== null) return;
      event.preventDefault();
      setProfileViewOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelled = true;
      window.clearInterval(usageTimer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [
    scopeKey,
    actions,
    channel?.type,
    channelId,
    profileViewOpen,
    messages.findLast((message) => !message.pending && !message.failed && !message.streaming)?.id,
  ]);

  const footerPreferences = useFooterPreferences();
  const { mount: replyPerfMount, average: avgPerf } = useReplyPerf(
    actions,
    channelId,
    state.channels.find((item) => item.id === channelId)?.latestMessage,
    !footerPreferences.hidden.includes('avg-perf'),
    state.contentPurgeRevision ?? 0,
  );
  const dmComposerContext = useDmComposerContext({
    bot: channel?.type === 'dm' && !readOnlyDm ? profileBot : undefined,
    channelId,
    actions,
    companion,
    activity: profileActivity,
    loading: profileUsageLoading,
    t,
    avgPerf,
    onUsage: () => {
      setProfileViewOpen(true);
    },
  });

  const groupComposerContext = useGroupComposerContext({
    channel,
    members: channelBots,
    actions,
    t,
    avgPerf,
  });
  const baseComposerContext = dmComposerContext ?? groupComposerContext;
  const openProfileView = (): void => {
    setSelectedMemoryView(undefined);
    setProfileViewOpen(true);
  };
  const compactProfileBot = async (): Promise<void> => {
    if (profileBot === undefined) return;
    const show = (text: string, holdMs: number, tone?: 'success') => {
      compactSeq.current += 1;
      setCompactNotice({ seq: compactSeq.current, text, holdMs, ...(tone ? { tone } : {}) });
    };
    setCompacting(true);
    show(t('composerCompact.running'), 120000);
    try {
      const result = await actions.compactBot(profileBot.slug);
      const tokens = (value: number | null) => (value === null ? '?' : value.toLocaleString());
      if (result.outcome === 'compacted')
        show(
          t('composerCompact.done', {
            before: tokens(result.tokensBefore),
            after: tokens(result.tokensAfter),
          }),
          4000,
          'success',
        );
      else
        show(
          t(
            result.outcome === 'busy'
              ? 'composerCompact.busy'
              : result.outcome === 'not-loaded'
                ? 'composerCompact.notLoaded'
                : 'composerCompact.nothing',
          ),
          result.outcome === 'nothing' ? 3000 : 6000,
        );
    } catch (error) {
      show(
        t(
          error instanceof BridgeCallError && error.code === 'session-unsaved'
            ? 'failure.recoveryUnsaved'
            : 'composerCompact.failed',
        ),
        6000,
      );
    } finally {
      setCompacting(false);
    }
  };
  const conversationShortcuts: ComposerShortcut[] = [
    ...(dmComposerContext === undefined
      ? []
      : [
          {
            id: 'memory' as const,
            label: t('composerCommand.memory'),
            icon: <ChannelSidebarIcon name="files" />,
            run: () => sidebar.openTab('memory'),
          },
          {
            id: 'sessions' as const,
            label: t('composerCommand.sessions'),
            icon: <ChannelSidebarIcon name="text-quote" />,
            run: () => sidebar.openTab('conversation'),
          },
          {
            id: 'compact' as const,
            label: t('composerCommand.compact'),
            icon: <ChannelSidebarIcon name="archive" />,
            disabled: compacting,
            run: () => void compactProfileBot(),
          },
          {
            id: 'new' as const,
            label: t('composerCommand.newSession'),
            icon: <ChannelSidebarIcon name="text-quote" />,
            disabled: compacting,
            run: () => {
              if (!profileBot || compacting) return;
              setCompacting(true);
              void actions
                .newBotSession(profileBot.slug)
                .then(() => {
                  setCompactNotice({
                    seq: ++compactSeq.current,
                    text: t('composerCommand.newSessionDone'),
                    holdMs: 4000,
                  });
                })
                .catch(() => {
                  setCompactNotice({
                    seq: ++compactSeq.current,
                    text: t('composerCompact.failed'),
                    holdMs: 6000,
                  });
                })
                .finally(() => setCompacting(false));
            },
          },
        ]),
    {
      id: 'profile',
      label: t('composerCommand.profile'),
      icon: <ChannelSidebarIcon name={channel?.type === 'group' ? 'users' : 'id-card'} />,
      run: openProfileView,
    },
    ...(hasChannelSettings
      ? [
          {
            id: 'settings' as const,
            label: t('composerCommand.settings'),
            icon: <ChannelSidebarIcon name="settings" />,
            run: () => channelSettings.open(settingsAttention[0]?.id),
          },
        ]
      : []),
    {
      id: 'sidebar',
      label: t(sidebar.mode === 'hidden' ? 'sidebar.expand' : 'sidebar.collapse'),
      icon: <ChannelSidebarIcon name="panels-top-left" />,
      run: sidebar.toggle,
    },
  ];
  const composerContext =
    baseComposerContext === undefined
      ? undefined
      : {
          ...baseComposerContext,
          shortcuts: [...baseComposerContext.shortcuts, ...conversationShortcuts],
        };

  const loadOlderAtTop = (retry = false): void => {
    const element = scrollRef.current;
    if (
      element === null ||
      channelId === undefined ||
      !conversation.timeline.hasOlder ||
      conversation.timeline.loadingOlder ||
      (!retry && conversation.timeline.olderError !== undefined) ||
      prependAnchor.current !== null
    )
      return;
    prependAnchor.current = {
      firstId: messages[0]?.id,
      y: element.querySelector<HTMLElement>('[data-message-id]')?.getBoundingClientRect().top,
      top: element.scrollTop,
      height: element.scrollHeight,
    };
    void actions.loadOlder(channelId);
  };

  const loadNewerAtBottom = (): void => {
    if (
      channelId === undefined ||
      !conversation.timeline.hasNewer ||
      conversation.timeline.loadingNewer ||
      conversation.timeline.newerError !== undefined
    )
      return;
    void actions.loadNewer(channelId);
  };

  const restoreFailedMessage = (message: ChannelMessage): void => {
    if (channelId === undefined) return;
    if (draft.length > 0 || uploadItems.length > 0 || conversation.sending) {
      setRestoreBlocked(true);
      return;
    }
    if (message.unconfirmed === true) {
      setSubmissionNotice(t('composer.submissionChecking'));
      void actions.submissions
        .check(channelId, message.id)
        .then(async (status) => {
          if (status === 'unknown') {
            setSubmissionNotice(t('composer.submissionUncheckable'));
            return;
          }
          await actions.submissions.reconcile(channelId);
          setSubmissionNotice(
            t(
              status === 'committed'
                ? 'composer.submissionDelivered'
                : 'composer.submissionNotDelivered',
            ),
          );
        })
        .catch(() => setSubmissionNotice(t('composer.submissionUncheckable')));
      return;
    }
    if (!actions.dismissFailedMessage(channelId, message.id)) return;
    setDraft(message.body);
    setMentionTokens(message.mentions ?? []);
    setChannelRefTokens(message.channelRefs ?? []);
    setUploadItems(
      (message.attachments ?? []).map((ref) => ({
        id: crypto.randomUUID(),
        file: new File([], ref.name, { type: ref.mime }),
        ref,
        status: 'ready' as const,
      })),
    );
    setReplyTarget(
      message.replyTo === undefined
        ? undefined
        : messages.find((candidate) => candidate.id === message.replyTo),
    );
    setRestoreBlocked(false);
    setRestoreFocusSignal((value) => value + 1);
  };
  const quoteMessage = (message: ChannelMessage): void => {
    const author = message.author;
    const member =
      channel?.type === 'group' && author.kind === 'bot'
        ? channelBots.find(
            (candidate) =>
              candidate.slug === author.slug &&
              candidate.deleted !== true &&
              candidate.paused !== true,
          )
        : undefined;
    if (member === undefined) {
      setReplyTarget(message);
      return;
    }
    const next = quoteMention(draft, mentionTokens, member.slug, member.displayName);
    recovery.update({
      reply: message,
      text: next.value,
      mentions: next.mentions,
      channelRefs: rebaseChannelRefs(draft, next.value, channelRefTokens),
    });
    setRestoreFocusSignal((value) => value + 1);
  };

  const timelineHandlers = {
    contextMenu: (message: ChannelMessage, x: number, y: number) => {
      setAvatarMenu(undefined);
      setMessageMenu({ message, x, y });
    },
    avatarMenu: (botSlug: string, x: number, y: number) => {
      setMessageMenu(undefined);
      setAvatarMenu({ botSlug, x, y });
    },
    reply: (message: ChannelMessage) => quoteMessage(message),
    react: (message: ChannelMessage, emoji: string, active: boolean) =>
      reactToMessage?.(message, emoji, active),
    jumpReply: (messageId: string) => {
      if (channelId !== undefined) void actions.openAround(channelId, messageId);
    },
    restoreFailed: restoreFailedMessage,
    openInbox: (target: InboxTarget) => setInboxTarget(target),
    openMemoryView,
  };
  const latestTimeline = useRef(timelineHandlers);
  latestTimeline.current = timelineHandlers;
  const timelineCallbacks = useMemo(
    () => ({
      contextMenu: (message: ChannelMessage, x: number, y: number) =>
        latestTimeline.current.contextMenu(message, x, y),
      avatarMenu: (botSlug: string, x: number, y: number) =>
        latestTimeline.current.avatarMenu(botSlug, x, y),
      reply: (message: ChannelMessage) => latestTimeline.current.reply(message),
      react: (message: ChannelMessage, emoji: string, active: boolean) =>
        latestTimeline.current.react(message, emoji, active),
      jumpReply: (messageId: string) => latestTimeline.current.jumpReply(messageId),
      restoreFailed: (message: ChannelMessage) => latestTimeline.current.restoreFailed(message),
      openInbox: (target: InboxTarget) => latestTimeline.current.openInbox(target),
      memoryNavigation: {
        file: (path: string) => latestTimeline.current.openMemoryView({ kind: 'file', path }),
        commit: (sha: string) => latestTimeline.current.openMemoryView({ kind: 'commit', sha }),
        working: (change: MemoryWorkingChange) =>
          latestTimeline.current.openMemoryView({ kind: 'working', change }),
      },
    }),
    [],
  );
  const unreadAfter = conversation.unreadAfterMessageId;
  const committedGroups = useMemo(
    () => groupChannelMessages(visibleMessages, unreadAfter),
    [visibleMessages, unreadAfter],
  );
  const messageGroups = useMemo(
    () =>
      displayMessages === visibleMessages
        ? committedGroups
        : [
            ...committedGroups,
            ...groupChannelMessages(displayMessages.slice(visibleMessages.length)),
          ],
    [committedGroups, displayMessages, visibleMessages],
  );
  const arrivalIds = useMemo(
    () =>
      visibleMessages
        .filter((item) => !streamReplies || item.author.kind !== 'bot')
        .map((item) => item.id),
    [visibleMessages, streamReplies],
  );
  const arrivals = useMessageArrivals(channelId, arrivalIds, conversation.status === 'ready');
  const galleryImages = useMemo<GalleryImage[]>(
    () =>
      channelId === undefined
        ? []
        : visibleMessages.flatMap((message) =>
            message.contentPurged === true
              ? []
              : (message.attachments ?? []).flatMap((ref) =>
                  inlineImageAttachment(ref.mime)
                    ? [
                        {
                          key: galleryImageKey(message.id, ref),
                          src: channelAttachmentUrl(ref, { channelId, messageId: message.id }),
                          alt: ref.name,
                        },
                      ]
                    : [],
                ),
          ),
    [channelId, visibleMessages],
  );
  const imageGallery = useMessageImageGallery(galleryImages, t);
  const groupShape = useStableGroupShape(messageGroups);
  const groupKeys = groupShape.keys;
  const groupMembers = groupShape.members;
  const pinnedGroups = useMemo(() => {
    const pinned = new Set<string>();
    const focus = conversation.focusMessageId;
    groupKeys.forEach((key, index) => {
      const ids = groupMembers.get(key) ?? [];
      const previous = index === 0 ? undefined : groupMembers.get(groupKeys[index - 1]!);
      if (
        (focus !== undefined && ids.includes(focus)) ||
        (unreadAfter !== undefined && previous?.at(-1) === unreadAfter)
      )
        pinned.add(key);
    });
    return pinned;
  }, [groupKeys, groupMembers, unreadAfter, conversation.focusMessageId]);
  const timelineWindow = useTimelineWindow(groupKeys, pinnedGroups, groupMembers);
  const placeUnreadDivider = (element: HTMLDivElement): boolean => {
    const divider = element.querySelector<HTMLElement>('[data-unread-divider]');
    if (divider === null) return false;
    const viewport = element.getBoundingClientRect();
    element.scrollTop += divider.getBoundingClientRect().top - viewport.top - viewport.height / 4;
    lastTimelineTop.current = element.scrollTop;
    followingLatest.current =
      !conversation.timeline.hasNewer &&
      element.scrollHeight - element.scrollTop - element.clientHeight <= 80;
    setAtLatest(followingLatest.current);
    return true;
  };

  const timelineMount = useMountedResource<HTMLDivElement>(
    (element) => {
      scrollRef.current = element;
      timelineWindow.rootRef(element);
      if (conversation.timeline.olderError !== undefined) prependAnchor.current = null;
      if (conversation.status === 'ready') {
        if (conversation.focusMessageId !== undefined && conversation.timeline.hasNewer) {
          followingLatest.current = false;
          setAtLatest(false);
        }
        const anchor = prependAnchor.current;
        if (anchor !== null && messages[0]?.id !== anchor.firstId) {
          const retained = Array.from(
            element.querySelectorAll<HTMLElement>('[data-message-id]'),
          ).find((candidate) => candidate.dataset['messageId'] === anchor.firstId);
          if (retained !== undefined && anchor.y !== undefined) {
            element.scrollTop += retained.getBoundingClientRect().top - anchor.y;
          } else {
            element.scrollTop = anchor.top + element.scrollHeight - anchor.height;
          }
          lastTimelineTop.current = element.scrollTop;
          prependAnchor.current = null;
        } else if (
          unreadAfter !== undefined &&
          placedUnreadDivider.current !== unreadAfter &&
          !restoredScroll.current &&
          conversation.focusMessageId === undefined &&
          placeUnreadDivider(element)
        ) {
          placedUnreadDivider.current = unreadAfter;
          positioned.current = true;
        } else if (
          !positioned.current &&
          conversation.focusMessageId === undefined &&
          messages.length > 0
        ) {
          positioned.current = true;
          const saved = channelId === undefined ? undefined : rememberedTimelineScroll(channelId);
          if (saved !== undefined && !saved.atLatest && restoreTimelineScroll(element, saved)) {
            restoredScroll.current = true;
            lastTimelineTop.current = element.scrollTop;
            followingLatest.current = false;
            setAtLatest(false);
          } else if (followingLatest.current) pinTimelineToLatest(element);
        } else if (followingLatest.current) {
          pinTimelineToLatest(element);
        }
        const previousRevision = lastRevision.current;
        if (
          previousRevision !== undefined &&
          conversation.revision > previousRevision &&
          !followingLatest.current
        ) {
          setUnseen((count) => count + conversation.revision - previousRevision);
        }
        lastRevision.current = conversation.revision;
      }
      const id = conversation.focusMessageId;
      let focusTimer: number | undefined;
      if (id !== undefined) {
        positioned.current = true;
        const target = Array.from(element.querySelectorAll<HTMLElement>('[data-message-id]')).find(
          (candidate) => candidate.dataset['messageId'] === id,
        );
        target?.scrollIntoView({ block: 'center' });
        lastTimelineTop.current = element.scrollTop;
        focusTimer = window.setTimeout(() => {
          const current = store.getSnapshot().conversation;
          if (current.channel?.id === channelId && current.focusMessageId === id) {
            store.setConversation({ focusMessageId: undefined });
          }
        }, 2200);
      }
      const frame = window.requestAnimationFrame(() => {
        if (element.scrollHeight <= element.clientHeight + 1) {
          loadOlderAtTop();
          loadNewerAtBottom();
        }
        if (conversation.status === 'ready') scheduleReadMark();
      });
      return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(focusTimer);
        scrollRef.current = null;
      };
    },
    [
      scopeKey,
      actions,
      channelId,
      conversation.status,
      conversation.drafts,
      conversation.revision,
      conversation.focusMessageId,
      unreadAfter,
      conversation.timeline.hasOlder,
      conversation.timeline.hasNewer,
      conversation.timeline.loadingOlder,
      conversation.timeline.loadingNewer,
      conversation.timeline.olderError,
      conversation.timeline.newerError,
      messages,
    ],
  );

  const onTimelineScroll = (): void => {
    const element = scrollRef.current;
    if (element === null) return;
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight <= 80;
    followingLatest.current = followsLatest(
      element,
      lastTimelineTop.current,
      conversation.timeline.hasNewer,
    );
    lastTimelineTop.current = element.scrollTop;
    setAtLatest(followingLatest.current);
    if (followingLatest.current) setUnseen(0);
    if (channelId !== undefined && conversation.status === 'ready' && positioned.current) {
      const position = timelineScrollAnchor(element, followingLatest.current);
      if (position !== undefined) rememberTimelineScroll(channelId, position);
    }
    scheduleReadMark();
    if (element.scrollTop <= 48) loadOlderAtTop();
    if (atBottom) loadNewerAtBottom();
  };

  const jumpToLatest = (): void => {
    followingLatest.current = true;
    setAtLatest(true);
    setUnseen(0);
    if (conversation.timeline.hasNewer && channelId !== undefined) {
      void actions.openLatest(channelId).catch((error: unknown) => {
        console.warn('botharness: latest timeline reload failed', error);
      });
      return;
    }
    const element = scrollRef.current;
    if (element !== null) pinTimelineToLatest(element);
  };

  const startUpload = (item: ChannelComposerUpload): void => {
    if (item.fileAvailable === false || recovery.blocked) return;
    const controller = new AbortController();
    uploadControllers.current.set(item.id, controller);
    setUploadItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, status: 'uploading', error: undefined } : entry,
      ),
    );
    void uploadChannelAttachment(item.file, controller.signal, item.id)
      .then((ref) => {
        if (controller.signal.aborted) return;
        setUploadItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, status: 'ready', ref } : entry,
          ),
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setUploadItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: 'error',
                  error: error instanceof Error ? error.message : String(error),
                }
              : entry,
          ),
        );
      })
      .finally(() => {
        if (uploadControllers.current.get(item.id) === controller)
          uploadControllers.current.delete(item.id);
      });
  };

  const toggleGeneratedFile = (ref: ChannelAttachmentRef): void => {
    if (readOnlyDm || conversation.sending || recovery.blocked) return;
    const existing = uploadItems.find(
      (item) => item.ref !== undefined && attachmentIdentity(item.ref) === attachmentIdentity(ref),
    );
    if (existing === undefined && uploadItems.length >= 10) return;
    const item: ChannelComposerUpload = existing ?? {
      id: attachmentIdentity(ref),
      file: new File([], ref.name, { type: ref.mime }),
      fileAvailable: false,
      ref,
      status: 'ready',
    };
    const inserted = existing === undefined ? insertAttachmentReferences(draft, [item]) : undefined;
    const selected =
      inserted === undefined
        ? removeAttachmentReferences(draft, item, mentionTokens, channelRefTokens)
        : {
            value: inserted.value,
            mentions: rebaseMentions(draft, inserted.value, mentionTokens),
            channelRefs: rebaseChannelRefs(draft, inserted.value, channelRefTokens),
          };
    recovery.update({
      text: selected.value,
      mentions: selected.mentions,
      channelRefs: selected.channelRefs,
      uploads:
        existing === undefined
          ? [...uploadItems, item]
          : uploadItems.filter((entry) => entry.id !== existing.id),
    });
    setRestoreFocusSignal((value) => value + 1);
  };

  const addFiles = (files: File[], selection?: { start: number; end: number }): number | void => {
    const available = Math.max(0, 10 - uploadItems.length);
    const added = files
      .slice(0, available)
      .map((file) => ({ id: crypto.randomUUID(), file, status: 'uploading' as const }));
    if (added.length === 0) return;
    const selected = insertAttachmentReferences(draft, added, selection);
    recovery.update({
      text: selected.value,
      mentions: rebaseMentions(draft, selected.value, mentionTokens),
      channelRefs: rebaseChannelRefs(draft, selected.value, channelRefTokens),
      uploads: [...uploadItems, ...added],
    });
    for (const item of added) startUpload(item);
    return selected.caret;
  };

  const dictating = useRef(false);
  const fileDrop = useConversationFileDrop(
    !readOnlyDm &&
      !conversation.sending &&
      !recovery.blocked &&
      activeMemoryView === undefined &&
      selectedIds === undefined,
    (files) => {
      if (dictating.current) return;
      addFiles(files);
      setRestoreFocusSignal((value) => value + 1);
    },
    scopeKey,
  );

  const submit = async (): Promise<void> => {
    if (recovery.blocked) return;
    const body = draft.trim();
    const leftTrim = draft.length - draft.trimStart().length;
    const submittedRefs = channelRefTokens.flatMap((token) => {
      const adjusted = { ...token, start: token.start - leftTrim, end: token.end - leftTrim };
      return adjusted.start >= 0 && body.slice(adjusted.start, adjusted.end) === '#' + token.label
        ? [adjusted]
        : [];
    });
    const submittedMentions = mentionTokens.flatMap((token) => {
      const adjusted = { ...token, start: token.start - leftTrim, end: token.end - leftTrim };
      return adjusted.start >= 0 && body.slice(adjusted.start, adjusted.end) === '@' + token.label
        ? [adjusted]
        : [];
    });
    const shortcut = submittedMentions.find((item) => item.kind === 'all-bots');
    const allBotMention: AllBotMention | undefined =
      shortcut?.kind === 'all-bots'
        ? {
            start: shortcut.start,
            end: shortcut.end,
            label: shortcut.label,
            preview: shortcut.preview,
          }
        : undefined;
    if (allBotMention?.preview.recipients.length === 0) return;
    if (
      (body.length === 0 && uploadItems.length === 0) ||
      uploadItems.length > 10 ||
      uploadItems.some((item) => item.status !== 'ready' || item.ref === undefined) ||
      conversation.sending ||
      submitting.current
    )
      return;
    submitting.current = true;
    const composerFocused =
      document.activeElement instanceof Element &&
      document.activeElement.closest('.bh-composer-shell') !== null;
    const viewport = scrollRef.current;
    followingLatest.current =
      viewport !== null &&
      !conversation.timeline.hasNewer &&
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 80;
    setAtLatest(followingLatest.current);
    if (followingLatest.current) setUnseen(0);
    const submittedFor = currentChannel.current;
    const submittedUploads = uploadItems;
    const previousFailures = new Set(
      store
        .getSnapshot()
        .conversation.messages.filter((item) => item.failed !== undefined)
        .map((item) => item.id),
    );
    const submittedReplyTo = replyTarget?.id;
    const submittedAttachments = submittedUploads.flatMap((item) =>
      item.ref === undefined ? [] : [item.ref],
    );
    const attempt =
      submittedFor === undefined
        ? undefined
        : actions.submissions.begin(submittedFor, {
            text: body,
            mentions: submittedMentions.flatMap((item) =>
              item.kind === 'all-bots'
                ? []
                : [{ botSlug: item.botSlug, label: item.label, start: item.start, end: item.end }],
            ),
            channelRefs: submittedRefs,
            ...(submittedReplyTo === undefined ? {} : { replyTo: submittedReplyTo }),
            ...(submittedAttachments.length === 0 ? {} : { attachments: submittedAttachments }),
          });
    setSubmissionNotice(
      attempt?.persisted === false ? t('composer.submissionStorageError') : undefined,
    );
    recall.current = undefined;
    setRecallNotice(undefined);
    recovery.update({ text: '', mentions: [], channelRefs: [], uploads: [] });
    try {
      const sent = await actions.send(
        body,
        submittedReplyTo,
        submittedAttachments,
        undefined,
        submittedMentions.filter((item) => item.kind !== 'all-bots'),
        submittedRefs,
        undefined,
        allBotMention,
        attempt?.id,
      );
      if (sent) {
        setAllBotNotice(undefined);
        setReplyTarget((current) => (current?.id === submittedReplyTo ? undefined : current));
      } else if (currentChannel.current === submittedFor) {
        const failedEcho = store
          .getSnapshot()
          .conversation.messages.some(
            (item) => item.failed !== undefined && !previousFailures.has(item.id),
          );
        if (!failedEcho) {
          if (attempt !== undefined && submittedFor !== undefined)
            actions.submissions.cancel(submittedFor, attempt.id);
          setDraft((current) => current || body);
          setMentionTokens((current) => (current.length > 0 ? current : submittedMentions));
          setChannelRefTokens((current) => (current.length > 0 ? current : submittedRefs));
          setUploadItems((current) => (current.length > 0 ? current : submittedUploads));
        }
      }
    } catch (error) {
      if (
        error instanceof BridgeCallError &&
        error.code === 'all-bot-preview-changed' &&
        currentChannel.current === submittedFor &&
        submittedFor !== undefined
      ) {
        const preview =
          parseAllBotPreview((error.details as { preview?: unknown } | undefined)?.preview) ??
          (await actions.allBotPreview(submittedFor).catch(() => undefined));
        if (currentChannel.current !== submittedFor) return;
        store.setConversation({ error: undefined });
        setAllBotNotice(t('composer.allBotsChanged'));
        setAllBotPreview(preview);
        setDraft((current) => current || body);
        setMentionTokens((current) =>
          current.length > 0
            ? current
            : submittedMentions.map((item) =>
                item.kind === 'all-bots' && preview !== undefined ? { ...item, preview } : item,
              ),
        );
        setChannelRefTokens((current) => (current.length > 0 ? current : submittedRefs));
        setUploadItems((current) => (current.length > 0 ? current : submittedUploads));
      } else throw error;
    } finally {
      submitting.current = false;
      if (composerFocused && currentChannel.current === submittedFor)
        setRestoreFocusSignal((value) => value + 1);
    }
  };

  const channelMenuLabel = (menu: ChannelMenuTrigger): string =>
    `${title} · ${t('humanNickname.menu')}` +
    (menu.attention ? ` · ${t('channelSettings.needsAttention')}` : '');
  const channelHeaderMenu = (
    primaryAction: { label: string; icon: ReactNode; run(): void },
    anchor: (menu: ChannelMenuTrigger | undefined) => ReactNode,
  ): ReactNode =>
    onMobileBack !== undefined || channel === undefined ? (
      anchor(undefined)
    ) : (
      <ChannelHeaderMenu
        key={channel.id}
        channel={channel}
        actions={actions}
        t={t}
        anchor={anchor}
        primaryAction={primaryAction}
        deleteBotSlug={
          profileBot === undefined || profileBot.deleted === true ? undefined : profileBot.slug
        }
        onOpenSettings={
          hasChannelSettings ? () => channelSettings.open(settingsAttention[0]?.id) : undefined
        }
        settingsAttention={settingsAttention.length > 0}
      />
    );

  const mentionBot = (botSlug: string): void => {
    const member = channelBots.find(
      (candidate) => candidate.slug === botSlug && candidate.deleted !== true,
    );
    if (channel?.type !== 'group' || member === undefined) return;
    const next = appendMention(draft, mentionTokens, member.slug, member.displayName);
    recovery.update({
      text: next.value,
      mentions: next.mentions,
      channelRefs: rebaseChannelRefs(draft, next.value, channelRefTokens),
    });
    setRestoreFocusSignal((value) => value + 1);
  };

  const dockContext = resolveChannelSidebarContext(state);
  const dockEntryProps: ChannelSidebarEntryProps | undefined =
    dockContext?.channel === undefined
      ? undefined
      : {
          scope: dockContext.scope,
          channelId: dockContext.channel.id,
          conversationRevision: state.conversation.revision,
          botSlug: dockContext.botSlug,
          actions,
          onMentionBot: mentionBot,
          t,
          selectedMemoryCommitSha,
          selectedMemoryFilePath:
            activeMemoryView?.kind === 'file' ? activeMemoryView.path : undefined,
          selectedMemoryWorking:
            activeMemoryView?.kind === 'working' ? activeMemoryView.change : undefined,
          onMemoryCommitSelect: (sha) => openMemoryView({ kind: 'commit', sha }),
          onMemoryFileSelect: (path) => openMemoryView({ kind: 'file', path }),
          onMemoryWorkingSelect: (change) => openMemoryView({ kind: 'working', change }),
        };
  const inboxEntry = dockBotEntries.find((entry) => entry.id === 'bot-inbox');
  const inboxAvailable =
    dockBotSlug !== undefined && dockEntryProps !== undefined && inboxEntry !== undefined;
  const conversationPane = (
    <section ref={companionReadMount} className="bh-chat-pane" {...fileDrop.handlers}>
      <WorkingAnnouncement rows={workingRows} t={t} />
      {fileDrop.active ? (
        <ConversationFileDropOverlay
          label={t('composer.dropFiles')}
          hint={t('composer.dropLimit')}
        />
      ) : null}
      <div
        ref={profileMount}
        hidden={workspaceEnabled}
        style={workspaceEnabled ? { display: 'none' } : undefined}
        className="bh-topbar"
        data-window-drag
        data-bh-tour="topbar"
        data-channel-detail={profileViewOpen || activeMemoryView !== undefined ? 'true' : undefined}
        data-memory-diff={
          activeMemoryView?.kind === 'commit' || activeMemoryView?.kind === 'working'
            ? 'true'
            : undefined
        }
      >
        {!workspaceEnabled && (
          <>
            {onMobileBack !== undefined ? (
              <MobileConversationHeader
                title={title}
                onBack={onMobileBack}
                onSettings={sidebar.toggle}
                onFiles={channelId === undefined ? undefined : () => setFilesOpen(!filesOpen)}
                filesOpen={filesOpen}
                onInbox={inboxAvailable ? () => setInboxOpen(!inboxOpen) : undefined}
                inboxOpen={inboxOpen}
                settingsOpen={sidebar.mode !== 'hidden'}
                t={t}
              />
            ) : channel?.type === 'group' ? (
              <span className="bh-channel-island-wrap">
                {channelHeaderMenu(
                  {
                    label: t('groupProfile.label'),
                    icon: <ChannelSidebarIcon name="id-card" size={16} />,
                    run: openProfileView,
                  },
                  (menu) => (
                    <GroupChannelHeader
                      channel={channel}
                      title={title}
                      members={channelFacepile}
                      expanded={profileViewOpen}
                      menu={menu}
                      t={t}
                      onOpenActivity={openProfileView}
                      onToggleProfile={openProfileView}
                      status={<HeaderWorkingStatus rows={workingRows} t={t} />}
                    />
                  ),
                )}
              </span>
            ) : profileBot === undefined ? (
              <span className="bh-companion-chip">
                {channelHeaderMenu(
                  {
                    label: t(sidebar.mode === 'hidden' ? 'sidebar.expand' : 'sidebar.collapse'),
                    icon: <ChannelSidebarIcon name="panels-top-left" size={16} />,
                    run: sidebar.toggle,
                  },
                  (menu) => (
                    <button
                      type="button"
                      className="bh-channel-island"
                      {...(menu === undefined
                        ? {
                            'aria-label': `${title} — ${t(sidebar.mode === 'hidden' ? 'sidebar.expand' : 'sidebar.collapse')}`,
                            'aria-controls': 'bh-channel-sidebar',
                            'aria-expanded': sidebar.mode !== 'hidden',
                            onClick: sidebar.toggle,
                          }
                        : {
                            'aria-label': channelMenuLabel(menu),
                            'aria-haspopup': 'menu' as const,
                            'aria-expanded': menu.open,
                            onClick: menu.toggle,
                          })}
                    >
                      {bot !== undefined ? (
                        <PersonaBotAvatar
                          t={t}
                          personaBotId={bot.slug}
                          name={bot.displayName}
                          src={bot.avatar}
                          appearance={bot.appearance}
                          avatarSeed={bot.avatarSeed}
                          state={botActivity}
                          size={22}
                          indicator={false}
                        />
                      ) : channelFacepile.length > 0 ? (
                        <PersonaBotFacepile
                          items={channelFacepile}
                          size={22}
                          indicator={false}
                          t={t}
                        />
                      ) : (
                        <ChannelMark />
                      )}
                      <ConversationTitle>
                        {dmWorking ? <WorkingSummary rows={workingRows} t={t} /> : title}
                      </ConversationTitle>
                      {menu === undefined ? null : <ChannelMenuCaret attention={menu.attention} />}
                    </button>
                  ),
                )}
              </span>
            ) : (
              <span className="bh-channel-island-wrap">
                {channelHeaderMenu(
                  {
                    label: t('profile.view'),
                    icon: <ChannelSidebarIcon name="id-card" size={16} />,
                    run: openProfileView,
                  },
                  (menu) => (
                    <button
                      type="button"
                      className="bh-channel-island"
                      {...(menu === undefined
                        ? {
                            'aria-label': t('profile.openAvatar', { name: profileBot.displayName }),
                            onClick: openProfileView,
                          }
                        : {
                            'aria-haspopup': 'menu' as const,
                            'aria-expanded': menu.open,
                            'aria-label': channelMenuLabel(menu),
                            onClick: menu.toggle,
                          })}
                    >
                      <PersonaBotAvatar
                        t={t}
                        personaBotId={profileBot.slug}
                        name={profileBot.displayName}
                        src={profileBot.avatar}
                        appearance={profileBot.appearance}
                        avatarSeed={profileBot.avatarSeed}
                        state={profileBotActivity}
                        size={22}
                        indicator={false}
                      />
                      <ConversationTitle>
                        {dmWorking ? <WorkingSummary rows={workingRows} t={t} /> : title}
                      </ConversationTitle>
                      {menu === undefined ? null : <ChannelMenuCaret attention={menu.attention} />}
                    </button>
                  ),
                )}
              </span>
            )}
            {!workspaceEnabled && onMobileBack === undefined && channelId !== undefined && (
              <span className="bh-channel-island-wrap">
                <IconButton
                  aria-label={t('generatedFiles.title')}
                  aria-expanded={filesOpen}
                  onClick={() => setFilesOpen(!filesOpen)}
                >
                  <ChannelSidebarIcon name="file" />
                </IconButton>
              </span>
            )}
            {onMobileBack === undefined &&
              channel?.type === 'dm' &&
              profileBot !== undefined &&
              profileBot.deleted !== true && (
                <span className="bh-channel-island-wrap">
                  <IconButton
                    aria-label={t('botSettings.section.conceptArt')}
                    aria-expanded={conceptExpanded}
                    onClick={toggleConcept}
                  >
                    <ChannelSidebarIcon name="flask-conical" />
                  </IconButton>
                </span>
              )}
            {!workspaceEnabled &&
              onMobileBack === undefined &&
              channel?.type === 'dm' &&
              profileBot !== undefined &&
              profileBot.deleted !== true && (
                <DmCallControl slug={profileBot.slug} name={profileBot.displayName} t={t} />
              )}
            {!workspaceEnabled && onMobileBack === undefined && inboxAvailable && (
              <span className="bh-channel-island-wrap">
                <IconButton
                  aria-label={t('entry.botInbox')}
                  aria-expanded={inboxOpen}
                  onClick={() => setInboxOpen(!inboxOpen)}
                >
                  <ChannelSidebarIcon name="inbox" />
                </IconButton>
              </span>
            )}
          </>
        )}
      </div>
      {profileViewOpen && channel?.type === 'group' ? (
        <GroupProfileView
          members={channelFacepile}
          channel={channel}
          activity={
            groupProfileActivity?.channelId === channel.id ? groupProfileActivity : undefined
          }
          cards={profileCards}
          botNames={botNames}
          t={t}
          onClose={() => setProfileViewOpen(false)}
        />
      ) : profileViewOpen && profileBot !== undefined && channel !== undefined ? (
        <ProfileView
          bot={profileBot}
          channel={channel}
          activity={profileActivity}
          cards={profileCards}
          actions={actions}
          t={t}
          onClose={() => setProfileViewOpen(false)}
        />
      ) : (
        <>
          {activeMemoryView === undefined ||
          channelId === undefined ? null : activeMemoryView.kind === 'commit' ? (
            <MemoryCommitView
              key={`${channelId}:${activeMemoryView.sha}`}
              actions={actions}
              channelId={channelId}
              sha={activeMemoryView.sha}
              botSlug={channel?.botSlug}
              t={t}
              onClose={closeMemoryView}
            />
          ) : activeMemoryView.kind === 'file' ? (
            <MemoryFileView
              key={`${channelId}:${activeMemoryView.path}`}
              actions={actions}
              channelId={channelId}
              path={activeMemoryView.path}
              botSlug={channel?.botSlug}
              t={t}
              onClose={closeMemoryView}
            />
          ) : (
            <MemoryWorkingView
              key={`${channelId}:${activeMemoryView.change.kind}:${activeMemoryView.change.path}`}
              actions={actions}
              channelId={channelId}
              change={activeMemoryView.change}
              botSlug={channel?.botSlug}
              t={t}
              onClose={closeMemoryView}
            />
          )}
          {searchTop === undefined ||
          channelId === undefined ||
          activeMemoryView !== undefined ||
          actions.searchChannel === undefined ? null : (
            <ConversationSearch
              top={searchTop}
              search={(query, cursor) => actions.searchChannel!(channelId, query, cursor)}
              onJump={(messageId) => void actions.openAround(channelId, messageId)}
              onClose={() => {
                setSearchTop(undefined);
                searchReturnFocus.current?.focus();
                searchReturnFocus.current = null;
              }}
              label={selectionAuthor}
              time={(at) => fullTime(at, t)}
              t={t}
            />
          )}
          <div
            className="bh-chat-body"
            ref={timelineMount}
            data-loaded-messages={displayMessages.length}
            onScroll={onTimelineScroll}
            onWheel={(event) => {
              if (
                event.deltaY >= 0 ||
                event.ctrlKey ||
                event.currentTarget.scrollTop <= 0 ||
                !followingLatest.current
              )
                return;
              followingLatest.current = false;
              setAtLatest(false);
            }}
            onTransitionEnd={(event) => {
              if (
                event.target === event.currentTarget &&
                event.propertyName === 'padding-bottom' &&
                followingLatest.current
              )
                pinTimelineToLatest(event.currentTarget);
            }}
            style={{ display: activeMemoryView === undefined ? undefined : 'none' }}
          >
            {conversation.timeline.hasOlder ? (
              <div className="bh-timeline-top-sentinel">
                {conversation.timeline.loadingOlder ? (
                  <span>{t('messages.older.loading')}</span>
                ) : conversation.timeline.olderError !== undefined ? (
                  <button type="button" onClick={() => loadOlderAtTop(true)}>
                    {t('messages.retry')}
                  </button>
                ) : (
                  <button type="button" onClick={() => loadOlderAtTop()}>
                    {t('messages.older.view')}
                  </button>
                )}
              </div>
            ) : null}
            {conversation.status === 'loading' && messages.length === 0 ? (
              <LoadingSkeleton kind="messages" label={t('messages.loading')} />
            ) : null}
            {conversation.status === 'error' && conversation.error !== undefined ? (
              <div className="bh-error">{t('messages.error', { error: conversation.error })}</div>
            ) : null}
            {conversation.draftNotice !== undefined ? (
              <div className="bh-note" role="status">
                {conversation.draftNotice === 'interrupted'
                  ? t('message.draftInterrupted')
                  : t('message.draftExpired')}
              </div>
            ) : null}
            {displayMessages.length === 0 && conversation.status !== 'loading' ? (
              <EmptyConversation channel={channel} bot={bot} t={t} />
            ) : null}
            <MessageSelectionContext.Provider value={messageSelection}>
              {timelineWindow.runs.map((run) => {
                const groups = messageGroups;
                if (run.kind === 'gap')
                  return (
                    <div
                      key={`gap:${groups[run.from]!.key}`}
                      className="bh-timeline-gap"
                      aria-hidden="true"
                      style={{ height: run.height }}
                    />
                  );
                const index = run.index;
                const group = groups[index]!;
                const first = group.messages[0]!;
                const previous = groups[index - 1]?.messages.at(-1);
                const firstDay = Number.isFinite(Date.parse(first.at))
                  ? new Date(first.at).toDateString()
                  : undefined;
                const previousDay =
                  previous !== undefined && Number.isFinite(Date.parse(previous.at))
                    ? new Date(previous.at).toDateString()
                    : undefined;
                return (
                  <div
                    key={group.key}
                    ref={timelineWindow.blockRef(group.key)}
                    className="bh-message-block"
                    data-group-key={group.key}
                    data-follows={index > 0 ? '' : undefined}
                  >
                    {unreadAfter !== undefined && previous?.id === unreadAfter ? (
                      <TimelineUnreadDivider label={t('messages.newDivider')} />
                    ) : null}
                    {firstDay !== undefined && firstDay !== previousDay ? (
                      <div className="bh-message-day">
                        {new Date(first.at).toLocaleDateString(t('main.date.locale'), {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    ) : null}
                    {first.toolAutoApproval !== undefined ? (
                      <AutoApprovalLine
                        messageId={first.id}
                        record={first.toolAutoApproval}
                        bots={state.bots}
                        t={t}
                      />
                    ) : first.toolAutoApprovalPause !== undefined ? (
                      <AutoApprovalPauseLine
                        messageId={first.id}
                        record={first.toolAutoApprovalPause}
                        bots={state.bots}
                        t={t}
                      />
                    ) : first.voiceCallRecord !== undefined ? (
                      <VoiceCallRecordBubble
                        messageId={first.id}
                        record={first.voiceCallRecord}
                        t={t}
                      />
                    ) : first.turnStop !== undefined ? (
                      <div className="bh-member-departure" data-message-id={first.id}>
                        <span>{turnStopText(first.turnStop, t)}</span>
                      </div>
                    ) : first.memberDeparture !== undefined ? (
                      <div className="bh-member-departure" data-message-id={first.id}>
                        <span>
                          {t(
                            first.memberDeparture.departureType === 'removed'
                              ? 'member.removed'
                              : 'member.left',
                            { name: first.memberDeparture.displayName },
                          )}
                        </span>
                        <ChannelDeliveryReceipt
                          message={first}
                          bots={state.bots}
                          humanMembers={channel?.humanMembers ?? []}
                          onOpenInbox={(target) =>
                            setInboxTarget({ ...target, messageId: first.id })
                          }
                          t={t}
                        />
                      </div>
                    ) : first.botChannelPost !== undefined ? (
                      <BotChannelPostLine
                        posts={group.messages}
                        channels={state.channels}
                        bots={state.bots}
                        t={t}
                        onOpen={(targetChannelId, messageId) => {
                          void actions
                            .openChannel(targetChannelId)
                            .then(() => actions.openAround(targetChannelId, messageId));
                        }}
                      />
                    ) : first.memoryCommit !== undefined ? (
                      <MemoryCommitLine
                        messageId={first.id}
                        commit={first.memoryCommit}
                        compact={
                          dmBotSlug !== undefined &&
                          first.noticeOrigin !== undefined &&
                          memoryDisplay === 'compact'
                        }
                        bots={state.bots}
                        action={
                          first.noticeOrigin === undefined
                            ? undefined
                            : elsewhereAction(
                                'memory',
                                first.noticeOrigin.channelId,
                                first.memoryCommit.botSlug,
                                state.channels,
                                state.bots,
                                t,
                              )
                        }
                        t={t}
                        onOpen={() => {
                          const commit = first.memoryCommit!;
                          if (channel?.type === 'dm' && channel.botSlug === commit.botSlug) {
                            openMemoryView({ kind: 'commit', sha: commit.sha });
                            return;
                          }
                          const dm = state.channels.find(
                            (candidate) =>
                              candidate.type === 'dm' && candidate.botSlug === commit.botSlug,
                          );
                          if (dm !== undefined)
                            store.setMemoryCommitIntent({
                              channelId: dm.id,
                              sha: commit.sha,
                            });
                          void actions.openBot(commit.botSlug);
                        }}
                      />
                    ) : first.botCreateAction !== undefined ? (
                      <button
                        type="button"
                        className="bh-bot-dm-action"
                        data-message-id={first.id}
                        onClick={() => void actions.openBot(first.botCreateAction!.botSlug)}
                      >
                        <BotDmActionLabel
                          messageKey="botCreate.action"
                          senderSlug={first.author.kind === 'bot' ? first.author.slug : undefined}
                          senderName={authorLabel(first, state.bots, t, channelHumanName(channel))}
                          recipientSlug={first.botCreateAction.botSlug}
                          recipientName={
                            state.bots.find((bot) => bot.slug === first.botCreateAction!.botSlug)
                              ?.displayName ?? first.botCreateAction.displayName
                          }
                          bots={state.bots}
                          t={t}
                        />
                      </button>
                    ) : first.botDmAction === undefined ? (
                      <OnboardingMemoryNavigation.Provider
                        value={timelineCallbacks.memoryNavigation}
                      >
                        <TakeoverTimeline.Provider value={takeoverTimeline}>
                          <MessageGroupView
                            humanMembers={channel?.humanMembers ?? NO_HUMAN_MEMBERS}
                            group={group}
                            arrivals={arrivals}
                            reading={reading}
                            channelId={channelId}
                            remoteBot={channel?.remoteBot}
                            remoteContact={channel?.remoteContact}
                            remoteAvailability={channel?.remoteAvailability}
                            actions={actions}
                            gallery={imageGallery.gallery}
                            nativeChatT={nativeChatT}
                            resolvedGrantRequests={timelineDecisions.resolvedGrantRequests}
                            toolApprovalDecisions={timelineDecisions.toolApprovalDecisions}
                            userQuestionResolutions={timelineDecisions.userQuestionResolutions}
                            focusMessageId={conversation.focusMessageId}
                            currentDmBotSlug={
                              channel?.type === 'dm' && !botDm ? channel.botSlug : undefined
                            }
                            bots={state.bots}
                            onContextMenu={timelineCallbacks.contextMenu}
                            onAvatarMenu={
                              channel?.type === 'group' ? timelineCallbacks.avatarMenu : undefined
                            }
                            onOpenInbox={timelineCallbacks.openInbox}
                            onReply={readOnlyDm ? undefined : timelineCallbacks.reply}
                            onReact={
                              reactToMessage === undefined ? undefined : timelineCallbacks.react
                            }
                            onJumpReply={timelineCallbacks.jumpReply}
                            onRestoreFailed={
                              readOnlyDm ? undefined : timelineCallbacks.restoreFailed
                            }
                            t={t}
                          />
                        </TakeoverTimeline.Provider>
                      </OnboardingMemoryNavigation.Provider>
                    ) : (
                      <button
                        type="button"
                        className="bh-bot-dm-action"
                        data-message-id={first.id}
                        onClick={() => {
                          const action = first.botDmAction!;
                          void actions
                            .openChannel(action.channelId)
                            .then(() => actions.openAround(action.channelId, action.messageId));
                        }}
                      >
                        <BotDmActionLabel
                          senderSlug={first.author.kind === 'bot' ? first.author.slug : undefined}
                          senderName={authorLabel(first, state.bots, t, channelHumanName(channel))}
                          recipientSlug={first.botDmAction.recipientBotSlug}
                          recipientName={memberName(state.bots, first.botDmAction.recipientBotSlug)}
                          bots={state.bots}
                          t={t}
                        />
                      </button>
                    )}
                  </div>
                );
              })}
            </MessageSelectionContext.Provider>
            {imageGallery.lightbox}
            {conversation.timeline.hasNewer ? (
              <div className="bh-timeline-newer-sentinel">
                {conversation.timeline.loadingNewer ? (
                  <span>{t('messages.newer.loading')}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (channelId !== undefined) void actions.loadNewer(channelId);
                    }}
                  >
                    {conversation.timeline.newerError === undefined
                      ? t('messages.newer.view')
                      : t('messages.retry')}
                  </button>
                )}
              </div>
            ) : null}
          </div>
          {activeMemoryView === undefined && restoreBlocked ? (
            <div className="bh-note" role="alert">
              {t('message.restoreBlocked')}
            </div>
          ) : null}
          {activeMemoryView === undefined &&
          selectedIds !== undefined &&
          channelId !== undefined ? (
            <MessageSelectionBar
              count={selectedIds.length}
              busy={selectionBusy}
              notice={selectionNotice}
              t={t}
              onCancel={cancelSelection}
              onExport={(kind) => {
                if (kind === 'conversation') {
                  void copySelection(selectedIds);
                } else void exportSelectionImage(selectedIds);
              }}
            />
          ) : null}
          {activeMemoryView === undefined &&
          selectedIds === undefined &&
          (!atLatest || unseen > 0 || conversation.timeline.hasNewer) ? (
            <div className="bh-timeline-jump-anchor">
              <button
                type="button"
                className="bh-timeline-new"
                aria-label={t('messages.latest')}
                aria-description={
                  unseen > 0
                    ? t(unseen === 1 ? 'messages.unseenOne' : 'messages.unseen', { count: unseen })
                    : undefined
                }
                onClick={jumpToLatest}
              >
                <IconChevronDownOutlineRegular size={16} aria-hidden="true" />
                {unseen > 0 ? (
                  <span className="bh-timeline-new-count" aria-hidden="true">
                    {unseen > 99 ? '99+' : unseen}
                  </span>
                ) : null}
              </button>
            </div>
          ) : null}
          {readOnlyDm && selectedIds === undefined ? (
            <div className="bh-bot-dm-readonly">
              {t(deletedBotDm ? 'deletion.readOnly' : 'botDm.readOnly')}
              {channel?.remoteBot === undefined
                ? null
                : ` · ${networkContactAvailabilityLabel(channel.remoteAvailability, t)}`}
            </div>
          ) : null}
          {readOnlyDm ? null : (
            <div
              className="bh-memory-chat-composer"
              style={{
                display:
                  activeMemoryView === undefined && selectedIds === undefined ? 'contents' : 'none',
              }}
            >
              {compactNotice === undefined ? null : (
                <Toast
                  key={compactNotice.seq}
                  text={compactNotice.text}
                  holdMs={compactNotice.holdMs}
                  {...(compactNotice.tone ? { tone: compactNotice.tone } : {})}
                  onDone={() =>
                    setCompactNotice((current) =>
                      current?.seq === compactNotice.seq ? undefined : current,
                    )
                  }
                />
              )}
              <div
                className="bh-composer-recovery"
                ref={recovery.mount}
                onFocusCapture={() => recovery.setEditing(true)}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                    recovery.setEditing(false);
                }}
              >
                {draftScope === undefined ? (
                  <p role="status">{t('composer.draftIdentityUnavailable')}</p>
                ) : null}
                {draftScope !== undefined && recovery.error !== undefined ? (
                  <p role="alert">{t('composer.draftStorageError')}</p>
                ) : null}
                {recovery.needsValidation && recovery.versions.length <= 1 ? (
                  <p role="status">
                    {t(
                      recovery.validationFailed
                        ? 'composer.draftValidationFailed'
                        : 'composer.draftValidating',
                    )}{' '}
                    {recovery.validationFailed ? (
                      <button type="button" onClick={recovery.retry}>
                        {t('composer.draftRetry')}
                      </button>
                    ) : null}
                  </p>
                ) : null}
                {recovery.notice ? (
                  <p role="status">{t('composer.draftReferencesChanged')}</p>
                ) : null}
                <span ref={submissionMount} hidden />
                {submissionSnapshot?.error !== undefined ? (
                  <p role="alert">{t('composer.submissionStorageError')}</p>
                ) : submissionNotice === undefined ? null : (
                  <p role="status">{submissionNotice}</p>
                )}
                {recallNotice === undefined ? null : <p role="status">{recallNotice}</p>}
                {recovery.versions.length > 1 ? (
                  <section aria-label={t('composer.draftConflict')}>
                    <p role="alert">{t('composer.draftConflict')}</p>
                    {recovery.versions.map((version) => (
                      <div className="bh-composer-draft-version" key={version.writer}>
                        <pre>{version.draft.text.slice(0, 240)}</pre>
                        <button type="button" onClick={() => recovery.choose(version.writer)}>
                          {t('composer.draftUseVersion')}
                        </button>
                      </div>
                    ))}
                  </section>
                ) : null}
                <ChannelComposer
                  key={channelId}
                  context={composerContext}
                  sendKey={sendKey}
                  value={draft}
                  mentions={mentionTokens}
                  channelRefs={channelRefTokens}
                  channelCandidates={
                    channel?.type === 'dm' && channel.botSlug !== undefined
                      ? state.channels.filter((candidate) => candidate.type === 'group')
                      : []
                  }
                  allBotPreview={channel?.type === 'group' ? allBotPreview : undefined}
                  allBotNotice={allBotNotice}
                  mentionCandidates={
                    channel?.type === 'group'
                      ? channelBots
                      : channel?.type === 'dm' && channel.botSlug !== undefined
                        ? state.bots.filter(
                            (candidate) =>
                              candidate.slug !== channel.botSlug &&
                              candidate.paused !== true &&
                              !candidate.deleted,
                          )
                        : []
                  }
                  placeholder={t('composer.placeholder', { name: title })}
                  holdPlaceholder={t('composer.holdToTalk', { name: title })}
                  dictation={dictationPort}
                  dictating={dictating}
                  sending={conversation.sending || recovery.blocked}
                  focusSignal={restoreFocusSignal}
                  attachments={uploadItems}
                  onAddFiles={addFiles}
                  onRetryAttachment={(id) => {
                    const item = uploadItems.find((candidate) => candidate.id === id);
                    if (item !== undefined) startUpload(item);
                  }}
                  onRemoveAttachment={(id) => {
                    const item = uploadItems.find((candidate) => candidate.id === id);
                    if (item !== undefined) {
                      const next = removeAttachmentReferences(
                        draft,
                        item,
                        mentionTokens,
                        channelRefTokens,
                      );
                      recovery.update({
                        text: next.value,
                        mentions: next.mentions,
                        channelRefs: next.channelRefs,
                      });
                    }
                    uploadControllers.current.get(id)?.abort();
                    uploadControllers.current.delete(id);
                    setUploadItems((current) => current.filter((item) => item.id !== id));
                  }}
                  reply={
                    replyTarget === undefined
                      ? undefined
                      : {
                          id: replyTarget.id,
                          author: authorLabel(
                            replyTarget,
                            state.bots,
                            t,
                            channelHumanName(channel),
                          ),
                          body: replyTarget.body,
                        }
                  }
                  t={t}
                  onChange={(value, mentions, channelRefs) => {
                    recovery.update({
                      text: value,
                      mentions: mentions ?? [],
                      channelRefs: channelRefs ?? [],
                    });
                    setRestoreBlocked(false);
                  }}
                  onCancelReply={() => setReplyTarget(undefined)}
                  onRecall={recallInput}
                  onSubmit={submit}
                />
              </div>
            </div>
          )}
          {activeMemoryView !== undefined || messageMenu === undefined || readOnlyDm ? null : (
            <MessageActionMenu
              request={messageMenu}
              t={t}
              {...(reactToMessage === undefined || !reactableMessage(messageMenu.message)
                ? {}
                : { onReact: setReactionMenu })}
              onReply={quoteMessage}
              onFeedback={(message) => setFeedbackMessage(message.id)}
              {...(messageSelection === undefined ? {} : { onSelect: messageSelection.begin })}
              onClose={() => {
                setMessageMenu(undefined);
              }}
            />
          )}
          {reactionMenu === undefined || reactToMessage === undefined ? null : (
            <MessageReactionSurface
              message={
                messages.find((message) => message.id === reactionMenu.message.id) ??
                reactionMenu.message
              }
              anchor={() => ({
                left: reactionMenu.x,
                top: reactionMenu.y,
                width: 0,
                bottom: reactionMenu.y,
              })}
              onReact={(emoji, active) => reactToMessage(reactionMenu.message, emoji, active)}
              onClose={() => setReactionMenu(undefined)}
              t={t}
            />
          )}
          {activeMemoryView !== undefined ||
          avatarMenu === undefined ||
          channel?.type !== 'group' ? null : (
            <BotAvatarMenu
              request={avatarMenu}
              canMention={channelBots.some(
                (member) => member.slug === avatarMenu.botSlug && member.deleted !== true,
              )}
              t={t}
              onMessage={(botSlug) => void actions.openBot(botSlug)}
              onMention={mentionBot}
              onProfile={(botSlug) => void actions.openBot(botSlug, 'profile')}
              onClose={() => setAvatarMenu(undefined)}
            />
          )}
          {inboxTarget === undefined ? null : (
            <BotInboxDialog
              key={inboxTarget.botSlug + ':' + inboxTarget.messageId}
              botSlug={inboxTarget.botSlug}
              botName={
                state.bots.find((bot) => bot.slug === inboxTarget.botSlug)?.displayName ??
                inboxTarget.botSlug
              }
              messageId={inboxTarget.messageId}
              missing={inboxTarget.missing}
              actions={actions}
              t={t}
              onClose={() => setInboxTarget(undefined)}
            />
          )}
          {selectionImage === undefined ? null : (
            <MessageImagePreview
              blob={selectionImage}
              t={t}
              onClose={() => setSelectionImage(undefined)}
            />
          )}
          {feedbackMessage === undefined || channelId === undefined ? null : (
            <MessageFeedbackDialog
              key={feedbackMessage}
              channelId={channelId}
              messageId={feedbackMessage}
              t={t}
              onClose={() => setFeedbackMessage(undefined)}
            />
          )}
        </>
      )}
    </section>
  );
  const chatPane =
    state.selection === undefined ? (
      <Welcome state={state} t={t} />
    ) : state.selection.kind === 'inbox' ? (
      <ActivityCenterView actions={actions} t={t} registry={dockPanels} />
    ) : (
      conversationPane
    );
  return (
    <div ref={conversationMount} className="bh-root bh-main">
      <span ref={allBotPreviewMount} hidden />
      <span ref={searchShortcutMount} hidden />
      <span ref={replyPerfMount} hidden />
      <span ref={dockInboxMount} hidden />
      <ShareFlowHost actions={actions} registry={dockPanels} t={t} />
      <div className="bh-chat-layout" data-sidebar={docked ? 'dock' : sidebar.mode}>
        <GeneratedFilesContext.Provider
          value={{
            attachments: uploadItems.flatMap((item) => (item.ref === undefined ? [] : [item.ref])),
            full: uploadItems.length >= 10,
            disabled: readOnlyDm || conversation.sending || recovery.blocked,
            toggle: toggleGeneratedFile,
          }}
        >
          {docked ? (
            <ChannelDock
              body={chatPane}
              header={
                workspaceEnabled && channel !== undefined
                  ? {
                      title,
                      ...(dmWorking ? { label: <WorkingSummary rows={workingRows} t={t} /> } : {}),
                      status: (
                        <ConversationSessionStop
                          channel={channel}
                          groups={sessionStopGroups}
                          controller={sessionStop}
                          actions={actions}
                          t={t}
                          status={
                            channel.type === 'group' && workingRows.items.length > 0 ? (
                              <HeaderWorkingStatus rows={workingRows} t={t} />
                            ) : undefined
                          }
                          onOpenProfile={profileBot === undefined ? undefined : openProfileView}
                        />
                      ),
                      icon:
                        channel.type === 'group' || botDm ? (
                          <GroupChannelIcon
                            channel={channel}
                            bots={new Map(state.bots.map((member) => [member.slug, member]))}
                            className={stylex.props(messageStyles.channelIcon).className ?? ''}
                            groupClassName=""
                            size={20}
                            hashSize={16}
                            t={t}
                          />
                        ) : dmBot !== undefined ? (
                          <PersonaBotAvatar
                            t={t}
                            personaBotId={dmBot.slug}
                            name={dmBot.displayName}
                            src={dmBot.avatar}
                            appearance={dmBot.appearance}
                            avatarSeed={dmBot.avatarSeed}
                            size={20}
                            indicator={false}
                            still
                          />
                        ) : (
                          <ChannelSidebarIcon name="user" size={20} />
                        ),
                      ...(profileBot !== undefined || channel.type === 'group'
                        ? {
                            profile: {
                              label:
                                channel.type === 'dm' && sessionStopCount > 0
                                  ? t('sessionStop.open', { count: sessionStopCount })
                                  : t(
                                      channel.type === 'group'
                                        ? 'groupProfile.openAvatar'
                                        : 'profile.openAvatar',
                                      { name: title },
                                    ),
                              open:
                                channel.type === 'dm' && sessionStopCount > 0
                                  ? sessionStop.toggle
                                  : openProfileView,
                              ...(channel.type === 'dm' && sessionStopCount > 0
                                ? { expanded: sessionStop.open }
                                : {}),
                            },
                          }
                        : {}),
                      actions: (
                        <>
                          {profileBot !== undefined && profileBot.deleted !== true && (
                            <IconButton
                              aria-label={t('botSettings.section.conceptArt')}
                              aria-expanded={conceptExpanded}
                              onClick={toggleConcept}
                            >
                              <ChannelSidebarIcon name="flask-conical" />
                            </IconButton>
                          )}
                          {profileBot !== undefined && profileBot.deleted !== true && (
                            <DmCallControl
                              slug={profileBot.slug}
                              name={profileBot.displayName}
                              variant="header"
                              t={t}
                            />
                          )}
                          {hasChannelSettings && (
                            <Tooltip
                              label={t('channelSettings.open')}
                              side="bottom"
                              portal
                              delayMs={500}
                            >
                              <IconButton
                                aria-label={t('channelSettings.open')}
                                onClick={() => channelSettings.open(settingsAttention[0]?.id)}
                              >
                                <ChannelSidebarIcon name="settings" />
                                {settingsAttention.length > 0 && (
                                  <ChannelAttentionDot
                                    label={t('channelSettings.needsAttention')}
                                  />
                                )}
                              </IconButton>
                            </Tooltip>
                          )}
                        </>
                      ),
                    }
                  : undefined
              }
              files={
                workspaceEnabled && channelId !== undefined
                  ? {
                      open: filesOpen,
                      setOpen: setFilesOpen,
                      content: (
                        <ChannelFiles
                          key={channelId}
                          channelId={channelId}
                          actions={actions}
                          t={t}
                        />
                      ),
                    }
                  : undefined
              }
              inbox={inboxAvailable ? { open: inboxOpen, setOpen: setInboxOpen } : undefined}
              revealBody={
                state.selection?.kind === 'bot' &&
                (state.selection.profile === true || state.selection.inboxRequest !== undefined)
              }
              panels={dockPanelList}
              channel={dockChannel}
              registry={dockPanels}
              entryProps={dockEntryProps}
              shows={(entry) =>
                (entry.scope === 'both' || entry.scope === settingsScope) &&
                (entry.visible?.(state) ?? true)
              }
              t={t}
            />
          ) : (
            chatPane
          )}
          {!workspaceEnabled && filesOpen && channelId !== undefined && (
            <PanelDialog
              title={t('generatedFiles.title')}
              closeLabel={t('dock.close', { label: t('generatedFiles.title') })}
              onClose={() => setFilesOpen(false)}
              scroll
            >
              <ChannelFiles key={channelId} channelId={channelId} actions={actions} t={t} />
            </PanelDialog>
          )}
          {!workspaceEnabled && inboxOpen && inboxAvailable && (
            <PanelDialog
              title={t('entry.botInbox')}
              closeLabel={t('dock.close', { label: t('entry.botInbox') })}
              onClose={() => setInboxOpen(false)}
              scroll
              secondary={
                inboxEntry.headerAction && (
                  <inboxEntry.headerAction key={dockBotSlug} {...dockEntryProps} />
                )
              }
            >
              <inboxEntry.component key={dockBotSlug} {...dockEntryProps} flush />
            </PanelDialog>
          )}
        </GeneratedFilesContext.Provider>
        <ChannelSettingsDialog registry={channelSidebar} state={state} actions={actions} t={t} />
        <ChannelSettingsAttention registry={channelSidebar} state={state} actions={actions} t={t} />
        {docked ? null : (
          <>
            <ChannelSidebar
              registry={channelSidebar}
              state={state}
              actions={actions}
              controller={sidebar}
              t={t}
              onMentionBot={mentionBot}
              selectedMemoryCommitSha={selectedMemoryCommitSha}
              selectedMemoryFilePath={
                activeMemoryView?.kind === 'file' ? activeMemoryView.path : undefined
              }
              selectedMemoryWorking={
                activeMemoryView?.kind === 'working' ? activeMemoryView.change : undefined
              }
              onMemoryCommitSelect={(sha) => openMemoryView({ kind: 'commit', sha })}
              onMemoryFileSelect={(path) => openMemoryView({ kind: 'file', path })}
              onMemoryWorkingSelect={(change) => openMemoryView({ kind: 'working', change })}
            />
            <button
              type="button"
              className="bh-sidebar-toggle"
              aria-label={sidebar.mode === 'hidden' ? t('sidebar.expand') : t('sidebar.collapse')}
              aria-expanded={sidebar.mode !== 'hidden'}
              aria-controls="bh-channel-sidebar"
              onClick={sidebar.toggle}
            >
              <IconPanelLeftOutlineRegular size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function useStableGroupShape(
  groups: readonly { key: string; messages: readonly { id: string }[] }[],
): {
  keys: string[];
  members: Map<string, string[]>;
} {
  const shape = useRef<{ keys: string[]; members: Map<string, string[]> } | undefined>(undefined);
  const previous = shape.current;
  if (
    previous !== undefined &&
    previous.keys.length === groups.length &&
    groups.every((group, index) => {
      const ids = previous.members.get(group.key);
      return (
        previous.keys[index] === group.key &&
        ids !== undefined &&
        ids.length === group.messages.length &&
        group.messages.every((message, at) => ids[at] === message.id)
      );
    })
  )
    return previous;
  const next = {
    keys: groups.map((group) => group.key),
    members: new Map(
      groups.map((group) => [group.key, group.messages.map((message) => message.id)]),
    ),
  };
  shape.current = next;
  return next;
}

function selectConversationState(state: ClientState): ConversationStateView {
  return Object.fromEntries(
    CONVERSATION_STATE_KEYS.flatMap((key) => (state[key] === undefined ? [] : [[key, state[key]]])),
  ) as ConversationStateView;
}

function sameConversationInputs(
  left: ConversationStateView,
  right: ConversationStateView,
): boolean {
  return CONVERSATION_STATE_KEYS.every(
    (key) =>
      left[key] === right[key] ||
      (key === 'bots' && sameConversationBots(left.bots, right.bots, right)),
  );
}

function BotMainContent({
  onMobileBack,
  actions,
  companion,
  nativeSessions,
  channelSidebar,
  dockPanels,
  profileCards,
  nativeChatT,
  t = zhTranslate,
}: {
  onMobileBack?: (() => void) | undefined;
  actions: BridgeActions;
  companion?: WindowCompanions | undefined;
  channelSidebar: ChannelSidebarRegistry;
  dockPanels?: DockPanelHost | undefined;
  nativeSessions?: NativeSessionCatalog | undefined;
  profileCards?: ProfileCardRegistry | undefined;
  nativeChatT?: NativeChatFailureText | undefined;
  t?: BotHarnessTranslate | undefined;
}): ReactElement {
  const state = useClientStore(selectConversationState, sameConversationInputs);
  const workspace = useContext(WorkspaceContext);
  if (!workspace && state.selection === undefined) return <Welcome state={state} t={t} />;
  if (!workspace && state.selection?.kind === 'inbox')
    return <ActivityCenterView actions={actions} t={t} registry={dockPanels} />;
  const scopeKey =
    state.selection === undefined
      ? 'welcome'
      : state.selection.kind === 'inbox'
        ? 'inbox'
        : state.selection.kind === 'bot'
          ? `bot:${state.selection.slug}:${state.selection.profile ? 'profile' : state.selection.inboxRequest ? `inbox:${state.selection.inboxRequest}` : 'chat'}`
          : `channel:${state.selection.channelId}`;
  return (
    <ConversationView
      onMobileBack={onMobileBack}
      scopeKey={`${scopeKey}:${state.conversation.channel?.id ?? ''}`}
      nativeSessions={nativeSessions}
      state={state}
      actions={actions}
      companion={companion}
      channelSidebar={channelSidebar}
      dockPanels={dockPanels}
      profileCards={profileCards}
      nativeChatT={nativeChatT}
      t={t}
    />
  );
}

const subscribeWithoutPrefs = (): (() => void) => () => {};

function releaseDeferred(state: OnboardingViewState): boolean {
  return (
    state.modelOpen ||
    state.sendOpen ||
    state.guideOpen ||
    state.checklistOpen ||
    state.sessionsTourOpen ||
    state.intro !== undefined ||
    (state.receipt === undefined && state.error === undefined)
  );
}

export function BotMain({
  appearance,
  prefs,
  workspace,
  ...props
}: Parameters<typeof BotMainContent>[0] & {
  appearance?: Appearance | undefined;
  workspace?: WorkspaceOptions | undefined;
  prefs?: Pick<BotModePrefs, 'source'> | undefined;
}): ReactElement {
  const developerMode = useSyncExternalStore(
    prefs?.source.subscribe ?? subscribeWithoutPrefs,
    () => prefs?.source.getSnapshot().developerMode ?? false,
    () => false,
  );
  const sendKey = useSyncExternalStore(
    prefs?.source.subscribe ?? subscribeWithoutPrefs,
    () => prefs?.source.getSnapshot().sendKey ?? 'enter',
    () => 'enter' as const,
  );
  const autoCollapseMessages = useSyncExternalStore(
    prefs?.source.subscribe ?? subscribeWithoutPrefs,
    () => prefs?.source.getSnapshot().autoCollapseMessages ?? false,
    () => false,
  );
  const showDeliveryReceipts = useSyncExternalStore(
    prefs?.source.subscribe ?? subscribeWithoutPrefs,
    () => prefs?.source.getSnapshot().showDeliveryReceipts ?? false,
    () => false,
  );
  const streamReplies = useSyncExternalStore(
    prefs?.source.subscribe ?? subscribeWithoutPrefs,
    () => prefs?.source.getSnapshot().streamReplies ?? false,
    () => false,
  );
  return (
    <DeliveryReceiptsVisible.Provider value={showDeliveryReceipts}>
      <StreamReplies.Provider value={streamReplies}>
        <AutoCollapseMessages.Provider value={autoCollapseMessages}>
          <MessageDeveloperMode.Provider value={developerMode}>
            <ComposerSendKeyContext.Provider value={sendKey}>
              <AppearanceContext.Provider value={appearance}>
                <Workspace options={workspace} t={props.t ?? zhTranslate}>
                  <BotMainContent {...props} />
                </Workspace>
              </AppearanceContext.Provider>
            </ComposerSendKeyContext.Provider>
          </MessageDeveloperMode.Provider>
        </AutoCollapseMessages.Provider>
      </StreamReplies.Provider>
    </DeliveryReceiptsVisible.Provider>
  );
}

export function BotPanel({
  appearance,
  wallpaper,
  onMobileBack,
  workspace,
  prefs,
  actions,
  companion,
  nativeSessions,
  channelSidebar,
  dockPanels,
  profileCards,
  nativeChatT,
  releaseNotes,
  telemetryNotice,
  t,
}: {
  onMobileBack?: (() => void) | undefined;
  prefs?: Pick<BotModePrefs, 'source'> | undefined;
  actions: BridgeActions;
  companion?: WindowCompanions | undefined;
  channelSidebar: ChannelSidebarRegistry;
  dockPanels?: DockPanelHost | undefined;
  nativeSessions?: NativeSessionCatalog | undefined;
  profileCards?: ProfileCardRegistry | undefined;
  nativeChatT?: NativeChatFailureText | undefined;
  releaseNotes?: ReleaseNotesController | undefined;
  telemetryNotice?: TelemetryNoticeController | undefined;
  appearance?: Appearance | undefined;
  wallpaper?: Wallpaper | undefined;
  workspace?: WorkspaceOptions | undefined;
  t: BotHarnessTranslate;
}): ReactElement {
  const onboarding = onboardingFor(actions);
  const deferRelease = useSyncExternalStore(onboarding.subscribe, () =>
    releaseDeferred(onboarding.getSnapshot()),
  );
  const modeMount = useMountedResource<HTMLSpanElement>(() => {
    store.setMode('bot');
    return () => {
      store.setMode('dsh');
    };
  }, []);
  return (
    <>
      <span ref={modeMount} hidden aria-hidden="true" />
      <OnboardingOverlay actions={actions} companion={companion} t={t} />
      <BotIntro actions={actions} appearance={appearance} wallpaper={wallpaper} t={t} />
      {releaseNotes === undefined ? null : (
        <ReleaseNotesAnnouncement controller={releaseNotes} t={t} deferred={deferRelease} />
      )}
      {telemetryNotice === undefined ? null : (
        <TelemetryNotice controller={telemetryNotice} releaseNotes={releaseNotes} t={t} />
      )}
      <BotMain
        appearance={appearance}
        workspace={workspace}
        onMobileBack={onMobileBack}
        prefs={prefs}
        actions={actions}
        companion={companion}
        nativeSessions={nativeSessions}
        channelSidebar={channelSidebar}
        dockPanels={dockPanels}
        profileCards={profileCards}
        nativeChatT={nativeChatT}
        t={t}
      />
    </>
  );
}
