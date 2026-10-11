// Shared look for the public legal pages (/privacy, /terms, /delete-account).
// >>> EDIT THESE THREE LINES with your real company details before submitting to the app stores. <<<
export const LEGAL = {
  company: "RS Private Hire",
  email: "support@rsphire.co.uk",
  address: "United Kingdom", // put your registered business address here
  updated: "10 October 2026",
  version: "2026-10",
};

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: "#1a1a1a", lineHeight: 1.65, fontSize: 16 }}>
      <p style={{ margin: 0, color: "#666", fontSize: 14 }}>{LEGAL.company}</p>
      <h1 style={{ fontSize: 32, margin: "6px 0 4px" }}>{title}</h1>
      <p style={{ color: "#666", fontSize: 14, marginTop: 0 }}>Last updated: {LEGAL.updated}</p>
      <div>{children}</div>
      <hr style={{ margin: "40px 0 16px", border: 0, borderTop: "1px solid #ddd" }} />
      <p style={{ fontSize: 14, color: "#666" }}>
        <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Use</a> · <a href="/delete-account">Delete your account</a> · {LEGAL.email}
      </p>
    </main>
  );
}

export const H2 = ({ children }: { children: React.ReactNode }) => <h2 style={{ fontSize: 21, margin: "32px 0 6px" }}>{children}</h2>;
