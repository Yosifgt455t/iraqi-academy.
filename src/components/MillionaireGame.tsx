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
    <div className="min-h-screen bg-white dark:bg-black font-['Inter'] relative overflow-hidden text-black dark:text-white" dir="rtl">
      {/* Neo-brutalist background pattern (optional) */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '32px 32px' }} />

      <div className="relative z-10 max-w-6xl mx-auto h-screen flex flex-col p-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="p-3 bg-white border-2 border-black rounded-xl text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:neo-bg-yellow active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <ArrowRight size={24} />
          </button>
          <div className="flex items-center gap-4 bg-white dark:bg-black neo-border px-6 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
             <Trophy className="text-amber-500" size={32} />
             <h1 className="text-2xl font-black tracking-tighter">مسابقة المليون</h1>
          </div>
          <div className="w-12 h-12" /> {/* Spacer */}
        </header>

        {gameState === 'intro' && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-10 max-w-3xl mx-auto w-full"
          >
            <div className="w-32 h-32 bg-white border-4 border-black dark:border-white rounded-2xl flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] neo-bg-yellow rotate-3">
              <Trophy size={64} className="text-black" strokeWidth={2.5} />
            </div>
            
            <div className="space-y-4 neo-border bg-white dark:bg-black p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] w-full">
              <h2 className="text-5xl md:text-6xl font-black text-black dark:text-white">مسابقة المليون</h2>
              <p className="font-bold text-xl text-black/80 dark:text-white/80">اختر المادة العلمية التي ترغب بمنافستها</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
               <button
                onClick={() => setSelectedSubjectId('mixed')}
                className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 text-lg font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  selectedSubjectId === 'mixed' 
                    ? 'neo-bg-pink border-black text-black' 
                    : 'bg-white dark:bg-black border-black dark:border-white text-black dark:text-white hover:neo-bg-yellow hover:text-black'
                }`}
               >
                 <LayoutGrid size={32} />
                 <span>مختلط</span>
               </button>

               {subjects.map(sub => (
                 <button
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 text-lg font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    selectedSubjectId === sub.id 
                      ? 'neo-bg-teal border-black text-black' 
                      : 'bg-white dark:bg-black border-black dark:border-white text-black dark:text-white hover:neo-bg-yellow hover:text-black'
                  }`}
                 >
                   <HelpCircle size={32} />
                   <span className="truncate w-full">{sub.name}</span>
                 </button>
               ))}
            </div>

            <button
              onClick={handleStart}
              disabled={loading}
              className="w-full py-6 mt-4 neo-bg-yellow border-4 border-black text-black rounded-2xl font-black text-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] active:translate-y-0 active:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Zap className="animate-spin" /> : <Zap size={32} />}
              ابدأ المسابقة الآن
            </button>
          </motion.div>
        )}

        {gameState === 'playing' && currentQuestion && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 content-center">
            {/* Money Ladder - Desktop Only */}
            <div className="hidden lg:flex lg:col-span-3 flex-col-reverse gap-2 justify-center bg-white dark:bg-[#1a1a1a] p-6 neo-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
               {MONEY_LADDER.map((amount, idx) => (
                 <div 
                  key={idx}
                  className={`px-4 py-2 rounded-xl font-black text-sm flex justify-between transition-all border-2 border-transparent ${
                    currentLevel === idx 
                      ? 'neo-bg-yellow border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-105' 
                      : currentLevel > idx 
                        ? 'text-amber-600 dark:text-amber-500' 
                        : 'text-black/40 dark:text-white/40'
                  }`}
                 >
                   <span>{idx + 1}</span>
                   <span>₪ {amount}</span>
                 </div>
               ))}
            </div>

            {/* Main Question Area */}
            <div className="lg:col-span-9 flex flex-col gap-10">
              {/* Question Box */}
              <div className="relative mt-8">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-6 py-2 neo-bg-teal border-2 border-black text-black rounded-xl font-black text-sm uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-20">
                    سؤال المستوى {currentLevel + 1}
                </div>
                <div className="relative bg-white dark:bg-black p-10 pt-14 rounded-2xl neo-border text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
                   <h3 className="text-3xl lg:text-4xl font-black leading-snug text-black dark:text-white">
                     {currentQuestion.question}
                   </h3>
                </div>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        group relative p-6 rounded-2xl border-4 text-right transition-all duration-300
                        ${isSelected && !isAnswerRevealed ? 'neo-bg-yellow border-black text-black shadow-none translate-y-1' : ''}
                        ${isCorrect ? 'bg-green-400 border-black text-black shadow-none translate-y-1' : ''}
                        ${isWrong ? 'neo-bg-red border-black text-white shadow-none translate-y-1' : ''}
                        ${!isSelected && !isCorrect && !isWrong ? 'bg-white dark:bg-[#1a1a1a] border-black dark:border-white text-black dark:text-white hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]' : ''}
                        ${isDisabled ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg border-2 ${
                          isSelected || isCorrect || isWrong ? 'border-black bg-white text-black' : 'border-black dark:border-white bg-slate-100 dark:bg-slate-800 text-black dark:text-white'
                        }`}>
                          {['أ', 'ب', 'ج', 'د'][idx]}
                        </span>
                        <span className="text-2xl font-bold">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Lifelines */}
              <div className="flex justify-center gap-8 mt-6">
                <button
                  onClick={useFiftyFifty}
                  disabled={!lifelines.fiftyFifty || isAnswerRevealed}
                  className={`w-20 h-20 rounded-2xl border-4 flex items-center justify-center transition-all ${
                    lifelines.fiftyFifty 
                      ? 'bg-white border-black text-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                      : 'bg-slate-200 border-slate-400 text-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-600 shadow-none -translate-y-0'
                  }`}
                  title="حذف خيارين"
                >
                  <span className="font-black text-lg">50:50</span>
                </button>
                <button
                  disabled={!lifelines.audience || isAnswerRevealed}
                  onClick={() => setLifelines(p => ({ ...p, audience: false }))}
                  className={`w-20 h-20 rounded-2xl border-4 flex items-center justify-center transition-all ${
                    lifelines.audience 
                      ? 'bg-white border-black text-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                      : 'bg-slate-200 border-slate-400 text-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-600 shadow-none -translate-y-0'
                  }`}
                  title="تصويت الجمهور"
                >
                  <Users size={32} />
                </button>
                <button
                  disabled={!lifelines.call || isAnswerRevealed}
                  onClick={() => setLifelines(p => ({ ...p, call: false }))}
                  className={`w-20 h-20 rounded-2xl border-4 flex items-center justify-center transition-all ${
                    lifelines.call 
                      ? 'bg-white border-black text-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                      : 'bg-slate-200 border-slate-400 text-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-600 shadow-none -translate-y-0'
                  }`}
                  title="اتصال بصديق"
                >
                  <Phone size={32} />
                </button>
              </div>
            </div>
          </div>
        )}

        {(gameState === 'won' || gameState === 'lost') && (
           <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-10"
           >
              <div className={`w-40 h-40 rounded-3xl border-4 border-black flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${gameState === 'won' ? 'bg-green-400 text-black' : 'neo-bg-red text-white'}`}>
                {gameState === 'won' ? <CheckCircle2 size={80} strokeWidth={2.5} /> : <XCircle size={80} strokeWidth={2.5} />}
              </div>
              
              <div className="space-y-4 neo-border bg-white dark:bg-black p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                <h2 className="text-5xl md:text-6xl font-black text-black dark:text-white">
                  {gameState === 'won' ? 'تهانينا يا بطل!' : 'حظ أوفر المرة القادمة'}
                </h2>
                <p className="text-black/80 dark:text-white/80 font-bold text-xl">
                  {gameState === 'won' 
                    ? 'لقد حصلت على المليون بنجاح واجتزت كل العقبات.' 
                    : 'كان سؤالاً صعباً، لا تستسلم وواصل الدراسة.'}
                </p>
              </div>

              <div className="bg-white dark:bg-black p-8 rounded-2xl neo-border w-full max-w-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
                 <p className="font-black mb-4 text-xl">المبلغ المحصل عليه</p>
                 <p className="text-5xl md:text-6xl font-black text-amber-500 bg-amber-50 dark:bg-amber-900/30 py-4 rounded-xl border-4 border-black dark:border-white">
                   ₪ {gameState === 'won' ? '1,000,000' : (currentLevel > 0 ? MONEY_LADDER[currentLevel-1] : '0')}
                 </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <button
                  onClick={handleStart}
                  className="px-10 py-5 neo-bg-yellow border-4 border-black text-black rounded-2xl font-black text-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
                >
                  حاول مرة أخرى
                </button>
                <button
                  onClick={onBack}
                  className="px-10 py-5 bg-white border-4 border-black text-black rounded-2xl font-black text-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
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
