// lib/rent-reminder.ts
//
// Daily rent reminders for drivers: a push + in-app notification 2 days before,
// 1 day before and on the day a PENDING weekly payment falls due.
// Runs from lib/expiry-scheduler.ts at 08:00. The last run date is stored in
// `systemsetting` so a restart (or the boot-time catch-up) never sends twice in one day.

import { prisma } from "./prisma";
import { sendExpoPush, getTokensForUsers } from "./mobile-api";

const KEY = "last_rent_reminder_date";
const DAY = 24 * 60 * 60 * 1000;

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export async function alreadyRanToday(): Promise<boolean> {
  const row = await prisma.systemsetting.findUnique({ where: { key: KEY } });
  return row?.value === ymd(new Date());
}

async function markRan(): Promise<void> {
  const now = new Date();
  await prisma.systemsetting.upsert({
    where: { key: KEY },
    update: { value: ymd(now), updatedAt: now },
    create: { key: KEY, value: ymd(now), group: "CRON", type: "STRING", isPublic: false, notes: "Date rent reminders were last sent.", updatedAt: now },
  });
}

export async function sendRentReminders(): Promise<number> {
  const today = startOfDay(new Date());
  const horizon = new Date(today.getTime() + 3 * DAY); // due today .. +2 days

  const due = await prisma.weeklypayment.findMany({
    where: { status: "PENDING" as never, dueDate: { gte: today, lt: horizon } },
    include: { driverprofile: { include: { user_driverprofile_userIdTouser: { select: { id: true, name: true } } } } },
  });

  let sent = 0;
  for (const p of due as any[]) {
    const user = p.driverprofile?.user_driverprofile_userIdTouser;
    if (!user?.id) continue;
    const days = Math.round((startOfDay(p.dueDate).getTime() - today.getTime()) / DAY);
    const amount = `£${Number(p.amount).toFixed(2)}`;
    const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
    const title = days === 0 ? "Rent due today 💷" : "Rent reminder 💷";
    const message = `Your weekly rent of ${amount} is due ${when}. Tap to pay.`;

    await prisma.notification.create({
      data: {
        type: "WEEKLY_PAYMENT_DUE" as never, priority: days === 0 ? "HIGH" : "MEDIUM",
        title, message, isForAdmin: false, driverId: p.driverId, userId: user.id,
        referenceType: "WEEKLY_PAYMENT", referenceId: p.id, updatedAt: new Date(),
      } as never,
    }).catch(() => {});
    const tokens = await getTokensForUsers([user.id]);
    await sendExpoPush(tokens, title, message, { route: "/ledger" });
    sent++;
  }
  return sent;
}

/** Scheduler entry point: no-op if today's reminders were already sent. */
export async function runRentRemindersOncePerDay(): Promise<void> {
  try {
    if (await alreadyRanToday()) return;
    const n = await sendRentReminders();
    await markRan();
    console.log(`[rent-reminder] Sent ${n} reminder(s).`);
  } catch (err) {
    console.error("[rent-reminder] Failed:", err);
  }
}
