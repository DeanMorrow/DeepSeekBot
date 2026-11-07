import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';

import { runBotCreateCli } from '../src/bots/bot-create-cli.js';

const servers: ReturnType<typeof createServer>[] = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    ),
  );
});

type Call = { method: string; args: unknown };

async function host(answer: (call: Call) => unknown) {
  const calls: Call[] = [];
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url!, 'http://localhost');
    if (req.method === 'GET' && url.searchParams.has('token')) {
      res.setHeader('set-cookie', 'authority=signed; HttpOnly');
      res.writeHead(302, { location: '/' }).end();
      return;
    }
    expect(req.headers.cookie).toBe('authority=signed');
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const parsed = JSON.parse(Buffer.concat(chunks).toString());
    const call = { method: parsed.method.replace('botharness/', ''), args: parsed.payload.args };
    calls.push(call);
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ type: 'server-response', rpcId: parsed.rpcId, result: answer(call) }));
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('missing address');
  return { url: `http://127.0.0.1:${address.port}`, calls };
}

async function invoke(argv: string[], url: string, stdin = '') {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = await runBotCreateCli(argv, {
    env: { DEEPSEEKBOT_HOST: url, DEEPSEEKBOT_HOST_TOKEN: 'private-test-token' },
    stdout: (text) => stdout.push(text),
    stderr: (text) => stderr.push(text),
    readStdin: async () => stdin,
  });
  expect(stdout.join('') + stderr.join('')).not.toContain('private-test-token');
  return { code, json: JSON.parse(stdout.join('')) };
}

