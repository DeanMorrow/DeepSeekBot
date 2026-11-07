import { CHANNEL_BODY_PANEL, readChannelDock, writeChannelDock } from './channel-dock-layout.js';
import { createBotPresentation } from './bot-presentation.js';
import { disposeClientLog, installClientLog } from './diagnostic-log.js';
import { watchClientLogState } from './diagnostic-log-state.js';
import { telemetrySurface } from './telemetry-surface.js';
import { mountWindowZoomControl } from './window-zoom-control.js';
import { mountWindowZoom, type ZoomCompatibility } from './window-zoom-mount.js';
import { Wallpaper } from './wallpaper.js';
import { createWallpaperStore } from './wallpaper-store.js';
import { mountWallpaper } from './wallpaper-layer.js';
import { panelTargetId } from './appearance-panels.js';
import { refreshBotPrimaryColors } from './bot-primary-color.js';
import { Appearance } from './appearance.js';
import { mountAppearance } from './appearance-scope.js';
import { mountAppearanceControl } from './appearance-control.js';
import { recordRemoteHosts, remoteHosts } from './remote-hosts.js';
import { bindBotAppearance } from './bot-color-scheme.js';
import type {} from '@deepseek-ai/dsh-client-ui-theme/client';
import { AppearanceSection } from './appearance-settings.js';
import { KeyboardSettings, setWorkShortcutNotice } from './keyboard-settings.js';
import { DesktopNotificationSetting } from './notification-settings.js';
import { createElement } from 'react';
import { bindTobPresentation } from './tob-presentation.js';
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
import { registerWorkspaceShortcuts, migrateWorkShortcut } from './workspace-shortcuts.js';
import type {} from '@deepseek-ai/dsh-client-shortcuts/client';
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-locale/client';
import type { InputTriggerSource } from '@deepseek-ai/dsh-client-ui-input-trigger/client';
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type {} from '@deepseek-ai/dsh-client-ui-settings/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client';
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client';
import type {} from '@deepseek-ai/dsh-api-session-controller/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';

import { BOT_MODE_NAMESPACE, type BotModeSettings } from '../bot-mode-settings.js';
import {
  fullClientLocator,
  privateInputLocator,
} from '../../../core/src/credentials/web-locator.js';
import { requestCreation } from './create-request.js';
import { watchFullClientLanding, watchPrivateInputNavigation } from './private-input-navigation.js';
import { createNativeHostFiles } from './host-file-actions.js';
import { createFileOpenPreferences } from './file-open-preferences.js';
import { createActions, type BridgeActions } from './actions.js';
import { ProviderAppSetup } from './provider-app-setup.js';
import { BotModePrefs, botModePrefsFace } from './bot-mode-prefs.js';
import {
  BotSessionFolders,
  mountBotFolderProjection,
  type NativeBotFolderMount,
  type BotSessionGroup,
} from './bot-session-folders.js';
import {
  createBotSessionVisibility,
  mountBotSessionVisibility,
  type WorkspaceListSnapshot,
} from './bot-session-visibility.js';
import { subscribeBotColorScheme, readBotColorScheme } from './bot-color-scheme.js';
import { botIconMarkup } from './bot-icon.js';
import { installBotNavIcon } from './bot-icon-nav.js';
import { nativeSettingsNavigation } from './bot-settings-open.js';
import {
  BOT_SETTINGS_SECTIONS,
  BotSettings,
  BotSettingsView,
  botSettingsSectionSource,
} from './bot-settings.js';
import type { QuickSwitcherSettings } from './quick-switcher.js';
import { searchSettings } from './settings-search.js';
import { startConnectSignIn } from './connect-sign-in.js';
import { DshBotSettingsItem } from './dsh-bot-settings-item.js';
import { createImApps, ImAppsSection } from './im-apps-section.js';
import {
  AboutSection,
  AdvancedSection,
  CompanionsSection,
  DataPrivacySection,
  DevicesSection,
  AccountSection,
  GeneralSection,
  MessagingSection,
  ModelsSection,
  AutoApprovalSection,
  PromptsSection,
  VoiceSection,
  ConceptArtSection,
} from './bot-settings-sections.js';
import { PluginsSection } from './plugin-updates-view.js';
import { ReleaseNotesController } from './release-notes.js';
import { TelemetryNoticeController } from './telemetry-notice.js';
import './bot-settings-slot.js';
import { BotMain } from './bot-main.js';
import { expectMobileConversation, MobileBotPanel } from './mobile-bot-panel.js';
import { mobileBotViewport, subscribeMobileBotViewport } from './mobile-viewport.js';
import { clearConversationDrafts } from './conversation-draft.js';
import { BotSidebar, createBotPanelEntry } from './bot-sidebar.js';
import { BotModeSidebar } from './bot-mode-sidebar.js';
import {
  botModeSidebarViewport,
  subscribeBotModeSidebarViewport,
} from './bot-mode-sidebar-viewport.js';
import { OnboardingEnterHint, OnboardingLauncher } from './onboarding-checklist-view.js';
import {
  createChannelSidebarBuiltinTabs,
  createChannelSidebarBuiltins,
} from './channel-sidebar-builtins.js';
import { webShortcutBlocked, webModalOpen, webShortcutHelpQuestion } from './channel-shortcuts.js';
import { ShortcutBindings } from './shortcut-bindings.js';
import { mountSettingsShortcut } from './settings-shortcut.js';
import {
  browserNotificationApi,
  DesktopNotificationPrefs,
  mountDesktopNotifications,
} from './desktop-notifications.js';
import { openHumanAttentionSource } from './human-attention-source.js';
import { mountTabTitle } from './tab-title.js';
import { createChannelSidebarRegistry } from './channel-sidebar.js';
import { createDockPanelRegistry } from './dock-panels.js';
import { createActivityCenterPanel } from './activity-center-panel.js';
import { createMarketPanel } from './market-panel.js';
import { createProfileCardBuiltins } from './profile-cards-builtins.js';
import { createGroupProfileCards } from './group-profile.js';
import { createProfileCardRegistry } from './profile-cards.js';
import {
  createBridgeCall,
  loadJournalPage,
  connectionRpc,
  loadActivitySnapshot,
  loadBotSessionGroups,
  loadSessionBotOwner,
  loadHumanAttention,
  botExists,
} from './bridge.js';
import {
  SessionOwnerLeading,
  SessionReturnAction,
  SessionReturnMenuItem,
} from './session-return-action.js';
import { mountActivityLive } from './activity-live.js';
import { installChannelFollow, mountChannelLive, mountRosterLive } from './channel-live.js';
import { installTypedLive, observeHumanAttention } from './messaging-defaults-live.js';
import {
  CHANNEL_REMOTE_DESCRIPTOR,
  COMPANION_REMOTE_DESCRIPTOR,
  createChannelFollow,
  createCompanionSource,
  type CompanionNamespace,
  type CompanionSource,
  createTypedLive,
  SNAPSHOT_REMOTE_DESCRIPTORS,
  type ChannelNamespace,
  type SnapshotNamespace,
} from './live-snapshots.js';
import { sessionBotReference } from './mentions.js';
import { en, LOCALE_NS, zh } from './locale.js';
import { registerModeShadow } from './mode.js';
import { browserSystemMotionSource, mountMotionPolicyAttribute } from './motion-preference.js';
import { defaultStorage, loadRosterConfig } from './roster-config.js';
import { mountDevClientRefresh } from './dev-client-refresh.js';
import { saveHmrView, takeHmrView } from './hmr-view.js';
import { consumeLastView, writeLastView } from './last-view.js';
import { migrateLegacyRoster } from './roster-migration.js';
import { CSS } from './styles.js';
import { store } from './store.js';
import { WindowCompanions } from './window-companions.js';
import { WindowCompanionsView } from './window-companions-view.js';

