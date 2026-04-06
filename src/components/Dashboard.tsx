import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Grade, Subject, Chapter } from '../types';
import { 
  LogOut, 
  GraduationCap,
  ChevronRight,
  Home,
  ArrowRight,
  Settings
} from 'lucide-react';
import SubjectSelector from './SubjectSelector';
import ChapterSelector from './ChapterSelector';
import ContentView from './ContentView';

interface Props {
  user: any;
  grade: Grade;
  onChangeGrade: () => void;
}

const getGradeName = (grade: Grade) => {
  const names: Record<string, string> = {
    primary_1: 'الأول الابتدائي',
    primary_2: 'الثاني الابتدائي',
    primary_3: 'الثالث الابتدائي',
    primary_4: 'الرابع الابتدائي',
    primary_5: 'الخامس الابتدائي',
    primary_6: 'السادس الابتدائي',
    middle_1: 'الأول المتوسط',
    middle_2: 'الثاني المتوسط',
    middle_3: 'الثالث المتوسط',
    secondary_4_sci: 'الرابع العلمي',
    secondary_4_lit: 'الرابع الأدبي',
    secondary_5_sci: 'الخامس العلمي',
    secondary_5_lit: 'الخامس الأدبي',
    secondary_6_sci: 'السادس العلمي',
    secondary_6_lit: 'السادس الأدبي',
  };
  return names[grade] || grade;
};

export default function Dashboard({ user, grade, onChangeGrade }: Props) {
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const goBack = () => {
    if (currentChapter) {
      setCurrentChapter(null);
    } else if (currentSubject) {
      setCurrentSubject(null);
    }
  };

  const reset = () => {
    setCurrentSubject(null);
    setCurrentChapter(null);
  };

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            {(currentSubject || currentChapter) && (
              <button 
                onClick={goBack}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors ml-2"
              >
                <ArrowRight size={20} />
              </button>
            )}
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <GraduationCap size={18} />
              </div>
              <h1 className="font-bold text-slate-900 hidden sm:block">عراقي أكاديمي</h1>
            </div>
          </div>

          <div className="flex-1 flex justify-center overflow-hidden px-4">
             <div className="flex items-center text-sm font-medium text-slate-500 whitespace-nowrap">
                <button 
                  onClick={onChangeGrade}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors bg-slate-50 px-3 py-1 rounded-full border border-slate-100"
                >
                  <span className="opacity-80">{getGradeName(grade)}</span>
                  <Settings size={12} />
                </button>
                {currentSubject && (
                  <>
                    <ChevronRight size={14} className="mx-1 opacity-40 rotate-180" />
                    <span className="text-blue-600">{currentSubject.name}</span>
                  </>
                )}
                {currentChapter && (
                  <>
                    <ChevronRight size={14} className="mx-1 opacity-40 rotate-180" />
                    <span className="text-slate-900 truncate max-w-[100px]">{currentChapter.name}</span>
                  </>
                )}
             </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {!currentSubject ? (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-2">أهلاً بك يا بطل!</h2>
                <p className="opacity-90">اختر المادة التي تود دراستها اليوم وابدأ رحلة النجاح.</p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            </div>
            <SubjectSelector grade={grade} onSelect={setCurrentSubject} />
          </div>
        ) : !currentChapter ? (
          <ChapterSelector subject={currentSubject} onSelect={setCurrentChapter} />
        ) : (
          <ContentView chapter={currentChapter} userId={user.id} grade={grade} />
        )}
      </main>

      {/* Floating Home Button */}
      {(currentSubject || currentChapter) && (
        <button
          onClick={reset}
          className="fixed bottom-8 left-8 w-14 h-14 bg-white text-blue-600 rounded-full shadow-2xl border border-slate-100 flex items-center justify-center hover:scale-110 transition-transform z-50"
        >
          <Home size={24} />
        </button>
      )}
    </div>
  );
}
