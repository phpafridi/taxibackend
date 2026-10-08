import { NextResponse } from "next/server";
import { prisma, requireUser, driverProfileIdFor, fail } from "../../../../../../../lib/mobile-api";

// GET /api/m/ledger/:id/proof — receipt photo for one ledger entry.
// Admins can view any; a driver can only view their own entries.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const { id } = await ctx.params;
    const ledgerId = Number(id);
    if (!ledgerId || isNaN(ledgerId)) return NextResponse.json({ message: "Invalid id" }, { status: 400 });

    if (g.user.role !== "ADMIN") {
      const dpid = await driverProfileIdFor(g.user.id);
      const entry = await prisma.ledger.findUnique({ where: { id: ledgerId }, select: { driverId: true } });
      if (!entry || !dpid || entry.driverId !== dpid) return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    const row = await prisma.ledgerproof.findUnique({ where: { ledgerId } });
    return NextResponse.json({ proof: row?.image ?? null });
  } catch (err) { return fail("ledger-proof", err); }
}
