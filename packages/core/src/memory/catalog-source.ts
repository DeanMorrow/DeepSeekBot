import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';

import { resolveContained } from './host-pack.js';

export const OPS_CATALOG_SOURCE = 'ops:asset-catalog' as const;

export type CatalogCaller = { kind: 'profile-owner' } | { kind: 'bot'; slug: string };

export interface CatalogInventoryView {
  id: string;
  brief: string | null;
  sourceRef: typeof OPS_CATALOG_SOURCE;
  entryRef: string | null;
  version: number | null;
  updatedAt: string | null;
  status: 'active' | 'stale' | 'invalid' | 'unreachable' | 'unpopulated';
}

export interface CatalogSourceView {
  ok: true;
  caller: 'profile-owner' | `bot:${string}`;
  sourceRef: typeof OPS_CATALOG_SOURCE;
  status: 'unreachable' | 'unauthorized' | 'invalid' | 'active';
  version: number | null;
  updatedAt: string | null;
  fingerprint: string;
  inventories: CatalogInventoryView[];
}

export interface CatalogOpenView {
  ok: boolean;
  reason?: string;
  sourceRef: typeof OPS_CATALOG_SOURCE;
  entryRef: string;
  status: CatalogSourceView['status'] | CatalogInventoryView['status'];
  version: number | null;
  updatedAt: string | null;
  items: Array<{ id: string; name: string; brief: string }>;
}

function callerLabel(caller: CatalogCaller): CatalogSourceView['caller'] {
  return caller.kind === 'profile-owner' ? 'profile-owner' : `bot:${caller.slug}`;
}

function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function leaksPath(value: string): boolean {
  return value.includes('/') || value.includes('\\') || /^[A-Za-z]:/.test(value);
}

function cleanText(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (text.length === 0 || text.length > limit || leaksPath(text)) return undefined;
  return text;
}

function empty(caller: CatalogCaller, status: CatalogSourceView['status']): CatalogSourceView {
  const view = {
    caller: callerLabel(caller),
    sourceRef: OPS_CATALOG_SOURCE,
    status,
    version: null,
    updatedAt: null,
    inventories: [] as CatalogInventoryView[],
  };
  return { ok: true, ...view, fingerprint: fingerprint(view) };
}

function allowed(display: unknown, caller: CatalogCaller): boolean {
  if (typeof display !== 'object' || display === null) return false;
  const audiences = (display as { audiences?: unknown }).audiences;
  if (!Array.isArray(audiences)) return false;
  const expected = caller.kind === 'profile-owner' ? 'profile-owner' : `bot:${caller.slug}`;
  return audiences.some((audience) => audience === expected);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function containedFile(root: string, relative: string): string | undefined {
  if (isAbsolute(relative) || relative.includes('\0')) return undefined;
  const resolved = resolveContained(root, relative);
  if (!resolved.ok || resolved.path === undefined) return undefined;
  try {
    if (lstatSync(resolved.path).isSymbolicLink() || !lstatSync(resolved.path).isFile())
      return undefined;
  } catch {
    return undefined;
  }
  return resolved.path;
}

interface RegistryInventory {
  id: string;
  brief: string | null;
  version: number | null;
  updatedAt: string | null;
  entry: string | null;
  status: string;
}

function inventoriesOf(value: unknown): RegistryInventory[] | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const rows = (value as { inventories?: unknown }).inventories;
  if (!Array.isArray(rows)) return undefined;
  const parsed: RegistryInventory[] = [];
  for (const row of rows) {
    if (typeof row !== 'object' || row === null) return undefined;
    const record = row as Record<string, unknown>;
    if (typeof record.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(record.id))
      return undefined;
    parsed.push({
      id: record.id,
      brief: cleanText(record.brief, 160) ?? null,
      version: typeof record.version === 'number' ? record.version : null,
      updatedAt: cleanText(record.updatedAt, 40) ?? null,
      entry: typeof record.entry === 'string' ? record.entry : null,
      status: typeof record.status === 'string' ? record.status : 'active',
    });
  }
  return parsed;
}

