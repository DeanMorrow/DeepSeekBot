import { SettingsSearch, searchSettings } from './settings-search.js';
import { useMountedResource } from './mounted-resource.js';
import { useState, useSyncExternalStore, type ReactElement, type ReactNode } from 'react';

import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots';

import type {} from './bot-settings-slot.js';
import { ChannelSidebarIcon } from './channel-sidebar-icon.js';
import { SettingsDialog } from './ds/settings-dialog.js';
import type { BotHarnessTranslate } from './locale.js';

export const BOT_SETTINGS_SECTIONS = {
  account: 'account',
  general: 'general',
  appearance: 'appearance',
  notifications: 'notifications',
  shortcuts: 'shortcuts',
  models: 'models',
  messaging: 'messaging',
  autoApproval: 'auto-approval',
  prompts: 'prompts',
  voice: 'voice',
  imApps: 'im-apps',
  companions: 'companions',
  devices: 'devices',
  dataPrivacy: 'data-privacy',
  advanced: 'advanced',
  plugins: 'plugins',
  about: 'about',
  conceptArt: 'concept-art',
} as const;

export const BOT_SETTINGS_DEFAULT_SECTION = BOT_SETTINGS_SECTIONS.general;

const SECTION_ICONS: Readonly<Record<string, string>> = {
  [BOT_SETTINGS_SECTIONS.account]: 'user',
  [BOT_SETTINGS_SECTIONS.general]: 'settings',
  [BOT_SETTINGS_SECTIONS.appearance]: 'palette',
  [BOT_SETTINGS_SECTIONS.models]: 'cpu',
  [BOT_SETTINGS_SECTIONS.autoApproval]: 'shield-check',
  [BOT_SETTINGS_SECTIONS.prompts]: 'file-text',
  [BOT_SETTINGS_SECTIONS.voice]: 'audio-lines',
  [BOT_SETTINGS_SECTIONS.messaging]: 'message-square',
  [BOT_SETTINGS_SECTIONS.notifications]: 'bell',
  [BOT_SETTINGS_SECTIONS.shortcuts]: 'keyboard',
  [BOT_SETTINGS_SECTIONS.imApps]: 'plug',
  computer: 'monitor',
  browser: 'globe',
  [BOT_SETTINGS_SECTIONS.companions]: 'bot',
  [BOT_SETTINGS_SECTIONS.devices]: 'smartphone',
  [BOT_SETTINGS_SECTIONS.dataPrivacy]: 'lock',
  [BOT_SETTINGS_SECTIONS.advanced]: 'sliders-horizontal',
  [BOT_SETTINGS_SECTIONS.plugins]: 'puzzle',
  [BOT_SETTINGS_SECTIONS.about]: 'info',
  [BOT_SETTINGS_SECTIONS.conceptArt]: 'flask-conical',
};

export function botSettingsSectionIcon(id: string): string {
  return Object.hasOwn(SECTION_ICONS, id) ? SECTION_ICONS[id]! : 'settings-2';
}

const SECTION_SLOT = 'botharness.settings.section';

export interface BotSettingsSectionRow {
  readonly id: string;
  readonly order: number;
  readonly label: string;
  readonly layoutAvailable?: boolean;
}

export interface BotSettingsTarget {
  readonly title: string;
  readonly nonce: number;
}

export interface BotSettingsSnapshot {
  readonly open: boolean;
  readonly sectionId: string | undefined;
  readonly target?: BotSettingsTarget | undefined;
}

export interface BotSettingsSectionSource {
  getSnapshot(): readonly BotSettingsSectionRow[];
  subscribe(listener: () => void): () => void;
}

export class BotSettings {
  #snapshot: BotSettingsSnapshot = { open: false, sectionId: undefined };
  readonly #listeners = new Set<() => void>();

  readonly getSnapshot = (): BotSettingsSnapshot => this.#snapshot;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  readonly open = (sectionId?: string, target?: string): void => {
    this.#set({
      open: true,
      sectionId:
        sectionId === 'connect'
          ? BOT_SETTINGS_SECTIONS.devices
          : (sectionId ?? this.#snapshot.sectionId),
      target: this.#target(target),
    });
  };

  readonly select = (sectionId: string, target?: string): void => {
    this.#set({ ...this.#snapshot, sectionId, target: this.#target(target) });
  };

  readonly close = (): void => {
    this.#set({ ...this.#snapshot, open: false, target: undefined });
  };

  #target(title: string | undefined): BotSettingsTarget | undefined {
    return title === undefined ? undefined : { title, nonce: Date.now() };
  }

  #set(next: BotSettingsSnapshot): void {
    if (
      next.open === this.#snapshot.open &&
      next.sectionId === this.#snapshot.sectionId &&
      next.target === this.#snapshot.target
    )
      return;
    this.#snapshot = next;
    for (const listener of this.#listeners) listener();
  }
}

export type BotSettingsViewProps = PropsRenderSlots<'botharness.settings.section'> & {
  botSettings: BotSettings;
  sections: BotSettingsSectionSource;
  t: BotHarnessTranslate;
};

