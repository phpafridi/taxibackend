import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, serializeLedger, fail, sendExpoPush, getTokensForUsers } from "../../../../../../../lib/mobile-api";

async function handle(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const adminErr = requireAdmin(g); if (adminErr) return adminErr;

    const { id } = await ctx.params;
    const txId = Number(id);
    if (!txId || isNaN(txId)) return NextResponse.json({ message: "Invalid transaction id" }, { status: 400 });

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const status = body.status != null ? String(body.status) : "";
    const rejectionReason = body.rejectionReason != null ? String(body.rejectionReason) : "";
    if (!["ACCEPT", "PENDING", "REJECTED"].includes(status))
      return NextResponse.json({ message: "status must be ACCEPT, PENDING or REJECTED" }, { status: 400 });

    const existing = await prisma.ledger.findUnique({ where: { id: txId } });
    if (!existing) return NextResponse.json({ message: "Transaction not found" }, { status: 404 });

    const updated = await prisma.ledger.update({
      where: { id: txId },
      data: { status: status as never, updatedAt: new Date() },
    });

    // NOTE: the next-week rent debit is created only by the admin's explicit
    // "Generate" action in the app (ledgerApi.create with referenceType AUTO_WEEKLY_DEBIT-equivalent).
    // Auto-creating one here as well caused drivers to see two duplicate pending charges
    // (one from this auto-create, one from the manual Generate step) — removed.

    // Notify driver of decision
    if (existing.driverId) {
      try {
        const statusLabel = status === "ACCEPT" ? "accepted ✅" : status === "REJECTED" ? "rejected ❌" : "updated";
        const msg = `Your payment has been ${statusLabel}${status === "REJECTED" && rejectionReason ? `: ${rejectionReason}` : ""}`;

        await prisma.notification.create({
          data: {
            type: "WEEKLY_PAYMENT_PAID" as never,
            title: status === "ACCEPT" ? "Payment Accepted ✅" : "Payment Rejected ❌",
            message: msg,
            isForAdmin: false, driverId: existing.driverId,
            referenceType: "LEDGER_UPDATE", referenceId: txId, updatedAt: new Date(),
          } as never,
        });

        // Get driver's userId for push
        const dp = await prisma.driverprofile.findUnique({ where: { id: existing.driverId }, select: { userId: true } });
        if (dp?.userId) {
          const tokens = await getTokensForUsers([dp.userId]);
          await sendExpoPush(tokens,
            status === "ACCEPT" ? "Payment Accepted ✅" : "Payment Rejected ❌",
            msg,
            { route: "/ledger" }
          );
        }
      } catch { /* best-effort */ }
    }

    return NextResponse.json(serializeLedger(updated as never));
  } catch (err) { return fail("ledger status", err); }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) { return handle(req, ctx); }
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) { return handle(req, ctx); }
