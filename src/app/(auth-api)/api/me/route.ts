// GET /api/me — lightweight endpoint for data that must NOT live in the session
// cookie (e.g. avatar, which can be a large base64 string and caused HTTP 431
// when it was stored in the JWT). Components fetch this once and cache it locally.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth-config";
import { prisma } from "../../../../../lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(session.user.id) },
      select: { id: true, name: true, email: true, role: true, avatar: true },
    });

    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    return NextResponse.json(user);
  } catch (err) {
    console.error("GET /api/me failed:", err);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}
