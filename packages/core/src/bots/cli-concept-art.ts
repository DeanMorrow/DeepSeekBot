import { CliLiveError } from './cli-live-error.js';

type Rpc = (method: string, payload: Record<string, unknown>) => Promise<unknown>;

export const CONCEPT_ART_COMMANDS = [
  {
    command: 'concept-art',
    description:
      'call the Host concept-art bridge: status, routes, save-route, lock-route, styles, generate-style, request (JSON on stdin), resume, cancel, or accept. A key is read from stdin only for save-route when the credential is not already stored.',
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
  if (action === 'routes' && rest.length === 1) return (await connect())('conceptArt', { action });
  if (action === 'save-route' && (rest.length === 5 || rest.length === 6)) {
    const keyStdin = rest[5];
    if (keyStdin !== undefined && keyStdin !== '--key-stdin') {
      usage(
        'concept-art save-route accepts an optional --key-stdin and never takes the key as an argument.',
      );
    }
    const key = keyStdin === '--key-stdin' ? (await readStdin()).trim() : undefined;
    if (keyStdin === '--key-stdin' && (key === undefined || key === '')) {
      usage('concept-art save-route --key-stdin reads the key from stdin.');
    }
    return (await connect())('conceptArt', {
      action: 'saveRoute',
      route: {
        id: rest[1],
        protocol: rest[2],
        credentialRef: rest[3],
        models: [rest[4]],
        ...(key === undefined ? {} : { key }),
      },
    });
  }
  if (action === 'lock-route' && rest.length === 4) {
    return (await connect())('conceptArt', {
      action: 'lockRoute',
      lock: { consumer: rest[1], instanceId: rest[2], model: rest[3] },
    });
  }
  if (action === 'open' && rest.length === 2)
    return (await connect())('conceptArt', { action, botSlug: rest[1] });
  if (action === 'styles' && rest.length === 2)
    return (await connect())('conceptArt', { action, sessionId: rest[1] });
  if (action === 'generate-style' && rest.length === 3) {
    const note = (await readStdin()).trim();
    if (note === '') usage('concept-art generate-style reads the style note from stdin.');
    return (await connect())('conceptArt', {
      action: 'generateStyle',
      sessionId: rest[1],
      styleRef: rest[2],
      note,
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
    'concept-art needs status, routes, save-route <id> <openai-chat|openai-images> <credentialRef> <model> [--key-stdin], lock-route <chat|concept-art> <instanceId> <model>, open <bot>, styles <session>, generate-style <session> <ref>, request, resume <session> <key>, cancel <session> <key>, or accept <session> <key> <context-version>.',
  );
}
