import { lstatSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

function escaped(rootReal, candidate) {
  const rel = relative(rootReal, candidate);
  return rel === '' ? false : rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel);
}

function linkEscape(path) {
  try {
    const stat = lstatSync(path);
    if (!stat.isSymbolicLink()) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Real path must stay inside an existing authorized directory.
 * Absolute paths, `..`, symlinks and Windows junctions (lstat reports them as links) are refused.
 */
export function resolveContained(root, candidate = '.') {
  if (typeof root !== 'string' || typeof candidate !== 'string')
    return { ok: false, reason: 'invalid-path' };
  if (
    root.length === 0 ||
    candidate.length === 0 ||
    root.includes('\0') ||
    candidate.includes('\0')
  ) {
    return { ok: false, reason: 'invalid-path' };
  }
  let rootReal;
  try {
    if (linkEscape(root)) return { ok: false, reason: 'symlink-escape' };
    rootReal = realpathSync(root);
  } catch {
    return { ok: false, reason: 'root-missing' };
  }
  const resolved = resolve(rootReal, candidate);
  if (escaped(rootReal, resolved)) return { ok: false, reason: 'path-escape' };
  const rel = relative(rootReal, resolved);
  const parts = rel === '' ? [] : rel.split(sep);
  let current = rootReal;
  for (const part of parts) {
    if (part === '' || part === '.' || part === '..') return { ok: false, reason: 'path-escape' };
    current = join(current, part);
    let stat;
    try {
      stat = lstatSync(current);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) return { ok: false, reason: 'symlink-escape' };
  }
  return { ok: true, path: resolved };
}
