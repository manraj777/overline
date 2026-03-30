import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
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
let db: Firestore | null = null;

if (hasFirebaseConfig) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
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

export { db, hasFirebaseConfig, missingFirebaseKeys };

export function getFirebaseDb(): Firestore {
  if (!db) {
    throw new Error('Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* values.');
  }
  return db;
}
