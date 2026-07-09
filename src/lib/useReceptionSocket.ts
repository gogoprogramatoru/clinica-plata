"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
  TicketNewPayload,
  TicketPaidPayload,
} from "@/types/realtime";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Conexiune Socket.io pentru recepție. Se conectează same-origin (cookie-ul de
 * sesiune este trimis la handshake → autentificare pe server). Reconectare
 * automată încorporată de socket.io-client.
 *
 * Callback-urile sunt ținute în ref pentru a nu re-crea conexiunea la fiecare
 * render (evită flicker/reconectări inutile).
 */
export function useReceptionSocket(handlers: {
  onNew: (payload: TicketNewPayload) => void;
  onPaid: (payload: TicketPaidPayload) => void;
}) {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket: AppSocket = io({
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 800,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("ticket:new", (payload) => handlersRef.current.onNew(payload));
    socket.on("ticket:paid", (payload) => handlersRef.current.onPaid(payload));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  return { connected };
}
