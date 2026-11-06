import { randomUUID } from 'node:crypto';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export const PACK_SKILLS = [
  'the-top-thinking',
  'fix-bug-doctor',
  'delivery-gate',
  'recall-and-memory',
  'super-agent',
  'ecc-code-baseline',
] as const;

export const PACK_FILES = ['.botharness/super-agent.json', '.botharness/catalog'] as const;
const PRIVATE_BANK = 'memory/private-bank.json';
const SHARED_BANK = '.botharness/approved-lessons.json';
const PRIVATE_MARKERS = ['[private-chat]', 'BEGIN PRIVATE', '私聊原文'];

export interface PackGrant {
  id: string;
  workspacePath: string;
  revokedAt?: string;
}

export interface PackResult {
  ok: boolean;
  reason?: string;
  [key: string]: unknown;
}

interface BankRecord {
  id: string;
  visibility: 'private' | 'shared-approved';
  ownerBotId: string;
  taskSignature: string;
  lesson: string;
  approved?: boolean;
  desensitized?: boolean;
}

function escaped(rootReal: string, candidate: string): boolean {
  const rel = relative(rootReal, candidate);
  return rel === '' ? false : rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel);
}

export function resolveContained(root: string, candidate = '.'): PackResult & { path?: string } {
  if (
    root.length === 0 ||
    candidate.length === 0 ||
    root.includes('\0') ||
    candidate.includes('\0')
  ) {
    return { ok: false, reason: 'invalid-path' };
  }
  let rootReal: string;
  try {
    if (lstatSync(root).isSymbolicLink()) return { ok: false, reason: 'symlink-escape' };
    rootReal = realpathSync(root);
  } catch {
    return { ok: false, reason: 'root-missing' };
  }
  const resolved = resolve(rootReal, candidate);
  if (escaped(rootReal, resolved)) return { ok: false, reason: 'path-escape' };
  const rel = relative(rootReal, resolved);
  let current = rootReal;
  for (const part of rel === '' ? [] : rel.split(sep)) {
    if (part === '' || part === '.' || part === '..') return { ok: false, reason: 'path-escape' };
    current = join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) return { ok: false, reason: 'symlink-escape' };
    } catch {
      continue;
    }
  }
  return { ok: true, path: resolved };
}

function refuseActor(botSlug: string, actor: unknown): PackResult | undefined {
  if (actor !== undefined && actor !== botSlug) return { ok: false, reason: 'actor-mismatch' };
  return undefined;
}

function readBank(file: string): BankRecord[] {
  if (!existsSync(file)) return [];
  const value = JSON.parse(readFileSync(file, 'utf8')) as { records?: BankRecord[] };
  return Array.isArray(value.records) ? value.records : [];
}

