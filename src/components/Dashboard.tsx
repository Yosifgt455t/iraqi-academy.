import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/firebase';
import { doc, onSnapshot, query, collection, orderBy, limit } from 'firebase/firestore';
import { Grade, Subject, Chapter, Teacher, Profile, NewsItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
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
  Menu,
  FileText,
  Trophy,
  User as UserIcon,
  MessageSquare,
  Flame,
  Moon,
  Sun,
  Crown,
  ShieldCheck,
  LayoutDashboard,
  Gamepad2
} from 'lucide-react';
import SubjectSelector from './SubjectSelector';
import ChapterSelector from './ChapterSelector';
import TeacherSelector from './TeacherSelector';
import ContentView from './ContentView';
import ExemptionCalculatorModal from './ExemptionCalculatorModal';
import TodoPage from './TodoPage';
import ToolsModal from './ToolsModal';
import ImageToPdfModal from './ImageToPdfModal';
import TextToPdfModal from './TextToPdfModal';
import ExamBuilderModal from './ExamBuilderModal';

import AccountSettingsModal from './AccountSettingsModal';
import AdminDashboard from './AdminDashboard';
import ReviewSection from './ReviewSection';
import MillionaireHub from './MillionaireHub';
import CommunityView from './CommunityView';
import LeaderboardView from './LeaderboardView';
import MultiplayerQuiz from './MultiplayerQuiz';

import ActivitiesMenu from './ActivitiesMenu';
import { AdSense } from './AdSense';

import { useClasses } from '../hooks/useClasses';

interface Props {
  user: any;
  grade: Grade;
  isAdmin?: boolean;
  onChangeGrade: () => void;
  onLogout: () => void;
}

