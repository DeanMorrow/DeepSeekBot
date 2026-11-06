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
  styles?: { styleRef: string; def: string }[];
  rawRequirement?: string;
  modelPrompt?: string;
  def?: string;
};

function viewOf(value: unknown): Verdict & StatusView {
  return typeof value === 'object' && value !== null ? (value as Verdict & StatusView) : {};
}

export function ConceptArtSection({ call, t }: Props): ReactElement {
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState(t('conceptArt.notReady'));
  const [flags, setFlags] = useState('locked:false credential:false chat:false');
  const [raw, setRaw] = useState('');
  const [outcome, setOutcome] = useState('');
  const [styleState, setStyleState] = useState<'none' | 'selected' | 'disabled'>('none');
  const [styleNote, setStyleNote] = useState('');
  const [styles, setStyles] = useState<{ styleRef: string; def: string }[]>([]);
  const [picked, setPicked] = useState('');
  const [operationKey, setOperationKey] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void callConceptArt(call, { action: 'status' })
      .then(async (value) => {
        if (!live) return;
        const view = viewOf(value);
        const ok =
          view.locked === true && view.credentialConfigured === true && view.chatReady === true;
        setReady(ok);
        setNote(ok ? t('conceptArt.ready') : t('conceptArt.notReady'));
        setFlags(
          `locked:${String(view.locked === true)} credential:${String(view.credentialConfigured === true)} chat:${String(view.chatReady === true)}`,
        );
        const saved = await callConceptArt(call, { action: 'styles' });
        if (!live) return;
        const list = viewOf(saved).styles;
        if (Array.isArray(list)) setStyles(list);
      })
      .catch((error: unknown) => {
        if (!live) return;
        setReady(false);
        setFlags('status:failed');
        setNote(error instanceof Error ? error.message : t('conceptArt.notReady'));
      });
    return () => {
      live = false;
    };
  }, [call, t]);

  const generate = (): void => {
    void callConceptArt(call, {
      action: 'generateStyle',
      sessionId: null,
      styleRef: 'saved-style',
      note: styleNote || raw,
    }).then((value) => {
      const verdict = viewOf(value);
      setOutcome(
        [
          verdict.status ?? '',
          ...(verdict.reasons ?? []),
          verdict.def ? `style:${verdict.def}` : '',
        ]
          .filter((item) => item !== '')
          .join('\n'),
      );
      if (verdict.status === 'ALLOWED' && typeof verdict.def === 'string') {
        setStyles((current) => [
          ...current,
          { styleRef: 'saved-style', def: verdict.def as string },
        ]);
        setPicked('saved-style');
        setStyleState('selected');
      }
    });
  };

  const make = (): void => {
    const idempotencyKey = `concept-${raw.length}-${operationKey ?? 'new'}`;
    void callConceptArt(call, {
      action: 'request',
      request: {
        raw_requirement: raw,
        style: {
          state: styleState,
          ...(styleState === 'selected' && picked !== ''
            ? { styleRef: picked, def: styles.find((item) => item.styleRef === picked)?.def }
            : {}),
        },
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
          verdict.rawRequirement ? `raw:${verdict.rawRequirement}` : '',
          verdict.modelPrompt ? `model:${verdict.modelPrompt}` : '',
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
        <SettingsRow
          title={t('conceptArt.style')}
          description={`${note} ${flags} style:${styleState}`}
        >
          <button type="button" onClick={() => setStyleState('none')}>
            {t('conceptArt.styleNone')}
          </button>
          <button type="button" onClick={() => setStyleState('disabled')}>
            {t('conceptArt.styleOff')}
          </button>
          {styles.map((item) => (
            <button
              key={item.styleRef}
              type="button"
              onClick={() => {
                setPicked(item.styleRef);
                setStyleState('selected');
              }}
            >
              {item.styleRef}
            </button>
          ))}
          <input
            aria-label={t('conceptArt.generate')}
            value={styleNote}
            onChange={(event) => setStyleNote(event.target.value)}
          />
          <button
            type="button"
            disabled={!ready || (styleNote.trim() === '' && raw.trim() === '')}
            onClick={generate}
          >
            {t('conceptArt.generate')}
          </button>
        </SettingsRow>
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
