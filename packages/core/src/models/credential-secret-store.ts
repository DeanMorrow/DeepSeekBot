import {
  credentialKey,
  isCredentialKeySegment,
  type CredentialProvider,
} from '@deepseek-ai/dsh-credentials';

import { SharedRouteError, type SecretStore } from './shared-route.js';

type Credentials = Pick<CredentialProvider, 'readRecord' | 'modifyRecord'>;

const SCOPE = 'botharness-core';

function recordKey(id: string) {
  if (!isCredentialKeySegment(SCOPE) || !isCredentialKeySegment(id)) return undefined;
  return credentialKey(SCOPE, id);
}

/** Read and write route keys through the Host credential service. This is not a second store. */
export function createCredentialSecretStore(
  credentials: () => Credentials | undefined,
): SecretStore {
  return {
    async put(id, key) {
      const native = credentials();
      const stored = recordKey(id);
      if (native === undefined || stored === undefined || key === '') {
        throw new SharedRouteError(
          'credential-unavailable',
          'The Host credential service cannot store this reference.',
        );
      }
      await native.modifyRecord(stored, async () => ({ kind: 'api-key', key }));
    },
    async configured(id) {
      return (await this.read(id)) !== undefined;
    },
    async read(id) {
      const native = credentials();
      const stored = recordKey(id);
      if (native === undefined || stored === undefined) return undefined;
      const record = await native.readRecord(stored);
      if (record?.kind !== 'api-key') return undefined;
      return typeof record.key === 'string' && record.key !== '' ? record.key : undefined;
    },
  };
}
