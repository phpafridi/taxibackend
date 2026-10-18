// POST   /api/m/brand/card/link — make a NEW share link (the old one stops working straight away; also turns sharing back on)
// DELETE /api/m/brand/card/link — switch the public link off
import { NextResponse } from "next/server";
import { requireUser, requireAdmin, fail } from "../../../../../../../lib/mobile-api";
import { brandStatus } from "../../../../../../../lib/brand";
import { newShareToken, readCard, saveCard } from "../../../../../../../lib/card";

export async function POST(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res; const denied = requireAdmin(g); if (denied) return denied;
    const cur = await readCard();
    await saveCard({ profile: cur.profile, shareToken: newShareToken() }, g.user.id);
    return NextResponse.json(await brandStatus());
  } catch (err) { return fail("brand/card/link", err); }
}

export async function DELETE(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res; const denied = requireAdmin(g); if (denied) return denied;
    const cur = await readCard();
    await saveCard({ profile: cur.profile, shareToken: null }, g.user.id);
    return NextResponse.json(await brandStatus());
  } catch (err) { return fail("brand/card/link", err); }
}
