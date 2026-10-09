// GET /api/m/driver-applications?status=PENDING|REJECTED  — admin only. Light list, no photos.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, driverUserInclude, serializeDriverProfile, fail } from "../../../../../lib/mobile-api";

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const status = new URL(req.url).searchParams.get("status") === "REJECTED" ? "REJECTED" : "PENDING";
    const rows = await prisma.driverprofile.findMany({
      where: { applicationStatus: status } as never,
      include: driverUserInclude, orderBy: { createdAt: "desc" }, take: 200,
    });
    return NextResponse.json({
      data: rows.map((r) => ({ ...serializeDriverProfile(r as never), applicationStatus: (r as { applicationStatus?: string }).applicationStatus, rejectionReason: (r as { rejectionReason?: string | null }).rejectionReason ?? undefined })),
    });
  } catch (err) { return fail("driver-applications", err); }
}
