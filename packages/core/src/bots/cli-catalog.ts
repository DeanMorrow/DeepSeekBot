import { CliLiveError } from './cli-live-error.js';

export const CATALOG_COMMANDS = [
  {
    command: 'catalog',
    description:
      'read the Owner-authorized ops catalog from the configured source (catalogView on the live Host)',
  },
  {
    command: 'catalog-open',
    description: 'open one authorized ops catalog entry by its opaque entryRef (catalogOpen)',
  },
] as const;

type LiveRpc = <T>(method: string, args: Record<string, unknown>) => Promise<T>;

function usage(message: string): never {
  throw new CliLiveError('usage', message);
}

export async function runCatalogCommand(
  command: (typeof CATALOG_COMMANDS)[number]['command'],
  rest: string[],
  connect: () => Promise<{ rpc: LiveRpc }>,
): Promise<unknown> {
  const rpc = (await connect()).rpc;
  if (command === 'catalog') {
    if (rest.length !== 0) usage('catalog takes no positional arguments.');
    return rpc('catalogView', {});
  }
  if (rest.length !== 1 || rest[0]?.trim() === '') usage('catalog-open needs one opaque entryRef.');
  return rpc('catalogOpen', { entryRef: rest[0]!.trim() });
}
