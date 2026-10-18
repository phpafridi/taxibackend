// Public page for the shared business card: anyone with the link sees the card, can save the contact or download the PDF.
// No sign-in. The card is drawn from the live details, so a change in the app shows here straight away.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readCardByToken } from "../../../../lib/card";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const p = await readCardByToken((await params).token);
  const who = p ? [p.name, p.company].filter(Boolean).join(" – ") : "Business card";
  return {
    title: who || "Business card",
    description: p ? [p.jobTitle, p.phone, p.email].filter(Boolean).join(" · ") || "Business card" : "Business card",
    robots: { index: false, follow: false }, // a private link, keep it out of search engines
  };
}

const AMBER = "#FFB020";

export default async function CardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await readCardByToken(token);
  if (!p) notFound();
  const href = (v: string) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);
  const line = (txt: string, link?: string) => link
    ? <a href={link} style={{ color: "#DCDCE4", textDecoration: "none" }}>{txt}</a> : <span>{txt}</span>;
  const btn = { display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 16, padding: "14px 26px", borderRadius: 999, textDecoration: "none" } as const;
  return (
    <main style={{ minHeight: "100vh", background: "#0A0A0F", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 460, aspectRatio: "255 / 156", background: "linear-gradient(135deg,#15151c,#08080b)", borderRadius: 14, boxShadow: "0 18px 60px rgba(0,0,0,.6)", border: "1px solid #24242c", position: "relative", overflow: "hidden", padding: "7% 7% 9%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          {p.company && <div style={{ color: AMBER, fontSize: 12, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase" }}>{p.company}</div>}
          {p.name && <div style={{ fontSize: "clamp(22px, 6.4vw, 31px)", fontWeight: 700, marginTop: 14, lineHeight: 1.1 }}>{p.name}</div>}
          {p.jobTitle && <div style={{ color: "#C7C7D1", fontSize: 14, marginTop: 5 }}>{p.jobTitle}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 13, color: "#DCDCE4", wordBreak: "break-word" }}>
          {p.phone && line(p.phone, `tel:${p.phone.replace(/[^+\d]/g, "")}`)}
          {p.email && line(p.email, `mailto:${p.email}`)}
          {p.website && line(p.website, href(p.website))}
          {p.address && line(p.address)}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: AMBER }} />
      </div>
      <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <a href={`/card/${token}/contact`} style={{ ...btn, background: "#fff", color: "#000" }}>Save contact</a>
        <a href={`/card/${token}/pdf`} style={{ ...btn, background: "#1d1d25", color: "#fff", border: "1px solid #34343e" }}>Download card (PDF)</a>
      </div>
    </main>
  );
}
