import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────────────────────
// Replace these values with your own Firebase project config.
// Go to: Firebase Console → Project Settings → Your apps → SDK snippet (Config)
// ─────────────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBm1SKcznRcFptgxISETz92CRGMN2evWvk",
  authDomain: "ultimate-warrior-501cb.firebaseapp.com",
  projectId: "ultimate-warrior-501cb",
  storageBucket: "ultimate-warrior-501cb.firebasestorage.app",
  messagingSenderId: "509664285842",
  appId: "1:509664285842:web:d21063ece9ad7f2a76024b",
  measurementId: "G-2C91PQMJCX",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
