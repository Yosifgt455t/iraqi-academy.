import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Grade } from '../types';
import { GraduationCap, ChevronLeft } from 'lucide-react';

interface Props {
  userId: string;
  onComplete: (grade: Grade) => void;
}

export default function GradeSelector({ userId, onComplete }: Props) {
  const [loading, setLoading] = useState(false);

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
      // Fallback for demo if table doesn't exist yet
      onComplete(grade);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-2xl text-center space-y-12">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 text-blue-600 rounded-full mb-4">
            <GraduationCap size={40} />
          </div>
          <h1 className="text-4xl font-bold text-slate-900">أهلاً بك في عراقي أكاديمي</h1>
          <p className="text-xl text-slate-600">اختر صفك الدراسي لتخصيص تجربتك التعليمية</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            disabled={loading}
            onClick={() => selectGrade('5th')}
            className="group relative bg-white p-8 rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-500 transition-all text-right"
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-2">الخامس العلمي</h3>
            <p className="text-slate-500">ابدأ رحلتك في المرحلة الإعدادية مع أفضل المصادر</p>
            <ChevronLeft className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-blue-500 transition-colors" />
          </button>

          <button
            disabled={loading}
            onClick={() => selectGrade('6th')}
            className="group relative bg-white p-8 rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-500 transition-all text-right"
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-2">السادس العلمي</h3>
            <p className="text-slate-500">استعد للامتحانات الوزارية وحقق حلمك</p>
            <ChevronLeft className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-blue-500 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
