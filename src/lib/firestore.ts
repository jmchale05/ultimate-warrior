import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  runTransaction,
  query,
  where,
  arrayUnion,
  arrayRemove,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import type { AppUser, School, SchoolAccessCode, Class, Result } from "../types";

// ─── Schools ──────────────────────────────────────────────────────────────────

function generateAccessCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function accessCodeDocId(accessCode: string) {
  return accessCode.trim().toUpperCase();
}

async function saveSchoolAccessCodeIndex(
  schoolId: string,
  accessCode: string,
  schoolName: string,
  createdAt: number
): Promise<void> {
  await setDoc(doc(db, "schoolAccessCodes", accessCodeDocId(accessCode)), {
    schoolId,
    schoolName,
    createdAt,
  });
}

export async function createSchool(
  name: string,
  address?: string
): Promise<{ id: string; accessCode: string }> {
  const accessCode = generateAccessCode();
  const createdAt = Date.now();
  const ref = await addDoc(collection(db, "schools"), {
    name,
    address,
    accessCode,
    createdAt,
  });
  await saveSchoolAccessCodeIndex(ref.id, accessCode, name, createdAt);
  return { id: ref.id, accessCode };
}

export async function getSchoolById(schoolId: string): Promise<School | null> {
  const snap = await getDoc(doc(db, "schools", schoolId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as School) : null;
}

export async function getSchoolByAccessCode(accessCode: string): Promise<School | null> {
  const normalizedCode = accessCodeDocId(accessCode);
  if (!normalizedCode) return null;

  const codeSnap = await getDoc(doc(db, "schoolAccessCodes", normalizedCode));
  if (!codeSnap.exists()) return null;

  const codeData = codeSnap.data() as Omit<SchoolAccessCode, "id">;
  return getSchoolById(codeData.schoolId);
}

export async function getAllSchools(): Promise<School[]> {
  const snap = await getDocs(collection(db, "schools"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as School));
}

export async function ensureSchoolAccessCodeIndex(
  schoolId: string,
  accessCode: string,
  schoolName: string,
  createdAt: number
): Promise<void> {
  await saveSchoolAccessCodeIndex(schoolId, accessCode, schoolName, createdAt);
}

export async function initializeSchoolCampaignStart(
  schoolId: string,
  startAt: number
): Promise<void> {
  const schoolRef = doc(db, "schools", schoolId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(schoolRef);
    if (!snap.exists()) return;

    const data = snap.data() as School;
    if (typeof data.campaignStartAt === "number") return;

    tx.update(schoolRef, { campaignStartAt: startAt });
  });
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

interface UpdateStudentProfileInput {
  studentId: string;
  displayName: string;
  romanNickname?: string;
  age?: number;
  currentClassId: string;
  targetClassId: string;
}

export async function updateStudentProfileAndClass(
  input: UpdateStudentProfileInput
): Promise<void> {
  const userRef = doc(db, "users", input.studentId);

  await runTransaction(db, async (tx) => {
    const updates = {
      displayName: input.displayName,
      classId: input.targetClassId,
      romanNickname: input.romanNickname ? input.romanNickname : deleteField(),
      age: typeof input.age === "number" ? input.age : deleteField(),
    };

    tx.update(userRef, updates);

    if (input.currentClassId !== input.targetClassId) {
      tx.update(doc(db, "classes", input.currentClassId), {
        studentIds: arrayRemove(input.studentId),
      });
      tx.update(doc(db, "classes", input.targetClassId), {
        studentIds: arrayUnion(input.studentId),
      });
    }
  });
}

export async function deleteStudentWithCleanup(
  studentId: string,
  classId?: string
): Promise<void> {
  const batch = writeBatch(db);

  if (classId) {
    batch.update(doc(db, "classes", classId), {
      studentIds: arrayRemove(studentId),
    });
  }

  const resultsSnap = await getDocs(
    query(collection(db, "results"), where("studentId", "==", studentId))
  );

  resultsSnap.docs.forEach((resultDoc) => {
    batch.delete(resultDoc.ref);
  });

  batch.delete(doc(db, "users", studentId));

  await batch.commit();
}

interface StudentDeletionRequestInput {
  studentId: string;
  studentName: string;
  studentRomanNickname?: string;
  schoolId: string;
  classId: string;
  className: string;
  requestedByUid: string;
  requestedByName: string;
  reason: string;
}

export interface StudentDeletionRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentRomanNickname?: string;
  schoolId: string;
  classId: string;
  className: string;
  requestedByUid: string;
  requestedByName: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

export async function getPendingStudentDeletionRequestIds(
  schoolId: string
): Promise<string[]> {
  const requestsSnap = await getDocs(
    query(
      collection(db, "studentDeletionRequests"),
      where("schoolId", "==", schoolId),
      where("status", "==", "pending")
    )
  );

  return requestsSnap.docs
    .map((d) => (d.data() as { studentId?: string }).studentId)
    .filter((studentId): studentId is string => Boolean(studentId));
}

export async function getStudentDeletionRequests(
  status?: "pending" | "approved" | "rejected"
): Promise<StudentDeletionRequest[]> {
  const requestsRef = collection(db, "studentDeletionRequests");
  const requestsQuery = status
    ? query(requestsRef, where("status", "==", status))
    : requestsRef;

  const snap = await getDocs(requestsQuery);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentDeletionRequest));
}

