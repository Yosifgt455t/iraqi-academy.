import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

const CHAPTER_ID = "yj6AYJI3QUn0tOH9zTal";

async function run() {
  const [matSnap] = await Promise.all([
    getDocs(query(collection(db, 'materials'), where('chapterIds', 'array-contains', CHAPTER_ID)))
  ]);

  console.log(`Matched materials count: ${matSnap.size}`);
  matSnap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`Doc: ${doc.id} | Title: "${data.title}" | teacherId: "${data.teacherId}" | type: "${data.type}" | order_index: ${data.order_index}`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
