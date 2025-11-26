export type JobId = "car_wash" | "hotel_staff" | "delivery" | "taxi" | "custom";
// Nuevos IDs para ejemplos
// Nota: si luego prefieres, se pueden mover a otro archivo y extender el tipo con as const
export type ExtendedJobId =
  | JobId
  | "delivery_truck_10stops"
  | "uber_eats_8stops"
  | "construction_parts_12stops"
  | "harvest_tractor"
  | "trucker";

export interface JobRewardItem {
  itemId: string;
  quantity?: number;
}

export interface JobConfig {
  id: ExtendedJobId;
  name: string;
  description: string;
  mapId: string;
  basePay: number; // Pago base por unidad de progreso
  rewardItem?: JobRewardItem; // Item opcional como recompensa adicional
  maxProgress?: number; // Progreso máximo esperado (default 1)
  start?: {
    id: string;
    mapId: string;
    position: { x: number; y: number; z: number };
    radius: number;
    requiresVehicle?: boolean;
    label?: string;
  };
  // Configuración opcional para rutas (A->B->C) con esperas por punto
  route?: {
    waypoints: Waypoint[];
    rules?: RouteRules;
  };
  // Configuración opcional para trabajos por tiempo
  timed?: {
    ratePerMinute: number; // pago por minuto
    tickSeconds?: number; // frecuencia de abono
    maxMinutes?: number; // límite superior de pago
  };
}

export interface Waypoint {
  id: string; // identificador estable
  mapId: string;
  position: { x: number; y: number; z: number };
  radius: number; // metros
  waitSeconds?: number; // tiempo de espera requerido al llegar
  label?: string; // para UI (Carga, Descarga, Recoger comida...)
}

export interface RouteRules {
  payPerStop?: number; // paga por parada alcanzada
  completionBonus?: number; // bonus al completar ruta
  timeLimitSec?: number; // opcional: límite de tiempo total para bonus
}

