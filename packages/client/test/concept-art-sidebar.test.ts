// @vitest-environment jsdom
import { act, createElement, type PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => {
  const stub = () => null;
  const Tag = ({ children }: PropsWithChildren) => createElement('span', null, children);
  return {
    Button: ({
      children,
      onClick,
      disabled,
    }: PropsWithChildren<{ onClick?(): void; disabled?: boolean }>) =>
      createElement('button', { onClick, disabled }, children),
    Input: stub,
    Tag,
    StateDot: stub,
    IconChevronDownOutlineRegular: stub,
    IconCloseOutlineRegular: stub,
  };
});

import { createChannelSidebarBuiltins } from '../src/client/channel-sidebar-builtins.js';
import { createChannelSidebarRegistry } from '../src/client/channel-sidebar.js';
import { createDockPanelRegistry } from '../src/client/dock-panels.js';
import { zhTranslate } from '../src/client/locale.js';
import type { BridgeActions } from '../src/client/actions.js';

describe('concept art sidebar entry', () => {
  it('registers concept art in the same sidebar list and dock registry', () => {
    const entry = createChannelSidebarBuiltins(zhTranslate).find(
      (item) => item.id === 'concept-art',
    );
    expect(entry).toMatchObject({
      scope: 'personabot',
      label: '概念图',
    });
    const dock = createDockPanelRegistry();
    const sidebar = createChannelSidebarRegistry(dock);
    sidebar.register(entry!);
    expect(
      dock.panels().some((panel) => panel.id === 'concept-art' && panel.title === '概念图'),
    ).toBe(true);
  });

  it('renders the existing concept art section for that Bot', async () => {
    const entry = createChannelSidebarBuiltins(zhTranslate).find(
      (item) => item.id === 'concept-art',
    )!;
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const actions = {
      conceptArt: async (payload: { action?: string }) => {
        if (payload.action === 'status')
          return { locked: false, credentialConfigured: false, chatReady: false };
        if (payload.action === 'open') return { sessionId: 'session-1' };
        return { styles: [] };
      },
    } as unknown as BridgeActions;
    await act(async () => {
      root.render(
        createElement(entry.component, {
          scope: 'personabot',
          channelId: 'dm-1',
          botSlug: 'tob',
          actions,
          t: zhTranslate,
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(host.textContent).toContain('还没锁定');
    expect(host.textContent).toContain('不是成品图');
    act(() => root.unmount());
    host.remove();
  });
});
