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
  createUserDoc,
  createClass,
  addStudentToClass,
  updateStudentProfileAndClass,
  createStudentDeletionRequestAndNotifyAdmins,
  getPendingStudentDeletionRequestIds,
  updateUserPhoto,
  recordStudentAuthorityConsent,
} from "../lib/firestore";
import type { AppUser, Class, Result } from "../types";

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

const YEAR_OPTIONS = ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"];

function getCampaignInfo(miles: number) {
  let current = CAMPAIGNS[0];
  for (const c of CAMPAIGNS) {
    if (miles >= c.minMiles) current = c;
    else break;
  }
  const totalProgress = Math.min(100, Math.round((miles / 78) * 100));
  return { campaignNumber: current.number, campaignName: current.name, campaignProgress: totalProgress };
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
  const [formAge, setFormAge] = useState("");
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
  const [editAge, setEditAge] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false);
  const [selectedStudentForDeleteRequest, setSelectedStudentForDeleteRequest] = useState<StudentRow | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteRequestError, setDeleteRequestError] = useState("");
  const [submittingDeleteRequest, setSubmittingDeleteRequest] = useState(false);
  const [formPhoto, setFormPhoto] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const formPhotoRef = useRef<HTMLInputElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const [className, setClassName] = useState("");
  const [classSaving, setClassSaving] = useState(false);
  const [classError, setClassError] = useState("");

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
      const newUser: AppUser = {
        uid: newUid,
        email: "",
        displayName: formName.trim(),
        romanNickname: formRomanNickname.trim() || undefined,
        studentDataConsentConfirmedAt: Date.now(),
        studentDataConsentConfirmedBy: appUser.uid,
        role: "student",
        schoolId: appUser.schoolId,
        classId,
        age: formAge ? parseInt(formAge) : undefined,
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
      setFormAge("");
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

  // logo upload removed

  useEffect(() => {
    if (!appUser) return;
    setHasAuthorityConsent(Boolean(appUser.studentAuthorityConsentAt));
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
    setEditAge(student.age != null ? String(student.age) : "");
    setEditYear(student.className);
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
        studentId: selectedStudentForEdit.uid,
        displayName: editName.trim(),
        romanNickname: editRomanNickname.trim() || undefined,
        age: editAge ? parseInt(editAge, 10) : undefined,
        currentClassId: selectedStudentForEdit.classId,
        targetClassId,
      });

      setShowEditStudentModal(false);
      setSelectedStudentForEdit(null);
      setSuccessToast("Student updated successfully.");
      await loadData();
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
      const { queuedEmails } = await createStudentDeletionRequestAndNotifyAdmins({
        studentId: selectedStudentForDeleteRequest.uid,
        studentName: selectedStudentForDeleteRequest.name,
        studentRomanNickname: selectedStudentForDeleteRequest.romanNickname,
        schoolId: appUser.schoolId,
        classId: selectedStudentForDeleteRequest.classId,
        className: selectedStudentForDeleteRequest.className,
        requestedByUid: appUser.uid,
        requestedByName: appUser.displayName,
        reason: deleteReason.trim(),
      });

      setShowDeleteRequestModal(false);
      setSelectedStudentForDeleteRequest(null);
      setDeleteReason("");
      setSuccessToast(
        queuedEmails > 0
          ? "Deletion request sent to admin for review."
          : "Deletion request saved, but no admin email was available."
      );
    } catch (err) {
      console.error("Failed to create deletion request:", err);
      setDeleteRequestError("Failed to submit request. Please try again.");
    } finally {
      setSubmittingDeleteRequest(false);
    }
  }

  async function loadData(retryCount = 1) {
      let keepLoadingForRetry = false;
      setLoading(true);
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

        rows.sort((a, b) => {
          if (a.hasPendingDeletionRequest !== b.hasPendingDeletionRequest) {
            return a.hasPendingDeletionRequest ? 1 : -1;
          }
          return b.campaignNumber - a.campaignNumber;
        });

        setStudents(rows);
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

  const filtered = students;

  return (
    <div className="h-screen text-stone-100 flex flex-col overflow-hidden bg-stone-950">
      <Navbar />

      {successToast && (
        <div className="fixed top-5 right-5 z-50 pointer-events-none">
          <div className="rounded-lg border border-emerald-300/40 bg-emerald-500/15 text-emerald-100 px-4 py-3 shadow-lg backdrop-blur-sm text-sm font-semibold tracking-wide">
            {successToast}
          </div>
        </div>
      )}

      {errorToast && (
        <div className="fixed top-5 right-5 z-50 pointer-events-none">
          <div className="rounded-lg border border-red-300/40 bg-red-500/15 text-red-100 px-4 py-3 shadow-lg backdrop-blur-sm text-sm font-semibold tracking-wide">
            {errorToast}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex overflow-hidden relative" style={{ backgroundImage: 'url(/full-background.png)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
        {/* Main content */}
        <div className="flex-1 min-w-0 px-12 py-14 overflow-y-auto overflow-x-hidden flex flex-col items-center">
          <div className="w-full max-w-[90rem]">
        <div className="flex items-center justify-between gap-3 mb-6"></div>

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
          <div className="text-center text-stone-500 py-20 flex flex-col items-center gap-4">
            <div>
              <p className="text-lg mb-2">No students found</p>
              <p className="text-sm">Add students to a year group to see their progress here.</p>
            </div>
            {/* actions removed */}
          </div>
        ) : (
          <div className="rounded-2xl border border-roman-gold/15 overflow-hidden bg-stone-950/60 backdrop-blur-md shadow-[0_8px_60px_rgba(0,0,0,0.5)]">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-900/50 border-b border-roman-gold/10">
                  <th className="pl-8 pr-10 py-5 text-lg uppercase tracking-wider text-roman-gold/50 font-semibold w-[34rem]">Name</th>
                  <th className="px-8 py-5 text-lg uppercase tracking-wider text-roman-gold/50 font-semibold w-24">Age</th>
                  <th className="px-8 py-5 text-lg uppercase tracking-wider text-roman-gold/50 font-semibold w-40">Year</th>
                  <th className="px-8 py-5 text-lg uppercase tracking-wider text-roman-gold/50 font-semibold w-44">Campaign</th>
                  <th className="px-8 py-5 text-lg uppercase tracking-wider text-roman-gold/50 font-semibold w-96">Progress</th>
                  <th className="px-8 py-5 text-lg uppercase tracking-wider text-roman-gold/50 font-semibold w-40 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={`${s.uid}-${s.className}`}
                    onClick={() => navigate(`/campaigns/${s.uid}`)}
                    className={`border-b border-stone-700/20 cursor-pointer transition-colors ${s.hasPendingDeletionRequest ? "bg-stone-900/60 opacity-55 hover:bg-stone-900/70" : "hover:bg-stone-800/30"}`}
                  >
                    <td className="pl-8 pr-12 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full border border-roman-gold/20 overflow-hidden bg-stone-800 flex items-center justify-center shrink-0">
                          {s.photoUrl
                            ? <img src={s.photoUrl} alt={s.name} className="w-full h-full object-cover" />
                            : <img src="/warrior.png" alt={s.name} className="w-full h-full object-cover opacity-60" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-stone-100 text-3xl leading-tight">{s.name}</p>
                          {s.romanNickname && (
                            <p className="text-roman-gold/80 text-sm uppercase tracking-wider mt-1">{s.romanNickname}</p>
                          )}
                          {s.hasPendingDeletionRequest && (
                            <p className="text-amber-300/90 text-xs uppercase tracking-wider mt-1.5">Deletion requested - awaiting admin review</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-stone-400 text-xl">{s.age ?? "—"}</td>
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
                              style={{ width: `${Math.round((s.campaignNumber / CAMPAIGNS.length) * 100)}%` }}
                            />
                          </div>
                          <span className="text-stone-500 text-sm font-mono w-12 text-right">
                            {s.campaignNumber}/{CAMPAIGNS.length}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="relative inline-flex">
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
                            className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-44 rounded-xl border border-roman-gold/25 bg-stone-950/95 shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-md overflow-hidden origin-top-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-3 py-2 border-b border-stone-800/80 text-[11px] uppercase tracking-wider text-stone-500 text-left">
                              Student Actions
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenEditStudent(s);
                              }}
                              role="menuitem"
                              className="w-full text-left px-3 py-2.5 text-stone-200 text-sm hover:bg-stone-800/80 transition-colors flex items-center justify-between"
                            >
                              <span>Edit</span>
                              <span className="text-stone-500">✎</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteRequest(s)}
                              disabled={s.hasPendingDeletionRequest}
                              role="menuitem"
                              className="w-full text-left px-3 py-2.5 text-red-300 text-sm hover:bg-red-500/15 transition-colors flex items-center justify-between border-t border-stone-800/80 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span>{s.hasPendingDeletionRequest ? "Delete Pending" : "Delete"}</span>
                              <span className="text-red-400/70">🗑</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length < 40 && (
                  <tr
                    onClick={handleOpenAddStudent}
                    className="hover:bg-stone-800/30 transition-colors cursor-pointer"
                  >
                    <td colSpan={6} className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-2 w-full text-roman-gold/60 hover:text-roman-gold transition-colors">
                        <span className="text-2xl">+</span>
                        <span className="text-base uppercase tracking-wider font-semibold">Add Student</span>
                        <span className="text-stone-500 text-sm">({filtered.length}/40)</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary bar */}
        {!loading && filtered.length > 0 && (
          <div className="mt-6 flex items-center justify-between text-base text-stone-500 px-2">
            <span>{filtered.length} student{filtered.length !== 1 ? "s" : ""}</span>
            <span>
              Total:{" "}
              <span className="text-roman-gold/70 font-bold">
                {filtered.reduce((sum, s) => sum + s.totalMiles, 0).toFixed(1)}
              </span>{" "}
              miles
            </span>
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
          <div className="relative bg-stone-900 border border-red-300/20 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
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
                <p className="text-stone-500 text-xs mt-1">Year: {selectedStudentForDeleteRequest.className}</p>
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
                  <span className="text-stone-500">Minimum 10 characters</span>
                  <span className={deleteReason.trim().length >= 10 ? "text-emerald-300" : "text-stone-500"}>
                    {deleteReason.trim().length}/10
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
          <div className="relative bg-stone-900 border border-roman-gold/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="h-px w-full bg-linear-to-r from-transparent via-roman-gold/50 to-transparent" />
            <div className="px-8 py-8">
              <h2 className="text-roman-gold font-serif text-2xl font-bold mb-6 tracking-wide">Edit Student</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Roman Nickname</label>
                  <input
                    type="text"
                    value={editRomanNickname}
                    onChange={(e) => setEditRomanNickname(e.target.value)}
                    placeholder="e.g. The Brave"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Age</label>
                  <input
                    type="number"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    placeholder="e.g. 10"
                    min={5}
                    max={18}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Year *</label>
                  <select
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  >
                    <option value="">Select year...</option>
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {editError && (
                  <p className="text-red-400 text-sm">{editError}</p>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => {
                    if (editSaving) return;
                    setShowEditStudentModal(false);
                    setSelectedStudentForEdit(null);
                    setEditError("");
                  }}
                  className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSubmitEditStudent()}
                  disabled={editSaving}
                  className="flex-1 py-3 rounded-xl bg-roman-gold text-stone-950 font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="relative bg-stone-900 border border-roman-gold/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="h-px w-full bg-linear-to-r from-transparent via-roman-gold/50 to-transparent" />
            <div className="px-8 py-8">
              <h2 className="text-roman-gold font-serif text-2xl font-bold mb-6 tracking-wide">Add Student</h2>

              <div className="space-y-4">
                {/* Profile photo picker */}
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => formPhotoRef.current?.click()}
                    className="w-20 h-20 rounded-full border-2 border-dashed border-roman-gold/40 hover:border-roman-gold/70 bg-stone-800 flex items-center justify-center overflow-hidden transition-colors group"
                  >
                    {formPhotoPreview
                      ? <img src={formPhotoPreview} alt="preview" className="w-full h-full object-cover" />
                      : <img src="/warrior.png" alt="Warrior" className="w-full h-full object-cover opacity-60" />
                    }
                  </button>
                  <span className="text-stone-500 text-xs">{formPhotoPreview ? "Click to change photo" : "Add photo (optional)"}</span>
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
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Roman Nickname</label>
                  <input
                    type="text"
                    value={formRomanNickname}
                    onChange={(e) => setFormRomanNickname(e.target.value)}
                    placeholder="e.g. The Brave"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Age</label>
                  <input
                    type="number"
                    value={formAge}
                    onChange={(e) => setFormAge(e.target.value)}
                    placeholder="e.g. 10"
                    min={5}
                    max={18}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Year</label>
                  <select
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  >
                    <option value="">Select year...</option>
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {formError && (
                  <p className="text-red-400 text-sm">{formError}</p>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => { setShowAddModal(false); setFormError(""); setFormRomanNickname(""); setFormPhoto(null); setFormPhotoPreview(null); }}
                  className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStudent}
                  disabled={formSaving}
                  className="flex-1 py-3 rounded-xl bg-roman-gold text-stone-950 font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Add Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm" onClick={() => setShowAddClassModal(false)} />
          <div className="relative bg-stone-900 border border-roman-gold/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
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
