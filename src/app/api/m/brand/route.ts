// GET /api/m/brand — what is set up (letterhead + business card). Admin only.
import { NextResponse } from "next/server";
import { requireUser, requireAdmin, fail } from "../../../../../lib/mobile-api";
import { brandStatus } from "../../../../../lib/brand";

export async function GET(req: Request) {
  try {
    const g = await requireUser(req); const denied = requireAdmin(g); if (denied) return denied;
    return NextResponse.json(await brandStatus());
  } catch (err) { return fail("brand", err); }
}
