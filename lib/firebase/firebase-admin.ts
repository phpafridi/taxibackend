// lib/firebase/firebase-admin.ts
// Single place to initialise Firebase Admin SDK.
// Handles the Railway env-var format where the PEM newlines are stored as
// literal \n characters inside a single-line string.

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

function getPrivateKey(): string {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) throw new Error("FIREBASE_PRIVATE_KEY is not set");

  // If Railway (or any env) stores it as a JSON-stringified value like
  // "\"-----BEGIN ...\\n...\\n-----END ...\\n\""  unwrap the outer quotes first.
  let key = raw.trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    try { key = JSON.parse(key); } catch { /* leave as-is */ }
  }

  // Replace literal \n sequences with real newlines (the common Railway issue).
  key = key.replace(/\\n/g, "\n");

  return key;
}

if (!getApps().length) {
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !clientEmail) {
    console.error("[firebase-admin] Missing FIREBASE_PROJECT_ID or FIREBASE_CLIENT_EMAIL");
  } else {
    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: getPrivateKey(),
        }),
      });
      console.log("[firebase-admin] ✅ Initialised successfully");
    } catch (err) {
      console.error("[firebase-admin] ❌ initializeApp failed:", err);
    }
  }
}

/** True once the Admin SDK has a successfully initialised app. */
export function isFirebaseAdminInitialized(): boolean {
  return getApps().length > 0;
}

/** Firebase Cloud Messaging instance for the default admin app. */
export function getAdminMessaging() {
  return getMessaging();
}
