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
  createUserDoc,
  getSchoolByAccessCode,
  getUserDoc,
  initializeSchoolCampaignStart,
} from "../lib/firestore";
import type { AppUser, UserRole } from "../types";

interface AuthContextValue {
  currentUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    accessCode: string,
    privacyConsentVersion: string
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
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    accessCode: string,
    privacyConsentVersion: string
  ) {
    const school = await getSchoolByAccessCode(accessCode);
    if (!school) {
      throw new Error("Invalid access code. Please check the code and try again.");
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const newUser: AppUser = {
      uid: cred.user.uid,
      email,
      displayName,
      privacyConsentVersion,
      privacyConsentAt: Date.now(),
      role,
      schoolId: school.id,
      createdAt: Date.now(),
    };
    savePendingSignup(newUser);
    await createUserDoc(newUser);
    await initializeSchoolCampaignStart(school.id, newUser.createdAt);
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
