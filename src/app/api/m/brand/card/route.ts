// PUT /api/m/brand/card { profile } — save the business-card details. The first save also creates the share link;
// after that a save never changes the link (and never switches it back on if the admin turned it off).
import { NextResponse } from "next/server";
import { requireUser, requireAdmin, fail } from "../../../../../../lib/mobile-api";
import { brandStatus } from "../../../../../../lib/brand";
import { newShareToken, normaliseCard, readCard, saveCard } from "../../../../../../lib/card";

export async function PUT(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res; const denied = requireAdmin(g); if (denied) return denied;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const cur = await readCard();
    const profile = normaliseCard(body.profile, cur.profile);
    await saveCard({ profile, shareToken: cur.exists ? cur.shareToken : newShareToken() }, g.user.id);
    return NextResponse.json(await brandStatus());
  } catch (err) { return fail("brand/card", err); }
}
