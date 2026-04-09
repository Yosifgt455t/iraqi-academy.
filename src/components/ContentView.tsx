import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Material, Flashcard, Chapter, Grade } from '../types';
import { FileText, Play, BrainCircuit, ExternalLink, Loader2, ChevronRight, ChevronLeft, RefreshCcw, HelpCircle, CheckCircle2, X, CheckCircle, Sparkles, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { localMaterials } from '../data/curriculum';

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
  const [activeTab, setActiveTab] = useState<'materials' | 'flashcards' | 'ministerial'>('materials');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('tutorial_completed'));

  const isMinisterialGrade = ['primary_6', 'middle_3', 'secondary_6_sci', 'secondary_6_lit'].includes(grade);
  
  const chapterProgress = materials.length > 0 
    ? Math.round((materials.filter(m => completedIds.includes(m.id)).length / materials.length) * 100)
    : 0;

  const closeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('tutorial_completed', 'true');
  };
  
  // Flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      console.log('Fetching materials for chapter:', chapter.id);
      try {
        const { data, error } = await supabase
          .from('materials')
          .select('*')
          .eq('chapter_id', chapter.id)
          .order('order_index', { ascending: true });

        if (error) throw error;
        
        console.log('Supabase materials data:', data);
        
        if (data && data.length > 0) {
          setMaterials(data);
        } else {
          setMaterials(localMaterials[chapter.id] || []);
        }
      } catch (err) {
        console.error('Error fetching materials from Supabase:', err);
        setMaterials(localMaterials[chapter.id] || []);
      }
      
      setFlashcards([]);
      
      const savedProgress = localStorage.getItem(`progress_${userId}`);
      if (savedProgress) {
        setCompletedIds(JSON.parse(savedProgress));
      }
      setLoading(false);
    };
    fetchData();
  }, [chapter, userId]);

  const toggleCompletion = (materialId: string) => {
    const isCompleted = completedIds.includes(materialId);
    const newCompletedIds = isCompleted 
      ? completedIds.filter(id => id !== materialId)
      : [...completedIds, materialId];
    
    setCompletedIds(newCompletedIds);
    localStorage.setItem(`progress_${userId}`, JSON.stringify(newCompletedIds));
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
        {activeTab === 'materials' ? (
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
                    <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4 space-x-reverse relative group">
                      <button
                        onClick={() => toggleCompletion(m.id)}
                        className={`absolute -top-2 -left-2 p-1.5 rounded-full shadow-md transition-all z-10 ${
                          isCompleted ? 'bg-green-500 text-white' : 'bg-white text-slate-300 hover:text-green-500'
                        }`}
                        title={isCompleted ? 'تم الإكمال' : 'تحديد كمكتمل'}
                      >
                        <CheckCircle size={16} />
                      </button>
                      
                      <div className={`p-4 rounded-xl transition-colors ${
                        isCompleted 
                          ? 'bg-green-50 text-green-600' 
                          : m.type === 'PDF' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {m.type === 'PDF' ? <FileText size={24} /> : <Play size={24} />}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-bold transition-colors ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {m.title}
                        </h4>
                        <p className="text-xs text-slate-500">{m.type === 'PDF' ? 'ملف PDF قابل للتحميل' : 'محاضرة فيديو يوتيوب'}</p>
                      </div>
                        {m.type === 'PDF' ? (
                          <div className="flex items-center gap-2">
                            {onAskAI && (
                              <button
                                onClick={() => onAskAI(`اشرح لي محتوى هذا الملف: ${m.title} في فصل ${chapter.name}`)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                title="اشرح لي بالذكاء الاصطناعي"
                              >
                                <Sparkles size={20} />
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedPdf(m.url || (m as any).content)}
                              className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <ExternalLink size={20} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedVideo(getEmbedUrl(m.url || (m as any).content))}
                            className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Play size={20} />
                          </button>
                        )}
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
                    <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4 space-x-reverse relative group">
                      <div className="p-4 rounded-xl bg-purple-50 text-purple-600">
                        <Award size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">
                          {m.title}
                        </h4>
                        <p className="text-xs text-slate-500">أسئلة وزارية مع الحلول</p>
                      </div>
                      <button
                        onClick={() => setSelectedPdf(m.url)}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                      >
                        <ExternalLink size={20} />
                      </button>
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
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl overflow-hidden w-full max-w-4xl shadow-2xl"
            >
              <div className="p-4 flex items-center justify-between border-b border-slate-100">
                <h3 className="font-bold text-slate-900">مشاهدة المحاضرة</h3>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="aspect-video bg-black">
                <iframe
                  src={selectedVideo}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl overflow-hidden w-full h-full max-w-5xl max-h-[90vh] shadow-2xl flex flex-col"
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
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(selectedPdf)}&embedded=true`}
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
