import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("Listing all chapters in the database:");
  const chSnap = await getDocs(collection(db, 'chapters'));
  chSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id} | Name: ${data.name} | SubjectId: ${data.subjectId} | SubjectIds: ${JSON.stringify(data.subjectIds)}`);
  });

  console.log("\nListing all teachers in the database:");
  const tcSnap = await getDocs(collection(db, 'teachers'));
  tcSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id} | Name: ${data.name} | SubjectId: ${data.subjectId}`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
