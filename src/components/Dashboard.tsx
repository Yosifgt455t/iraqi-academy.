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
  Trash2,
  Calculator,
  ListTodo,
  LayoutGrid,
  Menu
} from 'lucide-react';
import SubjectSelector from './SubjectSelector';
import ChapterSelector from './ChapterSelector';
import ContentView from './ContentView';
import AIChatPage from './AIChatPage';
import ExemptionCalculatorModal from './ExemptionCalculatorModal';
import TodoPage from './TodoPage';
import ToolsModal from './ToolsModal';
import ImageToPdfModal from './ImageToPdfModal';
import TextToPdfModal from './TextToPdfModal';
import FileTranslatorModal from './FileTranslatorModal';
import ExamBuilderModal from './ExamBuilderModal';

import AccountSettingsModal from './AccountSettingsModal';
import AdminDashboard from './AdminDashboard';

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
  const [view, setView] = useState<'home' | 'ai_chat' | 'todo' | 'admin'>('home');
  const [initialAIPrompt, setInitialAIPrompt] = useState<string | null>(null);
  const [showExemptionCalculator, setShowExemptionCalculator] = useState(false);
  const [showImageToPdf, setShowImageToPdf] = useState(false);
  const [showTextToPdf, setShowTextToPdf] = useState(false);
  const [showFileTranslator, setShowFileTranslator] = useState(false);
  const [showExamBuilder, setShowExamBuilder] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [pinnedSchedule, setPinnedSchedule] = useState<string | null>(() => {
    return localStorage.getItem(`schedule_${user.id}`);
  });

  const isAdmin = user?.email === 'jwjwjwjueue@gmail.com';

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

  if (view === 'todo') {
    return (
      <TodoPage
        userId={user.id}
        onBack={() => setView('home')}
      />
    );
  }

  if (view === 'admin') {
    return (
      <AdminDashboard onBack={() => setView('home')} />
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAccountSettings(true)}
              className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-md hover:scale-105 transition-transform"
            >
              <img 
                src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata?.full_name)}&background=2563eb&color=fff`} 
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </button>
            {isAdmin && (
              <button
                onClick={() => setView('admin')}
                className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-all flex items-center gap-2"
                title="إدارة المحتوى"
              >
                <Settings size={20} />
                <span className="hidden md:block font-medium text-sm">الإدارة</span>
              </button>
            )}
            <button
              onClick={() => setShowToolsModal(true)}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center gap-2"
              title="الأدوات الأكاديمية"
            >
              <LayoutGrid size={20} />
              <span className="hidden md:block font-medium text-sm">الأدوات</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {!currentSubject ? (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl shrink-0">
                  <img 
                    src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata?.full_name)}&background=ffffff&color=2563eb`} 
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">أهلاً بك يا {user.user_metadata?.full_name?.split(' ')[0] || 'بطل'}!</h2>
                  <p className="opacity-90">اختر المادة التي تود دراستها اليوم وابدأ رحلة النجاح.</p>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
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
      {/* Floating Tools Button */}
      <button
        onClick={() => setShowToolsModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50 group"
      >
        <LayoutGrid size={24} />
        <span className="absolute right-full mr-3 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          الأدوات الأكاديمية
        </span>
      </button>

      {/* Exemption Calculator Modal */}
      {showExemptionCalculator && (
        <ExemptionCalculatorModal onClose={() => setShowExemptionCalculator(false)} />
      )}

      {/* Tools Modal (Drawer) */}
      <ToolsModal
        isOpen={showToolsModal}
        onClose={() => setShowToolsModal(false)}
        onOpenAI={() => setView('ai_chat')}
        onOpenCalculator={() => setShowExemptionCalculator(true)}
        onOpenTodo={() => setView('todo')}
        onOpenImageToPdf={() => setShowImageToPdf(true)}
        onOpenTextToPdf={() => setShowTextToPdf(true)}
        onOpenFileTranslator={() => setShowFileTranslator(true)}
        onOpenExamBuilder={() => setShowExamBuilder(true)}
      />

      {/* Image to PDF Modal */}
      {showImageToPdf && (
        <ImageToPdfModal onClose={() => setShowImageToPdf(false)} />
      )}

      {/* Text to PDF Modal */}
      {showTextToPdf && (
        <TextToPdfModal onClose={() => setShowTextToPdf(false)} />
      )}

      {/* File Translator Modal */}
      {showFileTranslator && (
        <FileTranslatorModal onClose={() => setShowFileTranslator(false)} />
      )}

      {/* Exam Builder Modal */}
      {showExamBuilder && (
        <ExamBuilderModal onClose={() => setShowExamBuilder(false)} />
      )}

      {/* Account Settings Modal */}
      <AccountSettingsModal 
        user={user}
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}
