import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { addPrivate } from './bank.mjs';

export const INVENTORY_THRESHOLD = 4;
export const BRIEF_LIMIT = 160;
export const GROUP_AT = 12;
export const SCHEMA_VERSION = 1;
export const REGISTRY_ENTRY = '.botharness/catalog/index.json';
export const REGISTRY_ID = 'tobs-thinking-catalog';
export const REGISTRY_OWNER = 'tobs-thinking-seed';

export function skillDirs(root) {
  const base = join(root, '.dsh', 'skills');
  if (!existsSync(base)) return [];
  return readdirSync(base)
    .filter((name) => statSync(join(base, name)).isDirectory())
    .filter((name) => existsSync(join(base, name, 'SKILL.md')))
    .sort();
}

function briefOf(item) {
  return {
    id: item.id,
    name: item.name,
    brief: item.brief,
    entry: item.entry,
    status: item.status,
    version: item.version,
    owner: item.owner,
    ...(item.replacement === undefined ? {} : { replacement: item.replacement }),
  };
}

export function searchBriefs(items, query) {
  const needle = String(query ?? '')
    .trim()
    .toLowerCase();
  if (!needle) return [];
  return items
    .filter((item) => item.status !== 'disabled')
    .filter((item) => `${item.id} ${item.name} ${item.brief}`.toLowerCase().includes(needle))
    .map(briefOf);
}

export function groupBriefs(items, groupAt = GROUP_AT) {
  const briefs = items.map(briefOf);
  if (briefs.length < groupAt) return { mode: 'list', briefs };
  const groups = new Map();
  for (const item of briefs) {
    const key = item.status;
    const group = groups.get(key) ?? [];
    group.push(item.id);
    groups.set(key, group);
  }
  return {
    mode: 'grouped',
    groups: [...groups].map(([key, ids]) => ({ key, ids })),
  };
}

function privateLeak(value) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  return (
    raw.includes('memory/private') ||
    raw.includes('"visibility":"private"') ||
    raw.includes('"visibility": "private"')
  );
}

/** Client payload. Drops private paths before anything is sent. The public file must already be clean. */
export function publicView(registry) {
  const inventories = (registry.inventories ?? [])
    .filter((item) => item.visibility !== 'private' && !privateLeak(item))
    .map((item) => ({
      id: item.id,
      brief: item.brief,
      entry: item.entry,
      owner: item.owner,
      version: item.version,
      updatedAt: item.updatedAt,
      status: item.status,
      ...(item.replacement === undefined ? {} : { replacement: item.replacement }),
    }));
  return {
    schemaVersion: registry.schemaVersion,
    id: registry.id,
    role: 'registry',
    entry: REGISTRY_ENTRY,
    owner: registry.owner,
    brief: registry.brief,
    version: registry.version,
    updatedAt: registry.updatedAt,
    status: registry.status,
    inventories,
  };
}

function bump(registry, reason, at, inventories) {
  const version = registry.version + 1;
  return {
    ...registry,
    version,
    updatedAt: at,
    inventories,
    revisions: [
      ...(registry.revisions ?? []),
      { version, reason, verification: 'registry-updated-with-inventory' },
    ],
  };
}

export function renameInventory(registry, { id, entry, reason, at }) {
  if (!registry.inventories.some((item) => item.id === id))
    return { ok: false, reason: 'missing-inventory' };
  if (
    entry === REGISTRY_ENTRY ||
    registry.inventories.some((item) => item.entry === entry && item.id !== id)
  ) {
    return { ok: false, reason: 'duplicate-entry' };
  }
  const inventories = registry.inventories.map((item) =>
    item.id === id ? { ...item, entry, version: item.version + 1, updatedAt: at } : item,
  );
  return { ok: true, registry: bump(registry, reason, at, inventories) };
}

export function disableInventory(registry, { id, replacement, reason, at }) {
  if (!replacement) return { ok: false, reason: 'replacement-required' };
  if (!registry.inventories.some((item) => item.id === id))
    return { ok: false, reason: 'missing-inventory' };
  const inventories = registry.inventories.map((item) =>
    item.id === id
      ? { ...item, status: 'disabled', replacement, version: item.version + 1, updatedAt: at }
      : item,
  );
  return { ok: true, registry: bump(registry, reason, at, inventories) };
}

export function recordInventoryChange(registry, id, { version, reason, at }) {
  if (!registry.inventories.some((item) => item.id === id))
    return { ok: false, reason: 'missing-inventory' };
  const inventories = registry.inventories.map((item) =>
    item.id === id ? { ...item, version, updatedAt: at } : item,
  );
  return { ok: true, registry: bump(registry, reason, at, inventories) };
}

