import { useState, useEffect, useRef } from 'react';
import { db, awardXP, subscribeToFeatures } from '../lib/firebase';
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
  const [appFeatures, setAppFeatures] = useState({ hideMinisterial: false, hideFlashcards: false });

  useEffect(() => {
    const unsubFeatures = subscribeToFeatures((features) => {
      setAppFeatures(features);
      if (features.hideFlashcards && activeTab === 'flashcards') {
        setActiveTab('materials');
      }
      if (features.hideMinisterial && activeTab === 'ministerial') {
        setActiveTab('materials');
      }
    });
    return () => unsubFeatures();
  }, [activeTab]);

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
    if (!url) return undefined;
    if (url.startsWith('data:')) return url;
    if (url.includes('firebasestorage.googleapis.com')) return url;
    
    // Handle Google Drive links
    if (url.includes('drive.google.com/file/d/')) {
      const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    } else if (url.includes('drive.google.com/open?id=')) {
      const match = url.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Chapter Progress Header */}
      <div className="bg-white dark:bg-[#1a1a1a] p-6 neo-border flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-full translate-x-16 -translate-y-16 opacity-50 z-0"></div>
        <div className="relative w-20 h-20 flex-shrink-0 z-10">
          <svg className="w-full h-full transform -rotate-90 drop-shadow-[2px_2px_0px_currentColor]">
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-black/10 dark:text-white/10"
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
              className={chapterProgress === 100 ? 'text-green-500' : 'text-black dark:text-white'}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-black text-xl text-black dark:text-white">
            {chapterProgress}%
          </div>
        </div>
        <div className="flex-1 text-center sm:text-right relative z-10">
          <h2 className="text-2xl font-black text-black dark:text-white">تقدمك في {chapter.name}</h2>
          <p className="text-black/80 dark:text-white/80 font-bold text-sm mt-1">أكمل كافة المحاضرات والمصادر لإنهاء الفصل بنسبة 100%</p>
        </div>
      </div>

      <div className="flex bg-white dark:bg-[#1a1a1a] p-2 neo-border-sm max-w-lg mx-auto overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('materials')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-black transition-all whitespace-nowrap border-2 ${
            activeTab === 'materials' ? 'neo-bg-yellow border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          المصادر والمحاضرات
        </button>
        {isMinisterialGrade && !appFeatures.hideMinisterial && (
          <button
            onClick={() => setActiveTab('ministerial')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-black transition-all whitespace-nowrap border-2 ${
              activeTab === 'ministerial' ? 'neo-bg-pink border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            المراجع الوزارية
          </button>
        )}
        {!appFeatures.hideFlashcards && (
          <button
            onClick={() => setActiveTab('flashcards')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-black transition-all whitespace-nowrap border-2 ${
              activeTab === 'flashcards' ? 'neo-bg-teal border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            اختبار البطاقات
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {dbError ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-white dark:bg-black neo-border neo-bg-red space-y-4"
          >
            <div className="w-16 h-16 bg-white border-2 border-black text-black rounded-xl flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <X size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-black">خطأ في جلب البيانات</h3>
              <p className="text-black font-bold font-mono">{dbError}</p>
            </div>
          </motion.div>
        ) : activeTab === 'materials' ? (
          <motion.div
            key="materials"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {filteredMaterials.filter(m => m.type !== 'Ministerial').length > 0 ? (
              <>
                {teacher && (
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#fdfbf7] bg-white">
                        {teacher.avatar ? (
                          <img src={teacher.avatar} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <GraduationCap size={20} />
                          </div>
                        )}
                      </div>
                      <span className="text-base font-black text-black dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border-2 border-black dark:border-white">شرح أ. {teacher.name}</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredMaterials.filter(m => m.type !== 'Ministerial').map((m) => {
                    const isCompleted = completedIds.includes(m.id);
                    return (
                      <div key={m.id} className={`bg-white dark:bg-[#1a1a1a] flex flex-col relative overflow-hidden transition-all neo-border ${isCompleted ? 'opacity-80' : 'neo-hover'}`}>
                        <div className="p-4 sm:p-5 flex items-start sm:items-center gap-4 sm:gap-6 relative z-10 w-full">
                          <button
                            onClick={() => toggleCompletion(m.id)}
                            className={`absolute top-2 left-2 p-2 rounded-xl border-2 border-black dark:border-white transition-all z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] ${
                              isCompleted ? 'neo-bg-teal text-white' : 'bg-white dark:bg-black text-black dark:text-white hover:bg-slate-100'
                            }`}
                            title={isCompleted ? 'تم الإكمال' : 'تحديد كمكتمل'}
                          >
                            <CheckCircle size={18} />
                          </button>
                          <div className={`p-4 rounded-xl transition-colors flex-shrink-0 border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#fdfbf7] ${
                            m.type === 'PDF' ? 'neo-bg-blue text-black' : 'neo-bg-pink text-black'
                          }`}>
                            {m.type === 'PDF' ? <FileText size={28} /> : <Play size={28} />}
                          </div>
                          <div className="flex-1 min-w-0 pr-1">
                            <h4 className={`font-black text-lg line-clamp-2 ${isCompleted ? 'line-through text-slate-500' : 'text-black dark:text-white'}`}>
                              {m.title}
                            </h4>
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">{m.type === 'PDF' ? 'ملف PDF قابل للتحميل' : 'محاضرة فيديو يوتيوب'}</p>
                            {m.type !== 'PDF' && (
                              <div className="mt-3 w-full max-w-[200px] border-2 border-black dark:border-white bg-white dark:bg-black rounded-full h-3 overflow-hidden shadow-inner">
                                <div 
                                  className={`h-full border-l-2 border-black dark:border-white transition-all duration-300 ${isCompleted ? 'neo-bg-teal' : 'neo-bg-yellow'}`}
                                  style={{ width: `${isCompleted ? 100 : Math.min(100, Math.max(0, videoProgress[m.id] || 0))}%` }}
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-center gap-3 flex-shrink-0 mt-8 sm:mt-0">
                            <button
                              onClick={() => setExpandedMaterialId(expandedMaterialId === m.id ? null : m.id)}
                              className={`w-10 h-10 flex items-center justify-center rounded-xl border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#fdfbf7] transition-all hover:-translate-y-1 ${expandedMaterialId === m.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-black text-black dark:text-white'}`}
                              title="عرض سريع"
                            >
                              <Eye size={18} />
                            </button>
                            {m.type === 'PDF' ? (
                              <button
                                onClick={() => setSelectedPdf(m.url || (m as any).content)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#fdfbf7] bg-white dark:bg-black text-black dark:text-white hover:-translate-y-1 transition-all"
                                title="عرض بشاشة كاملة"
                              >
                                <ExternalLink size={18} />
                              </button>
                            ) : (
                              <button
                                onClick={() => openVideoModal(m)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#fdfbf7] bg-white dark:bg-black text-black dark:text-white hover:-translate-y-1 transition-all"
                                title="عرض بشاشة كاملة"
                              >
                                <Play size={18} />
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
                              className="bg-slate-50 dark:bg-black border-t-2 border-black dark:border-white"
                            >
                              <div className="p-4">
                                {m.type === 'PDF' ? (
                                  <iframe
                                    src={getPdfSource(m.url || (m as any).content)}
                                    className="w-full h-80 sm:h-96 rounded-xl border-2 border-black dark:border-white"
                                    title="PDF Quick View"
                                  ></iframe>
                                ) : (
                                  <div className="aspect-video bg-black rounded-xl overflow-hidden border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] relative">
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
                className="text-center py-16 bg-white dark:bg-black neo-border space-y-4"
              >
                <div className="w-16 h-16 neo-bg-yellow border-2 border-black dark:border-white text-black rounded-xl flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  <Sparkles size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-black dark:text-white">سيتم إضافة المحاضرات والامتحانات قريباً</h3>
                  <p className="text-black/80 dark:text-white/80 font-bold">انتظرونا، نحن نعمل على توفير أفضل المحتويات التعليمية لك.</p>
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
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 neo-bg-pink p-6 neo-border">
                  <div className="text-right">
                    <h3 className="text-2xl font-black text-black">المراجع والأسئلة الوزارية ({ministerialQuestions.length})</h3>
                    <p className="text-black/80 font-bold text-sm mt-1">تصفح الأسئلة التي وردت في الامتحانات الوزارية لسنوات سابقة</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {ministerialQuestions.map((q, idx) => {
                    const QType = q.type || 'PDF';
                    return (
                      <div key={q.id} className="bg-white dark:bg-[#1a1a1a] neo-border overflow-hidden transition-all neo-hover">
                        <div className="p-5 flex flex-col gap-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                                {idx + 1}
                              </div>
                              <div className="space-y-2 pt-1">
                                {q.year && (
                                  <p className="text-xs font-black text-black dark:text-white neo-bg-yellow px-2 py-0.5 border-2 border-black dark:border-white rounded-md inline-block neo-border-sm">
                                    {q.year}
                                  </p>
                                )}
                                <h4 className="font-black text-black dark:text-white leading-relaxed text-xl">
                                  {q.title || q.question}
                                </h4>
                                <p className="text-xs text-slate-500 font-bold mt-1">{QType === 'PDF' ? 'ملف PDF قابل للتحميل' : 'فيديو'}</p>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0">
                              {QType === 'PDF' ? (
                                <button
                                  onClick={() => setSelectedPdf(q.url)}
                                  className="w-12 h-12 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white hover:neo-bg-blue hover:text-black rounded-xl transition-all font-black flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1"
                                  title="فتح الملف"
                                >
                                  <ExternalLink size={24} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => openVideoModal({ ...q, type: 'Video' } as any)}
                                  className="w-12 h-12 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white hover:neo-bg-red hover:text-white rounded-xl transition-all font-black flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1"
                                  title="تشغيل الفيديو"
                                >
                                  <Play size={24} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 bg-white dark:bg-black neo-border space-y-4 neo-bg-pink"
              >
                <div className="w-16 h-16 bg-white border-2 border-black text-black rounded-xl flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  <Award size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-black dark:text-white">سيتم إضافة المراجع الوزارية قريباً</h3>
                  <p className="font-bold text-black/80 dark:text-white/80">نحن نجمع لك كافة الأسئلة والمراجع الوزارية هنا.</p>
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
                  <div className="relative h-[400px] perspective-1000">
                    <motion.div
                      className="w-full h-full relative preserve-3d cursor-pointer"
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                      onClick={() => setIsFlipped(!isFlipped)}
                    >
                      {/* Front */}
                      <div className="absolute inset-0 backface-hidden bg-white dark:bg-black neo-border p-8 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-16 h-16 neo-bg-blue border-2 border-black dark:border-white rounded-xl flex items-center justify-center text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <HelpCircle size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-black dark:text-white leading-relaxed">{flashcards[cardIndex].question}</h3>
                        <p className="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg border-2 border-black/10 dark:border-white/10">اضغط لقلب البطاقة</p>
                      </div>
                      {/* Back */}
                      <div 
                        className="absolute inset-0 backface-hidden neo-bg-yellow neo-border p-8 flex flex-col items-center justify-center text-center space-y-6 text-black"
                        style={{ transform: 'rotateY(180deg)' }}
                      >
                         <div className="w-16 h-16 bg-white border-2 border-black rounded-xl flex items-center justify-center text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <CheckCircle2 size={32} />
                        </div>
                        <p className="text-2xl font-black leading-relaxed">{flashcards[cardIndex].answer}</p>
                      </div>
                    </motion.div>
                  </div>
                  <div className="flex items-center justify-between">
                    <button onClick={() => { setIsFlipped(false); setCardIndex((p) => (p - 1 + flashcards.length) % flashcards.length); }} className="w-12 h-12 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white rounded-xl flex items-center justify-center neo-hover shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"><ChevronRight size={24} /></button>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-black text-black dark:text-white bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl border-2 border-black/10 dark:border-white/10">{cardIndex + 1} / {flashcards.length}</span>
                    </div>
                    <button onClick={() => { setIsFlipped(false); setCardIndex((p) => (p + 1) % flashcards.length); }} className="w-12 h-12 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white rounded-xl flex items-center justify-center neo-hover shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"><ChevronLeft size={24} /></button>
                  </div>
                </div>

                {/* All Flashcards List */}
                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-black dark:text-white flex items-center gap-3 px-2">
                    <div className="w-10 h-10 neo-bg-teal border-2 border-black dark:border-white rounded-lg flex items-center justify-center text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <BrainCircuit size={20} />
                    </div>
                    مراجعة كافة البطاقات
                  </h3>
                  <div className="grid grid-cols-1 gap-6">
                    {flashcards.map((fc, idx) => (
                      <div key={fc.id} className="bg-white dark:bg-[#1a1a1a] p-6 neo-border flex items-start justify-between gap-4 group neo-hover transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-4">
                            <span className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-lg flex items-center justify-center text-lg font-black flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] dark:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] border-2 border-black dark:border-white">{idx + 1}</span>
                            <h4 className="font-black text-xl text-black dark:text-white leading-tight">{fc.question}</h4>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 font-bold pr-[56px] leading-relaxed">{fc.answer}</p>
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
                className="text-center py-16 bg-white dark:bg-black neo-border space-y-4"
              >
                <div className="w-16 h-16 neo-bg-yellow border-2 border-black text-black rounded-xl flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  <Sparkles size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-black dark:text-white">سيتم إضافة محتوى قريباً</h3>
                  <p className="text-black/80 dark:text-white/80 font-bold">انتظرونا، نحن نعمل على توفير أفضل البطاقات التعليمية لك.</p>
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
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-black w-full max-w-md p-8 text-center space-y-6 neo-border neo-bg-pink"
            >
              <div className="w-20 h-20 bg-white border-2 border-black text-black rounded-xl flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <CheckCircle2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-black">كيف تتابع تقدمك؟</h3>
                <p className="text-black/80 font-bold leading-relaxed text-lg">
                  عند إكمال أي محاضرة أو قراءة ملزمة، اضغط على علامة الصح <span className="inline-flex items-center justify-center w-8 h-8 bg-white text-black border-2 border-black rounded-lg mx-1 align-middle shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"><CheckCircle2 size={16} /></span> بجانب المادة ليتم احتسابها في نسبة إنجازك.
                </p>
              </div>
              <button 
                onClick={closeTutorial}
                className="w-full py-4 bg-black text-white hover:neo-bg-yellow hover:text-black border-2 border-black rounded-xl font-black text-xl transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1"
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#1a1a1a] neo-border overflow-hidden w-full h-full max-h-[100dvh] flex flex-col"
            >
              <div className="p-4 flex items-center justify-between border-b-4 border-black dark:border-white neo-bg-teal dark:neo-bg-pink">
                <h3 className="font-black text-black text-xl line-clamp-1 flex-1 pr-4">{selectedVideo.title}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={closeVideoModal}
                    className="p-2 bg-white border-2 border-black text-black hover:neo-bg-red hover:text-white rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-black relative flex items-center justify-center border-t-2 border-black dark:border-white">
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#1a1a1a] neo-border overflow-hidden w-full h-full max-h-[100dvh] flex flex-col"
            >
              <div className="p-4 flex items-center justify-between border-b-4 border-black dark:border-white neo-bg-yellow">
                <h3 className="font-black text-black text-xl">عرض الملزمة</h3>
                <div className="flex items-center gap-2">
                  <a 
                    href={selectedPdf} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-white border-2 border-black text-black hover:neo-bg-blue hover:text-black rounded-xl transition-all font-black text-sm flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <ExternalLink size={18} />
                    فتح في لسان جديد
                  </a>
                  <button
                    onClick={() => setSelectedPdf(null)}
                    className="p-2 bg-white border-2 border-black text-black hover:neo-bg-red hover:text-white rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-slate-100 overflow-hidden border-t-2 border-black dark:border-white">
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
