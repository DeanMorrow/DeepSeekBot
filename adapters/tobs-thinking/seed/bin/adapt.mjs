#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { resolveContained } from '../lib/bounds.mjs';
import { inspectSkillFile } from '../lib/catalog.mjs';
import { evaluateDelivery } from '../lib/gate.mjs';
import { productionWriteDecision } from '../lib/production-write.mjs';
import { inspectBot, invokeSubtask, planTask } from '../lib/super-agent.mjs';
import { checkRegistry, findLocalSkill } from '../lib/inventory.mjs';

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

const flags = args(process.argv.slice(2));
const command = flags._[0];
const mutations = new Set([
  'private-add',
  'private-read',
  'publish',
  'shared-read',
  'recall',
  'migrate',
  'rollback',
]);

function contained(candidate) {
  return resolveContained(process.cwd(), candidate ?? '.');
}

if (mutations.has(command)) {
  fail('unauthenticated');
} else if (command === 'probe') {
  const cwd = contained(flags.cwd);
  const file = flags.file;
  if (!file) fail('file-required');
  else if (!cwd.ok) fail(cwd.reason);
  else {
    const target = contained(file);
    if (!target.ok) fail(target.reason);
    else ok({ placement: inspectSkillFile(cwd.path, target.path) });
  }
} else if (command === 'gate') {
  const recordPath = contained(flags.record);
  if (!recordPath.ok) fail(recordPath.reason);
  else ok(evaluateDelivery(JSON.parse(readFileSync(recordPath.path, 'utf8'))));
} else if (command === 'production-write') {
  ok(productionWriteDecision(flags.confirm ?? ''));
} else if (command === 'super-agent-status') {
  const target = contained(flags.target);
  if (!target.ok) fail(target.reason);
  else ok({ bot: inspectBot(target.path) });
} else if (command === 'super-agent-plan') {
  const planned = planTask(flags.task ?? '', flags.depth ? Number(flags.depth) : 1);
  if (!planned.ok) fail(planned.reason);
  else ok(planned);
} else if (command === 'catalog-check') {
  const target = contained(flags.target);
  if (!target.ok) fail(target.reason);
  else ok(checkRegistry(target.path));
} else if (command === 'skill-find') {
  const target = contained(flags.target);
  if (!target.ok) fail(target.reason);
  else {
    const skills = JSON.parse(
      readFileSync(join(target.path, '.botharness/catalog/skills.json'), 'utf8'),
    );
    ok(findLocalSkill(skills, flags.query ?? ''));
  }
} else if (command === 'super-agent-invoke') {
  const planned = planTask(flags.task ?? '');
  const subtask = planned.subtasks?.[0];
  if (!planned.ok || subtask === undefined) fail(planned.reason ?? 'empty-task');
  else ok(invokeSubtask({ subtask, inflight: flags.inflight ? Number(flags.inflight) : 0 }));
} else {
  fail('usage');
}
