import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeFirestore, doc, getDoc, setDoc, updateDoc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

console.log("Firebase initializing with Project ID:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);

// Initialize Firestore with force long polling to bypass network restrictions
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const storage = getStorage(app);

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
  const path = `users/${uid}`;
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const setUserProfile = async (uid: string, data: any) => {
  const path = `users/${uid}`;
  try {
    await setDoc(doc(db, 'users', uid), {
      ...data,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updateUserProfile = async (uid: string, data: any) => {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// Maintenance Mode Helpers
export const subscribeToMaintenanceMode = (callback: (isActive: boolean) => void) => {
  const path = 'settings/maintenance';
  return onSnapshot(doc(db, 'settings', 'maintenance'), (doc) => {
    if (doc.exists()) {
      callback(doc.data().active === true);
    } else {
      callback(false);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    callback(false);
  });
};

export const setMaintenanceMode = async (active: boolean) => {
  const docRef = doc(db, 'settings', 'maintenance');
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    await updateDoc(docRef, { active, updatedAt: new Date().toISOString() });
  } else {
    await setDoc(docRef, { active, updatedAt: new Date().toISOString() });
  }
};

export interface AppFeatures {
  hideMinisterial: boolean;
  hideFlashcards: boolean;
}

export const subscribeToFeatures = (callback: (features: AppFeatures) => void) => {
  const path = 'settings/features';
  return onSnapshot(doc(db, 'settings', 'features'), (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback({
        hideMinisterial: data.hideMinisterial === true,
        hideFlashcards: data.hideFlashcards === true
      });
    } else {
      callback({ hideMinisterial: false, hideFlashcards: false });
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
    callback({ hideMinisterial: false, hideFlashcards: false });
  });
};

export const updateFeatures = async (features: Partial<AppFeatures>) => {
  const docRef = doc(db, 'settings', 'features');
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    await updateDoc(docRef, { ...features, updatedAt: new Date().toISOString() });
  } else {
    await setDoc(docRef, { ...features, updatedAt: new Date().toISOString() });
  }
};

// Test connection to ensure firestore is reachable
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful");
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network connection. Firestore is currently offline.");
    } else if (errorMsg.includes('Missing or insufficient permissions') || errorMsg.includes('permission_denied')) {
      console.log("Firestore connection successful (permissions denied, but reachable).");
    } else {
      console.error("Firestore test connection error:", error);
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const updateDailyStreak = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) return;
  const data = userSnap.data();

  const today = new Date().toISOString().split('T')[0];
  const lastUpdate = data.streak?.lastUpdate || '';
  let newStreakCount = data.streak?.count || 0;

  if (lastUpdate === '') {
    newStreakCount = 1;
  } else if (lastUpdate !== today) {
    const lastDate = new Date(lastUpdate);
    const todayDate = new Date(today);
    const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreakCount += 1;
    } else if (diffDays > 1) {
      newStreakCount = 1;
    }
  } else {
    // Already updated today
    return { newStreakCount };
  }

  await updateDoc(userRef, {
    streak: {
      count: newStreakCount,
      lastUpdate: today
    },
    updatedAt: new Date().toISOString()
  });

  return { newStreakCount };
};

// XP Helpers
export const awardXP = async (uid: string, amount: number) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) return;
  
  const data = userSnap.data();
  const currentXP = data.xp || 0;
  const currentLevel = data.level || 1;
  const newXP = currentXP + amount;
  
  // Level Up Logic (Progressive: level 1 is 500 XP, level 2 is 1000, etc.)
  const xpForNextLevel = currentLevel * 500;
  let newLevel = currentLevel;
  if (newXP >= xpForNextLevel) {
    newLevel = currentLevel + 1;
  }

  await updateDoc(userRef, {
    xp: newXP,
    level: newLevel,
    updatedAt: new Date().toISOString()
  });

  return { leveledUp: newLevel > currentLevel, newXP, newLevel };
};

// Utility for Logout
export const logout = () => signOut(auth);
