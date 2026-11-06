import { chmodSync, mkdirSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  openAuthorizedOpsEntry,
  readAuthorizedOpsCatalog,
  type CatalogAttestation,
} from '../src/memory/catalog-source.js';
import { authorizedCatalogView } from '../src/memory/host-pack.js';
import { createTempRoot } from './helpers.js';

const OWNER = 'synthetic-owner';
function attestOwner(sessionOwnerId = OWNER): CatalogAttestation {
  return { source: 'host-session', sessionOwnerId };
}
function attestBot(slug: string, ownerId = OWNER): CatalogAttestation {
  return { source: 'host-bot', slug, ownerId, sessionOwnerId: ownerId };
}

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
      items: [
        { id: 'skill-a', name: 'Skill A', brief: '一项技能' },
        { id: 'hidden', name: '/tmp/secret', brief: '私有', visibility: 'private' },
      ],
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
    JSON.stringify({
      sourceRef: 'ops:asset-catalog',
      registryPath: 'official/registry.json',
      catalogOwner: OWNER,
      approvalOwner: OWNER,
    }),
  );
  chmodSync(config, 0o600);
  return config;
}

describe('authorized ops catalog source', () => {
  it('stays unreachable when no source is configured and does not read a bundled tree', () => {
    const view = readAuthorizedOpsCatalog(undefined, attestOwner());
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
    const view = readAuthorizedOpsCatalog(config, attestOwner());
    expect(view.status).toBe('unauthorized');
    expect(view.inventories).toEqual([]);
    expect(JSON.stringify(view)).not.toContain('技能简介');
  });

  it('shows every authorized category to the profile owner and opens by entryRef', () => {
    const root = createTempRoot('catalog-source-');
    const config = writeRegistry(root);
    const view = readAuthorizedOpsCatalog(config, attestOwner());
    expect(view.status).toBe('active');
    expect(view.inventories.map((item) => item.id)).toEqual(['skills', 'modules']);
    expect(view.inventories.every((item) => item.entryRef?.startsWith('ops:asset-catalog#'))).toBe(
      true,
    );
    expect(JSON.stringify(view)).not.toContain('official');
    const opened = openAuthorizedOpsEntry(config, attestOwner(), 'ops:asset-catalog#modules');
    expect(opened.items).toEqual([{ id: 'mod-a', name: 'Module A', brief: '一个模块' }]);
    const again = readAuthorizedOpsCatalog(config, attestOwner());
    expect(again.fingerprint).toBe(view.fingerprint);
  });

  it('refuses another bot, a path leak, a symlink and a changed fingerprint', () => {
    const root = createTempRoot('catalog-source-');
    const config = writeRegistry(root);
    expect(readAuthorizedOpsCatalog(config, attestBot('bee')).status).toBe('unauthorized');
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
    const hidden = readAuthorizedOpsCatalog(leaked, attestOwner());
    expect(hidden.inventories[0]).toMatchObject({ status: 'invalid', brief: null, entryRef: null });
    expect(JSON.stringify(hidden)).not.toContain('/var/private');
    symlinkSync(join(root, 'official', 'skills.json'), join(root, 'official', 'linked.json'));
    const linked = writeRegistry(root, {
      ...REGISTRY,
      version: 3,
      inventories: [{ ...REGISTRY.inventories[0], entry: 'linked.json', version: 2 }],
    });
    expect(readAuthorizedOpsCatalog(linked, attestOwner()).inventories[0]?.status).toBe(
      'unreachable',
    );
    expect(readAuthorizedOpsCatalog(linked, attestOwner()).fingerprint).not.toBe(
      readAuthorizedOpsCatalog(config, attestBot('ada')).fingerprint,
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
      const view = readAuthorizedOpsCatalog(config, attestBot(slug));
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
    const bee = readAuthorizedOpsCatalog(config, attestBot('bee'));
    expect(bee.inventories).toEqual([]);
  });

  it('keeps ordinary slashes and URLs, and still drops real paths', () => {
    const root = createTempRoot('catalog-source-');
    const samples = [
      ['ui', 'UI/UX patterns'],
      ['ratio', 'a/b ratio'],
      ['zh', '界面说明：技能/模块对照'],
      ['url', '用途见 https://example.com/docs/guide'],
    ];
    const leaks = [
      '/etc/passwd',
      '/workspace/kb/secret',
      'C:\\Users\\secret',
      'C:/Users/secret',
      '\\\\server\\share\\secret',
      '//server/share/secret',
      '../memory/private',
      '..\\memory\\private',
      '%2e%2e%2fmemory%2fprivate',
      '%2Fetc%2Fpasswd',
      'file:///etc/passwd',
    ];
    const config = writeRegistry(root, {
      ...REGISTRY,
      inventories: [
        ...samples.map(([id, brief]) => ({
          id,
          brief,
          version: 1,
          updatedAt: '2026-11-06T00:00:00.000Z',
          status: 'unpopulated',
          entry: null,
        })),
        ...leaks.map((brief, index) => ({
          id: `leak-${index}`,
          brief,
          version: 1,
          updatedAt: '2026-11-06T00:00:00.000Z',
          status: 'unpopulated',
          entry: null,
        })),
      ],
    });
    const view = readAuthorizedOpsCatalog(config, attestOwner());
    expect(
      view.inventories.filter((item) => item.status === 'unpopulated').map((item) => item.brief),
    ).toEqual(samples.map(([, brief]) => brief));
    expect(
      view.inventories
        .filter((item) => item.id.startsWith('leak-'))
        .every((item) => item.brief === null && item.status === 'invalid'),
    ).toBe(true);
    expect(JSON.stringify(view)).not.toContain('/etc/passwd');
    expect(JSON.stringify(view)).not.toContain('Users');
  });

  it('rejects a private override, an encoded escape, and a symlink swapped in before open', () => {
    const root = createTempRoot('catalog-source-');
    const config = writeRegistry(root, {
      ...REGISTRY,
      inventories: [
        REGISTRY.inventories[0],
        { ...REGISTRY.inventories[0], id: 'skills', visibility: 'private' },
      ],
    });
    expect(readAuthorizedOpsCatalog(config, attestOwner()).status).toBe('invalid');
    const escaped = writeRegistry(root, {
      ...REGISTRY,
      inventories: [{ ...REGISTRY.inventories[0], entry: '%2e%2e%2fsecret.json' }],
    });
    expect(readAuthorizedOpsCatalog(escaped, attestOwner()).inventories[0]?.status).toBe(
      'unreachable',
    );
    const live = writeRegistry(root);
    expect(readAuthorizedOpsCatalog(live, attestOwner()).inventories[0]?.status).toBe('active');
    const skills = join(root, 'official', 'skills.json');
    unlinkSync(skills);
    symlinkSync(join(root, 'official', 'modules.json'), skills);
    const opened = openAuthorizedOpsEntry(live, attestOwner(), 'ops:asset-catalog#skills');
    expect(opened.status).toBe('unreachable');
    expect(opened.items).toEqual([]);
  });

  it('intersects root permission with narrower category and entry rules', () => {
    const root = createTempRoot('catalog-source-');
    const updatedAt = '2026-11-06T00:00:00.000Z';
    const config = writeRegistry(root, {
      ...REGISTRY,
      display: { audiences: ['profile-owner', 'bot:ada', 'bot:bee'] },
      inventories: [
        REGISTRY.inventories[0],
        {
          id: 'hidden-cat',
          brief: '私有分类标题',
          visibility: 'private',
          entry: null,
          status: 'unpopulated',
          version: 1,
          updatedAt,
        },
        {
          id: 'ada-only',
          brief: '只给 ada',
          audiences: ['bot:ada'],
          entry: null,
          status: 'unpopulated',
          version: 1,
          updatedAt,
        },
        {
          id: 'unknown',
          brief: '未知覆盖',
          public: true,
          entry: null,
          status: 'unpopulated',
          version: 1,
          updatedAt,
        },
      ],
    });
    writeFileSync(
      join(root, 'official', 'skills.json'),
      JSON.stringify({
        registryId: 'skills',
        version: 2,
        items: [
          { id: 'skill-a', name: 'Skill A', brief: '一项技能' },
          { id: 'hidden', name: '私有标题', brief: '私有用途', visibility: 'private' },
          { id: 'ada-item', name: 'Ada item', brief: '仅 ada', audiences: ['bot:ada'] },
          { id: 'mystery', name: '神秘标题', brief: '未知字段', grant: true },
        ],
      }),
    );
    const ada = readAuthorizedOpsCatalog(config, attestBot('ada'));
    expect(ada.inventories.map((item) => item.id)).toEqual(['skills', 'ada-only']);
    expect(JSON.stringify(ada)).not.toContain('私有分类标题');
    expect(JSON.stringify(ada)).not.toContain('未知覆盖');
    const adaOpen = openAuthorizedOpsEntry(config, attestBot('ada'), 'ops:asset-catalog#skills');
    expect(adaOpen.items.map((item) => item.id)).toEqual(['skill-a', 'ada-item']);
    expect(JSON.stringify(adaOpen)).not.toContain('私有标题');
    expect(JSON.stringify(adaOpen)).not.toContain('神秘标题');
    const bee = readAuthorizedOpsCatalog(config, attestBot('bee'));
    expect(bee.inventories.map((item) => item.id)).toEqual(['skills']);
    const beeOpen = openAuthorizedOpsEntry(config, attestBot('bee'), 'ops:asset-catalog#skills');
    expect(beeOpen.items.map((item) => item.id)).toEqual(['skill-a']);
    const owner = readAuthorizedOpsCatalog(config, attestOwner());
    expect(owner.inventories.map((item) => item.id)).toEqual(['skills']);
    const ownerOpen = openAuthorizedOpsEntry(config, attestOwner(), 'ops:asset-catalog#skills');
    expect(ownerOpen.items.map((item) => item.id)).toEqual(['skill-a']);
    writeFileSync(
      join(root, 'official', 'skills.json'),
      JSON.stringify({
        registryId: 'skills',
        version: 2,
        visibility: 'private',
        items: [{ id: 'skill-a', name: 'Skill A', brief: '一项技能' }],
      }),
    );
    const hiddenFile = readAuthorizedOpsCatalog(config, attestBot('ada'));
    expect(hiddenFile.inventories.map((item) => item.id)).toEqual(['ada-only']);
    expect(JSON.stringify(hiddenFile)).not.toContain('技能简介');
    const hiddenOpen = openAuthorizedOpsEntry(config, attestBot('ada'), 'ops:asset-catalog#skills');
    expect(hiddenOpen.status).toBe('unauthorized');
    expect(hiddenOpen.items).toEqual([]);
    expect(JSON.stringify(hiddenOpen)).not.toContain('一项技能');
    const ownerOnly = writeRegistry(root, {
      ...REGISTRY,
      display: { audiences: ['profile-owner'] },
    });
    expect(readAuthorizedOpsCatalog(ownerOnly, attestBot('ada')).status).toBe('unauthorized');
    expect(readAuthorizedOpsCatalog(ownerOnly, attestOwner()).status).toBe('active');
  });

  it('does not keep an object privacy field active just because gaps were recorded', () => {
    const root = createTempRoot('catalog-privacy-object-');
    const config = writeRegistry(root, {
      ...REGISTRY,
      privacy: { mode: 'synthetic-privacy-mode' },
      contract: { id: 'synthetic-contract-id' },
    });
    const view = readAuthorizedOpsCatalog(config, attestOwner());
    expect(view.status).toBe('unauthorized');
    expect(view.inventories).toEqual([]);
    expect(view.authorizationGaps.map((gap) => gap.field)).toEqual(['privacy', 'contract']);
    expect(JSON.stringify(view)).not.toContain('技能简介');
    const opened = openAuthorizedOpsEntry(config, attestOwner(), 'ops:asset-catalog#skills');
    expect(opened.ok).toBe(false);
    expect(opened.items).toEqual([]);
  });
});
