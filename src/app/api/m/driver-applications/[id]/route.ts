// GET /api/m/driver-applications/:id — full application incl. document photos (admin only).
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, driverUserInclude, serializeDriverProfile, fail } from "../../../../../../lib/mobile-api";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const { id } = await params;
    const dp = await prisma.driverprofile.findUnique({ where: { id: Number(id) }, include: { ...driverUserInclude, document: true } as never });
    if (!dp) return NextResponse.json({ message: "Application not found" }, { status: 404 });
    const row = dp as unknown as { applicationStatus?: string | null; rejectionReason?: string | null; document: { id: number; name: string; fileUrl: string }[]; user_driverprofile_userIdTouser: { avatar: string | null } };
    return NextResponse.json({
      ...serializeDriverProfile(dp as never),
      applicationStatus: row.applicationStatus ?? undefined,
      rejectionReason: row.rejectionReason ?? undefined,
      photos: [
        ...(row.user_driverprofile_userIdTouser.avatar ? [{ id: 0, name: "Photo of driver", image: row.user_driverprofile_userIdTouser.avatar }] : []),
        ...row.document.map((d) => ({ id: d.id, name: d.name, image: d.fileUrl })),
      ],
    });
  } catch (err) { return fail("driver-applications/[id]", err); }
}
