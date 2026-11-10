import type { ConversationStateView } from './store.js';
import { Menu } from './appearance-primitives.js';
import { ChannelNicknameEntry, ChannelTraceEntry } from './channel-personal-settings.js';
import type { ExternalSource } from '../../../core/src/messaging/inbound.js';
import { useCallback, useRef, useState, useSyncExternalStore, type ReactElement } from 'react';
import * as stylex from '@stylexjs/stylex';

import {
  Button,
  IconEllipsisOutlineRegular,
  Tag,
  type MenuEntry,
} from '@deepseek-ai/dsh-client-ui-primitives';
import { Tooltip } from './ds/tooltip.js';

import type { BotModePrefs } from './bot-mode-prefs.js';
import { WorkspaceGrantsEntry } from './workspace-grants-entry.js';
import { AutoApprovalBadge, AutoApprovalSettingsEntry } from './approval-template-entry.js';
import { ModelPresetProfile } from './model-preset-profile.js';
import { BotPromptSettingsEntry } from './prompt-preset-settings.js';
import { BotVoiceSettingsEntry } from './voice-settings.js';
import { modelPlanOf, rememberModelPlan, subscribeModelPlans } from './model-plan-store.js';
import type { ModelPlanStateView, ModelPlanView } from './bridge.js';
import { AssignmentConcurrencySetting } from './assignment-concurrency-setting.js';
import { channelSettings } from './channel-settings-state.js';
import { useMountedResource } from './mounted-resource.js';
import { WakePolicyBadge, WakePolicyEntry } from './wake-policy-entry.js';
import {
  ExternalConnectorsAttention,
  ExternalConnectorsEntry,
  ExternalIdentitiesEntry,
} from './external-entries.js';
import {
  GroupConnectorsAttention,
  GroupConnectorsEntry,
  GroupWakePolicyEntry,
  isGroupConversation,
} from './group-entries.js';
import { sameBotNames, useClientStore } from './use-client-store.js';
import type {
  ChannelSidebarEntry,
  ChannelSidebarEntryProps,
  ChannelSidebarTab,
} from './channel-sidebar.js';
import { formatRelativeTime } from './labels.js';
import { LoadingSkeleton } from './loading-skeleton.js';
import { MemoryEntry } from './memory-entry.js';
import { MemoryRecovery } from './memory-recovery.js';
import { cachedMemory, invalidateMemory } from './memory-read-cache.js';
import { MemoryFilesEntry } from './memory-files-entry.js';
import { ConceptArtSection, conceptArtCall } from './concept-art-section.js';
import { Note } from './ds/note.js';
import { PanelEmptyState } from './ds/empty-state.js';
import { PanelDialog } from './ds/panel-dialog.js';
import { ExternalSourceContent } from './external-source-content.js';
import { externalPlatformLabel, externalSenderLabel } from './bridge-source-label.js';
import { DisbandGroupDialog, GroupManagementSettings } from './group-management-settings.js';
import { MembersEntry, MembersHeaderAction } from './group-member-controls.js';
import { setSessionTarget, useSessionTarget } from './session-target.js';
import { PrivateAccountsSection } from './private-accounts-section.js';
import { BotSchedulesEntry, BotSchedulesHeaderAction, ScheduleDialog } from './schedules-entry.js';
import { SidebarCardList, SidebarCardRow } from './sidebar-card.js';
import {
  SessionsEntry,
  SessionsHeaderAction,
  type NativeSessionCatalog,
} from './sessions-entry.js';
import { SidebarViewMenu } from './sidebar-view-menu.js';
import { channelSidebarPrefs } from './channel-sidebar-prefs.js';
import { memoryViewSnapshot, setMemoryView, subscribeMemoryView } from './memory-view-prefs.js';
import { inboxLayoutSnapshot, setInboxLayout, subscribeInboxLayout } from './inbox-view-prefs.js';
import {
  INBOX_SECTIONS,
  inboxSections,
  openInboxCount,
  type InboxSection,
} from './inbox-sections.js';
import type { BotHarnessTranslate } from './locale.js';
import type { BotAttentionItem } from './store.js';
import { IconButton } from './ds/icon-button.js';
import { GroupHeading } from './ds/group-heading.js';
import { border, color, radius, space, text } from './ds/tokens.stylex.js';

const styles = stylex.create({
  sessionTarget: {
    minWidth: 0,
    flexShrink: 1,
    maxWidth: '160px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: color.muted,
    fontSize: text.metaSize,
  },
  flushInboxGroup: {
    paddingBlock: 0,
    marginTop: 0,
    borderTopWidth: { default: border.hairline, ':first-child': 0 },
    borderTopStyle: 'solid',
    borderTopColor: color.divider,
  },
  flushInboxList: { marginBottom: 0 },
  inboxGroup: { paddingBlock: space.x1 },
  inboxSpaced: { marginTop: space.x3 },
  inboxList: { marginTop: 0, marginBottom: space.x2 },
  viewTabs: {
    display: 'inline-flex',
    gap: space.x1,
    padding: space.x1,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
  },
  viewTab: {
    paddingBlock: space.x1,
    paddingInline: space.x3,
    borderWidth: 0,
    borderStyle: 'none',
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    color: { default: color.muted, ':hover': color.fg },
    fontFamily: 'inherit',
    fontSize: text.bodySize,
    lineHeight: text.bodyLine,
    cursor: 'pointer',
    outline: { default: 'none', ':focus-visible': `${border.focus} solid ${color.accent}` },
    outlineOffset: '-2px',
  },
  viewTabSelected: {
    backgroundColor: color.base,
    color: { default: color.fg, ':hover': color.fg },
    fontWeight: text.strong,
  },
});

const inactiveSubscribe = (): (() => void) => () => {};

const INBOX_STATE_TONE = {
  pending: 'warning',
  processing: 'info',
  observed: 'info',
  deferred: 'neutral',
  'needs-repair': 'danger',
  open: 'outline',
  snoozed: 'neutral',
  handled: 'success',
  ignored: 'quiet',
} as const;

