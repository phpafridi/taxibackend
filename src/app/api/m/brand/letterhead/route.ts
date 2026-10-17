// PUT    /api/m/brand/letterhead  { image: "data:image/jpeg|png;base64,…", settings? } — upload / replace the letterhead
// DELETE /api/m/brand/letterhead                                                        — remove it
import { NextResponse } from "next/server";
import { prisma, requireUser, requireAdmin, fail } from "../../../../../../lib/mobile-api";
import { KIND_LETTERHEAD, MAX_IMAGE_CHARS, brandStatus, readSettings } from "../../../../../../lib/brand";
import { canEmbedImage, normaliseSettings, parseDataUri } from "../../../../../../lib/letterhead";

export async function PUT(req: Request) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const image = typeof body.image === "string" ? body.image : "";
    if (!image) return NextResponse.json({ message: "Please choose a letterhead image." }, { status: 400 });
    if (image.length > MAX_IMAGE_CHARS) return NextResponse.json({ message: "That image is too large. Please use a smaller picture." }, { status: 413 });
    const parsed = parseDataUri(image);
    if (!parsed || (parsed.mime !== "image/jpeg" && parsed.mime !== "image/png"))
      return NextResponse.json({ message: "Please use a JPG or PNG image." }, { status: 400 });
    if (!(await canEmbedImage(parsed.mime, parsed.bytes)))
      return NextResponse.json({ message: "That image could not be read. Please save it as a JPG and try again." }, { status: 400 });

    const existing = await prisma.brandasset.findUnique({ where: { kind: KIND_LETTERHEAD }, select: { meta: true } });
    const settings = normaliseSettings(body.settings, readSettings(existing?.meta));
    await prisma.brandasset.upsert({
      where: { kind: KIND_LETTERHEAD },
      create: { kind: KIND_LETTERHEAD, image, meta: JSON.stringify(settings) },
      update: { image, meta: JSON.stringify(settings) },
    });
    return NextResponse.json(await brandStatus());
  } catch (err) { return fail("brand/letterhead", err); }
}

export async function DELETE(req: Request) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    await prisma.brandasset.deleteMany({ where: { kind: KIND_LETTERHEAD } });
    return NextResponse.json(await brandStatus());
  } catch (err) { return fail("brand/letterhead", err); }
}
