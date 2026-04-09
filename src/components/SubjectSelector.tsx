import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Subject, Grade } from '../types';
import { Book, Atom, Calculator, FlaskConical, Languages, Loader2, ChevronLeft, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { localSubjects } from '../data/curriculum';

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

  useEffect(() => {
    const fetchData = async () => {
      if (!grade) return;
      
      setLoading(true);
      console.log('🔍 Fetching subjects for grade:', grade);
      
      try {
        // 1. Fetch from Supabase
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .eq('grade', grade);

        if (error) throw error;
        
        // 2. Safety Net: Manual filter in JS to be 100% sure
        const filteredData = (data || []).filter(s => s.grade === grade);
        
        console.log(`✅ Supabase returned ${data?.length || 0} items. After manual filter: ${filteredData.length}`);
        
        if (filteredData.length > 0) {
          setSubjects(filteredData);
        } else {
          // 3. Fallback to local data ONLY for the current grade
          console.log('⚠️ No subjects found in DB for this grade, using local fallback');
          const filteredLocal = localSubjects.filter(s => s.grade === grade);
          setSubjects(filteredLocal);
        }
      } catch (err) {
        console.error('❌ Error fetching subjects:', err);
        // Fallback to local on error
        setSubjects(localSubjects.filter(s => s.grade === grade));
      }
      
      const savedProgress = localStorage.getItem(`progress_${userId}`);
      if (savedProgress) {
        setCompletedMaterials(JSON.parse(savedProgress));
      }
      setLoading(false);
    };
    fetchData();
  }, [grade, userId]);

  const getSubjectProgress = (subjectId: string) => {
    // For now, return a static progress or calculate based on local materials if available
    return 0; 
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
              className="flex flex-col p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all group text-right"
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
