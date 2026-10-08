// src/app/(auth-api)/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "../../../../../../lib/auth-config"; // Import from shared config

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// ❌ REMOVE any export of authOptions from this file
// export { authOptions }; // DELETE THIS LINE IF IT EXISTS