describe('Harness Bot tool runner commands', () => {
  it('asks the live Host for the owner catalog view', async () => {
    const live = await host(() => ({ ok: true, value: { catalog: { status: 'unreachable' } } }));
    const result = await invoke(['catalog'], live.url);
    expect(result.code).toBe(0);
    expect(live.calls).toEqual([{ method: 'catalogView', args: {} }]);
  });
  it('passes explicit Source Event causation separately from Bot tool arguments', async () => {
    const live = await host(() => ({ ok: true, value: { result: 'accepted' } }));
    const result = await invoke(
      ['bot-tool', 'ada', 'bot_send_message', '--cause-event', 'source-owned', '--args-stdin'],
      live.url,
      JSON.stringify({ bot_id: 'remote:host:ios', body: 'Check iOS' }),
    );
    expect(result.code).toBe(0);
    expect(live.calls).toEqual([
      {
        method: 'botToolRun',
        args: {
          slug: 'ada',
          tool: 'bot_send_message',
          sourceEventId: 'source-owned',
          args: { bot_id: 'remote:host:ios', body: 'Check iOS' },
        },
      },
    ]);
  });
  it('names the Assignment parent of a Subagent tool with --session', async () => {
    const live = await host(() => ({
      ok: true,
      value: { slug: 'ada', tool: 'bot_subagent', sessionId: 'direct', result: 'done' },
    }));
    const result = await invoke(
      ['bot-tool', 'ada', 'bot_subagent', '--session', 'assign-1', '--args-stdin'],
      live.url,
      JSON.stringify({ description: 'Review', prompt: 'Review' }),
    );
    expect(result.code).toBe(0);
    expect(live.calls).toEqual([
      {
        method: 'botToolRun',
        args: {
          slug: 'ada',
          tool: 'bot_subagent',
          args: { description: 'Review', prompt: 'Review' },
          sessionId: 'assign-1',
        },
      },
    ]);
  });

  it('carries an explicit Group freshness decision and returns the owning coded outcome', async () => {
    const args = {
      channel_id: 'group',
      body: 'Corrected answer',
      draft_id: 'draft',
      observation_id: 'observed',
      freshness_override: { draftVersion: 3, reason: 'Necessary answer after review' },
    };
    const live = await host(() => ({
      ok: true,
      value: {
        slug: 'ada',
        tool: 'bot_send_message',
        sessionId: 'direct',
        result: { status: 'refused', reason: 'draft-version-changed' },
      },
    }));
    const result = await invoke(
      ['bot-tool', 'ada', 'bot_send_message', '--args-stdin'],
      live.url,
      JSON.stringify(args),
    );
    expect(result.json.result).toEqual({ status: 'refused', reason: 'draft-version-changed' });
    expect(live.calls).toEqual([
      { method: 'botToolRun', args: { slug: 'ada', tool: 'bot_send_message', args } },
    ]);
  });

  it('passes Group inspection and explicit recovery to the same direct Tool owner', async () => {
    const live = await host(() => ({
      ok: true,
      value: { tool: 'bot_send_message', result: { status: 'inspected' } },
    }));
    for (const args of [
      { channel_id: 'group-review', body: '', action: 'inspect', draft_id: 'draft-a' },
      {
        channel_id: 'group-review',
        body: '11:00',
        recover: true,
        draft_id: 'draft-a',
        observation_id: 'fresh-read',
      },
    ]) {
      expect(
        (
          await invoke(
            [
              'bot-tool',
              'ada',
              args.action ? 'channel_action' : 'bot_send_message',
              '--args-stdin',
            ],
            live.url,
            JSON.stringify(args),
          )
        ).code,
      ).toBe(0);
      expect(live.calls.at(-1)).toEqual({
        method: 'botToolRun',
        args: { slug: 'ada', tool: args.action ? 'channel_action' : 'bot_send_message', args },
      });
    }
  });

  it('lists the direct tools and runs one as a Bot with args from stdin', async () => {
    const live = await host((call) =>
      call.method === 'botTools'
        ? {
            ok: true,
            value: {
              sessionId: 'direct',
              tools: [{ name: 'channel_list', description: 'List', inputSchema: {} }],
            },
          }
        : {
            ok: true,
            value: { slug: 'ada', tool: 'channel_list', sessionId: 'direct', result: {} },
          },
    );
    expect(await invoke(['bot-tools'], live.url)).toEqual({
      code: 0,
      json: {
        sessionId: 'direct',
        tools: [{ name: 'channel_list', description: 'List', inputSchema: {} }],
      },
    });
    expect(
      await invoke(['bot-tool', 'ada', 'channel_list', '--args-stdin'], live.url, '{"limit":2}'),
    ).toEqual({
      code: 0,
      json: { slug: 'ada', tool: 'channel_list', sessionId: 'direct', result: {} },
    });
    expect(live.calls).toEqual([
      { method: 'botTools', args: {} },
      { method: 'botToolRun', args: { slug: 'ada', tool: 'channel_list', args: { limit: 2 } } },
    ]);
  });

  it('exits non-zero with the Host code when the runner refuses the tool', async () => {
    const live = await host(() => ({
      ok: false,
      error: {
        code: 'tool-not-direct',
        message: 'create_assignment cannot run outside a Bot turn',
      },
    }));
    const refused = await invoke(['bot-tool', 'ada', 'create_assignment'], live.url);
    expect(refused.code).not.toBe(0);
    expect(refused.json.error).toMatchObject({ code: 'tool-not-direct' });
  });

  it('rejects malformed calls before contacting the Host', async () => {
    const live = await host(() => ({ ok: true, value: {} }));
    for (const [argv, stdin] of [
      [['bot-tool', 'ada'], ''],
      [['bot-tools', 'ada'], ''],
      [['bot-tool', 'ada', 'channel_list', '--args-stdin'], '[1]'],
      [['bot-tool', 'ada', 'channel_list', '--args-stdin'], 'not json'],
    ] as const) {
      const result = await invoke([...argv], live.url, stdin);
      expect(result.code).not.toBe(0);
      expect(result.json.error.code).toBe('usage');
    }
    expect(live.calls).toEqual([]);
  });
});
