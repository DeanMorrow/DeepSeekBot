import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const core = await import('@botharness/core').catch(
  () => import('../packages/core/dist/index.mjs'),
);
const { readAuthorizedOpsCatalog } = core;

const root = mkdtempSync(join(tmpdir(), 'catalog-export-'));
const official = join(root, 'official');
mkdirSync(official);
writeFileSync(
  join(official, 'registry.json'),
  JSON.stringify({
    sourceRef: 'ops:asset-catalog',
    version: 1,
    updatedAt: '2026-11-06T00:00:00.000Z',
    display: { audiences: ['profile-owner'] },
    inventories: [
      { id: 'ui', brief: 'UI/UX patterns', status: 'unpopulated', entry: null, version: 1 },
      { id: 'ratio', brief: 'a/b ratio', status: 'unpopulated', entry: null, version: 1 },
      { id: 'leak', brief: '/etc/passwd', status: 'unpopulated', entry: null, version: 1 },
    ],
  }),
);
const config = join(root, 'catalog-source.json');
writeFileSync(
  config,
  JSON.stringify({
    sourceRef: 'ops:asset-catalog',
    registryPath: 'official/registry.json',
    catalogOwner: 'owner-a',
    approvalOwner: 'owner-a',
  }),
);
const view = readAuthorizedOpsCatalog(config, {
  source: 'host-session',
  sessionOwnerId: 'owner-a',
});
const briefs = view.inventories.map((item) => item.brief);
if (!briefs.includes('UI/UX patterns') || !briefs.includes('a/b ratio')) {
  console.error('export check failed: ordinary slashes were rejected');
  process.exit(1);
}
if (JSON.stringify(view).includes('/etc/passwd')) {
  console.error('export check failed: absolute path was returned');
  process.exit(1);
}
const closed = readAuthorizedOpsCatalog(undefined, {
  source: 'host-session',
  sessionOwnerId: 'owner-a',
});
if (closed.status !== 'unreachable') {
  console.error('export check failed: missing source must stay unreachable');
  process.exit(1);
}
console.log(
  JSON.stringify({
    export: 'readAuthorizedOpsCatalog',
    ordinary: briefs.slice(0, 2),
    leak: view.inventories.find((item) => item.id === 'leak')?.status,
    missing: closed.status,
  }),
);
