import { Room, Client } from 'colyseus';
import { gameRedis } from '../../src/lib/services/redis';

interface PlayerData {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
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
    
    // Configurar limpieza automática
    this.setupCleanup();
  }

  onJoin(client: Client, options: any) {
    console.log(`👤 Cliente ${client.sessionId} se unió al Hotel Humboldt`);
    
    // Crear jugador usando la misma lógica que tenías
    const player: PlayerData = {
      id: client.sessionId,
      username: options.username || `Jugador_${client.id.substring(0, 6)}`,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
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
      
          // Remover de la sala después de un delay
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
          }, 5000); // 5 segundos de gracia
      
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
      const player = this.players.get(client.id);
      if (player) {
        player.position = data.position;
        player.rotation = data.rotation;
        player.animation = data.animation || (data.isRunning ? 'running' : data.isMoving ? 'walking' : 'idle');
        player.isMoving = data.isMoving || false;
        player.isRunning = data.isRunning || false;
        player.lastUpdate = Date.now();
        
        // Broadcast a otros jugadores
        this.broadcast('player:moved', {
          playerId: client.sessionId,
          movement: data,
        }, { except: client });
        
        // Actualizar en Redis (menos frecuente para optimizar)
        if (Date.now() - (player.lastUpdate || 0) > 1000) {
          this.savePlayerToRedis(player);
        }
      }
    });

    // Chat (reutilizando tu lógica)
    this.onMessage('chat:message', (client: Client, data: any) => {
      const player = this.players.get(client.id);
      if (player && data.message) {
        const chatMessage: ChatMessage = {
          id: `msg_${Date.now()}_${client.id}_${Math.random().toString(36).substring(2, 9)}`,
          playerId: client.id,
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