export const name = 'botharness-client';

export const inject = [
  'slots',
  'shortcuts',
  'connection',
  'inputTriggers',
  'layout',
  'locale',
  'theme',
  'sessions',
  'uiWorkspace',
  'workspaces',
  'remote',
  'remote.session',
];

export const PANEL_ID = 'botharness' as MainPanelId;

interface PanelInfoLike {
  getSnapshot(): { activePanelId: string | null };
  subscribe(listener: () => void): () => void;
}

function panelInfoOf(layout: { panelInfo?: PanelInfoLike }): PanelInfoLike | undefined {
  return layout.panelInfo;
}

export function installStyles(): () => void {
  if (typeof document === 'undefined') return () => {};
  const style = document.createElement('style');
  style.setAttribute('data-botharness', 'client');
  style.dataset.plugin = '@botharness/ui';
  style.dataset.pluginCss = '@botharness/ui/client.css';
  style.textContent = CSS;
  document.head.appendChild(style);
  return () => {
    style.remove();
  };
}

export function apply(ctx: ClientContext): void {
  ctx.effect(() => clearConversationDrafts);
  ctx.effect(() => {
    if (typeof window === 'undefined') return () => {};
    installClientLog({ window, surface: telemetrySurface() });
    const offStore = watchClientLogState(store);
    return () => {
      offStore();
      disposeClientLog();
    };
  }, 'botharness: always-on local diagnostic log');
  const storage = defaultStorage();
  const wallpaper = new Wallpaper(
    createWallpaperStore(typeof indexedDB === 'undefined' ? undefined : indexedDB),
  );
  const appearance = new Appearance(storage, () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  );
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {};
    const offScheme = bindBotAppearance(appearance);
    const offStyle = mountAppearance(appearance);
    const offColors = appearance.subscribe(refreshBotPrimaryColors);
    refreshBotPrimaryColors();
    const offWallpaper = mountWallpaper(wallpaper);
    const offControl = mountAppearanceControl(appearance, wallpaper);
    return () => {
      offControl();
      offWallpaper();
      offColors();
      offStyle();
      offScheme();
    };
  });
  const hmrView =
    typeof window === 'undefined'
      ? undefined
      : takeHmrView(window as unknown as Record<string, unknown>);
  const t = ctx.locale.bind(LOCALE_NS);
  remoteHosts(t);
  const zoom = mountWindowZoom({
    document: typeof document === 'undefined' ? undefined : document,
    window: typeof window === 'undefined' ? undefined : window,
    shortcuts: ctx.shortcuts,
    storage,
    onReady: mountWindowZoomControl,
    compatibility:
      typeof window === 'undefined'
        ? undefined
        : (window as unknown as { __botharnessWindowZoomCompatibility?: ZoomCompatibility })
            .__botharnessWindowZoomCompatibility,
    t,
  });
  ctx.effect(() => () => zoom.dispose(), 'botharness: device-local window zoom');
  const nativeChatT = ctx.locale.bind('chat');
  const call = createBridgeCall(ctx);
  const profileContext = async (): Promise<{ profileId: string }> => {
    const response = await fetch('./api/botharness/companion', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Companion context unavailable');
    const value: unknown = await response.json();
    if (
      typeof value !== 'object' ||
      value === null ||
      !('profileId' in value) ||
      typeof value.profileId !== 'string'
    )
      throw new Error('Invalid Companion context');
    return { profileId: value.profileId };
  };
  const actions: BridgeActions = createActions(call, store, {
    nativeFiles: createNativeHostFiles(ctx.remote.session),
    fileOpenPreferences: createFileOpenPreferences({ storage, context: profileContext }),
    pickDirectory: () => {
      const picker = ctx.get('uiWorkspace');
      if (picker === undefined) throw new Error('DSH folder picker is unavailable');
      return picker.pickDirectory();
    },
    createWorkspace: (input) => {
      const workspaces = ctx.get('workspaces');
      if (workspaces === undefined) throw new Error('DSH Workspace controller is unavailable');
      return workspaces.create(input);
    },
    openSession: (sessionId) => {
      ctx.layout.selectPanel(null);
      ctx.uiWorkspace.openSession(sessionId as SessionId);
    },
  });
  const setupRpc = connectionRpc(ctx);
  if (setupRpc) actions.appSetup = new ProviderAppSetup(setupRpc);
  recordRemoteHosts((event, properties) => actions.telemetryEvent(event, properties));
  let companionSource: ((url: string) => CompanionSource) | undefined;
  const companion = new WindowCompanions({
    storage,
    exists: (botId) => botExists(call, botId),
    context: profileContext,
    source: (url) => companionSource?.(url) ?? new EventSource(url),
    update: async (value) => {
      const response = await fetch('./api/botharness/companion', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
      if (!response.ok) throw new Error('Companion subscription unavailable');
    },
  });
  ctx.effect(() => {
    void companion.start();
    return () => companion.dispose();
  }, 'botharness: independent Window Companion owner');
  const prefs = new BotModePrefs(storage);
  ctx.effect(
    () =>
      bindTobPresentation({
        bot: (slug) => store.getSnapshot().bots.find((bot) => bot.slug === slug),
        icon: () => prefs.source.getSnapshot().botIcon,
        subscribe(listener) {
          const offStore = store.subscribe(listener);
          const offPrefs = prefs.source.subscribe(listener);
          return () => {
            offStore();
            offPrefs();
          };
        },
      }),
    'botharness: Tob presentation',
  );
  const botFolderGroups = createSnapshotStore<readonly BotSessionGroup[]>([]);
  const botFolderHost = createSnapshotStore<HTMLElement | null>(null);
  let botFolderMount: NativeBotFolderMount | undefined;
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      {
        name: 'shell.overlay',
        id: 'botharness-bot-session-folders',
        locale: LOCALE_NS,
        inject: () => ({
          storage,
          openSession: (id: string) => ctx.uiWorkspace.openSession(id as SessionId),
          roster: store,
          hooks: { botFolderGroups, botFolderPrefs: prefs.source, botFolderHost },
          setMounted: (node: HTMLElement | null) => botFolderMount?.setMounted(node),
        }),
      },
      BotSessionFolders,
    ),
  );
  const botSettings = new BotSettings();
  const desktopNotifications = new DesktopNotificationPrefs(storage, browserNotificationApi());
  const shortcutBindings = new ShortcutBindings(storage);
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      {
        name: 'shell.overlay',
        id: 'botharness-window-companion',
        locale: LOCALE_NS,
        inject: () => ({
          companion,
          prefs,
          actions,
          dropIn: true,
          openDm: (botId: string) => {
            ctx.layout.selectPanel(PANEL_ID);
            void actions.openBot(botId);
          },
          openChannel: async (channelId: string, messageId: string) => {
            await actions.openChannelAtMessage(channelId, messageId);
            ctx.layout.selectPanel(PANEL_ID);
          },
          openAttention: () => {
            ctx.layout.selectPanel(PANEL_ID);
            void actions.openActivityCenter();
          },
          openSettings: () => {
            botSettings.open(BOT_SETTINGS_SECTIONS.companions);
          },
        }),
      },
      WindowCompanionsView,
    ),
  );
  const botSettingsSections = botSettingsSectionSource(ctx);
  const quickSwitcherSettings: QuickSwitcherSettings = {
    search: (query) => searchSettings(botSettingsSections.getSnapshot(), query, t),
    open: (result) => botSettings.open(result.section, result.target),
  };
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      {
        name: 'shell.overlay',
        id: 'botharness-bot-settings',
        locale: LOCALE_NS,
        inject: () => ({ botSettings, sections: botSettingsSections }),
        children: { 'botharness.settings.section': { kind: 'list', scope: 'root' } },
      },
      BotSettingsView,
    ),
  );
  const releaseNotes = new ReleaseNotesController(call, storage);
  const telemetryNotice = new TelemetryNoticeController(call, storage, () => {
    botSettings.open(BOT_SETTINGS_SECTIONS.dataPrivacy);
  });
  const lastView =
    typeof window === 'undefined'
      ? undefined
      : consumeLastView(window as unknown as Record<string, unknown>, storage);
  let restoreBotMode = hmrView === undefined && lastView?.mode === 'bot';
  const nativeSessions = {
    refresh: () => ctx.sessions.refresh(),
    subscribe: (listener: () => void) => ctx.sessions.list.subscribe(listener),
    getSnapshot: () => ctx.sessions.list.getSnapshot(),
  };
  ctx.effect(() => {
    if ((ctx as { sessions?: { list?: unknown } }).sessions?.list === undefined) return () => {};
    const workspaceList = ((ctx as { workspaces?: { list?: unknown } }).workspaces
      ?.list as unknown as
      | {
          subscribe(listener: () => void): () => void;
          getSnapshot(): WorkspaceListSnapshot | undefined;
        }
      | undefined) ?? { subscribe: () => () => {}, getSnapshot: () => undefined };
    const controller = new AbortController();
    if (typeof document !== 'undefined')
      botFolderMount = mountBotFolderProjection({
        sessions: nativeSessions,
        workspaces: workspaceList,
        prefs: prefs.source,
        groups: botFolderGroups,
        setHost: (host) => botFolderHost.set(host),
      });
    const visibility = createBotSessionVisibility({
      sessions: nativeSessions,
      workspaces: workspaceList,
      prefs: prefs.source,
      loadBotSessionIds: async () => {
        const groups = await loadBotSessionGroups(call, controller.signal);
        if (!controller.signal.aborted) botFolderGroups.set(groups);
        return groups.flatMap((group) => group.sessionIds);
      },
      warn: (message, error) => ctx.logger.warn(message, error),
    });
    let roster = '';
    let rosterBots: unknown;
    const offRoster = store.subscribe(() => {
      const bots = store.getSnapshot().bots;
      if (bots === rosterBots) return;
      rosterBots = bots;
      const next = JSON.stringify(bots.map((bot) => [bot.slug, bot.displayName]));
      if (next === roster) return;
      roster = next;
      visibility.refresh();
    });
    const unmount = mountBotSessionVisibility(visibility);
    return () => {
      controller.abort();
      botFolderMount?.dispose();
      botFolderMount = undefined;
      offRoster();
      unmount();
      visibility.dispose();
    };
  }, 'botharness: Bot Session visibility');
  const presentation = createBotPresentation(store);
  ctx.provide('botPresentation', presentation);
  ctx.effect(() => () => presentation.dispose());
  const dockPanels = createDockPanelRegistry({
    instances: readChannelDock()?.instances ?? [],
    saveInstances(instances) {
      const current = readChannelDock();
      if (!current || !writeChannelDock({ ...current, instances }))
        throw new Error('panel_layout_unavailable');
    },
  });
  ctx.provide('dockPanels', dockPanels);
  ctx.effect(() =>
    appearance.setTargetSource(() => [
      ...dockPanels.panels().map((panel) => ({ id: panelTargetId(panel.id), label: panel.title })),
      { id: panelTargetId('memory-details'), label: t('appearance.memoryDetails') },
      { id: panelTargetId('generated-files'), label: t('generatedFiles.title') },
    ]),
  );
  const channelSidebar = createChannelSidebarRegistry(dockPanels);
  const workspace = {
    actions,
    companion,
    channelSidebar,
    dockPanels,
    shortcutBindings,
    prefs,
    layout: ctx.layout,
    shortcuts: ctx.shortcuts,
    registerLayoutSettings: (setTarget: (node: HTMLDivElement | null) => void) =>
      ctx.slots.inject('botharness.settings.layout', () =>
        ctx.slots.register(
          {
            name: 'botharness.settings.layout',
            id: 'workspace-layout',
            order: 5,
            label: () => t('workspace.appearance'),
            locale: LOCALE_NS,
          },
          () => createElement('div', { ref: setTarget }),
        ),
      ),
    exitBotMode: () => ctx.layout.selectPanel(null),
    openBotSettings: (sectionId?: string) => botSettings.open(sectionId),
    quickSwitcherSettings,
  };

  ctx.effect(() =>
    registerWorkspaceShortcuts(
      ctx.shortcuts,
      dockPanels,
      () => document.querySelector('[data-workspace-enabled]') !== null,
      t,
      () => {
        dockPanels.open(CHANNEL_BODY_PANEL);
        void actions
          .tobHome()
          .then((tob) => actions.openChannel(tob.channelId))
          .catch(() => {});
      },
    ),
  );
  ctx.effect(() =>
    migrateWorkShortcut(ctx.shortcuts, () => {
      setWorkShortcutNotice(true);
      botSettings.open(BOT_SETTINGS_SECTIONS.shortcuts);
    }),
  );
  ctx.provide('channelSidebar', channelSidebar);
  const profileCards = createProfileCardRegistry();
  ctx.provide('profileCards', profileCards);
  ctx.effect(() => {
    let disposers: (() => void)[] = [];
    const reconcile = (): void => {
      for (const dispose of disposers) dispose();
      disposers = [
        ...createChannelSidebarBuiltinTabs(t).map((tab) => channelSidebar.registerTab(tab)),
        ...createChannelSidebarBuiltins(t, prefs, nativeSessions).map((entry) =>
          channelSidebar.register(entry),
        ),
        dockPanels.register(createActivityCenterPanel(actions, t, dockPanels)),
        dockPanels.register(createMarketPanel(actions, dockPanels, t)),
      ];
    };
    reconcile();
    const unsubscribe = ctx.locale.subscribe(reconcile);
    return () => {
      unsubscribe();
      for (const dispose of disposers) dispose();
    };
  }, 'botharness: Channel sidebar entries');

  ctx.effect(() => {
    let disposers: (() => void)[] = [];
    const reconcile = (): void => {
      for (const dispose of disposers) dispose();
      disposers = [
        ...createProfileCardBuiltins(t).map((card) => profileCards.register(card)),
        ...createGroupProfileCards(t).map((card) => profileCards.registerGroup(card)),
      ];
    };
    reconcile();
    const unsubscribe = ctx.locale.subscribe(reconcile);
    return () => {
      unsubscribe();
      for (const dispose of disposers) dispose();
    };
  }, 'botharness: Profile Cards');

  ctx.effect(installStyles, 'botharness: client styles');
  ctx.effect(mountDevClientRefresh, 'botharness: local development refresh');
  ctx.effect(
    () => prefs.attachSystemMotion(browserSystemMotionSource()),
    'botharness: system motion preference',
  );
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {};
    return mountMotionPolicyAttribute(prefs.source, document.documentElement);
  }, 'botharness: motion policy boundary');
  ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), 'botharness: dictionaries');
  ctx.effect(() => {
    const reconcile = () => store.setDefaultTobName(t('tob.defaultName'));
    reconcile();
    return ctx.locale.subscribe(reconcile);
  }, 'botharness: localized Tob name');
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {};
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!shortcutBindings.matches('bot-mode', event)) {
        return;
      }
      if (webShortcutBlocked(event.target, document)) return;
      event.preventDefault();
      ctx.layout.selectPanel(store.getSnapshot().mode === 'bot' ? null : PANEL_ID);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, 'botharness: Bot mode keyboard shortcut');
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {};
    const onKeyDown = (event: KeyboardEvent): void => {
      if (store.getSnapshot().mode !== 'bot') return;
      const trigger = shortcutBindings.matches('help', event)
        ? 'binding'
        : webShortcutHelpQuestion(event.key, {
              ctrl: event.ctrlKey,
              meta: event.metaKey,
              alt: event.altKey,
              altGraph: event.getModifierState('AltGraph'),
              composing: event.isComposing,
              repeat: event.repeat,
              prevented: event.defaultPrevented,
            })
          ? 'question'
          : undefined;
      if (trigger === undefined) return;
      if (
        botSettings.getSnapshot().open &&
        botSettings.getSnapshot().sectionId === BOT_SETTINGS_SECTIONS.shortcuts
      ) {
        event.preventDefault();
        botSettings.close();
        return;
      }
      if (
        trigger === 'question' ? webShortcutBlocked(event.target, document) : webModalOpen(document)
      )
        return;
      event.preventDefault();
      botSettings.open(BOT_SETTINGS_SECTIONS.shortcuts);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, 'botharness: keyboard shortcut list');
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {};
    return mountSettingsShortcut({
      document,
      bindings: shortcutBindings,
      botSettings,
      active: () => store.getSnapshot().mode === 'bot',
    });
  }, 'botharness: Bot settings keyboard shortcut');
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {};
    return mountTabTitle(store, document);
  }, 'botharness: tab title attention count');
  ctx.effect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return () => {};
    return mountDesktopNotifications({
      prefs: desktopNotifications,
      load: async () => {
        const [action, replies, unread] = await Promise.all([
          loadHumanAttention(call, 'action', 20),
          loadHumanAttention(call, 'replies', 20),
          loadHumanAttention(call, 'unread', 20),
        ]);
        return [...action.items, ...replies.items, ...unread.items];
      },
      channels: () => store.getSnapshot().channels,
      attentive: () => document.visibilityState === 'visible' && document.hasFocus(),
      subscribe: (listener) => {
        let prior = store.getSnapshot().humanInbox;
        const offStore = store.subscribe(() => {
          const next = store.getSnapshot().humanInbox;
          if (next.unreadCount === prior.unreadCount && next.hasAction === prior.hasAction) return;
          prior = next;
          listener();
        });
        const offPrefs = desktopNotifications.subscribe(listener);
        const offAttention = observeHumanAttention(listener);
        document.addEventListener('visibilitychange', listener);
        window.addEventListener('focus', listener);
        window.addEventListener('blur', listener);
        return () => {
          offStore();
          offPrefs();
          offAttention();
          document.removeEventListener('visibilitychange', listener);
          window.removeEventListener('focus', listener);
          window.removeEventListener('blur', listener);
        };
      },
      title: (kind, item) => {
        const bot =
          store.getSnapshot().bots.find((candidate) => candidate.slug === item.botSlug)
            ?.displayName ??
          (item.botSlug || item.channelName) ??
          '';
        return t(`desktopNotify.${kind}`, { bot, channel: item.channelName ?? '' });
      },
      open: (item) => {
        ctx.layout.selectPanel(PANEL_ID);
        void openHumanAttentionSource(actions, item).catch((error: unknown) => {
          ctx.logger.warn('botharness: failed to open notification source', error);
        });
      },
    });
  }, 'botharness: desktop notifications');
  ctx.effect(
    () => (typeof EventSource === 'undefined' ? () => {} : mountChannelLive(store, actions)),
    'botharness: Channel live subscription',
  );
  ctx.effect(
    () => (typeof EventSource === 'undefined' ? () => {} : mountRosterLive(store, actions)),
    'botharness: Roster live subscription',
  );
  ctx.effect(() => {
    let uninstall: (() => void) | undefined;
    let disposed = false;
    const native = ctx.remote as Partial<Pick<typeof ctx.remote, '$mount' | '$stream'>>;
    if (typeof native.$mount !== 'function' || typeof native.$stream !== 'function')
      return () => {};
    const namespace = (): Partial<SnapshotNamespace> => {
      const mounted = ctx.get('remote.botharness') as Partial<SnapshotNamespace> | undefined;
      if (mounted === undefined) throw new Error('botharness live Remote is not mounted');
      return mounted;
    };
    void ctx.remote
      .$mount({
        package: '@botharness/core',
        descriptors: [
          ...SNAPSHOT_REMOTE_DESCRIPTORS,
          CHANNEL_REMOTE_DESCRIPTOR,
          COMPANION_REMOTE_DESCRIPTOR,
        ],
      })
      .then(
        () => {
          if (disposed) return;
          const uninstallTyped = installTypedLive(
            createTypedLive(ctx.remote, () => {
              const mounted = namespace();
              if (mounted.followRoster === undefined || mounted.followActivity === undefined)
                throw new Error('botharness live Remote is not mounted');
              return mounted as SnapshotNamespace;
            }),
          );
          const uninstallFollow = installChannelFollow(
            createChannelFollow(
              ctx.remote,
              () => {
                const mounted = namespace() as Partial<ChannelNamespace>;
                if (mounted.followChannel === undefined)
                  throw new Error('botharness live Remote is not mounted');
                return mounted as ChannelNamespace;
              },
              (channelId, request, signal) => loadJournalPage(call, channelId, request, signal),
            ),
          );
          companionSource = createCompanionSource(ctx.remote, () => {
            const mounted = namespace() as Partial<CompanionNamespace>;
            if (mounted.followCompanion === undefined)
              throw new Error('botharness live Remote is not mounted');
            return mounted as CompanionNamespace;
          });
          companion.reconnect();
          uninstall = () => {
            companionSource = undefined;
            companion.reconnect();
            uninstallFollow();
            uninstallTyped();
          };
        },
        (error: unknown) => {
          console.warn('botharness: live Remote stream unavailable', error);
        },
      );
    return () => {
      disposed = true;
      uninstall?.();
    };
  }, 'botharness: live streams on the native Remote stream carrier');
  ctx.effect(
    () => mountActivityLive(store, undefined, (signal) => loadActivitySnapshot(call, signal)),
    'botharness: PersonaBot activity subscription',
  );
  ctx.effect(() => {
    store.setConfig(loadRosterConfig(storage));
    const controller = new AbortController();
    void actions.load(controller.signal).then(async () => {
      if (controller.signal.aborted) return;
      const outcome = await migrateLegacyRoster({
        storage,
        call,
        remapSortModes: (mapping) => prefs.remapSectionSortModes(mapping),
      });
      if (outcome === 'migrated') await actions.refreshRoster(controller.signal);
      if (controller.signal.aborted) return;
      await actions.ensureChannelPins();
      if (controller.signal.aborted) return;
      await actions.ensureFlatTopOrder();
    });
    return () => {
      controller.abort();
    };
  }, 'botharness: roster load');
  ctx.effect(() => {
    let stopped = false;
    const report = (): void => {
      if (stopped) return;
      void call('developerModeSet', {
        enabled: prefs.source.getSnapshot().developerMode,
      }).catch(() => undefined);
    };
    report();
    const unsubscribe = prefs.source.subscribe(report);
    return () => {
      stopped = true;
      unsubscribe();
    };
  }, 'botharness: developer mode report');

  ctx.inject(['configForms'], (settingsCtx) => {
    const scope = settingsCtx.configForms.get<BotModeSettings>(BOT_MODE_NAMESPACE);
    prefs.attach({
      getSnapshot: () => ({ ...scope.getSnapshot(), mode: 'host' }),
      subscribe: (listener) => scope.subscribe(listener),
      set: (field, value) => scope.set(field, value),
      mutate: (ops, expectedRevision) => scope.mutate(ops, expectedRevision),
    });
    const releaseNavIcon = installBotNavIcon({
      labels: () => [t('settings.nav')],
      markup: () => botIconMarkup(prefs.source.getSnapshot().botIcon, readBotColorScheme()),
      subscribe: (listener) => {
        const offPrefs = prefs.source.subscribe(listener);
        const offScheme = subscribeBotColorScheme(listener);
        return () => {
          offPrefs();
          offScheme();
        };
      },
    });
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.account,
          order: -5,
          label: () => t('botSettings.section.account'),
          locale: LOCALE_NS,
          inject: () => ({
            actions,
            startSignIn: startConnectSignIn,
          }),
        },
        AccountSection,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.general,
          order: 0,
          label: () => t('botSettings.section.general'),
          locale: LOCALE_NS,
          inject: () => ({
            actions,
            closeBotSettings: botSettings.close,
            zoomSurface: zoom.surface,
          }),
        },
        GeneralSection,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.appearance,
          order: 5,
          label: () => t('botSettings.section.appearance'),
          locale: LOCALE_NS,
          children: { 'botharness.settings.layout': { kind: 'list', scope: 'root' } },
          inject: () => ({
            ...botModePrefsFace(prefs),
            appearance,
            wallpaper,
            localeSource: {
              getSnapshot: () => ctx.locale.getSnapshot(),
              subscribe: (listener: () => void) => ctx.locale.subscribe(listener),
              setLocale: (value: string) => ctx.locale.setLocale(value),
            },
          }),
        },
        AppearanceSection,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.notifications,
          order: 21,
          label: () => t('botSettings.section.notifications'),
          locale: LOCALE_NS,
          inject: () => ({ desktopNotifications }),
        },
        DesktopNotificationSetting,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.shortcuts,
          order: 22,
          label: () => t('shortcuts.title'),
          locale: LOCALE_NS,
          inject: () => ({
            ...botModePrefsFace(prefs),
            shortcutBindings,
            shortcuts: ctx.shortcuts,
          }),
        },
        KeyboardSettings,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.models,
          order: 10,
          label: () => t('botSettings.section.models'),
          locale: LOCALE_NS,
          inject: () => ({ ...botModePrefsFace(prefs), actions, call }),
        },
        ModelsSection,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.autoApproval,
          order: 15,
          label: () => t('botSettings.section.autoApproval'),
          locale: LOCALE_NS,
          inject: () => ({ actions, call, store }),
        },
        AutoApprovalSection,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.prompts,
          order: 16,
          label: () => t('botSettings.section.prompts'),
          locale: LOCALE_NS,
          inject: () => ({ actions }),
        },
        PromptsSection,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.voice,
          order: 17,
          label: () => t('botSettings.section.voice'),
          locale: LOCALE_NS,
          inject: () => ({ actions }),
        },
        VoiceSection,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.conceptArt,
          order: 18,
          label: () => t('botSettings.section.conceptArt'),
          locale: LOCALE_NS,
          inject: () => ({ call }),
        },
        ConceptArtSection,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.messaging,
          order: 20,
          label: () => t('botSettings.section.messaging'),
          locale: LOCALE_NS,
          inject: () => ({
            ...botModePrefsFace(prefs),
            call,
            store,
            onSaved: () => actions.refreshRoster(),
          }),
        },
        MessagingSection,
      ),
    );
    const imApps = createImApps({ call, botSettings, actions });
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.imApps,
          order: 25,
          label: () => t('botSettings.section.imApps'),
          locale: LOCALE_NS,
          inject: () => ({ imApps, store }),
        },
        ImAppsSection,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.companions,
          order: 40,
          label: () => t('botSettings.section.companions'),
          locale: LOCALE_NS,
          inject: () => ({ companion }),
        },
        CompanionsSection,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.devices,
          order: 45,
          label: () => t('botSettings.section.devices'),
          locale: LOCALE_NS,
          inject: () => ({}),
        },
        DevicesSection,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.dataPrivacy,
          order: 50,
          label: () => t('botSettings.section.dataPrivacy'),
          locale: LOCALE_NS,
          inject: () => ({ call }),
        },
        DataPrivacySection,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.advanced,
          order: 60,
          label: () => t('botSettings.section.advanced'),
          locale: LOCALE_NS,
          inject: () => ({ ...botModePrefsFace(prefs), call }),
        },
        AdvancedSection,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.plugins,
          order: 65,
          label: () => t('botSettings.section.plugins'),
          locale: LOCALE_NS,
          inject: () => ({ call }),
        },
        PluginsSection,
      ),
    );
    settingsCtx.slots.inject('botharness.settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'botharness.settings.section',
          id: BOT_SETTINGS_SECTIONS.about,
          order: 70,
          label: () => t('botSettings.section.about'),
          locale: LOCALE_NS,
          inject: () => ({ releaseNotes }),
        },
        AboutSection,
      ),
    );
    settingsCtx.slots.inject('settings.section', () =>
      settingsCtx.slots.register(
        {
          name: 'settings.section',
          id: 'botharness',
          order: 25,
          label: () => t('settings.nav'),
          locale: LOCALE_NS,
          inject: () => ({ openBotSettings: (sectionId?: string) => botSettings.open(sectionId) }),
        },
        DshBotSettingsItem,
      ),
    );
    return () => {
      releaseNavIcon();
      prefs.detach();
    };
  });

  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register(
      {
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 10,
        label: () => t('panel.label'),
        locale: LOCALE_NS,
        inject: () => ({
          ...botModePrefsFace(prefs),
          openSettings: () => {
            botSettings.open();
          },
        }),
      },
      createBotPanelEntry(
        () => {
          ctx.layout.selectPanel(null);
        },
        () => {
          ctx.layout.selectPanel(PANEL_ID);
          void actions.openActivityCenter();
        },
        () => actions.refreshHumanInboxStatus(),
        {
          launcher: (translate) =>
            createElement(OnboardingLauncher, { actions, t: translate, placement: 'row' }),
          enterHint: (translate) => createElement(OnboardingEnterHint, { t: translate }),
        },
      ),
    ),
  );

  ctx.slots.inject('main', () => {
    const dispose = ctx.slots.register(
      {
        name: 'main',
        key: PANEL_ID,
        locale: LOCALE_NS,
        inject: () => ({
          actions,
          companion,
          channelSidebar,
          dockPanels,
          profileCards,
          appearance,
          wallpaper,
          nativeChatT,
          nativeSessions,
          prefs,
          releaseNotes,
          telemetryNotice,
          workspace,
          ...botModePrefsFace(prefs),
          exitBotMode: () => ctx.layout.selectPanel(null),
          openBotSettings: (sectionId?: string) => botSettings.open(sectionId),
          quickSwitcherSettings,
        }),
      },
      MobileBotPanel,
    );
    if (restoreBotMode) {
      restoreBotMode = false;
      queueMicrotask(() => {
        const info = panelInfoOf(ctx.layout);
        if (info === undefined || info.getSnapshot().activePanelId !== null) return;
        try {
          ctx.layout.selectPanel(PANEL_ID);
        } catch (error) {
          ctx.logger.warn('botharness: failed to restore Bot mode', error);
        }
      });
    }
    return dispose;
  });

  const resolveSessionOwner = (sessionId: string, signal: AbortSignal) =>
    loadSessionBotOwner(call, sessionId, signal);
  const returnToBot = async (slug: string): Promise<void> => {
    if (!store.getSnapshot().bots.some((bot) => bot.slug === slug)) await actions.load();
    if (!store.getSnapshot().bots.some((bot) => bot.slug === slug))
      throw new Error('PersonaBot is unavailable');
    ctx.layout.selectPanel(PANEL_ID);
    await actions.openBot(slug);
  };
  ctx.slots.inject('conversation.session.header.actions', () =>
    ctx.slots.register(
      {
        name: 'conversation.session.header.actions',
        id: 'botharness-return-to-bot',
        order: 15,
        label: () => t('sessions.return.label'),
        locale: LOCALE_NS,
        inject: () => ({ resolveOwner: resolveSessionOwner, returnToBot }),
      },
      SessionReturnAction,
    ),
  );
  ctx.slots.inject('sidebar.session.row.leading', () =>
    ctx.slots.register(
      {
        name: 'sidebar.session.row.leading',
        id: 'botharness-session-owner-avatar',
        order: 20,
        locale: LOCALE_NS,
        inject: () => ({ resolveOwner: resolveSessionOwner }),
      },
      SessionOwnerLeading,
    ),
  );
  ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
    ctx.slots.register(
      {
        name: 'sidebar.workspaces.session.menu.item',
        id: 'botharness-return-to-bot-menu',
        order: 500,
        label: () => t('sessions.return.label'),
        locale: LOCALE_NS,
        inject: () => ({ resolveOwner: resolveSessionOwner, returnToBot }),
      },
      SessionReturnMenuItem,
    ),
  );

  ctx.effect(() => () => nativeSettingsNavigation.close());
  registerModeShadow(
    ctx,
    'sidebar',
    () =>
      ctx.slots.register(
        {
          name: 'sidebar',
          priority: -1,
          locale: LOCALE_NS,
          inject: () => ({
            actions,
            companion,
            channelSidebar,
            dockPanels,
            shortcutBindings,
            ...botModePrefsFace(prefs),
            exitBotMode: () => ctx.layout.selectPanel(null),
            toggleSidebar: () => ctx.layout.toggleSidebar(),
            openBotSettings: (sectionId?: string) => botSettings.open(sectionId),
            quickSwitcherSettings,
          }),
        },
        BotModeSidebar,
      ),
    store,
    {
      enabled: () => botModeSidebarViewport() && !nativeSettingsNavigation.getSnapshot(),
      subscribe: (listener) => {
        const viewport = subscribeBotModeSidebarViewport(listener);
        const navigation = nativeSettingsNavigation.subscribe(listener);
        return () => {
          viewport();
          navigation();
        };
      },
    },
  );
  registerModeShadow(
    ctx,
    'sidebar.workspaces',
    () =>
      ctx.slots.register(
        {
          name: 'sidebar.workspaces',
          priority: -100,
          locale: LOCALE_NS,
          inject: () => ({
            actions,
            companion,
            channelSidebar,
            shortcutBindings,
            ...botModePrefsFace(prefs),
          }),
        },
        BotSidebar,
      ),
    store,
    {
      enabled: () => !mobileBotViewport(),
      subscribe: subscribeMobileBotViewport,
    },
  );
  registerModeShadow(
    ctx,
    'main',
    () =>
      ctx.slots.register(
        {
          name: 'main',
          key: 'conversation' as MainPanelId,
          priority: -100,
          inject: () => ({
            actions,
            companion,
            channelSidebar,
            dockPanels,
            profileCards,
            appearance,
            nativeChatT,
            nativeSessions,
            prefs,
            workspace,
          }),
        },
        BotMain,
      ),
    store,
  );

  const mention: InputTriggerSource = {
    trigger: '@',
    name: 'personabot',
    candidates: async (_session, request) => {
      const result = await call('list', { query: request.query }, request.signal);
      if (!result.ok) return [];
      const value = result.value as { bots?: readonly { slug?: unknown; displayName?: unknown }[] };
      return (value.bots ?? []).flatMap((bot) =>
        typeof bot.slug === 'string' && bot.slug.length > 0
          ? [
              {
                name: bot.slug,
                ...(typeof bot.displayName === 'string' ? { description: bot.displayName } : {}),
              },
            ]
          : [],
      );
    },
    codec: {
      clipboardText: (ref) => `@${ref}`,
      serialize: async (ref) => sessionBotReference(ref),
    },
    onPick: (pick) => ({
      insert: {
        source: 'personabot',
        ref: pick.candidate.name,
        label: pick.candidate.description ?? pick.candidate.name,
        clipboardText: `@${pick.candidate.name}`,
      },
    }),
  };
  ctx.effect(() => ctx.inputTriggers.registerSource(mention), 'botharness: @ mention');

  const viewToRestore =
    hmrView ?? (lastView?.mode === 'bot' ? { selection: lastView.selection } : undefined);
  const privateLocator =
    typeof window === 'undefined' ? undefined : privateInputLocator(window.location.hash);
  if (privateLocator !== undefined) {
    ctx.effect(
      () =>
        watchPrivateInputNavigation(store, privateLocator, (channelId, messageId) => {
          expectMobileConversation();
          ctx.layout.selectPanel(PANEL_ID);
          void actions.openChannelAtMessage(channelId, messageId).catch(() => {
            ctx.logger.warn('botharness: private input card locator unavailable');
          });
        }),
      'botharness: private input Chat locator',
    );
  }
  const landing =
    typeof window === 'undefined' || privateLocator !== undefined
      ? undefined
      : fullClientLocator(window.location.hash);
  if (landing !== undefined) {
    ctx.effect(
      () =>
        watchFullClientLanding(store, landing, (target) => {
          if (target.kind === 'new-bot' || target.kind === 'new-channel') {
            ctx.layout.selectPanel(PANEL_ID);
            requestCreation(target.kind === 'new-bot' ? 'bot' : 'channel');
            return;
          }
          if (target.kind !== 'home') expectMobileConversation();
          ctx.layout.selectPanel(PANEL_ID);
          if (target.kind === 'home') return;
          const opening =
            target.kind === 'dm'
              ? actions.openBot(target.slug)
              : actions.openChannel(target.channelId);
          void opening.catch(() => {
            ctx.logger.warn('botharness: full-client landing conversation unavailable');
          });
        }),
      'botharness: full-client landing',
    );
  }
  if (privateLocator === undefined && landing === undefined && viewToRestore !== undefined) {
    ctx.effect(() => {
      let restored = false;
      const restore = (): void => {
        if (restored || store.getSnapshot().status !== 'ready') return;
        restored = true;
        unsubscribe();
        try {
          if (hmrView !== undefined) ctx.layout.selectPanel(PANEL_ID);
          const info = panelInfoOf(ctx.layout);
          if (info === undefined || info.getSnapshot().activePanelId !== PANEL_ID) return;
          const selection = viewToRestore.selection;
          const snapshot = store.getSnapshot();
          const opening =
            selection?.kind === 'bot' && snapshot.bots.some((bot) => bot.slug === selection.slug)
              ? actions.openBot(selection.slug)
              : selection?.kind === 'channel' &&
                  snapshot.channels.some((channel) => channel.id === selection.channelId)
                ? actions.openChannel(selection.channelId)
                : selection?.kind === 'inbox'
                  ? actions.openActivityCenter()
                  : undefined;
          void opening?.catch((error: unknown) => {
            ctx.logger.warn('botharness: Bot view restore failed', error);
          });
        } catch (error) {
          ctx.logger.warn('botharness: Bot view restore failed', error);
        }
      };
      const unsubscribe = store.subscribe(restore);
      restore();
      return unsubscribe;
    }, 'botharness: Bot view restore');
  }
  ctx.effect(() => {
    const info = panelInfoOf(ctx.layout);
    if (info === undefined) return () => {};
    let enteredBotMode = false;
    let lastWritten: string | undefined;
    const persist = (): void => {
      const active = info.getSnapshot().activePanelId === PANEL_ID;
      if (active) enteredBotMode = true;
      if (!enteredBotMode) return;
      const view = {
        mode: active ? 'bot' : 'dsh',
        selection: store.getSnapshot().selection,
      } as const;
      const serialized = JSON.stringify(view);
      if (serialized === lastWritten) return;
      lastWritten = serialized;
      writeLastView(storage, view);
    };
    const unsubscribePanel = info.subscribe(persist);
    const unsubscribeStore = store.subscribe(() => {
      if (info.getSnapshot().activePanelId === PANEL_ID) persist();
    });
    persist();
    return () => {
      unsubscribePanel();
      unsubscribeStore();
    };
  }, 'botharness: last visible view');
  ctx.effect(
    () => () => {
      if (typeof window === 'undefined') return;
      const info = panelInfoOf(ctx.layout);
      if (info === undefined || info.getSnapshot().activePanelId !== PANEL_ID) return;
      saveHmrView(window as unknown as Record<string, unknown>, store.getSnapshot().selection);
    },
    'botharness: HMR view handoff',
  );
}
