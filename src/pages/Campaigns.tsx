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
  addStudentToClass,
  updateUserPhoto,
} from "../lib/firestore";
import type { AppUser, Class, Result } from "../types";

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formAge, setFormAge] = useState("");
  const [formClassId, setFormClassId] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formPhoto, setFormPhoto] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const formPhotoRef = useRef<HTMLInputElement>(null);

  async function handleAddStudent() {
    if (!appUser || !formName.trim() || !formClassId) {
      setFormError("Please fill in name and select a class.");
      return;
    }
    setFormSaving(true);
    setFormError("");
    try {
      const newUid = crypto.randomUUID();
      const newUser: AppUser = {
        uid: newUid,
        email: "",
        displayName: formName.trim(),
        role: "student",
        schoolId: appUser.schoolId,
        classId: formClassId,
        age: formAge ? parseInt(formAge) : undefined,
        createdAt: Date.now(),
      };
      await createUserDoc(newUser);
      await addStudentToClass(formClassId, newUid);
      if (formPhoto) {
        await updateUserPhoto(newUid, formPhoto);
      }
      setFormName("");
      setFormAge("");
      setFormClassId("");
      setFormPhoto(null);
      setFormPhotoPreview(null);
      setShowAddModal(false);
      // Reload data
      loadData();
    } catch (err) {
      console.error(err);
      setFormError("Failed to add student. Try again.");
    } finally {
      setFormSaving(false);
    }
  }

  useEffect(() => {
    if (!appUser) return;
    loadData();
  }, [appUser]);

  async function loadData() {
      setLoading(true);
      
      // Load all classes in the school if schoolId exists, otherwise just teacher's classes
      const teacherClasses = appUser!.schoolId 
        ? await getClassesBySchool(appUser!.schoolId)
        : await getClassesByTeacher(appUser!.uid);

      setClasses(teacherClasses);
      if (!formClassId && teacherClasses.length > 0) {
        setFormClassId(teacherClasses[0].id);
      }

      const allStudentIds = teacherClasses.flatMap((c) => c.studentIds);
      const uniqueIds = [...new Set(allStudentIds)];
      const [users, ...resultArrays] = await Promise.all([
        getUsersByIds(uniqueIds),
        ...teacherClasses.map((c) => getResultsByClass(c.id)),
      ]);

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
            age: user?.age ?? null,
            photoUrl: user?.photoUrl,
            className: cls.name,
            totalMiles,
            ...getCampaignInfo(totalMiles),
          });
        }
      }

      rows.sort((a, b) => b.campaignNumber - a.campaignNumber);

      setStudents(rows);
      setLoading(false);
  }

  const filtered = students;

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col">
      <Navbar />

      <div className="flex-1 w-full px-14 py-14">

        {loading ? (
          <CampaignsTableSkeleton />
        ) : filtered.length === 0 ? (
          <div className="text-center text-stone-500 py-20">
            <p className="text-lg mb-2">No students found</p>
            <p className="text-sm">Add students to your classes to see their progress here.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-700/50 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-800/80 border-b border-stone-700/50">
                  <th className="pl-8 pr-8 py-5 text-base uppercase tracking-wider text-stone-400 font-semibold">Name</th>
                  <th className="px-8 py-5 text-base uppercase tracking-wider text-stone-400 font-semibold w-24">Age</th>
                  <th className="px-8 py-5 text-base uppercase tracking-wider text-stone-400 font-semibold w-40">Class</th>
                  <th className="px-8 py-5 text-base uppercase tracking-wider text-stone-400 font-semibold w-32">Miles</th>
                  <th className="px-8 py-5 text-base uppercase tracking-wider text-stone-400 font-semibold w-44">Campaign</th>
                  <th className="px-8 py-5 text-base uppercase tracking-wider text-stone-400 font-semibold w-96">Progress</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={`${s.uid}-${s.className}`}
                    onClick={() => navigate(`/campaigns/${s.uid}`)}
                    className="border-b border-stone-800/50 hover:bg-stone-800/40 cursor-pointer transition-colors"
                  >
                    <td className="pl-8 pr-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full border border-roman-gold/20 overflow-hidden bg-stone-800 flex items-center justify-center shrink-0">
                          {s.photoUrl
                            ? <img src={s.photoUrl} alt={s.name} className="w-full h-full object-cover" />
                            : <span className="text-stone-600 text-sm">🛡</span>
                          }
                        </div>
                        <span className="font-medium text-stone-100 text-lg">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-stone-400 text-lg">{s.age ?? "—"}</td>
                    <td className="px-8 py-6">
                      <span className="text-stone-300 text-base">
                        {s.className}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-roman-gold font-bold text-lg">{s.campaignNumber}</span>
                      <span className="text-stone-500 text-base ml-1">mi</span>
                    </td>
                    <td className="px-8 py-6">
                      <div>
                        <span className="text-roman-gold/60 text-sm font-mono">#{s.campaignNumber}</span>
                        <span className="text-stone-300 text-base ml-2">{s.campaignName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2">
                        {/* Overall miles progress */}
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-4 rounded-full bg-stone-700/70 overflow-hidden border border-stone-600/30">
                            <div
                              className="h-full bg-linear-to-r from-roman-gold/60 to-roman-gold rounded-full transition-all duration-500"
                              style={{ width: `${s.campaignProgress}%` }}
                            />
                          </div>
                          <span className="text-roman-gold/80 text-base font-mono w-12 text-right">
                            {s.campaignProgress}%
                          </span>
                        </div>
                        {/* Campaign count progress */}
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-2 rounded-full bg-stone-700/50 overflow-hidden border border-stone-600/20">
                            <div
                              className="h-full bg-linear-to-r from-roman-red/60 to-roman-red rounded-full transition-all duration-500"
                              style={{ width: `${Math.round((s.campaignNumber / CAMPAIGNS.length) * 100)}%` }}
                            />
                          </div>
                          <span className="text-stone-500 text-xs font-mono w-12 text-right">
                            {s.campaignNumber}/{CAMPAIGNS.length}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length < 40 && (
                  <tr className="border-b border-stone-800/50 hover:bg-stone-800/60 transition-colors cursor-pointer">
                    <td colSpan={6} className="px-8 py-6 text-center">
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center justify-center gap-2 w-full text-roman-gold/60 hover:text-roman-gold transition-colors"
                      >
                        <span className="text-2xl">+</span>
                        <span className="text-base uppercase tracking-wider font-semibold">Add Student</span>
                        <span className="text-stone-500 text-sm">({filtered.length}/40)</span>
                      </button>
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
      </div>

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
                      : <span className="text-3xl text-stone-600 group-hover:text-stone-400 transition-colors">🛡</span>
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
                  <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Class</label>
                  <select
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 focus:outline-none focus:border-roman-gold/60 transition-colors"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {formError && (
                  <p className="text-red-400 text-sm">{formError}</p>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => { setShowAddModal(false); setFormError(""); setFormPhoto(null); setFormPhotoPreview(null); }}
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
    </div>
  );
}
