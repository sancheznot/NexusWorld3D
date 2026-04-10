import { Room, Client } from "colyseus";
import {
  ChatMessages,
  PlayerMessages,
  PROTOCOL_VERSION,
  readJoinProtocolVersion,
} from "@nexusworld3d/protocol";
import { nexusWorld3DConfig } from "@repo/nexusworld3d.config";
import { gameRedis } from "@/lib/services/redis";
import type { FrameworkServices } from "@resources/types";
import type { EconomyEvents } from "@resources/economy/server/EconomyEvents";
import type { InventoryEvents } from "@resources/inventory/server/InventoryEvents";
import { ItemEvents } from "@server/modules/ItemEvents";
import { ShopEvents } from "@server/modules/ShopEvents";
import { TreeChopEvents } from "@server/modules/TreeChopEvents";
import { RockMineEvents } from "@server/modules/RockMineEvents";
import {
  attachContextRoomPlugins,
  attachGenericWorldToolRouter,
  createInMemoryPlayerStore,
  createInMemorySessionStore,
  createInMemoryWorldStateStore,
  type PlayerStore,
  type SessionStore,
  type WorldStateStore,
} from "@nexusworld3d/engine-server";
import {
  attachNexusRoomPlugins,
  createFrameworkDemoCubePlugin,
  createWorldResourceNodesPlugin,
} from "@server/room/nexusRoomPlugins";
import { HousingEvents } from "@server/modules/HousingEvents";
import { RpgProgression } from "@server/modules/RpgProgression";
import { RPG_XP_ITEM_PICKUP } from "@/constants/rpgProgression";
import {
  attachCoreFrameworkResources,
  attachLateFrameworkResources,
} from "@server/bootstrap/attachFrameworkResources";
import { pushGameMonitorLog } from "@server/metrics/gameMonitor";
import type { ExtendedJobId } from "@/constants/jobs";
import {
  fetchPlayerProfileByNorm,
  normalizePlayerUsername,
  upsertPlayerProfile,
  type PlayerProfileRow,
} from "@/lib/db/playerProfile";

interface PlayerData {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  mapId: string; // mapa actual (exterior, hotel-interior, etc.)
  roleId: ExtendedJobId | null;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  hunger: number;
  maxHunger: number;
  level: number;
  experience: number;
  worldId: string;
  isOnline: boolean;
  lastSeen: Date;
  lastUpdate?: number;
  animation?: string;
  isMoving?: boolean;
  isRunning?: boolean;
}

interface ChatMessage {
  id: string;
  playerId: string;
  username: string;
  message: string;
  channel: string;
  timestamp: Date;
  type: string;
}

/** ES: Clave SessionStore para historial de chat de esta sala. EN: SessionStore key for this room's chat log. */
const SESSION_CHAT_KEY = "framework:room:chat:v1";

export class NexusWorldRoom extends Room {
  private players = new Map<string, PlayerData>();
  private chatMessages: ChatMessage[] = [];
  private redis = gameRedis;

  /**
   * ES: Contratos de persistencia. Por defecto memoria (`createPersistenceStores`).
   * EN: Persistence contracts; default in-memory via `createPersistenceStores`.
   */
  playerStore!: PlayerStore;
  sessionStore!: SessionStore;
  worldStateStore!: WorldStateStore;

  /**
   * ES: Sobreescribe en una subclase para Redis/MariaDB/etc.
   * EN: Override in a subclass to plug Redis/MariaDB-backed stores.
   */
  protected createPersistenceStores(): {
    playerStore: PlayerStore;
    sessionStore: SessionStore;
    worldStateStore: WorldStateStore;
  } {
    return {
      playerStore: createInMemoryPlayerStore(),
      sessionStore: createInMemorySessionStore(),
      worldStateStore: createInMemoryWorldStateStore(),
    };
  }
  /** ES: Throttle guardado MariaDB/Redis en movimiento. EN: Throttle DB save on move. */
  private lastMoveProfileSaveAt = new Map<string, number>();

  /** ES: Rellenado por recursos core (economía, inventario). EN: Filled by core resources. */
  frameworkServices: FrameworkServices = {};

  private _itemEvents!: ItemEvents;
  private _shopEvents!: ShopEvents;
  private rpgProgression!: RpgProgression;
  private housingEvents!: HousingEvents;

  /** ES: Limpieza registrada por resources/ (registerDisposable). EN: Cleanup from resources/. */
  private resourceDisposables: Array<() => void> = [];

  get economyEvents(): EconomyEvents {
    const e = this.frameworkServices.economy;
    if (!e) throw new Error("[NexusWorld3D] economy resource not mounted");
    return e;
  }

  get inventoryEvents(): InventoryEvents {
    const i = this.frameworkServices.inventory;
    if (!i) throw new Error("[NexusWorld3D] inventory resource not mounted");
    return i;
  }

