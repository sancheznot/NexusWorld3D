/**
 * Sistema de Cámaras en Tiempo Real
 * Arquitectura OOP escalable para agregar múltiples cámaras fácilmente
 */

import { Vector3 } from 'three';

export interface CameraConfig {
  id: string;
  name: string;
  description: string;
  position: Vector3;
  target: Vector3;
  fov?: number;
  enabled?: boolean;
  updateInterval?: number; // ms
}

export interface CameraSnapshot {
  id: string;
  name: string;
  description: string;
  timestamp: number;
  imageData?: string; // Base64 encoded image
  players: number;
  fps: number;
}

export class Camera {
  public id: string;
  public name: string;
  public description: string;
  public position: Vector3;
  public target: Vector3;
  public fov: number;
  public enabled: boolean;
  public updateInterval: number;
  
  private lastUpdate: number = 0;
  private currentSnapshot: CameraSnapshot | null = null;

  constructor(config: CameraConfig) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.position = config.position;
    this.target = config.target;
    this.fov = config.fov ?? 60;
    this.enabled = config.enabled ?? true;
    this.updateInterval = config.updateInterval ?? 1000;
  }

  public shouldUpdate(now: number): boolean {
    return this.enabled && (now - this.lastUpdate >= this.updateInterval);
  }

  public updateSnapshot(snapshot: CameraSnapshot): void {
    this.currentSnapshot = snapshot;
    this.lastUpdate = Date.now();
  }

  public getSnapshot(): CameraSnapshot | null {
    return this.currentSnapshot;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public setPosition(position: Vector3): void {
    this.position = position;
  }

  public setTarget(target: Vector3): void {
    this.target = target;
  }

  public toJSON(): CameraConfig {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      position: this.position,
      target: this.target,
      fov: this.fov,
      enabled: this.enabled,
      updateInterval: this.updateInterval,
    };
  }
}

export class CameraSystem {
  private cameras: Map<string, Camera> = new Map();
  private activeCameraId: string | null = null;

  constructor() {
    this.initializeDefaultCameras();
  }

  private initializeDefaultCameras(): void {
    // Cámara 1: Vista aérea de la ciudad
    const cam1 = this.addCamera({
      id: 'aerial-city',
      name: 'Vista Aérea - Ciudad',
      description: 'Vista panorámica de la ciudad desde arriba',
      position: new Vector3(0, 100, 0),
      target: new Vector3(0, 0, 0),
      fov: 75,
      updateInterval: 2000,
    });
    // Snapshot inicial con placeholder (será reemplazado por captura real)
    cam1.updateSnapshot({
      id: 'aerial-city',
      name: 'Vista Aérea - Ciudad',
      description: 'Vista panorámica de la ciudad desde arriba',
      timestamp: Date.now(),
      imageData: this.generatePlaceholderImage('aerial'),
      players: 0,
      fps: 60,
    });

    // Cámara 2: Entrada del Hotel
    const cam2 = this.addCamera({
      id: 'hotel-entrance',
      name: 'Entrada Hotel Humboldt',
      description: 'Vista de la entrada principal del hotel',
      position: new Vector3(10, 5, -95),
      target: new Vector3(0, 2, -100),
      fov: 60,
      updateInterval: 1500,
    });
    cam2.updateSnapshot({
      id: 'hotel-entrance',
      name: 'Entrada Hotel Humboldt',
      description: 'Vista de la entrada principal del hotel',
      timestamp: Date.now(),
      imageData: this.generatePlaceholderImage('hotel'),
      players: 0,
      fps: 60,
    });

    // Cámara 3: Plaza Central
    const cam3 = this.addCamera({
      id: 'central-plaza',
      name: 'Plaza Central',
      description: 'Vista de la plaza central de la ciudad',
      position: new Vector3(50, 15, 50),
      target: new Vector3(0, 0, 0),
      fov: 70,
      updateInterval: 2000,
    });
    cam3.updateSnapshot({
      id: 'central-plaza',
      name: 'Plaza Central',
      description: 'Vista de la plaza central de la ciudad',
      timestamp: Date.now(),
      imageData: this.generatePlaceholderImage('plaza'),
      players: 0,
      fps: 60,
    });

    // NO iniciar auto-update aquí - las cámaras reales se encargarán de actualizar
    // this.startAutoUpdate();
  }

