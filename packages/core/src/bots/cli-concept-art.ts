import { CliLiveError } from './cli-live-error.js';

type Rpc = (method: string, payload: Record<string, unknown>) => Promise<unknown>;

export const CONCEPT_ART_COMMANDS = [
  {
    command: 'concept-art',
    description:
      'call the Host concept-art bridge: status, styles, generate-style, request (JSON on stdin), resume, cancel, or accept. No key is accepted here.',
  },
] as const;

export function isConceptArtCommand(command: string): command is 'concept-art' {
  return command === 'concept-art';
}

function usage(message: string): never {
  throw new CliLiveError('usage', message);
}

export async function runConceptArtCommand(
  command: 'concept-art',
  rest: string[],
  connect: () => Promise<Rpc>,
  readStdin: () => Promise<string>,
): Promise<unknown> {
  const action = rest[0];
  if (action === 'status' && rest.length === 1) return (await connect())('conceptArt', { action });
  if (action === 'styles' && rest.length === 1) return (await connect())('conceptArt', { action });
  if (action === 'generate-style' && rest.length === 2) {
    const note = (await readStdin()).trim();
    if (note === '') usage('concept-art generate-style reads the style note from stdin.');
    return (await connect())('conceptArt', {
      action: 'generateStyle',
      styleRef: rest[1],
      note,
      sessionId: null,
    });
  }
  if (action === 'request' && rest.length === 1) {
    const text = (await readStdin()).trim();
    let request: unknown;
    try {
      request = JSON.parse(text);
    } catch {
      usage('concept-art request reads one JSON object from stdin.');
    }
    return (await connect())('conceptArt', { action, request });
  }
  if ((action === 'resume' || action === 'cancel') && rest.length === 3) {
    return (await connect())('conceptArt', {
      action,
      sessionId: rest[1],
      idempotencyKey: rest[2],
    });
  }
  if (action === 'accept' && rest.length === 4) {
    return (await connect())('conceptArt', {
      action,
      sessionId: rest[1],
      idempotencyKey: rest[2],
      contextVersion: rest[3],
    });
  }
  usage(
    'concept-art needs status, styles, generate-style <ref>, request, resume <session> <key>, cancel <session> <key>, or accept <session> <key> <context-version>.',
  );
}
