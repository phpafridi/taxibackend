// lib/expiry-scheduler.ts
//
// Self-contained, host-agnostic cron scheduler — no Vercel Cron, no external
// service, no separate process. Registers a daily check inside the running
// Next.js server itself; the check only actually runs the (somewhat heavy)
// expiry logic once at least 2 real days have passed since the last
// successful run, tracked via a `systemsetting` row so the interval survives
// server restarts/redeploys instead of resetting to "every day" each time.
//
// Why not just `cron.schedule('0 9 */2 * *', ...)` directly? Cron's
// day-of-month stepping resets at the start of every month, so months with
// an odd number of days produce two runs back-to-back (e.g. day 31 then day
// 1). Checking a real elapsed-time timestamp avoids that entirely and is a
// genuine "every 2 days since last run", not an approximation.

import cron from "node-cron";
import { prisma } from "./prisma";
import { checkAndUpdateExpiredAgreements } from "./check-agreement-expiry";
import { checkAndNotifyLicenseExpiry } from "./check-license-expiry";
import { checkAndUpdateExpiredInsurances } from "./check-insurance-expiry";
import { runRentRemindersOncePerDay } from "./rent-reminder";

const LAST_RUN_KEY = "last_expiry_cron_run";
const INTERVAL_DAYS = 2;
const INTERVAL_MS = INTERVAL_DAYS * 24 * 60 * 60 * 1000;

let registered = false;

async function getLastRun(): Promise<Date | null> {
  const row = await prisma.systemsetting.findUnique({ where: { key: LAST_RUN_KEY } });
  if (!row) return null;
  const t = new Date(row.value);
  return isNaN(t.getTime()) ? null : t;
}

async function setLastRun(at: Date): Promise<void> {
  await prisma.systemsetting.upsert({
    where: { key: LAST_RUN_KEY },
    update: { value: at.toISOString(), updatedAt: at },
    create: {
      key: LAST_RUN_KEY,
      value: at.toISOString(),
      group: "CRON",
      type: "STRING",
      isPublic: false,
      notes: "Last time the expiry checker (agreements/licenses/insurance) actually ran.",
      updatedAt: at,
    },
  });
}

async function runExpiryChecks(): Promise<void> {
  const now = new Date();
  console.log(`[expiry-scheduler] Running expiry checks at ${now.toISOString()}`);
  try {
    const agreementResult = await checkAndUpdateExpiredAgreements();
    const licenseResult = await checkAndNotifyLicenseExpiry();
    const insuranceResult = await checkAndUpdateExpiredInsurances();
    console.log(
      `[expiry-scheduler] Done. Agreements expired: ${agreementResult.expiryCount}, ` +
      `agreement notifications: ${agreementResult.notificationCount}, ` +
      `license notifications: ${licenseResult}, ` +
      `insurance expired: ${insuranceResult.insurancesExpired}, ` +
      `insurance notifications: ${insuranceResult.notificationsCreated}`
    );
    await setLastRun(now);
  } catch (err) {
    // Deliberately do NOT update last-run on failure, so the next daily
    // tick retries instead of silently waiting another 2 days.
    console.error("[expiry-scheduler] Run failed:", err);
  }
}

/**
 * Call this once when the server process starts (see instrumentation.ts).
 * Safe to call multiple times — registration only happens once per process.
 */
export function registerExpiryScheduler(): void {
  if (registered) return;
  registered = true;

  // Ticks every day at 09:00 server time, but the heavy logic inside only
  // actually executes if >= 2 days have elapsed since the last successful
  // run — see the comment at the top of this file for why.
  cron.schedule("0 9 * * *", async () => {
    const last = await getLastRun().catch(() => null);
    const due = !last || (Date.now() - last.getTime() >= INTERVAL_MS);
    if (!due) {
      console.log("[expiry-scheduler] Skipping — last run was less than 2 days ago.");
      return;
    }
    await runExpiryChecks();
  });

  // Rent reminders: every morning at 08:00 (once per day — guarded by a stored date).
  cron.schedule("0 8 * * *", () => { void runRentRemindersOncePerDay(); });
  // Catch-up shortly after boot if the server was down at 08:00 (only after 08:00 server time).
  setTimeout(() => { if (new Date().getHours() >= 8) void runRentRemindersOncePerDay(); }, 25_000);

  console.log("[expiry-scheduler] Registered — checks daily at 09:00, executes every 2 days.");

  // Also run once shortly after boot if we've never run before (e.g. brand
  // new deployment) or it's overdue, so you don't have to wait until the
  // next 09:00 tick to see it work for the first time.
  setTimeout(async () => {
    const last = await getLastRun().catch(() => null);
    const due = !last || (Date.now() - last.getTime() >= INTERVAL_MS);
    if (due) {
      console.log("[expiry-scheduler] Running an initial check shortly after startup.");
      await runExpiryChecks();
    }
  }, 15_000); // small delay so it doesn't compete with the server's own boot work
}
