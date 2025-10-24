import { Room, Client } from 'colyseus';

function getPhase(hour: number): 'night' | 'dawn' | 'day' | 'dusk' {
  if (hour < 5) return 'night';
  if (hour < 7) return 'dawn';
  if (hour < 18) return 'day';
  if (hour < 20) return 'dusk';
  return 'night';
}

function getLightFactors(hour: number): { ambientFactor: number; sunFactor: number } {
  const phase = getPhase(hour);
  switch (phase) {
    case 'night': return { ambientFactor: 0.15, sunFactor: 0.0 };
    case 'dawn': return { ambientFactor: 0.5, sunFactor: 0.4 };
    case 'day': return { ambientFactor: 1.0, sunFactor: 1.0 };
    case 'dusk': return { ambientFactor: 0.5, sunFactor: 0.4 };
  }
}

function currentTimeState() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const { ambientFactor, sunFactor } = getLightFactors(hour);
  return {
    serverTimestamp: now.getTime(),
    iso: now.toISOString(),
    hour,
    minute,
    second,
    dayOfWeek: now.getDay(),
    phase: getPhase(hour),
    ambientFactor,
    sunFactor,
  };
}

export class TimeEvents {
  private room: Room;
  private interval: NodeJS.Timeout | null = null;

  constructor(room: Room) {
    this.room = room;
    this.setupHandlers();
    this.startBroadcasts();
  }

  private setupHandlers() {
    this.room.onMessage('time:request', (client: Client) => {
      const state = currentTimeState();
      const now = Date.now();
      const msUntilNextMinute = 60000 - (now % 60000);
      client.send('time:state', { ...state, msUntilNextMinute });
    });
  }

  private startBroadcasts() {
    const tick = () => {
      const state = currentTimeState();
      this.room.broadcast('time:update', state);
    };
    const now = Date.now();
    const initialDelay = 60000 - (now % 60000) + 50;
    setTimeout(() => {
      tick();
      this.interval = setInterval(tick, 60000);
    }, initialDelay);
  }

  public dispose() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }
}
