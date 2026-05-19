import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ActionCodeSettings,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  createAdminSignupToken,
  createUserDoc,
  deleteAdminSignupToken,
  getAdminAccessCodeStatus,
  getSchoolByAccessCode,
  getUserDoc,
  initializeSchoolCampaignStart,
} from "../lib/firestore";
import type { AppUser } from "../types";

interface AuthContextValue {
  currentUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    accessCode: string,
    privacyConsentVersion: string,
    suffix?: string
  ) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const PENDING_SIGNUP_KEY = "uwc_pending_signup_profile";

function savePendingSignup(user: AppUser) {
  try {
    sessionStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(user));
  } catch {
    // Best effort only; signup still attempts the Firestore write immediately.
  }
}

function getPendingSignup(uid: string): AppUser | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as AppUser;
    return parsed.uid === uid ? parsed : null;
  } catch {
    return null;
  }
}

function clearPendingSignup() {
  try {
    sessionStorage.removeItem(PENDING_SIGNUP_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function getPasswordResetActionSettings(): ActionCodeSettings {
  const configuredUrl = import.meta.env.VITE_APP_URL as string | undefined;
  const baseUrl = configuredUrl?.trim() ? configuredUrl.trim() : window.location.origin;
  return {
    // Send users back to the login page on our app after reset completes.
    url: `${baseUrl.replace(/\/$/, "")}/login`,
    handleCodeInApp: false,
  };
}

async function createUserDocWithRetry(profile: AppUser, authUser: User): Promise<void> {
  try {
    await createUserDoc(profile);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "permission-denied") {
      throw err;
    }

    await authUser.getIdToken(true);
    await createUserDoc(profile);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      try {
        if (user) {
          const doc = await getUserDoc(user.uid);
          if (doc) {
            setAppUser(doc);
            clearPendingSignup();
          } else {
            const pendingUser = getPendingSignup(user.uid);
            if (pendingUser) {
              await createUserDoc(pendingUser);
              setAppUser(pendingUser);
              clearPendingSignup();
            } else {
              // Keep auth session intact here; signing out immediately can race with
              // signup profile creation and cause permission-denied on createUserDoc.
              // Route guards already redirect when appUser is missing, so no infinite loader.
              setAppUser(null);
            }
          }
        } else {
          setAppUser(null);
          clearPendingSignup();
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
        setAppUser(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  async function signIn(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserDoc(cred.user.uid);

    if (!profile) {
      await firebaseSignOut(auth);
      throw new Error("Could not find your account.");
    }

    setAppUser(profile);
  }

  async function signUp(
    email: string,
    password: string,
    displayName: string,
    accessCode: string,
    privacyConsentVersion: string,
    suffix?: string
  ) {
    const normalizedEmail = email.trim();
    const normalizedDisplayName = displayName.trim();
    const normalizedAccessCode = accessCode.trim().toUpperCase();
    const normalizedSuffix = suffix?.trim();
    const isValidAdminCode = await getAdminAccessCodeStatus(normalizedAccessCode);
    if (isValidAdminCode) {

      const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      await cred.user.getIdToken(true);
      const newUser: AppUser = {
        uid: cred.user.uid,
        email: normalizedEmail,
        displayName: normalizedDisplayName,
        privacyConsentVersion,
        privacyConsentAt: Date.now(),
        role: "admin",
        createdAt: Date.now(),
      };

      savePendingSignup(newUser);
      try {
        await createAdminSignupToken(cred.user.uid, normalizedAccessCode);
        await createUserDocWithRetry(newUser, cred.user);
        await deleteAdminSignupToken(cred.user.uid);
      } catch (err) {
        console.error("Failed to create admin user profile:", err);
        await deleteAdminSignupToken(cred.user.uid).catch(() => undefined);
        await cred.user.delete().catch(() => firebaseSignOut(auth));
        clearPendingSignup();
        throw new Error("Your auth account was created, but the app profile could not be saved. Please contact support before trying again.");
      }
      clearPendingSignup();
      setAppUser(newUser);
      return;
    }

    const school = await getSchoolByAccessCode(normalizedAccessCode);
    if (!school) {
      throw new Error("Invalid access code. Please check the code and try again.");
    }

    const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    await cred.user.getIdToken(true);
    const newUser: AppUser = {
      uid: cred.user.uid,
      email: normalizedEmail,
      displayName: normalizedDisplayName,
      ...(normalizedSuffix ? { suffix: normalizedSuffix } : {}),
      privacyConsentVersion,
      privacyConsentAt: Date.now(),
      role: "teacher",
      schoolId: school.id,
      createdAt: Date.now(),
    };
    savePendingSignup(newUser);
    try {
      await createUserDocWithRetry(newUser, cred.user);
    } catch (err) {
      console.error("Failed to create teacher user profile:", {
        error: err,
        schoolId: school.id,
        accessCode: normalizedAccessCode,
      });
      await cred.user.delete().catch(() => firebaseSignOut(auth));
      clearPendingSignup();
      throw new Error("Your auth account was created, but the app profile could not be saved. Please contact support before trying again.");
    }
    await initializeSchoolCampaignStart(school.id, newUser.createdAt).catch((err) => {
      console.error("Failed to initialize school campaign start:", err);
    });
    clearPendingSignup();
    setAppUser(newUser);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function forgotPassword(email: string) {
    await sendPasswordResetEmail(auth, email, getPasswordResetActionSettings());
  }

  return (
    <AuthContext.Provider
      value={{ currentUser, appUser, loading, signIn, signUp, forgotPassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
