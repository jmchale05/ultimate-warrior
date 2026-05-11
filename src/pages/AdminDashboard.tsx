import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { FullPageLoader } from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import {
  getAllSchools,
  getAllUsers,
  getAllResults,
  getClassesBySchool,
  getStudentDeletionRequests,
  approveStudentDeletionRequest,
  rejectStudentDeletionRequest,
  createSchool,
  createClass,
  createUserDoc,
  addStudentToClass,
  recordStudentAuthorityConsent,
  ensureSchoolAccessCodeIndex,
} from "../lib/firestore";
import type { AppUser, Class, Result, School } from "../types";
import type { StudentDeletionRequest } from "../lib/firestore";

const TOTAL_MILES = 78;
const STUDENT_AUTHORITY_CONSENT_VERSION = "2026-05";
const YEAR_OPTIONS = ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"];

interface SchoolStats {
  school: School;
  classes: Class[];
  teachers: AppUser[];
  students: AppUser[];
  totalMiles: number;
  avgMiles: number;
  completedStudents: number; // reached 78 mi
}

function calculateBusinessDays(startTimestamp: number): number {
  const start = new Date(startTimestamp);
  const today = new Date();

  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  let count = 0;
  const current = new Date(start);

  while (current <= today) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

export default function AdminDashboard() {
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const [schoolStats, setSchoolStats] = useState<SchoolStats[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [allResults, setAllResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolSort, setSchoolSort] = useState<"miles" | "name" | "students">("miles");
  const [studentSearch, setStudentSearch] = useState("");
  const [copiedSchoolId, setCopiedSchoolId] = useState<string | null>(null);

  // Add School modal
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolSaving, setSchoolSaving] = useState(false);
  const [schoolError, setSchoolError] = useState("");
  const [schoolAccessCode, setSchoolAccessCode] = useState("");

  // Add Student modal
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAuthorityConsentModal, setShowAuthorityConsentModal] = useState(false);
  const [authorityConsentChecked, setAuthorityConsentChecked] = useState(false);
  const [authorityConsentSaving, setAuthorityConsentSaving] = useState(false);
  const [hasAuthorityConsent, setHasAuthorityConsent] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentRomanNickname, setStudentRomanNickname] = useState("");
  const [studentAge, setStudentAge] = useState("");
  const [studentSchoolId, setStudentSchoolId] = useState("");
  const [studentClassId, setStudentClassId] = useState("");
  const [studentSaving, setStudentSaving] = useState(false);
  const [studentError, setStudentError] = useState("");
  const [studentSuccessToast, setStudentSuccessToast] = useState("");
  const [deletionRequests, setDeletionRequests] = useState<StudentDeletionRequest[]>([]);
  const [deletionRequestActionId, setDeletionRequestActionId] = useState<string | null>(null);
  const [deletionRequestError, setDeletionRequestError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [schools, users, results, requests] = await Promise.all([
        getAllSchools(),
        getAllUsers(),
        getAllResults(),
        getStudentDeletionRequests("pending"),
      ]);

      await Promise.all(
        schools.map((school) =>
          ensureSchoolAccessCodeIndex(
            school.id,
            school.accessCode,
            school.name,
            school.createdAt
          )
        )
      );

      setAllUsers(users);
      setAllResults(results);
      setDeletionRequests(requests);

      const milesByStudent = new Map<string, number>();
      for (const r of results) {
        milesByStudent.set(r.studentId, (milesByStudent.get(r.studentId) ?? 0) + r.distanceMiles);
      }

      const stats: SchoolStats[] = await Promise.all(
        schools.map(async (school) => {
          const classes = await getClassesBySchool(school.id);
          const teachers = users.filter(
            (u) => u.role === "teacher" && u.schoolId === school.id
          );
          const studentIds = [...new Set(classes.flatMap((c) => c.studentIds))];
          const students = users.filter((u) => studentIds.includes(u.uid));
          const milesArr = studentIds.map((id) => milesByStudent.get(id) ?? 0);
          const totalMiles = milesArr.reduce((a, b) => a + b, 0);
          const avgMiles = students.length > 0 ? totalMiles / students.length : 0;
          const completedStudents = milesArr.filter((m) => m >= TOTAL_MILES).length;
          return { school, classes, teachers, students, totalMiles, avgMiles, completedStudents };
        })
      );

      stats.sort((a, b) => b.totalMiles - a.totalMiles);
      setSchoolStats(stats);
    } catch (err) {
      console.error("Failed to load admin dashboard:", err);
      setSchoolStats([]);
      setAllUsers([]);
      setAllResults([]);
      setDeletionRequests([]);
      setLoadError("We could not load admin data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setHasAuthorityConsent(Boolean(appUser?.studentAuthorityConsentAt));
  }, [appUser]);

  useEffect(() => {
    if (!studentSuccessToast) return;
    const toastTimer = window.setTimeout(() => {
      setStudentSuccessToast("");
    }, 2200);
    return () => window.clearTimeout(toastTimer);
  }, [studentSuccessToast]);

  async function handleAddSchool() {
    if (!schoolName.trim()) { setSchoolError("School name is required."); return; }
    setSchoolSaving(true);
    setSchoolError("");
    try {
      const created = await createSchool(schoolName.trim(), schoolAddress.trim() || undefined);
      setSchoolAccessCode(created.accessCode);
      setSchoolName(""); setSchoolAddress("");
      await loadData();
    } catch {
      setSchoolError("Failed to create school. Try again.");
    } finally {
      setSchoolSaving(false);
    }
  }

  async function handleAddStudent() {
    if (!studentName.trim()) { setStudentError("Name is required."); return; }
    if (!studentSchoolId) { setStudentError("Select a school."); return; }
    if (!studentClassId) { setStudentError("Select a year."); return; }

    const schoolStat = schoolStats.find((s) => s.school.id === studentSchoolId);
    const selectedYear = studentClassId;
    let classId = schoolStat?.classes.find((c) => c.name === selectedYear)?.id;
    if (!classId) {
      const teacherIdForYear = schoolStat?.teachers[0]?.uid ?? appUser?.uid;
      if (!teacherIdForYear) {
        setStudentError("This school has no teacher yet. Add a teacher before assigning a year.");
        return;
      }
      classId = await createClass(selectedYear, studentSchoolId, teacherIdForYear);
    }

    setStudentSaving(true);
    setStudentError("");
    try {
      const newUid = crypto.randomUUID();
      const newUser: AppUser = {
        uid: newUid,
        email: "",
        displayName: studentName.trim(),
        romanNickname: studentRomanNickname.trim() || undefined,
        studentDataConsentConfirmedAt: Date.now(),
        studentDataConsentConfirmedBy: appUser?.uid,
        role: "student",
        schoolId: studentSchoolId,
        classId,
        age: studentAge ? parseInt(studentAge) : undefined,
        createdAt: Date.now(),
      };
      await createUserDoc(newUser);
      await addStudentToClass(classId, newUid);
      const createdStudentName = studentName.trim();
      setStudentName(""); setStudentRomanNickname(""); setStudentAge(""); setStudentSchoolId(""); setStudentClassId("");
      setShowAddStudent(false);
      setStudentSuccessToast(`${createdStudentName} added successfully.`);
      await loadData();
    } catch {
      setStudentError("Failed to add student. Try again.");
    } finally {
      setStudentSaving(false);
    }
  }

  async function handleCopyAccessCode(schoolId: string, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedSchoolId(schoolId);
      window.setTimeout(() => {
        setCopiedSchoolId((current) => (current === schoolId ? null : current));
      }, 1400);
    } catch (err) {
      console.error("Failed to copy access code:", err);
    }
  }

  async function handleApproveDeletionRequest(requestId: string) {
    setDeletionRequestActionId(requestId);
    setDeletionRequestError("");
    try {
      await approveStudentDeletionRequest(requestId, appUser?.uid);
      setStudentSuccessToast("Deletion request approved.");
      await loadData();
    } catch (err) {
      console.error("Failed to approve deletion request:", err);
      setDeletionRequestError("Failed to approve request. Please try again.");
    } finally {
      setDeletionRequestActionId(null);
    }
  }

  async function handleRejectDeletionRequest(requestId: string) {
    setDeletionRequestActionId(requestId);
    setDeletionRequestError("");
    try {
      await rejectStudentDeletionRequest(requestId, appUser?.uid);
      setStudentSuccessToast("Deletion request declined.");
      await loadData();
    } catch (err) {
      console.error("Failed to decline deletion request:", err);
      setDeletionRequestError("Failed to decline request. Please try again.");
    } finally {
      setDeletionRequestActionId(null);
    }
  }

  async function handleConfirmStudentAuthorityConsent() {
    if (!appUser || !authorityConsentChecked) return;

    setAuthorityConsentSaving(true);
    try {
      await recordStudentAuthorityConsent(appUser.uid, STUDENT_AUTHORITY_CONSENT_VERSION);
      setHasAuthorityConsent(true);
      setShowAuthorityConsentModal(false);
      setAuthorityConsentChecked(false);
      setShowAddStudent(true);
    } catch (err) {
      console.error("Failed to save authority consent:", err);
      setStudentError("Could not save authority consent. Please try again.");
    } finally {
      setAuthorityConsentSaving(false);
    }
  }

  function handleOpenAddStudent() {
    setStudentError("");
    if (hasAuthorityConsent) {
      setShowAddStudent(true);
      return;
    }
    setShowAuthorityConsentModal(true);
  }

  const totalStudents = allUsers.filter((u) => u.role === "student").length;
  const totalTeachers = allUsers.filter((u) => u.role === "teacher").length;
  const totalMilesAll = allResults.reduce((s, r) => s + r.distanceMiles, 0);
  const totalSchools = schoolStats.length;
  const totalPendingDeletionRequests = deletionRequests.length;

  const deletionRequestsWithContext = useMemo(() => {
    return [...deletionRequests]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((request) => {
        const schoolName = schoolStats.find((s) => s.school.id === request.schoolId)?.school.name ?? "Unknown school";
        const requestedByUser = allUsers.find((u) => u.uid === request.requestedByUid);
        return {
          ...request,
          schoolName,
          requestedByDisplay: requestedByUser?.displayName ?? request.requestedByName,
        };
      });
  }, [deletionRequests, schoolStats, allUsers]);

  const filteredSchoolStats = useMemo(() => {
    const query = schoolSearch.trim().toLowerCase();

    const filtered = schoolStats.filter((s) => {
      if (!query) return true;
      return (
        s.school.name.toLowerCase().includes(query) ||
        (s.school.address ?? "").toLowerCase().includes(query)
      );
    });

    const sorted = [...filtered];
    if (schoolSort === "name") {
      sorted.sort((a, b) => a.school.name.localeCompare(b.school.name));
    } else if (schoolSort === "students") {
      sorted.sort((a, b) => b.students.length - a.students.length);
    } else {
      sorted.sort((a, b) => b.totalMiles - a.totalMiles);
    }

    return sorted;
  }, [schoolStats, schoolSearch, schoolSort]);

  const selected = selectedSchool
    ? schoolStats.find((s) => s.school.id === selectedSchool) ?? null
    : null;

  const selectedStudents = useMemo(() => {
    if (!selected) return [];

    const query = studentSearch.trim().toLowerCase();

    return selected.students
      .map((u) => {
        const miles = allResults
          .filter((r) => r.studentId === u.uid)
          .reduce((s, r) => s + r.distanceMiles, 0);
        const cls = selected.classes.find((c) => c.studentIds.includes(u.uid));
        return { user: u, miles, className: cls?.name ?? "-" };
      })
      .filter(({ user, className }) => {
        if (!query) return true;
        return (
          user.displayName.toLowerCase().includes(query) ||
          (user.romanNickname ?? "").toLowerCase().includes(query) ||
          className.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.miles - a.miles);
  }, [selected, allResults, studentSearch]);

  if (loading) return <FullPageLoader message="Loading admin data..." />;

  if (loadError) {
    return (
      <div className="h-screen bg-stone-900 text-stone-100 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 min-h-0 w-full px-14 py-10 overflow-y-auto overflow-x-hidden flex items-center justify-center">
          <div className="roman-card rounded-2xl px-8 py-8 max-w-lg w-full text-center">
            <h2 className="text-roman-gold font-serif text-2xl font-bold mb-3">Admin Data Unavailable</h2>
            <p className="text-stone-400 mb-6">{loadError}</p>
            <button
              onClick={() => loadData()}
              className="px-5 py-2.5 rounded-lg border border-roman-gold/40 text-roman-gold text-xs uppercase tracking-wider font-semibold hover:bg-roman-gold/10 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-stone-900 text-stone-100 flex flex-col overflow-hidden">
      <Navbar />

      {studentSuccessToast && (
        <div className="fixed top-5 right-5 z-50 pointer-events-none">
          <div className="rounded-lg border border-emerald-300/40 bg-emerald-500/15 text-emerald-100 px-4 py-3 shadow-lg backdrop-blur-sm text-sm font-semibold tracking-wide">
            {studentSuccessToast}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 w-full px-12 py-14 overflow-y-auto overflow-x-hidden">
        {/* Global stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {[
            { label: "Schools", value: totalSchools, icon: "🏛" },
            { label: "Teachers", value: totalTeachers, icon: "⚔" },
            { label: "Students", value: totalStudents, icon: "🛡" },
            { label: "Total Miles", value: totalMilesAll.toFixed(1), icon: "🏃" },
          ].map(({ label, value, icon }) => (
            <div
              key={label}
              className="roman-card rounded-xl px-6 py-4 flex items-center gap-4"
            >
              <span className="text-3xl">{icon}</span>
              <div>
                <p className="text-roman-gold font-serif text-3xl font-bold leading-tight">{value}</p>
                <p className="text-stone-500 text-xs uppercase tracking-widest font-semibold">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Deletion requests */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-roman-gold/70 text-base uppercase tracking-[0.2em] font-semibold">
              Deletion Requests
            </h2>
            <span className="text-stone-500 text-sm uppercase tracking-wider">
              Pending: <span className="text-roman-gold font-semibold">{totalPendingDeletionRequests}</span>
            </span>
          </div>

          {deletionRequestError && (
            <p className="text-red-300 text-sm mb-3">{deletionRequestError}</p>
          )}

          <div className="rounded-xl border border-stone-700/50 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-800/80 border-b border-stone-700/50">
                  <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-56">Student</th>
                  <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-40">Year</th>
                  <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-56">School</th>
                  <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-56">Requested By</th>
                  <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold">Reason</th>
                  <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-44">Submitted</th>
                  <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-52 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deletionRequestsWithContext.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-stone-500 text-base">
                      No pending deletion requests.
                    </td>
                  </tr>
                ) : (
                  deletionRequestsWithContext.map((request) => (
                    <tr key={request.id} className="border-b border-stone-800/50 hover:bg-stone-800/30 transition-colors">
                      <td className="px-6 py-4 text-stone-100 font-medium">
                        {request.studentName}
                        {request.studentRomanNickname && (
                          <p className="text-roman-gold/80 text-xs uppercase tracking-wider mt-1">{request.studentRomanNickname}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-stone-300">{request.className}</td>
                      <td className="px-6 py-4 text-stone-300">{request.schoolName}</td>
                      <td className="px-6 py-4 text-stone-300">{request.requestedByDisplay}</td>
                      <td className="px-6 py-4 text-stone-300">
                        <p className="line-clamp-2">{request.reason}</p>
                      </td>
                      <td className="px-6 py-4 text-stone-500 text-sm">
                        {new Date(request.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleApproveDeletionRequest(request.id)}
                            disabled={deletionRequestActionId === request.id}
                            className="px-3 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs uppercase tracking-wider font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRejectDeletionRequest(request.id)}
                            disabled={deletionRequestActionId === request.id}
                            className="px-3 py-1.5 rounded-md bg-red-500/15 border border-red-400/40 text-red-200 text-xs uppercase tracking-wider font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Decline
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Schools table */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-roman-gold/70 text-base uppercase tracking-[0.2em] font-semibold">
              Schools
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleOpenAddStudent}
                className="px-5 py-3 rounded-lg border border-roman-gold/40 text-roman-gold text-sm uppercase tracking-wider font-semibold hover:bg-roman-gold/10 transition-colors"
              >
                + Add Student
              </button>
              <button
                onClick={() => { setShowAddSchool(true); setSchoolError(""); }}
                className="px-5 py-3 rounded-lg bg-roman-gold/20 border border-roman-gold/50 text-roman-gold text-sm uppercase tracking-wider font-semibold hover:bg-roman-gold/30 transition-colors"
              >
                + Add School
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input
              type="text"
              value={schoolSearch}
              onChange={(e) => setSchoolSearch(e.target.value)}
              placeholder="Search school name or address"
              className="min-w-[18rem] flex-1 max-w-md bg-stone-800 border border-stone-700 rounded-lg px-5 py-3.5 text-base text-stone-100 placeholder-stone-500 focus:outline-none focus:border-roman-gold/60 transition-colors"
            />
            <select
              value={schoolSort}
              onChange={(e) => setSchoolSort(e.target.value as "miles" | "name" | "students")}
              className="bg-stone-800 border border-stone-700 rounded-lg px-4 py-3.5 text-base text-stone-100 focus:outline-none focus:border-roman-gold/60 transition-colors"
            >
              <option value="miles">Sort: Total Miles</option>
              <option value="students">Sort: Students</option>
              <option value="name">Sort: School Name</option>
            </select>
          </div>
          <div className="rounded-xl border border-stone-700/50 overflow-hidden">
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="bg-stone-800/80 border-b border-stone-700/50">
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold w-[22%]">School</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold w-[12%]">Access Code</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold w-[8%] text-center">Days</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold w-[7%] text-center">Classes</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold w-[8%] text-center">Teachers</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold w-[8%] text-center">Students</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold w-[10%] text-center">Total Miles</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold w-[10%] text-center">Avg Miles</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold w-[9%] text-center">Completed</th>
                  <th className="px-6 py-5 w-[6%]" />
                </tr>
              </thead>
              <tbody>
                {filteredSchoolStats.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-stone-500 text-lg">
                      {schoolStats.length === 0 ? "No schools found." : "No schools match your search."}
                    </td>
                  </tr>
                ) : (
                  filteredSchoolStats.map((s) => {
                    const teacherStartCandidates = s.teachers
                      .map((t) => t.createdAt)
                      .filter((ts) => Number.isFinite(ts));
                    const firstTeacherStart = teacherStartCandidates.length > 0
                      ? Math.min(...teacherStartCandidates)
                      : undefined;
                    const campaignStart = s.school.campaignStartAt ?? firstTeacherStart ?? s.school.createdAt;
                    const dayCount = Math.min(200, calculateBusinessDays(campaignStart));
                    return (
                      <tr
                        key={s.school.id}
                        className={`border-b border-stone-800/50 transition-colors ${
                          selectedSchool === s.school.id
                            ? "bg-roman-gold/5"
                            : "hover:bg-stone-800/40"
                        }`}
                      >
                        <td className="px-6 py-6 font-medium text-stone-100 text-xl">
                          {s.school.name}
                          {s.school.address && (
                            <p className="text-stone-500 text-sm mt-1">{s.school.address}</p>
                          )}
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleCopyAccessCode(s.school.id, s.school.accessCode);
                              }}
                              className="text-stone-300 text-lg font-mono tracking-wider hover:text-roman-gold transition-colors"
                              title="Click to copy access code"
                            >
                              {s.school.accessCode}
                            </button>
                            {copiedSchoolId === s.school.id && (
                              <span className="text-roman-gold text-xs uppercase tracking-wider font-semibold">Copied</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-6 text-roman-gold text-lg font-semibold text-center">
                          {dayCount}/200
                        </td>
                        <td className="px-6 py-6 text-stone-300 text-lg text-center">{s.classes.length}</td>
                        <td className="px-6 py-6 text-stone-300 text-lg text-center">{s.teachers.length}</td>
                        <td className="px-6 py-6 text-stone-300 text-lg text-center">{s.students.length}</td>
                        <td className="px-6 py-6 text-roman-gold font-bold text-lg text-center">{s.totalMiles.toFixed(1)}</td>
                        <td className="px-6 py-6 text-stone-300 text-lg text-center">{s.avgMiles.toFixed(1)}</td>
                        <td className="px-6 py-6 text-center">
                          <span className="text-roman-gold font-semibold text-lg">{s.completedStudents}</span>
                          <span className="text-stone-500 text-sm ml-1">/ {s.students.length}</span>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSchool(
                                selectedSchool === s.school.id ? null : s.school.id
                              )
                            }
                            className="px-4 py-2 rounded-lg border border-roman-gold/40 text-roman-gold text-sm uppercase tracking-wider font-semibold hover:bg-roman-gold/10 transition-colors"
                          >
                            {selectedSchool === s.school.id ? "Close" : "View"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected school drill-down */}
        {selected && (
          <div>
            <h2 className="text-roman-gold/70 text-base uppercase tracking-[0.2em] font-semibold mb-4">
              {selected.school.name} — Years
            </h2>
            <div className="grid grid-cols-2 gap-5 mb-12">
              {selected.classes.map((cls) => {
                const clsStudents = selected.students.filter((u) =>
                  cls.studentIds.includes(u.uid)
                );
                const teacher = selected.teachers.find((t) => t.uid === cls.teacherId);
                const clsMiles = clsStudents.reduce((sum, u) => {
                  const miles = allResults
                    .filter((r) => r.studentId === u.uid)
                    .reduce((s, r) => s + r.distanceMiles, 0);
                  return sum + miles;
                }, 0);
                return (
                  <div
                    key={cls.id}
                    className="roman-card rounded-xl px-7 py-6 cursor-pointer hover:border-roman-gold/40 transition-colors"
                    onClick={() => navigate("/campaigns")}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-stone-100 font-semibold text-xl">{cls.name}</p>
                        <p className="text-stone-500 text-sm mt-1">
                          {teacher ? `Teacher: ${teacher.displayName}` : "No teacher assigned"}
                        </p>
                      </div>
                      <span className="text-roman-gold font-bold text-2xl">{clsMiles.toFixed(1)} mi</span>
                    </div>
                    <div className="flex gap-4 text-lg text-stone-400">
                      <span>{clsStudents.length} students</span>
                    </div>
                  </div>
                );
              })}
              {selected.classes.length === 0 && (
                <p className="text-stone-500 text-lg col-span-2">No year groups for this school.</p>
              )}
            </div>

            {/* Students table for selected school */}
            <h2 className="text-roman-gold/70 text-base uppercase tracking-[0.2em] font-semibold mb-4">
              {selected.school.name} — Students
            </h2>
            <div className="mb-3">
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search student, Roman nickname, or year"
                className="w-full max-w-md bg-stone-800 border border-stone-700 rounded-lg px-5 py-3.5 text-base text-stone-100 placeholder-stone-500 focus:outline-none focus:border-roman-gold/60 transition-colors"
              />
            </div>
            <div className="rounded-xl border border-stone-700/50 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-800/80 border-b border-stone-700/50">
                    <th className="pl-8 pr-2 py-5 w-20" />
                    <th className="px-8 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold">Name</th>
                    <th className="px-8 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold w-52">Roman Name</th>
                    <th className="px-8 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold w-28">Age</th>
                    <th className="px-8 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold w-40">Year</th>
                    <th className="px-8 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold w-36">Miles</th>
                    <th className="px-8 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold w-52">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStudents
                    .map(({ user, miles, className }) => {
                      const pct = Math.min(100, Math.round((miles / TOTAL_MILES) * 100));
                      return (
                        <tr
                          key={user.uid}
                          onClick={() => navigate(`/campaigns/${user.uid}`)}
                          className="border-b border-stone-800/50 hover:bg-stone-800/40 cursor-pointer transition-colors"
                        >
                          <td className="pl-8 pr-2 py-6">
                            <div className="w-14 h-14 rounded-full border border-roman-gold/20 overflow-hidden bg-stone-800 flex items-center justify-center shrink-0">
                              {user.photoUrl
                                ? <img src={user.photoUrl} alt={user.displayName} className="w-full h-full object-cover" />
                                : <img src="/warrior.png" alt="Warrior" className="w-full h-full object-cover opacity-60" />
                              }
                            </div>
                          </td>
                          <td className="px-8 py-6 font-medium text-stone-100 text-lg">{user.displayName}</td>
                          <td className="px-8 py-6 text-stone-300 text-lg">{user.romanNickname ?? "-"}</td>
                          <td className="px-8 py-6 text-stone-400 text-lg">{user.age ?? "—"}</td>
                          <td className="px-8 py-6 text-stone-300 text-lg">{className}</td>
                          <td className="px-8 py-6 text-roman-gold font-bold text-lg">{miles.toFixed(1)}</td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="flex-1 h-3 rounded-full bg-stone-700/60 overflow-hidden">
                                <div
                                  className="h-full bg-linear-to-r from-roman-gold/60 to-roman-gold rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-stone-400 text-sm font-mono w-10 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {selectedStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-8 py-12 text-center text-stone-500 text-lg">
                        {selected.students.length === 0 ? "No students in this school." : "No students match your search."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add School Modal */}
      {showAddSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={() => setShowAddSchool(false)} />
          <div className="relative bg-stone-900 border border-roman-gold/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="h-px w-full bg-linear-to-r from-transparent via-roman-gold/50 to-transparent" />
            <div className="px-8 py-8">
              <h2 className="text-roman-gold font-serif text-2xl font-bold mb-6 tracking-wide">Add School</h2>
              {schoolAccessCode && (
                <div className="mb-4 rounded-lg border border-roman-gold/30 bg-roman-gold/10 px-4 py-3">
                  <p className="text-roman-gold text-xs uppercase tracking-widest font-semibold mb-1">Access Code</p>
                  <p className="font-mono text-xl tracking-[0.3em] text-stone-100">{schoolAccessCode}</p>
                  <p className="text-stone-500 text-xs mt-2">Share this code with teachers and staff.</p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">School Name *</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. St. Mary's Primary"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Address (optional)</label>
                  <input
                    type="text"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    placeholder="e.g. 123 Main St, Dublin"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  />
                </div>
                {schoolError && <p className="text-red-400 text-sm">{schoolError}</p>}
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => { setShowAddSchool(false); setSchoolError(""); }}
                  className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSchool}
                  disabled={schoolSaving}
                  className="flex-1 py-3 rounded-xl bg-roman-gold text-stone-950 font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {schoolSaving ? "Adding..." : "Add School"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={() => setShowAddStudent(false)} />
          <div className="relative bg-stone-900 border border-roman-gold/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="h-px w-full bg-linear-to-r from-transparent via-roman-gold/50 to-transparent" />
            <div className="px-8 py-8">
              <h2 className="text-roman-gold font-serif text-2xl font-bold mb-6 tracking-wide">Add Student</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Roman Nickname</label>
                  <input
                    type="text"
                    value={studentRomanNickname}
                    onChange={(e) => setStudentRomanNickname(e.target.value)}
                    placeholder="e.g. The Brave"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Age</label>
                  <input
                    type="number"
                    value={studentAge}
                    onChange={(e) => setStudentAge(e.target.value)}
                    placeholder="e.g. 10"
                    min={5}
                    max={18}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">School *</label>
                  <select
                    value={studentSchoolId}
                    onChange={(e) => { setStudentSchoolId(e.target.value); setStudentClassId(""); }}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  >
                    <option value="">Select school...</option>
                    {schoolStats.map((s) => (
                      <option key={s.school.id} value={s.school.id}>{s.school.name}</option>
                    ))}
                  </select>
                </div>
                {studentSchoolId && (
                  <div>
                    <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Year *</label>
                    <select
                      value={studentClassId}
                      onChange={(e) => setStudentClassId(e.target.value)}
                      className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 focus:outline-none focus:border-roman-gold/60 transition-colors"
                    >
                      <option value="">Select year...</option>
                      {YEAR_OPTIONS.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                )}
                {studentError && <p className="text-red-400 text-sm">{studentError}</p>}
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => { setShowAddStudent(false); setStudentError(""); setStudentRomanNickname(""); }}
                  className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStudent}
                  disabled={studentSaving}
                  className="flex-1 py-3 rounded-xl bg-roman-gold text-stone-950 font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {studentSaving ? "Adding..." : "Add Student"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* One-time authority consent modal */}
      {showAuthorityConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={() => setShowAuthorityConsentModal(false)} />
          <div className="relative bg-stone-900 border border-roman-gold/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="h-px w-full bg-linear-to-r from-transparent via-roman-gold/50 to-transparent" />
            <div className="px-8 py-8">
              <h2 className="text-roman-gold font-serif text-2xl font-bold mb-3 tracking-wide">Authority Confirmation</h2>
              <p className="text-stone-400 text-sm mb-5">
                Confirm once to enable student profile creation for your account.
              </p>

              <label className="flex items-start gap-2.5 text-stone-300 text-sm leading-relaxed border border-stone-700/60 rounded-lg px-3 py-3 mb-5">
                <input
                  type="checkbox"
                  checked={authorityConsentChecked}
                  onChange={(e) => setAuthorityConsentChecked(e.target.checked)}
                  className="mt-0.5 accent-roman-gold"
                />
                <span>
                  I confirm I have school/parental authority and required consent to create student profiles.
                </span>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAuthorityConsentModal(false); setAuthorityConsentChecked(false); }}
                  className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmStudentAuthorityConsent}
                  disabled={!authorityConsentChecked || authorityConsentSaving}
                  className="flex-1 py-3 rounded-xl bg-roman-gold text-stone-950 font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {authorityConsentSaving ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
