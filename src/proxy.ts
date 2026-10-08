// proxy.ts
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "../lib/prisma";

export async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = req.nextUrl;

  /* ---------------- PUBLIC PATHS ---------------- */
  const publicPaths = [
    // "/sign-up",
    // "/api/admin/signup",
    "/api/auth",
    "/sign-in",
    "/api/m",
    "/_next",
    "/sw.js",
    "/service-worker.js",
    "/icons",
    "/images",
    "/fonts",
    "/favicon.ico",
    "/error",
    "/unauthorized",
  ];

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  if (isPublicPath) return NextResponse.next();

  /* ---------------- NO JWT ---------------- */
  if (!token || !token.sessionToken || !token.userId) return forceLogout(req);

  /* ---------------- DB SESSION VALIDATION ---------------- */
  const dbSession = await prisma.session.findFirst({
    where: {
      sessionToken: token.sessionToken as string,
      userId: token.userId as number,
      isActive: true,
      expires: { gt: new Date() },
    },
  });

  if (!dbSession) return forceLogout(req);

  /* ---------------- ROLE-BASED ROUTING ---------------- */
  const role = token.role?.toString().toUpperCase()?.trim();

  if (pathname === "/") {
    if (role === "DRIVER") return NextResponse.redirect(new URL("/driver-portal/dashboard", req.url));
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin", req.url));
  }

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (pathname.startsWith("/driver-portal") && role !== "DRIVER") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
}

/* ---------------- FORCE LOGOUT ---------------- */
function forceLogout(req: NextRequest) {
  const url = new URL("/sign-in", req.url);
  url.searchParams.set("callbackUrl", req.nextUrl.pathname);

  const res = NextResponse.redirect(url);

  // Clear NextAuth cookies
  res.cookies.delete("next-auth.session-token");
  res.cookies.delete("__Secure-next-auth.session-token");
  res.cookies.delete("next-auth.csrf-token");
  res.cookies.delete("__Secure-next-auth.csrf-token");

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
