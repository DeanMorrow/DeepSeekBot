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
  version: number | string | null;
  updatedAt: string | null;
  status: 'active' | 'stale' | 'invalid' | 'unreachable' | 'unpopulated';
}

export interface CatalogSourceView {
  ok: true;
  caller: 'profile-owner' | `bot:${string}`;
  sourceRef: typeof OPS_CATALOG_SOURCE;
  status: 'unreachable' | 'unauthorized' | 'invalid' | 'active';
  version: number | string | null;
  updatedAt: string | null;
  fingerprint: string;
  authorizationGaps: Array<{ field: string; reason: 'unproven-field-contract' }>;
  inventories: CatalogInventoryView[];
}

export interface CatalogOpenView {
  ok: boolean;
  reason?: string;
  sourceRef: typeof OPS_CATALOG_SOURCE;
  entryRef: string;
  status: CatalogSourceView['status'] | CatalogInventoryView['status'];
  version: number | string | null;
  updatedAt: string | null;
  items: Array<{ id: string; name: string; brief: string }>;
}

function callerLabel(caller: CatalogCaller): CatalogSourceView['caller'] {
  return caller.kind === 'profile-owner' ? 'profile-owner' : `bot:${caller.slug}`;
}

function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

const PURPOSE_URL = /https?:\/\/[^\s<>"'`]+/gi;

function decodePathEncodings(value: string): string {
  let current = value;
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) return current;
      current = next;
    } catch {
      return current;
    }
  }
  return current;
}

