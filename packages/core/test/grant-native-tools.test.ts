import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { nativeFileToolDenial, nativeExecutionRoot } from '../src/workspaces/grant-native-tools.js';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(linkedParent = false) {
  const real = realpathSync(mkdtempSync(join(tmpdir(), 'bh-native-grant-')));
  roots.push(real);
  let root = real;
  if (linkedParent) {
    mkdirSync(join(real, 'target'));
    symlinkSync(join(real, 'target'), join(real, 'linked'));
    root = join(real, 'linked');
  }
  const memory = join(root, 'memory');
  const project = join(root, 'project');
  const outside = join(root, 'outside');
  for (const path of [memory, project, outside]) mkdirSync(path);
  writeFileSync(join(memory, 'memory.txt'), 'memory');
  writeFileSync(join(project, 'project.txt'), 'project');
  writeFileSync(join(outside, 'secret.txt'), 'secret');
  symlinkSync(outside, join(project, 'escape'));
  symlinkSync(join(outside, 'not-yet-created.txt'), join(project, 'dangling'));

  let oldActive = true;
  let newActive = false;
  const oldGrant = {
    orchestratorWrite: false,
    id: 'old-grant',
    botSlug: 'ada',
    workspaceId: 'project',
    workspacePath: project,
    workspaceTitle: 'project',
    createdAt: '2026-01-01T00:00:00Z',
  };
  const newGrant = { ...oldGrant, id: 'new-grant', createdAt: '2026-01-02T00:00:00Z' };
  const requireActive = vi.fn((_botSlug: string, grantId: string) => {
    if (grantId === oldGrant.id && oldActive) return oldGrant;
    if (grantId === newGrant.id && newActive) return newGrant;
    throw new Error('Workspace Grant is missing or revoked');
  });
  const core = {
    ownership: {
      resolve: (sessionId: string) => {
        if (sessionId === 'orch') return { sessionId, botSlug: 'ada', rootRole: 'orchestrator' };
        if (sessionId === 'old' || sessionId === 'new') {
          return { sessionId, botSlug: 'ada', rootRole: 'assignment' };
        }
        return undefined;
      },
    },
    registry: { memoryDirFor: () => memory, get: () => ({ slug: 'ada' }) },
    grants: {
      list: () => [
        { ...oldGrant, ...(oldActive ? {} : { revokedAt: '2026-01-03T00:00:00Z' }) },
        ...(newActive ? [newGrant] : []),
      ],
      requireActive,
    },
    runtime: {
      getAssignment: (_botSlug: string, sessionId: string) => ({
        permission: {
          grantId: sessionId === 'new' ? newGrant.id : oldGrant.id,
          workspaceId: 'project',
          primaryCwd: project,
        },
      }),
    },
  } as never;
  const orchestrator = { id: 'orch', header: { cwd: memory } } as never;
  const oldAssignment = { id: 'old', header: { cwd: project } } as never;
  const newAssignment = { id: 'new', header: { cwd: project } } as never;
  const gate = (session: typeof orchestrator, name: string, args: unknown) =>
    nativeFileToolDenial(core, session, name, args);
  return {
    core,
    allowWrite: (enabled: boolean) => {
      oldGrant.orchestratorWrite = enabled;
    },
    memory,
    project,
    outside,
    orchestrator,
    oldAssignment,
    newAssignment,
    gate,
    revoke: () => {
      oldActive = false;
    },
    reauthorize: () => {
      newActive = true;
    },
  };
}

