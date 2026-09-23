import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGameAccountProfileByUserId } from '@/lib/db/gameAccountProfile';
import { issueWorldTicket, worldTicketSecret } from '@/lib/auth/worldIdentity';
import { nexusWorld3DConfig } from '@repo/nexusworld3d.config';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const publicOrigin = new URL(process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || request.url).origin;
  if (origin && origin !== publicOrigin) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const roomName = body?.roomName;
    const allowed = [nexusWorld3DConfig.networking.colyseusRoomName,
      ...nexusWorld3DConfig.networking.colyseusLegacyRoomNames];
    if (['1', 'true', 'yes'].includes(process.env.NEXUS_ENABLE_STAGING_WORLD_ROOM?.trim().toLowerCase() || '')) {
      allowed.push(process.env.NEXUS_STAGING_WORLD_ROOM_NAME?.trim() || 'nexus-world-staging');
    }
    if (typeof roomName !== 'string' || !allowed.includes(roomName)) {
      return NextResponse.json({ error: 'Unknown world room' }, { status: 400 });
    }
    // A DB/auth-free demo must still be able to request a guest connection.
    const session = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET ? await auth() : null;
    if (!session?.user?.id) {
      return NextResponse.json({ ticket: null, worldId: nexusWorld3DConfig.worlds.default }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const profile = await getGameAccountProfileByUserId(session.user.id);
    const displayName = (profile?.display_name || session.user.name || 'Jugador').trim().slice(0, 64) || 'Jugador';
    const ticket = issueWorldTicket({
      subject: session.user.id, displayName, kind: 'account',
      worldId: nexusWorld3DConfig.worlds.default,
    }, roomName, worldTicketSecret());
    return NextResponse.json({ ticket, worldId: nexusWorld3DConfig.worlds.default }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Game authentication unavailable' }, { status: 503 });
  }
}