export function checkInventory(root, index) {
  const problems = [];
  const raw = JSON.stringify(index);
  if (raw.includes('"items"') || raw.includes('SKILL.md')) problems.push('index-holds-details');
  const skills = skillDirs(root);
  const listed = index.inventories ?? [];
  const skillsCategory = listed.find(
    (category) => category.id === 'skills' && category.status !== 'disabled',
  );
  const inventoryRel = skillsCategory?.entry ?? skillsCategory?.inventory;
  if (skills.length >= INVENTORY_THRESHOLD && !inventoryRel) {
    problems.push('skills-need-inventory');
  }
  if (!inventoryRel) return { ok: problems.length === 0, problems };
  const inventoryPath = join(root, inventoryRel);
  if (!existsSync(inventoryPath)) {
    problems.push('skills-inventory-missing');
    return { ok: false, problems };
  }
  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  const ids = inventory.items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) problems.push('duplicate-id');
  for (const item of inventory.items) {
    if (
      !item.id ||
      !item.name ||
      !item.brief ||
      !item.entry ||
      !item.status ||
      !item.version ||
      !item.owner
    ) {
      problems.push(`incomplete:${item.id ?? 'unknown'}`);
    }
    if ([...String(item.brief)].length > BRIEF_LIMIT) problems.push(`brief-too-long:${item.id}`);
    if (item.status === 'deprecated' && !item.replacement)
      problems.push(`deprecated-without-replacement:${item.id}`);
    if (!existsSync(join(root, item.entry))) problems.push(`missing-entry:${item.id}`);
  }
  for (const name of skills) {
    if (!ids.includes(name)) problems.push(`unlisted:${name}`);
  }
  const revisions = inventory.revisions ?? [];
  if (
    revisions.length === 0 ||
    revisions.some((revision) => !revision.reason || !revision.verification)
  ) {
    problems.push('revision-incomplete');
  }
  if (inventory.registryId !== undefined && inventory.registryId !== skillsCategory.id) {
    problems.push('drift:skills');
  }
  if (
    inventory.version !== undefined &&
    skillsCategory.version !== undefined &&
    inventory.version !== skillsCategory.version
  ) {
    problems.push('drift:skills-version');
  }
  return { ok: problems.length === 0, problems, inventory };
}

export function checkRegistry(root) {
  const registryPath = join(root, REGISTRY_ENTRY);
  if (!existsSync(registryPath)) return { ok: false, problems: ['registry-missing'] };
  const raw = readFileSync(registryPath, 'utf8');
  const registry = JSON.parse(raw);
  const problems = [];
  if (privateLeak(raw)) problems.push('private-path-in-public-registry');
  if (registry.schemaVersion !== SCHEMA_VERSION) problems.push('schema-version');
  if (
    registry.role !== 'registry' ||
    registry.entry !== REGISTRY_ENTRY ||
    registry.owner !== REGISTRY_OWNER
  ) {
    problems.push('registry-identity');
  }
  if (!registry.brief || !registry.version || !registry.updatedAt || !registry.status)
    problems.push('registry-incomplete');
  const entries = registry.inventories ?? [];
  if (
    entries.some(
      (item) => item.inventories || item.role === 'registry' || item.entry === REGISTRY_ENTRY,
    )
  ) {
    problems.push('nested-registry');
  }
  const ids = entries.map((item) => item.id);
  const paths = entries.map((item) => item.entry);
  if (new Set(ids).size !== ids.length) problems.push('duplicate-inventory-id');
  if (new Set(paths).size !== paths.length) problems.push('duplicate-truth-source');
  for (const item of entries) {
    if (
      !item.id ||
      !item.brief ||
      !item.entry ||
      !item.owner ||
      !item.version ||
      !item.updatedAt ||
      !item.status
    ) {
      problems.push(`incomplete-inventory:${item.id ?? 'unknown'}`);
    }
    const target = join(root, item.entry ?? '');
    const present = item.entry && existsSync(target);
    if (item.status === 'active' && !present) problems.push(`dead-entry:${item.id}`);
    if (item.status === 'disabled' && !item.replacement)
      problems.push(`disabled-without-replacement:${item.id}`);
    if (present && item.status === 'active') {
      const body = JSON.parse(readFileSync(target, 'utf8'));
      if (body.role === 'registry') problems.push(`nested-registry:${item.id}`);
      if (body.registryId !== item.id) problems.push(`drift:${item.id}`);
      if (body.version !== item.version) problems.push(`drift:${item.id}-version`);
    }
  }
  const catalogDir = join(root, '.botharness', 'catalog');
  if (existsSync(catalogDir)) {
    for (const name of readdirSync(catalogDir)) {
      if (!name.endsWith('.json') || name === 'index.json') continue;
      const relative = `.botharness/catalog/${name}`;
      if (!paths.includes(relative)) problems.push(`unlisted-inventory:${relative}`);
    }
  }
  problems.push(...checkInventory(root, registry).problems);
  const view = publicView(registry);
  if (privateLeak(view)) problems.push('public-view-leaks');
  return { ok: problems.length === 0, problems, publicView: view };
}

