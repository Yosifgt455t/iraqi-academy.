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
  Gamepad2,
  MoreVertical,
  History,
  Info,
  Phone
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
import HistoryModal from './HistoryModal';
import ContactUsModal from './ContactUsModal';
import AboutUsModal from './AboutUsModal';

import AccountSettingsModal from './AccountSettingsModal';
import AdminDashboard from './AdminDashboard';
import ReviewSection from './ReviewSection';
import MillionaireHub from './MillionaireHub';
import CommunityView from './CommunityView';
import LeaderboardView from './LeaderboardView';
import MultiplayerQuiz from './MultiplayerQuiz';

import ActivitiesMenu from './ActivitiesMenu';

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
  const [showHistory, setShowHistory] = useState(false);
  const [showContactUs, setShowContactUs] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
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
      <header className="bg-white dark:bg-black border-b-4 border-black dark:border-white sticky top-0 z-50 shadow-[0_4px_0_0_rgba(0,0,0,1)] dark:shadow-[0_4px_0_0_rgba(255,255,255,1)]">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {(currentSubject || currentChapter || view !== 'home') && (
              <button 
                onClick={goBack}
                className="p-2 bg-white border-2 border-black rounded-lg text-black hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:neo-bg-yellow active:translate-y-0 active:shadow-none transition-all flex item-center"
              >
                <ArrowRight size={22} strokeWidth={2.5} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 neo-bg-blue border-2 border-black rounded-xl flex items-center justify-center text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <GraduationCap size={28} strokeWidth={2.5} />
              </div>
              <h1 className="font-black text-2xl text-black dark:text-white hidden sm:block tracking-tight bg-white dark:bg-black p-1">عراقي أكاديمي</h1>
            </div>
          </div>

          <div className="flex-1 max-w-sm hidden md:block">
             <div className="bg-slate-100 dark:bg-slate-800 h-4 w-full rounded-full overflow-hidden border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercentage}%` }}
                  className="h-full neo-bg-green border-r-2 border-black dark:border-white"
                />
             </div>
             <div className="flex justify-between mt-2 px-1">
                <span className="text-xs font-black text-black dark:text-white uppercase tracking-widest bg-yellow-300 dark:bg-yellow-600 px-2 py-0.5 rounded border border-black text-black dark:text-black">LVL {userProfile?.level || 1}</span>
                <span className="text-xs font-black text-black dark:text-white uppercase tracking-widest bg-emerald-300 dark:bg-emerald-600 px-2 py-0.5 rounded border border-black text-black dark:text-black">{userProfile?.xp || 0} XP</span>
             </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-black rounded-xl border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
               <Flame size={20} className="text-orange-500" fill="currentColor" strokeWidth={2.5} />
               <span className="font-black text-black dark:text-white text-base">{userProfile?.streak?.count || 0}</span>
            </div>

            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-0 active:shadow-none transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:neo-bg-yellow dark:hover:neo-bg-yellow hover:text-black"
            >
              {darkMode ? <Sun size={24} strokeWidth={2.5} /> : <Moon size={24} strokeWidth={2.5} />}
            </button>

            {currentIsAdmin && (
              <button
                onClick={() => setView('admin')}
                className="w-12 h-12 flex items-center justify-center rounded-xl neo-bg-pink border-2 border-black text-black hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                title="لوحة الإدارة"
              >
                <ShieldCheck size={24} strokeWidth={2.5} />
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-0 active:shadow-none transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:neo-bg-yellow dark:hover:neo-bg-yellow hover:text-black"
                title="المزيد"
              >
                <MoreVertical size={24} strokeWidth={2.5} />
              </button>

              <AnimatePresence>
                {showMoreMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMoreMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 mt-2 w-56 bg-white dark:bg-[#1a1a1a] rounded-xl border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] z-50 overflow-hidden"
                      dir="rtl"
                    >
                      <button
                        onClick={() => { setShowAboutUs(true); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:neo-bg-yellow hover:text-black transition-colors font-black text-black dark:text-white border-b-2 border-black dark:border-white"
                      >
                        <Info size={20} strokeWidth={2.5} />
                        <span>من نحن</span>
                      </button>
                      <button
                        onClick={() => { setShowContactUs(true); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:neo-bg-yellow hover:text-black transition-colors font-black text-black dark:text-white border-b-2 border-black dark:border-white"
                      >
                        <Phone size={20} strokeWidth={2.5} />
                        <span>تواصل معنا</span>
                      </button>
                      <button
                        onClick={() => { setShowHistory(true); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:neo-bg-yellow hover:text-black transition-colors font-black text-black dark:text-white border-b-2 border-black dark:border-white"
                      >
                        <History size={20} strokeWidth={2.5} />
                        <span>سجل المشاهدات</span>
                      </button>
                      <button
                        onClick={() => { setShowToolsModal(true); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:neo-bg-yellow hover:text-black transition-colors font-black text-black dark:text-white border-b-2 border-black dark:border-white"
                      >
                        <LayoutGrid size={20} strokeWidth={2.5} />
                        <span>الأدوات الأكاديمية</span>
                      </button>
                      <button
                        onClick={() => { setShowAccountSettings(true); setShowMoreMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:neo-bg-yellow hover:text-black transition-colors font-black text-black dark:text-white"
                      >
                        <Settings size={20} strokeWidth={2.5} />
                        <span>إدارة الحساب</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
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
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white dark:bg-[#1a1a1a] neo-border p-6 md:p-8 relative overflow-hidden neo-bg-yellow dark:neo-bg-blue">
              <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
                <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border-4 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_#fdfbf7]">
                  <img 
                    src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata?.full_name)}&background=f1f5f9&color=0f172a`} 
                    alt="Profile"
                    className="w-full h-full object-cover bg-white"
                  />
                </div>
                <div>
                   <div className="flex items-center gap-2 mb-2">
                     <span className="text-sm font-black text-black dark:text-white uppercase tracking-wider bg-white dark:bg-black px-2 py-1 border-2 border-black dark:border-white neo-border-sm">المستوى {userProfile?.level || 1}</span>
                   </div>
                  <h2 className="text-3xl font-black text-black dark:text-white mb-2">أهلاً بك يا {user.user_metadata?.full_name?.split(' ')[0] || 'بطل'}</h2>
                  <p className="text-black/80 dark:text-white/80 font-bold text-lg">اختر المادة التي تود دراستها اليوم وابدأ رحلة النجاح.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setView('activities')}
                className="bg-white dark:bg-slate-900 neo-border p-6 md:col-span-2 flex flex-col items-start justify-between min-h-[160px] text-right group neo-hover relative overflow-hidden"
              >
                <div className="absolute left-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Crown size={180} className="translate-y-8 -translate-x-8" />
                </div>
                <div className="w-16 h-16 neo-bg-pink border-4 border-black dark:border-white rounded-xl flex items-center justify-center text-black mb-4 relative z-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Gamepad2 size={32} />
                </div>
                <div className="relative z-10">
                  <h3 className="font-black text-black dark:text-white text-2xl">الأنشطة والفعاليات</h3>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">العب وتعلم مع زملائك، اكتشف المتصدرين، وراجع معلوماتك</p>
                </div>
              </button>

              {currentIsAdmin && (
                <button
                  onClick={() => setView('admin')}
                  className="bg-black dark:bg-white text-white dark:text-black neo-border p-6 md:col-span-2 flex flex-col items-start justify-between min-h-[160px] text-right neo-hover"
                >
                  <div className="w-16 h-16 bg-white dark:bg-black rounded-xl flex items-center justify-center text-black dark:text-white border-2 border-black dark:border-white mb-4 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] dark:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                    <ShieldCheck size={32} />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl">لوحة الإدارة</h3>
                    <p className="text-sm font-bold mt-2 opacity-80">إعدادات المنصة</p>
                  </div>
                </button>
              )}
            </div>

            {/* Latest News Section (Moved here: Below Quizzes/Buttons and Above Subjects) */}
            {latestNews.length > 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-black text-black dark:text-white flex items-center gap-2">
                     <span className="w-3 h-3 neo-bg-teal border-2 border-black dark:border-white rounded-full animate-pulse" />
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
                      className="bg-white dark:bg-black p-5 rounded-xl border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex flex-col md:flex-row gap-6 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] transition-all group overflow-hidden relative text-right"
                    >
                      {news.imageUrl && (
                        <div className="md:w-32 h-32 rounded-2xl overflow-hidden shrink-0 border-2 border-black dark:border-white">
                          <img src={news.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                      )}
                      <div className="flex-1 space-y-2 z-10 relative">
                        <div className="flex items-center gap-2 justify-end md:justify-start">
                          <span className="text-xs font-black neo-bg-yellow border-2 border-black text-black px-3 py-1 rounded-lg uppercase tracking-widest">{news.category || 'تنبيه'}</span>
                          <span className="text-xs font-bold text-black/60 dark:text-white/60">{new Date(news.createdAt).toLocaleDateString('ar-IQ')}</span>
                        </div>
                        <h4 className="text-xl font-black text-black dark:text-white">{news.title}</h4>
                        <p className="text-sm text-black/80 dark:text-white/80 font-bold leading-relaxed line-clamp-2 md:line-clamp-none whitespace-pre-wrap">{news.content}</p>
                      </div>
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <MessageSquare size={120} className="rotate-12" />
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
                className="bg-white dark:bg-black rounded-xl border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] overflow-hidden"
              >
                <div className="neo-bg-blue border-b-2 border-black dark:border-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-black font-black">
                    <Calendar size={24} />
                    <span>جدولي الدراسي المثبت</span>
                  </div>
                  <button 
                    onClick={handleRemoveSchedule}
                    className="p-2 bg-white border-2 border-black rounded-xl text-black hover:neo-bg-red hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    title="حذف الجدول"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="p-6 overflow-x-auto dark:text-white font-bold">
                  <div className="prose prose-slate dark:prose-invert max-w-none w-full markdown-body">
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

      {/* Floating Home Button */}
      {(currentSubject || currentChapter) && (
        <button
          onClick={reset}
          className="fixed bottom-8 left-8 w-16 h-16 bg-white dark:bg-black border-4 border-black dark:border-white text-black dark:text-white rounded-2xl flex items-center justify-center hover:neo-bg-yellow dark:hover:neo-bg-yellow hover:text-black hover:-translate-y-2 transition-all z-50 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] active:translate-y-0 active:shadow-none"
        >
          <Home size={32} strokeWidth={2.5} />
        </button>
      )}
      {/* Floating Tools Button */}
      <button
        onClick={() => setShowToolsModal(true)}
        className="fixed bottom-8 right-8 w-16 h-16 neo-bg-teal border-4 border-black dark:border-white text-black rounded-2xl flex items-center justify-center hover:-translate-y-2 transition-all z-50 group shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] active:translate-y-0 active:shadow-none"
      >
        <LayoutGrid size={32} strokeWidth={2.5} />
        <span className="absolute right-full mr-6 bg-white border-4 border-black text-black font-black text-lg px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] pointer-events-none">
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

      {/* History Modal */}
      {showHistory && (
        <HistoryModal 
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          completedMaterialIds={userProfile?.completed_materials || []}
        />
      )}

      {/* Contact Us Modal */}
      {showContactUs && (
        <ContactUsModal 
          isOpen={showContactUs}
          onClose={() => setShowContactUs(false)}
        />
      )}

      {/* About Us Modal */}
      {showAboutUs && (
        <AboutUsModal 
          isOpen={showAboutUs}
          onClose={() => setShowAboutUs(false)}
        />
      )}
    </div>
  );
}