export function BotSettingsView({
  botSettings,
  sections,
  renderSlot,
  t,
}: BotSettingsViewProps): ReactElement | null {
  const state = useSyncExternalStore(botSettings.subscribe, botSettings.getSnapshot);
  const registered = useSyncExternalStore(sections.subscribe, sections.getSnapshot);
  const [query, setQuery] = useState('');
  const target = state.target;
  const locate = useMountedResource<HTMLDivElement>(
    (root) => {
      for (const item of root.querySelectorAll('[data-settings-highlight]'))
        item.removeAttribute('data-settings-highlight');
      if (!target) {
        root.parentElement?.scrollTo?.(0, 0);
        return;
      }
      let found = false;
      const find = () => {
        if (found) return;
        const titleOf = (item: HTMLElement): string | undefined => {
          if (item.dataset.settingsTitle !== undefined) return item.dataset.settingsTitle;
          const label = item.getAttribute('aria-labelledby');
          if (label) return document.getElementById(label)?.textContent ?? undefined;
          return item.tagName === 'H3' ? (item.textContent ?? undefined) : undefined;
        };
        const node = [
          ...root.querySelectorAll<HTMLElement>(
            '[role="group"], section, h3, [data-settings-title]',
          ),
        ].find((item) => titleOf(item)?.trim() === target.title);
        if (!node) return;
        found = true;
        node.scrollIntoView?.({ block: 'center' });
        node.setAttribute('data-settings-highlight', '');
        node.tabIndex = -1;
        node.focus({ preventScroll: true });
      };
      const observer = new MutationObserver(find);
      observer.observe(root, { childList: true, subtree: true });
      find();
      return () => observer.disconnect();
    },
    [state.sectionId, target],
  );
  if (!state.open) return null;
  const rows = [...registered].sort((a, b) => a.order - b.order);
  const active =
    rows.find((row) => row.id === state.sectionId) ??
    rows.find((row) => row.id === BOT_SETTINGS_DEFAULT_SECTION) ??
    rows[0];
  const close = (): void => {
    setQuery('');
    botSettings.close();
  };
  return (
    <SettingsDialog
      title={t('settings.nav')}
      navTitle={t('settings.nav')}
      sections={rows.map((row) => ({
        ...row,
        icon: <ChannelSidebarIcon name={botSettingsSectionIcon(row.id)} />,
      }))}
      activeId={active?.id}
      navigationSearch={<SettingsSearch query={query} onChange={setQuery} t={t} />}
      navigationResults={
        query.trim() ? (
          <div className="bh-settings-search-results" aria-label={t('settings.results')}>
            {searchSettings(rows, query, t).length ? (
              searchSettings(rows, query, t).map((result) => (
                <button
                  type="button"
                  key={`${result.section}:${result.title}`}
                  onClick={() => {
                    botSettings.select(result.section, result.target);
                    setQuery('');
                  }}
                >
                  <span>{result.title}</span>
                  <small>{result.page}</small>
                </button>
              ))
            ) : (
              <p role="status">{t('settings.noResults')}</p>
            )}
          </div>
        ) : undefined
      }
      onSelect={(id) => {
        setQuery('');
        botSettings.select(id);
      }}
      onClose={close}
      labels={{
        nav: t('botSettings.nav'),
        close: t('common.close'),
        picker: (section) => t('botSettings.picker', { section }),
      }}
    >
      <div ref={locate} data-settings-content={active?.id}>
        {active === undefined
          ? null
          : (renderSlot(SECTION_SLOT, { close }, { only: active.id }) as unknown as ReactNode)}
      </div>
    </SettingsDialog>
  );
}

interface SectionLedger {
  slots: {
    entries(key: string): readonly {
      options: {
        id?: string;
        order?: number;
        label?: string | (() => string);
      };
    }[];
    getVersion(key: string): number;
    subscribe(key: string, listener: () => void): () => void;
  };
  locale: {
    getSnapshot(): { revision: number };
    subscribe(listener: () => void): () => void;
  };
}

export function botSettingsSectionSource(ctx: SectionLedger): BotSettingsSectionSource {
  let version = -1;
  let layoutVersion = -1;
  let revision = -1;
  let rows: readonly BotSettingsSectionRow[] = [];
  return {
    getSnapshot: () => {
      const nextVersion = ctx.slots.getVersion(SECTION_SLOT);
      const nextRevision = ctx.locale.getSnapshot().revision;
      const nextLayoutVersion = ctx.slots.getVersion('botharness.settings.layout');
      if (
        nextVersion !== version ||
        nextRevision !== revision ||
        nextLayoutVersion !== layoutVersion
      ) {
        version = nextVersion;
        layoutVersion = nextLayoutVersion;
        revision = nextRevision;
        rows = ctx.slots.entries(SECTION_SLOT).map(({ options }) => ({
          id: options.id ?? '',
          layoutAvailable: ctx.slots.entries('botharness.settings.layout').length > 0,
          order: options.order ?? 0,
          label: typeof options.label === 'function' ? options.label() : (options.label ?? ''),
        }));
      }
      return rows;
    },
    subscribe: (listener) => {
      const offLedger = ctx.slots.subscribe(SECTION_SLOT, listener);
      const offLocale = ctx.locale.subscribe(listener);
      const offLayout = ctx.slots.subscribe('botharness.settings.layout', listener);
      return () => {
        offLedger();
        offLocale();
        offLayout();
      };
    },
  };
}
