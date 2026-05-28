import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

async function run() {
  const sDoc = await getDoc(doc(db, 'subjects', 'qxI7fsDOute3klsaIlYo'));
  if (sDoc.exists()) {
    console.log("Subject data:", JSON.stringify(sDoc.data(), null, 2));
  } else {
    console.log("Subject qxI7fsDOute3klsaIlYo does not exist!");
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
