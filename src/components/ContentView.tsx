import { useState, useEffect, useRef } from 'react';
import { db, awardXP } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { Material, Flashcard, Chapter, Grade, MinisterialQuestion, Teacher } from '../types';
import { getAIClient } from '../services/aiService';
import { Type } from "@google/genai";
import { FileText, Play, BrainCircuit, ExternalLink, Loader2, ChevronRight, ChevronLeft, RefreshCcw, HelpCircle, CheckCircle2, X, CheckCircle, Sparkles, Award, Eye, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactPlayer from 'react-player';

const Player = ReactPlayer as any;

interface Props {
  chapter: Chapter;
  userId: string;
  grade: Grade;
  teacher?: Teacher | null;
}

export default function ContentView({ chapter, userId, grade, teacher }: Props) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [ministerialQuestions, setMinisterialQuestions] = useState<MinisterialQuestion[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'materials' | 'flashcards' | 'ministerial'>('materials');
  const [selectedVideo, setSelectedVideo] = useState<Material | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('tutorial_completed'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalPlaying, setIsModalPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, 'correct' | 'wrong' | null>>({});
  const playRequestTimeRef = useRef<number>(0);
  
  const [studentAnswer, setStudentAnswer] = useState<string>('');
  const [isEvaluationLoading, setIsEvaluationLoading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{ score: string, feedback: string } | null>(null);

  const openVideoModal = (m: Material) => {
    setIsPlayerReady(false);
    setIsModalPlaying(false);
    setSelectedVideo(m);
    setIsModalOpen(true);
  };

  const [videoProgress, setVideoProgress] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`videoProgress_${userId}`);
    return saved ? JSON.parse(saved) : {};
  });

  const closeVideoModal = () => {
    setIsModalPlaying(false);
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedVideo(null);
      setIsPlayerReady(false);
    }, 300);
  };

  useEffect(() => {
    if (selectedVideo) {
      // Small delay to ensure the modal animation finishes before we attempt to play
      const timer = setTimeout(() => {
        setIsModalPlaying(true);
      }, 800);
      return () => {
        clearTimeout(timer);
        setIsModalPlaying(false);
      };
    } else {
      setIsModalPlaying(false);
    }
  }, [selectedVideo]);

  const getPdfSource = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
  };

  const markAsCompleted = async (materialId: string) => {
    if (completedIds.includes(materialId)) return;
    const newCompletedIds = [...completedIds, materialId];
    setCompletedIds(newCompletedIds);
    localStorage.setItem(`progress_${userId}`, JSON.stringify(newCompletedIds));

    try {
      await updateDoc(doc(db, 'users', userId), {
        completed_materials: newCompletedIds,
        updatedAt: new Date().toISOString()
      });
      // Award 50 XP for completing a lesson
      await awardXP(userId, 50);
    } catch (err) {
      console.error('Error updating progress in Firestore:', err);
    }
  };

  const handleVideoProgress = (materialId: string, played: number) => {
    const percentage = played * 100;
    setVideoProgress(prev => {
      const current = prev[materialId] || 0;
      if (percentage <= current && current > 0) return prev;
      const newProgress = { ...prev, [materialId]: percentage };
      localStorage.setItem(`videoProgress_${userId}`, JSON.stringify(newProgress));
      return newProgress;
    });

    if (percentage >= 80 && !completedIds.includes(materialId)) {
      markAsCompleted(materialId);
    }
  };

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return '';
    let videoId = '';
    
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0];
    } else if (url.length === 11) {
      videoId = url;
    }
    
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    }
    return url;
  };

  const VideoPlayer = ({ material, isPlaying, onReady }: { material: Material, isPlaying: boolean, onReady?: () => void }) => {
    const url = material.url || (material as any).content;
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be') || url.length === 11;

    // Trigger onReady for Youtube since it's a raw iframe
    useEffect(() => {
      if (isYoutube && onReady) {
        onReady();
      }
    }, [isYoutube, onReady]);

    // Use a timer to mark as completed since we can't easily track progress in a raw iframe without postMessage
    useEffect(() => {
      if (isPlaying && isYoutube && !completedIds.includes(material.id)) {
        const timer = setTimeout(() => {
          markAsCompleted(material.id);
        }, 120000); // Mark as completed after 2 minutes of "watching"
        return () => clearTimeout(timer);
      }
    }, [isPlaying, isYoutube, material.id]);

    if (isYoutube) {
      return (
        <iframe
          src={isPlaying ? getYoutubeEmbedUrl(url) : null}
          className="w-full h-full border-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={material.title}
        ></iframe>
      );
    }

    return (
      <Player
        url={url}
        width="100%"
        height="100%"
        controls
        playing={isPlaying}
        onReady={onReady}
        onProgress={(progress: any) => handleVideoProgress(material.id, progress.played)}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
    );
  };

  const isMinisterialGrade = ['primary_6', 'middle_3', 'secondary_6_sci', 'secondary_6_lit'].includes(grade);
  const chapterProgress = materials.length > 0 
    ? Math.round((materials.filter(m => completedIds.includes(m.id)).length / materials.length) * 100)
    : 0;

  const closeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('tutorial_completed', 'true');
  };

  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        setDbError(null);
        // Fetch materials
        const [matSnap, legacyMatSnap] = await Promise.all([
          getDocs(query(collection(db, 'materials'), where('chapterIds', 'array-contains', chapter.id))),
          getDocs(query(collection(db, 'materials'), where('chapterId', '==', chapter.id)))
        ]);
        const materialsMap = new Map<string, Material>();
        matSnap.docs.forEach(doc => materialsMap.set(doc.id, { id: doc.id, ...doc.data() } as Material));
        legacyMatSnap.docs.forEach(doc => materialsMap.set(doc.id, { id: doc.id, ...doc.data() } as Material));
        const filteredMaterials = Array.from(materialsMap.values())
          .sort((a, b) => (a.order_index ?? Number.MAX_SAFE_INTEGER) - (b.order_index ?? Number.MAX_SAFE_INTEGER));
        setMaterials(filteredMaterials);
        
        // Fetch flashcards
        const [flashSnap, legacyFlashSnap] = await Promise.all([
          getDocs(query(collection(db, 'flashcards'), where('chapterIds', 'array-contains', chapter.id))),
          getDocs(query(collection(db, 'flashcards'), where('chapterId', '==', chapter.id)))
        ]);
        const flashcardsMap = new Map<string, Flashcard>();
        flashSnap.docs.forEach(doc => flashcardsMap.set(doc.id, { id: doc.id, ...doc.data() } as Flashcard));
        legacyFlashSnap.docs.forEach(doc => flashcardsMap.set(doc.id, { id: doc.id, ...doc.data() } as Flashcard));
        setFlashcards(Array.from(flashcardsMap.values()));

        // Fetch ministerial questions
        const [minSnap, legacyMinSnap] = await Promise.all([
          getDocs(query(collection(db, 'ministerial_questions'), where('chapterIds', 'array-contains', chapter.id))),
          getDocs(query(collection(db, 'ministerial_questions'), where('chapterId', '==', chapter.id)))
        ]);
        const minMap = new Map<string, MinisterialQuestion>();
        minSnap.docs.forEach(doc => minMap.set(doc.id, { id: doc.id, ...doc.data() } as MinisterialQuestion));
        legacyMinSnap.docs.forEach(doc => minMap.set(doc.id, { id: doc.id, ...doc.data() } as MinisterialQuestion));
        const filteredMinQuests = Array.from(minMap.values())
          .sort((a, b) => (a.order_index ?? Number.MAX_SAFE_INTEGER) - (b.order_index ?? Number.MAX_SAFE_INTEGER));
        setMinisterialQuestions(filteredMinQuests);

        // Fetch user progress
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const progress = userDoc.data().completed_materials || [];
          setCompletedIds(progress);
          localStorage.setItem(`progress_${userId}`, JSON.stringify(progress));
        } else {
          const savedProgress = localStorage.getItem(`progress_${userId}`);
          if (savedProgress) setCompletedIds(JSON.parse(savedProgress));
        }
      } catch (err: any) {
        console.error('Error fetching data from Firestore:', err);
        setDbError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [chapter, userId]);

  const toggleCompletion = async (materialId: string) => {
    const isCompleted = completedIds.includes(materialId);
    const newCompletedIds = isCompleted 
      ? completedIds.filter(id => id !== materialId)
      : [...completedIds, materialId];
    
    setCompletedIds(newCompletedIds);
    localStorage.setItem(`progress_${userId}`, JSON.stringify(newCompletedIds));

    try {
      await updateDoc(doc(db, 'users', userId), {
        completed_materials: newCompletedIds,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating progress in Firestore:', err);
    }
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/embed/')) return url;
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };

  const handleEvaluateAnswer = async (question: string, modelAnswer: string) => {
    if (!studentAnswer.trim()) return;
    setIsEvaluationLoading(true);
    setEvaluationResult(null);

    try {
      const ai = getAIClient();
      const prompt = `أنت مصحح امتحانات وزاري عراقي.
      السؤال: ${question}
      الجواب النموذجي: ${modelAnswer}
      إجابة الطالب: ${studentAnswer}

      قم بمقارنة إجابة الطالب بالجواب النموذجي. 
      رد بصيغة JSON تحتوي على:
      {
        "score": "النسبة المئوية (مثلا 85%)",
        "feedback": "ملاحظات باللغة العربية توضح ما أصاب فيه الطالب وما أخطأ فيه أو نقصه."
      }`;

      const response = await ai.models.generateContent({
        model: "gemma-4-31b-it",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.STRING },
              feedback: { type: Type.STRING }
            },
            required: ["score", "feedback"]
          }
        }
      });
      
      const text = response.text || "{}";
      const result = JSON.parse(text);
      setEvaluationResult(result);
      
      // Award XP for good answers
      const numericScore = parseInt(result.score) || 0;
      if (numericScore >= 90) {
        await awardXP(userId, 150); // Big reward for excellence
      } else if (numericScore >= 50) {
        await awardXP(userId, 75); // Reward for passing
      }
    } catch (err) {
      console.error("Evaluation Error:", err);
      setEvaluationResult({
        score: "خطأ",
        feedback: "عذراً، حدث خطأ أثناء الاتصال بالذكاء الاصطناعي للحصول على التقييم."
      });
    } finally {
      setIsEvaluationLoading(false);
    }
  };

  const filteredMaterials = teacher
    ? materials.filter(m => (m as any).teacherId === teacher.id || !(m as any).teacherId)
    : materials;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="space-y-8">
      {/* Chapter Progress Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-100 dark:text-slate-800"
            />
            <motion.circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={226.2}
              initial={{ strokeDashoffset: 226.2 }}
              animate={{ strokeDashoffset: 226.2 - (226.2 * chapterProgress) / 100 }}
              className="text-blue-600"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-bold text-slate-900 dark:text-white">
            {chapterProgress}%
          </div>
        </div>
        <div className="flex-1 text-center sm:text-right">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">تقدمك في {chapter.name}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">أكمل كافة المحاضرات والمصادر لإنهاء الفصل بنسبة 100%</p>
        </div>
      </div>

      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md mx-auto overflow-x-auto">
        <button
          onClick={() => setActiveTab('materials')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'materials' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          المصادر والمحاضرات
        </button>
        {isMinisterialGrade && (
          <button
            onClick={() => setActiveTab('ministerial')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'ministerial' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            الأسئلة الوزارية
          </button>
        )}
        <button
          onClick={() => setActiveTab('flashcards')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'flashcards' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          اختبار البطاقات
        </button>
      </div>

      <AnimatePresence mode="wait">
        {dbError ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-white rounded-xl border border-red-200 space-y-4"
          >
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <X size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-red-900">خطأ في جلب البيانات</h3>
              <p className="text-red-600 text-sm">{dbError}</p>
              <p className="text-slate-500 text-xs mt-4">يرجى التأكد من هيكل جدول materials في قاعدة البيانات (مثل وجود عمود order_index وصلاحيات RLS).</p>
            </div>
          </motion.div>
        ) : activeTab === 'materials' ? (
          <motion.div
            key="materials"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {filteredMaterials.filter(m => m.type !== 'Ministerial').length > 0 ? (
              <>
                {teacher && (
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100">
                        {teacher.avatar ? (
                          <img src={teacher.avatar} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <GraduationCap size={16} />
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">شرح أ. {teacher.name}</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMaterials.filter(m => m.type !== 'Ministerial').map((m) => {
                    const isCompleted = completedIds.includes(m.id);
                    return (
                      <div key={m.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col relative group overflow-hidden">
                        <div className="p-4 sm:p-5 flex items-start sm:items-center gap-3 sm:gap-4 relative z-10">
                          <button
                            onClick={() => toggleCompletion(m.id)}
                            className={`absolute -top-2 -left-2 p-1.5 rounded-full shadow-md transition-all z-10 ${
                              isCompleted ? 'bg-green-500 text-white' : 'bg-white text-slate-300 hover:text-green-500'
                            }`}
                            title={isCompleted ? 'تم الإكمال' : (m.type === 'PDF' ? 'تحديد كمكتمل' : 'تحديد كمكتمل (يتم تلقائياً بعد مشاهدة 80%)')}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <div className={`p-3 sm:p-4 rounded-xl transition-colors flex-shrink-0 mt-1 sm:mt-0 ${
                            isCompleted 
                              ? 'bg-green-50 text-green-600' 
                              : m.type === 'PDF' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {m.type === 'PDF' ? <FileText size={24} /> : <Play size={24} />}
                          </div>
                          <div className="flex-1 min-w-0 pr-1">
                            <h4 className={`font-bold transition-colors text-sm sm:text-base leading-relaxed break-words ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                              {m.title}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.type === 'PDF' ? 'ملف PDF قابل للتحميل' : 'محاضرة فيديو يوتيوب'}</p>
                            {m.type !== 'PDF' && (
                              <div className="mt-3 w-full max-w-[200px] bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex items-center">
                                <div 
                                  className={`h-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                                  style={{ width: `${isCompleted ? 100 : Math.min(100, Math.max(0, videoProgress[m.id] || 0))}%` }}
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setExpandedMaterialId(expandedMaterialId === m.id ? null : m.id)}
                              className={`p-2 rounded-lg transition-all ${expandedMaterialId === m.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
                              title="عرض سريع"
                            >
                              <Eye size={20} />
                            </button>
                            {m.type === 'PDF' ? (
                              <button
                                onClick={() => setSelectedPdf(m.url || (m as any).content)}
                                className="p-2 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                title="عرض بشاشة كاملة"
                              >
                                <ExternalLink size={20} />
                              </button>
                            ) : (
                              <button
                                onClick={() => openVideoModal(m)}
                                className="p-2 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                title="عرض بشاشة كاملة"
                              >
                                <Play size={20} />
                              </button>
                            )}
                          </div>
                        </div>
                        <AnimatePresence>
                          {expandedMaterialId === m.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="bg-slate-50 border-t border-slate-100"
                            >
                              <div className="p-4">
                                {m.type === 'PDF' ? (
                                  <iframe
                                    src={getPdfSource(m.url || (m as any).content)}
                                    className="w-full h-80 sm:h-96 rounded-xl border border-slate-200"
                                    title="PDF Quick View"
                                  ></iframe>
                                ) : (
                                  <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-sm relative">
                                    <VideoPlayer
                                      material={m}
                                      isPlaying={false}
                                    />
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 space-y-4"
              >
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">سيتم إضافة المحاضرات والامتحانات قريباً</h3>
                  <p className="text-slate-500 text-sm">انتظرونا، نحن نعمل على توفير أفضل المحتويات التعليمية لك.</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : activeTab === 'ministerial' ? (
          <motion.div
            key="ministerial"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {ministerialQuestions.length > 0 ? (
              <>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                  <div className="text-right">
                    <h3 className="text-xl font-bold text-indigo-900">الأسئلة الوزارية ({ministerialQuestions.length})</h3>
                    <p className="text-indigo-600 text-sm">تدرب على الأسئلة التي وردت في الامتحانات الوزارية لسنوات سابقة</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsTestMode(true);
                      setRevealedAnswers({});
                      setCardIndex(0);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-all hover:scale-105"
                  >
                    <BrainCircuit size={20} />
                    <span>امتحني بالأسئلة</span>
                  </button>
                </div>

                {!isTestMode ? (
                  <div className="space-y-4">
                    {ministerialQuestions.map((q, idx) => (
                      <div key={q.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                        <div className="p-5 flex flex-col gap-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center flex-shrink-0 font-black">
                                {idx + 1}
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg inline-block	">
                                  {q.year}
                                </p>
                                <h4 className="font-bold text-slate-800 leading-relaxed text-lg">
                                  {q.question}
                                </h4>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-50 flex flex-col gap-3">
                            {!revealedAnswers[q.id] ? (
                              <button 
                                onClick={() => setRevealedAnswers(prev => ({ ...prev, [q.id]: true }))}
                                className="flex items-center gap-2 text-blue-600 font-bold hover:gap-3 transition-all text-sm w-fit mr-auto sm:mr-0 ml-auto"
                              >
                                <span>عرض الجواب النموذجي</span>
                                <ChevronLeft size={16} />
                              </button>
                            ) : (
                              <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-2"
                              >
                                <div className="flex items-center gap-2 text-emerald-700 font-black text-sm">
                                  <CheckCircle2 size={16} />
                                  <span>الجواب النموذجي:</span>
                                </div>
                                <p className="text-slate-700 leading-relaxed font-medium">
                                  {q.answer}
                                </p>
                                <button 
                                  onClick={() => setRevealedAnswers(prev => ({ ...prev, [q.id]: false }))}
                                  className="text-emerald-700 text-xs font-bold underline mt-2"
                                >
                                  إخفاء الجواب
                                </button>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto space-y-8">
                    <div className="flex items-center justify-between">
                       <button 
                        onClick={() => setIsTestMode(false)}
                        className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors"
                       >
                         <ChevronRight size={20} />
                         <span>إنهاء الاختبار</span>
                       </button>
                       <div className="text-sm font-black text-slate-400">
                         السؤال {cardIndex + 1} من {ministerialQuestions.length}
                       </div>
                    </div>

                    <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-md space-y-8 min-h-[400px] flex flex-col">
                       <div className="space-y-4 flex-1">
                          <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-black">وزاري - {ministerialQuestions[cardIndex].year}</span>
                          <h3 className="text-2xl font-black text-slate-900 leading-tight">
                            {ministerialQuestions[cardIndex].question}
                          </h3>
                       </div>

                       <div className="space-y-6">
                          {!evaluationResult && !revealedAnswers[ministerialQuestions[cardIndex].id] && (
                            <div className="space-y-4">
                              <textarea
                                value={studentAnswer}
                                onChange={(e) => setStudentAnswer(e.target.value)}
                                placeholder="اكتب إجابتك هنا..."
                                rows={4}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 resize-none font-medium"
                              />
                              <div className="flex gap-3">
                                <button
                                  onClick={() => handleEvaluateAnswer(ministerialQuestions[cardIndex].question, ministerialQuestions[cardIndex].answer)}
                                  disabled={isEvaluationLoading || !studentAnswer.trim()}
                                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                  {isEvaluationLoading ? (
                                    <><Loader2 className="animate-spin" size={20} /> جاري التقييم... </>
                                  ) : (
                                    <><Sparkles size={20} /> قارن إجابتي بالذكاء الاصطناعي</>
                                  )}
                                </button>
                                <button
                                  onClick={() => setRevealedAnswers(prev => ({ ...prev, [ministerialQuestions[cardIndex].id]: true }))}
                                  className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center flex-shrink-0"
                                  title="أظهر الجواب"
                                >
                                  <Eye size={22} />
                                </button>
                              </div>
                            </div>
                          )}

                          {evaluationResult && !revealedAnswers[ministerialQuestions[cardIndex].id] && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="bg-blue-50 p-6 rounded-xl border border-blue-100 space-y-4"
                            >
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2 text-blue-700 font-black">
                                   <Sparkles size={20} />
                                   <span>تقييم الذكاء الاصطناعي</span>
                                 </div>
                                 <div className="text-xl font-black text-blue-700 bg-white px-3 py-1 rounded-xl shadow-sm">
                                   {evaluationResult.score}
                                 </div>
                               </div>
                               <p className="text-slate-700 leading-relaxed font-medium bg-white p-4 rounded-2xl border border-blue-50">
                                 {evaluationResult.feedback}
                               </p>
                               <button 
                                 onClick={() => setRevealedAnswers(prev => ({ ...prev, [ministerialQuestions[cardIndex].id]: true }))}
                                 className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold border border-blue-200 hover:bg-blue-50 transition-all text-sm mt-2"
                               >
                                 مقارنة مع الجواب النموذجي
                               </button>
                               <button 
                                 onClick={() => setEvaluationResult(null)}
                                 className="w-full py-3 bg-transparent text-slate-500 hover:text-slate-700 rounded-xl font-bold transition-all text-sm"
                               >
                                 تعديل الإجابة وإعادة المحاولة
                               </button>
                            </motion.div>
                          )}

                          {revealedAnswers[ministerialQuestions[cardIndex].id] && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="bg-emerald-50 p-6 rounded-xl border-2 border-emerald-100 space-y-3"
                            >
                               <div className="flex items-center gap-2 text-emerald-700 font-black">
                                 <CheckCircle2 size={20} />
                                 <span>الجواب النموذجي</span>
                               </div>
                               <p className="text-slate-800 text-lg leading-relaxed font-bold">
                                 {ministerialQuestions[cardIndex].answer}
                               </p>
                               <button 
                                 onClick={() => {
                                   setRevealedAnswers(prev => ({ ...prev, [ministerialQuestions[cardIndex].id]: false }));
                                   setEvaluationResult(null);
                                 }}
                                 className="text-emerald-700 text-sm font-bold underline mt-4 block w-fit"
                               >
                                 إخفاء الجواب وإعادة المحاولة
                               </button>
                            </motion.div>
                          )}

                          <div className="flex items-center justify-between gap-4 pt-4">
                             <button
                               disabled={cardIndex === 0}
                               onClick={() => {
                                 setCardIndex(idx => idx - 1);
                                 setStudentAnswer('');
                                 setEvaluationResult(null);
                               }}
                               className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold disabled:opacity-30 transition-all flex items-center justify-center gap-2"
                             >
                                <ChevronRight size={20} />
                                <span>السابق</span>
                             </button>
                             
                             {cardIndex < ministerialQuestions.length - 1 ? (
                               <button
                                 onClick={() => {
                                   setCardIndex(idx => idx + 1);
                                   setStudentAnswer('');
                                   setEvaluationResult(null);
                                 }}
                                 className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                               >
                                  <span>التالي</span>
                                  <ChevronLeft size={20} />
                               </button>
                             ) : (
                               <button
                                 onClick={() => setIsTestMode(false)}
                                 className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                               >
                                  <span>إنهاء</span>
                                  <CheckCircle size={20} />
                               </button>
                             )}
                          </div>
                       </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 space-y-4"
              >
                <div className="w-16 h-16 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center mx-auto">
                  <Award size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">سيتم إضافة الأسئلة الوزارية قريباً</h3>
                  <p className="text-slate-500 text-sm">نحن نجمع لك كافة الأسئلة الوزارية للسنوات السابقة مع حلولها النموذجية.</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="flashcards"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {flashcards.length > 0 ? (
              <div className="space-y-12">
                <div className="max-w-md mx-auto space-y-6">
                  <div className="relative h-80 perspective-1000">
                    <motion.div
                      className="w-full h-full relative preserve-3d cursor-pointer"
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                      onClick={() => setIsFlipped(!isFlipped)}
                    >
                      {/* Front */}
                      <div className="absolute inset-0 backface-hidden bg-white rounded-xl p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
                        <HelpCircle size={40} className="text-blue-500" />
                        <h3 className="text-xl font-bold text-slate-800">{flashcards[cardIndex].question}</h3>
                        <p className="text-xs text-slate-400">اضغط لقلب البطاقة</p>
                      </div>
                      {/* Back */}
                      <div 
                        className="absolute inset-0 backface-hidden bg-blue-600 rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-4 text-white"
                        style={{ transform: 'rotateY(180deg)' }}
                      >
                        <CheckCircle2 size={40} />
                        <p className="text-lg font-medium leading-relaxed">{flashcards[cardIndex].answer}</p>
                      </div>
                    </motion.div>
                  </div>
                  <div className="flex items-center justify-between">
                    <button onClick={() => { setIsFlipped(false); setCardIndex((p) => (p - 1 + flashcards.length) % flashcards.length); }} className="p-3 bg-white rounded-full shadow-sm hover:bg-slate-50"><ChevronRight /></button>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-slate-500">{cardIndex + 1} / {flashcards.length}</span>
                    </div>
                    <button onClick={() => { setIsFlipped(false); setCardIndex((p) => (p + 1) % flashcards.length); }} className="p-3 bg-white rounded-full shadow-sm hover:bg-slate-50"><ChevronLeft /></button>
                  </div>
                </div>

                {/* All Flashcards List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 px-2">
                    <BrainCircuit size={20} className="text-blue-600" />
                    مراجعة كافة البطاقات
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {flashcards.map((fc, idx) => (
                      <div key={fc.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between gap-4 group hover:border-blue-200 transition-colors">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</span>
                            <h4 className="font-bold text-slate-900 leading-tight">{fc.question}</h4>
                          </div>
                          <p className="text-slate-600 text-sm pr-8 leading-relaxed">{fc.answer}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 space-y-4"
              >
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">سيتم إضافة المحاضرات والامتحانات قريباً</h3>
                  <p className="text-slate-500 text-sm">انتظرونا، نحن نعمل على توفير أفضل المحتويات التعليمية لك.</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial Overlay */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-xl p-8 text-center space-y-6 shadow-md"
            >
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900">كيف تتابع تقدمك؟</h3>
                <p className="text-slate-500 leading-relaxed">
                  عند إكمال أي محاضرة أو قراءة ملزمة، اضغط على علامة الصح <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-100 text-slate-400 rounded-md mx-1"><CheckCircle2 size={14} /></span> بجانب المادة ليتم احتسابها في نسبة إنجازك.
                </p>
              </div>
              <button 
                onClick={closeTutorial}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                فهمت ذلك، ابدأ الآن
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Player Modal */}
      <AnimatePresence>
        {isModalOpen && selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black rounded-xl sm:rounded-2xl overflow-hidden w-full h-full max-h-[100dvh] flex flex-col shadow-md"
            >
              <div className="p-3 sm:p-4 flex items-center justify-between border-b border-white/10 bg-black/50 text-white z-10">
                <h3 className="font-bold text-sm sm:text-base">{selectedVideo.title}</h3>
                <button
                  onClick={closeVideoModal}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 w-full h-full relative bg-black">
                <VideoPlayer
                  material={selectedVideo}
                  isPlaying={isModalPlaying && isPlayerReady}
                  onReady={() => setIsPlayerReady(true)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF Viewer Modal */}
      <AnimatePresence>
        {selectedPdf && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl sm:rounded-2xl overflow-hidden w-full h-full max-h-[100dvh] shadow-md flex flex-col"
            >
              <div className="p-4 flex items-center justify-between border-b border-slate-100">
                <h3 className="font-bold text-slate-900">عرض الملزمة</h3>
                <div className="flex items-center gap-2">
                  <a 
                    href={selectedPdf} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-2 text-sm"
                  >
                    <ExternalLink size={18} />
                    فتح في نافذة جديدة
                  </a>
                  <button
                    onClick={() => setSelectedPdf(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-slate-100 overflow-hidden">
                <iframe
                  src={getPdfSource(selectedPdf)}
                  className="w-full h-full border-none"
                  title="PDF Viewer"
                ></iframe>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
