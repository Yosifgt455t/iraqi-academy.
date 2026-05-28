import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

const CHAPTER_ID = "yj6AYJI3QUn0tOH9zTal"; // "الفصل الأول | الخليه"
const TEACHER_ID = "uiMIjMOjA4mA6rdpZH9w"; // "حسن فلاح"

async function run() {
  console.log("Simulating ContentView.tsx fetch queries...");
  
  const [matSnap, legacyMatSnap] = await Promise.all([
    getDocs(query(collection(db, 'materials'), where('chapterIds', 'array-contains', CHAPTER_ID))),
    getDocs(query(collection(db, 'materials'), where('chapterId', '==', CHAPTER_ID)))
  ]);

  console.log(`Query 1 (array-contains) count: ${matSnap.size}`);
  console.log(`Query 2 (equality) count: ${legacyMatSnap.size}`);

  const materialsMap = new Map();
  matSnap.docs.forEach(doc => materialsMap.set(doc.id, { id: doc.id, ...doc.data() }));
  legacyMatSnap.docs.forEach(doc => materialsMap.set(doc.id, { id: doc.id, ...doc.data() }));

  const all = Array.from(materialsMap.values());
  console.log(`Total unique materials grouped: ${all.length}`);
  
  if (all.length > 0) {
    console.log("First material sample:", JSON.stringify(all[0], null, 2));
    
    const filteredByTeacher = all.filter(m => m.teacherId === TEACHER_ID);
    console.log(`Filtered by Teacher ID: ${TEACHER_ID} count: ${filteredByTeacher.length}`);
    if (filteredByTeacher.length > 0) {
      console.log("First filtered sample:", JSON.stringify(filteredByTeacher[0], null, 2));
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Simulation error:", err);
  process.exit(1);
});
