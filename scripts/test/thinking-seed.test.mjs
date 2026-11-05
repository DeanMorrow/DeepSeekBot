import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import {
  addPrivate,
  emptyBank,
  publishShared,
  readPrivate,
  readShared,
  recall,
  serializeBank,
} from '../../adapters/tobs-thinking/seed/lib/bank.mjs';
import { inspectSkillFile } from '../../adapters/tobs-thinking/seed/lib/catalog.mjs';
import { evaluateDelivery } from '../../adapters/tobs-thinking/seed/lib/gate.mjs';
import {
  migrateSkills,
  rollbackSkills,
  snapshotTree,
} from '../../adapters/tobs-thinking/seed/lib/migrate.mjs';
import { productionWriteDecision } from '../../adapters/tobs-thinking/seed/lib/production-write.mjs';
import { RUBRIC } from '../../adapters/tobs-thinking/seed/lib/rubric.mjs';
import { packSeed } from '../../adapters/tobs-thinking/pack.mjs';

const seed = join(dirname(fileURLToPath(import.meta.url)), '../../adapters/tobs-thinking/seed');
const cli = join(seed, 'bin/adapt.mjs');
const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function temp(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  roots.push(dir);
  return dir;
}

function chars(file) {
  return [...readFileSync(file, 'utf8').trimEnd()].length;
}

function skill(dir, name, text) {
  const path = join(dir, '.dsh/skills', name, 'SKILL.md');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  return path;
}

const front = (name) => `---\nname: ${name}\ndescription: probe\n---\n\nbody\n`;

function passing(overrides = {}) {
  return {
    declaredKind: 'result',
    evidenceClass: 'deliverable',
    subjectKind: 'task',
    rubricVersion: RUBRIC.version,
    baselineScore: 70,
    baselineFrozen: 70,
    sameModelDisclosed: true,
    contexts: [
      { role: 'producer', id: 'ctx-p', model: 'same' },
      { role: 'reviewer', id: 'ctx-r', model: 'same' },
    ],
    rounds: [
      {
        producerQuestion: RUBRIC.question,
        reviewerQuestion: RUBRIC.question,
        producerRunId: 'run-p',
        reviewerRunId: 'run-r',
        reviewerVerdict: 'pass',
        quality: 80,
        signedBy: 'reviewer',
      },
    ],
    hardChecks: [{ id: 'tests', pass: true }],
    confidence: {
      value: 81,
      evidenceNote: 'reviewer read the command output',
      claimsProbability: false,
    },
    ...overrides,
  };
}

describe('thinking seed placement', () => {
  it('keeps standing files inside the 1.6.1 injection limits and ships no avatar', () => {
    expect(chars(join(seed, 'SOUL.md'))).toBeLessThanOrEqual(5000);
    expect(chars(join(seed, 'MEMORY.md'))).toBeLessThanOrEqual(3000);
    const descriptor = JSON.parse(readFileSync(join(seed, '.botharness/bot.json'), 'utf8'));
    expect(descriptor.avatar).toBeUndefined();
    expect([...descriptor.bio].length).toBeLessThanOrEqual(160);
    const imported = temp('imported-memory-');
    cpSync(seed, imported, { recursive: true });
    execFileSync('git', ['init', '-q'], { cwd: imported });
    for (const name of [
      'the-top-thinking',
      'fix-bug-doctor',
      'delivery-gate',
      'recall-and-memory',
    ]) {
      const file = join(imported, '.dsh/skills', name, 'SKILL.md');
      expect(inspectSkillFile(imported, file)).toMatchObject({
        catalogEligible: true,
        liveMounted: false,
        liveBotTool: 'untested',
        name,
      });
    }
    expect(
      inspectSkillFile(seed, join(seed, '.dsh/skills/the-top-thinking/SKILL.md')).catalogEligible,
    ).toBe(false);
  });

  it('does not treat a loose skills directory as a mounted catalog', () => {
    const dir = temp('loose-skills-');
    mkdirSync(join(dir, '.git'));
    const loose = join(dir, 'skills/the-top-thinking.md');
    mkdirSync(dirname(loose), { recursive: true });
    writeFileSync(loose, front('the-top-thinking'));
    expect(inspectSkillFile(dir, loose).status).toBe('not-a-scanned-root');
    expect(inspectSkillFile(dir, loose).liveMounted).toBe(false);
  });

  it('accepts a bundle under the session project root and not under a different project', () => {
    const memory = temp('memory-');
    const project = temp('project-');
    mkdirSync(join(memory, '.git'));
    mkdirSync(join(project, '.git'));
    const file = skill(memory, 'the-top-thinking', front('the-top-thinking'));
    expect(inspectSkillFile(memory, file).catalogEligible).toBe(true);
    expect(inspectSkillFile(project, file).status).toBe('outside-project');
    const nested = join(memory, '.dsh/skills/the-top-thinking/references/extra.md');
    mkdirSync(dirname(nested), { recursive: true });
    writeFileSync(nested, 'x');
    expect(inspectSkillFile(memory, nested).status).toBe('nested-not-scanned');
  });

  it('packs a zip whose entries stay at the memory root', () => {
    const dir = temp('zip-');
    const zip = join(dir, 'seed.zip');
    packSeed(zip);
    const listing = execFileSync(
      'python3',
      [
        '-c',
        'import sys,zipfile; print("\\n".join(sorted(zipfile.ZipFile(sys.argv[1]).namelist())))',
        zip,
      ],
      { encoding: 'utf8' },
    );
    expect(listing).toContain('.dsh/skills/the-top-thinking/SKILL.md');
    expect(listing).toContain('SOUL.md');
    expect(listing).not.toContain('ecc-code-baseline');
    const codeZip = join(dir, 'code.zip');
    packSeed(codeZip, { code: true });
    const codeListing = execFileSync(
      'python3',
      [
        '-c',
        'import sys,zipfile; print("\\n".join(zipfile.ZipFile(sys.argv[1]).namelist()))',
        codeZip,
      ],
      { encoding: 'utf8' },
    );
    expect(codeListing).toContain('.dsh/skills/ecc-code-baseline/SKILL.md');
  });
});

