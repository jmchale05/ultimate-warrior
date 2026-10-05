import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

function getFirebasePrivateKey(): string | undefined {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!rawKey) return undefined;

  return rawKey
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\n/g, "\n");
}

export function ensureFirebaseAdmin() {
  if (getApps().length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getFirebasePrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [
      !projectId ? "FIREBASE_PROJECT_ID" : undefined,
      !clientEmail ? "FIREBASE_CLIENT_EMAIL" : undefined,
      !privateKey ? "FIREBASE_PRIVATE_KEY" : undefined,
    ].filter(Boolean);

    throw new ConfigurationError(`Firebase Admin credentials are missing: ${missing.join(", ")}`);
  }

  if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
    throw new ConfigurationError("FIREBASE_PRIVATE_KEY is not a valid service-account private key");
  }

  try {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err);
    throw new ConfigurationError("Firebase Admin credentials could not initialize. Check FIREBASE_PRIVATE_KEY formatting in Vercel.");
  }
}

export function getAdminAuth() {
  ensureFirebaseAdmin();
  return getAuth();
}

export function getAdminDb() {
  ensureFirebaseAdmin();
  return getFirestore();
}
