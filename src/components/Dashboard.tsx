import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/firebase';
import { doc, onSnapshot, query, collection, orderBy, limit, getDoc, updateDoc, getDocs } from 'firebase/firestore';
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
  Phone,
  Brain,
  Check,
  Play,
  CheckCircle2,
  Circle,
  Clock,
  Bell,
  AlertTriangle,
  BookOpen
} from 'lucide-react';
import SubjectSelector from './SubjectSelector';
import ChapterSelector from './ChapterSelector';
import TeacherSelector from './TeacherSelector';
import ContentView from './ContentView';
import ExemptionCalculatorModal from './ExemptionCalculatorModal';
import TodoPage from './TodoPage';
import ScheduleMakerModal from './ScheduleMakerModal';
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
import CommunityView from './CommunityView';
import LeaderboardView from './LeaderboardView';
import MultiplayerQuiz from './MultiplayerQuiz';
import ActivitiesMenu from './ActivitiesMenu';
import SmartAssistantView from './SmartAssistantView';
import TeacherDashboard from './TeacherDashboard';
import StudyWithFriend from './StudyWithFriend';
import BottomNavigation from './BottomNavigation';

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
  const [view, setView] = useState<'home' | 'todo' | 'admin' | 'reviews' | 'community' | 'leaderboard' | 'multiplayer' | 'activities' | 'smart_assistant' | 'study_friend'>('home');
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
  const [selectedScheduleMaterialId, setSelectedScheduleMaterialId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [latestNews, setLatestNews] = useState<NewsItem[]>([]);

  const [pinnedSchedule, setPinnedSchedule] = useState<string | null>(() => {
    return localStorage.getItem(`schedule_${user.id}`);
  });

  const [showScheduleMaker, setShowScheduleMaker] = useState(false);
  const [deleteConfirmType, setDeleteConfirmType] = useState<'custom' | 'pinned' | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsActiveTab, setNotificationsActiveTab] = useState<'all' | 'exams' | 'materials'>('all');
  const [readNotifications, setReadNotifications] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`read_notifications_${user.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const [customSchedule, setCustomSchedule] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem(`custom_schedule_${user.id}`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const getScheduleCreatedAt = () => {
    if (customSchedule && customSchedule.createdAt) {
      return new Date(customSchedule.createdAt);
    }
    const current = new Date();
    const sunOffset = current.getDay();
    const fallbackDate = new Date(current);
    fallbackDate.setDate(current.getDate() - sunOffset);
    return fallbackDate;
  };

  useEffect(() => {
    if (customSchedule) {
      const current = new Date();
      const startOfToday = new Date(current.getFullYear(), current.getMonth(), current.getDate());
      const createdDate = getScheduleCreatedAt();
      const startOfCreated = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
      const diffMs = startOfToday.getTime() - startOfCreated.getTime();
      let diffDays = Math.floor(diffMs / (24 * 3600 * 1000));
      if (diffDays < 0) diffDays = 0;
      setSelectedDayIndex(diffDays % 7);
    } else {
      setSelectedDayIndex(new Date().getDay());
    }
  }, [customSchedule]);

  useEffect(() => {
    const unsubMaterials = onSnapshot(collection(db, 'materials'), (snap) => {
      setMaterials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snap) => {
      setSubjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubChapters = onSnapshot(collection(db, 'chapters'), (snap) => {
      setChapters(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      unsubMaterials();
      unsubSubjects();
      unsubChapters();
    };
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Handle Shared Deep-Link Lectures
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subjectId = params.get('subjectId');
    const teacherId = params.get('teacherId');
    const chapterId = params.get('chapterId');

    if (subjectId || teacherId || chapterId) {
      const fetchDeepLinkData = async () => {
        try {
          if (subjectId) {
            const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
            if (subjectDoc.exists()) {
              setCurrentSubject({ id: subjectDoc.id, ...subjectDoc.data() } as Subject);
            }
          }
          if (teacherId) {
            const teacherDoc = await getDoc(doc(db, 'teachers', teacherId));
            if (teacherDoc.exists()) {
              setCurrentTeacher({ id: teacherDoc.id, ...teacherDoc.data() } as Teacher);
            }
          }
          if (chapterId) {
            const chapterDoc = await getDoc(doc(db, 'chapters', chapterId));
            if (chapterDoc.exists()) {
              setCurrentChapter({ id: chapterDoc.id, ...chapterDoc.data() } as Chapter);
            }
          }
        } catch (error) {
          console.error("Error loading shared deep-link content:", error);
        }
      };
      fetchDeepLinkData();
    }
  }, []);

  useEffect(() => {
    if (!user.id) return;
    const unsub = onSnapshot(doc(db, 'users', user.id), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserProfile({ id: doc.id, ...data } as Profile);
        if (data.custom_schedule) {
          try {
            const parsed = JSON.parse(data.custom_schedule);
            setCustomSchedule(parsed);
            localStorage.setItem(`custom_schedule_${user.id}`, data.custom_schedule);
          } catch (e) {
            console.error("Error parsing custom_schedule from DB snapshot:", e);
          }
        } else {
          setCustomSchedule(null);
          localStorage.removeItem(`custom_schedule_${user.id}`);
        }
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
    setDeleteConfirmType('pinned');
  };

  const performRemoveSchedule = () => {
    setPinnedSchedule(null);
    localStorage.removeItem(`schedule_${user.id}`);
    setDeleteConfirmType(null);
  };

  const getCurrentWeekDates = () => {
    const current = new Date();
    const startOfToday = new Date(current.getFullYear(), current.getMonth(), current.getDate());
    
    if (customSchedule) {
      const createdDate = getScheduleCreatedAt();
      const startOfCreated = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
      
      const diffMs = startOfToday.getTime() - startOfCreated.getTime();
      let diffDays = Math.floor(diffMs / (24 * 3600 * 1000));
      if (diffDays < 0) diffDays = 0;
      const currentWeekNumber = Math.floor(diffDays / 7);
      
      const displayWeekStartDate = new Date(startOfCreated);
      displayWeekStartDate.setDate(startOfCreated.getDate() + currentWeekNumber * 7);
      
      const daysAr = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const shortAr = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
      
      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(displayWeekStartDate);
        d.setDate(displayWeekStartDate.getDate() + i);
        const dayOfWeekIndex = d.getDay();
        weekDates.push({
          dayIndex: i, // Sequential study slot index
          dateNumber: d.getDate(),
          dayName: daysAr[dayOfWeekIndex],
          shortName: shortAr[dayOfWeekIndex],
          actualDate: d,
        });
      }
      return weekDates;
    }
    
    // Fallback if no custom schedule
    const sunOffset = current.getDay();
    const daysNameAr = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const shortAr = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(current);
      d.setDate(current.getDate() - sunOffset + i);
      const dayOfWeekIndex = d.getDay();
      weekDates.push({
        dayIndex: i,
        dateNumber: d.getDate(),
        dayName: daysNameAr[dayOfWeekIndex],
        shortName: shortAr[dayOfWeekIndex],
        actualDate: d,
      });
    }
    return weekDates;
  };

  const getResolvedSchedule = () => {
    if (!customSchedule || !customSchedule.schedule) return null;
    if (materials.length === 0) return customSchedule;

    // Group custom schedule's slots by (subjectId, teacherId) to calculate count of times it appears in the sequence
    const slotsByPair: Record<string, { dayIndex: number; lessonIdx: number }[]> = {};
    for (const day of customSchedule.schedule) {
      const lessons = day.lessons || [];
      lessons.forEach((lesson: any, lessonIdx: number) => {
        const pairKey = `${lesson.subjectId}_${lesson.teacherId}`;
        if (!slotsByPair[pairKey]) {
          slotsByPair[pairKey] = [];
        }
        slotsByPair[pairKey].push({ dayIndex: day.dayIndex, lessonIdx });
      });
    }

    for (const key in slotsByPair) {
      slotsByPair[key].sort((a, b) => a.dayIndex - b.dayIndex);
    }

    const completedIds = userProfile?.completed_materials || [];

    const resolvedSchedule = {
      ...customSchedule,
      schedule: customSchedule.schedule.map((day: any) => {
        return {
          ...day,
          lessons: (day.lessons || []).map((lesson: any, lessonIdx: number) => {
            const pairKey = `${lesson.subjectId}_${lesson.teacherId}`;
            const pairSlots = slotsByPair[pairKey] || [];
            const slotSeqIndex = pairSlots.findIndex(s => s.dayIndex === day.dayIndex && s.lessonIdx === lessonIdx);
            
            if (slotSeqIndex === -1) return lesson;

            const allPairMats = materials.filter((m: any) => {
              const isSubjectMatch = m.subjectId === lesson.subjectId || m.subjectIds?.includes(lesson.subjectId);
              const isTeacherMatch = m.teacherId === lesson.teacherId;
              return isSubjectMatch && isTeacherMatch;
            });
            allPairMats.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

            if (allPairMats.length === 0) return lesson;

            const N = pairSlots.length || 1; 
            const completedCount = allPairMats.filter(m => completedIds.includes(m.id)).length;
            const baseIndex = Math.floor(completedCount / N) * N;
            const targetMatIndex = baseIndex + slotSeqIndex;
            const targetMaterial = allPairMats[targetMatIndex % allPairMats.length];
            const isComp = targetMaterial ? completedIds.includes(targetMaterial.id) : false;

            return {
              ...lesson,
              materialId: targetMaterial ? targetMaterial.id : lesson.materialId,
              lectureTitle: targetMaterial ? targetMaterial.title : lesson.lectureTitle,
              materialUrl: targetMaterial ? targetMaterial.url : lesson.materialUrl,
              materialType: targetMaterial ? targetMaterial.type : lesson.materialType,
              completed: isComp
            };
          })
        };
      })
    };

    return resolvedSchedule;
  };

  const handleStartLesson = async (lesson: any) => {
    try {
      // 1. Resolve Subject
      const subSnap = await getDoc(doc(db, 'subjects', lesson.subjectId));
      if (subSnap.exists()) {
        const subjectObj = { id: subSnap.id, ...subSnap.data() } as Subject;
        
        // 2. Resolve Teacher
        const teSnap = await getDoc(doc(db, 'teachers', lesson.teacherId));
        if (teSnap.exists()) {
          const teacherObj = { id: teSnap.id, ...teSnap.data() } as Teacher;
          
          // 3. Resolve Chapter from material
          if (lesson.materialId) {
            setSelectedScheduleMaterialId(lesson.materialId);
            const matSnap = await getDoc(doc(db, 'materials', lesson.materialId));
            if (matSnap.exists()) {
              const matData = matSnap.data() as any;
              const chapterId = matData.chapterId || (matData.chapterIds && matData.chapterIds[0]);
              if (chapterId) {
                const chSnap = await getDoc(doc(db, 'chapters', chapterId));
                if (chSnap.exists()) {
                  const chapterObj = { id: chSnap.id, ...chSnap.data() } as Chapter;
                  
                  // Set the states to automatically open the view!
                  setCurrentSubject(subjectObj);
                  setCurrentTeacher(teacherObj);
                  setCurrentChapter(chapterObj);
                  return;
                }
              }
            }
          }
          
          // Fallback to just Subject and Teacher
          setSelectedScheduleMaterialId(null);
          setCurrentSubject(subjectObj);
          setCurrentTeacher(teacherObj);
          setCurrentChapter(null);
        }
      }
    } catch (err) {
      console.error("Error launching lesson from schedule:", err);
    }
  };

  const handleToggleLessonComplete = async (dayIndex: number, lessonId: string, lesson: any) => {
    if (!customSchedule) return;

    try {
      const isNowCompleted = !lesson.completed;

      // Update the user's completed_materials array in Firestore
      const userRef = doc(db, 'users', user.id);
      
      const currentCompletedIds = userProfile?.completed_materials || [];
      let newCompletedIds = [...currentCompletedIds];

      if (lesson.materialId) {
        if (isNowCompleted) {
          if (!newCompletedIds.includes(lesson.materialId)) {
            newCompletedIds.push(lesson.materialId);
          }
        } else {
          newCompletedIds = newCompletedIds.filter(id => id !== lesson.materialId);
        }
      }

      // Award XP
      const currentXp = userProfile?.xp || 0;
      const newXp = isNowCompleted ? currentXp + 25 : Math.max(0, currentXp - 25);

      await updateDoc(userRef, {
        completed_materials: newCompletedIds,
        xp: newXp
      });
    } catch (e) {
      console.error("Error toggling schedule lesson completion:", e);
    }
  };

  const handleRemoveCustomSchedule = () => {
    setDeleteConfirmType('custom');
  };

  const performRemoveCustomSchedule = async () => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        custom_schedule: null
      });
      setCustomSchedule(null);
      localStorage.removeItem(`custom_schedule_${user.id}`);
      setDeleteConfirmType(null);
    } catch (e) {
      console.error("Error removing custom schedule:", e);
    }
  };

  const handleLogout = async () => {
    onLogout();
  };

  const goBack = () => {
    setSelectedScheduleMaterialId(null);
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
    setSelectedScheduleMaterialId(null);
  };

  const handleTabSelect = (selectedView: 'home' | 'smart_assistant' | 'community' | 'activities' | 'lectures_root') => {
    if (selectedView === 'lectures_root') {
      setView('home');
      // If we are already on home and deep in a subject, reset it. Otherwise, if of another view, reset too.
      setCurrentSubject(null);
      setCurrentTeacher(null);
      setCurrentChapter(null);
      setSelectedScheduleMaterialId(null);
      // Smooth scroll to the main subjects list
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight / 3, behavior: 'smooth' });
      }, 100);
    } else if (selectedView === 'home') {
      setView('home');
      setCurrentSubject(null);
      setCurrentTeacher(null);
      setCurrentChapter(null);
      setSelectedScheduleMaterialId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setView(selectedView);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (view === 'todo') {
    return (
      <TodoPage
        userId={user.id}
        onBack={() => setView('home')}
      />
    );
  }

  if (userProfile && userProfile.role === 'teacher') {
    return (
      <TeacherDashboard 
        user={user} 
        onLogout={handleLogout} 
      />
    );
  }

  const handleOpenMaterialNotification = async (material: any) => {
    try {
      const chapterId = material.chapterId || (material.chapterIds && material.chapterIds[0]);
      if (!chapterId) return;

      const chSnap = await getDoc(doc(db, 'chapters', chapterId));
      if (!chSnap.exists()) return;
      const chapterObj = { id: chSnap.id, ...chSnap.data() } as Chapter;

      const subjectId = chapterObj.subjectId || (chapterObj.subjectIds && chapterObj.subjectIds[0]);
      if (!subjectId) return;

      const subSnap = await getDoc(doc(db, 'subjects', subjectId));
      if (!subSnap.exists()) return;
      const subjectObj = { id: subSnap.id, ...subSnap.data() } as Subject;

      let teacherId = material.teacherId;
      if (!teacherId) {
        const teachersSnap = await getDocs(collection(db, 'teachers'));
        if (!teachersSnap.empty) {
          teacherId = teachersSnap.docs[0].id;
        }
      }
      
      let teacherObj: any = null;
      if (teacherId) {
        const tSnap = await getDoc(doc(db, 'teachers', teacherId));
        if (tSnap.exists()) {
          teacherObj = { id: tSnap.id, ...tSnap.data() };
        }
      }

      setSelectedScheduleMaterialId(material.id);
      setCurrentSubject(subjectObj);
      setCurrentTeacher(teacherObj);
      setCurrentChapter(chapterObj);
      setShowNotifications(false);
      setView('home');
    } catch (e) {
      console.error("Error opening material from notification:", e);
    }
  };

  const generatedNotifications = useMemo(() => {
    const notifs: any[] = [];
    const isMiddleStage = grade && (grade.includes('middle') || grade.includes('3') || grade === 'middle_3');
    const isScientific = grade && (grade.includes('scientific') || grade.includes('sci') || grade.includes('prep_6_scientific'));
    const isLiterary = grade && (grade.includes('literary') || grade.includes('prep_6_literary'));

    if (isMiddleStage) {
      notifs.push({
        id: 'exam_islamic_arabic_middle_3',
        type: 'exam',
        heading: 'امتحان التربية الإسلامية واللغة العربية',
        body: 'اقترب موعد الامتحان الوزاري للصف الثالث المتوسط. متبقي 4 أيام فقط لبدء الامتحانات والأسئلة الشاملة!',
        timeLabel: 'بعد 4 أيام',
        date: '2026-06-10',
      });
      notifs.push({
        id: 'exam_english_middle_3',
        type: 'exam',
        heading: 'امتحان اللغة الإنجليزية الوزاري',
        body: 'باقي أيام قليلة على مادة اللغة الإنجليزية. ابدأ بمراجعة ملازم الأستاذ والقواعد وحل الوزاريات!',
        timeLabel: 'بعد 6 أيام',
        date: '2026-06-12',
      });
      notifs.push({
        id: 'exam_math_middle_3',
        type: 'exam',
        heading: 'امتحان الرياضيات الوزاري',
        body: 'الامتحان الوزاري لمادة الرياضيات يقترب. جرب اختبار الاختبارات الذكية وصانع الامتحانات الآن!',
        timeLabel: 'بعد 8 أيام',
        date: '2026-06-14',
      });
      notifs.push({
        id: 'exam_biology_middle_3',
        type: 'exam',
        heading: 'امتحان الأحياء الوزاري',
        body: 'مادة الأحياء تتطلب تركيزاً على التبويب والرسم. ابدأ بالمراجعة مسبقاً!',
        timeLabel: 'بعد 12 يوماً',
        date: '2026-06-18',
      });
    } else if (isScientific) {
      notifs.push({
        id: 'exam_islamic_prep_6_sci',
        type: 'exam',
        heading: 'امتحان التربية الإسلامية الوزاري',
        body: 'اقترب موعد الامتحان الوزاري للصف السادس الإعدادي العلمي. استعد جيداً وراجع الآيات والحفظ!',
        timeLabel: 'بعد 8 أيام',
        date: '2026-06-14',
      });
      notifs.push({
        id: 'exam_arabic_prep_6_sci',
        type: 'exam',
        heading: 'امتحان اللغة العربية الوزاري',
        body: 'مادة قواعد اللغة العربية والأدب بانتظارك. ابدأ بمراجعة ملخص الأستاذ للوزاريات المهمة!',
        timeLabel: 'بعد 10 أيام',
        date: '2026-06-16',
      });
      notifs.push({
        id: 'exam_english_prep_6_sci',
        type: 'exam',
        heading: 'امتحان اللغة الإنجليزية الوزاري',
        body: 'الامتحان الوزاري للغة الإنجليزية يقترب. ركز على ملازم المراجعة المركزة والقطع الخارجية!',
        timeLabel: 'بعد 12 يوماً',
        date: '2026-06-18',
      });
      notifs.push({
        id: 'exam_math_prep_6_sci',
        type: 'exam',
        heading: 'امتحان الرياضيات الوزاري',
        body: 'الأسئلة الوزارية لمادة الرياضيات تتطلب تركيزاً كبيراً على معدلات التفاضل والتكامل والتطبيقات!',
        timeLabel: 'بعد 15 يوماً',
        date: '2026-06-21',
      });
    } else if (isLiterary) {
      notifs.push({
        id: 'exam_islamic_prep_6_lit',
        type: 'exam',
        heading: 'امتحان التربية الإسلامية الوزاري',
        body: 'الامتحان الوزاري لصف السادس الإعدادي الأدبي يقترب. فلنبدأ المراجعة المكثفة للأحكام والتفسير!',
        timeLabel: 'بعد 8 أيام',
        date: '2026-06-14',
      });
      notifs.push({
        id: 'exam_arabic_prep_6_lit',
        type: 'exam',
        heading: 'امتحان اللغة العربية الوزاري',
        body: 'استعد لمادة قواعد اللغة العربية والأدب لرحلة الامتحان الوزاري. حل الأسئلة الوزارية السابقة الآن!',
        timeLabel: 'بعد 10 أيام',
        date: '2026-06-16',
      });
      notifs.push({
        id: 'exam_history_prep_6_lit',
        type: 'exam',
        heading: 'امتحان التاريخ الوزاري',
        body: 'مادة التاريخ للصف السادس الأدبي تتطلب تخطيطاً وفهماً للتواريخ والأحداث المهمة. راجع ملازمنا!',
        timeLabel: 'بعد 17 يوماً',
        date: '2026-06-23',
      });
    } else {
      notifs.push({
        id: 'exam_math_general',
        type: 'exam',
        heading: 'امتحان الرياضيات الشامل',
        body: 'استعد للاختبار الشامل للوقوف على مستواك الدراسي لمواجهة الامتحانات المدرسية بصدر رحب!',
        timeLabel: 'بعد 6 أيام',
        date: '2026-06-12',
      });
      notifs.push({
        id: 'exam_english_general',
        type: 'exam',
        heading: 'امتحان اللغة الإنجليزية التجريبي',
        body: 'قم ببدء اختبار تجريبي لقياس معرفتك ومستواك في قواعد ومفردات الفصل الأول والثاني!',
        timeLabel: 'بعد 14 يوماً',
        date: '2026-06-20',
      });
    }

    const filteredSubjects = subjects.filter(
      (sub) => sub.grade === grade || (sub.grades && sub.grades.includes(grade))
    );
    const sIds = filteredSubjects.map((s) => s.id);

    const filteredChapters = chapters.filter(
      (ch) => (ch.subjectId && sIds.includes(ch.subjectId)) || (ch.subjectIds && ch.subjectIds.some((id: string) => sIds.includes(id)))
    );
    const cIds = filteredChapters.map((c) => c.id);

    const matchingMaterials = materials.filter(
      (mPost) => (mPost.chapterId && cIds.includes(mPost.chapterId)) || (mPost.chapterIds && mPost.chapterIds.some((id: string) => cIds.includes(id)))
    );

    if (matchingMaterials.length > 0) {
      const recentCount = Math.min(matchingMaterials.length, 4);
      for (let i = 0; i < recentCount; i++) {
        const mat = matchingMaterials[i];
        const chapId = mat.chapterId || (mat.chapterIds && mat.chapterIds[0]);
        const chap = filteredChapters.find(c => c.id === chapId);
        const subId = chap?.subjectId || (chap?.subjectIds && chap.subjectIds[0]) || mat.subjectId;
        const sub = filteredSubjects.find(s => s.id === subId);
        const subjName = sub?.name || 'مادتك الدراسية';
        const typeLabel = mat.type === 'PDF' ? 'ملزمة جديدة 📚' : 'محاضرة فيديو جديدة 🎥';

        notifs.push({
          id: `new_material_added_${mat.id}`,
          type: 'material',
          heading: `${typeLabel} لمادة ${subjName}`,
          body: `تمت إضافة محتوى حديث بعنوان "${mat.title}" ضمن قسم بوابات التعليم لصفك الدراسي.`,
          timeLabel: 'مؤخراً',
          date: 'مضاف حديثاً',
          meta: mat,
        });
      }
    } else {
      if (isMiddleStage) {
        notifs.push({
          id: 'mock_material_islamic_middle_3',
          type: 'material',
          heading: 'ملزمة ذهبية مضافة لمادة التربية الإسلامية',
          body: 'تمت إضافة مراجعة مرئية وملزمة الشرح الكامل لآيات الحفظ والأحاديث الشريفة المقررة وزارياً للثالث المتوسط.',
          timeLabel: 'الآن',
          date: 'مضاف حديثاً',
          meta: { mock: true, subjectName: 'التربية الإسلامية' }
        });
        notifs.push({
          id: 'mock_material_chemistry_middle_3',
          type: 'material',
          heading: 'ملزمة الكيمياء المراجعة المركزة',
          body: 'تم رفع ملزمة المراجعة الفائقة لليلة الامتحان لصف الثالث المتوسط - الأستاذ المتميز شاملة التعريفات والمقارنات الوزارية.',
          timeLabel: 'الآن',
          date: 'مضاف حديثاً',
          meta: { mock: true, subjectName: 'الكيمياء' }
        });
      } else {
        notifs.push({
          id: 'mock_material_physics_6',
          type: 'material',
          heading: 'ملزمة الفيزياء الفصل الأول - المراجعة الذهبية',
          body: 'تم رفع ملزمة الفصل الأول للفيزياء شاملة حلول المسائل الصعبة والمسائل الوزارية المكررة بملف PDF عالي الجودة للتحميل.',
          timeLabel: 'الآن',
          date: 'مضاف حديثاً',
          meta: { mock: true, subjectName: 'الفيزياء' }
        });
        notifs.push({
          id: 'mock_material_english_6',
          type: 'material',
          heading: 'ملزمة القواعد الشاملة والقطع الخارجية للغة الإنجليزية',
          body: 'أحدث ملخص لقواعد اللغة الإنجليزية مبني وفق الأسئلة والأنماط الوزارية لعشر سنوات سابقة، تم رفعه كملخص PDF مفيد.',
          timeLabel: 'الآن',
          date: 'مضاف حديثاً',
          meta: { mock: true, subjectName: 'اللغة الإنجليزية' }
        });
      }
    }

    return notifs;
  }, [grade, subjects, chapters, materials]);

  const unreadCount = useMemo(() => {
    return generatedNotifications.filter(n => !readNotifications.includes(n.id)).length;
  }, [generatedNotifications, readNotifications]);

  const filteredNotifications = useMemo(() => {
    if (notificationsActiveTab === 'exams') {
      return generatedNotifications.filter(n => n.type === 'exam');
    }
    if (notificationsActiveTab === 'materials') {
      return generatedNotifications.filter(n => n.type === 'material');
    }
    return generatedNotifications;
  }, [generatedNotifications, notificationsActiveTab]);

  const handleMarkAllAsRead = () => {
    const allIds = generatedNotifications.map(n => n.id);
    setReadNotifications(allIds);
    localStorage.setItem(`read_notifications_${user.id}`, JSON.stringify(allIds));
  };

  const handleNotificationClick = async (notif: any) => {
    if (!readNotifications.includes(notif.id)) {
      const updated = [...readNotifications, notif.id];
      setReadNotifications(updated);
      localStorage.setItem(`read_notifications_${user.id}`, JSON.stringify(updated));
    }

    if (notif.type === 'exam') {
      setShowNotifications(false);
      setShowExamBuilder(true);
    } else {
      const mat = notif.meta;
      if (mat && !mat.mock) {
        setShowNotifications(false);
        await handleOpenMaterialNotification(mat);
      } else {
        setShowNotifications(false);
        const matchedSub = subjects.find(s => s.name === mat.subjectName);
        if (matchedSub) {
          setCurrentSubject(matchedSub);
          setCurrentTeacher(null);
          setCurrentChapter(null);
          setView('home');
        } else {
          reset();
        }
      }
    }
  };

  const activeCustomSchedule = getResolvedSchedule();

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

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-0 active:shadow-none transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:neo-bg-teal dark:hover:neo-bg-teal hover:text-black relative"
                title="الإشعارات والتذكيرات"
              >
                <Bell size={24} strokeWidth={2.5} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-500 border-2 border-black dark:border-white text-white font-black text-xs flex items-center justify-center animate-bounce shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-[#FFFFFF] font-extrabold">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 mt-2 w-80 md:w-96 bg-white dark:bg-[#111111] rounded-2xl border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] z-50 overflow-hidden text-right"
                      dir="rtl"
                    >
                      {/* Notifications Header */}
                      <div className="p-4 bg-slate-50 dark:bg-zinc-900 border-b-2 border-black dark:border-white flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🔔</span>
                          <span className="font-black text-black dark:text-white text-lg">مركز التنبيهات والأخبار</span>
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="px-2.5 py-1 text-xs font-bold neo-bg-yellow border-2 border-black rounded-lg text-black hover:-translate-y-0.5 active:translate-y-0 transition-transform shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                          >
                            قراءة الكل
                          </button>
                        )}
                      </div>

                      {/* Tabs */}
                      <div className="flex border-b-2 border-black dark:border-white text-sm font-black text-slate-500 dark:text-slate-400">
                        <button
                          onClick={() => setNotificationsActiveTab('all')}
                          className={`flex-1 py-2.5 transition-colors border-l border-black/10 text-center font-bold ${
                            notificationsActiveTab === 'all' 
                              ? 'bg-[#FFDE4D] dark:bg-amber-900 text-black dark:text-white font-extrabold' 
                              : 'hover:bg-slate-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          الكل ({generatedNotifications.length})
                        </button>
                        <button
                          onClick={() => setNotificationsActiveTab('exams')}
                          className={`flex-1 py-2.5 transition-colors border-l border-black/10 text-center font-bold ${
                            notificationsActiveTab === 'exams' 
                              ? 'bg-[#FFD6BA] dark:bg-amber-900 text-amber-950 dark:text-amber-100 font-extrabold' 
                              : 'hover:bg-slate-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          امتحانات 📝
                        </button>
                        <button
                          onClick={() => setNotificationsActiveTab('materials')}
                          className={`flex-1 py-2.5 transition-colors text-center font-bold ${
                            notificationsActiveTab === 'materials' 
                              ? 'bg-[#E8F1F2] dark:bg-sky-950 text-sky-950 dark:text-sky-100 font-extrabold' 
                              : 'hover:bg-slate-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          ملازم 📚
                        </button>
                      </div>

                      {/* Notif list body */}
                      <div className="max-h-96 overflow-y-auto divide-y-2 divide-slate-100 dark:divide-zinc-800 p-2 space-y-2">
                        {filteredNotifications.length === 0 ? (
                          <div className="py-12 text-center text-slate-400 font-bold space-y-2">
                            <span className="text-4xl">🎉</span>
                            <p className="text-sm">لا توجد تنبيهات جديدة في هذا القسم!</p>
                          </div>
                        ) : (
                          filteredNotifications.map((notif) => {
                            const isUnread = !readNotifications.includes(notif.id);

                            return (
                              <button
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`w-full text-right p-3 rounded-xl border-2 border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] transition-all flex flex-col gap-1 relative overflow-hidden text-black dark:text-white ${
                                  isUnread 
                                    ? notif.type === 'exam' 
                                      ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-500'
                                      : 'bg-blue-50 dark:bg-blue-950/20 border-blue-500'
                                    : 'bg-white dark:bg-[#1a1a1a] border-slate-300 dark:border-zinc-700 opacity-90'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3 w-full">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center text-black shrink-0 ${
                                      notif.type === 'exam' ? 'neo-bg-orange' : 'neo-bg-blue'
                                    }`}>
                                      {notif.type === 'exam' ? <Brain size={16} /> : <BookOpen size={16} />}
                                    </div>
                                    <span className="font-extrabold text-sm text-black dark:text-white">
                                      {notif.heading}
                                    </span>
                                  </div>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border border-black shrink-0 ${
                                    notif.type === 'exam' ? 'neo-bg-pink text-black' : 'neo-bg-green text-black'
                                  }`}>
                                    {notif.timeLabel}
                                  </span>
                                </div>

                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 pr-1 mt-1">
                                  {notif.body}
                                </p>

                                <div className="flex justify-between items-center w-full mt-2 pt-2 border-t border-dashed border-black/15 dark:border-white/15">
                                  <span className="text-[10px] text-slate-400 font-semibold">{notif.date}</span>
                                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                    {notif.type === 'exam' ? 'استعد للتحضير 🚀' : 'افتح المادة الآن 📖'}
                                  </span>
                                </div>

                                {isUnread && (
                                  <span className="absolute left-2 top-2 w-2.5 h-2.5 bg-rose-500 rounded-full border border-black dark:border-white" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
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

      <main className="max-w-4xl mx-auto px-4 pt-8 pb-32">
        {view === 'admin' ? (
          <AdminDashboard user={user} onBack={() => setView('home')} />
        ) : view === 'activities' ? (
          <ActivitiesMenu onBack={() => setView('home')} onSelect={(selectedView) => setView(selectedView)} />
        ) : view === 'smart_assistant' ? (
          <SmartAssistantView userId={user.id} isAdmin={currentIsAdmin} onBack={() => setView('home')} />
        ) : view === 'reviews' ? (
          <ReviewSection grade={grade} onBack={() => setView('home')} />
        ) : view === 'community' ? (
          <CommunityView user={user} />
        ) : view === 'multiplayer' ? (
          <MultiplayerQuiz 
            user={user} 
            userProfile={userProfile} 
            onBack={() => setView('home')} 
          />
        ) : view === 'study_friend' ? (
          <StudyWithFriend
            user={user}
            userProfile={userProfile}
            onBack={() => setView('activities')}
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

            {/* AI Custom Schedule - Your Daily Study Goals */}
            {activeCustomSchedule && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#171717] border-4 border-black dark:border-white rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] overflow-hidden text-right"
                dir="rtl"
              >
                {/* Header */}
                <div className="bg-emerald-100 dark:bg-emerald-950/30 border-b-4 border-black dark:border-white p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 border-2 border-black rounded-lg flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <Calendar size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-black dark:text-white">جدول الأسبوع والأهداف اليومية</h3>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">الأسبوع الحالي • منظم بذكاء اصطناعي عراقي</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowScheduleMaker(true)}
                      className="px-3 py-1.5 bg-white dark:bg-black text-black dark:text-white border-2 border-black dark:border-white rounded-xl text-xs font-black flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 duration-200 cursor-pointer"
                      title="تعديل الجدول بالكامل وتكرار المواد"
                    >
                      <Sparkles size={14} className="fill-current text-yellow-500" />
                      تعديل
                    </button>
                    <button
                      onClick={handleRemoveCustomSchedule}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border-2 border-black rounded-xl text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                      title="حذف الجدول"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Days Tracker (Exact alignment layout as requested) */}
                <div className="p-4 bg-slate-50 dark:bg-[#121212] border-b-2 border-black dark:border-white">
                  <div className="flex gap-2 overflow-x-auto pb-2 md:grid md:grid-cols-7 md:overflow-visible scrollbar-hide text-right">
                    {getCurrentWeekDates().map((day) => {
                      const isSelected = selectedDayIndex === day.dayIndex;
                      const isRealToday = (() => {
                        const today = new Date();
                        return today.getDate() === day.dateNumber && 
                               day.actualDate && 
                               today.getMonth() === day.actualDate.getMonth() && 
                               today.getFullYear() === day.actualDate.getFullYear();
                      })();
                      return (
                        <button
                          key={day.dayIndex}
                          onClick={() => setSelectedDayIndex(day.dayIndex)}
                          className={`flex-1 min-w-[65px] py-2.5 px-2 rounded-xl border-2 border-black dark:border-white text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-600 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] -translate-y-0.5' 
                              : 'bg-white dark:bg-black text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                          }`}
                        >
                          <span className={`text-[11px] font-black ${isSelected ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>{day.shortName}</span>
                          <span className="text-xl font-black mt-0.5">{day.dateNumber}</span>
                          {isRealToday && (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 mt-1 rounded-full border border-current ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                            }`}>
                              اليوم
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Daily Lessons List for selectedDayIndex */}
                <div className="p-6 space-y-5">
                  <h4 className="font-black text-lg text-black dark:text-white flex items-center gap-2 border-b-2 border-dashed border-slate-200 dark:border-slate-800 pb-2">
                    <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
                    محاضرات ودروس يوم {getCurrentWeekDates().find(d => d.dayIndex === selectedDayIndex)?.dayName || "اليوم"} الموصى بها:
                  </h4>

                  {(() => {
                    const dayData = activeCustomSchedule.schedule?.find((d: any) => d.dayIndex === selectedDayIndex);
                    const dayLessons = dayData?.lessons || [];

                    if (dayLessons.length === 0) {
                      return (
                        <div className="py-8 text-center bg-yellow-50/50 dark:bg-yellow-950/10 rounded-2xl border-2 border-dashed border-yellow-300 p-6">
                           <p className="text-2xl">☕</p>
                           <h5 className="font-black text-lg text-yellow-800 dark:text-yellow-300 mt-2">استراحة مستحقة!</h5>
                           <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">لا توجد دروس أو حصص مخصصة في جدولك اليوم. استغل هذا لتحدي أصدقائك أو المراجعة الحرة.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {dayLessons.map((lesson: any, lessonIdx: number) => {
                          const isComplete = lesson.completed;
                          return (
                            <div 
                              key={lesson.id || lessonIdx}
                              className={`p-5 rounded-2xl border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all ${
                                isComplete 
                                  ? 'bg-emerald-55/70 dark:bg-emerald-950/10 opacity-80 border-dashed border-emerald-500' 
                                  : 'bg-white dark:bg-[#1a1a1a]'
                              }`}
                            >
                              {/* Top metadata tags */}
                              <div className="flex flex-wrap items-center gap-2 mb-3 justify-start">
                                <span className="text-xs font-black px-2.5 py-1 rounded-lg border-2 border-black bg-pink-200 text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                  {lesson.subjectName}
                                </span>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-lg border-2 border-black bg-sky-200 text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                  الأستاذ: {lesson.teacherName}
                                </span>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-lg border-2 border-black bg-yellow-200 text-black flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                  <Clock size={12} />
                                  {lesson.time || 'صباحاً'}
                                </span>
                              </div>

                              {/* Lesson Title */}
                              <h5 
                                onClick={() => handleStartLesson(lesson)}
                                className={`font-black text-lg md:text-xl text-black dark:text-white mb-4 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors ${isComplete ? 'line-through text-slate-500' : ''}`}
                                title="انقر لتشغيل المحاضرة تلقائياً"
                              >
                                {lesson.lectureTitle}
                              </h5>

                              {/* Abwab-style content checklists */}
                              <div className="space-y-2 pt-2 border-t-2 border-dashed border-slate-200 dark:border-slate-800">
                                
                                {/* Item 1: The Interactive Video Lecture */}
                                <div className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden">
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => handleToggleLessonComplete(selectedDayIndex, lesson.id, lesson)}
                                      className={`w-7 h-7 rounded-full border-2 border-black dark:border-white flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                                        isComplete ? 'bg-emerald-550 bg-emerald-500 text-white' : 'bg-white dark:bg-[#222] text-black dark:text-white'
                                      }`}
                                      title={isComplete ? "إلغاء وضع الاكتمال" : "تحديد كمكتمل وكسب 25 XP"}
                                    >
                                      {isComplete ? <Check size={14} strokeWidth={3} /> : <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-400" />}
                                    </button>
                                    <div className="text-right">
                                      <p className={`font-black text-xs md:text-sm ${isComplete ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                                        رابط المحاضرة المنهجية
                                      </p>
                                      <p className="text-[10px] font-bold text-slate-400">انقر للربط بالمدرس أو معلم الفصل مباشرة</p>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleStartLesson(lesson)}
                                    className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black border-2 border-black rounded-xl text-[11px] font-black flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none duration-100 cursor-pointer"
                                  >
                                    <Play size={12} className="fill-current" />
                                    مشاهدة
                                  </button>
                                </div>

                                {/* Item 2: Reco Smart Exam */}
                                <div className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] opacity-95">
                                  <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 border-2 border-black dark:border-white flex items-center justify-center text-blue-600 dark:text-blue-300 text-xs font-black">
                                      <Brain size={14} />
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">الامتحانات المرافقة والنهائية</p>
                                      <p className="text-[10px] font-bold text-slate-400">اختبر معلوماتك لترسيخ المفاهيم بذكاء مخصص</p>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => setView('smart_assistant')}
                                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-2 border-black dark:border-white rounded-xl text-[11px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 duration-100 cursor-pointer"
                                  >
                                    ابدأ الاختبار
                                  </button>
                                </div>

                                {/* Item 3: Multiplayer Challengers */}
                                <div className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] opacity-95">
                                  <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 border-2 border-black dark:border-white flex items-center justify-center text-purple-600 dark:text-purple-300 text-xs font-black">
                                      <Gamepad2 size={14} />
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">تحدي الزملاء والمنافسين</p>
                                      <p className="text-[10px] font-bold text-slate-400">شارك في غرف التنافس اليومية حول المنهج</p>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => setView('activities')}
                                    className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border-2 border-black dark:border-white rounded-xl text-[11px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 duration-100 cursor-pointer"
                                  >
                                    تحدي الآن
                                  </button>
                                </div>

                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setView('activities')}
                className="bg-white dark:bg-slate-900 neo-border p-6 flex flex-col items-start justify-between min-h-[160px] text-right group neo-hover relative overflow-hidden"
              >
                <div className="absolute left-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Crown size={180} className="translate-y-8 -translate-x-8" />
                </div>
                <div className="w-16 h-16 neo-bg-pink border-4 border-black dark:border-white rounded-xl flex items-center justify-center text-black mb-4 relative z-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Gamepad2 size={32} />
                </div>
                <div className="relative z-10">
                  <h3 className="font-black text-black dark:text-white text-2xl">الأنشطة والفعاليات</h3>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">العب وتعلم مع زملائك، اكتشف المتصدرين</p>
                </div>
              </button>

              <button
                onClick={() => setView('smart_assistant')}
                className="bg-blue-50 dark:bg-blue-900/10 border-4 border-blue-600 p-6 flex flex-col items-start justify-between min-h-[160px] text-right group hover:-translate-y-2 transition-all relative overflow-hidden"
                style={{ boxShadow: '6px 6px 0px 0px #2563eb' }}
              >
                <div className="absolute left-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity text-blue-600">
                  <Brain size={180} className="translate-y-8 -translate-x-8" />
                </div>
                <div className="w-16 h-16 bg-blue-600 border-4 border-black rounded-xl flex items-center justify-center text-white mb-4 relative z-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Sparkles size={32} />
                </div>
                <div className="relative z-10">
                  <h3 className="font-black text-black dark:text-white text-2xl">اصنع امتحاناتك</h3>
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-300 mt-2">مساعدك الشخصي للتحضير للامتحانات</p>
                </div>
              </button>

              {/* 3. AI Smart Schedule Maker Dashboard Button (Requested directly by user) */}
              <button
                onClick={() => setShowScheduleMaker(true)}
                className="bg-yellow-50 dark:bg-yellow-950/10 border-4 border-amber-500 p-6 flex flex-col items-start justify-between min-h-[160px] md:col-span-2 text-right group hover:-translate-y-2 transition-all relative overflow-hidden cursor-pointer"
                style={{ boxShadow: '6px 6px 0px 0px #d97706' }}
              >
                <div className="absolute left-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity text-amber-500">
                  <Calendar size={180} className="translate-y-8 -translate-x-8" />
                </div>
                <div className="w-16 h-16 bg-amber-500 border-4 border-black rounded-xl flex items-center justify-center text-black mb-4 relative z-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Sparkles size={32} className="fill-current text-white animate-pulse" />
                </div>
                <div className="relative z-10">
                  <h3 className="font-black text-[#111] dark:text-white text-2xl flex items-center justify-start gap-2">
                    اصنع جدولك الدراسي
                    <span className="text-[10px] bg-red-500 text-white font-black px-2 py-0.5 rounded-full uppercase border-2 border-black">جديد AI</span>
                  </h3>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mt-2">صمم جدولك الدراسي ووزّع حصصك الأسبوعية بالتنسيق الذكي مع أساتذتك المفضلين ومحاضراتهم</p>
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
            initialMaterialId={selectedScheduleMaterialId}
            onClearInitialMaterialId={() => setSelectedScheduleMaterialId(null)}
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
          onOpenScheduleMaker={() => setShowScheduleMaker(true)}
        />
      )}

      {/* Schedule Maker Modal */}
      {showScheduleMaker && (
        <ScheduleMakerModal
          user={user}
          userProfile={userProfile}
          onClose={() => setShowScheduleMaker(false)}
          onScheduleCreated={(schedule) => {
            setCustomSchedule(schedule);
            setShowScheduleMaker(false);
          }}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmType && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm" dir="rtl">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-[#1c1c1c] w-full max-w-md border-4 border-black dark:border-white rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.8)] text-right"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/40 rounded-xl border-2 border-black dark:border-white flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="font-black text-xl text-black dark:text-white">تأكيد الحذف</h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">هذا الإجراء لا يمكن التراجع عنه</p>
              </div>
            </div>

            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
              {deleteConfirmType === 'custom' 
                ? 'هل أنت متأكد من رغبتك في حذف جدولك الدراسي المصمم بالذكاء الاصطناعي؟ سيتم مسح الجدول وجميع الدروس المجدولة للأيام المتبقية.'
                : 'هل أنت متأكد من رغبتك في حذف الجدول الدراسي المثبت؟'
              }
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmType(null)}
                className="px-4 py-2 border-2 border-black dark:border-white rounded-xl font-black text-xs text-black dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-black dark:hover:bg-slate-900 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={deleteConfirmType === 'custom' ? performRemoveCustomSchedule : performRemoveSchedule}
                className="px-4 py-2 border-2 border-black rounded-xl font-black text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
              >
                نعم، احذف الجدول
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mobile Bottom Tab Navigation */}
      <BottomNavigation
        currentView={view}
        isLectureActive={!!currentSubject}
        onTabSelect={handleTabSelect}
      />
    </div>
  );
}