describe('private and shared memory', () => {
  it('reloads one Bot private lesson and hides it from the other Bot', () => {
    const dir = temp('bank-');
    const path = join(dir, 'private-bank.json');
    const first = emptyBank();
    const added = addPrivate(first, {
      ownerBotId: 'bot-a',
      taskSignature: '重复打开错误页',
      lesson: '先看父级容器',
    });
    expect(added.ok).toBe(true);
    writeFileSync(path, serializeBank(first));
    const loaded = JSON.parse(readFileSync(path, 'utf8'));
    expect(readPrivate(loaded, 'bot-a', added.record.id).ok).toBe(true);
    expect(readPrivate(loaded, 'bot-b', added.record.id)).toMatchObject({
      ok: false,
      reason: 'denied',
    });
    expect(readShared(loaded, 'bot-b')).toEqual([]);
  });

  it('shares only an approved desensitized lesson and recalls it for a new Bot', () => {
    const bank = emptyBank();
    addPrivate(bank, { ownerBotId: 'bot-a', taskSignature: '打开错误页', lesson: '私有细节' });
    expect(
      publishShared(bank, {
        actor: 'bot-a',
        taskSignature: '打开错误页',
        lesson: '私聊原文仍在',
        approved: true,
        desensitized: true,
        sourceChat: '用户原话',
      }).ok,
    ).toBe(false);
    expect(
      publishShared(bank, {
        actor: 'bot-a',
        taskSignature: '打开错误页',
        lesson: '先看父级容器 [private-chat]',
        approved: true,
        desensitized: true,
      }).ok,
    ).toBe(false);
    const published = publishShared(bank, {
      actor: 'bot-a',
      taskSignature: '打开错误页',
      lesson: '先看父级容器再改当前元素',
      approved: true,
      desensitized: true,
    });
    expect(published.ok).toBe(true);
    expect(published.reviewerPacket).toEqual({
      id: published.record.id,
      taskSignature: '打开错误页',
      lesson: '先看父级容器再改当前元素',
    });
    expect(readShared(bank, 'bot-b')).toEqual([published.reviewerPacket]);
    expect(readPrivate(bank, 'bot-b', bank.records[0].id).reason).toBe('denied');
    const seen = recall(bank, 'bot-c', '页面再次打开错误页');
    expect(seen.privateHits).toEqual([]);
    expect(seen.sharedHits.map((item) => item.lesson)).toEqual(['先看父级容器再改当前元素']);
    const own = recall(bank, 'bot-a', '页面再次打开错误页');
    expect(own.privateHits).toHaveLength(1);
    expect(own.sharedHits).toHaveLength(1);
  });
});

describe('migration', () => {
  it('copies skills into one old Bot and leaves the others and its soul alone', () => {
    const root = temp('migrate-');
    const ada = join(root, 'ada');
    const bee = join(root, 'bee');
    mkdirSync(ada);
    mkdirSync(bee);
    writeFileSync(join(ada, 'SOUL.md'), 'Ada 自己的灵魂');
    writeFileSync(join(bee, 'SOUL.md'), 'Bee 自己的灵魂');
    writeFileSync(join(bee, 'MEMORY.md'), 'Bee 的记忆');
    mkdirSync(join(bee, '.dsh/skills/other-skill'), { recursive: true });
    writeFileSync(join(bee, '.dsh/skills/other-skill/SKILL.md'), 'leave me');
    const beforeBee = snapshotTree(bee);
    const moved = migrateSkills({ seedDir: seed, targetDir: ada, siblings: [bee] });
    expect(moved.ok).toBe(true);
    expect(moved.copied).toContain('the-top-thinking');
    expect(readFileSync(join(ada, 'SOUL.md'), 'utf8')).toBe('Ada 自己的灵魂');
    expect(snapshotTree(bee)).toEqual(beforeBee);
    expect(readFileSync(join(bee, '.dsh/skills/other-skill/SKILL.md'), 'utf8')).toBe('leave me');
    expect(migrateSkills({ seedDir: seed, targetDir: bee, siblings: [bee] }).ok).toBe(false);
    const removed = rollbackSkills(ada);
    expect(removed.removed).toContain('fix-bug-doctor');
    expect(readFileSync(join(ada, 'SOUL.md'), 'utf8')).toBe('Ada 自己的灵魂');
  });
});

