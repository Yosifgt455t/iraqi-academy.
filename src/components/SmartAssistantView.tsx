import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, FileText, Brain, History, Sparkles, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
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

export default function SmartAssistantView({ onBack, userId, isAdmin = false }: Props) {
  const [activeTab, setActiveTab] = useState<'create' | 'upload' | 'history' | 'admin_import'>('upload');
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
  const [genSettings, setGenSettings] = useState({
     examName: '',
     questionCount: '10',
     types: { mcq: true, tf: false, essay: false },
     language: 'العربية'
  });

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
    if (activeTab === 'history') {
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
    }
  }, [activeTab, userId]);

  const availableGrades = Array.from(new Set(allQuestions.map(q => String(q.grade || '').trim()))).filter(Boolean).sort();
  const availableSubjects = Array.from(new Set(allQuestions.filter(q => String(q.grade || '').trim() === String(selectedGrade).trim() || !selectedGrade).map(q => String(q.subject || '').trim()))).filter(Boolean).sort();
  const availableRounds = Array.from(new Set(allQuestions.filter(q => (String(q.grade || '').trim() === String(selectedGrade).trim() || !selectedGrade) && (String(q.subject || '').trim() === String(selectedSubject).trim() || !selectedSubject)).map(q => String(q.round || '').trim()))).filter(Boolean).sort();
  const availableYears = Array.from(new Set(allQuestions.filter(q => (String(q.grade || '').trim() === String(selectedGrade).trim() || !selectedGrade) && (String(q.subject || '').trim() === String(selectedSubject).trim() || !selectedSubject) && (String(q.round || '').trim() === String(selectedRound).trim() || !selectedRound)).map(q => String(q.year || '').trim()))).filter(Boolean).sort((a, b) => b.localeCompare(a));
  
  const availableChapters = Array.from(new Set(allQuestions.filter(q => (String(q.grade || '').trim() === String(selectedGrade).trim() || !selectedGrade) && (String(q.subject || '').trim() === String(selectedSubject).trim() || !selectedSubject)).map(q => String(q.chapter || '').trim()))).filter(Boolean).sort();
  const availableTopics = Array.from(new Set(allQuestions.filter(q => (String(q.grade || '').trim() === String(selectedGrade).trim() || !selectedGrade) && (String(q.subject || '').trim() === String(selectedSubject).trim() || !selectedSubject) && (String(q.chapter || '').trim() === String(selectedChapter).trim() || !selectedChapter)).map(q => String(q.topic || '').trim()))).filter(Boolean).sort();


  const handleStartExam = async () => {
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
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء تحميل الأسئلة.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size to 5MB to prevent mobile browser memory crashes
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
       alert("حجم الملف كبير جداً. يرجى رفع ملف حجمه أقل من 5 ميجابايت.");
       if (fileInputRef.current) fileInputRef.current.value = '';
       return;
    }

    setIsUploading(true);
    
    // Allow UI to render the loading state before heavy processing blocks the main thread
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
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
          setUploadedFileContent({ text: fileText, mimeType: file.type, fileName: file.name });
      } else if (file.type.startsWith('image/')) {
         const reader = new FileReader();
         const base64Promise = new Promise<string>((resolve) => {
           reader.onload = () => resolve((reader.result as string).split(',')[1]);
           reader.readAsDataURL(file);
         });
         
         const base64Data = await base64Promise;
         setUploadedFileContent({ base64: base64Data, mimeType: file.type, fileName: file.name });
      } else {
         alert("نوع الملف غير مدعوم. نرجو رفع صورة، PDF، أو ملف نصي (Word/TXT).");
         setIsUploading(false);
         return;
      }

      setActiveTab('upload');
      setExamState('fileSettings'); // Use fileSettings to show the form

    } catch (err: any) {
      console.error(err);
      alert("فشل في تحليل الملف. يرجى التأكد من أن الملف مقروء.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGenerateFromSettings = async () => {
    if (!uploadedFileContent) return;
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
            correctAnswer: { type: Type.STRING, description: "The correct option index as a string for MCQ/TrueFalse, or the model answer for Essay" }
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

      تعليمات هامة:
      - إذا كان النص يحتوي على أسئلة جاهزة استخرجها إن أمكن، وإذا لم تكن كافية قم بتأليف أسئلة تقيس الفهم.
      - يجب أن يتناسب عدد الأسئلة مع العدد المطلوب تقريباً.
      - تنويع الأسئلة بحسب الأنواع المطلوبة.
      - سؤال الصح والخطأ يجب أن يحتوي خيارين فقط في options وهما "صح" و "خطأ".
      - بالنسبة للـ Essay، ضع الإجابة النموذجية المأخوذة من النص للتقييم.
      `;

      if (uploadedFileContent.text) {
         let text = uploadedFileContent.text;
         if (text.length > 50000) text = text.substring(0, 50000);
         
         const prompt = `${promptTemplate}\nالنص المطلوب استخراج/توليد الأسئلة منه:\n${text}`;

         const response = await ai.models.generateContent({
           model: 'gemini-2.5-flash',
           contents: prompt,
           config: {
             responseMimeType: "application/json",
             responseSchema: questionSchema,
           }
         });
         responseText = response.text || "[]";
      } else if (uploadedFileContent.base64 && uploadedFileContent.mimeType) {
         const prompt = `${promptTemplate}\nالصورة المرفقة تحتوي على المحتوى المطلوب استخراج/توليد الأسئلة منه.`;

         const response = await ai.models.generateContent({
           model: 'gemini-2.5-flash',
           contents: [
             prompt,
             { inlineData: { data: uploadedFileContent.base64, mimeType: uploadedFileContent.mimeType } }
           ],
           config: {
             responseMimeType: "application/json",
             responseSchema: questionSchema,
           }
         });
         responseText = response.text || "[]";
      }

      const generatedQuestions = JSON.parse(responseText);
      
      const formattedQ = generatedQuestions.map((q: any, index: number) => ({
        ...q,
        id: q.id || `gen_${index}_${Date.now()}`,
        grade: 'عام',
        subject: genSettings.examName || uploadedFileContent.fileName || 'امتحان مخصص',
        options: q.options || [],
        correctAnswer: (q.type === 'MCQ' || q.type === 'TrueFalse') ? parseInt(q.correctAnswer) || 0 : q.correctAnswer
      }));

      if(formattedQ.length === 0) {
        alert("لم نتمكن من استخراج أسئلة من هذا الملف.");
        setIsUploading(false);
        return;
      }

      setQuestions(formattedQ);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setExamState('taking');

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

    if (userId) {
       try {
           await addDoc(collection(db, "exam_history"), {
               userId,
               score: currentScore,
               totalScorable: scorableQuestions,
               totalQuestions: questions.length,
               subject: selectedSubject || genSettings.examName || "امتحان مخصص",
               date: new Date().toISOString()
           });
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8">
      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-12 gap-8 items-start' : ''}`}>
        {/* Admin AI Chat / Import Panel */}
        {isAdmin && (
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-900 rounded-2xl p-6 shadow-sm sticky top-24">
            <div className="flex items-center gap-2 mb-4 text-purple-600 dark:text-purple-400">
              <Sparkles size={24} />
              <h3 className="font-black text-xl">مساعد الذكاء الاصطناعي (إدارة)</h3>
            </div>
            <p className="text-sm font-bold text-slate-500 mb-6 text-right leading-relaxed">
              نافذة ذكية تقسم بوابة الوزاري. أرسل الأسئلة أو التعليمات النصية هنا، وسيقوم الذكاء الاصطناعي بتحليلها وإضافتها مباشرة إلى الأسئلة الوزارية.
            </p>
            
            <textarea 
              value={adminImportText}
              onChange={(e) => setAdminImportText(e.target.value)}
              placeholder="مثال: ضف هذه الأسئلة لمادة الرياضيات للصف السادس الإعدادي سنة 2024 الدور الأول، مبرهنة رول..."
              className="w-full min-h-[250px] p-4 bg-purple-50 focus:bg-white dark:bg-slate-800 border-2 border-purple-100 focus:border-purple-500 rounded-xl outline-none transition-colors resize-y font-medium text-right mb-4 shadow-inner"
              dir="rtl"
            />

            {adminImportProgress && (
              <div className="bg-purple-100 text-purple-800 p-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 mb-4">
                {adminImportLoading && <Loader2 size={14} className="animate-spin" />}
                {adminImportProgress}
              </div>
            )}

            <button
              onClick={handleAdminTextImport}
              disabled={adminImportLoading || !adminImportText.trim()}
              className="w-full py-4 bg-gradient-to-l from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-black text-lg transition-all shadow-[0_5px_0_0_#4f46e5] hover:shadow-[0_2px_0_0_#4f46e5] hover:-translate-y-[3px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
               {adminImportLoading ? <Loader2 size={24} className="animate-spin" /> : <Brain size={24} />}
               إرسال وإضافة
            </button>
          </div>
        )}

        <div className={isAdmin ? "lg:col-span-8 shrink-0 space-y-6" : "space-y-6"}>
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
          <h2 className="text-right">جاهزية الوزاري</h2>
          <div className="w-10 h-10 neo-bg-blue border-2 border-black rounded-xl flex items-center justify-center">
            <Sparkles size={24} className="text-black" />
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 p-4 rounded-xl text-yellow-800 dark:text-yellow-200 text-sm font-bold text-center">
        مساعدك الشخصي للتحضير للامتحانات الوزارية بالذكاء الاصطناعي
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border-2 border-black/10 dark:border-white/10">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'upload'
              ? 'bg-white dark:bg-slate-700 shadow-sm border-2 border-slate-200 dark:border-slate-600'
              : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700/50'
          }`}
        >
          <FileText size={18} />
          من ملفاتي
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'create'
                ? 'bg-white dark:bg-slate-700 shadow-sm border-2 border-slate-200 dark:border-slate-600'
                : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700/50'
            }`}
          >
            <Brain size={18} />
            اختر تحديك
          </button>
        )}
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-white dark:bg-slate-700 shadow-sm border-2 border-slate-200 dark:border-slate-600'
              : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700/50'
          }`}
        >
          <History size={18} />
          لوحة الأداء
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 bg-white dark:bg-slate-900 p-6 rounded-2xl neo-border"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 text-right">الصف</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => {
                    setSelectedGrade(e.target.value);
                    setSelectedSubject('');
                    setSelectedRound('');
                    setSelectedYear('');
                    setSelectedChapter('');
                    setSelectedTopic('');
                  }}
                  className="w-full text-right p-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all appearance-none bg-slate-50 dark:bg-slate-800 dark:border-slate-600 font-bold"
                  dir="rtl"
                >
                  <option value="">-- اختر الصف --</option>
                  {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 text-right">المادة الدراسية</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setSelectedRound('');
                    setSelectedYear('');
                    setSelectedChapter('');
                    setSelectedTopic('');
                  }}
                  disabled={!selectedGrade}
                  className="w-full text-right p-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all appearance-none bg-slate-50 dark:bg-slate-800 dark:border-slate-600 font-bold disabled:opacity-50"
                  dir="rtl"
                >
                  <option value="">-- اختر المادة --</option>
                  {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 text-right">الفصل</label>
                  <select
                    value={selectedChapter}
                    onChange={(e) => {
                      setSelectedChapter(e.target.value);
                      setSelectedTopic('');
                    }}
                    disabled={!selectedSubject || availableChapters.length === 0}
                    className="w-full text-right p-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all appearance-none bg-slate-50 dark:bg-slate-800 dark:border-slate-600 font-bold disabled:opacity-50"
                    dir="rtl"
                  >
                    <option value="">-- كل الفصول --</option>
                    {availableChapters.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 text-right">الموضوع</label>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    disabled={!selectedChapter || availableTopics.length === 0}
                    className="w-full text-right p-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all appearance-none bg-slate-50 dark:bg-slate-800 dark:border-slate-600 font-bold disabled:opacity-50"
                    dir="rtl"
                  >
                    <option value="">-- كل المواضيع --</option>
                    {availableTopics.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 text-right">الدور</label>
                  <select
                    value={selectedRound}
                    onChange={(e) => {
                      setSelectedRound(e.target.value);
                    }}
                    disabled={!selectedSubject}
                    className="w-full text-right p-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all appearance-none bg-slate-50 dark:bg-slate-800 dark:border-slate-600 font-bold disabled:opacity-50"
                    dir="rtl"
                  >
                    <option value="">-- كل الأدوار --</option>
                    {availableRounds.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2 text-right">السنة</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    disabled={!selectedSubject}
                    className="w-full text-right p-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all appearance-none bg-slate-50 dark:bg-slate-800 dark:border-slate-600 font-bold disabled:opacity-50"
                    dir="rtl"
                  >
                    <option value="">-- كل السنوات --</option>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartExam}
              disabled={loading || loadingConfig || !selectedSubject || !selectedGrade}
              className="w-full p-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg transition-all shadow-[0_5px_0_0_#1d4ed8] hover:shadow-[0_2px_0_0_#1d4ed8] hover:translate-y-[3px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : <BookOpen size={24} />}
              {loading ? 'جاري التجهيز...' : 'ابدأ الامتحان'}
            </button>
          </motion.div>
        )}

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
               {isUploading ? 'جاري تجهيز الملف...' : 'ارفع ملفك الخاص'}
            </h3>
            <p className="text-slate-500 font-bold mb-6 max-w-sm">
              {isUploading 
                ? 'جاري قراءة الملف وتجهيزه. نرجو الانتظار'
                : 'ارفع ملف PDF أو صورة أو Word واستخرج منها أسئلة امتحان مخصصة باستخدام الذكاء الاصطناعي'
              }
            </p>
            <input 
              type="file" 
              accept=".pdf,image/*,.doc,.docx,.txt" 
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
              إعدادات الامتحان المستخرج
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">اسم الامتحان <span className="text-slate-400 text-xs font-normal">(اختياري)</span></label>
                <input
                  type="text"
                  placeholder="مثال: امتحان الفصل الأول - رياضيات"
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
                  className="w-full text-right p-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none font-bold bg-slate-50 dark:bg-slate-800"
                >
                  <option value="5">5 أسئلة (قصير)</option>
                  <option value="10">10 أسئلة (متوسط)</option>
                  <option value="20">20 سؤال (شامل)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">أنواع الأسئلة (يمكن اختيار أكثر من نوع)</label>
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
                    <div className="text-sm font-bold text-slate-500">امتحانات مكتملة</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl neo-border text-center">
                    <div className="text-3xl font-black text-green-500 mb-1">
                      {examHistoryList.reduce((acc, curr) => acc + curr.totalScorable, 0) > 0 
                        ? Math.round((examHistoryList.reduce((acc, curr) => acc + curr.score, 0) / examHistoryList.reduce((acc, curr) => acc + curr.totalScorable, 0)) * 100)
                        : '--'}%
                    </div>
                    <div className="text-sm font-bold text-slate-500">نسبة الجاهزية</div>
                  </div>
                </div>
                
                {examHistoryList.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl neo-border flex flex-col items-center text-center">
                    <Sparkles size={48} className="text-yellow-400 mb-4" />
                    <h3 className="text-xl font-black mb-2">خريطتك للنجاح فارغة</h3>
                    <p className="text-slate-500 font-bold max-w-xs">
                      أكمل امتحانات وزارية من خلال قسم "اختر تحديك" لنقوم بتحليل أدائك وتقديم نصائح مخصصة.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-xl font-black text-right" dir="rtl">سجلات الامتحانات</h3>
                    {examHistoryList.map(history => (
                      <div key={history.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl neo-border flex items-center justify-between" dir="rtl">
                        <div>
                          <h4 className="font-bold text-lg">{history.subject}</h4>
                          <p className="text-sm text-slate-500">{new Date(history.date).toLocaleDateString('ar-IQ')} • {history.totalQuestions} أسئلة</p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg text-center">
                          <div className="text-lg font-black text-blue-600">
                            {history.score}/{history.totalScorable}
                          </div>
                          <div className="text-xs font-bold text-slate-500">النتيجة</div>
                        </div>
                      </div>
                    ))}
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
