import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const PACK_SKILLS = [
  'the-top-thinking',
  'fix-bug-doctor',
  'delivery-gate',
  'recall-and-memory',
  'ecc-code-baseline',
];

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
  return { ok: true, copied, skipped, soulUntouched: existsSync(join(targetDir, 'SOUL.md')) };
}

export function rollbackSkills(targetDir) {
  const removed = [];
  for (const name of PACK_SKILLS) {
    const dir = join(targetDir, '.dsh', 'skills', name);
    if (!existsSync(dir)) continue;
    rmSync(dir, { recursive: true, force: true });
    removed.push(name);
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
