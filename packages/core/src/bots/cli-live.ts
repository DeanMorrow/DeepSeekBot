import { runDeviceActivity } from './cli-live-activity.js';
import { HOST_LOOK_COMMANDS, runHostLook } from './cli-host-look.js';
import {
  PROFILE_BACKUP_COMMANDS,
  isProfileBackupCommand,
  runProfileBackupCommand,
} from './cli-profile-backup.js';
import { runPhoneNotifications } from './cli-phone-notifications.js';
import {
  WINDOW_ZOOM_COMMANDS,
  WINDOW_ZOOM_OPTIONS,
  runWindowZoomCommand,
} from './cli-window-zoom.js';
import { PHONE_ROUTE_COMMANDS, runPhoneRouteCommand } from './cli-phone-route.js';
import { DEVICES_COMMANDS, isDevicesCommand, runDevicesCommand } from './cli-devices.js';
import { DEVICE_CLIENT_COMMANDS, runDeviceClientCommand } from './cli-device-client.js';
import {
  DEVICE_NOTIFICATION_COMMANDS,
  DEVICE_NOTIFICATION_OPTIONS,
  runDeviceNotifications,
} from './cli-device-notifications.js';
import {
  BROWSER_NOTIFICATION_COMMANDS,
  runBrowserNotifications,
} from './cli-browser-notifications.js';
import { FEEDBACK_COMMANDS, runFeedbackCommand } from './cli-feedback.js';
import { DIAGNOSTIC_LOG_COMMANDS, runDiagnosticLogCommand } from './cli-diagnostic-logs.js';
import { APPEARANCE_COMMANDS, APPEARANCE_OPTIONS, runAppearanceCommand } from './cli-appearance.js';
import { prepareCloud, prepareCloudWork } from './cli-cloud.js';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { dmChannelId } from '../channels/channel.js';
import type { BotCreateCliIo } from './bot-create-cli.js';
import { CliLiveError } from './cli-live-error.js';
import { CONNECTION_COMMANDS, runConnectionCommand } from './cli-connection.js';
import { BOT_TOOL_COMMANDS, runBotToolCommand } from './cli-bot-tool.js';
import { CATALOG_COMMANDS, runCatalogCommand } from './cli-catalog.js';
import {
  TAKEOVER_COMMANDS,
  TAKEOVER_OPTIONS,
  isTakeoverCommand,
  runTakeoverCommand,
} from './cli-takeover.js';
import {
  channelOperationKey,
  CHANNEL_COMMANDS,
  CHANNEL_OPTIONS,
  isChannelCommand,
  runChannelCommand,
} from './cli-channels.js';
import {
  BROWSER_COMPUTER_COMMANDS,
  BROWSER_COMPUTER_OPTIONS,
  isBrowserComputerCommand,
  runBrowserComputerCommand,
  type BrowserComputerValues,
} from './cli-browser-computer.js';
import {
  IM_COMMANDS,
  IM_OPTIONS,
  prepareImAuthorization,
  runImAuthorization,
  type ImValues,
} from './cli-im-authorization.js';
import {
  MESSAGING_COMMANDS,
  MESSAGING_OPTIONS,
  prepareMessaging,
  runMessaging,
  type MessagingCommand,
  type MessagingValues,
} from './cli-messaging.js';
import {
  isModelsUsageCommand,
  MODELS_USAGE_COMMANDS,
  MODELS_USAGE_OPTIONS,
  runModelsUsage,
  type ModelsUsageValues,
} from './cli-models-usage.js';
import {
  HOST_ADMIN_COMMANDS,
  HOST_ADMIN_OPTIONS,
  isHostAdminCommand,
  runHostAdminCommand,
  type HostAdminValues,
} from './cli-host-admin.js';
import {
  INBOX_COMMANDS,
  INBOX_OPTIONS,
  isInboxCommand,
  runInboxCommand,
  type InboxValues,
} from './cli-inbox.js';
import {
  SCHEDULE_OPTIONS,
  isScheduleCommand,
  prepareScheduleCommand,
  runScheduleCommand,
  type ScheduleValues,
} from './cli-schedules.js';
import {
  PROFILE_COMMANDS,
  PROFILE_OPTIONS,
  isProfileCommand,
  runProfileCommand,
  type ProfileValues,
} from './cli-profile.js';
import {
  TODO_COMMANDS,
  TODO_OPTIONS,
  isTodoCommand,
  runTodoCommand,
  type TodoValues,
} from './cli-todos.js';
import {
  APPROVAL_TEMPLATE_COMMANDS,
  APPROVAL_TEMPLATE_OPTIONS,
  isApprovalTemplateCommand,
  runApprovalTemplateCommand,
  type ApprovalTemplateValues,
} from './cli-approval-templates.js';
import {
  PROMPT_PRESET_COMMANDS,
  PROMPT_PRESET_OPTIONS,
  isPromptPresetCommand,
  runPromptPresetCommand,
} from './cli-prompt-presets.js';
import {
  APPROVAL_REVIEWER_COMMANDS,
  APPROVAL_REVIEWER_OPTIONS,
  isApprovalReviewerCommand,
  runApprovalReviewerCommand,
  type ApprovalReviewerValues,
} from './cli-approval-reviewer.js';
import {
  VOICE_COMMANDS,
  VOICE_OPTIONS,
  isVoiceCommand,
  runVoiceCommand,
  type VoiceValues,
} from './cli-voice.js';
import {
  CALL_COMMANDS,
  CALL_OPTIONS,
  CALL_PATH,
  isCallCommand,
  runCallCommand,
} from './cli-call.js';
import {
  isStorageCommand,
  runStorageCommand,
  STORAGE_COMMANDS,
  STORAGE_OPTIONS,
  type StorageValues,
} from './cli-storage.js';
import {
  IDLE_COMPACTION_COMMANDS,
  isIdleCompactionCommand,
  runIdleCompactionCommand,
} from './cli-idle-compaction.js';
import {
  CONNECT_COMMANDS,
  CONNECT_OPTIONS,
  isConnectCommand,
  runConnectCommand,
} from './cli-connect.js';
import {
  isShareDraftCommand,
  runShareDraftCommand,
  SHARE_DRAFT_COMMANDS,
  SHARE_DRAFT_OPTIONS,
} from './cli-share-draft.js';
export { CliLiveError } from './cli-live-error.js';

export const LIVE_OPTIONS = {
  'new-home': { type: 'string' },

  'connection-id': { type: 'string' },
  fingerprint: { type: 'string' },
  'link-file': { type: 'string' },
  'remote-host-id': { type: 'string' },
  'host-id': { type: 'string' },
  ...DEVICE_NOTIFICATION_OPTIONS,
  'activity-stdin': { type: 'boolean' },
  ...WINDOW_ZOOM_OPTIONS,
  ...CONNECT_OPTIONS,
  ...APPEARANCE_OPTIONS,
  ...IM_OPTIONS,
  ...MESSAGING_OPTIONS,
  ...MODELS_USAGE_OPTIONS,
  ...CHANNEL_OPTIONS,
  ...HOST_ADMIN_OPTIONS,
  ...SHARE_DRAFT_OPTIONS,
  ...INBOX_OPTIONS,
  ...SCHEDULE_OPTIONS,
  ...TAKEOVER_OPTIONS,
  ...BROWSER_COMPUTER_OPTIONS,
  ...PROFILE_OPTIONS,
  ...TODO_OPTIONS,
  ...APPROVAL_TEMPLATE_OPTIONS,
  ...PROMPT_PRESET_OPTIONS,
  ...APPROVAL_REVIEWER_OPTIONS,
  ...VOICE_OPTIONS,
  ...CALL_OPTIONS,
  ...STORAGE_OPTIONS,
  host: { type: 'string' },
  'token-file': { type: 'string' },
  'image-source': { type: 'string' },
  'image-revision': { type: 'string' },
  'image-reference': { type: 'string' },
  timeout: { type: 'string' },
  'message-id': { type: 'string' },
  'reply-to': { type: 'string' },
  'failure-message-id': { type: 'string' },
  'auto-continue-for': { type: 'string' },
  recovery: { type: 'string' },
  outcome: { type: 'string' },
  'answer-stdin': { type: 'boolean' },
  'values-stdin': { type: 'boolean' },
  since: { type: 'string' },
  hours: { type: 'string' },
  offline: { type: 'boolean' },
  workspace: { type: 'string' },
  mode: { type: 'string' },
  scope: { type: 'string' },
  'acknowledge-risk': { type: 'boolean' },
  'patch-stdin': { type: 'boolean' },
  refresh: { type: 'boolean' },
  'previous-value': { type: 'string' },
  member: { type: 'string', multiple: true },
  app: { type: 'string' },
  bot: { type: 'string' },
  conversation: { type: 'string' },
  out: { type: 'string' },
  'args-stdin': { type: 'boolean' },
  'cause-event': { type: 'string' },
  session: { type: 'string' },
  turns: { type: 'string' },
  offset: { type: 'string' },
  kind: { type: 'string' },
  checkpoint: { type: 'string' },
  'expected-current': { type: 'string' },
  'restore-id': { type: 'string' },
  'repair-id': { type: 'string' },
  'default-location': { type: 'boolean' },
  tag: { type: 'string' },
  target: { type: 'string' },
} as const;

const DEVICE_COMMANDS = [
  'browser-open',
  'browser-frame',
  'browser-takeover',
  'browser-input',
  'browser-stop',
  'computer-start',
  'computer-status',
  'computer-stop',
  'browser-tools',
  'browser-tool',
  'computer-tools',
  'computer-tool',
  'computer-frame',
  'computer-takeover',
  'computer-input',
  'computer-video',
] as const;

