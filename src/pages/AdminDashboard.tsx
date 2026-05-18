import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  updateSchool,
  deleteSchool,
  createClass,
  createUserDoc,
  addStudentToClass,
  recordStudentAuthorityConsent,
  ensureSchoolAccessCodeIndex,
} from "../lib/firestore";
import type { AppUser, Class, Result, School, SchoolType } from "../types";
import type { StudentDeletionRequest } from "../lib/firestore";

const TOTAL_MILES = 78;
const STUDENT_AUTHORITY_CONSENT_VERSION = "2026-05";
const PRIMARY_YEAR_OPTIONS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
const SECONDARY_YEAR_OPTIONS = ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"];
const MAX_SCHOOL_ADDRESS_LENGTH = 120;

function getYearOptionsForSchoolType(schoolType: SchoolType | undefined): string[] {
  return schoolType === "Primary School" ? PRIMARY_YEAR_OPTIONS : SECONDARY_YEAR_OPTIONS;
}

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
  const [schoolStats, setSchoolStats] = useState<SchoolStats[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [allResults, setAllResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolSort, setSchoolSort] = useState<"miles" | "name" | "students">("miles");
  const [copiedSchoolId, setCopiedSchoolId] = useState<string | null>(null);

  // Add School modal
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState<SchoolType>("Primary School");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolSaving, setSchoolSaving] = useState(false);
  const [schoolError, setSchoolError] = useState("");
  const [isEditingSchool, setIsEditingSchool] = useState(false);
  const [schoolToEdit, setSchoolToEdit] = useState<School | null>(null);

  // Delete School modal
  const [showDeleteSchoolModal, setShowDeleteSchoolModal] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  const [deleteSchoolConfirmText, setDeleteSchoolConfirmText] = useState("");
  const [schoolDeleting, setSchoolDeleting] = useState(false);
  const [openActionsForSchool, setOpenActionsForSchool] = useState<string | null>(null);
  const [desktopSchoolActionsAnchor, setDesktopSchoolActionsAnchor] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!openActionsForSchool) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!actionsMenuRef.current?.contains(event.target as Node)) {
        setOpenActionsForSchool(null);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [openActionsForSchool]);

  useEffect(() => {
    if (!openActionsForSchool || !desktopSchoolActionsAnchor) return;

    const handleViewportChange = () => {
      setOpenActionsForSchool(null);
      setDesktopSchoolActionsAnchor(null);
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [openActionsForSchool, desktopSchoolActionsAnchor]);

  function toggleDesktopSchoolActions(
    event: React.MouseEvent<HTMLButtonElement>,
    schoolId: string
  ) {
    event.stopPropagation();
    if (openActionsForSchool === schoolId) {
      setOpenActionsForSchool(null);
      setDesktopSchoolActionsAnchor(null);
      return;
    }

    const triggerRect = event.currentTarget.getBoundingClientRect();
    const menuEstimatedHeight = 180;
    const spacing = 8;
    const shouldOpenUp = window.innerHeight - triggerRect.bottom < menuEstimatedHeight && triggerRect.top > menuEstimatedHeight;

    setDesktopSchoolActionsAnchor({
      top: shouldOpenUp ? triggerRect.top - spacing : triggerRect.bottom + spacing,
      left: triggerRect.right,
      openUp: shouldOpenUp,
    });
    setOpenActionsForSchool(schoolId);
  }

  useEffect(() => {
    if (!openActionsForSchool) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenActionsForSchool(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [openActionsForSchool]);

  async function handleAddSchool() {
    if (!schoolName.trim()) { setSchoolError("School name is required."); return; }
    const normalizedAddress = schoolAddress.trim();
    if (normalizedAddress.length > MAX_SCHOOL_ADDRESS_LENGTH) {
      setSchoolError(`Address must be ${MAX_SCHOOL_ADDRESS_LENGTH} characters or fewer.`);
      return;
    }
    setSchoolSaving(true);
    setSchoolError("");
    try {
      if (isEditingSchool && schoolToEdit) {
        await updateSchool(
          schoolToEdit.id,
          schoolName.trim(),
          schoolType,
          normalizedAddress || undefined
        );
      } else {
        await createSchool(
          schoolName.trim(),
          schoolType,
          normalizedAddress || undefined
        );
      }
      setSchoolName("");
      setSchoolType("Primary School");
      setSchoolAddress("");
      setShowAddSchool(false);
      setIsEditingSchool(false);
      setSchoolToEdit(null);
      await loadData();
    } catch {
      setSchoolError(`Failed to ${isEditingSchool ? "update" : "create"} school. Try again.`);
    } finally {
      setSchoolSaving(false);
    }
  }

  function resetSchoolFormState() {
    setSchoolName("");
    setSchoolType("Primary School");
    setSchoolAddress("");
    setSchoolError("");
    setIsEditingSchool(false);
    setSchoolToEdit(null);
  }

  function handleOpenAddSchool() {
    resetSchoolFormState();
    setShowAddSchool(true);
  }

  function handleCloseAddSchool() {
    resetSchoolFormState();
    setShowAddSchool(false);
  }

  function handleOpenEditSchool(school: School) {
    setSchoolName(school.name);
    setSchoolType(school.schoolType || "Secondary School");
    setSchoolAddress(school.address || "");
    setSchoolToEdit(school);
    setIsEditingSchool(true);
    setShowAddSchool(true);
    setSchoolError("");
    setOpenActionsForSchool(null);
  }

  function handleOpenDeleteSchoolModal(school: School) {
    setSchoolToDelete(school);
    setDeleteSchoolConfirmText("");
    setShowDeleteSchoolModal(true);
    setOpenActionsForSchool(null);
  }

  function handleCloseDeleteSchoolModal() {
    if (schoolDeleting) return;
    setShowDeleteSchoolModal(false);
    setSchoolToDelete(null);
    setDeleteSchoolConfirmText("");
  }

  async function handleDeleteSchool() {
    if (!schoolToDelete || deleteSchoolConfirmText.trim() !== "DELETE") return;
    setSchoolDeleting(true);
    try {
      await deleteSchool(schoolToDelete.id);
      handleCloseDeleteSchoolModal();
      await loadData();
    } catch {
      alert("Failed to delete school. Try again.");
    } finally {
      setSchoolDeleting(false);
    }
  }

  async function handleAddStudent() {
    if (!studentName.trim()) { setStudentError("Name is required."); return; }
    if (!studentSchoolId) { setStudentError("Select a school."); return; }
    if (!studentClassId) { setStudentError("Select a year."); return; }

    const selectedSchool = schoolStats.find((s) => s.school.id === studentSchoolId)?.school;
    const validYearsForSchool = getYearOptionsForSchoolType(selectedSchool?.schoolType);
    if (!validYearsForSchool.includes(studentClassId)) {
      setStudentError("Select a valid year for this school type.");
      return;
    }

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
      await loadData();
      setStudentSuccessToast(`${createdStudentName} added successfully.`);
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
      // Dynamically remove the approved request from the UI
      setDeletionRequests((prev) => prev.filter((req) => req.id !== requestId));
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
  const selectedStudentSchool = schoolStats.find((s) => s.school.id === studentSchoolId)?.school;
  const selectedStudentYearOptions = getYearOptionsForSchoolType(selectedStudentSchool?.schoolType);

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

      <div className="flex-1 min-h-0 w-full px-4 py-8 overflow-y-auto overflow-x-hidden sm:px-6 lg:px-10 xl:px-12 xl:py-14">
        {/* Global stat cards */}
        <div className="grid grid-cols-1 gap-4 mb-10 sm:grid-cols-2 xl:grid-cols-4">
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
        {deletionRequestsWithContext.length > 0 && (
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
                  {deletionRequestsWithContext.map((request) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Schools table */}
        <div className="mb-12">
          <div className="mb-4">
            <h2 className="text-roman-gold/70 text-base uppercase tracking-[0.2em] font-semibold mb-4">
              Schools
            </h2>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:min-w-72 sm:flex-1 sm:max-w-md">
                  <input
                    type="text"
                    value={schoolSearch}
                    onChange={(e) => setSchoolSearch(e.target.value)}
                    placeholder="Search school name or address"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-5 py-3.5 pr-12 text-base text-stone-100 placeholder-stone-500 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  />
                  {schoolSearch.trim() && (
                    <button
                      type="button"
                      onClick={() => setSchoolSearch("")}
                      aria-label="Clear school search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md text-stone-400 hover:text-roman-gold hover:bg-stone-700/50 transition-colors flex items-center justify-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                        aria-hidden="true"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  )}
                </div>
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
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex">
                <button
                  onClick={handleOpenAddStudent}
                  className="px-5 py-3 rounded-lg border border-roman-gold/40 text-roman-gold text-sm uppercase tracking-wider font-semibold hover:bg-roman-gold/10 transition-colors"
                >
                  + Add Student
                </button>
                <button
                  onClick={handleOpenAddSchool}
                  className="px-5 py-3 rounded-lg bg-roman-gold/20 border border-roman-gold/50 text-roman-gold text-sm uppercase tracking-wider font-semibold hover:bg-roman-gold/30 transition-colors"
                >
                  + Add School
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-4 xl:hidden">
            {filteredSchoolStats.length === 0 ? (
              <div className="rounded-xl border border-stone-700/50 bg-stone-900/50 px-6 py-12 text-center text-stone-500 text-lg">
                <p>{schoolStats.length === 0 ? "No schools found." : "No schools match your search."}</p>
                {schoolStats.length === 0 && (
                  <button
                    type="button"
                    onClick={handleOpenAddSchool}
                    className="mt-5 px-5 py-3 rounded-lg bg-roman-gold/20 border border-roman-gold/50 text-roman-gold text-sm uppercase tracking-wider font-semibold hover:bg-roman-gold/30 transition-colors"
                  >
                    + Add School
                  </button>
                )}
              </div>
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
                  <div key={s.school.id} className="rounded-xl border border-stone-700/50 bg-stone-900/50 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="wrap-break-word text-xl font-semibold text-stone-100">{s.school.name}</h3>
                        <p className="text-roman-gold/75 text-xs mt-1 uppercase tracking-wider font-semibold">
                          {s.school.schoolType ?? "School Type Not Set"}
                        </p>
                        {s.school.address && (
                          <p className="mt-2 wrap-break-word text-stone-500 text-sm leading-snug">{s.school.address}</p>
                        )}
                      </div>
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionsForSchool((current) => current === s.school.id ? null : s.school.id);
                          }}
                          className={`w-10 h-10 rounded-lg border text-xl leading-none transition-colors ${openActionsForSchool === s.school.id ? "border-roman-gold bg-roman-gold/15 text-roman-gold" : "border-roman-gold/40 text-roman-gold hover:bg-roman-gold/10"}`}
                          aria-label="Open school actions"
                          aria-haspopup="menu"
                          aria-expanded={openActionsForSchool === s.school.id}
                          aria-controls={`school-card-actions-${s.school.id}`}
                        >
                          ⋮
                        </button>
                        {openActionsForSchool === s.school.id && (
                          <div
                            ref={actionsMenuRef}
                            id={`school-card-actions-${s.school.id}`}
                            role="menu"
                            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-44 rounded-xl border border-roman-gold/25 bg-stone-950/95 shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-md overflow-hidden origin-top-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-3 py-2 border-b border-stone-800/80 text-[11px] uppercase tracking-wider text-stone-500 text-left">
                              School Actions
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenEditSchool(s.school);
                              }}
                              role="menuitem"
                              className="w-full text-left px-3 py-2.5 text-stone-200 text-sm hover:bg-stone-800/80 transition-colors flex items-center justify-between"
                            >
                              <span>Edit</span>
                              <span className="text-stone-500">✎</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenDeleteSchoolModal(s.school);
                              }}
                              role="menuitem"
                              className="w-full text-left px-3 py-2.5 text-red-400 text-sm hover:bg-red-500/10 transition-colors flex items-center justify-between"
                            >
                              <span>Delete</span>
                              <span className="text-stone-500">✕</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wider text-stone-500">Access Code</p>
                        <button
                          type="button"
                          onClick={() => void handleCopyAccessCode(s.school.id, s.school.accessCode)}
                          className="mt-1 font-mono text-base tracking-wider text-stone-200 hover:text-roman-gold transition-colors"
                          title="Click to copy access code"
                        >
                          {s.school.accessCode}
                        </button>
                      </div>
                      <div className="rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wider text-stone-500">Days</p>
                        <p className="mt-1 text-base font-semibold text-roman-gold">{dayCount}/200</p>
                      </div>
                      <div className="rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wider text-stone-500">People</p>
                        <p className="mt-1 text-base text-stone-300">{s.teachers.length}T / {s.students.length}S</p>
                      </div>
                      <div className="rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wider text-stone-500">Miles</p>
                        <p className="mt-1 text-base font-semibold text-roman-gold">{s.totalMiles.toFixed(1)}</p>
                      </div>
                      <div className="rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wider text-stone-500">Classes</p>
                        <p className="mt-1 text-base text-stone-300">{s.classes.length}</p>
                      </div>
                      <div className="rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wider text-stone-500">Avg Miles</p>
                        <p className="mt-1 text-base text-stone-300">{s.avgMiles.toFixed(1)}</p>
                      </div>
                      <div className="rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2 sm:col-span-2">
                        <p className="text-[11px] uppercase tracking-wider text-stone-500">Completed</p>
                        <p className="mt-1 text-base text-stone-300">
                          <span className="font-semibold text-roman-gold">{s.completedStudents}</span>
                          <span className="text-stone-500"> / {s.students.length}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="hidden overflow-visible rounded-xl border border-stone-700/50 xl:block">
            <div className="overflow-x-auto">
            <table className="w-full min-w-336 table-fixed text-left">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
                <col className="w-[7%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[10%]" />
                <col className="w-[9%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
              </colgroup>
              <thead>
                <tr className="bg-stone-800/80 border-b border-stone-700/50">
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold">School</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold">Access Code</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold text-center">Days</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold text-center">Classes</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold text-center">Teachers</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold text-center">Students</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold text-center">Total Miles</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold text-center">Avg Miles</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold text-center">Completed</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchoolStats.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-stone-500 text-lg">
                      <p>{schoolStats.length === 0 ? "No schools found." : "No schools match your search."}</p>
                      {schoolStats.length === 0 && (
                        <button
                          type="button"
                          onClick={handleOpenAddSchool}
                          className="mt-5 px-5 py-3 rounded-lg bg-roman-gold/20 border border-roman-gold/50 text-roman-gold text-sm uppercase tracking-wider font-semibold hover:bg-roman-gold/30 transition-colors"
                        >
                          + Add School
                        </button>
                      )}
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
                        className="border-b border-stone-800/50 transition-colors hover:bg-stone-800/40"
                      >
                        <td className="px-6 py-6 font-medium text-stone-100 text-xl">
                          {s.school.name}
                          <p className="text-roman-gold/75 text-xs mt-1 uppercase tracking-wider font-semibold">
                            {s.school.schoolType ?? "School Type Not Set"}
                          </p>
                          {s.school.address && (
                            <p className="mt-1 max-w-full wrap-break-word text-stone-500 text-sm leading-snug">{s.school.address}</p>
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
                          <div className={`relative inline-flex ${openActionsForSchool === s.school.id ? "z-50" : "z-0"}`}>
                            <button
                              type="button"
                              onClick={(e) => toggleDesktopSchoolActions(e, s.school.id)}
                              className={`w-10 h-10 rounded-lg border text-xl leading-none transition-colors ${openActionsForSchool === s.school.id ? "border-roman-gold bg-roman-gold/15 text-roman-gold" : "border-roman-gold/40 text-roman-gold hover:bg-roman-gold/10"}`}
                              aria-label="Open school actions"
                              aria-haspopup="menu"
                              aria-expanded={openActionsForSchool === s.school.id}
                              aria-controls={`school-actions-${s.school.id}`}
                            >
                              ⋮
                            </button>
                            {openActionsForSchool === s.school.id && desktopSchoolActionsAnchor && (
                              <div
                                ref={actionsMenuRef}
                                id={`school-actions-${s.school.id}`}
                                role="menu"
                                className={`fixed z-[70] w-44 rounded-xl border border-roman-gold/25 bg-stone-950/95 shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-md overflow-hidden -translate-x-full ${desktopSchoolActionsAnchor.openUp ? "-translate-y-full origin-bottom-right" : "origin-top-right"}`}
                                style={{ top: `${desktopSchoolActionsAnchor.top}px`, left: `${desktopSchoolActionsAnchor.left}px` }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="px-3 py-2 border-b border-stone-800/80 text-[11px] uppercase tracking-wider text-stone-500 text-left">
                                  School Actions
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenEditSchool(s.school);
                                  }}
                                  role="menuitem"
                                  className="w-full text-left px-3 py-2.5 text-stone-200 text-sm hover:bg-stone-800/80 transition-colors flex items-center justify-between"
                                >
                                  <span>Edit</span>
                                  <span className="text-stone-500">✎</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenDeleteSchoolModal(s.school);
                                  }}
                                  role="menuitem"
                                  className="w-full text-left px-3 py-2.5 text-red-400 text-sm hover:bg-red-500/10 transition-colors flex items-center justify-between"
                                >
                                  <span>Delete</span>
                                  <span className="text-stone-500">✕</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add School Modal */}
      {showAddSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={handleCloseAddSchool} />
          <div className="relative bg-stone-900 border border-roman-gold/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="h-px w-full bg-linear-to-r from-transparent via-roman-gold/50 to-transparent" />
            <div className="px-8 py-8">
              <h2 className="text-roman-gold font-serif text-2xl font-bold mb-6 tracking-wide">{isEditingSchool ? "Edit School" : "Add School"}</h2>
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
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">School Type *</label>
                  <select
                    value={schoolType}
                    onChange={(e) => setSchoolType(e.target.value as SchoolType)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  >
                    <option value="Primary School">Primary School</option>
                    <option value="Secondary School">Secondary School</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Address (optional)</label>
                  <input
                    type="text"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    maxLength={MAX_SCHOOL_ADDRESS_LENGTH}
                    placeholder="e.g. 123 Main St, Dublin"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  />
                  <p className="mt-1 text-right text-[11px] text-stone-500">
                    {schoolAddress.length}/{MAX_SCHOOL_ADDRESS_LENGTH}
                  </p>
                </div>
                {schoolError && <p className="text-red-400 text-sm">{schoolError}</p>}
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleCloseAddSchool}
                  className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSchool}
                  disabled={schoolSaving}
                  className="flex-1 py-3 rounded-xl bg-roman-gold text-stone-950 font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {schoolSaving ? (isEditingSchool ? "Updating..." : "Adding...") : (isEditingSchool ? "Update School" : "Add School")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete School Modal */}
      {showDeleteSchoolModal && schoolToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={handleCloseDeleteSchoolModal} />
          <div className="relative bg-stone-900 border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="h-px w-full bg-linear-to-r from-transparent via-red-500/50 to-transparent" />
            <div className="px-8 py-8">
              <h2 className="text-red-400 font-serif text-2xl font-bold mb-4 tracking-wide">Delete School?</h2>
              <p className="text-stone-300 mb-3">
                You are about to permanently delete <span className="font-semibold text-stone-100">{schoolToDelete.name}</span>.
              </p>
              <p className="text-stone-400 text-sm leading-relaxed mb-6">
                This will also remove all linked classes, users, student results, and deletion requests for this school. This action cannot be undone.
              </p>

              <div className="mb-6">
                <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Type DELETE to confirm</label>
                <input
                  type="text"
                  value={deleteSchoolConfirmText}
                  onChange={(e) => setDeleteSchoolConfirmText(e.target.value.toUpperCase())}
                  placeholder="DELETE"
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-red-400/70 transition-colors"
                />
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleCloseDeleteSchoolModal}
                  className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSchool}
                  disabled={schoolDeleting || deleteSchoolConfirmText.trim() !== "DELETE"}
                  className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 font-semibold hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {schoolDeleting ? "Deleting..." : "Delete School"}
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
                      {selectedStudentYearOptions.map((year) => (
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
