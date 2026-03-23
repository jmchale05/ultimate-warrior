import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

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

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const dayCount = appUser ? calculateBusinessDays(appUser.createdAt) : 0;

  return (
    <>
    <header className="sticky top-0 z-50 bg-linear-to-r from-roman-red-dark via-roman-red to-roman-red-dark border-b-2 border-roman-gold shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      {/* Top gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-roman-gold to-transparent" />

      <div className="w-full px-14 py-1 flex items-center">
        {/* Left — Logo & Title */}
        <div className="flex items-center gap-4 flex-1">
          <img
            src="/ultimate-warrior.svg"
            alt="Ultimate Warrior"
            className="w-14 h-14 object-contain"
          />
          <div>
            <h1 className="text-roman-gold font-bold text-lg tracking-widest uppercase font-serif leading-tight roman-glow">
              Ultimate Warrior Challenges
            </h1>
            <p className="text-roman-gold/30 text-[10px] tracking-[0.3em] uppercase font-serif">
              ✦ Strength & Honour ✦
            </p>
          </div>
        </div>

        {/* Center — spacer */}
        <div className="flex-1" />

        {/* Right — User info & Sign Out */}
        <div className="flex-1 flex justify-end">
          {appUser && (
            <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="text-roman-gold font-semibold text-sm tracking-wide">
                Mr. {appUser.displayName.split(" ").pop()}
              </div>
              <span className="text-[10px] bg-roman-gold/15 text-roman-gold/80 px-2 py-0.5 rounded-sm uppercase tracking-widest font-semibold border border-roman-gold/20">
                {appUser.role}
              </span>
            </div>
            <div className="w-px h-8 bg-roman-gold/20" />
            {appUser.role !== "admin" && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-roman-gold/10 border border-roman-gold/30 rounded-lg">
                  <div className="text-right">
                    <div className="text-roman-gold/60 text-[8px] uppercase tracking-[0.2em] font-semibold">
                      Campaign
                    </div>
                    <div className="text-roman-gold font-bold text-base tracking-wide font-serif">
                      Day {dayCount}
                    </div>
                  </div>
                  <div className="w-px h-6 bg-roman-gold/30" />
                  <div className="text-left">
                    <div className="text-roman-gold/40 text-[8px] uppercase tracking-[0.2em] font-semibold">
                      of 200
                    </div>
                    <div className="text-roman-gold/50 text-xs font-semibold">
                      {Math.min(100, Math.round((dayCount / 200) * 100))}%
                    </div>
                  </div>
                </div>
                <div className="w-px h-8 bg-roman-gold/20" />
              </>
            )}
            {appUser.role === "admin" && (
              <>
                <button
                  onClick={() => navigate("/admin")}
                  className="text-roman-gold/60 hover:text-roman-gold border border-roman-gold/25 hover:border-roman-gold/60 px-4 py-2 rounded-lg transition-all hover:bg-roman-gold/5 uppercase tracking-wider font-semibold text-xs"
                >
                  Admin
                </button>
                <div className="w-px h-8 bg-roman-gold/20" />
              </>
            )}
            <button
              onClick={handleSignOut}
              className="text-roman-gold/60 hover:text-roman-gold border border-roman-gold/25 hover:border-roman-gold/60 px-4 py-2 rounded-lg transition-all hover:bg-roman-gold/5 uppercase tracking-wider font-semibold text-xs"
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

      {/* Support Modal */}
      {showSupport && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm"
            onClick={() => setShowSupport(false)}
          />
          <div className="relative bg-stone-900 border border-roman-gold/20 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="h-px w-full bg-linear-to-r from-transparent via-roman-gold/50 to-transparent" />
            <div className="px-8 py-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-roman-gold font-serif text-2xl font-bold tracking-wide">Teacher Support</h2>
                <button
                  onClick={() => setShowSupport(false)}
                  className="text-stone-500 hover:text-stone-300 transition-colors text-sm uppercase tracking-wider"
                >
                  Close
                </button>
              </div>

              {/* FAQ */}
              <div className="space-y-4 mb-8">
                {[
                  {
                    q: "How do I add a student?",
                    a: "On the Campaigns page, scroll to the bottom of the student table and click '+ Add Student'. Fill in their name, age, and class.",
                  },
                  {
                    q: "How do students log miles?",
                    a: "Open a student's campaign page, click 'Begin Campaign' on their active campaign to watch the intro video, then enter miles in the log field and click 'Log Miles'.",
                  },
                  {
                    q: "What are the 12 campaigns?",
                    a: "Each campaign requires a set number of miles (1 mi for Campaign 1, up to 12 mi for Campaign 12). Students must watch the intro video before logging miles and the end video before unlocking the next campaign.",
                  },
                  {
                    q: "How are ranks determined?",
                    a: "Ranks are based on total miles completed across all campaigns. The further a student progresses, the higher their Roman rank.",
                  },
                  {
                    q: "How do I contact support?",
                    a: "Email us at support@ultimatewarriorchallenge.com and we'll get back to you within one business day.",
                  },
                ].map(({ q, a }) => (
                  <div key={q} className="border border-stone-700/50 rounded-xl px-5 py-4">
                    <p className="text-roman-gold font-semibold text-sm mb-1">◆ {q}</p>
                    <p className="text-stone-400 text-sm leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>

              {/* Contact */}
              <div className="border-t border-stone-700/40 pt-5 flex items-center justify-between">
                <div>
                  <p className="text-stone-500 text-xs uppercase tracking-widest font-semibold mb-1">Email Support</p>
                  <p className="text-roman-gold text-sm font-semibold">support@ultimatewarriorchallenge.com</p>
                </div>
                <a
                  href="mailto:support@ultimatewarriorchallenge.com"
                  className="px-4 py-2 rounded-lg border border-roman-gold/40 text-roman-gold text-xs uppercase tracking-wider font-semibold hover:bg-roman-gold/10 transition-colors"
                >
                  Send Email
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
