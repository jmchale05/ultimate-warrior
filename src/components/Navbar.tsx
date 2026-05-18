import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getSchoolById } from "../lib/firestore";
import type { School } from "../types";
import TeacherSupportModal from "./TeacherSupportModal";

function calculateBusinessDays(startTimestamp: number): number {
  const start = new Date(startTimestamp);
  const today = new Date();
  
  // Set to start of day for accurate comparison
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  let count = 0;
  const current = new Date(start);
  
  while (current <= today) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

export default function Navbar() {
  const { appUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [showSupport, setShowSupport] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [school, setSchool] = useState<School | null>(null);

  useEffect(() => {
    if (appUser?.schoolId) {
      getSchoolById(appUser.schoolId).then(setSchool);
    }
  }, [appUser]);

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true, state: { loggedOut: true } });
  }

  const campaignStart = school?.campaignStartAt ?? school?.createdAt ?? appUser?.createdAt;
  const dayCount = campaignStart ? calculateBusinessDays(campaignStart) : 0;

  return (
    <>
    <header className="sticky top-0 z-50 bg-linear-to-r from-stone-950 via-stone-900 to-stone-950 border-b border-roman-gold/40 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
      {/* Top gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-roman-gold to-transparent" />

      <div className="w-full flex items-stretch">
        {/* Left — Logo & Title */}
        <div className="flex items-center gap-4 flex-1">
          <img
            src="/logonew.jpeg"
            alt="Ultimate Warrior"
            className="w-32 self-stretch object-cover"
          />
          <div>
            <h1 className="text-roman-gold font-bold text-2xl tracking-widest uppercase font-serif leading-tight roman-glow">
              The Ultimate Warrior Challenges
            </h1>
            <p className="text-roman-gold/30 text-xs tracking-[0.3em] uppercase font-serif">
              ✦ Strength & Honour ✦
            </p>
          </div>
        </div>

        {/* Center — School info */}
        <div className="flex-1 flex justify-center items-center">
          {school && (
            <div className="flex items-center gap-4 bg-stone-900/80 px-5 py-2.5 border border-roman-gold/20 rounded-full shadow-inner">
              <img
                src={school.logoUrl ?? "/warriorschool.png"}
                alt={school.name}
                className="w-12 h-12 rounded-full object-cover border border-roman-gold/30"
              />
              <div className="w-px h-8 bg-roman-gold/20" />
              <div className="leading-tight">
                <div className="text-stone-300 text-lg tracking-wide font-semibold">
                  {school.name}
                </div>
                <div className="text-roman-gold/70 text-[11px] uppercase tracking-wider font-semibold mt-0.5">
                  {school.schoolType ?? "School Type Not Set"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right — User info & Sign Out */}
        <div className="flex-1 flex justify-end pr-8">
          {appUser && (
            <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="whitespace-nowrap text-roman-gold font-semibold text-lg tracking-wide">
                {appUser.suffix ? `${appUser.suffix}. ${appUser.displayName.split(" ").pop()}` : appUser.displayName}
              </div>
              <span className="text-xs bg-roman-gold/15 text-roman-gold/80 px-2 py-0.5 rounded-sm uppercase tracking-widest font-semibold border border-roman-gold/20">
                {appUser.role}
              </span>
            </div>
            <div className="w-px h-10 bg-roman-gold/20" />
            {appUser.role !== "admin" && (
              <>
                <div className="flex items-center gap-2 px-4 py-2 bg-roman-gold/10 border border-roman-gold/30 rounded-lg">
                  <div className="text-right">
                    <div className="text-roman-gold/60 text-xs uppercase tracking-[0.2em] font-semibold">
                      Campaign
                    </div>
                    <div className="text-roman-gold font-bold text-xl tracking-wide font-serif">
                      Day {dayCount}
                    </div>
                  </div>
                  <div className="w-px h-8 bg-roman-gold/30" />
                  <div className="text-left">
                    <div className="text-roman-gold/40 text-xs uppercase tracking-[0.2em] font-semibold">
                      of 200
                    </div>
                    <div className="text-roman-gold/50 text-sm font-semibold">
                      {Math.min(100, Math.round((dayCount / 200) * 100))}%
                    </div>
                  </div>
                </div>
                <div className="w-px h-10 bg-roman-gold/20" />
              </>
            )}
            <button
              onClick={() => setShowSignOutConfirm(true)}
              className="text-roman-gold border border-roman-gold/40 hover:border-roman-gold/70 bg-stone-900/40 px-5 py-2.5 rounded-lg transition-colors hover:bg-roman-gold/10 uppercase tracking-wide font-semibold text-sm"
            >
              Sign Out
            </button>
            {appUser.role === "teacher" && (
              <button
                onClick={() => setShowSupport(true)}
                title="Support"
                className="w-8 h-8 rounded-full text-roman-gold/40 hover:text-roman-gold transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <circle cx="12" cy="17" r=".5" fill="currentColor" stroke="none" />
                </svg>
              </button>
            )}
          </div>
          )}
        </div>
      </div>
    </header>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm"
            onClick={() => setShowSignOutConfirm(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-roman-gold/20 bg-stone-900 shadow-2xl overflow-hidden">
            <div className="h-px w-full bg-linear-to-r from-transparent via-roman-gold/50 to-transparent" />
            <div className="px-8 py-8">
              <h2 className="text-roman-gold font-serif text-2xl font-bold mb-3 tracking-wide">Confirm Sign Out</h2>
              <p className="text-stone-400 text-sm leading-relaxed">
                Are you sure you want to sign out?
              </p>

              <div className="mt-7 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 py-3 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSignOutConfirm(false);
                    void handleSignOut();
                  }}
                  className="flex-1 py-3 rounded-xl bg-roman-gold text-stone-950 font-semibold hover:brightness-110 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSupport && (
        <TeacherSupportModal
          onClose={() => setShowSupport(false)}
          onOpenTerms={() => {
            setShowSupport(false);
            navigate("/terms");
          }}
        />
      )}
    </>
  );
}
