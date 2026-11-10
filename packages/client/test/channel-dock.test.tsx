// @vitest-environment jsdom
import { act, createElement, useState, type ContextType, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LAYOUT_MODE_STORAGE_KEY } from '../src/client/layout-mode.js';

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({
  MarkdownText: ({ text }: { text: string }) => createElement('span', null, text),
  IconChevronDownOutlineRegular: () => null,
  Tooltip: ({ children }: { children: ReactNode }) => children,
  Menu: ({
    open,
    anchor,
    items,
    onSelect,
  }: {
    open: boolean;
    anchor: ReactNode;
    items: { id: string; label?: ReactNode; type?: string }[];
    onSelect(id: string): void;
  }) =>
    createElement(
      'div',
      null,
      anchor,
      open
        ? items
            .filter((item) => item.type === undefined)
            .map((item) =>
              createElement(
                'button',
                { key: item.id, 'data-menu-item': item.id, onClick: () => onSelect(item.id) },
                item.label,
              ),
            )
        : null,
    ),
}));

import { ChannelDock } from '../src/client/channel-dock.js';
import {
  CHANNEL_BODY_PANEL,
  CHANNEL_DOCK_STORAGE_KEY,
  readChannelDock,
} from '../src/client/channel-dock-layout.js';
import type {
  ChannelSidebarEntry,
  ChannelSidebarEntryProps,
} from '../src/client/channel-sidebar.js';
import { zhTranslate } from '../src/client/locale.js';
import {
  createDockPanelRegistry,
  dockPanelsFromEntries,
  type DockPanel,
  type DockPanelChannel,
  type DockPanelHost,
  type DockPanelRegistration,
} from '../src/client/dock-panels.js';

const GLOBAL_PANEL = 'market';
const entry = (id: string, scope: ChannelSidebarEntry['scope'] = 'personabot') =>
  ({
    id,
    label: id,
    scope,
    component: () => createElement('div', { 'data-body': id }, `body-${id}`),
  }) satisfies ChannelSidebarEntry;

const entryProps = {
  scope: 'personabot',
  channelId: 'dm-ada',
  botSlug: 'ada',
  actions: {},
  t: zhTranslate,
} as unknown as ChannelSidebarEntryProps;

let root: Root;
let host: HTMLDivElement;
let values: Map<string, string>;
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => void values.set(key, value),
  removeItem: (key: string) => void values.delete(key),
};

async function render(
  entries: readonly ChannelSidebarEntry[] | readonly DockPanelRegistration[],
  scope = 'personabot',
  options: { channel?: DockPanelChannel; registry?: DockPanelHost } = {},
) {
  const panels = entries.every((item) => 'title' in item)
    ? (entries as readonly DockPanelRegistration[])
    : dockPanelsFromEntries(entries as readonly ChannelSidebarEntry[]);
  act(() =>
    root.render(
      createElement(ChannelDock, {
        body: createElement('section', { className: 'bh-chat-pane' }, 'channel body'),
        panels,
        channel: options.channel,
        registry: options.registry,
        entryProps,
        shows: (candidate: ChannelSidebarEntry) => candidate.scope === scope,
        t: zhTranslate,
        storage,
      }),
    ),
  );
  await settle();
}

const panels = () => readChannelDock(storage)!.layout.panels;

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function click(selector: string): Promise<void> {
  act(() => host.querySelector<HTMLButtonElement>(selector)!.click());
  await settle();
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal('PointerEvent', class extends MouseEvent {});
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  values = new Map([[LAYOUT_MODE_STORAGE_KEY, JSON.stringify({ mode: 'advanced' })]]);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe('desktop Bot mode dock', () => {
  const builtins = [
    entry('sessions'),
    entry('bot-inbox'),
    entry('schedules'),
    entry('members', 'channel'),
  ];

  it('opens the Channel body with Sessions and keeps Bot Inbox out of the Dock', async () => {
    await render(builtins);
    expect(host.textContent).toContain('channel body');
    expect(host.querySelector('[data-body="sessions"]')).not.toBeNull();
    expect(host.querySelector('[data-body="bot-inbox"]')).toBeNull();
    expect(host.querySelector('[data-body="schedules"]')).toBeNull();
    expect(Object.keys(panels())).toEqual([CHANNEL_BODY_PANEL, 'sessions']);
    expect(
      JSON.stringify(readChannelDock(storage)!.layout.grid, (key, value) =>
        key === 'size' ? undefined : value,
      ),
    ).not.toContain('bot-inbox');
    expect(host.querySelector('[data-dock-close="sessions"]')).not.toBeNull();
    expect(host.querySelector(`[data-dock-close="${CHANNEL_BODY_PANEL}"]`)).toBeNull();
    expect(host.querySelector('[data-dock-float]')).toBeNull();
  });

  it('shows an empty state for a panel the active Channel has nothing for', async () => {
    await render(builtins, 'channel');
    expect(host.querySelector('[data-body="sessions"]')).toBeNull();
    expect(host.querySelectorAll('[data-panel-empty]')).toHaveLength(1);
  });

  it('restores the saved layout after a reload', async () => {
    await render(builtins);
    await click('[data-dock-close="sessions"]');
    expect(Object.keys(panels())).toEqual([CHANNEL_BODY_PANEL]);
    act(() => root.unmount());
    root = createRoot(host);
    await render(builtins);
    expect(host.querySelector('[data-body="bot-inbox"]')).toBeNull();
    expect(Object.keys(panels())).toEqual([CHANNEL_BODY_PANEL]);
  });

  it('reopens a closed panel where it was, from the Panels menu', async () => {
    await render(builtins);
    await click('[data-dock-close="sessions"]');
    expect(readChannelDock(storage)!.parked['sessions']).toMatchObject({
      neighbor: CHANNEL_BODY_PANEL,
      direction: 'right',
    });
    await click('[data-dock-menu] button');
    await click('[data-menu-item="sessions"]');
    expect(
      JSON.stringify(readChannelDock(storage)!.layout.grid, (key, value) =>
        key === 'size' ? undefined : value,
      ),
    ).not.toContain('bot-inbox');
  });

  it('parks a panel whose plugin is gone and brings it back when it registers again', async () => {
    const computer = entry('computer');
    await render(builtins);
    await render([...builtins, computer]);
    await click('[data-dock-menu] button');
    await click('[data-menu-item="computer"]');
    expect(Object.keys(panels())).toContain('computer');
    await render(builtins);
    expect(Object.keys(panels())).not.toContain('computer');
    expect(readChannelDock(storage)!.parked['computer']).toMatchObject({
      neighbor: 'sessions',
      direction: 'below',
      missing: true,
    });
    await render([...builtins, computer]);
    expect(Object.keys(panels())).toContain('computer');
    expect(readChannelDock(storage)!.parked['computer']).toBeUndefined();
  });

  it('resets to the default layout', async () => {
    await render(builtins);
    await click('[data-dock-close="sessions"]');
    await click('[data-dock-menu] button');
    await click('[data-menu-item="bh:dock-reset"]');
    expect(Object.keys(panels())).toEqual([CHANNEL_BODY_PANEL, 'sessions']);
    expect(values.has(CHANNEL_DOCK_STORAGE_KEY)).toBe(true);
  });

  it('dismisses the open menu when its trigger is hidden without a pointer click', async () => {
    await render(builtins);
    let notifyHidden: (() => void) | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private notify: () => void) {}
        observe(node: Element) {
          if (node.matches('[data-dock-menu]')) notifyHidden = this.notify;
        }
        disconnect = disconnect;
      },
    );
    await click('[data-dock-menu] button');
    expect(host.querySelector('[data-menu-item="sessions"]')).not.toBeNull();
    expect(notifyHidden).toBeDefined();
    act(() => notifyHidden!());
    await settle();
    expect(host.querySelector('[data-menu-item="sessions"]')).toBeNull();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(Object.keys(panels())).toEqual([CHANNEL_BODY_PANEL, 'sessions']);
    await click('[data-dock-menu] button');
    expect(host.querySelector('[data-menu-item="sessions"]')).not.toBeNull();
  });
});

