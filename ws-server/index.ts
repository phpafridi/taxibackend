// ws-server/index.ts
//
// Standalone real-time WebSocket server. Runs as ITS OWN process, separate
// from `next start` — managed independently (e.g. via supervisorctl), on
// its own port. It does not contain any business logic: the Next.js app
// writes to the database as normal, then calls POST /internal/emit here
// (see lib/realtime.ts) right after, and this server relays that out to
// whichever connected phones should see it.
//
// Auth: reuses the exact same mobile session tokens the Expo app already
// gets from POST /api/m/auth/login (lib/mobile-auth.ts) — an opaque token
// that's just a row in the `session` table. No new auth system, no JWT
// secret to share between processes: this file talks to the same MySQL
// database directly via Prisma.
//
// Rooms:
//   user:<userId>  — every connected client joins their own room
//   admin          — additionally joined by users with role === "ADMIN"

// `next start` auto-loads .env/.env.production for you — this script runs
// standalone via `tsx`, which does NOT, so we load it ourselves, first.
// Using require() here (not import) guarantees this runs before anything
// else below, regardless of how this project's module system is configured.
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
if (process.env.NODE_ENV === "production") {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env.production"), override: true });
}
/* eslint-enable @typescript-eslint/no-var-requires */

import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";

// Plain client (no broadcast extension) for the high-frequency location writes below,
// so each fix is relayed to admins exactly once, straight from this process.
const rawPrisma = new PrismaClient({ log: ["error"] });

const PORT = Number(process.env.REALTIME_PORT || 4001);
const INTERNAL_SECRET = process.env.REALTIME_INTERNAL_SECRET;

if (!INTERNAL_SECRET) {
  console.error("[ws-server] REALTIME_INTERNAL_SECRET is not set in the environment — refusing to start.");
  process.exit(1);
}

// ── Plain HTTP server ──────────────────────────────────────────────────────
// We handle /internal/emit and /healthz ourselves; everything under
// /socket.io/* is handled by the Socket.IO engine once attached below.
const httpServer = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/internal/emit") {
    return handleInternalEmit(req, res);
  }
  if (req.method === "GET" && req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("ok");
  }
  if (!req.url?.startsWith("/socket.io")) {
    res.writeHead(404);
    res.end();
  }
});

function handleInternalEmit(req: http.IncomingMessage, res: http.ServerResponse) {
  const secret = req.headers["x-internal-secret"];
  if (secret !== INTERNAL_SECRET) {
    res.writeHead(401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 1_000_000) req.destroy(); // 1MB safety cap
  });

  req.on("end", () => {
    try {
      const payload = JSON.parse(body) as {
        event: string;
        data: unknown;
        toAdmin?: boolean;
        toUserId?: number | string;
        toDriverId?: number | string;
        toDrivers?: boolean;
      };
      if (!payload.event) throw new Error("missing 'event'");

      if (payload.toAdmin) io.to("admin").emit(payload.event, payload.data);
      if (payload.toUserId != null) io.to(`user:${payload.toUserId}`).emit(payload.event, payload.data);
      if (payload.toDriverId != null) io.to(`driver:${payload.toDriverId}`).emit(payload.event, payload.data);
      if (payload.toDrivers) io.to("drivers").emit(payload.event, payload.data);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
    }
  });
}

// ── Socket.IO ───────────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  path: "/socket.io",
  cors: { origin: "*" }, // mobile app only — no browser session/cookie exposure here
});

io.use(async (socket, next) => {
  try {
    const authToken = socket.handshake.auth?.token as string | undefined;
    const headerToken = socket.handshake.headers.authorization?.toString().replace(/^Bearer\s+/i, "");
    const token = authToken || headerToken;

    if (!token) return next(new Error("unauthorized"));

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: true },
    });

    if (!session || !session.isActive || session.expires.getTime() < Date.now()) {
      return next(new Error("unauthorized"));
    }
    if (!session.user || !session.user.isActive) {
      return next(new Error("unauthorized"));
    }

    socket.data.userId = session.user.id;
    socket.data.role = session.user.role;
    next();
  } catch (err) {
    console.error("[ws-server] auth error:", err);
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  const { userId, role } = socket.data as { userId: number; role: string };

  socket.join(`user:${userId}`);
  if (role === "ADMIN") {
    socket.join("admin");
  } else {
    socket.join("drivers");
    // Also join this driver's own room so changes to their payments, agreements,
    // maintenance etc. reach their phone live.
    prisma.driverprofile
      .findFirst({ where: { userId }, select: { id: true } })
      .then((dp) => { if (dp) { socket.data.driverId = dp.id; socket.join(`driver:${dp.id}`); } })
      .catch((err) => console.error("[ws-server] driver room join failed:", err));
  }


  // ── Live location from a driver's phone ────────────────────────────────────
  // Replaces the old "POST every 30s" loop: the phone pushes each GPS fix here and we
  // store the latest one and relay it to admins straight away. Only accepted while an
  // admin has tracking switched on for this driver.
  socket.on("location:report", async (msg: Record<string, unknown>, ack?: (r: { ok: boolean; tracked?: boolean; error?: string }) => void) => {
    const reply = typeof ack === "function" ? ack : () => {};
    try {
      const driverId = socket.data.driverId as number | undefined;
      if (!driverId) return reply({ ok: false, error: "not_a_driver" });

      const nowMs = Date.now();
      if (nowMs - ((socket.data.lastLocationAt as number) || 0) < 1500) return reply({ ok: true }); // throttle
      socket.data.lastLocationAt = nowMs;

      const current = await rawPrisma.driverlocation.findUnique({ where: { driverId }, select: { isTracked: true } });
      if (!current?.isTracked) return reply({ ok: false, tracked: false });

      const at = new Date();
      let row;
      if (msg?.gpsEnabled === false) {
        row = await rawPrisma.driverlocation.update({ where: { driverId }, data: { gpsEnabled: false, updatedAt: at } });
      } else {
        const latitude = Number(msg?.latitude);
        const longitude = Number(msg?.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return reply({ ok: false, error: "bad_coordinates" });
        const accuracy = msg?.accuracy != null ? Number(msg.accuracy) : null;
        row = await rawPrisma.driverlocation.update({
          where: { driverId },
          data: { latitude, longitude, accuracy, gpsEnabled: true, recordedAt: at, updatedAt: at },
        });
      }

      io.to("admin").emit("location:update", {
        ...row,
        speed: msg?.speed != null ? Number(msg.speed) : null,
        heading: msg?.heading != null ? Number(msg.heading) : null,
      });
      reply({ ok: true });
    } catch (err) {
      console.error("[ws-server] location:report failed:", err);
      reply({ ok: false, error: "server_error" });
    }
  });

  console.log(`[ws-server] connected: user=${userId} role=${role} (${io.engine.clientsCount} online)`);

  socket.on("disconnect", () => {
    console.log(`[ws-server] disconnected: user=${userId} (${io.engine.clientsCount} online)`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[ws-server] listening on :${PORT}`);
});
