import { collection, query, where, getDocs, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface MaterialSeed {
  title: string;
  url: string;
  type: 'VK' | 'Video';
  order_index: number;
}

const LECTURES: MaterialSeed[] = [
  {
    title: "أساسيات 1 الأستاذ ساجد العكيلي",
    url: "https://geo.dailymotion.com/player.html?video=k7GmLdJPHyyfQTGcx34",
    type: 'Video',
    order_index: 1
  },
  {
    title: "أساسيات 2 الأستاذ ساجد العكيلي",
    url: "https://geo.dailymotion.com/player.html?video=k2bouBY9vwoqkSGcxys",
    type: 'Video',
    order_index: 2
  },
  {
    title: "أساسيات 3 الأستاذ ساجد العكيلي",
    url: "https://geo.dailymotion.com/player.html?video=k4mVZ6P5HUIOiDGcy52",
    type: 'Video',
    order_index: 3
  },
  {
    title: "المحاضرة 1 الأستاذ ساجد العكيلي",
    url: "https://geo.dailymotion.com/player.html?video=k79qUVGWaqVel4GdlVa",
    type: 'Video',
    order_index: 4
  },
  {
    title: "المحاضرة 2 الأستاذ ساجد العكيلي",
    url: "https://geo.dailymotion.com/player.html?video=k4xloCO8w9AqpUGdlVg",
    type: 'Video',
    order_index: 5
  },
  {
    title: "المحاضرة 3 الأستاذ ساجد العكيلي",
    url: "https://geo.dailymotion.com/player.html?video=k6rl908kHJjPoTGdlVe",
    type: 'Video',
    order_index: 6
  },
  {
    title: "المحاضرة 4 الأستاذ ساجد العكيلي",
    url: "https://geo.dailymotion.com/player.html?video=kRl8BUOMCebL5UGdlVi",
    type: 'Video',
    order_index: 7
  },
  {
    title: "المحاضرة 5 الأستاذ ساجد العكيلي",
    url: "https://geo.dailymotion.com/player.html?video=k3QZvTfyEYKXZqGdlVc",
    type: 'Video',
    order_index: 8
  }
];

export async function seedIslamiaData() {
  try {
    console.log("[Islamia Seeder] Starting database seeding check...");

    // 1. Get or Create Subject "التربية الإسلامية"
    const subjectsCol = collection(db, 'subjects');
    const subjectQuery = query(subjectsCol, where('name', '==', 'التربية الإسلامية'));
    const subjectSnap = await getDocs(subjectQuery);
    
    let subjectId = '';
    
    if (subjectSnap.empty) {
      console.log("[Islamia Seeder] Subject 'التربية الإسلامية' not found. Creating...");
      // Associate with primary preparatory stages in Iraq (e.g., Sixth Scientific, Sixth Literary, etc.)
      const newSubjectRef = await addDoc(subjectsCol, {
        name: "التربية الإسلامية",
        grades: ["secondary_6_sci", "secondary_6_lit"]
      });
      subjectId = newSubjectRef.id;
      console.log("[Islamia Seeder] Created Subject ID:", subjectId);
    } else {
      subjectId = subjectSnap.docs[0].id;
      console.log("[Islamia Seeder] Existing Subject ID found:", subjectId);
      
      // Update grades to make sure it is assigned to Sixth Grade (Scientific and Literary)
      const currentData = subjectSnap.docs[0].data();
      const currentGrades = currentData.grades || [];
      if (!currentGrades.includes("secondary_6_sci") || !currentGrades.includes("secondary_6_lit")) {
        await setDoc(doc(db, 'subjects', subjectId), {
          ...currentData,
          grades: Array.from(new Set([...currentGrades, "secondary_6_sci", "secondary_6_lit"]))
        }, { merge: true });
        console.log("[Islamia Seeder] Updated Subject grades to include 6th Grade.");
      }
    }

    // 2. Get or Create Chapter "الوحدة الأولى" under this subject
    const chaptersCol = collection(db, 'chapters');
    const chapterQuery = query(chaptersCol, where('name', '==', 'الوحدة الأولى'));
    const chapterSnap = await getDocs(chapterQuery);
    
    let chapterId = '';
    let foundChapter = chapterSnap.docs.find(d => {
      const data = d.data();
      return data.subjectId === subjectId || (data.subjectIds && data.subjectIds.includes(subjectId));
    });

    if (!foundChapter) {
      console.log("[Islamia Seeder] Chapter 'الوحدة الأولى' not found. Creating...");
      const newChapterRef = await addDoc(chaptersCol, {
        name: "الوحدة الأولى",
        subjectId: subjectId,
        subjectIds: [subjectId],
        orderIndex: 1
      });
      chapterId = newChapterRef.id;
      console.log("[Islamia Seeder] Created Chapter ID:", chapterId);
    } else {
      chapterId = foundChapter.id;
      console.log("[Islamia Seeder] Existing Chapter ID found:", chapterId);
      
      // Upgrade list-based subject references if needed
      const currentData = foundChapter.data();
      if (!currentData.subjectIds || !currentData.subjectIds.includes(subjectId)) {
        await setDoc(doc(db, 'chapters', chapterId), {
          ...currentData,
          subjectId: subjectId,
          subjectIds: Array.from(new Set([...(currentData.subjectIds || []), subjectId]))
        }, { merge: true });
        console.log("[Islamia Seeder] Updated Chapter subjectIds list.");
      }
    }

    // 3. Get or Create Teacher "ساجد العكيلي" for this subject
    const teachersCol = collection(db, 'teachers');
    const teacherQuery = query(teachersCol, where('name', '==', 'ساجد العكيلي'));
    const teacherSnap = await getDocs(teacherQuery);
    
    let teacherId = '';
    let foundTeacher = teacherSnap.docs.find(d => d.data().subjectId === subjectId);

    if (!foundTeacher) {
      console.log("[Islamia Seeder] Teacher 'ساجد العكيلي' not found. Creating...");
      const newTeacherRef = await addDoc(teachersCol, {
        name: "ساجد العكيلي",
        subjectId: subjectId,
        avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Sajid"
      });
      teacherId = newTeacherRef.id;
      console.log("[Islamia Seeder] Created Teacher ID:", teacherId);
    } else {
      teacherId = foundTeacher.id;
      console.log("[Islamia Seeder] Existing Teacher ID found:", teacherId);
    }

    // 3.5. Clean up legacy VK lectures for this teacher and chapter if any exist
    const materialsCol = collection(db, 'materials');
    const oldMaterialsQuery = query(
      materialsCol,
      where('teacherId', '==', teacherId),
      where('chapterId', '==', chapterId),
      where('type', '==', 'VK')
    );
    const oldMaterialsSnap = await getDocs(oldMaterialsQuery);
    if (!oldMaterialsSnap.empty) {
      console.log(`[Islamia Seeder] Found ${oldMaterialsSnap.size} legacy VK materials to delete. Cleaning up...`);
      for (const d of oldMaterialsSnap.docs) {
        await deleteDoc(doc(db, 'materials', d.id));
        console.log(`[Islamia Seeder] Deleted legacy material: "${d.data().title}"`);
      }
    }

    // 4. Seeding Lectures/Materials
    
    for (const lecture of LECTURES) {
      const matQuery = query(
        materialsCol, 
        where('title', '==', lecture.title),
        where('subjectId', '==', subjectId)
      );
      const matSnap = await getDocs(matQuery);
      
      if (matSnap.empty) {
        console.log(`[Islamia Seeder] Seeding lecture: "${lecture.title}"...`);
        await addDoc(materialsCol, {
          title: lecture.title,
          url: lecture.url,
          type: lecture.type,
          order_index: lecture.order_index,
          subjectId: subjectId,
          subjectIds: [subjectId],
          chapterId: chapterId,
          chapterIds: [chapterId],
          teacherId: teacherId,
          createdAt: new Date().toISOString()
        });
      } else {
        console.log(`[Islamia Seeder] Lecture already exists: "${lecture.title}". Skipping.`);
      }
    }

    console.log("[Islamia Seeder] Database seeding verified successfully! 🎉");
    return true;
  } catch (error) {
    console.error("[Islamia Seeder] Seeding failed with error:", error);
    return false;
  }
}