describe('dock entry state per Bot or Channel', () => {
  const remember =
    (part: string) =>
    ({ botSlug, channelId }: ChannelSidebarEntryProps) => {
      const [first] = useState(botSlug ?? channelId);
      return createElement('span', { [`data-remembered-${part}`]: first });
    };
  const sessions = {
    id: 'sessions',
    label: 'sessions',
    scope: 'personabot',
    component: remember('body'),
    headerAction: remember('action'),
  } satisfies ChannelSidebarEntry;
  const show = (props: Partial<ChannelSidebarEntryProps>) =>
    act(() =>
      root.render(
        createElement(ChannelDock, {
          body: createElement('section', { className: 'bh-chat-pane' }, 'channel body'),
          panels: dockPanelsFromEntries([sessions]),
          entryProps: { ...entryProps, ...props },
          shows: (candidate: ChannelSidebarEntry) => candidate.scope === 'personabot',
          t: zhTranslate,
          storage,
        }),
      ),
    );
  const remembered = () =>
    ['body', 'action'].map((part) =>
      host.querySelector(`[data-remembered-${part}]`)?.getAttribute(`data-remembered-${part}`),
    );

  it('starts a docked entry and its header action fresh when another Bot is selected', async () => {
    show({});
    await settle();
    expect(remembered()).toEqual(['ada', 'ada']);
    show({ channelId: 'dm-bob', botSlug: 'bob' });
    await settle();
    expect(remembered()).toEqual(['bob', 'bob']);
  });
});

describe('dockPanels Service in the dock', () => {
  const dm: DockPanelChannel = { id: 'dm-ada', type: 'dm', botSlug: 'ada' };
  const group: DockPanelChannel = { id: 'group-1', type: 'group', botSlug: undefined };
  const todo: DockPanel = {
    id: 'example:todo',
    title: 'To-do',
    icon: 'list-todo',
    scope: 'global',
    headerAction: ({ channel }) =>
      createElement('button', { 'data-todo-action': channel?.id ?? 'global' }, 'Filter todo'),
    component: ({ channel }) =>
      createElement('div', { 'data-todo': channel?.id ?? 'global' }, 'todo body'),
  };
  const notes: DockPanel = {
    id: 'example:notes',
    title: 'Notes',
    scope: 'channel',
    defaultPosition: { zone: 'bottom' },
    component: ({ channel }) => createElement('div', { 'data-notes': channel?.id }, 'notes'),
  };

  function setup() {
    const registry = createDockPanelRegistry();
    for (const id of ['sessions', 'bot-inbox', 'schedules']) registry.registerEntry(entry(id));
    registry.register(todo);
    registry.register(notes);
    return registry;
  }

  it('lists a plugin panel in the Panels menu and keeps a global panel when the Channel changes', async () => {
    const registry = setup();
    await render(registry.panels(), 'personabot', { channel: dm, registry });
    await click('[data-dock-menu] button');
    expect(host.querySelector('[data-menu-item="example:todo"]')?.textContent).toBe('To-do');
    await click('[data-menu-item="example:todo"]');
    expect(host.querySelector('[data-todo]')?.getAttribute('data-todo')).toBe('global');
    expect(
      host
        .querySelector('[data-dock-header="example:todo"] [data-todo-action]')
        ?.getAttribute('data-todo-action'),
    ).toBe('global');
    expect(host.querySelector('[data-dock-panel="example:todo"] [data-todo-action]')).toBeNull();
    expect(registry.isOpen('example:todo')).toBe(true);
    const layout = JSON.stringify(readChannelDock(storage)!.layout.grid, (key, value) =>
      key === 'size' ? undefined : value,
    );

    act(() => root.unmount());
    root = createRoot(host);
    await render(registry.panels(), 'channel', { channel: group, registry });
    expect(host.querySelector('[data-todo]')?.getAttribute('data-todo')).toBe('global');
    expect(
      host
        .querySelector('[data-dock-header="example:todo"] [data-todo-action]')
        ?.getAttribute('data-todo-action'),
    ).toBe('global');
    expect(host.querySelector('[data-dock-panel="example:todo"] [data-todo-action]')).toBeNull();
    expect(
      JSON.stringify(readChannelDock(storage)!.layout.grid, (key, value) =>
        key === 'size' ? undefined : value,
      ),
    ).toBe(layout);
  });

  it('hands a channel panel the active Channel and opens it at its default position', async () => {
    const registry = setup();
    await render(registry.panels(), 'personabot', { channel: dm, registry });
    act(() => registry.open('example:notes'));
    await settle();
    expect(host.querySelector('[data-notes]')?.getAttribute('data-notes')).toBe('dm-ada');
    const grid = readChannelDock(storage)!.layout.grid;
    expect(grid.orientation).toBe('VERTICAL');
    const rows = (grid.root.data as { data: unknown }[]).map((node) => JSON.stringify(node));
    expect(rows.at(-1)).toContain('example:notes');
  });

  it('shows an empty state for a channel panel while no Channel is active', async () => {
    const registry = setup();
    await render(registry.panels(), 'personabot', { registry });
    act(() => registry.open('example:notes'));
    await settle();
    expect(host.querySelector('[data-notes]')).toBeNull();
    expect(
      host.querySelector('[data-dock-panel="example:notes"] [data-panel-empty]'),
    ).not.toBeNull();
  });

  it('toggles panels through the Service and reports what is open', async () => {
    const registry = setup();
    const seen: string[][] = [];
    registry.subscribe(() => seen.push([...registry.openPanels()]));
    await render(registry.panels(), 'personabot', { channel: dm, registry });
    expect(registry.openPanels()).toEqual(['sessions']);
    act(() => registry.toggle('sessions'));
    await settle();
    expect(registry.isOpen('sessions')).toBe(false);
    act(() => registry.toggle('sessions'));
    await settle();
    expect(registry.isOpen('sessions')).toBe(true);
    act(() => root.unmount());
    root = createRoot(host);
    expect(registry.openPanels()).toEqual([]);
    expect(seen.length).toBeGreaterThan(2);
  });
});

it('keeps live portal content during rail/panel movement and remembers a closed Messages panel', async () => {
  const { WorkspaceContext, WORKSPACE_CHANNELS } =
    await import('../src/client/workspace-context.js');
  const { moveWorkspaceRail } = await import('../src/client/workspace-layout.js');
  const registry = createDockPanelRegistry();
  registry.register({
    id: CHANNEL_BODY_PANEL,
    title: 'Messages',
    icon: 'messages-square',
    scope: 'global',
    component: () => null,
  });
  registry.register({
    id: WORKSPACE_CHANNELS,
    title: 'Channels',
    scope: 'global',
    component: () => createElement('input', { 'data-roster-search': '' }),
  });
  let api: import('dockview-react').DockviewApi | undefined;
  const workspace = {
    rail: (current: import('dockview-react').DockviewApi) => {
      api = current;
      return createElement('nav');
    },
  };
  const view = () =>
    createElement(
      WorkspaceContext.Provider,
      { value: workspace },
      createElement(ChannelDock, {
        body: createElement('input', { 'data-message-draft': '' }),
        panels: registry.panels(),
        registry,
        entryProps,
        shows: () => true,
        t: zhTranslate,
        storage,
      }),
    );
  act(() => root.render(view()));
  await settle();
  expect(host.querySelector('[data-dock-close]')).toBeNull();
  const draft = host.querySelector<HTMLInputElement>('[data-message-draft]')!;
  const search = host.querySelector<HTMLInputElement>('[data-roster-search]')!;
  draft.value = 'unsent draft';
  search.value = 'Ada';
  act(() => moveWorkspaceRail(api!, 'right'));
  await settle();
  expect(host.querySelector('[data-message-draft]')).toBe(draft);
  expect(host.querySelector('[data-roster-search]')).toBe(search);
  act(() =>
    api!
      .getPanel(WORKSPACE_CHANNELS)!
      .api.moveTo({ group: api!.getPanel(CHANNEL_BODY_PANEL)!.group, position: 'right' }),
  );
  await settle();
  expect(host.querySelector('[data-message-draft]')).toBe(draft);
  expect(search.value).toBe('Ada');
  act(() => registry.close(CHANNEL_BODY_PANEL));
  await settle();
  expect(host.querySelector('[data-message-draft]')).toBeNull();
  expect(readChannelDock(storage)?.layout.panels[CHANNEL_BODY_PANEL]).toBeUndefined();
  act(() => root.render(null));
  await settle();
  act(() => root.render(view()));
  await settle();
  expect(host.querySelector('[data-message-draft]')).toBeNull();
  act(() => registry.open(CHANNEL_BODY_PANEL));
  await settle();
  expect(host.querySelectorAll('[data-message-draft]')).toHaveLength(1);
  act(() => {
    registry.close(CHANNEL_BODY_PANEL);
    registry.close(WORKSPACE_CHANNELS);
  });
  await settle();
  act(() => root.render(null));
  await settle();
  act(() => root.render(view()));
  await settle();
  expect(registry.openPanels()).toEqual([]);
  act(() => registry.open(CHANNEL_BODY_PANEL));
  await settle();
  expect(host.querySelectorAll('[data-message-draft]')).toHaveLength(1);
});

