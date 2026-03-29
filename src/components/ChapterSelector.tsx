import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Chapter, Subject } from '../types';
import { ListChecks, Loader2, ChevronLeft } from 'lucide-react';

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
        setChapters([
          { id: 'c1', subject_id: subject.id, name: 'الفصل الأول: المتسعات', order_index: 1 },
          { id: 'c2', subject_id: subject.id, name: 'الفصل الثاني: الحث الكهرومغناطيسي', order_index: 2 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
  }, [subject]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

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
