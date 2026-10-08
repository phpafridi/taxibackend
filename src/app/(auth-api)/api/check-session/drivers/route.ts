// app/api/driver-portal/check-session/route.ts (Next.js App Router)
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || !token.sessionToken || !token.userId) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  // Check session in DB
  const dbSession = await prisma.session.findFirst({
    where: {
      sessionToken: token.sessionToken as string,
      userId: token.userId as number,
      isActive: true,
      expires: { gt: new Date() },
    },
    include: {
      user: true, // to get user info
    },
  });

  if (!dbSession || dbSession.user.role !== "DRIVER") {
    return NextResponse.json({ valid: false }, { status: 403 });
  }

  return NextResponse.json({ valid: true, user: dbSession.user });
}