  /**
   * ES: Expuesto al CoreContext para recursos del framework.
   * EN: Exposed on CoreContext for framework resources.
   */
  registerResourceDisposable(dispose: () => void): void {
    this.resourceDisposables.push(dispose);
  }

  onCreate(_options: { [key: string]: string }) {
    const persistence = this.createPersistenceStores();
    this.playerStore = persistence.playerStore;
    this.sessionStore = persistence.sessionStore;
    this.worldStateStore = persistence.worldStateStore;

    console.log(
      `🌐 NexusWorldRoom creada (${nexusWorld3DConfig.branding.appName})`
    );
    pushGameMonitorLog("info", "room", "NexusWorldRoom created", {
      roomId: this.roomId,
      roomName: this.roomName,
    });

    // Configurar la sala
    this.maxClients = 50;
    this.autoDispose = false;

    // Configurar el estado de Colyseus para sincronización automática
    this.state = {
      players: new Map(),
    };

    console.log("🔄 Estado inicial de Colyseus:", this.state);
    console.log("🔄 this.state.players:", this.state.players);

    // Cargar mensajes de chat recientes
    this.loadRecentChatMessages();

    // Configurar handlers de mensajes
    this.setupMessageHandlers();

    // ES: Recursos core (economía → inventario) antes de ítems/tienda.
    // EN: Core resources (economy → inventory) before items/shop.
    attachCoreFrameworkResources(this);

    attachGenericWorldToolRouter(this, (playerId, itemIds) =>
      this.inventoryEvents.playerHasAnyOfCatalogItemIds(playerId, itemIds)
    );

    this.rpgProgression = new RpgProgression({
      room: this,
      getPlayer: (id) => this.players.get(id),
      getClient: (id) => this.clients.find((c) => c.sessionId === id),
      inventory: this.inventoryEvents,
      requestPersist: (id) => {
        const p = this.players.get(id);
        if (p) void this.savePlayerToRedis(p);
      },
      syncStatePlayer: (sessionId, patch) => {
        const sp = this.state.players.get(sessionId);
        if (!sp) return;
        if (patch.level !== undefined) sp.level = patch.level;
        if (patch.experience !== undefined) sp.experience = patch.experience;
        if (patch.maxHealth !== undefined) sp.maxHealth = patch.maxHealth;
        if (patch.health !== undefined) sp.health = patch.health;
      },
    });

    this._itemEvents = new ItemEvents(
      this,
      (clientId: string) => this.getPlayerMapId(clientId),
      (playerId: string, baseItem) =>
        this.inventoryEvents.addItemFromWorld(playerId, baseItem),
      {
        getPlayerPosition: (id: string) => {
          const p = this.players.get(id);
          return p ? { ...p.position } : null;
        },
        removeItemStackForWorldDrop: (playerId, instanceId, qty) =>
          this.inventoryEvents.removeItemStackReturningBase(
            playerId,
            instanceId,
            qty
          ),
        onItemGranted: (playerId) => {
          this.rpgProgression.addXp(playerId, RPG_XP_ITEM_PICKUP);
        },
      }
    );

    new TreeChopEvents(this, {
      getPlayerMapId: (clientId: string) => this.getPlayerMapId(clientId),
      getPlayerPosition: (id: string) => {
        const p = this.players.get(id);
        return p ? { ...p.position } : null;
      },
      inventory: this.inventoryEvents,
      awardExperience: (pid, amount) => this.rpgProgression.addXp(pid, amount),
    });

    new RockMineEvents(this, {
      getPlayerMapId: (clientId: string) => this.getPlayerMapId(clientId),
      getPlayerPosition: (id: string) => {
        const p = this.players.get(id);
        return p ? { ...p.position } : null;
      },
      inventory: this.inventoryEvents,
      awardExperience: (pid, amount) => this.rpgProgression.addXp(pid, amount),
    });

    const roomPluginCtx = {
      getPlayerPosition: (id: string) => {
        const p = this.players.get(id);
        return p ? { ...p.position } : null;
      },
    };

    attachNexusRoomPlugins(this, [
      createWorldResourceNodesPlugin({
        inventory: this.inventoryEvents,
        getPlayerMapId: (clientId: string) => this.getPlayerMapId(clientId),
        getPlayerPosition: roomPluginCtx.getPlayerPosition,
        awardExperience: (pid, amount) =>
          this.rpgProgression.addXp(pid, amount),
      }),
    ]);

    attachContextRoomPlugins(this, roomPluginCtx, [
      createFrameworkDemoCubePlugin({
        inventory: this.inventoryEvents,
      }),
    ]);

    this.housingEvents = new HousingEvents(this, {
      inventory: this.inventoryEvents,
      economy: this.economyEvents,
      getPlayer: (id) => this.players.get(id),
      getPlayerMapId: (id) => this.getPlayerMapId(id),
      getPlayerPosition: (id) => {
        const p = this.players.get(id);
        return p ? { ...p.position } : null;
      },
      normalizeUsername: normalizePlayerUsername,
      awardExperience: (pid, amount) =>
        this.rpgProgression.addXp(pid, amount),
    });

    this._shopEvents = new ShopEvents(this, {
      grantItemToPlayer: (playerId, baseItem) =>
        this.inventoryEvents.addItemFromWorld(playerId, baseItem),
      getPlayerRole: (clientId: string) =>
        this.resolvePlayerJobRole(clientId) ?? undefined,
      getPlayerMapId: (clientId: string) => this.getPlayerMapId(clientId),
      economy: {
        chargeWalletMajor: (userId: string, amount: number, reason?: string) =>
          this.economyEvents.chargeWalletMajor(userId, amount, reason),
        creditWalletMajor: (userId: string, amount: number, reason?: string) =>
          this.economyEvents.creditWalletMajor(userId, amount, reason),
      },
    });

    // Configurar limpieza automática
    this.setupCleanup();

    // Limpieza periódica: solo elimina jugadores marcados offline y antiguos (cada 30s)
    setInterval(() => {
      const now = Date.now();
      const removed: string[] = [];
      for (const [id, player] of this.players.entries()) {
        const last = player.lastUpdate || 0;
        if (player.isOnline === false && now - last > 60000) {
          this.players.delete(id);
          this.state.players.delete(id);
          removed.push(id);
        }
      }
      if (removed.length > 0) {
        console.log(
          `🧹 Eliminados por inactividad (offline): ${removed.length}`
        );
        this.broadcast("players:updated", {
          players: Array.from(this.players.values()),
        });
      }
    }, 30000);

    // ES: Tiempo, jobs, ejemplo — tras ítems/tienda. EN: Time, jobs, example after items/shop.
    attachLateFrameworkResources(this);
  }

