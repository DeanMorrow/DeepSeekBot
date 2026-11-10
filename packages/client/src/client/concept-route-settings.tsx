import { useEffect, useState, type ReactElement } from 'react';

import type { BridgeActions } from './actions.js';
import type { BotHarnessTranslate } from './locale.js';
import { SettingsRow, SettingsSection } from './ds/settings-row.js';

type AccountView = {
  provider: string;
  displayName: string;
  credentialRef: string;
  credentialConfigured: boolean;
  models: string[];
  chatProtocol: 'openai-chat' | 'anthropic-messages' | null;
  baseUrl: string;
};

type LockView = {
  locked?: boolean;
  model?: string | null;
  credentialConfigured?: boolean;
  accountProvider?: string | null;
  credentialRef?: string | null;
  protocol?: string | null;
};

type RoutesView = {
  accounts?: AccountView[];
  chat?: LockView;
  image?: LockView;
};

function viewOf(value: unknown): RoutesView {
  return typeof value === 'object' && value !== null ? (value as RoutesView) : {};
}

export function ConceptRouteSettings({
  conceptArt,
  t,
}: {
  conceptArt: BridgeActions['conceptArt'];
  t: BotHarnessTranslate;
}): ReactElement {
  const [routes, setRoutes] = useState<RoutesView>({});
  const [provider, setProvider] = useState('');
  const [note, setNote] = useState('');

  const load = (): void => {
    if (conceptArt === undefined) return;
    void conceptArt({ action: 'routes' }).then((value) => {
      const next = viewOf(value);
      setRoutes(next);
      const accounts = next.accounts ?? [];
      setProvider((current) => {
        if (current !== '' && accounts.some((item) => item.provider === current)) return current;
        const locked = next.chat?.accountProvider ?? next.image?.accountProvider;
        if (
          locked !== undefined &&
          locked !== null &&
          accounts.some((item) => item.provider === locked)
        )
          return locked;
        return accounts[0]?.provider ?? '';
      });
    });
  };

  useEffect(() => {
    load();
  }, [conceptArt]);

  const accounts = routes.accounts ?? [];
  const account = accounts.find((item) => item.provider === provider);
  const savedOnAccount = (lock: LockView | undefined, models: string[]): boolean =>
    lock?.locked === true &&
    lock.accountProvider === account?.provider &&
    lock.credentialRef === account?.credentialRef &&
    lock.model != null &&
    models.includes(lock.model);
  const savedText = (lock: LockView | undefined, onAccount: boolean): string => {
    if (lock?.locked !== true || lock.model == null) return t('conceptRoute.empty');
    if (onAccount) return lock.model;
    return `${t('conceptRoute.savedLock')} ${lock.accountProvider ?? ''} / ${lock.model}`;
  };
  const bind = (capability: 'chat' | 'image', model: string): void => {
    if (conceptArt === undefined || account === undefined || model === '') return;
    void conceptArt({
      action: 'bindAccount',
      bind: { capability, provider: account.provider, model },
    })
      .then(() => {
        setNote('');
        load();
      })
      .catch((error: unknown) => {
        setNote(error instanceof Error ? error.message : t('conceptRoute.empty'));
      });
  };

  if (accounts.length === 0) {
    return (
      <SettingsSection>
        <SettingsRow
          title={t('conceptRoute.account')}
          description={t('conceptRoute.needAccount')}
        />
        <SettingsRow
          title={t('conceptRoute.modelName')}
          description={t('conceptRoute.allowlist')}
        />
      </SettingsSection>
    );
  }

  return (
    <SettingsSection>
      <SettingsRow title={t('conceptRoute.account')} description={t('conceptRoute.sameRef')}>
        {accounts.length === 1 ? (
          <span>{account?.displayName ?? account?.provider}</span>
        ) : (
          <select
            aria-label={t('conceptRoute.account')}
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
          >
            {accounts.map((item) => (
              <option key={item.provider} value={item.provider}>
                {item.displayName || item.provider}
              </option>
            ))}
          </select>
        )}
      </SettingsRow>
      <SettingsRow title={t('conceptRoute.credentialRef')} description={t('conceptRoute.keyKept')}>
        <span>
          {account?.credentialRef === ''
            ? t('conceptRoute.refMissing')
            : (account?.credentialRef ?? t('conceptRoute.empty'))}
        </span>
      </SettingsRow>
      <SettingsRow
        title={t('conceptRoute.chat')}
        description={savedText(routes.chat, savedOnAccount(routes.chat, account?.models ?? []))}
      >
        <select
          aria-label={t('conceptRoute.chat')}
          value={
            savedOnAccount(routes.chat, account?.models ?? []) ? (routes.chat?.model ?? '') : ''
          }
          disabled={account?.chatProtocol == null}
          onChange={(event) => bind('chat', event.target.value)}
        >
          <option value="">{t('conceptRoute.empty')}</option>
          {(account?.models ?? []).map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </SettingsRow>
      <SettingsRow
        title={t('conceptRoute.image')}
        description={savedText(routes.image, savedOnAccount(routes.image, account?.models ?? []))}
      >
        <select
          aria-label={t('conceptRoute.image')}
          value={
            savedOnAccount(routes.image, account?.models ?? []) ? (routes.image?.model ?? '') : ''
          }
          onChange={(event) => bind('image', event.target.value)}
        >
          <option value="">{t('conceptRoute.empty')}</option>
          {(account?.models ?? []).map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </SettingsRow>
      <SettingsRow
        title={t('conceptRoute.modelName')}
        description={note || t('conceptRoute.allowlist')}
      />
    </SettingsSection>
  );
}
