import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { Subject, Grade } from '../types';
import { Book, Atom, Calculator, FlaskConical, Languages, Loader2, ChevronLeft, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  grade: Grade;
  userId: string;
  onSelect: (subject: Subject) => void;
}

const iconMap: Record<string, any> = {
  'الفيزياء': Atom,
  'الرياضيات': Calculator,
  'الكيمياء': FlaskConical,
  'الأحياء': Book,
  'اللغة العربية': Languages,
};

export default function SubjectSelector({ grade, userId, onSelect }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedMaterials, setCompletedMaterials] = useState<string[]>([]);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);
  const [allChapters, setAllChapters] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { query, where } = await import('firebase/firestore');
        
        // Fetch Subjects for this grade using targeted queries in parallel
        const [subjectsSnap, subjectsSnapLegacy] = await Promise.all([
          getDocs(query(collection(db, 'subjects'), where('grades', 'array-contains', grade))),
          getDocs(query(collection(db, 'subjects'), where('grade', '==', grade)))
        ]);

        const subjectsSet = new Map();
        subjectsSnap.docs.forEach(d => subjectsSet.set(d.id, { id: d.id, ...d.data() }));
        subjectsSnapLegacy.docs.forEach(d => subjectsSet.set(d.id, { id: d.id, ...d.data() }));
        
        const filteredSubjects = Array.from(subjectsSet.values()) as Subject[];
        setSubjects(filteredSubjects);

        // Fetch User profile (completed materials)
        const userDoc = await getDoc(doc(db, 'users', userId));
        const completed = userDoc.exists() ? (userDoc.data().completed_materials || []) : [];
        setCompletedMaterials(completed);

        // Fetch only related chapters if there are subjects
        if (filteredSubjects.length > 0) {
          const subjectIds = filteredSubjects.map(s => s.id);
          
          // Instead of fetching all chapters/materials (which is very slow), 
          // we fetch them in chunks of 30, but wait, `in` can only take 30.
          // array-contains-any can only take 10.
          // Doing multiple queries is much faster than downloading the whole DB.
          
          let allChaptersList: any[] = [];
          let allMaterialsList: any[] = [];

          // Split subjectIds into chunks of 10 for array-contains-any
          for (let i = 0; i < subjectIds.length; i += 10) {
            const chunk = subjectIds.slice(i, i + 10);
            const [chapSnap1, chapSnap2] = await Promise.all([
              getDocs(query(collection(db, 'chapters'), where('subjectIds', 'array-contains-any', chunk))),
              getDocs(query(collection(db, 'chapters'), where('subjectId', 'in', chunk)))
            ]);
            chapSnap1.docs.forEach(d => allChaptersList.push({ id: d.id, ...d.data() }));
            chapSnap2.docs.forEach(d => allChaptersList.push({ id: d.id, ...d.data() }));

            const [matSnap1, matSnap2] = await Promise.all([
              getDocs(query(collection(db, 'materials'), where('subjectIds', 'array-contains-any', chunk))),
              getDocs(query(collection(db, 'materials'), where('subjectId', 'in', chunk)))
            ]);
            matSnap1.docs.forEach(d => allMaterialsList.push({ id: d.id, ...d.data() }));
            matSnap2.docs.forEach(d => allMaterialsList.push({ id: d.id, ...d.data() }));
          }

          // Deduplicate
          const uniqueChaptersMap = new Map();
          allChaptersList.forEach(c => uniqueChaptersMap.set(c.id, c));
          setAllChapters(Array.from(uniqueChaptersMap.values()));

          const uniqueMaterialsMap = new Map();
          allMaterialsList.forEach(m => uniqueMaterialsMap.set(m.id, m));
          setAllMaterials(Array.from(uniqueMaterialsMap.values()));
        }
      } catch (err) {
        console.error('Error fetching subjects data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [grade, userId]);

  const getSubjectProgress = (subjectId: string) => {
    // 1. Find all chapters belonging to this subject
    const subjectChapterIds = allChapters.filter(c => {
      if (c.subjectIds && Array.isArray(c.subjectIds)) {
        return c.subjectIds.includes(subjectId);
      }
      return c.subjectId === subjectId;
    }).map(c => c.id);

    // 2. Find all materials that belong to either this subject directly, or to any of its chapters
    const subjectMaterials = allMaterials.filter((m: any) => {
      if (m.subjectIds && Array.isArray(m.subjectIds) && m.subjectIds.includes(subjectId)) return true;
      if (m.subjectId === subjectId) return true;
      
      if (m.chapterIds && Array.isArray(m.chapterIds)) {
        return m.chapterIds.some((cId: string) => subjectChapterIds.includes(cId));
      }
      return subjectChapterIds.includes(m.chapterId);
    });

    if (subjectMaterials.length === 0) return 0;
    const completedInSubject = subjectMaterials.filter(m => completedMaterials.includes(m.id)).length;
    return Math.round((completedInSubject / subjectMaterials.length) * 100);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  if (subjects.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20 px-6 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6"
      >
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <Sparkles size={40} />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">سيتم إضافة المواد قريباً</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            نحن نعمل حالياً على تجهيز أفضل المصادر التعليمية لهذا الصف الدراسي. ترقبونا قريباً!
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center">اختر المادة الدراسية</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {subjects.map((subject) => {
          const Icon = iconMap[subject.name] || Book;
          const progress = getSubjectProgress(subject.id);
          return (
            <button
              key={subject.id}
              onClick={() => onSelect(subject)}
              className="flex flex-col p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 group text-right"
            >
              <div className="flex items-center w-full mb-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl ml-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Icon size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{subject.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">تصفح الفصول والمصادر</p>
                </div>
                <ChevronLeft className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400" />
              </div>
              
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-blue-600 dark:text-blue-400">اكتملت بنسبة {progress}%</span>
                  <span className="text-slate-400 dark:text-slate-500">التقدم الكلي</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-blue-600 rounded-full"
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
