import { createElement } from 'react';
import type { ComponentType } from 'react';
import type {
  DockPanel as PublicDockPanel,
  DockPanelChannel,
  DockPanelProps,
  DockPanelInstance,
  DockPanelRegistry as PublicDockPanelRegistry,
} from '../panel-api.js';
export type { DockPanelChannel, DockPanelProps, DockPanelInstance } from '../panel-api.js';

import type { ChannelSidebarEntry } from './channel-sidebar.js';

export const BOT_ONLY_CHANNEL_PANELS: readonly string[] = [
  'botharness-browser',
  'botharness-computer',
  'memory-files',
  'memory-evolution',
  'schedules',
  'concept-art',
];

export const ACTIVITY_CENTER_PANEL = 'activity-center';

export type DockPanelScope = 'global' | 'channel';

export interface DockPanelPosition {
  readonly zone: 'left' | 'center' | 'right' | 'bottom';
  readonly relativeTo?: string | undefined;
}

export type DockPanel = PublicDockPanel;

export interface DockPanelRegistration extends DockPanel {
  readonly entry?: ChannelSidebarEntry | undefined;
}

export interface DockPanelLayout {
  canOpen?(id: string): boolean;
  open(id: string): void;
  close(id: string): void;
}

export interface DockPanelRegistry extends PublicDockPanelRegistry {
  register(panel: DockPanel): () => void;
  panels(): readonly DockPanelRegistration[];
}

export interface DockPanelHost extends DockPanelRegistry {
  registerEntry(entry: ChannelSidebarEntry, defaultPosition?: DockPanelPosition): () => void;
  attach(layout: DockPanelLayout): () => void;
  reportOpen(ids: readonly string[]): void;
}

const NO_IDS: readonly string[] = [];

function compare(left: DockPanelRegistration, right: DockPanelRegistration): number {
  return (left.order ?? 0) - (right.order ?? 0) || left.id.localeCompare(right.id);
}

export function dockPanelsFromEntries(
  entries: readonly ChannelSidebarEntry[],
): readonly DockPanelRegistration[] {
  const registry = createDockPanelRegistry();
  for (const entry of entries) registry.registerEntry(entry);
  return registry.panels();
}

export function createDockPanelRegistry(
  options: {
    instances?: readonly DockPanelInstance[];
    saveInstances?(instances: readonly DockPanelInstance[]): void;
  } = {},
): DockPanelHost {
  const ids = new Set<string>();
  let instances = (options.instances ?? [])
    .filter((item) => {
      if (
        !/^instance:[a-zA-Z0-9-]{1,128}$/.test(item.id) ||
        ids.has(item.id) ||
        !item.botId.trim() ||
        item.botId.length > 160 ||
        !item.label.trim() ||
        item.label.length > 160 ||
        !/^[a-zA-Z0-9:@._-]{1,160}$/.test(item.definitionId)
      )
        return false;
      ids.add(item.id);
      return true;
    })
    .slice(0, 16);
  let consumerFailures = 0;
  const registrations = new Map<string, DockPanelRegistration>();
  const listeners = new Set<() => void>();
  let ordered: readonly DockPanelRegistration[] = [];
  let open: readonly string[] = NO_IDS;
  let layout: DockPanelLayout | undefined;

  const notify = (): void => {
    for (const listener of listeners) {
      try {
        Promise.resolve(listener()).catch(() => {
          if (consumerFailures++ < 5) console.warn('botharness panels: consumer_failed');
        });
      } catch {
        if (consumerFailures++ < 5) console.warn('botharness panels: consumer_failed');
      }
    }
  };

  const add = (registration: DockPanelRegistration): (() => void) => {
    if (registrations.has(registration.id))
      throw new Error(`duplicate Dock panel: ${registration.id}`);
    registrations.set(registration.id, registration);
    ordered = [...registrations.values()].sort(compare);
    notify();
    return () => {
      if (registrations.get(registration.id) !== registration) return;
      registrations.delete(registration.id);
      ordered = [...registrations.values()].sort(compare);
      notify();
    };
  };

  const instancePanel = (
    definition: DockPanelRegistration,
    instance: DockPanelInstance,
  ): DockPanelRegistration => ({
    ...definition,
    id: instance.id,
    scope: 'global',
    binding: undefined,
    title: definition.title + ' · ' + instance.label,
    component: (props) =>
      createElement(definition.component, {
        ...props,
        botId: instance.botId,
        instanceId: instance.id,
      }),
    headerAction:
      definition.headerAction &&
      ((props) =>
        createElement(definition.headerAction!, {
          ...props,
          botId: instance.botId,
          instanceId: instance.id,
        })),
  });
  const registry: DockPanelHost = {
    instances: () => instances,
    createInstance(definitionId, botId, label) {
      const definition = registrations.get(definitionId);
      if (!definition || definition.binding !== 'current-bot')
        throw new Error('panel_definition_unavailable');
      if (!botId.trim() || botId.length > 160 || !label.trim() || label.length > 160)
        throw new Error('invalid_bot_binding');
      if (instances.length >= 16) throw new Error('panel_instance_limit');
      const instance = { id: 'instance:' + crypto.randomUUID(), definitionId, botId, label };
      const next = [...instances, instance];
      options.saveInstances?.(next);
      instances = next;
      add(instancePanel(definition, instance));
      registry.open(instance.id);
      return instance.id;
    },
    removeInstance(id) {
      if (!instances.some((instance) => instance.id === id)) return;
      const next = instances.filter((instance) => instance.id !== id);
      options.saveInstances?.(next);
      instances = next;
      registry.close(id);
      registrations.delete(id);
      ordered = [...registrations.values()].sort(compare);
      notify();
    },
    register(panel) {
      if (!/^[a-zA-Z0-9:@._-]{1,160}$/.test(panel.id) || panel.id.startsWith('instance:'))
        throw new Error('invalid_panel_definition');
      const off = add({ ...panel, entry: undefined });
      const childOffs = instances
        .filter((item) => item.definitionId === panel.id)
        .map((item) => add(instancePanel(panel, item)));
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        for (const cleanup of childOffs) cleanup();
        for (const item of instances.filter((i) => i.definitionId === panel.id))
          registrations.delete(item.id);
        off();
      };
    },
    registerEntry: (entry, defaultPosition) =>
      add({
        id: entry.id,
        title: entry.label,
        icon: entry.icon,
        scope: 'channel',
        defaultPosition,
        order: entry.order,
        component: () => null,
        entry,
      }),
    panels: () => ordered,
    openPanels: () => open,
    available: () => layout !== undefined,
    canOpen: (id) => layout?.canOpen?.(id) ?? true,
    isOpen: (id) => open.includes(id),
    open: (id) => layout?.open(id),
    close: (id) => layout?.close(id),
    toggle: (id) => (open.includes(id) ? registry.close(id) : registry.open(id)),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    attach(next) {
      layout = next;
      notify();
      return () => {
        if (layout !== next) return;
        layout = undefined;
        open = NO_IDS;
        notify();
      };
    },
    reportOpen(ids) {
      if (ids.length === open.length && ids.every((id, index) => open[index] === id)) return;
      open = ids.length === 0 ? NO_IDS : [...ids];
      notify();
    },
  };
  return registry;
}
