export type TriggerKind = 'portal' | 'bank' | 'job' | 'shop' | 'custom';

export interface TriggerZoneData {
  id: string;
  kind: TriggerKind;
  name: string;
  position: { x: number; y: number; z: number };
  radius: number;
  data?: Record<string, any>;
}

export interface TriggerEvent<T = any> {
  triggerId: string;
  kind: TriggerKind;
  payload?: T;
}