const IM_CONTROL_COMMANDS = [
  'im-app-add',
  'im-app-status',
  'im-app-remove',
  'im-bind',
  'im-unbind',
  'im-status',
  'channel-connect',
  'channel-ingests',
] as const;

const TOKEN_IM_PLATFORMS = new Set(['discord', 'slack', 'qq', 'dingtalk', 'wecom', 'matrix']);

const CONTROL_COMMANDS = [
  'browser-access-set',
  'computer-access-set',
  'access',
  'access-set',
  'settings',
  'settings-set',
  'workspace-create',
  'group-create',
] as const;

export const LIVE_COMMANDS = [
  ...PROFILE_BACKUP_COMMANDS,
  ...BROWSER_NOTIFICATION_COMMANDS,
  ...CONNECTION_COMMANDS,
  ...HOST_LOOK_COMMANDS,
  ...DEVICE_NOTIFICATION_COMMANDS,
  {
    command: 'device-activity',
    description:
      'read capability or prepare/register/stop/status one device Lock Screen status (--device-file, --activity-stdin)',
  },
  ...FEEDBACK_COMMANDS,
  ...DIAGNOSTIC_LOG_COMMANDS,
  ...WINDOW_ZOOM_COMMANDS,
  ...PHONE_ROUTE_COMMANDS,
  ...DEVICES_COMMANDS,
  ...DEVICE_CLIENT_COMMANDS,
  ...CONNECT_COMMANDS,
  ...IM_COMMANDS,
  ...MESSAGING_COMMANDS,
  {
    command: 'cloud',
    description: 'manage an explicit cloud Agent connection (private JSON through stdin)',
  },
  {
    command: 'cloud-work',
    description: 'run the cloud_work Tool directly for a Bot using JSON from stdin',
  },
  ...MODELS_USAGE_COMMANDS,
  ...CHANNEL_COMMANDS,
  ...HOST_ADMIN_COMMANDS,
  ...SHARE_DRAFT_COMMANDS,
  ...APPEARANCE_COMMANDS,
  ...INBOX_COMMANDS,
  ...BROWSER_COMPUTER_COMMANDS,
  ...PROFILE_COMMANDS,
  ...BOT_TOOL_COMMANDS,
  ...CATALOG_COMMANDS,
  ...TAKEOVER_COMMANDS,
  ...TODO_COMMANDS,
  ...APPROVAL_TEMPLATE_COMMANDS,
  ...PROMPT_PRESET_COMMANDS,
  ...APPROVAL_REVIEWER_COMMANDS,
  ...VOICE_COMMANDS,
  ...CALL_COMMANDS,
  ...IDLE_COMPACTION_COMMANDS,
  ...STORAGE_COMMANDS,
  {
    command: 'send',
    description: 'send a Human DM and collect its committed Bot reply from a live Host',
  },
  {
    command: 'send-status',
    description: 'inspect a Human DM receipt and its exact Bot replies without resending',
  },
  {
    command: 'tool-approval-status',
    description: 'inspect a pending tool approval on a live Host',
  },
  {
    command: 'tool-approval-decide',
    description: 'allow once, always allow a secret_cli kind, or reject an owned tool approval',
  },
  {
    command: 'user-question-status',
    description: 'inspect a formal Human question',
  },
  {
    command: 'ask-secret-status',
    description: 'inspect a private input request without values',
  },
  {
    command: 'ask-secret-submit',
    description: 'submit confidential field JSON from stdin through the authenticated Owner',
  },
  {
    command: 'ask-secret-cancel',
    description: 'cancel a private input request as Owner',
  },
  {
    command: 'ask-secret-account-status',
    description: 'inspect current private account access',
  },
  {
    command: 'ask-secret-replace',
    description: 'open a blank replacement private input card',
  },
  {
    command: 'ask-secret-revoke',
    description: 'revoke local private account access as Owner',
  },
  {
    command: 'ask-secret-accounts',
    description: "list a Bot's private accounts as Owner, without values",
  },
  {
    command: 'user-question-answer',
    description: 'answer a formal Human question with JSON from stdin',
  },
  {
    command: 'release-info',
    description: 'read the running Host release lifecycle',
  },
  {
    command: 'workspace-options',
    description: 'list live Host workspaces for grants',
  },
  {
    command: 'folder-browse',
    description: 'list folder names on the Host computer, as the phone folder picker does',
  },
  {
    command: 'grant-create',
    description: 'authorize a Bot workspace through the live Host',
  },
  {
    command: 'browser-access-set',
    description: "turn a Bot's Browser Access on or off through the live Host",
  },
  {
    command: 'computer-access-set',
    description: "turn a Bot's Computer Access on or off through the live Host",
  },
  {
    command: 'access',
    description: "read a Bot's access preset (workspace write or full access)",
  },
  {
    command: 'access-set',
    description: "set a Bot's access preset; full access needs --acknowledge-risk",
  },
  { command: 'settings', description: 'read one live Host settings namespace' },
  {
    command: 'settings-set',
    description: 'patch one live Host settings namespace with JSON from stdin',
  },
  {
    command: 'workspace-create',
    description: 'register an absolute folder as a Host workspace',
  },
  {
    command: 'group-create',
    description: 'create a group Channel with optional initial Bots',
  },
  {
    command: 'im-app-add',
    description: 'add a token-based IM app (Discord, Slack, …) with credentials JSON from stdin',
  },
  {
    command: 'im-app-status',
    description: "read a token IM platform's apps and connection state",
  },
  {
    command: 'im-app-remove',
    description: 'remove a token IM app from the Provider',
  },
  { command: 'im-bind', description: 'bind a connected IM app to a Bot' },
  { command: 'im-unbind', description: 'unbind an IM app from a Bot' },
  {
    command: 'im-status',
    description: "read a Bot's IM apps and bindings with reception state",
  },
  {
    command: 'channel-connect',
    description: "connect an external group conversation to a Channel through a Bot's binding",
  },
  {
    command: 'channel-ingests',
    description: "list a Channel's connected external conversations",
  },
  {
    command: 'browser-open',
    description: "start a Bot's Browser and open its tab for viewing",
  },
  {
    command: 'browser-frame',
    description: "save the current picture of a Bot's Browser to a file",
  },
  {
    command: 'browser-takeover',
    description: "pause a Bot's Browser for Human input (--enabled) or hand it back (--disabled)",
  },
  {
    command: 'browser-input',
    description:
      "click, scroll, type or press a key in a paused Bot's Browser (input JSON from stdin)",
  },
  { command: 'browser-stop', description: "stop a Bot's Browser" },
  {
    command: 'computer-start',
    description: 'start the profile Computer with explicit authorization',
  },
  {
    command: 'computer-status',
    description: 'read the profile Computer target and state',
  },
  {
    command: 'computer-video',
    description:
      'Local Computer video status/open/signal/heartbeat/takeover/input/release/resume/close (JSON from stdin; open needs --out)',
  },
  {
    command: 'computer-frame',
    description: 'save the current picture of the profile Computer desktop to a file',
  },
  {
    command: 'computer-takeover',
    description:
      'pause Bot use of the profile Computer for Human input (--enabled) or hand it back (--disabled)',
  },
  {
    command: 'computer-input',
    description:
      'click, scroll, type or press a key on a paused profile Computer desktop (input JSON from stdin)',
  },
  { command: 'computer-stop', description: 'stop the profile Computer' },
  {
    command: 'browser-tools',
    description: 'list the Browser tools a Bot can call, with input schemas',
  },
  {
    command: 'browser-tool',
    description:
      'run one Browser tool directly for a Bot, without the model (args JSON from stdin)',
  },
  {
    command: 'memory-image',
    description:
      'export version-bound Memory image bytes (--path --image-source --image-revision [--image-reference] --out)',
  },
  {
    command: 'memory-file-target',
    description: 'resolve a memory file path for a Bot',
  },
  { command: 'memory-graph', description: "read a Bot's memory commit graph" },
  {
    command: 'memory-commit-diff',
    description: 'read the full diff of one memory commit',
  },
  { command: 'memory-changes', description: 'list uncommitted memory changes' },
  {
    command: 'memory-working-diff',
    description: 'read the diff of one uncommitted memory file',
  },
  {
    command: 'memory-checkpoints',
    description: 'list memory recovery checkpoints',
  },
  {
    command: 'memory-restore',
    description: 'restore memory to a recovery checkpoint',
  },
  {
    command: 'memory-restore-commit',
    description: 'restore memory to an earlier commit',
  },
  { command: 'memory-versions', description: 'list named memory versions' },
  {
    command: 'memory-version-name',
    description: 'name a memory commit as a version',
  },
  {
    command: 'memory-version-unname',
    description: 'remove a memory version name',
  },
  {
    command: 'memory-repair',
    description: 'repair a memory repository against its expected head',
  },
  {
    command: 'memory-move',
    description: "move a Bot's Memory repository to another folder, or back to the default",
  },
  {
    command: 'bot-trace',
    description: 'show which tools a Bot called in its recent turns, with outcomes',
  },
  {
    command: 'bot-turn-input',
    description: 'show the exact input messages a Bot received in its recent turns',
  },
  {
    command: 'computer-tools',
    description: 'list the Computer tools a Bot can call, with input schemas',
  },
  {
    command: 'computer-tool',
    description:
      'run one Computer tool directly for a Bot, without the model (args JSON from stdin)',
  },
] as const;

