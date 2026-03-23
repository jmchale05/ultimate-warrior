// ─── Firestore Document Types ───────────────────────────────────────────────

export type UserRole = "teacher" | "student" | "admin";

export interface School {
  id: string;
  name: string;
  address?: string;
  createdAt: number;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  schoolId?: string;
  classId?: string; // for students
  age?: number;
  photoUrl?: string;
  createdAt: number;
}

export interface Class {
  id: string;
  name: string;
  schoolId: string;
  teacherId: string;
  studentIds: string[];
  createdAt: number;
}

export interface Challenge {
  id: string;
  classId: string;
  teacherId: string;
  title: string;
  description?: string;
  distanceMiles: number;
  assignedTo: string[]; // array of student UIDs
  dueDate?: number;
  createdAt: number;
}

export interface Result {
  id: string;
  challengeId: string;
  studentId: string;
  classId: string;
  distanceMiles: number;
  completedAt: number;
  notes?: string;
}

// ─── Roman Rank ──────────────────────────────────────────────────────────────

export interface RomanRank {
  name: string;
  minMiles: number;
  maxMiles: number | null;
  icon: string;
}
