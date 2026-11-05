import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { appendSkillBrief } from './seed/lib/inventory.mjs';

const root = dirname(fileURLToPath(import.meta.url));

export function stageSeed(dest, { code = false } = {}) {
  cpSync(join(root, 'seed'), dest, { recursive: true });
  if (code) {
    cpSync(
      join(root, 'extras', 'ecc-code-baseline'),
      join(dest, '.dsh', 'skills', 'ecc-code-baseline'),
      {
        recursive: true,
      },
    );
    const inventoryPath = join(dest, '.botharness/catalog/skills.json');
    const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
    writeFileSync(
      inventoryPath,
      `${JSON.stringify(
        appendSkillBrief(
          inventory,
          {
            id: 'ecc-code-baseline',
            name: '代码岗基线',
            brief: '代码岗按需的四条流程，不是 ECC 整包。',
            entry: '.dsh/skills/ecc-code-baseline/SKILL.md',
            status: 'active',
            version: 1,
            owner: 'tobs-thinking-seed',
          },
          'code seed adds the optional code skill',
        ),
        null,
        2,
      )}\n`,
    );
  }
}

export function packSeed(outZip, options = {}) {
  mkdirSync(dirname(outZip), { recursive: true });
  const stage = mkdtempSync(join(tmpdir(), 'thinking-seed-'));
  try {
    stageSeed(stage, options);
    execFileSync(
      'python3',
      [
        '-c',
        `import pathlib, sys, zipfile
root = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for path in root.rglob('*'):
        if path.is_file():
            archive.write(path, path.relative_to(root).as_posix())
`,
        stage,
        outZip,
      ],
      { stdio: 'inherit' },
    );
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

function invokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  const out = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
  packSeed(resolve(out ?? join(root, 'tobs-thinking-default.zip')), {
    code: process.argv.includes('--code'),
  });
}
