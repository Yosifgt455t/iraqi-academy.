import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { Chapter, Subject } from '../types';
import { ListChecks, Loader2, ChevronLeft, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  subject: Subject;
  userId: string;
  onSelect: (chapter: Chapter) => void;
}

export default function ChapterSelector({ subject, userId, onSelect }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedMaterials, setCompletedMaterials] = useState<string[]>([]);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all chapters and filter locally to support both single subject (legacy) and multiple subjects (new)
        const chaptersSnap = await getDocs(collection(db, 'chapters'));
        const allChapters = chaptersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
        
        const filteredChapters = allChapters
          .filter(chap => {
            const chapterData = chap as any;
            if (chapterData.subjectIds && Array.isArray(chapterData.subjectIds)) {
              return chapterData.subjectIds.includes(subject.id);
            }
            return chapterData.subjectId === subject.id;
          })
          .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

        setChapters(filteredChapters);

        // Fetch all materials to calculate chapter progress
        const materialsSnap = await getDocs(collection(db, 'materials'));
        setAllMaterials(materialsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch user progress
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const progress = userData.completed_materials || [];
            setCompletedMaterials(progress);
          }
        } catch (profileErr) {
          console.warn('Could not fetch profile progress:', profileErr);
        }
      } catch (err) {
        console.error('Error fetching chapters from Firestore:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, [subject, userId]);

  const getChapterProgress = (chapterId: string) => {
    const chapterMaterials = allMaterials.filter(m => m.chapterId === chapterId);
    if (chapterMaterials.length === 0) return 0;
    const completedInChapter = chapterMaterials.filter(m => completedMaterials.includes(m.id)).length;
    return Math.round((completedInChapter / chapterMaterials.length) * 100);
  };

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
        {chapters.map((chapter) => {
          const progress = getChapterProgress(chapter.id);
          return (
            <button
              key={chapter.id}
              onClick={() => onSelect(chapter)}
              className="w-full flex flex-col p-5 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-blue-500 hover:bg-blue-50/30 transition-all group text-right"
            >
              <div className="flex items-center w-full mb-3">
                <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center ml-4 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors font-bold">
                  {chapter.orderIndex}
                </div>
                <span className="flex-1 text-lg font-medium text-slate-800">{chapter.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${progress === 100 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {progress}%
                  </span>
                  <ChevronLeft className="text-slate-300 group-hover:text-blue-500" />
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className={`h-full rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
