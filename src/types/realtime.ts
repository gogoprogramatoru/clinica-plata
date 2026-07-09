import type { Role } from "@prisma/client";

/** Camerele (rooms) Socket.io. Recepția ascultă în camera "reception". */
export const ROOMS = {
  reception: "reception",
} as const;

/** Payload minim pentru afișarea unui tichet nou în coada recepției. */
export interface TicketNewPayload {
  id: string;
  patientName: string;
  specialtyName: string;
  doctorName: string | null;
  // Valoarea itemizată a serviciilor (întotdeauna suma liniilor).
  total: number;
  // Pacient asigurat CAS: suma de încasat de la pacient este 0.
  isInsuredCAS: boolean;
  observations: string | null;
  createdAt: string; // ISO
  items: Array<{ name: string; price: number }>;
}

/** Payload pentru un tichet încasat (pentru a-l scoate din coadă în alte tab-uri). */
export interface TicketPaidPayload {
  id: string;
}

/** Contract tipat al evenimentelor server -> client. */
export interface ServerToClientEvents {
  "ticket:new": (payload: TicketNewPayload) => void;
  "ticket:paid": (payload: TicketPaidPayload) => void;
}

// Momentan clientul nu emite evenimente către server (doar ascultă).
export type ClientToServerEvents = Record<string, never>;

/** Date atașate fiecărei conexiuni Socket.io autentificate. */
export interface SocketData {
  userId: string;
  role: Role;
}
