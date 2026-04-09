export type TriggerKind =
  | 'portal'
  | 'bank'
  | 'job'
  | 'shop'
  | 'housing_plot'
  | 'resource_node'
  | 'farm_slot'
  | 'custom';

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


