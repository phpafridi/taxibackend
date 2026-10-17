// Public page for the shared business card: anyone with the link can see it and download it. No sign-in.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "../../../../lib/prisma";
import { KIND_CARD, TOKEN_RE, siteBase } from "../../../../lib/brand";

export const dynamic = "force-dynamic";

async function exists(token: string) {
  if (!TOKEN_RE.test(token)) return false;
  const row = await prisma.brandasset.findFirst({ where: { kind: KIND_CARD, shareToken: token }, select: { id: true } });
  return !!row;
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  if (!(await exists(token))) return { title: "Business card", robots: { index: false, follow: false } };
  const img = `${siteBase()}/card/${token}/image`;
  return {
    title: "RS Private Hire – Business card",
    description: "Business card of RS Private Hire.",
    robots: { index: false, follow: false }, // a private link, keep it out of search engines
    openGraph: { title: "RS Private Hire – Business card", images: [img] },
    twitter: { card: "summary_large_image", images: [img] },
  };
}

export default async function CardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await exists(token))) notFound();
  const src = `/card/${token}/image`;
  return (
    <main style={{ minHeight: "100vh", background: "#0A0A0F", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ letterSpacing: 2, fontSize: 12, color: "#9a9aa3", textTransform: "uppercase", marginBottom: 18 }}>RS Private Hire</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="RS Private Hire business card" style={{ width: "100%", maxWidth: 560, height: "auto", borderRadius: 14, boxShadow: "0 18px 60px rgba(0,0,0,.55)", background: "#1c1c22" }} />
      <a href={`${src}?download=1`} style={{ marginTop: 26, display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: "#000", fontWeight: 600, fontSize: 16, padding: "14px 26px", borderRadius: 999, textDecoration: "none" }}>
        Download card
      </a>
      <div style={{ marginTop: 14, fontSize: 12, color: "#7a7a83" }}>Tap the picture and hold to save or share.</div>
    </main>
  );
}
