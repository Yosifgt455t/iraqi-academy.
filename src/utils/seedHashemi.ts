import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface MaterialSeed {
  title: string;
  url: string;
  type: 'Video';
  order_index: number;
}

const CHAPTER1_LECTURES: MaterialSeed[] = [
  {
    title: "علم الثرموداينمك - محاضرة 1",
    url: "https://geo.dailymotion.com/player.html?video=k4OsOvhwuMDlFCG9376",
    type: 'Video',
    order_index: 1
  },
  {
    title: "علم الثرموداينمك - محاضرة 2",
    url: "https://geo.dailymotion.com/player.html?video=k4h4IMdE9qboWnG97fU",
    type: 'Video',
    order_index: 2
  },
  {
    title: "علم الثرموداينمك - محاضرة 3",
    url: "https://geo.dailymotion.com/player.html?video=k3vvGefeJQ2zciG990u",
    type: 'Video',
    order_index: 3
  },
  {
    title: "علم الثرموداينمك - محاضرة 4",
    url: "https://geo.dailymotion.com/player.html?video=k6NPw2SngIPynlG9a9c",
    type: 'Video',
    order_index: 4
  },
  {
    title: "علم الثرموداينمك - محاضرة 5",
    url: "https://geo.dailymotion.com/player.html?video=kG9krWXYlBVit5G9b0I",
    type: 'Video',
    order_index: 5
  },
  {
    title: "علم الثرموداينمك - محاضرة 6",
    url: "https://geo.dailymotion.com/player.html?video=k4oaJeULvHU0G0G9fa0",
    type: 'Video',
    order_index: 6
  },
  {
    title: "علم الثرموداينمك - محاضرة 7",
    url: "https://geo.dailymotion.com/player.html?video=k2f5SwWVGv54JCG9fCi",
    type: 'Video',
    order_index: 7
  },
  {
    title: "علم الثرموداينمك - محاضرة 8",
    url: "https://geo.dailymotion.com/player.html?video=k7L8OpjhKWxLsXG9g8a",
    type: 'Video',
    order_index: 8
  },
  {
    title: "علم الثرموداينمك - محاضرة 9",
    url: "https://geo.dailymotion.com/player.html?video=xaat7k4",
    type: 'Video',
    order_index: 9
  },
  {
    title: "علم الثرموداينمك - محاضرة 10",
    url: "https://geo.dailymotion.com/player.html?video=k4P8gXtNxzLrbBGahKO",
    type: 'Video',
    order_index: 10
  },
  {
    title: "علم الثرموداينمك - محاضرة 11",
    url: "https://geo.dailymotion.com/player.html?video=k4foi8J16veXzTGaqMU",
    type: 'Video',
    order_index: 11
  },
  {
    title: "علم الثرموداينمك - محاضرة 12",
    url: "https://geo.dailymotion.com/player.html?video=k4500L9G97gV3RGardw",
    type: 'Video',
    order_index: 12
  },
  {
    title: "علم الثرموداينمك - محاضرة 13",
    url: "https://geo.dailymotion.com/player.html?video=k3OvWB9zfGfs7IGas4k",
    type: 'Video',
    order_index: 13
  },
  {
    title: "علم الثرموداينمك - محاضرة 14",
    url: "https://geo.dailymotion.com/player.html?video=k3h7QvhSS5fuqEGasuw",
    type: 'Video',
    order_index: 14
  },
  {
    title: "علم الثرموداينمك - محاضرة 15",
    url: "https://geo.dailymotion.com/player.html?video=k7wCbqIjlfYNLhGasNA",
    type: 'Video',
    order_index: 15
  },
  {
    title: "علم الثرموداينمك - محاضرة 16",
    url: "https://geo.dailymotion.com/player.html?video=k5fkasIaGASctyGtKbo",
    type: 'Video',
    order_index: 16
  },
  {
    title: "علم الثرموداينمك - محاضرة 17",
    url: "https://geo.dailymotion.com/player.html?video=k2YkTVMRH8zW1oGtKbs",
    type: 'Video',
    order_index: 17
  },
  {
    title: "علم الثرموداينمك - محاضرة 18",
    url: "https://geo.dailymotion.com/player.html?video=k7rszbCqWaUcpkGaGVk",
    type: 'Video',
    order_index: 18
  },
  {
    title: "علم الثرموداينمك - محاضرة 19",
    url: "https://geo.dailymotion.com/player.html?video=k5K2mi0OtQIVBAGaGY6",
    type: 'Video',
    order_index: 19
  },
  {
    title: "علم الثرموداينمك - محاضرة 20",
    url: "https://geo.dailymotion.com/player.html?video=k1WhQpH62hQqwpGaH20",
    type: 'Video',
    order_index: 20
  },
  {
    title: "علم الثرموداينمك - محاضرة 21",
    url: "https://geo.dailymotion.com/player.html?video=k7Jp6iZxko6hXaGaH40",
    type: 'Video',
    order_index: 21
  },
  {
    title: "علم الثرموداينمك - محاضرة 22",
    url: "https://geo.dailymotion.com/player.html?video=k4EtVPW61TFjSIGaHCW",
    type: 'Video',
    order_index: 22
  },
  {
    title: "علم الثرموداينمك - محاضرة 23",
    url: "https://geo.dailymotion.com/player.html?video=k3zt7sx8EyXNByGbtLw",
    type: 'Video',
    order_index: 23
  },
  {
    title: "علم الثرموداينمك - محاضرة 24",
    url: "https://geo.dailymotion.com/player.html?video=k4kN9EaXGBtkagGbura",
    type: 'Video',
    order_index: 24
  },
  {
    title: "علم الثرموداينمك - محاضرة 25",
    url: "https://geo.dailymotion.com/player.html?video=k7LNRXvDmSnf8OGbuP8",
    type: 'Video',
    order_index: 25
  },
  {
    title: "علم الثرموداينمك - محاضرة 26",
    url: "https://geo.dailymotion.com/player.html?video=k4Of40v5SzE37TGbvgw",
    type: 'Video',
    order_index: 26
  },
  {
    title: "علم الثرموداينمك - محاضرة 27",
    url: "https://geo.dailymotion.com/player.html?video=k3B76DtD0jQceGGbvVQ",
    type: 'Video',
    order_index: 27
  },
  {
    title: "علم الثرموداينمك - محاضرة 28",
    url: "https://geo.dailymotion.com/player.html?video=kaD628hJaZgy2nGbwbg",
    type: 'Video',
    order_index: 28
  },
  {
    title: "علم الثرموداينمك - محاضرة 29",
    url: "https://geo.dailymotion.com/player.html?video=k6cwKCe9PT6F1LGbwqe",
    type: 'Video',
    order_index: 29
  },
  {
    title: "علم الثرموداينمك - محاضرة 30",
    url: "https://geo.dailymotion.com/player.html?video=k1Jf6jxmZBjVfVGbwJY",
    type: 'Video',
    order_index: 30
  },
  {
    title: "علم الثرموداينمك - محاضرة 31",
    url: "https://geo.dailymotion.com/player.html?video=k2vtQT5oR8gTXkGbxy6",
    type: 'Video',
    order_index: 31
  },
  {
    title: "علم الثرموداينمك - محاضرة 32",
    url: "https://geo.dailymotion.com/player.html?video=k7mTxPn9XhLM3tGbyvy",
    type: 'Video',
    order_index: 32
  },
  {
    title: "علم الثرموداينمك - محاضرة 33",
    url: "https://geo.dailymotion.com/player.html?video=k4CxBSdcyys5vcGcu4g",
    type: 'Video',
    order_index: 33
  },
  {
    title: "علم الثرموداينمك - محاضرة 34",
    url: "https://geo.dailymotion.com/player.html?video=k1sJmJOoYvYnRXGculC",
    type: 'Video',
    order_index: 34
  },
  {
    title: "علم الثرموداينمك - محاضرة 35",
    url: "https://geo.dailymotion.com/player.html?video=k1VI3DonoqlL47GcwEQ",
    type: 'Video',
    order_index: 35
  }
];

