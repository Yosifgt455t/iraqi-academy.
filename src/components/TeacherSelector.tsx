import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Subject, Teacher } from '../types';
import { motion } from 'motion/react';
import { GraduationCap, ChevronLeft, Loader2, Users } from 'lucide-react';

interface Props {
  subject: Subject;
  onSelect: (teacher: Teacher | null) => void;
}

export default function TeacherSelector({ subject, onSelect }: Props) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const q = query(collection(db, 'teachers'), where('subjectId', '==', subject.id));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
        
        setTeachers(list);
        
        // If no teachers or only one, we can skip or auto-select later
        // But for now we let Dashboard handle the logic if list.length <= 1
      } catch (err) {
        console.error('Error fetching teachers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, [subject.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-black dark:text-white" size={40} />
        <p className="text-black/60 dark:text-white/60 font-black">جاري البحث عن المدرسين...</p>
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="text-center py-20 space-y-6 neo-border bg-white dark:bg-black neo-bg-yellow p-8">
        <div className="w-20 h-20 bg-white border-4 border-black dark:border-white text-black rounded-full flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Users size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-black">لا يوجد مدرسون مضافون</h2>
          <p className="text-black/80 font-bold text-lg">جاري العمل على إضافة مدرسين لهذه المادة قريباً.</p>
        </div>
        <button 
          onClick={() => onSelect(null)}
          className="px-8 py-4 bg-white border-2 border-black text-black rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-lg"
        >
          تصفح المادة بدون مدرس
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <div className="text-center space-y-6 neo-border bg-white dark:bg-black neo-bg-teal py-10 px-4">
        <div className="w-24 h-24 bg-white border-4 border-black text-black rounded-full flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <GraduationCap size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-black">اختر مدرسك المفضل</h2>
          <p className="text-black/80 font-bold text-lg">اختر المدرس الذي ترغب بمتابعة محاضراته في مادة {subject.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {teachers.map((teacher, index) => (
          <motion.button
            key={teacher.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(teacher)}
            className="p-6 bg-white dark:bg-[#1a1a1a] neo-border transition-all group text-right flex items-center gap-5 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white border-4 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex-shrink-0 transition-transform group-hover:scale-105">
              {teacher.avatar ? (
                <img src={teacher.avatar} className="w-full h-full object-cover" alt={teacher.name} referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100 text-black">
                  <GraduationCap size={40} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-black text-black dark:text-white text-2xl group-hover:text-amber-500 transition-colors">
                أ. {teacher.name}
              </h4>
              <p className="text-sm text-black/60 dark:text-white/60 font-bold mt-2 bg-slate-100 dark:bg-slate-800 border-2 border-black dark:border-white px-3 py-1 inline-block rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">محاضرات وشروحات</p>
            </div>
            <ChevronLeft className="text-black dark:text-white opacity-20 group-hover:opacity-100 transition-all group-hover:-translate-x-2" size={32} />
          </motion.button>
        ))}
      </div>

      <div className="pt-8 text-center">
        <button 
          onClick={() => onSelect(null)}
          className="text-black/60 dark:text-white/60 font-black text-lg hover:text-black dark:hover:text-white transition-colors underline decoration-2 underline-offset-4"
        >
          تخطي واختيار المادة بشكل عام
        </button>
      </div>
    </div>
  );
}
