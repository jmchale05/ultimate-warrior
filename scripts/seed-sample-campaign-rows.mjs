import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch } from "firebase/firestore";

function loadEnvFile(filePath) {
  const text = readFileSync(filePath, "utf8");
  const env = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalIndex = line.indexOf("=");
    if (equalIndex === -1) continue;

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const rootDir = resolve(process.cwd());
const envPath = resolve(rootDir, ".env.local");
const env = loadEnvFile(envPath);

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const schoolId = "4Cwce80hKmem6jb2YgIO";
const classId = `seed-class-${schoolId}`;
const now = Date.now();

const names = [
  "Aurelia Sprint",
  "Cassian Vale",
  "Livia Storm",
  "Marcus Flint",
  "Tiber Nova",
  "Sabina Crest",
  "Octavian Pike",
  "Helena Quill",
  "Lucian Forge",
  "Valeria Drift",
];

const nicknames = [
  "Aquila",
  "Vulcan",
  "Diana",
  "Mars",
  "Neptune",
  "Minerva",
  "Apollo",
  "Juno",
  "Saturn",
  "Vesta",
];

async function seed() {
  const batch = writeBatch(db);

  const studentIds = names.map((_, idx) => `seed-student-${idx + 1}`);

  batch.set(doc(db, "classes", classId), {
    name: "Year 9 Sample",
    schoolId,
    teacherId: "seed-script",
    studentIds,
    createdAt: now,
  });

  names.forEach((displayName, idx) => {
    const studentId = studentIds[idx];
    const miles = 0.5 + idx * 0.7;

    batch.set(doc(db, "users", studentId), {
      uid: studentId,
      email: `seed${idx + 1}@example.com`,
      displayName,
      romanNickname: nicknames[idx],
      role: "student",
      schoolId,
      classId,
      createdAt: now,
    });

    batch.set(doc(db, "results", `seed-result-${idx + 1}`), {
      challengeId: `sample-challenge-${idx + 1}`,
      studentId,
      classId,
      schoolId,
      distanceMiles: Number(miles.toFixed(1)),
      completedAt: now - idx * 86400000,
      notes: "Seeded sample row",
    });
  });

  await batch.commit();

  console.log(`Seed complete: added/updated ${names.length} sample students for school ${schoolId}.`);
  console.log(`Class ID: ${classId}`);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
