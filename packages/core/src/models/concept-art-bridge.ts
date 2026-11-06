import type { ConceptArtRequest, createConceptArtConsumer } from './concept-art-consumer.js';
import { SharedRouteError, type createSharedModelRoute } from './shared-route.js';

type Consumer = ReturnType<typeof createConceptArtConsumer>;
type Route = ReturnType<typeof createSharedModelRoute>;

type BridgeResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };

function invalid(message: string): BridgeResult<never> {
  return { ok: false, error: { code: 'invalid-input', message } };
}

function failed(error: unknown): BridgeResult<never> {
  if (error instanceof SharedRouteError) {
    return { ok: false, error: { code: error.reason, message: error.message } };
  }
  return { ok: false, error: { code: 'unavailable', message: 'Concept art is not available.' } };
}

function requestBody(value: unknown): ConceptArtRequest | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const body = value as Record<string, unknown>;
  const style = body['style'];
  if (typeof body['raw_requirement'] !== 'string') return undefined;
  if (typeof style !== 'object' || style === null) return undefined;
  const state = (style as { state?: unknown }).state;
  if (state !== 'none' && state !== 'selected' && state !== 'disabled') return undefined;
  if (typeof body['sessionId'] !== 'string' && body['sessionId'] !== null) return undefined;
  if (typeof body['operation_id'] !== 'string' || typeof body['route_idempotency_key'] !== 'string')
    return undefined;
  if (typeof body['input_fingerprint'] !== 'string' || typeof body['submit_allowed'] !== 'boolean')
    return undefined;
  if (typeof body['context_version'] !== 'string' && typeof body['context_version'] !== 'number')
    return undefined;
  return body as unknown as ConceptArtRequest;
}

export function createConceptArtBridge(input: { conceptArt?: Consumer; sharedRoute?: Route }) {
  return {
    async conceptArt(payload: unknown): Promise<BridgeResult<unknown>> {
      if (input.conceptArt === undefined || input.sharedRoute === undefined) {
        return {
          ok: false,
          error: { code: 'unavailable', message: 'Concept art is not on this Host.' },
        };
      }
      const body =
        typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
      const action = body['action'];
      try {
        if (action === 'status') {
          const route = await input.sharedRoute.describeConsumer('concept-art', 'image');
          return {
            ok: true,
            value: {
              ...route,
              limitsConfigured: input.conceptArt.limitsConfigured(),
              mediaDelivery: input.conceptArt.limitsConfigured() ? 'parsed-not-verified' : 'closed',
              referenceImages: 'blocked-prompt-only',
            },
          };
        }
        if (action === 'request') {
          const request = requestBody(body['request']);
          if (request === undefined) return invalid('Concept art request is incomplete.');
          return { ok: true, value: await input.conceptArt.request(request) };
        }
        if (action === 'resume' || action === 'cancel') {
          if (typeof body['sessionId'] !== 'string' || typeof body['idempotencyKey'] !== 'string')
            return invalid('Session and operation key are required.');
          const task =
            action === 'resume'
              ? await input.conceptArt.resume(body['sessionId'], body['idempotencyKey'])
              : input.conceptArt.cancel(body['sessionId'], body['idempotencyKey']);
          return { ok: true, value: task };
        }
        if (action === 'accept') {
          if (
            typeof body['sessionId'] !== 'string' ||
            typeof body['idempotencyKey'] !== 'string' ||
            (typeof body['contextVersion'] !== 'string' &&
              typeof body['contextVersion'] !== 'number')
          )
            return invalid('Session, operation key and context version are required.');
          const project = input.conceptArt.projectIdFor(body['sessionId']);
          if ('status' in project)
            return { ok: true, value: { ...project, optimization: 'not-performed' } };
          const task = input.sharedRoute.read(project.projectId, body['idempotencyKey']);
          return {
            ok: true,
            value: input.conceptArt.accept(task, body['contextVersion'] as string | number),
          };
        }
        return invalid('Concept art action is not status, request, resume, cancel or accept.');
      } catch (error) {
        return failed(error);
      }
    },
  };
}
