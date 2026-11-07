import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { authorizedCatalogView, migratePack, resolveContained } from '../src/memory/host-pack.js';
import { createTempRoot } from './helpers.js';

describe('host pack path boundary', () => {
  it('refuses a symlink or an absolute path outside the Bot memory', () => {
    const root = createTempRoot('host-pack-');
    const outside = createTempRoot('host-pack-out-');
    const memory = join(root, 'memory');
    mkdirSync(memory);
    symlinkSync(outside, join(memory, 'escape'));
    expect(resolveContained(memory, 'escape').reason).toBe('symlink-escape');
    expect(resolveContained(memory, outside).reason).toBe('path-escape');
    writeFileSync(join(outside, 'SOUL.md'), 'untouched');
    expect(migratePack(memory, outside)).toMatchObject({ ok: true, copied: [] });
    expect(readFileSync(join(outside, 'SOUL.md'), 'utf8')).toBe('untouched');
  });

  it('returns every catalog category and does not copy the ops source', () => {
    const memory = join(import.meta.dirname, '../../../adapters/tobs-thinking/seed');
    const view = authorizedCatalogView(memory, 'ada');
    expect(view.ok).toBe(true);
    const rows = view.inventories as Array<{
      id: string;
      status: string;
      briefs?: unknown[];
      entry?: string | null;
    }>;
    expect(rows.map((row) => row.id).sort()).toEqual(
      ['bots', 'modules', 'ops-asset-catalog', 'plugin-tools', 'skills', 'templates'].sort(),
    );
    expect(rows.find((row) => row.id === 'skills')).toMatchObject({ status: 'active' });
    expect((rows.find((row) => row.id === 'skills')?.briefs ?? []).length).toBeGreaterThan(1);
    expect(rows.find((row) => row.id === 'bots')?.status).toBe('unpopulated');
    expect(rows.find((row) => row.id === 'ops-asset-catalog')).toMatchObject({
      status: 'unreachable',
      entry: null,
      briefs: [],
    });
    expect(authorizedCatalogView(memory, 'ada', { actor: 'bee' }).reason).toBe('actor-mismatch');
  });
});
