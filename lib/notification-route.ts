// Works out which app screen a notification should open when it is tapped.
// Older notifications only store a web-style actionUrl ("/cars/5", "/driver-portal/profile"),
// so the app route is derived from the actionUrl / type / referenceType / referenceId.
type N = {
  type?: string | null; actionUrl?: string | null; referenceType?: string | null; referenceId?: number | null;
  driverId?: number | null; isForAdmin?: boolean | null;
};

/** `driverIdByUserId` maps user id → driverprofile id (some admin notifications store the user id). */
export function notificationRoute(n: N, isAdmin: boolean, driverIdByUserId: Map<number, number> = new Map()): string | null {
  const url = (n.actionUrl || "").trim();
  const ref = n.referenceId ?? null;
  const rt = (n.referenceType || "").toLowerCase();
  const type = n.type || "";

  if (url.startsWith("/modals/") || url.startsWith("/(tabs)")) return url;

  if (rt === "driver_application") return ref ? `/modals/driver-application-detail?id=${ref}` : "/modals/driver-applications";

  if (rt === "driver") {
    if (!isAdmin) return "/profile";
    const dpId = (ref != null && driverIdByUserId.get(ref)) || n.driverId || null;
    return dpId ? `/modals/driver-detail?id=${dpId}` : "/drivers";
  }

  if (rt === "agreement" || type.startsWith("AGREEMENT_") || url.includes("agreements")) {
    return ref && rt === "agreement" ? `/modals/agreement-detail?id=${ref}` : "/agreements";
  }

  if (rt === "maintenance" || type.startsWith("MAINTENANCE_")) {
    return ref && rt === "maintenance" ? `/modals/maintenance-detail?id=${ref}` : "/maintenance";
  }

  if (rt === "insurance" || type === "INSURANCE_EXPIRY") {
    const m = url.match(/\/cars\/(\d+)/);
    if (isAdmin && m) return `/modals/car-detail?id=${m[1]}`;
    return isAdmin ? "/modals/expiring" : "/cars";
  }

  if (type.startsWith("WEEKLY_PAYMENT_") || type === "LEDGER_UPDATE" || rt.startsWith("ledger") || rt === "weekly_payment" || rt === "auto_weekly_debit") {
    return "/ledger";
  }

  if (url.includes("profile")) return "/profile";
  return null; // generic message — just mark as read
}
