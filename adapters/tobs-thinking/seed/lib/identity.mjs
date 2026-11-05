const hostBrand = Symbol('tobs-thinking-host-session');

/** Only an in-process host adapter may call this. A CLI flag cannot mint it. */
export function bindHostSession(botSlug) {
  if (typeof botSlug !== 'string' || botSlug.trim() === '' || botSlug.includes('\0')) {
    return { ok: false, reason: 'unauthenticated' };
  }
  const slug = botSlug.trim();
  return { ok: true, identity: { [hostBrand]: true, botSlug: slug, sessionBotSlug: slug } };
}

export function hostBot(identity) {
  if (!identity || identity[hostBrand] !== true) return { ok: false, reason: 'unauthenticated' };
  if (typeof identity.botSlug !== 'string' || identity.botSlug !== identity.sessionBotSlug) {
    return { ok: false, reason: 'actor-mismatch' };
  }
  return { ok: true, botSlug: identity.botSlug };
}
