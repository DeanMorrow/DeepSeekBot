import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CATALOG_SECTION_7,
  openAuthorizedOpsEntry,
  readAuthorizedOpsCatalog,
  type CatalogAttestation,
} from '../src/memory/catalog-source.js';
import { createTempRoot } from './helpers.js';

const FIXTURE = join(import.meta.dirname, 'fixtures/catalog-auth-v1/fixtures');
const PRIVACY = 'SYNTHETIC-legacy-prose-not-auth';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function attestBot(slug: string, ownerId: string): CatalogAttestation {
  return { source: 'host-bot', slug, ownerId, sessionOwnerId: ownerId };
}

function attestOwner(sessionOwnerId: string): CatalogAttestation {
  return { source: 'host-session', sessionOwnerId };
}

function configFor(registryPath: string, ownerId: string, allowRoots: string[] = []): string {
  const root = createTempRoot('catalog-auth-v1-');
  const config = join(root, 'catalog-source.json');
  writeFileSync(
    config,
    JSON.stringify({
      sourceRef: 'ops:asset-catalog',
      registryPath,
      catalogOwner: ownerId,
      approvalOwner: ownerId,
      privacySha256: sha256(PRIVACY),
      contractSha256: sha256(CATALOG_SECTION_7),
      contractVersion: '2',
      contractPointer: 'synthetic://contract.md',
      allowRoots,
    }),
  );
  return config;
}

