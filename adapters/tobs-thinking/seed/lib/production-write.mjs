const EXPLICIT = new Set(['开工', '按这个改', '可以动手']);

/** Mirrors the fix-bug-doctor checkpoint. Vague consent does not allow a production write. */
export function productionWriteDecision(confirmation) {
  const text = typeof confirmation === 'string' ? confirmation.trim() : '';
  const allowed = EXPLICIT.has(text);
  return { allowed, reason: allowed ? 'explicit-confirm' : 'checkpoint-stop' };
}
