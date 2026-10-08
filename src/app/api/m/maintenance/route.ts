import { NextResponse } from "next/server";
import { prisma, requireUser, driverProfileIdFor, pageParams, paginated, qstr, serializeMaintenance, driverUserInclude, carBasicSelect, fail, sendExpoPush, getTokensForUsers } from "../../../../../lib/mobile-api";

const inc = { car: { select: carBasicSelect }, driverprofile: { include: driverUserInclude }, document: true };

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const { sp, page, limit, skip } = pageParams(req.url);
    const status = qstr(sp, "status");
    const search = qstr(sp, "search");
    const where: Record<string, unknown> = {};
    if (g.user.role !== "ADMIN") { const dpid = await driverProfileIdFor(g.user.id); where.driverId = dpid ?? -1; }
    if (status) where.status = status;
    if (search) where.OR = [{ title: { contains: search } }, { description: { contains: search } }];
    const [total, rows] = await Promise.all([
      prisma.maintenancerequest.count({ where }),
      prisma.maintenancerequest.findMany({ where, include: inc, orderBy: { createdAt: "desc" }, skip, take: limit }),
    ]);
    return NextResponse.json(paginated(rows.map(serializeMaintenance as never), total, page, limit));
  } catch (err) { return fail("maintenance", err); }
}

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res;
    const body = await req.json().catch(() => ({}));
    if (body.carId == null || !body.title || !body.description || body.amount == null)
      return NextResponse.json({ message: "carId, title, description and amount are required" }, { status: 400 });
    const dp = await prisma.driverprofile.findUnique({ where: { userId: g.user.id } });
    let driverId: number | null = body.driverId != null ? Number(body.driverId) : (dp?.id ?? null);
    if (driverId == null && body.carId != null) {
      const car = await prisma.car.findUnique({ where: { id: Number(body.carId) } });
      driverId = (car as { driverProfileId: number | null } | null)?.driverProfileId ?? null;
    }
    if (driverId == null) return NextResponse.json({ message: "No driver is assigned to this vehicle" }, { status: 400 });

    const row = await prisma.maintenancerequest.create({
      data: {
        carId: Number(body.carId), driverId, title: String(body.title), description: String(body.description),
        amount: Number(body.amount),
        mileage: body.mileage != null ? Number(body.mileage) : null,
        garageName: body.garageName != null ? String(body.garageName) : null,
        garageContact: body.garageContact != null ? String(body.garageContact) : null,
        status: "PENDING", updatedAt: new Date(),
      },
      include: inc,
    });
    const r = row as any;

    // Optional bill/quote photos from the mobile app — small base64 images,
    // saved the same way as avatars (data:image/...;base64,...) into the
    // shared `document` table the web app also reads from.
    const MAX_PHOTO_BASE64_CHARS = 6_000_000; // ~4.5MB decoded — generous ceiling for a resized JPEG
    const photos = Array.isArray(body.photos) ? body.photos : [];
    let createdDocuments: unknown[] = [];
    if (photos.length) {
      const results = await Promise.all(photos.slice(0, 5).map(async (p: { fileName?: string; mimeType?: string; base64?: string }, idx: number) => {
        if (!p?.base64) return null;
        if (p.base64.length > MAX_PHOTO_BASE64_CHARS) {
          console.error(`[maintenance photo ${idx + 1}] REJECTED — too large (${p.base64.length} base64 chars) for request #${r.id}. The client should resize before upload.`);
          return null;
        }
        const mimeType = p.mimeType || "image/jpeg";
        try {
          return await prisma.document.create({
            data: {
              type: "MAINTENANCE_INVOICE" as never,
              name: `Maintenance Photo ${idx + 1} - ${r.title}`,
              fileName: p.fileName || `maintenance-${r.id}-${idx + 1}.jpg`,
              fileUrl: `data:${mimeType};base64,${p.base64}`,
              mimeType,
              maintenanceId: r.id,
              driverId,
              carId: Number(body.carId),
              description: `Bill/quote photo for: ${r.title}`,
              uploadedBy: g.user.id,
              updatedAt: new Date(),
            } as never,
          });
        } catch (photoErr) {
          // Previously this failure was swallowed silently, which is exactly
          // why uploaded bill photos appeared to "vanish" with no error on
          // any platform. Log it loudly instead — the most common cause is
          // the `document.fileUrl` column not yet being migrated to TEXT
          // (run: npx prisma migrate dev) so a base64 image overflows the
          // old VarChar(1000) limit and the insert fails.
          console.error(`[maintenance photo ${idx + 1}] FAILED TO SAVE for request #${r.id}:`, photoErr);
          return null;
        }
      }));
      createdDocuments = results.filter(Boolean);
    }

    // Notify all admins of new maintenance request
    try {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" as never, isActive: true }, select: { id: true } });
      const driverName = r.driverprofile?.user_driverprofile_userIdTouser?.name ?? "A driver";
      const carReg = r.car?.registration ?? "";

      await Promise.all(admins.map((a: { id: number }) => prisma.notification.create({
        data: {
          type: "MAINTENANCE_REQUEST" as never,
          title: "New Maintenance Request 🔧",
          message: `${driverName} submitted a maintenance request: "${r.title}"${carReg ? ` for ${carReg}` : ""}.`,
          referenceType: "maintenance", referenceId: r.id,
          isForAdmin: true, userId: a.id, driverId, updatedAt: new Date(),
        } as never,
      })));

      // Push to admins
      const tokens = await getTokensForUsers(admins.map((a: { id: number }) => a.id));
      await sendExpoPush(tokens, "New Maintenance Request 🔧",
        `${driverName}: "${r.title}"${carReg ? ` · ${carReg}` : ""}`,
        { route: `/modals/maintenance-detail?id=${r.id}` });
    } catch { /* best-effort */ }

    // `row` was fetched before photos existed, so its `document` relation is
    // empty — attach the documents we just created so the response the app
    // receives immediately after submitting actually includes the photos.
    return NextResponse.json(serializeMaintenance({ ...row, document: createdDocuments } as never), { status: 201 });
  } catch (err) { return fail("maintenance", err); }
}
