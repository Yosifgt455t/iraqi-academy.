import { collection, query, where, getDocs, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface MaterialSeed {
  title: string;
  url: string;
  type: 'VK';
  order_index: number;
}

const LECTURES: MaterialSeed[] = [
  {
    title: "المحاضرة 1: علم الثرموداينمك والمصطلحات والحرارة",
    url: "https://vkvideo.ru/video-230336496_456239046?playlist_id=29",
    type: 'VK',
    order_index: 1
  },
  {
    title: "المحاضرة 2: الحرارة وقانون Q = C * dT",
    url: "https://vkvideo.ru/video-230336496_456239047?playlist_id=29",
    type: 'VK',
    order_index: 2
  },
  {
    title: "المحاضرة 3: حل مسائل الحرارة وحساب درجة الحرارة",
    url: "https://vkvideo.ru/video-230336496_456239048?playlist_id=29",
    type: 'VK',
    order_index: 3
  },
  {
    title: "المحاضرة 4: السعر الحراري والمسعر",
    url: "https://vkvideo.ru/video-230336496_456239049?playlist_id=29",
    type: 'VK',
    order_index: 4
  },
  {
    title: "المحاضرة 5: تابع المسعر الحراري وحل مسائله",
    url: "https://vkvideo.ru/video-230336496_456239050?playlist_id=29",
    type: 'VK',
    order_index: 5
  },
  {
    title: "المحاضرة 6: انثالبي التفاعل القياسية ودوال الحالة",
    url: "https://vkvideo.ru/video-230336496_456239051?playlist_id=29",
    type: 'VK',
    order_index: 6
  },
  {
    title: "المحاضرة 7: المعادلة الكيميائية الحرارية وشروطها القياسية",
    url: "https://vkvideo.ru/video-230336496_456239052?playlist_id=29",
    type: 'VK',
    order_index: 7
  },
  {
    title: "المحاضرة 8: انثالبي القياسية: التكوين القياسي ΔHf",
    url: "https://vkvideo.ru/video-230336496_456239053?playlist_id=29",
    type: 'VK',
    order_index: 8
  },
  {
    title: "المحاضرة 9: طريقة حساب انثالبي التفاعل القياسية من انثالبي التكوين",
    url: "https://vkvideo.ru/video-230336496_456239054?playlist_id=29",
    type: 'VK',
    order_index: 9
  },
  {
    title: "المحاضرة 10: انثالبي الاحتراق القياسي ΔHc وحل التمارين",
    url: "https://vkvideo.ru/video-230336496_456239055?playlist_id=29",
    type: 'VK',
    order_index: 10
  },
  {
    title: "المحاضرة 11: قانون هس والمفهوم الأساسي والمقدمة",
    url: "https://vkvideo.ru/video-230336496_456239056?playlist_id=29",
    type: 'VK',
    order_index: 11
  },
  {
    title: "المحاضرة 12: حل وحذف المعادلات باستخدام قانون هس (الجزء 1)",
    url: "https://vkvideo.ru/video-230336496_456239057?playlist_id=29",
    type: 'VK',
    order_index: 12
  },
  {
    title: "المحاضرة 13: حل وحذف المعادلات باستخدام قانون هس (الجزء 2)",
    url: "https://vkvideo.ru/video-230336496_456239058?playlist_id=29",
    type: 'VK',
    order_index: 13
  },
  {
    title: "المحاضرة 14: الأسئلة الكلامية والواجبات حول قانون هس",
    url: "https://vkvideo.ru/video-230336496_456239059?playlist_id=29",
    type: 'VK',
    order_index: 14
  },
  {
    title: "المحاضرة 15: حساب انثالبي التفاعل القياسي من قيم انثالبي التكوين",
    url: "https://vkvideo.ru/video-230336496_456239060?playlist_id=29",
    type: 'VK',
    order_index: 15
  },
  {
    title: "المحاضرة 16: العمليات التلقائية واللا تلقائية للتفاعلات",
    url: "https://vkvideo.ru/video-230336496_456239061?playlist_id=29",
    type: 'VK',
    order_index: 16
  },
  {
    title: "المحاضرة 17: الانتروبي والتغير في العشوائية وعلاقتها بالتلقائية",
    url: "https://vkvideo.ru/video-230336496_456239062?playlist_id=29",
    type: 'VK',
    order_index: 17
  },
  {
    title: "المحاضرة 18: قياس نسبة الأنتروبي ΔS والتغير في العشوائية",
    url: "https://vkvideo.ru/video-230336496_456239063?playlist_id=29",
    type: 'VK',
    order_index: 18
  },
  {
    title: "المحاضرة 19: طاقة كبس الحرة ΔG كعامل نهائي للتلقائية",
    url: "https://vkvideo.ru/video-230336496_456239064?playlist_id=29",
    type: 'VK',
    order_index: 19
  },
  {
    title: "المحاضرة 20: تطبيقات وحل معادلات ومعالجات علاقة كبس (الجزء 1)",
    url: "https://vkvideo.ru/video-230336496_456239065?playlist_id=29",
    type: 'VK',
    order_index: 20
  },
  {
    title: "المحاضرة 21: تطبيقات وحل معادلات ومعالجات علاقة كبس (الجزء 2)",
    url: "https://vkvideo.ru/video-230336496_456239066?playlist_id=29",
    type: 'VK',
    order_index: 21
  },
  {
    title: "المحاضرة 22: تعاليل كبس والأسئلة الوزارية الشاملة للفصل الأول",
    url: "https://vkvideo.ru/video-230336496_456239067?playlist_id=29",
    type: 'VK',
    order_index: 22
  },
  {
    title: "المحاضرة 23: طاقة كبس الحرة القياسية للتكوين ΔGf",
    url: "https://vkvideo.ru/video-230336496_456239068?playlist_id=29",
    type: 'VK',
    order_index: 23
  },
  {
    title: "المحاضرة 24: حساب طاقة كبس الحرة القياسية للتفاعل من قيم ΔGf",
    url: "https://vkvideo.ru/video-230336496_456239069?playlist_id=29",
    type: 'VK',
    order_index: 24
  },
  {
    title: "المحاضرة 25: علاقة تروتن وحل التمارين المتعلقة بها بالتفصيل",
    url: "https://vkvideo.ru/video-230336496_456239070?playlist_id=29",
    type: 'VK',
    order_index: 25
  },
  {
    title: "المحاضرة 26: ملخص قوانين وملاحظات الفصل الأول بالكامل",
    url: "https://vkvideo.ru/video-230336496_456239071?playlist_id=29",
    type: 'VK',
    order_index: 26
  },
  {
    title: "المحاضرة 27: حل الأسئلة والتمارين والواجبات الخاصة بالفصل الأول",
    url: "https://vkvideo.ru/video-230336496_456239072?playlist_id=29",
    type: 'VK',
    order_index: 27
  },
  {
    title: "المحاضرة 28: حل الأسئلة والتمارين والواجبات الخاصة بالفصل الأول (تكملة)",
    url: "https://vkvideo.ru/video-230336496_456239073?playlist_id=29",
    type: 'VK',
    order_index: 28
  },
  {
    title: "المحاضرة 29: حل وزاريات الفصل الأول (السنوات السابقة والمكررة)",
    url: "https://vkvideo.ru/video-230336496_456239074?playlist_id=29",
    type: 'VK',
    order_index: 29
  },
  {
    title: "المحاضرة 30: المراجعة الشاملة لأسئلة ومسائل علم الثرموداينمك",
    url: "https://vkvideo.ru/video-230336496_456239075?playlist_id=29",
    type: 'VK',
    order_index: 30
  },
  {
    title: "المحاضرة 31: المراجعة المركزة للفصل الأول للامتحان الوزاري",
    url: "https://vkvideo.ru/video-230336496_456239076?playlist_id=29",
    type: 'VK',
    order_index: 31
  },
  {
    title: "المحاضرة 32: حل أسئلة المتميزين والمدارس ثنائية اللغة بالفصل الأول",
    url: "https://vkvideo.ru/video-230336496_456239077?playlist_id=29",
    type: 'VK',
    order_index: 32
  },
  {
    title: "المحاضرة 33: مراجعة عامة وتصحيح تفاعلات وأحكام الفصل الأول",
    url: "https://vkvideo.ru/video-230336496_456239078?playlist_id=29",
    type: 'VK',
    order_index: 33
  },
  {
    title: "المحاضرة 34: الاختيار الذاتي وحل اختبار الفصل الأول",
    url: "https://vkvideo.ru/video-230336496_456239079?playlist_id=29",
    type: 'VK',
    order_index: 34
  },
  {
    title: "المحاضرة 35: الاختبار الشامل والتقييم النهائي للفصل الأول",
    url: "https://vkvideo.ru/video-230336496_456239080?playlist_id=29",
    type: 'VK',
    order_index: 35
  },
  {
    title: "المحاضرة المتكاملة: قائمة تشغيل الفصل الأول لحسين الهاشمي كاملة (علم الثرموداينمك)",
    url: "https://vkvideo.ru/video/playlist/-230336496_29",
    type: 'VK',
    order_index: 36
  }
];

export async function migrateHashemiLectures() {
  try {
    console.log("[Hashemi Migrator] Starting migration process...");

    // 1. Get Subject "الكيمياء"
    const subjectsCol = collection(db, 'subjects');
    const subjectQuery = query(subjectsCol, where('name', '==', 'الكيمياء'));
    const subjectSnap = await getDocs(subjectQuery);
    
    let subjectId = '';
    
    if (subjectSnap.empty) {
      console.log("[Hashemi Migrator] Subject 'الكيمياء' not found in database. Creating...");
      const newSubjectRef = await addDoc(subjectsCol, {
        name: "الكيمياء",
        grades: ["secondary_6_sci"] // Sixth Scientific in Iraq
      });
      subjectId = newSubjectRef.id;
    } else {
      subjectId = subjectSnap.docs[0].id;
      console.log("[Hashemi Migrator] Existing Subject 'الكيمياء' ID:", subjectId);
    }

    // 2. Get or Create Teacher "حسين الهاشمي" for Chemistry
    const teachersCol = collection(db, 'teachers');
    const teacherQuery = query(teachersCol, where('name', '==', 'حسين الهاشمي'));
    const teacherSnap = await getDocs(teacherQuery);
    
    let teacherId = '';
    let foundTeacher = teacherSnap.docs.find(d => d.data().subjectId === subjectId);

    if (!foundTeacher) {
      console.log("[Hashemi Migrator] Teacher 'حسين الهاشمي' not found. Creating...");
      const newTeacherRef = await addDoc(teachersCol, {
        name: "حسين الهاشمي",
        subjectId: subjectId,
        avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Hashemi"
      });
      teacherId = newTeacherRef.id;
    } else {
      teacherId = foundTeacher.id;
      console.log("[Hashemi Migrator] Found teacher 'حسين الهاشمي' ID:", teacherId);
    }

    // 3. Find Chapter "الفصل الأول" (or "علم الثرموداينمك" or create it if not exists)
    const chaptersCol = collection(db, 'chapters');
    const chapterQuery = query(chaptersCol, where('subjectId', '==', subjectId));
    const chapterSnap = await getDocs(chapterQuery);
    
    let chapterId = '';
    let foundChapter = chapterSnap.docs.find(d => {
      const name = d.data().name || "";
      return name.includes("الأول") || name.includes("الاول") || name.includes("الثرموداينمك");
    });

    if (!foundChapter) {
      console.log("[Hashemi Migrator] Chapter 'الفصل الأول' not found. Creating...");
      const newChapterRef = await addDoc(chaptersCol, {
        name: "الفصل الأول: علم الثرموداينمك",
        subjectId: subjectId,
        subjectIds: [subjectId],
        orderIndex: 1
      });
      chapterId = newChapterRef.id;
    } else {
      chapterId = foundChapter.id;
      console.log("[Hashemi Migrator] Existing Chapter ID:", chapterId);
    }

    // 4. Query current materials of this teacher in this chapter, and delete/replace them
    const materialsCol = collection(db, 'materials');
    const matQuery = query(
      materialsCol, 
      where('subjectId', '==', subjectId),
      where('chapterId', '==', chapterId),
      where('teacherId', '==', teacherId)
    );
    const matSnap = await getDocs(matQuery);
    
    if (!matSnap.empty) {
      console.log(`[Hashemi Migrator] Found ${matSnap.size} existing materials. Deleting to replace with VK playlist...`);
      for (const docSnap of matSnap.docs) {
        await deleteDoc(doc(db, 'materials', docSnap.id));
      }
      console.log("[Hashemi Migrator] Old lectures cleared successfully.");
    }

    // 5. Add the 16 new VK-playlist lectures
    for (const lecture of LECTURES) {
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
      console.log(`[Hashemi Migrator] Added: "${lecture.title}"`);
    }

    console.log("[Hashemi Migrator] Replacement completed successfully! 🚀");
    return true;
  } catch (err) {
    console.error("[Hashemi Migrator] Failed with error:", err);
    return false;
  }
}
