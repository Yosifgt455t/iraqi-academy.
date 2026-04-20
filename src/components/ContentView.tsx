import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { Material, Flashcard, Chapter, Grade } from '../types';
import { FileText, Play, BrainCircuit, ExternalLink, Loader2, ChevronRight, ChevronLeft, RefreshCcw, HelpCircle, CheckCircle2, X, CheckCircle, Sparkles, Award, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactPlayer from 'react-player';

const Player = ReactPlayer as any;

interface Props {
  chapter: Chapter;
  userId: string;
  grade: Grade;
  onAskAI?: (prompt: string) => void;
}

export default function ContentView({ chapter, userId, grade, onAskAI }: Props) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
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
  const playRequestTimeRef = useRef<number>(0);

  const openVideoModal = (m: Material) => {
    setSelectedVideo(m);
    setIsModalOpen(true);
  };

  const [videoProgress, setVideoProgress] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem(`videoProgress_${userId}`);
    return saved ? JSON.parse(saved) : {};
  });

  const closeVideoModal = () => {
    const now = Date.now();
    const timeSincePlay = now - playRequestTimeRef.current;
    if (timeSincePlay > 1000) {
      setIsModalPlaying(false);
    }
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedVideo(null);
    }, 300);
  };

  useEffect(() => {
    if (selectedVideo) {
      const timer = setTimeout(() => {
        setIsModalPlaying(true);
        playRequestTimeRef.current = Date.now();
      }, 600);
      return () => {
        clearTimeout(timer);
        setIsModalPlaying(false);
        playRequestTimeRef.current = 0;
      };
    } else {
      setIsModalPlaying(false);
      playRequestTimeRef.current = 0;
    }
  }, [selectedVideo]);

  const getPdfSource = (url: string) => {
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

  const getYoutubeUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return url;
    if (url.length === 11) return `https://www.youtube.com/watch?v=${url}`;
    return url;
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
        // Fetch materials for this chapter
        const materialsQuery = query(collection(db, 'materials'), where('chapterId', '==', chapter.id));
        const materialsSnap = await getDocs(materialsQuery);
        setMaterials(materialsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material)));
        
        // Fetch flashcards for this chapter
        const flashcardsQuery = query(collection(db, 'flashcards'), where('chapterId', '==', chapter.id));
        const flashcardsSnap = await getDocs(flashcardsQuery);
        setFlashcards(flashcardsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Flashcard)));

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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="space-y-8">
      {/* Chapter Progress Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-100"
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
          <div className="absolute inset-0 flex items-center justify-center font-bold text-slate-900">
            {chapterProgress}%
          </div>
        </div>
        <div className="flex-1 text-center sm:text-right">
          <h2 className="text-xl font-bold text-slate-900">تقدمك في {chapter.name}</h2>
          <p className="text-slate-500 text-sm">أكمل كافة المحاضرات والمصادر لإنهاء الفصل بنسبة 100%</p>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm max-w-md mx-auto overflow-x-auto">
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
            className="text-center py-16 bg-red-50 rounded-3xl border border-red-200 space-y-4"
          >
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
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
            {materials.filter(m => m.type !== 'Ministerial').length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {materials.filter(m => m.type !== 'Ministerial').map((m) => {
                  const isCompleted = completedIds.includes(m.id);
                  return (
                    <div key={m.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col relative group overflow-hidden">
                      <div className="p-4 sm:p-5 flex items-start sm:items-center gap-3 sm:gap-4 relative z-10 bg-white">
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
                          <h4 className={`font-bold transition-colors text-sm sm:text-base leading-relaxed break-words ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {m.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1">{m.type === 'PDF' ? 'ملف PDF قابل للتحميل' : 'محاضرة فيديو يوتيوب'}</p>
                          {m.type !== 'PDF' && (
                            <div className="mt-3 w-full max-w-[200px] bg-slate-100 rounded-full h-1.5 overflow-hidden flex items-center">
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
                            className={`p-2 rounded-lg transition-all ${expandedMaterialId === m.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            title="عرض سريع"
                          >
                            <Eye size={20} />
                          </button>
                          {onAskAI && (
                            <button
                              onClick={() => {
                                if (m.type === 'Video') {
                                  onAskAI(`اشرح لي ولخص هذه المحاضرة (فيديو يوتيوب): ${m.url || (m as any).content}\n\nعنوان المحاضرة: ${m.title} (فصل ${chapter.name})`);
                                } else {
                                  onAskAI(`أريد شرح هذا الموضوع: ${m.title} في فصل ${chapter.name}. (ملاحظة: إذا كان لديك ملف PDF يرجى إرفاقه في المحادثة باستخدام زر الإرفاق 📎 لكي أتمكن من قراءته وشرحه لك).`);
                                }
                              }}
                              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                              title="اشرح لي بالذكاء الاصطناعي"
                            >
                              <Sparkles size={20} />
                            </button>
                          )}
                          {m.type === 'PDF' ? (
                            <button
                              onClick={() => setSelectedPdf(m.url || (m as any).content)}
                              className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="عرض بشاشة كاملة"
                            >
                              <ExternalLink size={20} />
                            </button>
                          ) : (
                            <button
                              onClick={() => openVideoModal(m)}
                              className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
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
                                  <Player
                                    url={getYoutubeUrl(m.url || (m as any).content)}
                                    width="100%"
                                    height="100%"
                                    controls
                                    playing={false}
                                    onProgress={(progress: any) => handleVideoProgress(m.id, progress.played)}
                                    style={{ position: 'absolute', top: 0, left: 0 }}
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
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 space-y-4"
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
            className="space-y-4"
          >
            {materials.filter(m => m.type === 'Ministerial').length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {materials.filter(m => m.type === 'Ministerial').map((m) => {
                  const isCompleted = completedIds.includes(m.id);
                  return (
                    <div key={m.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col relative group overflow-hidden">
                      <div className="p-4 sm:p-5 flex items-start sm:items-center gap-3 sm:gap-4 relative z-10 bg-white">
                        <div className="p-3 sm:p-4 rounded-xl bg-purple-50 text-purple-600 flex-shrink-0 mt-1 sm:mt-0">
                          <Award size={24} />
                        </div>
                        <div className="flex-1 min-w-0 pr-1">
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-relaxed break-words">
                            {m.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-2">أسئلة وزارية مع الحلول</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => setExpandedMaterialId(expandedMaterialId === m.id ? null : m.id)}
                            className={`p-2 rounded-lg transition-all ${expandedMaterialId === m.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            title="عرض سريع"
                          >
                            <Eye size={20} />
                          </button>
                          <button
                            onClick={() => setSelectedPdf(m.url)}
                            className="p-2 bg-slate-50 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                            title="عرض بشاشة كاملة"
                          >
                            <ExternalLink size={20} />
                          </button>
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
                                <iframe
                                  src={getPdfSource(m.url)}
                                  className="w-full h-80 sm:h-96 rounded-xl border border-slate-200"
                                  title="PDF Quick View"
                                ></iframe>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 space-y-4"
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
                      <div className="absolute inset-0 backface-hidden bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
                        <HelpCircle size={40} className="text-blue-500" />
                        <h3 className="text-xl font-bold text-slate-800">{flashcards[cardIndex].question}</h3>
                        <p className="text-xs text-slate-400">اضغط لقلب البطاقة</p>
                      </div>
                      {/* Back */}
                      <div 
                        className="absolute inset-0 backface-hidden bg-blue-600 rounded-3xl p-8 shadow-xl flex flex-col items-center justify-center text-center space-y-4 text-white"
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
                      {onAskAI && (
                        <button
                          onClick={() => onAskAI(`اشرح لي هذا السؤال من فضلك: ${flashcards[cardIndex].question} وجوابه هو: ${flashcards[cardIndex].answer}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                        >
                          <Sparkles size={16} />
                          اشرح لي
                        </button>
                      )}
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
                        {onAskAI && (
                          <button
                            onClick={() => onAskAI(`اشرح لي هذا السؤال من فضلك: ${fc.question} وجوابه هو: ${fc.answer}`)}
                            className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm flex-shrink-0"
                            title="اشرح لي بالذكاء الاصطناعي"
                          >
                            <Sparkles size={20} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 space-y-4"
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
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl"
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
              className="bg-black rounded-xl sm:rounded-2xl overflow-hidden w-full h-full max-h-[100dvh] flex flex-col shadow-2xl"
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
                <Player
                  url={getYoutubeUrl(selectedVideo.url || (selectedVideo as any).content)}
                  width="100%"
                  height="100%"
                  controls
                  playing={isModalPlaying}
                  onReady={() => setIsPlayerReady(true)}
                  onProgress={(progress: any) => handleVideoProgress(selectedVideo.id, progress.played)}
                  style={{ position: 'absolute', top: 0, left: 0 }}
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
              className="bg-white rounded-xl sm:rounded-2xl overflow-hidden w-full h-full max-h-[100dvh] shadow-2xl flex flex-col"
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
