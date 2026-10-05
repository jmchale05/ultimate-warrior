export const STUDENT_HOME_LOGIN_DOMAIN = "students.tuwc.online";

export function normalizeStudentUsername(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._]/g, "");
}

export function studentLoginEmail(username: string): string {
  return `${normalizeStudentUsername(username)}@${STUDENT_HOME_LOGIN_DOMAIN}`;
}

export function resolveSignInIdentifier(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return trimmed;
  const username = normalizeStudentUsername(trimmed);
  return username ? studentLoginEmail(username) : trimmed;
}

export function suggestStudentUsername(displayName: string, takenUsernames: string[] = []): string {
  const base = normalizeStudentUsername(displayName.replace(/\s+/g, "")) || "warrior";
  const taken = new Set(takenUsernames.map((username) => username.toLowerCase()));
  if (!taken.has(base)) return base;

  let n = 2;
  while (taken.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

const KID_PASSWORD_WORDS = [
  "lion",
  "wolf",
  "bear",
  "fox",
  "owl",
  "eagle",
  "hawk",
  "frog",
  "duck",
  "horse",
  "star",
  "moon",
  "sun",
  "oak",
  "tree",
  "river",
  "stone",
  "gold",
  "fire",
  "leaf",
  "bird",
  "fish",
  "boat",
  "flag",
  "drum",
  "helm",
  "shield",
  "spear",
  "torch",
  "crown",
];

export function generateStudentPassword(): string {
  const word = KID_PASSWORD_WORDS[Math.floor(Math.random() * KID_PASSWORD_WORDS.length)];
  const digitsNeeded = Math.max(2, 6 - word.length);
  const min = 10 ** (digitsNeeded - 1);
  const max = 10 ** digitsNeeded;
  const number = String(Math.floor(min + Math.random() * (max - min)));
  return `${word}${number}`;
}

function apiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const record = body as { error?: unknown; message?: unknown };
  if (typeof record.error === "string" && record.error.trim()) return record.error;
  if (record.error && typeof record.error === "object") {
    const message = (record.error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (typeof record.message === "string" && record.message.trim()) return record.message;
  return fallback;
}

export async function enableStudentHomeLogin(input: {
  idToken: string;
  studentId: string;
  username: string;
  password: string;
}): Promise<{ username: string; homeLoginEnabled: boolean }> {
  const response = await fetch("/api/enable-student-home-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      studentId: input.studentId,
      username: input.username,
      password: input.password,
      idToken: input.idToken,
    }),
  });

  const raw = await response.text();
  let body: { error?: unknown; message?: unknown; username?: string; homeLoginEnabled?: boolean } = {};
  if (raw) {
    try {
      body = JSON.parse(raw) as typeof body;
    } catch {
      body = { message: raw.replace(/\s+/g, " ").trim().slice(0, 180) };
    }
  }
  if (!response.ok) {
    throw new Error(apiErrorMessage(body, `Could not enable home login (${response.status}).`));
  }

  return {
    username: body.username ?? input.username,
    homeLoginEnabled: Boolean(body.homeLoginEnabled),
  };
}
