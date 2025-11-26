import { colyseusClient } from './client';

type JobsList = { jobs: { id: string; name: string; basePay: number }[] };
type JobData = { id: string; name: string; description: string; basePay: number; maxProgress: number; rewardItem?: { itemId: string; quantity?: number } | null };
type JobWait = { seconds: number };
type JobNext = { waypointId: string; label?: string; waitSeconds: number; position?: { x: number; y: number; z: number }; mapId?: string };

export class JobsClient {
  private static instance: JobsClient;
  private listeners = new Map<string, ((data: unknown) => void)[]>();
  private currentJob: JobData | null = null;

  static getInstance(): JobsClient {
    if (!JobsClient.instance) JobsClient.instance = new JobsClient();
    return JobsClient.instance;
  }

  private constructor() {
    colyseusClient.on('room:connected', () => this.setup());
  }

  private setup() {
    const room = colyseusClient.getSocket();
    if (!room) return;
    room.onMessage('jobs:list', (data: JobsList) => this.emit('jobs:list', data));
    room.onMessage('jobs:data', (data: JobData) => { this.currentJob = data; this.emit('jobs:data', data); });
    room.onMessage('jobs:error', (data: { message: string }) => this.emit('jobs:error', data));
    room.onMessage('jobs:started', (data: { jobId: string; startedAt: number }) => this.emit('jobs:started', data));
    room.onMessage('jobs:progress', (data: { jobId: string; progress: number; maxProgress: number }) => this.emit('jobs:progress', data));
    room.onMessage('jobs:completed', (data: { jobId: string; payout: number }) => this.emit('jobs:completed', data));
    room.onMessage('jobs:cancelled', (data: Record<string, never>) => this.emit('jobs:cancelled', data));
    room.onMessage('jobs:wait', (data: JobWait) => this.emit('jobs:wait', data));
    room.onMessage('jobs:next', (data: JobNext) => this.emit('jobs:next', data));
    room.onMessage('jobs:role:assigned', (data: { jobId: string }) => this.emit('jobs:role:assigned', data));
  }

  requestJobs() { colyseusClient.getSocket()?.send('jobs:list'); }
  openJob(jobId: string) { colyseusClient.getSocket()?.send('jobs:request', { jobId }); }
  assignRole(jobId: string) { colyseusClient.getSocket()?.send('jobs:role:assign', { jobId }); }
  start(jobId: string) { colyseusClient.getSocket()?.send('jobs:start', { jobId }); }
  updateProgress(progress: number) { colyseusClient.getSocket()?.send('jobs:progress', { progress }); }
  hitWaypoint(waypointId: string) { colyseusClient.getSocket()?.send('jobs:waypointHit', { waypointId }); }
  cancel() { colyseusClient.getSocket()?.send('jobs:cancel'); }
  complete() { colyseusClient.getSocket()?.send('jobs:complete'); }

  on(event: 'jobs:list' | 'jobs:data' | 'jobs:error' | 'jobs:started' | 'jobs:progress' | 'jobs:completed' | 'jobs:cancelled' | 'jobs:wait' | 'jobs:next' | 'jobs:role:assigned', cb: (data: unknown) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(cb);
  }
  off(event: string, cb: (data: unknown) => void) {
    const arr = this.listeners.get(event);
    if (!arr) return;
    const i = arr.indexOf(cb);
    if (i > -1) arr.splice(i, 1);
  }
  private emit(event: string, data: unknown) { this.listeners.get(event)?.forEach(fn => fn(data)); }

  getCurrentJob() { return this.currentJob; }
}

export const jobsClient = JobsClient.getInstance();
export default jobsClient;