const CHAPTER2_LECTURES: MaterialSeed[] = [
  {
    title: "الاتزان الكيميائي - محاضرة 1",
    url: "https://geo.dailymotion.com/player.html?video=kKEdh3Qar2QEOEGsv4G",
    type: 'Video',
    order_index: 1
  },
  {
    title: "الاتزان الكيميائي - محاضرة 2",
    url: "https://geo.dailymotion.com/player.html?video=k3ma7rVeDEdC51GpO8G",
    type: 'Video',
    order_index: 2
  },
  {
    title: "الاتزان الكيميائي - محاضرة 3",
    url: "https://geo.dailymotion.com/player.html?video=k55YJsQJ8heatgGpOds",
    type: 'Video',
    order_index: 3
  },
  {
    title: "الاتزان الكيميائي - محاضرة 4",
    url: "https://geo.dailymotion.com/player.html?video=kVFf7NcWqAxiTzGrbZU",
    type: 'Video',
    order_index: 4
  },
  {
    title: "الاتزان الكيميائي - محاضرة 5",
    url: "https://geo.dailymotion.com/player.html?video=k2Vc7xjTf6iEsQGrGo6",
    type: 'Video',
    order_index: 5
  },
  {
    title: "الاتزان الكيميائي - محاضرة 6",
    url: "https://geo.dailymotion.com/player.html?video=k7mp2K3RMxUOmOGrHvo",
    type: 'Video',
    order_index: 6
  },
  {
    title: "الاتزان الكيميائي - محاضرة 7",
    url: "https://geo.dailymotion.com/player.html?video=k23NU9BNL3CWksGrJX4",
    type: 'Video',
    order_index: 7
  },
  {
    title: "الاتزان الكيميائي - محاضرة 8",
    url: "https://geo.dailymotion.com/player.html?video=k5eNxNfcigi6SUGrKUq",
    type: 'Video',
    order_index: 8
  },
  {
    title: "الاتزان الكيميائي - محاضرة 9",
    url: "https://geo.dailymotion.com/player.html?video=kP64JyAQpONK7JGsooi",
    type: 'Video',
    order_index: 9
  },
  {
    title: "الاتزان الكيميائي - محاضرة 10",
    url: "https://geo.dailymotion.com/player.html?video=k2bNIoMLY1pD0dGsr0a",
    type: 'Video',
    order_index: 10
  },
  {
    title: "الاتزان الكيميائي - محاضرة 11",
    url: "https://geo.dailymotion.com/player.html?video=k6pUFdnk6rNbQaGsoNQ",
    type: 'Video',
    order_index: 11
  }
];

