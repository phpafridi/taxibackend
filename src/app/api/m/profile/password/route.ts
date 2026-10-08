import { NextResponse } from "next/server";
import { prisma, requireUser, fail } from "../../../../../../lib/mobile-api";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const body = await req.json().catch(() => ({} as Record<string,unknown>));
    const currentPassword = body.currentPassword != null ? String(body.currentPassword) : "";
    const newPassword = body.newPassword != null ? String(body.newPassword) : "";
    if (!currentPassword || !newPassword)
      return NextResponse.json({ message: "currentPassword and newPassword are required" }, { status: 400 });
    if (newPassword.length < 6)
      return NextResponse.json({ message: "New password must be at least 6 characters" }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { id: g.user.id } });
    if (!user?.password) return NextResponse.json({ message: "User not found" }, { status: 404 });
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return NextResponse.json({ message: "Current password is incorrect" }, { status: 401 });
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: g.user.id }, data: { password: hashed, updatedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (err) { return fail("profile/password", err); }
}
