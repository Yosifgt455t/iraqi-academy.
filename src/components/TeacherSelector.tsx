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
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-500 font-bold">جاري البحث عن المدرسين...</p>
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <Users size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">لا يوجد مدرسون مضافون</h2>
          <p className="text-slate-500">جاري العمل على إضافة مدرسين لهذه المادة قريباً.</p>
        </div>
        <button 
          onClick={() => onSelect(null)}
          className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100"
        >
          تصفح المادة بدون مدرس
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir="rtl">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <GraduationCap size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900">اختر مدرسك المفضل</h2>
        <p className="text-slate-500">اختر المدرس الذي ترغب بمتابعة محاضراته في مادة {subject.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {teachers.map((teacher, index) => (
          <motion.button
            key={teacher.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(teacher)}
            className="p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group text-right flex items-center gap-5"
          >
            <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-4 border-slate-50 group-hover:border-blue-50 flex-shrink-0 transition-all">
              {teacher.avatar ? (
                <img src={teacher.avatar} className="w-full h-full object-cover" alt={teacher.name} referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <GraduationCap size={40} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-black text-slate-900 text-xl group-hover:text-blue-600 transition-colors">
                أ. {teacher.name}
              </h4>
              <p className="text-sm text-slate-500 font-bold mt-1">عرض المحاضرات والشروحات</p>
            </div>
            <ChevronLeft className="text-slate-300 group-hover:text-blue-500 transition-colors group-hover:translate-x-1" />
          </motion.button>
        ))}
      </div>

      <div className="pt-8 text-center">
        <button 
          onClick={() => onSelect(null)}
          className="text-slate-400 font-bold text-sm hover:text-blue-600 transition-colors"
        >
          تخطي واختيار المادة بشكل عام
        </button>
      </div>
    </div>
  );
}
