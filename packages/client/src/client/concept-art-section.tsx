import { useEffect, useRef, useState, type ReactElement } from 'react';

import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';

import type { BridgeActions } from './actions.js';
import type { BridgeCall } from './bridge.js';
import { callConceptArt } from './concept-art-bridge.js';
import { SettingsRow, SettingsRows, SettingsSection } from './ds/settings-row.js';
import { color, radius, size, space, text } from './ds/tokens.stylex.js';
import * as stylex from '@stylexjs/stylex';

type Props = PropsLocale<'botharness'> & InjectFace<{ call: BridgeCall }> & { botSlug?: string };

type StatusView = {
  locked?: boolean;
  credentialConfigured?: boolean;
  chatReady?: boolean;
};

type Verdict = {
  status?: string;
  reason?: string;
  reasons?: string[];
  prompt?: string;
  optimization?: string;
  idempotencyKey?: string;
  accept?: boolean;
  deliverable?: boolean;
  mediaVerified?: boolean;
  artifact?: unknown;
  styles?: { styleRef: string; def: string }[];
  unassignedCount?: number;
  rawRequirement?: string;
  modelPrompt?: string;
  def?: string;
  sessionId?: string;
  botSlug?: string;
  proposedPrompt?: string;
  preview?: string;
  userVisible?: boolean;
  delivery?: string;
  quality?: string;
  fidelity?: string;
  promptSource?: string;
};

export function conceptArtCall(conceptArt: BridgeActions['conceptArt']): BridgeCall {
  return async (_endpoint, payload) => {
    if (conceptArt === undefined) {
      return {
        ok: false,
        error: { code: 'unavailable', message: 'Concept art is not on this Host.', details: {} },
      };
    }
    try {
      return { ok: true, value: await conceptArt(payload) };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'unavailable',
          message: error instanceof Error ? error.message : 'Concept art is not available.',
          details: {},
        },
      };
    }
  };
}

const panel = stylex.create({
  root: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.x4,
  },
  actions: { display: 'flex', flexWrap: 'wrap', gap: space.x3 },
  button: {
    minHeight: size.row,
    paddingInline: space.x4,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: color.fg,
    color: color.base,
    fontSize: text.bodySize,
  },
});

function viewOf(value: unknown): Verdict & StatusView {
  return typeof value === 'object' && value !== null ? (value as Verdict & StatusView) : {};
}

type ArtLease = {
  id: number;
  bot: string;
  session: string | null;
  key: string | null;
  cancel: () => void;
};

let artLease: ArtLease | null = null;
let artLeaseSeq = 0;

/** Test isolation. A mounted section replaces any older lease for its Bot. */
export function resetConceptArtLease(): void {
  artLease = null;
  artLeaseSeq = 0;
}

function takeArtLease(bot: string): number {
  if (typeof artLease?.key === 'string' && typeof artLease.session === 'string') artLease.cancel();
  const id = ++artLeaseSeq;
  artLease = { id, bot, session: null, key: null, cancel: () => undefined };
  return id;
}

function artLeaseOwns(id: number): boolean {
  return artLease?.id === id;
}

function noteArtLease(
  id: number,
  session: string | null,
  key: string | null,
  cancel: () => void,
): void {
  if (artLease?.id !== id) return;
  artLease = { id, bot: artLease.bot, session, key, cancel };
}

