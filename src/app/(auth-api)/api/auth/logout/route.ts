// src/app/(auth-api)/api/auth/logout/route.ts
//
// Mobile (Expo) logout: POST /api/auth/logout  (Authorization: Bearer <token>)
// Deactivates only this device's token. NextAuth uses /api/auth/signout, so
// this new path does not affect the web app at all.

import { NextResponse } from "next/server";
import { getBearerToken, revokeMobileSession } from "../../../../../../lib/mobile-auth";

export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (token) {
    await revokeMobileSession(token);
  }
  // Always succeed — the app clears local storage regardless.
  return NextResponse.json({ success: true });
}
