import { Client, Room } from "colyseus";
import { EconomyMessages, InventoryMessages } from "@nexusworld3d/protocol";
import { nexusWorld3DConfig } from "@repo/nexusworld3d.config";
import { pushGameMonitorLog } from "@server/metrics/gameMonitor";

type ClientMeta = { displayName: string; userId: string | null };

type LobbyChatEntry = {
  id: string;
  sessionId: string;
  displayName: string;
  text: string;
  ts: number;
};

/**
 * ES: Sala ligera — chat global del lobby y lista de presencia (sin estado 3D).
 * EN: Lightweight room — global lobby chat and presence (no 3D state).
 */
export class NexusLobbyRoom extends Room {
  private meta = new Map<string, ClientMeta>();
  private messages: LobbyChatEntry[] = [];
  private seq = 0;
  private lastChat = new Map<string, number>();

  onCreate() {
    this.maxClients = 400;
    this.autoDispose = false;
    pushGameMonitorLog("info", "room", "NexusLobbyRoom created", {
      roomId: this.roomId,
      roomName: this.roomName,
    });

    /** ES: La UI de juego monta con el lobby; sin esto Colyseus puede expulsar (4002) en prod. */
    const noop = () => {};
    this.onMessage("time:request", noop);
    this.onMessage(EconomyMessages.Request, noop);
    this.onMessage(InventoryMessages.Request, noop);
    this.onMessage(InventoryMessages.Update, noop);
    this.onMessage("jobs:list", noop);
    this.onMessage("shop:list", noop);

    this.onMessage(
      "lobby:chat",
      (client: Client, message: { text?: string }) => {
        const text = String(message?.text ?? "").trim().slice(0, 280);
        if (text.length < 1) return;
        const now = Date.now();
        const last = this.lastChat.get(client.sessionId) ?? 0;
        if (now - last < 400) return;
        this.lastChat.set(client.sessionId, now);

        const m = this.meta.get(client.sessionId);
        const displayName = m?.displayName ?? "Anónimo";
        this.seq += 1;
        const entry: LobbyChatEntry = {
          id: `L${this.seq}`,
          sessionId: client.sessionId,
          displayName,
          text,
          ts: now,
        };
        this.messages.push(entry);
        if (this.messages.length > 160) this.messages.shift();
        this.broadcast("lobby:chat", entry);
      }
    );

    this.onMessage(
      "lobby:setName",
      (client: Client, message: { displayName?: string }) => {
        const name = String(message?.displayName ?? "").trim().slice(0, 48);
        if (name.length < 2) return;
        const row = this.meta.get(client.sessionId);
        if (row) {
          row.displayName = name;
          this.broadcast("lobby:presence", { clients: this.getPresence() });
        }
      }
    );
  }

  onJoin(client: Client, options: Record<string, unknown> = {}) {
    const raw =
      typeof options.displayName === "string" ? options.displayName : "";
    const userId =
      typeof options.userId === "string" && options.userId.length <= 40
        ? options.userId
        : null;
    const displayName =
      raw.trim().slice(0, 48) ||
      `Invitado-${client.sessionId.slice(0, 4)}`;
    this.meta.set(client.sessionId, { displayName, userId });

    client.send("lobby:history", { messages: this.messages.slice(-80) });
    this.broadcast("lobby:presence", { clients: this.getPresence() });
  }

  onLeave(client: Client) {
    this.meta.delete(client.sessionId);
    this.lastChat.delete(client.sessionId);
    this.broadcast("lobby:presence", { clients: this.getPresence() });
  }

  onDispose() {
    pushGameMonitorLog("info", "room", "NexusLobbyRoom disposed", {
      roomId: this.roomId,
      name: nexusWorld3DConfig.branding.appName,
    });
  }

  private getPresence(): Array<{
    sessionId: string;
    displayName: string;
    userId: string | null;
  }> {
    return this.clients.map((c) => {
      const m = this.meta.get(c.sessionId);
      return {
        sessionId: c.sessionId,
        displayName: m?.displayName ?? "…",
        userId: m?.userId ?? null,
      };
    });
  }
}
