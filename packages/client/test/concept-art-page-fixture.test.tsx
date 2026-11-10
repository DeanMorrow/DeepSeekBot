// @vitest-environment jsdom
// Synthetic fixture loop. The injected fetch never leaves the test.
// A passing preview is parsed fixture bytes, not a provider image.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';

import { createAttachmentStore } from '../../core/src/attachments/store.js';
import {
  attachOperationalModule,
  mountOperationalDatabase,
} from '../../core/src/database/owner.js';
import { BOT_HARNESS_SCHEMA_PLAN } from '../../core/src/database/schema-plan.js';
import { createConceptArtBridge } from '../../core/src/models/concept-art-bridge.js';
import { createConceptArtConsumer } from '../../core/src/models/concept-art-consumer.js';
import {
  createMemorySecretStore,
  createSharedModelRoute,
} from '../../core/src/models/shared-route.js';
import { createSessionOwnership } from '../../core/src/sessions/ownership.js';
import { createTempRoot, FIXED_NOW, trackTestOwner } from '../../core/test/helpers.js';
import { ConceptArtSection, resetConceptArtLease } from '../src/client/concept-art-section.js';
import type { BridgeCall } from '../src/client/bridge.js';
import type { BotHarnessTranslate } from '../src/client/locale.js';

const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const t = ((key: string) => key) as BotHarnessTranslate;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const roots: Root[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  resetConceptArtLease();
});

type Mode = 'echo' | 'addition' | 'contradict';

async function page() {
  const home = createTempRoot('concept-page-');
  const owner = trackTestOwner(
    mountOperationalDatabase({
      dshHome: home,
      schemaPlan: BOT_HARNESS_SCHEMA_PLAN,
      now: FIXED_NOW,
    }),
  );
  const database = attachOperationalModule(owner, 'concept-art');
  const ownership = createSessionOwnership(attachOperationalModule(owner, 'session-ownership'));
  for (const [sessionId, botSlug] of [
    ['fixture-ctx-1', 'ada'],
    ['fixture-ctx-2', 'bea'],
  ] as const) {
    ownership.claim({
      sessionId,
      botSlug,
      rootRole: 'orchestrator',
      at: FIXED_NOW().toISOString(),
    });
  }
  const calls: string[] = [];
  let mode: Mode = 'echo';
  let imageFailures = 0;
  let imageGate: Promise<void> | undefined;
  let releaseHeld = (): void => undefined;
  const secrets = createMemorySecretStore();
  await secrets.put('APIYI_STUDIO_API_KEY', 'fixture-not-a-provider-key');
  const route = createSharedModelRoute(database, secrets, {
    now: () => FIXED_NOW().toISOString(),
    fetch: async (input, init) => {
      const url = String(input);
      calls.push(url);
      expect(url.startsWith('https://api.apiyi.com/')).toBe(true);
      if (url.includes('/images/generations')) {
        if (imageFailures > 0) {
          imageFailures -= 1;
          return new Response('fixture-image-down', { status: 503 });
        }
        if (imageGate !== undefined) await imageGate;
        return new Response(JSON.stringify({ data: [{ b64_json: PNG }] }), { status: 200 });
      }
      const content =
        (JSON.parse(String(init?.body)) as { messages?: { content?: string }[] }).messages?.[0]
          ?.content ?? '';
      if (content.includes('TASK:generate-style')) {
        const note = content.split('NOTE_START\n')[1]?.split('\nNOTE_END')[0] ?? '';
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: `NOTE_START\n${note}\nNOTE_END\nDEF_START\n${note} style\nDEF_END`,
                },
              },
            ],
          }),
          { status: 200 },
        );
      }
      const raw = content.split('RAW_START\n')[1]?.split('\nRAW_END')[0] ?? '';
      const mechanical = content.split('PROMPT_START\n')[1]?.split('\nPROMPT_END')[0] ?? raw;
      const prompt =
        mode === 'addition'
          ? `${raw}\n多一盏灯`
          : mode === 'contradict'
            ? `不要${raw}。改成沙漠航拍。`
            : mechanical;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: `RAW_START\n${raw}\nRAW_END\nPROMPT_START\n${prompt}\nPROMPT_END`,
              },
            },
          ],
        }),
        { status: 200 },
      );
    },
  });
  const account = {
    provider: 'studio',
    displayName: 'Fixture studio',
    credentialRef: 'APIYI_STUDIO_API_KEY',
    credentialConfigured: true,
    api: 'openai-completions' as const,
    baseUrl: 'https://api.apiyi.com/v1',
    models: ['chat-a', 'img-a'],
    chatProtocol: 'openai-chat' as const,
    imageProtocol: 'openai-images' as const,
    allowlist: 'user-entered-not-provider-checked' as const,
  };
  const consumer = createConceptArtConsumer({
    database,
    ownership,
    route,
    limits: {
      maxEncodedBytes: 2_000_000,
      maxDecodedBytes: 2_000_000,
      maxPixels: 4_000_000,
      allowlist: ['image/png', 'image/jpeg', 'image/webp'],
    },
    accounts: async () => [account],
    describeLock: (consumerName, capability) => route.describeConsumer(consumerName, capability),
  });
  const attachments = createAttachmentStore({
    rootDir: mkdtempSync(join(tmpdir(), 'concept-page-bytes-')),
  });
  const bridge = createConceptArtBridge({
    conceptArt: consumer,
    sharedRoute: route,
    attachments,
    sessionForBot: (botSlug) => (botSlug === 'bea' ? 'fixture-ctx-2' : 'fixture-ctx-1'),
    apiyiAccounts: async () => [account],
  });
  const call: BridgeCall = async (method, payload) => {
    if (method !== 'conceptArt') throw new Error(method);
    return (await bridge.conceptArt(payload)) as unknown as Awaited<ReturnType<BridgeCall>>;
  };
  return {
    call,
    calls,
    bridge,
    setMode: (next: Mode) => {
      mode = next;
    },
    failNextImage: () => {
      imageFailures += 1;
    },
    holdImage: () => {
      imageGate = new Promise<void>((resolve) => {
        releaseHeld = resolve;
      });
    },
    releaseHeldImage: () => {
      imageGate = undefined;
      releaseHeld();
    },
    imageCalls: () => calls.filter((url) => url.includes('/images/generations')).length,
  };
}

