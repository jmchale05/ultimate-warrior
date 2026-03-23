import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { FullPageLoader } from "../components/LoadingSpinner";
import {
  getAllSchools,
  getAllUsers,
  getAllResults,
  getClassesBySchool,
  createSchool,
  createUserDoc,
  addStudentToClass,
} from "../lib/firestore";
import type { AppUser, Class, Result, School } from "../types";

const TOTAL_MILES = 78;

interface SchoolStats {
  school: School;
  classes: Class[];
  teachers: AppUser[];
  students: AppUser[];
  totalMiles: number;
  avgMiles: number;
  completedStudents: number; // reached 78 mi
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [schoolStats, setSchoolStats] = useState<SchoolStats[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [allResults, setAllResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);

  // Add School modal
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolSaving, setSchoolSaving] = useState(false);
  const [schoolError, setSchoolError] = useState("");

  // Add Student modal
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentAge, setStudentAge] = useState("");
  const [studentSchoolId, setStudentSchoolId] = useState("");
  const [studentClassId, setStudentClassId] = useState("");
  const [studentSaving, setStudentSaving] = useState(false);
  const [studentError, setStudentError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [schools, users, results] = await Promise.all([
      getAllSchools(),
      getAllUsers(),
      getAllResults(),
    ]);

    setAllUsers(users);
    setAllResults(results);

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
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAddSchool() {
    if (!schoolName.trim()) { setSchoolError("School name is required."); return; }
    setSchoolSaving(true);
    setSchoolError("");
    try {
      await createSchool(schoolName.trim(), schoolAddress.trim() || undefined);
      setSchoolName(""); setSchoolAddress("");
      setShowAddSchool(false);
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

    const schoolStat = schoolStats.find((s) => s.school.id === studentSchoolId);
    let classId = studentClassId;

    // If no classes exist yet for this school, create a default one
    if (!classId) {
      if (!schoolStat || schoolStat.classes.length === 0) {
        setStudentError("This school has no classes. Create a class first.");
        return;
      }
      classId = schoolStat.classes[0].id;
    }

    setStudentSaving(true);
    setStudentError("");
    try {
      const newUid = crypto.randomUUID();
      const newUser: AppUser = {
        uid: newUid,
        email: "",
        displayName: studentName.trim(),
        role: "student",
        schoolId: studentSchoolId,
        classId,
        age: studentAge ? parseInt(studentAge) : undefined,
        createdAt: Date.now(),
      };
      await createUserDoc(newUser);
      await addStudentToClass(classId, newUid);
      setStudentName(""); setStudentAge(""); setStudentSchoolId(""); setStudentClassId("");
      setShowAddStudent(false);
      await loadData();
    } catch {
      setStudentError("Failed to add student. Try again.");
    } finally {
      setStudentSaving(false);
    }
  }

  if (loading) return <FullPageLoader message="Loading admin data..." />;

  const totalStudents = allUsers.filter((u) => u.role === "student").length;
  const totalTeachers = allUsers.filter((u) => u.role === "teacher").length;
  const totalMilesAll = allResults.reduce((s, r) => s + r.distanceMiles, 0);
  const totalSchools = schoolStats.length;

  const selected = selectedSchool
    ? schoolStats.find((s) => s.school.id === selectedSchool) ?? null
    : null;

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col">
      <Navbar />

      <div className="flex-1 w-full px-14 py-10">
        {/* Global stat cards */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: "Schools", value: totalSchools, icon: "🏛" },
            { label: "Teachers", value: totalTeachers, icon: "⚔" },
            { label: "Students", value: totalStudents, icon: "🛡" },
            { label: "Total Miles", value: totalMilesAll.toFixed(1), icon: "🏃" },
          ].map(({ label, value, icon }) => (
            <div
              key={label}
              className="roman-card rounded-lg px-4 py-3 flex items-center gap-3"
            >
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-roman-gold font-serif text-xl font-bold leading-tight">{value}</p>
                <p className="text-stone-500 text-[10px] uppercase tracking-widest font-semibold">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Schools table */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-roman-gold/70 text-xs uppercase tracking-[0.2em] font-semibold">
              Schools
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddStudent(true); setStudentError(""); }}
                className="px-3 py-1.5 rounded-lg border border-roman-gold/40 text-roman-gold text-xs uppercase tracking-wider font-semibold hover:bg-roman-gold/10 transition-colors"
              >
                + Add Student
              </button>
              <button
                onClick={() => { setShowAddSchool(true); setSchoolError(""); }}
                className="px-3 py-1.5 rounded-lg bg-roman-gold/20 border border-roman-gold/50 text-roman-gold text-xs uppercase tracking-wider font-semibold hover:bg-roman-gold/30 transition-colors"
              >
                + Add School
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-stone-700/50 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-800/80 border-b border-stone-700/50">
                  <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold">School</th>
                  <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-24">Classes</th>
                  <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-28">Teachers</th>
                  <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-28">Students</th>
                  <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-32">Total Miles</th>
                  <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-32">Avg Miles</th>
                  <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-32">Completed</th>
                  <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-40">Overall</th>
                </tr>
              </thead>
              <tbody>
                {schoolStats.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-stone-500">
                      No schools found.
                    </td>
                  </tr>
                ) : (
                  schoolStats.map((s) => {
                    const overallPct = Math.min(
                      100,
                      Math.round((s.totalMiles / Math.max(1, s.students.length * TOTAL_MILES)) * 100)
                    );
                    return (
                      <tr
                        key={s.school.id}
                        onClick={() =>
                          setSelectedSchool(
                            selectedSchool === s.school.id ? null : s.school.id
                          )
                        }
                        className={`border-b border-stone-800/50 cursor-pointer transition-colors ${
                          selectedSchool === s.school.id
                            ? "bg-roman-gold/5"
                            : "hover:bg-stone-800/40"
                        }`}
                      >
                        <td className="px-6 py-5 font-medium text-stone-100">
                          {s.school.name}
                          {s.school.address && (
                            <p className="text-stone-500 text-xs mt-0.5">{s.school.address}</p>
                          )}
                        </td>
                        <td className="px-6 py-5 text-stone-300">{s.classes.length}</td>
                        <td className="px-6 py-5 text-stone-300">{s.teachers.length}</td>
                        <td className="px-6 py-5 text-stone-300">{s.students.length}</td>
                        <td className="px-6 py-5 text-roman-gold font-bold">{s.totalMiles.toFixed(1)}</td>
                        <td className="px-6 py-5 text-stone-300">{s.avgMiles.toFixed(1)}</td>
                        <td className="px-6 py-5">
                          <span className="text-roman-gold font-semibold">{s.completedStudents}</span>
                          <span className="text-stone-500 text-xs ml-1">/ {s.students.length}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 rounded-full bg-stone-700/60 overflow-hidden">
                              <div
                                className="h-full bg-linear-to-r from-roman-gold/60 to-roman-gold rounded-full transition-all duration-500"
                                style={{ width: `${overallPct}%` }}
                              />
                            </div>
                            <span className="text-stone-400 text-xs font-mono w-8 text-right">{overallPct}%</span>
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

        {/* Selected school drill-down */}
        {selected && (
          <div>
            <h2 className="text-roman-gold/70 text-xs uppercase tracking-[0.2em] font-semibold mb-4">
              {selected.school.name} — Classes
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-10">
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
                    className="roman-card rounded-xl px-6 py-5 cursor-pointer hover:border-roman-gold/40 transition-colors"
                    onClick={() => navigate("/campaigns")}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-stone-100 font-semibold text-base">{cls.name}</p>
                        <p className="text-stone-500 text-xs mt-0.5">
                          {teacher ? `Teacher: ${teacher.displayName}` : "No teacher assigned"}
                        </p>
                      </div>
                      <span className="text-roman-gold font-bold text-lg">{clsMiles.toFixed(1)} mi</span>
                    </div>
                    <div className="flex gap-4 text-sm text-stone-400">
                      <span>{clsStudents.length} students</span>
                    </div>
                  </div>
                );
              })}
              {selected.classes.length === 0 && (
                <p className="text-stone-500 col-span-2">No classes for this school.</p>
              )}
            </div>

            {/* Students table for selected school */}
            <h2 className="text-roman-gold/70 text-xs uppercase tracking-[0.2em] font-semibold mb-4">
              {selected.school.name} — Students
            </h2>
            <div className="rounded-xl border border-stone-700/50 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-800/80 border-b border-stone-700/50">
                    <th className="pl-6 pr-2 py-4 w-14" />
                    <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold">Name</th>
                    <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-24">Age</th>
                    <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-36">Class</th>
                    <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-32">Miles</th>
                    <th className="px-6 py-4 text-sm uppercase tracking-wider text-stone-400 font-semibold w-48">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.students
                    .map((u) => {
                      const miles = allResults
                        .filter((r) => r.studentId === u.uid)
                        .reduce((s, r) => s + r.distanceMiles, 0);
                      const cls = selected.classes.find((c) => c.studentIds.includes(u.uid));
                      return { user: u, miles, className: cls?.name ?? "—" };
                    })
                    .sort((a, b) => b.miles - a.miles)
                    .map(({ user, miles, className }) => {
                      const pct = Math.min(100, Math.round((miles / TOTAL_MILES) * 100));
                      return (
                        <tr
                          key={user.uid}
                          onClick={() => navigate(`/campaigns/${user.uid}`)}
                          className="border-b border-stone-800/50 hover:bg-stone-800/40 cursor-pointer transition-colors"
                        >
                          <td className="pl-6 pr-2 py-4">
                            <div className="w-9 h-9 rounded-full border border-roman-gold/20 overflow-hidden bg-stone-800 flex items-center justify-center shrink-0">
                              {user.photoUrl
                                ? <img src={user.photoUrl} alt={user.displayName} className="w-full h-full object-cover" />
                                : <span className="text-stone-600 text-sm">🛡</span>
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-stone-100">{user.displayName}</td>
                          <td className="px-6 py-4 text-stone-400">{user.age ?? "—"}</td>
                          <td className="px-6 py-4 text-stone-300">{className}</td>
                          <td className="px-6 py-4 text-roman-gold font-bold">{miles.toFixed(1)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 rounded-full bg-stone-700/60 overflow-hidden">
                                <div
                                  className="h-full bg-linear-to-r from-roman-gold/60 to-roman-gold rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-stone-400 text-xs font-mono w-8 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {selected.students.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-stone-500">
                        No students in this school.
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
                    <label className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Class *</label>
                    <select
                      value={studentClassId}
                      onChange={(e) => setStudentClassId(e.target.value)}
                      className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 focus:outline-none focus:border-roman-gold/60 transition-colors"
                    >
                      <option value="">Select class...</option>
                      {(schoolStats.find((s) => s.school.id === studentSchoolId)?.classes ?? []).map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {studentError && <p className="text-red-400 text-sm">{studentError}</p>}
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => { setShowAddStudent(false); setStudentError(""); }}
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
    </div>
  );
}
