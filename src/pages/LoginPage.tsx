import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ButtonSpinner } from "../components/LoadingSpinner";
import { getAdminAccessCodeStatus, getSchoolByAccessCode } from "../lib/firestore";
import TeacherSupportModal from "../components/TeacherSupportModal";

type Mode = "signin" | "signup";
type ConfirmedSignupRole = "teacher" | "admin";
const PRIVACY_POLICY_VERSION = "2026-05";

export default function LoginPage() {
  const { signIn, signUp, forgotPassword, currentUser, appUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [suffix, setSuffix] = useState("Mr");
  const [accessCode, setAccessCode] = useState("");
  const [signupConsentChecked, setSignupConsentChecked] = useState(false);
  const [confirmedSignupRole, setConfirmedSignupRole] = useState<ConfirmedSignupRole | null>(null);
  const [confirmedSchoolName, setConfirmedSchoolName] = useState<string | null>(null);
  const [accessCodeConfirmed, setAccessCodeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [signupConsentError, setSignupConsentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const handleViewportChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
      return () => mediaQuery.removeEventListener("change", handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  useEffect(() => {
    const state = location.state as { loggedOut?: boolean } | null;
    if (!state?.loggedOut) return;

    setLogoutMessage("Signed out successfully.");
    const clearTimer = window.setTimeout(() => {
      setLogoutMessage(null);
    }, 2200);

    navigate(location.pathname, { replace: true, state: null });
    return () => window.clearTimeout(clearTimer);
  }, [location.pathname, location.state, navigate]);

  // Navigate once Firebase Auth and the Firestore user profile are both ready.
  useEffect(() => {
    if (currentUser && appUser) {
      navigate(appUser.role === "admin" ? "/admin" : "/campaigns", { replace: true });
    }
  }, [currentUser, appUser, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setAccessCodeError(null);
    setDisplayNameError(null);
    setSignupConsentError(null);

    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();
    const isEmailFormatValid = /^\S+@\S+\.\S+$/.test(normalizedEmail);

    if (mode === "signup" && !accessCode.trim()) {
      setAccessCodeError("Access code is required.");
      setError("Please correct the highlighted fields.");
      return;
    }

    if (mode === "signup" && !accessCodeConfirmed) {
      setAccessCodeError("Please confirm your access code before signing up.");
      setError("Please confirm your access code before signing up.");
      return;
    }

    if (mode === "signup" && accessCodeConfirmed && !displayName.trim()) {
      setDisplayNameError(confirmedSignupRole === "teacher" ? "Last name is required." : "Full name is required.");
      setError("Please correct the highlighted fields.");
      return;
    }

    if (mode === "signup" && confirmedSignupRole === "teacher" && !signupConsentChecked) {
      setSignupConsentError("You must confirm authority and consent to continue.");
      setError("Please confirm you have authority and consent to manage student data.");
      return;
    }

    if (!normalizedEmail) {
      setEmailError("Email is required.");
      setError("Please correct the highlighted fields.");
      return;
    }

    if (!isEmailFormatValid) {
      setEmailError("Enter a valid email address.");
      setError("Please correct the highlighted fields.");
      return;
    }

    if (!normalizedPassword) {
      setPasswordError("Password is required.");
      setError("Please correct the highlighted fields.");
      return;
    }

    if (normalizedPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      setError("Please correct the highlighted fields.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(normalizedEmail, normalizedPassword);
      } else {
        await signUp(normalizedEmail, normalizedPassword, displayName, accessCode, PRIVACY_POLICY_VERSION, confirmedSignupRole === "teacher" ? suffix : undefined);
      }
      // Navigation happens via the useEffect above when currentUser updates
    } catch (err: unknown) {
      if (err instanceof Error && err.message) {
        const normalizedMessage = err.message.toLowerCase();
        if (
          normalizedMessage.includes("could not find your account") ||
          normalizedMessage.includes("invalid access code") ||
          normalizedMessage.includes("invalid admin access code") ||
          normalizedMessage.includes("app profile could not be saved")
        ) {
          setError(err.message);
          return;
        }
      }
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
      const isValidAdminCode = await getAdminAccessCodeStatus(accessCode);
      if (isValidAdminCode) {
        setAccessCodeConfirmed(true);
        setConfirmedSignupRole("admin");
        setConfirmedSchoolName("Administrator Account");
      } else {
        const school = await getSchoolByAccessCode(accessCode);
        if (!school) {
          setAccessCodeConfirmed(false);
          setConfirmedSignupRole(null);
          setConfirmedSchoolName(null);
          setError("That access code is not valid. Please check it and try again.");
          return;
        }

        setAccessCodeConfirmed(true);
        setConfirmedSignupRole("teacher");
        setConfirmedSchoolName(school.name);
      }
    } catch {
      setAccessCodeConfirmed(false);
      setConfirmedSignupRole(null);
      setConfirmedSchoolName(null);
      setError("Unable to verify the access code right now. Please try again.");
    } finally {
      setConfirmingCode(false);
    }
  }

  async function handleSendPasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetMessage(null);

    const normalizedEmail = resetEmail.trim();
    if (!normalizedEmail) {
      setResetError("Please enter your email address.");
      return;
    }

    setResetLoading(true);
    try {
      await forgotPassword(normalizedEmail);
      setResetMessage("If an account exists for that email, a reset link has been sent. Please check your spam or junk folder too.");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/invalid-email") {
        setResetError("Please enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setResetError("Too many attempts. Please wait a moment and try again.");
      } else if (code === "auth/network-request-failed") {
        setResetError("Network error. Please check your internet connection.");
      } else if (err instanceof Error && err.message) {
        setResetError(err.message);
      } else {
        setResetError("We could not send the reset email right now. Please try again.");
      }
    } finally {
      setResetLoading(false);
    }
  }

  function openSupportModal() {
    setShowSupportModal(true);
  }

  const isSignup = mode === "signup";
  const showDesktopOnlySignIn = mode === "signin" && isMobileViewport;

  if (showDesktopOnlySignIn) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4">
        <div className="fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/BACKGROUND-login.png')" }} />
        <div className="absolute inset-0 bg-stone-950/80" />

        <div className="relative roman-card w-full max-w-md rounded-2xl p-8 text-center z-10">
          <div className="mx-auto mb-5 w-16 h-16 rounded-full border border-roman-gold/50 bg-stone-900/80 flex items-center justify-center text-roman-gold text-2xl">
            🖥
          </div>
          <h1 className="font-serif text-2xl text-roman-gold uppercase tracking-widest mb-3">Desktop Only</h1>
          <p className="text-stone-300 text-sm leading-relaxed">
            Sign in is currently available on desktop only. Please use a laptop or desktop browser to access your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col items-center px-4 relative overflow-x-hidden ${isSignup ? "justify-start py-6 sm:py-8" : "justify-center overflow-hidden"}`}>
      {logoutMessage && (
        <div className="fixed top-5 right-5 z-50 pointer-events-none">
          <div className="rounded-lg border border-emerald-300/40 bg-emerald-500/15 text-emerald-100 px-4 py-3 shadow-lg backdrop-blur-sm text-sm font-semibold tracking-wide">
            {logoutMessage}
          </div>
        </div>
      )}

      {/* Background image */}
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/BACKGROUND-login.png')" }} />
      {/* Atmospheric corner glows */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-roman-red/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-roman-gold/5 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-roman-red/5 rounded-full blur-[200px]" />

      {/* Hero header */}
      <div className={`text-center relative ${isSignup ? "mb-4 sm:mb-5" : "mb-8"}`}>
        {/* Glow behind logo */}
        <div className="absolute inset-0 flex items-center justify-center -top-4">
          <div className="w-40 h-40 bg-roman-gold/10 rounded-full blur-3xl" />
        </div>
        <img
          src="/logonew.jpeg"
          alt="Ultimate Warrior"
          className={`w-full h-auto object-contain mx-auto relative z-10 [image-rendering:--webkit-optimize-contrast] transform-gpu ${isSignup ? "max-w-64 sm:max-w-72 mb-3" : "max-w-96 mb-5"}`}
        />
        <h1 className={`text-roman-gold-light font-serif font-bold tracking-widest uppercase relative z-10 [text-shadow:0_2px_12px_rgba(0,0,0,0.9),0_0_30px_rgba(0,0,0,0.7)] ${isSignup ? "text-2xl sm:text-3xl" : "text-4xl"}`}>
          Ultimate Warrior
        </h1>
        <div className="roman-divider text-roman-gold text-xs font-serif mt-2 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
          ⚔ CHALLENGES OF THE LEGION ⚔
        </div>
      </div>

      {/* Card */}
      <div className={`w-full max-w-md roman-card rounded-2xl relative z-10 ${isSignup ? "p-5 sm:p-6" : "p-8"}`}>
        <h2 className="text-roman-gold font-serif text-xl font-bold tracking-widest uppercase text-center mb-1">
          {mode === "signin" ? "Sign In" : "Join the Legion"}
        </h2>
        <p className={`text-stone-500 text-xs text-center italic font-serif ${isSignup ? "mb-4" : "mb-6"}`}>
          {mode === "signin"
            ? "Enter your credentials to access your account"
            : "Register to lead your warriors to glory"}
        </p>

        <form onSubmit={handleSubmit} className={isSignup ? "space-y-3" : "space-y-4"}>
          {mode === "signup" && (
            <div>
              <label className="block text-roman-gold/70 text-xs uppercase tracking-wider mb-1.5 font-semibold">
                ◆ Access Code *
              </label>
              <input
                type="text"
                required
                value={accessCode}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (!confirmingCode && accessCode.trim()) {
                    void handleConfirmAccessCode();
                  }
                }}
                onChange={(e) => {
                  if (accessCodeConfirmed) return;
                  setAccessCode(e.target.value.toUpperCase());
                  if (accessCodeError) setAccessCodeError(null);
                  setAccessCodeConfirmed(false);
                  setConfirmedSignupRole(null);
                  setConfirmedSchoolName(null);
                }}
                disabled={accessCodeConfirmed}
                placeholder="ABC123"
                className={`roman-input uppercase tracking-[0.3em] disabled:cursor-not-allowed disabled:opacity-70 ${accessCodeError ? "border-red-400 focus:border-red-300 focus:ring-red-300/30" : ""}`}
              />
              {accessCodeError && (
                <p className="mt-1.5 text-red-400 text-xs">{accessCodeError}</p>
              )}
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
                  {confirmedSignupRole === "admin"
                    ? "Admin access code confirmed"
                    : `Access code confirmed for ${confirmedSchoolName}`}
                </p>
              )}
            </div>
          )}

          {mode === "signup" && accessCodeConfirmed && confirmedSignupRole === "teacher" && (
            <div>
              <label className="block text-roman-gold/70 text-xs uppercase tracking-wider mb-1.5 font-semibold">
                ◆ Title / Suffix
              </label>
              <select
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                className="roman-input"
              >
                <option value="Mr">Mr</option>
                <option value="Mrs">Mrs</option>
                <option value="Miss">Miss</option>
                <option value="Ms">Ms</option>
                <option value="Dr">Dr</option>
                <option value="Prof">Prof</option>
              </select>
            </div>
          )}

          {mode === "signup" && accessCodeConfirmed && (
            <div>
              <label className="block text-roman-gold/70 text-xs uppercase tracking-wider mb-1.5 font-semibold">
                ◆ {confirmedSignupRole === "teacher" ? "Last Name" : "Full Name"} *
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (displayNameError) setDisplayNameError(null);
                }}
                placeholder={confirmedSignupRole === "teacher" ? "Smith" : "Marcus Aurelius"}
                className={`roman-input ${displayNameError ? "border-red-400 focus:border-red-300 focus:ring-red-300/30" : ""}`}
              />
              {displayNameError && (
                <p className="mt-1.5 text-red-400 text-xs">{displayNameError}</p>
              )}
            </div>
          )}

          {(mode === "signin" || accessCodeConfirmed) && (
            <div>
              <label className="block text-roman-gold/70 text-xs uppercase tracking-wider mb-1.5 font-semibold">
                ◆ Email *
              </label>
              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="your@email.com"
                className={`roman-input ${emailError ? "border-red-400 focus:border-red-300 focus:ring-red-300/30" : ""}`}
              />
              {emailError && (
                <p className="mt-1.5 text-red-400 text-xs">{emailError}</p>
              )}
            </div>
          )}

          {(mode === "signin" || accessCodeConfirmed) && (
            <div>
              <label className="block text-roman-gold/70 text-xs uppercase tracking-wider mb-1.5 font-semibold">
                ◆ Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="off"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  placeholder="••••••••"
                  className={`roman-input pr-12 ${passwordError ? "border-red-400 focus:border-red-300 focus:ring-red-300/30" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-roman-gold transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 3l18 18" />
                      <path d="M10.58 10.58a2 2 0 102.83 2.83" />
                      <path d="M9.88 5.09A9.77 9.77 0 0112 5c5 0 9.27 3.11 11 7-1.05 2.38-2.96 4.31-5.34 5.39" />
                      <path d="M6.61 6.61C4.62 7.95 3.07 9.82 2 12c1.73 3.89 6 7 10 7 1.49 0 2.93-.33 4.23-.92" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1.5 text-red-400 text-xs">{passwordError}</p>
              )}
            </div>
          )}

          {mode === "signin" && (
            <div className="text-right -mt-1">
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email.trim());
                  setResetError(null);
                  setResetMessage(null);
                  setShowForgotPassword(true);
                }}
                className="text-roman-gold/80 hover:text-roman-gold text-xs uppercase tracking-wider font-semibold"
              >
                Forgot Password?
              </button>
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

          {mode === "signup" && confirmedSignupRole === "teacher" && accessCodeConfirmed && (
            <label className={`flex items-start gap-2.5 text-stone-400 text-xs leading-relaxed border rounded-lg px-3 py-2.5 ${signupConsentError ? "border-red-400/70" : "border-stone-700/60"}`}>
              <input
                type="checkbox"
                checked={signupConsentChecked}
                onChange={(e) => {
                  setSignupConsentChecked(e.target.checked);
                  if (signupConsentError) setSignupConsentError(null);
                }}
                className="mt-0.5 accent-roman-gold"
              />
              <span>
                <span className="text-roman-gold/80 font-semibold mr-1">*</span>
                I confirm I am a staff member with lawful authority to manage student data, and I have read and agree to the
                {" "}
                <a href="/terms" className="text-roman-gold hover:underline">
                  Terms and Conditions
                </a>
                {" "}
                and
                {" "}
                <a href="/privacy" className="text-roman-gold hover:underline">
                  Privacy Notice
                </a>
                , including obtaining required school/parental consent where needed.
              </span>
            </label>
          )}

          {signupConsentError && mode === "signup" && confirmedSignupRole === "teacher" && accessCodeConfirmed && (
            <p className="text-red-400 text-xs -mt-2">{signupConsentError}</p>
          )}
        </form>

        <div className="roman-divider text-stone-600 text-xs mt-6">◆</div>

        <p className="text-center text-stone-500 text-sm">
          {mode === "signin" ? (
            <>
              New to the Legion?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setEmailError(null);
                  setPasswordError(null);
                  setAccessCodeError(null);
                  setDisplayNameError(null);
                  setSignupConsentError(null);
                  setAccessCode("");
                  setDisplayName("");
                  setEmail("");
                  setPassword("");
                  setSignupConsentChecked(false);
                  setAccessCodeConfirmed(false);
                  setConfirmedSignupRole(null);
                  setConfirmedSchoolName(null);
                }}
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
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setEmailError(null);
                  setPasswordError(null);
                  setAccessCodeError(null);
                  setDisplayNameError(null);
                  setSignupConsentError(null);
                }}
                className="text-roman-gold hover:text-roman-gold-light hover:underline transition-colors"
              >
                Sign In
              </button>
            </>
          )}
        </p>
        <p className="text-center text-stone-600 text-xs mt-3">
          <a href="/privacy" className="hover:text-roman-gold transition-colors">
            Privacy notice and data rights
          </a>
        </p>
      </div>

      {/* Support Button (Floating) */}
      <button
        type="button"
        onClick={openSupportModal}
        className="absolute bottom-6 right-6 z-20 flex items-center justify-center gap-2 rounded-full border border-roman-gold/30 bg-stone-900/80 px-4 py-2.5 text-roman-gold text-xs font-semibold uppercase tracking-widest backdrop-blur-sm shadow-[0_0_15px_rgba(212,175,55,0.15)] hover:bg-roman-gold/20 hover:border-roman-gold/60 transition-all hover:scale-105"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
        </svg>
        Support
      </button>

      {showSupportModal && (
        <TeacherSupportModal
          onClose={() => setShowSupportModal(false)}
          onOpenTerms={() => {
            setShowSupportModal(false);
            navigate("/terms");
          }}
        />
      )}

      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-sm" onClick={() => setShowForgotPassword(false)} />
          <div className="relative w-full max-w-md roman-card rounded-2xl p-7 z-10">
            <h3 className="text-roman-gold font-serif text-lg font-bold uppercase tracking-wider mb-2">Reset Password</h3>
            <p className="text-stone-400 text-sm mb-5">
              Enter your account email and we will send a reset link.
            </p>

            <form onSubmit={handleSendPasswordReset} className="space-y-4">
              <div>
                <label className="block text-roman-gold/70 text-xs uppercase tracking-wider mb-1.5 font-semibold">
                  ◆ Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="roman-input"
                />
              </div>

              {resetError && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                  ⚠ {resetError}
                </p>
              )}

              {resetMessage && (
                <p className="text-emerald-300 text-sm bg-emerald-900/20 border border-emerald-700 rounded-lg px-3 py-2">
                  ✓ {resetMessage}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1 rounded-lg border border-stone-600/50 px-4 py-2.5 text-stone-300 text-xs font-semibold uppercase tracking-widest hover:bg-stone-800/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 rounded-lg border border-roman-gold/40 bg-roman-gold/15 px-4 py-2.5 text-roman-gold text-xs font-semibold uppercase tracking-widest hover:bg-roman-gold/25 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer motto */}
      <p className={`text-stone-700 text-xs font-serif italic tracking-wider select-none ${isSignup ? "mt-4 mb-2" : "mt-8"}`}>
        "Audentes Fortuna Iuvat" — Fortune Favors the Bold
      </p>
    </div>
  );
}
