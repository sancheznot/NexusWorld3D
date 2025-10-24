import { Room, Client } from 'colyseus';
import { gameRedis } from '../../src/lib/services/redis';
import { InventoryEvents } from '../InventoryEvents';
import { ItemEvents } from '../ItemEvents';
import { TimeEvents } from '../TimeEvents';

interface PlayerData {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  mapId: string; // mapa actual (exterior, hotel-interior, etc.)
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
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

export class HotelHumboldtRoom extends Room {
  private players = new Map<string, PlayerData>();
  private chatMessages: ChatMessage[] = [];
  private redis = gameRedis;
  private inventoryEvents!: InventoryEvents;
  private _itemEvents!: ItemEvents; // keep reference alive
  private _timeEvents!: TimeEvents; // keep reference alive

  onCreate(options: { [key: string]: string }) {
    console.log('🏨 Hotel Humboldt Room creada');
    
    // Configurar la sala
    this.maxClients = 50;
    this.autoDispose = false;
    
    // Configurar el estado de Colyseus para sincronización automática
    this.state = {
      players: new Map()
    };
    
    console.log('🔄 Estado inicial de Colyseus:', this.state);
    console.log('🔄 this.state.players:', this.state.players);
    
    // Cargar mensajes de chat recientes
    this.loadRecentChatMessages();
    
    // Configurar handlers de mensajes
    this.setupMessageHandlers();
    
    // Inicializar eventos de inventario
    this.inventoryEvents = new InventoryEvents(this);
    // Inicializar sistema de ítems del mundo
    this._itemEvents = new ItemEvents(this, (clientId: string) => {
      const p = this.players.get(clientId);
      return p?.mapId || null;
    }, (playerId: string, baseItem) => this.inventoryEvents.addItemFromWorld(playerId, baseItem));
    // Inicializar sistema de tiempo (día/noche)
    this._timeEvents = new TimeEvents(this);
    
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
        console.log(`🧹 Eliminados por inactividad (offline): ${removed.length}`);
        this.broadcast('players:updated', { players: Array.from(this.players.values()) });
      }
    }, 30000);
  }

  onJoin(client: Client, options: any) {
    console.log(`👤 Cliente ${client.sessionId} se unió al Hotel Humboldt`);
    
    // Crear jugador usando la misma lógica que tenías
    const player: PlayerData = {
      id: client.sessionId,
      username: options.username || `Jugador_${client.id.substring(0, 6)}`,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      mapId: 'exterior',
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      level: 1,
      experience: 0,
      worldId: 'hotel-humboldt',
      isOnline: true,
      lastSeen: new Date(),
      lastUpdate: Date.now(),
      animation: 'idle',
      isMoving: false,
      isRunning: false,
    };
    
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
          health: player.health,
          maxHealth: player.maxHealth,
          stamina: player.stamina,
          maxStamina: player.maxStamina,
          level: player.level,
          experience: player.experience,
          animation: player.animation || 'idle',
          isMoving: player.isMoving || false,
          isRunning: player.isRunning || false,
          isOnline: player.isOnline,
          lastUpdate: player.lastUpdate || Date.now()
        });
        
        console.log('🔄 Estado de Colyseus actualizado:', this.state);
        console.log('🔄 this.state.players.size:', this.state.players.size);
    console.log('🔄 Jugadores en this.state.players:', Array.from(this.state.players.keys()));
        
        // Guardar en Redis (reutilizando tu lógica)
        this.savePlayerToRedis(player);
        
        // Enviar estado actual a todos los jugadores
        this.broadcast('player:joined', {
          player: player,
          players: Array.from(this.players.values()),
        });
        
        // Enviar lista actualizada de jugadores
        console.log('📤 Enviando players:updated a todos los clientes:', Array.from(this.players.values()).length, 'jugadores');
        this.broadcast('players:updated', {
          players: Array.from(this.players.values()),
        });
    
    // Enviar mensaje de bienvenida solo al jugador que se conectó
    this.sendSystemMessageToClient(client, `¡Bienvenido al Hotel Humboldt, ${player.username}!`);
    
    console.log(`✅ Jugador ${player.username} agregado. Total: ${this.players.size}`);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`👋 Cliente ${client.sessionId} salió del Hotel Humboldt`);
    
    const player = this.players.get(client.sessionId);
    if (player) {
      // Marcar como offline
      player.isOnline = false;
      player.lastSeen = new Date();
      
      // Guardar estado final en Redis
      this.savePlayerToRedis(player);
      
      // Limpiar inventario del jugador
      this.inventoryEvents.cleanupPlayerInventory(client.sessionId);
      
          // Remover de la sala: inmediato si cierre consentido, pequeño delay si no
          const delayMs = consented ? 0 : 2000;
          setTimeout(() => {
            this.players.delete(client.sessionId);
            this.state.players.delete(client.sessionId);
            
            this.broadcast('player:left', {
              playerId: client.sessionId,
              players: Array.from(this.players.values()),
            });
            
            // Enviar lista actualizada de jugadores
            console.log('📤 Enviando players:updated después de salir:', Array.from(this.players.values()).length, 'jugadores');
            this.broadcast('players:updated', {
              players: Array.from(this.players.values()),
            });
            
            console.log(`🗑️ Jugador ${player.username} removido. Total: ${this.players.size}`);
          }, delayMs);
      
      this.sendSystemMessage(`${player.username} se desconectó`);
    }
  }

  onDispose() {
    console.log('🏨 Hotel Humboldt Room cerrada');
  }

  private setupMessageHandlers() {
    // Player join handler
    this.onMessage('player:join', (client: Client, data: any) => {
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
        console.log('📤 players:updated tras player:join (update de datos):', this.players.size);
        this.broadcast('players:updated', {
          players: Array.from(this.players.values()),
        });
      }
    });

    // Movimiento del jugador (reutilizando tu lógica)
    this.onMessage('player:move', (client: Client, data: any) => {
      const player = this.players.get(client.sessionId);
      if (player) {
        player.position = data.position;
        player.rotation = data.rotation;
        player.animation = data.animation || (data.isRunning ? 'running' : data.isMoving ? 'walking' : 'idle');
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
            c.send('player:moved', {
              playerId: client.sessionId,
              movement: data,
            });
          }
        });
        
        // Actualizar en Redis (menos frecuente para optimizar)
        // Guardar de forma ocasional
        // if (Date.now() - (player.lastUpdate || 0) > 1000) {
        //   this.savePlayerToRedis(player);
        // }
      }
    });

    // Cambio de mapa del jugador
    this.onMessage('map:change', (client: Client, data: { fromMapId: string; toMapId: string; position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; reason?: string }) => {
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
        statePlayer.mapId = player.mapId as any;
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
        c.send('map:changed', payload);
      });
    });

    // Petición de datos del mapa actual (jugadores presentes, etc.)
    this.onMessage('map:request', (client: Client, data: { mapId: string }) => {
      const mapId = data?.mapId;
      const playersInMap = Array.from(this.players.values()).filter(p => p.mapId === mapId).map(p => ({
        id: p.id,
        mapId: p.mapId,
        position: p.position,
        rotation: p.rotation,
      }));
      client.send('map:update', {
        players: playersInMap,
        mapId,
        timestamp: Date.now(),
      });
    });

    // Heartbeat del jugador para refrescar lastUpdate sin necesidad de movimiento
    this.onMessage('player:heartbeat', (client: Client, data: any) => {
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
    this.onMessage('chat:message', (client: Client, data: any) => {
      const player = this.players.get(client.sessionId);
      if (player && data.message) {
        const chatMessage: ChatMessage = {
          id: `msg_${Date.now()}_${client.sessionId}_${Math.random().toString(36).substring(2, 9)}`,
          playerId: client.sessionId,
          username: player.username,
          message: data.message,
          channel: data.channel || 'global',
          timestamp: new Date(),
          type: 'player'
        };
        
        // Agregar al estado
        this.chatMessages.push(chatMessage);
        
        // Mantener solo los últimos 100 mensajes
        if (this.chatMessages.length > 100) {
          this.chatMessages = this.chatMessages.slice(-100);
        }
        
        // Guardar en Redis
        this.saveChatMessageToRedis(chatMessage);
        
        // Broadcast a todos
        this.broadcast('chat:message', chatMessage);
        
        console.log(`💬 ${player.username}: ${data.message}`);
      }
    });

    // Ataque (reutilizando tu lógica)
    this.onMessage('player:attack', (client: Client, data: any) => {
      const player = this.players.get(client.id);
      if (player) {
        console.log(`⚔️ ${player.username} atacó a ${data.targetId}`);
        this.broadcast('player:attacked', {
          attackerId: client.id,
          targetId: data.targetId,
          damage: data.damage,
        }, { except: client });
      }
    });

    // Interacción (reutilizando tu lógica)
    this.onMessage('player:interact', (client: Client, data: any) => {
      const player = this.players.get(client.id);
      if (player) {
        console.log(`🤝 ${player.username} interactuó con ${data.objectId}`);
        // TODO: Implementar lógica de interacción
      }
    });
  }

  private async loadRecentChatMessages() {
    try {
      const messages = await this.redis.getChatMessages(50);
      if (messages) {
        this.chatMessages = messages.map((msg: any) => ({
          id: msg.id,
          playerId: msg.playerId,
          username: msg.username,
          message: msg.message,
          channel: msg.channel,
          timestamp: new Date(msg.timestamp),
          type: msg.type
        }));
        console.log(`💬 ${messages.length} mensajes de chat cargados`);
      }
    } catch (error) {
      console.warn('⚠️ Error cargando mensajes de chat:', error);
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
        level: player.level,
        experience: player.experience,
        worldId: 'hotel-humboldt',
        isOnline: player.isOnline,
        lastSeen: player.lastSeen.getTime(),
        lastUpdate: player.lastUpdate,
      };
      
      await this.redis.addPlayer(player.id, playerData);
    } catch (error) {
      console.warn('⚠️ Error guardando jugador en Redis:', error);
    }
  }

  private async saveChatMessageToRedis(message: ChatMessage) {
    try {
      const messageData = {
        id: message.id,
        playerId: message.playerId,
        username: message.username,
        message: message.message,
        channel: message.channel,
        timestamp: message.timestamp,
        type: message.type,
      };
      
      await this.redis.addChatMessage(messageData);
    } catch (error) {
      console.warn('⚠️ Error guardando mensaje en Redis:', error);
    }
  }

  private sendSystemMessage(message: string) {
    const systemMessage: ChatMessage = {
      id: `system_${Date.now()}`,
      playerId: 'system',
      username: 'Sistema',
      message: message,
      channel: 'system',
      timestamp: new Date(),
      type: 'system'
    };
    
    this.chatMessages.push(systemMessage);
    
    // Mantener solo los últimos 100 mensajes
    if (this.chatMessages.length > 100) {
      this.chatMessages = this.chatMessages.slice(-100);
    }
    
    this.broadcast('chat:message', systemMessage);
  }

  private sendSystemMessageToClient(client: Client, message: string) {
    const systemMessage: ChatMessage = {
      id: `system_${Date.now()}_${client.id}`,
      playerId: 'system',
      username: 'Sistema',
      message: message,
      channel: 'system',
      timestamp: new Date(),
      type: 'system'
    };
    
    // Enviar solo al cliente específico
    client.send('chat:message', systemMessage);
  }

  private setupCleanup() {
    // Limpiar datos expirados cada 5 minutos (reutilizando tu lógica)
    setInterval(async () => {
      try {
        await this.redis.cleanupExpiredData();
        console.log('🧹 Limpieza de datos expirados completada');
      } catch (error) {
        console.error('❌ Error en limpieza de datos:', error);
      }
    }, 5 * 60 * 1000);
  }
}