async function mount(call: BridgeCall, botSlug?: string): Promise<void> {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  await act(async () => {
    root.render(
      createElement(ConceptArtSection, {
        t,
        call,
        ...(botSlug === undefined ? {} : { botSlug }),
      }),
    );
  });
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function until(part: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await settle();
    if (document.body.textContent?.includes(part)) return;
  }
  throw new Error(document.body.textContent ?? '');
}

function controlOrNull(label: string): HTMLButtonElement | null {
  const found = [...document.querySelectorAll('button, textarea, select')].find(
    (node) => node.getAttribute('aria-label') === label || node.textContent === label,
  );
  return (found as HTMLButtonElement | undefined) ?? null;
}

function control(label: string): HTMLButtonElement | HTMLTextAreaElement | HTMLSelectElement {
  const found = controlOrNull(label);
  if (found === null) throw new Error(`missing ${label}`);
  return found;
}

async function typeRaw(value: string): Promise<void> {
  const field = control('conceptArt.raw') as HTMLTextAreaElement;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function choose(value: string): Promise<void> {
  const select = control('conceptArt.style') as HTMLSelectElement;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    setter?.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function click(label: string): Promise<void> {
  await act(async () => {
    (control(label) as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

it('drives the concept-art section through fixture success, refusal and cancel', async () => {
  const env = await page();
  for (const [capability, model] of [
    ['chat', 'chat-a'],
    ['image', 'img-a'],
  ] as const) {
    const bound = await env.bridge.conceptArt({
      action: 'bindAccount',
      bind: { capability, provider: 'studio', model },
    });
    expect(bound).toMatchObject({ ok: true });
  }
  for (const [styleRef, note] of [
    ['ink', 'ink-line'],
    ['wash', 'wash-light'],
  ] as const) {
    const saved = await env.bridge.conceptArt({
      action: 'generateStyle',
      sessionId: 'fixture-ctx-1',
      botSlug: 'ada',
      styleRef,
      note,
    });
    expect(saved).toMatchObject({ ok: true, value: { status: 'ALLOWED', def: `${note} style` } });
  }
  const listed = await env.bridge.conceptArt({
    action: 'styles',
    botSlug: 'ada',
    sessionId: 'fixture-ctx-1',
  });
  if (!JSON.stringify(listed).includes('ink-line style')) throw new Error(JSON.stringify(listed));
  const beforePage = env.imageCalls();
  await mount(env.call, 'ada');
  await settle();
  expect(document.body.textContent).toContain('conceptArt.ready');
  expect(env.imageCalls()).toBe(beforePage);

  await typeRaw('码头的人');
  const makeButton = control('conceptArt.make') as HTMLButtonElement;
  if (makeButton.disabled) throw new Error(`disabled ${document.body.textContent}`);
  await click('conceptArt.make');
  for (let i = 0; i < 10 && document.querySelector('img') === null; i += 1) await settle();
  if (document.querySelector('img') === null) {
    throw new Error(document.body.textContent ?? '');
  }
  const preview = document.querySelector('img') as HTMLImageElement;
  expect(preview.alt).toBe('conceptArt.preview');
  expect(preview.src).toContain(PNG);
  expect(document.body.textContent).toContain('mediaVerified:false');
  const saved = document.querySelector('a[download="concept-art.png"]') as HTMLAnchorElement;
  expect(saved.href).toBe(preview.src);
  const directImages = env.imageCalls();
  expect(directImages).toBe(beforePage + 1);
  expect(env.calls.filter((url) => url.includes('api.apiyi.com')).length).toBeGreaterThan(0);
  expect(env.calls.some((url) => url.includes('example.com'))).toBe(false);

  await choose('ink');
  await click('conceptArt.make');
  await until('ink-line style');
  expect(document.body.textContent).not.toContain('wash-light style');

  await choose('wash');
  await click('conceptArt.make');
  await until('wash-light style');
  expect(document.body.textContent).not.toContain('ink-line style');

  await choose('disabled');
  expect(document.body.textContent).toContain('style:disabled');
  await typeRaw('只要码头');
  await click('conceptArt.make');
  await until('raw:只要码头');
  expect(document.body.textContent).not.toContain('wash-light style');
  expect(document.body.textContent).not.toContain('ink-line style');

  env.setMode('contradict');
  const imagesBeforeConflict = env.imageCalls();
  await click('conceptArt.make');
  await until('NEEDS_CONFIRMATION');
  expect(document.body.textContent).toContain('不要只要码头');
  expect(env.imageCalls()).toBe(imagesBeforeConflict);
  expect(document.querySelector('img')).toBeNull();

  env.setMode('addition');
  await typeRaw('夜色码头');
  await click('conceptArt.make');
  await until('多一盏灯');
  expect(document.body.textContent).toContain('conceptArt.confirm');
  const imagesAtSwitch = env.imageCalls();
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  await mount(env.call, 'bea');
  await until('session:ready');
  expect(document.body.textContent).not.toContain('夜色码头');
  expect(controlOrNull('conceptArt.confirm')).toBeNull();
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  await mount(env.call);
  await until('session:missing');
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  await mount(env.call, 'ada');
  await until('conceptArt.ready');
  expect(env.imageCalls()).toBe(imagesAtSwitch);
  const imagesBeforeReject = env.imageCalls();
  await typeRaw('夜色码头改了');
  await settle();
  expect(document.body.textContent).not.toContain('conceptArt.confirm');
  expect(env.imageCalls()).toBe(imagesBeforeReject);

  await typeRaw('重开的夜色');
  await click('conceptArt.make');
  for (
    let attempt = 0;
    attempt < 20 && controlOrNull('conceptArt.confirm') === null;
    attempt += 1
  ) {
    await settle();
  }
  if (controlOrNull('conceptArt.confirm') === null)
    throw new Error(document.body.textContent ?? '');
  env.failNextImage();
  const beforeFailedConfirm = env.imageCalls();
  await click('conceptArt.confirm');
  await until('NOT_COMPLETED');
  await settle();
  expect(env.imageCalls()).toBe(beforeFailedConfirm + 1);
  expect(document.querySelector('img')).toBeNull();
  expect(controlOrNull('conceptArt.confirm')).not.toBeNull();
  await click('conceptArt.confirm');
  for (let attempt = 0; attempt < 20 && document.querySelector('img') === null; attempt += 1) {
    await settle();
  }
  expect((document.querySelector('img') as HTMLImageElement).src).toContain(PNG);
  expect(env.imageCalls()).toBe(imagesBeforeReject + 2);

  env.setMode('echo');
  env.holdImage();
  await typeRaw('取消这张');
  const pending = click('conceptArt.make');
  await settle();
  expect((control('conceptArt.cancel') as HTMLButtonElement).disabled).toBe(false);
  await click('conceptArt.cancel');
  env.releaseHeldImage();
  await pending;
  await settle();
  expect(document.querySelector('img')).toBeNull();
  expect(document.body.textContent).toContain('userVisible:false');
});
