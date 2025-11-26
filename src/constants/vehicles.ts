export type VehicleId = 'car_07';

export interface VehicleConfig {
  id: VehicleId;
  name: string;
  path: string; // GLB path under public/
  type: 'glb' | 'gltf' | 'fbx' | 'obj';
  category: 'vehicle';
  length?: number; // meters
  width?: number;
  height?: number;
}

export const VEHICLES_CATALOG: Record<VehicleId, VehicleConfig> = {
  car_07: {
    id: 'car_07',
    name: 'Car 07',
    path: '/models/vehicles/cars/Car_07.glb',
    type: 'glb',
    category: 'vehicle',
    length: 4.2,
    width: 1.8,
    height: 1.4,
  },
};


