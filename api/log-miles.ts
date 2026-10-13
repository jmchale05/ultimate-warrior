import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Logs miles for a student on one campaign. The server adds up what's already
 * logged and saves at most what the campaign still needs (campaign N needs N
 * miles), so miles can't be piled up by saving straight to the database.
 * Students log for themselves; teachers for students in their school; admins
 * for anyone.
 */

const CAMPAIGN_COUNT = 12;

type RequestBody = {
  idToken?: string;
  studentId?: string;
  campaignNumber?: number;
  miles?: number;
};

type VercelRequest = {
  method?: string;
  body?: RequestBody;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
};

type FirestoreDoc = {
  name?: string;
  fields?: Record<string, FirestoreValue>;
};

class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

function getFirebasePrivateKey(): string | undefined {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!rawKey) return undefined;
  return rawKey.trim().replace(/^['"]|['"]$/g, "").replace(/\\n/g, "\n");
}

function firebaseProjectId(): string {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new ConfigurationError("Firebase Admin credentials are missing: FIREBASE_PROJECT_ID");
  return projectId;
}

function ensureFirebaseAdmin() {
  if (getApps().length > 0) return;
  const projectId = firebaseProjectId();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getFirebasePrivateKey();
  if (!clientEmail || !privateKey) {
    const missing = [!clientEmail ? "FIREBASE_CLIENT_EMAIL" : undefined, !privateKey ? "FIREBASE_PRIVATE_KEY" : undefined].filter(Boolean);
    throw new ConfigurationError(`Firebase Admin credentials are missing: ${missing.join(", ")}`);
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

async function firebaseAccessToken(): Promise<string> {
  ensureFirebaseAdmin();
  const credential = getApp().options.credential;
  if (!credential) throw new ConfigurationError("Firebase Admin credentials could not initialize.");
  return (await credential.getAccessToken()).access_token;
}

function documentsUrl(projectId: string): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

function readString(doc: FirestoreDoc | null, field: string): string | undefined {
  const value = doc?.fields?.[field]?.stringValue;
  return typeof value === "string" && value ? value : undefined;
}

function readNumber(doc: FirestoreDoc | null, field: string): number {
  const value = doc?.fields?.[field];
  if (!value) return 0;
  if (typeof value.doubleValue === "number") return value.doubleValue;
  if (typeof value.integerValue === "string") return Number(value.integerValue) || 0;
  return 0;
}

async function firestoreGet(accessToken: string, projectId: string, path: string): Promise<FirestoreDoc | null> {
  const response = await fetch(`${documentsUrl(projectId)}/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore read failed (${response.status}).`);
  return await response.json() as FirestoreDoc;
}

/** Every result for one student (filtered to the campaign by the caller). */
async function studentResults(accessToken: string, projectId: string, studentId: string): Promise<FirestoreDoc[]> {
  const response = await fetch(`${documentsUrl(projectId)}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "results" }],
        where: { fieldFilter: { field: { fieldPath: "studentId" }, op: "EQUAL", value: { stringValue: studentId } } },
      },
    }),
  });
  if (!response.ok) throw new Error(`Firestore query failed (${response.status}).`);
  const rows = await response.json() as Array<{ document?: FirestoreDoc }>;
  return rows.map((row) => row.document).filter((doc): doc is FirestoreDoc => Boolean(doc));
}

const roundMiles = (value: number) => Math.round(value * 10) / 10;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const token = req.body?.idToken?.trim();
    const studentId = req.body?.studentId?.trim();
    const campaignNumber = Number(req.body?.campaignNumber);
    const miles = Number(req.body?.miles);

    if (!token) {
      res.status(401).json({ error: "You must be signed in." });
      return;
    }
    if (!studentId || !Number.isInteger(campaignNumber) || campaignNumber < 1 || campaignNumber > CAMPAIGN_COUNT) {
      res.status(400).json({ error: "Student and campaign are required." });
      return;
    }
    if (!Number.isFinite(miles) || miles <= 0) {
      res.status(400).json({ error: "Enter the miles run." });
      return;
    }

    ensureFirebaseAdmin();
    const projectId = firebaseProjectId();
    const accessToken = await firebaseAccessToken();
    const decoded = await getAuth().verifyIdToken(token);

    const [caller, student] = await Promise.all([
      firestoreGet(accessToken, projectId, `users/${decoded.uid}`),
      firestoreGet(accessToken, projectId, `users/${studentId}`),
    ]);
    if (!student || readString(student, "role") !== "student") {
      res.status(404).json({ error: "Student not found." });
      return;
    }
    const callerRole = readString(caller, "role");
    const allowed =
      (callerRole === "student" && decoded.uid === studentId) ||
      callerRole === "admin" ||
      (callerRole === "teacher" && readString(caller, "schoolId") === readString(student, "schoolId"));
    if (!allowed) {
      res.status(403).json({ error: "You can't log miles for this student." });
      return;
    }

    // What's already logged on this campaign, and what it still needs.
    const challengeId = `campaign-${campaignNumber}`;
    const results = await studentResults(accessToken, projectId, studentId);
    const already = roundMiles(results
      .filter((doc) => readString(doc, "challengeId") === challengeId)
      .reduce((sum, doc) => sum + readNumber(doc, "distanceMiles"), 0));
    const remaining = roundMiles(campaignNumber - already);
    const toLog = roundMiles(Math.min(miles, remaining));

    if (toLog <= 0) {
      res.status(200).json({ logged: 0, total: already, required: campaignNumber });
      return;
    }

    const now = Date.now();
    const response = await fetch(`${documentsUrl(projectId)}/results`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          challengeId: { stringValue: challengeId },
          studentId: { stringValue: studentId },
          classId: { stringValue: readString(student, "classId") ?? "" },
          schoolId: { stringValue: readString(student, "schoolId") ?? "" },
          distanceMiles: { doubleValue: toLog },
          completedAt: { integerValue: String(now) },
        },
      }),
    });
    if (!response.ok) throw new Error(`Saving the miles failed (${response.status}).`);

    res.status(200).json({ logged: toLog, total: roundMiles(already + toLog), required: campaignNumber });
  } catch (err) {
    if (err instanceof Error && err.name === "ConfigurationError") {
      res.status(500).json({ error: err.message });
      return;
    }
    const code = (err as { code?: string; errorInfo?: { code?: string } })?.code
      ?? (err as { errorInfo?: { code?: string } })?.errorInfo?.code;
    if (code === "auth/argument-error" || code === "auth/id-token-expired" || code === "auth/invalid-id-token") {
      res.status(401).json({ error: "Your session expired. Please sign in again." });
      return;
    }
    console.error("Failed to log miles:", err);
    res.status(500).json({ error: "Could not log miles. Please try again." });
  }
}
