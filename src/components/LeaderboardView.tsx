import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Profile } from '../types';
import { motion } from 'motion/react';
import { Trophy, Medal, Crown, Flame, Star, Loader2, User as UserIcon } from 'lucide-react';

export default function LeaderboardView() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          orderBy('xp', 'desc'),
          limit(20)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLeaders(list);
      } catch (err) {
        console.error('Error fetching leaders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaders();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={40} />
        <p className="text-slate-500 dark:text-slate-400 font-bold">جاري تحميل قائمة المتصدرين...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700" dir="rtl">
      <div className="text-center space-y-6 neo-border bg-white dark:bg-black p-8 neo-bg-yellow">
        <div className="w-24 h-24 bg-white border-4 border-black text-black rounded-full flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Trophy size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-black">قائمة المتصدرين في العراق</h2>
          <p className="text-black/80 font-bold text-lg max-w-md mx-auto">نافس زملاءك واحصل على أعلى النقاط لتكون في قمة الهرم التعليمي!</p>
        </div>
      </div>

      {leaders.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-black rounded-2xl neo-border max-w-2xl mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <p className="text-black dark:text-white font-black text-2xl mb-2">لا يوجد متصدرين حالياً</p>
          <p className="font-bold text-black/60 dark:text-white/60">ابدأ بالدراسة واجمع النقاط لتكون أول المتصدرين!</p>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-4">
          {leaders.map((student, index) => {
          const isTop3 = index < 3;
          let bgClass = 'bg-white dark:bg-[#1a1a1a]';
          if (index === 0) bgClass = 'neo-bg-yellow';
          else if (index === 1) bgClass = 'bg-slate-100 dark:bg-slate-800';
          else if (index === 2) bgClass = 'neo-bg-pink';

          return (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-5 neo-border flex items-center gap-6 group transition-all hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] min-h-[90px] ${bgClass}`}
            >
              <div className="w-16 h-16 flex items-center justify-center flex-shrink-0 font-black text-2xl bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">
                {index === 0 ? <Crown className="text-amber-500" size={36} fill="currentColor" />
                : index === 1 ? <Medal className="text-slate-400" size={32} />
                : index === 2 ? <Medal className="text-orange-400" size={32} />
                : <span>#{index + 1}</span>}
              </div>

              <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border-2 border-black dark:border-white flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                {student.photoURL ? (
                  <img src={student.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-black bg-slate-100">
                    <UserIcon size={32} />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h4 className={`font-black text-2xl truncate ${isTop3 ? 'text-black' : 'text-black dark:text-white'}`}>
                  {student.displayName || student.username || student.full_name || "طالب مجهول"}
                </h4>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm font-black text-black bg-white border-2 border-black px-3 py-1 rounded-lg">
                    المستوى {student.level || 1}
                  </span>
                  {student.streak && student.streak.count > 0 && (
                    <div className="flex items-center gap-1 text-orange-600 bg-orange-100 border-2 border-orange-600 px-2 py-1 rounded-lg text-sm font-black">
                      <Flame size={16} fill="currentColor" />
                      <span>{student.streak.count}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-left bg-white border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-black font-black text-2xl">
                  {student.xp?.toLocaleString() || 0}
                </div>
                <div className="text-xs font-black text-black/60 uppercase tracking-widest mt-1">XP</div>
              </div>
            </motion.div>
          );
        })}
      </div>
      )}
      
      <div className="neo-bg-teal neo-border p-10 text-black text-center space-y-6 mt-16 max-w-3xl mx-auto shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
         <div className="relative z-10 space-y-4">
           <h3 className="text-3xl font-black italic">كن الأول على دفعتك!</h3>
           <p className="font-bold text-lg max-w-lg mx-auto">كلما درست أكثر، كلما زادت فرصك في الظهور هنا أمام آلاف الطلاب.</p>
           <div className="flex items-center justify-center gap-3 text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
             <Star fill="currentColor" size={28} />
             <Star fill="currentColor" size={36} />
             <Star fill="currentColor" size={28} />
           </div>
         </div>
      </div>
    </div>
  );
}
