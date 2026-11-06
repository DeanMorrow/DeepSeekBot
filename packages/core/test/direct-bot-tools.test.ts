import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { Context } from '@deepseek-ai/cordis';
import { createBotSubagentModelTools } from '../src/runtime/subagent-model-tools.js';
import { PRIVATE_INPUT_TOOLS } from '../src/credentials/tool-contract.js';
import { TAKEOVER_TOOLS } from '../src/takeover/contracts.js';

import { createChannelStore } from '../src/channels/store.js';
import { attachOperationalModule, mountOperationalDatabase } from '../src/database/owner.js';
import { BOT_HARNESS_SCHEMA_PLAN } from '../src/database/schema-plan.js';
import { directToolTrace } from '../src/bots/tool-trace.js';
import { createBotRuntime } from '../src/runtime/bot-runtime.js';
import { createSessionOwnership } from '../src/sessions/ownership.js';
import {
  createDshBotAgentAdapter,
  TURN_ONLY_BOT_TOOLS,
} from '../src/runtime/dsh-bot-agent-adapter.js';
import { FakeAgentHost } from './dsh-agent-host-fixture.js';
import { createTempRoot, FIXED_NOW, trackTestOwner } from './helpers.js';
import { createTestRegistry } from './registry-fixture.js';
import { createTestWorkspaceGrants } from './workspace-grant-fixture.js';

const repo = join(import.meta.dirname, '../../..');

function botToolNamesFrom(source: string): string[] {
  const block = /const BOT_TOOL_NAMES = new Set\(\[([\s\S]*?)\]\)/.exec(source);
  return block === null ? [] : [...block[1]!.matchAll(/'([a-z_]+)'/g)].map((name) => name[1]!);
}

function setup() {
  const home = createTempRoot('botharness-direct-tools-');
  const registry = createTestRegistry({ rootDir: join(home, 'bots'), now: FIXED_NOW });
  expect(registry.create({ slug: 'ada', displayName: 'Ada' }).ok).toBe(true);
  const channels = createChannelStore({ rootDir: join(home, 'channels'), now: FIXED_NOW });
  const dm = channels.getOrCreateDm('ada', 'Ada')!;
  const owner = trackTestOwner(
    mountOperationalDatabase({ dshHome: home, schemaPlan: BOT_HARNESS_SCHEMA_PLAN }),
  );
  const host = new FakeAgentHost({ kind: 'completed' });
  const agents = createDshBotAgentAdapter({
    agents: host,
    defaultModel: { currentSelection: () => ({ provider: 'test', model: 'test' }) },
    orchestratorCwd: () => {
      const dir = join(home, 'memory');
      mkdirSync(dir, { recursive: true });
      return dir;
    },
    workspaceGrants: () => {
      const dir = join(home, 'project');
      mkdirSync(dir, { recursive: true });
      return [{ id: 'grant-1', workspacePath: dir }];
    },
    ensureWorkspace: () => undefined,
    subagentTools: () => createBotSubagentModelTools({} as Context, () => undefined),
  });
  const ownership = createSessionOwnership(attachOperationalModule(owner, 'session-ownership'));
  const runtime = createBotRuntime({
    database: owner,
    ownership,
    grants: createTestWorkspaceGrants(owner, home),
    registry,
    channels,
    agents,
    now: FIXED_NOW,
  });
  return { runtime, channels, dm, host, registry, ownership };
}

