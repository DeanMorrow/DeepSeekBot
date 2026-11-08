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

it('locks a saved model and does not ask for a key that is already stored', async () => {
  const sent: Record<string, unknown>[] = [];
  let configured = false;
  const conceptArt: BridgeActions['conceptArt'] = async (payload) => {
    sent.push(payload);
    const body = payload as {
      action?: string;
      route?: { key?: string; models?: string[] };
      lock?: { model?: string };
    };
    if (body.action === 'saveRoute') {
      configured = true;
      expect(body.route?.key).toBe('sk-isolated-test');
      return { credentialConfigured: true, models: body.route?.models };
    }
    if (body.action === 'lockRoute') return { locked: true, model: body.lock?.model };
    return {
      protocols: [
        { protocol: 'openai-chat', capability: 'chat', baseUrl: 'https://api.apiyi.com/v1' },
        { protocol: 'openai-images', capability: 'image', baseUrl: 'https://api.apiyi.com/v1' },
      ],
      instances: configured
        ? [
            {
              id: 'openai-chat-apiyi-account',
              capability: 'chat',
              protocol: 'openai-chat',
              baseUrl: 'https://api.apiyi.com/v1',
              models: ['vendor-chat-a'],
              credentialRef: 'apiyi-account',
              credentialConfigured: true,
            },
          ]
        : [],
      chat: configured
        ? {
            locked: true,
            providerId: 'openai-chat-apiyi-account',
            model: 'vendor-chat-a',
            credentialConfigured: true,
          }
        : { locked: false },
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
  expect(host.textContent).toContain('conceptRoute.chat');
  expect(host.querySelector('input[type="password"]')).not.toBeNull();
  const fields = [...host.querySelectorAll('input')];
  const ref = fields.find(
    (field) => field.getAttribute('aria-label') === 'conceptRoute.credentialRef',
  );
  const model = fields.find(
    (field) => field.getAttribute('aria-label') === 'conceptRoute.modelName',
  );
  const secret = host.querySelector('input[type="password"]') as HTMLInputElement;
  const setValue = (field: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  };
  await act(async () => {
    setValue(ref as HTMLInputElement, 'apiyi-account');
    setValue(model as HTMLInputElement, 'vendor-chat-a');
    setValue(secret, 'sk-isolated-test');
  });
  const save = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'conceptRoute.save',
  ) as HTMLButtonElement;
  await act(async () => {
    save.click();
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(host.querySelector('input[type="password"]')).toBeNull();
  expect(host.textContent).toContain('conceptRoute.keyKept');
  expect(
    sent.some(
      (item) => JSON.stringify(item).includes('sk-isolated-test') && item['action'] !== 'saveRoute',
    ),
  ).toBe(false);
});
