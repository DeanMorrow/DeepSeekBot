#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  addPrivate,
  emptyBank,
  parseBank,
  publishShared,
  readPrivate,
  readShared,
  recall,
  serializeBank,
} from '../lib/bank.mjs';
import { inspectSkillFile } from '../lib/catalog.mjs';
import { evaluateDelivery } from '../lib/gate.mjs';
import { migrateSkills, rollbackSkills } from '../lib/migrate.mjs';
import { productionWriteDecision } from '../lib/production-write.mjs';
import { inspectBot, invokeSubtask, planTask } from '../lib/super-agent.mjs';
import { checkInventory, findLocalSkill } from '../lib/inventory.mjs';

function args(argv) {
  const out = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      out._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      index += 1;
    }
  }
  return out;
}

function fail(reason) {
  process.stderr.write(`${JSON.stringify({ ok: false, reason })}\n`);
  process.exitCode = 1;
}

function ok(value) {
  process.stdout.write(`${JSON.stringify({ ok: true, ...value })}\n`);
}

function load(path) {
  return parseBank(readFileSync(resolve(path), 'utf8'));
}

function loadOrCreate(path) {
  try {
    return load(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return emptyBank();
    throw error;
  }
}

function store(path, bank) {
  writeFileSync(resolve(path), serializeBank(bank));
}

const flags = args(process.argv.slice(2));
const command = flags._[0];

if (command === 'probe') {
  const cwd = flags.cwd ?? process.cwd();
  const file = flags.file;
  if (!file) fail('file-required');
  else ok({ placement: inspectSkillFile(cwd, file) });
} else if (command === 'private-add') {
  const bank = flags.bank ? loadOrCreate(flags.bank) : emptyBank();
  const result = addPrivate(bank, {
    ownerBotId: flags.actor,
    taskSignature: flags.task,
    lesson: flags.lesson,
  });
  if (!result.ok) fail(result.reason);
  else {
    if (flags.bank) store(flags.bank, bank);
    ok({ id: result.record.id });
  }
} else if (command === 'private-read') {
  const result = readPrivate(load(flags.bank), flags.actor, flags.id);
  if (!result.ok) fail(result.reason);
  else ok({ record: result.record });
} else if (command === 'publish') {
  const bank = load(flags.bank);
  const result = publishShared(bank, {
    actor: flags.actor,
    taskSignature: flags.task,
    lesson: flags.lesson,
    approved: flags.approved === 'yes',
    desensitized: flags.desensitized === 'yes',
    ...(flags['source-chat'] ? { sourceChat: flags['source-chat'] } : {}),
  });
  if (!result.ok) fail(result.reason);
  else {
    store(flags.bank, bank);
    ok({ id: result.record.id, reviewerPacket: result.reviewerPacket });
  }
} else if (command === 'shared-read') {
  ok({ lessons: readShared(load(flags.bank), flags.actor) });
} else if (command === 'recall') {
  const privateBank = flags.private ? load(flags.private) : emptyBank();
  const sharedBank = flags.shared ? load(flags.shared) : emptyBank();
  const merged = { version: 1, records: [...privateBank.records, ...sharedBank.records] };
  ok(recall(merged, flags.actor, flags.task));
} else if (command === 'gate') {
  const record = JSON.parse(readFileSync(resolve(flags.record), 'utf8'));
  ok(evaluateDelivery(record));
} else if (command === 'production-write') {
  ok(productionWriteDecision(flags.confirm ?? ''));
} else if (command === 'migrate') {
  const result = migrateSkills({
    seedDir: flags.seed,
    targetDir: flags.target,
    siblings: flags.siblings ? flags.siblings.split(',') : [],
    replaceSkills: flags.replace === 'yes',
  });
  if (!result.ok) fail(result.reason);
  else ok(result);
} else if (command === 'rollback') {
  ok(rollbackSkills(flags.target));
} else if (command === 'super-agent-status') {
  ok({ bot: inspectBot(flags.target ?? '.') });
} else if (command === 'super-agent-plan') {
  const planned = planTask(flags.task ?? '', flags.depth ? Number(flags.depth) : 1);
  if (!planned.ok) fail(planned.reason);
  else ok(planned);
} else if (command === 'catalog-check') {
  const index = JSON.parse(
    readFileSync(join(flags.target ?? '.', '.botharness/catalog/index.json'), 'utf8'),
  );
  ok(checkInventory(flags.target ?? '.', index));
} else if (command === 'skill-find') {
  const skills = JSON.parse(
    readFileSync(join(flags.target ?? '.', '.botharness/catalog/skills.json'), 'utf8'),
  );
  ok(findLocalSkill(skills, flags.query ?? ''));
} else if (command === 'super-agent-invoke') {
  const planned = planTask(flags.task ?? '');
  const subtask = planned.subtasks?.[0];
  if (!planned.ok || subtask === undefined) fail(planned.reason ?? 'empty-task');
  else ok(invokeSubtask({ subtask, inflight: flags.inflight ? Number(flags.inflight) : 0 }));
} else {
  fail('usage');
}
