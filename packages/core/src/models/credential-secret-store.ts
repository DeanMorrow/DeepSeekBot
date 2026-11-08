import {
  credentialKey,
  credentialRef,
  isCredentialKeySegment,
  isCredentialRefName,
  type CredentialProvider,
} from '@deepseek-ai/dsh-credentials';

import { SharedRouteError, type SecretStore } from './shared-route.js';

type Credentials = Pick<CredentialProvider, 'readRecord' | 'modifyRecord'> &
  Partial<Pick<CredentialProvider, 'resolve' | 'describe' | 'set'>>;

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
      if (isCredentialRefName(id)) {
        if (native?.describe === undefined || native.set === undefined) {
          throw new SharedRouteError(
            'credential-unavailable',
            'The Host credential service cannot resolve this reference.',
          );
        }
        const ref = credentialRef(id);
        if ((await native.describe(ref)).configured) {
          const current = await native.resolve?.(ref);
          if (current?.value === key) return;
          throw new SharedRouteError(
            'credential-already-configured',
            'That credential reference is already stored. It is reused and not overwritten.',
          );
        }
        await native.set(ref, key);
        return;
      }
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
      if (isCredentialRefName(id)) {
        if (native?.resolve === undefined) return undefined;
        const resolved = await native.resolve(credentialRef(id));
        return resolved?.value !== undefined && resolved.value !== '' ? resolved.value : undefined;
      }
      const stored = recordKey(id);
      if (native === undefined || stored === undefined) return undefined;
      const record = await native.readRecord(stored);
      if (record?.kind !== 'api-key') return undefined;
      return typeof record.key === 'string' && record.key !== '' ? record.key : undefined;
    },
  };
}
