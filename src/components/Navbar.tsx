import { useState, useEffect, useRef } from "react";
import { updateProfile } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getSchoolById, updateOwnUserProfile } from "../lib/firestore";
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
  const { appUser, currentUser, signOut, refreshAppUser } = useAuth();
  const navigate = useNavigate();
  const [showSupport, setShowSupport] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editSuffix, setEditSuffix] = useState("Mr");
  const [editRomanNickname, setEditRomanNickname] = useState("");
  const [editProfileSaving, setEditProfileSaving] = useState(false);
  const [editProfileError, setEditProfileError] = useState("");
  const [school, setSchool] = useState<School | null>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (appUser?.schoolId) {
      getSchoolById(appUser.schoolId).then(setSchool);
    }
  }, [appUser]);

  useEffect(() => {
    if (!showAccountMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [showAccountMenu]);

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true, state: { loggedOut: true } });
  }

  function openEditProfile() {
    if (!appUser) return;
    setEditDisplayName(appUser.displayName);
    setEditSuffix(appUser.suffix || "Mr");
    setEditRomanNickname(appUser.romanNickname || "");
    setEditProfileError("");
    setShowAccountMenu(false);
    setShowEditProfile(true);
  }

  async function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!appUser || !currentUser) return;

    const trimmedName = editDisplayName.trim();
    if (!trimmedName) {
      setEditProfileError("Name is required.");
      return;
    }

    setEditProfileSaving(true);
    setEditProfileError("");
    try {
      await updateOwnUserProfile(appUser.uid, {
        displayName: trimmedName,
        suffix: appUser.role === "teacher" ? editSuffix : undefined,
        romanNickname: appUser.role === "student" ? editRomanNickname : undefined,
      });
      await updateProfile(currentUser, { displayName: trimmedName });
      await refreshAppUser();
      setShowEditProfile(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setEditProfileError("Could not save profile. Please try again.");
    } finally {
      setEditProfileSaving(false);
    }
  }

  const campaignStart = school?.campaignStartAt ?? school?.createdAt ?? appUser?.createdAt;
  const dayCount = campaignStart ? calculateBusinessDays(campaignStart) : 0;

  return (
    <>
    <header className="sticky top-0 z-50 bg-linear-to-r from-stone-950 via-stone-900 to-stone-950 border-b border-roman-gold/40 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
      {/* Top gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-roman-gold to-transparent" />

      <div className="relative w-full flex items-stretch min-h-[4.5rem]">
        {/* Left — Logo & Title */}
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (!appUser) return;
              navigate(appUser.role === "admin" ? "/admin" : appUser.role === "student" ? `/campaigns/${appUser.uid}` : "/campaigns");
            }}
            className="self-stretch"
            aria-label="Home"
          >
            <img
              src="/logo-new.png"
              alt="Ultimate Warrior"
              className="w-20 md:w-32 h-full object-cover"
            />
          </button>
          <div className="min-w-0 hidden lg:block">
            <h1 className="text-roman-gold font-bold text-lg md:text-2xl tracking-widest uppercase font-serif leading-tight roman-glow truncate">
              The Ultimate Warrior Challenges
            </h1>
            <p className="text-roman-gold/30 text-xs tracking-[0.3em] uppercase font-serif">
              ✦ Strength & Honour ✦
            </p>
          </div>
        </div>

        {/* Center — School info */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-24 lg:pointer-events-auto lg:static lg:inset-auto lg:z-auto lg:flex-1 lg:px-0">
          {school && (
            <>
              <p className="lg:hidden max-w-full truncate text-center text-stone-200 text-sm font-semibold tracking-wide">
                {school.name}
              </p>
              <div className="hidden lg:flex items-center gap-4 bg-stone-900/80 px-5 py-2.5 border border-roman-gold/20 rounded-full shadow-inner">
                {school.logoUrl && (
                  <>
                    <img
                      src={school.logoUrl}
                      alt={school.name}
                      className="w-12 h-12 rounded-full object-cover border border-roman-gold/30"
                    />
                    <div className="w-px h-8 bg-roman-gold/20" />
                  </>
                )}
                <div className="leading-tight">
                  <div className="text-stone-300 text-lg tracking-wide font-semibold">
                    {school.name}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right — User info & Sign Out */}
        <div className="flex-1 flex justify-end pr-2 sm:pr-3 md:pr-8 min-w-0">
          {appUser && (
            <div className="flex items-center gap-2 sm:gap-3 md:gap-5 min-w-0">
            <div className="relative min-w-0" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setShowAccountMenu((open) => !open)}
                className="flex items-center gap-1.5 text-right min-w-0 md:pointer-events-none"
                aria-haspopup="menu"
                aria-expanded={showAccountMenu}
                aria-label="Account menu"
              >
                <div className="min-w-0">
                  <div className="truncate max-w-28 sm:max-w-40 md:max-w-none text-roman-gold font-semibold text-sm md:text-lg tracking-wide">
                    {appUser.suffix ? `${appUser.suffix}. ${appUser.displayName.split(" ").pop()}` : appUser.displayName}
                  </div>
                  <span className="text-[10px] sm:text-xs bg-roman-gold/15 text-roman-gold/80 px-2 py-0.5 rounded-sm uppercase tracking-widest font-semibold border border-roman-gold/20">
                    {appUser.role}
                  </span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-roman-gold/70 shrink-0 md:hidden transition-transform ${showAccountMenu ? "rotate-180" : ""}`} aria-hidden="true">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                </svg>
              </button>
              {showAccountMenu && (
                <div
                  role="menu"
                  className="md:hidden absolute right-0 top-[calc(100%+0.5rem)] z-50 w-44 rounded-xl border border-roman-gold/25 bg-stone-950/95 shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-md overflow-hidden origin-top-right actions-dropdown-in"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={openEditProfile}
                    className="w-full text-left px-4 py-3 text-stone-200 text-sm font-medium hover:bg-roman-gold/10 hover:text-roman-gold"
                  >
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowAccountMenu(false);
                      setShowSignOutConfirm(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-red-400 text-sm font-medium hover:bg-red-500/10 border-t border-stone-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
            <div className="w-px h-10 bg-roman-gold/20 hidden xl:block" />
            {appUser.role !== "admin" && appUser.role !== "student" && (
              <>
                <div className="hidden xl:flex items-center gap-2 px-4 py-2 bg-roman-gold/10 border border-roman-gold/30 rounded-lg">
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
                <div className="hidden xl:block w-px h-10 bg-roman-gold/20" />
              </>
            )}
            <button
              onClick={() => setShowSignOutConfirm(true)}
              className="hidden md:inline-flex shrink-0 text-roman-gold border border-roman-gold/40 hover:border-roman-gold/70 bg-stone-900/40 px-3 md:px-5 py-2 md:py-2.5 rounded-lg transition-colors hover:bg-roman-gold/10 uppercase tracking-wide font-semibold text-xs md:text-sm"
            >
              Sign Out
            </button>
            {appUser.role === "teacher" && (
              <button
                onClick={() => setShowSupport(true)}
                title="Support"
                className="hidden sm:flex w-8 h-8 rounded-full text-roman-gold/40 hover:text-roman-gold transition-colors items-center justify-center"
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

      {showEditProfile && appUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-stone-950/80 backdrop-blur-md"
            onClick={() => {
              if (!editProfileSaving) setShowEditProfile(false);
            }}
          />
          <form
            onSubmit={handleSaveProfile}
            className="relative w-full max-w-sm rounded-2xl border border-roman-gold/30 bg-stone-950 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-[addStudentModalZoomIn_180ms_cubic-bezier(0.16,1,0.3,1)]"
          >
            <div className="h-px w-full bg-linear-to-r from-transparent via-roman-gold/60 to-transparent" />
            <div className="p-6 sm:p-8">
              <h2 className="text-roman-gold font-serif text-2xl font-bold mb-1 tracking-wide">Edit Profile</h2>
              <p className="text-stone-400 text-sm mb-6">Update how your name appears in the app.</p>

              {appUser.role === "teacher" && (
                <label className="block mb-4">
                  <span className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Title</span>
                  <select
                    value={editSuffix}
                    onChange={(e) => setEditSuffix(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 focus:outline-none focus:border-roman-gold/60"
                  >
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Miss">Miss</option>
                    <option value="Ms">Ms</option>
                    <option value="Dr">Dr</option>
                    <option value="Prof">Prof</option>
                  </select>
                </label>
              )}

              <label className="block mb-4">
                <span className="block text-stone-400 text-xs uppercase tracking-widest mb-2">
                  {appUser.role === "teacher" ? "Last Name" : "Name"}
                </span>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 focus:outline-none focus:border-roman-gold/60"
                />
              </label>

              {appUser.role === "student" && (
                <label className="block mb-4">
                  <span className="block text-stone-400 text-xs uppercase tracking-widest mb-2">Roman Nickname</span>
                  <input
                    type="text"
                    value={editRomanNickname}
                    onChange={(e) => setEditRomanNickname(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 focus:outline-none focus:border-roman-gold/60"
                  />
                </label>
              )}

              {editProfileError && <p className="text-red-300 text-sm mb-4">{editProfileError}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={editProfileSaving}
                  onClick={() => setShowEditProfile(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-800 text-stone-300 font-bold text-sm tracking-widest hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editProfileSaving}
                  className="flex-1 py-2.5 rounded-xl bg-roman-gold text-stone-950 font-bold text-sm tracking-widest hover:brightness-110 disabled:opacity-60"
                >
                  {editProfileSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-stone-950/80 backdrop-blur-md transition-opacity"
            onClick={() => setShowSignOutConfirm(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-roman-gold/30 bg-stone-950 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-[addStudentModalZoomIn_180ms_cubic-bezier(0.16,1,0.3,1)]">
            <div className="h-px w-full bg-linear-to-r from-transparent via-roman-gold/60 to-transparent absolute top-0 left-0" />
            
            <div className="p-8 pb-7 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full border border-roman-gold/30 bg-roman-gold/10 flex flex-col items-center justify-center mb-5 text-roman-gold shadow-[0_0_15px_rgba(235,191,90,0.15)]">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 ml-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
              </div>

              <h2 className="text-roman-gold font-serif text-2xl font-bold mb-2 tracking-wide">Sign Out</h2>
              <p className="text-stone-400 text-sm leading-relaxed mb-8 px-2 max-w-65">
                Are you sure you want to end your current session?
              </p>

              <div className="w-full flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-800 text-stone-300 font-bold text-sm tracking-widest hover:bg-stone-800 active:scale-[0.97] transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSignOutConfirm(false);
                    void handleSignOut();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-roman-gold text-stone-950 font-bold text-sm tracking-widest hover:brightness-110 shadow-[0_4px_15px_rgba(235,191,90,0.2)] active:scale-[0.97] transition-all"
                >
                  SIGN OUT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSupport && (
        <TeacherSupportModal
          onClose={() => setShowSupport(false)}
        />
      )}
    </>
  );
}
