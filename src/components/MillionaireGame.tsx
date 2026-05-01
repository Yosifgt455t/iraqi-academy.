import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { QuizQuestion, Subject } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  HelpCircle, 
  Timer, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Users,
  Zap,
  Phone,
  LayoutGrid
} from 'lucide-react';

interface Props {
  onBack: () => void;
}

const MONEY_LADDER = [
  "100", "200", "300", "500", "1,000",
  "2,000", "4,000", "8,000", "16,000", "32,000",
  "64,000", "125,000", "250,000", "500,000", "1,000,000"
];

export default function MillionaireGame({ onBack }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | 'mixed'>('mixed');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'won' | 'lost'>('intro');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Lifelines
  const [lifelines, setLifelines] = useState({
    fiftyFifty: true,
    audience: true,
    call: true
  });
  const [disabledOptions, setDisabledOptions] = useState<number[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const subSnap = await getDocs(collection(db, 'subjects'));
        setSubjects(subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Subject));
      } catch (err) {
        console.error('Error fetching quiz data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      let q;
      if (selectedSubjectId === 'mixed') {
        q = collection(db, 'quiz_questions');
      } else {
        q = query(collection(db, 'quiz_questions'), where('subjectId', '==', selectedSubjectId));
      }
      
      const snap = await getDocs(q);
      let allQs = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }) as QuizQuestion);
      
      if (allQs.length === 0) {
        alert('لا توجد أسئلة لهذه المادة حالياً');
        setLoading(false);
        return;
      }

      // Shuffle and take 15
      allQs = allQs.sort(() => Math.random() - 0.5).slice(0, 15);
      
      setQuestions(allQs);
      setGameState('playing');
      setCurrentLevel(0);
      setLifelines({ fiftyFifty: true, audience: true, call: true });
      setDisabledOptions([]);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    } catch (err) {
      console.error('Error starting quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentLevel];

  const handleOptionClick = (index: number) => {
    if (isAnswerRevealed || disabledOptions.includes(index) || !currentQuestion) return;
    setSelectedOption(index);
    
    // Artificial delay for tension
    setTimeout(() => {
      setIsAnswerRevealed(true);
      if (index === currentQuestion.correctAnswer) {
        // Correct
        setTimeout(() => {
          if (currentLevel === 14 || currentLevel === questions.length - 1) {
            setGameState('won');
          } else {
            setCurrentLevel(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswerRevealed(false);
            setDisabledOptions([]);
          }
        }, 2000);
      } else {
        // Wrong
        setTimeout(() => {
          setGameState('lost');
        }, 2000);
      }
    }, 1500);
  };

  const useFiftyFifty = () => {
    if (!lifelines.fiftyFifty || isAnswerRevealed) return;
    const correct = currentQuestion.correctAnswer;
    const incorrects = [0, 1, 2, 3].filter(i => i !== correct);
    const toDisable = incorrects.sort(() => Math.random() - 0.5).slice(0, 2);
    setDisabledOptions(toDisable);
    setLifelines(prev => ({ ...prev, fiftyFifty: false }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b1e] flex flex-col items-center justify-center text-white p-6" dir="rtl">
        <Zap className="animate-pulse text-amber-400 mb-6" size={60} />
        <h2 className="text-2xl font-black">جاري تحضير المسابقة...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b1e] text-white font-['Inter'] relative overflow-hidden" dir="rtl">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto h-screen flex flex-col p-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors border border-white/10"
          >
            <ArrowRight size={24} />
          </button>
          <div className="flex items-center gap-3">
             <Trophy className="text-amber-400" size={32} />
             <h1 className="text-2xl font-black tracking-tighter">مسابقة المليون</h1>
          </div>
          <div className="w-12 h-12" /> {/* Spacer */}
        </header>

        {gameState === 'intro' && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-8 max-w-2xl mx-auto w-full"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse" />
              <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center shadow-2xl relative z-10 border-4 border-white/10">
                <Trophy size={60} className="text-amber-300" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-4xl font-black">مسابقة المليون</h2>
              <p className="text-blue-200/60 font-medium">اختر المادة العلمية التي ترغب بمنافستها</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
               <button
                onClick={() => setSelectedSubjectId('mixed')}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  selectedSubjectId === 'mixed' 
                    ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20' 
                    : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                }`}
               >
                 <LayoutGrid size={24} />
                 <span className="font-black text-sm">مختلط</span>
               </button>

               {subjects.map(sub => (
                 <button
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    selectedSubjectId === sub.id 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                  }`}
                 >
                   <HelpCircle size={24} />
                   <span className="font-bold text-xs truncate w-full">{sub.name}</span>
                 </button>
               ))}
            </div>

            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl font-black text-xl shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Zap className="animate-spin" /> : null}
              ابدأ المسابقة الآن
            </button>
          </motion.div>
        )}

        {gameState === 'playing' && currentQuestion && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 content-center">
            {/* Money Ladder - Desktop Only */}
            <div className="hidden lg:flex lg:col-span-3 flex-col-reverse gap-1 justify-center">
               {MONEY_LADDER.map((amount, idx) => (
                 <div 
                  key={idx}
                  className={`px-4 py-1.5 rounded-lg font-black text-xs flex justify-between transition-all ${
                    currentLevel === idx 
                      ? 'bg-amber-500 text-black scale-105 shadow-lg shadow-amber-500/20' 
                      : currentLevel > idx 
                        ? 'text-amber-500/50' 
                        : 'text-white/40'
                  } ${idx % 5 === 4 ? 'border-b border-white/10 pb-2 mb-1' : ''}`}
                 >
                   <span>{idx + 1}</span>
                   <span>₪ {amount}</span>
                 </div>
               ))}
            </div>

            {/* Main Question Area */}
            <div className="lg:col-span-9 flex flex-col gap-12">
              {/* Question Box */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition" />
                <div className="relative bg-[#161b36] p-10 rounded-[2.5rem] border border-white/5 text-center shadow-2xl">
                   <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-blue-600 rounded-full text-xs font-black uppercase tracking-widest border-2 border-[#0a0b1e]">
                     سؤال المستوى {currentLevel + 1}
                   </div>
                   <h3 className="text-3xl font-black leading-snug">
                     {currentQuestion.question}
                   </h3>
                </div>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = isAnswerRevealed && idx === currentQuestion.correctAnswer;
                  const isWrong = isAnswerRevealed && isSelected && idx !== currentQuestion.correctAnswer;
                  const isDisabled = disabledOptions.includes(idx);

                  return (
                    <button
                      key={idx}
                      disabled={isAnswerRevealed || isDisabled}
                      onClick={() => handleOptionClick(idx)}
                      className={`
                        group relative p-6 rounded-3xl border-2 text-right transition-all duration-500
                        ${isSelected && !isAnswerRevealed ? 'bg-amber-500/20 border-amber-500 text-amber-500' : ''}
                        ${isCorrect ? 'bg-green-500/20 border-green-500 text-green-500' : ''}
                        ${isWrong ? 'bg-red-500/20 border-red-500 text-red-500' : ''}
                        ${!isSelected && !isCorrect && !isWrong ? 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20' : ''}
                        ${isDisabled ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border ${
                          isSelected ? 'border-amber-500 bg-amber-500 text-black' : 'border-white/10 bg-white/5'
                        }`}>
                          {['أ', 'ب', 'ج', 'د'][idx]}
                        </span>
                        <span className="text-xl font-bold">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Lifelines */}
              <div className="flex justify-center gap-6 mt-4">
                <button
                  onClick={useFiftyFifty}
                  disabled={!lifelines.fiftyFifty || isAnswerRevealed}
                  className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all ${
                    lifelines.fiftyFifty 
                      ? 'border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white' 
                      : 'border-white/5 text-white/20'
                  }`}
                  title="حذف خيارين"
                >
                  <span className="font-black text-xs">50:50</span>
                </button>
                <button
                  disabled={!lifelines.audience || isAnswerRevealed}
                  onClick={() => setLifelines(p => ({ ...p, audience: false }))}
                  className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all ${
                    lifelines.audience 
                      ? 'border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white' 
                      : 'border-white/5 text-white/20'
                  }`}
                  title="تصويت الجمهور"
                >
                  <Users size={24} />
                </button>
                <button
                  disabled={!lifelines.call || isAnswerRevealed}
                  onClick={() => setLifelines(p => ({ ...p, call: false }))}
                  className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all ${
                    lifelines.call 
                      ? 'border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-white' 
                      : 'border-white/5 text-white/20'
                  }`}
                  title="اتصال بصديق"
                >
                  <Phone size={24} />
                </button>
              </div>
            </div>
          </div>
        )}

        {(gameState === 'won' || gameState === 'lost') && (
           <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-8"
           >
              <div className={`w-32 h-32 rounded-full flex items-center justify-center ${gameState === 'won' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                {gameState === 'won' ? <CheckCircle2 size={80} /> : <XCircle size={80} />}
              </div>
              
              <div className="space-y-2">
                <h2 className="text-5xl font-black">
                  {gameState === 'won' ? 'تهانينا يا بطل!' : 'للأسف، تعوضها بالمرة القادمة'}
                </h2>
                <p className="text-white/60 font-medium text-lg">
                  {gameState === 'won' 
                    ? 'لقد حصلت على المليون بنجاح واجتزت كل العقبات.' 
                    : 'كان سؤالاً صعباً، لا تستسلم وواصل الدراسة.'}
                </p>
              </div>

              <div className="bg-white/5 p-8 rounded-3xl border border-white/10 w-full max-w-sm">
                 <p className="text-white/40 font-black mb-2 uppercase tracking-tighter">المبلغ المحصل عليه</p>
                 <p className="text-5xl font-black text-amber-400">
                   ₪ {gameState === 'won' ? '1,000,000' : (currentLevel > 0 ? MONEY_LADDER[currentLevel-1] : '0')}
                 </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleStart}
                  className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black hover:bg-white/90 transition-all"
                >
                  حاول مرة أخرى
                </button>
                <button
                  onClick={onBack}
                  className="px-10 py-4 bg-white/5 text-white rounded-2xl font-black border border-white/10 hover:bg-white/10 transition-all"
                >
                  العودة للرئيسية
                </button>
              </div>
           </motion.div>
        )}
      </div>
    </div>
  );
}
