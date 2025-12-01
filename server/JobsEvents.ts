import { Room, Client } from "colyseus";
import { JOBS, ExtendedJobId } from "../src/constants/jobs";
import { InventoryItem } from "../src/types/inventory.types";

interface ActiveJobState {
  userId: string;
  jobId: ExtendedJobId;
  startedAt: number;
  progress: number; // 0..maxProgress o índice de waypoint
  // Ruta
  currentWaypointIdx?: number;
  waitUntilTs?: number; // timestamp cuando termina la espera requerida
  // Timed job
  lastTickTs?: number;
  accruedMajor?: number; // acumulado a pagar en complete
}

export class JobsEvents {
  private room: Room;
  private active = new Map<string, ActiveJobState>();
  private grantItemToPlayer: (
    playerId: string,
    item: Omit<InventoryItem, "id" | "isEquipped" | "slot">
  ) => void;
  private getPlayerMapId: (playerId: string) => string | null;
  private getPlayerRole: (playerId: string) => ExtendedJobId | null;
  private setPlayerRole: (
    playerId: string,
    roleId: ExtendedJobId | null
  ) => void;
  private economy: {
    creditWalletMajor: (
      userId: string,
      amount: number,
      reason?: string
    ) => void;
  };

  constructor(
    room: Room,
    opts: {
      grantItemToPlayer: (
        playerId: string,
        item: Omit<InventoryItem, "id" | "isEquipped" | "slot">
      ) => void;
      getPlayerMapId: (playerId: string) => string | null;
      getPlayerRole: (playerId: string) => ExtendedJobId | null;
      setPlayerRole: (playerId: string, roleId: ExtendedJobId | null) => void;
      economy: {
        creditWalletMajor: (
          userId: string,
          amount: number,
          reason?: string
        ) => void;
      };
    }
  ) {
    this.room = room;
    this.grantItemToPlayer = opts.grantItemToPlayer;
    this.getPlayerMapId = opts.getPlayerMapId;
    this.getPlayerRole = opts.getPlayerRole;
    this.setPlayerRole = opts.setPlayerRole;
    this.economy = opts.economy;
    this.setupHandlers();
  }

