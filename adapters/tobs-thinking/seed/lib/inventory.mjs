import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { addPrivate } from './bank.mjs';

export const INVENTORY_THRESHOLD = 4;
export const BRIEF_LIMIT = 160;
export const GROUP_AT = 12;

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

export function readIndex(index, actor, owner) {
  const categories = (index.categories ?? []).filter((category) => {
    if (category.visibility !== 'private') return true;
    return actor === owner;
  });
  return {
    version: index.version,
    categories: categories.map((category) => ({
      id: category.id,
      inventory: category.visibility === 'private' && actor !== owner ? null : category.inventory,
      visibility: category.visibility,
    })),
  };
}

export function checkInventory(root, index) {
  const problems = [];
  const raw = JSON.stringify(index);
  if (raw.includes('"items"') || raw.includes('SKILL.md')) problems.push('index-holds-details');
  const skills = skillDirs(root);
  const listed = index.categories ?? [];
  const skillsCategory = listed.find((category) => category.id === 'skills');
  if (skills.length >= INVENTORY_THRESHOLD && !skillsCategory?.inventory) {
    problems.push('skills-need-inventory');
  }
  if (!skillsCategory?.inventory) return { ok: problems.length === 0, problems };
  const inventoryPath = join(root, skillsCategory.inventory);
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
  return { ok: problems.length === 0, problems, inventory };
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
  return {
    ...inventory,
    items: [...inventory.items, item],
    revisions: [
      ...inventory.revisions,
      { version: inventory.revisions.length + 1, reason, verification: 'entry-exists' },
    ],
  };
}
