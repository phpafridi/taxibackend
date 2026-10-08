// src/app/api/m/auth/login/route.ts  ->  POST /api/m/auth/login
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { checkIpRateLimit, recordIpAttempt, clearIpAttempts } from "../../../../../../lib/rate-limiter";
import { prisma, createMobileSession, toMobileUser } from "../../../../../../lib/mobile-api";
import { checkLoginLockout, recordLoginFailure, recordLoginSuccess } from "../../../../../../lib/prisma";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const email = (body.email ?? "").toString().trim().toLowerCase();
  const password = (body.password ?? "").toString();
  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
  }

  const lockoutMessage = await checkLoginLockout(email);
  if (lockoutMessage) {
    return NextResponse.json({ message: lockoutMessage }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password || !user.isActive) {
    return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    await recordLoginFailure(email);
    return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
  }
  await recordLoginSuccess(email);

  const token = await createMobileSession(user.id, req);
  prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } }).catch(() => {});

  return NextResponse.json({ user: await toMobileUser(user), token });
}
