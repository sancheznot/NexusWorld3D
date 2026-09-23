import { colyseusClient } from '@/lib/colyseus/client';
import {
  TimeRequest,
  TimeStateResponse,
  TimeUpdateResponse,
  TimeStateCallback,
  TimeUpdateCallback,
} from '@/types/time-sync.types';

export class TimeClient {
  private static instance: TimeClient;
  private eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();
  private roomSubscriptions: (() => void)[] = [];

  private constructor() {
    this.bindToRoomLifecycle();
  }

  public static getInstance(): TimeClient {
    if (!TimeClient.instance) TimeClient.instance = new TimeClient();
    return TimeClient.instance;
  }

  private bindToRoomLifecycle() {
    colyseusClient.on('room:connected', () => this.setupEventListeners());
    colyseusClient.on('room:left', () => this.detachRoom());
  }

  private detachRoom() {
    this.roomSubscriptions.splice(0).forEach(unsubscribe => unsubscribe());
  }

  private setupEventListeners() {
    this.detachRoom();
    if (!colyseusClient.isConnectedToWorldRoom()) return;
    const room = colyseusClient.getSocket();
    if (!room) return;

    this.roomSubscriptions.push(
      room.onMessage('time:state', (data: TimeStateResponse) => this.emit('time:state', data)),
      room.onMessage('time:update', (data: TimeUpdateResponse) => this.emit('time:update', data)),
    );
  }

  public requestTime(data?: TimeRequest): void {
    if (!colyseusClient.isConnectedToWorldRoom()) return;
    colyseusClient.getSocket()?.send('time:request', data || {});
  }

  public onTimeState(cb: TimeStateCallback) { this.on('time:state', cb); }
  public onTimeUpdate(cb: TimeUpdateCallback) { this.on('time:update', cb); }

  public on<T>(event: string, callback: (data: T) => void) {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
    this.eventListeners.get(event)!.push(callback as (data: unknown) => void);
  }

  public off<T>(event: string, callback?: (data: T) => void) {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;
    if (!callback) { this.eventListeners.set(event, []); return; }
    const idx = listeners.indexOf(callback as (data: unknown) => void);
    if (idx > -1) listeners.splice(idx, 1);
  }

  public emit(event: string, data: unknown) {
    const listeners = this.eventListeners.get(event);
    if (listeners) listeners.forEach(cb => cb(data));
  }

  public removeAllListeners() {
    this.eventListeners.clear();
  }
}

export const timeClient = TimeClient.getInstance();
export default timeClient;