it('opens group members inside Messages and preserves the split preference across remounts', async () => {
  const { WorkspaceContext } = await import('../src/client/workspace-context.js');
  const registry = createDockPanelRegistry();
  registry.register({
    id: CHANNEL_BODY_PANEL,
    title: 'Messages',
    scope: 'global',
    component: () => null,
  });
  registry.registerEntry(entry('members', 'channel'));
  const workspace = { rail: () => createElement('nav') };
  const view = (group = true) =>
    createElement(
      WorkspaceContext.Provider,
      { value: workspace },
      createElement(ChannelDock, {
        body: createElement('input', { 'data-message-draft': '' }),
        panels: registry.panels(),
        registry,
        channel: { id: 'test', type: group ? 'group' : 'dm', botSlug: undefined },
        entryProps,
        shows: () => true,
        t: zhTranslate,
        storage,
      }),
    );
  act(() => root.render(view()));
  await settle();
  act(() => registry.open('members'));
  await settle();
  expect(host.querySelector('.bh-message-members [data-body="members"]')).not.toBeNull();
  expect(host.querySelector('[data-dock-panel="members"]')).toBeNull();
  expect(registry.isOpen('members')).toBe(true);
  const divider = host.querySelector('[role="separator"][aria-label="成员"]')!;
  act(() =>
    divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })),
  );
  await settle();
  expect(readChannelDock(storage)?.members?.ratio).toBeCloseTo(0.32);
  act(() => root.render(null));
  await settle();
  act(() => root.render(view()));
  await settle();
  expect(host.querySelector('.bh-message-members')).not.toBeNull();
  act(() => registry.close('members'));
  await settle();
  expect(host.querySelector('.bh-message-members')).toBeNull();
  act(() => root.render(view(false)));
  await settle();
  act(() => registry.open('members'));
  await settle();
  expect(host.querySelector('.bh-message-members')).toBeNull();
});

it('persists hidden rail controls, closes only the hidden Panel and supports header close', async () => {
  const { WorkspaceContext, WORKSPACE_CHANNELS } =
    await import('../src/client/workspace-context.js');
  const registry = createDockPanelRegistry();
  registry.register({
    id: CHANNEL_BODY_PANEL,
    title: 'Messages',
    scope: 'global',
    component: () => null,
  });
  registry.register({
    id: WORKSPACE_CHANNELS,
    title: 'Channels',
    scope: 'global',
    component: () => createElement('input', { 'data-roster-search': '' }),
  });
  let hidden: readonly string[] = [];
  let visible: (id: string, shown: boolean) => void = () => {};
  const workspace: NonNullable<ContextType<typeof WorkspaceContext>> = {
    rail: (_api, _gap, _setGap, _reset, _order, _setOrder, ids, setVisible) => {
      hidden = ids;
      visible = setVisible;
      return createElement('nav');
    },
  };
  const view = () =>
    createElement(
      WorkspaceContext.Provider,
      { value: workspace },
      createElement(ChannelDock, {
        body: createElement('input', { 'data-message-draft': '' }),
        panels: registry.panels(),
        registry,
        entryProps,
        shows: () => true,
        t: zhTranslate,
        storage,
      }),
    );
  act(() => root.render(view()));
  await settle();
  const draft = host.querySelector<HTMLInputElement>('[data-message-draft]')!;
  draft.value = 'keep this';
  act(() => visible(WORKSPACE_CHANNELS, false));
  await settle();
  expect(hidden).toEqual([WORKSPACE_CHANNELS]);
  expect(host.querySelector('[data-roster-search]')).toBeNull();
  expect(host.querySelector('[data-message-draft]')).toBe(draft);
  expect(draft.value).toBe('keep this');
  expect(readChannelDock(storage)?.hiddenControls).toEqual([WORKSPACE_CHANNELS]);
  act(() => root.render(null));
  await settle();
  act(() => root.render(view()));
  await settle();
  expect(hidden).toEqual([WORKSPACE_CHANNELS]);
  expect(host.querySelector('[data-roster-search]')).toBeNull();
  act(() => visible(WORKSPACE_CHANNELS, true));
  await settle();
  expect(hidden).toEqual([]);
  expect(host.querySelector('[data-roster-search]')).toBeNull();
  act(() => registry.open(WORKSPACE_CHANNELS));
  await settle();
  const title = () =>
    host.querySelector<HTMLButtonElement>(
      `[data-dock-header="${WORKSPACE_CHANNELS}"] [data-panel-hide]`,
    )!;
  act(() => {
    title().dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 30, clientY: 40 }),
    );
    title().dispatchEvent(
      new MouseEvent('pointermove', { bubbles: true, clientX: 100, clientY: 40 }),
    );
    title().dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1, clientX: 30, clientY: 40 }),
    );
  });
  expect(registry.isOpen(WORKSPACE_CHANNELS)).toBe(true);
  act(() => title().click());
  await settle();
  expect(registry.isOpen(WORKSPACE_CHANNELS)).toBe(false);
  expect(readChannelDock(storage)?.hiddenControls).toEqual([]);
  act(() => registry.open(WORKSPACE_CHANNELS));
  await settle();
  const header = host.querySelector<HTMLElement>(`[data-dock-header="${WORKSPACE_CHANNELS}"]`)!;
  act(() =>
    header.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 30, clientY: 40 }),
    ),
  );
  act(() => document.querySelector<HTMLButtonElement>('[data-menu-item="close"]')!.click());
  await settle();
  expect(registry.isOpen(WORKSPACE_CHANNELS)).toBe(false);
  expect(readChannelDock(storage)?.hiddenControls).toEqual([]);
});

it('opens Channel files inside Messages for DMs and Groups and switches with Members', async () => {
  const { WorkspaceContext } = await import('../src/client/workspace-context.js');
  const registry = createDockPanelRegistry();
  registry.register({
    id: CHANNEL_BODY_PANEL,
    title: 'Messages',
    scope: 'global',
    component: () => null,
  });
  registry.registerEntry(entry('members', 'channel'));
  const workspace = { rail: () => createElement('nav') };
  let open = false;
  let group = false;
  const view = () =>
    createElement(
      WorkspaceContext.Provider,
      { value: workspace },
      createElement(ChannelDock, {
        body: createElement('input', { 'data-message-draft': '' }),
        files: {
          open,
          setOpen: (next: boolean) => {
            open = next;
            root.render(view());
          },
          content: createElement(
            'section',
            { 'data-channel-files': '' },
            group ? 'group file' : 'DM file',
          ),
        },
        panels: registry.panels(),
        registry,
        channel: { id: group ? 'group' : 'dm', type: group ? 'group' : 'dm', botSlug: undefined },
        entryProps,
        shows: () => true,
        t: zhTranslate,
        storage,
      }),
    );
  act(() => root.render(view()));
  await settle();
  const toggle = () =>
    act(() =>
      host
        .querySelector<HTMLButtonElement>('[data-dock-header] button[aria-label="频道文件"]')!
        .click(),
    );
  expect(host.querySelector('[data-channel-files]')).toBeNull();
  const draft = host.querySelector<HTMLInputElement>('[data-message-draft]')!;
  draft.value = 'unsent';
  toggle();
  await settle();
  expect(host.querySelector('aside [data-channel-files]')?.textContent).toBe('DM file');
  expect(host.querySelector('[data-dock-panel="generated-files"]')).toBeNull();
  expect(host.querySelector('[data-message-draft]')).toBe(draft);
  toggle();
  await settle();
  expect(host.querySelector('[data-channel-files]')).toBeNull();
  group = true;
  act(() => root.render(view()));
  await settle();
  act(() => registry.open('members'));
  await settle();
  expect(host.querySelector('aside [data-body="members"]')).not.toBeNull();
  toggle();
  await settle();
  expect(host.querySelector('aside [data-channel-files]')?.textContent).toBe('group file');
  expect(host.querySelector('aside [data-body="members"]')).toBeNull();
  expect(registry.isOpen('members')).toBe(false);
  act(() => registry.open('members'));
  await settle();
  expect(host.querySelector('[data-channel-files]')).toBeNull();
  expect(host.querySelector('aside [data-body="members"]')).not.toBeNull();
  expect(draft.value).toBe('unsent');
});

