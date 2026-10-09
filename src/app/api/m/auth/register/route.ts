// POST /api/m/auth/register — public driver self-registration.
// Creates an INACTIVE user + driver profile (applicationStatus PENDING) plus the uploaded
// document photos. An admin reviews it in the app and approves or rejects.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { checkIpRateLimit, recordIpAttempt } from "../../../../../../lib/rate-limiter";
import { prisma, sendExpoPush, getTokensForUsers } from "../../../../../../lib/mobile-api";

const MAX_IMG = 2_500_000; // characters of a base64 data URI (~1.8 MB)
const PHOTO_KEYS: Record<string, string> = {
  licenseFront: "Driving licence (front)",
  licenseBack: "Driving licence (back)",
  selfie: "Photo of driver",
  proofOfAddress: "Proof of address",
  phvLicense: "Private hire driver licence",
  other: "Other document",
};

const str = (v: unknown, max = 255) => (v == null ? "" : String(v).trim().slice(0, max));
const validImg = (v: unknown): v is string => typeof v === "string" && /^data:image\/(jpeg|jpg|png|webp);base64,/.test(v) && v.length < MAX_IMG;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const key = `register:${ip}`;
  const rl = checkIpRateLimit(key);
  if (rl.blocked) return NextResponse.json({ message: `Too many attempts. Try again in ${rl.minutesLeft} minutes.` }, { status: 429 });

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return NextResponse.json({ message: "Invalid request" }, { status: 400 }); }
  recordIpAttempt(key);

  const name = str(body.name, 100);
  const email = str(body.email).toLowerCase();
  const phone = str(body.phone, 20);
  const password = str(body.password, 100);
  const licenseNumber = str(body.licenseNumber, 50).toUpperCase();
  const licenseExpiry = body.licenseExpiry ? new Date(str(body.licenseExpiry, 30)) : null;
  const dateOfBirth = body.dateOfBirth ? new Date(str(body.dateOfBirth, 30)) : null;
  const address = str(body.address, 500);
  const postcode = str(body.postcode, 20).toUpperCase();

  if (name.length < 2) return NextResponse.json({ message: "Please enter your full name" }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ message: "Please enter a valid email" }, { status: 400 });
  if (phone.length < 7) return NextResponse.json({ message: "Please enter your phone number" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 });
  if (!licenseNumber) return NextResponse.json({ message: "Driving licence number is required" }, { status: 400 });
  if (!licenseExpiry || isNaN(licenseExpiry.getTime())) return NextResponse.json({ message: "Licence expiry date is required" }, { status: 400 });
  if (dateOfBirth && isNaN(dateOfBirth.getTime())) return NextResponse.json({ message: "Date of birth is not valid" }, { status: 400 });
  if (!address || !postcode) return NextResponse.json({ message: "Address and postcode are required" }, { status: 400 });

  const photos = (body.photos ?? {}) as Record<string, unknown>;
  if (!validImg(photos.licenseFront) || !validImg(photos.licenseBack))
    return NextResponse.json({ message: "Photos of the front and back of your driving licence are required" }, { status: 400 });
  if (!validImg(photos.selfie))
    return NextResponse.json({ message: "A photo of yourself is required" }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ message: "An account with this email already exists. Try signing in." }, { status: 409 });

  const hashed = await bcrypt.hash(password, 10);
  const now = new Date();
  let userId = 0; let dpId = 0;
  try {
    const user = await prisma.user.create({
      data: {
        name, email, phone, password: hashed, role: "DRIVER", isActive: false,
        avatar: photos.selfie as string, updatedAt: now,
      } as never,
    });
    userId = user.id;
    const dp = await prisma.driverprofile.create({
      data: {
        userId: user.id, licenseNumber, licenseExpiry, dateOfBirth, address, postcode,
        nationalInsuranceNumber: str(body.nationalInsuranceNumber, 50) || null,
        emergencyContact: str(body.emergencyContact, 100) || null,
        emergencyPhone: str(body.emergencyPhone, 20) || null,
        weeklyAmount: 0, isActive: false, isVerified: false, applicationStatus: "PENDING", updatedAt: now,
      } as never,
    });
    dpId = dp.id;
  } catch (err) {
    // Never leave a half-created applicant behind (account without a profile).
    if (userId && !dpId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    if ((err as { code?: string })?.code === "P2002")
      return NextResponse.json({ message: "An account with this email already exists. Try signing in." }, { status: 409 });
    console.error("[register]", err);
    return NextResponse.json({ message: "Could not submit your application. Please try again." }, { status: 500 });
  }
  const dp = { id: dpId };

  for (const [k, label] of Object.entries(PHOTO_KEYS)) {
    const img = photos[k];
    if (k === "selfie" || !validImg(img)) continue; // selfie is stored as the avatar
    await prisma.document.create({
      data: {
        type: (k.startsWith("license") ? "LICENSE" : "OTHER") as never, name: label, fileName: `${k}.jpg`,
        fileUrl: img, mimeType: img.slice(5, img.indexOf(";")), driverId: dp.id, updatedAt: now,
      } as never,
    }).catch(() => {});
  }

  // Tell admins.
  try {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" as never, isActive: true }, select: { id: true } });
    await Promise.all(admins.map((a: { id: number }) => prisma.notification.create({
      data: {
        type: "SYSTEM" as never, priority: "HIGH", title: "New driver application",
        message: `${name} has applied to become a driver.`, isForAdmin: true, userId: a.id,
        referenceType: "DRIVER_APPLICATION", referenceId: dp.id, actionUrl: `/modals/driver-application-detail?id=${dp.id}`, updatedAt: now,
      } as never,
    }).catch(() => {})));
    const tokens = await getTokensForUsers(admins.map((a: { id: number }) => a.id));
    await sendExpoPush(tokens, "New driver application 📝", `${name} has applied. Tap to review.`, { route: `/modals/driver-application-detail?id=${dp.id}` });
  } catch { /* best effort */ }

  return NextResponse.json({ ok: true, status: "PENDING" }, { status: 201 });
}