function inboxIcon(item: BotAttentionItem): string {
  if (item.sourceKind === 'schedule') return 'alarm-clock';
  if (item.sourceKind === 'memory-change') return 'git-branch';
  if (item.sourceKind === 'assignment-report' || item.assignmentSessionId !== undefined)
    return 'list-checks';
  if (item.externalOrigin !== undefined) return 'globe';
  if (item.authorKind === 'human') return 'user';
  if (item.authorKind === 'bot') return 'bot';
  return 'inbox';
}

function GroupManagementEntry(props: ChannelSidebarEntryProps): ReactElement {
  const group = useClientStore((state) => state.conversation.channel);
  if (group?.type !== 'group') return <></>;
  return (
    <GroupManagementSettings key={group.id} actions={props.actions} t={props.t} group={group} />
  );
}

function GroupManagementHeaderAction(props: ChannelSidebarEntryProps): ReactElement {
  return <GroupManagementHeaderForChannel key={props.channelId} {...props} />;
}

function GroupManagementHeaderForChannel({
  actions,
  t,
  channelId,
}: ChannelSidebarEntryProps): ReactElement {
  const group = useClientStore((state) => state.conversation.channel);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (group?.type !== 'group' || group.id !== channelId) return <></>;
  const items: readonly MenuEntry[] = [{ id: 'disband', label: t('members.delete') }];
  return (
    <>
      <Menu
        open={menuOpen}
        portal
        dense
        align="end"
        anchor={
          <Tooltip label={t('group.more')} side="bottom" delayMs={500}>
            <IconButton
              size="row"
              tone="subtle"
              aria-label={t('group.more')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <IconEllipsisOutlineRegular size={16} />
            </IconButton>
          </Tooltip>
        }
        items={items}
        onSelect={() => {
          setMenuOpen(false);
          setConfirmOpen(true);
        }}
        onClose={() => setMenuOpen(false)}
      />
      {confirmOpen ? (
        <DisbandGroupDialog
          group={group}
          actions={actions}
          t={t}
          onClose={() => setConfirmOpen(false)}
        />
      ) : null}
    </>
  );
}

function MembersBadge(): ReactElement {
  const count = useClientStore((state) => state.conversation.channel?.members.length ?? 0);
  return <Tag tone="neutral">{count}</Tag>;
}

function sourcePreviewKind(
  source: ExternalSource,
  file: { mediaType?: string },
): 'image' | 'video' | undefined {
  if (source.platform === 'feishu' && source.event.video) return;
  if (file.mediaType?.startsWith('image/')) return 'image';
  if (source.event.video && file.mediaType?.startsWith('video/')) return 'video';
  return;
}

export function BotInboxItemRow({
  item,
  source,
  marker,
  actions,
  t,
}: {
  item: BotAttentionItem;
  source?: string | undefined;
  marker?: string | undefined;
  actions: ChannelSidebarEntryProps['actions'];
  t: BotHarnessTranslate;
}): ReactElement {
  const authorName = useClientStore(
    (state) => state.bots.find((bot) => bot.slug === item.authorBotSlug)?.displayName,
  );
  const externalRequest = useRef(0);
  const [externalOpen, setExternalOpen] = useState(false);
  const [external, setExternal] = useState<ExternalSource>();
  const [externalError, setExternalError] = useState(false);
  const [fileBusy, setFileBusy] = useState<string>();
  const [fileError, setFileError] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const fileRequest = useRef<AbortController>();
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [audioErrors, setAudioErrors] = useState<Record<string, boolean>>({});
  const [audioPreviews, setAudioPreviews] = useState<Record<string, string>>({});
  const [videoPreviews, setVideoPreviews] = useState<Record<string, string>>({});
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const previewUrls = useRef(new Set<string>());
  const previewLifecycle = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) return;
    ++externalRequest.current;
    fileRequest.current?.abort();
    for (const url of previewUrls.current) URL.revokeObjectURL(url);
    previewUrls.current.clear();
  }, []);
  const download = async (
    attachmentId: string,
    name: string,
    preview: boolean | 'audio' | 'video' = false,
  ): Promise<void> => {
    if (fileRequest.current !== undefined) return;
    const controller = new AbortController();
    fileRequest.current = controller;
    setFileBusy(attachmentId);
    setFileError(false);
    if (preview === 'video') setVideoErrors((value) => ({ ...value, [attachmentId]: false }));
    else if (preview === 'audio') setAudioErrors((value) => ({ ...value, [attachmentId]: false }));
    else if (preview) setImageErrors((value) => ({ ...value, [attachmentId]: false }));
    try {
      const response = await fetch(
        './api/botharness/attachment?' +
          new URLSearchParams({
            slug: item.botSlug,
            sourceEventId: item.id,
            attachmentId,
            ...(preview === 'audio' ? { representation: 'playback' } : {}),
          }),
        {
          credentials: 'same-origin',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(45000)]),
        },
      );
      if (!response.ok) throw new Error('Download unavailable');
      const blob = await response.blob();
      controller.signal.throwIfAborted();
      if (preview === 'video' && blob.type !== 'video/mp4') throw new Error('Unsupported video');
      if (preview === 'audio' && blob.type !== 'audio/wav') throw new Error('Unsupported audio');
      if (
        preview === true &&
        !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(blob.type)
      )
        throw new Error('Unsupported image');
      const url = URL.createObjectURL(blob);
      if (preview) {
        previewUrls.current.add(url);
        if (preview === 'video') setVideoPreviews((value) => ({ ...value, [attachmentId]: url }));
        else if (preview === 'audio')
          setAudioPreviews((value) => ({ ...value, [attachmentId]: url }));
        else setImagePreviews((value) => ({ ...value, [attachmentId]: url }));
        return;
      }
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (!controller.signal.aborted) {
        if (preview === 'video') setVideoErrors((value) => ({ ...value, [attachmentId]: true }));
        else if (preview === 'audio')
          setAudioErrors((value) => ({ ...value, [attachmentId]: true }));
        else if (preview) setImageErrors((value) => ({ ...value, [attachmentId]: true }));
        else setFileError(true);
      }
    } finally {
      if (fileRequest.current === controller) {
        fileRequest.current = undefined;
        setFileBusy(undefined);
      }
    }
  };
  const memoryChange = item.sourceKind === 'memory-change';
  const summary = memoryChange
    ? item.summary
        .replace(/^Memory changed since your last turn:\s*/u, '')
        .replace(/^Working Memory changes since your last turn:\s*/u, '')
        .replace(/^\?\? /u, '')
    : item.externalOrigin?.voice?.transcript === 'unavailable'
      ? t('im.voiceTranscriptUnavailableHint')
      : item.summary;
  const author =
    item.externalOrigin !== undefined
      ? `${externalPlatformLabel(item.externalOrigin.platform, t)} · ${externalSenderLabel(item.externalOrigin, t)}`
      : memoryChange
        ? t('inbox.memoryChange')
        : item.sourceKind === 'assignment-report' || item.sourceKind === 'assignment-lifecycle'
          ? t('inbox.assignment')
          : item.sourceKind === 'schedule'
            ? t('inbox.schedule')
            : item.authorKind === 'human'
              ? t('main.author.human')
              : item.authorKind === 'bot'
                ? (authorName ?? item.authorBotSlug ?? t('inbox.bot'))
                : t('inbox.system');
  const open = async (): Promise<void> => {
    if (!item.sourceAvailable) return;
    if (item.scheduleId !== undefined) {
      setScheduleOpen(true);
      return;
    }
    if (item.externalOrigin !== undefined) {
      const request = ++externalRequest.current;
      fileRequest.current?.abort();
      fileRequest.current = undefined;
      setFileBusy(undefined);
      for (const url of previewUrls.current) URL.revokeObjectURL(url);
      previewUrls.current.clear();
      setImagePreviews({});
      setAudioPreviews({});
      setAudioErrors({});
      setVideoPreviews({});
      setVideoErrors({});
      setImageErrors({});
      setExternal(undefined);
      setExternalOpen(true);
      setExternalError(false);
      setFileError(false);
      try {
        const source = await actions.messagingSource(item.botSlug, item.id);
        if (request !== externalRequest.current) return;
        setExternal(source);
        for (const file of source.event.attachments ?? []) {
          if (request !== externalRequest.current) return;
          if (sourcePreviewKind(source, file) === 'image') await download(file.id, file.name, true);
          else if (sourcePreviewKind(source, file) === 'video')
            await download(file.id, file.name, 'video');
        }
      } catch {
        if (request === externalRequest.current) setExternalError(true);
      }
      return;
    }
    if (item.assignmentSessionId !== undefined) {
      await actions.openSession(item.assignmentSessionId);
      return;
    }
    if (item.sourceChannelId === undefined || item.sourceMessageId === undefined) return;
    await actions.openChannel(item.sourceChannelId);
    await actions.openAround(item.sourceChannelId, item.sourceMessageId);
  };
  const imageAttachments =
    external?.event.attachments?.filter((file) => sourcePreviewKind(external, file) === 'image') ??
    [];
  const videoAttachments =
    external?.event.attachments?.filter((file) => sourcePreviewKind(external, file) === 'video') ??
    [];
  const unavailable = !memoryChange && !item.sourceAvailable;
  const chips = [
    marker === undefined ? null : (
      <Tag key="marker" tone="info">
        {marker}
      </Tag>
    ),
    item.externalOrigin?.voice ? (
      <Tag
        key="voice"
        tone={item.externalOrigin.voice.transcript === 'platform' ? 'info' : 'warning'}
      >
        {t(
          item.externalOrigin.voice.transcript === 'platform'
            ? 'im.voiceTranscriptPlatform'
            : 'im.voiceTranscriptUnavailable',
        )}
      </Tag>
    ) : null,
    item.assignmentReportState === undefined ? null : (
      <Tag key="report" tone="outline">
        {t(`inbox.report.${item.assignmentReportState}`)}
      </Tag>
    ),
  ].filter((chip) => chip !== null);
  const returnAt =
    item.snoozedUntil === undefined
      ? undefined
      : new Date(item.snoozedUntil).toLocaleString(undefined, {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  const note = item.state === 'snoozed' ? item.snoozeNote : item.resolutionNote;
  const meta = [
    unavailable ? <span key="unavailable">{t('inbox.sourceUnavailable')}</span> : null,
    returnAt === undefined ? null : (
      <span key="return" className="bh-inbox-item-return">
        {t('inbox.snoozedUntil', { time: returnAt })}
      </span>
    ),
    note === undefined ? null : (
      <span key="note" className="bh-inbox-item-note" title={note}>
        {note}
      </span>
    ),
  ].filter((part) => part !== null);
  const origin =
    item.externalOrigin === undefined
      ? source
      : `${item.externalOrigin.accountName} · ${item.externalOrigin.conversationName}`;
  const row = (
    <SidebarCardRow
      icon={inboxIcon(item)}
      iconLabel={author}
      title={
        <>
          <span
            className="bh-inbox-item-author"
            title={origin === undefined ? author : `${author} · ${origin}`}
          >
            {author}
            {origin === undefined ? null : (
              <span className="bh-inbox-item-origin"> · {origin}</span>
            )}
          </span>
          <span className="bh-inbox-item-time">
            {formatRelativeTime(Date.parse(item.createdAt), Date.now(), t)}
          </span>
        </>
      }
      titleClassName="bh-inbox-item-head"
      badge={<Tag tone={INBOX_STATE_TONE[item.state]}>{t(`inbox.state.${item.state}`)}</Tag>}
      summary={summary || item.assignmentTitle || t('inbox.system')}
      hint={summary}
      mainClassName={memoryChange ? 'bh-inbox-item bh-inbox-item-info' : 'bh-inbox-item'}
      state={item.state}
      muted={unavailable}
      disabled={!item.sourceAvailable}
      dialog={item.scheduleId !== undefined || item.externalOrigin !== undefined}
      {...(memoryChange ? {} : { onClick: () => void open() })}
      {...(chips.length === 0 ? {} : { chips: <>{chips}</> })}
      {...(meta.length === 0 ? {} : { meta: <>{meta}</> })}
    />
  );
  return (
    <>
      {row}
      {scheduleOpen && item.scheduleId !== undefined ? (
        <ScheduleDialog
          botSlug={item.botSlug}
          scheduleId={item.scheduleId}
          actions={actions}
          t={t}
          onClose={() => setScheduleOpen(false)}
        />
      ) : null}
      {externalOpen ? (
        <PanelDialog
          size="medium"
          fill
          bodyRef={previewLifecycle}
          onClose={() => {
            ++externalRequest.current;
            fileRequest.current?.abort();
            fileRequest.current = undefined;
            setFileBusy(undefined);
            for (const url of previewUrls.current) URL.revokeObjectURL(url);
            previewUrls.current.clear();
            setImagePreviews({});
            setAudioPreviews({});
            setAudioErrors({});
            setVideoPreviews({});
            setVideoErrors({});
            setImageErrors({});
            setExternalOpen(false);
          }}
          title={t('im.sourceTitle')}
          closeLabel={t('common.close')}
        >
          {externalError ? (
            <Note tone="danger">{t('im.sourceError')}</Note>
          ) : external === undefined ? (
            <Note>{t('im.sourceLoading')}</Note>
          ) : (
            <ExternalSourceContent
              source={external}
              t={t}
              messageMedia={
                imageAttachments.length || videoAttachments.length ? (
                  <>
                    {imageAttachments.map((file) => (
                      <div className="bh-external-source-attachment" key={file.id}>
                        {imagePreviews[file.id] ? (
                          <img
                            className="bh-external-source-image"
                            src={imagePreviews[file.id]}
                            alt={file.name}
                          />
                        ) : imageErrors[file.id] ? (
                          <>
                            <p role="alert">{t('im.fileError')}</p>
                            <Button
                              disabled={fileBusy !== undefined}
                              onClick={() => void download(file.id, file.name, true)}
                            >
                              {t('im.imageRetry')}
                            </Button>
                          </>
                        ) : (
                          <span role="status">{t('im.fileDownloading')}</span>
                        )}
                      </div>
                    ))}
                    {videoAttachments.map((file) => (
                      <div className="bh-external-source-video" key={file.id}>
                        {videoPreviews[file.id] ? (
                          <video
                            controls
                            preload="metadata"
                            playsInline
                            src={videoPreviews[file.id]}
                            aria-label={t('im.videoPlayer')}
                            onError={() =>
                              setVideoErrors((value) => ({ ...value, [file.id]: true }))
                            }
                          />
                        ) : null}
                        {videoErrors[file.id] ? (
                          <Button
                            variant="primary"
                            disabled={fileBusy !== undefined}
                            onClick={() => void download(file.id, file.name, 'video')}
                          >
                            {fileBusy === file.id ? t('im.videoLoading') : t('im.videoRetry')}
                          </Button>
                        ) : !videoPreviews[file.id] && !videoErrors[file.id] ? (
                          <span role="status">{t('im.videoLoading')}</span>
                        ) : null}
                        {videoErrors[file.id] ? (
                          <p role="alert">{t('im.videoUnavailable')}</p>
                        ) : null}
                      </div>
                    ))}
                  </>
                ) : undefined
              }
            >
              {external.event.attachments?.map((file) => (
                <div className="bh-external-source-attachment" key={file.id}>
                  {external.event.voice && file.mediaType?.startsWith('audio/') ? (
                    <div className="bh-external-source-audio">
                      {audioPreviews[file.id] ? (
                        <audio
                          controls
                          preload="metadata"
                          src={audioPreviews[file.id]}
                          aria-label={t('im.voiceAudioPlayer')}
                          onError={() => setAudioErrors((value) => ({ ...value, [file.id]: true }))}
                        />
                      ) : null}
                      {!audioPreviews[file.id] || audioErrors[file.id] ? (
                        <Button
                          variant="primary"
                          disabled={fileBusy !== undefined}
                          onClick={() => void download(file.id, 'voice.wav', 'audio')}
                        >
                          {fileBusy === file.id
                            ? t('im.voiceAudioPreparing')
                            : audioPreviews[file.id]
                              ? t('im.voiceAudioRetry')
                              : t('im.voiceAudioPrepare')}
                        </Button>
                      ) : null}
                      <p>{t('im.voiceAudioHint')}</p>
                      {audioErrors[file.id] ? (
                        <p role="alert">{t('im.voiceAudioUnavailable')}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="bh-external-source-file">
                    <span>
                      {file.name}
                      {file.sizeBytes !== undefined || file.mediaType ? (
                        <small>
                          {' '}
                          ·{' '}
                          {[
                            file.mediaType,
                            file.sizeBytes === undefined
                              ? undefined
                              : `${new Intl.NumberFormat().format(file.sizeBytes)} B`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </small>
                      ) : null}
                    </span>
                    <Button
                      disabled={fileBusy !== undefined}
                      onClick={() => void download(file.id, file.name)}
                    >
                      {fileBusy === file.id
                        ? t('im.fileDownloading')
                        : t(external.event.voice ? 'im.voiceDownloadOriginal' : 'im.fileDownload')}
                    </Button>
                  </div>
                </div>
              ))}
              {fileError ? <p role="alert">{t('im.fileError')}</p> : null}
            </ExternalSourceContent>
          )}
        </PanelDialog>
      ) : null}
    </>
  );
}

function BotInboxGroup({
  name,
  flush,
  items,
  actions,
  t,
}: {
  name: string;
  flush?: boolean | undefined;
  items: BotAttentionItem[];
  actions: ChannelSidebarEntryProps['actions'];
  t: BotHarnessTranslate;
}): ReactElement {
  const activeSignature = items
    .filter((item) => item.state !== 'handled' && item.state !== 'ignored')
    .map((item) => item.id + ':' + item.state)
    .sort()
    .join('|');
  const [expansion, setExpansion] = useState({
    signature: activeSignature,
    expanded: activeSignature !== '',
  });
  const expanded =
    activeSignature !== expansion.signature && activeSignature !== '' ? true : expansion.expanded;
  return (
    <details
      data-inbox-group=""
      open={expanded}
      onToggle={(event) =>
        setExpansion({ signature: activeSignature, expanded: event.currentTarget.open })
      }
      {...stylex.props(styles.inboxGroup, flush && styles.flushInboxGroup)}
    >
      <GroupHeading
        flush={flush}
        summary
        quiet
        label={name}
        title={name}
        expanded={expanded}
        count={<Tag tone="neutral">{items.length}</Tag>}
      />
      <SidebarCardList
        flush={flush}
        label={name}
        className={stylex.props(styles.inboxList, flush && styles.flushInboxList).className}
      >
        {INBOX_SECTIONS.flatMap((section) => inboxSections(items)[section]).map((item) => (
          <BotInboxItemRow key={item.id} item={item} actions={actions} t={t} />
        ))}
      </SidebarCardList>
    </details>
  );
}

function BotInboxSection({
  section,
  flush,
  items,
  sourceLabel,
  spaced,
  actions,
  t,
}: {
  section: Exclude<InboxSection, 'active'>;
  flush?: boolean | undefined;
  spaced: boolean;
  items: BotAttentionItem[];
  sourceLabel: (item: BotAttentionItem) => string;
  actions: ChannelSidebarEntryProps['actions'];
  t: BotHarnessTranslate;
}): ReactElement {
  const [expanded, setExpanded] = useState(section !== 'done');
  const name = t(`inbox.section.${section}`);
  return (
    <details
      data-inbox-group=""
      data-section={section}
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      {...stylex.props(
        styles.inboxGroup,
        spaced && styles.inboxSpaced,
        flush && styles.flushInboxGroup,
      )}
    >
      <GroupHeading
        flush={flush}
        summary
        quiet
        label={name}
        expanded={expanded}
        count={<Tag tone="neutral">{items.length}</Tag>}
      />
      <SidebarCardList
        flush={flush}
        label={name}
        className={stylex.props(styles.inboxList, flush && styles.flushInboxList).className}
      >
        {items.map((item) => (
          <BotInboxItemRow
            key={item.id}
            item={item}
            source={sourceLabel(item)}
            actions={actions}
            t={t}
          />
        ))}
      </SidebarCardList>
    </details>
  );
}
function BotInboxEntry({ actions, t, botSlug, flush }: ChannelSidebarEntryProps): ReactElement {
  const inbox = useClientStore((state) => state.botInbox);
  const bots = useClientStore((state) => state.bots, sameBotNames);
  const channels = useClientStore((state) => state.channels);
  const layout = useSyncExternalStore(
    subscribeInboxLayout,
    inboxLayoutSnapshot,
    inboxLayoutSnapshot,
  );
  const sourceName = (item: BotAttentionItem): string | undefined => {
    const channel = channels.find((channel) => channel.id === item.sourceChannelId);
    if (channel?.type === 'dm') {
      return bots.find((bot) => bot.slug === channel.botSlug)?.displayName ?? channel.name;
    }
    return item.sourceChannelName ?? channel?.name;
  };
  const sourceKey = (item: BotAttentionItem): string =>
    item.assignmentSessionId === undefined
      ? (item.sourceChannelId ??
        (item.externalOrigin === undefined
          ? `system:${item.reason}`
          : `external:${item.externalOrigin.platform}:${item.externalOrigin.conversationId}`))
      : `assignment:${item.assignmentSessionId}`;
  const sourceLabel = (item: BotAttentionItem): string =>
    item.assignmentTitle ??
    item.externalOrigin?.conversationName ??
    sourceName(item) ??
    item.sourceChannelId ??
    t(item.assignmentSessionId === undefined ? 'inbox.system' : 'inbox.assignment');
  const sections = inboxSections(inbox.items);
  const groups = new Map<string, { name: string; items: BotAttentionItem[] }>();
  for (const item of INBOX_SECTIONS.flatMap((section) => sections[section])) {
    const key = sourceKey(item);
    const group = groups.get(key) ?? { name: sourceLabel(item), items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return (
    <>
      {inbox.status === 'loading' && inbox.items.length === 0 ? (
        <LoadingSkeleton kind="sidebar" label={t('inbox.loading')} />
      ) : null}
      {inbox.status === 'error' ? (
        <div className="bh-error" role="alert">
          {t('inbox.error', { error: inbox.error ?? '' })}
          <button type="button" onClick={() => botSlug && void actions.refreshBotInbox(botSlug)}>
            {t('inbox.retry')}
          </button>
        </div>
      ) : null}
      {inbox.status === 'ready' && inbox.items.length === 0 ? (
        <PanelEmptyState icon="inbox">{t('inbox.empty')}</PanelEmptyState>
      ) : null}
      {layout === 'time' ? (
        <>
          {sections.active.length === 0 ? null : (
            <SidebarCardList flush={flush} label={t('inbox.section.active')}>
              {sections.active.map((item) => (
                <BotInboxItemRow
                  key={item.id}
                  item={item}
                  source={sourceLabel(item)}
                  actions={actions}
                  t={t}
                />
              ))}
            </SidebarCardList>
          )}
          {(['snoozed', 'done'] as const).map((section) =>
            sections[section].length === 0 ? null : (
              <BotInboxSection
                flush={flush}
                key={section}
                section={section}
                spaced={
                  sections.active.length > 0 || (section === 'done' && sections.snoozed.length > 0)
                }
                items={sections[section]}
                sourceLabel={sourceLabel}
                actions={actions}
                t={t}
              />
            ),
          )}
        </>
      ) : (
        [...groups.entries()].map(([key, group]) => (
          <BotInboxGroup
            flush={flush}
            key={key}
            name={group.name}
            items={group.items}
            actions={actions}
            t={t}
          />
        ))
      )}
      {inbox.nextCursor !== undefined && botSlug !== undefined ? (
        <button
          type="button"
          className="bh-group-manage-button"
          onClick={() => void actions.loadMoreBotInbox(botSlug)}
        >
          {t('inbox.more')}
        </button>
      ) : null}
    </>
  );
}

function BotInboxHeaderAction({ t }: ChannelSidebarEntryProps): ReactElement {
  const layout = useSyncExternalStore(
    subscribeInboxLayout,
    inboxLayoutSnapshot,
    inboxLayoutSnapshot,
  );
  return (
    <SidebarViewMenu
      label={t('inbox.menu')}
      items={[
        { type: 'label', id: 'layout-label', text: t('inbox.layout') },
        { id: 'time', label: t('inbox.layout.time') },
        { id: 'source', label: t('inbox.layout.source') },
      ]}
      selectedIds={[layout]}
      onSelect={(id) => setInboxLayout(id === 'source' ? 'source' : 'time')}
    />
  );
}

function MemoryViewTabs({ t, setExpanded }: ChannelSidebarEntryProps): ReactElement {
  const view = useSyncExternalStore(subscribeMemoryView, memoryViewSnapshot, memoryViewSnapshot);
  return (
    <span
      role="tablist"
      aria-label={t('memory.view.label')}
      data-memory-view-tabs=""
      {...stylex.props(styles.viewTabs)}
    >
      {(['graph', 'versions', 'branches'] as const).map((id) => (
        <Tooltip
          key={id}
          label={t(`memory.view.${id}Help`)}
          side="bottom"
          maxWidth={280}
          delayMs={300}
          portal
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === id}
            {...stylex.props(styles.viewTab, view === id && styles.viewTabSelected)}
            onClick={() => {
              setMemoryView(id);
              setExpanded?.(true);
            }}
          >
            {t(`memory.view.${id}`)}
          </button>
        </Tooltip>
      ))}
    </span>
  );
}

function MemoryHeaderAction({
  t,
  actions,
  channelId,
  refreshRevision,
}: ChannelSidebarEntryProps): ReactElement {
  const terminology = useSyncExternalStore(
    channelSidebarPrefs.subscribe,
    () => channelSidebarPrefs.getSnapshot().memoryTerminology,
    () => channelSidebarPrefs.getSnapshot().memoryTerminology,
  );
  const [backups, setBackups] = useState(false);
  return (
    <>
      <SidebarViewMenu
        label={t('memory.menu')}
        items={[
          { type: 'label', id: 'terminology-label', text: t('memory.terminology') },
          { id: 'memory', label: t('memory.terms.memory') },
          { id: 'git', label: t('memory.terms.git') },
          { type: 'separator', id: 'backups-separator' },
          { id: 'backups', label: t('memory.backups.open') },
        ]}
        selectedIds={[terminology]}
        onSelect={(id) => {
          if (id === 'backups') setBackups(true);
          else channelSidebarPrefs.setMemoryTerminology(id === 'git' ? 'git' : 'memory');
        }}
      />
      {!backups ? null : (
        <PanelDialog
          size="small"
          onClose={() => setBackups(false)}
          closeLabel={t('common.close')}
          title={t('memory.backups.title')}
          description={t('memory.backups.intro')}
        >
          <MemoryRecovery
            actions={actions}
            channelId={channelId}
            refreshRevision={refreshRevision}
            t={t}
            onRestored={() => invalidateMemory(cachedMemory(actions, channelId))}
          />
        </PanelDialog>
      )}
    </>
  );
}

function BotInboxBadge(): ReactElement | null {
  const count = useClientStore((state) => openInboxCount(state.botInbox.items));
  return count === 0 ? null : <Tag tone="neutral">{count}</Tag>;
}

function ModelEntry({ botSlug, actions, t }: ChannelSidebarEntryProps): ReactElement {
  const deleted = useClientStore((state) =>
    state.bots.some((bot) => bot.slug === botSlug && bot.deleted === true),
  );
  if (botSlug === undefined || deleted) return <></>;
  return <ModelPresetProfile key={botSlug} slug={botSlug} actions={actions} t={t} />;
}

function useModelPlan(
  slug: string | undefined,
  actions: ChannelSidebarEntryProps['actions'],
): [ModelPlanView | null | undefined, (element: HTMLSpanElement | null) => void] {
  const deleted = useClientStore((state) =>
    state.bots.some((bot) => bot.slug === slug && bot.deleted === true),
  );
  const botSlug = deleted ? undefined : slug;
  const plan = useSyncExternalStore(
    subscribeModelPlans,
    () => modelPlanOf(botSlug),
    () => modelPlanOf(botSlug),
  );
  const mount = useMountedResource<HTMLSpanElement>(() => {
    if (botSlug === undefined || modelPlanOf(botSlug) !== undefined) return;
    let active = true;
    void actions.modelPlanState(botSlug).then(
      (state: ModelPlanStateView | undefined) => {
        if (active) rememberModelPlan(botSlug, state?.plan);
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [actions, botSlug, plan === undefined]);
  return [plan, mount];
}

function routeLabel(route: ModelPlanView['orchestrator'] | undefined): string {
  if (route === undefined) return '…';
  return route.reasoningEffort === undefined
    ? route.model
    : `${route.model} · ${route.reasoningEffort}`;
}

function ModelBadge({ botSlug, actions }: ChannelSidebarEntryProps): ReactElement {
  const [plan, mount] = useModelPlan(botSlug, actions);
  const route = plan?.orchestrator ?? undefined;
  return (
    <span ref={mount} className="bh-channel-sidebar-summary">
      {route === undefined ? null : <Tag tone="neutral">{routeLabel(route)}</Tag>}
    </span>
  );
}

function AssignmentLimitDialog({
  prefs,
  t,
  onClose,
}: {
  prefs: BotModePrefs;
  t: BotHarnessTranslate;
  onClose: () => void;
}): ReactElement {
  const snapshot = useSyncExternalStore(
    prefs.source.subscribe,
    prefs.source.getSnapshot,
    prefs.source.getSnapshot,
  );
  return (
    <PanelDialog
      size="small"
      title={t('assignmentLimit.title')}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      <AssignmentConcurrencySetting
        t={t}
        limit={snapshot.assignmentConcurrencyLimit}
        writable={snapshot.status === 'ready' && snapshot.mode === 'host'}
        save={(limit) => prefs.setAssignmentConcurrencyLimit(limit)}
        variant="dialog"
      />
    </PanelDialog>
  );
}

function SessionsHeaderWithSettings({
  prefs,
  targetItems,
  targetId,
  ...props
}: ChannelSidebarEntryProps & {
  prefs: BotModePrefs | undefined;
  targetItems: readonly MenuEntry[];
  targetId: string | undefined;
}): ReactElement {
  const { actions, t } = props;
  const botDeleted = useClientStore((state) =>
    state.bots.some((bot) => bot.slug === props.botSlug && bot.deleted === true),
  );
  const botSlug = botDeleted ? undefined : props.botSlug;
  const [plan, mount] = useModelPlan(botSlug, actions);
  const readLimit = () => prefs?.source.getSnapshot().assignmentConcurrencyLimit;
  const limit = useSyncExternalStore(
    prefs?.source.subscribe ?? inactiveSubscribe,
    readLimit,
    readLimit,
  );
  const [limitOpen, setLimitOpen] = useState(false);
  const extraItems: MenuEntry[] = [
    ...targetItems,
    ...(botSlug === undefined || props.scope === 'channel'
      ? []
      : [
          { type: 'separator' as const, id: 'model-separator' },
          { type: 'label' as const, id: 'model-label', text: t('entry.model') },
          {
            id: 'model:orchestrator',
            label: `${t('modelPreset.orchestrator')} · ${plan === null ? t('onboarding.inherit') : routeLabel(plan?.orchestrator)}`,
          },
          {
            id: 'model:assignment',
            label: `${t('modelPreset.assignment')} · ${plan === undefined ? '…' : plan?.assignmentDefault === undefined ? t('onboarding.inherit') : routeLabel(plan.assignmentDefault)}`,
          },
        ]),
    ...(prefs === undefined || limit === undefined
      ? []
      : [
          { type: 'separator' as const, id: 'limit-separator' },
          { type: 'label' as const, id: 'limit-label', text: t('assignmentLimit.title') },
          { id: 'limit:edit', label: t('sessions.limit.value', { count: limit }) },
        ]),
  ];
  return (
    <span ref={mount} className="bh-sessions-header-action">
      <SessionsHeaderAction
        {...props}
        extraItems={extraItems}
        extraSelectedIds={targetId ? [targetId] : []}
        onExtraSelect={(id) => {
          if (id.startsWith('target:'))
            setSessionTarget(
              props.channelId,
              id === 'target:channel' ? '' : id.slice('target:bot:'.length),
            );
          else if (id === 'limit:edit') setLimitOpen(true);
          else channelSettings.open('model');
        }}
      />
      {limitOpen && prefs !== undefined ? (
        <AssignmentLimitDialog prefs={prefs} t={t} onClose={() => setLimitOpen(false)} />
      ) : null}
    </span>
  );
}

export function createChannelSidebarBuiltinTabs(
  t: BotHarnessTranslate,
): readonly ChannelSidebarTab[] {
  return [
    {
      id: 'conversation',
      icon: 'messages-circle',
      label: t('tab.conversation'),
      order: 1,
      scope: 'personabot',
    },
    { id: 'memory', icon: 'brain', label: t('tab.memory'), order: 2, scope: 'personabot' },
    { id: 'screen', icon: 'monitor', label: t('tab.screen'), order: 3, scope: 'personabot' },
  ];
}

export function createChannelSidebarBuiltins(
  t: BotHarnessTranslate,
  prefs?: BotModePrefs,
  nativeSessions: NativeSessionCatalog = {
    subscribe: inactiveSubscribe,
    getSnapshot: () => ({ ids: [], byId: {} }),
  },
): readonly ChannelSidebarEntry[] {
  function SessionsWithNative(props: ChannelSidebarEntryProps): ReactElement {
    const readLimit = () => prefs?.source.getSnapshot().assignmentConcurrencyLimit;
    const assignmentLimit = useSyncExternalStore(
      prefs?.source.subscribe ?? inactiveSubscribe,
      readLimit,
      readLimit,
    );
    return (
      <SessionsEntry {...props} nativeSessions={nativeSessions} assignmentLimit={assignmentLimit} />
    );
  }

  function WorkspaceGrantsWithPrefs(props: ChannelSidebarEntryProps): ReactElement {
    const developerMode = useSyncExternalStore(
      prefs?.source.subscribe ?? inactiveSubscribe,
      () => prefs?.source.getSnapshot().developerMode ?? false,
    );
    return <WorkspaceGrantsEntry {...props} developerMode={developerMode} />;
  }
  function SessionsHeader(props: ChannelSidebarEntryProps): ReactElement {
    const target = useSessionTarget(props);
    const group = props.botSlug === undefined;
    const channel = useClientStore((state) =>
      state.conversation.channel?.id === props.channelId
        ? state.conversation.channel
        : state.channels.find((channel) => channel.id === props.channelId),
    );
    const allBots = useClientStore((state) => state.bots, sameBotNames);
    const bots = allBots.filter((bot) => channel?.members.includes(bot.slug));
    const selected =
      target.kind === 'bot' ? allBots.find((bot) => bot.slug === target.slug) : undefined;
    const targetId = group
      ? target.kind === 'channel'
        ? 'target:channel'
        : `target:bot:${target.slug}`
      : undefined;
    const targetItems: MenuEntry[] = group
      ? [
          { type: 'label', id: 'target-label', text: props.t('sessions.target.label') },
          { id: 'target:channel', label: props.t('sessions.target.channel') },
          ...bots.map((bot) => ({
            id: `target:bot:${bot.slug}`,
            label: props.t('sessions.target.bot', { name: bot.displayName }),
          })),
        ]
      : [];
    return (
      <>
        {group && selected ? (
          <span
            data-session-target=""
            title={selected.displayName}
            {...stylex.props(styles.sessionTarget)}
          >
            {props.t('sessions.target.bot', { name: selected.displayName })}
          </span>
        ) : null}
        <SessionsHeaderWithSettings
          {...props}
          botSlug={target.kind === 'bot' ? target.slug : undefined}
          prefs={group ? undefined : prefs}
          targetItems={targetItems}
          targetId={targetId}
        />
      </>
    );
  }
  function MemoryEvolutionEntry(props: ChannelSidebarEntryProps): ReactElement {
    return <MemoryEntry {...props} showFiles={false} />;
  }
  function ConceptArtEntry(props: ChannelSidebarEntryProps): ReactElement {
    if (props.botSlug === undefined) {
      return (
        <PanelEmptyState icon="flask-conical">{props.t('conceptArt.notReady')}</PanelEmptyState>
      );
    }
    return (
      <ConceptArtSection
        botSlug={props.botSlug}
        call={conceptArtCall(props.actions.conceptArt)}
        t={props.t}
      />
    );
  }
  return [
    {
      id: 'memory-files',
      tab: 'memory',
      icon: 'brain',
      label: t('entry.memoryFiles'),
      order: 5,
      scope: 'personabot',
      component: MemoryFilesEntry,
    },
    {
      id: 'memory-evolution',
      tab: 'memory',
      icon: 'git-branch',
      label: t('entry.memoryEvolution'),
      order: 6,
      scope: 'personabot',
      component: MemoryEvolutionEntry,
      headerAction: MemoryHeaderAction,
      headerLabel: t('entry.memory'),
      headerTabs: MemoryViewTabs,
    },
    {
      id: 'sessions',
      icon: 'text-quote',
      label: t('entry.sessions'),
      order: 10,
      scope: 'both',
      component: SessionsWithNative,
      headerAction: SessionsHeader,
    },
    {
      id: 'bot-inbox',
      tab: 'conversation',
      icon: 'inbox',
      label: t('entry.botInbox'),
      order: 15,
      scope: 'personabot',
      component: BotInboxEntry,
      badge: BotInboxBadge,
      headerAction: BotInboxHeaderAction,
    },
    {
      id: 'schedules',
      defaultHidden: true,
      icon: 'alarm-clock',
      label: t('entry.schedules'),
      order: 16,
      scope: 'personabot',
      component: BotSchedulesEntry,
      headerAction: BotSchedulesHeaderAction,
    },
    {
      id: 'concept-art',
      icon: 'flask-conical',
      label: t('botSettings.section.conceptArt'),
      order: 17,
      scope: 'personabot',
      component: ConceptArtEntry,
    },
    ...(['personabot', 'channel'] as const).map((scope) => ({
      id: scope === 'personabot' ? 'human-nickname' : 'group-human-nickname',
      surface: 'settings' as const,
      icon: 'user',
      label: t('humanNickname.title'),
      order: 1,
      scope,
      component: ChannelNicknameEntry,
      visible: (state: ConversationStateView) =>
        state.conversation.channel?.humanNickname !== undefined,
    })),
    {
      id: 'dm-trace',
      surface: 'settings',
      icon: 'eye',
      label: t('dmTrace.menu'),
      order: 2,
      scope: 'personabot',
      component: ChannelTraceEntry,
    },
    {
      id: 'workspace-grants',
      surface: 'settings',
      icon: 'folder-key',
      label: t('entry.workspaceGrants'),
      order: 20,
      scope: 'personabot',
      component: WorkspaceGrantsWithPrefs,
    },
    {
      id: 'auto-approval',
      surface: 'settings',
      icon: 'shield-check',
      label: t('entry.autoApproval'),
      order: 22,
      scope: 'personabot',
      component: AutoApprovalSettingsEntry,
      badge: AutoApprovalBadge,
    },
    {
      id: 'prompts',
      surface: 'settings',
      icon: 'file-text',
      label: t('entry.prompts'),
      order: 24,
      scope: 'personabot',
      component: BotPromptSettingsEntry,
    },
    {
      id: 'voice',
      surface: 'settings',
      icon: 'audio-lines',
      label: t('entry.voice'),
      order: 24.5,
      scope: 'personabot',
      component: BotVoiceSettingsEntry,
    },
    {
      id: 'model',
      surface: 'settings',
      icon: 'cpu',
      label: t('entry.model'),
      order: 25,
      scope: 'personabot',
      component: ModelEntry,
      badge: ModelBadge,
    },
    {
      id: 'wake-policy',
      surface: 'settings',
      icon: 'bell-ring',
      label: t('entry.wakePolicy'),
      order: 26,
      scope: 'personabot',
      component: WakePolicyEntry,
      badge: WakePolicyBadge,
    },
    {
      id: 'external-identities',
      surface: 'settings',
      icon: 'id-card',
      label: t('entry.externalIdentities'),
      order: 27,
      scope: 'personabot',
      component: ExternalIdentitiesEntry,
    },
    {
      id: 'external-connectors',
      surface: 'settings',
      icon: 'plug',
      label: t('entry.externalConnectors'),
      order: 28,
      scope: 'personabot',
      component: ExternalConnectorsEntry,
      attention: ExternalConnectorsAttention,
    },
    {
      id: 'private-accounts',
      surface: 'settings',
      icon: 'shield-check',
      label: t('entry.privateAccounts'),
      order: 29,
      scope: 'personabot',
      component: PrivateAccountsSection,
    },
    {
      id: 'members',
      icon: 'users',
      label: t('entry.members'),
      order: 10,
      scope: 'channel',
      component: MembersEntry,
      headerAction: MembersHeaderAction,
      badge: MembersBadge,
    },
    {
      id: 'group-wake-policy',
      surface: 'settings',
      icon: 'bell-ring',
      label: t('entry.wakePolicy'),
      order: 12,
      scope: 'channel',
      component: GroupWakePolicyEntry,
      visible: isGroupConversation,
    },
    {
      id: 'group-external-connectors',
      surface: 'settings',
      icon: 'plug',
      label: t('entry.externalConnectors'),
      order: 14,
      scope: 'channel',
      component: GroupConnectorsEntry,
      attention: GroupConnectorsAttention,
      visible: isGroupConversation,
    },
    {
      id: 'group-management',
      surface: 'settings',
      icon: 'settings-2',
      label: t('entry.groupManagement'),
      order: 20,
      scope: 'channel',
      component: GroupManagementEntry,
      headerAction: GroupManagementHeaderAction,
      visible: (state) => state.conversation.channel?.type === 'group',
    },
  ];
}