function loadRegistry(configPath: string):
  | { status: 'unreachable' | 'invalid' }
  | {
      status: 'ready';
      root: string;
      sourceRef: string;
      version: number | null;
      updatedAt: string | null;
      display: unknown;
      inventories: RegistryInventory[];
    } {
  if (!existsSync(configPath)) return { status: 'unreachable' };
  try {
    if (lstatSync(configPath).isSymbolicLink()) return { status: 'unreachable' };
  } catch {
    return { status: 'unreachable' };
  }
  let config: unknown;
  try {
    config = readJson(configPath);
  } catch {
    return { status: 'invalid' };
  }
  if (typeof config !== 'object' || config === null) return { status: 'invalid' };
  const registryPath = (config as { registryPath?: unknown }).registryPath;
  const declared = (config as { sourceRef?: unknown }).sourceRef;
  if (declared !== undefined && declared !== OPS_CATALOG_SOURCE) return { status: 'invalid' };
  if (typeof registryPath !== 'string' || registryPath.trim() === '')
    return { status: 'unreachable' };
  const registryFile = isAbsolute(registryPath)
    ? registryPath
    : join(dirname(configPath), registryPath);
  try {
    if (!existsSync(registryFile) || lstatSync(registryFile).isSymbolicLink())
      return { status: 'unreachable' };
  } catch {
    return { status: 'unreachable' };
  }
  let registry: unknown;
  try {
    registry = readJson(registryFile);
  } catch {
    return { status: 'invalid' };
  }
  if (typeof registry !== 'object' || registry === null) return { status: 'invalid' };
  const body = registry as Record<string, unknown>;
  if (body.sourceRef !== undefined && body.sourceRef !== OPS_CATALOG_SOURCE)
    return { status: 'invalid' };
  const inventories = inventoriesOf(registry);
  if (inventories === undefined) return { status: 'invalid' };
  return {
    status: 'ready',
    root: dirname(registryFile),
    sourceRef: OPS_CATALOG_SOURCE,
    version: typeof body.version === 'number' ? body.version : null,
    updatedAt: cleanText(body.updatedAt, 40) ?? null,
    display: body.display,
    inventories,
  };
}

function categoryView(root: string, row: RegistryInventory): CatalogInventoryView {
  const base = {
    id: row.id,
    brief: row.brief,
    sourceRef: OPS_CATALOG_SOURCE,
    version: row.version,
    updatedAt: row.updatedAt,
  };
  if (row.brief === null && row.status !== 'unpopulated') {
    return { ...base, entryRef: null, status: 'invalid' };
  }
  if (row.status === 'unpopulated' || row.entry === null) {
    return { ...base, entryRef: null, status: 'unpopulated' };
  }
  const file = containedFile(root, row.entry);
  if (file === undefined) return { ...base, entryRef: null, status: 'unreachable' };
  let parsed: unknown;
  try {
    parsed = readJson(file);
  } catch {
    return { ...base, entryRef: null, status: 'invalid' };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { ...base, entryRef: null, status: 'invalid' };
  }
  const body = parsed as { registryId?: unknown; version?: unknown };
  if (body.registryId !== row.id) return { ...base, entryRef: null, status: 'invalid' };
  if (body.version !== row.version) return { ...base, entryRef: null, status: 'stale' };
  return {
    ...base,
    entryRef: `${OPS_CATALOG_SOURCE}#${row.id}`,
    status: 'active',
  };
}

export function readAuthorizedOpsCatalog(
  configPath: string | undefined,
  caller: CatalogCaller,
): CatalogSourceView {
  if (configPath === undefined || configPath.trim() === '') return empty(caller, 'unreachable');
  const loaded = loadRegistry(configPath);
  if (loaded.status !== 'ready') return empty(caller, loaded.status);
  if (!allowed(loaded.display, caller)) return empty(caller, 'unauthorized');
  const inventories = loaded.inventories.map((row) => categoryView(loaded.root, row));
  const view = {
    caller: callerLabel(caller),
    sourceRef: OPS_CATALOG_SOURCE,
    status: 'active' as const,
    version: loaded.version,
    updatedAt: loaded.updatedAt,
    inventories,
  };
  return { ok: true, ...view, fingerprint: fingerprint(view) };
}

export function openAuthorizedOpsEntry(
  configPath: string | undefined,
  caller: CatalogCaller,
  entryRef: string,
): CatalogOpenView {
  const refused = {
    ok: false,
    sourceRef: OPS_CATALOG_SOURCE,
    entryRef,
    version: null,
    updatedAt: null,
    items: [] as CatalogOpenView['items'],
  };
  const view = readAuthorizedOpsCatalog(configPath, caller);
  if (view.status !== 'active') return { ...refused, reason: view.status, status: view.status };
  const row = view.inventories.find((item) => item.entryRef === entryRef);
  if (row === undefined) return { ...refused, reason: 'entry-unknown', status: 'unauthorized' };
  if (row.status !== 'active' || row.entryRef === null) {
    return { ...refused, reason: row.status, status: row.status };
  }
  const loaded = loadRegistry(configPath ?? '');
  if (loaded.status !== 'ready')
    return { ...refused, reason: loaded.status, status: loaded.status };
  const source = loaded.inventories.find((item) => `${OPS_CATALOG_SOURCE}#${item.id}` === entryRef);
  if (source?.entry == null) return { ...refused, reason: 'unreachable', status: 'unreachable' };
  const file = containedFile(loaded.root, source.entry);
  if (file === undefined) return { ...refused, reason: 'unreachable', status: 'unreachable' };
  const parsed = readJson(file) as { items?: Array<Record<string, unknown>> };
  const items = (parsed.items ?? []).flatMap((item) => {
    const id = cleanText(item.id, 64);
    const name = cleanText(item.name, 80);
    const brief = cleanText(item.brief, 160);
    if (id === undefined || name === undefined || brief === undefined) return [];
    return [{ id, name, brief }];
  });
  return {
    ok: true,
    sourceRef: OPS_CATALOG_SOURCE,
    entryRef,
    status: 'active',
    version: row.version,
    updatedAt: row.updatedAt,
    items,
  };
}
