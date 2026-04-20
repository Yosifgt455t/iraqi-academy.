import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeFirestore, doc, getDoc, setDoc, updateDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

console.log("Firebase initializing with Project ID:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);

// Initialize Firestore with long polling to bypass potential network restrictions
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

console.log("Firestore initialized with DB ID:", firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Utility for Google Login
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

// Firestore Profile Helpers
export const getUserProfile = async (uid: string) => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return userDoc.data();
  }
  return null;
};

export const setUserProfile = async (uid: string, data: any) => {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    createdAt: new Date().toISOString()
  });
};

export const updateUserProfile = async (uid: string, data: any) => {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: new Date().toISOString()
  });
};

// Utility for Logout
export const logout = () => signOut(auth);

// Critical verification check for Firestore connection as per instructions
async function testConnection() {
  try {
    // Attempting a fetch to ensure connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or internet connection.");
    }
  }
}

testConnection();
