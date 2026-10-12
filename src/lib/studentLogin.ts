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

// Easy to spell and read aloud; 171 words with three digits is about 154,000 passwords.
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
  "tiger",
  "zebra",
  "panda",
  "koala",
  "otter",
  "beaver",
  "badger",
  "rabbit",
  "hare",
  "deer",
  "moose",
  "camel",
  "llama",
  "goat",
  "sheep",
  "lamb",
  "pony",
  "donkey",
  "mouse",
  "hippo",
  "rhino",
  "whale",
  "shark",
  "seal",
  "dolphin",
  "crab",
  "squid",
  "snail",
  "beetle",
  "ant",
  "bee",
  "wasp",
  "moth",
  "robin",
  "finch",
  "crow",
  "raven",
  "swan",
  "goose",
  "heron",
  "parrot",
  "puffin",
  "penguin",
  "falcon",
  "gecko",
  "lizard",
  "turtle",
  "toad",
  "newt",
  "salmon",
  "trout",
  "pike",
  "star",
  "moon",
  "sun",
  "comet",
  "planet",
  "cloud",
  "rain",
  "snow",
  "storm",
  "frost",
  "thunder",
  "rainbow",
  "breeze",
  "wave",
  "ocean",
  "river",
  "lake",
  "pond",
  "island",
  "beach",
  "desert",
  "forest",
  "meadow",
  "valley",
  "hill",
  "canyon",
  "cave",
  "rock",
  "stone",
  "pebble",
  "crystal",
  "oak",
  "pine",
  "maple",
  "willow",
  "cedar",
  "acorn",
  "leaf",
  "fern",
  "moss",
  "tulip",
  "daisy",
  "rose",
  "lily",
  "poppy",
  "clover",
  "berry",
  "apple",
  "cherry",
  "lemon",
  "mango",
  "peach",
  "plum",
  "melon",
  "gold",
  "silver",
  "bronze",
  "copper",
  "ruby",
  "amber",
  "jade",
  "pearl",
  "helm",
  "shield",
  "spear",
  "sword",
  "torch",
  "crown",
  "banner",
  "castle",
  "tower",
  "arch",
  "temple",
  "chariot",
  "legion",
  "arena",
  "forum",
  "column",
  "scroll",
  "quill",
  "sandal",
  "tunic",
  "laurel",
  "legend",
  "hero",
  "champion",
  "boat",
  "flag",
  "drum",
  "kite",
  "rocket",
  "robot",
  "pencil",
  "paint",
  "music",
  "piano",
  "violin",
  "trumpet",
  "guitar",
  "ball",
  "bike",
  "skate",
  "sled",
  "train",
  "wagon",
  "lantern",
  "compass",
  "anchor",
  "map",
];

export function generateStudentPassword(): string {
  const word = KID_PASSWORD_WORDS[Math.floor(Math.random() * KID_PASSWORD_WORDS.length)];
  // Always three digits (100–999), so every password is at least six characters.
  const number = String(100 + Math.floor(Math.random() * 900));
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

export async function disableStudentHomeLogin(input: {
  idToken: string;
  studentId: string;
}): Promise<void> {
  const response = await fetch("/api/enable-student-home-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      studentId: input.studentId,
      idToken: input.idToken,
      removeAccess: true,
    }),
  });

  const raw = await response.text();
  let body: { error?: unknown; message?: unknown } = {};
  if (raw) {
    try {
      body = JSON.parse(raw) as typeof body;
    } catch {
      body = { message: raw.replace(/\s+/g, " ").trim().slice(0, 180) };
    }
  }
  if (!response.ok) {
    throw new Error(apiErrorMessage(body, `Could not remove home login (${response.status}).`));
  }
}

/** When a student is deleted: removes their sign-in account and frees their username. */
export async function deleteStudentLogin(input: {
  idToken: string;
  studentId: string;
}): Promise<void> {
  const response = await fetch("/api/enable-student-home-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      studentId: input.studentId,
      idToken: input.idToken,
      deleteLogin: true,
    }),
  });

  // 404: the student record is already gone, so there's nothing left to remove.
  if (!response.ok && response.status !== 404) {
    const raw = await response.text();
    let body: { error?: unknown; message?: unknown } = {};
    try {
      body = raw ? JSON.parse(raw) as typeof body : {};
    } catch {
      body = { message: raw.replace(/\s+/g, " ").trim().slice(0, 180) };
    }
    throw new Error(apiErrorMessage(body, `Could not remove the student's login (${response.status}).`));
  }
}