function hasFilesystemPath(value: string): boolean {
  if (/(?:^|[^\w])[A-Za-z]:[\\/]/.test(value)) return true;
  if (/(?:^|[\s"'`(])\\\\[^\s\\]/.test(value)) return true;
  if (/file:/i.test(value)) return true;
  const prose = value.replace(PURPOSE_URL, ' ');
  if (/(?:^|[\s"'`(])\/\/[^\s/]+[\\/]/.test(prose)) return true;
  if (/(?:^|[\s"'`(])\/(?!\/)[\w.~-]/.test(prose)) return true;
  if (/(?:^|[\s\\/])\.\.(?:[\\/]|$)/.test(prose)) return true;
  if (/(?:^|[\s"'`(])\\[^\s\\]/.test(prose)) return true;
  if (/\\[^\\]+\\/.test(prose)) return true;
  return false;
}

function leaksPath(value: string): boolean {
  return hasFilesystemPath(value) || hasFilesystemPath(decodePathEncodings(value));
}

function cleanText(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (text.length === 0 || text.length > limit || leaksPath(text)) return undefined;
  return text;
}

function empty(
  caller: CatalogCaller,
  status: CatalogSourceView['status'],
  authorizationGaps: CatalogSourceView['authorizationGaps'] = [],
): CatalogSourceView {
  const view = {
    caller: callerLabel(caller),
    sourceRef: OPS_CATALOG_SOURCE,
    status,
    version: null,
    updatedAt: null,
    authorizationGaps,
    inventories: [] as CatalogInventoryView[],
  };
  return { ok: true, ...view, fingerprint: fingerprint(view) };
}

function readVersion(value: unknown): number | string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (text === '' || leaksPath(text)) return null;
  return /^-?\d+$/.test(text) ? Number(text) : text;
}

function versionsMatch(left: number | string | null, right: number | string | null): boolean {
  if (left === null || right === null) return false;
  if (typeof left === 'number' && typeof right === 'string' && /^-?\d+$/.test(right)) {
    return left === Number(right);
  }
  if (typeof right === 'number' && typeof left === 'string' && /^-?\d+$/.test(left)) {
    return right === Number(left);
  }
  return left === right;
}

function readTime(record: Record<string, unknown>): string | null {
  const value =
    typeof record.updatedAt === 'string'
      ? record.updatedAt
      : typeof record.updated_at === 'string'
        ? record.updated_at
        : undefined;
  return cleanText(value, 40) ?? null;
}

const CATEGORY_FIELDS = new Set([
  'id',
  'brief',
  'name',
  'kind',
  'version',
  'updatedAt',
  'updated_at',
  'entry',
  'status',
  'sourceRef',
  'owner',
  'purpose',
  'scope',
  'summary',
  'notes',
  'presentation',
  'count',
  'denominator_definition',
  'visibility',
  'private',
  'display',
  'audiences',
]);
const ENTRY_FILE_FIELDS = new Set([
  'id',
  'registryId',
  'name',
  'owner',
  'version',
  'updatedAt',
  'updated_at',
  'items',
  'sourceRef',
  'count',
  'denominator_definition',
  'status_source_policy',
  'unscanned',
  'visibility',
  'private',
  'display',
  'audiences',
]);
const ITEM_FIELDS = new Set([
  'id',
  'name',
  'brief',
  'purpose',
  'owner',
  'status',
  'version',
  'updatedAt',
  'updated_at',
  'trigger',
  'entry',
  'superseded_by',
  'visibility',
  'private',
  'display',
  'audiences',
]);
const ROOT_FIELDS = new Set([
  'schemaVersion',
  'sourceRef',
  'version',
  'updatedAt',
  'updated_at',
  'display',
  'inventories',
  'categories',
  'id',
  'name',
  'role',
  'entry',
  'owner',
  'brief',
  'status',
  'revisions',
  'anti_nesting',
  'scorecard',
  'unique_entry_json',
  'unique_entry_md',
  'contract',
  'contract_version',
  'privacy',
]);

function knownAudience(value: unknown): value is string {
  return (
    value === 'profile-owner' ||
    (typeof value === 'string' && /^bot:[a-z0-9][a-z0-9-]{0,63}$/.test(value))
  );
}

function audienceNames(value: unknown): string[] | 'absent' | 'deny' {
  if (value === undefined) return 'absent';
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => !knownAudience(item))) {
    return 'deny';
  }
  return value;
}

function callerAudience(caller: CatalogCaller): string {
  return caller.kind === 'profile-owner' ? 'profile-owner' : `bot:${caller.slug}`;
}

function layerAudiences(record: Record<string, unknown>): string[] | 'inherit' | 'deny' {
  if (record.visibility === 'private' || record.private === true) return 'deny';
  if ('visibility' in record && record.visibility !== 'private' && record.visibility !== 'public') {
    return 'deny';
  }
  if ('private' in record && typeof record.private !== 'boolean') return 'deny';
  const direct = audienceNames(record.audiences);
  if (direct === 'deny') return 'deny';
  if (record.display === undefined) return direct === 'absent' ? 'inherit' : direct;
  if (
    typeof record.display !== 'object' ||
    record.display === null ||
    Array.isArray(record.display)
  ) {
    return 'deny';
  }
  const display = record.display as Record<string, unknown>;
  if (Object.keys(display).some((key) => key !== 'audiences')) return 'deny';
  const nested = audienceNames(display.audiences);
  if (nested === 'deny' || nested === 'absent') return 'deny';
  if (direct === 'absent') return nested;
  return nested.filter((audience) => direct.includes(audience));
}

function admits(
  record: Record<string, unknown>,
  known: Set<string>,
  caller: CatalogCaller,
): boolean {
  if (Object.keys(record).some((key) => !key.startsWith('machine_') && !known.has(key)))
    return false;
  const layer = layerAudiences(record);
  if (layer === 'deny') return false;
  if (layer === 'inherit') return true;
  return layer.includes(callerAudience(caller));
}

function authorizationGaps(
  record: Record<string, unknown>,
): CatalogSourceView['authorizationGaps'] {
  const gaps: CatalogSourceView['authorizationGaps'] = [];
  if ('privacy' in record) gaps.push({ field: 'privacy', reason: 'unproven-field-contract' });
  if ('contract' in record || 'contract_version' in record) {
    gaps.push({ field: 'contract', reason: 'unproven-field-contract' });
  }
  return gaps;
}

function allowed(display: unknown, caller: CatalogCaller): boolean {
  if (typeof display !== 'object' || display === null || Array.isArray(display)) return false;
  const record = display as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== 'audiences')) return false;
  const audiences = audienceNames(record.audiences);
  if (audiences === 'absent' || audiences === 'deny') return false;
  return audiences.includes(callerAudience(caller));
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function containedFile(root: string, relative: string): string | undefined {
  const decoded = decodePathEncodings(relative);
  if (
    decoded !== relative &&
    (decoded.includes('\0') ||
      decoded.includes('\\') ||
      isAbsolute(decoded) ||
      decoded.split('/').includes('..'))
  ) {
    return undefined;
  }
  if (isAbsolute(relative) || relative.includes('\0') || relative.includes('\\')) return undefined;
  const resolved = resolveContained(root, decoded === relative ? relative : decoded);
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
  briefRejected: boolean;
  version: number | string | null;
  updatedAt: string | null;
  entry: string | null;
  status: string;
  record: Record<string, unknown>;
}

function rowList(value: unknown): Record<string, unknown>[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return undefined;
  const rows: Record<string, unknown>[] = [];
  for (const row of value) {
    if (typeof row !== 'object' || row === null) return undefined;
    rows.push(row as Record<string, unknown>);
  }
  return rows;
}

function inventoriesOf(value: unknown): RegistryInventory[] | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const body = value as { inventories?: unknown; categories?: unknown };
  const inventories = rowList(body.inventories);
  const categories = rowList(body.categories);
  if (inventories === undefined || categories === undefined) return undefined;
  const categoryById = new Map<string, Record<string, unknown>>();
  for (const category of categories) {
    if (typeof category.id !== 'string') return undefined;
    if (categoryById.has(category.id)) return undefined;
    categoryById.set(category.id, category);
  }
  const rows = inventories.length > 0 ? inventories : categories;
  const parsed: RegistryInventory[] = [];
  const seen = new Set<string>();
  for (const record of rows) {
    if (typeof record.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(record.id))
      return undefined;
    if (seen.has(record.id)) return undefined;
    seen.add(record.id);
    const category = categoryById.get(record.id);
    const ownEntry = typeof record.entry === 'string' ? record.entry : null;
    const categoryEntry = typeof category?.entry === 'string' ? category.entry : null;
    const entry = ownEntry ?? categoryEntry;
    const conflict = ownEntry !== null && categoryEntry !== null && ownEntry !== categoryEntry;
    const rawBrief = typeof record.brief === 'string' ? record.brief : undefined;
    const brief = cleanText(record.brief, 160) ?? cleanText(record.name, 80) ?? null;
    parsed.push({
      id: record.id,
      brief: conflict ? null : brief,
      briefRejected:
        conflict ||
        (rawBrief !== undefined &&
          rawBrief.trim() !== '' &&
          cleanText(record.brief, 160) === undefined),
      record: conflict ? { id: record.id, permissionMode: 'entry-conflict' } : record,
      version: readVersion(record.version),
      updatedAt: readTime(record),
      entry,
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
      version: number | string | null;
      updatedAt: string | null;
      display: unknown;
      authorizationGaps: CatalogSourceView['authorizationGaps'];
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
  if (Object.keys(body).some((key) => !ROOT_FIELDS.has(key))) return { status: 'invalid' };
  const inventories = inventoriesOf(registry);
  if (inventories === undefined) return { status: 'invalid' };
  return {
    status: 'ready',
    root: dirname(registryFile),
    sourceRef: OPS_CATALOG_SOURCE,
    version: readVersion(body.version),
    updatedAt: readTime(body),
    display: body.display,
    authorizationGaps: authorizationGaps(body),
    inventories,
  };
}

function entryFileAdmits(root: string, entry: string | null, caller: CatalogCaller): boolean {
  if (entry === null) return true;
  const file = containedFile(root, entry);
  if (file === undefined) return true;
  try {
    const parsed = readJson(file);
    if (typeof parsed !== 'object' || parsed === null) return false;
    return admits(parsed as Record<string, unknown>, ENTRY_FILE_FIELDS, caller);
  } catch {
    return false;
  }
}

function categoryView(root: string, row: RegistryInventory): CatalogInventoryView {
  const base = {
    id: row.id,
    brief: row.brief,
    sourceRef: OPS_CATALOG_SOURCE,
    version: row.version,
    updatedAt: row.updatedAt,
  };
  if (row.briefRejected || (row.brief === null && row.status !== 'unpopulated')) {
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
  if (!versionsMatch(readVersion(body.version), row.version)) {
    return { ...base, entryRef: null, status: 'stale' };
  }
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
  if (!allowed(loaded.display, caller))
    return empty(caller, 'unauthorized', loaded.authorizationGaps);
  const inventories = loaded.inventories.flatMap((row) =>
    admits(row.record, CATEGORY_FIELDS, caller) && entryFileAdmits(loaded.root, row.entry, caller)
      ? [categoryView(loaded.root, row)]
      : [],
  );
  const view = {
    caller: callerLabel(caller),
    sourceRef: OPS_CATALOG_SOURCE,
    status: 'active' as const,
    version: loaded.version,
    updatedAt: loaded.updatedAt,
    authorizationGaps: loaded.authorizationGaps,
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
  const id = entryRef.startsWith(`${OPS_CATALOG_SOURCE}#`)
    ? entryRef.slice(OPS_CATALOG_SOURCE.length + 1)
    : '';
  const row = view.inventories.find((item) => item.entryRef === entryRef || item.id === id);
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
    if (!admits(item, ITEM_FIELDS, caller)) return [];
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
