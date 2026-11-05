import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

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

function samePath(left, right) {
  return resolve(left) === resolve(right);
}

export function migrateSkills({ seedDir, targetDir, siblings = [], replaceSkills = false }) {
  if (siblings.some((sibling) => samePath(sibling, targetDir))) {
    return { ok: false, reason: 'target-is-sibling' };
  }
  const sourceRoot = join(seedDir, '.dsh', 'skills');
  const targetRoot = join(targetDir, '.dsh', 'skills');
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
    cpSync(from, to, { recursive: true });
    copied.push(name);
  }
  const files = [];
  for (const relative of PACK_FILES) {
    const from = join(seedDir, relative);
    const to = join(targetDir, relative);
    if (!existsSync(from)) continue;
    if (existsSync(to) && !replaceSkills) {
      skipped.push(relative);
      continue;
    }
    mkdirSync(join(to, '..'), { recursive: true });
    cpSync(from, to);
    files.push(relative);
  }
  for (const relative of PACK_DIRS) {
    const from = join(seedDir, relative);
    const to = join(targetDir, relative);
    if (!existsSync(from)) continue;
    if (existsSync(to) && !replaceSkills) {
      skipped.push(relative);
      continue;
    }
    cpSync(from, to, { recursive: true });
    files.push(relative);
  }
  return {
    ok: true,
    copied,
    files,
    skipped,
    soulUntouched: existsSync(join(targetDir, 'SOUL.md')),
  };
}

export function rollbackSkills(targetDir) {
  const removed = [];
  for (const name of PACK_SKILLS) {
    const dir = join(targetDir, '.dsh', 'skills', name);
    if (!existsSync(dir)) continue;
    rmSync(dir, { recursive: true, force: true });
    removed.push(name);
  }
  for (const relative of PACK_FILES) {
    const path = join(targetDir, relative);
    if (!existsSync(path)) continue;
    rmSync(path);
    removed.push(relative);
  }
  for (const relative of PACK_DIRS) {
    const path = join(targetDir, relative);
    if (!existsSync(path)) continue;
    rmSync(path, { recursive: true, force: true });
    removed.push(relative);
  }
  return { removed };
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
