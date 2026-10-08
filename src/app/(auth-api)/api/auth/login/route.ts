// src/app/(auth-api)/api/auth/login/route.ts
//
// Mobile (Expo) login endpoint: POST /api/auth/login  { email, password }
// -> { user, token }
//
// Mirrors the web Credentials check exactly (bcrypt compare + isActive), but
// returns a Bearer token for the mobile app instead of a NextAuth cookie.
// NextAuth uses /api/auth/signin (not /login), so this adds a new path and
// does NOT shadow or change anything the web depends on.

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma, checkLoginLockout, recordLoginFailure, recordLoginSuccess } from "../../../../../../lib/prisma";
import { createMobileSession, toMobileUser } from "../../../../../../lib/mobile-auth";

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
    return NextResponse.json(
      { message: "Email and password are required" },
      { status: 400 },
    );
  }

  const lockoutMessage = await checkLoginLockout(email);
  if (lockoutMessage) {
    return NextResponse.json({ message: lockoutMessage }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Use a generic message so we don't leak which part was wrong.
  if (!user || !user.password || !user.isActive) {
    return NextResponse.json(
      { message: "Invalid email or password" },
      { status: 401 },
    );
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    await recordLoginFailure(email);
    return NextResponse.json(
      { message: "Invalid email or password" },
      { status: 401 },
    );
  }
  await recordLoginSuccess(email);

  const token = await createMobileSession(user.id, req);

  // Best-effort lastLogin update; never blocks the response.
  prisma.user
    .update({ where: { id: user.id }, data: { lastLogin: new Date() } })
    .catch(() => {});

  return NextResponse.json({
    user: await toMobileUser(user as unknown as Parameters<typeof toMobileUser>[0]),
    token,
  });
}
