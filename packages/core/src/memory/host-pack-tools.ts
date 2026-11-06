import { defineTool, type ToolDefinition } from '@deepseek-ai/dsh-tools';

import {
  attestationFromHostSession,
  openAuthorizedOpsEntry,
  OPS_CATALOG_SOURCE,
  readAuthorizedOpsCatalog,
  type CatalogSessionProof,
} from './catalog-source.js';
import {
  migratePack,
  privateAdd,
  privateRead,
  recall,
  authorizedCatalogView,
  rollbackPack,
  sharedPublish,
  type PackGrant,
} from './host-pack.js';

export interface PackToolHost {
  memoryDir(): string | undefined;
  grant(id: string): PackGrant | undefined;
  catalogSourcePath?(): string | undefined;
  catalogSession?(): CatalogSessionProof;
}

function text(value: unknown): string {
  return JSON.stringify(value);
}

function field(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
}

export function createPackTools(botSlug: string, host: PackToolHost): ToolDefinition[] {
  const memory = () => {
    const dir = host.memoryDir();
    if (dir === undefined) throw new Error('memory-unavailable');
    return dir;
  };
  return [
    defineTool({
      name: 'pack_private_add',
      description:
        'Save one private lesson for this Bot. The owner is the Host session Bot, not a caller-supplied actor.',
      parameters: {
        task: { type: 'string', required: true, description: 'Short task signature.' },
        lesson: { type: 'string', required: true, description: 'Private lesson text.' },
        actor: {
          type: 'string',
          description: 'Ignored unless it disagrees with the Host Bot, which is refused.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      execute: async (args) =>
        text(
          privateAdd(memory(), botSlug, {
            task: field(args, 'task'),
            lesson: field(args, 'lesson'),
            actor: args.actor,
          }),
        ),
    }),
    defineTool({
      name: 'pack_private_read',
      description: 'Read one private lesson owned by this Host session Bot.',
      parameters: {
        id: { type: 'string', required: true, description: 'Record id from pack_private_add.' },
        actor: {
          type: 'string',
          description: 'Ignored unless it disagrees with the Host Bot, which is refused.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      execute: async (args) =>
        text(privateRead(memory(), botSlug, { id: field(args, 'id'), actor: args.actor })),
    }),
    defineTool({
      name: 'pack_shared_publish',
      description:
        'Publish one desensitized lesson into an active Workspace Grant. Refuses private chat and unapproved text.',
      parameters: {
        grant_id: { type: 'string', required: true, description: 'Active Workspace Grant id.' },
        task: { type: 'string', required: true, description: 'Short task signature.' },
        lesson: { type: 'string', required: true, description: 'Desensitized lesson.' },
        approved: { type: 'boolean', required: true, description: 'Must be true.' },
        desensitized: { type: 'boolean', required: true, description: 'Must be true.' },
        actor: {
          type: 'string',
          description: 'Ignored unless it disagrees with the Host Bot, which is refused.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      execute: async (args) =>
        text(
          sharedPublish(botSlug, host.grant(field(args, 'grant_id') ?? ''), {
            task: field(args, 'task'),
            lesson: field(args, 'lesson'),
            approved: args.approved === true,
            desensitized: args.desensitized === true,
            actor: args.actor,
          }),
        ),
    }),
    defineTool({
      name: 'pack_recall',
      description: 'Recall this Bot private lessons and approved lessons in one Workspace Grant.',
      parameters: {
        task: { type: 'string', required: true, description: 'Task text to match.' },
        grant_id: {
          type: 'string',
          description: 'Optional active Workspace Grant id for shared lessons.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      execute: async (args) =>
        text(
          recall(
            memory(),
            botSlug,
            host.grant(field(args, 'grant_id') ?? ''),
            field(args, 'task') ?? '',
          ),
        ),
    }),
    defineTool({
      name: 'pack_migrate',
      description:
        'Copy the thinking pack into this Bot Memory only. Does not write outside that Memory or change presets.',
      parameters: {
        seed_dir: {
          type: 'string',
          required: true,
          description: 'Directory of the thinking seed.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      execute: async (args) => text(migratePack(memory(), field(args, 'seed_dir') ?? '')),
    }),
    defineTool({
      name: 'pack_catalog',
      description:
        'Re-read this Bot authorized catalog view. Identity is the Host session Bot. Private titles and paths are omitted before the result is returned. Ops sources that this Host cannot read are unreachable and are not copied.',
      parameters: {
        actor: {
          type: 'string',
          description: 'Ignored unless it disagrees with the Host Bot, which is refused.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      execute: async (args) =>
        text(
          authorizedCatalogView(memory(), botSlug, { actor: args.actor }, (sourceRef, slug) => {
            if (sourceRef !== OPS_CATALOG_SOURCE) return undefined;
            const sourcePath = host.catalogSourcePath?.();
            const proof = host.catalogSession?.();
            const attested =
              proof === undefined
                ? undefined
                : attestationFromHostSession(proof, { kind: 'bot', slug });
            const view = readAuthorizedOpsCatalog(
              sourcePath,
              attested ?? { source: 'host-bot', slug, ownerId: '', sessionOwnerId: '' },
            );
            if (view.status === 'unreachable') return undefined;
            return {
              status: view.status === 'active' ? 'active' : view.status,
              version: view.version,
              updatedAt: view.updatedAt,
              fingerprint: view.fingerprint,
              briefs: view.inventories.flatMap((item) =>
                item.status === 'active' && (item.brief !== null || item.name !== null)
                  ? [
                      {
                        id: item.id,
                        name: item.name ?? item.id,
                        brief: item.purpose ?? item.brief ?? '',
                        entryRef: item.entryRef,
                      },
                    ]
                  : [],
              ),
            };
          }),
        ),
    }),
    defineTool({
      name: 'pack_catalog_open',
      description:
        'Open one ops catalog entry for this Host-registered Bot. Returns item names and briefs only. Does not read skill or document bodies, and does not use the Owner catalogOpen bridge.',
      parameters: {
        entryRef: {
          type: 'string',
          required: true,
          description: 'Opaque ops:asset-catalog#id from pack_catalog. Not a filesystem path.',
        },
        actor: {
          type: 'string',
          description: 'Ignored unless it disagrees with the Host Bot, which is refused.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      execute: async (args) => {
        const caller = `bot:${botSlug}`;
        if (args.actor !== undefined && args.actor !== botSlug) {
          return text({ ok: false, reason: 'actor-mismatch', caller, items: [] });
        }
        const entryRef = typeof args.entryRef === 'string' ? args.entryRef.trim() : '';
        if (entryRef === '')
          return text({ ok: false, reason: 'entry-required', caller, items: [] });
        const proof = host.catalogSession?.();
        const attested =
          proof === undefined
            ? undefined
            : attestationFromHostSession(proof, { kind: 'bot', slug: botSlug });
        const opened = openAuthorizedOpsEntry(
          host.catalogSourcePath?.(),
          attested ?? { source: 'host-bot', slug: botSlug, ownerId: '', sessionOwnerId: '' },
          entryRef,
        );
        return text({ ...opened, caller });
      },
    }),
    defineTool({
      name: 'pack_rollback',
      description: 'Remove only this pack from this Bot Memory.',
      parameters: {},
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      execute: async () => text(rollbackPack(memory())),
    }),
  ];
}
