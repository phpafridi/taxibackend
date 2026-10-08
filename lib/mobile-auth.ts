// lib/mobile-auth.ts
//
// Helpers for the mobile (Expo) app's token authentication.
// These are layered ON TOP of the existing `session` table and DO NOT change
// any web / NextAuth behaviour. No new dependencies, no schema changes.
//
// A "mobile token" is simply an opaque row in the existing `session` table
// (the same table the web sign-in already writes to). The mobile app stores
// the token and sends it as `Authorization: Bearer <token>`.

import crypto from "crypto";
import { prisma } from "./prisma";

// Mobile token lifetime — mirrors the web JWT maxAge (15 days).
export const MOBILE_SESSION_MAX_AGE_MS = 15 * 24 * 60 * 60 * 1000;

// Shape the Expo app expects (see the app's `AuthUser` type).
export interface MobileUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  HIRE: boolean;
  INSURANCE_C: boolean;
}

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  HIRE: boolean;
  INSURANCE_C: boolean;
  isActive: boolean;
};

export function toMobileUser(u: UserRow): MobileUser {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    role: u.role,
    avatar: u.avatar ?? undefined,
    HIRE: u.HIRE,
    INSURANCE_C: u.INSURANCE_C,
  };
}

// Read a Bearer token from a request's Authorization header.
export function getBearerToken(req: Request): string | null {
  const h =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

// Issue a new opaque mobile token (a row in the existing `session` table).
// IMPORTANT: unlike the web sign-in, this does NOT deactivate the user's other
// sessions — so signing in on mobile never logs the user out of the web app.
export async function createMobileSession(
  userId: number,
  req?: Request,
): Promise<string> {
  const sessionToken = crypto.randomUUID();
  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires: new Date(Date.now() + MOBILE_SESSION_MAX_AGE_MS),
      isActive: true,
      deviceInfo: "mobile",
      userAgent: req?.headers.get("user-agent")?.slice(0, 500) ?? undefined,
    },
  });
  return sessionToken;
}

// Resolve a Bearer token to its user, or null if invalid / expired / inactive.
export async function getUserFromMobileToken(
  token: string,
): Promise<MobileUser | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });
  if (!session || !session.isActive) return null;
  if (session.expires.getTime() < Date.now()) return null;
  if (!session.user || !session.user.isActive) return null;
  return toMobileUser(session.user as unknown as UserRow);
}

// Deactivate a mobile token (used by logout).
export async function revokeMobileSession(token: string): Promise<void> {
  if (!token) return;
  await prisma.session
    .updateMany({ where: { sessionToken: token }, data: { isActive: false } })
    .catch(() => {});
}
