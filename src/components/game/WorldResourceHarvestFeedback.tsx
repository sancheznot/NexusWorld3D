"use client";

import { useEffect } from "react";
import { WorldMessages } from "@nexusworld3d/protocol";
import { colyseusClient } from "@/lib/colyseus/client";
import { useUIStore } from "@/store/uiStore";

type HarvestResult = {
  ok?: boolean;
  nodeId?: string;
  message?: string;
};

/**
 * ES: Errores de `world:harvest-node-result` (cooldown, distancia, inventario).
 * EN: Failed harvest feedback from server.
 */
export default function WorldResourceHarvestFeedback() {
  const addNotification = useUIStore((s) => s.addNotification);

  useEffect(() => {
    const onResult = (raw: unknown) => {
      const d = raw as HarvestResult;
      if (d?.ok) return;
      if (d?.message) {
        addNotification({
          id: `harvest-err-${Date.now()}`,
          type: "warning",
          title: "Recolección",
          message: d.message,
          duration: 4000,
          timestamp: new Date(),
        });
      }
    };

    colyseusClient.on(WorldMessages.HarvestNodeResult, onResult);
    return () => {
      colyseusClient.off(WorldMessages.HarvestNodeResult, onResult);
    };
  }, [addNotification]);

  return null;
}
