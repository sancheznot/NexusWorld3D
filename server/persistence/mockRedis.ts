/** ES: Mock en proceso — solo dev / single-process. EN: In-process mock — dev or single process only. */
export class MockGameRedis {
  private players = new Map<string, unknown>();
  /** ES: Inventario por usuario normalizado (reconexión ≠ mismo sessionId Colyseus). */
  private inventoryByNormUsername = new Map<string, unknown>();
  private onlinePlayers = new Set<string>();
  private chatMessages: unknown[] = [];
  private worldStates = new Map<string, unknown>();
  private mapDecorations = new Map<string, unknown[]>();
  private rooms = new Map<string, unknown>();
  private roomPlayers = new Map<string, Set<string>>();
  private serverStats = new Map<string, number>();

  constructor() {
    console.log("⚠️ Running with Mock Redis (In-Memory)");
  }

  async addPlayer(playerId: string, playerData: unknown) {
    this.players.set(playerId, playerData);
    this.onlinePlayers.add(playerId);
  }

  async removePlayer(playerId: string) {
    this.players.delete(playerId);
    this.onlinePlayers.delete(playerId);
  }

  async getPlayer(playerId: string) {
    return this.players.get(playerId) ?? null;
  }

  async getAllPlayers() {
    const players: unknown[] = [];
    for (const playerId of this.onlinePlayers) {
      const data = this.players.get(playerId);
      if (data) players.push({ id: playerId, ...(data as object) });
    }
    return players;
  }

  async addChatMessage(message: unknown) {
    const messageId = `msg:${Date.now()}:${Math.random()}`;
    this.chatMessages.push({ id: messageId, ...(message as object) });
    if (this.chatMessages.length > 100) {
      this.chatMessages = this.chatMessages.slice(-100);
    }
    return messageId;
  }

  async getChatMessages(limit: number = 50) {
    return [...this.chatMessages].reverse().slice(0, limit);
  }

  async saveWorldState(worldId: string, worldData: unknown) {
    this.worldStates.set(worldId, {
      ...(worldData as object),
      lastUpdate: Date.now(),
    });
  }

  async getWorldState(worldId: string) {
    return this.worldStates.get(worldId) ?? null;
  }

  async saveMapDecorations(worldId: string, decorations: unknown[]) {
    this.mapDecorations.set(worldId, decorations);
  }

  async getMapDecorations(worldId: string) {
    return this.mapDecorations.get(worldId) ?? [];
  }

  async updatePlayerPosition(playerId: string, position: unknown) {
    const player = this.players.get(playerId) as Record<string, unknown> | undefined;
    if (player) {
      this.players.set(playerId, {
        ...player,
        position: JSON.stringify(position),
        lastUpdate: Date.now(),
      });
    }
  }

  async getPlayerPosition(playerId: string) {
    const player = this.players.get(playerId) as { position?: string } | undefined;
    return player?.position ? JSON.parse(player.position) : null;
  }

  async createRoom(roomId: string, roomData: unknown) {
    this.rooms.set(roomId, {
      ...(roomData as object),
      createdAt: Date.now(),
      playerCount: 0,
    });
    this.roomPlayers.set(roomId, new Set());
  }

  async joinRoom(roomId: string, playerId: string) {
    const players = this.roomPlayers.get(roomId);
    if (players) players.add(playerId);

    const room = this.rooms.get(roomId) as { playerCount?: number } | undefined;
    if (room) room.playerCount = (room.playerCount || 0) + 1;
  }

  async leaveRoom(roomId: string, playerId: string) {
    const players = this.roomPlayers.get(roomId);
    if (players) players.delete(playerId);

    const room = this.rooms.get(roomId) as { playerCount?: number } | undefined;
    if (room) room.playerCount = Math.max(0, (room.playerCount || 0) - 1);
  }

  async getRoomPlayers(roomId: string) {
    return Array.from(this.roomPlayers.get(roomId) || []);
  }

  async incrementServerStats(stat: string, value: number = 1) {
    const current = this.serverStats.get(stat) || 0;
    this.serverStats.set(stat, current + value);
  }

  async getServerStats() {
    return Object.fromEntries(this.serverStats);
  }

  async cleanupExpiredData() {
    console.log("🧹 Mock Redis cleanup (noop)");
  }

  async savePlayerInventorySnapshot(
    normUsername: string,
    inventory: unknown
  ): Promise<void> {
    const key = normUsername.trim().toLowerCase();
    if (!key) return;
    try {
      this.inventoryByNormUsername.set(
        key,
        JSON.parse(JSON.stringify(inventory))
      );
    } catch {
      this.inventoryByNormUsername.set(key, inventory);
    }
  }

  async getPlayerInventorySnapshot(
    normUsername: string
  ): Promise<unknown | null> {
    const key = normUsername.trim().toLowerCase();
    if (!key) return null;
    return this.inventoryByNormUsername.get(key) ?? null;
  }

  async cleanupAllData() {
    this.players.clear();
    this.inventoryByNormUsername.clear();
    this.onlinePlayers.clear();
    this.chatMessages = [];
    this.worldStates.clear();
    this.mapDecorations.clear();
    this.rooms.clear();
    this.roomPlayers.clear();
    this.serverStats.clear();
    console.log("🧹 Mock Redis cleared");
  }
}
