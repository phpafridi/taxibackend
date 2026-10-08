// lib/realtime.ts
//
// Fire-and-forget bridge from the Next.js app to the standalone real-time
// WebSocket server (see ws-server/index.ts). This NEVER throws and NEVER
// blocks the caller — a broadcast failing, or the ws-server being down,
// must never break the API request that triggered it.

const WS_INTERNAL_URL = process.env.REALTIME_WS_INTERNAL_URL || "http://127.0.0.1:4001";
const INTERNAL_SECRET = process.env.REALTIME_INTERNAL_SECRET;

export function emitRealtime(
  event: string,
  data: unknown,
  opts: { toAdmin?: boolean; toUserId?: number | string; toDriverId?: number | string; toDrivers?: boolean } = {},
): void {
  if (!INTERNAL_SECRET) return; // not configured yet — silently no-op

  fetch(`${WS_INTERNAL_URL}/internal/emit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": INTERNAL_SECRET,
    },
    body: JSON.stringify({ event, data, ...opts }),
    signal: AbortSignal.timeout(2000),
  }).catch((err) => {
    console.error(`[realtime] failed to emit "${event}":`, err instanceof Error ? err.message : err);
  });
}
