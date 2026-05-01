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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700" dir="rtl">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm shadow-amber-50 dark:shadow-none">
          <Trophy size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white">قائمة المتصدرين في العراق</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">نافس زملاءك واحصل على أعلى النقاط لتكون في قمة الهرم التعليمي!</p>
      </div>

      {leaders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm max-w-2xl mx-auto">
          <p className="text-slate-500 dark:text-slate-400 font-bold mb-2">لا يوجد متصدرين حالياً</p>
          <p className="text-sm text-slate-400">ابدأ بالدراسة واجمع النقاط لتكون أول المتصدرين!</p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-3">
          {leaders.map((student, index) => {
          const isTop3 = index < 3;
          let bgClass = 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800';
          if (index === 0) bgClass = 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/50';
          else if (index === 1) bgClass = 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700';
          else if (index === 2) bgClass = 'bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-900/50';

          return (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-xl border flex items-center gap-4 group transition-all hover:scale-[1.02] shadow-sm ${bgClass}`}
            >
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 font-black text-xl">
                {index === 0 ? <Crown className="text-amber-500" size={32} />
                : index === 1 ? <Medal className="text-slate-400" size={28} />
                : index === 2 ? <Medal className="text-orange-400" size={28} />
                : <span className="text-slate-400 dark:text-slate-500">#{index + 1}</span>}
              </div>

              <div className="w-12 h-12 rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex-shrink-0">
                {student.photoURL ? (
                  <img src={student.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                    <UserIcon size={24} />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h4 className="font-black text-slate-900 dark:text-white truncate">
                  {student.displayName || student.username || student.full_name || "طالب مجهول"}
                </h4>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    المستوى {student.level || 1}
                  </span>
                  {student.streak && student.streak.count > 0 && (
                    <div className="flex items-center gap-1 text-orange-500 text-xs font-black">
                      <Flame size={12} fill="currentColor" />
                      <span>{student.streak.count}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-left">
                <div className="text-blue-600 dark:text-blue-400 font-black text-lg">
                  {student.xp?.toLocaleString() || 0}
                </div>
                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">XP</div>
              </div>
            </motion.div>
          );
        })}
      </div>
      )}
      
      <div className="bg-blue-600 p-8 rounded-[3rem] text-white text-center space-y-4 shadow-md shadow-blue-200 dark:shadow-none mt-12 overflow-hidden relative">
         <div className="relative z-10 space-y-4">
           <h3 className="text-2xl font-black italic">كن الأول على دفعتك!</h3>
           <p className="text-blue-100 font-medium">كلما درست أكثر، كلما زادت فرصك في الظهور هنا أمام آلاف الطلاب.</p>
           <div className="flex items-center justify-center gap-2 text-amber-300">
             <Star fill="currentColor" size={20} />
             <Star fill="currentColor" size={24} />
             <Star fill="currentColor" size={20} />
           </div>
         </div>
         <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-12 -translate-y-12 blur-3xl"></div>
         <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-400/20 rounded-full translate-x-12 translate-y-12 blur-3xl"></div>
      </div>
    </div>
  );
}
