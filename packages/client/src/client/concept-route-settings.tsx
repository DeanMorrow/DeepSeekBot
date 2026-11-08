import { useEffect, useState, type ReactElement } from 'react';

import type { BridgeActions } from './actions.js';
import type { BotHarnessTranslate } from './locale.js';
import { SettingsRow, SettingsSection } from './ds/settings-row.js';

type InstanceView = {
  id: string;
  capability: 'chat' | 'image' | 'video';
  protocol: string;
  baseUrl: string;
  models: string[];
  credentialRef: string;
  credentialConfigured: boolean;
};

type LockView = {
  locked?: boolean;
  providerId?: string | null;
  model?: string | null;
  credentialConfigured?: boolean;
};

type RoutesView = {
  protocols?: { protocol: string; baseUrl: string; capability: string }[];
  instances?: InstanceView[];
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
  const [note, setNote] = useState('');
  const [modelName, setModelName] = useState('');
  const [credentialRef, setCredentialRef] = useState('');
  const [key, setKey] = useState('');
  const [askKey, setAskKey] = useState(false);
  const [protocol, setProtocol] = useState<'openai-chat' | 'openai-images'>('openai-chat');

  const load = (): void => {
    if (conceptArt === undefined) return;
    void conceptArt({ action: 'routes' }).then((value) => setRoutes(viewOf(value)));
  };

  useEffect(() => {
    load();
  }, [conceptArt]);

  const instances = routes.instances ?? [];
  const chatInstances = instances.filter((item) => item.capability === 'chat');
  const imageInstances = instances.filter((item) => item.capability === 'image');
  const base =
    routes.protocols?.find((item) => item.protocol === protocol)?.baseUrl ??
    'https://api.apiyi.com/v1';
  const selectedRef = instances.find((item) => item.credentialRef === credentialRef.trim());
  const needsKey = askKey && selectedRef?.credentialConfigured !== true;

  const lock = (consumer: 'chat' | 'concept-art', value: string): void => {
    if (conceptArt === undefined || value === '') return;
    const [instanceId, model] = value.split('\n');
    if (instanceId === undefined || model === undefined) return;
    void conceptArt({
      action: 'lockRoute',
      lock: { consumer, instanceId, model },
    })
      .then(() => {
        setNote('');
        load();
      })
      .catch((error: unknown) => {
        setNote(error instanceof Error ? error.message : t('conceptRoute.empty'));
      });
  };

  const save = (): void => {
    if (conceptArt === undefined || modelName.trim() === '' || credentialRef.trim() === '') return;
    const id = `${protocol}-${credentialRef.trim()}`;
    void conceptArt({
      action: 'saveRoute',
      route: {
        id,
        protocol,
        credentialRef: credentialRef.trim(),
        models: [modelName.trim()],
        ...(needsKey ? { key } : {}),
      },
    })
      .then(() =>
        conceptArt({
          action: 'lockRoute',
          lock: {
            consumer: protocol === 'openai-chat' ? 'chat' : 'concept-art',
            instanceId: id,
            model: modelName.trim(),
          },
        }),
      )
      .then(() => {
        setKey('');
        setAskKey(false);
        setModelName('');
        load();
      })
      .catch((error: unknown) => {
        const code =
          typeof error === 'object' && error !== null
            ? (error as { code?: string }).code
            : undefined;
        if (code === 'credential-missing') setAskKey(true);
        setNote(error instanceof Error ? error.message : t('conceptRoute.empty'));
      });
  };

  return (
    <SettingsSection>
      <SettingsRow
        title={t('conceptRoute.chat')}
        description={routes.chat?.model ?? t('conceptRoute.empty')}
      >
        <select
          aria-label={t('conceptRoute.chat')}
          value={
            routes.chat?.providerId && routes.chat.model
              ? `${routes.chat.providerId}\n${routes.chat.model}`
              : ''
          }
          onChange={(event) => lock('chat', event.target.value)}
        >
          <option value="">{t('conceptRoute.empty')}</option>
          {chatInstances.flatMap((item) =>
            item.models.map((model) => (
              <option key={`${item.id}-${model}`} value={`${item.id}\n${model}`}>
                {model}
              </option>
            )),
          )}
        </select>
      </SettingsRow>
      <SettingsRow
        title={t('conceptRoute.image')}
        description={routes.image?.model ?? t('conceptRoute.empty')}
      >
        <select
          aria-label={t('conceptRoute.image')}
          value={
            routes.image?.providerId && routes.image.model
              ? `${routes.image.providerId}\n${routes.image.model}`
              : ''
          }
          onChange={(event) => lock('concept-art', event.target.value)}
        >
          <option value="">{t('conceptRoute.empty')}</option>
          {imageInstances.flatMap((item) =>
            item.models.map((model) => (
              <option key={`${item.id}-${model}`} value={`${item.id}\n${model}`}>
                {model}
              </option>
            )),
          )}
        </select>
      </SettingsRow>
      <SettingsRow title={t('conceptRoute.base')} description={base}>
        <select
          aria-label={t('conceptRoute.base')}
          value={protocol}
          onChange={(event) => setProtocol(event.target.value as 'openai-chat' | 'openai-images')}
        >
          <option value="openai-chat">openai-chat</option>
          <option value="openai-images">openai-images</option>
        </select>
      </SettingsRow>
      <SettingsRow title={t('conceptRoute.credentialRef')} description={t('conceptRoute.keyKept')}>
        <input
          aria-label={t('conceptRoute.credentialRef')}
          value={credentialRef}
          onChange={(event) => setCredentialRef(event.target.value)}
        />
      </SettingsRow>
      <SettingsRow title={t('conceptRoute.modelName')}>
        <input
          aria-label={t('conceptRoute.modelName')}
          value={modelName}
          onChange={(event) => setModelName(event.target.value)}
        />
      </SettingsRow>
      {needsKey ? (
        <SettingsRow title={t('conceptRoute.key')}>
          <input
            aria-label={t('conceptRoute.key')}
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
          />
        </SettingsRow>
      ) : null}
      <SettingsRow title={t('conceptRoute.save')} description={note}>
        <button type="button" onClick={save}>
          {t('conceptRoute.save')}
        </button>
      </SettingsRow>
    </SettingsSection>
  );
}