it('opens Bot Inbox only inside DM Messages, supports registry navigation and switches with files', async () => {
  const { WorkspaceContext } = await import('../src/client/workspace-context.js');
  const registry = createDockPanelRegistry();
  registry.register({
    id: CHANNEL_BODY_PANEL,
    title: 'Messages',
    scope: 'global',
    component: () => null,
  });
  registry.registerEntry(entry('bot-inbox'));
  registry.registerEntry(entry('sessions'));
  let detail: 'inbox' | 'files' | undefined;
  let group = false;
  const view = () =>
    createElement(
      WorkspaceContext.Provider,
      { value: { rail: () => createElement('nav') } },
      createElement(ChannelDock, {
        body: createElement('input', { 'data-message-draft': '' }),
        inbox: group
          ? undefined
          : {
              open: detail === 'inbox',
              setOpen: (open: boolean) => {
                detail = open ? 'inbox' : undefined;
                root.render(view());
              },
            },
        files: {
          open: detail === 'files',
          setOpen: (open: boolean) => {
            detail = open ? 'files' : undefined;
            root.render(view());
          },
          content: createElement('div', { 'data-files': '' }),
        },
        panels: registry.panels(),
        registry,
        channel: {
          id: group ? 'group' : 'dm',
          type: group ? 'group' : 'dm',
          botSlug: group ? undefined : 'ada',
        },
        entryProps,
        shows: () => !group,
        t: zhTranslate,
        storage,
      }),
    );
  act(() => root.render(view()));
  await settle();
  const draft = host.querySelector<HTMLInputElement>('[data-message-draft]')!;
  draft.value = 'unsent';
  expect(host.querySelector('[data-body="bot-inbox"]')).toBeNull();
  await click('[data-dock-header] button[aria-label="Bot 收件箱"]');
  expect(host.querySelector('aside [data-body="bot-inbox"]')).not.toBeNull();
  expect(Object.keys(panels())).not.toContain('bot-inbox');
  expect(registry.isOpen('bot-inbox')).toBe(true);
  await click('[data-dock-header] button[aria-label="频道文件"]');
  expect(host.querySelector('aside [data-files]')).not.toBeNull();
  expect(host.querySelector('[data-body="bot-inbox"]')).toBeNull();
  expect(registry.isOpen('bot-inbox')).toBe(false);
  act(() => registry.open('bot-inbox'));
  await settle();
  expect(host.querySelector('aside [data-body="bot-inbox"]')).not.toBeNull();
  expect(host.querySelector('[data-files]')).toBeNull();
  expect(host.querySelector('[data-message-draft]')).toBe(draft);
  expect(draft.value).toBe('unsent');
  act(() => registry.close('bot-inbox'));
  await settle();
  expect(host.querySelector('[data-body="bot-inbox"]')).toBeNull();
  group = true;
  act(() => root.render(view()));
  await settle();
  expect(host.querySelector('button[aria-label="Bot 收件箱"]')).toBeNull();
  act(() => registry.open('bot-inbox'));
  await settle();
  expect(Object.keys(panels())).not.toContain('bot-inbox');
});

it('imports fallback panel sizes when workspace ownership is enabled after mounting', async () => {
  const { WorkspaceContext } = await import('../src/client/workspace-context.js');
  const registry = createDockPanelRegistry();
  registry.register({
    id: CHANNEL_BODY_PANEL,
    title: 'Messages',
    scope: 'global',
    component: () => null,
  });
  registry.register({ id: 'sessions', title: 'Sessions', scope: 'global', component: () => null });
  const view = (enabled: boolean) =>
    createElement(
      WorkspaceContext.Provider,
      { value: enabled ? { rail: () => createElement('nav') } : undefined },
      createElement(ChannelDock, {
        body: createElement('div'),
        panels: registry.panels(),
        registry,
        channel: { id: 'dm', type: 'dm', botSlug: 'ada' },
        entryProps,
        shows: () => true,
        t: zhTranslate,
        storage,
      }),
    );
  act(() => root.render(view(false)));
  await settle();
  const fallback = readChannelDock(storage)!;
  const nodes = fallback.layout.grid.root.data as { size: number }[];
  nodes[0]!.size = 570;
  nodes[1]!.size = 430;
  storage.setItem(CHANNEL_DOCK_STORAGE_KEY, JSON.stringify(fallback));
  act(() => root.render(view(true)));
  await settle();
  expect(readChannelDock(storage)?.sessionSeed?.ratio).toBeCloseTo(0.43);
  expect(host.querySelector('[data-workspace-dock]')).not.toBeNull();
});

it('updates the Messages Channel title and trailing actions without replacing its draft', async () => {
  const { WorkspaceContext } = await import('../src/client/workspace-context.js');
  const registry = createDockPanelRegistry();
  registry.register({
    id: CHANNEL_BODY_PANEL,
    title: 'Messages',
    scope: 'global',
    component: () => null,
  });
  const settings = vi.fn();
  const profile = vi.fn();
  const view = (title: string) =>
    createElement(
      WorkspaceContext.Provider,
      { value: { rail: () => createElement('nav') } },
      createElement(ChannelDock, {
        body: createElement('input', { 'data-message-draft': '' }),
        header: {
          title,
          actions: createElement(
            'span',
            null,
            createElement('button', { onClick: profile, 'aria-label': 'Profile' }, 'Profile'),
            createElement(
              'button',
              { onClick: settings, 'aria-label': 'Channel settings' },
              'Settings',
            ),
          ),
        },
        panels: registry.panels(),
        registry,
        channel: { id: 'dm', type: 'dm', botSlug: 'ada' },
        entryProps,
        shows: () => true,
        t: zhTranslate,
        storage,
      }),
    );
  act(() => root.render(view('Ada')));
  await settle();
  const draft = host.querySelector<HTMLInputElement>('[data-message-draft]')!;
  draft.value = 'Keep';
  const header = host.querySelector('[data-dock-header="bh:channel-body"]')!;
  expect(header.textContent).toContain('MessagesAda');
  const titleHandle = header.querySelector<HTMLElement>('[data-panel-hide]')!;
  const channelContext = header.querySelector<HTMLElement>('[data-panel-context]')!;
  expect(titleHandle.textContent).toBe('Messages');
  expect(channelContext.textContent).toBe('Ada');
  act(() => channelContext.click());
  expect(registry.isOpen(CHANNEL_BODY_PANEL)).toBe(true);
  for (const target of [
    header,
    channelContext,
    header.closest('.dv-tab')!,
    header.closest('.dv-tabs-and-actions-container')!,
  ]) {
    const drag = new Event('dragstart', { bubbles: true, cancelable: true });
    act(() => target.dispatchEvent(drag));
    expect(drag.defaultPrevented).toBe(true);
  }

  const titleDrag = new Event('dragstart', { bubbles: true, cancelable: true });
  act(() => titleHandle.dispatchEvent(titleDrag));
  expect(titleDrag.defaultPrevented).toBe(false);
  act(() => titleHandle.dispatchEvent(new Event('dragend', { bubbles: true })));

  await act(async () =>
    header.querySelector<HTMLButtonElement>('[aria-label="Channel settings"]')!.click(),
  );
  await act(async () => header.querySelector<HTMLButtonElement>('[aria-label="Profile"]')!.click());
  expect(settings).toHaveBeenCalledOnce();
  expect(profile).toHaveBeenCalledOnce();
  act(() => root.render(view('Design group')));
  await settle();
  expect(header.textContent).toContain('Design group');
  expect(host.querySelector('[data-message-draft]')).toBe(draft);
  expect(draft.value).toBe('Keep');
});

