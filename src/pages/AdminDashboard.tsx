import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
  updateSchoolLogo,
  deleteSchool,
  createClass,
  createUserDoc,
  addStudentToClass,
  recordStudentAuthorityConsent,
  ensureSchoolAccessCodeIndex,
  updateStudentProfileAndClass,
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
  const [schoolSort, setSchoolSort] = useState<"miles" | "name" | "nameDesc" | "students" | "completed" | "daysRemaining">("miles");
  const [copiedSchoolId, setCopiedSchoolId] = useState<string | null>(null);

  // Tabs & Pagination
  const [activeTab, setActiveTab] = useState<"schools" | "requests">("schools");
  const [schoolsPage, setSchoolsPage] = useState(1);
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);
  const SCHOOLS_PER_PAGE = 10;

  // Add School modal
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState<SchoolType>("Primary School");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolSaving, setSchoolSaving] = useState(false);
  const [schoolError, setSchoolError] = useState("");
  const [schoolLogoFile, setSchoolLogoFile] = useState<File | null>(null);
  const [schoolLogoPreview, setSchoolLogoPreview] = useState<string | null>(null);
  const [isEditingSchool, setIsEditingSchool] = useState(false);
  const [schoolToEdit, setSchoolToEdit] = useState<School | null>(null);
  const schoolLogoInputRef = useRef<HTMLInputElement>(null);

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
  const [studentSchoolId, setStudentSchoolId] = useState("");
  const [studentClassId, setStudentClassId] = useState("");
  const [studentSaving, setStudentSaving] = useState(false);
  const [studentError, setStudentError] = useState("");

  // Edit Student modal
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentRomanNickname, setEditStudentRomanNickname] = useState("");
  const [editStudentSchoolId, setEditStudentSchoolId] = useState("");
  const [editStudentClassId, setEditStudentClassId] = useState("");
  const [editStudentSaving, setEditStudentSaving] = useState(false);
  const [editStudentError, setEditStudentError] = useState("");
  const [actionToast, setActionToast] = useState<{ title: string; description?: string; tone: "success" | "error" } | null>(null);
  const [deletionRequests, setDeletionRequests] = useState<StudentDeletionRequest[]>([]);
  const [deletionRequestActionId, setDeletionRequestActionId] = useState<string | null>(null);
  const [deletionRequestError, setDeletionRequestError] = useState("");
  const [deletionConfirm, setDeletionConfirm] = useState<{ requestId: string; studentName: string; action: "approve" | "reject" } | null>(null);

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
          const completedStudents = milesArr.filter((m) => m >= TOTAL_MILES).length;
          return { school, classes, teachers, students, totalMiles, completedStudents };
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
    if (!actionToast) return;
    const toastTimer = window.setTimeout(() => {
      setActionToast(null);
    }, 2200);
    return () => window.clearTimeout(toastTimer);
  }, [actionToast]);

  useEffect(() => {
    return () => {
      if (schoolLogoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(schoolLogoPreview);
      }
    };
  }, [schoolLogoPreview]);

  useEffect(() => {
    if (!openActionsForSchool) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!actionsMenuRef.current?.contains(event.target as Node)) {
        setOpenActionsForSchool(null);
        setDesktopSchoolActionsAnchor(null);
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
    const menuWidth = 176;
    const menuEstimatedHeight = 180;
    const shouldOpenUp = window.innerHeight - triggerRect.bottom < menuEstimatedHeight && triggerRect.top > menuEstimatedHeight;

    setDesktopSchoolActionsAnchor({
      top: shouldOpenUp ? triggerRect.top - 8 : triggerRect.bottom + 8,
      left: Math.max(12, triggerRect.right - menuWidth),
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
        if (schoolLogoFile) {
          await updateSchoolLogo(schoolToEdit.id, schoolLogoFile);
        }
      } else {
        const createdSchool = await createSchool(
          schoolName.trim(),
          schoolType,
          normalizedAddress || undefined
        );
        if (schoolLogoFile) {
          await updateSchoolLogo(createdSchool.id, schoolLogoFile);
        }
      }
      setSchoolName("");
      setSchoolType("Primary School");
      setSchoolAddress("");
      setSchoolLogoFile(null);
      setSchoolLogoPreview(null);
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
    setSchoolLogoFile(null);
    setSchoolLogoPreview(null);
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
    setSchoolLogoFile(null);
    setSchoolLogoPreview(school.logoUrl || null);
    setSchoolToEdit(school);
    setIsEditingSchool(true);
    setShowAddSchool(true);
    setSchoolError("");
    setOpenActionsForSchool(null);
  }

  function handleSchoolLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSchoolLogoFile(null);
      setSchoolLogoPreview(isEditingSchool ? schoolToEdit?.logoUrl || null : null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSchoolError("School logo must be an image file.");
      event.target.value = "";
      return;
    }

    setSchoolError("");
    if (schoolLogoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(schoolLogoPreview);
    }
    setSchoolLogoFile(file);
    setSchoolLogoPreview(URL.createObjectURL(file));
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
    const deletedSchoolName = schoolToDelete.name;
    setSchoolDeleting(true);
    try {
      await deleteSchool(schoolToDelete.id);
      handleCloseDeleteSchoolModal();
      await loadData();
      setActionToast({
        title: `${deletedSchoolName} deleted.`,
        description: "Removed the school plus linked classes, users, results, and deletion requests.",
        tone: "success",
      });
    } catch {
      setActionToast({
        title: "Failed to delete school.",
        description: "Try again in a moment.",
        tone: "error",
      });
    } finally {
      setSchoolDeleting(false);
    }
  }

  function resetStudentFormState() {
    setStudentName("");
    setStudentRomanNickname("");
    setStudentSchoolId("");
    setStudentClassId("");
    setStudentError("");
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
        createdAt: Date.now(),
      };
      await createUserDoc(newUser);
      await addStudentToClass(classId, newUid);
      const createdStudentName = studentName.trim();
      resetStudentFormState();
      setShowAddStudent(false);
      await loadData();
      setActionToast({ title: `${createdStudentName} added successfully.`, tone: "success" });
    } catch {
      setStudentError("Failed to add student. Try again.");
    } finally {
      setStudentSaving(false);
    }
  }

  function handleOpenEditStudent(student: AppUser) {
    const studentClass = schoolStats
      .flatMap(s => s.classes)
      .find(c => c.studentIds.includes(student.uid));
    
    setEditingStudentId(student.uid);
    setEditStudentName(student.displayName);
    setEditStudentRomanNickname(student.romanNickname || "");
    setEditStudentSchoolId(student.schoolId || "");
    setEditStudentClassId(studentClass?.id || "");
    setEditStudentError("");
    setShowEditStudent(true);
  }

  function handleCloseEditStudent() {
    if (editStudentSaving) return;
    setShowEditStudent(false);
    setEditingStudentId(null);
    setEditStudentName("");
    setEditStudentRomanNickname("");
    setEditStudentSchoolId("");
    setEditStudentClassId("");
    setEditStudentError("");
  }

  async function handleEditStudent() {
    if (!editStudentName.trim()) { setEditStudentError("Name is required."); return; }
    if (!editStudentSchoolId) { setEditStudentError("Select a school."); return; }
    if (!editStudentClassId) { setEditStudentError("Select a year."); return; }
    if (!editingStudentId) return;

    const editingStudent = allUsers.find(u => u.uid === editingStudentId);
    if (!editingStudent) { setEditStudentError("Student not found."); return; }

    setEditStudentSaving(true);
    setEditStudentError("");
    try {
      await updateStudentProfileAndClass({
        studentId: editingStudentId,
        displayName: editStudentName.trim(),
        romanNickname: editStudentRomanNickname.trim() || undefined,
        currentClassId: editingStudent.classId || "",
        targetClassId: editStudentClassId,
      });
      const updatedStudentName = editStudentName.trim();
      handleCloseEditStudent();
      await loadData();
      setActionToast({ title: `${updatedStudentName} updated successfully.`, tone: "success" });
    } catch {
      setEditStudentError("Failed to update student. Try again.");
    } finally {
      setEditStudentSaving(false);
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

  function promptApproveDeletion(requestId: string, studentName: string) {
    setDeletionConfirm({ requestId, studentName, action: "approve" });
  }

  function promptRejectDeletion(requestId: string, studentName: string) {
    setDeletionConfirm({ requestId, studentName, action: "reject" });
  }

  async function handleConfirmDeletionAction() {
    if (!deletionConfirm) return;
    const { requestId, action } = deletionConfirm;
    setDeletionConfirm(null);
    if (action === "approve") {
      await handleApproveDeletionRequest(requestId);
    } else {
      await handleRejectDeletionRequest(requestId);
    }
  }

  async function handleApproveDeletionRequest(requestId: string) {
    setDeletionRequestActionId(requestId);
    setDeletionRequestError("");
    try {
      await approveStudentDeletionRequest(requestId, appUser?.uid);
      setActionToast({ title: "Deletion request approved.", tone: "success" });
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
      setActionToast({ title: "Deletion request declined.", tone: "success" });
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

  function handleOpenAddStudentForSchool(schoolId: string) {
    setStudentSchoolId(schoolId);
    handleOpenAddStudent();
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
        (s.school.address ?? "").toLowerCase().includes(query) ||
        s.school.accessCode.toLowerCase().includes(query)
      );
    });

    const sorted = [...filtered];
    if (schoolSort === "name") {
      sorted.sort((a, b) => a.school.name.localeCompare(b.school.name));
    } else if (schoolSort === "nameDesc") {
      sorted.sort((a, b) => b.school.name.localeCompare(a.school.name));
    } else if (schoolSort === "students") {
      sorted.sort((a, b) => b.students.length - a.students.length);
    } else if (schoolSort === "completed") {
      sorted.sort((a, b) => b.completedStudents - a.completedStudents);
    } else if (schoolSort === "daysRemaining") {
      sorted.sort((a, b) => {
        const teacherStartCandidatesA = a.teachers
          .map((t) => t.createdAt)
          .filter((ts) => Number.isFinite(ts));
        const firstTeacherStartA = teacherStartCandidatesA.length > 0
          ? Math.min(...teacherStartCandidatesA)
          : undefined;
        const campaignStartA = a.school.campaignStartAt ?? firstTeacherStartA ?? a.school.createdAt;
        const daysRemainingA = Math.max(0, 200 - Math.min(200, calculateBusinessDays(campaignStartA)));

        const teacherStartCandidatesB = b.teachers
          .map((t) => t.createdAt)
          .filter((ts) => Number.isFinite(ts));
        const firstTeacherStartB = teacherStartCandidatesB.length > 0
          ? Math.min(...teacherStartCandidatesB)
          : undefined;
        const campaignStartB = b.school.campaignStartAt ?? firstTeacherStartB ?? b.school.createdAt;
        const daysRemainingB = Math.max(0, 200 - Math.min(200, calculateBusinessDays(campaignStartB)));

        return daysRemainingA - daysRemainingB;
      });
    } else {
      sorted.sort((a, b) => b.totalMiles - a.totalMiles);
    }

    return sorted;
  }, [schoolStats, schoolSearch, schoolSort]);

  useEffect(() => {
    setSchoolsPage(1);
  }, [schoolSearch, schoolSort]);

  const paginatedSchools = useMemo(() => {
    const start = (schoolsPage - 1) * SCHOOLS_PER_PAGE;
    return filteredSchoolStats.slice(start, start + SCHOOLS_PER_PAGE);
  }, [filteredSchoolStats, schoolsPage]);

  const totalPages = Math.ceil(filteredSchoolStats.length / SCHOOLS_PER_PAGE);

  if (loading) return <FullPageLoader message="Loading admin data..." />;

  if (loadError) {
    return (
      <div
        className="h-screen text-stone-100 flex flex-col overflow-hidden bg-stone-900"
        style={{
          backgroundImage: "linear-gradient(rgba(12, 10, 8, 0.5), rgba(12, 10, 8, 0.6)), url('/admin-page.png')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
      >
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
    <div
      className="h-screen text-stone-100 flex flex-col overflow-hidden bg-stone-900"
      style={{
        backgroundImage: "linear-gradient(rgba(12, 10, 8, 0.5), rgba(12, 10, 8, 0.6)), url('/admin-page.png')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Navbar />

      {actionToast && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[min(92vw,34rem)] -translate-x-1/2 pointer-events-none">
          <div className={`flex items-start gap-3 rounded-xl border bg-stone-900/95 px-5 py-4 shadow-2xl backdrop-blur-md ${actionToast.tone === "success" ? "border-emerald-500/30" : "border-red-500/30"}`}>
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${actionToast.tone === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
              {actionToast.tone === "success" ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3Z" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-stone-100 font-medium tracking-wide">{actionToast.title}</p>
              {actionToast.description && (
                <p className="mt-1 max-w-sm text-sm leading-relaxed text-stone-400">{actionToast.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 w-full px-4 py-8 overflow-y-auto overflow-x-hidden sm:px-6 lg:px-10 xl:px-12 xl:py-14">
        {/* Global stat cards */}
        <div className="grid grid-cols-1 gap-4 mb-10 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Schools",
              value: totalSchools,
              iconTone: "from-amber-500/20 via-yellow-500/10 to-amber-600/5 text-roman-gold border-roman-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.15)]",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" d="M3 21h18M3 10h18M5 6l7-3 7 3v4H5V6zM4 10v11m16-11v11M8 14v4m4-4v4m4-4v4" />
                </svg>
              ),
            },
            {
              label: "Teachers",
              value: totalTeachers,
              iconTone: "from-purple-500/20 via-fuchsia-500/10 to-purple-600/5 text-purple-400 border-purple-400/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              ),
            },
            {
              label: "Students",
              value: totalStudents,
              iconTone: "from-red-500/20 via-rose-500/10 to-red-600/5 text-red-400 border-red-400/30 shadow-[0_0_15px_rgba(248,113,113,0.15)]",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" d="M12 21s-5-2.5-5-7.5V6.2L12 4l5 2.2v7.3c0 5-5 7.5-5 7.5Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12 1.6 1.6 3.4-3.6" />
                </svg>
              ),
            },
            {
              label: "Total Miles",
              value: totalMilesAll.toFixed(1),
              iconTone: "from-emerald-500/20 via-teal-500/10 to-emerald-600/5 text-emerald-400 border-emerald-400/30 shadow-[0_0_15px_rgba(52,211,153,0.15)]",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.715V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                </svg>
              ),
            },
          ].map(({ label, value, iconTone, icon }) => (
            <div
              key={label}
              className="roman-card rounded-xl p-5 flex items-center justify-between group transition-colors hover:border-roman-gold/40"
            >
              <div>
                <p className="text-stone-400 text-[11px] uppercase tracking-[0.2em] font-semibold mb-1.5">{label}</p>
                <p className="text-roman-gold font-serif text-3xl font-bold leading-none tracking-tight drop-shadow-sm">{value}</p>
              </div>
              <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-stone-950/80 bg-linear-to-br ${iconTone} group-hover:scale-110 group-hover:-translate-y-0.5 transition-all duration-300`}>
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-linear-to-br from-white/5 via-transparent to-black/30" />
                {icon}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-stone-800/80 mb-8 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab("schools")}
            className={`px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-colors z-10 border-b-2 ${
              activeTab === "schools"
                ? "border-roman-gold text-roman-gold"
                : "border-transparent text-stone-400 hover:text-stone-300"
            }`}
          >
            Schools ({totalSchools})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-all duration-300 z-10 border-b-2 flex items-center gap-2 ${
              activeTab === "requests"
                ? "border-roman-gold text-roman-gold"
                : "border-transparent text-stone-400 hover:text-stone-300"
            }`}
          >
            <span>Deletion Requests</span>
            {totalPendingDeletionRequests > 0 ? (
              <span className="flex items-center justify-center bg-red-600 text-white min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold shadow-[0_0_12px_rgba(220,38,38,0.9)] animate-pulse">
                {totalPendingDeletionRequests}
              </span>
            ) : (
              <span>({totalPendingDeletionRequests})</span>
            )}
          </button>
        </div>

        {/* Deletion requests Tab */}
        {activeTab === "requests" && (
          <div className="mb-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {deletionRequestsWithContext.length > 0 ? (
              <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-roman-gold/70 text-base uppercase tracking-[0.2em] font-semibold flex items-center gap-2">
                Deletion Requests
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              </h2>
              <span className="text-red-400 font-bold text-sm uppercase tracking-wider bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.15)]">
                Pending: <span className="text-red-300">{totalPendingDeletionRequests}</span>
              </span>
            </div>

            {deletionRequestError && (
              <p className="text-red-300 text-sm mb-3">{deletionRequestError}</p>
            )}

            <div className="rounded-xl border border-stone-700/50 bg-stone-950/80 backdrop-blur-xl overflow-hidden shadow-xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-800/80 border-b border-stone-600/50">
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
                            onClick={() => promptApproveDeletion(request.id, request.studentName ?? "this student")}
                            disabled={deletionRequestActionId === request.id}
                            className="px-3 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs uppercase tracking-wider font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => promptRejectDeletion(request.id, request.studentName ?? "this student")}
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
            </>
            ) : (
              <div className="rounded-xl border border-stone-600/50 bg-stone-800/55 px-6 py-12 text-center text-stone-400 text-lg">
                <p>No pending deletion requests.</p>
              </div>
            )}
          </div>
        )}

        {/* Schools table Tab */}
        {activeTab === "schools" && (
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-4">
            <h2 className="text-roman-gold/70 text-base uppercase tracking-[0.2em] font-semibold mb-4">
              Schools
            </h2>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:min-w-[24rem] sm:flex-1 sm:max-w-xl xl:max-w-2xl">
                  <input
                    type="text"
                    value={schoolSearch}
                    onChange={(e) => setSchoolSearch(e.target.value)}
                    placeholder="Search name, address, or access code..."
                    className="w-full bg-stone-700/85 border border-stone-600 rounded-lg px-5 py-3.5 pr-12 text-base text-stone-100 placeholder-stone-400 focus:outline-none focus:border-roman-gold/70 transition-colors"
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
                  onChange={(e) => setSchoolSort(e.target.value as any)}
                  className="bg-stone-700/85 border border-stone-600 rounded-lg px-4 py-3.5 text-base text-stone-100 focus:outline-none focus:border-roman-gold/70 transition-colors"
                >
                  <option value="miles">Sort: Total Miles (High to Low)</option>
                  <option value="daysRemaining">Sort: Days Remaining (Low to High)</option>
                  <option value="students">Sort: Students (High to Low)</option>
                  <option value="completed">Sort: Completed (High to Low)</option>
                  <option value="name">Sort: School Name (A-Z)</option>
                  <option value="nameDesc">Sort: School Name (Z-A)</option>
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
            {paginatedSchools.length === 0 ? (
              <div className="rounded-xl border border-stone-600/50 bg-stone-800/55 px-6 py-12 text-center text-stone-400 text-lg">
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
              paginatedSchools.map((s) => {
                const teacherStartCandidates = s.teachers
                  .map((t) => t.createdAt)
                  .filter((ts) => Number.isFinite(ts));
                const firstTeacherStart = teacherStartCandidates.length > 0
                  ? Math.min(...teacherStartCandidates)
                  : undefined;
                const campaignStart = s.school.campaignStartAt ?? firstTeacherStart ?? s.school.createdAt;
                const dayCount = Math.min(200, calculateBusinessDays(campaignStart));
                const isExpanded = expandedSchoolId === s.school.id;

                return (
                  <div key={s.school.id} className="rounded-xl border border-stone-600/50 bg-stone-800/55 p-4 shadow-[0_8px_28px_rgba(0,0,0,0.22)] sm:p-5">
                    <div 
                      className="flex items-start justify-between gap-3 cursor-pointer"
                      onClick={() => setExpandedSchoolId(current => current === s.school.id ? null : s.school.id)}
                    >
                      <div className="min-w-0">
                        <h3 className="wrap-break-word text-xl font-semibold text-stone-100">
                          {s.school.name}
                        </h3>
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
                      <div className="rounded-lg border border-stone-800 bg-stone-950/50 px-3 py-2 sm:col-span-2">
                        <p className="text-[11px] uppercase tracking-wider text-stone-500">Completed</p>
                        <p className="mt-1 text-base text-stone-300">
                          <span className="font-semibold text-roman-gold">{s.completedStudents}</span>
                          <span className="text-stone-500"> / {s.students.length}</span>
                        </p>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-6 border-t border-stone-800 pt-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h4 className="text-roman-gold text-sm font-semibold">Students ({s.students.length})</h4>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddStudentForSchool(s.school.id);
                            }}
                            className="rounded-lg border border-roman-gold/40 bg-roman-gold/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-roman-gold transition-colors hover:bg-roman-gold/20"
                          >
                            + Add Student
                          </button>
                        </div>
                        {s.students.length === 0 ? (
                          <p className="text-stone-500 text-sm">No students added yet.</p>
                        ) : (
                          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {s.students.map((student) => {
                              const studentMiles = allResults
                                .filter(r => r.studentId === student.uid)
                                .reduce((sum, r) => sum + r.distanceMiles, 0);
                              const isPendingDeletion = deletionRequests.some(req => req.studentId === student.uid && req.status === "pending");
                              return (
                                <div key={student.uid} className={`flex items-center justify-between border rounded-lg p-3 group transition-colors relative overflow-hidden ${isPendingDeletion ? "bg-red-950/20 border-red-500/30 hover:border-red-400" : "bg-stone-900 border-stone-800 hover:border-roman-gold/30"}`}>
                                  <div className="flex-1 min-w-0 pl-1">
                                    <div className="flex items-center gap-2">
                                      <p className={`font-medium text-sm truncate ${isPendingDeletion ? "text-stone-300" : "text-stone-200"}`}>{student.displayName}</p>
                                      {isPendingDeletion && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 flex-shrink-0" title="Deletion requested">
                                          Deleting
                                        </span>
                                      )}
                                    </div>
                                    {student.romanNickname && <p className="text-xs text-roman-gold/80 truncate">{student.romanNickname}</p>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditStudent(student)}
                                      className="text-roman-gold hover:text-roman-gold/80 transition-colors opacity-0 group-hover:opacity-100"
                                      title="Edit student"
                                      aria-label="Edit student"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                    </button>
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-roman-gold">{studentMiles.toFixed(1)} <span className="text-xs text-stone-500 font-normal">mi</span></p>
                                      <p className="text-xs text-stone-500">{studentMiles >= TOTAL_MILES ? "Completed" : "In Progress"}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="hidden overflow-visible rounded-xl border border-stone-700/50 bg-stone-950/80 backdrop-blur-xl shadow-xl xl:block">
            <div className="overflow-x-auto">
            <table className="w-full min-w-336 table-fixed text-left">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[10%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
              </colgroup>
              <thead>
                <tr className="bg-stone-800/80 border-b border-stone-600/50">
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold">School</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold">Access Code</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold text-center">Days</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold text-center">Teachers</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold text-center">Students</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold text-center">Total Miles</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold text-center">Completed</th>
                  <th className="px-6 py-5 text-lg uppercase tracking-wider text-stone-400 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchoolStats.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-stone-500 text-lg">
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
                  paginatedSchools.map((s) => {
                    const teacherStartCandidates = s.teachers
                      .map((t) => t.createdAt)
                      .filter((ts) => Number.isFinite(ts));
                    const firstTeacherStart = teacherStartCandidates.length > 0
                      ? Math.min(...teacherStartCandidates)
                      : undefined;
                    const campaignStart = s.school.campaignStartAt ?? firstTeacherStart ?? s.school.createdAt;
                    const dayCount = Math.min(200, calculateBusinessDays(campaignStart));
                    const isExpanded = expandedSchoolId === s.school.id;
                    return (
                      <React.Fragment key={s.school.id}>
                      <tr
                        onClick={() => setExpandedSchoolId(current => current === s.school.id ? null : s.school.id)}
                        className="border-b border-stone-800/50 transition-colors hover:bg-stone-800/40 cursor-pointer"
                      >
                        <td className="px-6 py-6 font-medium text-stone-100 text-xl">
                          <div className="flex items-center gap-3">
                            <div>
                              <div>{s.school.name}</div>
                              <p className="text-roman-gold/75 text-xs mt-1 uppercase tracking-wider font-semibold">
                                {s.school.schoolType ?? "School Type Not Set"}
                              </p>
                              {s.school.address && (
                                <p className="mt-1 max-w-full wrap-break-word text-stone-500 text-sm leading-snug">{s.school.address}</p>
                              )}
                            </div>
                          </div>
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
                        <td className="px-6 py-6 text-stone-300 text-lg text-center">{s.teachers.length}</td>
                        <td className="px-6 py-6 text-stone-300 text-lg text-center">{s.students.length}</td>
                        <td className="px-6 py-6 text-roman-gold font-bold text-lg text-center">{s.totalMiles.toFixed(1)}</td>
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
                            {openActionsForSchool === s.school.id && desktopSchoolActionsAnchor && createPortal(
                              <div
                                ref={actionsMenuRef}
                                id={`school-actions-${s.school.id}`}
                                role="menu"
                                className={`fixed z-90 w-44 rounded-xl border border-roman-gold/25 bg-stone-950/95 shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-md overflow-hidden ${desktopSchoolActionsAnchor.openUp ? "-translate-y-full origin-bottom-right" : "origin-top-right"}`}
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
                              </div>,
                              document.body
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-stone-900/30">
                          <td colSpan={8} className="p-0 border-b border-stone-800/50">
                            <div className="py-6 px-10 border-t border-stone-800/30 shadow-inner">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-roman-gold text-lg font-semibold flex items-center gap-2">
                                  <span className="opacity-80">↳</span> Students ({s.students.length})
                                </h4>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAddStudentForSchool(s.school.id);
                                  }}
                                  className="rounded-lg border border-roman-gold/40 bg-roman-gold/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-roman-gold transition-colors hover:bg-roman-gold/20"
                                >
                                  + Add Student
                                </button>
                              </div>
                              {s.students.length === 0 ? (
                                <p className="text-stone-500 text-base italic">No students added yet.</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-max max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                  {s.students.map((student) => {
                                    const studentMiles = allResults
                                      .filter(r => r.studentId === student.uid)
                                      .reduce((sum, r) => sum + r.distanceMiles, 0);
                                    const pct = Math.min(100, (studentMiles / TOTAL_MILES) * 100);
                                    const isPendingDeletion = deletionRequests.some(req => req.studentId === student.uid && req.status === "pending");
                                    return (
                                      <div key={student.uid} className={`flex flex-col border rounded-xl p-4 shadow-sm transition-colors group relative overflow-hidden ${isPendingDeletion ? "bg-red-950/20 border-red-500/30 hover:border-red-400" : "bg-stone-800/50 border-stone-700/60 hover:border-roman-gold/30"}`}>
                                        <div className="flex items-start justify-between gap-2 pl-1">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <p className={`font-semibold text-base tracking-wide truncate ${isPendingDeletion ? "text-stone-300" : "text-stone-100"}`}>{student.displayName}</p>
                                              {isPendingDeletion && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 flex-shrink-0" title="Deletion requested">
                                                  Deleting
                                                </span>
                                              )}
                                            </div>
                                            {student.romanNickname && <p className="text-sm text-roman-gold/70 mt-0.5 italic truncate">{student.romanNickname}</p>}
                                          </div>
                                          <div className="flex flex-col items-end gap-2">
                                            <button
                                              type="button"
                                              onClick={() => handleOpenEditStudent(student)}
                                              className="text-roman-gold hover:text-roman-gold/80 transition-colors opacity-0 group-hover:opacity-100"
                                              title="Edit student"
                                              aria-label="Edit student"
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                              </svg>
                                            </button>
                                            <div className="text-right">
                                              <p className="text-base font-bold text-roman-gold">{studentMiles.toFixed(1)} <span className="text-xs text-stone-500 font-normal">mi</span></p>
                                              <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${studentMiles >= TOTAL_MILES ? "text-green-500" : "text-stone-500"}`}>
                                                {studentMiles >= TOTAL_MILES ? "Completed" : "In Progress"}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="mt-4 w-full bg-stone-800/60 rounded-full h-1.5 overflow-hidden">
                                          <div 
                                            className={`h-full rounded-full transition-all duration-500 ${studentMiles >= TOTAL_MILES ? "bg-green-500" : "bg-roman-gold"}`}
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 border-t border-stone-800 pt-6">
                <span className="text-stone-400 text-sm">
                  Showing <span className="font-semibold text-stone-200">{(schoolsPage - 1) * SCHOOLS_PER_PAGE + 1}</span> to <span className="font-semibold text-stone-200">{Math.min(schoolsPage * SCHOOLS_PER_PAGE, filteredSchoolStats.length)}</span> of <span className="font-semibold text-stone-200">{filteredSchoolStats.length}</span> schools
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={schoolsPage === 1}
                    onClick={() => setSchoolsPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 rounded-lg border border-stone-700 bg-stone-800/50 text-stone-300 font-medium hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    disabled={schoolsPage === totalPages}
                    onClick={() => setSchoolsPage(p => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 rounded-lg border border-stone-700 bg-stone-800/50 text-stone-300 font-medium hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        )}
      </div>

      {/* Add School Modal */}
      {showAddSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={handleCloseAddSchool} />
          <div className="relative bg-stone-900/90 backdrop-blur-xl border border-roman-gold/20 rounded-3xl w-full max-w-lg shadow-[0_8px_60px_rgba(0,0,0,0.7)] overflow-hidden animate-[addStudentModalZoomIn_180ms_cubic-bezier(0.2,0.8,0.2,1)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-roman-gold/10 blur-[80px] rounded-full pointer-events-none"></div>
            <div className="px-8 py-10 relative">
              <h2 className="text-roman-gold font-serif text-3xl font-bold mb-8 tracking-wide text-center drop-shadow-[0_2px_8px_rgba(235,191,90,0.3)]">
                {isEditingSchool ? "Edit School" : "Add School"}
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">School Name *</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. St. Mary's Primary"
                    className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">School Type *</label>
                  <select
                    value={schoolType}
                    onChange={(e) => setSchoolType(e.target.value as SchoolType)}
                    className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner"
                  >
                    <option value="Primary School">Primary School</option>
                    <option value="Secondary School">Secondary School</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">Address (optional)</label>
                  <input
                    type="text"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    maxLength={MAX_SCHOOL_ADDRESS_LENGTH}
                    placeholder="e.g. 123 Main St, Dublin"
                    className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner"
                  />
                  <p className="mt-1.5 text-right text-[11px] text-stone-500 font-medium pr-1">
                    {schoolAddress.length}/{MAX_SCHOOL_ADDRESS_LENGTH}
                  </p>
                </div>
                <div>
                  <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-3 pl-1">School Logo (optional)</label>
                  <div className="flex items-center gap-4 rounded-xl border border-stone-700/80 bg-stone-800/40 px-4 py-4 shadow-inner transition-colors hover:border-roman-gold/30">
                    <button
                      type="button"
                      onClick={() => schoolLogoInputRef.current?.click()}
                      className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-roman-gold/40 bg-stone-900/80 transition-all hover:border-roman-gold hover:shadow-[0_0_15px_rgba(235,191,90,0.15)] group"
                    >
                      {schoolLogoPreview ? (
                        <img src={schoolLogoPreview} alt="School logo preview" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      ) : (
                        <img src="/warriorschool.png" alt="Default school logo" className="h-full w-full object-cover opacity-40 transition-opacity group-hover:opacity-70" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-100 truncate">
                        {schoolLogoFile?.name || (schoolLogoPreview ? "Current school logo" : "Upload a school crest or logo")}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-stone-400 max-w-[90%]">
                        PNG, JPG, or WebP all work. The image will appear in the navbar for this school.
                      </p>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => schoolLogoInputRef.current?.click()}
                          className="rounded-lg border border-roman-gold/35 bg-roman-gold/10 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-roman-gold transition-colors hover:bg-roman-gold/20"
                        >
                          {schoolLogoPreview ? "Change Logo" : "Choose Logo"}
                        </button>
                        {schoolLogoPreview && (
                          <button
                            type="button"
                            onClick={() => {
                              if (schoolLogoPreview.startsWith("blob:")) {
                                URL.revokeObjectURL(schoolLogoPreview);
                              }
                              setSchoolLogoFile(null);
                              setSchoolLogoPreview(isEditingSchool ? schoolToEdit?.logoUrl || null : null);
                              if (schoolLogoInputRef.current) {
                                schoolLogoInputRef.current.value = "";
                              }
                            }}
                            className="rounded-lg border border-stone-600 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-stone-300 transition-colors hover:border-stone-500 hover:text-stone-100"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      ref={schoolLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleSchoolLogoChange}
                    />
                  </div>
                </div>
                {schoolError && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                    <p className="text-red-400 text-sm font-medium text-center">{schoolError}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-10">
                <button
                  onClick={handleCloseAddSchool}
                  className="flex-1 py-3.5 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 hover:bg-stone-800/30 transition-all font-semibold tracking-wide"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSchool}
                  disabled={schoolSaving}
                  className="flex-1 py-3.5 rounded-xl bg-roman-gold text-stone-950 font-bold hover:brightness-110 shadow-[0_0_15px_rgba(235,191,90,0.3)] hover:shadow-[0_0_20px_rgba(235,191,90,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
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
          <div className="relative bg-stone-900/90 backdrop-blur-xl border border-roman-gold/20 rounded-3xl w-full max-w-lg shadow-[0_8px_60px_rgba(0,0,0,0.7)] overflow-hidden animate-[addStudentModalZoomIn_180ms_cubic-bezier(0.2,0.8,0.2,1)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-roman-gold/10 blur-[80px] rounded-full pointer-events-none"></div>
            <div className="px-8 py-10 relative">
              <h2 className="text-roman-gold font-serif text-3xl font-bold mb-8 tracking-wide text-center drop-shadow-[0_2px_8px_rgba(235,191,90,0.3)]">
                Add Student
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">Full Name *</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">Roman Nickname</label>
                  <input
                    type="text"
                    value={studentRomanNickname}
                    onChange={(e) => setStudentRomanNickname(e.target.value)}
                    placeholder="e.g. The Brave"
                    className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">School *</label>
                  <select
                    value={studentSchoolId}
                    onChange={(e) => { setStudentSchoolId(e.target.value); setStudentClassId(""); }}
                    className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner"
                  >
                    <option value="">Select school...</option>
                    {schoolStats.map((s) => (
                      <option key={s.school.id} value={s.school.id}>{s.school.name}</option>
                    ))}
                  </select>
                </div>
                {studentSchoolId && (
                  <div>
                    <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">Year *</label>
                    <select
                      value={studentClassId}
                      onChange={(e) => setStudentClassId(e.target.value)}
                      className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner"
                    >
                      <option value="">Select year...</option>
                      {selectedStudentYearOptions.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                )}
                {studentError && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                    <p className="text-red-400 text-sm font-medium text-center">{studentError}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-10">
                <button
                  onClick={() => { setShowAddStudent(false); setStudentError(""); setStudentRomanNickname(""); }}
                  className="flex-1 py-3.5 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 hover:bg-stone-800/30 transition-all font-semibold tracking-wide"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStudent}
                  disabled={studentSaving}
                  className="flex-1 py-3.5 rounded-xl bg-roman-gold text-stone-950 font-bold hover:brightness-110 shadow-[0_0_15px_rgba(235,191,90,0.3)] hover:shadow-[0_0_20px_rgba(235,191,90,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
                >
                  {studentSaving ? "Adding..." : "Add Student"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={handleCloseEditStudent} />
          <div className="relative bg-stone-900/90 backdrop-blur-xl border border-roman-gold/20 rounded-3xl w-full max-w-lg shadow-[0_8px_60px_rgba(0,0,0,0.7)] overflow-hidden animate-[addStudentModalZoomIn_180ms_cubic-bezier(0.2,0.8,0.2,1)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-roman-gold/10 blur-[80px] rounded-full pointer-events-none"></div>
            <div className="px-8 py-10 relative">
              <h2 className="text-roman-gold font-serif text-3xl font-bold mb-8 tracking-wide text-center drop-shadow-[0_2px_8px_rgba(235,191,90,0.3)]">
                Edit Student
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">Full Name *</label>
                  <input
                    type="text"
                    value={editStudentName}
                    onChange={(e) => setEditStudentName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">Roman Nickname</label>
                  <input
                    type="text"
                    value={editStudentRomanNickname}
                    onChange={(e) => setEditStudentRomanNickname(e.target.value)}
                    placeholder="e.g. The Brave"
                    className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">School *</label>
                  <select
                    value={editStudentSchoolId}
                    onChange={(e) => { setEditStudentSchoolId(e.target.value); setEditStudentClassId(""); }}
                    className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner"
                  >
                    <option value="">Select school...</option>
                    {schoolStats.map((s) => (
                      <option key={s.school.id} value={s.school.id}>{s.school.name}</option>
                    ))}
                  </select>
                </div>
                {editStudentSchoolId && (
                  <div>
                    <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">Year *</label>
                    <select
                      value={editStudentClassId}
                      onChange={(e) => setEditStudentClassId(e.target.value)}
                      className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner"
                    >
                      <option value="">Select year...</option>
                      {schoolStats.find(s => s.school.id === editStudentSchoolId)?.classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {editStudentError && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                    <p className="text-red-400 text-sm font-medium text-center">{editStudentError}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-10">
                <button
                  onClick={handleCloseEditStudent}
                  disabled={editStudentSaving}
                  className="flex-1 py-3.5 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 hover:bg-stone-800/30 transition-all font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditStudent}
                  disabled={editStudentSaving}
                  className="flex-1 py-3.5 rounded-xl bg-roman-gold text-stone-950 font-bold hover:brightness-110 shadow-[0_0_15px_rgba(235,191,90,0.3)] hover:shadow-[0_0_20px_rgba(235,191,90,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-wide"
                >
                  {editStudentSaving ? "Updating..." : "Update Student"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Request Confirm Modal */}
      {deletionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-stone-950/80 backdrop-blur-md transition-opacity"
            onClick={() => setDeletionConfirm(null)}
          />
          <div className={`relative w-full max-w-sm rounded-2xl overflow-hidden border shadow-[0_20px_50px_rgba(0,0,0,0.55)] animate-[addStudentModalZoomIn_180ms_cubic-bezier(0.16,1,0.3,1)] bg-stone-950 ${
            deletionConfirm.action === "approve" ? "border-red-500/30" : "border-stone-500/30"
          }`}>
            {deletionConfirm.action === "approve" ? (
              <div className="h-px w-full bg-linear-to-r from-transparent via-red-500/70 to-transparent" />
            ) : (
              <div className="h-px w-full bg-linear-to-r from-transparent via-stone-500/50 to-transparent" />
            )}
            <div className="p-8 flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 ${
                deletionConfirm.action === "approve"
                  ? "border border-red-500/30 bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                  : "border border-stone-500/30 bg-stone-500/10 text-stone-400 shadow-[0_0_15px_rgba(168,162,158,0.1)]"
              }`}>
                {deletionConfirm.action === "approve" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M10 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v3" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                    <line x1="15" y1="16" x2="21" y2="22" />
                    <line x1="21" y1="16" x2="15" y2="22" />
                  </svg>
                )}
              </div>

              <h2 className={`font-serif text-2xl font-bold mb-2 tracking-wide ${
                deletionConfirm.action === "approve" ? "text-red-400" : "text-stone-300"
              }`}>
                {deletionConfirm.action === "approve" ? "Confirm Deletion" : "Keep Student"}
              </h2>
              <div className="text-stone-400 text-sm leading-relaxed mb-6 px-2">
                {deletionConfirm.action === "approve" ? (
                  <>
                    <p className="mb-2">Are you sure you want to approve this request?</p>
                    <p>This will <span className="text-red-400 font-semibold px-1 py-0.5 rounded-sm bg-red-500/10">permanently delete</span></p>
                  </>
                ) : (
                  <p>You are about to decline the deletion request for</p>
                )}
                <p className="text-stone-200 font-bold text-base mt-2 truncate w-full px-2" title={deletionConfirm.studentName}>
                  {deletionConfirm.studentName}
                </p>
              </div>

              <div className="w-full flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeletionConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-800 text-stone-400 font-bold text-xs uppercase tracking-widest hover:text-stone-200 hover:bg-stone-800 active:scale-[0.97] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmDeletionAction()}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest active:scale-[0.97] transition-all flex items-center justify-center gap-2 ${
                    deletionConfirm.action === "approve"
                      ? "bg-red-600/90 text-white hover:bg-red-500 shadow-[0_4px_15px_rgba(239,68,68,0.25)]"
                      : "bg-stone-700/80 text-white hover:bg-stone-600 shadow-[0_4px_15px_rgba(0,0,0,0.3)]"
                  }`}
                >
                  {deletionConfirm.action === "approve" ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                      Delete
                    </>
                  ) : (
                     <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      Confirm
                    </>
                  )}
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
