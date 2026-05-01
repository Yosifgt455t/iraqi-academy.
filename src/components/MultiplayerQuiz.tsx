import { useState, useEffect } from 'react';
import { collection, doc, addDoc, onSnapshot, updateDoc, getDoc, query, where, getDocs, limit, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Play, Loader2, ArrowRight, Trophy, Copy, CheckCircle2, ShieldAlert } from 'lucide-react';

interface Props {
  user: any;
  userProfile: any;
  onBack: () => void;
}

export default function MultiplayerQuiz({ user, userProfile, onBack }: Props) {
  const [view, setView] = useState<'menu' | 'create' | 'join' | 'lobby' | 'playing' | 'results'>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [roomData, setRoomData] = useState<any>(null);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [score, setScore] = useState(0);

  // Subscribe to room changes when in a room
  useEffect(() => {
    if (!roomCode || view === 'menu' || view === 'create' || view === 'join') return;

    const unsub = onSnapshot(doc(db, 'multiplayer_rooms', roomCode), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoomData(data);
        if (data.status === 'playing' && view === 'lobby') {
          setView('playing');
        } else if (data.status === 'finished' && view === 'playing') {
          setView('results');
        }
      } else {
        setError('تم إغلاق الغرفة');
        setView('menu');
      }
    });

    return () => unsub();
  }, [roomCode, view]);

  // Fetch true questions when playing
  useEffect(() => {
    const fetchQuestions = async () => {
      if (view === 'playing' && roomData?.questions?.length > 0 && questions.length === 0) {
        const qSnaps = await Promise.all(
          roomData.questions.map((qId: string) => getDoc(doc(db, 'quiz_questions', qId)))
        );
        setQuestions(qSnaps.map(d => ({id: d.id, ...d.data()})).filter(q => q.question));
      }
    };
    fetchQuestions();
  }, [view, roomData]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const subSnap = await getDocs(collection(db, 'subjects'));
        setSubjects(subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }
    };
    fetchSubjects();
  }, []);


  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleCreateRoom = async () => {
    setLoading(true);
    setError('');
    try {
      // Pick random questions based on subjects
      let q;
      if (selectedSubjects.length === 0) {
        q = collection(db, 'quiz_questions');
      } else {
        q = query(collection(db, 'quiz_questions'), where('subjectId', 'in', selectedSubjects));
      }
      const qSnap = await getDocs(q);
      const allQ = qSnap.docs.map(d => d.id);
      if (allQ.length < 5) {
        throw new Error('لا توجد أسئلة كافية لهذه المواد. يرجى اختيار مواد أخرى أو خيار "مختلط".');
      }
      const shuffled = allQ.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 15); // 15 questions for Millionaire

      const code = generateCode();
      await setDoc(doc(db, 'multiplayer_rooms', code), {
        hostId: user.id || user.uid,
        status: 'pending',
        maxPlayers,
        players: [{ uid: user.id || user.uid, name: userProfile?.displayName || user.email, score: 0 }],
        questions: selected,
        createdAt: serverTimestamp()
      });
      setRoomCode(code);
      setView('lobby');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const code = roomCode.trim().toUpperCase();
      const rDoc = await getDoc(doc(db, 'multiplayer_rooms', code));
      if (!rDoc.exists()) {
        throw new Error('رمز الغرفة غير صحيح');
      }
      const data = rDoc.data();
      if (data.status !== 'pending') {
        throw new Error('المباراة بدأت بالفعل أو انتهت');
      }
      if (data.players.length >= data.maxPlayers) {
        throw new Error('الغرفة ممتلئة');
      }
      if (data.players.find((p: any) => p.uid === (user.id || user.uid))) {
        // already in room
        setRoomCode(code);
        setView('lobby');
        setLoading(false);
        return;
      }
      
      const newPlayers = [...data.players, { uid: (user.id || user.uid), name: userProfile?.displayName || user.email, score: 0 }];
      await updateDoc(doc(db, 'multiplayer_rooms', code), { players: newPlayers });
      
      setRoomCode(code);
      setView('lobby');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startGame = async () => {
    if (roomData?.hostId === (user.id || user.uid)) {
      await updateDoc(doc(db, 'multiplayer_rooms', roomCode), { status: 'playing' });
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitAnswer = async (selectedOption: number) => {
    const q = questions[currentQuestionIdx];
    const isCorrect = selectedOption === q.correctAnswer;
    const pts = isCorrect ? 10 : 0;
    
    // Update local and remote score
    const newScore = score + pts;
    setScore(newScore);

    const updatedPlayers = roomData.players.map((p: any) => 
      p.uid === (user.id || user.uid) ? { ...p, score: newScore } : p
    );
    await updateDoc(doc(db, 'multiplayer_rooms', roomCode), { players: updatedPlayers });

    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      // Finished
      setView('results');
      // Host marks room finished if all done? Simplified: just show results
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <button
            onClick={() => view === 'menu' ? onBack() : setView('menu')}
            className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowRight size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">تحدي المليون - أونلاين</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">العب مع أصدقائك واختبر معلوماتك للوصول إلى المليون!</p>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 font-bold border border-red-100 dark:border-red-800">
            <ShieldAlert size={20} />
            <span>{error}</span>
          </div>
        )}

        {view === 'menu' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setView('create')}
              className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-4 hover:border-blue-500 hover:shadow-md hover:-translate-y-1 transition-all group"
            >
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">إنشاء غرفة</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center text-sm">ابدأ تحدياً جديداً وادعُ أصدقاءك</p>
            </button>

            <button
              onClick={() => setView('join')}
              className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-4 hover:border-emerald-500 hover:shadow-md hover:-translate-y-1 transition-all group"
            >
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform">
                <Play size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">الانضمام لغرفة</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center text-sm">أدخل رمز الغرفة للبدء باللعب</p>
            </button>
          </div>
        )}

        {view === 'create' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">إعدادات الغرفة</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-2">أقصى عدد للاعبين (2 - 10)</label>
                <input 
                  type="number" 
                  min="2" max="10" 
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 2)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 font-bold dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-3">اختر المواد (مادتين كحد أقصى)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setSelectedSubjects([])}
                    className={`p-3 rounded-2xl border transition-all text-sm font-bold flex items-center justify-center gap-2 ${
                      selectedSubjects.length === 0 
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20' 
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    مختلط (جميع المواد)
                  </button>
                  {subjects.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        if (selectedSubjects.includes(sub.id)) {
                          setSelectedSubjects(prev => prev.filter(id => id !== sub.id));
                        } else if (selectedSubjects.length < 2) {
                          setSelectedSubjects(prev => [...prev, sub.id]);
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all text-sm font-bold flex items-center justify-center gap-2 ${
                        selectedSubjects.includes(sub.id)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                      } ${!selectedSubjects.includes(sub.id) && selectedSubjects.length >= 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleCreateRoom}
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'إنشاء الغرفة وبدء الدعوة'}
              </button>
            </div>
          </motion.div>
        )}

        {view === 'join' && (
          <motion.form onSubmit={handleJoinRoom} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">أدخل رمز الغرفة</h2>
            <input 
              type="text" 
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="مثال: A7B9F1"
              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/20 font-black text-center text-2xl uppercase tracking-widest text-slate-900 dark:text-white"
            />
            <button 
              type="submit"
              disabled={loading || !roomCode}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'انضمام الآن'}
            </button>
          </motion.form>
        )}

        {view === 'lobby' && roomData && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-100 dark:border-slate-800 shadow-md text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-full translate-x-12 -translate-y-12 blur-2xl"></div>
            
            <h2 className="text-2xl font-black text-slate-900 dark:text-white relative z-10">غرفة الانتظار</h2>
            
            <div className="bg-slate-50 dark:bg-slate-800 py-6 px-4 rounded-xl border border-slate-200 dark:border-slate-700 relative z-10 inline-block w-full">
               <p className="text-slate-500 dark:text-slate-400 font-bold mb-2">رمز الغرفة (شارك هذا الرمز مع أصدقائك)</p>
               <div className="flex items-center justify-center gap-4">
                 <span className="text-4xl font-black tracking-widest text-blue-600 dark:text-blue-400">{roomCode}</span>
                 <button onClick={copyCode} className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:scale-110 transition-transform">
                   {copied ? <CheckCircle2 className="text-emerald-500" /> : <Copy className="text-slate-400" />}
                 </button>
               </div>
            </div>

            <div className="space-y-4 relative z-10">
              <h3 className="font-bold text-slate-700 dark:text-slate-300">
                 اللاعبون ({roomData.players?.length || 0} / {roomData.maxPlayers})
              </h3>
              <div className="flex flex-wrap justify-center gap-3">
                {roomData.players?.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-2xl font-bold">
                    <Users size={16} />
                    {p.name}
                  </div>
                ))}
              </div>
            </div>

            {roomData.hostId === (user.id || user.uid) ? (
              <button 
                onClick={startGame}
                disabled={roomData.players?.length < 1}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 disabled:opacity-50 mt-4 relative z-10"
              >
                بدء التحدي
              </button>
            ) : (
              <div className="py-4 text-slate-500 dark:text-slate-400 font-bold flex flex-col items-center gap-2">
                <Loader2 className="animate-spin" />
                بانتظار المضيف لبدء التحدي...
              </div>
            )}
          </motion.div>
        )}

        {view === 'playing' && questions.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#161b36] p-4 rounded-2xl shadow-sm border border-blue-900/50">
               <span className="font-bold text-blue-200">السؤال {currentQuestionIdx + 1} من {questions.length}</span>
               <span className="font-black text-amber-500 text-xl">{score} نقاط</span>
            </div>

            <motion.div 
              key={currentQuestionIdx}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="bg-[#0a0b1e] p-8 rounded-xl border-2 border-white/10 shadow-md space-y-8 relative overflow-hidden"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-10" />
              <h3 className="text-2xl font-black text-white leading-relaxed text-center relative z-10">
                {questions[currentQuestionIdx]?.question}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                {questions[currentQuestionIdx]?.options?.map((opt: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => submitAnswer(idx)}
                    className="group relative p-6 bg-[#161b36] border-2 border-white/5 rounded-full font-bold text-lg text-white hover:border-amber-500 hover:bg-white/5 transition-all text-right overflow-hidden flex items-center"
                  >
                    <span className="text-amber-500 font-bold ml-4">
                      {['أ', 'ب', 'ج', 'د'][idx]}.
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {view === 'results' && roomData && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-100 dark:border-slate-800 shadow-md text-center space-y-8">
            <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Trophy size={48} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">النتائج النهائية</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">تم الانتهاء من جميع الأسئلة!</p>
            </div>

            <div className="space-y-4 max-w-sm mx-auto">
              {[...roomData.players].sort((a,b) => b.score - a.score).map((p: any, i: number) => (
                <div key={i} className="flex flex-col gap-3">
                   <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                     <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                       {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👤'}
                       {p.name}
                     </span>
                     <span className="font-black text-blue-600 dark:text-blue-400">{p.score} نقطة</span>
                   </div>
                   {p.uid === (user.id || user.uid) && i === 0 && (
                      <div className="bg-emerald-500 text-white p-3 rounded-2xl font-black shadow-lg animate-pulse">
                         أنت بطل الغرفة!
                      </div>
                   )}
                </div>
              ))}
            </div>

            <button
               onClick={() => setView('menu')}
               className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              العودة للقائمة الرئيسية
            </button>
          </motion.div>
        )}

      </div>
    </div>
  );
}
