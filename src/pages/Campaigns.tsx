import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import {
  getClassesByTeacher,
  getUsersByIds,
  getResultsByClass,
} from "../lib/firestore";
import type { AppUser, Result } from "../types";

const CAMPAIGNS = [
  { number: 1, name: "The Beginning",   minMiles: 0  },
  { number: 2, name: "The Foundations", minMiles: 5  },
  { number: 3, name: "The Emperor",     minMiles: 10 },
  { number: 4, name: "The Legion",      minMiles: 15 },
  { number: 5, name: "The Empire",      minMiles: 20 },
  { number: 6, name: "The Hero",        minMiles: 25 },
  { number: 7, name: "The Gladiator",   minMiles: 30 },
  { number: 8, name: "The Fall of Rome",minMiles: 35 },
];

function getCampaignInfo(miles: number) {
  const step = 5;
  const idx = Math.min(CAMPAIGNS.length - 1, Math.floor(miles / step));
  const c = CAMPAIGNS[idx];
  const isComplete = miles >= CAMPAIGNS.length * step;
  const progress = isComplete
    ? 100
    : Math.min(100, Math.round(((miles - c.minMiles) / step) * 100));
  return { campaignNumber: c.number, campaignName: c.name, campaignProgress: progress };
}

interface StudentRow {
  uid: string;
  name: string;
  age: number | null;
  className: string;
  totalMiles: number;
  campaignNumber: number;
  campaignName: string;
  campaignProgress: number;
}

const SAMPLE_STUDENTS: StudentRow[] = [
  { uid: "s01", name: "Oliver Bennett",     age: 10, className: "Y5 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s02", name: "Amelia Clarke",      age: 10, className: "Y5 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s03", name: "Harry Thompson",     age: 10, className: "Y5 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s04", name: "Isla Robinson",      age: 10, className: "Y5 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s05", name: "George Wright",      age: 10, className: "Y5 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s06", name: "Poppy Davies",       age: 11, className: "Y6 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s07", name: "Jack Evans",         age: 11, className: "Y6 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s08", name: "Sophia Walker",      age: 11, className: "Y6 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s09", name: "Noah Harris",        age: 11, className: "Y6 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s10", name: "Emily Taylor",       age: 10, className: "Y5 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s11", name: "Charlie Wilson",     age: 11, className: "Y6 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s12", name: "Freya Martin",       age: 10, className: "Y5 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s13", name: "Alfie Jackson",      age: 10, className: "Y5 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s14", name: "Grace White",        age: 11, className: "Y6 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s15", name: "Archie Moore",       age: 10, className: "Y5 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s16", name: "Lily Anderson",      age: 11, className: "Y6 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s17", name: "Oscar Thomas",       age: 11, className: "Y6 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s18", name: "Mia Hughes",         age: 10, className: "Y5 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s19", name: "William Scott",      age: 11, className: "Y6 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s20", name: "Ava Green",          age: 10, className: "Y5 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s21", name: "James Hall",         age: 11, className: "Y6 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s22", name: "Ella Young",         age: 10, className: "Y5 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s23", name: "Logan King",         age: 11, className: "Y6 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s24", name: "Isabelle Baker",     age: 10, className: "Y5 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s25", name: "Mason Mitchell",     age: 10, className: "Y5 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s26", name: "Chloe Turner",       age: 10, className: "Y5 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s27", name: "Lucas Phillips",     age: 11, className: "Y6 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s28", name: "Evie Campbell",      age: 11, className: "Y6 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s29", name: "Ethan Parker",       age: 10, className: "Y5 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s30", name: "Rosie Edwards",      age: 10, className: "Y5 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s31", name: "Samuel Collins",     age: 11, className: "Y6 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s32", name: "Daisy Stewart",      age: 11, className: "Y6 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s33", name: "Sebastian Morris",   age: 10, className: "Y5 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s34", name: "Phoebe Rogers",      age: 10, className: "Y5 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s35", name: "Toby Reed",          age: 11, className: "Y6 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s36", name: "Hannah Cook",        age: 11, className: "Y6 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s37", name: "Finley Morgan",      age: 10, className: "Y5 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s38", name: "Millie Bell",        age: 10, className: "Y5 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s39", name: "Reuben Murphy",      age: 11, className: "Y6 - Class 2", totalMiles: 0,  ...getCampaignInfo(0)  },
  { uid: "s40", name: "Imogen Bailey",      age: 11, className: "Y6 - Class 1", totalMiles: 0,  ...getCampaignInfo(0)  },
];

