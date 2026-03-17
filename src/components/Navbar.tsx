import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { appUser, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
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
            <button
              onClick={handleSignOut}
              className="text-roman-gold/60 hover:text-roman-gold border border-roman-gold/25 hover:border-roman-gold/60 px-4 py-2 rounded-lg transition-all hover:bg-roman-gold/5 uppercase tracking-wider font-semibold text-xs"
            >
              Sign Out
            </button>
          </div>
          )}
        </div>
      </div>
    </header>
  );
}