describe('catalog metadata auth v1 frozen cases', () => {
  const registry = join(FIXTURE, 'registry.synthetic.json');

  it('H1 H5 H7 H20 same-owner bots and the owner read names and purposes', () => {
    const config = configFor(registry, 'owner-a');
    for (const caller of [
      attestOwner('owner-a'),
      attestBot('ada', 'owner-a'),
      attestBot('bee', 'owner-a'),
    ]) {
      const view = readAuthorizedOpsCatalog(config, caller);
      expect(view.status).toBe('active');
      expect(view.authorizationGaps).toEqual([]);
      expect(view.inventories.map((item) => item.name)).toEqual(['SYN-Name-A', 'SYN-Name-B']);
      expect(view.inventories.map((item) => item.purpose)).toEqual([
        'SYN purpose A',
        'SYN purpose B',
      ]);
      const opened = openAuthorizedOpsEntry(config, caller, 'ops:asset-catalog#syn-inv-a');
      expect(opened.ok).toBe(true);
      expect(opened.items).toEqual([{ id: 'i1', name: 'SYN-Item-1', brief: 'meta only' }]);
    }
  });

  it('H2 H3 H13 H14 H15 foreign, spoofed, and unbound owners are refused', () => {
    const config = configFor(registry, 'owner-a');
    expect(readAuthorizedOpsCatalog(config, attestBot('ada', 'owner-b')).status).toBe(
      'unauthorized',
    );
    expect(readAuthorizedOpsCatalog(config, attestOwner('owner-b')).inventories).toEqual([]);
    const spoofed = {
      source: 'caller',
      sessionOwnerId: 'owner-a',
    } as unknown as CatalogAttestation;
    expect(readAuthorizedOpsCatalog(config, spoofed).status).toBe('unauthorized');
    const unbound = configFor(registry, '');
    expect(readAuthorizedOpsCatalog(unbound, attestBot('ada', 'owner-a')).status).toBe(
      'unauthorized',
    );
    expect(
      openAuthorizedOpsEntry(config, attestBot('ada', 'owner-b'), 'ops:asset-catalog#syn-inv-a').ok,
    ).toBe(false);
  });

  it('H4 H6 H9 H11 H12 revocation, unknown audiences, and private rows do not leak', () => {
    const root = createTempRoot('catalog-auth-mutate-');
    const registryPath = join(root, 'registry.json');
    const body = {
      sourceRef: 'ops:asset-catalog',
      version: 1,
      updatedAt: '2026-11-06T00:00:00.000Z',
      privacy: PRIVACY,
      contract: 'synthetic://contract.md',
      contract_version: '2',
      display: { audiences: ['owner-bots', 'bot:*'] },
      inventories: [
        {
          id: 'syn-inv-a',
          name: 'SYN-Name-A',
          brief: 'SYN purpose A',
          entry: null,
          status: 'unpopulated',
          version: 1,
          visibility: 'private',
        },
      ],
    };
    writeFileSync(registryPath, JSON.stringify(body));
    const config = configFor(registryPath, 'owner-a');
    expect(readAuthorizedOpsCatalog(config, attestBot('ada', 'owner-a')).inventories).toEqual([]);
    body.display = { audiences: ['all-bots'] };
    body.inventories[0]!.visibility = 'public';
    writeFileSync(registryPath, JSON.stringify(body));
    expect(readAuthorizedOpsCatalog(config, attestBot('ada', 'owner-a')).status).toBe(
      'unauthorized',
    );
    body.display = { audiences: ['owner-bots'] };
    writeFileSync(registryPath, JSON.stringify(body));
    expect(readAuthorizedOpsCatalog(config, attestBot('ada', 'owner-a')).status).toBe('active');
    writeFileSync(
      config,
      JSON.stringify({
        sourceRef: 'ops:asset-catalog',
        registryPath,
        catalogOwner: 'owner-revoked',
        approvalOwner: 'owner-revoked',
        privacySha256: sha256(PRIVACY),
        contractSha256: sha256(CATALOG_SECTION_7),
        contractVersion: '2',
        contractPointer: 'synthetic://contract.md',
      }),
    );
    const revoked = readAuthorizedOpsCatalog(config, attestBot('ada', 'owner-a'));
    expect(revoked.status).toBe('unauthorized');
    expect(revoked.inventories).toEqual([]);
    expect(
      openAuthorizedOpsEntry(config, attestBot('ada', 'owner-a'), 'ops:asset-catalog#syn-inv-a')
        .items,
    ).toEqual([]);
  });

  it('H8 H18 H19 absolute entries stay inside the allow root and missing files are not created', () => {
    const root = createTempRoot('catalog-auth-abs-');
    const allow = join(root, 'allow');
    const outside = join(root, 'outside');
    mkdirSync(join(allow, 'inside'), { recursive: true });
    mkdirSync(outside);
    const entry = join(allow, 'inside', 'entry.json');
    writeFileSync(
      entry,
      JSON.stringify({
        registryId: 'syn-abs',
        version: 1,
        items: [
          {
            id: 'abs-item',
            name: 'SYN-Abs-Item',
            brief: 'meta only',
            entry: join(outside, 'body.txt'),
          },
        ],
      }),
    );
    writeFileSync(join(outside, 'body.txt'), 'SECRET-BODY');
    const escaped = join(allow, 'escape.json');
    symlinkSync(join(outside, 'body.txt'), escaped);
    const registryPath = join(root, 'registry.json');
    writeFileSync(
      registryPath,
      JSON.stringify({
        sourceRef: 'ops:asset-catalog',
        version: 1,
        updatedAt: '2026-11-06T00:00:00.000Z',
        privacy: PRIVACY,
        contract: 'synthetic://contract.md',
        contract_version: '2',
        display: { audiences: ['profile-owner'] },
        inventories: [
          {
            id: 'syn-abs',
            name: 'SYN-Abs',
            brief: 'SYN abs purpose',
            entry,
            status: 'active',
            version: 1,
          },
          {
            id: 'syn-miss',
            name: 'SYN-Missing',
            brief: 'SYN missing purpose',
            entry: join(allow, 'missing', 'entry.json'),
            status: 'active',
            version: 1,
          },
          {
            id: 'syn-link',
            name: 'SYN-Link',
            brief: 'SYN link purpose',
            entry: escaped,
            status: 'active',
            version: 1,
          },
        ],
      }),
    );
    const config = configFor(registryPath, 'owner-a', [allow]);
    const view = readAuthorizedOpsCatalog(config, attestOwner('owner-a'));
    expect(view.inventories.find((item) => item.id === 'syn-abs')?.status).toBe('active');
    expect(view.inventories.find((item) => item.id === 'syn-miss')?.status).toBe('unreachable');
    expect(view.inventories.find((item) => item.id === 'syn-link')?.status).toBe('unreachable');
    expect(existsSync(join(allow, 'missing'))).toBe(false);
    const projected = JSON.stringify(view);
    expect(projected).not.toContain(entry);
    expect(projected).not.toContain('SECRET-BODY');
    const opened = openAuthorizedOpsEntry(
      config,
      attestOwner('owner-a'),
      'ops:asset-catalog#syn-abs',
    );
    expect(opened.items).toEqual([{ id: 'abs-item', name: 'SYN-Abs-Item', brief: 'meta only' }]);
    expect(JSON.stringify(opened)).not.toContain('SECRET-BODY');
    expect(JSON.stringify(opened)).not.toContain(outside);
  });

  it('H10 H16 H17 unknown privacy or contract versions do not stay active', () => {
    const root = createTempRoot('catalog-auth-legacy-');
    const registryPath = join(root, 'registry.json');
    writeFileSync(
      registryPath,
      JSON.stringify({
        sourceRef: 'ops:asset-catalog',
        version: 1,
        updatedAt: '2026-11-06T00:00:00.000Z',
        privacy: { mode: 'synthetic-privacy-mode' },
        contract: 'synthetic://contract.md',
        contract_version: '2',
        display: { audiences: ['profile-owner'] },
        inventories: [
          {
            id: 'syn-inv-a',
            name: 'SYN-Name-A',
            brief: 'SYN purpose A',
            entry: null,
            status: 'unpopulated',
            version: 1,
          },
        ],
      }),
    );
    const config = configFor(registryPath, 'owner-a');
    const objectPrivacy = readAuthorizedOpsCatalog(config, attestOwner('owner-a'));
    expect(objectPrivacy.status).toBe('unauthorized');
    expect(objectPrivacy.inventories).toEqual([]);
    expect(objectPrivacy.authorizationGaps.map((gap) => gap.field)).toContain('privacy');
    const rewritten = JSON.parse(readFileSync(registryPath, 'utf8')) as {
      privacy: string;
      contract_version: string;
      inventories: Array<{ name: string }>;
    };
    rewritten.privacy = PRIVACY;
    rewritten.contract_version = '2';
    rewritten.inventories[0]!.name = '/memory/private/secret';
    writeFileSync(registryPath, JSON.stringify(rewritten));
    const enforced = readAuthorizedOpsCatalog(config, attestOwner('owner-a'));
    expect(enforced.status).toBe('active');
    expect(JSON.stringify(enforced)).not.toContain('/memory/private/secret');
    rewritten.contract_version = '9';
    writeFileSync(registryPath, JSON.stringify(rewritten));
    const newVersion = readAuthorizedOpsCatalog(config, attestOwner('owner-a'));
    expect(newVersion.status).toBe('unauthorized');
    expect(newVersion.inventories).toEqual([]);
  });
});
