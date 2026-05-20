import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { CampaignsTableSkeleton } from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import {
  getClassesByTeacher,
  getClassesBySchool,
  getUsersByIds,
  getResultsByClass,
  getSchoolById,
  createUserDoc,
  createClass,
  addStudentToClass,
  updateStudentProfileAndClass,
  createStudentDeletionRequestAndNotifyAdmins,
  getPendingStudentDeletionRequestIds,
  removePendingStudentDeletionRequest,
  updateUserPhoto,
  recordStudentAuthorityConsent,
} from "../lib/firestore";
import type { AppUser, Class, Result, SchoolType } from "../types";

const STUDENT_AUTHORITY_CONSENT_VERSION = "2026-05";

const CAMPAIGNS = [
  { number: 1,  name: "The Beginning",            minMiles: 0  },
  { number: 2,  name: "The Foundations",           minMiles: 1  },
  { number: 3,  name: "The Emperor",               minMiles: 3  },
  { number: 4,  name: "The Legion",                minMiles: 6  },
  { number: 5,  name: "The Empire",                minMiles: 10 },
  { number: 6,  name: "The Hero",                  minMiles: 15 },
  { number: 7,  name: "The Wall",                  minMiles: 21 },
  { number: 8,  name: "The Restorer of The World", minMiles: 28 },
  { number: 9,  name: "The Enemy",                 minMiles: 36 },
  { number: 10, name: "The Gladiator",             minMiles: 45 },
  { number: 11, name: "The Fall of Rome",          minMiles: 55 },
  { number: 12, name: "The Voice of Rome",         minMiles: 66 },
];

const PRIMARY_YEAR_OPTIONS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
const SECONDARY_YEAR_OPTIONS = ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"];
const ROMAN_NICKNAME_SUGGESTIONS = [
  "The Brave",
  "The Swift",
  "The Lion",
  "The Eagle",
  "The Valiant",
  "The Iron Shield",
  "The Falcon",
  "The Conqueror",
  "The Resolute",
  "The Storm",
  "The Guardian",
  "The Victor",
  "The Centurion",
  "The Tribune",
  "The Praetorian",
  "The Invictus",
  "The Imperator",
  "The Sentinel",
  "The Torchbearer",
  "The Pathfinder",
  "The Thunderbolt",
  "The Spear",
  "The Shieldbearer",
  "The Legionary",
  "The Standard Bearer",
  "The Vanguard",
  "The Unbroken",
  "The Fearless",
  "The Wolf",
  "The Phoenix",
  "The Titan",
  "The Colossus",
  "The Iron Will",
  "The Dawnbringer",
  "The Red Blade",
  "The Stone Wall",
  "The Golden Helm",
  "The War Drum",
  "The North Wind",
  "The South Wind",
  "The River Runner",
  "The Mountain Heart",
  "The Longstride",
  "The Trailblazer",
  "The Flame",
  "The Oak",
  "The Hammer",
  "The Banner",
  "The Triumph",
  "The Ever Ready",
  "The Light of Rome",
  "The First Lance",
];

const ITEMS_PER_PAGE = 10;

function getYearOptions(schoolType: SchoolType | null): string[] {
  return schoolType === "Primary School" ? PRIMARY_YEAR_OPTIONS : SECONDARY_YEAR_OPTIONS;
}

function getCampaignInfo(miles: number) {
  let current = CAMPAIGNS[0];
  for (const c of CAMPAIGNS) {
    if (miles >= c.minMiles) current = c;
    else break;
  }

  let completedCampaigns = 0;
  for (let index = 0; index < CAMPAIGNS.length; index += 1) {
    const completionMiles = index < CAMPAIGNS.length - 1 ? CAMPAIGNS[index + 1].minMiles : 78;
    if (miles >= completionMiles) {
      completedCampaigns += 1;
    }
  }

  const totalProgress = Math.min(100, Math.round((miles / 78) * 100));
  return {
    campaignNumber: current.number,
    campaignName: current.name,
    campaignProgress: totalProgress,
    completedCampaigns,
  };
}

interface StudentRow {
  uid: string;
  name: string;
  romanNickname?: string;
  hasPendingDeletionRequest: boolean;
  classId: string;
  age: number | null;
  photoUrl?: string;
  className: string;
  totalMiles: number;
  campaignNumber: number;
  campaignName: string;
  campaignProgress: number;
  completedCampaigns: number;
}

function sortStudentRows(rows: StudentRow[]): StudentRow[] {
  return [...rows].sort((a, b) => {
    if (a.hasPendingDeletionRequest !== b.hasPendingDeletionRequest) {
      return a.hasPendingDeletionRequest ? 1 : -1;
    }
    return b.campaignNumber - a.campaignNumber;
  });
}

