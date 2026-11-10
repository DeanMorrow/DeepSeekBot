import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { resolveContained } from './bounds.mjs';
import { hostBot } from './identity.mjs';

export const PACK_SKILLS = [
  'the-top-thinking',
  'fix-bug-doctor',
  'delivery-gate',
  'recall-and-memory',
  'super-agent',
  'ecc-code-baseline',
];

export const PACK_FILES = ['.botharness/super-agent.json'];
export const PACK_DIRS = ['.botharness/catalog'];

function authorize(authorization, targetDir) {
  const who = hostBot(authorization?.identity);
  if (!who.ok) return who;
  const root = resolveContained(authorization.root);
  if (!root.ok) return root;
  const target = resolveContained(authorization.root, targetDir);
  if (!target.ok) return target;
  if (target.path !== root.path) return { ok: false, reason: 'target-not-authorized' };
  return { ok: true, root: root.path };
}

function copyContained(from, to) {
  let sourceStat;
  try {
    sourceStat = lstatSync(from);
  } catch {
    return { ok: false, reason: 'source-missing' };
  }
  if (sourceStat.isSymbolicLink()) return { ok: false, reason: 'symlink-escape' };
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

export function migrateSkills({ seedDir, targetDir, authorization, replaceSkills = false }) {
  const allowed = authorize(authorization, targetDir);
  if (!allowed.ok) return allowed;
  const sourceRoot = join(seedDir, '.dsh', 'skills');
  const targetRoot = join(allowed.root, '.dsh', 'skills');
  const targetSkills = resolveContained(allowed.root, '.dsh/skills');
  if (!targetSkills.ok) return targetSkills;
  mkdirSync(targetRoot, { recursive: true });
  const copied = [];
  const skipped = [];
  for (const name of PACK_SKILLS) {
    const from = join(sourceRoot, name);
    if (!existsSync(from)) continue;
    const to = join(targetRoot, name);
    if (existsSync(to) && !replaceSkills) {
      skipped.push(name);
      continue;
    }
    const copiedFile = copyContained(from, to);
    if (!copiedFile.ok) return copiedFile;
    copied.push(name);
  }
  const files = [];
  for (const relative of PACK_FILES) {
    const from = join(seedDir, relative);
    const to = join(allowed.root, relative);
    if (!resolveContained(allowed.root, relative).ok) return { ok: false, reason: 'path-escape' };
    if (!existsSync(from)) continue;
    if (existsSync(to) && !replaceSkills) {
      skipped.push(relative);
      continue;
    }
    mkdirSync(join(to, '..'), { recursive: true });
    const copiedFile = copyContained(from, to);
    if (!copiedFile.ok) return copiedFile;
    files.push(relative);
  }
  for (const relative of PACK_DIRS) {
    const from = join(seedDir, relative);
    const to = join(allowed.root, relative);
    if (!resolveContained(allowed.root, relative).ok) return { ok: false, reason: 'path-escape' };
    if (!existsSync(from)) continue;
    if (existsSync(to) && !replaceSkills) {
      skipped.push(relative);
      continue;
    }
    const copiedDir = copyContained(from, to);
    if (!copiedDir.ok) return copiedDir;
    files.push(relative);
  }
  return {
    ok: true,
    copied,
    files,
    skipped,
    soulUntouched: existsSync(join(allowed.root, 'SOUL.md')),
  };
}

export function rollbackSkills(targetDir, authorization) {
  const allowed = authorize(authorization, targetDir);
  if (!allowed.ok) return allowed;
  const removed = [];
  const removeInside = (relative) => {
    const contained = resolveContained(allowed.root, relative);
    if (!contained.ok) return contained;
    if (!existsSync(contained.path)) return { ok: true };
    if (lstatSync(contained.path).isSymbolicLink()) return { ok: false, reason: 'symlink-escape' };
    rmSync(contained.path, { recursive: true, force: true });
    removed.push(relative);
    return { ok: true };
  };
  for (const name of PACK_SKILLS) {
    const removedPath = removeInside(join('.dsh', 'skills', name));
    if (!removedPath.ok) return removedPath;
  }
  for (const relative of [...PACK_FILES, ...PACK_DIRS]) {
    const removedPath = removeInside(relative);
    if (!removedPath.ok) return removedPath;
  }
  return { ok: true, removed };
}

export function snapshotTree(dir) {
  if (!existsSync(dir)) return null;
  const names = ['SOUL.md', 'MEMORY.md'];
  const out = {};
  for (const name of names) {
    const path = join(dir, name);
    if (existsSync(path) && statSync(path).isFile()) out[name] = readFileSync(path, 'utf8');
  }
  return out;
}