describe('Grant policy for native DSH file tools', () => {
  it('lets Orchestrator read Memory and active Grants but write only Memory', () => {
    const f = fixture();
    expect(f.gate(f.orchestrator, 'read', { file_path: 'memory.txt' })).toBeUndefined();
    expect(
      f.gate(f.orchestrator, 'read', { file_path: join(f.project, 'project.txt') }),
    ).toBeUndefined();
    expect(f.gate(f.orchestrator, 'read', { file_path: join(f.outside, 'secret.txt') })).toMatch(
      /outside/,
    );
    expect(
      f.gate(f.orchestrator, 'write', { file_path: 'new.txt', content: 'remembered' }),
    ).toBeUndefined();
    expect(f.gate(f.orchestrator, 'edit', { file_path: join(f.project, 'project.txt') })).toMatch(
      /outside/,
    );
    expect(readFileSync(join(f.project, 'project.txt'), 'utf8')).toBe('project');
  });

  it('checks native reads, edits, images, and searches against traversal and symlinks', () => {
    const f = fixture();
    expect(f.gate(f.oldAssignment, 'read', { file_path: 'project.txt' })).toBeUndefined();
    expect(f.gate(f.oldAssignment, 'read_image', { file_path: 'project.txt' })).toBeUndefined();
    expect(f.gate(f.oldAssignment, 'glob', { pattern: '*', path: '.' })).toBeUndefined();
    expect(f.gate(f.oldAssignment, 'grep', { pattern: 'x', path: '.' })).toBeUndefined();
    expect(
      f.gate(f.oldAssignment, 'str_replace_editor', { command: 'view', path: 'project.txt' }),
    ).toBeUndefined();
    expect(
      f.gate(f.oldAssignment, 'str_replace_editor', { command: 'create', path: 'new.txt' }),
    ).toMatch(/outside/);
    f.allowWrite(true);
    expect(
      f.gate(f.oldAssignment, 'str_replace_editor', { command: 'create', path: 'new.txt' }),
    ).toBeUndefined();
    for (const path of ['../outside/secret.txt', 'escape/secret.txt', 'dangling']) {
      expect(f.gate(f.oldAssignment, 'read', { file_path: path })).toMatch(/outside|resolved/);
    }
    expect(f.gate(f.oldAssignment, 'write', { file_path: 'escape/new.txt' })).toMatch(/outside/);
    expect(f.gate(f.oldAssignment, 'write', { file_path: join(f.memory, 'memory.txt') })).toMatch(
      /outside/,
    );
    expect(f.gate(f.oldAssignment, 'read', {})).toMatch(/valid native file path/);
  });

  it('revocation blocks future native calls and a new Grant cannot revive an old Assignment', () => {
    const f = fixture();
    f.revoke();
    expect(f.gate(f.orchestrator, 'read', { file_path: join(f.project, 'project.txt') })).toMatch(
      /outside/,
    );
    expect(f.gate(f.oldAssignment, 'read', { file_path: 'project.txt' })).toMatch(/outside/);
    expect(f.gate(f.oldAssignment, 'write', { file_path: 'project.txt' })).toMatch(/outside/);
    expect(f.gate(f.orchestrator, 'read', { file_path: 'memory.txt' })).toBeUndefined();
    f.reauthorize();
    expect(f.gate(f.oldAssignment, 'read', { file_path: 'project.txt' })).toMatch(/outside/);
    expect(f.gate(f.newAssignment, 'read', { file_path: 'project.txt' })).toBeUndefined();
    expect(
      f.gate(f.orchestrator, 'read', { file_path: join(f.project, 'project.txt') }),
    ).toBeUndefined();
  });
});

describe('Native write into missing parent directories (#3289)', () => {
  it('authorizes nested writes inside the workspace and keeps escapes refused', () => {
    const f = fixture();
    for (const path of ['probe/missing/child/file.md', '探针/不存在的子目录/深层探针.md']) {
      expect(f.gate(f.orchestrator, 'write', { file_path: path, content: 'x' })).toBeUndefined();
      expect(f.gate(f.orchestrator, 'edit', { file_path: path })).toBeUndefined();
      expect(nativeExecutionRoot(f.core, f.orchestrator, 'write', { file_path: path })).toBe(
        f.memory,
      );
    }
    expect(
      f.gate(f.orchestrator, 'write', { file_path: join(f.memory, 'a', 'b', 'c.md') }),
    ).toBeUndefined();
    f.allowWrite(true);
    expect(
      f.gate(f.oldAssignment, 'write', { file_path: 'docs/new/notes.md', content: 'x' }),
    ).toBeUndefined();
    expect(f.gate(f.oldAssignment, 'write', { file_path: 'escape/missing/new.txt' })).toMatch(
      /outside/,
    );
    expect(f.gate(f.oldAssignment, 'write', { file_path: '../outside/missing/new.txt' })).toMatch(
      /outside/,
    );
    expect(f.gate(f.oldAssignment, 'write', { file_path: 'dangling/child/new.txt' })).toMatch(
      /outside|resolved|directory/,
    );
    expect(f.gate(f.oldAssignment, 'write', { file_path: 'project.txt/child.txt' })).toMatch(
      /resolved|directory/,
    );
  });
});

