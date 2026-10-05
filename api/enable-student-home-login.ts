import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const STUDENT_HOME_LOGIN_DOMAIN = "students.tuwc.online";

type RequestBody = {
  studentId?: string;
  username?: string;
  password?: string;
  idToken?: string;
  removeAccess?: boolean;
};

type VercelRequest = {
  method?: string;
  body?: RequestBody;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

type FirestoreValue = {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  nullValue?: null;
};

type FirestoreDoc = {
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

  return rawKey
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\n/g, "\n");
}

function ensureFirebaseAdmin() {
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

function firebaseProjectId(): string {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new ConfigurationError("Firebase Admin credentials are missing: FIREBASE_PROJECT_ID");
  }
  return projectId;
}

async function firebaseAccessToken(): Promise<string> {
  ensureFirebaseAdmin();
  const credential = getApp().options.credential;
  if (!credential) {
    throw new ConfigurationError("Firebase Admin credentials could not initialize.");
  }
  const token = await credential.getAccessToken();
  return token.access_token;
}

function documentName(projectId: string, path: string): string {
  return `projects/${projectId}/databases/(default)/documents/${path}`;
}

function readString(doc: FirestoreDoc | null, field: string): string | undefined {
  const value = doc?.fields?.[field]?.stringValue;
  return typeof value === "string" && value ? value : undefined;
}

