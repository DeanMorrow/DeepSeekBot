import { expect, it } from 'vitest';

import { defineSchemaPlan } from '../src/database/schema.js';
import { BOT_HARNESS_SCHEMA_PLAN } from '../src/database/schema-plan.js';
import { attachOperationalModule, mountOperationalDatabase } from '../src/database/owner.js';
import { createConceptArtConsumer } from '../src/models/concept-art-consumer.js';
import { createMemorySecretStore, createSharedModelRoute } from '../src/models/shared-route.js';
import { createSessionOwnership } from '../src/sessions/ownership.js';
import { createTempRoot, trackTestOwner } from './helpers.js';

const priorPlan = defineSchemaPlan(
  BOT_HARNESS_SCHEMA_PLAN.migrations.filter((migration) => migration.generation < 136),
);

function rows(home: string) {
  const owner = trackTestOwner(
    mountOperationalDatabase({ dshHome: home, schemaPlan: BOT_HARNESS_SCHEMA_PLAN }),
  );
  const database = attachOperationalModule(owner, 'concept-art');
  const stored = database.read((db) => {
    return db
      .prepare(
        `SELECT style_ref AS styleRef, version, def, created_at AS createdAt,
                bot_slug AS botSlug, ownership
         FROM concept_art_styles ORDER BY style_ref`,
      )
      .all() as {
      styleRef: string;
      version: string;
      def: string;
      createdAt: string;
      botSlug: string | null;
      ownership: string;
    }[];
  });
  const ownership = createSessionOwnership(attachOperationalModule(owner, 'session-ownership'));
  ownership.claim({
    sessionId: 'ada-session',
    botSlug: 'ada',
    rootRole: 'orchestrator',
    at: '2026-01-01T00:00:00.000Z',
  });
  const consumer = createConceptArtConsumer({
    database,
    ownership,
    route: createSharedModelRoute(database, createMemorySecretStore(), {
      fetch: async () => new Response('{}', { status: 500 }),
    }),
    limits: null,
  });
  return { owner, stored, consumer };
}

it('keeps pre-scope style rows unassigned instead of dropping them', () => {
  const home = createTempRoot('concept-art-styles-');
  const prior = trackTestOwner(mountOperationalDatabase({ dshHome: home, schemaPlan: priorPlan }));
  attachOperationalModule(prior, 'concept-art').transaction((db) => {
    db.prepare(
      `INSERT INTO concept_art_styles (style_ref, version, def, created_at) VALUES (?, 'v1', ?, ?)`,
    ).run('harbor', '平涂、粗轮廓', '2026-01-01T00:00:00.000Z');
    db.prepare(
      `INSERT INTO concept_art_styles (style_ref, version, def, created_at) VALUES (?, 'v1', ?, ?)`,
    ).run('ink', '留白', '2026-01-02T00:00:00.000Z');
  });
  prior.close();

  const failing = defineSchemaPlan([
    ...priorPlan.migrations,
    {
      generation: 136,
      module: 'concept-art',
      description: 'fail before activation',
      migrate() {
        throw new Error('style migration failed');
      },
    },
  ]);
  const failed = mountOperationalDatabase({ dshHome: home, schemaPlan: failing });
  expect(failed.mode).toBe('recovery');
  expect(failed.recovery?.code).toBe('migration-failed');
  failed.close();
  const stillPrior = trackTestOwner(
    mountOperationalDatabase({ dshHome: home, schemaPlan: priorPlan }),
  );
  const survived = attachOperationalModule(stillPrior, 'concept-art').read((db) => {
    return db.prepare('SELECT style_ref, def FROM concept_art_styles ORDER BY style_ref').all() as {
      style_ref: string;
      def: string;
    }[];
  });
  expect(survived).toEqual([
    { style_ref: 'harbor', def: '平涂、粗轮廓' },
    { style_ref: 'ink', def: '留白' },
  ]);
  stillPrior.close();

  const first = rows(home);
  expect(first.owner.generation).toBe(BOT_HARNESS_SCHEMA_PLAN.targetGeneration);
  expect(first.stored).toEqual([
    {
      styleRef: 'harbor',
      version: 'v1',
      def: '平涂、粗轮廓',
      createdAt: '2026-01-01T00:00:00.000Z',
      botSlug: null,
      ownership: 'unassigned',
    },
    {
      styleRef: 'ink',
      version: 'v1',
      def: '留白',
      createdAt: '2026-01-02T00:00:00.000Z',
      botSlug: null,
      ownership: 'unassigned',
    },
  ]);
  expect(first.consumer.listStyles('ada')).toEqual([]);
  expect(first.consumer.listStyles('bea')).toEqual([]);
  expect(first.consumer.listUnassigned()).toEqual([
    {
      styleRef: 'harbor',
      version: 'v1',
      createdAt: '2026-01-01T00:00:00.000Z',
      ownership: 'unassigned',
    },
    {
      styleRef: 'ink',
      version: 'v1',
      createdAt: '2026-01-02T00:00:00.000Z',
      ownership: 'unassigned',
    },
  ]);
  expect(JSON.stringify(first.consumer.listUnassigned())).not.toContain('平涂');
  first.owner.close();

  const second = rows(home);
  expect(second.stored.map((row) => row.def)).toEqual(['平涂、粗轮廓', '留白']);
  second.owner.close();
  const downgraded = mountOperationalDatabase({ dshHome: home, schemaPlan: priorPlan });
  expect(downgraded.mode).toBe('recovery');
  downgraded.close();
  const stillThere = rows(home);
  expect(stillThere.stored.map((row) => [row.styleRef, row.def, row.ownership])).toEqual([
    ['harbor', '平涂、粗轮廓', 'unassigned'],
    ['ink', '留白', 'unassigned'],
  ]);
  stillThere.owner.close();
});

it('keeps rows already stored by the dropping migration and does not invent an owner', () => {
  const home = createTempRoot('concept-art-styles-dropped-');
  const prior = trackTestOwner(mountOperationalDatabase({ dshHome: home, schemaPlan: priorPlan }));
  attachOperationalModule(prior, 'concept-art').transaction((db) => {
    db.exec(`
      CREATE TABLE concept_art_styles_old_shape (
        bot_slug TEXT NOT NULL,
        style_ref TEXT NOT NULL,
        version TEXT NOT NULL,
        def TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (bot_slug, style_ref, version)
      );
    `);
    db.prepare(
      `INSERT INTO concept_art_styles_old_shape (bot_slug, style_ref, version, def, created_at)
       VALUES ('ada', 'harbor', 'v1', '平涂、粗轮廓', '2026-01-01T00:00:00.000Z')`,
    ).run();
    db.exec(`
      DROP TABLE concept_art_styles;
      ALTER TABLE concept_art_styles_old_shape RENAME TO concept_art_styles;
      UPDATE _botharness_schema SET generation = 136 WHERE singleton = 1;
    `);
  });
  prior.close();
  const upgraded = rows(home);
  expect(upgraded.stored).toEqual([
    {
      styleRef: 'harbor',
      version: 'v1',
      def: '平涂、粗轮廓',
      createdAt: '2026-01-01T00:00:00.000Z',
      botSlug: 'ada',
      ownership: 'assigned',
    },
  ]);
  expect(upgraded.consumer.listStyles('bea')).toEqual([]);
  expect(upgraded.consumer.listStyles('ada')).toEqual([
    { styleRef: 'harbor', version: 'v1', def: '平涂、粗轮廓' },
  ]);
  expect(upgraded.consumer.listUnassigned()).toEqual([]);
});
