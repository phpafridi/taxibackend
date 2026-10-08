// lib/mobile-api.ts
// Shared helpers for the mobile (Expo) API under /api/m/*.
// Self-contained token auth (existing `session` table). Does NOT touch the web.

import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";

export { prisma };

export const MOBILE_SESSION_MAX_AGE_MS = 15 * 24 * 60 * 60 * 1000;

// ── coercion ────────────────────────────────────────────────────────────────
export function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v as never);
  return Number.isFinite(n) ? n : 0;
}
export function numU(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = Number(v as never);
  return Number.isFinite(n) ? n : undefined;
}
export function iso(d: Date | null | undefined): string | undefined {
  return d ? new Date(d).toISOString() : undefined;
}
export function isoReq(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString() : new Date(0).toISOString();
}

// ── query params (treat "undefined"/"null"/"" as absent) ─────────────────────
export function qstr(sp: URLSearchParams, key: string): string | undefined {
  const v = sp.get(key);
  if (v == null) return undefined;
  const t = v.trim();
  if (t === "" || t === "undefined" || t === "null") return undefined;
  return t;
}
export function qint(sp: URLSearchParams, key: string): number | undefined {
  const v = qstr(sp, key);
  if (v == null) return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}
export function qbool(sp: URLSearchParams, key: string): boolean | undefined {
  const v = qstr(sp, key);
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}
export function pageParams(url: string, defLimit = 20) {
  const sp = new URL(url).searchParams;
  const page = Math.max(1, qint(sp, "page") ?? 1);
  const limit = Math.max(1, Math.min(100, qint(sp, "limit") ?? defLimit));
  return { sp, page, limit, skip: (page - 1) * limit };
}
export function paginated<T>(data: T[], total: number, page: number, limit: number) {
  return { data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// ── error helper: surface the real cause as JSON instead of an opaque 500 ────
export function fail(where: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[/api/m/${where}]`, err);
  return NextResponse.json({ message: `${where}: ${message}` }, { status: 500 });
}

// ── auth ──────────────────────────────────────────────────────────────────────
export function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

export async function createMobileSession(userId: number, req?: Request): Promise<string> {
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

export async function revokeMobileSession(token: string): Promise<void> {
  if (!token) return;
  await prisma.session
    .updateMany({ where: { sessionToken: token }, data: { isActive: false } })
    .catch(() => {});
}

export async function getSessionUser(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) return null;
    const s = await prisma.session.findUnique({ where: { sessionToken: token } });
    if (!s || !s.isActive || s.expires.getTime() < Date.now()) return null;
    const user = await prisma.user.findUnique({ where: { id: s.userId } });
    if (!user || !user.isActive) return null;
    return user;
  } catch (err) {
    console.error("[mobile-api] getSessionUser error:", err);
    return null;
  }
}

export type Guarded =
  | { ok: true; user: { id: number; role: string; name: string; email: string; avatar: string | null; HIRE: boolean; INSURANCE_C: boolean } }
  | { ok: false; res: NextResponse };

export async function requireUser(req: Request): Promise<Guarded> {
  const user = await getSessionUser(req);
  if (!user) return { ok: false, res: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  return { ok: true, user: user as never };
}

export function requireAdmin(g: Guarded): NextResponse | null {
  if (!g.ok) return g.res;
  if (g.user.role !== "ADMIN") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  return null;
}

// Resolve the driverprofile.id for a given user (drivers only). null if none.
export async function driverProfileIdFor(userId: number): Promise<number | null> {
  const dp = await prisma.driverprofile.findUnique({ where: { userId } }).catch(() => null);
  return dp ? (dp as { id: number }).id : null;
}

export async function toMobileUser(u: {
  id: number; name: string; email: string; role: string;
  avatar: string | null; HIRE: boolean; INSURANCE_C: boolean;
}) {
  const driverProfileId = u.role === "ADMIN" ? null : await driverProfileIdFor(u.id);
  return {
    id: String(u.id), name: u.name, email: u.email, role: u.role,
    avatar: u.avatar ?? undefined, HIRE: u.HIRE, INSURANCE_C: u.INSURANCE_C,
    driverProfileId: driverProfileId ?? undefined,
  };
}

// ── prisma includes ───────────────────────────────────────────────────────────
export const driverUserInclude = {
  user_driverprofile_userIdTouser: { select: { name: true, email: true, phone: true, avatar: true } },
} as const;
export const carBasicSelect = { id: true, registration: true, model: true, make: true, year: true, bodyType: true } as const;

// ── serializers ───────────────────────────────────────────────────────────────
type AnyRec = Record<string, unknown>;
type DriverUser = { name: string; email: string; phone: string | null; avatar: string | null };

export function serializeDriverProfile(dp: AnyRec) {
  const u = (dp.user_driverprofile_userIdTouser as DriverUser) ?? { name: "", email: "", phone: null, avatar: null };
  return {
    id: dp.id as number,
    userId: dp.userId as number,
    licenseNumber: (dp.licenseNumber as string) ?? undefined,
    licenseExpiry: iso(dp.licenseExpiry as Date),
    dateOfBirth: iso(dp.dateOfBirth as Date),
    nationalInsuranceNumber: (dp.nationalInsuranceNumber as string) ?? undefined,
    address: (dp.address as string) ?? undefined,
    postcode: (dp.postcode as string) ?? undefined,
    emergencyContact: (dp.emergencyContact as string) ?? undefined,
    emergencyPhone: (dp.emergencyPhone as string) ?? undefined,
    weeklyAmount: num(dp.weeklyAmount),
    depositPaid: numU(dp.depositPaid),
    isActive: Boolean(dp.isActive),
    isVerified: Boolean(dp.isVerified),
    verifiedAt: iso(dp.verifiedAt as Date),
    agreementSigned: Boolean(dp.agreementSigned),
    createdAt: isoReq(dp.createdAt as Date),
    user_driverprofile_userIdTouser: {
      name: u.name, email: u.email, phone: u.phone ?? undefined, avatar: u.avatar ?? undefined,
    },
  };
}

export function serializeCar(car: AnyRec) {
  const dp = car.driverprofile as AnyRec | null | undefined;
  return {
    id: car.id as number,
    registration: car.registration as string,
    model: car.model as string,
    make: car.make as string,
    year: (car.year as number) ?? undefined,
    color: (car.color as string) ?? undefined,
    bodyType: (car.bodyType as string) ?? undefined,
    avatar: (car.avatar as string) ?? undefined,
    purchasePrice: num(car.purchasePrice),
    currentValue: numU(car.currentValue),
    status: car.status as string,
    isActive: Boolean(car.isActive),
    driverProfileId: (car.driverProfileId as number) ?? undefined,
    createdAt: isoReq(car.createdAt as Date),
    HIRE: Boolean(car.HIRE),
    INSURANCE_C: Boolean(car.INSURANCE_C),
    driver: dp ? serializeDriverProfile(dp) : undefined,
  };
}

export function serializeMaintenance(m: AnyRec) {
  const car = m.car as AnyRec | undefined;
  const dp = m.driverprofile as AnyRec | undefined;
  const docs = (m.document as AnyRec[] | undefined) ?? [];
  return {
    id: m.id as number,
    carId: m.carId as number,
    driverId: m.driverId as number,
    title: m.title as string,
    description: m.description as string,
    mileage: (m.mileage as number) ?? undefined,
    amount: num(m.amount),
    estimatedAmount: numU(m.estimatedAmount),
    status: m.status as string,
    priority: undefined as string | undefined,
    approvedBy: (m.approvedBy as number) ?? undefined,
    approvedAt: iso(m.approvedAt as Date),
    approvedAmount: numU(m.approvedAmount),
    rejectionReason: (m.rejectionReason as string) ?? undefined,
    completedAt: iso(m.completedAt as Date),
    paidAt: iso(m.paidAt as Date),
    garageName: (m.garageName as string) ?? undefined,
    garageContact: (m.garageContact as string) ?? undefined,
    notes: (m.notes as string) ?? undefined,
    createdAt: isoReq(m.createdAt as Date),
    car: car ? { id: car.id, registration: car.registration, model: car.model, make: car.make, year: car.year ?? undefined } : undefined,
    driverprofile: dp ? serializeDriverProfile(dp) : undefined,
    photos: docs.map((d) => ({
      id: d.id as number,
      fileName: d.fileName as string,
      fileUrl: d.fileUrl as string,
      mimeType: (d.mimeType as string) ?? undefined,
    })),
  };
}

export function serializeWeeklyPayment(w: AnyRec) {
  return {
    id: w.id as number,
    carId: w.carId as number,
    driverId: w.driverId as number,
    amount: num(w.amount),
    weekStart: isoReq(w.weekStart as Date),
    weekEnd: isoReq(w.weekEnd as Date),
    dueDate: isoReq(w.dueDate as Date),
    status: w.status as string,
    paidAt: iso(w.paidAt as Date),
    reference: (w.reference as string) ?? undefined,
    method: (w.method as string) ?? undefined,
    notes: (w.notes as string) ?? undefined,
    createdAt: isoReq(w.createdAt as Date),
  };
}

export function serializeAgreement(a: AnyRec) {
  const car = a.car as AnyRec | undefined;
  const dp = a.driverprofile as AnyRec | undefined;
  return {
    id: a.id as number,
    type: a.type as string,
    driverId: (a.driverId as number) ?? undefined,
    carId: (a.carId as number) ?? undefined,
    title: a.title as string,
    content: a.content as string,
    weeklyRate: numU(a.weeklyRate),
    depositAmount: numU(a.depositAmount),
    depositPaid: Boolean(a.depositPaid),
    startDate: iso(a.startDate as Date),
    endDate: iso(a.endDate as Date),
    dateIn: iso(a.dateIn as Date),
    insuranceNumber: (a.insuranceNumber as string) ?? undefined,
    signedAt: iso(a.signedAt as Date),
    terminatedAt: iso(a.terminatedAt as Date),
    signedByName: (a.signedByName as string) ?? undefined,
    signatureData: (a.signatureData as string) ?? undefined,
    status: a.status as string,
    isActive: Boolean(a.isActive),
    createdAt: isoReq(a.createdAt as Date),
    damageOutMajorDamage: Boolean(a.damageOutMajorDamage),
    damageOutDent: Boolean(a.damageOutDent),
    damageOutScratch: Boolean(a.damageOutScratch),
    damageOutMissing: Boolean(a.damageOutMissing),
    damageOutChip: Boolean(a.damageOutChip),
    damageOutNotes: (a.damageOutNotes as string) ?? undefined,
    damageInMajorDamage: Boolean(a.damageInMajorDamage),
    damageInDent: Boolean(a.damageInDent),
    damageInScratch: Boolean(a.damageInScratch),
    damageInMissing: Boolean(a.damageInMissing),
    damageInChip: Boolean(a.damageInChip),
    damageInNotes: (a.damageInNotes as string) ?? undefined,
    car: car ? { id: car.id, registration: car.registration, model: car.model, make: car.make, year: car.year ?? undefined } : undefined,
    driverprofile: dp ? serializeDriverProfile(dp) : undefined,
  };
}

export function serializeLedger(l: AnyRec) {
  const car = (l as { car?: { registration?: string } }).car;
  const dp = (l as { driverprofile?: { user_driverprofile_userIdTouser?: { name?: string } } }).driverprofile;
  return {
    id: l.id as number,
    ownerType: l.ownerType as string,
    ownerId: l.ownerId as number,
    carId: (l.carId as number) ?? undefined,
    driverId: (l.driverId as number) ?? undefined,
    category: l.category as string,
    direction: l.direction as string,
    amount: num(l.amount),
    description: (l.description as string) ?? undefined,
    balanceBefore: numU(l.balanceBefore),
    balanceAfter: numU(l.balanceAfter),
    paymentMethod: (l.paymentMethod as string) ?? undefined,
    paymentDate: iso(l.paymentDate as Date),
    status: (l.status as string) ?? 'ACCEPT',
    rejectionReason: (l.rejectionReason as string) ?? undefined,
    carRegistration: car?.registration ?? undefined,
    driverName: dp?.user_driverprofile_userIdTouser?.name ?? undefined,
    isReconciled: Boolean(l.isReconciled),
    createdAt: isoReq(l.createdAt as Date),
  };
}

export function serializeNotification(n: AnyRec) {
  return {
    id: n.id as number,
    userId: (n.userId as number) ?? undefined,
    driverId: (n.driverId as number) ?? undefined,
    type: n.type as string,
    priority: (n.priority as string) ?? "MEDIUM",
    title: n.title as string,
    message: n.message as string,
    actionUrl: (n.actionUrl as string) ?? undefined,
    isRead: Boolean(n.isRead),
    readAt: iso(n.readAt as Date),
    createdAt: isoReq(n.createdAt as Date),
  };
}

// ── Expo Push Notification helpers ───────────────────────────────────────────
export async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  if (!tokens.length) return;
  const messages = tokens
    .filter(t => t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["))
    .map(to => ({ to, title, body, data, sound: "default", channelId: "default" }));
  if (!messages.length) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error("Expo push error:", err);
  }
}

export async function getTokensForUsers(userIds: number[]): Promise<string[]> {
  if (!userIds.length) return [];
  // Check both userId and driverId columns — drivers have their token stored
  // against their driverprofile row, so userId may be null on the FcmToken.
  const driverRows = await prisma.driverprofile.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const driverIds = driverRows.map((d: { id: number }) => d.id);

  const rows = await prisma.fcmToken.findMany({
    where: {
      OR: [
        ...(userIds.length   ? [{ userId:   { in: userIds   } }] : []),
        ...(driverIds.length ? [{ driverId: { in: driverIds } }] : []),
      ],
    },
    select: { token: true },
  });
  // Deduplicate in case a token is stored under both columns
  return [...new Set(rows.map((r: { token: string }) => r.token))];
}
