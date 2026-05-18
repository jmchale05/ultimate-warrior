// ─── Firestore Document Types ───────────────────────────────────────────────

export type UserRole = "teacher" | "student" | "admin";
export type SchoolType = "Primary School" | "Secondary School";

export interface School {
  id: string;
  name: string;
  schoolType?: SchoolType;
  address?: string;
  accessCode: string;
  logoUrl?: string;
  campaignStartAt?: number;
  createdAt: number;
}

export interface SchoolAccessCode {
  id: string;
  schoolId: string;
  schoolName: string;
  createdAt: number;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  suffix?: string;
  romanNickname?: string;
  watchedCampaignVideos?: number[];
  watchedCampaignEndVideos?: number[];
  privacyConsentVersion?: string;
  privacyConsentAt?: number;
  studentAuthorityConsentVersion?: string;
  studentAuthorityConsentAt?: number;
  studentDataConsentConfirmedAt?: number;
  studentDataConsentConfirmedBy?: string;
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

export interface Result {
  id: string;
  challengeId: string;
  studentId: string;
  classId: string;
  schoolId: string;
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
