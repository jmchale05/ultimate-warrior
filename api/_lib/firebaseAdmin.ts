import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export type MinimalRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

function getFirebasePrivateKey(): string | undefined {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!rawKey) return undefined;

  return rawKey
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\n/g, "\n");
}

let cachedApp: App | undefined;

export function ensureFirebaseAdmin(): App {
  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0];
    return cachedApp;
  }

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
    cachedApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err);
    throw new ConfigurationError("Firebase Admin credentials could not initialize. Check FIREBASE_PRIVATE_KEY formatting in Vercel.");
  }

  return cachedApp;
}

export function getAdminAuth() {
  return getAuth(ensureFirebaseAdmin());
}

export function getAdminFirestore(): Firestore {
  return getFirestore(ensureFirebaseAdmin());
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getHeader(req: MinimalRequest, name: string): string | undefined {
  const headers = req.headers ?? {};
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function getClientIp(req: MinimalRequest): string {
  const forwarded = getHeader(req, "x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return getHeader(req, "x-real-ip") || "unknown";
}

export type VerifiedCaller = { uid: string; token: DecodedIdToken };

/** Verifies a `Authorization: Bearer <idToken>` header. Returns null when missing/invalid. */
export async function verifyBearerToken(req: MinimalRequest): Promise<VerifiedCaller | null> {
  const authorization = getHeader(req, "authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) return null;

  const idToken = authorization.slice("Bearer ".length).trim();
  if (!idToken) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return { uid: decoded.uid, token: decoded };
  } catch (err) {
    console.error("Failed to verify ID token:", err);
    return null;
  }
}

export type RateLimitResult = { allowed: boolean; retryAfterSeconds?: number };

/**
 * Firestore-backed fixed-window rate limiter. Fails open (allows) on infrastructure
 * errors so a limiter outage never locks out legitimate users.
 */
export async function enforceRateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  try {
    const db = getAdminFirestore();
    const docId = opts.key.replace(/[\/#?]/g, "_").slice(0, 1500);
    const ref = db.collection("rateLimits").doc(docId);
    const now = Date.now();

    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? (snap.data() as { windowStart: number; count: number }) : null;

      if (!data || now - data.windowStart >= opts.windowMs) {
        tx.set(ref, { windowStart: now, count: 1, updatedAt: now });
        return { allowed: true };
      }

      if (data.count >= opts.limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((opts.windowMs - (now - data.windowStart)) / 1000)),
        };
      }

      tx.update(ref, { count: data.count + 1, updatedAt: now });
      return { allowed: true };
    });
  } catch (err) {
    console.error("Rate limiter error (failing open):", err);
    return { allowed: true };
  }
}
