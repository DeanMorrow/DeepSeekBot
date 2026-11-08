import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createTempRoot } from './helpers.js';

describe('file-backed credential restart', () => {
  it('resolves a test reference from a new process after the first process exits', () => {
    const home = createTempRoot('credential-disk-');
    mkdirSync(home, { recursive: true });
    const secret = `sk-disk-${randomBytes(8).toString('hex')}`;
    const script = `import { Context } from '@deepseek-ai/cordis';
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import LocalCredentialProvider from '@deepseek-ai/dsh-credentials-local';
const home = process.env.ISOLATED_HOME;
const mode = process.env.ISOLATED_MODE;
const value = process.env.ISOLATED_VALUE;
const ctx = new Context();
const fiber = ctx.plugin(LocalCredentialProvider, { dshHome: home, watch: false });
await fiber.await();
if (mode === 'set') {
  await ctx.credentials.set(credentialRef('ISOLATED_TEST_KEY'), value);
  process.stdout.write('STORED\\n');
} else {
  const resolved = await ctx.credentials.resolve(credentialRef('ISOLATED_TEST_KEY'));
  process.stdout.write(resolved?.value === value ? 'RESOLVED\\n' : 'MISSING\\n');
}
await ctx.fiber.dispose();
`;
    const run = (mode: string) =>
      spawnSync(process.execPath, ['--input-type=module'], {
        input: script,
        encoding: 'utf8',
        cwd: '/workspace/packages/core',
        env: {
          ...process.env,
          ISOLATED_HOME: home,
          ISOLATED_MODE: mode,
          ISOLATED_VALUE: secret,
        },
      });
    const set = run('set');
    expect(set.status).toBe(0);
    expect(set.stdout).toBe('STORED\n');
    expect(set.stdout).not.toContain(secret);
    const read = run('read');
    expect(read.status).toBe(0);
    expect(read.stdout).toBe('RESOLVED\n');
    expect(read.stdout).not.toContain(secret);
    expect(read.stderr).not.toContain(secret);
  });
});
