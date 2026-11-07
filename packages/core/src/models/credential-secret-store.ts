import {
  credentialKey,
  isCredentialKeySegment,
  type CredentialProvider,
} from '@deepseek-ai/dsh-credentials';

import { SharedRouteError, type SecretStore } from './shared-route.js';

type Credentials = Pick<CredentialProvider, 'readRecord' | 'modifyRecord'>;

const ROUTE_SCOPE = 'botharness-route';

function recordKey(id: string) {
  if (!isCredentialKeySegment(ROUTE_SCOPE) || !isCredentialKeySegment(id)) return undefined;
  return credentialKey(ROUTE_SCOPE, id);
}

/**
 * Route keys use the existing credential service under `botharness-route`.
 * That scope is not `botharness-core`, so a voice or cloud grant with the same id stays put.
 * A reference cleanId accepts but credentialKey rejects is not stored.
 */
export function createCredentialSecretStore(
  credentials: () => Credentials | undefined,
): SecretStore {
  return {
    async put(id, key) {
      const native = credentials();
      const stored = recordKey(id);
      if (native === undefined || key === '') {
        throw new SharedRouteError(
          'credential-unavailable',
          'The Host credential service cannot store this reference.',
        );
      }
      if (stored === undefined) {
        throw new SharedRouteError(
          'credential-ref-not-storable',
          'This reference is not a credential key segment. Dots, underscores and a leading digit are not stored.',
        );
      }
      let blocked = false;
      await native.modifyRecord(stored, async (current) => {
        if (current !== undefined && current.kind !== 'api-key') {
          blocked = true;
          return undefined;
        }
        return { kind: 'api-key', key };
      });
      if (blocked) {
        throw new SharedRouteError(
          'credential-record-conflict',
          'An unrelated credential record already uses this route reference.',
        );
      }
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