interface LiveValues
  extends
    ImValues,
    MessagingValues,
    ModelsUsageValues,
    HostAdminValues,
    InboxValues,
    ScheduleValues,
    BrowserComputerValues,
    ProfileValues,
    TodoValues,
    ApprovalTemplateValues,
    ApprovalReviewerValues,
    VoiceValues {
  'new-home'?: string;
  'client-id'?: string;
  'device-file'?: string;
  'link-file'?: string;
  'connection-id'?: string;
  fingerprint?: string;
  'remote-host-id'?: string;
  'host-id'?: string;
  'preferences-stdin'?: boolean;
  host?: string;
  'token-file'?: string;
  'image-source'?: string;
  'image-revision'?: string;
  'image-reference'?: string;
  timeout?: string;
  'message-id'?: string;
  'reply-to'?: string;
  'failure-message-id'?: string;
  'auto-continue-for'?: string;
  recovery?: string;
  body?: string;
  'body-stdin'?: boolean;
  'answer-stdin'?: boolean;
  'values-stdin'?: boolean;
  outcome?: string;
  since?: string;
  hours?: string;
  offline?: boolean;
  home?: string;
  workspace?: string;
  limit?: string;
  before?: string;
  enabled?: boolean;
  disabled?: boolean;
  mode?: string;
  scope?: string;
  'acknowledge-risk'?: boolean;
  'patch-stdin'?: boolean;
  refresh?: boolean;
  'previous-value'?: string;
  member?: string[];
  'operation-key'?: string;
  app?: string;
  bot?: string;
  conversation?: string;
  out?: string;
  'args-stdin'?: boolean;
  'cause-event'?: string;
  session?: string;
  turns?: string;
  offset?: string;
  kind?: string;
  checkpoint?: string;
  'expected-current'?: string;
  'restore-id'?: string;
  'repair-id'?: string;
  'memory-location'?: string;
  'default-location'?: boolean;
  tag?: string;
  path?: string;
  sha?: string;
  name?: string;
  'expected-head'?: string;
  'edit-id'?: string;
  target?: string;
  keep?: boolean;
  drop?: boolean;
  'rewrite-stdin'?: boolean;
}

function usage(message: string): never {
  throw new CliLiveError('usage', message);
}

function isLoopbackName(name: string): boolean {
  return name === 'localhost' || name === '[::1]' || /^127\.\d+\.\d+\.\d+$/u.test(name);
}

function hostUrl(value: string | undefined): URL {
  if (!value) usage('Live commands require --host or DEEPSEEKBOT_HOST.');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    usage('--host must be an HTTP(S) origin.');
  }
  const name = url.hostname;
  const loopback = isLoopbackName(name);
  const tailnet =
    name.endsWith('.ts.net') || /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+$/u.test(name);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    !(
      (loopback && (url.protocol === 'http:' || url.protocol === 'https:')) ||
      (tailnet && url.protocol === 'https:')
    )
  ) {
    usage(
      '--host must be a loopback origin or a tailnet HTTPS origin, without credentials, query or path.',
    );
  }
  return url;
}

function timeoutMs(value: string | undefined): number {
  const seconds = value === undefined ? 120 : Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 600)
    usage('--timeout must be between 0 and 600 seconds.');
  return Math.ceil(seconds * 1000);
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

export async function connectLiveHost(values: LiveValues, io: BotCreateCliIo, signal: AbortSignal) {
  const base = hostUrl(values.host ?? io.env['DEEPSEEKBOT_HOST']);
  let token = io.env['DEEPSEEKBOT_HOST_TOKEN'];
  if (values['token-file'] !== undefined) {
    try {
      token = readFileSync(values['token-file'], 'utf8').trim();
    } catch {
      throw new CliLiveError('host-unauthorized', 'Cannot read the Host token file.');
    }
  }
  if (!token?.trim())
    throw new CliLiveError(
      'host-unauthorized',
      'Set DEEPSEEKBOT_HOST_TOKEN or provide --token-file.',
    );
  const secret = token.trim();
  const login = new URL(base);
  login.searchParams.set('token', secret);
  let cookie = '';
  const refused = (status: number): CliLiveError =>
    status === 403 && !isLoopbackName(base.hostname)
      ? new CliLiveError(
          'host-untrusted',
          `The Host does not accept requests addressed to ${base.hostname}; restart it with --trusted-host ${base.hostname}.`,
        )
      : new CliLiveError(
          'host-unauthorized',
          'The Host refused this authority cookie; refresh its launch token.',
        );
  const request = async (url: URL, init: RequestInit = {}): Promise<Response> => {
    try {
      return await fetch(url, { ...init, signal, redirect: 'manual' });
    } catch {
      throw new CliLiveError(
        'host-unreachable',
        'The Host could not be reached before the command deadline.',
      );
    }
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await request(login, {
      headers: cookie ? { cookie } : {},
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length > 0) cookie = cookies.map((entry) => entry.split(';')[0]).join('; ');
    await response.body?.cancel();
    if (response.status === 401 || response.status === 403)
      throw new CliLiveError(
        'host-unauthorized',
        'Host login was refused; refresh its launch token.',
      );
    if (cookie) break;
  }
  if (!cookie)
    throw new CliLiveError('host-unauthorized', 'Host login did not issue an authority cookie.');
  const readResponse = async (response: Response): Promise<Record<string, unknown>> => {
    if (response.status === 401 || response.status === 403) {
      await response.body?.cancel();
      throw refused(response.status);
    }
    try {
      const body = await response.text();
      try {
        return record(JSON.parse(body));
      } catch {
        throw new CliLiveError('host-protocol-error', 'The Host did not return a JSON response.');
      }
    } catch (error) {
      if (error instanceof CliLiveError) throw error;
      throw new CliLiveError(
        'host-unreachable',
        'The Host response was interrupted before the command deadline.',
      );
    }
  };
  const scrub = (value: string) =>
    value.replaceAll(secret, '[redacted]').replaceAll(encodeURIComponent(secret), '[redacted]');
  const rpc = async <T>(method: string, args: Record<string, unknown>): Promise<T> => {
    const name = method.includes('/') ? method : `botharness/${method}`;
    const response = await request(new URL(`/api/${name}`, base), {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: randomUUID(),
        method: name,
        payload: method.startsWith('dsh-im/') ? args : { args },
      }),
    });
    const payload = await readResponse(response);
    if (!response.ok || payload['type'] !== 'server-response')
      throw new CliLiveError('host-protocol-error', 'The Host did not return a DSH RPC response.');
    const result = record(payload['result']);
    if (result['ok'] !== true) {
      const error = record(result['error']);
      const code = typeof error['code'] === 'string' ? error['code'] : 'host-protocol-error';
      const message =
        typeof error['message'] === 'string' ? error['message'] : 'The Host refused the command.';
      throw new CliLiveError(code, scrub(message));
    }
    return result['value'] as T;
  };
  const importBotZip = async <T>(
    archive: Uint8Array,
    metadata: {
      name?: string;
      displayName?: string;
      roles?: string[];
      description?: string;
    },
  ): Promise<T> => {
    const url = new URL('/api/botharness/bot-zip/import', base);
    for (const key of ['name', 'displayName', 'description'] as const) {
      if (metadata[key] !== undefined) url.searchParams.set(key, metadata[key]);
    }
    if (metadata.roles !== undefined) url.searchParams.set('roles', JSON.stringify(metadata.roles));
    const response = await request(url, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/zip' },
      body: new Uint8Array(archive),
    });
    const payload = await readResponse(response);
    if (!response.ok) {
      const error = record(payload['error']);
      const bot = record(payload['bot']);
      throw new CliLiveError(
        typeof error['code'] === 'string' ? scrub(error['code']) : 'host-protocol-error',
        scrub(
          typeof error['message'] === 'string'
            ? error['message']
            : 'The Host refused this Bot Zip import.',
        ),
        undefined,
        undefined,
        typeof bot['id'] === 'string' && typeof bot['name'] === 'string'
          ? {
              bot: { id: bot['id'], name: bot['name'] },
              steps: [{ name: 'create-bot', status: 'ok' }],
              outcome: 'created',
            }
          : undefined,
      );
    }
    return payload as T;
  };
  const refuse = (path: string, status: number, bytes: Uint8Array): never => {
    let detail: Record<string, unknown> = {};
    try {
      detail = record(JSON.parse(new TextDecoder().decode(bytes)));
    } catch {
      detail = { error: new TextDecoder().decode(bytes).slice(0, 200) };
    }
    const nested = record(detail['error']);
    const code =
      typeof detail['code'] === 'string'
        ? detail['code']
        : typeof nested['code'] === 'string'
          ? nested['code']
          : undefined;
    if ((status === 401 || status === 403) && code === undefined) throw refused(status);
    const packages = Array.isArray(detail['packages'])
      ? detail['packages'].filter((name): name is string => typeof name === 'string')
      : [];
    throw new CliLiveError(
      code === undefined ? 'host-refused' : scrub(code),
      scrub(
        (typeof detail['error'] === 'string' && detail['error'] !== ''
          ? detail['error']
          : typeof nested['message'] === 'string'
            ? nested['message']
            : `The Host refused ${path} with HTTP ${String(status)}.`) +
          (packages.length === 0 ? '' : ` Packages: ${packages.join(' ')}.`),
      ),
    );
  };
  const http = async (
    path: string,
    body?: Record<string, unknown>,
  ): Promise<{ response: Response; bytes: Uint8Array }> => {
    const response = await request(new URL(path, base), {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        cookie,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await response.arrayBuffer());
    } catch {
      throw new CliLiveError(
        'host-unreachable',
        'The Host response was interrupted before the command deadline.',
      );
    }
    if (!response.ok) refuse(path, response.status, bytes);
    return { response, bytes };
  };
  const stream = async (path: string, init: RequestInit = {}): Promise<Response> => {
    const response = await request(new URL(path, base), {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        cookie,
      },
    });
    if (!response.ok) refuse(path, response.status, new Uint8Array(await response.arrayBuffer()));
    return response;
  };
  const socket = (path: string): WebSocket => {
    const url = new URL(path, base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const Socket = WebSocket as unknown as new (
      url: string,
      init: { headers: Record<string, string> },
    ) => WebSocket;
    return new Socket(url.href, { headers: { cookie } });
  };
  return { rpc, importBotZip, http, stream, socket };
}

