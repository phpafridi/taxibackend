import { PrismaClient } from "@prisma/client";
import { emitRealtime } from "./realtime";

// ── Singleton — ONE connection pool for the entire process ───────────────────
// Each `new PrismaClient()` opens its own pool (default 10 connections).
// Having 20+ route files each instantiate their own client = 200+ open
// connections → high Railway MySQL bill. This singleton pattern ensures
// the entire Next.js server shares exactly one pool.
const globalForPrisma = global as unknown as { prisma: ReturnType<typeof createPrismaClient> | undefined };

// ── Real-time broadcast hook ──────────────────────────────────────────────
// Models whose create/update/delete should notify admins live (agreements,
// payments, maintenance, cars, drivers). `notification` and `driverlocation`
// get special, more targeted handling below instead of a blanket admin blast.
const ADMIN_BROADCAST_MODELS = new Set([
  "agreement",
  "ledger",
  "maintenancerequest",
  "car",
  "driverprofile",
  "weeklypayment",
]);

// Only these write ops carry a single, useful row back — bulk *Many ops
// return just a { count }, so there's nothing meaningful to broadcast.
const WRITE_OPS = new Set(["create", "update", "delete", "upsert"]);

function afterWrite(model: string, operation: string, result: unknown) {
  if (!WRITE_OPS.has(operation)) return;
  const row = result as Record<string, unknown> | null;
  if (!row || typeof row !== "object") return;

  const op = operation === "upsert" ? "update" : operation;

  if (model === "notification") {
    if (row.userId != null) emitRealtime("notification:new", row, { toUserId: row.userId as number });
    return;
  }

  if (model === "driverlocation") {
    // Admins watching the live map — keep this one admin-only and lightweight.
    emitRealtime("location:update", row, { toAdmin: true });
    return;
  }

  if (ADMIN_BROADCAST_MODELS.has(model)) {
    emitRealtime(`${model}:${op}`, row, { toAdmin: true });

    // Also tell the driver(s) this change belongs to, so their own app updates live.
    if (model === "driverprofile" && row.id != null) {
      emitRealtime(`${model}:${op}`, row, { toDriverId: row.id as number });
    } else if (model === "car") {
      emitRealtime(`${model}:${op}`, row, { toDrivers: true });
    } else if (row.driverId != null) {
      emitRealtime(`${model}:${op}`, row, { toDriverId: row.driverId as number });
    }

    // Safety net: a data-free "something changed" ping to every driver phone. Drivers only
    // refetch (the API still decides what each one may see), so nothing private is sent, and
    // it still works if a driver's personal room was not joined yet.
    if (model !== "car") emitRealtime(`${model}:${op}`, { id: row.id }, { toDrivers: true });
  }
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  client.$connect().catch((err: unknown) => {
    console.error("[prisma] Failed to connect:", err);
  });

  return client.$extends({
    name: "realtime-broadcast",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: {
          model?: string;
          operation: string;
          args: unknown;
          query: (args: unknown) => Promise<unknown>;
        }) {
          // MySQL closes idle connections; the first query after a quiet spell can hit a dead one and fail with a
          // vague "unknown error". Try once more on a fresh connection — the failed attempt never reached the table.
          let result: unknown;
          try {
            result = await query(args);
          } catch (err) {
            const e = err as { code?: string; message?: string };
            const transient = ["P1001", "P1002", "P1008", "P1017", "P2024"].includes(e?.code ?? "")
              || /unknown error|server has closed the connection|connection (was )?(reset|closed|lost)|ECONNRESET|ETIMEDOUT|EPIPE|socket/i.test(e?.message ?? "");
            if (!transient) throw err;
            await new Promise((r) => setTimeout(r, 250));
            result = await query(args);
          }
          try {
            if (model) afterWrite(model.toLowerCase(), operation, result);
          } catch (err) {
            console.error("[prisma-realtime] broadcast hook failed:", err);
          }
          return result;
        },
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache on global in ALL environments (not just dev) so hot-reloads and
// Railway's keep-alive restarts don't spawn extra pools.
globalForPrisma.prisma = prisma;

// ── Brute-force login protection ─────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function checkLoginLockout(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { lockedUntil: true },
  });
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return `Too many failed login attempts. Please try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`;
  }
  return null;
}

export async function recordLoginFailure(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, failedLoginAttempts: true } });
  if (!user) return;
  const attempts = (user.failedLoginAttempts ?? 0) + 1;
  const data: { failedLoginAttempts: number; lockedUntil?: Date } = { failedLoginAttempts: attempts };
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    data.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
  }
  await prisma.user.update({ where: { id: user.id }, data }).catch(() => {});
}

export async function recordLoginSuccess(email: string): Promise<void> {
  await prisma.user
    .update({ where: { email }, data: { failedLoginAttempts: 0, lockedUntil: null } })
    .catch(() => {});
}