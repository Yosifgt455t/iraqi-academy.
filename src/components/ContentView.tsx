import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Material, Flashcard, Chapter } from '../types';
import { FileText, Play, BrainCircuit, ExternalLink, Loader2, ChevronRight, ChevronLeft, RefreshCcw, HelpCircle, CheckCircle2, X, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  chapter: Chapter;
  userId: string;
}

export default function ContentView({ chapter, userId }: Props) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'materials' | 'flashcards'>('materials');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  
  // Flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [mRes, fRes, pRes] = await Promise.all([
          supabase.from('materials').select('*').eq('chapter_id', chapter.id),
          supabase.from('flashcards').select('*').eq('chapter_id', chapter.id),
          supabase.from('profiles').select('completed_materials').eq('id', userId).single()
        ]);
        
        setMaterials(mRes.data || []);
        setFlashcards(fRes.data || []);
        setCompletedIds(pRes.data?.completed_materials || []);
      } catch (err) {
        console.error('Error fetching content:', err);
        // Mock
        setMaterials([
          { id: 'm1', chapter_id: chapter.id, title: 'ملزمة الفصل كاملة', type: 'PDF', url: '#' },
          { id: 'm2', chapter_id: chapter.id, title: 'محاضرة 1: الأساسيات', type: 'Video', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
        ]);
        setFlashcards([
          { id: 'f1', chapter_id: chapter.id, question: 'ما هو تعريف المتسعة؟', answer: 'جهاز لتخزين الشحنات.' },
          { id: 'f2', chapter_id: chapter.id, question: 'سؤال تجريبي آخر؟', answer: 'جواب تجريبي.' }
        ]);
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

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ completed_materials: newCompletedIds })
        .eq('id', userId);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error updating completion status:', err);
      // Revert on error
      setCompletedIds(completedIds);
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
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm max-w-sm mx-auto">
        <button
          onClick={() => setActiveTab('materials')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'materials' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          المصادر والمحاضرات
        </button>
        <button
          onClick={() => setActiveTab('flashcards')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
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
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {materials.map((m) => {
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
                    <button
                      onClick={() => setSelectedPdf(m.url)}
                      className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <ExternalLink size={20} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedVideo(getEmbedUrl(m.url))}
                      className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Play size={20} />
                    </button>
                  )}
                </div>
              );
            })}
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
                  <span className="text-sm font-bold text-slate-500">{cardIndex + 1} / {flashcards.length}</span>
                  <button onClick={() => { setIsFlipped(false); setCardIndex((p) => (p + 1) % flashcards.length); }} className="p-3 bg-white rounded-full shadow-sm hover:bg-slate-50"><ChevronLeft /></button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">لا توجد اختبارات لهذا الفصل حالياً.</div>
            )}
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
