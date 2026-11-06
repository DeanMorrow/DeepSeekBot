import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { openAuthorizedOpsEntry, readAuthorizedOpsCatalog } from '../src/memory/catalog-source.js';
import { authorizedCatalogView } from '../src/memory/host-pack.js';
import { createTempRoot } from './helpers.js';

const REGISTRY = {
  schemaVersion: 1,
  sourceRef: 'ops:asset-catalog',
  version: 2,
  updatedAt: '2026-11-06T00:00:00.000Z',
  display: { audiences: ['profile-owner', 'bot:ada'] },
  inventories: [
    {
      id: 'skills',
      brief: '技能简介',
      version: 2,
      updatedAt: '2026-11-06T00:00:00.000Z',
      status: 'active',
      entry: 'skills.json',
    },
    {
      id: 'modules',
      brief: '模块简介',
      version: 1,
      updatedAt: '2026-11-06T00:00:00.000Z',
      status: 'active',
      entry: 'modules.json',
    },
  ],
};

function writeRegistry(root: string, registry: unknown = REGISTRY) {
  const dir = join(root, 'official');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'registry.json'), JSON.stringify(registry));
  writeFileSync(
    join(dir, 'skills.json'),
    JSON.stringify({
      registryId: 'skills',
      version: 2,
      items: [{ id: 'skill-a', name: 'Skill A', brief: '一项技能' }],
    }),
  );
  writeFileSync(
    join(dir, 'modules.json'),
    JSON.stringify({
      registryId: 'modules',
      version: 1,
      items: [{ id: 'mod-a', name: 'Module A', brief: '一个模块' }],
    }),
  );
  const config = join(root, 'catalog-source.json');
  writeFileSync(
    config,
    JSON.stringify({ sourceRef: 'ops:asset-catalog', registryPath: 'official/registry.json' }),
  );
  return config;
}

describe('authorized ops catalog source', () => {
  it('stays unreachable when no source is configured and does not read a bundled tree', () => {
    const view = readAuthorizedOpsCatalog(undefined, { kind: 'profile-owner' });
    expect(view.status).toBe('unreachable');
    expect(view.inventories).toEqual([]);
    expect(JSON.stringify(view)).not.toContain('skills');
  });

  it('does not treat owner or active as display permission', () => {
    const root = createTempRoot('catalog-source-');
    const config = writeRegistry(root, {
      ...REGISTRY,
      owner: 'ops',
      status: 'active',
      display: undefined,
    });
    const view = readAuthorizedOpsCatalog(config, { kind: 'profile-owner' });
    expect(view.status).toBe('unauthorized');
    expect(view.inventories).toEqual([]);
    expect(JSON.stringify(view)).not.toContain('技能简介');
  });

  it('shows every authorized category to the profile owner and opens by entryRef', () => {
    const root = createTempRoot('catalog-source-');
    const config = writeRegistry(root);
    const view = readAuthorizedOpsCatalog(config, { kind: 'profile-owner' });
    expect(view.status).toBe('active');
    expect(view.inventories.map((item) => item.id)).toEqual(['skills', 'modules']);
    expect(view.inventories.every((item) => item.entryRef?.startsWith('ops:asset-catalog#'))).toBe(
      true,
    );
    expect(JSON.stringify(view)).not.toContain('official');
    const opened = openAuthorizedOpsEntry(
      config,
      { kind: 'profile-owner' },
      'ops:asset-catalog#modules',
    );
    expect(opened.items).toEqual([{ id: 'mod-a', name: 'Module A', brief: '一个模块' }]);
    const again = readAuthorizedOpsCatalog(config, { kind: 'profile-owner' });
    expect(again.fingerprint).toBe(view.fingerprint);
  });

  it('refuses another bot, a path leak, a symlink and a changed fingerprint', () => {
    const root = createTempRoot('catalog-source-');
    const config = writeRegistry(root);
    expect(readAuthorizedOpsCatalog(config, { kind: 'bot', slug: 'bee' }).status).toBe(
      'unauthorized',
    );
    const leaked = writeRegistry(root, {
      ...REGISTRY,
      inventories: [
        {
          ...REGISTRY.inventories[0],
          brief: 'see /var/private/memory/title',
        },
        REGISTRY.inventories[1],
      ],
    });
    const hidden = readAuthorizedOpsCatalog(leaked, { kind: 'profile-owner' });
    expect(hidden.inventories[0]).toMatchObject({ status: 'invalid', brief: null, entryRef: null });
    expect(JSON.stringify(hidden)).not.toContain('/var/private');
    symlinkSync(join(root, 'official', 'skills.json'), join(root, 'official', 'linked.json'));
    const linked = writeRegistry(root, {
      ...REGISTRY,
      version: 3,
      inventories: [{ ...REGISTRY.inventories[0], entry: 'linked.json', version: 2 }],
    });
    expect(readAuthorizedOpsCatalog(linked, { kind: 'profile-owner' }).inventories[0]?.status).toBe(
      'unreachable',
    );
    expect(readAuthorizedOpsCatalog(linked, { kind: 'profile-owner' }).fingerprint).not.toBe(
      readAuthorizedOpsCatalog(config, { kind: 'bot', slug: 'ada' }).fingerprint,
    );
  });

  it('lets an allowed bot read the ops row without copying another bot memory', () => {
    const root = createTempRoot('catalog-source-');
    const config = writeRegistry(root);
    const memory = join(root, 'memory');
    mkdirSync(join(memory, '.botharness', 'catalog'), { recursive: true });
    writeFileSync(
      join(memory, '.botharness', 'catalog', 'index.json'),
      JSON.stringify({
        schemaVersion: 1,
        version: 1,
        updatedAt: '2026-11-06T00:00:00.000Z',
        inventories: [
          {
            id: 'ops-asset-catalog',
            brief: '全局目录',
            authority: 'ops',
            sourceRef: 'ops:asset-catalog',
            version: 1,
            updatedAt: '2026-11-06T00:00:00.000Z',
            status: 'active',
          },
        ],
      }),
    );
    const ada = authorizedCatalogView(memory, 'ada', {}, (sourceRef, slug) => {
      const view = readAuthorizedOpsCatalog(config, { kind: 'bot', slug });
      if (sourceRef !== 'ops:asset-catalog' || view.status === 'unreachable') return undefined;
      return {
        status: view.status === 'active' ? 'active' : view.status,
        version: view.version,
        updatedAt: view.updatedAt,
        fingerprint: view.fingerprint,
        briefs: view.inventories.flatMap((item) =>
          item.brief === null
            ? []
            : [{ id: item.id, name: item.id, brief: item.brief, entryRef: item.entryRef }],
        ),
      };
    });
    const row = (ada.inventories as Array<{ briefs: unknown[]; status: string }>)[0];
    expect(row?.status).toBe('active');
    expect(row?.briefs).toHaveLength(2);
    const bee = readAuthorizedOpsCatalog(config, { kind: 'bot', slug: 'bee' });
    expect(bee.inventories).toEqual([]);
  });
});
