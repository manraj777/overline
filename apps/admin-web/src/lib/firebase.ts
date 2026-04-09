import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  type Auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type UserCredential,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingFirebaseKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
const recaptchaCache = new Map<string, RecaptchaVerifier>();

if (hasFirebaseConfig) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else if (missingFirebaseKeys.length > 0) {
  const warnFlag = '__overlineAdminFirebaseConfigWarned';
  const globalScope = globalThis as typeof globalThis & Record<string, boolean>;
  if (!globalScope[warnFlag]) {
    globalScope[warnFlag] = true;
    console.warn(
      `[firebase:admin-web] Missing NEXT_PUBLIC_FIREBASE config keys: ${missingFirebaseKeys.join(', ')}`,
    );
  }
}

export { db, auth, hasFirebaseConfig, missingFirebaseKeys };

export function getFirebaseAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase auth is not configured. Please set NEXT_PUBLIC_FIREBASE_* values.');
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    throw new Error('Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* values.');
  }
  return db;
}

export function normalizeIndianPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  if (phone.startsWith('+') && cleaned.length >= 10) {
    return phone;
  }
  return `+${cleaned}`;
}

export function getRecaptchaVerifier(containerId = 'recaptcha-container'): RecaptchaVerifier {
  if (typeof window === 'undefined') {
    throw new Error('reCAPTCHA can only be initialized in the browser.');
  }

  const existing = recaptchaCache.get(containerId);
  if (existing) {
    return existing;
  }

  const verifier = new RecaptchaVerifier(getFirebaseAuth(), containerId, {
    size: 'invisible',
  });
  recaptchaCache.set(containerId, verifier);
  return verifier;
}

export async function signInWithPhoneFirebase(phone: string): Promise<ConfirmationResult> {
  const normalizedPhone = normalizeIndianPhone(phone);
  const verifier = getRecaptchaVerifier();
  return signInWithPhoneNumber(getFirebaseAuth(), normalizedPhone, verifier);
}

export async function confirmPhoneOtp(
  confirmationResult: ConfirmationResult,
  otp: string,
): Promise<UserCredential> {
  return confirmationResult.confirm(otp);
}

export async function getFreshFirebaseIdToken(userCredential: UserCredential): Promise<string> {
  return userCredential.user.getIdToken(true);
}
