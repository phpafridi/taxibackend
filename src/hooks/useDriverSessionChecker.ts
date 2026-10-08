"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

export function useDriverSessionChecker() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;

    const checkDriverSession = async () => {
      try {
        const res = await fetch("/api/check-session/drivers", { cache: "no-store" });

        if (!res.ok) {
          if (active) {
            await signOut({ redirect: false });
            router.replace("/sign-in");
          }
          return;
        }

        const data = await res.json();

        if (!data.valid) {
          if (active) router.replace("/unauthorized");
        }
      } catch (err) {
        console.error("Driver session check failed:", err);
        if (active) {
          await signOut({ redirect: false });
          router.replace("/sign-in");
        }
      }
    };

    checkDriverSession();

    return () => {
      active = false;
    };
  }, [pathname, router]);
}
