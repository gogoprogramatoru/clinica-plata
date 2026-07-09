import "server-only";
import type { Server as SocketIOServer } from "socket.io";

import { ROOMS } from "@/types/realtime";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  TicketNewPayload,
  TicketPaidPayload,
} from "@/types/realtime";

type AppServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

/**
 * server.ts atașează instanța Socket.io pe globalThis. Rutele API și server
 * actions o preiau de aici pentru a emite evenimente. Poate fi `undefined`
 * dacă un fragment de cod rulează în afara serverului custom (ex. build).
 */
const globalForIo = globalThis as unknown as { __io?: AppServer };

export function getIo(): AppServer | undefined {
  return globalForIo.__io;
}

/** Emite un tichet nou către camera recepției. Sigur dacă io lipsește. */
export function emitTicketNew(payload: TicketNewPayload): void {
  getIo()?.to(ROOMS.reception).emit("ticket:new", payload);
}

/** Anunță recepția că un tichet a fost încasat (scoate-l din coadă peste tot). */
export function emitTicketPaid(payload: TicketPaidPayload): void {
  getIo()?.to(ROOMS.reception).emit("ticket:paid", payload);
}
