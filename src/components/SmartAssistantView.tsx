import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, FileText, Brain, History, Sparkles, BookOpen, AlertCircle, Loader2, Trash2, Check, X, Award, TrendingUp, ChevronRight, HelpCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getFirestore, collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ExamQuestion } from '../types';
import { extractTextFromPDF } from '../utils/pdfParser';
import { getAIClient, shouldSwitchKey } from '../services/aiService';
import { Type, Schema } from '@google/genai';
import mammoth from 'mammoth';

interface Props {
  onBack: () => void;
  userId: string;
  isAdmin?: boolean;
}

interface ExamHistoryEntry {
  id: string;
  score: number;
  totalScorable: number;
  totalQuestions: number;
  subject: string;
  date: string;
}

type ExamState = 'setup' | 'taking' | 'result' | 'fileSettings';

const SEED_INCORRECT_QUESTIONS = [
  {
    id: "seed_1",
    question: "يعود السبب في بياض درة الايطاليا إلى وجود...",
    subject: "امتحان أحياء",
    type: "MCQ",
    options: [
      "البروتينات الهيكلية الحرة",
      "عدم وجود الأوعية الدموية المغذية",
      "ترسيب الكيراتين والسيليكا بتركيزات عالية",
      "تراكم الشبه الفلزات في السيتوبلازم"
    ],
    correctAnswer: 2
  },
  {
    id: "seed_2",
    question: "أحيي، عالم تجده في حلة ثانية حيث قام...",
    subject: "عربي واجتماعيات",
    type: "MCQ",
    options: [
      "ابن مسكوية والتوحيدي",
      "ابن خلدون في مقدمته الشهيرة",
      "الجاحظ في كتاب البيان والتبيين",
      "الفارابي في آراء أهل المدينة الفاضلة"
    ],
    correctAnswer: 1
  },
  {
    id: "seed_3",
    question: "تم فحص عينات من نبات الطماطم وتبين وجود نقص حاد في مركب الفوسفات...",
    subject: "امتحان أحياء",
    type: "MCQ",
    options: [
      "نقص مركب الفوسفات المتوفر",
      "عدم كفاية الكلوروفيل للتنفس الخلوي",
      "زيادة تركيز أيونات الكالسيوم في الجذور",
      "ظهور أعراض العفن البكتيري المبكر"
    ],
    correctAnswer: 0
  },
  {
    id: "seed_4",
    question: "توجد الأنزيمات المسؤولة عن اختزال ثنائي النيوكليوتيد في...",
    subject: "امتحان أحياء",
    type: "MCQ",
    options: [
      "حشوة البلاستيدة الخضراء (الستروما)",
      "الغشاء الخارجي للميتوكندريا",
      "تجاويف الثايلوكويد الداخلي للكلوروفيل",
      "غشاء السايتوبلازم المبطن"
    ],
    correctAnswer: 0
  },
  {
    id: "seed_5",
    question: "أثاء فحص مجهري لعينات بيولوجية مختلفة، رصد الباحث خلايا غربالية مرافقة في...",
    subject: "امتحان أحياء",
    type: "MCQ",
    options: [
      "الخشب الثانوي الأولي النشط",
      "الأوعية الغربالية والخلية الوعائية للحاء",
      "القصيبات الوعائية واللحاء المتصل",
      "الخلية البدائية الحية والروابط البلازمية"
    ],
    correctAnswer: 1
  }
];

