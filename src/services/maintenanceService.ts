import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const MAINTENANCE_DOC_ID = 'status';
const SETTINGS_COLLECTION = 'settings';

export const getMaintenanceMode = async (): Promise<boolean> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, MAINTENANCE_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().isMaintenanceActive || false;
    }
    return false;
  } catch (error) {
    console.error('Error getting maintenance mode:', error);
    return false;
  }
};

export const setMaintenanceMode = async (isActive: boolean): Promise<void> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, MAINTENANCE_DOC_ID);
    await setDoc(docRef, { isMaintenanceActive: isActive }, { merge: true });
  } catch (error) {
    console.error('Error setting maintenance mode:', error);
    throw error;
  }
};
