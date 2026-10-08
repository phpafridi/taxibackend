// src/instrumentation.ts
//
// Next.js calls `register()` exactly once when the server process starts,
// before it begins handling requests. This is the supported, host-agnostic
// way to run "start a background job" code — works identically on Railway,
// a plain VPS, Docker, or anywhere else running `next start`, with no
// platform-specific cron service required.
//
// Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // Only run on the Node.js server runtime (not the edge runtime, and never
  // in the browser) — node-cron and Prisma both require Node APIs.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerExpiryScheduler } = await import("../lib/expiry-scheduler");
    registerExpiryScheduler();
  }
}
