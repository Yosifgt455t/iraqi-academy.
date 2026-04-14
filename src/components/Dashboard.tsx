import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Grade, Subject, Chapter } from '../types';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  LogOut, 
  GraduationCap, 
  ChevronRight, 
  Home, 
  ArrowRight, 
  Settings, 
  Sparkles,
  Calendar,
  Trash2
} from 'lucide-react';
import SubjectSelector from './SubjectSelector';
import ChapterSelector from './ChapterSelector';
import ContentView from './ContentView';
import AIChatPage from './AIChatPage';

interface Props {
  user: any;
  grade: Grade;
  onChangeGrade: () => void;
  onLogout: () => void;
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

export default function Dashboard({ user, grade, onChangeGrade, onLogout }: Props) {
  const [view, setView] = useState<'home' | 'ai_chat'>('home');
  const [initialAIPrompt, setInitialAIPrompt] = useState<string | null>(null);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [pinnedSchedule, setPinnedSchedule] = useState<string | null>(() => {
    return localStorage.getItem(`schedule_${user.id}`);
  });

  const handlePinSchedule = (schedule: string) => {
    setPinnedSchedule(schedule);
    localStorage.setItem(`schedule_${user.id}`, schedule);
  };

  const handleRemoveSchedule = () => {
    setPinnedSchedule(null);
    localStorage.removeItem(`schedule_${user.id}`);
  };

  const handleLogout = async () => {
    onLogout();
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

  if (view === 'ai_chat') {
    return (
      <AIChatPage 
        userId={user.id} 
        userName={user.user_metadata?.full_name?.split(' ')[0] || 'بطل'} 
        grade={getGradeName(grade)}
        initialPrompt={initialAIPrompt}
        onClearInitialPrompt={() => setInitialAIPrompt(null)}
        onBack={() => setView('home')} 
      />
    );
  }

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

          <div className="flex-1 flex justify-center overflow-hidden px-2 sm:px-4">
             <div className="flex items-center text-xs sm:text-sm font-medium text-slate-500 overflow-x-auto hide-scrollbar whitespace-nowrap pb-1">
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
                <h2 className="text-3xl font-bold mb-2">أهلاً بك يا {user.user_metadata?.full_name?.split(' ')[0] || 'بطل'}!</h2>
                <p className="opacity-90">اختر المادة التي تود دراستها اليوم وابدأ رحلة النجاح.</p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            </div>

            {/* Pinned Schedule */}
            {pinnedSchedule && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden"
              >
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700 font-bold">
                    <Calendar size={20} />
                    <span>جدولي الدراسي المثبت</span>
                  </div>
                  <button 
                    onClick={handleRemoveSchedule}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="حذف الجدول"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="p-6 overflow-x-auto">
                  <div className="prose prose-sm max-w-none prose-slate overflow-x-auto">
                    <Markdown remarkPlugins={[remarkGfm]}>{pinnedSchedule}</Markdown>
                  </div>
                </div>
              </motion.div>
            )}

            {/* AI Tutor Card */}
            <button 
              onClick={() => setView('ai_chat')}
              className="w-full bg-white p-6 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex items-center gap-4 text-right group"
            >
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Sparkles size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">المساعد الذكي (AI)</h3>
                <p className="text-sm text-slate-500">ترتيب جدول دراسي، تلخيص، أو إجابة على أسئلتك</p>
              </div>
              <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                <ChevronRight size={20} className="rotate-180" />
              </div>
            </button>

            <SubjectSelector grade={grade} userId={user.id} onSelect={setCurrentSubject} />
          </div>
        ) : !currentChapter ? (
          <ChapterSelector subject={currentSubject} userId={user.id} onSelect={setCurrentChapter} />
        ) : (
          <ContentView 
            chapter={currentChapter} 
            userId={user.id} 
            grade={grade} 
            onAskAI={(prompt) => {
              setInitialAIPrompt(prompt);
              setView('ai_chat');
            }}
          />
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
      {/* Floating AI Button */}
      <button
        onClick={() => setView('ai_chat')}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50 group"
      >
        <Sparkles size={24} />
        <span className="absolute right-full mr-3 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          المساعد الذكي
        </span>
      </button>
    </div>
  );
}
