// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';

import { ConceptRouteSettings } from '../src/client/concept-route-settings.js';
import type { BridgeActions } from '../src/client/actions.js';
import type { BotHarnessTranslate } from '../src/client/locale.js';

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
});

const t = ((key: string) => key) as BotHarnessTranslate;

it('asks for the DSH Models page account and does not open a second key field', async () => {
  const sent: Record<string, unknown>[] = [];
  const conceptArt: BridgeActions['conceptArt'] = async (payload) => {
    sent.push(payload);
    return { accounts: [], chat: { locked: false }, image: { locked: false } };
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  await act(async () => {
    root.render(createElement(ConceptRouteSettings, { conceptArt, t }));
    await Promise.resolve();
  });
  expect(host.textContent).toContain('conceptRoute.needAccount');
  expect(host.querySelector('input')).toBeNull();
  expect(host.querySelector('input[type="password"]')).toBeNull();
  expect(
    sent.some((item) => item['action'] === 'saveRoute' || item['action'] === 'bindAccount'),
  ).toBe(false);
});

it('locks chat and image from the same account without sending a key', async () => {
  const sent: Record<string, unknown>[] = [];
  let chat = '';
  let image = '';
  const conceptArt: BridgeActions['conceptArt'] = async (payload) => {
    sent.push(payload);
    const body = payload as {
      action?: string;
      bind?: { capability?: string; model?: string; key?: string };
    };
    if (body.action === 'bindAccount') {
      expect(body.bind?.key).toBeUndefined();
      if (body.bind?.capability === 'chat') chat = body.bind.model ?? '';
      if (body.bind?.capability === 'image') image = body.bind.model ?? '';
    }
    return {
      accounts: [
        {
          provider: 'apiyi-studio',
          displayName: 'API易',
          credentialRef: 'APIYI_STUDIO_API_KEY',
          credentialConfigured: true,
          models: ['chat-a', 'chat-b', 'image-a'],
          chatProtocol: 'openai-chat',
          baseUrl: 'https://api.apiyi.com/v1',
        },
      ],
      chat: { locked: chat !== '', model: chat, credentialConfigured: true },
      image: { locked: image !== '', model: image, credentialConfigured: true },
    };
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  await act(async () => {
    root.render(createElement(ConceptRouteSettings, { conceptArt, t }));
    await Promise.resolve();
  });
  expect(host.textContent).toContain('APIYI_STUDIO_API_KEY');
  expect(host.querySelector('input[type="password"]')).toBeNull();
  const choose = async (label: string, model: string) => {
    const select = host.querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement;
    await act(async () => {
      select.value = model;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
  };
  await choose('conceptRoute.chat', 'chat-b');
  await choose('conceptRoute.image', 'image-a');
  expect(sent.filter((item) => item['action'] === 'bindAccount')).toEqual([
    {
      action: 'bindAccount',
      bind: { capability: 'chat', provider: 'apiyi-studio', model: 'chat-b' },
    },
    {
      action: 'bindAccount',
      bind: { capability: 'image', provider: 'apiyi-studio', model: 'image-a' },
    },
  ]);
  expect(JSON.stringify(sent)).not.toContain('sk-');
});

it('does not treat a shared model name as a switch to the other account', async () => {
  const sent: Record<string, unknown>[] = [];
  const conceptArt: BridgeActions['conceptArt'] = async (payload) => {
    sent.push(payload);
    return {
      accounts: [
        {
          provider: 'apiyi-a',
          displayName: 'A',
          credentialRef: 'APIYI_A_API_KEY',
          credentialConfigured: true,
          models: ['shared-name'],
          chatProtocol: 'openai-chat',
          baseUrl: 'https://api.apiyi.com/v1',
        },
        {
          provider: 'apiyi-b',
          displayName: 'B',
          credentialRef: 'APIYI_B_API_KEY',
          credentialConfigured: true,
          models: ['shared-name'],
          chatProtocol: 'openai-chat',
          baseUrl: 'https://api.apiyi.com/v1',
        },
      ],
      chat: {
        locked: true,
        model: 'shared-name',
        accountProvider: 'apiyi-a',
        credentialRef: 'APIYI_A_API_KEY',
        protocol: 'openai-chat',
      },
      image: { locked: false },
    };
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  await act(async () => {
    root.render(createElement(ConceptRouteSettings, { conceptArt, t }));
    await Promise.resolve();
  });
  const account = host.querySelector(
    'select[aria-label="conceptRoute.account"]',
  ) as HTMLSelectElement;
  const chat = host.querySelector('select[aria-label="conceptRoute.chat"]') as HTMLSelectElement;
  expect(chat.value).toBe('shared-name');
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    setter?.call(account, 'apiyi-b');
    account.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(chat.value).toBe('');
  expect(host.textContent).toContain('conceptRoute.savedLock');
  expect(host.textContent).toContain('apiyi-a / shared-name');
  expect(sent.some((item) => item['action'] === 'bindAccount')).toBe(false);
});