export function readPublicCatalog(root) {
  const checked = checkRegistry(root);
  if (!checked.publicView) return checked;
  const inventories = [];
  for (const item of checked.publicView.inventories) {
    if (item.status !== 'active') continue;
    const body = JSON.parse(readFileSync(join(root, item.entry), 'utf8'));
    inventories.push({ id: item.id, briefs: (body.items ?? []).map(briefOf) });
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    registry: checked.publicView,
    inventories,
    problems: checked.problems,
  };
}

export function findLocalSkill(inventory, query) {
  const hits = searchBriefs(inventory.items, query);
  if (hits.length > 0) return { hit: true, briefs: hits, detailLoaded: false };
  return {
    hit: false,
    report: {
      kind: 'missing-local-skill',
      query,
      toldHuman: true,
      installGranted: false,
      outboundGranted: false,
      paidGranted: false,
      findSkills: 'awaiting-formal-entry',
    },
  };
}

export function loadEntry(root, entry) {
  const path = join(root, entry);
  if (!existsSync(path)) return { ok: false, reason: 'missing-entry' };
  return { ok: true, body: readFileSync(path, 'utf8') };
}

export function addRetrospective(store, input) {
  const added = addPrivate(store.bank, {
    ownerBotId: input.actor,
    taskSignature: input.title,
    lesson: input.lesson,
  });
  if (!added.ok) return added;
  const mine = store.bank.records.filter(
    (record) => record.visibility === 'private' && record.ownerBotId === input.actor,
  );
  if (mine.length >= INVENTORY_THRESHOLD) {
    const items = mine.map((record) => ({
      id: record.id,
      name: record.taskSignature,
      brief: input.actor === record.ownerBotId ? record.taskSignature : '',
      entry: `memory/private-bank.json#${record.id}`,
      status: 'active',
      version: 1,
      owner: input.actor,
    }));
    const previous = store.inventory?.revisions?.length ?? 0;
    store.inventory = {
      owner: input.actor,
      visibility: 'private',
      items,
      revisions: [
        ...(store.inventory?.revisions ?? []),
        {
          version: previous + 1,
          reason: 'private retrospective count reached the inventory threshold',
          verification: 'titles-owned-by-actor',
        },
      ],
    };
  }
  return { ok: true, id: added.record.id };
}

export function readPrivateTitles(store, actor) {
  if (!store.inventory) return { ok: true, titles: [] };
  if (store.inventory.owner !== actor || store.inventory.visibility !== 'private') {
    return { ok: false, reason: 'denied', titles: [] };
  }
  return { ok: true, titles: store.inventory.items.map((item) => item.name) };
}

export function checkPrivate(store, actor) {
  const mine = store.bank.records.filter(
    (record) => record.visibility === 'private' && record.ownerBotId === actor,
  );
  if (mine.length < INVENTORY_THRESHOLD) return { ok: true, problems: [] };
  if (!store.inventory || store.inventory.owner !== actor) {
    return { ok: false, problems: ['private-inventory-missing'] };
  }
  const ids = new Set(store.inventory.items.map((item) => item.id));
  const problems = mine
    .filter((record) => !ids.has(record.id))
    .map((record) => `unlisted:${record.id}`);
  const dumped = JSON.stringify(store.inventory);
  for (const record of mine) {
    if (record.lesson !== record.taskSignature && dumped.includes(record.lesson)) {
      problems.push(`body-in-index:${record.id}`);
    }
  }
  return { ok: problems.length === 0, problems };
}

export function appendSkillBrief(inventory, item, reason) {
  if (inventory.items.some((current) => current.id === item.id)) return inventory;
  const revisions = [
    ...inventory.revisions,
    { version: inventory.revisions.length + 1, reason, verification: 'entry-exists' },
  ];
  return { ...inventory, version: revisions.length, items: [...inventory.items, item], revisions };
}