  private generatePlaceholderImage(type: 'aerial' | 'hotel' | 'plaza'): string {
    // Crear un canvas para generar una imagen placeholder
    if (typeof document === 'undefined') return ''; // SSR safety
    
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';
    
    // Gradiente de fondo según el tipo
    const gradient = ctx.createLinearGradient(0, 0, 0, 360);
    switch (type) {
      case 'aerial':
        gradient.addColorStop(0, '#87CEEB'); // Sky blue
        gradient.addColorStop(1, '#228B22'); // Forest green
        break;
      case 'hotel':
        gradient.addColorStop(0, '#FFD700'); // Gold
        gradient.addColorStop(1, '#8B4513'); // Brown
        break;
      case 'plaza':
        gradient.addColorStop(0, '#FF6B6B'); // Coral
        gradient.addColorStop(1, '#4ECDC4'); // Turquoise
        break;
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 640, 360);
    
    // Texto principal
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📹 CÁMARA EN VIVO', 320, 130);
    
    ctx.font = 'bold 32px Arial';
    ctx.fillText(type.toUpperCase(), 320, 180);
    
    // Subtexto
    ctx.font = '18px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('Vista simulada - Jugadores activos en el mundo', 320, 230);
    
    // Indicador LIVE
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(100, 50, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('LIVE', 120, 56);
    
    // Agregar iconos de jugadores simulados
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    const playerPositions = [
      { x: 150, y: 280 },
      { x: 320, y: 300 },
      { x: 490, y: 285 },
    ];
    
    playerPositions.forEach((pos, i) => {
      // Sombra
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillText('👤', pos.x + 2, pos.y + 2);
      // Jugador
      ctx.fillStyle = `hsl(${i * 120}, 70%, 60%)`;
      ctx.fillText('👤', pos.x, pos.y);
    });
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  private autoUpdateInterval: NodeJS.Timeout | null = null;

  private startAutoUpdate(): void {
    // Actualizar snapshots cada 3 segundos con datos simulados
    this.autoUpdateInterval = setInterval(() => {
      const cameras = this.getActiveCameras();
      cameras.forEach(camera => {
        const snapshot = camera.getSnapshot();
        if (snapshot) {
          // Actualizar con nuevos datos simulados
          camera.updateSnapshot({
            ...snapshot,
            timestamp: Date.now(),
            players: Math.floor(Math.random() * 10), // Simular jugadores
            fps: 55 + Math.floor(Math.random() * 10), // Simular FPS entre 55-65
          });
        }
      });
    }, 3000);
  }

  public stopAutoUpdate(): void {
    if (this.autoUpdateInterval) {
      clearInterval(this.autoUpdateInterval);
      this.autoUpdateInterval = null;
    }
  }

  public addCamera(config: CameraConfig): Camera {
    const camera = new Camera(config);
    this.cameras.set(camera.id, camera);
    
    // Si es la primera cámara, activarla
    if (this.cameras.size === 1) {
      this.activeCameraId = camera.id;
    }
    
    return camera;
  }

  public removeCamera(id: string): boolean {
    const removed = this.cameras.delete(id);
    
    // Si se eliminó la cámara activa, activar la primera disponible
    if (removed && this.activeCameraId === id) {
      const firstCamera = this.cameras.values().next().value;
      this.activeCameraId = firstCamera?.id ?? null;
    }
    
    return removed;
  }

  public getCamera(id: string): Camera | undefined {
    return this.cameras.get(id);
  }

  public getAllCameras(): Camera[] {
    return Array.from(this.cameras.values());
  }

  public getActiveCameras(): Camera[] {
    return this.getAllCameras().filter(cam => cam.enabled);
  }

  public setActiveCamera(id: string): boolean {
    const camera = this.cameras.get(id);
    if (camera && camera.enabled) {
      this.activeCameraId = id;
      return true;
    }
    return false;
  }

  public getActiveCamera(): Camera | null {
    return this.activeCameraId ? this.cameras.get(this.activeCameraId) ?? null : null;
  }

  public getCamerasNeedingUpdate(now: number): Camera[] {
    return this.getActiveCameras().filter(cam => cam.shouldUpdate(now));
  }

  public updateCameraSnapshot(id: string, snapshot: CameraSnapshot): void {
    const camera = this.cameras.get(id);
    if (camera) {
      camera.updateSnapshot(snapshot);
    }
  }

  public getAllSnapshots(): CameraSnapshot[] {
    return this.getAllCameras()
      .map(cam => cam.getSnapshot())
      .filter((snapshot): snapshot is CameraSnapshot => snapshot !== null);
  }

  public clear(): void {
    this.stopAutoUpdate();
    this.cameras.clear();
    this.activeCameraId = null;
  }
}

// Singleton instance
export const cameraSystem = new CameraSystem();

