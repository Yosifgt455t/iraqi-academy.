import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, (firebaseConfig).firestoreDatabaseId);

const biologyQuestions = [
  {
    chapterIds: ["yj6AYJI3QUn0tOH9zTal"],
    question: "ما هي أهم مساهمات وأعمال العالم الألماني ماثياس شلايدن في علم الخلية؟",
    answer: "توصل العالم الألماني ماثياس شلايدن في عام 1838م إلى أن جميع النباتات تتكون من خلايا، مما ساهم لاحقاً في صياغة الأسس العامة لنظرية الخلية.",
    year: "2015 دور أول",
    order_index: 1
  },
  {
    chapterIds: ["yj6AYJI3QUn0tOH9zTal"],
    question: "ما هي مساهمة العالم ثيودور شوان في تطوير علم الخلية؟",
    answer: "أعلن عالم الحيوان الألماني ثيودور شوان في عام 1839م أن جميع الحيوانات تتكون من خلايا، وتشارك مع شلايدن في وضع أسس نظرية الخلية.",
    year: "2016 دور ثاني",
    order_index: 2
  },
  {
    chapterIds: ["yj6AYJI3QUn0tOH9zTal"],
    question: "من هو العالم الذي اكتشف نواة الخلية وقدم وصفاً لها؟ وفي أي عام؟",
    answer: "اكتشف نواة الخلية وقدم وصفاً كاملاً وعلمياً لها العالم الاسكتلندي روبرت براون في عام 1831م.",
    year: "2019 دور ثالث",
    order_index: 3
  },
  {
    chapterIds: ["yj6AYJI3QUn0tOH9zTal"],
    question: "كيف عرّف العالم روبرت هوك الخلية؟ وما هي أهم ملاحظاته؟",
    answer: "عرّف الخلية بأنها: 'ردهة هوائية تشبه تجويف خلية شمع العسل'. وهو أول من استخدم مصطلح مسمى 'خلية' (Cell) بعد أن فحص نسيج الفلين ووصف الوحدات الفلينية فيه.",
    year: "2018 دور أول",
    order_index: 4
  },
  {
    chapterIds: ["yj6AYJI3QUn0tOH9zTal"],
    question: "ما الذي تميز به العالم أنتوني فان ليفنهوك في تاريخ علم الخلية؟",
    answer: "هو أول شخص استطاع أن يرى الخلية الحية تحت المجهر بعد أن قام بصنع مجهره البسيط (الذي يكبر الأشياء لـ 270 مرة)، وقام بوصف خلايا الدم الحمراء والحيوانات المنوية والكائنات الدقيقة.",
    year: "2017 تمهيدي",
    order_index: 5
  },
  {
    chapterIds: ["yj6AYJI3QUn0tOH9zTal"],
    question: "عرّف نظرية الخلية (Cell Theory)، واذكر العالمَيْن اللذين صاغا أسسها.",
    answer: "هي نظرية تصف الخلية بأنها الوحدة الأساسية والتركيبية والوظيفية لجميع الكائنات الحية. صاغ أسسها العالمان الألمانيان ماثياس شلايدن وثيودور شوان، وتعتمد على أن جميع الكائنات تتكون من خلايا مستحوذة على القدرة على الانقسام.",
    year: "2020 دور أول",
    order_index: 6
  },
  {
    chapterIds: ["yj6AYJI3QUn0tOH9zTal"],
    question: "ما هي الأسس الإستراتيجية الثلاثة التي ترتكز عليها نظرية الخلية؟",
    answer: "ترتكز نظرية الخلية على ثلاثة أسس رئيسية:\n1. جميع الكائنات الحية تتكون من خلايا.\n2. الخلايا هي الوحدات الأساسية والتركيبية والوظيفية لجميع الكائنات الحية.\n3. الخلايا تنتج وتنشأ دائماً من خلايا أخرى سابقة لها من خلال عملية انقسامها.",
    year: "2022 تمهيدي",
    order_index: 7
  },
  {
    chapterIds: ["yj6AYJI3QUn0tOH9zTal"],
    question: "ما منشأ ومصدر الخلايا الجديدة وفق البند الثالث لنظرية الخلية؟",
    answer: "منشأ الخلايا هو دائماً من خلايا أخرى سابقة لها، وتنتج وتتشكل من خلال انقسام تلك الخلايا السابقة علمياً.",
    year: "2013 دور ثاني",
    order_index: 8
  },
  {
    chapterIds: ["yj6AYJI3QUn0tOH9zTal"],
    question: "سؤال وزاري: من هما العالمان اللذان وضعا وصاغا البنية النظرية لنظرية الخلية؟",
    answer: "هما العالمان الألمانيان: ماثياس شلايدن (عالم النبات الذي أثبت تكوين النباتات من خلايا عام 1838م)، وتيودور شوان (عالم الحيوان الذي أثبت تكوين الحيوانات من خلايا عام 1839م).",
    year: "2021 دور ثاني",
    order_index: 9
  }
];

async function run() {
  console.log("Fetching all existing ministerial questions from the database...");
  const collRef = collection(db, 'ministerial_questions');
  const snapshot = await getDocs(collRef);
  
  console.log(`Found ${snapshot.size} existing ministerial questions. Deleting them...`);
  let deleteCount = 0;
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, 'ministerial_questions', docSnap.id));
    deleteCount++;
  }
  console.log(`Successfully deleted ${deleteCount} previous ministerial questions.`);

  console.log(`Adding ${biologyQuestions.length} new biology ministerial questions to the database...`);
  let addCount = 0;
  for (const q of biologyQuestions) {
    const docRef = await addDoc(collRef, q);
    console.log(`Added question with ID: ${docRef.id} - ${q.question.substring(0, 40)}...`);
    addCount++;
  }
  
  console.log(`Successfully added ${addCount} biology ministerial questions! Done.`);
  process.exit(0);
}

run().catch(err => {
  console.error("Error updating ministerial questions:", err);
  process.exit(1);
});
