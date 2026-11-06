// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';

import { ConceptArtSection } from '../src/client/concept-art-section.js';
import type { BridgeCall } from '../src/client/bridge.js';
import type { BotHarnessTranslate } from '../src/client/locale.js';

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
});

const t = ((key: string) => key) as BotHarnessTranslate;

function mount(call: BridgeCall): HTMLElement {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => {
    root.render(createElement(ConceptArtSection, { call, t }));
  });
  return host;
}

it('shows that concept art cannot start until chat and image are configured', async () => {
  const call: BridgeCall = async () => ({
    ok: true,
    value: { locked: false, credentialConfigured: false, chatReady: false },
  });
  const host = mount(call);
  await act(async () => {
    await Promise.resolve();
  });
  expect(host.textContent).toContain('conceptArt.notReady');
  const make = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'conceptArt.make',
  );
  expect(make?.hasAttribute('disabled') || (make as HTMLButtonElement | undefined)?.disabled).toBe(
    true,
  );
});
