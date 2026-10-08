// GET /api/m/cron/expiry — Check expiring licences, agreements, insurance, overdue payments
// Call every 2 days via Vercel Cron or external scheduler (see vercel.json)
// Optional: set CRON_SECRET env var and pass as X-Cron-Secret header
import { NextResponse } from "next/server";
import { prisma, fail, sendExpoPush, getTokensForUsers } from "../../../../../../lib/mobile-api";
import { checkAndUpdateExpiredAgreements } from "../../../../../../lib/check-agreement-expiry";
import { checkAndNotifyLicenseExpiry } from "../../../../../../lib/check-license-expiry";
import { checkAndUpdateExpiredInsurances } from "../../../../../../lib/check-insurance-expiry";

const DAYS_WARN = [20, 14, 7, 1];

function inDays(d: number) {
  const from = new Date(); from.setHours(0,0,0,0);
  const to = new Date(); to.setDate(to.getDate() + d); to.setHours(23,59,59,999);
  return { gte: from, lte: to };
}

export async function GET(req: Request) {
  try {
    const secret = req.headers.get("x-cron-secret") ?? "";
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const results: string[] = [];

    // Run the real checkers first — these are the functions that actually
    // flip a SIGNED agreement to EXPIRED in the database (and reset the
    // car's HIRE/INSURANCE_C flags), and create `notification` rows that
    // both the web app and mobile app already read from for their in-app
    // bell. Without this, agreements past their end date kept showing as
    // "Active" forever since nothing ever corrected the stored status.
    const agreementResult = await checkAndUpdateExpiredAgreements();
    const licenseResult = await checkAndNotifyLicenseExpiry();
    const insuranceResult = await checkAndUpdateExpiredInsurances();
    results.push(`agreements-corrected:${agreementResult.expiryCount}`);
    results.push(`agreement-notifications:${agreementResult.notificationCount}`);
    results.push(`license-notifications:${licenseResult}`);
    results.push(`insurance-corrected:${insuranceResult.insurancesExpired}`);
    results.push(`insurance-notifications:${insuranceResult.notificationsCreated}`);

    for (const days of DAYS_WARN) {
      // 1. Licence expiry — mobile push only (DB notification already handled above)
      const expDrivers = await prisma.driverprofile.findMany({
        where: { licenseExpiry: inDays(days), isActive: true },
        include: { user_driverprofile_userIdTouser: { select: { id: true, name: true } } },
      });
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" as never, isActive: true }, select: { id: true } });
      const adminTokens = await getTokensForUsers(admins.map((a: { id: number }) => a.id));

      for (const d of expDrivers) {
        const u = (d as any).user_driverprofile_userIdTouser;
        const label = `${days} day${days !== 1 ? "s" : ""}`;
        await sendExpoPush(adminTokens, "Licence Expiring ⚠️", `${u.name}'s licence expires in ${label}.`, { route: `/modals/driver-detail?id=${d.id}` });
        const driverTokens = await getTokensForUsers([u.id]);
        await sendExpoPush(driverTokens, "Licence Expiring ⚠️", `Your licence expires in ${label}. Please renew.`, { route: "/profile" });
        results.push(`licence-push:${d.id}:${days}d`);
      }

      // 2. Agreement expiry — mobile push only (DB update + notification already handled above)
      const expAgreements = await prisma.agreement.findMany({
        where: { endDate: inDays(days), isActive: true, status: "SIGNED" as never },
        include: { driverprofile: { include: { user_driverprofile_userIdTouser: { select: { id: true, name: true } } } } },
      });
      for (const a of expAgreements) {
        const ag = a as any;
        const driverName = ag.driverprofile?.user_driverprofile_userIdTouser?.name ?? "Driver";
        const label = `${days} day${days !== 1 ? "s" : ""}`;
        await sendExpoPush(adminTokens, "Agreement Expiring ⏰", `"${ag.title}" for ${driverName} expires in ${label}.`, { route: `/modals/agreement-detail?id=${a.id}` });
        const driverUserId = ag.driverprofile?.user_driverprofile_userIdTouser?.id;
        if (driverUserId) {
          const driverTokens = await getTokensForUsers([driverUserId]);
          await sendExpoPush(driverTokens, "Agreement Expiring ⏰", `Your agreement expires in ${label}. Contact admin.`, { route: `/modals/agreement-detail?id=${a.id}` });
        }
        results.push(`agreement-push:${a.id}:${days}d`);
      }
    }

    // 3. Overdue weekly payments — mobile push (separate concern, unchanged)
    const overduePayments = await prisma.weeklypayment.findMany({
      where: { status: "OVERDUE" as never },
      include: { driverprofile: { include: { user_driverprofile_userIdTouser: { select: { id: true, name: true } } } } },
    });
    const admins2 = await prisma.user.findMany({ where: { role: "ADMIN" as never, isActive: true }, select: { id: true } });
    const adminTokens2 = await getTokensForUsers(admins2.map((a: { id: number }) => a.id));
    for (const p of overduePayments) {
      const pv = p as any;
      const driverName = pv.driverprofile?.user_driverprofile_userIdTouser?.name ?? "Driver";
      const driverUserId = pv.driverprofile?.user_driverprofile_userIdTouser?.id;
      if (pv.driverId) {
        await prisma.notification.create({ data: { type: "WEEKLY_PAYMENT_MISSED" as never, title: "Payment Overdue ⚠️", message: "Your weekly rent payment is overdue. Please pay as soon as possible.", isForAdmin: false, driverId: pv.driverId, updatedAt: now } as never }).catch(() => {});
        if (driverUserId) {
          const driverTokens = await getTokensForUsers([driverUserId]);
          await sendExpoPush(driverTokens, "Payment Overdue ⚠️", "Your weekly rent is overdue. Please pay now.", { route: "/ledger" });
        }
      }
      await sendExpoPush(adminTokens2, "Payment Overdue ⚠️", `${driverName}'s weekly rent is overdue.`, { route: "/ledger" });
      results.push(`overdue:${p.id}`);
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (err) { return fail("cron/expiry", err); }
}
