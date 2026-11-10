import { createHash } from 'node:crypto';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  attestationFromHostSession,
  openAuthorizedOpsEntry,
  readAuthorizedOpsCatalog,
  type CatalogAttestation,
} from '../src/memory/catalog-source.js';
import { createPackTools } from '../src/memory/host-pack-tools.js';
import { createTempRoot } from './helpers.js';

const FIXTURE = join(import.meta.dirname, 'fixtures/catalog-auth-v1/fixtures');
const PRIVACY = 'SYNTHETIC-legacy-prose-not-auth';
const CONTRACT_TEXT = 'synthetic contract bytes v2\n';

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function contractFingerprint(registryPath: string): string {
  const body = JSON.parse(readFileSync(registryPath, 'utf8')) as { contract?: unknown };
  if (typeof body.contract !== 'string' || body.contract.includes('://')) return sha256('unbound');
  const file = body.contract.startsWith('/')
    ? body.contract
    : join(dirname(registryPath), body.contract);
  return sha256(readFileSync(file));
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
      contractSha256: contractFingerprint(registryPath),
      contractVersion: '2',
      allowRoots,
    }),
  );
  chmodSync(config, 0o600);
  return config;
}

function materializeFixture(ownerId: string): {
  config: string;
  contractPath: string;
  registryPath: string;
} {
  const root = createTempRoot('catalog-auth-fixture-');
  const dir = join(root, 'src');
  mkdirSync(join(dir, 'entries'), { recursive: true });
  cpSync(join(FIXTURE, 'entries'), join(dir, 'entries'), { recursive: true });
  const body = JSON.parse(readFileSync(join(FIXTURE, 'registry.synthetic.json'), 'utf8')) as {
    contract: string;
  };
  body.contract = 'CONTRACT.md';
  const contractPath = join(dir, 'CONTRACT.md');
  writeFileSync(contractPath, CONTRACT_TEXT);
  const registryPath = join(dir, 'registry.json');
  writeFileSync(registryPath, JSON.stringify(body));
  return { config: configFor(registryPath, ownerId), contractPath, registryPath };
}