it('opens Profile from the Messages header identity and keeps the subpanel toggle last', async () => {
  const { WorkspaceContext, WORKSPACE_CHANNELS } =
    await import('../src/client/workspace-context.js');
  const { writeLayoutMode, readLayoutMode } = await import('../src/client/layout-mode.js');
  values = new Map();
  const registry = createDockPanelRegistry();
  for (const [id, title] of [
    [CHANNEL_BODY_PANEL, 'Messages'],
    [WORKSPACE_CHANNELS, 'Channels'],
  ])
    registry.register({ id: id!, title: title!, scope: 'global', component: () => null });
  registry.registerEntry(entry('sessions'));
  const profile = vi.fn();
  const view = (withProfile: boolean) =>
    createElement(
      WorkspaceContext.Provider,
      { value: { rail: () => createElement('nav') } },
      createElement(ChannelDock, {
        body: createElement('div'),
        header: {
          title: 'Tob',
          icon: createElement('img', { alt: '' }),
          ...(withProfile ? { profile: { label: "Open Tob's Profile", open: profile } } : {}),
          actions: createElement('button', { 'aria-label': 'Channel settings' }, 'Settings'),
        },
        panels: registry.panels(),
        registry,
        channel: { id: 'dm', type: 'dm', botSlug: 'tob' },
        entryProps,
        shows: () => true,
        t: zhTranslate,
        storage,
      }),
    );
  act(() => root.render(view(true)));
  await settle();
  const header = () => host.querySelector<HTMLElement>('[data-dock-header="bh:channel-body"]')!;
  const identity = header().querySelector<HTMLButtonElement>('[data-channel-header-profile]')!;
  expect(identity.tagName).toBe('BUTTON');
  expect(identity.type).toBe('button');
  expect(identity.getAttribute('aria-label')).toBe("Open Tob's Profile");
  expect(identity.querySelector('[data-channel-header-icon]')).not.toBeNull();
  expect(identity.textContent).toBe('Tob');
  act(() => identity.click());
  expect(profile).toHaveBeenCalledOnce();

  const controls = [...header().querySelectorAll<HTMLButtonElement>('[data-panel-actions] button')];
  expect(controls.map((button) => button.getAttribute('aria-label'))).toEqual([
    'Channel settings',
    zhTranslate('workspace.subpanelColumn'),
  ]);
  expect(controls.at(-1)!.hasAttribute('data-subpanel-column-toggle')).toBe(true);
  expect(header().querySelector('[aria-label="查看资料"]')).toBeNull();

  act(() => root.render(view(false)));
  await settle();
  expect(header().querySelector('[data-channel-header-profile]')).toBeNull();
  expect(header().textContent).toContain('Tob');

  writeLayoutMode({ ...readLayoutMode(storage), mode: 'advanced' }, storage);
  act(() => root.unmount());
  root = createRoot(host);
  act(() => root.render(view(true)));
  await settle();
  const advanced = [
    ...header().querySelectorAll<HTMLButtonElement>('[data-panel-actions] button'),
  ].map((button) => button.getAttribute('aria-label'));
  expect(advanced[0]).toBe('Channel settings');
  expect(header().querySelector('[data-subpanel-column-toggle]')).toBeNull();
  expect(header().querySelector('[data-channel-header-profile]')).not.toBeNull();
});

it('keeps panel chrome still when only the Messages body and header slots change', async () => {
  const { WorkspaceContext } = await import('../src/client/workspace-context.js');
  const registry = createDockPanelRegistry();
  const renders = { header: 0, body: 0 };
  registry.register({
    id: CHANNEL_BODY_PANEL,
    title: 'Messages',
    scope: 'global',
    component: () => null,
  });
  registry.register({
    id: 'notes',
    title: 'Notes',
    scope: 'global',
    defaultPosition: { zone: 'right' },
    component: () => {
      renders.body += 1;
      return createElement('div', { 'data-notes': '' });
    },
    headerAction: () => {
      renders.header += 1;
      return null;
    },
  });
  const workspace = { rail: () => createElement('nav') };
  const channel: DockPanelChannel = { id: 'dm', type: 'dm', botSlug: 'ada' };
  const view = (frame: number) =>
    createElement(
      WorkspaceContext.Provider,
      { value: workspace },
      createElement(ChannelDock, {
        body: createElement('p', { 'data-stream': '' }, 'x'.repeat(frame)),
        header: { title: 'Ada', actions: createElement('span', null, `frame ${frame}`) },
        panels: registry.panels(),
        registry,
        channel,
        entryProps,
        shows: () => true,
        t: zhTranslate,
        storage,
      }),
    );
  act(() => root.render(view(1)));
  await settle();
  act(() => registry.open('notes'));
  await settle();
  expect(host.querySelector('[data-notes]')).not.toBeNull();
  const before = { ...renders };
  expect(before.header).toBeGreaterThan(0);
  for (let frame = 2; frame <= 6; frame += 1) act(() => root.render(view(frame)));
  await settle();
  expect(host.querySelector('[data-stream]')!.textContent).toBe('xxxxxx');
  expect(host.querySelector('[data-dock-header="bh:channel-body"]')!.textContent).toContain(
    'frame 6',
  );
  expect(renders).toEqual(before);
});