export async function migrateHashemiLectures() {
  try {
    console.log("[Hashemi Migrator] Starting robust migration process...");

    // 1. Get Subject "الكيمياء"
    const subjectsCol = collection(db, 'subjects');
    const subjectQuery = query(subjectsCol, where('name', '==', 'الكيمياء'));
    const subjectSnap = await getDocs(subjectQuery);
    
    let subjectId = '';
    
    if (subjectSnap.empty) {
      console.log("[Hashemi Migrator] Subject 'الكيمياء' not found. Creating...");
      const newSubjectRef = await addDoc(subjectsCol, {
        name: "الكيمياء",
        grades: ["secondary_6_sci"]
      });
      subjectId = newSubjectRef.id;
    } else {
      subjectId = subjectSnap.docs[0].id;
      console.log("[Hashemi Migrator] Subject 'الكيمياء' ID:", subjectId);
    }

    // 2. Identify all possible Teacher IDs for "حسين الهاشمي"
    const teachersCol = collection(db, 'teachers');
    const teacherSnap = await getDocs(teachersCol);
    const hashemiTeacherIds: string[] = [];
    let primaryTeacherId = '';

    teacherSnap.docs.forEach(d => {
      const name = d.data().name || "";
      if (name.includes("حسين الهاشمي") || name.includes("الهاشمي") || d.id === 'hashemi_legacy') {
        hashemiTeacherIds.push(d.id);
        if (d.data().subjectId === subjectId && !primaryTeacherId) {
          primaryTeacherId = d.id;
        }
      }
    });

    if (!primaryTeacherId) {
      // Create if none found
      console.log("[Hashemi Migrator] Creating primary teacher document for حسين الهاشمي...");
      const docRef = await addDoc(teachersCol, {
        name: "حسين الهاشمي",
        subjectId: subjectId,
        avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Hashemi"
      });
      primaryTeacherId = docRef.id;
      hashemiTeacherIds.push(primaryTeacherId);
    }

    console.log("[Hashemi Migrator] Matches for teacher IDs 'حسين الهاشمي':", hashemiTeacherIds);
    console.log("[Hashemi Migrator] Primary Teacher ID to be used:", primaryTeacherId);

    // 3. Robust query for all chapters associated with Chemistry
    const chaptersCol = collection(db, 'chapters');
    const allChaptersSnap = await getDocs(chaptersCol);
    
    const chemistryChapters: any[] = [];
    allChaptersSnap.docs.forEach(chapDoc => {
      const data = chapDoc.data();
      const belongsToChem = 
        data.subjectId === subjectId || 
        (data.subjectIds && Array.isArray(data.subjectIds) && data.subjectIds.includes(subjectId));
      
      if (belongsToChem) {
        chemistryChapters.push({ id: chapDoc.id, ...data });
      }
    });

    console.log(`[Hashemi Migrator] Found ${chemistryChapters.length} chapters under Chemistry`);

    // Group chapters into Chapter 1 and Chapter 2
    const ch1List: any[] = [];
    const ch2List: any[] = [];

    chemistryChapters.forEach(chap => {
      const name = chap.name || "";
      const isCh1 = name.includes("الأول") || name.includes("الاول") || name.includes("الثرموداينمك") || name.includes("ثرموداينمك") || chap.orderIndex === 1;
      const isCh2 = name.includes("الثاني") || name.includes("الاتزان") || name.includes("اتزان") || name.includes("كيميائي") || chap.orderIndex === 2;

      if (isCh1) {
        ch1List.push(chap);
      } else if (isCh2) {
        ch2List.push(chap);
      }
    });

    let ch1Id = '';
    let ch2Id = '';

    // Handle Chapter 1 DUPs and Merge them
    if (ch1List.length > 0) {
      // Pick first as target
      ch1Id = ch1List[0].id;
      console.log("[Hashemi Migrator] Target Chapter 1 ID selected:", ch1Id);

      // Update name to beautiful standard
      await updateDoc(doc(db, 'chapters', ch1Id), {
        name: "الفصل الأول: علم الثرموداينمك",
        orderIndex: 1,
        subjectId: subjectId,
        subjectIds: [subjectId]
      });

      // Migrate materials from duplicate Chapter 1 documents to target ch1Id, and delete duplicate chapters
      for (let i = 1; i < ch1List.length; i++) {
        const dupId = ch1List[i].id;
        console.log(`[Hashemi Migrator] Migrating duplicate Chapter 1 (ID: ${dupId}) to Target (ID: ${ch1Id})...`);

        // Fetch duplicate chapter materials
        const [dupSnap1, dupSnap2] = await Promise.all([
          getDocs(query(collection(db, 'materials'), where('chapterId', '==', dupId))),
          getDocs(query(collection(db, 'materials'), where('chapterIds', 'array-contains', dupId)))
        ]);

        const dupMatsMap = new Map<string, any>();
        dupSnap1.docs.forEach(docSnap => dupMatsMap.set(docSnap.id, docSnap.data()));
        dupSnap2.docs.forEach(docSnap => dupMatsMap.set(docSnap.id, docSnap.data()));

        for (const [matId, matData] of dupMatsMap.entries()) {
          console.log(`[Hashemi Migrator] Moving material "${matData.title}" (ID: ${matId}) to Chapter 1`);
          await updateDoc(doc(db, 'materials', matId), {
            chapterId: ch1Id,
            chapterIds: [ch1Id]
          });
        }

        // Delete the duplicate chapter record
        await deleteDoc(doc(db, 'chapters', dupId));
        console.log(`[Hashemi Migrator] Deleted duplicate Chapter 1 document (ID: ${dupId})`);
      }
    } else {
      console.log("[Hashemi Migrator] No Chapter 1 found. Creating one...");
      const docRef = await addDoc(chaptersCol, {
        name: "الفصل الأول: علم الثرموداينمك",
        subjectId: subjectId,
        subjectIds: [subjectId],
        orderIndex: 1
      });
      ch1Id = docRef.id;
    }

    // Handle Chapter 2 DUPs and Merge them
    if (ch2List.length > 0) {
      // Pick first as target
      ch2Id = ch2List[0].id;
      console.log("[Hashemi Migrator] Target Chapter 2 ID selected:", ch2Id);

      // Update name to beautiful standard
      await updateDoc(doc(db, 'chapters', ch2Id), {
        name: "الفصل الثاني: الاتزان الكيميائي",
        orderIndex: 2,
        subjectId: subjectId,
        subjectIds: [subjectId]
      });

      // Migrate materials from duplicate Chapter 2 documents to target ch2Id, and delete duplicate chapters
      for (let i = 1; i < ch2List.length; i++) {
        const dupId = ch2List[i].id;
        console.log(`[Hashemi Migrator] Migrating duplicate Chapter 2 (ID: ${dupId}) to Target (ID: ${ch2Id})...`);

        // Fetch duplicate chapter materials
        const [dupSnap1, dupSnap2] = await Promise.all([
          getDocs(query(collection(db, 'materials'), where('chapterId', '==', dupId))),
          getDocs(query(collection(db, 'materials'), where('chapterIds', 'array-contains', dupId)))
        ]);

        const dupMatsMap = new Map<string, any>();
        dupSnap1.docs.forEach(docSnap => dupMatsMap.set(docSnap.id, docSnap.data()));
        dupSnap2.docs.forEach(docSnap => dupMatsMap.set(docSnap.id, docSnap.data()));

        for (const [matId, matData] of dupMatsMap.entries()) {
          console.log(`[Hashemi Migrator] Moving material "${matData.title}" (ID: ${matId}) to Chapter 2`);
          await updateDoc(doc(db, 'materials', matId), {
            chapterId: ch2Id,
            chapterIds: [ch2Id]
          });
        }

        // Delete the duplicate chapter record
        await deleteDoc(doc(db, 'chapters', dupId));
        console.log(`[Hashemi Migrator] Deleted duplicate Chapter 2 document (ID: ${dupId})`);
      }
    } else {
      console.log("[Hashemi Migrator] No Chapter 2 found. Creating one...");
      const docRef = await addDoc(chaptersCol, {
        name: "الفصل الثاني: الاتزان الكيميائي",
        subjectId: subjectId,
        subjectIds: [subjectId],
        orderIndex: 2
      });
      ch2Id = docRef.id;
    }

    // 4. Delete ALL old lectures of Teacher "حسين الهاشمي" (especially old YouTube ones)
    console.log("[Hashemi Migrator] Cleaning up old materials...");
    const materialsCol = collection(db, 'materials');
    const allMaterialsSnap = await getDocs(materialsCol);
    
    let deletedCount = 0;
    for (const matDoc of allMaterialsSnap.docs) {
      const data = matDoc.data();
      const url = data.url || "";
      const title = data.title || "";
      const matTeacherId = data.teacherId || "";
      
      const belongsToHashemi = hashemiTeacherIds.includes(matTeacherId);
      const hasHashemiKeywords = title.includes("الهاشمي") || title.includes("حسين الهاشمي");
      const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
      
      // If it belongs to Hashemi, or is a Youtube video with hashemi keywords under Chemistry
      if (belongsToHashemi || (hasHashemiKeywords && (isYoutube || data.subjectId === subjectId))) {
        await deleteDoc(doc(db, 'materials', matDoc.id));
        deletedCount++;
        console.log(`[Hashemi Migrator] Deleted old lecture: "${title}" (URL: ${url})`);
      }
    }
    console.log(`[Hashemi Migrator] Deleted ${deletedCount} legacy materials for Hussein Al-Hashemi`);

    // 5. Seed Clean Dailymotion Lectures for Chapter 1
    console.log("[Hashemi Migrator] Seeding Chapter 1 Dailymotion Lectures...");
    for (const lecture of CHAPTER1_LECTURES) {
      await addDoc(materialsCol, {
        title: lecture.title,
        url: lecture.url,
        type: lecture.type,
        order_index: lecture.order_index,
        subjectId: subjectId,
        subjectIds: [subjectId],
        chapterId: ch1Id,
        chapterIds: [ch1Id],
        teacherId: primaryTeacherId,
        createdAt: new Date().toISOString()
      });
      console.log(`[Hashemi Migrator] Seeded: "${lecture.title}"`);
    }

    // 6. Seed Clean Dailymotion Lectures for Chapter 2
    console.log("[Hashemi Migrator] Seeding Chapter 2 Dailymotion Lectures...");
    for (const lecture of CHAPTER2_LECTURES) {
      await addDoc(materialsCol, {
        title: lecture.title,
        url: lecture.url,
        type: lecture.type,
        order_index: lecture.order_index,
        subjectId: subjectId,
        subjectIds: [subjectId],
        chapterId: ch2Id,
        chapterIds: [ch2Id],
        teacherId: primaryTeacherId,
        createdAt: new Date().toISOString()
      });
      console.log(`[Hashemi Migrator] Seeded: "${lecture.title}"`);
    }

    console.log("[Hashemi Migrator] All tasks executed successfully! 🚀");
    return true;
  } catch (err) {
    console.error("[Hashemi Migrator] Error during execution:", err);
    return false;
  }
}
