import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getGameAccountProfileByUserId,
  upsertGameAccountProfile,
} from "@/lib/db/gameAccountProfile";
import { isMariaDbConfigured } from "@/lib/db/mariadb";

function fallbackName(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  const n = name?.trim();
  if (n) return n;
  const e = email?.trim();
  if (e) return e.split("@")[0] || "Jugador";
  return "Jugador";
}

function validateDisplayName(s: string): string | null {
  const t = s.trim();
  if (t.length < 2 || t.length > 48) return null;
  if (/[\x00-\x1f\x7f]/.test(t)) return null;
  return t;
}

function validateBio(s: unknown): string | null {
  if (s == null || s === "") return "";
  const t = String(s).trim();
  if (t.length > 500) return null;
  return t;
}

/**
 * ES: GET perfil de juego (sesión + fila DB si existe).
 * EN: GET game profile (session + DB row if any).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await getGameAccountProfileByUserId(session.user.id);
  const displayName = row?.display_name ?? fallbackName(session.user.name, session.user.email);

  return NextResponse.json({
    userId: session.user.id,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
    sessionName: session.user.name ?? null,
    displayName,
    bio: row?.bio ?? "",
    prefs: row?.prefs_json ?? null,
    hasSavedProfile: row != null,
    mariaConfigured: isMariaDbConfigured(),
  });
}

/**
 * ES: PATCH guardar nombre en juego y bio (MariaDB).
 * EN: PATCH persist in-game name and bio (MariaDB).
 */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMariaDbConfigured()) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const existing = await getGameAccountProfileByUserId(session.user.id);
  let finalDisplay =
    existing?.display_name ??
    fallbackName(session.user.name, session.user.email);

  if (
    b.displayName !== undefined &&
    b.displayName !== null &&
    String(b.displayName).trim() !== ""
  ) {
    const v = validateDisplayName(String(b.displayName));
    if (!v) {
      return NextResponse.json(
        { error: "displayName must be 2–48 characters" },
        { status: 400 }
      );
    }
    finalDisplay = v;
  }

  let bioUpdate: string | null | undefined;
  if ("bio" in b) {
    const v = validateBio(b.bio);
    if (v === null) {
      return NextResponse.json({ error: "bio too long (max 500)" }, { status: 400 });
    }
    bioUpdate = v;
  }

  const prefsIn = b.prefs;
  const mergedBio =
    bioUpdate !== undefined ? bioUpdate : existing?.bio ?? "";
  const mergedPrefs =
    prefsIn !== undefined ? prefsIn : existing?.prefs_json ?? null;

  try {
    await upsertGameAccountProfile(session.user.id, {
      displayName: finalDisplay,
      bio: mergedBio,
      prefs: mergedPrefs,
    });
  } catch (e) {
    console.error("[me/profile PATCH]", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    displayName: finalDisplay,
    bio: mergedBio,
  });
}