describe('delivery gate', () => {
  it('passes one evidenced round and rejects the ways around the gate', () => {
    expect(evaluateDelivery(passing()).passed).toBe(true);
    expect(
      evaluateDelivery(passing({ evidenceClass: 'progress', declaredKind: 'result' })).reasons,
    ).toContain('progress-not-deliverable');
    expect(evaluateDelivery(passing({ subjectKind: 'review' })).reasons).toContain(
      'review-recursion',
    );
    expect(evaluateDelivery(passing({ approvalBypassesGate: true })).passed).toBe(false);
    expect(
      evaluateDelivery(
        passing({
          contexts: [
            { role: 'producer', id: 'only', model: 'same' },
            { role: 'reviewer', id: 'only', model: 'same' },
          ],
        }),
      ).reasons,
    ).toContain('second-context-missing');
    expect(evaluateDelivery(passing({ sameModelDisclosed: false })).reasons).toContain(
      'same-model-undisclosed',
    );
    const low = passing();
    low.confidence = { value: 80, evidenceNote: 'note', claimsProbability: false };
    expect(evaluateDelivery(low).reasons).toContain('confidence');
    const hard = passing();
    hard.hardChecks = [{ id: 'tests', pass: false }];
    expect(evaluateDelivery(hard).reasons).toContain('hard-check');
    const missingRun = passing();
    missingRun.rounds = [{ ...missingRun.rounds[0], reviewerRunId: '' }];
    expect(evaluateDelivery(missingRun).reasons).toContain('run-evidence-missing');
    const selfSign = passing();
    selfSign.rounds = [{ ...selfSign.rounds[0], reviewerVerdict: 'fail', signedBy: 'producer' }];
    expect(evaluateDelivery(selfSign).reasons).toEqual(
      expect.arrayContaining(['producer-self-sign', 'reviewer-failed']),
    );
  });

  it('does not turn a 96 score that cannot gain five percent into a pass', () => {
    const stuck = passing({
      baselineScore: 96,
      baselineFrozen: 96,
      rounds: [
        {
          producerQuestion: RUBRIC.question,
          reviewerQuestion: RUBRIC.question,
          producerRunId: 'run-p',
          reviewerRunId: 'run-r',
          reviewerVerdict: 'pass',
          quality: 100,
          signedBy: 'reviewer',
        },
      ],
      ceilingJudgment: {
        kind: 'no-better-solution',
        attempts: ['重写评分项', '补一条边界测试'],
        remaining: '满分以上没有可计的分',
      },
    });
    const result = evaluateDelivery(stuck);
    expect(result.passed).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining(['gain-below-5', 'ceiling-not-pass']));
    expect(result.judgment).toBe('no-better-solution');
    expect(evaluateDelivery(passing({ maxScore: 120 })).reasons).toContain('ceiling-raised');
    expect(evaluateDelivery(passing({ baselineScore: 96, baselineFrozen: 70 })).reasons).toContain(
      'baseline-moved',
    );
    expect(evaluateDelivery(passing({ baselineScore: 0, baselineFrozen: 0 })).reasons).toContain(
      'gain-unmeasurable',
    );
  });
});

describe('production write checkpoint', () => {
  it('accepts only the explicit confirmations', () => {
    expect(productionWriteDecision('开工').allowed).toBe(true);
    expect(productionWriteDecision(' 按这个改 ').allowed).toBe(true);
    expect(productionWriteDecision('可以动手').allowed).toBe(true);
    expect(productionWriteDecision('你看着办').allowed).toBe(false);
    expect(productionWriteDecision('差不多').allowed).toBe(false);
  });
});

describe('adapter command', () => {
  it('round-trips a private lesson and denies the other Bot', () => {
    const dir = temp('cli-');
    const bank = join(dir, 'private-bank.json');
    const added = JSON.parse(
      execFileSync(
        process.execPath,
        [
          cli,
          'private-add',
          '--actor',
          'bot-a',
          '--bank',
          bank,
          '--task',
          '打开错误页',
          '--lesson',
          '先看父级',
        ],
        { encoding: 'utf8' },
      ),
    );
    expect(added.ok).toBe(true);
    const read = JSON.parse(
      execFileSync(
        process.execPath,
        [cli, 'private-read', '--actor', 'bot-a', '--bank', bank, '--id', added.id],
        { encoding: 'utf8' },
      ),
    );
    expect(read.record.lesson).toBe('先看父级');
    try {
      execFileSync(
        process.execPath,
        [cli, 'private-read', '--actor', 'bot-b', '--bank', bank, '--id', added.id],
        { encoding: 'utf8' },
      );
      throw new Error('other bot should be denied');
    } catch (error) {
      expect(JSON.parse(error.stderr.toString()).reason).toBe('denied');
    }
  });
});
