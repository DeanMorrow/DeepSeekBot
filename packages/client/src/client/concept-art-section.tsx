import { useEffect, useState, type ReactElement } from 'react';

import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';

import type { BridgeCall } from './bridge.js';
import { callConceptArt } from './concept-art-bridge.js';
import { SettingsRow, SettingsRows, SettingsSection } from './ds/settings-row.js';

type Props = PropsLocale<'botharness'> & InjectFace<{ call: BridgeCall }>;

type StatusView = {
  locked?: boolean;
  credentialConfigured?: boolean;
  chatReady?: boolean;
};

type Verdict = {
  status?: string;
  reasons?: string[];
  prompt?: string;
  optimization?: string;
  idempotencyKey?: string;
  accept?: boolean;
  deliverable?: boolean;
  mediaVerified?: boolean;
  artifact?: unknown;
};

function viewOf(value: unknown): Verdict & StatusView {
  return typeof value === 'object' && value !== null ? (value as Verdict & StatusView) : {};
}

export function ConceptArtSection({ call, t }: Props): ReactElement {
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState(t('conceptArt.notReady'));
  const [raw, setRaw] = useState('');
  const [outcome, setOutcome] = useState('');
  const [operationKey, setOperationKey] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void callConceptArt(call, { action: 'status' })
      .then((value) => {
        if (!live) return;
        const view = viewOf(value);
        const ok =
          view.locked === true && view.credentialConfigured === true && view.chatReady === true;
        setReady(ok);
        setNote(ok ? t('conceptArt.ready') : t('conceptArt.notReady'));
      })
      .catch(() => {
        if (live) setNote(t('conceptArt.notReady'));
      });
    return () => {
      live = false;
    };
  }, [call, t]);

  const make = (): void => {
    const idempotencyKey = `concept-${raw.length}-${operationKey ?? 'new'}`;
    void callConceptArt(call, {
      action: 'request',
      request: {
        raw_requirement: raw,
        style: { state: 'none' },
        sessionId: null,
        context_version: 1,
        operation_id: idempotencyKey,
        route_idempotency_key: idempotencyKey,
        input_fingerprint: idempotencyKey,
        submit_allowed: true,
      },
    }).then((value) => {
      const verdict = viewOf(value);
      setOperationKey(typeof verdict.idempotencyKey === 'string' ? verdict.idempotencyKey : null);
      setOutcome(
        [
          verdict.status ?? '',
          ...(verdict.reasons ?? []),
          verdict.prompt ?? '',
          verdict.optimization ?? '',
          verdict.deliverable === false ? 'deliverable:false' : '',
          verdict.mediaVerified === false ? 'mediaVerified:false' : '',
        ]
          .filter((item) => item !== '')
          .join('\n'),
      );
    });
  };

  const cancel = (): void => {
    if (operationKey === null) return;
    void callConceptArt(call, {
      action: 'cancel',
      sessionId: 'current',
      idempotencyKey: operationKey,
    }).then((value) => {
      const verdict = viewOf(value);
      setOutcome(
        verdict.artifact == null
          ? `${t('conceptArt.cancel')}\ndeliverable:false`
          : t('conceptArt.result'),
      );
    });
  };

  return (
    <SettingsRows>
      <SettingsSection>
        <SettingsRow title={t('conceptArt.raw')} description={note}>
          <textarea
            aria-label={t('conceptArt.raw')}
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
          />
        </SettingsRow>
        <SettingsRow
          title={t('conceptArt.result')}
          description={outcome || note}
          control={
            <>
              <button type="button" disabled={!ready || raw.trim() === ''} onClick={make}>
                {t('conceptArt.make')}
              </button>
              <button type="button" disabled={operationKey === null} onClick={cancel}>
                {t('conceptArt.cancel')}
              </button>
            </>
          }
        />
      </SettingsSection>
    </SettingsRows>
  );
}
