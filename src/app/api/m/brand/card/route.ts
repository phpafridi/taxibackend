// PUT    /api/m/brand/card { image } — upload / replace the business card (keeps the same share link)
// DELETE /api/m/brand/card           — remove it (the public link stops working)
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../lib/mobile-api";
import { KIND_CARD, MAX_IMAGE_CHARS, brandStatus, newShareToken } from "../../../../../../lib/brand";
import { parseDataUri } from "../../../../../../lib/letterhead";

const OK = ["image/jpeg", "image/png", "image/webp"];

export async function PUT(req: Request) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const image = typeof body.image === "string" ? body.image : "";
    if (!image) return NextResponse.json({ message: "Please choose your business card image." }, { status: 400 });
    if (image.length > MAX_IMAGE_CHARS) return NextResponse.json({ message: "That image is too large. Please use a smaller picture." }, { status: 413 });
    const parsed = parseDataUri(image);
    if (!parsed || !OK.includes(parsed.mime)) return NextResponse.json({ message: "Please use a JPG or PNG image." }, { status: 400 });

    const existing = await prisma.brandasset.findUnique({ where: { kind: KIND_CARD }, select: { shareToken: true } });
    const shareToken = existing?.shareToken || newShareToken();
    await prisma.brandasset.upsert({
      where: { kind: KIND_CARD },
      create: { kind: KIND_CARD, image, shareToken },
      update: { image, shareToken },
    });
    return NextResponse.json(await brandStatus());
  } catch (err) { return fail("brand/card", err); }
}

export async function DELETE(req: Request) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    await prisma.brandasset.deleteMany({ where: { kind: KIND_CARD } });
    return NextResponse.json(await brandStatus());
  } catch (err) { return fail("brand/card", err); }
}
