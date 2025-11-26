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

  private constructor() {
    this.bindToRoomLifecycle();
  }

  public static getInstance(): TimeClient {
    if (!TimeClient.instance) TimeClient.instance = new TimeClient();
    return TimeClient.instance;
  }

  private bindToRoomLifecycle() {
    colyseusClient.on('room:connected', () => this.setupEventListeners());
    colyseusClient.on('room:left', () => this.removeAllListeners());
  }

  private setupEventListeners() {
    const room = colyseusClient.getSocket();
    if (!room) return;

    room.onMessage('time:state', (data: TimeStateResponse) => this.emit('time:state', data));
    room.onMessage('time:update', (data: TimeUpdateResponse) => this.emit('time:update', data));
  }

  public requestTime(data?: TimeRequest): void {
    colyseusClient.getSocket()?.send('time:request', data || {});
  }

  public onTimeState(cb: TimeStateCallback) { this.on('time:state', cb as any); }
  public onTimeUpdate(cb: TimeUpdateCallback) { this.on('time:update', cb as any); }

  public on(event: string, callback: (data: unknown) => void) {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback?: (data: unknown) => void) {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;
    if (!callback) { this.eventListeners.set(event, []); return; }
    const idx = listeners.indexOf(callback);
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
