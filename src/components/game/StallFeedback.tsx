"use client";

import { useEffect } from "react";
import { colyseusClient } from "@/lib/colyseus/client";
import { ITEMS_CATALOG } from "@/constants/items";
import { useUIStore } from "@/store/uiStore";

type StallResult = {
  ok?: boolean;
  action?: string;
  message?: string;
  itemId?: string;
  quantity?: number;
  total?: number;
};

export default function StallFeedback() {
  const addNotification = useUIStore((s) => s.addNotification);
  const pushItemGainToast = useUIStore((s) => s.pushItemGainToast);

  useEffect(() => {
    const onStall = (raw: unknown) => {
      const d = raw as StallResult;
      if (d?.ok && d.action === "bought" && d.itemId) {
        const qty = Math.max(1, Math.floor(Number(d.quantity) || 0));
        const cat = ITEMS_CATALOG[d.itemId as keyof typeof ITEMS_CATALOG];
        pushItemGainToast({
          itemId: d.itemId,
          name: cat?.name ?? d.itemId,
          icon: cat?.icon ?? "🛒",
          quantity: qty,
          subtitle:
            typeof d.total === "number"
              ? `Total ${d.total} créditos / ${d.total} credits`
              : undefined,
        });
        return;
      }
      if (d?.ok && (d.action === "listed" || d.action === "unlisted")) {
        addNotification({
          id: `stall-${Date.now()}`,
          type: "success",
          title: "Puesto / Stall",
          message:
            d.action === "listed"
              ? "Artículo publicado a la venta."
              : "Artículo retirado del puesto.",
          duration: 3200,
          timestamp: new Date(),
        });
        return;
      }
      if (d?.ok === false && d.message) {
        addNotification({
          id: `stall-e-${Date.now()}`,
          type: "warning",
          title: "Puesto / Stall",
          message: d.message,
          duration: 4500,
          timestamp: new Date(),
        });
      }
    };

    colyseusClient.on("stall:result", onStall);
    return () => {
      colyseusClient.off("stall:result", onStall);
    };
  }, [addNotification, pushItemGainToast]);

  return null;
}
