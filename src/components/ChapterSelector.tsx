import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Chapter, Subject } from '../types';
import { ListChecks, Loader2, ChevronLeft, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  subject: Subject;
  onSelect: (chapter: Chapter) => void;
}

export default function ChapterSelector({ subject, onSelect }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChapters = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('chapters')
          .select('*')
          .eq('subject_id', subject.id)
          .order('order_index', { ascending: true });
        
        if (error) throw error;
        setChapters(data || []);
      } catch (err) {
        console.error('Error fetching chapters:', err);
        setChapters([]);
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
  }, [subject]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  if (chapters.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 space-y-4"
      >
        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
          <Sparkles size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-900">سيتم إضافة الفصول قريباً</h3>
          <p className="text-slate-500 text-sm">نحن نعمل على تجهيز المنهج الكامل لهذه المادة.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">فصول مادة {subject.name}</h2>
        <p className="text-slate-500">اختر الفصل الذي تريد دراسته</p>
      </div>
      <div className="space-y-3">
        {chapters.map((chapter) => (
          <button
            key={chapter.id}
            onClick={() => onSelect(chapter)}
            className="w-full flex items-center p-5 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-blue-500 hover:bg-blue-50/30 transition-all group text-right"
          >
            <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center ml-4 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors font-bold">
              {chapter.order_index}
            </div>
            <span className="flex-1 text-lg font-medium text-slate-800">{chapter.name}</span>
            <ChevronLeft className="text-slate-300 group-hover:text-blue-500" />
          </button>
        ))}
      </div>
    </div>
  );
}
