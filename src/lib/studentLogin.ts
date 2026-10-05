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
  const number = String(Math.floor(10 + Math.random() * 90));
  return `${word}${number}`;
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
      Authorization: `Bearer ${input.idToken}`,
    },
    body: JSON.stringify({
      studentId: input.studentId,
      username: input.username,
      password: input.password,
    }),
  });

  const body = await response.json().catch(() => ({})) as { error?: string; username?: string; homeLoginEnabled?: boolean };
  if (!response.ok) {
    throw new Error(body.error || "Could not enable add login.");
  }

  return {
    username: body.username ?? input.username,
    homeLoginEnabled: Boolean(body.homeLoginEnabled),
  };
}
