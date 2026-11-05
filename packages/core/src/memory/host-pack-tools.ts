import { defineTool, type ToolDefinition } from '@deepseek-ai/dsh-tools';

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
        text(authorizedCatalogView(memory(), botSlug, { actor: args.actor })),
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
