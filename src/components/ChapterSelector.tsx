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
  teacherId?: string;
}

export default function ChapterSelector({ subject, userId, onSelect, teacherId }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedMaterials, setCompletedMaterials] = useState<string[]>([]);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch chapters related to this subject using queries
        const [chaptersSnap, legacyChaptersSnap] = await Promise.all([
          getDocs(query(collection(db, 'chapters'), where('subjectIds', 'array-contains', subject.id))),
          getDocs(query(collection(db, 'chapters'), where('subjectId', '==', subject.id)))
        ]);
        
        const allChaptersMap = new Map<string, Chapter>();
        chaptersSnap.docs.forEach(doc => allChaptersMap.set(doc.id, { id: doc.id, ...doc.data() } as Chapter));
        legacyChaptersSnap.docs.forEach(doc => allChaptersMap.set(doc.id, { id: doc.id, ...doc.data() } as Chapter));
        
        const filteredChapters = Array.from(allChaptersMap.values())
          .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

        setChapters(filteredChapters);

        // Fetch user progress
        let progress: string[] = [];
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            progress = userDoc.data().completed_materials || [];
            setCompletedMaterials(progress);
          }
        } catch (profileErr) {
          console.warn('Could not fetch profile progress:', profileErr);
        }

        // Only fetch materials if there are chapters and progress
        if (filteredChapters.length > 0) {
          const [materialsSnap, legacyMaterialsSnap] = await Promise.all([
            getDocs(query(collection(db, 'materials'), where('subjectIds', 'array-contains', subject.id))),
            getDocs(query(collection(db, 'materials'), where('subjectId', '==', subject.id)))
          ]);
          
          const materialsMap = new Map<string, any>();
          materialsSnap.docs.forEach(doc => materialsMap.set(doc.id, { id: doc.id, ...doc.data() }));
          legacyMaterialsSnap.docs.forEach(doc => materialsMap.set(doc.id, { id: doc.id, ...doc.data() }));
          
          setAllMaterials(Array.from(materialsMap.values()));
        }
      } catch (err) {
        console.error('Error fetching chapters from Firestore:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, [subject, userId]);

  const getChapterProgress = (chapterId: string) => {
    const chapterMaterials = allMaterials.filter((m: any) => {
      // Filter by chapter
      const belongsToChapter = (m.chapterIds && Array.isArray(m.chapterIds)) 
        ? m.chapterIds.includes(chapterId)
        : m.chapterId === chapterId;
        
      if (!belongsToChapter) return false;

      // Filter by teacher if selected
      if (teacherId) {
        return m.teacherId === teacherId || !m.teacherId;
      }
      
      return true;
    });
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
        className="text-center py-16 bg-white dark:bg-[#1a1a1a] neo-border space-y-4 neo-bg-pink"
      >
        <div className="w-16 h-16 bg-white border-2 border-black dark:border-white text-black rounded-full flex items-center justify-center mx-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
          <Sparkles size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-black dark:text-white">سيتم إضافة الفصول قريباً</h3>
          <p className="text-black/80 dark:text-white/80 font-bold">نحن نعمل على تجهيز المنهج الكامل لهذه المادة.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-3xl font-black text-black dark:text-white">فصول مادة {subject.name}</h2>
        <div className="h-1 flex-1 bg-black dark:bg-white rounded-full opacity-10"></div>
      </div>
      <div className="space-y-4">
        {chapters.map((chapter) => {
          const progress = getChapterProgress(chapter.id);
          return (
            <button
              key={chapter.id}
              onClick={() => onSelect(chapter)}
              className="w-full flex flex-col p-5 bg-white dark:bg-[#1a1a1a] neo-border hover:bg-slate-50 transition-all group text-right neo-hover"
            >
              <div className="flex items-center w-full mb-4">
                <div className="w-12 h-12 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white rounded-xl flex items-center justify-center ml-4 group-hover:scale-110 transition-transform font-black text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  {chapter.orderIndex}
                </div>
                <span className="flex-1 text-2xl font-black text-black dark:text-white">{chapter.name}</span>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-black px-3 py-1 border-2 border-black dark:border-white neo-border-sm ${progress === 100 ? 'neo-bg-teal text-white' : 'neo-bg-yellow text-black'}`}>
                    {progress}%
                  </span>
                  <ChevronLeft className="text-black dark:text-white opacity-20 group-hover:opacity-100 group-hover:-translate-x-2 transition-all" size={28} />
                </div>
              </div>
              <div className="w-full h-3 border-2 border-black dark:border-white bg-slate-50 dark:bg-black rounded-full overflow-hidden inset-shadow">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className={`h-full border-l-2 border-black dark:border-white ${progress === 100 ? 'neo-bg-teal' : 'neo-bg-pink'}`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