export const JOBS: Record<ExtendedJobId, JobConfig> = {
  car_wash: {
    id: "car_wash",
    name: "Lavado de Autos",
    description: "Lava vehículos para ganar dinero.",
    mapId: "exterior",
    basePay: 25,
    rewardItem: { itemId: "potion_health", quantity: 1 },
    maxProgress: 5,
  },
  hotel_staff: {
    id: "hotel_staff",
    name: "Staff del Hotel",
    description: "Ayuda en operaciones del hotel.",
    mapId: "hotel-interior",
    basePay: 40,
    rewardItem: { itemId: "coin_gold", quantity: 10 },
    maxProgress: 3,
  },
  delivery: {
    id: "delivery",
    name: "Repartidor",
    description: "Entrega paquetes por la ciudad.",
    mapId: "exterior",
    basePay: 35,
    maxProgress: 3,
    start: {
      id: "delivery_start",
      mapId: "exterior",
      position: { x: -5, y: 1, z: 20 },
      radius: 3,
      requiresVehicle: true,
      label: "Inicio de Ruta",
    },
    route: {
      waypoints: [
        {
          id: "stop_1",
          mapId: "exterior",
          position: { x: 10, y: 1, z: 15 },
          radius: 2,
          waitSeconds: 10,
          label: "Entrega 1",
        },
        {
          id: "stop_2",
          mapId: "exterior",
          position: { x: 18, y: 1, z: -5 },
          radius: 2,
          waitSeconds: 10,
          label: "Entrega 2",
        },
        {
          id: "return_hub",
          mapId: "exterior",
          position: { x: -5, y: 1, z: 20 },
          radius: 2,
          waitSeconds: 15,
          label: "Retorno al Hub",
        },
      ],
      rules: { payPerStop: 20, completionBonus: 60, timeLimitSec: 900 },
    },
  },
  taxi: {
    id: "taxi",
    name: "Conductor de Taxi",
    description: "Lleva NPCs a su destino.",
    mapId: "exterior",
    basePay: 45,
    maxProgress: 4,
  },
  custom: {
    id: "custom",
    name: "Trabajo Personalizado",
    description: "Trabajo definido por el gameplay.",
    mapId: "exterior",
    basePay: 10,
  },
  // Camionero con 10 paradas (exterior)
  delivery_truck_10stops: {
    id: "delivery_truck_10stops",
    name: "Camionero (10 paradas)",
    description: "Entrega paquetería a 10 destinos y vuelve al hub.",
    mapId: "exterior",
    basePay: 10,
    route: {
      waypoints: [
        {
          id: "hub",
          mapId: "exterior",
          position: { x: -6, y: 1, z: 18 },
          radius: 2,
          waitSeconds: 30,
          label: "Cargar en Hub",
        },
        {
          id: "p1",
          mapId: "exterior",
          position: { x: 8, y: 1, z: 14 },
          radius: 2,
          waitSeconds: 10,
          label: "Entrega 1",
        },
        {
          id: "p2",
          mapId: "exterior",
          position: { x: 14, y: 1, z: 8 },
          radius: 2,
          waitSeconds: 10,
          label: "Entrega 2",
        },
        {
          id: "p3",
          mapId: "exterior",
          position: { x: 18, y: 1, z: 2 },
          radius: 2,
          waitSeconds: 10,
          label: "Entrega 3",
        },
        {
          id: "p4",
          mapId: "exterior",
          position: { x: 16, y: 1, z: -4 },
          radius: 2,
          waitSeconds: 10,
          label: "Entrega 4",
        },
        {
          id: "p5",
          mapId: "exterior",
          position: { x: 10, y: 1, z: -10 },
          radius: 2,
          waitSeconds: 10,
          label: "Entrega 5",
        },
        {
          id: "p6",
          mapId: "exterior",
          position: { x: 4, y: 1, z: -14 },
          radius: 2,
          waitSeconds: 10,
          label: "Entrega 6",
        },
        {
          id: "p7",
          mapId: "exterior",
          position: { x: -2, y: 1, z: -16 },
          radius: 2,
          waitSeconds: 10,
          label: "Entrega 7",
        },
        {
          id: "p8",
          mapId: "exterior",
          position: { x: -8, y: 1, z: -12 },
          radius: 2,
          waitSeconds: 10,
          label: "Entrega 8",
        },
        {
          id: "p9",
          mapId: "exterior",
          position: { x: -12, y: 1, z: -4 },
          radius: 2,
          waitSeconds: 10,
          label: "Entrega 9",
        },
        {
          id: "p10",
          mapId: "exterior",
          position: { x: -10, y: 1, z: 8 },
          radius: 2,
          waitSeconds: 10,
          label: "Entrega 10",
        },
        {
          id: "return",
          mapId: "exterior",
          position: { x: -6, y: 1, z: 18 },
          radius: 2,
          waitSeconds: 20,
          label: "Descarga y Retorno",
        },
      ],
      rules: { payPerStop: 15, completionBonus: 150, timeLimitSec: 1800 },
    },
  },
  trucker: {
    id: "trucker",
    name: "Camionero Profesional",
    description: "Transporte de carga pesada. Requiere camión.",
    mapId: "exterior",
    basePay: 100,
    maxProgress: 4,
    start: {
      id: "trucker_start",
      mapId: "exterior",
      position: { x: 60, y: 1, z: 60 },
      radius: 5,
      requiresVehicle: true,
      label: "Iniciar Ruta de Carga",
    },
    route: {
      waypoints: [
        {
          id: "load_point",
          mapId: "exterior",
          position: { x: 70, y: 1, z: 50 },
          radius: 4,
          waitSeconds: 15,
          label: "Cargar Mercancía (Punto A)",
        },
        {
          id: "unload_point_b",
          mapId: "exterior",
          position: { x: -20, y: 1, z: -20 },
          radius: 4,
          waitSeconds: 15,
          label: "Descargar (Punto B)",
        },
        {
          id: "load_point_c",
          mapId: "exterior",
          position: { x: -30, y: 1, z: 30 },
          radius: 4,
          waitSeconds: 15,
          label: "Recargar (Punto C)",
        },
        {
          id: "return_base",
          mapId: "exterior",
          position: { x: 60, y: 1, z: 60 },
          radius: 4,
          waitSeconds: 10,
          label: "Entregar y Finalizar",
        },
      ],
      rules: { payPerStop: 50, completionBonus: 500, timeLimitSec: 1200 },
    },
  },
  // Uber Eats con esperas más largas por recogida/entrega
  uber_eats_8stops: {
    id: "uber_eats_8stops",
    name: "Uber Eats (8 paradas)",
    description: "Recoge y entrega pedidos con espera más larga en cada punto.",
    mapId: "exterior",
    basePay: 8,
    route: {
      waypoints: [
        {
          id: "restaurant",
          mapId: "exterior",
          position: { x: -2, y: 1, z: 22 },
          radius: 2,
          waitSeconds: 40,
          label: "Recoger comida",
        },
        {
          id: "c1",
          mapId: "exterior",
          position: { x: 6, y: 1, z: 18 },
          radius: 2,
          waitSeconds: 20,
          label: "Entrega 1",
        },
        {
          id: "c2",
          mapId: "exterior",
          position: { x: 12, y: 1, z: 10 },
          radius: 2,
          waitSeconds: 20,
          label: "Entrega 2",
        },
        {
          id: "restaurant2",
          mapId: "exterior",
          position: { x: 14, y: 1, z: -2 },
          radius: 2,
          waitSeconds: 35,
          label: "Recoger comida",
        },
        {
          id: "c3",
          mapId: "exterior",
          position: { x: 6, y: 1, z: -8 },
          radius: 2,
          waitSeconds: 20,
          label: "Entrega 3",
        },
        {
          id: "c4",
          mapId: "exterior",
          position: { x: -4, y: 1, z: -10 },
          radius: 2,
          waitSeconds: 20,
          label: "Entrega 4",
        },
        {
          id: "restaurant3",
          mapId: "exterior",
          position: { x: -10, y: 1, z: -2 },
          radius: 2,
          waitSeconds: 35,
          label: "Recoger comida",
        },
        {
          id: "c5",
          mapId: "exterior",
          position: { x: -12, y: 1, z: 10 },
          radius: 2,
          waitSeconds: 20,
          label: "Entrega 5",
        },
        {
          id: "c6",
          mapId: "exterior",
          position: { x: -8, y: 1, z: 18 },
          radius: 2,
          waitSeconds: 20,
          label: "Entrega 6",
        },
        {
          id: "return_r",
          mapId: "exterior",
          position: { x: -2, y: 1, z: 22 },
          radius: 2,
          waitSeconds: 25,
          label: "Retorno a restaurante",
        },
      ],
      rules: { payPerStop: 12, completionBonus: 100, timeLimitSec: 2400 },
    },
  },
  // Transporte de piezas de construcción (12 paradas)
  construction_parts_12stops: {
    id: "construction_parts_12stops",
    name: "Transportista de Piezas (12)",
    description:
      "Distribuye materiales a múltiples obras y vuelve al depósito.",
    mapId: "exterior",
    basePay: 12,
    route: {
      waypoints: [
        {
          id: "depot",
          mapId: "exterior",
          position: { x: -14, y: 1, z: 16 },
          radius: 2,
          waitSeconds: 30,
          label: "Cargar en Depósito",
        },
        {
          id: "s1",
          mapId: "exterior",
          position: { x: -2, y: 1, z: 12 },
          radius: 2,
          waitSeconds: 15,
          label: "Obra 1",
        },
        {
          id: "s2",
          mapId: "exterior",
          position: { x: 6, y: 1, z: 6 },
          radius: 2,
          waitSeconds: 15,
          label: "Obra 2",
        },
        {
          id: "s3",
          mapId: "exterior",
          position: { x: 10, y: 1, z: 0 },
          radius: 2,
          waitSeconds: 15,
          label: "Obra 3",
        },
        {
          id: "s4",
          mapId: "exterior",
          position: { x: 8, y: 1, z: -6 },
          radius: 2,
          waitSeconds: 15,
          label: "Obra 4",
        },
        {
          id: "s5",
          mapId: "exterior",
          position: { x: 2, y: 1, z: -10 },
          radius: 2,
          waitSeconds: 15,
          label: "Obra 5",
        },
        {
          id: "s6",
          mapId: "exterior",
          position: { x: -4, y: 1, z: -12 },
          radius: 2,
          waitSeconds: 15,
          label: "Obra 6",
        },
        {
          id: "s7",
          mapId: "exterior",
          position: { x: -10, y: 1, z: -8 },
          radius: 2,
          waitSeconds: 15,
          label: "Obra 7",
        },
        {
          id: "s8",
          mapId: "exterior",
          position: { x: -14, y: 1, z: -2 },
          radius: 2,
          waitSeconds: 15,
          label: "Obra 8",
        },
        {
          id: "s9",
          mapId: "exterior",
          position: { x: -12, y: 1, z: 6 },
          radius: 2,
          waitSeconds: 15,
          label: "Obra 9",
        },
        {
          id: "s10",
          mapId: "exterior",
          position: { x: -6, y: 1, z: 12 },
          radius: 2,
          waitSeconds: 15,
          label: "Obra 10",
        },
        {
          id: "s11",
          mapId: "exterior",
          position: { x: 0, y: 1, z: 16 },
          radius: 2,
          waitSeconds: 15,
          label: "Obra 11",
        },
        {
          id: "return_d",
          mapId: "exterior",
          position: { x: -14, y: 1, z: 16 },
          radius: 2,
          waitSeconds: 30,
          label: "Descarga y Retorno",
        },
      ],
      rules: { payPerStop: 18, completionBonus: 180, timeLimitSec: 3000 },
    },
  },
  // Trabajo por tiempo (tractor/cosecha)
  harvest_tractor: {
    id: "harvest_tractor",
    name: "Cosecha en Tractor",
    description: "Opera un tractor y cobra por tiempo de trabajo.",
    mapId: "exterior",
    basePay: 0,
    timed: { ratePerMinute: 25, tickSeconds: 10, maxMinutes: 60 },
  },
};