  async onJoin(
    client: Client,
    options?: { username?: string; worldId?: string }
  ) {
    console.log(
      `👤 Cliente ${client.sessionId} se unió a ${nexusWorld3DConfig.networking.colyseusRoomName}`
    );

    const clientPv = readJoinProtocolVersion(options as unknown);
    if (clientPv !== PROTOCOL_VERSION) {
      const detail =
        clientPv === null
          ? "missing protocolVersion in join options"
          : `client=${clientPv}`;
      const msg = `Protocol mismatch (${detail}; server=${PROTOCOL_VERSION}). Update the game client or deploy a matching server.`;
      pushGameMonitorLog("warn", "room", "join rejected: protocol mismatch", {
        sessionId: client.sessionId,
        clientProtocolVersion: clientPv,
        serverProtocolVersion: PROTOCOL_VERSION,
      });
      throw new Error(msg);
    }

    const now = Date.now();
    const defaultPosition = { x: 0, y: 0, z: 0 };
    const defaultRotation = { x: 0, y: 0, z: 0 };
    const defaultMapId = "exterior";
    const defaultWorldId =
      options?.worldId || nexusWorld3DConfig.worlds.default;
    const sessionFallback = `Jugador_${client.id.substring(0, 6)}`;
    /** ES: Nombre de cuenta en joinOptions gana a Redis para que MariaDB coincida en la 1ª conexión. EN: Join options username wins over Redis for DB profile key. */
    const fallbackUsername = options?.username || sessionFallback;

    const parseVector = (
      value: unknown,
      fallback: { x: number; y: number; z: number }
    ) => {
      if (!value) return fallback;
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value) as {
            x: number;
            y: number;
            z: number;
          };
          if (
            typeof parsed.x === "number" &&
            typeof parsed.y === "number" &&
            typeof parsed.z === "number"
          ) {
            return parsed;
          }
        } catch {}
      } else if (typeof value === "object") {
        const obj = value as { x?: number; y?: number; z?: number };
        if (
          typeof obj.x === "number" &&
          typeof obj.y === "number" &&
          typeof obj.z === "number"
        ) {
          return { x: obj.x, y: obj.y, z: obj.z };
        }
      }
      return fallback;
    };
    const parseNumber = (value: unknown, fallback: number) => {
      const num =
        typeof value === "string"
          ? Number(value)
          : typeof value === "number"
          ? value
          : NaN;
      return Number.isFinite(num) ? num : fallback;
    };
    const parseBoolean = (value: unknown, fallback: boolean) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") return value === "true";
      return fallback;
    };
    const parseString = (value: unknown, fallback: string) =>
      typeof value === "string" && value.length > 0 ? value : fallback;
    const parseRole = (value: unknown): ExtendedJobId | null => {
      if (typeof value === "string" && value.length > 0)
        return value as ExtendedJobId;
      return null;
    };

    let storedData: Record<string, unknown> | null = null;
    try {
      const snap = await this.playerStore.loadSnapshot(client.sessionId);
      if (
        snap &&
        typeof snap === "object" &&
        Object.keys(snap as object).length > 0
      ) {
        storedData = snap as Record<string, unknown>;
      }
    } catch (error) {
      console.warn("⚠️ Error recuperando jugador desde PlayerStore:", error);
    }
    if (!storedData) {
      try {
        const stored = await this.redis.getPlayer(client.sessionId);
        if (stored && Object.keys(stored).length > 0)
          storedData = stored as Record<string, unknown>;
      } catch (error) {
        console.warn("⚠️ Error recuperando jugador desde Redis:", error);
      }
    }

    const position = parseVector(storedData?.position, defaultPosition);
    const rotation = parseVector(storedData?.rotation, defaultRotation);
    const mapId = parseString(storedData?.mapId, defaultMapId);
    const health = parseNumber(storedData?.health, 100);
    const maxHealth = parseNumber(storedData?.maxHealth, 100);
    const stamina = parseNumber(storedData?.stamina, 100);
    const maxStamina = parseNumber(storedData?.maxStamina, 100);
    const hunger = parseNumber(storedData?.hunger, 100);
    const maxHunger = parseNumber(storedData?.maxHunger, 100);
    const level = parseNumber(storedData?.level, 1);
    const experience = parseNumber(storedData?.experience, 0);
    const worldId = parseString(storedData?.worldId, defaultWorldId);
    const animation = parseString(storedData?.animation, "idle");
    const isMoving = parseBoolean(storedData?.isMoving, false);
    const isRunning = parseBoolean(storedData?.isRunning, false);
    const roleId = parseRole(storedData?.roleId);
    const username = parseString(
      options?.username,
      parseString(storedData?.username, fallbackUsername)
    );
    const lastUpdate = parseNumber(storedData?.lastUpdate, now);

    const player: PlayerData = {
      id: client.sessionId,
      username,
      position,
      rotation,
      mapId,
      roleId,
      health,
      maxHealth,
      stamina,
      maxStamina,
      hunger,
      maxHunger,
      level,
      experience,
      worldId,
      isOnline: true,
      lastSeen: new Date(),
      lastUpdate: now,
      animation,
      isMoving,
      isRunning,
    };

    // ES: Perfil persistente MariaDB (fuente de verdad entre sesiones).
    // EN: MariaDB profile (source of truth across sessions).
    let profileRow: PlayerProfileRow | null = null;
    try {
      profileRow = await fetchPlayerProfileByNorm(
        normalizePlayerUsername(player.username)
      );
      if (profileRow) {
        player.username = profileRow.username || player.username;
        player.worldId = profileRow.world_id || player.worldId;
        player.health = profileRow.health;
        player.maxHealth = profileRow.max_health;
        player.stamina = profileRow.stamina;
        player.maxStamina = profileRow.max_stamina;
        player.hunger = profileRow.hunger;
        player.maxHunger = profileRow.max_hunger;
        player.level = profileRow.level;
        player.experience = profileRow.experience;
        player.position = {
          x: profileRow.pos_x,
          y: profileRow.pos_y,
          z: profileRow.pos_z,
        };
        player.rotation = {
          x: profileRow.rot_x,
          y: profileRow.rot_y,
          z: profileRow.rot_z,
        };
        player.mapId = profileRow.map_id || player.mapId;
        player.roleId = profileRow.role_id
          ? (profileRow.role_id as ExtendedJobId)
          : null;
      }
    } catch (e) {
      console.warn("⚠️ MariaDB player_profile (join):", e);
    }

    // Agregar jugador
    this.players.set(client.sessionId, player);

    // Actualizar estado de Colyseus
    this.state.players.set(client.sessionId, {
      id: player.id,
      username: player.username,
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      rotationX: player.rotation.x,
      rotationY: player.rotation.y,
      rotationZ: player.rotation.z,
      mapId: player.mapId,
      roleId: player.roleId,
      health: player.health,
      maxHealth: player.maxHealth,
      stamina: player.stamina,
      maxStamina: player.maxStamina,
      hunger: player.hunger,
      maxHunger: player.maxHunger,
      level: player.level,
      experience: player.experience,
      animation: player.animation || "idle",
      isMoving: player.isMoving || false,
      isRunning: player.isRunning || false,
      isOnline: player.isOnline,
      lastUpdate: player.lastUpdate || Date.now(),
    });

    console.log("🔄 Estado de Colyseus actualizado:", this.state);
    console.log("🔄 this.state.players.size:", this.state.players.size);
    console.log(
      "🔄 Jugadores en this.state.players:",
      Array.from(this.state.players.keys())
    );

    // Enviar estado actual a todos los jugadores
    this.broadcast(PlayerMessages.Joined, {
      player: player,
      players: Array.from(this.players.values()),
    });

    // Enviar lista actualizada de jugadores
    console.log(
      "📤 Enviando players:updated a todos los clientes:",
      Array.from(this.players.values()).length,
      "jugadores"
    );
    this.broadcast("players:updated", {
      players: Array.from(this.players.values()),
    });

    // Crear inventario inicial para el jugador (después del perfil MariaDB / Redis en memoria)
    this.inventoryEvents.createPlayerInventory(client.sessionId);
    const invFromDb = profileRow?.inventory_json;
    if (invFromDb != null && invFromDb !== "") {
      let raw: unknown = invFromDb;
      if (typeof invFromDb === "string") {
        try {
          raw = JSON.parse(invFromDb as string);
        } catch {
          console.warn(`⚠️ inventory_json no es JSON válido para ${username}`);
          raw = null;
        }
      }
      if (raw != null) {
        const loaded = this.inventoryEvents.loadPersistedInventory(
          client.sessionId,
          raw
        );
        if (!loaded) {
          console.warn(
            `⚠️ inventory_json inválido para ${username}; usando inventario inicial hasta próximo guardado.`
          );
        }
      }
    } else {
      const invSnap = gameRedis.getPlayerInventorySnapshot(
        normalizePlayerUsername(player.username)
      );
      if (invSnap) {
        this.inventoryEvents.loadPersistedInventory(client.sessionId, invSnap);
      }
    }

    this.rpgProgression.hydrate(
      client.sessionId,
      profileRow?.stats_json ?? null,
      player
    );

    this.housingEvents.hydrateFromProfile(
      normalizePlayerUsername(player.username),
      player.username,
      profileRow?.housing_json ?? null
    );
    this.housingEvents.afterPlayerJoined(client);
    const spSync = this.state.players.get(client.sessionId);
    if (spSync) {
      spSync.level = player.level;
      spSync.experience = player.experience;
      spSync.maxHealth = player.maxHealth;
      spSync.health = player.health;
    }
    this.broadcast("players:updated", {
      players: Array.from(this.players.values()),
    });

    void this.savePlayerToRedis(player);

    // Enviar mensaje de bienvenida solo al jugador que se conectó
    this.sendSystemMessageToClient(
      client,
      `¡Bienvenido a ${nexusWorld3DConfig.branding.appName}, ${player.username}!`
    );

    console.log(
      `✅ Jugador ${player.username} agregado. Total: ${this.players.size}`
    );
    pushGameMonitorLog("info", "player", `Player joined: ${player.username}`, {
      sessionId: client.sessionId,
      roomId: this.roomId,
      total: this.players.size,
    });
  }

  async onLeave(client: Client, consented: boolean) {
    console.log(`👋 Cliente ${client.sessionId} salió de la sala`);

    const player = this.players.get(client.sessionId);
    if (player) {
      this.lastMoveProfileSaveAt.delete(client.sessionId);
      pushGameMonitorLog("info", "player", `Player leaving: ${player.username}`, {
        sessionId: client.sessionId,
        consented,
      });
      // Marcar como offline
      player.isOnline = false;
      player.lastSeen = new Date();

      try {
        await this.savePlayerToRedis(player);
      } catch (e) {
        console.warn("⚠️ Error guardando perfil al salir:", e);
      }

      const inv = this.inventoryEvents.getPlayerInventory(client.sessionId);
      if (inv) {
        gameRedis.savePlayerInventorySnapshot(
          normalizePlayerUsername(player.username),
          inv
        );
      }

      this.rpgProgression.clearSession(client.sessionId);

      // Limpiar inventario del jugador
      this.inventoryEvents.cleanupPlayerInventory(client.sessionId);

      // Remover de la sala: inmediato si cierre consentido, pequeño delay si no
      const delayMs = consented ? 0 : 2000;
      setTimeout(() => {
        this.players.delete(client.sessionId);
        this.state.players.delete(client.sessionId);

        this.broadcast(PlayerMessages.Left, {
          playerId: client.sessionId,
          players: Array.from(this.players.values()),
        });

        // Enviar lista actualizada de jugadores
        console.log(
          "📤 Enviando players:updated después de salir:",
          Array.from(this.players.values()).length,
          "jugadores"
        );
        this.broadcast("players:updated", {
          players: Array.from(this.players.values()),
        });

        console.log(
          `🗑️ Jugador ${player.username} removido. Total: ${this.players.size}`
        );
      }, delayMs);

      this.sendSystemMessage(`${player.username} se desconectó`);
    }
  }

  onDispose() {
    for (const dispose of this.resourceDisposables) {
      try {
        dispose();
      } catch (e) {
        console.warn("⚠️ Error en dispose de recurso:", e);
      }
    }
    this.resourceDisposables = [];
    console.log("🌐 NexusWorldRoom cerrada");
    pushGameMonitorLog("info", "room", "NexusWorldRoom disposed", {
      roomId: this.roomId,
    });
  }

  private setupMessageHandlers() {
    // Player join handler
    this.onMessage(
      PlayerMessages.Join,
      (client: Client, data: { username?: string; worldId?: string }) => {
        console.log(`📥 Recibido player:join de ${client.id}:`, data);
        // Actualizar datos del jugador con la información enviada por el cliente
        const player = this.players.get(client.sessionId);
        if (player) {
          if (data?.username && data.username !== player.username) {
            player.username = data.username;
          }
          if (data?.worldId && data.worldId !== player.worldId) {
            player.worldId = data.worldId;
          }
          // Reflejar cambios en el estado sincronizado de Colyseus
          const statePlayer = this.state.players.get(client.sessionId);
          if (statePlayer) {
            statePlayer.username = player.username;
          }
          // Guardar cambios en Redis
          this.savePlayerToRedis(player);
          // Reenviar lista de jugadores actualizada a todos
          console.log(
            "📤 players:updated tras player:join (update de datos):",
            this.players.size
          );
          this.broadcast("players:updated", {
            players: Array.from(this.players.values()),
          });
        }
      }
    );

    // Movimiento del jugador (reutilizando tu lógica)
    this.onMessage(
      PlayerMessages.Move,
      (
        client: Client,
        data: {
          position: { x: number; y: number; z: number };
          rotation: { x: number; y: number; z: number };
          isRunning?: boolean;
          isMoving?: boolean;
          animation?: string;
        }
      ) => {
        const player = this.players.get(client.sessionId);
        if (player) {
          player.position = data.position;
          player.rotation = data.rotation;
          player.animation =
            data.animation ||
            (data.isRunning ? "running" : data.isMoving ? "walking" : "idle");
          player.isMoving = data.isMoving || false;
          player.isRunning = data.isRunning || false;
          player.lastUpdate = Date.now();
          // Reflejar movimiento también en el estado sincronizado
          const statePlayer = this.state.players.get(client.sessionId);
          if (statePlayer) {
            statePlayer.x = player.position.x;
            statePlayer.y = player.position.y;
            statePlayer.z = player.position.z;
            statePlayer.rotationX = player.rotation.x;
            statePlayer.rotationY = player.rotation.y;
            statePlayer.rotationZ = player.rotation.z;
            statePlayer.animation = player.animation;
            statePlayer.isMoving = player.isMoving;
            statePlayer.isRunning = player.isRunning;
            statePlayer.lastUpdate = player.lastUpdate;
          }

          // Enviar solo a jugadores en el mismo mapa
          this.clients.forEach((c) => {
            if (c.sessionId === client.sessionId) return;
            const target = this.players.get(c.sessionId);
            if (target && target.mapId === player.mapId) {
              c.send(PlayerMessages.Moved, {
                playerId: client.sessionId,
                movement: data,
              });
            }
          });

          const t = Date.now();
          const last = this.lastMoveProfileSaveAt.get(client.sessionId) ?? 0;
          if (t - last >= 5000) {
            this.lastMoveProfileSaveAt.set(client.sessionId, t);
            void this.savePlayerToRedis(player);
          }
        }
      }
    );

    // Cambio de mapa del jugador
    this.onMessage(
      "map:change",
      (
        client: Client,
        data: {
          fromMapId: string;
          toMapId: string;
          position: { x: number; y: number; z: number };
          rotation: { x: number; y: number; z: number };
          reason?: string;
        }
      ) => {
        const player = this.players.get(client.sessionId);
        if (!player) return;
        player.mapId = data.toMapId;
        player.position = data.position;
        player.rotation = data.rotation;
        player.lastUpdate = Date.now();

        // Reflejar en estado sincronizado
        const statePlayer = this.state.players.get(client.sessionId);
        if (statePlayer) {
          statePlayer.x = player.position.x;
          statePlayer.y = player.position.y;
          statePlayer.z = player.position.z;
          statePlayer.rotationX = player.rotation.x;
          statePlayer.rotationY = player.rotation.y;
          statePlayer.rotationZ = player.rotation.z;
          statePlayer.mapId = player.mapId;
          statePlayer.lastUpdate = player.lastUpdate;
        }

        // Notificar a todos los clientes el cambio de mapa del jugador
        const payload = {
          playerId: client.sessionId,
          mapId: player.mapId,
          position: player.position,
          rotation: player.rotation,
          timestamp: Date.now(),
        };

        this.clients.forEach((c) => {
          c.send("map:changed", payload);
        });
      }
    );

    // Petición de datos del mapa actual (jugadores presentes, etc.)
    this.onMessage("map:request", (client: Client, data: { mapId: string }) => {
      const mapId = data?.mapId;
      const playersInMap = Array.from(this.players.values())
        .filter((p) => p.mapId === mapId)
        .map((p) => ({
          id: p.id,
          mapId: p.mapId,
          position: p.position,
          rotation: p.rotation,
        }));
      client.send("map:update", {
        players: playersInMap,
        mapId,
        timestamp: Date.now(),
      });
    });

    // Heartbeat del jugador para refrescar lastUpdate sin necesidad de movimiento
    this.onMessage(PlayerMessages.Heartbeat, (client: Client, _data?: unknown) => {
      const player = this.players.get(client.sessionId);
      if (player) {
        player.lastUpdate = Date.now();
        const statePlayer = this.state.players.get(client.sessionId);
        if (statePlayer) {
          statePlayer.lastUpdate = player.lastUpdate;
        }
      }
    });

    // Chat (reutilizando tu lógica)
    this.onMessage(
      ChatMessages.Message,
      (client: Client, data: { message: string; channel?: string }) => {
        const player = this.players.get(client.sessionId);
        if (player && data.message) {
          const chatMessage: ChatMessage = {
            id: `msg_${Date.now()}_${client.sessionId}_${Math.random()
              .toString(36)
              .substring(2, 9)}`,
            playerId: client.sessionId,
            username: player.username,
            message: data.message,
            channel: data.channel || "global",
            timestamp: new Date(),
            type: "player",
          };

          // Agregar al estado
          this.chatMessages.push(chatMessage);

          // Mantener solo los últimos 100 mensajes
          if (this.chatMessages.length > 100) {
            this.chatMessages = this.chatMessages.slice(-100);
          }

          void this.persistChatMessages();

          // Broadcast a todos
          this.broadcast(ChatMessages.Message, chatMessage);

          console.log(`💬 ${player.username}: ${data.message}`);
        }
      }
    );

    // Ataque (reutilizando tu lógica)
    this.onMessage(
      PlayerMessages.Attack,
      (client: Client, data: { targetId: string; damage: number }) => {
        const player = this.players.get(client.id);
        if (player) {
          console.log(`⚔️ ${player.username} atacó a ${data.targetId}`);
          this.inventoryEvents.applyEquippedMeleeWeaponWear(client.sessionId);
          this.broadcast(
            PlayerMessages.Attacked,
            {
              attackerId: client.id,
              targetId: data.targetId,
              damage: data.damage,
            },
            { except: client }
          );
        }
      }
    );

    // Interacción (reutilizando tu lógica)
    this.onMessage(
      PlayerMessages.Interact,
      (client: Client, data: { objectId: string }) => {
        const player = this.players.get(client.id);
        if (player) {
          console.log(`🤝 ${player.username} interactuó con ${data.objectId}`);
          // TODO: Implementar lógica de interacción
        }
      }
    );
  }

  private async loadRecentChatMessages() {
    try {
      const raw = await this.sessionStore.get(SESSION_CHAT_KEY);
      if (!raw || !Array.isArray(raw)) return;
      const typed = raw as {
        id: string;
        playerId: string;
        username: string;
        message: string;
        channel: string;
        timestamp: string;
        type: string;
      }[];
      this.chatMessages = typed.map((msg) => ({
        id: msg.id,
        playerId: msg.playerId,
        username: msg.username,
        message: msg.message,
        channel: msg.channel,
        timestamp: new Date(msg.timestamp),
        type: msg.type,
      }));
      console.log(`💬 ${this.chatMessages.length} mensajes de chat cargados (SessionStore)`);
    } catch (error) {
      console.warn("⚠️ Error cargando mensajes de chat:", error);
    }
  }

  private async savePlayerToRedis(player: PlayerData) {
    try {
      const playerData = {
        id: player.id,
        username: player.username,
        position: JSON.stringify(player.position),
        rotation: JSON.stringify(player.rotation),
        health: player.health,
        maxHealth: player.maxHealth,
        stamina: player.stamina,
        maxStamina: player.maxStamina,
        hunger: player.hunger,
        maxHunger: player.maxHunger,
        level: player.level,
        experience: player.experience,
        worldId: player.worldId,
        isOnline: player.isOnline,
        lastSeen: player.lastSeen.getTime(),
        lastUpdate: player.lastUpdate,
        mapId: player.mapId,
        roleId: (player.roleId as string) ?? "",
      };

      await this.redis.addPlayer(player.id, playerData);
      await this.playerStore.saveSnapshot(player.id, playerData);
    } catch (error) {
      console.warn("⚠️ Error guardando jugador (Redis / PlayerStore):", error);
    }

    try {
      const invSnapshot = this.inventoryEvents.getPlayerInventory(player.id);
      const statsPayload = this.rpgProgression.buildStatsJsonForSave(player.id);
      await upsertPlayerProfile({
        username: player.username,
        worldId: player.worldId,
        position: player.position,
        rotation: player.rotation,
        mapId: player.mapId,
        roleId: player.roleId,
        health: player.health,
        maxHealth: player.maxHealth,
        stamina: player.stamina,
        maxStamina: player.maxStamina,
        hunger: player.hunger,
        maxHunger: player.maxHunger,
        level: player.level,
        experience: player.experience,
        statsJson:
          statsPayload !== null && Object.keys(statsPayload).length > 0
            ? statsPayload
            : undefined,
        inventoryJson:
          invSnapshot !== undefined ? invSnapshot : undefined,
        housingJson: this.housingEvents.getHousingJsonForSave(
          normalizePlayerUsername(player.username)
        ),
      });
      console.log(
        `💾 player_profile guardado: ${player.username} @ (${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}, ${player.position.z.toFixed(2)}) map=${player.mapId}`
      );
    } catch (e) {
      console.warn("⚠️ MariaDB player_profile (save):", e);
    }
  }

  /** ES: Mapa actual del jugador (sessionId Colyseus). EN: Player map by Colyseus session id. */
  getPlayerMapId(clientId: string): string | null {
    return this.players.get(clientId)?.mapId ?? null;
  }

  /** ES: Rol de trabajo (jobs) para mensajes/red. EN: Job role for networking. */
  resolvePlayerJobRole(playerId: string): ExtendedJobId | null {
    return this.players.get(playerId)?.roleId ?? null;
  }

  /** ES: Asignar rol de trabajo y sincronizar. EN: Assign job role and sync. */
  assignPlayerJobRole(playerId: string, roleId: ExtendedJobId | null): void {
    this.applyPlayerJobRole(playerId, roleId);
  }

  private applyPlayerJobRole(playerId: string, roleId: ExtendedJobId | null) {
    const player = this.players.get(playerId);
    if (!player) return;
    if (player.roleId === roleId) return;
    player.roleId = roleId;
    const statePlayer = this.state.players.get(playerId);
    if (statePlayer) {
      statePlayer.roleId = roleId;
    }
    void this.savePlayerToRedis(player);
    this.broadcast(PlayerMessages.Role, { playerId, roleId });
    this.broadcast("players:updated", {
      players: Array.from(this.players.values()),
    });
  }

  private getPlayerRole(playerId: string): ExtendedJobId | null {
    return this.resolvePlayerJobRole(playerId);
  }

  private setPlayerRole(playerId: string, roleId: ExtendedJobId | null) {
    this.applyPlayerJobRole(playerId, roleId);
  }

  private async persistChatMessages(): Promise<void> {
    try {
      const payload = this.chatMessages.map((m) => ({
        id: m.id,
        playerId: m.playerId,
        username: m.username,
        message: m.message,
        channel: m.channel,
        timestamp: m.timestamp.toISOString(),
        type: m.type,
      }));
      await this.sessionStore.set(SESSION_CHAT_KEY, payload);
    } catch (error) {
      console.warn("⚠️ Error guardando historial de chat (SessionStore):", error);
    }
  }

  private sendSystemMessage(message: string) {
    const systemMessage: ChatMessage = {
      id: `system_${Date.now()}`,
      playerId: "system",
      username: "Sistema",
      message: message,
      channel: "system",
      timestamp: new Date(),
      type: "system",
    };

    this.chatMessages.push(systemMessage);

    // Mantener solo los últimos 100 mensajes
    if (this.chatMessages.length > 100) {
      this.chatMessages = this.chatMessages.slice(-100);
    }

    void this.persistChatMessages();

    this.broadcast(ChatMessages.Message, systemMessage);
  }

  private sendSystemMessageToClient(client: Client, message: string) {
    const systemMessage: ChatMessage = {
      id: `system_${Date.now()}_${client.id}`,
      playerId: "system",
      username: "Sistema",
      message: message,
      channel: "system",
      timestamp: new Date(),
      type: "system",
    };

    // Enviar solo al cliente específico
    client.send(ChatMessages.Message, systemMessage);
  }

  private setupCleanup() {
    // Limpiar datos expirados cada 5 minutos (reutilizando tu lógica)
    setInterval(async () => {
      try {
        await this.redis.cleanupExpiredData();
        console.log("🧹 Limpieza de datos expirados completada");
      } catch (error) {
        console.error("❌ Error en limpieza de datos:", error);
      }
    }, 5 * 60 * 1000);
  }
}