describe('Orchestrator execution root selection', () => {
  it('uses exactly one current writable root, preserving relative Memory paths and revocation', () => {
    const f = fixture();
    expect(nativeExecutionRoot(f.core, f.orchestrator, 'bash', { command: 'pwd' })).toBe(f.memory);
    expect(() =>
      nativeExecutionRoot(f.core, f.orchestrator, 'bash', { workdir: f.project }),
    ).toThrow(/outside/);
    f.allowWrite(true);
    expect(
      f.gate(f.orchestrator, 'write', { file_path: join(f.project, 'new.txt') }),
    ).toBeUndefined();
    expect(
      nativeExecutionRoot(f.core, f.orchestrator, 'write', {
        file_path: join(f.project, 'new.txt'),
      }),
    ).toBe(f.project);
    expect(nativeExecutionRoot(f.core, f.orchestrator, 'write', { file_path: 'new.txt' })).toBe(
      f.memory,
    );
    expect(nativeExecutionRoot(f.core, f.orchestrator, 'bash', { workdir: f.project })).toBe(
      f.project,
    );
    expect(nativeExecutionRoot(f.core, f.orchestrator, 'pwsh', { workdir: f.project })).toBe(
      f.project,
    );
    expect(() =>
      nativeExecutionRoot(f.core, f.orchestrator, 'pwsh', { workdir: dirname(f.project) }),
    ).toThrow(/outside/);
    expect(() =>
      nativeExecutionRoot(f.core, f.orchestrator, 'bash', { workdir: dirname(f.project) }),
    ).toThrow(/outside/);
    expect(() =>
      nativeExecutionRoot(f.core, f.orchestrator, 'bash', { workdir: join(f.project, 'escape') }),
    ).toThrow(/outside/);
    f.allowWrite(false);
    expect(f.gate(f.orchestrator, 'write', { file_path: join(f.project, 'new.txt') })).toMatch(
      /outside/,
    );
    expect(() =>
      nativeExecutionRoot(f.core, f.orchestrator, 'bash', { workdir: f.project }),
    ).toThrow(/outside/);
  });
});

describe('Neighboring Memory is not access', () => {
  it('denies the other Bot even when the folders sit side by side', () => {
    const f = fixture();
    const beeMemory = join(dirname(f.memory), 'bee-memory');
    mkdirSync(beeMemory);
    writeFileSync(join(beeMemory, 'own.md'), 'bee');
    writeFileSync(join(f.memory, 'secret.md'), 'ada-secret');
    writeFileSync(join(f.project, 'lesson.md'), 'desensitized shared lesson');
    const beeGrant = {
      orchestratorWrite: false,
      id: 'bee-grant',
      botSlug: 'bee',
      workspaceId: 'project',
      workspacePath: f.project,
      workspaceTitle: 'project',
      createdAt: '2026-01-01T00:00:00Z',
    };
    const bee = {
      ownership: {
        resolve: (sessionId: string) =>
          sessionId === 'bee'
            ? { sessionId, botSlug: 'bee', rootRole: 'orchestrator' as const }
            : undefined,
      },
      registry: { memoryDirFor: () => beeMemory, get: () => ({ slug: 'bee' }) },
      grants: { list: () => [beeGrant], requireActive: () => beeGrant },
      runtime: { getAssignment: () => undefined },
    } as never;
    const beeSession = { id: 'bee', header: { cwd: beeMemory } } as never;

    expect(f.gate(f.orchestrator, 'read', { file_path: join(beeMemory, 'own.md') })).toMatch(
      /outside/,
    );
    expect(
      nativeFileToolDenial(bee, beeSession, 'read', { file_path: join(f.memory, 'secret.md') }),
    ).toMatch(/outside/);
    expect(
      nativeFileToolDenial(bee, beeSession, 'read', {
        file_path: join(f.memory, 'secret.md'),
        approved: true,
      }),
    ).toMatch(/outside/);
    expect(nativeFileToolDenial(bee, beeSession, 'read', { file_path: 'own.md' })).toBeUndefined();
    expect(
      nativeFileToolDenial(bee, beeSession, 'read', { file_path: join(f.project, 'lesson.md') }),
    ).toBeUndefined();
  });
});

describe('Workspace roots under a symlinked parent (#1292)', () => {
  it('accepts Memory and Grant roots whose parent directory is a symlink', () => {
    const f = fixture(true);
    expect(f.gate(f.orchestrator, 'read', { file_path: 'memory.txt' })).toBeUndefined();
    expect(
      f.gate(f.orchestrator, 'write', { file_path: 'new.txt', content: 'remembered' }),
    ).toBeUndefined();
    expect(f.gate(f.oldAssignment, 'read', { file_path: 'project.txt' })).toBeUndefined();
    expect(nativeExecutionRoot(f.core, f.orchestrator, 'bash', { command: 'pwd' })).toBe(f.memory);
    expect(f.gate(f.oldAssignment, 'read', { file_path: 'escape/secret.txt' })).toMatch(/outside/);
    expect(f.gate(f.oldAssignment, 'read', { file_path: join(f.outside, 'secret.txt') })).toMatch(
      /outside/,
    );
  });

  it('still refuses a root that is itself a symlink', () => {
    const f = fixture();
    const linkedMemory = join(dirname(f.memory), 'linked-memory');
    symlinkSync(f.memory, linkedMemory);
    const core = {
      ...(f.core as object),
      registry: { memoryDirFor: () => linkedMemory, get: () => ({ slug: 'ada' }) },
    } as never;
    const session = { id: 'orch', header: { cwd: linkedMemory } } as never;
    expect(nativeFileToolDenial(core, session, 'read', { file_path: 'memory.txt' })).toMatch(
      /outside/,
    );
  });
});
