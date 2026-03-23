import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  arrayUnion,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import type { AppUser, School, Class, Challenge, Result } from "../types";

// ─── Schools ──────────────────────────────────────────────────────────────────

export async function createSchool(
  name: string,
  address?: string
): Promise<string> {
  const ref = await addDoc(collection(db, "schools"), {
    name,
    address,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function getSchoolById(schoolId: string): Promise<School | null> {
  const snap = await getDoc(doc(db, "schools", schoolId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as School) : null;
}

export async function getAllSchools(): Promise<School[]> {
  const snap = await getDocs(collection(db, "schools"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as School));
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function createUserDoc(user: AppUser): Promise<void> {
  await setDoc(doc(db, "users", user.uid), user);
}

export async function getUserDoc(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as AppUser) : null;
}

export async function getUsersByIds(uids: string[]): Promise<AppUser[]> {
  if (uids.length === 0) return [];
  const results = await Promise.all(uids.map((uid) => getUserDoc(uid)));
  return results.filter((u): u is AppUser => u !== null);
}

// ─── Classes ─────────────────────────────────────────────────────────────────

export async function createClass(
  name: string,
  schoolId: string,
  teacherId: string
): Promise<string> {
  const ref = await addDoc(collection(db, "classes"), {
    name,
    schoolId,
    teacherId,
    studentIds: [],
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function getClassesByTeacher(teacherId: string): Promise<Class[]> {
  const q = query(
    collection(db, "classes"),
    where("teacherId", "==", teacherId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Class));
}

export async function getClassesBySchool(schoolId: string): Promise<Class[]> {
  const q = query(
    collection(db, "classes"),
    where("schoolId", "==", schoolId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Class));
}

export async function getClassById(classId: string): Promise<Class | null> {
  const snap = await getDoc(doc(db, "classes", classId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Class) : null;
}

export async function addStudentToClass(
  classId: string,
  studentId: string
): Promise<void> {
  await updateDoc(doc(db, "classes", classId), {
    studentIds: arrayUnion(studentId),
  });
  await updateDoc(doc(db, "users", studentId), { classId });
}

// ─── Challenges ───────────────────────────────────────────────────────────────

export async function createChallenge(
  data: Omit<Challenge, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "challenges"), {
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function getChallengesByClass(
  classId: string
): Promise<Challenge[]> {
  const q = query(
    collection(db, "challenges"),
    where("classId", "==", classId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Challenge));
}

export async function getChallengesForStudent(
  studentId: string
): Promise<Challenge[]> {
  const q = query(
    collection(db, "challenges"),
    where("assignedTo", "array-contains", studentId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Challenge));
}

// ─── Results ──────────────────────────────────────────────────────────────────

export async function submitResult(
  data: Omit<Result, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "results"), {
    ...data,
    completedAt: Date.now(),
  });
  return ref.id;
}

export async function getResultsByStudent(
  studentId: string
): Promise<Result[]> {
  const q = query(
    collection(db, "results"),
    where("studentId", "==", studentId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Result));
}

export async function getResultsByClass(classId: string): Promise<Result[]> {
  const q = query(
    collection(db, "results"),
    where("classId", "==", classId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Result));
}

export async function updateUserPhoto(uid: string, file: File): Promise<string> {
  const storageRef = ref(storage, `profile-photos/${uid}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", uid), { photoUrl: url });
  return url;
}

export async function getAllUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => d.data() as AppUser);
}

export async function getAllResults(): Promise<Result[]> {
  const snap = await getDocs(collection(db, "results"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Result));
}

export async function hasStudentCompletedChallenge(
  studentId: string,
  challengeId: string
): Promise<boolean> {
  const q = query(
    collection(db, "results"),
    where("studentId", "==", studentId),
    where("challengeId", "==", challengeId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}
