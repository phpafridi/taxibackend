// PUT /api/m/brand/letterhead/config { profile?, settings? } — save the company contact details (printed in the letter header
// and footer) and the font settings. Fields left out keep their old value.
import { NextResponse } from "next/server";
import { requireUser, requireAdmin, fail } from "../../../../../../../lib/mobile-api";
import { brandStatus, readConfig, saveConfig } from "../../../../../../../lib/brand";
import { normaliseProfile, normaliseSettings } from "../../../../../../../lib/letterhead";

export async function PUT(req: Request) {
  try {
    const g = await requireUser(req); if (!g.ok) return g.res; const denied = requireAdmin(g); if (denied) return denied;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const cur = await readConfig();
    const profile = normaliseProfile(body.profile, cur.profile);
    const settings = normaliseSettings(body.settings, cur.settings);
    await saveConfig({ profile, settings }, g.user.id);
    return NextResponse.json(await brandStatus());
  } catch (err) { return fail("brand/letterhead/config", err); }
}