export default function Dashboard({ user, grade, isAdmin: isAdminProp, onChangeGrade, onLogout }: Props) {
  const { getGradeName } = useClasses();
  const [view, setView] = useState<'home' | 'todo' | 'admin' | 'reviews' | 'quiz' | 'community' | 'leaderboard' | 'multiplayer' | 'activities'>('home');
  const [showExemptionCalculator, setShowExemptionCalculator] = useState(false);
  const [showImageToPdf, setShowImageToPdf] = useState(false);
  const [showTextToPdf, setShowTextToPdf] = useState(false);
  const [showExamBuilder, setShowExamBuilder] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [latestNews, setLatestNews] = useState<NewsItem[]>([]);

  const [pinnedSchedule, setPinnedSchedule] = useState<string | null>(() => {
    return localStorage.getItem(`schedule_${user.id}`);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (!user.id) return;
    const unsub = onSnapshot(doc(db, 'users', user.id), (doc) => {
      if (doc.exists()) {
        setUserProfile({ id: doc.id, ...doc.data() } as Profile);
      }
    });

    const newsUnsub = onSnapshot(query(collection(db, 'news'), orderBy('createdAt', 'desc'), limit(3)), (snap) => {
      setLatestNews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsItem)));
    });

    return () => {
      unsub();
      newsUnsub();
    };
  }, [user.id]);

  const currentIsAdmin = isAdminProp || user?.email?.toLowerCase() === 'jwjwjwjueue@gmail.com'.toLowerCase();

  const xpProgress = userProfile ? (userProfile.xp || 0) % 500 : 0;
  const xpPercentage = (xpProgress / 500) * 100;

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
    if (view !== 'home') {
      setView('home');
      return;
    }
    if (currentChapter) {
      setCurrentChapter(null);
    } else if (currentTeacher) {
      setCurrentTeacher(null);
    } else if (currentSubject) {
      setCurrentSubject(null);
    }
  };

  const reset = () => {
    setView('home');
    setCurrentSubject(null);
    setCurrentTeacher(null);
    setCurrentChapter(null);
  };

  if (view === 'todo') {
    return (
      <TodoPage
        userId={user.id}
        onBack={() => setView('home')}
      />
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 transition-colors duration-500 min-h-screen" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {(currentSubject || currentChapter || view !== 'home') && (
              <button 
                onClick={goBack}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-all flex item-center"
              >
                <ArrowRight size={22} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
                <GraduationCap size={24} />
              </div>
              <h1 className="font-black text-slate-900 dark:text-white hidden sm:block tracking-tight">عراقي أكاديمي</h1>
            </div>
          </div>

          <div className="flex-1 max-w-sm hidden md:block">
             <div className="bg-slate-100 dark:bg-slate-800 h-2.5 w-full rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercentage}%` }}
                  className="h-full bg-blue-600"
                />
             </div>
             <div className="flex justify-between mt-1 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase">LVL {userProfile?.level || 1}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase">{userProfile?.xp || 0} XP</span>
             </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-100 dark:border-orange-900/50">
               <Flame size={18} className="text-orange-500" fill="currentColor" />
               <span className="font-black text-orange-600 dark:text-orange-400 text-sm">{userProfile?.streak?.count || 0}</span>
            </div>

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:scale-105 transition-all"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {currentIsAdmin && (
              <button
                onClick={() => setView('admin')}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 hover:scale-105 transition-all"
                title="لوحة الإدارة"
              >
                <ShieldCheck size={20} />
              </button>
            )}

            <button
              onClick={() => setShowAccountSettings(true)}
              className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-md hover:scale-105 transition-transform"
            >
              <img 
                src={user?.photoURL || user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.user_metadata?.full_name || 'User')}&background=2563eb&color=fff`} 
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <AdSense />
        </div>
        {view === 'admin' ? (
          <AdminDashboard user={user} onBack={() => setView('home')} />
        ) : view === 'activities' ? (
          <ActivitiesMenu onBack={() => setView('home')} onSelect={(selectedView) => setView(selectedView)} />
        ) : view === 'reviews' ? (
          <ReviewSection grade={grade} onBack={() => setView('home')} />
        ) : view === 'quiz' ? (
          <MillionaireHub user={user} userProfile={userProfile} onBack={() => setView('activities')} />
        ) : view === 'community' ? (
          <CommunityView user={user} />
        ) : view === 'multiplayer' ? (
          <MultiplayerQuiz 
            user={user} 
            userProfile={userProfile} 
            onBack={() => setView('home')} 
          />
        ) : view === 'leaderboard' ? (
          <LeaderboardView />
        ) : !currentSubject ? (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl shrink-0 bg-white/10">
                  <img 
                    src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata?.full_name)}&background=ffffff&color=2563eb`} 
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                   <div className="flex items-center gap-2 mb-1">
                     <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-widest">المستوى {userProfile?.level || 1}</span>
                   </div>
                  <h2 className="text-3xl font-black mb-2 leading-tight">أهلاً بك يا {user.user_metadata?.full_name?.split(' ')[0] || 'بطل'}!</h2>
                  <p className="opacity-90 font-medium">اختر المادة التي تود دراستها اليوم وابدأ رحلة النجاح.</p>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setView('activities')}
                className="premium-card md:col-span-2 flex flex-col items-start justify-between min-h-[160px] text-right group hover:-translate-y-1 transition-transform relative overflow-hidden"
              >
                <div className="absolute left-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Crown size={120} className="translate-y-8 -translate-x-8" />
                </div>
                <div className="w-12 h-12 bg-[#F9FAFB] dark:bg-slate-800 rounded-2xl flex items-center justify-center text-[#71717A] dark:text-slate-400 mb-4 group-hover:text-amber-500 transition-colors relative z-10">
                  <Gamepad2 size={24} />
                </div>
                <div className="relative z-10">
                  <h3 className="font-black text-slate-900 dark:text-white text-lg">الأنشطة والفعاليات</h3>
                  <p className="text-xs text-[#71717A] dark:text-slate-400 font-medium mt-1">العب وتعلم مع زملائك، اكتشف المتصدرين، وراجع معلوماتك</p>
                </div>
              </button>

              {currentIsAdmin && (
                <button
                  onClick={() => setView('admin')}
                  className="premium-card md:col-span-2 flex flex-col items-start justify-between min-h-[160px] text-right group hover:-translate-y-1 transition-transform border-[#3B82F6]"
                >
                  <div className="w-12 h-12 bg-[#3B82F6] rounded-2xl flex items-center justify-center text-white mb-4">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-lg">لوحة الإدارة</h3>
                    <p className="text-xs text-[#3B82F6] font-medium mt-1">إعدادات المنصة</p>
                  </div>
                </button>
              )}
            </div>

            {/* Latest News Section (Moved here: Below Quizzes/Buttons and Above Subjects) */}
            {latestNews.length > 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                     <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                     آخر الأخبار والتنبيهات
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {latestNews.map((news, idx) => (
                    <motion.div
                      key={news.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md transition-all group overflow-hidden relative text-right"
                    >
                      {news.imageUrl && (
                        <div className="md:w-32 h-32 rounded-2xl overflow-hidden shrink-0">
                          <img src={news.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 justify-end md:justify-start">
                          <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-widest">{news.category || 'تنبيه'}</span>
                          <span className="text-[10px] font-bold text-slate-400">{new Date(news.createdAt).toLocaleDateString('ar-IQ')}</span>
                        </div>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white">{news.title}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 md:line-clamp-none whitespace-pre-wrap">{news.content}</p>
                      </div>
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-100 transition-opacity">
                         <MessageSquare size={80} className="rotate-12 opacity-10" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Pinned Schedule */}
            {pinnedSchedule && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-blue-100 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                <div className="bg-blue-50 dark:bg-slate-800/50 px-6 py-4 border-b border-blue-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold">
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
                <div className="p-6 overflow-x-auto dark:text-slate-300">
                  <div className="prose prose-sm max-w-none prose-slate dark:prose-invert overflow-x-auto">
                    <Markdown remarkPlugins={[remarkGfm]}>{pinnedSchedule}</Markdown>
                  </div>
                </div>
              </motion.div>
            )}

            <SubjectSelector grade={grade} userId={user.id} onSelect={setCurrentSubject} />
          </div>
        ) : !currentTeacher ? (
          <TeacherSelector subject={currentSubject} onSelect={setCurrentTeacher} />
        ) : !currentChapter ? (
          <ChapterSelector subject={currentSubject} userId={user.id} onSelect={setCurrentChapter} teacherId={currentTeacher.id} />
        ) : (
          <ContentView 
            chapter={currentChapter} 
            userId={user.id} 
            grade={grade} 
            teacher={currentTeacher}
          />
        )}
      </main>

      <div className="max-w-4xl mx-auto px-4 pb-16">
        <AdSense />
      </div>

      {/* Floating Home Button */}
      {(currentSubject || currentChapter) && (
        <button
          onClick={reset}
          className="fixed bottom-8 left-8 w-14 h-14 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 rounded-full shadow-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center hover:scale-110 transition-transform z-50"
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
      {showToolsModal && (
        <ToolsModal
          isOpen={showToolsModal}
          onClose={() => setShowToolsModal(false)}
          onOpenCalculator={() => setShowExemptionCalculator(true)}
          onOpenTodo={() => setView('todo')}
          onOpenImageToPdf={() => setShowImageToPdf(true)}
          onOpenTextToPdf={() => setShowTextToPdf(true)}
          onOpenExamBuilder={() => setShowExamBuilder(true)}
        />
      )}

      {/* Image to PDF Modal */}
      {showImageToPdf && (
        <ImageToPdfModal onClose={() => setShowImageToPdf(false)} />
      )}

      {/* Text to PDF Modal */}
      {showTextToPdf && (
        <TextToPdfModal onClose={() => setShowTextToPdf(false)} />
      )}

      {/* Exam Builder Modal */}
      {showExamBuilder && (
        <ExamBuilderModal onClose={() => setShowExamBuilder(false)} />
      )}

      {/* Account Settings Modal */}
      {showAccountSettings && (
        <AccountSettingsModal 
          user={user}
          isOpen={showAccountSettings}
          onClose={() => setShowAccountSettings(false)}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