export default function SmartAssistantView({ onBack, userId, isAdmin = false }: Props) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'upload' | 'history' | 'admin_import'>('dashboard');
  const [incorrectQuestions, setIncorrectQuestions] = useState<any[]>([]);
  const [reviewingExam, setReviewingExam] = useState<any>(null);
  const [studentName, setStudentName] = useState('يوسف');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedRound, setSelectedRound] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');

  const [examState, setExamState] = useState<ExamState>('setup');
  const [loading, setLoading] = useState(false);
  
  // Admin import states
  const [adminImportText, setAdminImportText] = useState('');
  const [adminImportLoading, setAdminImportLoading] = useState(false);
  const [adminImportProgress, setAdminImportProgress] = useState('');

  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [score, setScore] = useState(0);

  const [allQuestions, setAllQuestions] = useState<ExamQuestion[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  const [examHistoryList, setExamHistoryList] = useState<ExamHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [uploadedFileContent, setUploadedFileContent] = useState<{text?: string, base64?: string, mimeType?: string, fileName?: string} | null>(null);
  const [uploadedFilesList, setUploadedFilesList] = useState<Array<{text?: string, base64?: string, mimeType?: string, fileName?: string}>>([]);
  const [genSettings, setGenSettings] = useState({
     examName: '',
     questionCount: '10',
     types: { mcq: true, tf: false, essay: false },
     language: 'العربية'
  });

  const [examsTakenCount, setExamsTakenCount] = useState(0);
  const [credits, setCredits] = useState<number>(600);
  const [adminTargetUserId, setAdminTargetUserId] = useState(userId || '');
  const [adminPointsInput, setAdminPointsInput] = useState('600');

  const updateCredits = (newCredits: number) => {
    setCredits(newCredits);
    try {
      localStorage.setItem(`credits_${userId}`, String(newCredits));
    } catch (e) {
      console.error(e);
    }
  };

  // Load initial daily count and incorrect questions list
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const storedCredits = localStorage.getItem(`credits_${userId}`);
      const lastResetDate = localStorage.getItem(`credits_date_${userId}`);
      
      if (lastResetDate !== today) {
        // A new day has arrived! Reset credits to exactly 600
        localStorage.setItem(`credits_${userId}`, '600');
        localStorage.setItem(`credits_date_${userId}`, today);
        setCredits(600);
      } else if (storedCredits !== null) {
        setCredits(parseInt(storedCredits, 10));
      } else {
        localStorage.setItem(`credits_${userId}`, '600');
        localStorage.setItem(`credits_date_${userId}`, today);
        setCredits(600);
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const dataStr = localStorage.getItem(`exam_limit_${userId}`);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.date === today) {
          setExamsTakenCount(data.count || 0);
        } else {
          setExamsTakenCount(0);
        }
      }
    } catch (e) {
      console.error(e);
    }

    // Load incorrect questions
    try {
      const stored = localStorage.getItem(`incorrect_questions_${userId}`);
      if (stored) {
        setIncorrectQuestions(JSON.parse(stored));
      } else {
        localStorage.setItem(`incorrect_questions_${userId}`, JSON.stringify(SEED_INCORRECT_QUESTIONS));
        setIncorrectQuestions(SEED_INCORRECT_QUESTIONS);
      }
    } catch (e) {
      console.error("Error loading incorrect questions", e);
    }

    // Load student name from local profile or auth
    try {
      const storedProfile = localStorage.getItem('user_profile');
      if (storedProfile) {
        const p = JSON.parse(storedProfile);
        if (p.name) setStudentName(p.name);
      }
    } catch(e) {}
  }, [userId]);

  const incrementDailyExamCount = () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const newCount = examsTakenCount + 1;
      localStorage.setItem(`exam_limit_${userId}`, JSON.stringify({
        date: today,
        count: newCount
      }));
      setExamsTakenCount(newCount);
    } catch (e) {
      console.error(e);
    }
  };

  // Admin AI text import state
  const handleAdminTextImport = async () => {
    if (!adminImportText.trim()) return;
    setAdminImportLoading(true);
    setAdminImportProgress('جاري معالجة النص باستخدام الذكاء الاصطناعي...');

    try {
      const ai = getAIClient();
      const responseSchema: Schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            grade: { type: Type.STRING, description: "الصف الدراسي، مثلا (الثالث المتوسط، السادس الإعدادي)" },
            subject: { type: Type.STRING, description: "المادة الدراسية، مثلا (التربية الإسلامية، الرياضيات)" },
            year: { type: Type.STRING, description: "السنة الدراسية للامتحان الوزاري، مثلا (2020، 2021)" },
            round: { type: Type.STRING, description: "الدور الامتحاني، مثلا (الدور الأول، الدور الثاني، التمهيدي)" },
            chapter: { type: Type.STRING, description: "رقم أو اسم الفصل الذي يعود له السؤال" },
            topic: { type: Type.STRING, description: "موضوع السؤال المحدد من الفصل الدراسي" },
            type: { type: Type.STRING, description: "نوع السؤال: MCQ, Essay, أو TrueFalse" },
            question: { type: Type.STRING, description: "نص السؤال الامتحاني" },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "الخيارات الخاصة بالسؤال، إذا كان نوعها MCQ. يجب أن تكون 4 خيارات"
            },
            correctAnswer: { type: Type.INTEGER, description: "رقم الإجابة الصحيحة للـ MCQ، صفر-مبني (0 للخيارات الأول، 1 للثاني، إلخ). بالنسبة للـ Essay و TrueFalse اجعله 0" }
          },
          required: ["grade", "subject", "year", "round", "chapter", "topic", "type", "question", "options", "correctAnswer"]
        }
      };

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `أنت مساعد تعليمي متخصص في تقديم أسئلة الامتحانات الوزارية العراقية.
المطلوب منك تحويل النص التالي إلى مجموعة أسئلة بصيغة محددة وحفظها بقاعدة البيانات.
قم باستخراج ما يلي لكل سؤال:
- الصف الدراسي (grade)
- المادة (subject)
- سنة الامتحان (year)
- الدور (round)
- الفصل (chapter)
- الموضوع (topic)
- نص السؤال (question)
- نوع السؤال (type): MCQ أو Essay أو TrueFalse
- الخيارات (options): قم بتوليد 4 خيارات منطقية من ضمنها الحل الصحيح لأسئلة الاختيارات.
- الإجابة الصحيحة (correctAnswer): موقع الخيار الصحيح (0, 1, 2, 3)

النص المدخل:
${adminImportText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });

      const jsonText = result.text;
      if (!jsonText) throw new Error("لم يتم استرجاع بيانات.");

      const parsedQuestions = JSON.parse(jsonText);
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        throw new Error("لم يتم التعرف على أي أسئلة.");
      }

      setAdminImportProgress(`تم استخراج ${parsedQuestions.length} سؤال. جاري الإضافة لقاعدة البيانات...`);
      
      let addedCount = 0;
      for (const row of parsedQuestions) {
         let docData: any = {
           created_at: new Date().toISOString(),
           grade: row.grade || "", 
           subject: row.subject || "", 
           year: String(row.year || ""), 
           round: String(row.round || ""), 
           chapter: row.chapter || "",
           topic: row.topic || "",
           type: row.type || "MCQ", 
           question: row.question || "", 
           options: Array.isArray(row.options) && row.options.length > 0 ? row.options : ["", "", "", ""], 
           correctAnswer: row.correctAnswer !== undefined ? Number(row.correctAnswer) : 0, 
           image: ""
         };
         // Use the selected ones if provided, else use the ones from json
         if (selectedGrade) docData.grade = selectedGrade;
         if (selectedSubject) docData.subject = selectedSubject;
         if (selectedYear) docData.year = selectedYear;
         if (selectedRound) docData.round = selectedRound;

         await addDoc(collection(db, "exam_questions"), docData);
         addedCount++;
      }
      
      setAdminImportProgress("");
      alert(`تمت إضافة ${addedCount} سؤال بنجاح بواسطة الذكاء الاصطناعي.`);
      setAdminImportText("");
      
      // refresh questions list
      const snap = await getDocs(collection(db, "exam_questions"));
      const questionsList = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamQuestion));
      setAllQuestions(questionsList);
      
    } catch (e: any) {
      console.error(e);
      if (shouldSwitchKey(e)) {
        alert("انتهت حصة المفتاح. جرب ثانية.");
      } else {
        alert("حدث خطأ أثناء معالجة النص: " + e.message);
      }
      setAdminImportProgress("");
    } finally {
      setAdminImportLoading(false);
    }
  };

  useEffect(() => {
    // SEEDING LOGIC
    const seed = async () => {
      if (!localStorage.getItem('seeded_q')) {
        localStorage.setItem('seeded_q', 'true');
        const sampleQs = [
          {
            grade: "الثالث المتوسط",
            subject: "التربية الاسلامية",
            year: "2018",
            round: "الدور الاول",
            chapter: "احكام التلاوة",
            topic: "المد",
            type: "MCQ",
            question: "في قوله تعالى (أُولئِكَ لَهُمُ اللَّعْنَةُ وَلَهُمْ سُوءُ الدَّارِ) مانوع المد في كلمة (سوء)؟",
            options: ["مد متصل", "مد منفصل", "مد بدل", "مد عارض للسكون"],
            correctAnswer: 0,
            difficulty: 1
          },
          {
            grade: "الثالث المتوسط",
            subject: "التربية الاسلامية",
            year: "2016",
            round: "الدور الثاني",
            chapter: "احكام التلاوة",
            topic: "المد",
            type: "MCQ",
            question: "في قوله تعالى (يُثَبِّتُ اللَّهُ الَّذينَ آمَنوا بِالقَولِ الثّابِتِ) مانوع المد في كلمة (آمَنوا)؟",
            options: ["مد متصل", "مد منفصل", "مد بدل", "مد عارض للسكون"],
            correctAnswer: 2,
            difficulty: 1
          },
          {
            grade: "الثالث المتوسط",
            subject: "التربية الاسلامية",
            year: "2018",
            round: "الدور الاول",
            chapter: "الوحدة الاولى",
            topic: "سورة الحشر",
            type: "MCQ",
            question: "ما معنى كلمة (المهيمن)؟",
            options: ["المحيط بغيره الذي لا يخرج عن قدرته احد", "عالم السر والعلانية", "المنشئ من العدم", "خالق المخلوقات"],
            correctAnswer: 0,
            difficulty: 1
          }
        ];
        try {
          for (const q of sampleQs) {
            await addDoc(collection(db, "exam_questions"), q);
          }
        } catch (e) {
          console.error("Failed to seed", e);
        }
      }
    };
    seed();
    
    // FETCHING LOGIC
    const fetchQuestions = async () => {
      try {
        const snap = await getDocs(collection(db, "exam_questions"));
        const questionsList = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamQuestion));
        setAllQuestions(questionsList);
      } catch (err) {
        console.error("Error fetching exam questions for setup:", err);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const q = query(
          collection(db, "exam_history"),
          where("userId", "==", userId)
        );
        const snap = await getDocs(q);
        const history = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ExamHistoryEntry));
        
        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setExamHistoryList(history);
      } catch (err) {
        console.error("Error fetching exam history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [userId]);

  const availableGrades = Array.from(new Set(allQuestions.map(q => String(q.grade || '').trim()))).filter(Boolean).sort();
  const availableSubjects = Array.from(new Set(allQuestions.filter(q => String(q.grade || '').trim() === String(selectedGrade).trim() || !selectedGrade).map(q => String(q.subject || '').trim()))).filter(Boolean).sort();
  const availableRounds = Array.from(new Set(allQuestions.filter(q => (String(q.grade || '').trim() === String(selectedGrade).trim() || !selectedGrade) && (String(q.subject || '').trim() === String(selectedSubject).trim() || !selectedSubject)).map(q => String(q.round || '').trim()))).filter(Boolean).sort();
  const availableYears = Array.from(new Set(allQuestions.filter(q => (String(q.grade || '').trim() === String(selectedGrade).trim() || !selectedGrade) && (String(q.subject || '').trim() === String(selectedSubject).trim() || !selectedSubject) && (String(q.round || '').trim() === String(selectedRound).trim() || !selectedRound)).map(q => String(q.year || '').trim()))).filter(Boolean).sort((a, b) => b.localeCompare(a));
  
  const availableChapters = Array.from(new Set(allQuestions.filter(q => (String(q.grade || '').trim() === String(selectedGrade).trim() || !selectedGrade) && (String(q.subject || '').trim() === String(selectedSubject).trim() || !selectedSubject)).map(q => String(q.chapter || '').trim()))).filter(Boolean).sort();
  const availableTopics = Array.from(new Set(allQuestions.filter(q => (String(q.grade || '').trim() === String(selectedGrade).trim() || !selectedGrade) && (String(q.subject || '').trim() === String(selectedSubject).trim() || !selectedSubject) && (String(q.chapter || '').trim() === String(selectedChapter).trim() || !selectedChapter)).map(q => String(q.topic || '').trim()))).filter(Boolean).sort();


  const handleStartExam = async () => {
    if (examsTakenCount >= 3 && !isAdmin) {
      alert("لقد وصلت إلى الحد الأقصى لصناعة الامتحانات اليومية (3 امتحانات في اليوم). يرجى العودة غداً للمزيد!");
      return;
    }
    setLoading(true);
    try {
      // Fetch and filter locally to avoid single-field composite index issues initially
      const snap = await getDocs(collection(db, "exam_questions"));
      const allQuestions = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamQuestion));
      
      const filtered = allQuestions.filter(q => 
        String(q.grade).trim() === String(selectedGrade).trim() && 
        String(q.subject).trim() === String(selectedSubject).trim() && 
        (!selectedYear || String(q.year).trim() === String(selectedYear).trim()) && 
        (!selectedRound || String(q.round).trim() === String(selectedRound).trim()) &&
        (!selectedChapter || String(q.chapter || '').trim() === String(selectedChapter).trim()) &&
        (!selectedTopic || String(q.topic || '').trim() === String(selectedTopic).trim())
      );
      
      // Shuffle randomly
      const shuffled = filtered.sort(() => 0.5 - Math.random());
      
      if (shuffled.length === 0) {
         alert("لا توجد أسئلة متوفرة لهذه المعايير. الرجاء المحاولة بخيارات أخرى.");
         setLoading(false);
         return;
      }

      setQuestions(shuffled);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setExamState('taking');
      incrementDailyExamCount();
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء تحميل الأسئلة.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    // Allow UI to render the loading state before heavy processing blocks the main thread
    await new Promise(resolve => setTimeout(resolve, 100));

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const newUploadedFiles: Array<{text?: string, base64?: string, mimeType?: string, fileName?: string}> = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_FILE_SIZE) {
           alert(`حجم الملف "${file.name}" كبير جداً. يرجى رفع ملفات بحجم أقل من 5 ميجابايت.`);
           continue;
        }

        let fileText = '';
        if (file.type === 'application/pdf') {
           fileText = await extractTextFromPDF(file);
        } else if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
           const arrayBuffer = await file.arrayBuffer();
           const result = await mammoth.extractRawText({ arrayBuffer });
           fileText = result.value;
           if (fileText.length > 150000) {
              fileText = fileText.substring(0, 150000);
           }
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
           fileText = await file.text();
           if (fileText.length > 150000) {
              fileText = fileText.substring(0, 150000);
           }
        }

        if (fileText) {
           newUploadedFiles.push({ text: fileText, mimeType: file.type, fileName: file.name });
        } else if (file.type.startsWith('image/')) {
           const reader = new FileReader();
           const base64Promise = new Promise<string>((resolve) => {
             reader.onload = () => resolve((reader.result as string).split(',')[1]);
             reader.readAsDataURL(file);
           });
           
           const base64Data = await base64Promise;
           newUploadedFiles.push({ base64: base64Data, mimeType: file.type, fileName: file.name });
        } else {
           alert(`نوع الملف "${file.name}" غير مدعوم. نرجو رفع صورة، PDF، أو ملف نصي (Word/TXT).`);
        }
      }

      if (newUploadedFiles.length > 0) {
         setUploadedFilesList(prev => [...prev, ...newUploadedFiles]);
         if (newUploadedFiles.length > 0) {
           setUploadedFileContent(newUploadedFiles[0]);
         }
         setActiveTab('upload');
         setExamState('fileSettings'); // Use fileSettings to show the form
      }

    } catch (err: any) {
      console.error(err);
      alert("فشل في تحليل الملفات. يرجى التأكد من أن الملفات مقروءة.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGenerateFromSettings = async () => {
    if (!uploadedFileContent) return;
    const calculatedCost = 30 + (parseInt(genSettings.questionCount, 10) || 10) * 4;

    if (credits < calculatedCost && !isAdmin) {
      alert(`عذراً، رصيدك الحالي من النقاط (${credits} نقطة) لا يكفي لإنشاء هذا الامتحان. التكلفة المطلوبة هي ${calculatedCost} نقطة. يمكنك شحن رصيدك مجاناً عبر زر "شحن الرصيد مجاناً" المتواجد في الأعلى أو بصفحة الإعدادات!`);
      return;
    }

    if (examsTakenCount >= 3 && !isAdmin) {
      alert("لقد وصلت إلى الحد الأقصى لصناعة الامتحانات اليومية (3 امتحانات في اليوم). يرجى العودة غداً للمزيد!");
      return;
    }
    setIsUploading(true);

    try {
      const ai = getAIClient();
      
      const questionSchema = {
        type: Type.ARRAY,
        description: "List of exam questions extracted or generated from the file.",
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "Unique ID for the question" },
            type: { type: Type.STRING, enum: ["MCQ", "Essay", "TrueFalse"] },
            question: { type: Type.STRING, description: "The exam question text" },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }, 
              description: "Four options for MCQ. Two options (صح/خطأ) for TrueFalse. Empty for Essay." 
            },
            correctAnswer: { 
              type: Type.STRING, 
              description: "For MCQ/TrueFalse questions, this MUST be the EXACT option index as a string (e.g. '0' for first option, '1' for second option, '2' for third option, '3' for fourth option). Do NOT make off-by-one errors. For Essay, output the model answer text." 
            }
          },
          required: ["id", "type", "question", "correctAnswer"]
        }
      };

      let responseText = "";
      
      const requestedTypes = [];
      if (genSettings.types.mcq) requestedTypes.push("أسئلة اختيارات متعددة (MCQ)");
      if (genSettings.types.tf) requestedTypes.push("أسئلة صح أو خطأ (بدون تعليل)");
      if (genSettings.types.essay) requestedTypes.push("أسئلة مقالية (كتابة إجابة)");
      
      const typesString = requestedTypes.join(' و ');

      const promptTemplate = `قم بإنشاء نموذج امتحان بناءً على الإعدادات والمحتوى التالي.
      اسم الامتحان: ${genSettings.examName || 'امتحان مخصص'}
      عدد الأسئلة المطلوب: ${genSettings.questionCount}
      لغة الأسئلة: ${genSettings.language}
      أنواع الأسئلة المطلوبة: ${typesString}

      تعليمات هامة وجوهرية لتحديد الإجابة الصحيحة:
      1. إذا كان النص يحتوي على أسئلة جاهزة استخرجها إن أمكن، وإذا لم تكن كافية قم بتأليف أسئلة دقيقة تقيس وتحلل فهم المستند بشكل علمي ومتقن.
      2. تجنب اختيار أو وضع إجابة خاطئة كإجابة نموذجية صحيحة. يرجى مراجعة كل سؤال للتأكد من الموثوقية العلمية 100%.
      3. سياق الترقيم للـ MCQ و TrueFalse: يجب تحديد دليل الخيار الصحيح (0-based Index) بدقة تامة في حقل correctAnswer:
         - "0" يشير للخيار الأول في قائمة الاختيارات (options[0])
         - "1" يشير للخيار الثاني (options[1])
         - "2" يشير للخيار الثالث (options[2])
         - "3" يشير للخيار الرابع (options[3])
      4. سؤال الصح والخطأ يجب أن يحتوي خيارين فقط في options وهما "صح" ثم "خطأ" (بحيث يكون "صح" هو الخيار 0 و"خطأ" هو الخيار 1). حدد correctAnswer بدقة "0" (صح) أو "1" (خطأ).
      5. بالنسبة للـ Essay، ضع الإجابة النموذجية التفصيلية لتقييم الطالب لاحقاً.
      `;

      // Extract combined text from all text-based uploads, and collect all image files
      const textFiles = uploadedFilesList.filter(f => f.text);
      const imageFiles = uploadedFilesList.filter(f => f.base64 && f.mimeType);

      // Fallback in case uploadedFilesList is somehow empty but uploadedFileContent is present
      if (textFiles.length === 0 && imageFiles.length === 0 && uploadedFileContent) {
        if (uploadedFileContent.text) textFiles.push(uploadedFileContent);
        else if (uploadedFileContent.base64) imageFiles.push(uploadedFileContent);
      }

      let combinedText = "";
      if (textFiles.length > 0) {
        combinedText = textFiles.map(f => `--- محتوى الملف (${f.fileName || 'مستند'}) ---\n${f.text}`).join('\n\n');
        if (combinedText.length > 80000) {
          combinedText = combinedText.substring(0, 80000);
        }
      }

      let prompt = promptTemplate;
      if (combinedText) {
        prompt += `\nالنص والمستندات المطلوب استخراج/توليد الأسئلة منها:\n${combinedText}`;
      }
      
      if (imageFiles.length > 0) {
        prompt += `\nالصور المرفقة تحتوي على محتوى السؤال أو المادة المطلوب استخراج/توليد الأسئلة منها. يرجى قراءة كافة الصور المرفقة والتنقل بينها لتجميع الفهم الكامل للمعلومات وتوليد الأسئلة المطلوبة بدقة بالغة.`;
      }

      const contentsArray: any[] = [prompt];

      // Add each image to the contents list
      imageFiles.forEach(img => {
        contentsArray.push({
          inlineData: {
            data: img.base64,
            mimeType: img.mimeType
          }
        });
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contentsArray,
        config: {
          responseMimeType: "application/json",
          responseSchema: questionSchema,
        }
      });
      responseText = response.text || "[]";

      const generatedQuestions = JSON.parse(responseText);
      
      const formattedQ = generatedQuestions.map((q: any, index: number) => {
        let finalCorrectAnswer = q.correctAnswer;
        if (q.type === 'MCQ' || q.type === 'TrueFalse') {
          const rawAnswer = String(q.correctAnswer).trim();
          const parsed = parseInt(rawAnswer, 10);
          
          if (!isNaN(parsed) && parsed >= 0 && parsed < (q.options?.length || 4)) {
            finalCorrectAnswer = parsed;
          } else if (q.options && q.options.length > 0) {
            // Find option matches (case-insensitive and trimmed)
            const foundIndex = q.options.findIndex((opt: string) => {
              const cleanedOpt = opt.trim().toLowerCase();
              const cleanedAns = rawAnswer.toLowerCase();
              return cleanedOpt === cleanedAns || 
                     cleanedAns.includes(cleanedOpt) || 
                     cleanedOpt.includes(cleanedAns);
            });
            if (foundIndex !== -1) {
              finalCorrectAnswer = foundIndex;
            } else {
              const letterMap: Record<string, number> = {
                'أ': 0, 'ب': 1, 'ج': 2, 'د': 3,
                'a': 0, 'b': 1, 'c': 2, 'd': 3,
                'A': 0, 'B': 1, 'C': 2, 'D': 3,
                '1': 0, '2': 1, '3': 2, '4': 3
              };
              if (rawAnswer in letterMap) {
                finalCorrectAnswer = letterMap[rawAnswer];
              } else {
                let bestIdx = 0;
                let maxMatches = 0;
                q.options.forEach((opt: string, optIdx: number) => {
                  const optWords = opt.trim().split(/\s+/);
                  let matches = 0;
                  optWords.forEach(w => {
                    if (w.length > 1 && rawAnswer.includes(w)) {
                      matches++;
                    }
                  });
                  if (matches > maxMatches) {
                    maxMatches = matches;
                    bestIdx = optIdx;
                  }
                });
                finalCorrectAnswer = bestIdx;
              }
            }
          } else {
            finalCorrectAnswer = 0;
          }
        }

        return {
          ...q,
          id: q.id || `gen_${index}_${Date.now()}`,
          grade: 'عام',
          subject: genSettings.examName || uploadedFileContent.fileName || 'امتحان مخصص',
          options: q.options || [],
          correctAnswer: finalCorrectAnswer
        };
      });

      if(formattedQ.length === 0) {
        alert("لم نتمكن من استخراج أسئلة من هذا الملف.");
        setIsUploading(false);
        return;
      }

      setQuestions(formattedQ);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setExamState('taking');
      incrementDailyExamCount();
      if (!isAdmin) {
        updateCredits(Math.max(0, credits - calculatedCost));
      }

    } catch (err: any) {
      console.error(err);
      if (shouldSwitchKey(err)) {
         alert("تم استنفاد حصة المفتاح، يرجى المحاولة مرة أخرى.");
      } else {
         alert("فشل في استخراج الأسئلة. يرجى المحاولة بصيغة أبسط أو التأكد من إعداداتك.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnswerChange = (val: string | number) => {
    setAnswers({
      ...answers,
      [questions[currentQuestionIndex].id]: val
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
       finishExam();
    }
  };
  
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const finishExam = async () => {
    let currentScore = 0;
    const scorableQuestions = questions.filter(q => q.type === 'MCQ' || q.type === 'TrueFalse').length;

    questions.forEach(q => {
       if ((q.type === 'MCQ' || q.type === 'TrueFalse') && answers[q.id] === q.correctAnswer) {
          currentScore += 1;
       }
    });

    setScore(currentScore);
    setExamState('result');

    // Collect newly incorrect questions to add to "مراجعة يومية"
    const newlyIncorrectTemp: any[] = [];
    questions.forEach(q => {
      const isScorable = q.type === 'MCQ' || q.type === 'TrueFalse';
      const isCorrect = isScorable && answers[q.id] === q.correctAnswer;
      if (isScorable && !isCorrect) {
         newlyIncorrectTemp.push({
           id: q.id + "_" + Date.now(),
           question: q.question,
           subject: q.subject || selectedSubject || genSettings.examName || "امتحان مخصص",
           type: q.type,
           options: q.options || [],
           correctAnswer: q.correctAnswer
         });
      }
    });

    if (newlyIncorrectTemp.length > 0) {
      setIncorrectQuestions(prev => {
        const filteredPrev = prev.filter(p => !newlyIncorrectTemp.some(n => n.question === p.question));
        const updated = [...newlyIncorrectTemp, ...filteredPrev];
        try {
          localStorage.setItem(`incorrect_questions_${userId}`, JSON.stringify(updated));
        } catch(e) {
          console.error(e);
        }
        return updated;
      });
    }

    if (userId) {
       try {
           await addDoc(collection(db, "exam_history"), {
               userId,
               score: currentScore,
               totalScorable: scorableQuestions,
               totalQuestions: questions.length,
               subject: selectedSubject || genSettings.examName || "امتحان مخصص",
               date: new Date().toISOString(),
               questions: questions.map(q => ({
                 id: q.id,
                 question: q.question,
                 type: q.type,
                 options: q.options || [],
                 correctAnswer: q.correctAnswer,
                 image: q.image || "",
                 subject: q.subject || selectedSubject || "امتحان"
               })),
               userAnswers: answers
           });

           // Reload history list instantly
           const q = query(
             collection(db, "exam_history"),
             where("userId", "==", userId)
           );
           const snap = await getDocs(q);
           const history = snap.docs.map(doc => ({
             id: doc.id,
             ...doc.data()
           } as ExamHistoryEntry));
           
           history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
           setExamHistoryList(history);
       } catch (error) {
           console.error("Error saving exam result:", error);
       }
    }
  };

  if (examState === 'taking') {
    const currentQ = questions[currentQuestionIndex];
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { if(confirm("هل أنت متأكد من الخروج؟")) setExamState('setup'); }}
            className="flex items-center gap-2 text-slate-600 hover:text-black font-bold"
          >
             <ArrowRight /> إنهاء الامتحان
          </button>
          <div className="text-xl font-black">سؤال {currentQuestionIndex + 1} من {questions.length}</div>
        </div>

        <motion.div 
           key={currentQuestionIndex}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           className="bg-white p-6 rounded-2xl neo-border space-y-6 text-right"
           dir="rtl"
        >
           <h3 className="text-2xl font-black">{currentQ.question}</h3>
           
           {currentQ.image && (
             <img src={currentQ.image} alt="Question" className="rounded-xl border border-slate-200 max-h-64 object-contain" />
           )}

           {(currentQ.type === 'MCQ' || currentQ.type === 'TrueFalse') ? (
             <div className="space-y-3 mt-6">
                {currentQ.options?.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswerChange(idx)}
                    className={`w-full text-right p-4 rounded-xl border-2 font-bold transition-all ${
                      answers[currentQ.id] === idx 
                        ? 'border-blue-600 bg-blue-50 text-blue-800' 
                        : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
             </div>
           ) : (
             <div className="mt-6">
                <textarea 
                  value={(answers[currentQ.id] as string) || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="اكتب إجابتك هنا..."
                  className="w-full h-40 p-4 rounded-xl border-2 border-slate-200 font-bold focus:border-blue-500 focus:ring-4 outline-none resize-none"
                />
             </div>
           )}

           <div className="flex justify-between items-center mt-10">
              {currentQuestionIndex > 0 ? (
                <button onClick={handlePrevQuestion} className="px-6 py-2 rounded-xl border-2 border-slate-200 font-bold hover:bg-slate-50">السابق</button>
              ) : <div></div>}

              <button 
                onClick={handleNextQuestion} 
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-all"
              >
                {currentQuestionIndex === questions.length - 1 ? 'تسليم الامتحان' : 'التالي'}
              </button>
           </div>
        </motion.div>
      </div>
    );
  }

  if (examState === 'result') {
    return (
       <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 text-center text-right" dir="rtl">
           <div className="bg-white p-10 rounded-2xl neo-border flex flex-col items-center">
             <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 border-4 border-blue-500">
                <span className="text-4xl font-black text-blue-600">{score}/{questions.filter(q => q.type === 'MCQ' || q.type === 'TrueFalse').length}</span>
             </div>
             <h2 className="text-3xl font-black mb-2">انتهى الاختبار</h2>
             <p className="text-slate-500 font-bold mb-8 max-w-md text-center">
                هذه النتيجة لأسئلة الاختيارات والصح والخطأ فقط. الأسئلة المقالية تتطلب تقييم المعلم أو يمكنك مقارنتها مع الإجابة النموذجية أدناه.
             </p>
             <button onClick={() => setExamState('setup')} className="px-8 py-4 bg-black text-white font-black rounded-xl hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] transition-all">
                العودة للاختيار
             </button>
           </div>

           <div className="text-right space-y-4">
              <h3 className="text-xl font-black text-slate-800">تفاصيل الامتحان</h3>
              {questions.map((q, idx) => {
                 const isScorable = q.type === 'MCQ' || q.type === 'TrueFalse';
                 const isCorrect = isScorable && answers[q.id] === q.correctAnswer;
                 return (
                   <div key={q.id} className={`p-6 rounded-2xl border-2 ${isScorable ? (isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50') : 'border-slate-200 bg-white'}`}>
                      <h4 className="font-bold text-lg mb-2">{idx + 1}. {q.question}</h4>
                      {isScorable ? (
                        <>
                          <p className="text-sm font-bold text-slate-500">
                             إجابتك: {q.options?.[answers[q.id] as number] || 'لم يجب'}
                          </p>
                          {!isCorrect && (
                             <p className="text-sm font-bold text-green-600 mt-1">الإجابة الصحيحة: {q.options?.[q.correctAnswer as number]}</p>
                          )}
                        </>
                      ) : (
                         <>
                           <div className="text-sm font-bold text-slate-600 mb-2 p-3 bg-slate-100 rounded-lg">إجابتك: {answers[q.id] || '(بدون إجابة)'}</div>
                           <div className="text-sm text-green-700 font-bold p-3 bg-green-100 rounded-lg">الإجابة النموذجية: {q.correctAnswer}</div>
                         </>
                      )}
                   </div>
                 )
              })}
           </div>
       </div>
    )
  }

  const handleRemoveIncorrect = (id: string) => {
    setIncorrectQuestions(prev => {
      const updated = prev.filter(q => q.id !== id);
      try {
        localStorage.setItem(`incorrect_questions_${userId}`, JSON.stringify(updated));
      } catch(e) {}
      return updated;
    });
  };

  const handleStartDailyReview = () => {
    if (incorrectQuestions.length === 0) return;
    const formatted = incorrectQuestions.map((q, idx) => ({
      id: q.id || `incorrect_${idx}_${Date.now()}`,
      type: q.type || "MCQ",
      question: q.question,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      subject: q.subject || "مراجعة يومية"
    }));
    setQuestions(formatted);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setExamState('taking');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8">
      <div className="grid grid-cols-1">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-600 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors font-bold group"
            >
              <ArrowRight className="group-hover:-translate-x-1 transition-transform" />
              العودة
            </button>
            <div className="flex items-center justify-end gap-3 text-2xl font-black text-black dark:text-white">
              <h2 className="text-right">صناعة ومراجعة الامتحان</h2>
              <div className="w-10 h-10 neo-bg-blue border-2 border-black rounded-xl flex items-center justify-center">
                <Sparkles size={24} className="text-black" />
              </div>
            </div>
          </div>

          <div className="bg-[#FFFDF0] dark:bg-yellow-950/20 border-2 border-yellow-400 p-4 rounded-xl text-yellow-800 dark:text-yellow-200 text-sm font-bold text-center">
            مرحباً بك، {studentName} 🌟 مساعدك الذكي لتكرار الأسئلة الخاطئة وتحليل مستواك الدراسي
          </div>

          {/* User performance message */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border-2 border-black/10 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 text-right" dir="rtl">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">مرحباً بك، {studentName}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">نظرة عامة على أدائك الدراسي ومراجعاتك النشطة لتقليل النسيان.</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 border-2 border-black px-3 py-1.5 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1">
                <Sparkles size={14} className="text-amber-600 animate-pulse" /> رصيد النقاط: {credits} نقطة
              </span>
              <span className="bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-2 border-black px-3 py-1.5 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1">
                <Clock size={14} /> {examsTakenCount} / ٣ امتحانات لليوم
              </span>
            </div>
          </div>

          {/* New Tab Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border-2 border-black/10 dark:border-white/10" dir="rtl">
            <button
              onClick={() => { setActiveTab('dashboard'); setReviewingExam(null); }}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-slate-700 shadow-sm border-2 border-slate-200 dark:border-slate-600 font-black text-black dark:text-white'
                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700/50'
              }`}
            >
              <Award size={18} />
              لوحة الأداء والخطأ
            </button>
            <button
              onClick={() => { setActiveTab('upload'); setReviewingExam(null); }}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-slate-700 shadow-sm border-2 border-slate-200 dark:border-slate-600 font-black text-black dark:text-white'
                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700/50'
              }`}
            >
              <FileText size={18} />
              من ملفاتي
            </button>
            <button
              onClick={() => { setActiveTab('history'); setReviewingExam(null); }}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-slate-700 shadow-sm border-2 border-slate-200 dark:border-slate-600 font-black text-black dark:text-white'
                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700/50'
              }`}
            >
              <History size={18} />
              سجل الامتحانات الكامل
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* Tab 1: Dashboard View */}
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Check if user wants to review a single exam */}
                {reviewingExam ? (
                  <div className="bg-[#FAF9F6] dark:bg-slate-900 border-4 border-black p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-right" dir="rtl">
                    <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
                      <div>
                        <span className="text-xs bg-blue-100 text-blue-900 border-2 border-black px-2 py-0.5 rounded font-black mb-1 inline-block">تحليل أكاديمي</span>
                        <h3 className="text-2xl font-black">{reviewingExam.subject}</h3>
                        <p className="text-xs text-slate-500 mt-1">{new Date(reviewingExam.date).toLocaleString('ar-IQ')}</p>
                      </div>
                      <button
                        onClick={() => setReviewingExam(null)}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 border-2 border-black rounded-xl text-sm font-black transition-all"
                      >
                        إغلاق وحفظ النتيجة
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                      <div className="p-3 bg-white dark:bg-slate-800 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div className="text-xl font-black text-blue-600">{reviewingExam.score}/{reviewingExam.totalScorable}</div>
                        <div className="text-xs font-bold text-slate-500">الدرجة النهائية</div>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-800 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div className="text-xl font-black text-teal-600">
                          {reviewingExam.totalScorable > 0 ? Math.round((reviewingExam.score / reviewingExam.totalScorable) * 100) : 100}%
                        </div>
                        <div className="text-xs font-bold text-slate-500">الجاهزية والنسبة</div>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-800 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div className="text-xl font-black text-purple-600">{reviewingExam.totalQuestions}</div>
                        <div className="text-xs font-bold text-slate-500 font-sans">عدد الأسئلة</div>
                      </div>
                    </div>

                    <h4 className="text-lg font-black mb-4 text-slate-700 dark:text-slate-300">مراجعة ورقة الامتحان والأسئلة</h4>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {reviewingExam.questions && Array.isArray(reviewingExam.questions) ? (
                        reviewingExam.questions.map((q: any, idx: number) => {
                          const userAns = reviewingExam.userAnswers?.[q.id];
                          const isCorrect = q.type === 'MCQ' || q.type === 'TrueFalse' ? userAns === q.correctAnswer : false;
                          const isEssay = q.type === 'Essay';

                          return (
                            <div key={q.id} className={`p-4 rounded-xl border-2 border-black text-right ${isEssay ? 'bg-slate-50 dark:bg-slate-800' : isCorrect ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-red-50/50 dark:bg-red-950/20'}`} dir="rtl">
                              <div className="flex items-center gap-2 mb-2 font-bold text-black dark:text-white">
                                <span className="bg-white border border-black px-2 py-0.5 rounded text-xs text-slate-600">{idx + 1}</span>
                                <span>{q.question}</span>
                              </div>

                              {!isEssay ? (
                                <div className="space-y-2 pl-4 mt-2">
                                  {q.options && q.options.map((opt: string, optIdx: number) => {
                                    const isChosen = userAns === optIdx;
                                    const isThisCorrect = q.correctAnswer === optIdx;
                                    return (
                                      <div
                                        key={optIdx}
                                        className={`p-2 rounded border text-xs font-bold flex items-center justify-between ${
                                          isThisCorrect 
                                            ? 'bg-green-100 text-green-900 border-green-400' 
                                            : isChosen 
                                              ? 'bg-red-100 text-red-900 border-red-400' 
                                              : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        <span>{opt}</span>
                                        {isThisCorrect && <Check size={14} className="text-green-700" />}
                                        {isChosen && !isThisCorrect && <X size={14} className="text-red-700" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="space-y-2 mt-2">
                                  <div className="bg-white dark:bg-slate-800 p-2 text-xs rounded border border-black/10">
                                    <span className="font-black text-slate-400">إجابتك:</span> {userAns || 'لم تتم الكتابة'}
                                  </div>
                                  <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 p-2 text-xs rounded border border-emerald-200">
                                    <span className="font-black">الإجابة النموذجية:</span> {q.correctAnswer}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-slate-400 text-center py-4 font-bold">عفواً، لم نتمكن من العثور على تفاصيل الأسئلة المخزنة لهذا المعيار القديم.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Standard Dashboard columns layout */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" dir="rtl">
                    
                    {/* Column 1: Recently Studied Exams (Right) */}
                    <div className="col-span-1 lg:col-span-7 bg-white dark:bg-[#111] rounded-2xl border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] flex flex-col min-h-[500px]">
                      <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-6">
                        <span className="bg-[#E8F5E9] text-emerald-700 border-2 border-black px-3 py-1 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                          {examHistoryList.length} امتحان
                        </span>
                        <h3 className="text-lg font-black text-black dark:text-white flex items-center gap-2">
                          <History size={18} className="text-emerald-500" />
                          ما تمت دراسته مؤخراً
                        </h3>
                      </div>

                      {/* List of recent exams */}
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 flex-1 custom-scrollbar text-right">
                        {examHistoryList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                            <HelpCircle size={40} className="mb-2" />
                            <p className="font-bold text-sm">ليس لديك أي امتحانات مضافة بعد.</p>
                            <p className="text-xs text-slate-400 mt-1">ابدأ برفع ملف دراسي واستخراج الأسئلة بالذكاء الاصطناعي</p>
                          </div>
                        ) : (
                          examHistoryList.slice(0, 5).map(history => {
                            const scorePct = history.totalScorable > 0 
                              ? Math.round((history.score / history.totalScorable) * 100) 
                              : 100;
                            return (
                              <div 
                                key={history.id} 
                                className="bg-slate-50 dark:bg-slate-900 border-2 border-black p-4 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.05)] hover:-translate-y-0.5 transition-all text-right flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                              >
                                <div>
                                  <h4 className="font-black text-sm text-slate-950 dark:text-white line-clamp-1">{history.subject}</h4>
                                  <p className="text-[11px] font-bold text-slate-400 mt-1">
                                    {new Date(history.date).toLocaleDateString('ar-IQ')} • {history.totalQuestions} أسئلة
                                  </p>
                                </div>

                                <div className="flex items-center gap-4 justify-between self-stretch sm:self-auto">
                                  {/* Progress bar info */}
                                  <div className="w-24 sm:w-28 text-right">
                                    <div className="flex justify-between items-center text-[10px] font-black text-slate-600 dark:text-slate-300 mb-1">
                                      <span>{scorePct}% جاهزية</span>
                                      <span>مكتمل</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 border border-black rounded-full h-2.5 overflow-hidden shadow-inner">
                                      <div 
                                        className={`h-full duration-500 transition-all ${
                                          scorePct === 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 
                                          scorePct >= 75 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' :
                                          'bg-gradient-to-r from-yellow-400 to-amber-500'
                                        }`}
                                        style={{ width: `${scorePct}%` }}
                                      />
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => setReviewingExam(history)}
                                    className="bg-blue-50 text-blue-800 border-2 border-black hover:bg-blue-100 text-xs font-black px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5"
                                  >
                                    مراجعة
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Action trigger for new exam */}
                      <div className="pt-6 border-t-2 border-black mt-4">
                        <button
                          onClick={() => setActiveTab('upload')}
                          className="w-full py-3.5 bg-yellow-300 hover:bg-yellow-400 text-black border-4 border-black rounded-xl font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                        >
                          <Sparkles size={16} />
                          إنشاء وصناعة امتحان جديد بالذكاء الاصطناعي 🚀
                        </button>
                      </div>
                    </div>

                    {/* Column 2: Daily Review / Spaced Repetition (Left) */}
                    <div className="col-span-1 lg:col-span-5 bg-white dark:bg-[#111] rounded-2xl border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] flex flex-col min-h-[500px]">
                      <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-4">
                        <span className="bg-[#FFE5EC] text-pink-600 border-2 border-black px-3 py-1 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                          {incorrectQuestions.length} سؤال
                        </span>
                        <h3 className="text-lg font-black text-black dark:text-white flex items-center gap-2">
                          <Brain size={18} className="text-pink-500" />
                          مراجعة يومية
                        </h3>
                      </div>

                      <p className="text-slate-500 dark:text-slate-400 font-bold mb-4 text-xs leading-relaxed text-right">
                        يركز التعليم المتباعد على مراجعة الأسئلة الخاطئة والحفاظ على فترات متباعدة لتقليل النسيان واسترجاع المعلومات بكفاءة.
                      </p>

                      {/* Incorrect list */}
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 flex-1 custom-scrollbar mb-4 text-right">
                        {incorrectQuestions.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-8 text-center text-emerald-500 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-dashed border-emerald-300">
                            <Award size={32} className="mb-2" />
                            <p className="font-bold text-xs">عمل رائع! صندق مراجعتك اليومية فارغ.</p>
                            <p className="text-[10px] text-slate-400 mt-1">كافة أخطائك تم تصحيحها وحفظها.</p>
                          </div>
                        ) : (
                          incorrectQuestions.map((item, idx) => (
                            <div 
                              key={item.id || idx} 
                              className="bg-red-50/40 dark:bg-red-950/10 border-2 border-black/80 p-3.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-2.5"
                            >
                              <div className="font-bold text-xs text-black dark:text-white leading-relaxed line-clamp-2">
                                {item.question}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-black/50 text-[9px] font-bold px-2 py-0.5 rounded">
                                  {item.subject || "أحياء"}
                                </span>
                                <button 
                                  onClick={() => handleRemoveIncorrect(item.id)}
                                  className="text-[10px] bg-rose-100 dark:bg-rose-950/50 hover:bg-rose-200 text-rose-700 dark:text-rose-300 border border-black px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
                                >
                                  تخطي
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <button
                        onClick={handleStartDailyReview}
                        disabled={incorrectQuestions.length === 0}
                        className="w-full py-4 bg-emerald-400 hover:bg-emerald-500 text-black border-4 border-black rounded-xl font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Brain size={18} />
                        ابدأ المراجعة اليومية ({incorrectQuestions.length} سؤال) 🔥
                      </button>
                    </div>

                  </div>
                )}

                {/* Monthly limit widget */}
                <div className="bg-slate-50 dark:bg-slate-900 border-2 border-black p-4 rounded-xl flex items-center justify-between font-bold text-xs max-w-2xl mx-auto mt-6" dir="rtl">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-black dark:text-white">الاستخدام الشهري الحالي</span>
                  </div>
                  <div className="flex gap-4 text-xs font-black">
                    <span className="bg-blue-100 text-blue-800 border-2 border-black px-2 py-1 rounded">إنشاء امتحان: {examHistoryList.length} / ١٠</span>
                    <span className="bg-yellow-105 text-yellow-800 border-2 border-black px-2 py-1 rounded">امتحان وزاري متباعد: ٠ / ١٠</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab 2: Upload View */}
            {activeTab === 'upload' && examState !== 'fileSettings' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-slate-900 rounded-2xl neo-border border-dashed"
              >
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  {isUploading ? (
                    <Loader2 size={32} className="text-blue-600 animate-spin" />
                  ) : (
                    <FileText size={32} className="text-slate-400" />
                  )}
                </div>
                <h3 className="text-xl font-black mb-2">
                   {isUploading ? 'جاري تجهيز الملف...' : 'ارفع ملفك الدراسي الخاص'}
                </h3>
                <p className="text-slate-500 font-bold mb-6 max-w-sm">
                  {isUploading 
                    ? 'جاري قراءة الملف وتجهيزه. نرجو الانتظار'
                    : 'ارفع ملف PDF أو صورة أو Word واستخرج منها أسئلة امتحان مخصصة بالذكاء الاصطناعي متبوع بتحليل فوري'
                  }
                </p>
                <input 
                  type="file" 
                  accept=".pdf,image/*,.doc,.docx,.txt" 
                  multiple={true}
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
                <button 
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-black rounded-xl hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {isUploading ? 'أرجو الانتظار...' : 'اختر ملفاً للرفع'}
                </button>
              </motion.div>
            )}

            {activeTab === 'upload' && examState === 'fileSettings' && (
              <motion.div
                key="fileSettings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-slate-900 p-8 rounded-2xl neo-border text-right"
                dir="rtl"
              >
                <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                  <FileText className="text-blue-600" />
                  إعدادات الامتحان المستخرج من المحتوى
                </h2>

                <div className="space-y-6">
                  {/* Uploaded Files Section */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 border-2 border-black p-4 rounded-xl">
                    <div className="flex justify-between items-center mb-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black text-xs font-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] transition-all flex items-center gap-1"
                      >
                        + إضافة ملف/صورة أخرى
                      </button>
                      <label className="block text-sm font-black text-slate-800 dark:text-slate-100">المستندات والصور المرفوعة ({uploadedFilesList.length})</label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar text-right">
                      {uploadedFilesList.map((fileObj, fIdx) => (
                        <div 
                          key={fIdx} 
                          className="bg-white dark:bg-slate-900 border-2 border-black p-2 rounded-lg flex items-center justify-between gap-3 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,0.15)]"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              const updated = uploadedFilesList.filter((_, idx) => idx !== fIdx);
                              setUploadedFilesList(updated);
                              if (updated.length === 0) {
                                setUploadedFileContent(null);
                                setExamState('setup');
                              } else {
                                setUploadedFileContent(updated[0]);
                              }
                            }}
                            className="p-1 hover:bg-red-100 hover:text-red-700 text-slate-400 rounded-md transition-colors border border-transparent hover:border-black"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>

                          <div className="flex items-center gap-2 overflow-hidden flex-1 justify-end">
                            <span className="text-[11px] font-bold truncate text-slate-700 dark:text-slate-300">
                              {fileObj.fileName || 'ملف غير مسمى'}
                            </span>
                            {fileObj.base64 ? (
                              <img 
                                src={`data:${fileObj.mimeType};base64,${fileObj.base64}`} 
                                alt="file preview" 
                                className="w-8 h-8 object-cover rounded border border-black"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded border border-black flex items-center justify-center font-black text-xs">
                                DOC
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">اسم الامتحان <span className="text-slate-400 text-xs font-normal">(اختياري)</span></label>
                    <input
                      type="text"
                      placeholder="مثال: امتحان الفصل الأول - أحياء أو رياضيات"
                      value={genSettings.examName}
                      onChange={(e) => setGenSettings({...genSettings, examName: e.target.value})}
                      className="w-full text-right p-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none font-bold bg-slate-50 dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">عدد الأسئلة المستهدفة</label>
                    <select
                      value={genSettings.questionCount}
                      onChange={(e) => setGenSettings({...genSettings, questionCount: e.target.value})}
                      className="w-full text-right p-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none font-bold bg-slate-50 dark:bg-slate-800 dark:border-slate-600 focus:border-blue-500/50"
                      dir="rtl"
                    >
                      <option value="5">٥ أسئلة (قصير)</option>
                      <option value="10">١٠ أسئلة (متوسط)</option>
                      <option value="15">١٥ سؤالاً</option>
                      <option value="20">٢٠ سؤالاً (شامل)</option>
                      <option value="25">٢٥ سؤالاً</option>
                      <option value="35">٣٥ سؤالاً</option>
                      <option value="50">٥٠ سؤالاً (الحد الأقصى)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">أنواع الأسئلة</label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          checked={genSettings.types.mcq}
                          onChange={(e) => setGenSettings({...genSettings, types: {...genSettings.types, mcq: e.target.checked}})}
                        />
                        <span className="font-bold text-slate-700 dark:text-slate-300">اختيارات متعددة (MCQ)</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          checked={genSettings.types.tf}
                          onChange={(e) => setGenSettings({...genSettings, types: {...genSettings.types, tf: e.target.checked}})}
                        />
                        <span className="font-bold text-slate-700 dark:text-slate-300">صح أو خطأ</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          checked={genSettings.types.essay}
                          onChange={(e) => setGenSettings({...genSettings, types: {...genSettings.types, essay: e.target.checked}})}
                        />
                        <span className="font-bold text-slate-700 dark:text-slate-300">كتابة إجابة (مقالي)</span>
                      </label>
                    </div>
                  </div>

                  {/* Dynamic Credits Cost Estimator Widget */}
                  {(() => {
                    const cost = 30 + (parseInt(genSettings.questionCount, 10) || 10) * 4;
                    const isSufficient = credits >= cost || isAdmin;
                    return (
                      <div className={`p-4 rounded-xl border-2 text-right ${
                        isSufficient 
                          ? 'bg-blue-50/50 border-blue-400 dark:bg-blue-950/20 dark:border-blue-800' 
                          : 'bg-red-50/50 border-red-400 dark:bg-red-950/20 dark:border-red-900'
                      }`} dir="rtl">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              <Sparkles size={16} className="text-amber-500" />
                              تكلفة استهلاك النقاط لهذا الامتحان
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">
                              المعالجة الأساسية للمستندات/الصور: <span className="underline">30 نقطة</span> + <span className="underline">4 نقاط لكل سؤال</span> مطلوب.
                            </p>
                            {!isSufficient && (
                              <p className="text-xs text-red-600 dark:text-red-400 font-extrabold mt-1.5">
                                رصيدك الحالي ({credits} نقطة) لا يكفي لتغطية تكلفة هذا الامتحان! يرجى تقليل عدد الأسئلة أو شحن نقاطك مجاناً.
                              </p>
                            )}
                          </div>
                          <div className="flex sm:flex-col items-center justify-between sm:justify-center bg-white dark:bg-slate-950 px-4 py-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] min-w-[110px] w-full sm:w-auto">
                            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{cost}</span>
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">نقطة ذكية</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                    <button
                      onClick={handleGenerateFromSettings}
                      disabled={isUploading || (!genSettings.types.mcq && !genSettings.types.tf && !genSettings.types.essay)}
                      className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-[0_5px_0_0_#1d4ed8] hover:translate-y-[3px] hover:shadow-[0_2px_0_0_#1d4ed8] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isUploading ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
                      {isUploading ? 'جاري تحضير الامتحان...' : 'توليد الامتحان الآن'}
                    </button>
                    <button
                      onClick={() => {
                         setUploadedFileContent(null);
                         setUploadedFilesList([]);
                         setExamState('setup');
                      }}
                      className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-xl transition-all"
                    >
                      إلغاء
                    </button>
                  </div>

                </div>
              </motion.div>
            )}

            {/* Tab 3: History View */}
            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {loadingHistory ? (
                  <div className="flex justify-center p-12">
                    <Loader2 size={48} className="text-blue-500 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl neo-border text-center">
                        <div className="text-3xl font-black text-blue-600 mb-1">{examHistoryList.length}</div>
                        <div className="text-sm font-bold text-slate-500">امتحانات مكتملة بالكامل</div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl neo-border text-center">
                        <div className="text-3xl font-black text-green-500 mb-1">
                          {examHistoryList.reduce((acc, curr) => acc + curr.totalScorable, 0) > 0 
                            ? Math.round((examHistoryList.reduce((acc, curr) => acc + curr.score, 0) / examHistoryList.reduce((acc, curr) => acc + curr.totalScorable, 0)) * 100)
                            : '--'}%
                        </div>
                        <div className="text-sm font-bold text-slate-500">معدل الجاهزية الحالي</div>
                      </div>
                    </div>
                    
                    {examHistoryList.length === 0 ? (
                      <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl neo-border flex flex-col items-center text-center">
                        <Sparkles size={48} className="text-yellow-400 mb-4" />
                        <h3 className="text-xl font-black mb-2">سجلتت للنجاح فارغة</h3>
                        <p className="text-slate-500 font-bold max-w-xs">
                          أنشئ امتحانات من ملفاتك الدراسية لنقوم بحفظ تقدمك وعرض أوراق الإجابات النموذجية كاملة هنا.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h3 className="text-xl font-black text-right" dir="rtl">سجلات الامتحانات التاريخية</h3>
                        {examHistoryList.map(history => {
                          const scorePct = history.totalScorable > 0 
                            ? Math.round((history.score / history.totalScorable) * 100) 
                            : 100;
                          return (
                            <div key={history.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl neo-border flex items-center justify-between" dir="rtl">
                              <div>
                                <h4 className="font-bold text-lg">{history.subject}</h4>
                                <p className="text-sm text-slate-500">{new Date(history.date).toLocaleDateString('ar-IQ')} • {history.totalQuestions} أسئلة</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg text-center">
                                  <div className="text-lg font-black text-blue-600">
                                    {history.score}/{history.totalScorable}
                                  </div>
                                  <div className="text-xs font-bold text-slate-500">النتيجة ({scorePct}%)</div>
                                </div>
                                <button
                                  onClick={() => { setReviewingExam(history); setActiveTab('dashboard'); }}
                                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-3 py-2 rounded-lg border-2 border-black text-xs transition-all hover:-translate-y-0.5"
                                >
                                  عرض ورقة الامتحان
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