it('routes Sessions through its parent, remembers each Channel and preserves content on rearrangement', async () => {
  const { WorkspaceContext } = await import('../src/client/workspace-context.js');
  const registry = createDockPanelRegistry();
  registry.register({
    id: CHANNEL_BODY_PANEL,
    title: 'Messages',
    scope: 'global',
    component: () => null,
  });
  registry.registerEntry({ ...entry('sessions'), label: '会话' });
  const botOnly = [
    'memory-files',
    'memory-evolution',
    'schedules',
    'botharness-browser',
    'botharness-computer',
  ];
  const botOnlyClosable = [...botOnly, 'concept-art'];
  for (const id of botOnlyClosable) registry.registerEntry(entry(id));
  const workspace = { rail: () => createElement('nav') };
  const view = (id: string) =>
    createElement(
      WorkspaceContext.Provider,
      { value: workspace },
      createElement(ChannelDock, {
        body: createElement('input', { 'data-message-draft': '' }),
        panels: registry.panels(),
        registry,
        channel: {
          id,
          type: id === 'group' ? 'group' : 'dm',
          botSlug: id === 'group' ? undefined : id,
        },
        entryProps,
        shows: () => true,
        t: zhTranslate,
        storage,
      }),
    );
  act(() => root.render(view('ada')));
  await settle();
  expect(readChannelDock(storage)?.layout.panels.sessions).toBeUndefined();
  expect(registry.isOpen('sessions')).toBe(true);
  const draft = host.querySelector('[data-message-draft]');
  const session = host.querySelector('[data-body="sessions"]');
  const separator = host.querySelector('[role="separator"][aria-label="会话"]')!;
  act(() =>
    separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })),
  );
  await settle();
  expect(host.querySelector('[data-message-draft]')).toBe(draft);
  expect(host.querySelector('[data-body="sessions"]')).toBe(session);
  expect(readChannelDock(storage)?.channelSplits?.ada).toMatchObject({
    ratio: expect.closeTo(0.68),
  });
  act(() => registry.close(CHANNEL_BODY_PANEL));
  await settle();
  expect(registry.isOpen('sessions')).toBe(false);
  act(() => registry.toggle('sessions'));
  await settle();
  expect(registry.isOpen(CHANNEL_BODY_PANEL)).toBe(true);
  expect(registry.isOpen('sessions')).toBe(true);
  expect(readChannelDock(storage)?.channelSplits?.ada).toMatchObject({
    ratio: expect.closeTo(0.68),
  });
  act(() => registry.toggle('sessions'));
  await settle();
  expect(registry.isOpen('sessions')).toBe(false);
  expect(registry.isOpen(CHANNEL_BODY_PANEL)).toBe(true);
  for (const id of botOnlyClosable) {
    expect(registry.canOpen?.(id)).toBe(true);
    act(() => registry.open(id));
  }
  await settle();
  act(() => root.render(view('group')));
  await settle();
  expect(registry.isOpen('sessions')).toBe(true);
  for (const id of botOnlyClosable) {
    expect(registry.canOpen?.(id)).toBe(false);
    act(() => registry.open(id));
    expect(registry.isOpen(id)).toBe(false);
  }
  act(() => root.render(view('ada')));
  await settle();
  expect(registry.isOpen('sessions')).toBe(false);
  act(() => root.render(null));
  await settle();
  act(() => root.render(view('ada')));
  await settle();
  expect(registry.isOpen('sessions')).toBe(false);
  expect(readChannelDock(storage)?.channelSplits?.ada).toMatchObject({
    ratio: expect.closeTo(0.68),
  });
  act(() => registry.close(CHANNEL_BODY_PANEL));
  await settle();
  act(() => root.render(null));
  await settle();
  act(() => root.render(view('ada')));
  await settle();
  expect(registry.isOpen(CHANNEL_BODY_PANEL)).toBe(false);
  expect(registry.isOpen('sessions')).toBe(false);
  act(() => registry.toggle('sessions'));
  await settle();
  expect(registry.isOpen(CHANNEL_BODY_PANEL)).toBe(true);
  expect(registry.isOpen('sessions')).toBe(true);
  const context = () => host.querySelector('[data-dock-header="bh:channel-body"]')!;
  act(() =>
    context().dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 40, clientY: 30 }),
    ),
  );
  await settle();
  const item = document.querySelector<HTMLButtonElement>('[data-menu-item="control:sessions"]')!;
  expect(item).not.toBeNull();
  act(() => item.click());
  await settle();
  expect(registry.isOpen('sessions')).toBe(false);
  expect(readChannelDock(storage)?.channelWorkspaces?.ada?.hiddenControl).toBe(true);
  expect(context().querySelector('button[aria-label="会话"]')).toBeNull();
  act(() => root.render(null));
  await settle();
  act(() => root.render(view('ada')));
  await settle();
  expect(context().querySelector('button[aria-label="会话"]')).toBeNull();
  act(() =>
    context().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true }),
    ),
  );
  await settle();
  act(() =>
    document.querySelector<HTMLButtonElement>('[data-menu-item="control:sessions"]')!.click(),
  );
  await settle();
  expect(readChannelDock(storage)?.channelWorkspaces?.ada?.hiddenControl).toBe(false);
  expect(context().querySelector('button[aria-label="会话"]')).not.toBeNull();
  expect(registry.isOpen('sessions')).toBe(false);
  for (const id of botOnly) {
    act(() => registry.open(id));
    await settle();
    expect(
      host.querySelector(`[data-channel-subpanel="${id}"] [data-body="${id}"]`),
    ).not.toBeNull();
    expect(readChannelDock(storage)?.layout.panels[id]).toBeUndefined();
    const body = host.querySelector(`[data-body="${id}"]`);
    const divider = host
      .querySelector(`[data-channel-leaf="${id}"]`)!
      .closest('.bh-channel-branch')!
      .parentElement!.querySelector(':scope > [role="separator"]')!;
    act(() =>
      divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })),
    );
    await settle();
    expect(host.querySelector(`[data-body="${id}"]`)).toBe(body);
    const savedTree = readChannelDock(storage)?.channelSplits?.ada;
    expect(divider.getAttribute('aria-valuenow')).toBe('68');
    act(() => registry.close(CHANNEL_BODY_PANEL));
    await settle();
    act(() => registry.toggle(id));
    await settle();
    expect(registry.isOpen(CHANNEL_BODY_PANEL)).toBe(true);
    expect(registry.isOpen(id)).toBe(true);
    act(() => registry.toggle(id));
    await settle();
    expect(registry.isOpen(id)).toBe(false);
    expect(readChannelDock(storage)?.channelSplits?.ada).toEqual(savedTree);
    act(() => registry.open(id));
    await settle();
    expect(
      host
        .querySelector(`[data-channel-leaf="${id}"]`)!
        .closest('.bh-channel-branch')!
        .parentElement!.querySelector(':scope > [role="separator"]')
        ?.getAttribute('aria-valuenow'),
    ).toBe('68');
    act(() => registry.close(id));
    await settle();
  }
  act(() => root.render(view('bob')));
  await settle();
  for (const id of botOnly) {
    expect(registry.isOpen(id)).toBe(false);
    act(() => registry.open(id));
  }
  await settle();
  act(() => root.render(view('ada')));
  await settle();
  for (const id of botOnly) expect(registry.isOpen(id)).toBe(false);
  act(() => root.render(null));
  await settle();
  act(() => root.render(view('bob')));
  await settle();
  for (const id of botOnly) expect(registry.isOpen(id)).toBe(true);
});

it('does not reapply Dockview options while geometry changes', async () => {
  const { WorkspaceContext, WORKSPACE_CHANNELS } =
    await import('../src/client/workspace-context.js');
  let dock: import('dockview-react').DockviewApi | undefined;
  let changeGap: (value: number) => void = () => {};
  const registry = createDockPanelRegistry();
  registry.register({
    id: CHANNEL_BODY_PANEL,
    title: 'Messages',
    scope: 'global',
    component: () => null,
  });
  registry.register({
    id: WORKSPACE_CHANNELS,
    title: 'Channels',
    scope: 'global',
    component: () => null,
  });
  const workspace: NonNullable<ContextType<typeof WorkspaceContext>> = {
    rail: (api, _gap, setGap) => {
      dock = api;
      changeGap = setGap;
      return createElement('nav');
    },
  };
  act(() =>
    root.render(
      createElement(
        WorkspaceContext.Provider,
        { value: workspace },
        createElement(ChannelDock, {
          body: createElement('div'),
          panels: registry.panels(),
          registry,
          entryProps,
          shows: () => true,
          t: zhTranslate,
          storage,
        }),
      ),
    ),
  );
  await settle();
  const update = vi.spyOn(dock!, 'updateOptions');
  act(() => dock!.layout(1200, 800));
  await settle();
  act(() => dock!.getPanel(WORKSPACE_CHANNELS)!.group.api.setSize({ width: 370 }));
  await settle();
  expect(update).not.toHaveBeenCalled();
  act(() => changeGap(12));
  await settle();
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ theme: expect.objectContaining({ gap: 12 }) }),
  );
});

