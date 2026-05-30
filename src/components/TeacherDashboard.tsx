import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  increment, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';
import { getAIClient, shouldSwitchKey } from '../services/aiService';
import { 
  Sparkles, 
  FileText, 
  Send, 
  Loader2, 
  CheckCircle2, 
  Printer, 
  Plus, 
  Trash2,
  GraduationCap,
  MessageSquare,
  AlertCircle,
  Upload,
  FileCheck,
  Calendar,
  Layers,
  Check,
  Eye,
  FileSpreadsheet,
  FileUp,
  MessageCircle,
  ThumbsUp,
  X,
  FileCode,
  Download,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  user: any;
  onLogout: () => void;
}

const CONSTANT_SUBJECTS = [
  "الفيزياء", "الكيمياء", "الأحياء", "الرياضيات", 
  "اللغة العربية", "اللغة الإنكليزية", "التربية الإسلامية", "الاجتماعيات"
];

const CONSTANT_GRADES = [
  "السادس الإعدادي العلمي", "السادس الإعدادي الأدبي", "الثالث المتوسط", "الخامس الإعدادي"
];

// Helper to convert binary files to Base64 for Gemini multimodal ingestion
const fileToBase64 = (file: File): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result?.split(',')[1] || '';
      resolve({ mimeType: file.type, data: base64Data });
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function TeacherDashboard({ user, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<'planner' | 'exam' | 'forum'>('exam');
  const [loading, setLoading] = useState(false);
  const [forumLoading, setForumLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Print Mode State
  const [printType, setPrintType] = useState<'questions' | 'answers' | 'planner'>('questions');
  const [showExportModal, setShowExportModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printDocRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // STATE 1: AI Annual Syllabus Planner
  // ==========================================
  const [planSubject, setPlanSubject] = useState(CONSTANT_SUBJECTS[0]);
  const [planGrade, setPlanGrade] = useState(CONSTANT_GRADES[0]);
  const [planYear, setPlanYear] = useState('2026 - 2027');
  const [planSyllabusText, setPlanSyllabusText] = useState('');
  const [planFile, setPlanFile] = useState<File | null>(null);
  const [planFileBase64, setPlanFileBase64] = useState<{ mimeType: string; data: string } | null>(null);
  const [generatedAnnualPlan, setGeneratedAnnualPlan] = useState('');

  // ==========================================
  // STATE 2: Iraqi Exam & Model Answer Key Generator
  // ==========================================
  const [examSchool, setExamSchool] = useState('ثانوية المتميزين للبنين');
  const [examYear, setExamYear] = useState('2026 - 2027');
  const [examMonth, setExamMonth] = useState('الامتحانات الشهرية الفصلية');
  const [examSubject, setExamSubject] = useState(CONSTANT_SUBJECTS[0]);
  const [examGrade, setExamGrade] = useState(CONSTANT_GRADES[0]);
  const [examDuration, setExamDuration] = useState('ساعتان ونصف');
  const [examTeacher, setExamTeacher] = useState(user.displayName || 'أستاذ المادة');
  const [examDifficulty, setExamDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [examSourceText, setExamSourceText] = useState('');
  const [examFile, setExamFile] = useState<File | null>(null);
  const [examFileBase64, setExamFileBase64] = useState<{ mimeType: string; data: string } | null>(null);

  // Interface for Printable Exam elements with branches support
  interface PrintableExamQuestion {
    text: string;
    branches: string[];
  }

  interface PrintableExamAnswer {
    text: string;
    branches: string[];
  }

  const [aiCustomInstructions, setAiCustomInstructions] = useState('');

  // Unified Questions & Answers State
  const [examQuestions, setExamQuestions] = useState<PrintableExamQuestion[]>([
    {
      text: "س١/ عرّف المفاهيم الوزارية التالية بالتفصيل: (١٥ درجة)",
      branches: [
        "أ- أحد المكونات الفيزيائية النشطة.",
        "ب- قانون كيرشوف للتيارات."
      ]
    },
    {
      text: "س٢/ علل علمياً وبدقة: (١٥ درجة)",
      branches: [
        "أ- تزداد موصلية أشباه الموصلات النقية مع ارتفاع درجات الحرارة."
      ]
    },
    {
      text: "س٣/ قارن مقارنة منهجية معززة بجدول متكامل وبصيغة خبير تربوي بين: (١٥ درجة)",
      branches: [
        "أ- المحولات الرافعة والمحولات الخافضة للجهد الكهربائي موضحاً عدد الملفات وطبيعة تيار كل منهما."
      ]
    },
    {
      text: "س٤/ مسألة رياضية تطبيقية دقيقة: (٢٠ درجة)",
      branches: [
        "أ- احسب معامل الحث المتبادل بين ملفين متجاورين إذا تغير التيار في الملف الابتدائي بمعدل منسق وتولدت دافعة كهربائية محتثة ثانوية."
      ]
    }
  ]);

  const [examAnswers, setExamAnswers] = useState<PrintableExamAnswer[]>([
    {
      text: "جواب س١ النموذجية بالتفصيل:",
      branches: [
        "أ- المكونات النشطة: هي الأجزاء التي تساهم في إحداث وتكبير الإشارات الكهربائية كالترانزستور والثنائي المقوم.",
        "ب- قانون كيرشوف للتيارات: مجموع التيارات الداخلة إلى عقدة أو نقطة تفرع يساوي مجموع التيارات الخارجة منها."
      ]
    },
    {
      text: "جواب س٢ التعليل العلمي المعتمد:",
      branches: [
        "أ- بسبب تكسر بعض الأواصر التساهمية بفعل التأثير الحراري وتوليد أزواج (إلكترون - فجوة) إضافية مما يقلل المقاومة الكهربائية ويزيد الموصلية."
      ]
    },
    {
      text: "جواب س٣ المقارنة الدقيقة بالجدول:",
      branches: [
        "أ- المحولة الرافعة: تزيد الجهد وتخفض التيار، ولفات ملفها الثانوي أكبر N2 > N1. المحولة الخافضة: تخفض الجهد وتزيد التيار، ولفات ملفها الابتدائي أكبر N1 > N2."
      ]
    },
    {
      text: "جواب س٤ الأرقام والخطوات الرياضية للتصحيح:",
      branches: [
        "أ- بتطبيق العلاقة e.ind2 = -M * (ΔI1 / Δt) وحساب المعطيات خطوة بخطوة وإثبات النتيجة النهائية بالوحدة الفيزيائية الهنري (H)."
      ]
    }
  ]);

  const [examActiveTab, setExamActiveTab] = useState<'questions' | 'answers'>('questions');
  const [newManualQ, setNewManualQ] = useState('');
  const [newManualA, setNewManualA] = useState('');

  // ==========================================
  // STATE 3: Interactive Teacher Q&A Forums
  // ==========================================
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [currentPostComments, setCurrentPostComments] = useState<any[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  
  // Custom Broadcast Announcement for Forums state
  const [forumBroadcastTitle, setForumBroadcastTitle] = useState('');
  const [forumBroadcastContent, setForumBroadcastContent] = useState('');
  const [broadcastCategory, setBroadcastCategory] = useState<'وزاري عاجل' | 'تبليغ صفي' | 'نصائح وملازم'>('تبليغ صفي');
  const [forumSearch, setForumSearch] = useState('');
  const [forumFilter, setForumFilter] = useState<'all' | 'students' | 'teacher_notices'>('all');

  // ==========================================
  // FETCH FORUMS & INITIAL LOAD
  // ==========================================
  const fetchForumData = async () => {
    setForumLoading(true);
    try {
      const q = query(collection(db, 'forum_posts'), orderBy('createdAt', 'desc'), limit(40));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setForumPosts(list);
    } catch (err) {
      console.error('Error loading forum:', err);
    } finally {
      setForumLoading(false);
    }
  };

  useEffect(() => {
    fetchForumData();
  }, []);

  // Fetch comments of selected post
  const fetchSelectedPostComments = async (postId: string) => {
    try {
      const q = query(collection(db, 'forum_comments'), orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      const list = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((c: any) => c.postId === postId);
      setCurrentPostComments(list);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  useEffect(() => {
    if (selectedPost) {
      fetchSelectedPostComments(selectedPost.id);
    }
  }, [selectedPost]);

  // ==========================================
  // ACTIONS handlers
  // ==========================================

  // File Handlers
  const handlePlanFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPlanFile(file);
      try {
        const base64 = await fileToBase64(file);
        setPlanFileBase64(base64);
        setSuccess(`تم تحميل ملف الفهرست بنجاح: ${file.name}`);
      } catch (err) {
        setError('فشل تحويل الملف لمصدر صالح للذكاء الاصطناعي');
      }
    }
  };

  const handleExamFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExamFile(file);
      try {
        const base64 = await fileToBase64(file);
        setExamFileBase64(base64);
        setSuccess(`تم تحميل ملف مرجع الامتحان: ${file.name}`);
      } catch (err) {
        setError('فشل معالجة ملف الامتحان المرفق');
      }
    }
  };

  // Generate Annual Study Plan
  const handleGenerateAnnualPlan = async () => {
    setLoading(true);
    setError(null);
    setGeneratedAnnualPlan('');
    try {
      const ai = getAIClient();
      const difficultyText = "منهج عراقي قياسي مفصل";
      
      let contents: any[] = [];
      const textPrompt = `بصفتك موجهاً تربوياً وخبيراً في قسم التوجيه الفني والمناهج لدى وزارة التربية والتعليم العراقية.
قم بإعداد "الخطة السنوية والخطط الشهرية التفصيلية" الكاملة لتدريس مادة [${planSubject}] المخصصة للصف [${planGrade}] للعام الدراسي [${planYear}].

أنت مطالب بتصميم خطة رصينة متسلسلة مبنية ومتطابقة تماماً مع الفهرس/الكتاب المرفق.
يرجى توزيع مواضيع الفهرس/فصول المادة بالتساوي والحكمة على أشهر التدريس الفعلية في العراق كالتالي:
- تشرين الأول (بداية العام وتأسيس المادة)
- تشرين الثاني (الدراسة المكثفة والتقييمات الأولى)
- كانون الأول (الفصول المتوسطة وتطبيقاتها)
- كانون الثاني (تكملة نصف المنهج ومراجعة امتحانات نصف السنة)
- شباط (عطلة الربيع واستئناف بداية النصف الثاني)
- آذار (الفصول المتقدمة والأنشطة التطبيقية)
- نيسان (اللمسات الأخيرة للمنهج وحل أسئلة الفصول)
- أيار (المراجعة الذهبية المركزة للامتحانات النهائية والوزارية)

قدم الخطة في صيغة جدول دراسي أنيق جداً ومنظم باستخدام الفهرس المرفق كمصدر، مع ذكر توجيهات تربوية ممتازة للمعلم لكيفية قياس فهم الطلبة وتحسين مستواهم للتفوق الدراسي الباهر.
اكتب المخرجات باللغة العربية تماماً بأسلوب منهجي ملائم للإشراف التربوي العراقي.`;

      contents.push(textPrompt);

      // Include multimodal upload if present
      if (planFileBase64) {
        contents.push({
          inlineData: {
            mimeType: planFileBase64.mimeType,
            data: planFileBase64.data
          }
        });
      } else if (planSyllabusText.trim()) {
        contents.push(`\n\nنص الفهرست المدخل كمرجع أساسي:\n${planSyllabusText}`);
      } else {
        contents.push(`\n(يرجى استخدام المنهاج العراقي الرسمي المعتمد لمادة ${planSubject} للصف ${planGrade} كمرجع مفترض لتوزيع مادة الكتاب فصلاً فصلاً بالتفصيل)`);
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents
      });

      if (response && response.text) {
        setGeneratedAnnualPlan(response.text);
        setSuccess('تم إنتاج وتوليد خطة التوزيع السنوية المعتمدة بنجاح!');
      } else {
        throw new Error('لم يستجب خادم الذكاء الاصطناعي مع نص الخطة المعني');
      }
    } catch (err: any) {
      console.error(err);
      if (shouldSwitchKey(err)) {
        setError('تم استهلاك الحصة للمفتاح الحالي، يرجى المحاولة لتوليد الخطة بالبديل.');
      } else {
        setError('حدث خطأ أثناء الاتصال بالذكاء الاصطناعي وصياغة الخطة: ' + (err.message || String(err)));
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate Iraqi Exam questions with model answer key from source attachment
  const handleGenerateExamAndAnswers = async () => {
    setLoading(true);
    setError(null);
    try {
      const ai = getAIClient();
      const diffText = examDifficulty === 'easy' ? 'سهل مبسط للفهم المباشر' : examDifficulty === 'medium' ? 'متوسط يتطابق مع النمط القياسي للامتحانات المنهجية' : 'صعب، يركز على الأسئلة الوزارية الإثرائية والتنافسية للطلبة المتميزين والحلول العميقة';
      
      let contents: any[] = [];
      const textPrompt = `بصفتك اللجنة الامتحانية المكلفة والواضع المتخصص لأسئلة المطبوعات والامتحانات الوزارية بجمهورية العراق.
قم بصياغة "ورقة أسئلة امتحانية رصينة" متكونة من 4 أسئلة (س١، س٢، س٣، س٤) مناسبة لمادة [${examSubject}] للصف [${examGrade}] بمستوى صعوبة [${diffText}] بناءً على مصدر الكتاب/ المذكرة المرفقة.

*** الشروط النموذجية لورقة الاستبانة العراقية: ***
- صمم أسئلة متنوعة: س١ (تعاريف مفاهيم علمية)، س٢ (علل ما يأتي / أو قارن)، س٣ (أكمل الفراغات أو اكتب الفروق)، س٤ (مسألة رياضية دقيقة بحسب صنف مادة ${examSubject}).
- حدد درجات واضحة بشكل منسق معتاد في المدارس العراقية (مثلاً: س١/ ... (١٥ درجة)).
- يرجى بجدية تامة صياغة الفروع المتفرعة لكل سؤال مستقلة (أمثلة: أ- ...، ب- ...) ليكون الهيكل رصيناً ومنظماً بالكامل كالصورة النموذجية.
- يجب بجدية ومسؤولية صياغة "الأجوبة النموذجية التفصيلية المقسمة والفروع المطابقة" والكاملة لكل سؤال من الأسئلة المتولدة لتكون جاهزة للمطبوع ودليل تصحيح الدفاتر الامتحانية.

${aiCustomInstructions.trim() ? `*** تعليمات خاصة إضافية من الأستاذ يجب دمجها والالتزام بها حرفياً: ***\n${aiCustomInstructions.trim()}\n` : ''}

قم بصياغة المخرجات ***حصراً كبنية JSON نقية بدقة عالية وبدون أي نصوص مقدمة أو مؤخرة*** كما المخطط التالي لتجنب الأخطاء البرمجية:
{
  "questions": [
    {
      "text": "س١/ عرف المفاهيم الوزارية التالية بالتفصيل: (١٥ درجة)",
      "branches": [
        "أ- المفهوم الأول ... (٧ درجات)",
        "ب- المفهوم الثاني ... (٨ درجات)"
      ]
    },
    {
      "text": "س٢/ علل ما يأتي بدقة: (١٥ درجة)",
      "branches": [
        "أ- التعليل الأول ... (١٥ درجة)"
      ]
    },
    {
      "text": "س٣/ قارن بجدول شامل وبصيغة نموذجية بين: (١٥ درجة)",
      "branches": [
        "أ- ... و ... من حيث ... (١٥ درجة)"
      ]
    },
    {
      "text": "س٤/ مسألة رياضية: (٢٠ درجة)",
      "branches": [
        "أ- المعطيات والطلب الحسابي ... (٢٠ درجة)"
      ]
    }
  ],
  "modelAnswers": [
    {
      "text": "جواب س١ النموذجي بالتفصيل:",
      "branches": [
        "أ- شرح المفهوم الأول وحله المعتمد ...",
        "ب- شرح المفهوم الثاني وحله المعتمد ..."
      ]
    },
    {
      "text": "جواب س٢ النموذجي بالتفصيل:",
      "branches": [
        "أ- السبب والبرهان العلمي ..."
      ]
    },
    {
      "text": "جواب س٣ النموذجي بالتفصيل والجدول المعتمد:",
      "branches": [
        "أ- حقل المقارنة وجوانب التشابه والاختلاف ..."
      ]
    },
    {
      "text": "جواب س٤ النموذجي بالتفصيل والخطوات الحسابية:",
      "branches": [
        "أ- كتابة القوانين، التعويض بالأرقام وحساب الناتج النهائي مع إثبات الوحدات الفيزيائية ..."
      ]
    }
  ]
}`;
 
      contents.push(textPrompt);
 
      if (examFileBase64) {
        contents.push({
          inlineData: {
            mimeType: examFileBase64.mimeType,
            data: examFileBase64.data
          }
        });
      } else if (examSourceText.trim()) {
        contents.push(`\n\nالمرجع النصي المرفق للأسئلة:\n${examSourceText}`);
      } else {
        contents.push(`\n(يرجى صياغة وتأليف أسئلة تتبع فصول مادة ${examSubject} للصف ${examGrade} من المنهاج العراقي الرسمي المعتمد لعدم توفر مرفق حالي)`);
      }
 
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          responseMimeType: 'application/json'
        }
      });
 
      if (response && response.text) {
        let cleanJsonStr = response.text.trim();
        // Fallback robust json extraction from markdown block
        if (cleanJsonStr.startsWith('```')) {
          const lines = cleanJsonStr.split('\n');
          if (lines[0].includes('json')) {
            lines.shift();
          } else {
            lines.shift();
          }
          if (lines[lines.length - 1].startsWith('```')) {
            lines.pop();
          }
          cleanJsonStr = lines.join('\n').trim();
        }
 
        const startIdx = cleanJsonStr.indexOf('{');
        const endIdx = cleanJsonStr.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          cleanJsonStr = cleanJsonStr.substring(startIdx, endIdx + 1);
        }
 
        const parsed = JSON.parse(cleanJsonStr);
        if (parsed.questions && parsed.modelAnswers) {
          const mappedQuestions = parsed.questions.map((q: any) => {
            if (typeof q === 'string') {
              return { text: q, branches: [] };
            }
            return {
              text: q.text || q.questionText || '',
              branches: Array.isArray(q.branches) ? q.branches : []
            };
          });

          const mappedAnswers = parsed.modelAnswers.map((ans: any) => {
            if (typeof ans === 'string') {
              return { text: ans, branches: [] };
            }
            return {
              text: ans.text || ans.answerText || '',
              branches: Array.isArray(ans.branches) ? ans.branches : []
            };
          });

          setExamQuestions(mappedQuestions);
          setExamAnswers(mappedAnswers);
          setSuccess('تم توليد ورقة الامتحانات الوزارية النموذجية مع دليل الأجوبة المقابل بنجاح باهر!');
        } else {
          throw new Error('لم تكن بنية الملف المستلم صحيحة الهيكل');
        }
      } else {
        throw new Error('لا يوجد مخرجات مستلمة من محرك Gemini');
      }
    } catch (err: any) {
      console.error(err);
      if (shouldSwitchKey(err)) {
        setError('تم استهلاك حصة المفتاح، يرجى إعادة الصياغة لتوليد الامتحان بالمفتاح المحدث.');
      } else {
        setError('فشل في صياغة الامتحان والأجوبة: ' + (err.message || String(err)));
      }
    } finally {
      setLoading(false);
    }
  };

  // Manual Question Addition
  const handleAddNewQuestionAndAnswer = () => {
    if (!newManualQ.trim()) return;
    setExamQuestions([...examQuestions, { text: newManualQ.trim(), branches: [] }]);
    setExamAnswers([...examAnswers, { text: (newManualA.trim() || 'لا يتوفر جواب مدخل يدوياً لمسودة هذا السؤال حالياً.'), branches: [] }]);
    setNewManualQ('');
    setNewManualA('');
    setSuccess('تمت إضافة السؤال وجوابه المقابل يدوياً للمسودة.');
  };

  // Remove question and its matching answer
  const handleRemoveQuestionAndAnswer = (idx: number) => {
    setExamQuestions(examQuestions.filter((_, i) => i !== idx));
    setExamAnswers(examAnswers.filter((_, i) => i !== idx));
    setSuccess('تم حذف السؤال وإجابته من المسودة الحالية.');
  };

  // Publish a custom public broadcast notice in the Student Forums
  const handlePublishBroadcastToForum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forumBroadcastTitle.trim() || !forumBroadcastContent.trim()) {
      setError('يرجى مليء عنوان ومحتوى التبليغ أولاً');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await addDoc(collection(db, 'forum_posts'), {
        authorId: user.id || user.uid,
        authorName: `الأستاذ ${user.displayName || 'التدريسي المعتمد'} (كادر التدريس) 🎓`,
        authorPhoto: user.photoURL,
        title: `📢 [${broadcastCategory}] - ${forumBroadcastTitle.trim()}`,
        content: forumBroadcastContent.trim(),
        likes: 0,
        likedBy: [],
        commentCount: 0,
        isTeacherPost: true,
        createdAt: new Date().toISOString()
      });
      setForumBroadcastTitle('');
      setForumBroadcastContent('');
      setSuccess('تم بث ونشر تبليغك التعليمي فوراً في منتدى وساحة الطلاب بتميز دائم!');
      fetchForumData();
    } catch (err: any) {
      setError('فشل النشر والمزامنة: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit Comments / Answers on Student Posts
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedPost) return;

    setSubmittingComment(true);
    try {
      await addDoc(collection(db, 'forum_comments'), {
        postId: selectedPost.id,
        authorId: user.id || user.uid,
        authorName: `الأستاذ الكابتن ${user.displayName || 'أستاذ معتمد'} (كادر التدريس) 🎓`,
        authorPhoto: user.photoURL,
        content: newCommentText.trim(),
        isTeacherComment: true,
        createdAt: new Date().toISOString()
      });

      // Update post comment count
      await updateDoc(doc(db, 'forum_posts', selectedPost.id), {
        commentCount: increment(1)
      });

      setNewCommentText('');
      setSuccess('تم الرد على سؤال الطالب بصفة كادر التدريس الرسمية بنجاح!');
      fetchSelectedPostComments(selectedPost.id);
      
      // Update local feed comments count
      setForumPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, commentCount: p.commentCount + 1 } : p));
    } catch (err: any) {
      console.error(err);
      setError('فشل حفظ ردك وتحديث الدفتر: ' + err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Delete/Moderate Student post as teacher authority
  const handleDeletePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذا المنشور التوجيهي أو الطلابي لمخالفته شروط الأكاديمية؟')) return;
    try {
      await deleteDoc(doc(db, 'forum_posts', postId));
      setSuccess('تم حذف وتنظيف المنشور المختار بنجاح من رصيد المنتدى.');
      if (selectedPost?.id === postId) {
        setSelectedPost(null);
      }
      fetchForumData();
    } catch (err: any) {
      setError('فشل في الإجراء الإداري: ' + err.message);
    }
  };

  // Universal Printing Dispatcher
  const dispatchPrintJob = (type: 'questions' | 'answers' | 'planner') => {
    setPrintType(type);
    setShowExportModal(true);
  };

  const generatePDFExport = async () => {
    if (isGeneratingPDF || !printDocRef.current) return;
    setIsGeneratingPDF(true);
    setError(null);
    
    // Backup stylesheets & style tags to clean up oklch/oklab
    const originalStyleSheets = document.styleSheets;
    const originalStyleSheetsDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'styleSheets') || Object.getOwnPropertyDescriptor(document, 'styleSheets');

    const styleElements = Array.from(document.querySelectorAll('style'));
    const backups = styleElements.map(el => ({
      element: el,
      originalText: el.textContent || ''
    }));

    // Setup color property list that html2canvas reads
    const colorProps = [
      'color', 'backgroundColor', 'borderColor', 
      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'outlineColor', 'fill', 'stroke'
    ];

    // Backup original descriptors and proptype methods of CSSStyleDeclaration
    const originalDescriptors: Record<string, PropertyDescriptor | undefined> = {};
    colorProps.forEach(prop => {
      originalDescriptors[prop] = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, prop);
    });
    const originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;

    let originalStyle = '';
    let hadHidden = false;

    try {
      const element = printDocRef.current;
      
      // Store original style & class info
      originalStyle = element.style.cssText;
      hadHidden = element.classList.contains('hidden');
      if (hadHidden) {
        element.classList.remove('hidden');
      }

      // Hide the printable wrapper off-screen so user doesn't see a giant layout flash,
      // while allowing HTML2Canvas to extract full geometry and style information.
      // 1. First measure natural height with height: auto
      element.style.setProperty('display', 'block', 'important');
      element.style.setProperty('position', 'absolute', 'important');
      element.style.setProperty('top', '0', 'important');
      element.style.setProperty('left', '0', 'important');
      element.style.setProperty('z-index', '-9999', 'important');
      element.style.setProperty('opacity', '1', 'important');
      element.style.setProperty('visibility', 'visible', 'important');
      element.style.setProperty('width', '800px', 'important');
      element.style.setProperty('height', 'auto', 'important');
      element.style.setProperty('min-height', 'auto', 'important');
      element.style.setProperty('background', '#ffffff', 'important');
      element.style.setProperty('color', '#000000', 'important');
      element.style.setProperty('padding', '24px', 'important');

      // Convert oklch color values to standard rgb/rgba (as html2canvas doesn't support oklch/oklab)
      const parseAndConvertOklch = (cssText: string): string => {
        const oklchPattern = /oklch\s*\(\s*([\d.%]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)/gi;
        return cssText.replace(oklchPattern, (match, lStr, cStr, hStr, aStr) => {
          let l = parseFloat(lStr);
          if (lStr.includes('%')) l = l / 100;
          let c = parseFloat(cStr);
          let h = parseFloat(hStr);

          // We estimate RGB based on lightness L and hue H to provide highly accurate contrast
          let r = 0, g = 0, b = 0;
          if (c < 0.02) {
            // Greyscale
            r = g = b = Math.round(l * 255);
          } else {
            // Green/Emerald range: 110 to 170
            if (h >= 110 && h < 170) {
              if (l > 0.8) {
                // very light emerald background (e.g. bg-emerald-50)
                r = 240; g = 253; b = 244;
              } else if (l > 0.5) {
                // emerald accent/border (e.g. text-emerald-600)
                r = 16; g = 185; b = 129;
              } else {
                // dark green text (e.g. text-emerald-950 / borders)
                r = 6; g = 95; b = 70;
              }
            } 
            // Blue/Teal range: 170 to 260
            else if (h >= 170 && h < 260) {
              if (l > 0.8) {
                // light blue/teal background
                r = 240; g = 249; b = 255;
              } else if (l > 0.5) {
                // blue accent
                r = 59; g = 130; b = 246;
              } else {
                // dark blue
                r = 30; g = 58; b = 138;
              }
            }
            // Reds/Orange/Pink: < 110 or >= 260
            else {
              if (l > 0.8) {
                r = 254; g = 242; b = 242; // rose-50
              } else if (l > 0.5) {
                r = 239; g = 68; b = 68; // rose-500
              } else {
                r = 159; g = 18; b = 57; // rose-900
              }
            }
          }

          // Bound colors
          r = Math.max(0, Math.min(255, r));
          g = Math.max(0, Math.min(255, g));
          b = Math.max(0, Math.min(255, b));

          if (aStr) {
            let a = parseFloat(aStr);
            if (aStr.includes('%')) a = a / 100;
            return `rgba(${r}, ${g}, ${b}, ${a})`;
          }
          return `rgb(${r}, ${g}, ${b})`;
        });
      };

      const parseAndConvertOklab = (cssText: string): string => {
        const oklabPattern = /oklab\s*\(\s*([\d.%]+)\s+([\d.-]+)\s+([\d.-]+)(?:\s*\/\s*([\d.%]+))?\s*\)/gi;
        return cssText.replace(oklabPattern, (match, lStr, aStrVal, bStrVal, alphaStr) => {
          let l = parseFloat(lStr);
          if (lStr.includes('%')) l = l / 100;
          let r = Math.round(l * 255);
          let g = Math.round(l * 255);
          let b = Math.round(l * 255);
          if (alphaStr) {
            let a = parseFloat(alphaStr);
            if (alphaStr.includes('%')) a = a / 100;
            return `rgba(${r}, ${g}, ${b}, ${a})`;
          }
          return `rgb(${r}, ${g}, ${b})`;
        });
      };

      // Measure the natural container height
      const scrollHeight = element.scrollHeight;
      
      // An A4 page at 800px width translates to exactly 1130px height (aspect ratio ~1.414).
      // We calculate how many full pages we need to represent the content without cutting it off.
      // We add a 45px buffer so that small bottom padding/margins don't trigger an accidental second blank page.
      const a4PageHeightPx = 1130;
      const numPages = Math.max(1, Math.ceil((scrollHeight - 45) / a4PageHeightPx));
      const targetHeightPx = numPages * a4PageHeightPx;

      // 2. Set the exact calculated height to match clean A4 page boundaries perfectly
      element.style.setProperty('height', `${targetHeightPx}px`, 'important');
      element.style.setProperty('min-height', `${targetHeightPx}px`, 'important');

      // 1. Sanitize text content of existing style tags with real rgb fallbacks
      backups.forEach(({ element: el, originalText }) => {
        if (originalText && (originalText.toLowerCase().includes('oklch') || originalText.toLowerCase().includes('oklab'))) {
          el.textContent = parseAndConvertOklab(parseAndConvertOklch(originalText));
        }
      });

      // 2. Intercept document.styleSheets to filter out any stylesheet rules containing oklch/oklab
      const safeSheets: any[] = [];
      for (let i = 0; i < originalStyleSheets.length; i++) {
        const sheet = originalStyleSheets[i];
        try {
          const rules = sheet.cssRules;
          const safeRules: CSSRule[] = [];
          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j];
            if (!rule.cssText.includes('oklch') && !rule.cssText.includes('oklab')) {
              safeRules.push(rule);
            }
          }
          // Wrap stylesheet to only expose safeRules when HTML2Canvas iterates them
          const sheetProxy = new Proxy(sheet, {
            get(target, prop, receiver) {
              if (prop === 'cssRules' || prop === 'rules') {
                return safeRules;
              }
              const val = Reflect.get(target, prop, receiver);
              return typeof val === 'function' ? val.bind(target) : val;
            }
          });
          safeSheets.push(sheetProxy);
        } catch (e) {
          // If cross-origin sheet, retain original stylesheet
          safeSheets.push(sheet);
        }
      }

      Object.defineProperty(document, 'styleSheets', {
        value: safeSheets,
        configurable: true,
        writable: true
      });

      // 3. Patch CSSStyleDeclaration prototype directly for 100% reliable color sanitization
      CSSStyleDeclaration.prototype.getPropertyValue = function(this: CSSStyleDeclaration, propertyName: string) {
        const val = originalGetPropertyValue.call(this, propertyName);
        if (typeof val === 'string') {
          return parseAndConvertOklab(parseAndConvertOklch(val));
        }
        return val;
      };

      colorProps.forEach(prop => {
        Object.defineProperty(CSSStyleDeclaration.prototype, prop, {
          get(this: CSSStyleDeclaration) {
            const kebab = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
            const val = originalGetPropertyValue.call(this, kebab);
            if (typeof val === 'string') {
              return parseAndConvertOklab(parseAndConvertOklch(val));
            }
            return val;
          },
          configurable: true
        });
      });

      const canvas = await html2canvas(element, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      // Restore element styles and classes immediately
      if (hadHidden) {
        element.classList.add('hidden');
      }
      element.style.cssText = originalStyle;

      // Restore style tags immediately
      backups.forEach(({ element: el, originalText }) => {
        el.textContent = originalText;
      });

      // Restore CSSStyleDeclaration prototype directly and immediately
      CSSStyleDeclaration.prototype.getPropertyValue = originalGetPropertyValue;
      colorProps.forEach(prop => {
        if (originalDescriptors[prop]) {
          Object.defineProperty(CSSStyleDeclaration.prototype, prop, originalDescriptors[prop]!);
        } else {
          delete (CSSStyleDeclaration.prototype as any)[prop];
        }
      });

      // Restore document.styleSheets immediately
      if (originalStyleSheetsDescriptor) {
        Object.defineProperty(document, 'styleSheets', originalStyleSheetsDescriptor);
      } else {
        delete (document as any).styleSheets;
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      
      // Allow up to 2mm of empty space margin to prevent creating unnecessary trailing pages
      while (heightLeft > 2) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      const exportName = printType === 'questions' 
        ? `اسئلة_${examSubject}_${examGrade}` 
        : printType === 'answers' 
          ? `اجوبة_${examSubject}_${examGrade}`
          : `خطة_${planSubject}_${planGrade}`;

      pdf.save(`${exportName.replace(/\s+/g, '_')}.pdf`);
      setSuccess('✔ تم تصدير وتحميل مستند الـ PDF بنجاح باهر!');
      setShowExportModal(false);
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setError('حدث خطأ أثناء حياكة الـ PDF: ' + err.message);
    } finally {
      const element = printDocRef.current;
      if (element) {
        if (hadHidden) {
          element.classList.add('hidden');
        }
        element.style.cssText = originalStyle;
      }

      // Always restore style tags to prevent breaking the visual state of the app
      try {
        backups.forEach(({ element: el, originalText }) => {
          if (el.textContent !== originalText) {
            el.textContent = originalText;
          }
        });
      } catch (e) {
        console.error('Failed restoring style tags in finally:', e);
      }
      
      // Always restore CSSStyleDeclaration prototype
      CSSStyleDeclaration.prototype.getPropertyValue = originalGetPropertyValue;
      colorProps.forEach(prop => {
        try {
          if (originalDescriptors[prop]) {
            Object.defineProperty(CSSStyleDeclaration.prototype, prop, originalDescriptors[prop]!);
          } else {
            delete (CSSStyleDeclaration.prototype as any)[prop];
          }
        } catch (e) {
          // ignore any minor restore issues
        }
      });

      // Always restore document.styleSheets
      try {
        if (originalStyleSheetsDescriptor) {
          Object.defineProperty(document, 'styleSheets', originalStyleSheetsDescriptor);
        } else {
          delete (document as any).styleSheets;
        }
      } catch (e) {
        console.error('Failed restoring document.styleSheets in finally:', e);
      }

      setIsGeneratingPDF(false);
    }
  };

  const generateTXTExport = () => {
    let title = '';
    let content = '';
    
    if (printType === 'questions') {
      title = `اسئلة_${examSubject}_${examGrade}.txt`;
      content = `========================================\n`;
      content += `جمهورية العراق - وزارة التربية والتعليم\n`;
      content += `المدرسة/المعهد: ${examSchool}\n`;
      content += `السنة الدراسية: ${examYear} | المادة: ${examSubject}\n`;
      content += `الصف: ${examGrade} | زمن الامتحان: ${examDuration}\n`;
      content += `أستاذ المادة: ${examTeacher}\n`;
      content += `========================================\n\n`;
      content += `اسئلة ${examMonth}\n\n`;
      content += `ملاحظة: أجب عن الأسئلة المذكورة بدقة وخط واضح.\n\n`;
      examQuestions.forEach((q, idx) => {
        content += `${q.text}\n`;
        if (q.branches && q.branches.length > 0) {
          q.branches.forEach((b) => {
            content += `  ${b}\n`;
          });
        }
        content += `\n----------------------------------------\n\n`;
      });
    } else if (printType === 'answers') {
      title = `اجوبة_${examSubject}_${examGrade}.txt`;
      content = `========================================\n`;
      content += `مركز الفحص والتصحيح النموذجي - تربية العراق\n`;
      content += `دليل الأجوبة النموذجية وتقسيم درجات الامتحان\n`;
      content += `المدرسة/المعهد: ${examSchool} | السنة: ${examYear}\n`;
      content += `المادة: ${examSubject} | الصف: ${examGrade}\n`;
      content += `واضع الأجوبة: ${examTeacher}\n`;
      content += `========================================\n\n`;
      examAnswers.forEach((ans, idx) => {
        content += `[جواب السؤال المنهجي ${idx + 1}]\n`;
        content += `السؤال المقابل: ${examQuestions[idx]?.text || ''}\n`;
        content += `الجواب النموذجي:\n${ans.text}\n`;
        if (ans.branches && ans.branches.length > 0) {
          ans.branches.forEach((b) => {
            content += `  ${b}\n`;
          });
        }
        content += `\n========================================\n\n`;
      });
    } else {
      title = `خطة_${planSubject}_${planGrade}.txt`;
      content = `========================================\n`;
      content += `خارطة المنهج السنوي والتوزيع التوجيهي\n`;
      content += `المادة: ${planSubject} | الصف: ${planGrade}\n`;
      content += `العام الدراسي: ${planYear}\n`;
      content += `إعداد المعلم المشرف: ${user.displayName || 'أستاذ المادة'}\n`;
      content += `========================================\n\n`;
      content += generatedAnnualPlan;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = title.replace(/\s+/g, '_');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccess('✔ تم تحميل الملف المطبوع بصيغة TXT بنجاح!');
  };

  const copyToClipboard = () => {
    let content = '';
    if (printType === 'questions') {
      content = `اسئلة ${examSubject} - ${examGrade}\n\n`;
      examQuestions.forEach((q) => {
        content += `${q.text}\n`;
        if (q.branches && q.branches.length > 0) {
          q.branches.forEach((b) => {
            content += `  ${b}\n`;
          });
        }
        content += `\n`;
      });
    } else if (printType === 'answers') {
      content = `دليل الأجوبة لـ ${examSubject} - ${examGrade}\n\n`;
      examAnswers.forEach((ans, idx) => {
        content += `[جواب س ${idx + 1}] المقابل لـ: ${examQuestions[idx]?.text || ''}\n`;
        content += `${ans.text}\n`;
        if (ans.branches && ans.branches.length > 0) {
          ans.branches.forEach((b) => {
            content += `  ${b}\n`;
          });
        }
        content += `\n`;
      });
    } else {
      content = generatedAnnualPlan;
    }
    navigator.clipboard.writeText(content);
    setSuccess('✔ تم نسخ المحتوى النصي بالكامل إلى حافظتك!');
  };

  // Filter posts based on search & tab selection
  const filteredForumPosts = forumPosts.filter(p => {
    const titleMatch = p.title?.toLowerCase().includes(forumSearch.toLowerCase());
    const contentMatch = p.content?.toLowerCase().includes(forumSearch.toLowerCase());
    const matchesSearch = titleMatch || contentMatch;

    if (!matchesSearch) return false;

    if (forumFilter === 'students') {
      return !p.isTeacherPost;
    }
    if (forumFilter === 'teacher_notices') {
      return p.isTeacherPost;
    }
    return true;
  });

  return (
    <div className="bg-[#f0f2f5] dark:bg-zinc-950 min-h-screen text-right font-sans" dir="rtl">
      
      {/* Dynamic Native Print CSS Stylesheet */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, footer, nav, button, .no-print, aside, select, input, textarea {
            display: none !important;
          }
          .print-area-wrapper {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            direction: rtl !important;
            font-size: 13.5pt !important;
            line-height: 1.8 !important;
            background: white !important;
          }
          .custom-page-break {
            page-break-before: always;
          }
        }
      `}</style>

      {/* Main Content Dashboard */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 no-print">
        
        {/* Iraqi Ministry of Education / Branded Welcoming Hero Block */}
        <div className="bg-white dark:bg-[#18181b] p-6 md:p-8 rounded-3xl border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] relative overflow-hidden bg-radial from-amber-50 to-amber-100 dark:from-zinc-900 dark:to-zinc-800">
          <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10 justify-between">
            <div className="flex items-center gap-4">
              <div className="w-18 h-18 rounded-2xl overflow-hidden shrink-0 border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] bg-rose-200">
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.email}`} 
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-right">
                <span className="text-xs font-black bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 border-2 border-black dark:border-white rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] inline-flex items-center gap-1.5">
                  <GraduationCap size={16} />
                  بوابة كادر التدريس والخدمات النموذجية 🎓
                </span>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-3">مرحباً بك، الأستاذ {user.displayName || 'المعلم المعتمد'}</h2>
                <p className="text-slate-600 dark:text-slate-300 font-bold mt-1 text-sm md:text-base leading-relaxed">
                  أنظمة ذكاء التربية المتكاملة لمساعدة كادر التدريس العراقي في صياغة الخطط السنوية، إدارة الامتحانات وصنع دليل الأجوبة، ومناقشة وحل أسئلة الطلاب مباشرة.
                </p>
              </div>
            </div>
            
            <button 
              onClick={onLogout}
              className="px-6 py-3 bg-rose-200 hover:bg-rose-300 border-3 border-black text-black rounded-xl font-black flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Send size={18} className="rotate-180" />
              <span>خروج تربوي</span>
            </button>
          </div>
        </div>

        {/* Global Error/Success notification bar */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#FFB5A7] border-4 border-black p-4 rounded-2xl flex items-center gap-3 text-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <AlertCircle size={24} className="shrink-0" />
              <p className="flex-1 text-sm md:text-base">{error}</p>
              <button onClick={() => setError(null)} className="font-black px-2 text-xl hover:scale-110">✕</button>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-emerald-100 border-4 border-black dark:border-emerald-600 p-4 rounded-2xl flex items-center gap-3 text-emerald-950 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <CheckCircle2 size={24} className="text-emerald-700 shrink-0" />
              <p className="flex-1 text-sm md:text-base">{success}</p>
              <button onClick={() => setSuccess(null)} className="font-black px-2 text-xl hover:scale-110">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Interactive Tab Controller */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white dark:bg-black p-2 rounded-2xl border-4 border-black dark:border-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,1)]">
          <button
            onClick={() => { setActiveTab('exam'); setError(null); setSuccess(null); }}
            className={`py-4 px-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 border-2 ${
              activeTab === 'exam' 
                ? 'bg-[#fbbf24] text-black border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
                : 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-white border-transparent hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <FileText size={22} className="text-amber-600" />
            <span>صانع وراقة الامتحان والأجوبة</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('planner'); setError(null); setSuccess(null); }}
            className={`py-4 px-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 border-2 ${
              activeTab === 'planner' 
                ? 'bg-[#38bdf8] text-black border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
                : 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-white border-transparent hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Calendar size={22} className="text-sky-600" />
            <span>صانع الخطة المنهجية السنوية</span>
          </button>

          <button
            onClick={() => { setActiveTab('forum'); setError(null); setSuccess(null); }}
            className={`py-4 px-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 border-2 ${
              activeTab === 'forum' 
                ? 'bg-[#2dd4bf] text-black border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
                : 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-white border-transparent hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <MessageSquare size={22} className="text-teal-600" />
            <span>منتدى التفاعل وحل أسئلة الطلاب</span>
          </button>
        </div>


        {/* ========================================================
            TAB 1: IRQI EXAM & MODEL ANSWER GENERATOR WITH ATTACHMENT
            ======================================================== */}
        {activeTab === 'exam' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] space-y-6">
              
              <div className="border-b-4 border-dashed border-slate-200 pb-4">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="text-amber-500 shrink-0" size={28} />
                  <span>منسق ورقة الامتحانات العراقية ومولد الأجوبة النموذجية</span>
                </h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  هذا النظام يتيح لك إدخال ترويسة الامتحان المعتمدة، ثم رفع ملف PDF أو صورة كفهرس أو ملخص وزاري، وسيقوم الذكاء الاصطناعي بحياكة وصياغة أسئلة الامتحان مطابقة للصعوبة المطلوبة، مع إعداد دليل الأجوبة النموذجية والدرجات المقسمة بدقة تامة.
                </p>
              </div>

              {/* standard metadata settings */}
              <div>
                <h4 className="font-black text-md text-slate-800 dark:text-slate-200 mb-3 block">1. ترويسة ورقة الامتحان الرسمية (ثابتة في المطبوع)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">اسم المدرسة / المعهد</label>
                    <input
                      type="text"
                      value={examSchool}
                      onChange={(e) => setExamSchool(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-black border-2 border-black rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:bg-amber-50/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">السنة الدراسية</label>
                    <input
                      type="text"
                      value={examYear}
                      onChange={(e) => setExamYear(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-black border-2 border-black rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:bg-amber-50/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">دور / شهر الامتحان</label>
                    <input
                      type="text"
                      value={examMonth}
                      onChange={(e) => setExamMonth(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-black border-2 border-black rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:bg-amber-50/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">مدرس المادة واضع الأسئلة</label>
                    <input
                      type="text"
                      value={examTeacher}
                      onChange={(e) => setExamTeacher(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-black border-2 border-black rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">المادة الدراسية</label>
                    <select
                      value={examSubject}
                      onChange={(e) => setExamSubject(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-black border-2 border-black rounded-xl text-xs font-extrabold text-slate-900 dark:text-white"
                    >
                      {CONSTANT_SUBJECTS.map((sub, i) => (
                        <option key={i} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">الصف الدراسي</label>
                    <select
                      value={examGrade}
                      onChange={(e) => setExamGrade(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-black border-2 border-black rounded-xl text-xs font-extrabold text-slate-900 dark:text-white"
                    >
                      {CONSTANT_GRADES.map((g, i) => (
                        <option key={i} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">زمن ومقدار وقت الامتحان</label>
                    <input
                      type="text"
                      value={examDuration}
                      onChange={(e) => setExamDuration(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-black border-2 border-black rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  
                  {/* Difficulty selector */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">مستوى الصعوبة المعياري والوزاري المعتمد</label>
                    <div className="flex gap-2">
                      {['easy', 'medium', 'hard'].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setExamDifficulty(lvl as any)}
                          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black border-2 border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                            examDifficulty === lvl 
                              ? 'bg-amber-400 text-black border-2 font-black' 
                              : 'bg-white dark:bg-black text-slate-600 dark:text-slate-300 opacity-70 hover:opacity-100'
                          }`}
                        >
                          {lvl === 'easy' ? 'سهل مبسط' : lvl === 'medium' ? 'متوسط وزارة التربية' : 'صعب وزاري تخصصي'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Source Upload Area */}
              <div className="bg-amber-50/40 dark:bg-amber-950/10 p-5 rounded-2xl border-2 border-amber-300 space-y-4">
                <h4 className="font-black text-sm text-slate-900 dark:text-slate-200 flex items-center gap-2">
                  <Upload size={18} className="text-amber-600" />
                  <span>2. أرفق مصدر الامتحان (ملف PDF، فصول كتاب، ملخص وزاري، أو ملازم، أو كتابة نصية)</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fileuploader */}
                  <div className="border-4 border-dashed border-amber-400 rounded-2xl p-4 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 hover:bg-amber-50/20 transition-all cursor-pointer relative">
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={handleExamFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <FileUp size={36} className="text-amber-500 mb-2" />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 text-center">أفلت أو اختر ملف المنهج / الأسئلة</span>
                    <span className="text-[10px] text-slate-500 mt-1">يدعم الصور والمستندات بحد أقصى 20 ميجا</span>
                  </div>

                  {/* Manual reference typing */}
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-400">أو الصق/اكتب المرجع النصي هنا كبديل للمكتوب:</label>
                    <textarea
                      placeholder="امثلة: الفصل الثاني الحث الكهرومغناطيسي، فصول النشاط والتعاريف والمسائل..."
                      rows={5}
                      value={examSourceText}
                      onChange={(e) => setExamSourceText(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-black border-2 border-black rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* 3. Custom AI instructions input */}
                <div className="pt-2">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>3. توجيهات وتعليمات إضافية خاصة للذكاء الاصطناعي (اختياري)</span>
                  </label>
                  <textarea
                    placeholder="مثال: ركّز على الفصل الثالث وشبكات الحث ومسائل التيار، اجعل الأسئلة قصيرة ولطيفة، صمّم أسئلة إثرائية للطلبة المتميزين، إلخ..."
                    rows={2}
                    value={aiCustomInstructions}
                    onChange={(e) => setAiCustomInstructions(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-black border-2 border-black rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500 placeholder-slate-400"
                  />
                </div>

                {examFile && (
                  <div className="bg-amber-100 dark:bg-amber-900/40 p-2.5 rounded-xl flex items-center justify-between border-2 border-black">
                    <span className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
                      <FileCheck size={16} className="text-amber-600" />
                      مرجع الامتحان المرفق: <span className="font-black">{examFile.name}</span> ({(examFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                    <button onClick={() => { setExamFile(null); setExamFileBase64(null); }} className="text-rose-600 hover:scale-110 font-bold">✕</button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGenerateExamAndAnswers}
                  disabled={loading}
                  className="w-full py-4 bg-amber-400 border-3 border-black text-black rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#000] disabled:opacity-50 shadow-[2px_2px_0px_0px_#000]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      <span>جاري توليد الأسئلة وحل الأجوبة النموذجية بدقة...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      <span>ابدأ صياغة الأسئلة مع الأجوبة النموذجية الفورية 🎨</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Questions Review and Live Edit Segment */}
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] space-y-6">
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b-2 border-slate-200 pb-4">
                <div className="text-right">
                  <h4 className="text-xl font-black text-slate-900 dark:text-white">مراجعة وتعديل المسودة وسند الامتحان</h4>
                  <p className="text-xs font-bold text-slate-500 mt-1">تأكد من تعديل الأسئلة والأجوبة أدناه حسب تفضيلاتك التعليمية لطباعتها منفصلة.</p>
                </div>

                {/* Sub-tab Questions vs answers */}
                <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-black border-2 border-black rounded-xl">
                  <button
                    onClick={() => setExamActiveTab('questions')}
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-colors ${
                      examActiveTab === 'questions' ? 'bg-black text-white' : 'bg-transparent text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    تبويب الأسئلة ({examQuestions.length})
                  </button>
                  <button
                    onClick={() => setExamActiveTab('answers')}
                    className={`px-4 py-2 text-xs font-black rounded-lg transition-colors ${
                      examActiveTab === 'answers' ? 'bg-black text-white' : 'bg-transparent text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    تبويب الأجوبة النموذجية ({examAnswers.length})
                  </button>
                </div>
              </div>

              {/* Layout for active sub-tab */}
              {examActiveTab === 'questions' ? (
                <div className="space-y-4">
                  {examQuestions.map((q, idx) => (
                    <div key={`edit-q-${idx}`} className="flex flex-col bg-slate-50 dark:bg-black p-4 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] relative transition-all">
                      <div className="flex gap-4 items-center w-full">
                        <span className="font-extrabold text-amber-500 text-lg md:text-xl shrink-0">{idx + 1}.</span>
                        <textarea
                          value={q.text}
                          rows={2}
                          onChange={(e) => {
                            const updated = [...examQuestions];
                            updated[idx] = { ...updated[idx], text: e.target.value };
                            setExamQuestions(updated);
                          }}
                          className="flex-1 bg-transparent border-0 font-bold text-sm md:text-base text-slate-900 dark:text-white outline-none focus:ring-0 leading-relaxed resize-none"
                        />
                        <button
                          onClick={() => handleRemoveQuestionAndAnswer(idx)}
                          className="p-1.5 text-rose-600 hover:text-red-800 hover:bg-rose-50 rounded-lg shrink-0 transition-colors"
                          title="حذف هذا السؤال وجوابه المقابل"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>

                      {/* Interactive Branches Section */}
                      <div className="mt-3 mr-6 space-y-2 border-r-2 border-slate-300 dark:border-slate-700 pr-4 text-right">
                        <p className="text-[11px] font-black text-slate-500 mb-1">فروع وسياقات هذا السؤال ({q.branches?.length || 0}):</p>
                        {q.branches && q.branches.map((br, bIdx) => (
                          <div key={`br-${idx}-${bIdx}`} className="flex gap-2 items-center bg-white dark:bg-zinc-900 p-2 rounded-lg border border-slate-200 dark:border-zinc-800">
                            <span className="text-xs font-black text-amber-600">{['أ', 'ب', 'جـ', 'د', 'هـ'][bIdx] || (bIdx + 1)}.</span>
                            <input
                              type="text"
                              value={br}
                              onChange={(e) => {
                                const updated = [...examQuestions];
                                updated[idx].branches[bIdx] = e.target.value;
                                setExamQuestions(updated);
                              }}
                              className="flex-1 bg-transparent border-0 font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-0"
                            />
                            <button
                              onClick={() => {
                                const updated = [...examQuestions];
                                updated[idx].branches = updated[idx].branches.filter((_, bI) => bI !== bIdx);
                                setExamQuestions(updated);
                              }}
                              className="text-rose-500 hover:text-rose-700 font-bold p-1 text-xs"
                              title="حذف هذا الفرع"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...examQuestions];
                            const nextLetter = ['أ', 'ب', 'جـ', 'د', 'هـ'][updated[idx].branches?.length || 0] || '';
                            const prefix = nextLetter ? `${nextLetter}- ` : '';
                            if (!updated[idx].branches) {
                              updated[idx].branches = [];
                            }
                            updated[idx].branches.push(`${prefix}فرع جديد...`);
                            setExamQuestions(updated);
                          }}
                          className="text-[10px] font-black bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 transition-colors text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 w-max"
                        >
                          <Plus size={12} />
                          <span>إضافة فرع (أ، ب، جـ)</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {examQuestions.length === 0 && (
                    <div className="text-center py-8 text-sm text-slate-500">لا تتوفر أسئلة في مسودتك الحالية، يرجى كتابتها يدوياً أو تفعيل التوليد الذكي.</div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {examAnswers.map((ans, idx) => (
                    <div key={`edit-ans-${idx}`} className="flex flex-col bg-slate-50/60 dark:bg-black/40 p-4 border-2 border-neutral-600 rounded-xl relative transition-all text-right">
                      <div className="flex gap-4 items-start w-full">
                        <span className="font-extrabold text-emerald-600 text-lg md:text-xl shrink-0">{idx + 1}.</span>
                        <div className="flex-1 space-y-1">
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-extrabold px-2 py-0.5 rounded">الجواب المقابل للسؤال {idx + 1}</span>
                          <textarea
                            value={ans.text}
                            rows={3}
                            onChange={(e) => {
                              const updated = [...examAnswers];
                              updated[idx] = { ...updated[idx], text: e.target.value };
                              setExamAnswers(updated);
                            }}
                            className="w-full bg-transparent border-0 font-bold text-sm md:text-base text-slate-900 dark:text-white outline-none leading-relaxed resize-none mt-1 focus:ring-0"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveQuestionAndAnswer(idx)}
                          className="p-1.5 text-rose-600 hover:text-red-700 hover:bg-rose-50 rounded-lg shrink-0 transition-colors self-center"
                          title="حذف الجواب وسؤاله"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {/* Interactive Answer Branches Section */}
                      <div className="mt-3 mr-6 space-y-2 border-r-2 border-slate-300 dark:border-slate-700 pr-4 text-right">
                        <p className="text-[11px] font-black text-slate-500 mb-1">حلول الفروع الملحقة ({ans.branches?.length || 0}):</p>
                        {ans.branches && ans.branches.map((br, bIdx) => (
                          <div key={`ans-br-${idx}-${bIdx}`} className="flex gap-2 items-center bg-white dark:bg-zinc-900 p-2 rounded-lg border border-slate-200 dark:border-zinc-800">
                            <span className="text-xs font-black text-emerald-600">{['أ', 'ب', 'جـ', 'د', 'هـ'][bIdx] || (bIdx + 1)}.</span>
                            <input
                              type="text"
                              value={br}
                              onChange={(e) => {
                                const updated = [...examAnswers];
                                updated[idx].branches[bIdx] = e.target.value;
                                setExamAnswers(updated);
                              }}
                              className="flex-1 bg-transparent border-0 font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-0"
                            />
                            <button
                              onClick={() => {
                                const updated = [...examAnswers];
                                updated[idx].branches = updated[idx].branches.filter((_, bI) => bI !== bIdx);
                                setExamAnswers(updated);
                              }}
                              className="text-rose-500 hover:text-rose-700 font-bold p-1 text-xs"
                              title="حذف هذا الفرع"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...examAnswers];
                            const nextLetter = ['أ', 'ب', 'جـ', 'د', 'هـ'][updated[idx].branches?.length || 0] || '';
                            const prefix = nextLetter ? `${nextLetter}- ` : '';
                            if (!updated[idx].branches) {
                              updated[idx].branches = [];
                            }
                            updated[idx].branches.push(`${prefix}حل الفرع الجديد...`);
                            setExamAnswers(updated);
                          }}
                          className="text-[10px] font-black bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 transition-colors text-slate-800 dark:text-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1 w-max"
                        >
                          <Plus size={12} />
                          <span>إضافة حل لفرع جديد</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {examAnswers.length === 0 && (
                    <div className="text-center py-8 text-sm text-slate-500">لا يوجد أجوبة حالياً في المسودة.</div>
                  )}
                </div>
              )}

              {/* Add manual manual question + answer block */}
              <div className="bg-slate-50 dark:bg-black/60 p-4 rounded-xl border-2 border-black space-y-3 text-right">
                <h5 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Plus size={16} />
                  <span>إضافة سؤال وجوابه المقابلة بالتزامن يدوياً لمسودة الاستبانة:</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="س٥/ قارن بدقة وقوانين واضحة تفاعل الاتحاد وتفاعل التحلل العلمي والمغناطيسية..."
                    value={newManualQ}
                    onChange={(e) => setNewManualQ(e.target.value)}
                    className="p-3 bg-white dark:bg-zinc-900 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  />
                  <input
                    type="text"
                    placeholder="الجواب المقابل: تفاعل الاتحاد هو تفاعل ينتج مادة واحدة.. بينما تفاعل التحلل ينتج..."
                    value={newManualA}
                    onChange={(e) => setNewManualA(e.target.value)}
                    className="p-3 bg-white dark:bg-zinc-900 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddNewQuestionAndAnswer}
                  disabled={!newManualQ.trim()}
                  className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-500 border-2 border-black text-black rounded-xl font-black text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#000] ml-auto"
                >
                  <Plus size={16} />
                  <span>إضافة السؤال والجواب معاً</span>
                </button>
              </div>

              {/* PRINT CONTROLS SEGMENT */}
              <div className="pt-6 border-t-4 border-double border-slate-300 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <button
                  onClick={() => dispatchPrintJob('questions')}
                  className="py-4 bg-[#60a5fa] hover:bg-[#3b82f6] text-black border-3 border-black rounded-xl font-black text-lg flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 duration-150"
                >
                  <Printer size={22} className="text-blue-900" />
                  <span>طباعة وتحميل ورقة الأسئلة فقط 📄</span>
                </button>
                
                <button
                  onClick={() => dispatchPrintJob('answers')}
                  className="py-4 bg-[#34d399] hover:bg-[#10b981] text-black border-3 border-black rounded-xl font-black text-lg flex items-center justify-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 duration-150"
                >
                  <Printer size={22} className="text-emerald-900" />
                  <span>طباعة دليل الأجوبة النموذجية للتصحيح 📑</span>
                </button>

              </div>

            </div>
          </div>
        )}


        {/* ========================================================
            TAB 2: AI ANNUAL CURRICULUM SYLLABUS PLANNER
            ======================================================== */}
        {activeTab === 'planner' && (
          <div className="space-y-8 animate-in fade-in duration-300 text-right">
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] space-y-6">
              
              <div className="border-b-4 border-dashed border-slate-200 pb-4">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="text-sky-500 shrink-0" size={28} />
                  <span>صانع خطة التدريس السنوية والشهرية الذكي</span>
                </h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  أدخل بيانات منهج المادة بالتفصيل (عن طريق رفع صورة أو ملف الفهرس) ليقوم الذكاء الاصطناعي برسم الخطة السنوية والخطط الشهرية الموزعة على تشرين، كانون، شباط، إلخ، بدقة تربوية مطابقة لتقويم المدارس العراقية لتوزيع الدروس والمواضيع أسبوعياً.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">المادة الدراسية المستهدفة</label>
                  <select
                    value={planSubject}
                    onChange={(e) => setPlanSubject(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-black border-2 border-black rounded-xl text-xs font-extrabold text-slate-900 dark:text-white outline-none"
                  >
                    {CONSTANT_SUBJECTS.map((sub, i) => (
                      <option key={i} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">الصف الدراسي المستهدف</label>
                  <select
                    value={planGrade}
                    onChange={(e) => setPlanGrade(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-black border-2 border-black rounded-xl text-xs font-extrabold text-slate-900 dark:text-white outline-none"
                  >
                    {CONSTANT_GRADES.map((g, i) => (
                      <option key={i} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">العام الدراسي</label>
                  <input
                    type="text"
                    value={planYear}
                    onChange={(e) => setPlanYear(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-black border-2 border-black rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Book Index Syllabus upload */}
              <div className="bg-sky-50/20 dark:bg-zinc-800/30 p-5 rounded-2xl border-2 border-sky-300 space-y-4">
                <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers size={18} className="text-sky-600" />
                  <span>أرفق الفهرست (كتابة أو ارفع مستند / لقطة شاشة لفهرس الكتاب)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fileuploader */}
                  <div className="border-4 border-dashed border-sky-400 rounded-2xl p-4 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 hover:bg-sky-50/20 transition-all cursor-pointer relative">
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={handlePlanFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload size={32} className="text-sky-500 mb-2" />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 text-center">انقر لرفع صورة أو بي دي اف للفهرس</span>
                    <span className="text-[10px] text-slate-500 mt-1">يساعد الذكاء الاصطناعي في جلب تسلسل الكتاب</span>
                  </div>

                  {/* Manual Type */}
                  <div className="space-y-1">
                    <label className="block text-xs font-black text-slate-600 dark:text-slate-400">أو اكتب فهرس الفصول يدوياً للتوزيع:</label>
                    <textarea
                      placeholder="امثلة: الفصل الأول: المتسعات، الفصل الثاني: الحث الكهرومغناطيسي، الثالث: التيار المتناوب..."
                      rows={4}
                      value={planSyllabusText}
                      onChange={(e) => setPlanSyllabusText(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-black border-2 border-black rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none resize-none"
                    />
                  </div>
                </div>

                {planFile && (
                  <div className="bg-sky-100 dark:bg-sky-950/40 p-2.5 rounded-xl flex items-center justify-between border-2 border-black text-xs font-bold">
                    <span className="text-black dark:text-white flex items-center gap-1.5">
                      <FileCheck size={16} className="text-sky-600" />
                      مستند المنهج المحدد: <span className="font-black">{planFile.name}</span>
                    </span>
                    <button onClick={() => { setPlanFile(null); setPlanFileBase64(null); }} className="text-rose-600 font-extrabold hover:text-black">✕</button>
                  </div>
                )}

                <button
                  onClick={handleGenerateAnnualPlan}
                  disabled={loading}
                  className="w-full py-4 bg-[#38bdf8] border-3 border-black text-black rounded-xl font-black text-lg flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      <span>جاري تشييد وتوزيع الخطة السنوية المنهجية...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      <span>صياغة وتوزيع الخطة السنوية والشهرية 🗺️</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {generatedAnnualPlan && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 border-4 border-black dark:border-white p-6 md:p-8 rounded-2xl relative shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] text-right"
              >
                <div className="flex flex-wrap gap-2 justify-between items-center border-b-2 border-dashed border-slate-300 pb-3 mb-6">
                  <h4 className="text-xl font-black text-sky-600 dark:text-sky-400">الخطة الدراسية السنوية الجاهزة للاستعمال:</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedAnnualPlan);
                        setSuccess('تم نسخ الخطة السنوية النموذجية إلى حافظتك بنجاح!');
                      }}
                      className="px-3.5 py-1.5 bg-white dark:bg-black border-2 border-black rounded-lg text-slate-800 dark:text-white hover:-translate-y-0.5 text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      نسخ الخطبة بالكامل
                    </button>
                    <button
                      onClick={() => dispatchPrintJob('planner')}
                      className="px-3.5 py-1.5 bg-[#38bdf8] hover:bg-[#0ea5e9] border-2 border-black rounded-lg text-black hover:-translate-y-0.5 text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1"
                    >
                      <Printer size={14} />
                      <span>طبع وحفظ الخطة</span>
                    </button>
                  </div>
                </div>

                <div className="markdown-body text-slate-900 dark:text-slate-100 leading-relaxed space-y-4 text-sm md:text-base selection:bg-sky-200">
                  <Markdown remarkPlugins={[remarkGfm]}>{generatedAnnualPlan}</Markdown>
                </div>
              </motion.div>
            )}

          </div>
        )}


        {/* ========================================================
            TAB 3: INTEGRATED Q&A TEACHER & FORUMS COLLABORATION
            ======================================================== */}
        {activeTab === 'forum' && (
          <div className="space-y-8 animate-in fade-in duration-300 text-right">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Manage & Broadcast Official Announcements */}
              <div className="lg:col-span-1 bg-white dark:bg-zinc-900 p-6 rounded-2xl border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-5 h-fit">
                <div className="border-b-2 border-slate-200 pb-2">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MessageSquare className="text-teal-500" />
                    <span>نشر ونبض تبليغ جديد للطلاب</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-bold mt-1">يظهر المنشور بصفة كادر التدريس الرسمية فوراً لكل الفصول المقتبسة وسيلة المساعدة.</p>
                </div>

                <form onSubmit={handlePublishBroadcastToForum} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">نوع التوجيه الدراسي</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['تبليغ صفي', 'وزاري عاجل', 'نصائح وملازم'] as const).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setBroadcastCategory(cat)}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-black border-2 border-black transition-all ${
                            broadcastCategory === cat ? 'bg-[#2dd4bf] text-black font-extrabold' : 'bg-slate-50 dark:bg-black text-slate-500'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">عنوان المنشور الملخص</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: تبليغ هام في الفصل الثالث بالفيزياء..."
                      value={forumBroadcastTitle}
                      onChange={(e) => setForumBroadcastTitle(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-black border-2 border-black rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">محتوى وتفصيل المنشور التعليمي</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="الطلاب الأعزاء يرجى الانتباه ومراجعة ورقة الامتحان المفتوحة..."
                      value={forumBroadcastContent}
                      onChange={(e) => setForumBroadcastContent(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-black border-2 border-black rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none resize-none leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#2dd4bf] hover:bg-[#14b8a6] border-2 border-black text-zinc-950 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-transform"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Send size={14} />}
                    <span>بث المنشور للمنتدى والجمهور 📢</span>
                  </button>
                </form>
              </div>

              {/* Right Column: Interactive Forums Feed, Student Questions, and Moderation Desk */}
              <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-6">
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b-2 border-slate-200 pb-3">
                  <div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">ساحة الأسئلة والنقاش الطلابية</h4>
                    <p className="text-xs font-bold text-slate-500 mt-1">تصفح الأسئلة المطروحة من طلاب العراق لترد عليها رسمياً بمصداقية الكادر.</p>
                  </div>

                  {/* Feed Search Input */}
                  <input
                    type="text"
                    placeholder="ابحث بالمنشورات والأسئلة..."
                    value={forumSearch}
                    onChange={(e) => setForumSearch(e.target.value)}
                    className="p-2 bg-slate-100 dark:bg-black text-[11px] font-bold border-2 border-black rounded-lg outline-none w-full sm:w-48"
                  />
                </div>

                {/* Sub filter control */}
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-black rounded-lg w-fit text-xs font-bold">
                  <button
                    onClick={() => setForumFilter('all')}
                    className={`px-3 py-1 rounded ${forumFilter === 'all' ? 'bg-black text-white' : 'text-slate-500'}`}
                  >
                    كل المنشورات
                  </button>
                  <button
                    onClick={() => setForumFilter('students')}
                    className={`px-3 py-1 rounded ${forumFilter === 'students' ? 'bg-black text-white' : 'text-slate-500'}`}
                  >
                    أسئلة الطلاب فقط 🙋‍♂️
                  </button>
                  <button
                    onClick={() => setForumFilter('teacher_notices')}
                    className={`px-3 py-1 rounded ${forumFilter === 'teacher_notices' ? 'bg-black text-white' : 'text-slate-500'}`}
                  >
                    تبليغاتي الرسمية 🎓
                  </button>
                </div>

                {/* Feed Content Block */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {forumLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="animate-spin text-teal-600" size={32} />
                    </div>
                  ) : filteredForumPosts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">لا تتوفر منشورات أو تلاوين استقصائية تطابق شروط الفلتر.</div>
                  ) : (
                    filteredForumPosts.map((post, idx) => (
                      <div
                        key={post.id || `post-${idx}`}
                        onClick={() => setSelectedPost(post)}
                        className={`p-4 border-2 border-black rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all ${
                          post.isTeacherPost ? 'bg-teal-50/20 dark:bg-teal-950/10' : 'bg-white dark:bg-zinc-950'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-black uppercase text-xs flex items-center justify-center font-bold">
                              {post.authorPhoto ? (
                                <img src={post.authorPhoto} alt="" className="w-full h-full object-cover" />
                              ) : (
                                post.authorName?.substring(0, 1) || 'ع'
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-black text-slate-800 dark:text-white block">{post.authorName}</span>
                              <span className="text-[9px] text-slate-400 block">{new Date(post.createdAt).toLocaleDateString('ar-IQ')}</span>
                            </div>
                          </div>

                          <div className="flex gap-1.5">
                            {post.isTeacherPost && (
                              <span className="text-[9px] bg-teal-100 text-teal-800 font-extrabold px-1.5 py-0.5 rounded">كادر التدريس</span>
                            )}
                            <button
                              onClick={(e) => handleDeletePost(post.id, e)}
                              className="text-slate-400 hover:text-red-600 transition-colors"
                              title="حذف كإجراء إداري للمنتدى"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <h5 className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white leading-tight mb-1">{post.title}</h5>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">{post.content}</p>

                        <div className="flex gap-4 items-center mt-3 text-[10px] font-black text-slate-500">
                          <span className="flex items-center gap-1">
                            <ThumbsUp size={11} />
                            {post.likes || 0} إعجاب
                          </span>
                          <span className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-black">
                            <MessageCircle size={11} />
                            {post.commentCount || 0} رد ومناقشة
                          </span>
                          {!post.isTeacherPost && post.commentCount === 0 && (
                            <span className="text-amber-600 flex items-center gap-1 mr-auto font-black animate-pulse">● بحاجة لرد المدرس العاجل</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>

            {/* Comments Drawer / Thread Modal Overlay */}
            <AnimatePresence>
              {selectedPost && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[90vh]"
                  >
                    {/* Drawer Header */}
                    <div className="p-4 bg-teal-50 dark:bg-teal-950/20 border-b-2 border-black flex items-center justify-between">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-black bg-teal-100 text-teal-800 px-2 py-0.5 rounded border border-black inline">تفاصيل المناقشة والردود</span>
                        <h4 className="text-md font-black text-slate-900 dark:text-white mt-1">الرد والاستقصاء التعليمي الموثق</h4>
                      </div>
                      <button onClick={() => setSelectedPost(null)} className="p-1 px-2.5 bg-rose-100 font-black border border-black text-black rounded hover:bg-rose-200 text-xs shadow-[1px_1px_0px_0px_#000]">غلق</button>
                    </div>

                    {/* Original Student Post Display */}
                    <div className="p-5 bg-slate-50 dark:bg-black/40 border-b-2 border-neutral-700 space-y-3 shrink-0">
                      <div className="flex gap-2 items-center">
                        <span className="text-xs font-black bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black px-2 py-0.5 rounded">صاحب السؤال:</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{selectedPost.authorName}</span>
                      </div>
                      <h5 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">{selectedPost.title}</h5>
                      <p className="text-xs text-slate-600 dark:text-slate-200 leading-relaxed font-bold whitespace-pre-wrap">{selectedPost.content}</p>
                    </div>

                    {/* Comments list inside scrollable */}
                    <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50/20">
                      <span className="text-[10px] font-black block text-slate-400">التعليقات الردية والمثبتة: ({currentPostComments.length})</span>
                      {currentPostComments.length === 0 ? (
                        <div className="text-center py-6 text-[11px] text-slate-400">لا تتوفر تعليقات بعد في هذا المنشور المختار. كُن المعلم وأجب عليه!</div>
                      ) : (
                        currentPostComments.map((comment, idx) => (
                          <div 
                            key={comment.id || `comment-${idx}`}
                            className={`p-3 border-2 border-black rounded-xl text-xs space-y-1 ${
                              comment.isTeacherComment || comment.content.includes('الأستاذ') ? 'bg-amber-50/50 dark:bg-amber-950/20 border-teal-500' : 'bg-white dark:bg-zinc-950'
                            }`}
                          >
                            <div className="flex justify-between items-center text-[10px] pb-1 border-b border-dashed border-slate-200">
                              <span className="font-black text-slate-800 dark:text-white flex items-center gap-1">
                                {comment.isTeacherComment && <span className="text-xs">⭐</span>}
                                {comment.authorName}
                              </span>
                              <span className="text-slate-400">{new Date(comment.createdAt).toLocaleDateString('ar-IQ')}</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 font-bold leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Teacher Quick comment Form input write */}
                    <form onSubmit={handleCommentSubmit} className="p-4 bg-white dark:bg-zinc-900 border-t-2 border-black flex gap-2 items-center">
                      <textarea
                        required
                        rows={2}
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="الأستاذ، اكتب هنا حل السؤال والتعليل والجواب النموذجي لمساعدة طلابك..."
                        className="flex-1 p-2.5 bg-slate-50 dark:bg-black border-2 border-black rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none resize-none leading-relaxed"
                      />
                      <button
                        type="submit"
                        disabled={submittingComment || !newCommentText.trim()}
                        className="p-3.5 bg-teal-400 hover:bg-teal-500 border-2 border-black text-black rounded-xl font-bold text-xs shadow-[2px_2px_0px_0px_#000] h-full shrink-0 disabled:opacity-40"
                      >
                        {submittingComment ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                      </button>
                    </form>

                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </div>
        )}

      </div>


      {/* ========================================================
          A4 PRINT PREVIEW WRAP-AREA (Perfect for printing or PDFs)
          ======================================================== */}
      
      {/* 1. Exam Papers (Questions AND Answers Sheets Separated cleanly in print flow) */}
      <div ref={printDocRef} className="print-area-wrapper hidden bg-white text-black p-5 text-right selection:bg-none relative font-scheherazade" dir="rtl">
        <div className="w-full h-full bg-white">
          
          {/* PRINT PART A: QUESTION PAPER ONLY */}
          {(printType === 'questions') && (
            <div className="border-4 border-double border-black p-6 space-y-6 bg-white h-full min-h-0 flex flex-col justify-between">
              <div>
                {/* Republic of Iraq / Ministry Header mock standard Iraqi school draft */}
                <div className="flex justify-between items-center border-b-2 border-black pb-4 text-center">
                  <div className="text-right font-sans text-xs space-y-1 shrink-0">
                    <p className="font-extrabold text-sm leading-none">جمهورية العراق</p>
                    <p className="font-extrabold text-[10px] leading-none text-slate-700">وزارة التربية والتعليم</p>
                    <p className="font-black text-xs leading-none mt-2 text-black">{examSchool}</p>
                  </div>
                  
                  {/* National Crest Emblem Circular badge mockup */}
                  <div className="w-16 h-16 border-2 border-black rounded-full flex flex-col items-center justify-center bg-white shrink-0 p-1">
                    <GraduationCap size={26} />
                    <span className="text-[7px] font-sans font-extrabold leading-none mt-1">تربية العراق</span>
                    <span className="text-[5px] text-slate-500 leading-none">امتحانات المدارس</span>
                  </div>

                  <div className="text-left font-sans text-xs space-y-1 shrink-0">
                    <p className="font-bold">السنة الدراسية: {examYear}</p>
                    <p className="font-bold">المادة: {examSubject}</p>
                    <p className="font-bold">الصف: {examGrade}</p>
                    <p className="font-bold">الزمن: {examDuration}</p>
                  </div>
                </div>

                {/* Exam Title details block */}
                <div className="text-center my-6 space-y-1">
                  <p className="text-xl font-black">اسئلة {examMonth} / الكورس الدراسي الأول</p>
                  <p className="text-[11px] font-bold italic text-slate-800">ملاحظة: أجب عن الأسئلة المذكورة بدقة وخط واضح. (تمنياتنا لكم بالنجاح والتميز)</p>
                </div>

                {/* List of generated exam questions */}
                <div className="space-y-6 pt-6 border-t border-black text-right">
                  {examQuestions.map((q, idx) => (
                    <div key={`print-q-${idx}`} className="space-y-2 pb-4 border-b border-dashed border-slate-300">
                      <p className="font-bold text-lg text-black leading-relaxed">
                        {q.text}
                      </p>
                      {q.branches && q.branches.length > 0 && (
                        <div className="mr-6 space-y-1">
                          {q.branches.map((br, bIdx) => (
                            <p key={`p-br-${idx}-${bIdx}`} className="text-base text-black leading-relaxed font-semibold">
                              {br}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Teacher and school signature blessings footer */}
              <div className="flex justify-between items-end pt-8 border-t-2 border-black">
                <div>
                  <p className="text-[9px] font-sans text-slate-500">منصة عراقي أكاديمي الذكية للتعليم الفيدرالي 🎓</p>
                </div>
                
                <div className="text-center font-sans space-y-1">
                  <p className="font-extrabold text-xs">أستاذ المادة: {examTeacher}</p>
                  <div className="w-40 h-8 border-b-2 border-slate-400 mx-auto"></div>
                  <p className="text-[9px] text-slate-500 mt-1">التوقيع والختم الإداري للمدرس</p>
                </div>
              </div>
            </div>
          )}


          {/* PRINT PART B: MODEL ANSWERS KEY BOOKLET ONLY */}
          {(printType === 'answers') && (
            <div className="border-4 border-double border-emerald-700 p-6 space-y-6 bg-white h-full min-h-0 flex flex-col justify-between">
              <div>
                {/* Government Header / Core evaluation booklet header standard */}
                <div className="flex justify-between items-center border-b-2 border-emerald-700 pb-4 text-center">
                  <div className="text-right font-sans text-xs space-y-1 shrink-0">
                    <p className="font-extrabold text-sm leading-none text-emerald-800">مركز الفحص والتصحيح النموذجي</p>
                    <p className="font-extrabold text-[10px] leading-none text-slate-700">تربية جمهورية العراق</p>
                    <p className="font-black text-xs leading-none mt-2 text-emerald-950">{examSchool}</p>
                  </div>
                  
                  {/* Answer Key Symbol badge mockup */}
                  <div className="w-16 h-16 border-2 border-emerald-700 rounded-full flex flex-col items-center justify-center bg-white shrink-0 p-1">
                    <FileSpreadsheet size={26} className="text-emerald-700" />
                    <span className="text-[7px] font-sans font-extrabold leading-none mt-1 text-emerald-800">الأجوبة النموذجية</span>
                  </div>

                  <div className="text-left font-sans text-xs space-y-1 shrink-0">
                    <p className="font-bold text-emerald-800">السنة الدراسية: {examYear}</p>
                    <p className="font-bold">المادة: {examSubject}</p>
                    <p className="font-bold">الصف: {examGrade}</p>
                    <p className="font-bold text-slate-500">مواد دليل التصحيح المعتمد</p>
                  </div>
                </div>

                {/* Answer booklet title details */}
                <div className="text-center my-6 space-y-1">
                  <p className="text-xl font-black text-emerald-800">دليل مسودة الأجوبة النموذجية وتقسيم درجات الامتحان</p>
                  <p className="text-[11px] font-bold italic text-slate-700">سرّي ومخصص لمدرسي المادة المشرفين على لجان التصيطيح.</p>
                </div>

                {/* List of answers corresponding */}
                <div className="space-y-6 pt-6 border-t-2 border-emerald-700 text-right">
                  {examAnswers.map((ans, idx) => (
                    <div key={`print-ans-${idx}`} className="space-y-2 pb-4 border-b border-dashed border-slate-300">
                      <p className="font-black text-sm text-emerald-800">
                        [جواب السؤال المنهجي {idx + 1}] المقابل لـ: <span className="text-slate-500 font-bold">{examQuestions[idx]?.text?.substring(0, 45)}...</span>
                      </p>
                      <p className="text-slate-900 text-sm leading-relaxed font-bold whitespace-pre-wrap pl-4 bg-emerald-50/10 p-2.5 rounded-lg">
                        {ans.text}
                      </p>
                      {ans.branches && ans.branches.length > 0 && (
                        <div className="mr-6 space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          {ans.branches.map((br, bIdx) => (
                            <p key={`p-ans-br-${idx}-${bIdx}`} className="text-xs text-slate-800 leading-relaxed font-bold">
                              {br}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Verified signatures footer standard */}
              <div className="flex justify-between items-end pt-8 border-t-2 border-emerald-700">
                <div>
                  <p className="text-[9px] font-sans text-slate-400">تنظيم تلقائي ورصين عبر خبير المدرس بـ عراقي أكاديمي 🎓</p>
                </div>
                
                <div className="text-center font-sans space-y-1">
                  <p className="font-extrabold text-xs text-emerald-800">واضع الأجوبة: {examTeacher}</p>
                  <div className="w-40 h-8 border-b-2 border-slate-400 mx-auto"></div>
                  <p className="text-[9px] text-slate-500">توقيع اللجنة والمدرس المعتصم للدرجة</p>
                </div>
              </div>
            </div>
          )}


          {/* PRINT PART C: ANNUAL CLASS PLANNER */}
          {(printType === 'planner') && (
            <div className="border-4 border-double border-blue-700 p-6 space-y-6 bg-white h-full min-h-0 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b-2 border-blue-700 pb-4 text-center">
                  <div className="text-right font-sans text-xs space-y-1 shrink-0">
                    <p className="font-extrabold text-sm leading-none text-blue-800">خارطة المنهج السنوي والتوجيه</p>
                    <p className="font-extrabold text-[10px] leading-none text-slate-700">تربية جمهورية العراق الفيدرالية</p>
                    <p className="font-black text-xs leading-none mt-2 text-blue-950">{planSubject} / {planGrade}</p>
                  </div>
                  
                  <div className="w-16 h-16 border-2 border-blue-700 rounded-full flex flex-col items-center justify-center bg-white shrink-0 p-1">
                    <Calendar size={26} className="text-blue-700" />
                    <span className="text-[7px] font-sans font-extrabold leading-none mt-1 text-blue-800">خريطة المنهاج</span>
                  </div>

                  <div className="text-left font-sans text-xs space-y-1 shrink-0">
                    <p className="font-bold text-blue-800">السنة خطة: {planYear}</p>
                    <p className="font-bold">المادة: {planSubject}</p>
                    <p className="font-bold">الصف: {planGrade}</p>
                  </div>
                </div>

                <div className="my-6 text-center space-y-1">
                  <p className="text-lg font-black text-blue-800">التوزيع السنوي لمشرف المادة ومدرسي كادر التدريس</p>
                  <p className="text-xs text-slate-500 italic">مُعتمد وموزع لمراعاة أسابيع المنهج والفترات الفعلية للتدريس.</p>
                </div>

                <div className="markdown-body text-slate-900 border-t border-blue-700 pt-6 text-sm leading-relaxed space-y-4 font-sans text-right">
                  <Markdown remarkPlugins={[remarkGfm]}>{generatedAnnualPlan}</Markdown>
                </div>
              </div>

              <div className="flex justify-between items-end pt-8 border-t-2 border-blue-700">
                <p className="text-[9px] text-slate-400">سند خطة عراقي أكاديمي 🎓</p>
                <p className="text-[10px] font-extrabold">المشرف الموجه / المدرس: {user.displayName || 'أستاذ المادة'}</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 2. Beautiful Modern Export & Print options Modal */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] border-4 border-black dark:border-white rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] text-right"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b-3 border-black dark:border-white pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-400 border-2 border-black rounded-xl flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000]">
                    <Printer size={26} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-black dark:text-white">خيارات التصدير والطباعة 🖨️</h3>
                    <p className="text-xs text-slate-500 font-bold dark:text-slate-400 text-right">اختر طريقتك المفضلة لتنزيل أو طباعة المستند</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 bg-rose-100 hover:bg-rose-200 text-rose-700 border-2 border-black rounded-xl hover:-translate-y-0.5 active:translate-y-0 transition-all font-black text-sm shadow-[2px_2px_0px_0px_#000]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Document Details Info */}
              <div className="bg-slate-50 dark:bg-zinc-900 border-2 border-black p-4 rounded-2xl">
                <p className="text-xs text-slate-400 font-extrabold mb-1">المستند الحالي الجاهز للتصدير:</p>
                <div className="flex items-center gap-2 text-black dark:text-white justify-start">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="font-black text-sm text-right">
                    {printType === 'questions' && `ورقة الأسئلة الاختبارية - مادة ${examSubject} (${examGrade})`}
                    {printType === 'answers' && `دليل الأجوبة النموذجية للتصحيح - مادة ${examSubject} (${examGrade})`}
                    {printType === 'planner' && `الخطة والموزع السنوي - مادة ${planSubject} (${planGrade})`}
                  </p>
                </div>
              </div>

              {/* Options Grid */}
              <div className="space-y-3">
                
                {/* Option 1: PDF Download */}
                <button
                  onClick={generatePDFExport}
                  disabled={isGeneratingPDF}
                  className="w-full p-4 bg-[#60a5fa] hover:bg-[#3b82f6] text-black border-2 border-black rounded-2xl font-black text-right flex items-center justify-between gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white border-2 border-black rounded-lg flex items-center justify-center shrink-0">
                      {isGeneratingPDF ? <Loader2 className="animate-spin text-blue-600" size={20} /> : <Download size={20} className="text-blue-600" />}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-base">تصدير كـ PDF احترافي 📄</p>
                      <p className="text-[10px] text-blue-950/80 font-bold">توليد ملف قابل للمشاركة والطباعة الفورية</p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-white text-blue-600 px-1.5 py-0.5 rounded-md border border-black font-black hidden sm:inline">موصى به</span>
                </button>

                {/* Option 2: TXT Download */}
                <button
                  onClick={generateTXTExport}
                  className="w-full p-4 bg-[#34d399] hover:bg-[#10b981] text-black border-2 border-black rounded-2xl font-black text-right flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 bg-white border-2 border-black rounded-lg flex items-center justify-center shrink-0">
                    <FileText size={20} className="text-emerald-700" />
                  </div>
                  <div className="text-right">
                    <p className="font-black text-base">تفريغ كـ ملف نصي (TXT) 📂</p>
                    <p className="text-[10px] text-emerald-950/80 font-bold">تنزيل سريع وبسيط يناسب جميع الهواتف</p>
                  </div>
                </button>

                {/* Option 3: Copy Text */}
                <button
                  onClick={copyToClipboard}
                  className="w-full p-4 bg-[#f87171] hover:bg-[#ef4444] text-black border-2 border-black rounded-2xl font-black text-right flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 bg-white border-2 border-black rounded-lg flex items-center justify-center shrink-0">
                    <Copy size={20} className="text-rose-700" />
                  </div>
                  <div className="text-right">
                    <p className="font-black text-base">نسخ النص بالكامل للحافظة 📋</p>
                    <p className="text-[10px] text-rose-950/80 font-bold">نسخ فوري ولصق بملفات الوورد والتليجرام</p>
                  </div>
                </button>

                {/* Option 4: Browser Print */}
                <button
                  onClick={() => {
                    setShowExportModal(false);
                    setTimeout(() => {
                      window.print();
                    }, 150);
                  }}
                  className="w-full p-4 bg-[#fcf6bd] hover:bg-[#f9eb77] text-black border-2 border-black rounded-2xl font-black text-right flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 bg-white border-2 border-black rounded-lg flex items-center justify-center shrink-0">
                    <Printer size={20} className="text-amber-700" />
                  </div>
                  <div className="text-right">
                    <p className="font-black text-base">طباعة مباشرة (عبر المتصفح) 🖨️</p>
                    <p className="text-[10px] text-amber-950/80 font-bold">طباعة تقليدية - يُنصح باستخدامه خارج المعاينة التجريبية</p>
                  </div>
                </button>

              </div>

              {/* Tip or Caution footer */}
              <div className="text-center pt-2 border-t border-slate-100 dark:border-zinc-800">
                <p className="text-[10px] text-slate-400 font-extrabold">بوابة المساعدين الأكاديميين والمدرسين العراقية الفيدرالية 🎓</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