export async function createStudentDeletionRequest(
  request: StudentDeletionRequestInput
): Promise<string> {
  const payload = {
    studentId: request.studentId,
    studentName: request.studentName,
    schoolId: request.schoolId,
    classId: request.classId,
    className: request.className,
    requestedByUid: request.requestedByUid,
    requestedByName: request.requestedByName,
    reason: request.reason,
    status: "pending",
    createdAt: Date.now(),
    ...(request.studentRomanNickname ? { studentRomanNickname: request.studentRomanNickname } : {}),
  };

  const ref = await addDoc(collection(db, "studentDeletionRequests"), {
    ...payload,
  });
  return ref.id;
}

export async function createStudentDeletionRequestAndNotifyAdmins(
  request: StudentDeletionRequestInput
): Promise<{ requestId: string; queuedEmails: number }> {
  const requestId = await createStudentDeletionRequest(request);

  try {
    const adminsSnap = await getDocs(
      query(collection(db, "users"), where("role", "==", "admin"))
    );

    const adminEmails = adminsSnap.docs
      .map((d) => (d.data() as AppUser).email?.trim())
      .filter((email): email is string => Boolean(email));

    await Promise.all(
      adminEmails.map((adminEmail) =>
        addDoc(collection(db, "mail"), {
          to: adminEmail,
          message: {
            subject: `Student deletion request: ${request.studentName}`,
            text: [
              "A deletion request has been submitted and requires admin review.",
              "",
              `Student: ${request.studentName}`,
              request.studentRomanNickname ? `Roman nickname: ${request.studentRomanNickname}` : undefined,
              `Year: ${request.className}`,
              `School ID: ${request.schoolId}`,
              `Requested by: ${request.requestedByName}`,
              `Reason: ${request.reason}`,
              "",
              `Request ID: ${requestId}`,
            ]
              .filter(Boolean)
              .join("\n"),
            html: `
              <p>A deletion request has been submitted and requires admin review.</p>
              <p><strong>Student:</strong> ${request.studentName}</p>
              ${request.studentRomanNickname ? `<p><strong>Roman nickname:</strong> ${request.studentRomanNickname}</p>` : ""}
              <p><strong>Year:</strong> ${request.className}</p>
              <p><strong>School ID:</strong> ${request.schoolId}</p>
              <p><strong>Requested by:</strong> ${request.requestedByName}</p>
              <p><strong>Reason:</strong> ${request.reason}</p>
              <p><strong>Request ID:</strong> ${requestId}</p>
            `,
          },
        })
      )
    );

    return { requestId, queuedEmails: adminEmails.length };
  } catch (err) {
    console.error("Failed to queue admin deletion-request emails:", err);
    return { requestId, queuedEmails: 0 };
  }
}

export async function approveStudentDeletionRequest(
  requestId: string,
  reviewedByUid?: string
): Promise<void> {
  const requestRef = doc(db, "studentDeletionRequests", requestId);
  const requestSnap = await getDoc(requestRef);
  if (!requestSnap.exists()) {
    throw new Error("Deletion request not found.");
  }

  const request = requestSnap.data() as StudentDeletionRequest;
  if (request.status !== "pending") {
    throw new Error("Deletion request has already been reviewed.");
  }

  await deleteStudentWithCleanup(request.studentId, request.classId);

  await updateDoc(requestRef, {
    status: "approved",
    reviewedAt: Date.now(),
    reviewedByUid: reviewedByUid ?? null,
  });
}

export async function rejectStudentDeletionRequest(
  requestId: string,
  reviewedByUid?: string
): Promise<void> {
  const requestRef = doc(db, "studentDeletionRequests", requestId);
  await updateDoc(requestRef, {
    status: "rejected",
    reviewedAt: Date.now(),
    reviewedByUid: reviewedByUid ?? null,
  });
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
  studentId: string,
  schoolId?: string
): Promise<Result[]> {
  const q = schoolId
    ? query(
        collection(db, "results"),
        where("studentId", "==", studentId),
        where("schoolId", "==", schoolId)
      )
    : query(
        collection(db, "results"),
        where("studentId", "==", studentId)
      );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Result));
}

export async function getResultsByClass(classId: string, schoolId: string): Promise<Result[]> {
  const q = query(
    collection(db, "results"),
    where("classId", "==", classId),
    where("schoolId", "==", schoolId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Result));
}

export async function updateSchoolLogo(schoolId: string, file: File): Promise<string> {
  const storageRef = ref(storage, `school-logos/${schoolId}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "schools", schoolId), { logoUrl: url });
  return url;
}

export async function updateUserPhoto(uid: string, file: File): Promise<string> {
  const storageRef = ref(storage, `profile-photos/${uid}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateDoc(doc(db, "users", uid), { photoUrl: url });
  return url;
}

export async function recordStudentAuthorityConsent(
  uid: string,
  version: string
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    studentAuthorityConsentVersion: version,
    studentAuthorityConsentAt: Date.now(),
  });
}

export async function exportUserData(uid: string): Promise<{
  profile: AppUser | null;
  school: School | null;
  classRecord: Class | null;
  results: Result[];
}> {
  const profile = await getUserDoc(uid);
  if (!profile) {
    return {
      profile: null,
      school: null,
      classRecord: null,
      results: [],
    };
  }

  const [school, classRecord, results] = await Promise.all([
    profile.schoolId ? getSchoolById(profile.schoolId) : Promise.resolve(null),
    profile.classId ? getClassById(profile.classId) : Promise.resolve(null),
    getResultsByStudent(uid),
  ]);

  return {
    profile,
    school,
    classRecord,
    results,
  };
}

export async function getAllUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => d.data() as AppUser);
}

export async function getAllResults(): Promise<Result[]> {
  const snap = await getDocs(collection(db, "results"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Result));
}

