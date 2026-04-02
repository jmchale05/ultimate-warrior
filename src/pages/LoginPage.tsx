import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ButtonSpinner } from "../components/LoadingSpinner";
import { getSchoolByAccessCode } from "../lib/firestore";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const { signIn, signUp, currentUser } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [confirmedSchoolName, setConfirmedSchoolName] = useState<string | null>(null);
  const [accessCodeConfirmed, setAccessCodeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmingCode, setConfirmingCode] = useState(false);

  // Navigate once Firebase auth state actually confirms the user is signed in
  useEffect(() => {
    if (currentUser) navigate("/campaigns", { replace: true });
  }, [currentUser]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName, "teacher", accessCode);
      }
      // Navigation happens via the useEffect above when currentUser updates
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("Incorrect email or password. Please try again.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/user-disabled") {
        setError("This account has been disabled. Please contact support.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please wait a moment and try again.");
      } else if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else if (code === "auth/network-request-failed") {
        setError("Network error. Please check your internet connection.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmAccessCode() {
    setError(null);
    setConfirmingCode(true);
    try {
      const school = await getSchoolByAccessCode(accessCode);
      if (!school) {
        setAccessCodeConfirmed(false);
        setConfirmedSchoolName(null);
        setError("That access code is not valid. Please check it and try again.");
        return;
      }

      setAccessCodeConfirmed(true);
      setConfirmedSchoolName(school.name);
    } catch {
      setAccessCodeConfirmed(false);
      setConfirmedSchoolName(null);
      setError("Unable to verify the access code right now. Please try again.");
    } finally {
      setConfirmingCode(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/BACKGROUND-login.png')" }} />
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
          src="/logonew.jpeg"
          alt="Ultimate Warrior"
          className="w-full max-w-96 h-auto object-contain mx-auto mb-5 relative z-10 [image-rendering:--webkit-optimize-contrast] transform-gpu"
        />
        <h1 className="text-roman-gold-light font-serif text-4xl font-bold tracking-widest uppercase relative z-10 [text-shadow:0_2px_12px_rgba(0,0,0,0.9),0_0_30px_rgba(0,0,0,0.7)]">
          Ultimate Warrior
        </h1>
        <div className="roman-divider text-roman-gold text-xs font-serif mt-2 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
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
            ? "Enter your credentials to access your account"
            : "Register to lead your warriors to glory"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-roman-gold/70 text-xs uppercase tracking-wider mb-1.5 font-semibold">
                ◆ Access Code
              </label>
              <input
                type="text"
                required
                value={accessCode}
                onChange={(e) => {
                  if (accessCodeConfirmed) return;
                  setAccessCode(e.target.value.toUpperCase());
                  setAccessCodeConfirmed(false);
                  setConfirmedSchoolName(null);
                }}
                disabled={accessCodeConfirmed}
                placeholder="ABC123"
                className="roman-input uppercase tracking-[0.3em] disabled:cursor-not-allowed disabled:opacity-70"
              />
              {!accessCodeConfirmed && (
                <button
                  type="button"
                  onClick={handleConfirmAccessCode}
                  disabled={confirmingCode || !accessCode.trim()}
                  className="mt-3 w-full rounded-lg border border-roman-gold/40 bg-roman-gold/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-roman-gold transition-colors hover:bg-roman-gold/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {confirmingCode ? "Checking Code..." : "Confirm Access Code"}
                </button>
              )}
              {accessCodeConfirmed && confirmedSchoolName && (
                <p className="mt-2 text-xs text-roman-gold/80 uppercase tracking-widest">
                  Access code confirmed for {confirmedSchoolName}
                </p>
              )}
            </div>
          )}

          {mode === "signup" && accessCodeConfirmed && (
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

          {(mode === "signin" || accessCodeConfirmed) && (
            <div>
              <label className="block text-roman-gold/70 text-xs uppercase tracking-wider mb-1.5 font-semibold">
                ◆ Email
              </label>
              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="roman-input"
              />
            </div>
          )}

          {(mode === "signin" || accessCodeConfirmed) && (
            <div>
              <label className="block text-roman-gold/70 text-xs uppercase tracking-wider mb-1.5 font-semibold">
                ◆ Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="roman-input"
              />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              ⚠ {error}
            </p>
          )}

          {(mode === "signin" || accessCodeConfirmed) && (
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
          )}
        </form>

        <div className="roman-divider text-stone-600 text-xs mt-6">◆</div>

        <p className="text-center text-stone-500 text-sm">
          {mode === "signin" ? (
            <>
              New to the Legion?{" "}
              <button
                type="button"
                onClick={() => { setMode("signup"); setError(null); setAccessCode(""); setAccessCodeConfirmed(false); setConfirmedSchoolName(null); }}
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
