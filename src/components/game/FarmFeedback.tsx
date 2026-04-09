"use client";

import { useEffect, useRef } from "react";
import { FarmMessages } from "@nexusworld3d/protocol";
import { colyseusClient } from "@/lib/colyseus/client";
import { useUIStore } from "@/store/uiStore";

type FarmResult = {
  ok?: boolean;
  action?: string;
  message?: string;
  slotIndex?: number;
  msLeft?: number;
  cropId?: string;
};

/**
 * ES: Toasts para plantar / creciendo / errores de huerto.
 * EN: Farm plant / growing / error toasts.
 */
export default function FarmFeedback() {
  const addNotification = useUIStore((s) => s.addNotification);
  const lastGrowingToastAt = useRef(0);

  useEffect(() => {
    const onFarm = (raw: unknown) => {
      const d = raw as FarmResult;
      if (d?.ok && d.action === "planted") {
        addNotification({
          id: `farm-p-${Date.now()}`,
          type: "success",
          title: "Huerto",
          message: "Sembrado — vuelve cuando esté listo.",
          duration: 3500,
          timestamp: new Date(),
        });
        return;
      }
      if (d?.action === "growing" && typeof d.msLeft === "number") {
        const now = Date.now();
        if (now - lastGrowingToastAt.current < 2500) return;
        lastGrowingToastAt.current = now;
        const sec = Math.max(1, Math.ceil(d.msLeft / 1000));
        addNotification({
          id: `farm-g-${Date.now()}`,
          type: "info",
          title: "Huerto",
          message: `Aún crece — ~${sec}s restantes.`,
          duration: 2800,
          timestamp: new Date(),
        });
        return;
      }
      if (d?.ok === false && d.action === "error" && d.message) {
        addNotification({
          id: `farm-e-${Date.now()}`,
          type: "warning",
          title: "Huerto",
          message: d.message,
          duration: 4500,
          timestamp: new Date(),
        });
      }
    };

    colyseusClient.on(FarmMessages.Result, onFarm);
    return () => {
      colyseusClient.off(FarmMessages.Result, onFarm);
    };
  }, [addNotification]);

  return null;
}
