"use client";

import { useEffect } from "react";
import { WorldMessages } from "@nexusworld3d/protocol";
import { colyseusClient } from "@/lib/colyseus/client";
import { useUIStore } from "@/store/uiStore";

type ChopResult = {
  ok?: boolean;
  treeId?: string;
  message?: string;
  felled?: boolean;
  logQty?: number;
  hitsRemaining?: number;
};

/**
 * ES: Escucha `world:tree-chop-result` (emitido desde ColyseusClient) y muestra toasts.
 * EN: Subscribes to chop results and shows HUD notifications.
 */
export default function TreeChopFeedback() {
  const addNotification = useUIStore((s) => s.addNotification);

  useEffect(() => {
    const onResult = (raw: unknown) => {
      const d = raw as ChopResult;
      if (d?.ok) return;
      if (d?.message) {
        addNotification({
          id: `chop-err-${Date.now()}`,
          type: "warning",
          title: "Talar",
          message: d.message,
          duration: 4000,
          timestamp: new Date(),
        });
      }
    };

    colyseusClient.on(WorldMessages.TreeChopResult, onResult);
    return () => {
      colyseusClient.off(WorldMessages.TreeChopResult, onResult);
    };
  }, [addNotification]);

  useEffect(() => {
    const onRock = (raw: unknown) => {
      const d = raw as { ok?: boolean; rockId?: string; message?: string };
      if (d?.ok) return;
      if (d?.message) {
        addNotification({
          id: `mine-err-${Date.now()}`,
          type: "warning",
          title: "Minar",
          message: d.message,
          duration: 4000,
          timestamp: new Date(),
        });
      }
    };
    colyseusClient.on(WorldMessages.RockMineResult, onRock);
    return () => {
      colyseusClient.off(WorldMessages.RockMineResult, onRock);
    };
  }, [addNotification]);

  return null;
}
