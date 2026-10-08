// src/app/api/m/auth/session/route.ts  ->  GET /api/m/auth/session
// Validates the Bearer token and returns the current user. Mobile-only path,
// completely separate from NextAuth's /api/auth/session.
import { NextResponse } from "next/server";
import { getSessionUser, toMobileUser } from "../../../../../../lib/mobile-api";

export async function GET(req: Request) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ message: "Invalid or expired session" }, { status: 401 });
  }
  return NextResponse.json({ user: await toMobileUser(user) });
}
