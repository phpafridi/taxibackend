// lib/auth-config.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { PrismaClient } from "@prisma/client";
import { prisma, checkLoginLockout, recordLoginFailure, recordLoginSuccess } from "./prisma";
import { checkIpRateLimit, recordIpAttempt, clearIpAttempts } from "./rate-limiter";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const authOptions: NextAuthOptions = {
  // PrismaAdapter's types expect the base PrismaClient shape ($on/$use),
  // which our realtime-broadcast extension doesn't carry in its type
  // (though every actual method the adapter calls still works fine at
  // runtime — this cast only fixes the type mismatch, nothing behavioral).
  adapter: PrismaAdapter(prisma as unknown as PrismaClient),
  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
    maxAge: 15 * 24 * 60 * 60, // 15 days
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase();

        // ── IP-based rate limit (protects non-existent accounts too) ──────────
        const ip = (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim()
          || req?.headers?.['x-real-ip'] as string
          || 'unknown';

        const ipCheck = checkIpRateLimit(ip);
        if (ipCheck.blocked) {
          throw new Error(`Too many login attempts from your network. Please try again in ${ipCheck.minutesLeft} minute${ipCheck.minutesLeft === 1 ? '' : 's'}.`);
        }

        // ── DB-based lockout (per email, registered users only) ───────────────
        const lockoutMessage = await checkLoginLockout(email);
        if (lockoutMessage) throw new Error(lockoutMessage);

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password || !user.isActive) {
          // Record IP attempt even for non-existent accounts
          recordIpAttempt(ip);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          recordIpAttempt(ip);
          await recordLoginFailure(email);
          return null;
        }

        // Successful login — clear IP attempts
        clearIpAttempts(ip);
        await recordLoginSuccess(email);

        // 🔥 LOGOUT FROM ALL OTHER BROWSERS
        await prisma.session.updateMany({
          where: { userId: user.id },
          data: { isActive: false },
        });

        // ✅ CREATE NEW DB SESSION
        const sessionToken = crypto.randomUUID();

        await prisma.session.create({
          data: {
            sessionToken,
            userId: user.id,
            expires: new Date("9999-12-31"), // never expires
            isActive: true,
          },
        });

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          sessionToken, // 🔥 IMPORTANT
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = Number(user.id);
        token.role = user.role;
        // Don't store avatar in JWT - it can be a large base64 string and bloats the cookie (HTTP 431)
        token.sessionToken = user.sessionToken;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId.toString();
        session.user.role = token.role as string;
        // @ts-ignore
        session.sessionToken = token.sessionToken;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      return baseUrl; // ✅ Redirect handled in frontend
    },
  },

  pages: {
    signIn: "/sign-in",
  },
};
