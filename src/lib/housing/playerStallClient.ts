import { colyseusClient } from "@/lib/colyseus/client";
import { PRODUCE_STALL_KIOSK } from "@/constants/playerStall";

const PLOT_ID = PRODUCE_STALL_KIOSK.plotId;

export function sendStallAddListing(
  itemId: string,
  quantity: number,
  priceMajor: number
): void {
  const room = colyseusClient.getSocket();
  if (!room?.connection.isOpen) return;
  room.send("stall:addListing", {
    plotId: PLOT_ID,
    itemId,
    quantity,
    priceMajor,
  });
}

export function sendStallRemoveListing(listingId: string): void {
  const room = colyseusClient.getSocket();
  if (!room?.connection.isOpen) return;
  room.send("stall:removeListing", { plotId: PLOT_ID, listingId });
}

export function sendStallBuy(
  listingId: string,
  quantity: number
): void {
  const room = colyseusClient.getSocket();
  if (!room?.connection.isOpen) return;
  room.send("stall:buy", { plotId: PLOT_ID, listingId, quantity });
}
