import { NextResponse } from "next/server";
import { prisma, requireUser, fail } from "../../../../../../../lib/mobile-api";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const { id } = await params;
    await prisma.notification.update({ where: { id: Number(id) }, data: { isRead: true, readAt: new Date(), updatedAt: new Date() } }).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (err) { return fail("notifications/[id]/read", err); }
}
