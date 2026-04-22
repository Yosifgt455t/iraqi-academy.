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
        // Fetch All Subjects and filter locally to support both single grade (legacy) and multiple grades (new)
        const subjectsSnap = await getDocs(collection(db, 'subjects'));
        const allSubjects = subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
        
        const filteredSubjects = allSubjects.filter(sub => {
          if (sub.grades && Array.isArray(sub.grades)) {
            return sub.grades.includes(grade);
          }
          return sub.grade === grade;
        });
        
        setSubjects(filteredSubjects);

        // Fetch Chapters structure to map subjects properly
        const chaptersSnap = await getDocs(collection(db, 'chapters'));
        setAllChapters(chaptersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Materials (for progress calculation)
        const materialsSnap = await getDocs(collection(db, 'materials'));
        setAllMaterials(materialsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch User profile (completed materials) - Using getDoc instead of query
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            setCompletedMaterials(userDoc.data().completed_materials || []);
          }
        } catch (profileErr) {
          console.warn('Could not fetch profile, progress might be inaccurate:', profileErr);
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
        className="text-center py-20 px-6 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6"
      >
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <Sparkles size={40} />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-900">سيتم إضافة المواد قريباً</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            نحن نعمل حالياً على تجهيز أفضل المصادر التعليمية لهذا الصف الدراسي. ترقبونا قريباً!
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 text-center">اختر المادة الدراسية</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {subjects.map((subject) => {
          const Icon = iconMap[subject.name] || Book;
          const progress = getSubjectProgress(subject.id);
          return (
            <button
              key={subject.id}
              onClick={() => onSelect(subject)}
              className="flex flex-col p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 group text-right"
            >
              <div className="flex items-center w-full mb-4">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-xl ml-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Icon size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900">{subject.name}</h3>
                  <p className="text-sm text-slate-500">تصفح الفصول والمصادر</p>
                </div>
                <ChevronLeft className="text-slate-300 group-hover:text-blue-500" />
              </div>
              
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-blue-600">اكتملت بنسبة {progress}%</span>
                  <span className="text-slate-400">التقدم الكلي</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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
