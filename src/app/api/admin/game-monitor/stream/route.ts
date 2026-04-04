import { NextRequest } from "next/server";
import { isValidAdminSession } from "@/core/auth";
import {
  fetchGameMonitorSnapshot,
  isGameMonitorConfigured,
} from "@/lib/gameMonitorProxy";

/**
 * ES: SSE solo con polling al monitor Colyseus (misma cookie de admin; EventSource no envía Bearer).
 * EN: SSE via polling Colyseus monitor (admin cookie; EventSource sends no Bearer).
 */
export async function GET(request: NextRequest) {
  if (!isValidAdminSession(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isGameMonitorConfigured()) {
    return new Response(
      JSON.stringify({ error: "NEXUS_GAME_MONITOR_SECRET not set" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
        );
      };

      send({ type: "hello", ts: Date.now() });

      const tick = async () => {
        const data = await fetchGameMonitorSnapshot();
        send({ type: "snapshot", data, ts: Date.now() });
      };

      void tick();
      const interval = setInterval(() => void tick(), 2000);

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
      }, 20000);

      const onAbort = () => {
        clearInterval(interval);
        clearInterval(keepAlive);
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      request.signal.addEventListener("abort", onAbort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