export async function runLiveCli(
  command: string,
  rest: string[],
  values: LiveValues,
  io: BotCreateCliIo,
): Promise<unknown> {
  if (isProfileBackupCommand(command))
    return runProfileBackupCommand(command, rest, values, io, () =>
      connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (CONNECTION_COMMANDS.some((entry) => entry.command === command))
    return runConnectionCommand(
      command,
      rest,
      {
        ...(values['client-id'] === undefined ? {} : { 'client-id': values['client-id'] }),
        ...(values['connection-id'] === undefined
          ? {}
          : { 'connection-id': values['connection-id'] }),
        ...(values['link-file'] === undefined ? {} : { 'link-file': values['link-file'] }),
        ...(values.fingerprint === undefined ? {} : { fingerprint: values.fingerprint }),
        ...(values.confirm === undefined ? {} : { confirm: values.confirm }),
      },
      io,
      () => connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (command === 'host-look') {
    const duration = timeoutMs(values.timeout);
    const expiresAt = Date.now() + duration;
    const signal = AbortSignal.timeout(duration);
    return runHostLook(rest, values, io, () => connectLiveHost(values, io, signal), expiresAt);
  }
  if (command === 'device-activity') return runDeviceActivity(rest, values, io);
  if (command === 'device-notifications') return runDeviceNotifications(rest, values, io);
  if (command === 'phone-notifications') return runPhoneNotifications(rest, values, io);
  if (BROWSER_NOTIFICATION_COMMANDS.some((entry) => entry.command === command))
    return runBrowserNotifications(command, rest, values, io, () =>
      connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (DIAGNOSTIC_LOG_COMMANDS.some((entry) => entry.command === command))
    return runDiagnosticLogCommand(command, values, io, () =>
      connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (FEEDBACK_COMMANDS.some((entry) => entry.command === command))
    return runFeedbackCommand(command, values, io, () =>
      connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (IM_COMMANDS.some((entry) => entry.command === command)) {
    const operation = await prepareImAuthorization(command, rest, values, io);
    const signal = AbortSignal.timeout(timeoutMs(values.timeout));
    try {
      return await runImAuthorization(
        operation,
        (await connectLiveHost(values, io, signal)).rpc,
        signal,
      );
    } catch (error) {
      if (
        error instanceof CliLiveError &&
        !error.authorization &&
        command !== 'im-apps' &&
        command !== 'im-authorize'
      )
        throw new CliLiveError(error.code, error.message, undefined, {
          attemptId: operation.target,
        });
      throw error;
    }
  }
  if (MEMORY_COMMANDS.has(command)) return runMemoryCommand(command, rest, values, io);
  if (isModelsUsageCommand(command))
    return runModelsUsage(command, rest, values, io, async () => {
      const signal = AbortSignal.timeout(timeoutMs(values.timeout));
      return (await connectLiveHost(values, io, signal)).rpc;
    });
  if (isConnectCommand(command))
    return runConnectCommand(command, rest, values, io, () =>
      connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (WINDOW_ZOOM_COMMANDS.some((entry) => entry.command === command))
    return runWindowZoomCommand(command, rest, values, () =>
      connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (PHONE_ROUTE_COMMANDS.some((entry) => entry.command === command))
    return runPhoneRouteCommand(command, rest, values, () =>
      connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (isDevicesCommand(command))
    return runDevicesCommand(command, rest, values, () =>
      connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (DEVICE_CLIENT_COMMANDS.some((entry) => entry.command === command))
    return runDeviceClientCommand(command, rest, values);
  if (command === 'cloud-work') {
    const input = await prepareCloudWork(rest, values, io);
    const host = await connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout)));
    return host.rpc('cloudWork', input);
  }
  if (command === 'cloud') {
    const input = await prepareCloud(rest, values, io);
    const host = await connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout)));
    return host.rpc('cloudConnections', { input });
  }
  if (MESSAGING_COMMANDS.some((entry) => entry.command === command)) {
    const operation = await prepareMessaging(command as MessagingCommand, rest, values, io);
    const signal = AbortSignal.timeout(timeoutMs(values.timeout));
    return runMessaging(operation, (await connectLiveHost(values, io, signal)).rpc);
  }
  if (isInboxCommand(command))
    return runInboxCommand(command, rest, values, () =>
      connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (isScheduleCommand(command)) {
    const prepared = prepareScheduleCommand(command, rest, values);
    const signal = AbortSignal.timeout(timeoutMs(values.timeout));
    return runScheduleCommand(prepared, (await connectLiveHost(values, io, signal)).rpc);
  }
  if (isBrowserComputerCommand(command))
    return runBrowserComputerCommand(command, rest, values, io, () =>
      connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (APPEARANCE_COMMANDS.some((entry) => entry.command === command))
    return runAppearanceCommand(command, rest, values, io, () =>
      connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (isProfileCommand(command))
    return runProfileCommand(command, rest, values, io, async () => {
      const signal = AbortSignal.timeout(timeoutMs(values.timeout));
      return (await connectLiveHost(values, io, signal)).rpc;
    });
  if (isVoiceCommand(command))
    return runVoiceCommand(command, rest, values, io, async () => {
      const signal = AbortSignal.timeout(timeoutMs(values.timeout));
      return (await connectLiveHost(values, io, signal)).rpc;
    });
  if (isCallCommand(command))
    return runCallCommand(command, rest, values, async () => {
      const signal = AbortSignal.timeout(
        values.timeout === undefined && command === 'call-simulate'
          ? 600_000
          : timeoutMs(values.timeout),
      );
      const { http } = await connectLiveHost(values, io, signal);
      return async (body) => {
        const { bytes } = await http(CALL_PATH, body);
        try {
          return record(JSON.parse(new TextDecoder().decode(bytes)));
        } catch {
          throw new CliLiveError('host-protocol-error', 'The Host returned no JSON for the call.');
        }
      };
    });
  if (isApprovalReviewerCommand(command))
    return runApprovalReviewerCommand(command, rest, values, async () => {
      const signal = AbortSignal.timeout(timeoutMs(values.timeout));
      return (await connectLiveHost(values, io, signal)).rpc;
    });
  if (isStorageCommand(command))
    return runStorageCommand(command, rest, values as StorageValues, io, async () => {
      const signal = AbortSignal.timeout(timeoutMs(values.timeout));
      return (await connectLiveHost(values, io, signal)).rpc;
    });
  if (isIdleCompactionCommand(command))
    return runIdleCompactionCommand(command, rest, async () => {
      const signal = AbortSignal.timeout(timeoutMs(values.timeout));
      return (await connectLiveHost(values, io, signal)).rpc;
    });
  if (isPromptPresetCommand(command))
    return runPromptPresetCommand(command, rest, values, io, async () => {
      const signal = AbortSignal.timeout(timeoutMs(values.timeout));
      return (await connectLiveHost(values, io, signal)).rpc;
    });
  if (isApprovalTemplateCommand(command))
    return runApprovalTemplateCommand(command, rest, values, io, async () => {
      const signal = AbortSignal.timeout(timeoutMs(values.timeout));
      return (await connectLiveHost(values, io, signal)).rpc;
    });
  if (isTodoCommand(command))
    return runTodoCommand(command, rest, values, io, () =>
      connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (isTakeoverCommand(command))
    return runTakeoverCommand(command, rest, values, () =>
      connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (CATALOG_COMMANDS.some((entry) => entry.command === command))
    return runCatalogCommand(command as (typeof CATALOG_COMMANDS)[number]['command'], rest, () =>
      connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (BOT_TOOL_COMMANDS.some((entry) => entry.command === command))
    return runBotToolCommand(
      command as (typeof BOT_TOOL_COMMANDS)[number]['command'],
      rest,
      values,
      io,
      () => connectLiveHost(values, io, AbortSignal.timeout(timeoutMs(values.timeout))),
    );
  if (command === 'bot-trace' || command === 'bot-turn-input') {
    if (rest.length !== 1 || !rest[0]?.trim()) usage(`${command} needs exactly one bot id.`);
    const turns = values.turns === undefined ? undefined : Number(values.turns);
    if (turns !== undefined && (!Number.isInteger(turns) || turns < 1 || turns > 20))
      usage('--turns must be an integer from 1 to 20.');
    const signal = AbortSignal.timeout(timeoutMs(values.timeout));
    if (command === 'bot-turn-input' && values.session === 'direct')
      usage('bot-turn-input reads a model Session, not direct tool calls.');
    return (await connectLiveHost(values, io, signal)).rpc(
      command === 'bot-trace' ? 'botToolTrace' : 'botTurnInput',
      {
        slug: rest[0].trim(),
        ...(values.session === undefined ? {} : { sessionId: values.session }),
        ...(turns === undefined ? {} : { turns }),
      },
    );
  }
  if (isChannelCommand(command))
    return runChannelCommand(command, rest, values, io, connectLiveHost);
  if (isShareDraftCommand(command))
    return runShareDraftCommand(command, rest, values, io, async () => {
      const signal = AbortSignal.timeout(timeoutMs(values.timeout));
      return (await connectLiveHost(values, io, signal)).rpc;
    });
  if (isHostAdminCommand(command)) {
    const signal = AbortSignal.timeout(timeoutMs(values.timeout));
    return runHostAdminCommand(command, rest, values, io, {
      connect: async () => (await connectLiveHost(values, io, signal)).rpc,
      signal,
    });
  }
  if (DEVICE_COMMANDS.some((entry) => entry === command))
    return runDeviceCommand(command as (typeof DEVICE_COMMANDS)[number], rest, values, io);
  if (command === 'folder-browse') {
    if (rest.length > 1) usage('folder-browse takes at most one folder path.');
    const signal = AbortSignal.timeout(timeoutMs(values.timeout));
    const path = rest[0]?.trim();
    const offset = values.offset === undefined ? undefined : Number(values.offset);
    if (offset !== undefined && (!Number.isInteger(offset) || offset < 0 || offset > 1_000_000))
      usage('--offset must be an integer from 0 to 1000000.');
    return (await connectLiveHost(values, io, signal)).rpc('folderBrowse', {
      ...(path ? { path } : {}),
      ...(offset === undefined ? {} : { offset }),
    });
  }
  if (command === 'grants') {
    if (rest.length !== 1 || !rest[0]?.trim()) usage('grants needs exactly one bot id.');
    const signal = AbortSignal.timeout(timeoutMs(values.timeout));
    return (await connectLiveHost(values, io, signal)).rpc('grants', {
      slug: rest[0].trim(),
    });
  }
  if (IM_CONTROL_COMMANDS.some((entry) => entry === command))
    return runImControlCommand(command as (typeof IM_CONTROL_COMMANDS)[number], rest, values, io);
  if (CONTROL_COMMANDS.some((entry) => entry === command))
    return runControlCommand(command as (typeof CONTROL_COMMANDS)[number], rest, values, io);
  const noTarget = command === 'release-info' || command === 'workspace-options';
  if (rest.length !== (noTarget ? 0 : 1))
    usage(
      `${command} ${noTarget ? 'takes no positional arguments' : 'needs exactly one target id'}.`,
    );
  const target = rest[0]?.trim() ?? '';
  if (!noTarget && !target) usage(`${command} requires a nonempty target id.`);
  const messageId = values['message-id'];
  if (
    [
      'send-status',
      'tool-approval-status',
      'tool-approval-decide',
      'user-question-status',
      'user-question-answer',
      'ask-secret-status',
      'ask-secret-submit',
      'ask-secret-cancel',
      'ask-secret-account-status',
      'ask-secret-replace',
      'ask-secret-revoke',
    ].includes(command) &&
    !messageId?.trim()
  )
    usage('--message-id is required.');
  let body: string | undefined;
  let answer: unknown;
  let confidential: Record<string, string> | undefined;
  if (command === 'ask-secret-submit') {
    if (!values['values-stdin']) usage('ask-secret-submit requires --values-stdin.');
    try {
      const input = await (io.readStdin?.() ?? Promise.resolve(''));
      if (input.length > 140_000) throw new Error('Private input exceeds the limit');
      const parsed: unknown = JSON.parse(input);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        throw new Error('Invalid private input');
      const entries = Object.entries(parsed);
      if (
        entries.length < 1 ||
        entries.length > 8 ||
        entries.some(
          ([key, value]) =>
            !/^[a-z][a-z0-9_]{0,47}$/.test(key) ||
            typeof value !== 'string' ||
            value.length > 16_384,
        )
      )
        throw new Error('Invalid private fields');
      confidential = Object.fromEntries(entries);
    } catch {
      usage('Private input stdin must be a JSON object with 1–8 declared string fields.');
    }
  }
  if (command === 'send') {
    if ((values.body !== undefined) === (values['body-stdin'] === true))
      usage('send requires exactly one of --body or --body-stdin.');
    body = values['body-stdin'] ? await (io.readStdin?.() ?? Promise.resolve('')) : values.body;
    if (!body?.trim()) usage('send requires a nonempty message.');
    if (
      messageId !== undefined &&
      !/^human-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(messageId)
    )
      usage('--message-id must be human- followed by a UUID.');
    if (values['reply-to'] !== undefined && !values['reply-to'].trim())
      usage('--reply-to needs a message id.');
  }
  if (
    command === 'tool-approval-decide' &&
    values.outcome !== 'allowed-once' &&
    values.outcome !== 'allowed-always-tool' &&
    values.outcome !== 'allowed-always-kind' &&
    values.outcome !== 'rejected'
  )
    usage('--outcome must be allowed-once, allowed-always-tool, allowed-always-kind or rejected.');
  if (command === 'user-question-answer') {
    if (!values['answer-stdin']) usage('user-question-answer requires --answer-stdin.');
    try {
      answer = JSON.parse(await (io.readStdin?.() ?? Promise.resolve('')));
    } catch {
      usage('Question answers must be valid JSON on stdin.');
    }
    const answers = record(answer)['answers'];
    if (
      !Array.isArray(answers) ||
      !answers.every((entry) => {
        const item = record(entry);
        return (
          typeof item['id'] === 'string' &&
          Array.isArray(item['selected']) &&
          item['selected'].every((choice) => typeof choice === 'string') &&
          (item['custom'] === undefined || typeof item['custom'] === 'string')
        );
      })
    )
      usage(
        'Answer JSON requires answers with id, selected string array and optional custom text.',
      );
  }
  if (command === 'grant-create' && !values.workspace?.trim()) usage('--workspace is required.');
  const duration = timeoutMs(values.timeout);
  const deadline = Date.now() + duration;
  const signal = AbortSignal.timeout(duration);
  const { rpc } = await connectLiveHost(values, io, signal);
  if (command.startsWith('ask-secret-')) {
    let refusal: unknown;
    try {
      if (command === 'ask-secret-accounts') {
        const result = await rpc<{
          status?: unknown;
          accounts?: unknown;
          replaceable?: unknown;
        }>('privateAccounts', {
          slug: target,
        });
        if (
          (result.status !== 'ready' && result.status !== 'unavailable') ||
          !Array.isArray(result.accounts)
        )
          throw new Error('Invalid private accounts');
        const optional = (value: unknown) => (typeof value === 'string' ? value : undefined);
        const accounts = result.accounts.map((entry: unknown) => {
          const row = record(entry);
          const status = row['status'];
          if (
            typeof row['account'] !== 'string' ||
            (status !== 'configured' && status !== 'replacing' && status !== 'unavailable') ||
            !Array.isArray(row['fields'])
          )
            throw new Error('Invalid private account');
          return {
            account: row['account'],
            purpose: optional(row['purpose']),
            fields: row['fields'].map((value: unknown) => {
              const field = record(value);
              if (
                typeof field['id'] !== 'string' ||
                typeof field['label'] !== 'string' ||
                typeof field['required'] !== 'boolean'
              )
                throw new Error('Invalid private field');
              return {
                id: field['id'],
                label: field['label'],
                required: field['required'],
              };
            }),
            status,
            configuredAt: optional(row['configuredAt']),
            channelId: optional(row['channelId']),
            messageId: optional(row['messageId']),
            replacementMessageId: optional(row['replacementMessageId']),
          };
        });
        return {
          status: result.status,
          accounts,
          ...(typeof result.replaceable === 'boolean' ? { replaceable: result.replaceable } : {}),
        };
      }
      if (command === 'ask-secret-status' || command === 'ask-secret-account-status') {
        const result = await rpc<{ status?: unknown }>(
          command === 'ask-secret-status' ? 'privateInputStatus' : 'privateAccountStatus',
          {
            channelId: target,
            messageId,
          },
        );
        const statuses =
          command === 'ask-secret-status'
            ? ['pending', 'configured', 'cancelled', 'expired']
            : ['configured', 'revoked', 'superseded', 'unavailable'];
        if (typeof result.status !== 'string' || !statuses.includes(result.status))
          throw new Error('Invalid private status');
        return { status: result.status };
      }
      if (command === 'ask-secret-replace') {
        const result = await rpc<{ messageId?: unknown }>('privateInputReplace', {
          channelId: target,
          messageId,
        });
        if (
          typeof result.messageId !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(result.messageId)
        )
          throw new Error('Invalid replacement card');
        return { messageId: result.messageId };
      }
      if (command === 'ask-secret-revoke') {
        const result = await rpc<{
          accepted?: unknown;
          stopped?: unknown;
          completed?: unknown;
          uncertain?: unknown;
        }>('privateAccountRevoke', { channelId: target, messageId });
        if (
          result.accepted !== true ||
          [result.stopped, result.completed, result.uncertain].some(
            (count) => typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0,
          )
        )
          throw new Error('Invalid revocation result');
        return {
          accepted: true,
          stopped: result.stopped,
          completed: result.completed,
          uncertain: result.uncertain,
        };
      }
      const method = command === 'ask-secret-submit' ? 'privateInputSubmit' : 'privateInputCancel';
      const result = await rpc<{ accepted?: unknown; reason?: unknown }>(method, {
        channelId: target,
        messageId,
        ...(confidential === undefined ? {} : { values: confidential }),
      });
      if (result.accepted !== true) refusal = result.reason;
      else return { accepted: true };
    } catch {
      refusal = undefined;
    } finally {
      if (confidential !== undefined)
        for (const key of Object.keys(confidential)) delete confidential[key];
    }
    throw new CliLiveError(
      'private-input-not-accepted',
      'Private input operation was not accepted' +
        (typeof refusal === 'string' && /^[a-z-]{1,40}$/.test(refusal)
          ? ` (reason: ${refusal})`
          : '') +
        '. Check Owner authentication and request status before retrying.',
    );
  }
  if (command === 'send') {
    const channelId = dmChannelId(target);
    const receipt = {
      channelId,
      messageId: messageId ?? `human-${randomUUID()}`,
    };
    let sent: unknown;
    try {
      const bot = await rpc<{ bot: { displayName?: string } }>('get', {
        slug: target,
      });
      await rpc('channelDm', {
        slug: target,
        displayName: bot.bot.displayName,
      });
      sent = await rpc('channelSend', {
        channelId,
        body,
        messageId: receipt.messageId,
        ...(values['reply-to'] === undefined ? {} : { replyTo: values['reply-to'].trim() }),
      });
      while (Date.now() < deadline) {
        const status = await rpc<{ state: string; replies: unknown[] }>(
          'channelSendStatus',
          receipt,
        );
        if (!status || !Array.isArray(status.replies) || typeof status.state !== 'string')
          throw new CliLiveError(
            'host-protocol-error',
            'The Host returned an invalid send status.',
          );
        if (status.state === 'handled' && status.replies.length > 0)
          return { receipt, ...record(sent), ...status };
        if (status.state === 'handled' || status.state === 'needs-repair')
          throw new CliLiveError(
            status.state === 'handled' ? 'reply-not-produced' : 'send-needs-repair',
            'The Host has no committed Bot reply for this request.',
            receipt,
          );
        await delay(Math.min(250, Math.max(1, deadline - Date.now())), undefined, { signal });
      }
    } catch (error) {
      if (error instanceof CliLiveError) throw new CliLiveError(error.code, error.message, receipt);
      throw new CliLiveError(
        'reply-timeout',
        'The command deadline elapsed; inspect send-status with this receipt before retrying.',
        receipt,
      );
    }
    throw new CliLiveError(
      'reply-timeout',
      'No reply before the deadline; inspect send-status with this receipt before retrying.',
      receipt,
    );
  }
  if (command === 'send-status')
    return rpc('channelSendStatus', {
      channelId: dmChannelId(target),
      messageId,
    });
  if (command === 'channel-messages') {
    const limit = values.limit === undefined ? undefined : Number(values.limit);
    if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 200))
      usage('--limit must be 1–200.');
    return rpc('channelMessages', {
      channelId: target,
      ...(limit === undefined ? {} : { limit }),
      ...(values.before === undefined ? {} : { before: values.before }),
    });
  }
  if (command === 'tool-approval-status')
    return rpc('toolApprovalStatus', { channelId: target, messageId });
  if (command === 'tool-approval-decide')
    return rpc('toolApprovalDecide', {
      channelId: target,
      messageId,
      outcome: values.outcome,
    });
  if (command === 'user-question-status')
    return rpc('userQuestionStatus', { channelId: target, messageId });
  if (command === 'user-question-answer')
    return rpc('userQuestionAnswer', { channelId: target, messageId, answer });
  if (command === 'workspace-options') return rpc('workspaceOptions', {});
  if (command === 'grant-create')
    return rpc('grantCreate', { slug: target, workspaceId: values.workspace });
  return rpc('releaseInfo', values.since === undefined ? {} : { since: values.since });
}

async function runControlCommand(
  command: (typeof CONTROL_COMMANDS)[number],
  rest: string[],
  values: LiveValues,
  io: BotCreateCliIo,
): Promise<unknown> {
  if (rest.length !== 1 || !rest[0]?.trim()) usage(`${command} needs exactly one target.`);
  const target = rest[0].trim();
  let patch: Record<string, unknown> | undefined;
  let reviewed: ReviewedSettings | undefined;
  if (command === 'browser-access-set' || command === 'computer-access-set') {
    if (values.enabled === values.disabled)
      usage(`${command} needs exactly one of --enabled or --disabled.`);
  }
  if (command === 'access-set') {
    if (values.mode !== 'workspace-write' && values.mode !== 'danger-full-access')
      usage('--mode must be workspace-write or danger-full-access.');
    if (values.scope !== undefined && values.scope !== 'chat' && values.scope !== 'assignments')
      usage('--scope must be chat or assignments.');
    if (values.mode === 'danger-full-access' && values['acknowledge-risk'] !== true)
      usage(
        'Full access lets the Bot run any command and use the Browser and Computer without asking. Pass --acknowledge-risk to confirm.',
      );
  }
  if (command === 'settings-set') {
    if (values['patch-stdin'] !== true) usage('settings-set requires --patch-stdin.');
    try {
      const parsed: unknown = JSON.parse(await (io.readStdin?.() ?? Promise.resolve('')));
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        throw new Error('not an object');
      patch = parsed as Record<string, unknown>;
    } catch {
      usage('--patch-stdin must be a JSON object of settings fields.');
    }
    reviewed = parseReviewedSettings(values, patch);
  }
  if (command === 'workspace-create' && !target.startsWith('/') && !/^[A-Za-z]:[\\/]/u.test(target))
    usage('workspace-create needs an absolute folder path.');
  const members = (values.member ?? []).map((member) => member.trim()).filter(Boolean);
  const operationKey =
    command === 'group-create' && values['operation-key'] !== undefined
      ? channelOperationKey(values['operation-key'])
      : undefined;
  const signal = AbortSignal.timeout(timeoutMs(values.timeout));
  const { rpc } = await connectLiveHost(values, io, signal);
  if (command === 'browser-access-set' || command === 'computer-access-set')
    return rpc(command === 'browser-access-set' ? 'browserAccessSet' : 'computerAccessSet', {
      slug: target,
      enabled: values.enabled === true,
    });
  if (command === 'access') return rpc('assignmentAccessGet', { slug: target });
  if (command === 'access-set')
    return rpc('assignmentAccessSet', {
      slug: target,
      mode: values.mode,
      ...(values.scope === undefined ? {} : { scope: values.scope }),
      ...(values.mode === 'danger-full-access' ? { acknowledgeRisk: true } : {}),
    });
  if (command === 'workspace-create') return rpc('workspace/create', { request: { path: target } });
  if (command === 'group-create')
    return rpc('channelCreate', {
      name: target,
      members,
      ...(operationKey === undefined ? {} : { operationKey }),
    });
  const described = record(await rpc('settings/describe', {}));
  const namespaces = Array.isArray(described['namespaces']) ? described['namespaces'] : [];
  const found = namespaces.map(record).find((entry) => entry['ns'] === target);
  if (found === undefined)
    throw new CliLiveError('unknown-settings', `The Host has no settings namespace ${target}.`);
  if (command === 'settings')
    return { ns: target, revision: found['revision'], value: found['value'] };
  if (reviewed !== undefined) {
    const current = record(found['value']);
    if (
      found['revision'] !== reviewed.expectedRevision ||
      !Object.entries(reviewed.previousValue).every(([key, value]) =>
        isDeepStrictEqual(current[key], value),
      )
    )
      throw new CliLiveError(
        'stale-setting',
        'The reviewed settings changed; read and review the current value before retrying.',
      );
  }
  const updated = record(
    await rpc('settings/update', {
      ns: target,
      patch,
      expectedRevision: reviewed?.expectedRevision ?? found['revision'],
    }),
  );
  return { ns: target, revision: updated['revision'], value: updated['value'] };
}

function appSummary(value: unknown) {
  const app = record(value);
  const bot = record(app['bot']);
  const error = app['error'] === null || app['error'] === undefined ? null : record(app['error']);
  return {
    id: app['botId'],
    name: bot['name'] ?? app['name'],
    state: app['state'],
    connected: app['connected'] === true,
    error: error === null ? null : { code: error['code'], message: error['message'] },
    ...(app['stats'] === undefined ? {} : { stats: app['stats'] }),
  };
}

function connectionSummary(platform: string, value: unknown) {
  const status = record(value);
  return {
    platform,
    state: status['state'],
    apps: (Array.isArray(status['bots']) ? status['bots'] : []).map(appSummary),
  };
}

async function runImControlCommand(
  command: (typeof IM_CONTROL_COMMANDS)[number],
  rest: string[],
  values: LiveValues,
  io: BotCreateCliIo,
): Promise<unknown> {
  if (rest.length !== 1 || !rest[0]?.trim()) usage(`${command} needs exactly one target.`);
  const target = rest[0].trim();
  const app = values.app?.trim() ?? '';
  const platformCommand =
    command === 'im-app-add' || command === 'im-app-status' || command === 'im-app-remove';
  if (platformCommand && !TOKEN_IM_PLATFORMS.has(target))
    usage(
      `${command} supports ${[...TOKEN_IM_PLATFORMS].join(', ')}; use im-authorize for feishu or weixin.`,
    );
  let credentials: Record<string, unknown> | undefined;
  if (command === 'im-app-add') {
    if (values['credentials-stdin'] !== true) usage('im-app-add requires --credentials-stdin.');
    try {
      const parsed: unknown = JSON.parse(await (io.readStdin?.() ?? Promise.resolve('')));
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        throw new Error('not an object');
      credentials = parsed as Record<string, unknown>;
    } catch {
      usage('--credentials-stdin must be a JSON object, for example {"token":"…"}.');
    }
  }
  if ((command === 'im-app-remove' || command === 'im-bind' || command === 'im-unbind') && !app)
    usage(`${command} requires --app <app-id>.`);
  if (command === 'channel-connect' && (!values.bot?.trim() || !values.conversation?.trim()))
    usage('channel-connect requires --bot <bot-id> and --conversation <external-id>.');
  const signal = AbortSignal.timeout(timeoutMs(values.timeout));
  const { rpc } = await connectLiveHost(values, io, signal);
  const provider = (method: string, payload: Record<string, unknown>) =>
    rpc(`dsh-im/${target}`, { method, payload });
  if (command === 'im-app-add')
    return connectionSummary(target, await provider('bot.bind-credentials', credentials!));
  if (command === 'im-app-status')
    return connectionSummary(target, await provider('connection.status', {}));
  if (command === 'im-app-remove')
    return connectionSummary(target, await provider('bot.delete', { botId: app, confirm: true }));
  if (command === 'channel-ingests') return rpc('channelIngests', { channelId: target });
  if (command === 'im-bind') {
    const apps = record(await rpc('messagingApps', {}));
    const found = (Array.isArray(apps['apps']) ? apps['apps'] : [])
      .map(record)
      .find((entry) => entry['ref'] === app);
    if (found === undefined)
      throw new CliLiveError('unknown-app', `The Host has no connected IM app ${app}.`);
    return rpc('messagingIdentity', {
      slug: target,
      input: {
        kind: 'bind',
        providerId: found['providerId'],
        accountRef: found['ref'],
        fingerprint: found['fingerprint'],
      },
    });
  }
  const slug = command === 'channel-connect' ? values.bot!.trim() : target;
  const snapshot = record(await rpc('messagingSnapshot', { slug }));
  const identities = (Array.isArray(snapshot['identities']) ? snapshot['identities'] : []).map(
    record,
  );
  if (command === 'im-status')
    return {
      apps: (Array.isArray(snapshot['accounts']) ? snapshot['accounts'] : [])
        .map(record)
        .map((entry) => ({
          ref: entry['ref'],
          platform: entry['platform'],
          name: entry['name'],
          connected: entry['connected'] === true,
        })),
      bindings: identities.map((entry) => ({
        id: entry['id'],
        app: entry['accountRef'],
        platform: entry['platform'],
        name: entry['name'],
        enabled: entry['enabled'],
        availability: entry['availability'],
        reception: entry['reception'],
        conversations: entry['grantCount'],
      })),
    };
  const binding = identities.find((entry) =>
    command === 'channel-connect'
      ? app === '' || entry['accountRef'] === app
      : entry['accountRef'] === app,
  );
  if (binding === undefined)
    throw new CliLiveError(
      'unknown-binding',
      command === 'channel-connect'
        ? `Bot ${slug} has no IM app binding to connect through.`
        : `Bot ${slug} is not bound to IM app ${app}.`,
    );
  if (command === 'im-unbind')
    return rpc('messagingIdentity', {
      slug,
      input: {
        kind: 'unbind',
        id: binding['id'],
        expectedRevision: binding['revision'],
      },
    });
  return rpc('channelIngest', {
    channelId: target,
    input: {
      kind: 'add',
      bindingId: binding['id'],
      conversation: { kind: 'group', id: values.conversation!.trim() },
    },
  });
}

async function runDeviceCommand(
  command: (typeof DEVICE_COMMANDS)[number],
  rest: string[],
  values: LiveValues,
  io: BotCreateCliIo,
): Promise<unknown> {
  const direct = command === 'browser-tool' || command === 'computer-tool';
  const video = command === 'computer-video';
  const computer = (command.startsWith('computer-') && !direct) || command === 'browser-tools';
  const positionals = direct ? 2 : video ? 1 : computer ? 0 : 1;
  if (rest.length !== positionals || rest.some((value) => !value.trim()))
    usage(
      direct
        ? `${command} needs a bot id and a tool name.`
        : video
          ? 'computer-video needs exactly one operation.'
          : computer
            ? `${command} takes no positional arguments.`
            : `${command} needs exactly one bot id.`,
    );
  let toolArgs: Record<string, unknown> = {};
  const input =
    command === 'browser-input' ||
    command === 'computer-input' ||
    (video && !['status', 'open'].includes(rest[0]!));
  if (input && values['args-stdin'] !== true)
    usage(
      video
        ? `computer-video ${rest[0]} needs --args-stdin with its binding/runtime command JSON.`
        : `${command} needs --args-stdin with a JSON input such as {"kind":"click","x":10,"y":20}.`,
    );
  if ((direct || input) && values['args-stdin'] === true) {
    try {
      const raw = await (io.readStdin?.() ?? Promise.resolve(''));
      if (video && Buffer.byteLength(raw) > 128 * 1024) throw new Error('input too large');
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        throw new Error('not an object');
      toolArgs = parsed as Record<string, unknown>;
    } catch {
      usage('--args-stdin must be a JSON object of tool arguments.');
    }
  }
  if (
    direct &&
    values.out !== undefined &&
    !values.out.startsWith('/') &&
    !/^[A-Za-z]:[\\/]/u.test(values.out)
  )
    usage('--out must be an absolute file path.');
  const slug = rest[0]?.trim() ?? '';
  if (video) {
    if (
      ![
        'status',
        'open',
        'signal',
        'heartbeat',
        'takeover',
        'input',
        'release',
        'resume',
        'close',
      ].includes(slug)
    )
      usage(
        'computer-video needs status, open, signal, heartbeat, takeover, input, release, resume or close.',
      );
    if (toolArgs['force'] === true && values.confirm !== true)
      usage('Forced takeover requires --confirm.');
    if (
      slug === 'open' &&
      (values.out === undefined ||
        (!values.out.startsWith('/') && !/^[A-Za-z]:[\\/]/u.test(values.out)))
    )
      usage('computer-video open requires --out <absolute-file> for private signaling data.');
  }
  if (command === 'browser-frame' || command === 'computer-frame') {
    const out = values.out ?? '';
    if (!out.startsWith('/') && !/^[A-Za-z]:[\\/]/u.test(out))
      usage(`${command} requires --out <absolute-file>.`);
  }
  if (
    (command === 'browser-takeover' || command === 'computer-takeover') &&
    values.enabled === values.disabled
  )
    usage(`${command} needs exactly one of --enabled or --disabled.`);
  if (
    command === 'computer-start' &&
    values.target !== undefined &&
    values.target !== 'local' &&
    values.target !== 'container'
  )
    usage('--target must be local or container.');
  const signal = AbortSignal.timeout(timeoutMs(values.timeout));
  const { http } = await connectLiveHost(values, io, signal);
  const json = async (path: string, body?: Record<string, unknown>) => {
    const { bytes } = await http(path, body);
    try {
      return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    } catch {
      throw new CliLiveError('host-protocol-error', `The Host returned no JSON for ${path}.`);
    }
  };
  let saved = false;
  const savedImages = (items: unknown[]) =>
    items.map((value) => {
      const item = record(value);
      if (item['type'] !== 'image' || typeof item['data'] !== 'string') return item;
      const bytes = Buffer.from(item['data'], 'base64');
      if (values.out !== undefined && !saved) {
        writeFileSync(values.out, bytes, { mode: 0o600 });
        saved = true;
        return {
          type: 'image',
          mimeType: item['mimeType'],
          path: values.out,
          bytes: bytes.byteLength,
        };
      }
      return {
        type: 'image',
        mimeType: item['mimeType'],
        bytes: bytes.byteLength,
      };
    });
  if (command === 'browser-tools') return json('/api/browser/tools');
  if (video) {
    const result = record(
      await json('/api/computer/video', {
        ...toolArgs,
        kind: slug,
        ...(toolArgs['force'] === true ? { confirm: values.confirm === true } : {}),
      }),
    );
    const state = record(result['state']);
    const { offer, ...safeState } = state;
    if (offer !== undefined && values.out !== undefined) {
      try {
        writeFileSync(values.out, JSON.stringify(offer), {
          mode: 0o600,
          flag: 'wx',
        });
      } catch {
        if (state['binding'] !== undefined)
          await json('/api/computer/video', {
            kind: 'close',
            binding: state['binding'],
          }).catch(() => undefined);
        throw new CliLiveError(
          'signaling-file-failed',
          'Private signaling could not be saved. Use a new writable absolute file.',
        );
      }
    }
    return {
      ...result,
      ...(result['state'] === undefined ? {} : { state: safeState }),
      ...(offer === undefined ? {} : { signalingFile: values.out }),
    };
  }
  if (command === 'computer-tools') return json('/api/computer/tools');
  if (command === 'computer-tool') {
    const result = record(
      await json('/api/computer/tool', {
        slug,
        tool: rest[1]!.trim(),
        args: toolArgs,
      }),
    );
    const inner = record(result['result']);
    return Array.isArray(inner['content'])
      ? {
          ...result,
          result: { ...inner, content: savedImages(inner['content']) },
        }
      : result;
  }
  if (command === 'browser-tool') {
    const result = record(
      await json('/api/browser/tool', {
        slug,
        tool: rest[1]!.trim(),
        args: toolArgs,
      }),
    );
    return {
      ...result,
      content: savedImages(Array.isArray(result['content']) ? result['content'] : []),
    };
  }
  if (command === 'browser-open') return json('/api/browser/open', { slug });
  if (command === 'browser-takeover')
    return json('/api/browser/takeover', {
      slug,
      active: values.enabled === true,
    });
  if (command === 'browser-input') return json('/api/browser/input', { ...toolArgs, slug });
  if (command === 'browser-stop') return json('/api/browser/stop', { slug });
  if (command === 'computer-start')
    return json('/api/computer/start', {
      authorize: true,
      ...(values.target === undefined ? {} : { target: values.target }),
    });
  if (command === 'computer-status') return json('/api/computer/status');
  if (command === 'computer-stop') return json('/api/computer/stop', { authorize: true });
  if (command === 'computer-takeover')
    return json('/api/computer/takeover', { active: values.enabled === true });
  if (command === 'computer-input') return json('/api/computer/input', toolArgs);
  if (command === 'computer-frame') {
    const { response, bytes: answer } = await http('/api/computer/frame');
    if (response.status === 204)
      throw new CliLiveError('no-frame', 'The Computer has not produced a frame yet; try again.');
    let desktop: Record<string, unknown>;
    try {
      desktop = record(JSON.parse(new TextDecoder().decode(answer)));
    } catch {
      throw new CliLiveError(
        'host-protocol-error',
        'The Host returned no JSON for /api/computer/frame.',
      );
    }
    if (typeof desktop['data'] !== 'string')
      throw new CliLiveError('host-protocol-error', 'The Host returned no Computer frame.');
    const bytes = Buffer.from(desktop['data'], 'base64');
    writeFileSync(values.out!, bytes, { mode: 0o600 });
    return {
      path: values.out,
      bytes: bytes.byteLength,
      mimeType: desktop['mimeType'],
      width: desktop['width'],
      height: desktop['height'],
      seq: desktop['seq'],
      target: desktop['target'],
    };
  }
  const frame = record(await json(`/api/browser/frame?slug=${encodeURIComponent(slug)}`));
  if (typeof frame['data'] !== 'string')
    throw new CliLiveError('host-protocol-error', 'The Host returned no Browser frame.');
  const bytes = Buffer.from(frame['data'], 'base64');
  writeFileSync(values.out!, bytes, { mode: 0o600 });
  return {
    path: values.out,
    bytes: bytes.byteLength,
    mimeType: frame['mimeType'],
    ...(frame['viewport'] === undefined ? {} : { viewport: frame['viewport'] }),
  };
}

const MEMORY_COMMANDS = new Set([
  'memory-snapshot',
  'memory-file',
  'memory-image',
  'memory-history',
  'memory-diff',
  'memory-save',
  'memory-file-target',
  'memory-graph',
  'memory-commit-diff',
  'memory-changes',
  'memory-working-diff',
  'memory-checkpoints',
  'memory-restore',
  'memory-restore-commit',
  'memory-versions',
  'memory-version-name',
  'memory-version-unname',
  'memory-repair',
  'memory-move',
]);

const SHA = /^[0-9a-f]{40}$/u;

async function runMemoryCommand(
  command: string,
  rest: string[],
  values: LiveValues,
  io: BotCreateCliIo,
): Promise<unknown> {
  if (rest.length !== 1 || !rest[0]?.trim()) usage(`${command} needs exactly one bot id.`);
  const slug = rest[0].trim();
  const channelId = dmChannelId(slug);
  const required = (name: keyof LiveValues, flag: string): string => {
    const value = values[name];
    if (typeof value !== 'string' || !value.trim()) usage(`${command} requires --${flag}.`);
    return value.trim();
  };
  const sha = (): string => {
    const value = required('sha', 'sha <commit>');
    if (!SHA.test(value)) usage('--sha must be a 40-character lowercase commit sha.');
    return value;
  };
  const expectedHead = (): string => {
    const value = required('expected-head', 'expected-head <commit>');
    if (!SHA.test(value)) usage('--expected-head must be a 40-character lowercase commit sha.');
    return value;
  };
  let method: string;
  let args: Record<string, unknown>;
  switch (command) {
    case 'memory-snapshot':
      [method, args] = ['memorySnapshot', { channelId }];
      break;
    case 'memory-image': {
      const path = required('path', 'path <file>');
      const source = required('image-source', 'image-source worktree|index|<commit>');
      const revision = required('image-revision', 'image-revision <sha256>');
      const out = required('out', 'out <absolute file>');
      if (!isAbsolute(out)) usage('--out must be an absolute path.');
      const host = await connectLiveHost(
        values,
        io,
        AbortSignal.timeout(timeoutMs(values.timeout)),
      );
      const reference = values['image-reference'];
      const { bytes, response } = await host.http(
        '/api/botharness/memory/image?' +
          new URLSearchParams({
            slug,
            path,
            source,
            revision,
            ...(reference === undefined ? {} : { reference }),
          }),
      );
      const mime = response.headers.get('content-type');
      if (
        !['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'].includes(
          mime ?? '',
        )
      )
        throw new CliLiveError('host-protocol-error', 'Expected a supported Memory image');
      writeFileSync(out, bytes, { flag: 'wx' });
      return {
        path,
        source,
        revision,
        ...(reference === undefined ? {} : { reference }),
        mime,
        bytes: bytes.length,
        out,
      };
    }
    case 'memory-file':
      [method, args] = ['memoryFile', { channelId, path: required('path', 'path <file>') }];
      break;
    case 'memory-history':
      [method, args] = ['memoryHistory', { channelId }];
      break;
    case 'memory-diff':
      [method, args] = ['memoryDiff', { channelId, sha: sha() }];
      break;
    case 'memory-file-target':
      [method, args] = ['memoryFileTarget', { slug, path: required('path', 'path <file>') }];
      break;
    case 'memory-graph': {
      const offset = values.offset === undefined ? 0 : Number(values.offset);
      if (!Number.isInteger(offset) || offset < 0 || offset > 10_000)
        usage('--offset must be an integer from 0 to 10000.');
      [method, args] = [
        'memoryGitGraph',
        {
          channelId,
          offset,
          ...(values.path === undefined ? {} : { path: required('path', 'path <file>') }),
        },
      ];
      break;
    }
    case 'memory-commit-diff':
      [method, args] = ['memoryGitCommitDiff', { channelId, sha: sha() }];
      break;
    case 'memory-changes':
      [method, args] = ['memoryWorkingChanges', { channelId }];
      break;
    case 'memory-working-diff': {
      const kind = required('kind', 'kind staged|unstaged|untracked|current');
      if (!['staged', 'unstaged', 'untracked', 'current'].includes(kind))
        usage('--kind must be staged, unstaged, untracked or current.');
      [method, args] = [
        'memoryWorkingDiff',
        { channelId, path: required('path', 'path <file>'), kind },
      ];
      break;
    }
    case 'memory-checkpoints':
      [method, args] = ['memoryRecoveryHistory', { channelId }];
      break;
    case 'memory-restore':
      [method, args] = [
        'memoryRestore',
        {
          channelId,
          checkpointId: required('checkpoint', 'checkpoint <id>'),
          expectedCurrentId: required('expected-current', 'expected-current <id>'),
        },
      ];
      break;
    case 'memory-restore-commit':
      [method, args] = [
        'memoryRestoreCommit',
        {
          channelId,
          sha: sha(),
          expectedHead: expectedHead(),
          restoreId: values['restore-id']?.trim() || randomUUID(),
          ...(values.name === undefined ? {} : { name: values.name }),
        },
      ];
      break;
    case 'memory-versions':
      [method, args] = ['memoryVersions', { channelId }];
      break;
    case 'memory-version-name':
      [method, args] = [
        'memoryNameVersion',
        { channelId, sha: sha(), name: required('name', 'name <version>') },
      ];
      break;
    case 'memory-version-unname':
      [method, args] = [
        'memoryRemoveVersionName',
        { channelId, tag: required('tag', 'tag <version>') },
      ];
      break;
    case 'memory-move': {
      const location = values['memory-location']?.trim();
      if ((location === undefined || location === '') === (values['default-location'] !== true))
        usage(
          'memory-move needs --memory-location <absolute-dir> or --default-location, not both.',
        );
      if (location !== undefined && location !== '' && !isAbsolute(location))
        usage('--memory-location must be an absolute folder path.');
      [method, args] = [
        'memoryMove',
        {
          slug,
          location: location === undefined || location === '' ? null : location,
        },
      ];
      break;
    }
    case 'memory-repair':
      [method, args] = [
        'memoryRepair',
        {
          channelId,
          expectedHead: expectedHead(),
          repairId: values['repair-id']?.trim() || randomUUID(),
        },
      ];
      break;
    default: {
      const path = required('path', 'path <file>');
      const head = expectedHead();
      let body = values.body;
      if (values['body-stdin'] === true) body = await (io.readStdin?.() ?? Promise.resolve(''));
      if (body === undefined) usage('memory-save needs --body or --body-stdin.');
      [method, args] = [
        'memorySave',
        {
          channelId,
          path,
          body,
          expectedHead: head,
          editId: values['edit-id']?.trim() || randomUUID(),
        },
      ];
    }
  }
  const signal = AbortSignal.timeout(timeoutMs(values.timeout));
  return (await connectLiveHost(values, io, signal)).rpc(method, args);
}

export interface ReviewedSettings {
  expectedRevision: number;
  previousValue: Record<string, unknown>;
}

export function parseReviewedSettings(
  values: { 'expected-revision'?: string; 'previous-value'?: string },
  patch: Record<string, unknown>,
): ReviewedSettings | undefined {
  const revision = values['expected-revision'];
  const previous = values['previous-value'];
  if (revision === undefined && previous === undefined) return undefined;
  if (revision === undefined || previous === undefined)
    usage('--expected-revision and --previous-value must be supplied together.');
  if (!/^(0|[1-9][0-9]*)$/u.test(revision) || !Number.isSafeInteger(Number(revision)))
    usage('--expected-revision must be a nonnegative safe integer.');
  let previousValue: unknown;
  try {
    previousValue = JSON.parse(previous);
  } catch {
    usage('--previous-value must be a JSON object of the reviewed settings fields.');
  }
  if (typeof previousValue !== 'object' || previousValue === null || Array.isArray(previousValue))
    usage('--previous-value must be a JSON object of the reviewed settings fields.');
  const keys = Object.keys(patch).sort();
  if (keys.length === 0 || !isDeepStrictEqual(keys, Object.keys(previousValue).sort()))
    usage('--previous-value must contain exactly the fields in the nonempty patch.');
  return {
    expectedRevision: Number(revision),
    previousValue: previousValue as Record<string, unknown>,
  };
}