export default function Campaigns() {
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentRow[]>(SAMPLE_STUDENTS);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);

  useEffect(() => {
    if (!appUser) return;

    async function loadData() {
      setLoading(true);
      const teacherClasses = await getClassesByTeacher(appUser!.uid);

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
            name: user?.displayName || "Unknown",
            age: user?.age ?? null,
            className: cls.name,
            totalMiles,
            ...getCampaignInfo(totalMiles),
          });
        }
      }

      rows.sort((a, b) => b.totalMiles - a.totalMiles);

      if (rows.length > 0) {
        setStudents(rows);
      }
      // else keep sample data + sample classes already in state
      setLoading(false);
    }

    loadData();
  }, [appUser]);

  const filtered = students;

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col">
      <Navbar />

      <div className="flex-1 w-full px-14 py-14">

        {loading ? (
          <div className="text-center text-roman-gold animate-pulse py-20 text-lg">
            ⚔️ Summoning the legion...
          </div>
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
                  <th className="px-8 py-5 text-base uppercase tracking-wider text-stone-400 font-semibold">Name</th>
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
                    onClick={() => setSelectedStudent(s)}
                    className="border-b border-stone-800/50 hover:bg-stone-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-8 py-6 font-medium text-stone-100 text-lg">{s.name}</td>
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
                    </td>
                  </tr>
                ))}
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

      {/* Campaign confirmation dialog */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{animation: 'fadeIn 0.2s ease'}}>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          `}</style>
          <div
            className="absolute inset-0 bg-stone-950/90 backdrop-blur-md"
            onClick={() => setSelectedStudent(null)}
          />
          <div className="relative bg-gradient-to-b from-stone-900 to-stone-950 border border-roman-gold/20 rounded-2xl max-w-2xl w-full shadow-[0_0_60px_rgba(0,0,0,0.6)] overflow-hidden" style={{animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both'}}>
            {/* Decorative top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-roman-gold/60 to-transparent" />

            <div className="px-16 pt-14 pb-12 text-center">
              {/* Mars image */}
              <div className="mx-auto mb-7 w-36 h-36 rounded-full border-2 border-roman-gold overflow-hidden">
                <img src="/mars.png" alt="Mars" className="w-full h-full object-cover" />
              </div>

              <p className="text-roman-gold/50 uppercase tracking-[0.25em] text-xs font-medium mb-3">
                Campaign {selectedStudent.campaignNumber} · {selectedStudent.campaignName}
              </p>

              <h3 className="text-stone-100 font-serif text-4xl font-bold leading-snug mb-3">
                Are you ready to begin,<br />{selectedStudent.name}?
              </h3>

              <p className="text-stone-500 text-lg mb-10">
                Mars, the God of War, awaits your courage.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="flex-1 py-4 rounded-xl border border-stone-700/60 text-stone-400 text-lg hover:border-roman-gold hover:text-roman-gold hover:bg-stone-800/30 transition-all active:scale-95 cursor-pointer"
                >
                  Not yet
                </button>
                <button
                  onClick={() => { setSelectedStudent(null); navigate('/the-beginning'); }}
                  className="flex-1 py-4 rounded-xl bg-roman-gold text-stone-950 font-semibold text-lg hover:brightness-110 hover:shadow-lg hover:shadow-roman-gold/40 transition-all active:scale-95 cursor-pointer"
                >
                  Begin Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