it('restores a global panel and nested global panel geometry without remounting surviving content', async () => {
  const { WorkspaceContext, WORKSPACE_CHANNELS } =
    await import('../src/client/workspace-context.js');
  let dock: import('dockview-react').DockviewApi | undefined;
  const registry = createDockPanelRegistry();
  for (const [id, title] of [
    [CHANNEL_BODY_PANEL, 'Messages'],
    [WORKSPACE_CHANNELS, 'Channels'],
    [GLOBAL_PANEL, 'Market'],
    ['computer', 'Computer'],
  ])
    registry.register({
      id: id!,
      title: title!,
      scope: 'global',
      component: () => createElement('input', { 'data-content': id, defaultValue: title }),
    });
  const view = () =>
    createElement(
      WorkspaceContext.Provider,
      {
        value: {
          rail: (api) => {
            dock = api;
            return createElement('nav');
          },
        },
      },
      createElement(ChannelDock, {
        body: createElement('input', { 'data-message-draft': '' }),
        panels: registry.panels(),
        registry,
        entryProps,
        shows: () => true,
        t: zhTranslate,
        storage,
      }),
    );
  act(() => root.render(view()));
  await settle();
  act(() => {
    dock!.layout(1500, 900);
    registry.open(GLOBAL_PANEL);
    registry.open(CHANNEL_BODY_PANEL);
    dock!.getPanel(CHANNEL_BODY_PANEL)!.api.moveTo({ position: 'right' });
    registry.open('computer');
  });
  await settle();
  act(() => {
    dock!.getPanel('computer')!.api.moveTo({
      group: dock!.getPanel(CHANNEL_BODY_PANEL)!.group,
      position: 'bottom',
    });
    dock!.getPanel(WORKSPACE_CHANNELS)!.group.api.setSize({ width: 265 });
    dock!.getPanel(GLOBAL_PANEL)!.group.api.setSize({ width: 550 });
    dock!.getPanel('computer')!.group.api.setSize({ height: 330 });
  });
  await settle();
  const grid = () =>
    JSON.parse(
      JSON.stringify(dock!.toJSON().grid, (_key, value) =>
        typeof value === 'number' ? Math.round(value * 1e6) / 1e6 : value,
      ),
    );
  const before = grid();
  const draft = host.querySelector<HTMLInputElement>('[data-message-draft]')!;
  draft.value = 'unsent message';
  const computer = dock!.getPanel('computer');
  act(() => registry.close(GLOBAL_PANEL));
  await settle();
  expect(registry.isOpen(GLOBAL_PANEL)).toBe(false);
  act(() => registry.open(GLOBAL_PANEL));
  await settle();
  expect(grid()).toEqual(before);
  expect(host.querySelector('[data-message-draft]')).toBe(draft);
  expect(draft.value).toBe('unsent message');
  expect(dock!.getPanel('computer')).toBe(computer);

  act(() => {
    registry.close(GLOBAL_PANEL);
    registry.close(CHANNEL_BODY_PANEL);
    registry.open(GLOBAL_PANEL);
    registry.open(CHANNEL_BODY_PANEL);
  });
  await settle();
  expect(grid()).toEqual(before);

  act(() => registry.close(GLOBAL_PANEL));
  await settle();
  expect(readChannelDock(storage)?.visibilityLayout).toBeDefined();
  act(() => root.unmount());
  root = createRoot(host);
  act(() => root.render(view()));
  await settle();
  act(() => {
    dock!.layout(1500, 900);
    registry.open(GLOBAL_PANEL);
  });
  await settle();
  expect(grid()).toEqual(before);
  expect(readChannelDock(storage)?.visibilityLayout).toBeUndefined();
  act(() => registry.close(GLOBAL_PANEL));
  await settle();
  const fromJSON = dock!.fromJSON.bind(dock!);
  const restore = vi.spyOn(dock!, 'fromJSON').mockImplementationOnce((layout, options) => {
    fromJSON(layout, options);
    throw Error('restore interrupted after partial mutation');
  });
  act(() => registry.open(GLOBAL_PANEL));
  await settle();
  expect(dock!.panels.filter((x) => x.id === GLOBAL_PANEL)).toHaveLength(1);
  expect(dock!.getPanel(CHANNEL_BODY_PANEL)).toBeDefined();
  expect(readChannelDock(storage)?.visibilityLayout).toBeUndefined();
  restore.mockRestore();
});

it('keeps a newly resized column when a hidden lower panel is reopened', async () => {
  const { WorkspaceContext, WORKSPACE_CHANNELS } =
    await import('../src/client/workspace-context.js');
  let dock: import('dockview-react').DockviewApi | undefined;
  const registry = createDockPanelRegistry();
  for (const id of [CHANNEL_BODY_PANEL, WORKSPACE_CHANNELS, GLOBAL_PANEL])
    registry.register({ id, title: id, scope: 'global', component: () => createElement('div') });
  act(() =>
    root.render(
      createElement(
        WorkspaceContext.Provider,
        {
          value: {
            rail: (api) => {
              dock = api;
              return createElement('nav');
            },
          },
        },
        createElement(ChannelDock, {
          body: createElement('div'),
          panels: registry.panels(),
          registry,
          entryProps,
          shows: () => true,
          t: zhTranslate,
          storage,
        }),
      ),
    ),
  );
  await settle();
  act(() => {
    dock!.layout(1500, 900);
    registry.open(GLOBAL_PANEL);
    registry.open(CHANNEL_BODY_PANEL);
    dock!.getPanel(CHANNEL_BODY_PANEL)!.api.moveTo({
      group: dock!.getPanel(GLOBAL_PANEL)!.group,
      position: 'bottom',
    });
    dock!.getPanel(WORKSPACE_CHANNELS)!.group.api.setSize({ width: 500 });
  });
  await settle();
  act(() => registry.close(CHANNEL_BODY_PANEL));
  await settle();
  act(() => {
    host.querySelector('.dv-sash')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    dock!.getPanel(WORKSPACE_CHANNELS)!.group.api.setSize({ width: 280 });
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
  });
  await settle();
  const width = dock!.getPanel(WORKSPACE_CHANNELS)!.group.width;
  expect(readChannelDock(storage)?.visibilityLayout).toBeUndefined();
  act(() => registry.open(CHANNEL_BODY_PANEL));
  await settle();
  expect(Math.abs(dock!.getPanel(WORKSPACE_CHANNELS)!.group.width - width)).toBeLessThanOrEqual(4);
});

it('refuses a newly registered Bot-bound Panel in a Group before the registry rerenders', async () => {
  const registry = createDockPanelRegistry();
  await render(registry.panels(), 'group', {
    channel: { id: 'group-qa', type: 'group', botSlug: undefined },
    registry,
  });
  registry.register({
    id: 'new-character',
    title: 'Character',
    scope: 'channel',
    binding: 'current-bot',
    component: () => createElement('div', { 'data-new-character': '' }),
  });
  expect(registry.canOpen?.('new-character')).toBe(false);
  act(() => registry.open('new-character'));
  await settle();
  expect(host.querySelector('[data-new-character]')).toBeNull();
  await render(registry.panels(), 'personabot', {
    channel: { id: 'dm-ada', type: 'dm', botSlug: 'ada' },
    registry,
  });
  expect(registry.canOpen?.('new-character')).toBe(true);
  act(() => registry.open('new-character'));
  await settle();
  expect(host.querySelector('[data-new-character]')).not.toBeNull();
});

