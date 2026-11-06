import { WindowZoomSettings } from './window-zoom-settings.js';
import { WindowZoomSetup } from './window-zoom-setup.js';
import type { ZoomSurface } from './window-zoom-mount.js';
import type { ReactElement, ReactNode } from 'react';

import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';

import type { BridgeActions } from './actions.js';
import { AccountProfileSettings } from './account-profile-settings.js';
import type { ConnectSignInCode } from './connect-sign-in.js';
import { ApprovalReviewerModelSetting } from './approval-reviewer-model-setting.js';
import { VoiceProviderSettings } from './voice-settings.js';
import {
  AssignmentConcurrencyRow,
  BotHopLimitRow,
  ApprovalReviewSessionsVisibilitySetting,
  BotSessionsVisibilitySetting,
  DeveloperModeSetting,
  GroupAutoAcceptSetting,
  SendKeySetting,
  AutoCollapseMessagesSetting,
  DeliveryReceiptsSetting,
  StreamRepliesSetting,
} from './bot-mode-setting-rows.js';
import { ApprovalTemplateLibrarySettings } from './approval-template-library.js';
import { PromptPresetSettings } from './prompt-preset-settings.js';
import { buildLabel, clientBuild } from './build-id.js';
import { DataResetSettings } from './data-reset-settings.js';
import { StorageSettings } from './storage-settings.js';
import type { BotModePrefsFace } from './bot-mode-prefs.js';
import type { BridgeCall } from './bridge.js';
import { SettingsRow, SettingsRows, SettingsSection } from './ds/settings-row.js';
import { GitSettings } from './git-settings.js';
import { HumanNameSettings } from './human-name-settings.js';
import { CompactionThresholdSetting } from './compaction-threshold-setting.js';
import { IdleCompactionSetting } from './idle-compaction-setting.js';
import { MessagingDefaultsSettings } from './messaging-defaults-settings.js';
import { DefaultModelSettings, OnboardingSetting } from './onboarding-view.js';
import { PairedDevicesSettings } from './paired-devices.js';
import { ProfileBackupSettings } from './profile-backup.js';
import type { ReleaseNotesController } from './release-notes.js';
import { ReleaseSettings } from './release-notes-view.js';
import type { ClientStore } from './store.js';
import { TelemetrySettings } from './telemetry-settings.js';
import type { WindowCompanions } from './window-companions.js';
import { CompanionSettings } from './window-companions-view.js';

type SectionProps<Face extends object> = PropsLocale<'botharness'> & InjectFace<Face>;

function Rows({ children }: { children: ReactNode }): ReactElement {
  return <SettingsRows>{children}</SettingsRows>;
}

export type GeneralSectionFace = {
  zoomSurface: ZoomSurface;
  actions: BridgeActions;
  closeBotSettings(): void;
};
export type MessagingSectionFace = BotModePrefsFace & {
  call: BridgeCall;
  store: ClientStore;
  onSaved(): Promise<void>;
};

export function AccountSection(
  props: SectionProps<{ actions: BridgeActions; startSignIn(): Promise<ConnectSignInCode> }>,
): ReactElement {
  return (
    <Rows>
      <AccountProfileSettings actions={props.actions} startSignIn={props.startSignIn} t={props.t} />
    </Rows>
  );
}

export function GeneralSection(props: SectionProps<GeneralSectionFace>): ReactElement {
  return (
    <Rows>
      <WindowZoomSettings surface={props.zoomSurface} t={props.t} />
      <WindowZoomSetup surface={props.zoomSurface} t={props.t} />
      <OnboardingSetting
        actions={props.actions}
        closeBotSettings={props.closeBotSettings}
        t={props.t}
      />
    </Rows>
  );
}

export function ModelsSection(
  props: SectionProps<BotModePrefsFace & { actions: BridgeActions; call: BridgeCall }>,
): ReactElement {
  return (
    <Rows>
      <DefaultModelSettings actions={props.actions} t={props.t} />
      <IdleCompactionSetting call={props.call} t={props.t} />
      <CompactionThresholdSetting call={props.call} t={props.t} />
      <AssignmentConcurrencyRow {...props} />
      <BotSessionsVisibilitySetting {...props} />
      <ApprovalReviewSessionsVisibilitySetting {...props} />
    </Rows>
  );
}

export function AutoApprovalSection(
  props: SectionProps<{ actions: BridgeActions; call: BridgeCall; store: ClientStore }>,
): ReactElement {
  return (
    <Rows>
      <SettingsSection>
        <ApprovalReviewerModelSetting actions={props.actions} t={props.t} />
      </SettingsSection>
      <ApprovalTemplateLibrarySettings call={props.call} store={props.store} t={props.t} />
    </Rows>
  );
}

export function PromptsSection(props: SectionProps<{ actions: BridgeActions }>): ReactElement {
  return (
    <Rows>
      <PromptPresetSettings actions={props.actions} t={props.t} />
    </Rows>
  );
}

export function VoiceSection(props: SectionProps<{ actions: BridgeActions }>): ReactElement {
  return (
    <Rows>
      <VoiceProviderSettings actions={props.actions} t={props.t} />
    </Rows>
  );
}

export function MessagingSection(props: SectionProps<MessagingSectionFace>): ReactElement {
  return (
    <Rows>
      <HumanNameSettings
        call={props.call}
        store={props.store}
        onSaved={props.onSaved}
        t={props.t}
      />
      <SendKeySetting {...props} />
      <AutoCollapseMessagesSetting {...props} />
      <DeliveryReceiptsSetting {...props} />
      <StreamRepliesSetting {...props} />
      <SettingsSection>
        <GroupAutoAcceptSetting {...props} />
        <BotHopLimitRow {...props} />
      </SettingsSection>
      <MessagingDefaultsSettings call={props.call} t={props.t} />
    </Rows>
  );
}

export function CompanionsSection({
  companion,
  t,
}: SectionProps<{ companion: WindowCompanions }>): ReactElement {
  return (
    <Rows>
      <CompanionSettings companion={companion} t={t} />
    </Rows>
  );
}

export function DevicesSection({ t }: PropsLocale<'botharness'>): ReactElement {
  return (
    <Rows>
      <PairedDevicesSettings t={t} />
    </Rows>
  );
}

export function DataPrivacySection({ call, t }: SectionProps<{ call: BridgeCall }>): ReactElement {
  return (
    <Rows>
      <ProfileBackupSettings t={t} />
      <TelemetrySettings call={call} t={t} />
      <StorageSettings call={call} t={t} />
      <DataResetSettings call={call} t={t} />
    </Rows>
  );
}

export function AdvancedSection(
  props: SectionProps<BotModePrefsFace & { call: BridgeCall }>,
): ReactElement {
  return (
    <Rows>
      <DeveloperModeSetting {...props} />
      <GitSettings call={props.call} t={props.t} />
    </Rows>
  );
}

export function AboutSection({
  releaseNotes,
  t,
}: SectionProps<{ releaseNotes: ReleaseNotesController }>): ReactElement {
  return (
    <Rows>
      <ReleaseSettings releaseNotes={releaseNotes} t={t} />
      <SettingsRow
        title={t('build.row.title')}
        description={<span data-build-id>{buildLabel(clientBuild())}</span>}
      />
    </Rows>
  );
}

export { ConceptArtSection } from './concept-art-section.js';
