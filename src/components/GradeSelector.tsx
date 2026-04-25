import { useState, useEffect } from 'react';
import { updateUserProfile, db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Grade } from '../types';
import { 
  GraduationCap, 
  ChevronLeft, 
  Award, 
  Sparkles,
  BookOpen,
  School,
  Library,
  Star,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClasses } from '../hooks/useClasses';

interface Props {
  userId: string;
  onComplete: (grade: Grade) => void;
}

const getIcon = (name: string) => {
  switch (name) {
    case 'School': return School;
    case 'Library': return Library;
    case 'GraduationCap': return GraduationCap;
    default: return BookOpen;
  }
};

export default function GradeSelector({ userId, onComplete }: Props) {
  const { stages, loading: classesLoading } = useClasses();
  
  const [loading, setLoading] = useState(false);
  const [activeStage, setActiveStage] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [availableGrades, setAvailableGrades] = useState<Set<Grade>>(new Set());
  const [fetchingGrades, setFetchingGrades] = useState(true);

  // Auto-select first stage
  useEffect(() => {
    if (stages.length > 0 && !activeStage) {
      setActiveStage(stages[0].id);
    }
  }, [stages, activeStage]);

  useEffect(() => {
    const fetchAvailableGrades = async () => {
      try {
        const subjectsSnap = await getDocs(collection(db, 'subjects'));
        const gradesSet = new Set<Grade>();
        subjectsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.grades && Array.isArray(data.grades)) {
            data.grades.forEach((g: Grade) => gradesSet.add(g));
          }
          if (data.grade) {
            gradesSet.add(data.grade as Grade);
          }
        });
        setAvailableGrades(gradesSet);
      } catch (err) {
        console.error('Error fetching available grades:', err);
      } finally {
        setFetchingGrades(false);
      }
    };
    
    fetchAvailableGrades();
  }, []);

  const handleSelect = async () => {
    if (!selectedGrade) return;

    if (userId === 'guest_user') {
      onComplete(selectedGrade);
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile(userId, { grade: selectedGrade });
      onComplete(selectedGrade);
    } catch (err) {
      console.error('Error saving grade:', err);
      onComplete(selectedGrade);
    } finally {
      setLoading(false);
    }
  };

  if (classesLoading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">جاري تحميل الصفوف...</div>;
  }

  // Filter out stages with no visible grades, and hidden stages
  const visibleStages = stages.filter(stage => 
    !stage.isHidden && stage.grades.some(grade => !grade.isHidden)
  );

  return (
    <div className="min-h-screen bg-white relative overflow-hidden font-sans selection:bg-blue-100" dir="rtl">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-purple-50 rounded-full blur-[100px] opacity-50" />
        <div className="absolute -bottom-[10%] left-[20%] w-[35%] h-[35%] bg-emerald-50 rounded-full blur-[110px] opacity-40" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-20 lg:py-24">
        {/* Header */}
        <div className="text-center space-y-6 mb-16">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-bold tracking-wide"
          >
            <Sparkles size={16} />
            <span>ابدأ رحلتك التعليمية اليوم</span>
          </motion.div>
          
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight"
          >
            اختر <span className="text-blue-600">صفك الدراسي</span><br />
            وانطلق نحو التميز
          </motion.h1>
          
          <motion.p 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-medium"
          >
            نوفر لك أحدث الملازم، المحاضرات، والاختبارات الذكية لكل مرحلة دراسية.
          </motion.p>
        </div>

        {/* Stage Tabs */}
        <div className="flex justify-center mb-12 flex-wrap gap-2">
          <div className="inline-flex p-1.5 bg-slate-100 rounded-3xl gap-1 flex-wrap justify-center">
            {visibleStages.map((stage) => {
              const Icon = getIcon(stage.iconName);
              return (
              <button
                key={stage.id}
                onClick={() => {
                  setActiveStage(stage.id);
                  setSelectedGrade(null);
                }}
                className={`relative px-6 py-3 rounded-2xl text-sm md:text-base font-black transition-all flex items-center gap-2 ${
                  activeStage === stage.id 
                    ? 'text-white' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {activeStage === stage.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className={`absolute inset-0 rounded-2xl shadow-lg ring-4 ring-white/50 ${
                      stage.color === 'blue' ? 'bg-blue-600' : 
                      stage.color === 'purple' ? 'bg-purple-600' : 'bg-emerald-600'
                    }`}
                  />
                )}
                <span className="relative z-10"><Icon size={18} /></span>
                <span className="relative z-10">{stage.label}</span>
              </button>
            )})}
          </div>
        </div>

        {/* Grade Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeStage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="contents" // Grid wrapper bypass
            >
              {visibleStages.find(s => s.id === activeStage)?.grades.filter(g => !g.isHidden).map((grade, index) => {
                const isAvailable = availableGrades.has(grade.id);
                const isSelected = selectedGrade === grade.id;

                return (
                  <motion.button
                    key={grade.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      if (isAvailable) setSelectedGrade(grade.id);
                    }}
                    disabled={!isAvailable || fetchingGrades}
                    className={`relative p-8 rounded-[2.5rem] border-2 transition-all text-right group overflow-hidden ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-200'
                        : isAvailable
                          ? 'bg-white border-slate-100 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-50/50 cursor-pointer'
                          : 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {/* Icon & Label */}
                    <div className="flex flex-col h-full justify-between gap-8 h-[160px]">
                      <div className="flex justify-between items-start">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-white/10' : (isAvailable ? 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600' : 'bg-slate-200 text-slate-400')
                        }`}>
                          {grade.description && isAvailable ? <Star size={24} /> : <BookOpen size={24} />}
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="text-blue-400" size={24} />
                        )}
                        {!isAvailable && !fetchingGrades && (
                          <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-2 py-1 rounded-lg">
                            قريباً
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <h3 className={`text-xl md:text-2xl font-black mb-1 ${
                          isSelected ? 'text-white' : 'text-slate-900'
                        }`}>
                          {grade.label}
                        </h3>
                        <p className={`text-sm font-bold ${
                          isSelected ? 'text-slate-400' : (isAvailable ? 'text-slate-400 group-hover:text-blue-400' : 'text-slate-400')
                        }`}>
                          {!isAvailable ? (fetchingGrades ? 'جاري التحميل...' : 'قريباً') : (grade.description || 'اضغط للاختيار')}
                        </p>
                      </div>
                    </div>

                    {/* Hover Accent */}
                    {isAvailable && (
                      <div className={`absolute top-0 left-0 w-2 h-full transition-all ${
                        isSelected 
                          ? 'bg-blue-500' 
                          : 'bg-transparent group-hover:bg-blue-500/20'
                      }`} />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Action */}
        <div className="flex flex-col items-center gap-6">
          <AnimatePresence>
            {selectedGrade && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                onClick={handleSelect}
                disabled={loading}
                className="w-full max-w-xs py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-2xl shadow-blue-200 transition-all active:scale-95 group"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <span>ابدأ الدراسة الآن</span>
                    <ChevronLeft className="group-hover:-translate-x-2 transition-transform" />
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>
          
          <p className="text-slate-400 text-sm font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
            سيتم إضافة باقي التخصصات والمراحل قريباً
            <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          </p>
        </div>
      </div>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin h-5 w-5 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
