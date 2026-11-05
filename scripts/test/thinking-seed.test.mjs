import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
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
  addRetrospective,
  checkInventory,
  checkPrivate,
  findLocalSkill,
  checkRegistry,
  disableInventory,
  groupBriefs,
  publicView,
  readPrivateTitles,
  readPublicCatalog,
  renameInventory,
} from '../../adapters/tobs-thinking/seed/lib/inventory.mjs';
import {
  migrateSkills,
  rollbackSkills,
  snapshotTree,
} from '../../adapters/tobs-thinking/seed/lib/migrate.mjs';
import { productionWriteDecision } from '../../adapters/tobs-thinking/seed/lib/production-write.mjs';
import {
  aggregate,
  inspectBot,
  invokeSubtask,
  planTask,
} from '../../adapters/tobs-thinking/seed/lib/super-agent.mjs';
import { RUBRIC } from '../../adapters/tobs-thinking/seed/lib/rubric.mjs';
import { packSeed, stageSeed } from '../../adapters/tobs-thinking/pack.mjs';
import { resolveContained } from '../../adapters/tobs-thinking/seed/lib/bounds.mjs';
import { bindHostSession } from '../../adapters/tobs-thinking/seed/lib/identity.mjs';

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

function host(slug) {
  return bindHostSession(slug).identity;
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
      'super-agent',
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
      identity: host('bot-a'),
      ownerBotId: 'bot-a',
      taskSignature: '重复打开错误页',
      lesson: '先看父级容器',
    });
    expect(added.ok).toBe(true);
    expect(
      addPrivate(emptyBank(), {
        identity: host('bot-a'),
        ownerBotId: 'bot-b',
        taskSignature: '重复打开错误页',
        lesson: '先看父级容器',
      }).reason,
    ).toBe('actor-mismatch');
    expect(
      addPrivate(emptyBank(), { ownerBotId: 'bot-a', taskSignature: 'x', lesson: 'y' }).reason,
    ).toBe('unauthenticated');
    writeFileSync(path, serializeBank(first));
    const loaded = JSON.parse(readFileSync(path, 'utf8'));
    expect(readPrivate(loaded, host('bot-a'), added.record.id).ok).toBe(true);
    expect(readPrivate(loaded, host('bot-b'), added.record.id)).toMatchObject({
      ok: false,
      reason: 'denied',
    });
    expect(readPrivate(loaded, 'bot-a', added.record.id).reason).toBe('unauthenticated');
    expect(readShared(loaded, 'bot-b')).toEqual([]);
  });

  it('shares only an approved desensitized lesson and recalls it for a new Bot', () => {
    const bank = emptyBank();
    addPrivate(bank, {
      identity: host('bot-a'),
      ownerBotId: 'bot-a',
      taskSignature: '打开错误页',
      lesson: '私有细节',
    });
    expect(
      publishShared(bank, {
        identity: host('bot-a'),
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
        identity: host('bot-a'),
        actor: 'bot-a',
        taskSignature: '打开错误页',
        lesson: '先看父级容器 [private-chat]',
        approved: true,
        desensitized: true,
      }).ok,
    ).toBe(false);
    const published = publishShared(bank, {
      identity: host('bot-a'),
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
    expect(readShared(bank, host('bot-b'))).toEqual([published.reviewerPacket]);
    expect(readShared(bank, 'bot-b')).toEqual([]);
    expect(readPrivate(bank, host('bot-b'), bank.records[0].id).reason).toBe('denied');
    const seen = recall(bank, host('bot-c'), '页面再次打开错误页');
    expect(seen.privateHits).toEqual([]);
    expect(seen.sharedHits.map((item) => item.lesson)).toEqual(['先看父级容器再改当前元素']);
    const own = recall(bank, host('bot-a'), '页面再次打开错误页');
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
    const auth = { identity: host('ada'), root: ada };
    const moved = migrateSkills({ seedDir: seed, targetDir: ada, authorization: auth });
    expect(moved.ok).toBe(true);
    expect(moved.copied).toContain('the-top-thinking');
    expect(moved.copied).toContain('super-agent');
    expect(moved.files).toContain('.botharness/super-agent.json');
    expect(moved.files).toContain('.botharness/catalog');
    expect(inspectBot(ada)).toMatchObject({
      equipped: true,
      officialInstalled: false,
      invocation: 'untested',
    });
    expect(inspectBot(bee).equipped).toBe(false);
    expect(readFileSync(join(ada, 'SOUL.md'), 'utf8')).toBe('Ada 自己的灵魂');
    expect(snapshotTree(bee)).toEqual(beforeBee);
    expect(readFileSync(join(bee, '.dsh/skills/other-skill/SKILL.md'), 'utf8')).toBe('leave me');
    expect(
      migrateSkills({
        seedDir: seed,
        targetDir: bee,
        authorization: { identity: host('bee'), root: ada },
      }).reason,
    ).toBe('path-escape');
    expect(migrateSkills({ seedDir: seed, targetDir: ada }).reason).toBe('unauthenticated');
    const removed = rollbackSkills(ada, auth);
    expect(removed.removed.some((item) => item.endsWith('fix-bug-doctor'))).toBe(true);
    expect(removed.removed).toContain('.botharness/super-agent.json');
    expect(removed.removed).toContain('.botharness/catalog');
    expect(inspectBot(ada).equipped).toBe(false);
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

describe('super-agent contract', () => {
  it('does not treat a soul sentence or the native subagent tool as an installed package', () => {
    const imported = temp('super-agent-');
    cpSync(seed, imported, { recursive: true });
    execFileSync('git', ['init', '-q'], { cwd: imported });
    const status = inspectBot(imported);
    expect(status).toMatchObject({
      equipped: true,
      adaptation: 'discipline-only',
      fullBundleInstalled: false,
      officialInstalled: false,
      officialPackage: 'deepseek-ai/dsh-superagent-prototype',
      sourceCommit: '6337fc823ce20251c8de8085948165c81aaa701e',
      githubSource: false,
      feishuSource: false,
      autoMerge: false,
      presetReplaced: false,
      invocation: 'untested',
      inheritsPrivateMemory: false,
      entry: 'node bin/adapt.mjs super-agent-plan',
    });
    expect(status.notEquivalentTo).toEqual(['bot_subagent', 'oar', 'agent-teams']);
    expect(status.host).toMatchObject({
      declared: '^0.2.1-alpha.2',
      example: '0.2.1-rc.3',
      local: '0.2.2-alpha.2',
      localTested: false,
    });
    expect(status.forbiddenOnOrchestrator).toContain('bot_subagent');
    writeFileSync(
      join(imported, '.botharness/super-agent.json'),
      JSON.stringify({
        role: 'super-agent-contract',
        officialInstalled: true,
        fullBundleInstalled: true,
      }),
    );
    expect(inspectBot(imported).equipped).toBe(false);
    rmSync(join(imported, '.botharness/super-agent.json'));
    rmSync(join(imported, '.dsh/skills/super-agent'), { recursive: true });
    writeFileSync(join(imported, 'SOUL.md'), '本 Bot 已启用 super-agent');
    expect(inspectBot(imported)).toMatchObject({ equipped: false, officialInstalled: false });
  });

  it('bounds the plan and keeps private lessons out of the child packet', () => {
    const planned = planTask('查父级；补测试；写说明；第四件');
    expect(planned.subtasks).toHaveLength(3);
    expect(planned.truncated).toBe(true);
    expect(planned.officialInstalled).toBe(false);
    expect(planTask('再往下拆', 3)).toMatchObject({ ok: false, reason: 'depth-exceeded' });
    const leaked = invokeSubtask({
      subtask: { ...planned.subtasks[0], prompt: '先看父级容器' },
      privateRecords: [{ lesson: '先看父级容器' }],
      executor: () => ({ callId: 'should-not-run' }),
    });
    expect(leaked).toMatchObject({ invoked: false, reason: 'private-leak' });
  });

  it('counts a call only when an executor returns an id, and still does not verify delivery', () => {
    const subtask = planTask('查父级').subtasks[0];
    expect(invokeSubtask({ subtask })).toMatchObject({
      invoked: false,
      reason: 'no-live-executor',
    });
    expect(invokeSubtask({ subtask, inflight: 2, executor: () => ({ callId: 'x' }) }).reason).toBe(
      'concurrency',
    );
    expect(
      invokeSubtask({ subtask, budgetUsed: 3, executor: () => ({ callId: 'x' }) }).reason,
    ).toBe('budget');
    const called = invokeSubtask({
      subtask,
      executor: (packet) => {
        expect(packet.privateMemory).toBeNull();
        expect(packet.tool).toBe('create_assignment');
        return { callId: 'assign-1', tool: 'create_assignment' };
      },
    });
    expect(called).toMatchObject({ invoked: true, officialInstalled: false, callId: 'assign-1' });
    expect(aggregate([called])).toMatchObject({
      verified: false,
      reason: 'needs-delivery-gate',
      callIds: ['assign-1'],
    });
    const statusDir = importedStatusDir();
    const reported = JSON.parse(
      execFileSync(process.execPath, [cli, 'super-agent-status', '--target', '.'], {
        cwd: statusDir,
        encoding: 'utf8',
      }),
    );
    expect(reported.bot.fullBundleInstalled).toBe(false);
    expect(reported.bot.adaptation).toBe('discipline-only');
  });
});

function importedStatusDir() {
  const dir = temp('status-');
  cpSync(seed, dir, { recursive: true });
  return dir;
}

describe('asset inventory', () => {
  it('keeps the index to categories and checks the skill briefs', () => {
    const index = JSON.parse(readFileSync(join(seed, '.botharness/catalog/index.json'), 'utf8'));
    const skills = JSON.parse(readFileSync(join(seed, '.botharness/catalog/skills.json'), 'utf8'));
    expect(JSON.stringify(index)).not.toContain('the-top-thinking');
    expect(JSON.stringify(index)).not.toContain('memory/private');
    expect(checkRegistry(seed).ok).toBe(true);
    expect(JSON.stringify(readPublicCatalog(seed))).not.toContain('memory/private');
    expect(checkInventory(seed, index).ok).toBe(true);
    const found = findLocalSkill(skills, '根因');
    expect(found).toMatchObject({ hit: true, detailLoaded: false });
    expect(JSON.stringify(found.briefs)).not.toContain('写码前必须停');
    const missing = findLocalSkill(skills, '量子编织');
    expect(missing.report).toMatchObject({
      toldHuman: true,
      installGranted: false,
      outboundGranted: false,
      paidGranted: false,
      findSkills: 'awaiting-formal-entry',
    });
    expect(missing.report.passed).toBeUndefined();
    expect(groupBriefs(skills.items, 4).mode).toBe('grouped');
    expect(groupBriefs(skills.items, 4).groups.every((group) => group.brief === undefined)).toBe(
      true,
    );
  });

  it('requires an inventory from the fourth skill and notices a bad list', () => {
    const dir = temp('three-skills-');
    for (const name of ['one', 'two', 'three']) {
      mkdirSync(join(dir, '.dsh/skills', name), { recursive: true });
      writeFileSync(join(dir, '.dsh/skills', name, 'SKILL.md'), 'x');
    }
    const bare = {
      schemaVersion: 1,
      role: 'registry',
      entry: '.botharness/catalog/index.json',
      owner: 'tobs-thinking-seed',
      version: 1,
      inventories: [],
    };
    expect(checkInventory(dir, bare).ok).toBe(true);
    mkdirSync(join(dir, '.dsh/skills/four'), { recursive: true });
    writeFileSync(join(dir, '.dsh/skills/four/SKILL.md'), 'x');
    expect(checkInventory(dir, bare).problems).toContain('skills-need-inventory');

    const broken = temp('broken-catalog-');
    cpSync(seed, broken, { recursive: true });
    mkdirSync(join(broken, '.dsh/skills/extra'), { recursive: true });
    writeFileSync(join(broken, '.dsh/skills/extra/SKILL.md'), 'x');
    const index = JSON.parse(readFileSync(join(broken, '.botharness/catalog/index.json'), 'utf8'));
    expect(checkInventory(broken, index).problems).toContain('unlisted:extra');
    const skillsPath = join(broken, '.botharness/catalog/skills.json');
    const skills = JSON.parse(readFileSync(skillsPath, 'utf8'));
    skills.items.push({ ...skills.items[0], status: 'deprecated' });
    writeFileSync(skillsPath, JSON.stringify(skills));
    expect(checkInventory(broken, index).problems).toEqual(
      expect.arrayContaining([
        'duplicate-id',
        'deprecated-without-replacement:the-top-thinking',
        'unlisted:extra',
      ]),
    );
  });

  it('hides private retrospective titles and does not treat the catalog as a delivery pass', () => {
    const store = { bank: emptyBank(), inventory: null };
    for (const title of ['题目一', '题目二', '题目三']) {
      addRetrospective(store, { identity: host('bot-a'), title, lesson: `私有正文${title}` });
    }
    expect(store.inventory).toBeNull();
    addRetrospective(store, {
      identity: host('bot-a'),
      title: '题目四',
      lesson: '私有正文不能出现在标题',
    });
    expect(checkPrivate(store, 'bot-a').ok).toBe(true);
    expect(readPrivateTitles(store, host('bot-b'))).toEqual({
      ok: false,
      reason: 'denied',
      titles: [],
    });
    expect(readPrivateTitles(store, 'bot-b')).toEqual({
      ok: false,
      reason: 'unauthenticated',
      titles: [],
    });
    expect(readPrivateTitles(store, host('bot-a')).titles).toContain('题目四');
    expect(JSON.stringify(store.inventory)).not.toContain('私有正文不能出现在标题');
    const coded = temp('code-seed-');
    stageSeed(coded, { code: true });
    const index = JSON.parse(readFileSync(join(coded, '.botharness/catalog/index.json'), 'utf8'));
    expect(checkInventory(coded, index).ok).toBe(true);
    const reported = JSON.parse(
      execFileSync(process.execPath, [cli, 'skill-find', '--target', seed, '--query', '量子编织'], {
        encoding: 'utf8',
      }),
    );
    expect(reported.report.installGranted).toBe(false);
    expect(evaluateDelivery({ declaredKind: 'progress' }).passed).toBe(false);
    const registry = JSON.parse(readFileSync(join(seed, '.botharness/catalog/index.json'), 'utf8'));
    const renamed = renameInventory(registry, {
      id: 'skills',
      entry: '.botharness/catalog/skills-v2.json',
      reason: 'rename the skill inventory',
      at: '2026-11-05T21:00:00.000Z',
    });
    expect(renamed.registry.version).toBe(registry.version + 1);
    expect(renamed.registry.revisions.at(-1).reason).toBe('rename the skill inventory');
    const moved = temp('renamed-registry-');
    cpSync(seed, moved, { recursive: true });
    writeFileSync(join(moved, '.botharness/catalog/index.json'), JSON.stringify(renamed.registry));
    expect(checkRegistry(moved).problems).toEqual(
      expect.arrayContaining([
        'dead-entry:skills',
        'unlisted-inventory:.botharness/catalog/skills.json',
      ]),
    );
    const stopped = disableInventory(registry, {
      id: 'skills',
      replacement: '.botharness/catalog/skills.json',
      reason: 'stop the skill inventory',
      at: '2026-11-05T21:00:00.000Z',
    });
    expect(stopped.registry.inventories[0]).toMatchObject({ status: 'disabled' });
    const poisoned = structuredClone(registry);
    poisoned.inventories.push({
      id: 'retrospectives',
      brief: '秘密标题',
      entry: 'memory/private/retrospective-index.json',
      owner: 'bot-a',
      version: 1,
      updatedAt: '2026-11-05T21:00:00.000Z',
      status: 'active',
      visibility: 'private',
    });
    const view = JSON.stringify(publicView(poisoned));
    expect(view).not.toContain('memory/private');
    expect(view).not.toContain('秘密标题');
    const leaked = temp('leaked-registry-');
    cpSync(seed, leaked, { recursive: true });
    writeFileSync(join(leaked, '.botharness/catalog/index.json'), JSON.stringify(poisoned));
    expect(checkRegistry(leaked).problems).toContain('private-path-in-public-registry');
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

describe('path and identity boundaries', () => {
  it('refuses escaped, linked and unauthenticated writes', () => {
    const root = temp('bounds-');
    const outside = temp('outside-');
    writeFileSync(join(outside, 'secret.md'), 'do-not-copy');
    mkdirSync(join(root, 'linked-parent'));
    symlinkSync(outside, join(root, 'escape'));
    expect(resolveContained(root, 'escape').reason).toBe('symlink-escape');
    expect(resolveContained(root, '../outside').reason).toBe('path-escape');
    expect(resolveContained(root, outside).reason).toBe('path-escape');
    expect(migrateSkills({ seedDir: seed, targetDir: join(root, 'escape') }).reason).toBe(
      'unauthenticated',
    );
    expect(
      migrateSkills({
        seedDir: seed,
        targetDir: outside,
        authorization: { identity: host('ada'), root },
      }).reason,
    ).toBe('path-escape');
    const marker = join(outside, 'SOUL.md');
    writeFileSync(marker, 'untouched');
    expect(readFileSync(marker, 'utf8')).toBe('untouched');
    expect(existsSync(join(outside, '.dsh'))).toBe(false);
    mkdirSync(join(root, 'nested'));
    expect(
      migrateSkills({
        seedDir: seed,
        targetDir: join(root, 'nested'),
        authorization: { identity: host('ada'), root },
      }).reason,
    ).toBe('target-not-authorized');
    try {
      execFileSync(
        process.execPath,
        [cli, 'migrate', '--target', outside, '--seed', seed, '--actor', 'ada'],
        { encoding: 'utf8' },
      );
      throw new Error('migrate should refuse');
    } catch (error) {
      expect(JSON.parse(error.stderr.toString()).reason).toBe('unauthenticated');
      expect(error.stdout?.toString() ?? '').not.toContain('copied');
    }
    expect(readFileSync(marker, 'utf8')).toBe('untouched');
  });

  it('does not let the CLI treat --actor as a host session', () => {
    const dir = temp('cli-auth-');
    const bank = join(dir, 'private-bank.json');
    writeFileSync(
      bank,
      '{"version":1,"records":[{"id":"x","visibility":"private","ownerBotId":"bot-a","taskSignature":"题目","lesson":"秘密"}]}',
    );
    try {
      execFileSync(
        process.execPath,
        [cli, 'private-read', '--actor', 'bot-a', '--bank', bank, '--id', 'x'],
        { encoding: 'utf8' },
      );
      throw new Error('cli actor should not authenticate');
    } catch (error) {
      expect(JSON.parse(error.stderr.toString()).reason).toBe('unauthenticated');
      expect(error.stdout?.toString() ?? '').not.toContain('秘密');
    }
    try {
      execFileSync(process.execPath, [cli, 'rollback', '--target', dir, '--actor', 'bot-a'], {
        encoding: 'utf8',
      });
      throw new Error('rollback should not run');
    } catch (error) {
      expect(JSON.parse(error.stderr.toString()).reason).toBe('unauthenticated');
    }
    expect(existsSync(bank)).toBe(true);
  });
});
