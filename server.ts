/**
 * Server Node custom: pornește Next.js și atașează Socket.io pe ACELAȘI HTTP
 * server (același port). Necesar pentru deployment persistent pe VPS (nu
 * serverless) și pentru real-time intern, fără servicii externe (Pusher/Ably).
 *
 * Rulare:
 *   dev:  npm run dev   (tsx watch server.ts)
 *   prod: npm run build && npm run start
 *
 * Notă: importurile din `src` folosesc căi relative (nu alias `@/`) fiindcă
 * acest fișier rulează sub tsx, în afara bundle-ului Next.
 */
import { createServer } from "node:http";
import { parse } from "node:url";
import nextEnv from "@next/env";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { getToken } from "next-auth/jwt";
import { Role } from "@prisma/client";

import { ROOMS } from "./src/types/realtime.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./src/types/realtime.js";

// Încarcă variabilele din .env / .env.local ÎNAINTE de a le citi mai jos.
// (Next le încarcă oricum la app.prepare(), dar server.ts le folosește mai devreme.)
const dev = process.env.NODE_ENV !== "production";
nextEnv.loadEnvConfig(process.cwd(), dev);
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);

const allowedOrigins = (process.env.SOCKET_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    // parse pentru compatibilitate cu handler-ul Next.
    handle(req, res, parse(req.url || "/", true));
  });

  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(httpServer, {
    // În dev permitem same-origin implicit; în prod restricționăm la origini.
    cors: dev
      ? { origin: true, credentials: true }
      : { origin: allowedOrigins.length ? allowedOrigins : false, credentials: true },
    // Path implicit "/socket.io"; nginx îl proxy-ază separat (vezi README).
    transports: ["websocket", "polling"],
  });

  // --- Autentificare la handshake ---
  // Un client neautentificat este respins și NU primește niciun eveniment.
  io.use(async (socket, nextFn) => {
    try {
      const token = await getToken({
        // socket.request este IncomingMessage-ul cu header-ele (inclusiv cookie).
        req: socket.request as never,
        secret: process.env.AUTH_SECRET,
        secureCookie: !dev,
      });

      if (!token?.role) {
        return nextFn(new Error("unauthorized"));
      }

      socket.data.userId = String(token.id ?? token.sub ?? "");
      socket.data.role = token.role as Role;
      return nextFn();
    } catch {
      return nextFn(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    // Recepția se abonează la camera "reception"; alte roluri nu primesc
    // evenimentele de tichete.
    if (socket.data.role === Role.RECEPTION) {
      socket.join(ROOMS.reception);
    }
  });

  // Expunem instanța pe globalThis pentru ca rutele API / server actions
  // (rulate în bundle-ul Next, același proces) să poată emite evenimente.
  (globalThis as unknown as { __io?: SocketIOServer }).__io = io;

  httpServer.listen(port, hostname, () => {
    // 0.0.0.0 = "ascultă pe toate interfețele". În browser deschide localhost.
    const browseHost = hostname === "0.0.0.0" ? "localhost" : hostname;
    // eslint-disable-next-line no-console
    console.log(
      `▶ Clinica Plata: deschide http://${browseHost}:${port}  ` +
        `(bind ${hostname}:${port}, ${dev ? "dev" : "prod"})`,
    );
  });
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Eroare la pornirea serverului:", error);
  process.exit(1);
});
