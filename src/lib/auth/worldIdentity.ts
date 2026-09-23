import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export interface WorldIdentity {
  readonly subject: string;
  readonly displayName: string;
  readonly worldId: string;
  readonly kind: 'account' | 'guest';
}

const TTL_SECONDS = 60;

export function worldTicketSecret(): string {
  const secret = process.env.NEXUS_GAME_AUTH_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('Game authentication requires a shared secret of at least 32 characters');
  return secret;
}

export function identityStorageKey(identity: WorldIdentity): string {
  return `${identity.kind}:` + createHash('sha256')
    .update(JSON.stringify([identity.subject, identity.worldId])).digest('hex');
}

export function issueWorldTicket(identity: WorldIdentity, room: string, secret: string, now = Date.now()): string {
  if (identity.kind !== 'account') throw new Error('Only authenticated accounts receive tickets');
  const body = Buffer.from(JSON.stringify({
    ...identity, aud: room, purpose: 'nexus-world-join-v1',
    iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + TTL_SECONDS,
  })).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

export function verifyWorldTicket(ticket: unknown, room: string, secret: string, now = Date.now()): WorldIdentity {
  if (typeof ticket !== 'string' || ticket.length > 4096) throw new Error('Invalid game ticket');
  const parts = ticket.split('.');
  if (parts.length !== 2) throw new Error('Invalid game ticket');
  const [body, signature] = parts;
  const expected = createHmac('sha256', secret).update(body).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid game ticket');
  const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  const seconds = Math.floor(now / 1000);
  if (!claims || claims.purpose !== 'nexus-world-join-v1' || claims.aud !== room ||
      claims.kind !== 'account' || typeof claims.subject !== 'string' || !claims.subject || claims.subject.length > 255 ||
      typeof claims.displayName !== 'string' || !claims.displayName || claims.displayName.length > 64 ||
      typeof claims.worldId !== 'string' || !claims.worldId || claims.worldId.length > 64 ||
      !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) ||
      claims.iat > seconds || claims.exp <= seconds || claims.exp - claims.iat !== TTL_SECONDS) {
    throw new Error('Expired or invalid game ticket');
  }
  return Object.freeze({ subject: claims.subject, displayName: claims.displayName, worldId: claims.worldId, kind: 'account' });
}

export function createGuestIdentity(worldId: string): WorldIdentity {
  const subject = randomUUID();
  return Object.freeze({ subject, displayName: `Invitado_${subject.slice(0, 8)}`, worldId, kind: 'guest' });
}

/** A supplied invalid ticket is rejected, never silently downgraded to a guest. */
export function authenticateWorldJoin(options: Record<string, unknown>, room: string, defaultWorldId: string): WorldIdentity {
  if (options.gameTicket !== undefined && options.gameTicket !== null) {
    return verifyWorldTicket(options.gameTicket, room, worldTicketSecret());
  }
  return createGuestIdentity(defaultWorldId);
}