async function firestoreGet(accessToken: string, projectId: string, path: string): Promise<FirestoreDoc | null> {
  const response = await fetch(`https://firestore.googleapis.com/v1/${documentName(projectId, path)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    console.error("Firestore read failed:", response.status, await response.text());
    throw new Error(`Firestore read failed (${response.status}).`);
  }
  return await response.json() as FirestoreDoc;
}

async function firestoreCommit(
  accessToken: string,
  projectId: string,
  writes: Array<Record<string, unknown>>
): Promise<void> {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ writes }),
    }
  );
  if (!response.ok) {
    console.error("Firestore write failed:", response.status, await response.text());
    throw new Error(`Firestore write failed (${response.status}).`);
  }
}

function getHeader(req: VercelRequest, name: string): string {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._]/g, "");
}

function studentEmail(username: string): string {
  return `${username}@${STUDENT_HOME_LOGIN_DOMAIN}`;
}

async function allocateUsername(
  accessToken: string,
  projectId: string,
  requested: string,
  studentId: string
): Promise<string> {
  const baseMatch = requested.match(/^(.*?)(\d+)?$/);
  const base = (baseMatch?.[1] || requested) || requested;
  let n = baseMatch?.[2] ? Number(baseMatch[2]) : 1;
  let candidate = requested;

  for (let attempt = 0; attempt < 999; attempt += 1) {
    const snap = await firestoreGet(accessToken, projectId, `studentLoginUsernames/${candidate}`);
    if (!snap || readString(snap, "studentId") === studentId) return candidate;
    n += 1;
    candidate = `${base}${n}`;
  }

  throw new Error("Could not allocate a unique username.");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const bodyToken = req.body?.idToken?.trim() ?? "";
    const authHeader = getHeader(req, "authorization");
    const headerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const token = bodyToken || headerToken;
    if (!token) {
      res.status(401).json({ error: "You must be signed in." });
      return;
    }

    const studentId = req.body?.studentId?.trim();
    const removeAccess = Boolean(req.body?.removeAccess);
    const password = req.body?.password?.trim() ?? "";
    const requestedUsername = normalizeUsername(req.body?.username ?? "");

    if (!studentId) {
      res.status(400).json({ error: "Student is required." });
      return;
    }
    if (!removeAccess) {
      if (!requestedUsername || requestedUsername.length < 3) {
        res.status(400).json({ error: "Username must be at least 3 letters or numbers." });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters." });
        return;
      }
    }

    ensureFirebaseAdmin();
    const adminAuth = getAuth();
    const projectId = firebaseProjectId();
    const accessToken = await firebaseAccessToken();
    const decoded = await adminAuth.verifyIdToken(token);
    const callerSnap = await firestoreGet(accessToken, projectId, `users/${decoded.uid}`);
    const callerRole = readString(callerSnap, "role");
    const callerSchoolId = readString(callerSnap, "schoolId");

    if (!callerSnap || (callerRole !== "teacher" && callerRole !== "admin")) {
      res.status(403).json({ error: "Only teachers can manage home login." });
      return;
    }

    const studentSnap = await firestoreGet(accessToken, projectId, `users/${studentId}`);
    if (!studentSnap) {
      res.status(404).json({ error: "Student not found." });
      return;
    }

    const studentRole = readString(studentSnap, "role");
    const studentSchoolId = readString(studentSnap, "schoolId");
    const displayName = readString(studentSnap, "displayName");
    const previousUsername = readString(studentSnap, "homeLoginUsername");

    if (studentRole !== "student") {
      res.status(400).json({ error: "Home login can only be managed for students." });
      return;
    }

    if (callerRole === "teacher" && callerSchoolId !== studentSchoolId) {
      res.status(403).json({ error: "This student is not in your school." });
      return;
    }

    if (removeAccess) {
      try {
        await adminAuth.updateUser(studentId, { disabled: true });
        await adminAuth.revokeRefreshTokens(studentId);
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code !== "auth/user-not-found") throw err;
      }

      const writes: Array<Record<string, unknown>> = [];
      if (previousUsername) {
        writes.push({ delete: documentName(projectId, `studentLoginUsernames/${previousUsername}`) });
      }
      writes.push({
        update: {
          name: documentName(projectId, `users/${studentId}`),
          fields: {
            email: { stringValue: "" },
            homeLoginEnabled: { booleanValue: false },
          },
        },
        updateMask: {
          fieldPaths: ["email", "homeLoginEnabled", "homeLoginUsername", "homeLoginEnabledAt"],
        },
      });
      await firestoreCommit(accessToken, projectId, writes);

      res.status(200).json({ homeLoginEnabled: false });
      return;
    }

    const username = await allocateUsername(accessToken, projectId, requestedUsername, studentId);
    const email = studentEmail(username);

    try {
      await adminAuth.getUser(studentId);
      await adminAuth.updateUser(studentId, { email, password, emailVerified: true, disabled: false });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "auth/user-not-found") throw err;
      await adminAuth.createUser({
        uid: studentId,
        email,
        password,
        emailVerified: true,
        ...(displayName ? { displayName } : {}),
        disabled: false,
      });
    }

    const writes: Array<Record<string, unknown>> = [];
    if (previousUsername && previousUsername !== username) {
      writes.push({ delete: documentName(projectId, `studentLoginUsernames/${previousUsername}`) });
    }
    writes.push({
      update: {
        name: documentName(projectId, `studentLoginUsernames/${username}`),
        fields: {
          studentId: { stringValue: studentId },
          createdAt: { integerValue: String(Date.now()) },
        },
      },
    });
    writes.push({
      update: {
        name: documentName(projectId, `users/${studentId}`),
        fields: {
          email: { stringValue: email },
          homeLoginEnabled: { booleanValue: true },
          homeLoginUsername: { stringValue: username },
          homeLoginEnabledAt: { integerValue: String(Date.now()) },
        },
      },
      updateMask: {
        fieldPaths: ["email", "homeLoginEnabled", "homeLoginUsername", "homeLoginEnabledAt"],
      },
    });
    await firestoreCommit(accessToken, projectId, writes);

    res.status(200).json({
      username,
      email,
      homeLoginEnabled: true,
    });
  } catch (err) {
    if (err instanceof ConfigurationError || (err instanceof Error && err.name === "ConfigurationError")) {
      res.status(500).json({ error: err.message });
      return;
    }

    const code = err && typeof err === "object"
      ? (err as { code?: string; errorInfo?: { code?: string } }).code
        ?? (err as { errorInfo?: { code?: string } }).errorInfo?.code
      : undefined;
    if (code === "auth/email-already-exists") {
      res.status(409).json({ error: "That username is already in use. Choose another." });
      return;
    }
    if (code === "auth/argument-error" || code === "auth/id-token-expired" || code === "auth/invalid-id-token") {
      res.status(401).json({ error: "Your session expired. Please sign in again." });
      return;
    }

    console.error("Failed to enable student home login:", err);
    res.status(500).json({
      error: code ? `Could not enable home login (${code}).` : "Could not enable home login. Please try again.",
    });
  }
}
