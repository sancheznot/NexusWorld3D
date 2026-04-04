/** ES: Sala listada en la home pública “tipo juego”. EN: Room row on public game-style home. */
export type PublicPortalRoom = {
  id: string;
  colyseusRoomName: string;
  displayName: string;
  maxPlayers: number;
  playersOnline: number | null;
  status: "online" | "unknown";
  /** ES: Si true, hace falta sesión (Discord/email) para entrar. EN: Requires NextAuth session to join. */
  requiresAuth: boolean;
};
