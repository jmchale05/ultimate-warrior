import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Mode = "signin" | "signup";

export default function MobileLoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName, "teacher");
      }
      navigate("/campaigns");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen roman-bg flex flex-col items-center px-4 pt-12 pb-6 relative overflow-hidden">
      {/* Atmospheric glow */}
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-roman-gold/5 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />

      {/* Compact hero */}
      <div className="text-center mb-6 relative">
        <div className="absolute inset-0 flex items-center justify-center -top-4">
          <div className="w-28 h-28 bg-roman-gold/10 rounded-full blur-3xl" />
        </div>
        <img
          src="/ultimate-warrior.png"
          alt="Ultimate Warrior"
          className="w-32 h-32 object-cover rounded-full border-3 border-roman-gold shadow-[0_0_20px_rgba(212,175,55,0.3)] mx-auto mb-3 relative z-10 [image-rendering:--webkit-optimize-contrast] transform-gpu"
        />
        <h1 className="text-roman-gold font-serif text-2xl font-bold tracking-widest uppercase roman-glow relative z-10">
          Ultimate Warrior
        </h1>
        <div className="roman-divider text-roman-gold/40 text-[10px] font-serif mt-1">
          ⚔ CHALLENGES OF THE LEGION ⚔
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm roman-card rounded-2xl p-6 relative z-10">
        <h2 className="text-roman-gold font-serif text-lg font-bold tracking-widest uppercase text-center mb-1">
          {mode === "signin" ? "Sign In" : "Join the Legion"}
        </h2>
        <p className="text-stone-500 text-[11px] text-center mb-5 italic font-serif">
          {mode === "signin"
            ? "Enter your credentials to begin your quest"
            : "Register to join the warriors"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="block text-roman-gold/70 text-[11px] uppercase tracking-wider mb-1 font-semibold">
                ◆ Full Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Marcus Aurelius"
                className="roman-input text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-roman-gold/70 text-[11px] uppercase tracking-wider mb-1 font-semibold">
              ◆ Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="roman-input text-sm"
            />
          </div>

          <div>
            <label className="block text-roman-gold/70 text-[11px] uppercase tracking-wider mb-1 font-semibold">
              ◆ Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="roman-input text-sm"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              ⚠ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-roman-red to-roman-red-dark hover:from-roman-red/90 hover:to-roman-red-dark/90 text-roman-gold font-bold uppercase tracking-widest py-3 rounded-lg border border-roman-gold/40 transition-all shadow-[0_0_15px_rgba(139,28,28,0.4)] hover:shadow-[0_0_25px_rgba(139,28,28,0.6)] disabled:opacity-50 disabled:cursor-not-allowed mt-1 text-sm"
          >
            {loading
              ? "Loading..."
              : mode === "signin"
              ? "Enter the Arena"
              : "Enlist Now"}
          </button>
        </form>

        <div className="roman-divider text-stone-600 text-xs mt-5">◆</div>

        <p className="text-center text-stone-500 text-xs">
          {mode === "signin" ? (
            <>
              New to the Legion?{" "}
              <button
                type="button"
                onClick={() => { setMode("signup"); setError(null); }}
                className="text-roman-gold hover:text-roman-gold-light hover:underline transition-colors"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already a Warrior?{" "}
              <button
                type="button"
                onClick={() => { setMode("signin"); setError(null); }}
                className="text-roman-gold hover:text-roman-gold-light hover:underline transition-colors"
              >
                Sign In
              </button>
            </>
          )}
        </p>
      </div>

      {/* Footer motto */}
      <p className="text-stone-700 text-[10px] mt-6 font-serif italic tracking-wider select-none">
        "Audentes Fortuna Iuvat" — Fortune Favors the Bold
      </p>
    </div>
  );
}