export function ConceptArtSection({ call, t, botSlug }: Props): ReactElement {
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [unassigned, setUnassigned] = useState(0);
  const [proposed, setProposed] = useState('');
  const [preview, setPreview] = useState('');
  const confirming = useRef(false);
  const flight = useRef(0);
  const pendingKey = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const leaseId = useRef(0);
  const [held, setHeld] = useState<{
    id: string;
    text: string;
    raw: string;
    styleState: 'none' | 'selected' | 'disabled';
    picked: string;
    sessionId: string;
    botSlug: string;
  } | null>(null);

  const heldRef = useRef(held);
  heldRef.current = held;
  const dropHeld = (id: number, session: string, key: string): void => {
    if (!artLeaseOwns(id)) return;
    noteArtLease(id, null, null, () => undefined);
    void callConceptArt(call, { action: 'cancel', sessionId: session, idempotencyKey: key });
  };

  useEffect(() => {
    let live = true;
    const id = botSlug === undefined ? 0 : takeArtLease(botSlug);
    leaseId.current = id;
    setHeld(null);
    setProposed('');
    setPreview('');
    void callConceptArt(call, { action: 'status' })
      .then(async (value) => {
        if (!live) return;
        const view = viewOf(value);
        const ok =
          view.locked === true && view.credentialConfigured === true && view.chatReady === true;
        setReady(ok);
        setNote(ok ? t('conceptArt.ready') : t('conceptArt.notReady'));
        if (botSlug === undefined) {
          setFlags(
            `locked:${String(view.locked === true)} credential:${String(view.credentialConfigured === true)} chat:${String(view.chatReady === true)} session:missing`,
          );
          return;
        }
        const opened = viewOf(await callConceptArt(call, { action: 'open', botSlug }));
        const resolved = typeof opened.sessionId === 'string';
        if (resolved) setSessionId(opened.sessionId ?? null);
        setFlags(
          `locked:${String(view.locked === true)} credential:${String(view.credentialConfigured === true)} chat:${String(view.chatReady === true)} session:${resolved ? 'ready' : 'missing'}`,
        );
        const saved = await callConceptArt(call, { action: 'styles', botSlug });
        if (!live) return;
        const savedView = viewOf(saved);
        if (Array.isArray(savedView.styles)) setStyles(savedView.styles);
        setUnassigned(
          typeof savedView.unassignedCount === 'number' ? savedView.unassignedCount : 0,
        );
      })
      .catch((error: unknown) => {
        if (!live) return;
        setReady(false);
        setFlags('status:failed');
        setNote(error instanceof Error ? error.message : t('conceptArt.notReady'));
      });
    return () => {
      live = false;
      const pending = heldRef.current;
      if (artLeaseOwns(id) && pending !== null) {
        void callConceptArt(call, {
          action: 'cancel',
          sessionId: pending.sessionId,
          idempotencyKey: pending.id,
        });
      }
      if (artLease?.id === id) artLease = null;
    };
  }, [botSlug, call, t]);

  const generate = (): void => {
    void callConceptArt(call, {
      action: 'generateStyle',
      sessionId,
      botSlug,
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
    const id = leaseId.current;
    if (botSlug === undefined || !artLeaseOwns(id)) return;
    const ticket = flight.current + 1;
    flight.current = ticket;
    const idempotencyKey = `concept-${raw.length}-${operationKey ?? 'new'}`;
    pendingKey.current = idempotencyKey;
    setBusy(true);
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
        sessionId,
        ...(botSlug === undefined ? {} : { botSlug }),
        context_version: 1,
        operation_id: idempotencyKey,
        route_idempotency_key: idempotencyKey,
        input_fingerprint: idempotencyKey,
        submit_allowed: true,
      },
    })
      .then((value) => {
        const verdict = viewOf(value);
        if (flight.current !== ticket) return;
        if (!artLeaseOwns(id)) {
          if (typeof verdict.idempotencyKey === 'string' && sessionId !== null)
            void callConceptArt(call, {
              action: 'cancel',
              sessionId,
              idempotencyKey: verdict.idempotencyKey,
            });
          return;
        }
        setOperationKey(typeof verdict.idempotencyKey === 'string' ? verdict.idempotencyKey : null);
        if (
          verdict.status === 'NEEDS_CONFIRMATION' &&
          typeof verdict.proposedPrompt === 'string' &&
          typeof verdict.idempotencyKey === 'string' &&
          sessionId !== null &&
          botSlug !== undefined
        ) {
          const next = {
            id: verdict.idempotencyKey,
            text: verdict.proposedPrompt,
            raw,
            styleState,
            picked,
            sessionId,
            botSlug,
          };
          setHeld(next);
          noteArtLease(id, sessionId, verdict.idempotencyKey, () => {
            void callConceptArt(call, {
              action: 'cancel',
              sessionId,
              idempotencyKey: verdict.idempotencyKey as string,
            });
          });
          setProposed(verdict.proposedPrompt);
        } else {
          setHeld(null);
          setProposed('');
        }
        setPreview(
          verdict.userVisible === true && typeof verdict.preview === 'string'
            ? verdict.preview
            : '',
        );
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
      })
      .catch((error: unknown) => {
        if (flight.current !== ticket) return;
        setOutcome(error instanceof Error ? error.message : t('conceptArt.notReady'));
      })
      .finally(() => {
        if (flight.current === ticket) setBusy(false);
      });
  };

  const confirm = (): void => {
    const id = leaseId.current;
    if (
      confirming.current ||
      !artLeaseOwns(id) ||
      held === null ||
      sessionId === null ||
      botSlug === undefined
    )
      return;
    confirming.current = true;
    if (
      raw !== held.raw ||
      styleState !== held.styleState ||
      picked !== held.picked ||
      sessionId !== held.sessionId ||
      botSlug !== held.botSlug
    ) {
      setHeld(null);
      setProposed('');
      setPreview('');
      setOutcome('STALE_CONFIRMATION');
      confirming.current = false;
      return;
    }
    const idempotencyKey = held.id;
    void callConceptArt(call, {
      action: 'request',
      request: {
        raw_requirement: held.raw,
        style:
          held.styleState === 'selected' && held.picked !== ''
            ? {
                state: held.styleState,
                styleRef: held.picked,
                def: styles.find((item) => item.styleRef === held.picked)?.def,
              }
            : { state: held.styleState },
        sessionId: held.sessionId,
        botSlug: held.botSlug,
        confirmedPrompt: held.text,
        context_version: 1,
        operation_id: idempotencyKey,
        route_idempotency_key: idempotencyKey,
        input_fingerprint: idempotencyKey,
        submit_allowed: true,
      },
    })
      .then((value) => {
        const verdict = viewOf(value);
        if (!artLeaseOwns(id)) return;
        const shown =
          verdict.userVisible === true && typeof verdict.preview === 'string'
            ? verdict.preview
            : '';
        if (shown === '' && verdict.reason !== undefined && verdict.reason !== '') {
          setPreview('');
        } else {
          noteArtLease(id, null, null, () => undefined);
          setProposed('');
          setHeld(null);
          setPreview(shown);
        }
        setOutcome(
          [
            verdict.status ?? '',
            verdict.reason ?? '',
            verdict.fidelity ?? '',
            verdict.promptSource ?? '',
            verdict.quality ?? '',
            verdict.delivery ?? '',
          ]
            .filter((item) => item !== '')
            .join('\n'),
        );
      })
      .catch((error: unknown) => {
        setOutcome(error instanceof Error ? error.message : t('conceptArt.notReady'));
      })
      .finally(() => {
        confirming.current = false;
      });
  };

  const cancel = (): void => {
    const key = operationKey ?? pendingKey.current;
    if (key === null) return;
    flight.current += 1;
    pendingKey.current = null;
    setBusy(false);
    setPreview('');
    void callConceptArt(call, {
      action: 'cancel',
      sessionId: sessionId ?? '',
      idempotencyKey: key,
    }).then((value) => {
      const verdict = viewOf(value);
      setPreview('');
      setProposed('');
      setOutcome(
        verdict.artifact == null && verdict.preview === undefined
          ? `${t('conceptArt.cancel')}\nuserVisible:false`
          : t('conceptArt.result'),
      );
    });
  };

  const styleValue = styleState === 'selected' ? picked : styleState;
  return (
    <div {...stylex.props(panel.root)}>
      <SettingsRows>
        <SettingsSection>
          <SettingsRow
            title={t('conceptArt.style')}
            description={`${note}${unassigned > 0 ? ` ${t('conceptArt.unassigned')}` : ''} ${flags} style:${styleState}`}
          >
            <select
              aria-label={t('conceptArt.style')}
              value={styleValue}
              onChange={(event) => {
                const value = event.target.value;
                setHeld(null);
                setProposed('');
                if (value === 'none' || value === 'disabled') {
                  setStyleState(value);
                  return;
                }
                setPicked(value);
                setStyleState('selected');
              }}
            >
              <option value="none">{t('conceptArt.styleNone')}</option>
              <option value="disabled">{t('conceptArt.styleOff')}</option>
              {styles.map((item) => (
                <option key={item.styleRef} value={item.styleRef}>
                  {item.styleRef}
                </option>
              ))}
            </select>
            <input
              aria-label={t('conceptArt.generate')}
              value={styleNote}
              onChange={(event) => setStyleNote(event.target.value)}
            />
            <button
              type="button"
              {...stylex.props(panel.button)}
              disabled={
                !ready || sessionId === null || (styleNote.trim() === '' && raw.trim() === '')
              }
              onClick={generate}
            >
              {t('conceptArt.generate')}
            </button>
          </SettingsRow>
          <SettingsRow title={t('conceptArt.raw')} description={note}>
            <textarea
              aria-label={t('conceptArt.raw')}
              value={raw}
              onChange={(event) => {
                const value = event.target.value;
                setRaw(value);
                if (held !== null && held.raw !== value) {
                  dropHeld(leaseId.current, held.sessionId, held.id);
                  setHeld(null);
                  setProposed('');
                }
              }}
            />
          </SettingsRow>
          {proposed === '' ? null : (
            <SettingsRow title={t('conceptArt.prompt')} description={proposed}>
              <button type="button" {...stylex.props(panel.button)} onClick={confirm}>
                {t('conceptArt.confirm')}
              </button>
            </SettingsRow>
          )}
          <SettingsRow
            title={t('conceptArt.result')}
            description={outcome || note}
            control={
              <>
                <button
                  type="button"
                  {...stylex.props(panel.button)}
                  disabled={!ready || sessionId === null || raw.trim() === ''}
                  onClick={make}
                >
                  {t('conceptArt.make')}
                </button>
                <button
                  type="button"
                  {...stylex.props(panel.button)}
                  disabled={operationKey === null && !busy}
                  onClick={cancel}
                >
                  {t('conceptArt.cancel')}
                </button>
              </>
            }
          />
          {preview === '' ? null : (
            <>
              <img alt={t('conceptArt.preview')} src={`data:image/png;base64,${preview}`} />
              <a download="concept-art.png" href={`data:image/png;base64,${preview}`}>
                {t('conceptArt.save')}
              </a>
            </>
          )}
        </SettingsSection>
      </SettingsRows>
    </div>
  );
}
