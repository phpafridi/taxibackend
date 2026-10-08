// src/app/(auth-api)/api/auth/session/route.ts
//
// Dual-mode session endpoint for GET/POST /api/auth/session:
//
//   • Mobile request  (Authorization: Bearer <token>)
//       -> validate the token and return { user }  (what the Expo app expects)
//
//   • Web request  (NextAuth cookie, no Bearer header)
//       -> delegate the request straight to NextAuth's own handler, so the web
//          session response (and Set-Cookie refresh) is byte-for-byte unchanged.
//
// A more specific route ("session") takes precedence over the catch-all
// "[...nextauth]" in the App Router, so we re-create the NextAuth handler here
// and forward web traffic to it. signin / signout / csrf / providers /
// callback all still go to the original catch-all route untouched.

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authOptions } from "../../../../../../lib/auth-config";
import { getBearerToken, getUserFromMobileToken } from "../../../../../../lib/mobile-auth";

const nextAuthHandler = NextAuth(authOptions);

// The catch-all handler expects a `nextauth` route param; synthesise it.
// (params is async in this Next version, matching the original catch-all.)
function nextAuthCtx() {
  return { params: Promise.resolve({ nextauth: ["session"] }) };
}

export async function GET(req: NextRequest) {
  const token = getBearerToken(req);
  if (token) {
    const user = await getUserFromMobileToken(token);
    if (!user) {
      return NextResponse.json(
        { message: "Invalid or expired session" },
        { status: 401 },
      );
    }
    return NextResponse.json({ user });
  }
  // Web — hand the request to NextAuth exactly as the catch-all would.
  return nextAuthHandler(req, nextAuthCtx() as never);
}

export async function POST(req: NextRequest) {
  // NextAuth may POST to /session for client-side updates — always delegate.
  return nextAuthHandler(req, nextAuthCtx() as never);
}