it('switches the Simple Side column without adding panels and restores the Advanced arrangement', async () => {
  const { WorkspaceContext, WORKSPACE_CHANNELS, WORKSPACE_RAIL } =
    await import('../src/client/workspace-context.js');
  values = new Map();
  let dock: import('dockview-react').DockviewApi | undefined;
  let layoutMode: { mode: 'simple' | 'advanced'; setMode(mode: 'simple' | 'advanced'): void };
  const registry = createDockPanelRegistry();
  for (const [id, title] of [
    [CHANNEL_BODY_PANEL, 'Messages'],
    [WORKSPACE_CHANNELS, 'Channels'],
    [GLOBAL_PANEL, 'Market'],
    ['activity-center', 'Activity'],
  ])
    registry.register({
      id: id!,
      title: title!,
      scope: 'global',
      component: () => createElement('input', { 'data-content': id, defaultValue: title }),
    });
  const view = () =>
    createElement(
      WorkspaceContext.Provider,
      {
        value: {
          rail: (api, _gap, _setGap, _reset, _order, _setOrder, _hidden, _setVisible, mode) => {
            dock = api;
            layoutMode = mode;
            return createElement('nav');
          },
        },
      },
      createElement(ChannelDock, {
        body: createElement('input', { 'data-message-draft': '' }),
        panels: registry.panels(),
        registry,
        entryProps,
        shows: () => true,
        t: zhTranslate,
        storage,
      }),
    );
  act(() => root.render(view()));
  await settle();
  act(() => dock!.layout(1500, 900));
  await settle();
  const shown = () =>
    dock!.groups
      .filter((group) => group.api.isVisible)
      .flatMap((group) => group.panels.map((panel) => panel.id))
      .filter((id) => id !== WORKSPACE_RAIL)
      .sort();
  expect(layoutMode!.mode).toBe('simple');
  expect(shown()).toEqual([CHANNEL_BODY_PANEL, WORKSPACE_CHANNELS].sort());
  expect(registry.isOpen(CHANNEL_BODY_PANEL)).toBe(true);
  expect(registry.isOpen(GLOBAL_PANEL)).toBe(false);

  const draft = host.querySelector<HTMLInputElement>('[data-message-draft]')!;
  draft.value = 'unsent message';
  act(() => registry.toggle(GLOBAL_PANEL));
  await settle();
  expect(shown()).toEqual([CHANNEL_BODY_PANEL, GLOBAL_PANEL].sort());
  expect(registry.isOpen(CHANNEL_BODY_PANEL)).toBe(true);
  expect(registry.isOpen(WORKSPACE_CHANNELS)).toBe(false);
  act(() => registry.toggle(GLOBAL_PANEL));
  await settle();
  expect(shown()).toEqual([CHANNEL_BODY_PANEL]);
  act(() => registry.open('activity-center'));
  await settle();
  expect(shown()).toEqual([CHANNEL_BODY_PANEL, 'activity-center'].sort());
  act(() => registry.open(CHANNEL_BODY_PANEL));
  await settle();
  expect(shown()).toEqual([CHANNEL_BODY_PANEL, 'activity-center'].sort());
  act(() => registry.open(WORKSPACE_CHANNELS));
  await settle();
  expect(shown()).toEqual([CHANNEL_BODY_PANEL, WORKSPACE_CHANNELS].sort());
  expect(host.querySelector('[data-message-draft]')).toBe(draft);
  expect(draft.value).toBe('unsent message');
  expect(readChannelDock(storage)?.layout.panels).toEqual({});

  act(() => registry.open(GLOBAL_PANEL));
  act(() => layoutMode!.setMode('advanced'));
  await settle();
  act(() => dock!.layout(1500, 900));
  await settle();
  expect(layoutMode!.mode).toBe('advanced');
  act(() => {
    registry.open(GLOBAL_PANEL);
    registry.open(CHANNEL_BODY_PANEL);
    dock!.getPanel(WORKSPACE_CHANNELS)!.group.api.setSize({ width: 300 });
  });
  await settle();
  const advanced = readChannelDock(storage)!.layout;
  expect(Object.keys(advanced.panels)).toEqual(
    expect.arrayContaining([GLOBAL_PANEL, CHANNEL_BODY_PANEL]),
  );

  act(() => layoutMode!.setMode('simple'));
  await settle();
  act(() => dock!.layout(1500, 900));
  await settle();
  expect(shown()).toEqual([CHANNEL_BODY_PANEL, GLOBAL_PANEL].sort());
  expect(readChannelDock(storage)!.layout).toEqual(advanced);
  act(() => layoutMode!.setMode('advanced'));
  await settle();
  expect(dock!.getPanel(GLOBAL_PANEL)).toBeDefined();
  expect(dock!.getPanel(CHANNEL_BODY_PANEL)).toBeDefined();
  expect(dock!.groups.every((group) => group.api.isVisible)).toBe(true);
});

it('shows Channel subpanels as one Simple column with global collapse state', async () => {
  const { WorkspaceContext, WORKSPACE_CHANNELS } =
    await import('../src/client/workspace-context.js');
  const { readLayoutMode } = await import('../src/client/layout-mode.js');
  values = new Map();
  const registry = createDockPanelRegistry();
  for (const [id, title] of [
    [CHANNEL_BODY_PANEL, 'Messages'],
    [WORKSPACE_CHANNELS, 'Channels'],
  ])
    registry.register({ id: id!, title: title!, scope: 'global', component: () => null });
  for (const id of ['sessions', 'schedules', 'botharness-browser', 'bot-inbox'])
    registry.registerEntry(entry(id));
  registry.registerEntry(entry('members', 'channel'));
  let inboxOpen = false;
  let group = false;
  const view = () =>
    createElement(
      WorkspaceContext.Provider,
      { value: { rail: () => createElement('nav') } },
      createElement(ChannelDock, {
        body: createElement('input', { 'data-message-draft': '' }),
        inbox: group
          ? undefined
          : {
              open: inboxOpen,
              setOpen: (open: boolean) => {
                inboxOpen = open;
                root.render(view());
              },
            },
        files: {
          open: false,
          setOpen: () => {},
          content: createElement('div', { 'data-files': '' }),
        },
        panels: registry.panels(),
        registry,
        channel: group
          ? { id: 'group', type: 'group', botSlug: undefined }
          : { id: 'dm', type: 'dm', botSlug: 'ada' },
        entryProps,
        shows: () => true,
        t: zhTranslate,
        storage,
      }),
    );
  act(() => root.render(view()));
  await settle();
  const entries = () =>
    [...host.querySelectorAll('[data-subpanel-entry]')].map((node) =>
      node.getAttribute('data-subpanel-entry'),
    );
  const toggle = host.querySelector<HTMLButtonElement>('[data-subpanel-column-toggle]')!;
  expect(toggle.getAttribute('aria-pressed')).toBe('false');
  expect(host.querySelector('[data-subpanel-column]')).toBeNull();
  expect(registry.isOpen('sessions')).toBe(false);

  await click('[data-subpanel-column-toggle]');
  expect(entries()).toEqual([
    'sessions',
    'schedules',
    'botharness-browser',
    'generated-files',
    'bot-inbox',
  ]);
  expect(host.querySelector('[data-subpanel-entry="sessions"] [data-body]')).not.toBeNull();
  expect(host.querySelector('[data-subpanel-entry="schedules"] [data-body]')).toBeNull();
  expect(registry.isOpen('sessions')).toBe(true);
  expect(readLayoutMode(storage).column.open).toBe(true);

  act(() => registry.toggle('botharness-browser'));
  await settle();
  expect(
    host.querySelector('[data-subpanel-entry="botharness-browser"] [data-body]'),
  ).not.toBeNull();
  expect(registry.isOpen('botharness-browser')).toBe(true);
  act(() => registry.toggle('botharness-browser'));
  await settle();
  expect(host.querySelector('[data-subpanel-entry="botharness-browser"] [data-body]')).toBeNull();
  expect(host.querySelector('[data-subpanel-column]')).not.toBeNull();

  await click('[data-subpanel-entry="bot-inbox"] [data-panel-head]');
  expect(inboxOpen).toBe(true);
  await click('[data-subpanel-entry="bot-inbox"] [data-panel-head]');
  expect(inboxOpen).toBe(false);

  const resize = host.querySelector<HTMLElement>(
    '[data-subpanel-entry="sessions"] .bh-subpanel-entry-resize',
  )!;
  act(() =>
    resize.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })),
  );
  await settle();
  expect(readLayoutMode(storage).column.heights['sessions']).toBe(336);

  const header = host.querySelector<HTMLElement>(
    '[data-subpanel-entry="schedules"] .bh-subpanel-entry-header',
  )!;
  act(() =>
    header.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 30, clientY: 40 }),
    ),
  );
  act(() => document.querySelector<HTMLButtonElement>('[data-menu-item="hide"]')!.click());
  await settle();
  expect(entries()).not.toContain('schedules');

  group = true;
  act(() => root.render(view()));
  await settle();
  expect(entries()).toEqual(['sessions', 'members', 'generated-files']);
  act(() => registry.open('botharness-browser'));
  await settle();
  expect(entries()).toEqual(['sessions', 'members', 'generated-files']);
  expect(readLayoutMode(storage).column.expanded).toEqual(['sessions']);

  act(() => registry.toggle('members'));
  await settle();
  expect(host.querySelector('[data-subpanel-entry="members"] [data-body]')).not.toBeNull();
  await click('[data-subpanel-column-toggle]');
  expect(host.querySelector('[data-subpanel-column]')).toBeNull();
  expect(registry.isOpen('members')).toBe(false);
  act(() => registry.open('schedules'));
  await settle();
  expect(host.querySelector('[data-subpanel-column]')).toBeNull();
});