function writeBank(file: string, records: readonly BankRecord[]): void {
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ version: 1, records }, null, 2)}\n`);
}

export function privateAdd(
  memoryDir: string,
  botSlug: string,
  input: { task?: string | undefined; lesson?: string | undefined; actor?: unknown },
): PackResult {
  const refused = refuseActor(botSlug, input.actor);
  if (refused !== undefined) return refused;
  const task = input.task?.trim() ?? '';
  const lesson = input.lesson?.trim() ?? '';
  if (task === '' || lesson === '') return { ok: false, reason: 'invalid-input' };
  const bank = resolveContained(memoryDir, PRIVATE_BANK);
  if (!bank.ok || bank.path === undefined) return bank;
  const records = readBank(bank.path);
  const record: BankRecord = {
    id: randomUUID(),
    visibility: 'private',
    ownerBotId: botSlug,
    taskSignature: task,
    lesson,
  };
  records.push(record);
  writeBank(bank.path, records);
  return { ok: true, id: record.id, ownerBotId: botSlug };
}

export function privateRead(
  memoryDir: string,
  botSlug: string,
  input: { id?: string | undefined; actor?: unknown },
): PackResult {
  const refused = refuseActor(botSlug, input.actor);
  if (refused !== undefined) return refused;
  const bank = resolveContained(memoryDir, PRIVATE_BANK);
  if (!bank.ok || bank.path === undefined) return bank;
  const record = readBank(bank.path).find(
    (item) => item.id === input.id && item.visibility === 'private',
  );
  if (record === undefined) return { ok: false, reason: 'not-found' };
  if (record.ownerBotId !== botSlug) return { ok: false, reason: 'denied' };
  return { ok: true, record };
}

export function sharedPublish(
  botSlug: string,
  grant: PackGrant | undefined,
  input: {
    task?: string | undefined;
    lesson?: string | undefined;
    approved?: boolean | undefined;
    desensitized?: boolean | undefined;
    actor?: unknown;
  },
): PackResult {
  const refused = refuseActor(botSlug, input.actor);
  if (refused !== undefined) return refused;
  if (grant === undefined || grant.revokedAt !== undefined)
    return { ok: false, reason: 'grant-unavailable' };
  if (input.approved !== true || input.desensitized !== true)
    return { ok: false, reason: 'not-approved' };
  const lesson = input.lesson?.trim() ?? '';
  const task = input.task?.trim() ?? '';
  if (lesson === '' || task === '' || PRIVATE_MARKERS.some((marker) => lesson.includes(marker))) {
    return { ok: false, reason: 'not-desensitized' };
  }
  const bank = resolveContained(grant.workspacePath, SHARED_BANK);
  if (!bank.ok || bank.path === undefined) return bank;
  const records = readBank(bank.path);
  const record: BankRecord = {
    id: randomUUID(),
    visibility: 'shared-approved',
    ownerBotId: botSlug,
    taskSignature: task,
    lesson,
    approved: true,
    desensitized: true,
  };
  records.push(record);
  writeBank(bank.path, records);
  return {
    ok: true,
    id: record.id,
    reviewerPacket: { id: record.id, taskSignature: task, lesson },
  };
}

export function recall(
  memoryDir: string,
  botSlug: string,
  grant: PackGrant | undefined,
  task: string,
): PackResult {
  const query = task.trim();
  const ownFile = resolveContained(memoryDir, PRIVATE_BANK);
  const privateHits =
    ownFile.ok && ownFile.path !== undefined
      ? readBank(ownFile.path).filter(
          (record) =>
            record.visibility === 'private' &&
            record.ownerBotId === botSlug &&
            query.length > 0 &&
            record.taskSignature.includes(query),
        )
      : [];
  let sharedHits: Array<{ id: string; taskSignature: string; lesson: string }> = [];
  if (grant !== undefined && grant.revokedAt === undefined) {
    const shared = resolveContained(grant.workspacePath, SHARED_BANK);
    if (shared.ok && shared.path !== undefined) {
      sharedHits = readBank(shared.path)
        .filter(
          (record) =>
            record.visibility === 'shared-approved' &&
            record.approved === true &&
            record.desensitized === true,
        )
        .map((record) => ({
          id: record.id,
          taskSignature: record.taskSignature,
          lesson: record.lesson,
        }));
    }
  }
  return { ok: true, privateHits, sharedHits };
}

function copyPack(from: string, to: string): PackResult {
  try {
    if (lstatSync(from).isSymbolicLink()) return { ok: false, reason: 'symlink-escape' };
  } catch {
    return { ok: false, reason: 'source-missing' };
  }
  cpSync(from, to, {
    recursive: true,
    filter: (source) => {
      try {
        return !lstatSync(source).isSymbolicLink();
      } catch {
        return false;
      }
    },
  });
  return { ok: true };
}

export function migratePack(memoryDir: string, seedDir: string): PackResult {
  const root = resolveContained(memoryDir);
  if (!root.ok || root.path === undefined) return root;
  const copied: string[] = [];
  mkdirSync(join(root.path, '.dsh', 'skills'), { recursive: true });
  for (const name of PACK_SKILLS) {
    const from = join(seedDir, '.dsh', 'skills', name);
    if (!existsSync(from)) continue;
    const to = resolveContained(root.path, join('.dsh', 'skills', name));
    if (!to.ok || to.path === undefined) return to;
    const result = copyPack(from, to.path);
    if (!result.ok) return result;
    copied.push(name);
  }
  for (const relative of PACK_FILES) {
    const from = join(seedDir, relative);
    if (!existsSync(from)) continue;
    const to = resolveContained(root.path, relative);
    if (!to.ok || to.path === undefined) return to;
    mkdirSync(join(to.path, '..'), { recursive: true });
    const result = copyPack(from, to.path);
    if (!result.ok) return result;
    copied.push(relative);
  }
  return { ok: true, copied };
}

export interface CatalogOpsRecord {
  status?: 'active' | 'stale' | 'unauthorized' | 'invalid' | 'unreachable';
  version: number | string | null;
  updatedAt: string | null;
  fingerprint?: string;
  briefs: readonly { id: string; name: string; brief: string; entryRef?: string | null }[];
}

export function authorizedCatalogView(
  memoryDir: string,
  botSlug: string,
  input: { actor?: unknown } = {},
  ops?: (sourceRef: string, botSlug: string) => CatalogOpsRecord | undefined,
): PackResult {
  const refused = refuseActor(botSlug, input.actor);
  if (refused !== undefined) return refused;
  const registryFile = resolveContained(memoryDir, '.botharness/catalog/index.json');
  if (!registryFile.ok || registryFile.path === undefined) return registryFile;
  if (!existsSync(registryFile.path)) return { ok: false, reason: 'registry-missing' };
  const registry = JSON.parse(readFileSync(registryFile.path, 'utf8')) as {
    schemaVersion?: number;
    version?: number;
    updatedAt?: string;
    inventories?: Array<Record<string, unknown>>;
  };
  const inventories: Array<Record<string, unknown>> = [];
  for (const item of registry.inventories ?? []) {
    const raw = JSON.stringify(item);
    if (raw.includes('memory/private') || item.visibility === 'private') continue;
    const sourceRef = typeof item.sourceRef === 'string' ? item.sourceRef : null;
    const entry = typeof item.entry === 'string' ? item.entry : null;
    const base = {
      id: item.id,
      brief: item.brief,
      sourceRef,
      authority: item.authority ?? null,
      version: item.version ?? null,
      updatedAt: item.updatedAt ?? null,
      entry: item.authority === 'ops' ? null : entry,
    };
    if (item.authority === 'ops') {
      const remote = sourceRef === null ? undefined : ops?.(sourceRef, botSlug);
      if (remote === undefined) {
        inventories.push({ ...base, status: 'unreachable', briefs: [], entryRef: null });
        continue;
      }
      inventories.push({
        ...base,
        status: remote.status ?? (remote.version !== item.version ? 'stale' : 'active'),
        version: remote.version,
        updatedAt: remote.updatedAt,
        entry: null,
        entryRef: null,
        fingerprint: remote.fingerprint ?? null,
        briefs: remote.briefs,
      });
      continue;
    }
    if (item.status === 'unpopulated' || entry === null) {
      inventories.push({ ...base, status: 'unpopulated', briefs: [] });
      continue;
    }
    const file = resolveContained(memoryDir, entry);
    if (!file.ok || file.path === undefined || !existsSync(file.path)) {
      inventories.push({ ...base, status: 'unreachable', briefs: [] });
      continue;
    }
    const body = JSON.parse(readFileSync(file.path, 'utf8')) as {
      registryId?: string;
      version?: number;
      updatedAt?: string;
      items?: Array<{ id: string; name: string; brief: string }>;
    };
    if (body.registryId !== item.id) {
      inventories.push({ ...base, status: 'invalid', briefs: [] });
      continue;
    }
    if (body.version !== item.version) {
      inventories.push({
        ...base,
        status: 'stale',
        version: body.version ?? null,
        updatedAt: body.updatedAt ?? null,
        briefs: [],
      });
      continue;
    }
    inventories.push({
      ...base,
      status: 'active',
      briefs: (body.items ?? []).map((brief) => ({
        id: brief.id,
        name: brief.name,
        brief: brief.brief,
      })),
    });
  }
  return {
    ok: true,
    botSlug,
    schemaVersion: registry.schemaVersion ?? null,
    version: registry.version ?? null,
    updatedAt: registry.updatedAt ?? null,
    reread: 'explicit',
    push: false,
    modelSkillCatalog: 'untested',
    directToolListOmitsSkill: true,
    directOmissionMeansModelLoadFailed: false,
    inventories,
  };
}

export function rollbackPack(memoryDir: string): PackResult {
  const root = resolveContained(memoryDir);
  if (!root.ok || root.path === undefined) return root;
  const removed: string[] = [];
  const targets = [...PACK_SKILLS.map((name) => join('.dsh', 'skills', name)), ...PACK_FILES];
  for (const relative of targets) {
    const contained = resolveContained(root.path, relative);
    if (!contained.ok || contained.path === undefined) return contained;
    if (!existsSync(contained.path)) continue;
    if (lstatSync(contained.path).isSymbolicLink()) return { ok: false, reason: 'symlink-escape' };
    rmSync(contained.path, { recursive: true, force: true });
    removed.push(relative);
  }
  return { ok: true, removed };
}
