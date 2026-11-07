import { BridgeCallError, type BridgeCall } from './bridge.js';

/** Client entry for the Host concept-art bridge. It does not draw a screen or store a key. */
export async function callConceptArt(
  call: BridgeCall,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const result = await call('conceptArt', payload);
  if (!result.ok) {
    throw new BridgeCallError(result.error.code, result.error.message, result.error.details);
  }
  return result.value;
}
