// src/app/api/m/auth/logout/route.ts  ->  POST /api/m/auth/logout
import { NextResponse } from "next/server";
import { getBearerToken, getSessionUser, revokeMobileSession, clearPushTokensForUser } from "../../../../../../lib/mobile-api";

export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (token) {
    // Only a phone that is still signed in clears the push tokens. A phone that was already replaced by a newer login
    // has no valid session here, so it can never wipe the new phone's tokens.
    const user = await getSessionUser(req);
    await revokeMobileSession(token);
    if (user) await clearPushTokensForUser(user.id);
  }
  return NextResponse.json({ success: true });
}
