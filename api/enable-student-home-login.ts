import { ConfigurationError, getAdminAuth, getAdminDb } from "./_firebaseAdmin";

const STUDENT_HOME_LOGIN_DOMAIN = "students.tuwc.online";

type RequestBody = {
  studentId?: string;
  username?: string;
  password?: string;
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
  db: ReturnType<typeof getAdminDb>,
  requested: string,
  studentId: string
): Promise<string> {
  const baseMatch = requested.match(/^(.*?)(\d+)?$/);
  const base = (baseMatch?.[1] || requested) || requested;
  let n = baseMatch?.[2] ? Number(baseMatch[2]) : 1;
  let candidate = requested;

  for (let attempt = 0; attempt < 999; attempt += 1) {
    const snap = await db.collection("studentLoginUsernames").doc(candidate).get();
    if (!snap.exists || snap.data()?.studentId === studentId) {
      return candidate;
    }
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
    const authHeader = getHeader(req, "authorization");
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      res.status(401).json({ error: "You must be signed in." });
      return;
    }

    const studentId = req.body?.studentId?.trim();
    const password = req.body?.password?.trim() ?? "";
    const requestedUsername = normalizeUsername(req.body?.username ?? "");

    if (!studentId) {
      res.status(400).json({ error: "Student is required." });
      return;
    }
    if (!requestedUsername || requestedUsername.length < 3) {
      res.status(400).json({ error: "Username must be at least 3 letters or numbers." });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters." });
      return;
    }

    const adminAuth = getAdminAuth();
    const db = getAdminDb();
    const decoded = await adminAuth.verifyIdToken(token);
    const callerSnap = await db.collection("users").doc(decoded.uid).get();
    const caller = callerSnap.data() as { role?: string; schoolId?: string } | undefined;

    if (!caller || (caller.role !== "teacher" && caller.role !== "admin")) {
      res.status(403).json({ error: "Only teachers can enable home login." });
      return;
    }

    const studentRef = db.collection("users").doc(studentId);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) {
      res.status(404).json({ error: "Student not found." });
      return;
    }

    const student = studentSnap.data() as {
      role?: string;
      schoolId?: string;
      homeLoginUsername?: string;
      displayName?: string;
    };

    if (student.role !== "student") {
      res.status(400).json({ error: "Home login can only be enabled for students." });
      return;
    }

    if (caller.role === "teacher" && caller.schoolId !== student.schoolId) {
      res.status(403).json({ error: "This student is not in your school." });
      return;
    }

    const username = await allocateUsername(db, requestedUsername, studentId);
    const usernameRef = db.collection("studentLoginUsernames").doc(username);
    const email = studentEmail(username);
    const previousUsername = student.homeLoginUsername;

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
        displayName: student.displayName,
        disabled: false,
      });
    }

    const batch = db.batch();
    if (previousUsername && previousUsername !== username) {
      batch.delete(db.collection("studentLoginUsernames").doc(previousUsername));
    }
    batch.set(usernameRef, { studentId, createdAt: Date.now() });
    batch.update(studentRef, {
      email,
      homeLoginEnabled: true,
      homeLoginUsername: username,
      homeLoginEnabledAt: Date.now(),
    });
    await batch.commit();

    res.status(200).json({
      username,
      email,
      homeLoginEnabled: true,
    });
  } catch (err) {
    if (err instanceof ConfigurationError) {
      res.status(500).json({ error: err.message });
      return;
    }

    const code = (err as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      res.status(409).json({ error: "That username is already in use. Choose another." });
      return;
    }
    if (code === "auth/argument-error" || code === "auth/id-token-expired") {
      res.status(401).json({ error: "Your session expired. Please sign in again." });
      return;
    }

    console.error("Failed to enable student home login:", err);
    res.status(500).json({ error: "Could not enable home login. Please try again." });
  }
}
