export type DayPhase = 'night' | 'dawn' | 'day' | 'dusk';

export interface TimeState {
  serverTimestamp: number;
  iso: string;
  hour: number;
  minute: number;
  second: number;
  dayOfWeek: number;
  phase: DayPhase;
  ambientFactor: number;
  sunFactor: number;
}

export interface TimeStateResponse extends TimeState {
  msUntilNextMinute?: number;
}

export type TimeUpdateResponse = TimeState;

export interface TimeRequest {
  tz?: string;
}

export type TimeEventCallback<T> = (data: T) => void;
export type TimeStateCallback = TimeEventCallback<TimeStateResponse>;
export type TimeUpdateCallback = TimeEventCallback<TimeUpdateResponse>;

export type TimeEventType = 'time:state' | 'time:update' | 'time:error';