  private setupHandlers() {
    // List jobs available in current map
    this.room.onMessage("jobs:list", (client: Client) => {
      const mapId = this.getPlayerMapId(client.sessionId) || "exterior";
      const jobs = Object.values(JOBS).filter((j) => j.mapId === mapId);
      client.send("jobs:list", {
        jobs: jobs.map((j) => ({ id: j.id, name: j.name, basePay: j.basePay })),
      });
    });

    // Request job details
    this.room.onMessage(
      "jobs:request",
      (client: Client, data: { jobId: ExtendedJobId }) => {
        const cfg = JOBS[data.jobId];
        if (!cfg) {
          client.send("jobs:error", { message: "Trabajo no encontrado" });
          return;
        }
        const mapId = this.getPlayerMapId(client.sessionId) || "exterior";
        if (cfg.mapId !== mapId) {
          client.send("jobs:error", {
            message: "Trabajo no disponible en este mapa",
          });
          return;
        }
        client.send("jobs:data", {
          id: cfg.id,
          name: cfg.name,
          description: cfg.description,
          basePay: cfg.basePay,
          maxProgress: cfg.maxProgress ?? 1,
          rewardItem: cfg.rewardItem ?? null,
        });
      }
    );

    // Assign role without starting job
    this.room.onMessage(
      "jobs:role:assign",
      (client: Client, data: { jobId: ExtendedJobId }) => {
        const cfg = JOBS[data.jobId];
        if (!cfg) {
          client.send("jobs:error", { message: "Trabajo no encontrado" });
          return;
        }
        const mapId = this.getPlayerMapId(client.sessionId) || "exterior";
        if (cfg.mapId !== mapId) {
          client.send("jobs:error", {
            message: "Trabajo no disponible en este mapa",
          });
          return;
        }
        this.active.delete(client.sessionId);
        this.setPlayerRole(client.sessionId, cfg.id);
        client.send("jobs:role:assigned", { jobId: cfg.id });
      }
    );

    // Start a job
    this.room.onMessage(
      "jobs:start",
      (client: Client, data: { jobId: ExtendedJobId }) => {
        const cfg = JOBS[data.jobId];
        if (!cfg) {
          client.send("jobs:error", { message: "Trabajo no encontrado" });
          return;
        }
        const mapId = this.getPlayerMapId(client.sessionId) || "exterior";
        if (cfg.mapId !== mapId) {
          client.send("jobs:error", {
            message: "Trabajo no disponible en este mapa",
          });
          return;
        }
        const currentRole = this.getPlayerRole(client.sessionId);
        if (currentRole !== cfg.id) {
          client.send("jobs:error", {
            message: `Debes tener el rol de ${cfg.name} para iniciar este trabajo`,
          });
          return;
        }
        if (this.active.has(client.sessionId)) {
          client.send("jobs:error", { message: "Ya tienes un trabajo activo" });
          return;
        }
        const now = Date.now();
        const state: ActiveJobState = {
          userId: client.sessionId,
          jobId: cfg.id,
          startedAt: now,
          progress: 0,
        };
        if (cfg.route?.waypoints?.length) {
          state.currentWaypointIdx = 0;
          const wp = cfg.route.waypoints[0];
          if (wp.waitSeconds && wp.waitSeconds > 0)
            state.waitUntilTs = now + wp.waitSeconds * 1000;
        }
        if (cfg.timed) {
          state.lastTickTs = now;
          state.accruedMajor = 0;
        }
        this.active.set(client.sessionId, state);
        client.send("jobs:started", {
          jobId: state.jobId,
          startedAt: state.startedAt,
        });
        if (cfg.route?.waypoints?.length) {
          const first = cfg.route.waypoints[0];
          client.send("jobs:next", {
            waypointId: first.id,
            label: first.label,
            waitSeconds: first.waitSeconds ?? 0,
            position: first.position,
            mapId: first.mapId,
          });
        }
      }
    );

    // Update progress (server trusts client minimally; clamps)
    this.room.onMessage(
      "jobs:progress",
      (client: Client, data: { progress: number }) => {
        const state = this.active.get(client.sessionId);
        if (!state) {
          client.send("jobs:error", { message: "No tienes un trabajo activo" });
          return;
        }
        const cfg = JOBS[state.jobId];
        const max = Math.max(1, cfg.maxProgress ?? 1);
        const next = Math.min(max, Math.max(0, Math.floor(data.progress)));
        state.progress = next;
        client.send("jobs:progress", {
          jobId: state.jobId,
          progress: state.progress,
          maxProgress: max,
        });
      }
    );

    // Waypoint hit (para RouteJob)
    this.room.onMessage(
      "jobs:waypointHit",
      (client: Client, data: { waypointId: string }) => {
        const state = this.active.get(client.sessionId);
        if (!state) {
          client.send("jobs:error", { message: "No tienes un trabajo activo" });
          return;
        }
        const cfg = JOBS[state.jobId];
        const route = cfg.route;
        if (!route?.waypoints?.length) {
          client.send("jobs:error", { message: "Este trabajo no es de ruta" });
          return;
        }
        const idx = state.currentWaypointIdx ?? 0;
        const nextWp = route.waypoints[idx];
        if (!nextWp || nextWp.id !== data.waypointId) {
          client.send("jobs:error", { message: "Punto incorrecto" });
          return;
        }
        const now = Date.now();
        // Verificar espera requerida
        if (state.waitUntilTs && now < state.waitUntilTs) {
          const remaining = Math.ceil((state.waitUntilTs - now) / 1000);
          client.send("jobs:wait", {
            seconds: remaining,
            waypointId: data.waypointId,
          });
          return;
        }
        // Acreditar pago por parada si aplica
        if (route.rules?.payPerStop) {
          this.economy.creditWalletMajor(
            client.sessionId,
            route.rules.payPerStop,
            `job:${cfg.id}:stop:${nextWp.id}`
          );
        }
        // Avanzar al siguiente waypoint o completar
        const nextIdx = idx + 1;
        if (nextIdx >= route.waypoints.length) {
          // Completed route
          const payout = cfg.basePay + (route.rules?.completionBonus ?? 0);
          this.economy.creditWalletMajor(
            client.sessionId,
            payout,
            `job:${cfg.id}:complete`
          );
          this.active.delete(client.sessionId);
          client.send("jobs:completed", { jobId: cfg.id, payout });
          return;
        }
        state.currentWaypointIdx = nextIdx;
        const wp = route.waypoints[nextIdx];
        if (wp.waitSeconds && wp.waitSeconds > 0)
          state.waitUntilTs = now + wp.waitSeconds * 1000;
        else state.waitUntilTs = undefined;
        state.progress = nextIdx;
        client.send("jobs:progress", {
          jobId: state.jobId,
          progress: state.progress,
          maxProgress: route.waypoints.length,
        });
        client.send("jobs:next", {
          waypointId: wp.id,
          label: wp.label,
          waitSeconds: wp.waitSeconds ?? 0,
          position: wp.position,
          mapId: wp.mapId,
        });
      }
    );

    // Cancel job
    this.room.onMessage("jobs:cancel", (client: Client) => {
      const ok = this.active.delete(client.sessionId);
      if (ok) client.send("jobs:cancelled", {});
      else
        client.send("jobs:error", { message: "No hay trabajo para cancelar" });
    });

    // Complete job => pay wallet and optional item reward; también liquidar timed accrual
    this.room.onMessage("jobs:complete", (client: Client) => {
      const state = this.active.get(client.sessionId);
      if (!state) {
        client.send("jobs:error", { message: "No tienes un trabajo activo" });
        return;
      }
      const cfg = JOBS[state.jobId];
      if (cfg.route?.waypoints?.length) {
        client.send("jobs:error", {
          message: "Completa la ruta para cobrar automáticamente",
        });
        return;
      }
      const max = Math.max(1, cfg.maxProgress ?? 1);
      const progress = Math.min(max, Math.max(0, state.progress));
      if (progress <= 0) {
        client.send("jobs:error", {
          message: "Aún no has avanzado en este trabajo",
        });
        return;
      }
      let payout = cfg.basePay * progress;
      // Timed accrual
      if (cfg.timed) {
        const now = Date.now();
        const tickSec = cfg.timed.tickSeconds ?? 10;
        const ratePerMinute = cfg.timed.ratePerMinute;
        const elapsedMs = now - (state.lastTickTs ?? now);
        const elapsedSec = Math.floor(elapsedMs / 1000);
        const periods = Math.floor(elapsedSec / tickSec);
        if (periods > 0) {
          const perSecond = ratePerMinute / 60;
          payout += perSecond * (periods * tickSec);
        }
        // cap by maxMinutes
        if (cfg.timed.maxMinutes) {
          const totalElapsedMin = (now - state.startedAt) / 60000;
          if (totalElapsedMin > cfg.timed.maxMinutes) {
            const over = totalElapsedMin - cfg.timed.maxMinutes;
            void over; // sólo indicativo
          }
        }
      }
      // Credit wallet (net handled in EconomyEvents)
      this.economy.creditWalletMajor(client.sessionId, payout, `job:${cfg.id}`);
      // Optional item reward
      if (cfg.rewardItem) {
        this.grantItemToPlayer(client.sessionId, {
          itemId: cfg.rewardItem.itemId,
          name: cfg.rewardItem.itemId,
          description: cfg.name,
          type: "misc" as unknown as InventoryItem["type"],
          rarity: "common" as unknown as InventoryItem["rarity"],
          quantity: cfg.rewardItem.quantity ?? 1,
          maxStack: 99,
          weight: 0,
          level: 1,
          icon: "🎁",
        });
      }
      this.active.delete(client.sessionId);
      client.send("jobs:completed", { jobId: cfg.id, payout });
    });
  }
}
