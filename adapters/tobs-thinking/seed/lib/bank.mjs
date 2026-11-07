import { randomUUID } from 'node:crypto';

import { hostBot } from './identity.mjs';

const PRIVATE_MARKERS = ['[private-chat]', 'BEGIN PRIVATE', '私聊原文'];

export function emptyBank() {
  return { version: 1, records: [] };
}

export function parseBank(text) {
  const value = JSON.parse(text);
  if (value?.version !== 1 || !Array.isArray(value.records)) {
    throw new Error('invalid-bank');
  }
  return value;
}

export function serializeBank(bank) {
  return `${JSON.stringify(bank, null, 2)}\n`;
}

function cleanLesson(lesson) {
  if (typeof lesson !== 'string' || lesson.trim() === '') return undefined;
  return lesson.trim();
}

export function addPrivate(bank, input) {
  const identity = hostBot(input.identity);
  if (!identity.ok) return identity;
  if (input.ownerBotId !== undefined && input.ownerBotId !== identity.botSlug) {
    return { ok: false, reason: 'actor-mismatch' };
  }
  const lesson = cleanLesson(input.lesson);
  const taskSignature = cleanLesson(input.taskSignature);
  if (!lesson || !taskSignature) return { ok: false, reason: 'invalid-input' };
  const record = {
    id: randomUUID(),
    visibility: 'private',
    ownerBotId: identity.botSlug,
    taskSignature,
    lesson,
  };
  bank.records.push(record);
  return { ok: true, record };
}

export function readPrivate(bank, identity, id) {
  const who = hostBot(identity);
  if (!who.ok) return who;
  const record = bank.records.find((item) => item.id === id && item.visibility === 'private');
  if (!record) return { ok: false, reason: 'not-found' };
  if (record.ownerBotId !== who.botSlug) return { ok: false, reason: 'denied' };
  return { ok: true, record };
}

function sharedShape(record) {
  return (
    record.visibility === 'shared-approved' &&
    record.approved === true &&
    record.desensitized === true &&
    record.sourceChat === undefined &&
    record.transcript === undefined &&
    record.messages === undefined &&
    typeof record.lesson === 'string' &&
    !PRIVATE_MARKERS.some((marker) => record.lesson.includes(marker))
  );
}

export function reviewerPacket(record) {
  return { id: record.id, taskSignature: record.taskSignature, lesson: record.lesson };
}

export function publishShared(bank, input) {
  if (
    input.sourceChat !== undefined ||
    input.transcript !== undefined ||
    input.messages !== undefined
  ) {
    return { ok: false, reason: 'private-chat' };
  }
  if (input.approved !== true || input.desensitized !== true) {
    return { ok: false, reason: 'not-approved' };
  }
  const identity = hostBot(input.identity);
  if (!identity.ok) return identity;
  if (input.actor !== undefined && input.actor !== identity.botSlug) {
    return { ok: false, reason: 'actor-mismatch' };
  }
  const lesson = cleanLesson(input.lesson);
  const taskSignature = cleanLesson(input.taskSignature);
  const ownerBotId = identity.botSlug;
  if (!lesson || !taskSignature) return { ok: false, reason: 'invalid-input' };
  if (PRIVATE_MARKERS.some((marker) => lesson.includes(marker))) {
    return { ok: false, reason: 'not-desensitized' };
  }
  const record = {
    id: randomUUID(),
    visibility: 'shared-approved',
    approved: true,
    desensitized: true,
    ownerBotId,
    taskSignature,
    lesson,
  };
  bank.records.push(record);
  return { ok: true, record, reviewerPacket: reviewerPacket(record) };
}

export function readShared(bank, identity) {
  const who = hostBot(identity);
  if (!who.ok) return [];
  return bank.records.filter(sharedShape).map(reviewerPacket);
}

function grams(text) {
  const compact = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  const set = new Set();
  if (compact.length <= 2) {
    if (compact.length > 0) set.add(compact);
    return set;
  }
  for (let index = 0; index < compact.length - 1; index += 1)
    set.add(compact.slice(index, index + 2));
  return set;
}

export function similarTask(left, right) {
  const a = grams(left);
  const b = grams(right);
  let shared = 0;
  for (const gram of a) if (b.has(gram)) shared += 1;
  return shared >= 2;
}

export function recall(bank, identity, task) {
  const who = hostBot(identity);
  const query = cleanLesson(task);
  if (!who.ok || !query) return { privateHits: [], sharedHits: [] };
  const privateHits = bank.records.filter(
    (record) =>
      record.visibility === 'private' &&
      record.ownerBotId === who.botSlug &&
      similarTask(record.taskSignature, query),
  );
  const sharedHits = bank.records
    .filter((record) => sharedShape(record) && similarTask(record.taskSignature, query))
    .map(reviewerPacket);
  return { privateHits, sharedHits };
}
