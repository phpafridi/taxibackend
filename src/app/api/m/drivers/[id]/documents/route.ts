// GET /api/m/drivers/:id/documents — admin: the files a driver uploaded when they registered
// (licence front/back, PHV licence, proof of address, selfie…) plus their licence expiry.
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../../lib/mobile-api";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await requireUser(req); const forbidden = requireAdmin(g); if (forbidden) return forbidden;
    const { id } = await params;
    const dp = await prisma.driverprofile.findUnique({
      where: { id: Number(id) },
      select: {
        licenseExpiry: true, createdAt: true,
        user_driverprofile_userIdTouser: { select: { name: true, avatar: true } },
        document: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, fileName: true, fileUrl: true, mimeType: true, createdAt: true } },
      } as never,
    });
    if (!dp) return NextResponse.json({ message: "Driver not found" }, { status: 404 });
    const row = dp as unknown as {
      licenseExpiry: Date | null; createdAt: Date;
      user_driverprofile_userIdTouser: { name: string; avatar: string | null };
      document: { id: number; name: string; fileName: string; fileUrl: string; mimeType: string | null; createdAt: Date }[];
    };
    const u = row.user_driverprofile_userIdTouser;
    const docs = [
      ...(u.avatar ? [{ id: 0, name: "Profile photo", image: u.avatar, expiresAt: null as string | null, createdAt: row.createdAt.toISOString() }] : []),
      ...row.document.map((d) => ({
        id: d.id, name: d.name, image: d.fileUrl,
        // The only expiry we hold for registration files is the driving licence.
        expiresAt: /licen[cs]e.*\(front\)|driving licen[cs]e \(front\)/i.test(d.name) && row.licenseExpiry ? row.licenseExpiry.toISOString() : null,
        createdAt: d.createdAt.toISOString(),
      })),
    ];
    return NextResponse.json({ driverName: u.name, uploadedAt: row.createdAt.toISOString(), documents: docs });
  } catch (err) { return fail("drivers/[id]/documents", err); }
}
