import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Grade } from '../types';
import { GraduationCap, ChevronLeft, BookOpen, School, Award, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  userId: string;
  onComplete: (grade: Grade) => void;
}

type Category = 'primary' | 'middle' | 'secondary' | null;

export default function GradeSelector({ userId, onComplete }: Props) {
  const [loading, setLoading] = useState(false);

  const selectGrade = async (grade: Grade) => {
    if (userId === 'guest_user') {
      onComplete(grade);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: userId, 
          grade,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      onComplete(grade);
    } catch (err) {
      console.error('Error saving grade:', err);
      onComplete(grade);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-12 pt-12">
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-100 mb-4"
          >
            <GraduationCap size={40} />
          </motion.div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">أهلاً بك في عراقي أكاديمي</h1>
          <p className="text-xl text-slate-600">اضغط على صفك الدراسي للبدء</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <button
            disabled={loading}
            onClick={() => selectGrade('secondary_5_sci')}
            className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-xl shadow-blue-100/20 border-2 border-transparent hover:border-blue-500 transition-all text-center group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4">
              <Sparkles className="text-blue-500 w-6 h-6 animate-pulse" />
            </div>
            
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform group-hover:bg-blue-600 group-hover:text-white">
              <Award size={40} />
            </div>
            
            <h3 className="text-3xl font-bold text-slate-900 mb-2">الخامس العلمي</h3>
            <p className="text-slate-500 font-medium">المرحلة الإعدادية</p>
            
            <div className="mt-8 flex items-center justify-center text-blue-600 font-bold gap-2 group-hover:translate-x-[-8px] transition-transform">
              دخول الآن
              <ChevronLeft className="w-5 h-5" />
            </div>
          </button>
        </motion.div>

        <div className="text-center">
          <p className="text-slate-400 text-sm">سيتم إضافة باقي الصفوف قريباً إن شاء الله</p>
        </div>
      </div>
    </div>
  );
}
