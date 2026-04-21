import { collection, getDocs, setDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const ADMINS_COLLECTION = 'admins';

export const getAdmins = async (): Promise<string[]> => {
  try {
    const snapshot = await getDocs(collection(db, ADMINS_COLLECTION));
    return snapshot.docs.map(doc => doc.id.toLowerCase());
  } catch (error) {
    console.error('Error fetching admins:', error);
    return [];
  }
};

export const addAdmin = async (email: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) return;
  
  // Use email as doc ID for efficient lookup and security rules
  await setDoc(doc(db, ADMINS_COLLECTION, normalizedEmail), {
    email: normalizedEmail,
    createdAt: new Date().toISOString()
  });
};

export const removeAdmin = async (email: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim();
  await deleteDoc(doc(db, ADMINS_COLLECTION, normalizedEmail));
};

export const checkIsAdmin = async (email: string | null | undefined): Promise<boolean> => {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  
  // Hardcoded Super Admin
  if (normalizedEmail === 'jwjwjwjueue@gmail.com') return true;
  
  try {
    const adminDoc = await getDoc(doc(db, ADMINS_COLLECTION, normalizedEmail));
    return adminDoc.exists();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};
