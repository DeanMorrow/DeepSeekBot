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

it('shows the read-back image and a save link without calling it verified', async () => {
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const call: BridgeCall = async (_endpoint, payload) => {
    const action = (payload as { action?: string }).action;
    if (action === 'status') {
      return { ok: true, value: { locked: true, credentialConfigured: true, chatReady: true } };
    }
    if (action === 'open') return { ok: true, value: { status: 'READY', sessionId: 'session-1' } };
    if (action === 'styles') return { ok: true, value: { styles: [], unassignedCount: 0 } };
    if (action === 'cancel') return { ok: true, value: { artifact: null } };
    return {
      ok: true,
      value: {
        status: 'ALLOWED',
        idempotencyKey: 'op-1',
        userVisible: true,
        preview: png,
        quality: 'unverified',
        mediaVerified: false,
        delivery: 'mounted-unverified',
      },
    };
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  await act(async () => {
    root.render(createElement(ConceptArtSection, { call, t, botSlug: 'ada' }));
    await Promise.resolve();
    await Promise.resolve();
  });
  const field = host.querySelector('textarea');
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(field, '一张码头');
    field?.dispatchEvent(new Event('input', { bubbles: true }));
    field?.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const make = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'conceptArt.make',
  ) as HTMLButtonElement;
  await act(async () => {
    make.click();
    await Promise.resolve();
  });
  const image = host.querySelector('img');
  expect(image?.getAttribute('alt')).toBe('conceptArt.preview');
  expect(image?.getAttribute('src')).toBe(`data:image/png;base64,${png}`);
  expect(host.querySelector('a')?.getAttribute('download')).toBe('concept-art.png');
  expect(host.textContent).not.toContain('mediaVerified:true');
  const cancel = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'conceptArt.cancel',
  ) as HTMLButtonElement;
  await act(async () => {
    cancel.click();
    await Promise.resolve();
  });
  expect(host.querySelector('img')).toBeNull();
});

it('sends the held proposal key and drops a stale requirement before confirming', async () => {
  const sent: {
    action?: string;
    request?: { route_idempotency_key?: string; confirmedPrompt?: string };
  }[] = [];
  const proposal = '水彩码头\n不要沙漠航拍';
  const call: BridgeCall = async (_endpoint, payload) => {
    const body = payload as {
      action?: string;
      request?: { route_idempotency_key?: string; confirmedPrompt?: string };
    };
    sent.push(body);
    if (body.action === 'status') {
      return { ok: true, value: { locked: true, credentialConfigured: true, chatReady: true } };
    }
    if (body.action === 'open')
      return { ok: true, value: { status: 'READY', sessionId: 'session-1' } };
    if (body.action === 'styles') return { ok: true, value: { styles: [], unassignedCount: 0 } };
    if (body.request?.confirmedPrompt !== undefined) {
      return {
        ok: true,
        value: {
          status: 'ALLOWED',
          fidelity: 'user-accepted-unverified',
          promptSource: 'user-accepted-model-addition',
          userVisible: false,
        },
      };
    }
    return {
      ok: true,
      value: {
        status: 'NEEDS_CONFIRMATION',
        proposedPrompt: proposal,
        idempotencyKey: 'proposal-hash',
        fidelity: 'unverified-model-addition',
        promptSource: 'model-addition-held',
      },
    };
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  await act(async () => {
    root.render(createElement(ConceptArtSection, { call, t, botSlug: 'ada' }));
    await Promise.resolve();
    await Promise.resolve();
  });
  const field = host.querySelector('textarea');
  const setValue = (value: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(field, value);
    field?.dispatchEvent(new Event('input', { bubbles: true }));
    field?.dispatchEvent(new Event('change', { bubbles: true }));
  };
  await act(async () => {
    setValue('水彩码头');
  });
  const make = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'conceptArt.make',
  ) as HTMLButtonElement;
  await act(async () => {
    make.click();
    await Promise.resolve();
  });
  const confirm = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'conceptArt.confirm',
  ) as HTMLButtonElement;
  expect(confirm).toBeTruthy();
  await act(async () => {
    confirm.click();
    await Promise.resolve();
  });
  const confirmed = sent.find((item) => item.request?.confirmedPrompt !== undefined);
  expect(confirmed?.request?.route_idempotency_key).toBe('proposal-hash');
  expect(confirmed?.request?.route_idempotency_key).not.toBe(`concept-confirm-${proposal.length}`);
  await act(async () => {
    setValue('水彩码头');
    make.click();
    await Promise.resolve();
  });
  expect(
    [...host.querySelectorAll('button')].some(
      (button) => button.textContent === 'conceptArt.confirm',
    ),
  ).toBe(true);
  await act(async () => {
    setValue('水彩');
  });
  expect(
    [...host.querySelectorAll('button')].some(
      (button) => button.textContent === 'conceptArt.confirm',
    ),
  ).toBe(false);
  expect(sent.filter((item) => item.request?.confirmedPrompt !== undefined)).toHaveLength(1);
});

it('unlocks confirmation after a rejection and does not send it again until the user confirms', async () => {
  let confirmations = 0;
  const call: BridgeCall = async (_endpoint, payload) => {
    const body = payload as { action?: string; request?: { confirmedPrompt?: string } };
    if (body.action === 'status') {
      return { ok: true, value: { locked: true, credentialConfigured: true, chatReady: true } };
    }
    if (body.action === 'open')
      return { ok: true, value: { status: 'READY', sessionId: 'session-1' } };
    if (body.action === 'styles') return { ok: true, value: { styles: [], unassignedCount: 0 } };
    if (body.request?.confirmedPrompt !== undefined) {
      confirmations += 1;
      if (confirmations === 1) {
        return {
          ok: false,
          error: { code: 'unavailable', message: 'confirm failed', details: {} },
        };
      }
      return {
        ok: true,
        value: { status: 'ALLOWED', fidelity: 'user-accepted-unverified', userVisible: false },
      };
    }
    return {
      ok: true,
      value: {
        status: 'NEEDS_CONFIRMATION',
        proposedPrompt: '水彩码头\n增加两个路人',
        idempotencyKey: 'proposal-hash',
      },
    };
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  await act(async () => {
    root.render(createElement(ConceptArtSection, { call, t, botSlug: 'ada' }));
    await Promise.resolve();
    await Promise.resolve();
  });
  const field = host.querySelector('textarea');
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(field, '水彩码头');
    field?.dispatchEvent(new Event('input', { bubbles: true }));
    field?.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const make = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'conceptArt.make',
  ) as HTMLButtonElement;
  await act(async () => {
    make.click();
    await Promise.resolve();
  });
  const confirmButton = () =>
    [...host.querySelectorAll('button')].find(
      (button) => button.textContent === 'conceptArt.confirm',
    ) as HTMLButtonElement;
  await act(async () => {
    confirmButton().click();
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(confirmations).toBe(1);
  expect(host.textContent).toContain('confirm failed');
  expect(confirmButton()).toBeTruthy();
  await act(async () => {
    await Promise.resolve();
  });
  expect(confirmations).toBe(1);
  await act(async () => {
    confirmButton().click();
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(confirmations).toBe(2);
  expect(confirmButton()).toBeUndefined();
});
