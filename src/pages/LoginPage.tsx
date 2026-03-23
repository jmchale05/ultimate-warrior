import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ButtonSpinner } from "../components/LoadingSpinner";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("test@email.com");
  const [password, setPassword] = useState("123456");
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
      navigate("/teacher");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen roman-bg flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Atmospheric corner glows */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-roman-red/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-roman-gold/5 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-roman-red/5 rounded-full blur-[200px]" />

      {/* Hero header */}
      <div className="text-center mb-8 relative">
        {/* Glow behind logo */}
        <div className="absolute inset-0 flex items-center justify-center -top-4">
          <div className="w-40 h-40 bg-roman-gold/10 rounded-full blur-3xl" />
        </div>
        <img
          src="/ultimate-warrior.png"
          alt="Ultimate Warrior"
          className="w-56 h-56 object-cover rounded-full border-4 border-roman-gold shadow-[0_0_30px_rgba(212,175,55,0.3)] mx-auto mb-5 relative z-10 [image-rendering:--webkit-optimize-contrast] transform-gpu"
        />
        <h1 className="text-roman-gold font-serif text-4xl font-bold tracking-widest uppercase roman-glow relative z-10">
          Ultimate Warrior
        </h1>
        <div className="roman-divider text-roman-gold/40 text-xs font-serif mt-2">
          ⚔ CHALLENGES OF THE LEGION ⚔
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md roman-card rounded-2xl p-8 relative z-10">
        <h2 className="text-roman-gold font-serif text-xl font-bold tracking-widest uppercase text-center mb-1">
          {mode === "signin" ? "Sign In" : "Join the Legion"}
        </h2>
        <p className="text-stone-500 text-xs text-center mb-6 italic font-serif">
          {mode === "signin"
            ? "Enter your credentials to access the Praetorium"
            : "Register to lead your warriors to glory"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-roman-gold/70 text-xs uppercase tracking-wider mb-1.5 font-semibold">
                ◆ Full Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Marcus Aurelius"
                className="roman-input"
              />
            </div>
          )}

          <div>
            <label className="block text-roman-gold/70 text-xs uppercase tracking-wider mb-1.5 font-semibold">
              ◆ Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="roman-input"
            />
          </div>

          <div>
            <label className="block text-roman-gold/70 text-xs uppercase tracking-wider mb-1.5 font-semibold">
              ◆ Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="roman-input"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              ⚠ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-roman-red to-roman-red-dark hover:from-roman-red/90 hover:to-roman-red-dark/90 text-roman-gold font-bold uppercase tracking-widest py-3 rounded-lg border border-roman-gold/40 transition-all shadow-[0_0_15px_rgba(139,28,28,0.4)] hover:shadow-[0_0_25px_rgba(139,28,28,0.6)] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading
              ? <><ButtonSpinner /> Entering...</>
              : mode === "signin"
              ? "Enter the Arena"
              : "Enlist Now"}
          </button>
        </form>

        <div className="roman-divider text-stone-600 text-xs mt-6">◆</div>

        <p className="text-center text-stone-500 text-sm">
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
              Already a Commander?{" "}
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
      <p className="text-stone-700 text-xs mt-8 font-serif italic tracking-wider select-none">
        "Audentes Fortuna Iuvat" — Fortune Favors the Bold
      </p>
    </div>
  );
}
