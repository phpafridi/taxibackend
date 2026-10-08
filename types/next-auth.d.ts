import NextAuth, { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;                 // JWT requires string
    role: string;
    avatar?: string | null;
    image?: string | null;
    sessionToken?: string;      // ✅ FIX
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      avatar?: string | null;
      image?: string | null;
    } & DefaultSession["user"];

    sessionToken?: string;      // ✅ FIX
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId: number;             // ✅ FIX (INT userId)
    role: string;
    avatar?: string | null;
    sessionToken?: string;      // ✅ FIX
  }
}
