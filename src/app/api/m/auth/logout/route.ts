// src/app/api/m/auth/logout/route.ts  ->  POST /api/m/auth/logout
import { NextResponse } from "next/server";
import { getBearerToken, revokeMobileSession } from "../../../../../../lib/mobile-api";

export async function POST(req: Request) {
  const token = getBearerToken(req);
  if (token) await revokeMobileSession(token);
  return NextResponse.json({ success: true });
}
