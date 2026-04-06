import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Grade } from '../types';
import { GraduationCap, ChevronLeft, BookOpen, School, Award, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  userId: string;
  onComplete: (grade: Grade) => void;
}

type Category = 'primary' | 'middle' | 'secondary' | null;

export default function GradeSelector({ userId, onComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<Category>(null);

  const selectGrade = async (grade: Grade) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: userId, grade });
      
      if (error) throw error;
      onComplete(grade);
    } catch (err) {
      console.error('Error saving grade:', err);
      // Fallback for demo
      onComplete(grade);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'primary', name: 'المرحلة الابتدائية', icon: <School className="w-8 h-8" />, color: 'bg-emerald-100 text-emerald-600' },
    { id: 'middle', name: 'المرحلة المتوسطة', icon: <BookOpen className="w-8 h-8" />, color: 'bg-amber-100 text-amber-600' },
    { id: 'secondary', name: 'المرحلة الإعدادية', icon: <Award className="w-8 h-8" />, color: 'bg-blue-100 text-blue-600' },
  ];

  const grades = {
    primary: [
      { id: 'primary_1', name: 'الأول الابتدائي' },
      { id: 'primary_2', name: 'الثاني الابتدائي' },
      { id: 'primary_3', name: 'الثالث الابتدائي' },
      { id: 'primary_4', name: 'الرابع الابتدائي' },
      { id: 'primary_5', name: 'الخامس الابتدائي' },
      { id: 'primary_6', name: 'السادس الابتدائي' },
    ],
    middle: [
      { id: 'middle_1', name: 'الأول المتوسط' },
      { id: 'middle_2', name: 'الثاني المتوسط' },
      { id: 'middle_3', name: 'الثالث المتوسط' },
    ],
    secondary: [
      { id: 'secondary_4_sci', name: 'الرابع العلمي' },
      { id: 'secondary_4_lit', name: 'الرابع الأدبي' },
      { id: 'secondary_5_sci', name: 'الخامس العلمي' },
      { id: 'secondary_5_lit', name: 'الخامس الأدبي' },
      { id: 'secondary_6_sci', name: 'السادس العلمي' },
      { id: 'secondary_6_lit', name: 'السادس الأدبي' },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-12 pt-12">
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-100 mb-4"
          >
            <GraduationCap size={40} />
          </motion.div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">اختر مرحلتك الدراسية</h1>
          <p className="text-xl text-slate-600">لنتمكن من عرض المنهج المناسب لك</p>
        </div>

        <AnimatePresence mode="wait">
          {!category ? (
            <motion.div 
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id as Category)}
                  className="group bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 hover:border-blue-500 transition-all text-center space-y-4"
                >
                  <div className={`w-16 h-16 ${cat.color} rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform`}>
                    {cat.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{cat.name}</h3>
                  <div className="flex items-center justify-center text-blue-600 font-medium gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    عرض الصفوف
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="grades"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button 
                onClick={() => setCategory(null)}
                className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium transition-colors mb-4"
              >
                <ArrowRight className="w-5 h-5" />
                العودة للمراحل الرئيسية
              </button>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grades[category].map((grade) => (
                  <button
                    key={grade.id}
                    disabled={loading}
                    onClick={() => selectGrade(grade.id as Grade)}
                    className="bg-white p-6 rounded-2xl shadow-md border border-slate-100 hover:border-blue-500 hover:shadow-lg transition-all text-right group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-slate-800">{grade.name}</span>
                      <ChevronLeft className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
