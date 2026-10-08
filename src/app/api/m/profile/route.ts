// GET /api/m/profile — current user's full profile
// PUT /api/m/profile — update name / phone / avatar (base64 dataUri or URL)
import { NextResponse } from "next/server";
import { prisma, requireUser, toMobileUser, driverProfileIdFor, serializeDriverProfile, driverUserInclude, fail } from "../../../../../lib/mobile-api";

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const user = await prisma.user.findUnique({ where: { id: g.user.id } });
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });
    const payload: Record<string, unknown> = { ...toMobileUser(user as never) };
    if (user.role === "DRIVER") {
      const dp = await prisma.driverprofile.findUnique({ where: { userId: g.user.id }, include: driverUserInclude });
      if (dp) payload.driverProfile = serializeDriverProfile(dp as never);
    }
    return NextResponse.json(payload);
  } catch (err) { return fail("profile", err); }
}

export async function PUT(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name != null) data.name = String(body.name).trim();
    if (body.phone != null) data.phone = String(body.phone).trim() || null;
    if (body.avatar != null) data.avatar = String(body.avatar) || null;
    const user = await prisma.user.update({ where: { id: g.user.id }, data });
    return NextResponse.json(toMobileUser(user as never));
  } catch (err) { return fail("profile", err); }
}