export default function Campaigns() {
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthorityConsentModal, setShowAuthorityConsentModal] = useState(false);
  const [authorityConsentChecked, setAuthorityConsentChecked] = useState(false);
  const [authorityConsentSaving, setAuthorityConsentSaving] = useState(false);
  const [hasAuthorityConsent, setHasAuthorityConsent] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formRomanNickname, setFormRomanNickname] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");
  const [openActionsForStudent, setOpenActionsForStudent] = useState<string | null>(null);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<StudentRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editRomanNickname, setEditRomanNickname] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false);
  const [selectedStudentForDeleteRequest, setSelectedStudentForDeleteRequest] = useState<StudentRow | null>(null);
  const [showCancelDeleteRequestModal, setShowCancelDeleteRequestModal] = useState(false);
  const [selectedStudentForCancelDeleteRequest, setSelectedStudentForCancelDeleteRequest] = useState<StudentRow | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteRequestError, setDeleteRequestError] = useState("");
  const [submittingDeleteRequest, setSubmittingDeleteRequest] = useState(false);
  const [removingDeleteRequestForStudentId, setRemovingDeleteRequestForStudentId] = useState<string | null>(null);
  const [formPhoto, setFormPhoto] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const formPhotoRef = useRef<HTMLInputElement>(null);
  const editPhotoRef = useRef<HTMLInputElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const [className, setClassName] = useState("");
  const [classSaving, setClassSaving] = useState(false);
  const [classError, setClassError] = useState("");
  const [schoolType, setSchoolType] = useState<SchoolType | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const yearOptions = getYearOptions(schoolType);

  async function handleAddClass() {
    if (!appUser?.schoolId) {
      setClassError("You need a school before creating classes.");
      return;
    }
    if (!className.trim()) {
      setClassError("Class name is required.");
      return;
    }

    setClassSaving(true);
    setClassError("");
    try {
      await createClass(className.trim(), appUser.schoolId, appUser.uid);
      setClassName("");
      setShowAddClassModal(false);
      await loadData();
    } catch (err) {
      console.error(err);
      setClassError("Failed to create class. Try again.");
    } finally {
      setClassSaving(false);
    }
  }

  async function handleAddStudent() {
    if (!appUser || !formName.trim()) {
      setFormError("Please fill in name and select a year.");
      return;
    }
    if (!formClassId) {
      setFormError("Please select a year.");
      return;
    }
    setFormSaving(true);
    setFormError("");
    try {
      const schoolId = appUser.schoolId;
      if (!schoolId) {
        setFormError("You need a school before adding students.");
        return;
      }

      const selectedYear = formClassId;
      let classId = classes.find((c) => c.name === selectedYear)?.id;
      if (!classId) {
        classId = await createClass(selectedYear, schoolId, appUser.uid);
        setClasses((prev) => [
          ...prev,
          {
            id: classId!,
            name: selectedYear,
            schoolId,
            teacherId: appUser.uid,
            studentIds: [],
            createdAt: Date.now(),
          },
        ]);
      }

      if (!classId) {
        setFormError("Could not assign year. Please try again.");
        return;
      }

      const newUid = crypto.randomUUID();
      const trimmedRomanNickname = formRomanNickname.trim();
      const newUser: AppUser = {
        uid: newUid,
        email: "",
        displayName: formName.trim(),
        ...(trimmedRomanNickname ? { romanNickname: trimmedRomanNickname } : {}),
        studentDataConsentConfirmedAt: Date.now(),
        studentDataConsentConfirmedBy: appUser.uid,
        role: "student",
        schoolId: appUser.schoolId,
        classId,
        createdAt: Date.now(),
      };
      await createUserDoc(newUser);
      await addStudentToClass(classId, newUid);
      if (formPhoto) {
        await updateUserPhoto(newUid, formPhoto);
      }
      const studentDisplayName = formName.trim();
      setFormName("");
      setFormRomanNickname("");
      setFormClassId("");
      setFormPhoto(null);
      setFormPhotoPreview(null);
      setShowAddModal(false);
      setSuccessToast(`${studentDisplayName} added successfully.`);
      // Reload data
      loadData();
    } catch (err) {
      console.error(err);
      setFormError("Failed to add student. Try again.");
    } finally {
      setFormSaving(false);
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
      setShowAddModal(true);
    } catch (err) {
      console.error("Failed to save authority consent:", err);
      setFormError("Could not save authority consent. Please try again.");
    } finally {
      setAuthorityConsentSaving(false);
    }
  }

  function handleOpenAddStudent() {
    setFormError("");
    if (hasAuthorityConsent) {
      setShowAddModal(true);
      return;
    }
    setShowAuthorityConsentModal(true);
  }

  function handleSuggestRomanNickname() {
    const availableSuggestions = ROMAN_NICKNAME_SUGGESTIONS.filter(
      (nickname) => nickname.toLowerCase() !== formRomanNickname.trim().toLowerCase()
    );

    const source = availableSuggestions.length > 0 ? availableSuggestions : ROMAN_NICKNAME_SUGGESTIONS;
    const randomIndex = Math.floor(Math.random() * source.length);
    setFormRomanNickname(source[randomIndex]);
  }

  function handleTopAddStudentClick() {
    if (students.length >= 40) {
      setErrorToast("Max students reached (40).");
      return;
    }

    handleOpenAddStudent();
  }

  // logo upload removed

  useEffect(() => {
    if (!showAddModal) return;
    if (formClassId && !yearOptions.includes(formClassId)) {
      setFormClassId("");
    }
  }, [showAddModal, formClassId, yearOptions]);

  useEffect(() => {
    if (!showEditStudentModal) return;
    if (editYear && !yearOptions.includes(editYear)) {
      setEditYear("");
    }
  }, [showEditStudentModal, editYear, yearOptions]);

  useEffect(() => {
    if (!appUser) return;
    setHasAuthorityConsent(Boolean(appUser.studentAuthorityConsentAt));
    if (appUser.schoolId) {
      void getSchoolById(appUser.schoolId)
        .then((school) => {
          setSchoolType((school?.schoolType ?? "Secondary School") as SchoolType);
        })
        .catch(() => {
          setSchoolType("Secondary School");
        });
    } else {
      setSchoolType(null);
    }
    loadData();
  }, [appUser]);

  useEffect(() => {
    if (!successToast) return;
    const toastTimer = window.setTimeout(() => {
      setSuccessToast("");
    }, 2200);
    return () => window.clearTimeout(toastTimer);
  }, [successToast]);

  useEffect(() => {
    if (!errorToast) return;
    const toastTimer = window.setTimeout(() => {
      setErrorToast("");
    }, 2600);
    return () => window.clearTimeout(toastTimer);
  }, [errorToast]);

  useEffect(() => {
    if (!openActionsForStudent) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!actionsMenuRef.current) return;
      if (!actionsMenuRef.current.contains(event.target as Node)) {
        setOpenActionsForStudent(null);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [openActionsForStudent]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (!openActionsForStudent) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenActionsForStudent(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [openActionsForStudent]);

  function handleOpenDeleteRequest(student: StudentRow) {
    setSelectedStudentForDeleteRequest(student);
    setDeleteReason("");
    setDeleteRequestError("");
    setOpenActionsForStudent(null);
    setShowDeleteRequestModal(true);
  }

  function handleOpenEditStudent(student: StudentRow) {
    setSelectedStudentForEdit(student);
    setEditName(student.name);
    setEditRomanNickname(student.romanNickname ?? "");
    setEditYear(student.className);
    setEditPhoto(null);
    setEditPhotoPreview(student.photoUrl ?? null);
    setEditError("");
    setOpenActionsForStudent(null);
    setShowEditStudentModal(true);
  }

  async function handleSubmitEditStudent() {
    if (!appUser?.schoolId || !selectedStudentForEdit) {
      setEditError("Could not edit student. Please try again.");
      return;
    }
    if (!editName.trim()) {
      setEditError("Name is required.");
      return;
    }
    if (!editYear) {
      setEditError("Please select a year.");
      return;
    }

    setEditSaving(true);
    setEditError("");
    try {
      const targetStudent = selectedStudentForEdit;
      const trimmedName = editName.trim();
      const trimmedRomanNickname = editRomanNickname.trim();
      let updatedPhotoUrl = targetStudent.photoUrl;

      let targetClassId = classes.find((c) => c.name === editYear)?.id;
      if (!targetClassId) {
        targetClassId = await createClass(editYear, appUser.schoolId, appUser.uid);
        setClasses((prev) => [
          ...prev,
          {
            id: targetClassId!,
            name: editYear,
            schoolId: appUser.schoolId!,
            teacherId: appUser.uid,
            studentIds: [],
            createdAt: Date.now(),
          },
        ]);
      }

      if (!targetClassId) {
        setEditError("Could not assign year. Please try again.");
        return;
      }

      await updateStudentProfileAndClass({
        studentId: targetStudent.uid,
        displayName: trimmedName,
        romanNickname: trimmedRomanNickname || undefined,
        currentClassId: targetStudent.classId,
        targetClassId,
      });

      if (editPhoto) {
        updatedPhotoUrl = await updateUserPhoto(targetStudent.uid, editPhoto);
      }

      setStudents((prev) =>
        sortStudentRows(
          prev.map((student) =>
            student.uid === targetStudent.uid
              ? {
                  ...student,
                  name: trimmedName,
                  romanNickname: trimmedRomanNickname || undefined,
                  classId: targetClassId,
                  className: editYear,
                  photoUrl: updatedPhotoUrl,
                }
              : student
          )
        )
      );

      setShowEditStudentModal(false);
      setSelectedStudentForEdit(null);
      setEditPhoto(null);
      setEditPhotoPreview(null);
      setSuccessToast("Student updated successfully.");
      void loadData(1, false);
    } catch (err) {
      console.error("Failed to update student:", err);
      setEditError("Failed to update student. Please try again.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleSubmitDeleteRequest() {
    if (!appUser?.schoolId || !selectedStudentForDeleteRequest) {
      setDeleteRequestError("Could not create deletion request. Please try again.");
      return;
    }
    if (!deleteReason.trim() || deleteReason.trim().length < 10) {
      setDeleteRequestError("Please provide a reason (at least 10 characters).");
      return;
    }

    setDeleteRequestError("");
    setSubmittingDeleteRequest(true);
    try {
      const pendingStudentId = selectedStudentForDeleteRequest.uid;

      const { queuedEmails } = await createStudentDeletionRequestAndNotifyAdmins({
        studentId: pendingStudentId,
        studentName: selectedStudentForDeleteRequest.name,
        studentRomanNickname: selectedStudentForDeleteRequest.romanNickname,
        schoolId: appUser.schoolId,
        classId: selectedStudentForDeleteRequest.classId,
        className: selectedStudentForDeleteRequest.className,
        requestedByUid: appUser.uid,
        requestedByName: appUser.displayName,
        reason: deleteReason.trim(),
      });

      setStudents((prev) =>
        sortStudentRows(
          prev.map((student) =>
            student.uid === pendingStudentId
              ? { ...student, hasPendingDeletionRequest: true }
              : student
          )
        )
      );

      setShowDeleteRequestModal(false);
      setSelectedStudentForDeleteRequest(null);
      setDeleteReason("");
      if (queuedEmails > 0) {
        setSuccessToast("Deletion request sent to admin for review.");
      } else {
        setErrorToast("Deletion request saved, but no admin email could be sent.");
      }
    } catch (err) {
      console.error("Failed to create deletion request:", err);
      setDeleteRequestError("Failed to submit request. Please try again.");
    } finally {
      setSubmittingDeleteRequest(false);
    }
  }

  function handleOpenCancelDeleteRequest(student: StudentRow) {
    setSelectedStudentForCancelDeleteRequest(student);
    setOpenActionsForStudent(null);
    setShowCancelDeleteRequestModal(true);
  }

  async function handleRemoveDeleteRequest(student: StudentRow): Promise<boolean> {
    if (!appUser?.schoolId) {
      setErrorToast("Could not remove deletion request. Please try again.");
      return false;
    }

    setRemovingDeleteRequestForStudentId(student.uid);

    try {
      const { removedCount } = await removePendingStudentDeletionRequest({
        studentId: student.uid,
        schoolId: appUser.schoolId,
      });

      if (removedCount === 0) {
        setErrorToast("No pending deletion request found for this student.");
        return false;
      }

      setStudents((prev) =>
        sortStudentRows(
          prev.map((currentStudent) =>
            currentStudent.uid === student.uid
              ? { ...currentStudent, hasPendingDeletionRequest: false }
              : currentStudent
          )
        )
      );
      setSuccessToast("Deletion request canceled.");
      return true;
    } catch (err) {
      console.error("Failed to remove deletion request:", err);
      setErrorToast("Failed to remove deletion request. Please try again.");
      return false;
    } finally {
      setRemovingDeleteRequestForStudentId(null);
    }
  }

  async function handleConfirmCancelDeleteRequest() {
    if (!selectedStudentForCancelDeleteRequest) return;
    const wasRemoved = await handleRemoveDeleteRequest(selectedStudentForCancelDeleteRequest);
    if (!wasRemoved) return;

    setShowCancelDeleteRequestModal(false);
    setSelectedStudentForCancelDeleteRequest(null);
  }

  async function loadData(retryCount = 1, showLoadingState = true) {
      let keepLoadingForRetry = false;
      if (showLoadingState) {
        setLoading(true);
      }
      setLoadError("");
      try {
        // Load all year groups in the school if schoolId exists, otherwise just teacher's groups
        const teacherClasses = appUser!.schoolId 
          ? await getClassesBySchool(appUser!.schoolId)
          : await getClassesByTeacher(appUser!.uid);

        setClasses(teacherClasses);

        const allStudentIds = teacherClasses.flatMap((c) => c.studentIds);
        const uniqueIds = [...new Set(allStudentIds)];
        const [users, pendingDeletionStudentIds, ...resultArrays] = await Promise.all([
          getUsersByIds(uniqueIds),
          appUser!.schoolId ? getPendingStudentDeletionRequestIds(appUser!.schoolId) : Promise.resolve([]),
          ...teacherClasses.map((c) => getResultsByClass(c.id, c.schoolId)),
        ]);

        const pendingDeletionSet = new Set(pendingDeletionStudentIds);

        const userMap = new Map<string, AppUser>();
        (users as AppUser[]).forEach((u) => userMap.set(u.uid, u));

        const allResults: Result[] = (resultArrays as Result[][]).flat();
        const milesByStudent = new Map<string, number>();
        allResults.forEach((r) => {
          milesByStudent.set(
            r.studentId,
            (milesByStudent.get(r.studentId) || 0) + r.distanceMiles
          );
        });

        const rows: StudentRow[] = [];
        for (const cls of teacherClasses) {
          for (const sid of cls.studentIds) {
            const user = userMap.get(sid);
            const totalMiles = milesByStudent.get(sid) || 0;
            rows.push({
              uid: sid,
              name: user?.displayName || "⚠️ Missing Profile",
              romanNickname: user?.romanNickname,
              hasPendingDeletionRequest: pendingDeletionSet.has(sid),
              classId: cls.id,
              age: user?.age ?? null,
              photoUrl: user?.photoUrl,
              className: cls.name,
              totalMiles,
              ...getCampaignInfo(totalMiles),
            });
          }
        }

        setStudents(sortStudentRows(rows));
      } catch (err) {
        console.error("Failed to load campaign data:", err);
        if (retryCount > 0) {
          keepLoadingForRetry = true;
          window.setTimeout(() => {
            void loadData(retryCount - 1);
          }, 800);
          return;
        }

        setStudents([]);
        setLoadError("We could not load your students yet. Please try refreshing in a moment.");
      } finally {
        if (!keepLoadingForRetry) {
          setLoading(false);
        }
      }
  }

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filtered = students.filter((student) => {
    if (!normalizedSearch) return true;

    return [
      student.name,
      student.romanNickname ?? "",
      student.className,
      student.campaignName,
      String(student.campaignNumber),
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
  });
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedStudents = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="h-screen text-stone-100 flex flex-col overflow-hidden bg-stone-950">
      <Navbar />

      {successToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-stone-900/95 px-5 py-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-stone-100 font-medium tracking-wide">
              {successToast}
            </span>
          </div>
        </div>
      )}

      {errorToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-stone-900/95 px-5 py-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 text-red-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span className="text-stone-100 font-medium tracking-wide">
              {errorToast}
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex overflow-hidden relative" style={{ backgroundImage: 'url(/full-background.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
        {/* Main content */}
        <div className="flex-1 min-w-0 px-12 py-14 overflow-y-auto overflow-x-hidden flex flex-col items-center">
          <div className="w-full max-w-[90rem]">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-stone-950 text-3xl font-bold mt-2 [text-shadow:0_2px_14px_rgba(255,255,255,0.55)]">
              Students
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative min-w-[24rem]">
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-roman-gold/80">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.5 3a5.5 5.5 0 014.392 8.812l3.648 3.649a1 1 0 01-1.414 1.414l-3.649-3.648A5.5 5.5 0 118.5 3zm0 2a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by student, year, or campaign"
                className="w-full rounded-2xl border border-stone-800/50 bg-stone-950/88 py-3 pl-12 pr-12 text-sm font-medium text-stone-100 placeholder:text-stone-500 shadow-[0_14px_34px_rgba(0,0,0,0.28)] outline-none transition-all focus:border-roman-gold/70 focus:bg-stone-950"
                aria-label="Search students"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                  className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-stone-600/70 bg-stone-800/95 text-stone-200 shadow-sm transition-all hover:scale-105 hover:border-stone-500 hover:bg-stone-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-roman-gold/60"
                  aria-label="Clear search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleTopAddStudentClick}
              className={
                students.length >= 40
                  ? "inline-flex items-center gap-2 rounded-xl border border-red-500/50 bg-stone-950/70 px-5 py-3 text-sm font-bold uppercase tracking-[0.2em] text-red-400 shadow-[0_4px_15px_rgba(239,68,68,0.15)] cursor-not-allowed opacity-90 transition-all hover:bg-stone-950/90 active:scale-100"
                  : "inline-flex items-center gap-2 rounded-xl border border-roman-gold/50 bg-stone-950/85 px-5 py-3 text-sm font-bold uppercase tracking-[0.2em] text-roman-gold shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition-all hover:bg-stone-900 hover:scale-[1.03] active:scale-[0.97]"
              }
              title={students.length >= 40 ? "Maximum capacity of 40 students reached." : "Add a new student to the roster"}
            >
              {students.length >= 40 ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="text-lg leading-none">+</span>
              )}
              <span>{students.length >= 40 ? "Roster Full (40/40)" : "Add Student"}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <CampaignsTableSkeleton />
        ) : loadError ? (
          <div className="text-center text-stone-400 py-20 flex flex-col items-center gap-4">
            <div>
              <p className="text-lg mb-2 text-roman-gold">Still preparing your account</p>
              <p className="text-sm">{loadError}</p>
            </div>
            <button
              type="button"
              onClick={() => loadData()}
              className="px-5 py-2.5 rounded-lg border border-roman-gold/40 text-roman-gold text-xs uppercase tracking-wider font-semibold hover:bg-roman-gold/10 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="w-full max-w-2xl mx-auto rounded-3xl border border-roman-gold/20 bg-stone-900/60 backdrop-blur-md shadow-[0_8px_60px_rgba(0,0,0,0.5)] flex flex-col items-center py-20 px-8 text-center my-12 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-roman-gold/20 blur-[100px] rounded-full pointer-events-none"></div>
            {/* Warrior/Shield Icon */}
            <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-stone-900/90 to-stone-800/80 flex items-center justify-center border-4 border-roman-gold/40 shadow-[0_0_40px_rgba(235,191,90,0.18)] relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-roman-gold drop-shadow-[0_2px_8px_rgba(235,191,90,0.5)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2c-.28 0-.56.06-.82.18l-7 3.11A2 2 0 0 0 3 7.09V12c0 5.25 6.13 8.69 8.22 9.74.5.25 1.06.25 1.56 0C14.87 20.69 21 17.25 21 12V7.09a2 2 0 0 0-1.18-1.8l-7-3.11A2 2 0 0 0 12 2zm0 2.18 7 3.11V12c0 4.13-4.81 7.06-7 8.11C9.81 19.06 5 16.13 5 12V7.29l7-3.11z" />
                <path d="M12 8a1 1 0 0 1 1 1v3.5a1 1 0 0 1-2 0V9a1 1 0 0 1 1-1zm0 7a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 12 15z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-roman-gold mb-4 tracking-wide font-serif drop-shadow-[0_2px_8px_rgba(235,191,90,0.3)]">
              {searchQuery.trim() ? "No Matching Warriors" : "Awaiting Warriors"}
            </h3>
            <p className="text-yellow-100/90 mb-10 max-w-md mx-auto text-lg leading-relaxed font-medium drop-shadow-[0_2px_8px_rgba(235,191,90,0.2)]">
              {searchQuery.trim()
                ? "No students match your search. Try a different name, year, or campaign."
                : <>Your campaign board is currently empty.<br className="hidden sm:inline" /> Add students to a year group to start tracking their progress through the challenges.</>}
            </p>
            <button
              type="button"
              onClick={searchQuery.trim() ? () => setSearchQuery("") : handleOpenAddStudent}
              className="group relative flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-base transition-all overflow-hidden border-2 border-roman-gold text-stone-950 bg-roman-gold hover:bg-yellow-400 shadow-[0_0_20px_rgba(235,191,90,0.2)] hover:shadow-[0_0_30px_rgba(235,191,90,0.4)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              {searchQuery.trim() ? "Clear Search" : "Add Student"}
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-roman-gold/20 overflow-visible bg-stone-950/90 shadow-[0_16px_60px_rgba(0,0,0,0.8)] mt-4">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-roman-gold/20">
                  <th className="pl-8 pr-10 py-6 text-sm uppercase tracking-widest text-roman-gold/80 font-bold w-[34rem] bg-stone-900/90 rounded-tl-3xl shadow-sm">Name</th>
                  <th className="px-8 py-6 text-sm uppercase tracking-widest text-roman-gold/80 font-bold w-40 bg-stone-900/90 shadow-sm">Year</th>
                  <th className="px-8 py-6 text-sm uppercase tracking-widest text-roman-gold/80 font-bold w-56 bg-stone-900/90 shadow-sm">Campaign</th>
                  <th className="px-8 py-6 text-sm uppercase tracking-widest text-roman-gold/80 font-bold w-96 bg-stone-900/90 shadow-sm">Progress</th>
                  <th className="px-8 py-6 text-sm uppercase tracking-widest text-roman-gold/80 font-bold w-40 text-center bg-stone-900/90 rounded-tr-3xl shadow-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((s) => (
                  <tr
                    key={`${s.uid}-${s.className}`}
                    onClick={() => navigate(`/campaigns/${s.uid}`)}
                    className={`border-b cursor-pointer transition-all duration-200 relative ${
                      s.hasPendingDeletionRequest
                        ? "bg-red-950/20 border-red-900/40 hover:bg-red-950/30"
                        : "border-roman-gold/5 bg-stone-950/40 hover:bg-stone-800/60"
                    }`}
                  >
                    <td className="pl-8 pr-12 py-6 relative">
                      <div className="flex items-center gap-4">
                        <div className={`w-20 h-20 rounded-full border overflow-hidden flex items-center justify-center shrink-0 ${
                          s.hasPendingDeletionRequest ? "border-red-500/30 bg-red-950/40 shadow-[0_0_15px_rgba(220,38,38,0.2)]" : "border-roman-gold/20 bg-stone-800"
                        }`}>
                          {s.photoUrl
                            ? <img src={s.photoUrl} alt={s.name} className={`w-full h-full object-cover ${s.hasPendingDeletionRequest ? 'opacity-60 grayscale' : ''}`} />
                            : <img src="/profile-pics.png" alt={s.name} className={`w-full h-full object-cover opacity-60 ${s.hasPendingDeletionRequest ? 'grayscale' : ''}`} />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className={`font-medium text-3xl leading-tight ${s.hasPendingDeletionRequest ? 'text-stone-300' : 'text-stone-100'}`}>{s.name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2.5">
                            {s.romanNickname && (
                              <span className="inline-block px-3 py-1 rounded-full border border-roman-gold/30 bg-roman-gold/10 text-roman-gold/90 text-xs font-bold uppercase tracking-[0.2em] shadow-[0_2px_10px_rgba(235,191,90,0.15)] flex-none">
                                {s.romanNickname}
                              </span>
                            )}
                            {s.hasPendingDeletionRequest && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider overflow-hidden group/badge flex-none relative">
                                <span className="absolute inset-0 bg-red-400/10 animate-pulse pointer-events-none"></span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Awaiting Deletion
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-stone-300 text-lg">
                        {s.className}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div>
                        <span className="text-roman-gold/60 text-base font-mono">#{s.campaignNumber}</span>
                        <span className="text-stone-300 text-lg ml-2">{s.campaignName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2">
                        {/* Overall miles progress */}
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-4 rounded-full bg-stone-700/40 overflow-hidden border border-stone-600/20">
                            <div
                              className="h-full bg-linear-to-r from-roman-gold/60 to-roman-gold rounded-full transition-all duration-500"
                              style={{ width: `${s.campaignProgress}%` }}
                            />
                          </div>
                          <span className="text-roman-gold/80 text-lg font-mono w-12 text-right">
                            {s.campaignProgress}%
                          </span>
                        </div>
                        {/* Campaign count progress */}
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-2 rounded-full bg-stone-700/30 overflow-hidden border border-stone-600/10">
                            <div
                              className="h-full bg-linear-to-r from-roman-red/60 to-roman-red rounded-full transition-all duration-500"
                              style={{ width: `${Math.round((s.completedCampaigns / CAMPAIGNS.length) * 100)}%` }}
                            />
                          </div>
                          <span className="text-stone-500 text-sm font-mono w-12 text-right">
                            {s.completedCampaigns}/{CAMPAIGNS.length}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className={`relative inline-flex ${openActionsForStudent === s.uid ? "z-50" : "z-0"}`}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionsForStudent((current) => current === s.uid ? null : s.uid);
                          }}
                          className={`w-10 h-10 rounded-lg border text-xl leading-none transition-colors ${openActionsForStudent === s.uid ? "border-roman-gold bg-roman-gold/15 text-roman-gold" : "border-roman-gold/40 text-roman-gold hover:bg-roman-gold/10"}`}
                          aria-label="Open student actions"
                          aria-haspopup="menu"
                          aria-expanded={openActionsForStudent === s.uid}
                          aria-controls={`student-actions-${s.uid}`}
                        >
                          ⋮
                        </button>
                        {openActionsForStudent === s.uid && (
                          <div
                            ref={actionsMenuRef}
                            id={`student-actions-${s.uid}`}
                            role="menu"
                            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-48 rounded-2xl border border-roman-gold/25 bg-stone-900/95 shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl overflow-hidden origin-top-right ring-1 ring-white/5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-4 py-3 border-b border-stone-700/50 bg-stone-950/40 text-[10px] font-bold uppercase tracking-widest text-roman-gold/70 text-left">
                              Options
                            </div>
                            {!s.hasPendingDeletionRequest && (
                              <button
                                type="button"
                                onClick={() => {
                                  handleOpenEditStudent(s);
                                }}
                                role="menuitem"
                                className="group w-full text-left px-4 py-3 text-stone-200 text-sm font-medium hover:bg-roman-gold/10 hover:text-roman-gold transition-colors flex items-center justify-between"
                              >
                                <span>Edit Student</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-stone-500 group-hover:text-roman-gold/80 transition-colors" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (s.hasPendingDeletionRequest) {
                                  handleOpenCancelDeleteRequest(s);
                                  return;
                                }
                                handleOpenDeleteRequest(s);
                              }}
                              disabled={removingDeleteRequestForStudentId === s.uid}
                              role="menuitem"
                              className={`group w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between border-t border-stone-800/80 disabled:opacity-50 disabled:cursor-not-allowed ${s.hasPendingDeletionRequest ? "text-amber-400 hover:bg-amber-400/10" : "text-red-400 hover:bg-red-500/10"}`}
                            >
                              <span>
                                {removingDeleteRequestForStudentId === s.uid
                                  ? "Removing..."
                                  : s.hasPendingDeletionRequest
                                  ? "Cancel Request"
                                  : "Delete Student"}
                              </span>
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-colors ${s.hasPendingDeletionRequest ? "text-amber-400/70 group-hover:text-amber-400" : "text-red-400/70 group-hover:text-red-400"}`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length < 40 && currentPage === totalPages && (
                  <tr
                    onClick={handleOpenAddStudent}
                    className="bg-stone-950/40 hover:bg-stone-800/60 transition-colors cursor-pointer"
                  >
                    <td colSpan={5} className="px-8 py-8 text-center rounded-b-3xl">
                      <div className="flex items-center justify-center gap-3 w-full text-roman-gold/60 hover:text-roman-gold transition-colors">
                        <span className="text-2xl pb-1">+</span>
                        <span className="text-sm uppercase tracking-widest font-bold">Add Student</span>
                        <span className="text-stone-500 text-xs font-mono ml-2">({filtered.length}/40)</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary and Pagination bar */}
        {!loading && filtered.length > 0 && (
          <div className="mt-6 flex items-center justify-between text-base px-2 py-1">
            <div className="text-stone-200 font-extrabold tracking-wide">
              <span>{filtered.length} student{filtered.length !== 1 ? "s" : ""}</span>
              <span className="mx-4 text-stone-600">|</span>
              <span>
                Total:{" "}
                <span className="text-roman-gold font-black tracking-wide">
                  {filtered.reduce((sum, s) => sum + s.totalMiles, 0).toFixed(1)}
                </span>{" "}
                miles
              </span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-stone-600 bg-stone-800 text-stone-200 font-bold hover:bg-stone-700 hover:text-roman-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="px-4 py-1.5 rounded-lg bg-stone-800 border border-stone-600 text-stone-300 font-bold">
                  Page <span className="text-roman-gold">{currentPage}</span> of <span className="text-roman-gold">{totalPages}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-stone-600 bg-stone-800 text-stone-200 font-bold hover:bg-stone-700 hover:text-roman-gold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
          </div>{/* end max-w-5xl */}
      </div>


      </div>

      {/* Delete Request Modal */}
      {showDeleteRequestModal && selectedStudentForDeleteRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm"
            onClick={() => {
              if (submittingDeleteRequest) return;
              setShowDeleteRequestModal(false);
              setSelectedStudentForDeleteRequest(null);
              setDeleteReason("");
              setDeleteRequestError("");
            }}
          />
          <div className="relative bg-stone-900 border border-red-300/20 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-[addStudentModalZoomIn_180ms_cubic-bezier(0.2,0.8,0.2,1)]">
            <div className="h-px w-full bg-linear-to-r from-transparent via-red-300/40 to-transparent" />
            <div className="px-8 py-8">
              <h2 className="text-red-200 font-serif text-2xl font-bold mb-2 tracking-wide">Request Student Deletion</h2>
              <p className="text-stone-400 text-sm mb-6">
                This will not delete the student now. Your request is sent to admin for approval.
              </p>

              <div className="rounded-lg border border-stone-700/70 bg-stone-800/60 px-4 py-3 mb-5">
                <p className="text-stone-300 text-sm">
                  Student: <span className="text-stone-100 font-semibold">{selectedStudentForDeleteRequest.name}</span>
                </p>
                <p className="text-stone-500 text-xs mt-1">{selectedStudentForDeleteRequest.className}</p>
              </div>

              <div>
                <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Reason *</label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={5}
                  placeholder="Explain why deletion is requested (minimum 10 characters)."
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-red-300/60 transition-colors resize-none"
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-stone-500">Maximum 500 characters</span>
                    <span className={deleteReason.trim().length <= 500 ? "text-emerald-300" : "text-red-500"}>
                      {deleteReason.trim().length}/500
                  </span>
                </div>
              </div>

              {deleteRequestError && (
                <p className="text-red-300 text-sm mt-3">{deleteRequestError}</p>
              )}

              <div className="flex gap-3 mt-7">
                <button
                  onClick={() => {
                    if (submittingDeleteRequest) return;
                    setShowDeleteRequestModal(false);
                    setSelectedStudentForDeleteRequest(null);
                    setDeleteReason("");
                    setDeleteRequestError("");
                  }}
                  className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSubmitDeleteRequest()}
                  disabled={submittingDeleteRequest}
                  className="flex-1 py-3 rounded-xl bg-red-300 text-stone-950 font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingDeleteRequest ? "Sending..." : "Request Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Delete Request Confirmation Modal */}
      {showCancelDeleteRequestModal && selectedStudentForCancelDeleteRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm"
            onClick={() => {
              if (removingDeleteRequestForStudentId === selectedStudentForCancelDeleteRequest.uid) return;
              setShowCancelDeleteRequestModal(false);
              setSelectedStudentForCancelDeleteRequest(null);
            }}
          />
          <div className="relative bg-stone-900 border border-amber-300/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-[addStudentModalZoomIn_180ms_cubic-bezier(0.2,0.8,0.2,1)]">
            <div className="h-px w-full bg-linear-to-r from-transparent via-amber-300/40 to-transparent" />
            <div className="px-8 py-8">
              <h2 className="text-amber-200 font-serif text-2xl font-bold mb-2 tracking-wide">Cancel Deletion Request</h2>
              <p className="text-stone-400 text-sm mb-6">
                Are you sure you want to cancel the deletion request for this student?
              </p>

              <div className="rounded-lg border border-stone-700/70 bg-stone-800/60 px-4 py-3 mb-5">
                <p className="text-stone-300 text-sm">
                  Student: <span className="text-stone-100 font-semibold">{selectedStudentForCancelDeleteRequest.name}</span>
                </p>
                <p className="text-stone-500 text-xs mt-1">{selectedStudentForCancelDeleteRequest.className}</p>
              </div>

              <div className="flex gap-3 mt-7">
                <button
                  onClick={() => {
                    if (removingDeleteRequestForStudentId === selectedStudentForCancelDeleteRequest.uid) return;
                    setShowCancelDeleteRequestModal(false);
                    setSelectedStudentForCancelDeleteRequest(null);
                  }}
                  className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-all"
                >
                  Keep Request
                </button>
                <button
                  onClick={() => void handleConfirmCancelDeleteRequest()}
                  disabled={removingDeleteRequestForStudentId === selectedStudentForCancelDeleteRequest.uid}
                  className="flex-1 py-3 rounded-xl bg-amber-300 text-stone-950 font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {removingDeleteRequestForStudentId === selectedStudentForCancelDeleteRequest.uid ? "Canceling..." : "Cancel Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditStudentModal && selectedStudentForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm"
            onClick={() => {
              if (editSaving) return;
              setShowEditStudentModal(false);
              setSelectedStudentForEdit(null);
              setEditError("");
            }}
          />
          <div className="relative bg-stone-900/90 backdrop-blur-xl border border-roman-gold/20 rounded-3xl w-full max-w-lg shadow-[0_8px_60px_rgba(0,0,0,0.7)] overflow-hidden animate-[addStudentModalZoomIn_180ms_cubic-bezier(0.2,0.8,0.2,1)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-roman-gold/10 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="px-8 py-10 relative">
              <h2 className="text-roman-gold font-serif text-3xl font-bold mb-8 tracking-wide text-center drop-shadow-[0_2px_8px_rgba(235,191,90,0.3)]">Edit Student</h2>

              <div className="space-y-5">
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => editPhotoRef.current?.click()}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-roman-gold/40 hover:border-roman-gold bg-stone-800/80 flex items-center justify-center overflow-hidden transition-all group hover:shadow-[0_0_20px_rgba(235,191,90,0.2)]"
                  >
                    {editPhotoPreview
                      ? <img src={editPhotoPreview} alt="Student preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      : <img src="/profile-pics.png" alt="Student" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                    }
                  </button>
                  <span className="text-stone-400 text-xs font-semibold uppercase tracking-wider">{editPhotoPreview ? "Change photo" : "Add photo (optional)"}</span>
                  <input
                    ref={editPhotoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setEditPhoto(file);
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setEditPhotoPreview(url);
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">Full Name *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">Roman Nickname</label>
                  <input
                    type="text"
                    value={editRomanNickname}
                    onChange={(e) => setEditRomanNickname(e.target.value)}
                    placeholder="e.g. The Brave"
                    className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">Year *</label>
                  <select
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ebbf5a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                  >
                    <option value="" className="bg-stone-800">Select year...</option>
                    {yearOptions.map((year) => (
                      <option key={year} value={year} className="bg-stone-800">{year}</option>
                    ))}
                  </select>
                </div>

                {editError && (
                  <p className="text-red-400 text-sm">{editError}</p>
                )}
              </div>

              <div className="flex gap-4 mt-10">
                <button
                  onClick={() => {
                    if (editSaving) return;
                    setShowEditStudentModal(false);
                    setSelectedStudentForEdit(null);
                    setEditPhoto(null);
                    setEditPhotoPreview(null);
                    setEditError("");
                  }}
                  className="flex-1 py-3.5 rounded-xl border border-stone-700/50 bg-stone-800/30 text-stone-300 font-bold hover:bg-stone-700/50 hover:text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSubmitEditStudent()}
                  disabled={editSaving}
                  className="flex-1 py-3.5 rounded-xl bg-roman-gold text-stone-950 font-semibold hover:brightness-105 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-stone-900/90 backdrop-blur-xl border border-roman-gold/20 rounded-3xl w-full max-w-lg shadow-[0_8px_60px_rgba(0,0,0,0.7)] overflow-hidden animate-[addStudentModalZoomIn_180ms_cubic-bezier(0.2,0.8,0.2,1)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-roman-gold/10 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="px-8 py-10 relative">
              <h2 className="text-roman-gold font-serif text-3xl font-bold mb-8 tracking-wide text-center drop-shadow-[0_2px_8px_rgba(235,191,90,0.3)]">Add Student</h2>

              <div className="space-y-5">
                {/* Profile photo picker */}
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => formPhotoRef.current?.click()}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-roman-gold/40 hover:border-roman-gold bg-stone-800/80 flex items-center justify-center overflow-hidden transition-all group hover:shadow-[0_0_20px_rgba(235,191,90,0.2)]"
                  >
                    {formPhotoPreview
                      ? <img src={formPhotoPreview} alt="preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      : <img src="/profile-pics.png" alt="Warrior" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                    }
                  </button>
                  <span className="text-stone-400 text-xs font-semibold uppercase tracking-wider">{formPhotoPreview ? "Change photo" : "Add photo (optional)"}</span>
                  <input
                    ref={formPhotoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setFormPhoto(file);
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setFormPhotoPreview(url);
                      } else {
                        setFormPhotoPreview(null);
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">Full Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between pl-1">
                    <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest">Roman Nickname</label>
                    <button
                      type="button"
                      onClick={handleSuggestRomanNickname}
                      className="rounded-lg border border-roman-gold/40 bg-stone-800/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-roman-gold transition-colors hover:bg-stone-700"
                    >
                      Suggest
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formRomanNickname}
                    onChange={(e) => setFormRomanNickname(e.target.value)}
                    placeholder="e.g. The Brave"
                    className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 text-xs font-semibold uppercase tracking-widest mb-2 pl-1">Year *</label>
                  <select
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value)}
                    className="w-full bg-stone-800/50 border border-stone-700/80 rounded-xl px-4 py-3.5 text-stone-100 focus:outline-none focus:border-roman-gold focus:ring-1 focus:ring-roman-gold/50 transition-all font-medium shadow-inner appearance-none cursor-pointer"
                  >
                    <option value="">Select year...</option>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {formError && (
                  <p className="text-red-400 text-sm font-medium mt-2 bg-red-400/10 px-3 py-2 rounded-lg border border-red-400/20">{formError}</p>
                )}
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => { setShowAddModal(false); setFormError(""); setFormRomanNickname(""); setFormPhoto(null); setFormPhotoPreview(null); }}
                  className="flex-1 py-3.5 rounded-xl border-2 border-stone-700 text-stone-300 font-semibold uppercase tracking-wider text-sm hover:text-white hover:bg-stone-800 transition-all hover:border-stone-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStudent}
                  disabled={formSaving}
                  className="flex-1 py-3.5 rounded-xl border-2 border-roman-gold bg-roman-gold text-stone-950 font-bold uppercase tracking-wider text-sm hover:bg-yellow-400 hover:border-yellow-400 transition-all shadow-[0_0_15px_rgba(235,191,90,0.15)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-roman-gold disabled:hover:border-roman-gold disabled:shadow-none"
                >
                  {formSaving ? "Adding..." : "Add Student"}
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
          <div className="relative bg-stone-900/90 backdrop-blur-xl border border-roman-gold/20 rounded-3xl w-full max-w-lg shadow-[0_8px_60px_rgba(0,0,0,0.7)] overflow-hidden animate-[addStudentModalZoomIn_180ms_cubic-bezier(0.2,0.8,0.2,1)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-roman-gold/10 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="px-8 py-10 relative">
              <div className="w-16 h-16 mb-5 mx-auto rounded-full bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center border-2 border-roman-gold/30 shadow-[0_0_20px_rgba(235,191,90,0.15)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-roman-gold" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              </div>

              <h2 className="text-roman-gold font-serif text-3xl font-bold mb-3 tracking-wide text-center drop-shadow-[0_2px_8px_rgba(235,191,90,0.3)]">Authority Required</h2>
              <p className="text-stone-400 text-base mb-8 text-center leading-relaxed max-w-sm mx-auto">
                Before adding students, please verify that you have the required consent to create their profiles.
              </p>

              <label className="flex items-start gap-4 text-stone-200 text-sm leading-relaxed border border-roman-gold/20 bg-stone-950/50 rounded-xl p-5 mb-8 cursor-pointer hover:border-roman-gold/40 transition-colors group">
                <div className="relative flex items-center justify-center mt-0.5 outline-none">
                  <input
                    type="checkbox"
                    checked={authorityConsentChecked}
                    onChange={(e) => setAuthorityConsentChecked(e.target.checked)}
                    className="peer appearance-none w-5 h-5 border-2 border-stone-600 rounded bg-stone-800 checked:bg-roman-gold checked:border-roman-gold transition-all cursor-pointer"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute w-3.5 h-3.5 text-stone-900 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="group-hover:text-stone-100 transition-colors">
                  I confirm I have the necessary school/parental authority and consent to process this student's data.
                </span>
              </label>

              <div className="flex gap-4">
                <button
                  onClick={() => { setShowAuthorityConsentModal(false); setAuthorityConsentChecked(false); }}
                  className="flex-1 py-3.5 rounded-xl border-2 border-stone-700 text-stone-300 font-semibold uppercase tracking-wider text-sm hover:text-white hover:bg-stone-800 transition-all hover:border-stone-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmStudentAuthorityConsent}
                  disabled={!authorityConsentChecked || authorityConsentSaving}
                  className="flex-1 py-3.5 rounded-xl border-2 border-roman-gold bg-roman-gold text-stone-950 font-bold uppercase tracking-wider text-sm hover:bg-yellow-400 hover:border-yellow-400 transition-all shadow-[0_0_15px_rgba(235,191,90,0.15)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-roman-gold disabled:hover:border-roman-gold disabled:shadow-none"
                >
                  {authorityConsentSaving ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={() => setShowAddClassModal(false)} />
          <div className="relative bg-stone-900 border border-roman-gold/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-[addStudentModalZoomIn_180ms_cubic-bezier(0.2,0.8,0.2,1)]">
            <div className="h-px w-full bg-linear-to-r from-transparent via-roman-gold/50 to-transparent" />
            <div className="px-8 py-8">
              <h2 className="text-roman-gold font-serif text-2xl font-bold mb-3 tracking-wide">Add Class</h2>
              <p className="text-stone-500 text-sm mb-6">Create a class for your students to join.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Class Name</label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g. Period 1"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  />
                </div>

                {classError && (
                  <p className="text-red-400 text-sm">{classError}</p>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => { setShowAddClassModal(false); setClassError(""); }}
                  className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddClass}
                  disabled={classSaving}
                  className="flex-1 py-3 rounded-xl bg-roman-gold text-stone-950 font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {classSaving ? "Creating..." : "Add Class"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
