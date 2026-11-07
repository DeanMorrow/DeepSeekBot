import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

/**
 * Same discovery rule as @deepseek-ai/dsh-skill-filesystem:
 * the project root is the nearest .git ancestor, otherwise the session cwd.
 * Only one level under .dsh/skills or .agents/skills is scanned.
 * This does not ask a live Host, so it never reports the catalog as mounted.
 */
export function findProjectRoot(sessionCwd) {
  let current = resolve(sessionCwd);
  const start = current;
  while (true) {
    if (existsSync(join(current, '.git'))) return current;
    const parent = dirname(current);
    if (parent === current) return start;
    current = parent;
  }
}

export function classifySkillFile(sessionCwd, filePath) {
  const projectRoot = findProjectRoot(sessionCwd);
  const absolute = resolve(sessionCwd, filePath);
  const rel = relative(projectRoot, absolute);
  const base = {
    projectRoot,
    relativePath: rel.split(sep).join('/'),
    catalogEligible: false,
    liveMounted: false,
    liveBotTool: 'untested',
  };
  if (rel === '' || rel.startsWith('..') || rel.split(sep)[0] === '..') {
    return { ...base, status: 'outside-project' };
  }
  const parts = rel.split(sep);
  const scanned = (parts[0] === '.dsh' || parts[0] === '.agents') && parts[1] === 'skills';
  if (!scanned) return { ...base, status: 'not-a-scanned-root' };
  if (parts.length === 3 && parts[2].endsWith('.md')) {
    return { ...base, status: 'catalog-eligible', catalogEligible: true, shape: 'flat' };
  }
  if (parts.length === 4 && parts[3] === 'SKILL.md') {
    return {
      ...base,
      status: 'catalog-eligible',
      catalogEligible: true,
      shape: 'bundle',
      skillDir: parts[2],
    };
  }
  return { ...base, status: 'nested-not-scanned' };
}

export function readSkillFrontmatter(text) {
  if (!text.startsWith('---\n')) return { ok: false, reason: 'missing-frontmatter' };
  const end = text.indexOf('\n---', 4);
  if (end === -1) return { ok: false, reason: 'missing-frontmatter' };
  const body = text.slice(4, end);
  const fields = {};
  for (const line of body.split('\n')) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (match) fields[match[1]] = match[2].trim();
  }
  if (!fields.name || !fields.description)
    return { ok: false, reason: 'name-and-description-required' };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.name)) {
    return { ok: false, reason: 'name-not-kebab' };
  }
  return { ok: true, name: fields.name, description: fields.description };
}

export function inspectSkillFile(sessionCwd, filePath) {
  const placement = classifySkillFile(sessionCwd, filePath);
  if (!placement.catalogEligible) return placement;
  let text;
  try {
    text = readFileSync(resolve(sessionCwd, filePath), 'utf8');
  } catch {
    return { ...placement, catalogEligible: false, status: 'unreadable' };
  }
  const frontmatter = readSkillFrontmatter(text);
  if (!frontmatter.ok) {
    return { ...placement, catalogEligible: false, status: frontmatter.reason };
  }
  if (placement.shape === 'bundle' && frontmatter.name !== placement.skillDir) {
    return {
      ...placement,
      catalogEligible: false,
      status: 'name-mismatch',
      name: frontmatter.name,
    };
  }
  return { ...placement, name: frontmatter.name };
}