describe('catalog metadata auth v1 frozen cases', () => {
  it('H1 H5 H7 H20 same-owner bots and the owner read names and purposes from a real contract file', () => {
    const { config } = materializeFixture('owner-a');
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
    const { config, registryPath } = materializeFixture('owner-a');
    expect(readAuthorizedOpsCatalog(config, attestBot('ada', 'owner-b')).status).toBe(
      'unauthorized',
    );
    expect(readAuthorizedOpsCatalog(config, attestOwner('owner-b')).inventories).toEqual([]);
    const spoofed = {
      source: 'caller',
      sessionOwnerId: 'owner-a',
    } as unknown as CatalogAttestation;
    expect(readAuthorizedOpsCatalog(config, spoofed).status).toBe('unauthorized');
    const unbound = configFor(registryPath, '');
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
    writeFileSync(join(root, 'CONTRACT.md'), CONTRACT_TEXT);
    const body = {
      sourceRef: 'ops:asset-catalog',
      version: 1,
      updatedAt: '2026-11-06T00:00:00.000Z',
      privacy: PRIVACY,
      contract: 'CONTRACT.md',
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
        contractSha256: sha256(CONTRACT_TEXT),
        contractVersion: '2',
      }),
    );
    chmodSync(config, 0o600);
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
    writeFileSync(join(root, 'CONTRACT.md'), CONTRACT_TEXT);
    writeFileSync(
      registryPath,
      JSON.stringify({
        sourceRef: 'ops:asset-catalog',
        version: 1,
        updatedAt: '2026-11-06T00:00:00.000Z',
        privacy: PRIVACY,
        contract: 'CONTRACT.md',
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
    writeFileSync(join(root, 'CONTRACT.md'), CONTRACT_TEXT);
    writeFileSync(
      registryPath,
      JSON.stringify({
        sourceRef: 'ops:asset-catalog',
        version: 1,
        updatedAt: '2026-11-06T00:00:00.000Z',
        privacy: { mode: 'synthetic-privacy-mode' },
        contract: 'CONTRACT.md',
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
    rewritten.inventories[0]!.name = 'private-bot-store';
    writeFileSync(registryPath, JSON.stringify(rewritten));
    const named = readAuthorizedOpsCatalog(config, attestOwner('owner-a'));
    expect(named.status).toBe('active');
    expect(named.inventories.map((item) => item.name)).toEqual(['private-bot-store']);
    const hidden = JSON.parse(readFileSync(registryPath, 'utf8')) as {
      inventories: Array<{ private?: boolean }>;
    };
    hidden.inventories[0]!.private = true;
    writeFileSync(registryPath, JSON.stringify(hidden));
    expect(readAuthorizedOpsCatalog(config, attestOwner('owner-a')).inventories).toEqual([]);
    rewritten.contract_version = '9';
    writeFileSync(registryPath, JSON.stringify(rewritten));
    const newVersion = readAuthorizedOpsCatalog(config, attestOwner('owner-a'));
    expect(newVersion.status).toBe('unauthorized');
    expect(newVersion.inventories).toEqual([]);
  });

  it('binds a real contract file and refuses changed, missing, and escaped bytes', () => {
    const { config, contractPath } = materializeFixture('owner-a');
    const caller = attestOwner('owner-a');
    expect(readAuthorizedOpsCatalog(config, caller).status).toBe('active');
    expect(JSON.stringify(readAuthorizedOpsCatalog(config, caller))).not.toContain(
      CONTRACT_TEXT.trim(),
    );
    writeFileSync(contractPath, `${CONTRACT_TEXT}changed`);
    expect(readAuthorizedOpsCatalog(config, caller).status).toBe('unauthorized');
    writeFileSync(contractPath, CONTRACT_TEXT);
    expect(readAuthorizedOpsCatalog(config, caller).status).toBe('active');
    unlinkSync(contractPath);
    expect(readAuthorizedOpsCatalog(config, caller).status).toBe('unauthorized');
    expect(existsSync(contractPath)).toBe(false);
    writeFileSync(contractPath, CONTRACT_TEXT);
    const outside = join(dirname(contractPath), 'outside-contract.md');
    writeFileSync(outside, CONTRACT_TEXT);
    unlinkSync(contractPath);
    symlinkSync(outside, contractPath);
    expect(readAuthorizedOpsCatalog(config, caller).status).toBe('unauthorized');
    const frozen = configFor(join(FIXTURE, 'registry.synthetic.json'), 'owner-a');
    const synthetic = readAuthorizedOpsCatalog(frozen, caller);
    expect(synthetic.status).toBe('unauthorized');
    expect(synthetic.inventories).toEqual([]);
  });

  it('refuses a group-writable approval config and a session that is not the configured owner', async () => {
    const { config, registryPath } = materializeFixture('owner-a');
    chmodSync(config, 0o666);
    expect(readAuthorizedOpsCatalog(config, attestOwner('owner-a')).status).toBe('unauthorized');
    chmodSync(config, 0o600);
    expect(readAuthorizedOpsCatalog(config, attestOwner('owner-a')).status).toBe('active');
    const memory = createTempRoot('catalog-auth-memory-');
    mkdirSync(join(memory, '.botharness', 'catalog'), { recursive: true });
    writeFileSync(
      join(memory, '.botharness', 'catalog', 'index.json'),
      JSON.stringify({
        schemaVersion: 1,
        version: 1,
        inventories: [
          {
            id: 'ops',
            authority: 'ops',
            sourceRef: 'ops:asset-catalog',
            version: 1,
            status: 'active',
          },
        ],
      }),
    );
    const tools = createPackTools('ada', {
      memoryDir: () => memory,
      grant: () => undefined,
      catalogSourcePath: () => config,
      catalogSession: () => ({ sessionOwnerId: 'owner-a', ownedBotSlugs: ['ada'] }),
    });
    const tool = tools.find((item) => item.name === 'pack_catalog');
    const allowed = JSON.parse(String(await tool?.execute({}, {} as never))) as {
      inventories: Array<{ briefs: Array<{ name: string }> }>;
    };
    expect(JSON.stringify(allowed)).toContain('SYN-Name-A');
    const foreign = createPackTools('ada', {
      memoryDir: () => memory,
      grant: () => undefined,
      catalogSourcePath: () => config,
      catalogSession: () => ({ sessionOwnerId: 'owner-b', ownedBotSlugs: ['ada'] }),
    });
    const foreignTool = foreign.find((item) => item.name === 'pack_catalog');
    expect(JSON.stringify(await foreignTool?.execute({}, {} as never))).not.toContain('SYN-Name-A');
    const unregistered = createPackTools('ada', {
      memoryDir: () => memory,
      grant: () => undefined,
      catalogSourcePath: () => config,
      catalogSession: () => ({ sessionOwnerId: 'owner-a', ownedBotSlugs: [] }),
    });
    const unregisteredTool = unregistered.find((item) => item.name === 'pack_catalog');
    expect(JSON.stringify(await unregisteredTool?.execute({}, {} as never))).not.toContain(
      'SYN-Name-A',
    );
    expect(
      attestationFromHostSession(
        { sessionOwnerId: 'owner-a', ownedBotSlugs: ['ada'] },
        { kind: 'bot', slug: 'bee' },
      ),
    ).toBeUndefined();
    expect(
      readAuthorizedOpsCatalog(config, attestOwner('owner-a')).inventories.length,
    ).toBeGreaterThan(0);
    expect(registryPath).toContain('registry.json');
  });
});

function opsMemory(): string {
  const memory = createTempRoot('catalog-bot-open-memory-');
  mkdirSync(join(memory, '.botharness', 'catalog'), { recursive: true });
  writeFileSync(
    join(memory, '.botharness', 'catalog', 'index.json'),
    JSON.stringify({
      schemaVersion: 1,
      version: 1,
      inventories: [
        {
          id: 'ops',
          authority: 'ops',
          sourceRef: 'ops:asset-catalog',
          version: 1,
          status: 'active',
        },
      ],
    }),
  );
  return memory;
}

function catalogWithAudiences(audiences: string[]): {
  config: string;
  registryPath: string;
  entryRef: string;
  bodyPath: string;
} {
  const root = createTempRoot('catalog-bot-open-');
  const bodyPath = join(root, 'body.txt');
  writeFileSync(bodyPath, 'SECRET-BODY');
  writeFileSync(join(root, 'CONTRACT.md'), CONTRACT_TEXT);
  writeFileSync(
    join(root, 'entry.json'),
    JSON.stringify({
      registryId: 'syn-inv-a',
      version: 1,
      display: { audiences },
      items: [{ id: 'i1', name: 'SYN-Item-1', brief: 'meta only', entry: 'body.txt' }],
    }),
  );
  const registryPath = join(root, 'registry.json');
  writeFileSync(
    registryPath,
    JSON.stringify({
      sourceRef: 'ops:asset-catalog',
      version: 1,
      updatedAt: '2026-11-06T00:00:00.000Z',
      privacy: PRIVACY,
      contract: 'CONTRACT.md',
      contract_version: '2',
      display: { audiences },
      inventories: [
        {
          id: 'syn-inv-a',
          name: 'SYN-Name-A',
          brief: 'SYN purpose A',
          entry: 'entry.json',
          status: 'active',
          version: 1,
          display: { audiences },
        },
      ],
    }),
  );
  return {
    config: configFor(registryPath, 'owner-a'),
    registryPath,
    entryRef: 'ops:asset-catalog#syn-inv-a',
    bodyPath,
  };
}

async function botCatalog(
  slug: string,
  sessionOwnerId: string,
  ownedBotSlugs: readonly string[],
  config: string,
  entryRef: string,
  actor?: string,
): Promise<{ view: string; opened: string; schema: unknown }> {
  const tools = createPackTools(slug, {
    memoryDir: () => opsMemory(),
    grant: () => undefined,
    catalogSourcePath: () => config,
    catalogSession: () => ({ sessionOwnerId, ownedBotSlugs }),
  });
  const viewTool = tools.find((item) => item.name === 'pack_catalog');
  const openTool = tools.find((item) => item.name === 'pack_catalog_open');
  const view = String(await viewTool?.execute(actor === undefined ? {} : { actor }, {} as never));
  const opened = String(
    await openTool?.execute(actor === undefined ? { entryRef } : { entryRef, actor }, {} as never),
  );
  return { view, opened, schema: openTool?.parameters };
}

describe('bot catalog open', () => {
  it('lets two registered bots in this profile view and open metadata only', async () => {
    const { config, entryRef, bodyPath } = catalogWithAudiences(['profile-owner', 'owner-bots']);
    for (const slug of ['ada', 'bee']) {
      const result = await botCatalog(slug, 'owner-a', ['ada', 'bee'], config, entryRef);
      expect(result.schema).toMatchObject({
        type: 'object',
        properties: { entryRef: { type: 'string' } },
        required: ['entryRef'],
      });
      expect(result.view).toContain('SYN-Name-A');
      const opened = JSON.parse(result.opened) as {
        ok: boolean;
        caller: string;
        items: Array<{ id: string; name: string; brief: string }>;
      };
      expect(opened.ok).toBe(true);
      expect(opened.caller).toBe(`bot:${slug}`);
      expect(opened.items).toEqual([{ id: 'i1', name: 'SYN-Item-1', brief: 'meta only' }]);
      expect(result.opened).not.toContain('SECRET-BODY');
      expect(result.opened).not.toContain(bodyPath);
      expect(result.opened).not.toContain('profile-owner');
    }
  });

  it('refuses owner-only, another bot, a forged actor, an unregistered slug, another profile, and a revoked entryRef', async () => {
    const ownerOnly = catalogWithAudiences(['profile-owner']);
    const hidden = await botCatalog(
      'ada',
      'owner-a',
      ['ada', 'bee'],
      ownerOnly.config,
      ownerOnly.entryRef,
    );
    expect(hidden.opened).not.toContain('SYN-Item-1');
    expect(JSON.parse(hidden.opened).caller).toBe('bot:ada');

    const beeOnly = catalogWithAudiences(['bot:bee']);
    const ada = await botCatalog(
      'ada',
      'owner-a',
      ['ada', 'bee'],
      beeOnly.config,
      beeOnly.entryRef,
    );
    const bee = await botCatalog(
      'bee',
      'owner-a',
      ['ada', 'bee'],
      beeOnly.config,
      beeOnly.entryRef,
    );
    expect(ada.opened).not.toContain('SYN-Item-1');
    expect(JSON.parse(bee.opened).items).toEqual([
      { id: 'i1', name: 'SYN-Item-1', brief: 'meta only' },
    ]);

    const shared = catalogWithAudiences(['owner-bots']);
    const forged = await botCatalog(
      'ada',
      'owner-a',
      ['ada'],
      shared.config,
      shared.entryRef,
      'bee',
    );
    expect(JSON.parse(forged.opened).reason).toBe('actor-mismatch');
    expect(forged.opened).not.toContain('SYN-Item-1');

    const unregistered = await botCatalog(
      'ada',
      'owner-a',
      ['bee'],
      shared.config,
      shared.entryRef,
    );
    expect(unregistered.opened).not.toContain('SYN-Item-1');

    const otherProfile = await botCatalog(
      'ada',
      'profile-b',
      ['ada'],
      shared.config,
      shared.entryRef,
    );
    expect(otherProfile.opened).not.toContain('SYN-Item-1');

    const registry = JSON.parse(readFileSync(shared.registryPath, 'utf8')) as {
      display: { audiences: string[] };
    };
    registry.display.audiences = [];
    writeFileSync(shared.registryPath, JSON.stringify(registry));
    const revoked = await botCatalog('ada', 'owner-a', ['ada'], shared.config, shared.entryRef);
    expect(JSON.parse(revoked.opened).ok).toBe(false);
    expect(revoked.opened).not.toContain('SYN-Item-1');
    expect(revoked.view).not.toContain('SYN-Name-A');
  });
});
