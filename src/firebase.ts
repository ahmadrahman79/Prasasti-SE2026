import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';

const firebaseConfig = {
  projectId: "gen-lang-client-0762508395",
  appId: "1:633869066207:web:422678cfc8bf365c69ee6a",
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyCCU3iR8yKHLcvgtCJZ-TgaAKccVWkWuB8",
  authDomain: "gen-lang-client-0762508395.firebaseapp.com",
  storageBucket: "gen-lang-client-0762508395.firebasestorage.app",
  messagingSenderId: "633869066207"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-monitoringprogre-02513d93-e41a-43b7-aaf0-d65c79f2a381");
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Drive and Sheets scopes for spreadsheet reading
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If the user was already signed in but we don't have the token in memory,
        // we'll require them to click Sign In to retrieve a fresh token.
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan access token dari Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

