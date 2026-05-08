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
    <div className="min-h-screen bg-white dark:bg-black p-4 md:p-8" dir="rtl">
      {/* Neo-brutalist background pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '32px 32px' }} />

      <div className="max-w-3xl mx-auto space-y-10 relative z-10">
        <header className="flex flex-col sm:flex-row sm:items-center gap-6 bg-white dark:bg-black p-6 neo-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] neo-bg-blue">
          <button
            onClick={() => view === 'menu' ? onBack() : setView('menu')}
            className="p-3 bg-white border-2 border-black rounded-xl text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:neo-bg-yellow active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all self-start sm:self-center shrink-0"
          >
            <ArrowRight size={28} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-4xl font-black text-black">تحدي المليون - أونلاين</h1>
            <p className="text-black/80 font-bold mt-2 text-lg">العب مع أصدقائك واختبر معلوماتك للوصول إلى المليون!</p>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-white border-4 border-black text-black rounded-2xl flex items-center gap-3 font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] neo-bg-red text-white">
            <ShieldAlert size={28} />
            <span>{error}</span>
          </div>
        )}

        {view === 'menu' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button
              onClick={() => setView('create')}
              className="bg-white dark:bg-[#1a1a1a] p-8 rounded-2xl neo-border flex flex-col items-center justify-center gap-6 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-2 transition-all active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group"
            >
              <div className="w-24 h-24 neo-bg-teal border-4 border-black dark:border-white text-black rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Users size={48} strokeWidth={2.5} />
              </div>
              <div className="space-y-2 text-center">
                 <h3 className="text-3xl font-black text-black dark:text-white">إنشاء غرفة</h3>
                 <p className="text-black/80 dark:text-white/80 font-bold text-lg">ابدأ تحدياً جديداً وادعُ أصدقاءك</p>
              </div>
            </button>

            <button
              onClick={() => setView('join')}
              className="bg-white dark:bg-[#1a1a1a] p-8 rounded-2xl neo-border flex flex-col items-center justify-center gap-6 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-2 transition-all active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group"
            >
              <div className="w-24 h-24 neo-bg-pink border-4 border-black dark:border-white text-black rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-6 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Play size={48} strokeWidth={2.5} />
              </div>
              <div className="space-y-2 text-center">
                 <h3 className="text-3xl font-black text-black dark:text-white">الانضمام لغرفة</h3>
                 <p className="text-black/80 dark:text-white/80 font-bold text-lg">أدخل رمز الغرفة للبدء باللعب</p>
              </div>
            </button>
          </div>
        )}

        {view === 'create' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-black p-8 rounded-2xl neo-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
            <h2 className="text-3xl font-black text-black dark:text-white mb-8 border-b-4 border-black dark:border-white pb-4">إعدادات الغرفة</h2>
            <div className="space-y-8">
              <div>
                <label className="block text-black dark:text-white font-black mb-3 text-lg">أقصى عدد للاعبين (2 - 10)</label>
                <input 
                  type="number" 
                  min="2" max="10" 
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 2)}
                  className="w-full px-6 py-4 bg-white dark:bg-[#1a1a1a] neo-border font-black text-2xl dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] focus:neo-border outline-none transition-shadow"
                />
              </div>

              <div>
                <label className="block text-black dark:text-white font-black mb-4 text-lg">اختر المواد <span className="bg-amber-300 text-black px-2 py-1 rounded inline-block text-sm border-2 border-black ml-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">مادتين كحد أقصى</span></label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => setSelectedSubjects([])}
                    className={`p-4 rounded-xl border-2 transition-all font-black flex items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]  ${
                      selectedSubjects.length === 0 
                        ? 'neo-bg-yellow border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-y-0' 
                        : 'bg-white dark:bg-[#1a1a1a] border-black dark:border-white text-black dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]'
                    }`}
                  >
                    مختلط
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
                      className={`p-4 rounded-xl border-2 transition-all font-black flex items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                        selectedSubjects.includes(sub.id)
                          ? 'neo-bg-teal border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-y-0' 
                          : 'bg-white dark:bg-[#1a1a1a] border-black dark:border-white text-black dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]'
                      } ${!selectedSubjects.includes(sub.id) && selectedSubjects.length >= 2 ? 'opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : ''}`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleCreateRoom}
                disabled={loading}
                className="w-full py-5 neo-bg-yellow border-4 border-black text-black rounded-2xl font-black text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all flex items-center justify-center gap-3 mt-8"
              >
                {loading ? <Loader2 className="animate-spin" size={28} /> : 'إنشاء الغرفة'}
              </button>
            </div>
          </motion.div>
        )}

        {view === 'join' && (
          <motion.form onSubmit={handleJoinRoom} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-black p-8 rounded-2xl neo-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] space-y-8 max-w-xl mx-auto">
            <h2 className="text-3xl font-black text-black dark:text-white text-center">الانضمام لغرفة</h2>
            <div className="space-y-4">
              <label className="block text-black dark:text-white font-black text-lg text-center">أدخل رمز الغرفة</label>
              <input 
                type="text" 
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="A7B9F1"
                className="w-full px-6 py-6 bg-white dark:bg-[#1a1a1a] neo-border font-black text-center text-4xl uppercase tracking-[0.5em] text-black dark:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] focus:neo-border focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] outline-none transition-all placeholder:tracking-normal"
              />
            </div>
            <button 
              type="submit"
              disabled={loading || !roomCode}
              className="w-full py-5 neo-bg-teal border-4 border-black text-black rounded-2xl font-black text-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin" size={32} /> : 'انضمام الآن'}
            </button>
          </motion.form>
        )}

        {view === 'lobby' && roomData && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-black p-8 rounded-2xl neo-border shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] text-center space-y-10">
            <h2 className="text-4xl font-black text-black dark:text-white border-b-4 border-black dark:border-white pb-6 inline-block">غرفة الانتظار</h2>
            
            <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-2xl neo-border inline-block min-w-[300px] mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] neo-bg-pink">
               <p className="text-black font-black text-lg mb-4">رمز الغرفة للاصدقاء</p>
               <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                 <span className="text-6xl font-black tracking-widest text-black bg-white border-4 border-black px-6 py-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{roomCode}</span>
                 <button onClick={copyCode} className="p-5 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all text-black">
                   {copied ? <CheckCircle2 size={40} className="text-green-500" /> : <Copy size={40} />}
                 </button>
               </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-black text-black dark:text-white flex items-center justify-center gap-3">
                 <Users size={32} />
                 اللاعبون ({roomData.players?.length || 0} / {roomData.maxPlayers})
              </h3>
              <div className="flex flex-wrap justify-center gap-4">
                {roomData.players?.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 bg-white dark:bg-[#1a1a1a] text-black dark:text-white border-4 border-black dark:border-white px-6 py-3 rounded-2xl font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                    <span className="w-8 h-8 rounded-full bg-slate-200 border-2 border-black flex items-center justify-center text-sm">{i+1}</span>
                    {p.name}
                  </div>
                ))}
              </div>
            </div>

            {roomData.hostId === (user.id || user.uid) ? (
              <button 
                onClick={startGame}
                disabled={roomData.players?.length < 1}
                className="w-full sm:w-auto px-16 py-6 neo-bg-yellow border-4 border-black text-black rounded-2xl font-black text-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all mx-auto inline-flex"
              >
                بدء التحدي
              </button>
            ) : (
              <div className="p-6 bg-slate-100 dark:bg-slate-800 border-4 border-black dark:border-white rounded-2xl font-black text-xl flex flex-col items-center gap-4 text-black dark:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                <Loader2 className="animate-spin" size={40} />
                بانتظار المضيف لبدء التحدي...
              </div>
            )}
          </motion.div>
        )}

        {view === 'playing' && questions.length > 0 && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-black p-6 rounded-2xl neo-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] gap-4 neo-bg-blue">
               <span className="font-black text-2xl text-black">السؤال {currentQuestionIdx + 1} / {questions.length}</span>
               <span className="font-black text-black bg-white border-4 border-black px-6 py-2 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-2xl">{score} نقاط</span>
            </div>

            <motion.div 
              key={currentQuestionIdx}
              initial={{ opacity: 0, x: -20, rotate: -2 }} animate={{ opacity: 1, x: 0, rotate: 0 }}
              className="bg-white dark:bg-black p-10 py-16 rounded-3xl neo-border shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] space-y-12 text-center"
            >
              <h3 className="text-4xl md:text-5xl font-black text-black dark:text-white leading-tight">
                {questions[currentQuestionIdx]?.question}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {questions[currentQuestionIdx]?.options?.map((opt: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => submitAnswer(idx)}
                    className="group relative p-6 bg-white dark:bg-[#1a1a1a] border-4 border-black dark:border-white rounded-2xl font-black text-2xl text-black dark:text-white hover:neo-bg-yellow hover:text-black dark:hover:text-black hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-all active:translate-y-0 active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex items-center"
                  >
                    <span className="w-12 h-12 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-black ml-6 shrink-0 group-hover:bg-white group-hover:text-black group-hover:border-4 group-hover:border-black">
                      {['أ', 'ب', 'ج', 'د'][idx]}
                    </span>
                    <span className="text-right flex-1">{opt}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {view === 'results' && roomData && (
          <motion.div initial={{ opacity: 0, scale: 0.9, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} className="bg-white dark:bg-black p-10 rounded-3xl neo-border shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] text-center space-y-10">
            <div className="w-32 h-32 neo-bg-yellow border-4 border-black text-black rounded-2xl flex items-center justify-center mx-auto shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rotate-3">
              <Trophy size={64} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-5xl font-black text-black dark:text-white mb-4">النتائج النهائية</h2>
              <p className="text-black/80 dark:text-white/80 font-bold text-xl">تم الانتهاء من جميع الأسئلة!</p>
            </div>

            <div className="space-y-6 max-w-md mx-auto">
              {[...roomData.players].sort((a,b) => b.score - a.score).map((p: any, i: number) => (
                <div key={i} className="flex flex-col gap-4">
                   <div className="flex items-center justify-between p-6 bg-white dark:bg-[#1a1a1a] rounded-2xl neo-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                     <span className="font-black text-2xl text-black dark:text-white flex items-center gap-4">
                       <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 border-2 border-black dark:border-white rounded-xl flex items-center justify-center text-2xl">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}
                       </div>
                       {p.name}
                     </span>
                     <span className="font-black text-3xl text-black dark:text-white">{p.score} نقطة</span>
                   </div>
                   {p.uid === (user.id || user.uid) && i === 0 && (
                      <div className="neo-bg-teal text-black border-4 border-black p-4 rounded-xl font-black text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce mt-2">
                         أنت بطل الغرفة!
                      </div>
                   )}
                </div>
              ))}
            </div>

            <button
               onClick={() => setView('menu')}
               className="px-10 py-5 bg-black text-white dark:bg-white dark:text-black rounded-2xl font-black text-2xl hover:-translate-y-1 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] active:translate-y-0 active:shadow-none mt-8"
            >
              العودة للمنصة الرئيسية
            </button>
          </motion.div>
        )}

      </div>
    </div>
  );
}
