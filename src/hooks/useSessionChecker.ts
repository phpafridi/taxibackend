"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

export function useSessionChecker() {
  const router = useRouter();
  const pathname = usePathname(); // triggers effect on route change

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/check-session", { cache: "no-store" });
        if (!res.ok && active) {
          await signOut({ redirect: false });
          router.replace("/sign-in");
        }
      } catch {
        if (active) {
          await signOut({ redirect: false });
          router.replace("/sign-in");
        }
      }
    };

    // Check session on mount and route change
    checkSession();

    return () => {
      active = false;
    };
  }, [pathname, router]); // triggers whenever the route changes
}