describe('direct Bot tool runner', () => {
  it('registers super_agent_run and refuses dispatch without a grant (test executor, not a model)', async () => {
    const { runtime } = setup();
    const signal = new AbortController().signal;
    expect(runtime.directBotTools!().map((tool) => tool.name)).toContain('super_agent_run');
    expect(TURN_ONLY_BOT_TOOLS.has('super_agent_run')).toBe(false);
    const refused = await runtime.runDirectBotTool!(
      'ada',
      'super_agent_run',
      { order_ids: '["not-a-sealed-order"]', grant_id: 'missing' },
      signal,
    );
    expect(refused.result).toMatchObject({
      ok: false,
      reason: 'grant-unauthorized',
      officialInstalled: false,
      executor: 'host-assignment',
      liveModelDispatch: false,
      scheduled: false,
      mayIncurModelCost: false,
      dispatched: [],
    });
  });

  it('runs pack memory on the Host Bot through the direct tool chain (test executor, not a model)', async () => {
    const { runtime } = setup();
    const signal = new AbortController().signal;
    const added = await runtime.runDirectBotTool!(
      'ada',
      'pack_private_add',
      { task: '打开错误页', lesson: '先看父级' },
      signal,
    );
    expect(added.result).toMatchObject({ ok: true, ownerBotId: 'ada' });
    const id = (added.result as { id: string }).id;
    await expect(
      runtime.runDirectBotTool!('ada', 'pack_private_read', { id, actor: 'bee' }, signal),
    ).resolves.toMatchObject({ result: { ok: false, reason: 'actor-mismatch' } });
    await expect(
      runtime.runDirectBotTool!('ada', 'pack_private_read', { id }, signal),
    ).resolves.toMatchObject({
      result: { ok: true, record: { lesson: '先看父级', ownerBotId: 'ada' } },
    });
    const shared = await runtime.runDirectBotTool!(
      'ada',
      'pack_shared_publish',
      {
        grant_id: 'grant-1',
        task: '打开错误页',
        lesson: '先看父级容器',
        approved: true,
        desensitized: true,
      },
      signal,
    );
    expect(shared.result).toMatchObject({ ok: true });
    const recalled = await runtime.runDirectBotTool!(
      'ada',
      'pack_recall',
      { task: '打开错误页', grant_id: 'grant-1' },
      signal,
    );
    expect(recalled.result).toMatchObject({
      ok: true,
      privateHits: [expect.objectContaining({ lesson: '先看父级' })],
      sharedHits: [expect.objectContaining({ lesson: '先看父级容器' })],
    });
    const migrated = await runtime.runDirectBotTool!(
      'ada',
      'pack_migrate',
      { seed_dir: join(repo, 'adapters/tobs-thinking/seed') },
      signal,
    );
    expect(migrated.result).toMatchObject({
      ok: true,
      copied: expect.arrayContaining(['the-top-thinking']),
    });
    const catalog = await runtime.runDirectBotTool!('ada', 'pack_catalog', {}, signal);
    const view = catalog.result as {
      directOmissionMeansModelLoadFailed: boolean;
      modelSkillCatalog: string;
      inventories: Array<{ id: string; status: string; briefs?: unknown[]; entry?: string | null }>;
    };
    expect(view.directOmissionMeansModelLoadFailed).toBe(false);
    expect(view.modelSkillCatalog).toBe('untested');
    expect(view.inventories.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'skills',
        'bots',
        'plugin-tools',
        'modules',
        'templates',
        'ops-asset-catalog',
      ]),
    );
    expect(view.inventories.find((item) => item.id === 'skills')?.status).toBe('active');
    expect(view.inventories.find((item) => item.id === 'ops-asset-catalog')).toMatchObject({
      status: 'unreachable',
      entry: null,
    });
    expect(JSON.stringify(view)).not.toContain('memory/private');
    expect(
      existsSync(join(repo, 'adapters/tobs-thinking/seed/.dsh/skills/the-top-thinking/SKILL.md')),
    ).toBe(true);
  });

  it('keeps the native skill tool off the direct catalog', async () => {
    const { runtime } = setup();
    try {
      const names = runtime.directBotTools!().map((tool) => tool.name);
      expect(names).not.toContain('skill');
      await expect(
        runtime.runDirectBotTool!(
          'ada',
          'skill',
          { name: 'the-top-thinking' },
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ code: 'tool-not-direct' });
    } finally {
      await runtime.close();
    }
  });

  it('removes obsolete delivery tools from the catalog and refuses direct execution', async () => {
    const { runtime } = setup();
    try {
      const names = runtime.directBotTools!().map((tool) => tool.name);
      for (const name of [
        'channel_send',
        'bridge_reply',
        'bridge_reply_file',
        'bridge_post',
        'bot_dm_send',
      ]) {
        expect(names).not.toContain(name);
        await expect(
          runtime.runDirectBotTool!('ada', name, {}, new AbortController().signal),
        ).rejects.toMatchObject({ code: 'tool-not-direct' });
      }
    } finally {
      await runtime.close();
    }
  });
  it('delivers an explicit local message through the same tool without a model turn', async () => {
    const { runtime, channels, dm, host } = setup();
    try {
      const sent = await runtime.runDirectBotTool!(
        'ada',
        'bot_send_message',
        { channel_id: dm.id, body: 'The checks passed.', end_turn: true },
        new AbortController().signal,
      );
      expect(sent.result).toMatchObject({
        channelId: dm.id,
        status: 'committed',
        inboxResolution: { outcome: 'not-requested' },
      });
      expect(channels.readMessages(dm.id)).toContainEqual(
        expect.objectContaining({
          body: 'The checks passed.',
          author: { kind: 'bot', slug: 'ada' },
        }),
      );
      expect(host.sessions).toHaveLength(0);
    } finally {
      await runtime.close();
    }
  });

  it('requests a workspace through the same production tool without the model', async () => {
    const { runtime, channels, dm } = setup();
    try {
      await runtime.runDirectBotTool!(
        'ada',
        'request_workspace_grant',
        { reason: 'Write the selected project', channel_id: dm.id },
        new AbortController().signal,
      );
      expect(channels.readMessages(dm.id)).toContainEqual(
        expect.objectContaining({ grantRequest: true, body: 'Write the selected project' }),
      );
    } finally {
      await runtime.close();
    }
  });

  it('lists runtime Bot tools while cloud_work has its dedicated direct CLI', () => {
    const { runtime } = setup();
    const listed = runtime.directBotTools!().map((tool) => tool.name);
    expect(listed).toContain('channel_list');
    expect(listed).toContain('bot_schedule_create');
    expect(listed).toContain('bridge_targets');
    for (const name of TURN_ONLY_BOT_TOOLS) expect(listed).not.toContain(name);
    const channelList = runtime.directBotTools!().find((tool) => tool.name === 'channel_list');
    expect(channelList?.inputSchema).toMatchObject({
      type: 'object',
      properties: { channel_id: { type: 'string' } },
    });

    const botTools = botToolNamesFrom(
      readFileSync(join(repo, 'packages/core/src/workspaces/grant-execution.ts'), 'utf8'),
    );
    const exempt = Object.keys(
      JSON.parse(readFileSync(join(repo, 'scripts/cli-parity-baseline.json'), 'utf8')).tools,
    );
    expect(listed.filter((name) => botTools.includes(name)).sort()).toEqual(
      botTools
        .filter(
          (name) =>
            !exempt.includes(name) &&
            name !== 'cloud_work' &&
            !PRIVATE_INPUT_TOOLS.has(name) &&
            !TAKEOVER_TOOLS.has(name),
        )
        .sort(),
    );
    expect(listed.every((name) => botTools.includes(name))).toBe(true);
    expect(botTools).toContain('cloud_work');
    expect(exempt).not.toContain('cloud_work');
    expect(readFileSync(join(repo, 'packages/core/src/bots/cli-live.ts'), 'utf8')).toContain(
      "command: 'cloud-work'",
    );
  });

  it('runs a Bot tool as that Bot without a model turn and records it as session direct', async () => {
    const { runtime, channels, dm, host } = setup();
    const signal = new AbortController().signal;
    const listed = await runtime.runDirectBotTool!('ada', 'channel_list', {}, signal);
    expect(listed).toMatchObject({
      tool: 'channel_list',
      sessionId: 'direct',
      result: { channels: [{ id: dm.id, kind: 'human-dm' }] },
    });

    const sent = await runtime.runDirectBotTool!(
      'ada',
      'bot_send_message',
      { body: 'direct hello', channel_id: dm.id },
      signal,
    );
    const messageId = (sent.result as { messageId: string }).messageId;
    expect(channels.message(dm.id, messageId)).toMatchObject({
      body: 'direct hello',
      author: { kind: 'bot', slug: 'ada' },
    });
    expect(host.sessions).toHaveLength(0);

    const calls = runtime.directBotToolCalls!('ada');
    expect(calls.map((call) => [call.tool, call.outcome])).toEqual([
      ['channel_list', 'ok'],
      ['bot_send_message', 'ok'],
    ]);
    expect(directToolTrace(calls, { turns: 1 })).toEqual([
      {
        turn: 2,
        startedAt: calls[1]!.at,
        endReason: 'direct',
        noToolCalls: false,
        calls: [
          {
            name: 'bot_send_message',
            callId: calls[1]!.callId,
            args: { body: 'direct hello', channel_id: dm.id },
            outcome: 'ok',
            result: expect.stringContaining(messageId),
          },
        ],
      },
    ]);
  });

  it('keeps the tool checks and refuses what cannot run outside a Bot turn with codes', async () => {
    const { runtime, registry } = setup();
    const signal = new AbortController().signal;
    await expect(
      runtime.runDirectBotTool!('ada', 'bot_send_message', { body: 'no channel' }, signal),
    ).rejects.toThrow(/exactly one trusted reply source/);
    await expect(
      runtime.runDirectBotTool!('ada', 'channel_list', { limit: 'many' }, signal),
    ).rejects.toMatchObject({ code: 'invalid-args' });
    await expect(
      runtime.runDirectBotTool!('ada', 'create_assignment', {}, signal),
    ).rejects.toMatchObject({ code: 'tool-not-direct' });
    await expect(
      runtime.runDirectBotTool!('ada', 'ask_user_question', {}, signal),
    ).rejects.toMatchObject({ code: 'tool-not-direct' });
    await expect(
      runtime.runDirectBotTool!('nobody', 'channel_list', {}, signal),
    ).rejects.toMatchObject({ code: 'unknown-bot' });
    expect(runtime.directBotToolCalls!('ada').map((call) => call.outcome)).toEqual([
      'error',
      'error',
    ]);
    expect(registry.setPaused('ada', true).ok).toBe(true);
    await expect(
      runtime.runDirectBotTool!('ada', 'channel_list', {}, signal),
    ).rejects.toMatchObject({ code: 'bot-paused' });
  });

  it("runs Subagent tools only on one of the Bot's Assignment Sessions", async () => {
    const { runtime, host, ownership } = setup();
    const signal = new AbortController().signal;
    const at = '2026-10-27T00:00:00.000Z';
    ownership.claim({ sessionId: 'orch-1', botSlug: 'ada', rootRole: 'orchestrator', at });
    ownership.claim({ sessionId: 'assign-1', botSlug: 'ada', rootRole: 'assignment', at });
    const execute = vi.fn(async () => ({ isError: false, value: 'child done' }));
    const parent = { id: 'assign-1', ctx: { tools: { execute } } } as unknown as Agent;
    vi.spyOn(host, 'get').mockImplementation((id) =>
      String(id) === 'assign-1' ? parent : undefined,
    );
    const args = { description: 'Review', prompt: 'Review', run_in_background: false };
    for (const session of [undefined, 'orch-1', 'unknown-1'])
      await expect(
        runtime.runDirectBotTool!('ada', 'bot_subagent', args, signal, session),
      ).rejects.toMatchObject({ code: 'parent-unavailable' });
    await expect(
      runtime.runDirectBotTool!('ada', 'channel_list', {}, signal, 'assign-1'),
    ).rejects.toMatchObject({ code: 'invalid-args' });
    await expect(
      runtime.runDirectBotTool!('ada', 'bot_subagent', args, signal, 'assign-1'),
    ).resolves.toMatchObject({ tool: 'bot_subagent', result: 'child done' });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ agent: parent, name: 'bot_subagent', arguments: args }),
    );
  });
});
