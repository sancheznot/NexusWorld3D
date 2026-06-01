"use client";

import { useEffect, useState } from "react";
import { colyseusClient } from "@/lib/colyseus/client";

/** ES: Conexión real a la sala mundo 3D (no el estado duplicado de useSocket). EN: World room socket state. */
export function useWorldRoomConnected(): boolean {
  const [connected, setConnected] = useState(() =>
    colyseusClient.isConnectedToWorldRoom()
  );

  useEffect(() => {
    const sync = () => setConnected(colyseusClient.isConnectedToWorldRoom());
    colyseusClient.on("room:connected", sync);
    colyseusClient.on("room:left", sync);
    sync();
    return () => {
      colyseusClient.off("room:connected", sync);
      colyseusClient.off("room:left", sync);
    };
  }, []);

  return connected;
}
