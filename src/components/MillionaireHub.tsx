import { useState } from 'react';
import MillionaireGame from './MillionaireGame';
import MultiplayerQuiz from './MultiplayerQuiz';
import { ArrowRight, User, Users } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  user: any;
  userProfile: any;
  onBack: () => void;
}

export default function MillionaireHub({ user, userProfile, onBack }: Props) {
  const [mode, setMode] = useState<'menu' | 'single' | 'multi'>('menu');

  if (mode === 'single') {
    return <MillionaireGame onBack={() => setMode('menu')} />;
  }

  if (mode === 'multi') {
    return <MultiplayerQuiz user={user} userProfile={userProfile} onBack={() => setMode('menu')} />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center" dir="rtl">
      <header className="flex items-center gap-4 mb-12">
        <button
          onClick={onBack}
          className="p-3 bg-white border-2 border-black rounded-xl text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:neo-bg-yellow active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          <ArrowRight size={24} />
        </button>
      </header>

      <div className="neo-border bg-white dark:bg-black p-8 neo-bg-teal mb-12 py-12">
        <h1 className="text-5xl md:text-6xl font-black text-black mb-4 tracking-tighter">من سيربح المليون</h1>
        <p className="text-black/80 font-bold text-xl">اختبر معلوماتك وتنافس للوصول إلى المليون بطريقتك الخاصة</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <button
          onClick={() => setMode('single')}
          className="bg-white dark:bg-[#1a1a1a] neo-border p-8 flex flex-col items-center justify-center min-h-[280px] text-center hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-all active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group"
        >
          <div className="w-24 h-24 neo-bg-pink border-4 border-black dark:border-white rounded-2xl flex items-center justify-center text-black mb-8 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <User size={48} strokeWidth={2.5} />
          </div>
          <h3 className="font-black text-black dark:text-white text-3xl mb-3">لعب مفرد</h3>
          <p className="text-base text-black/80 dark:text-white/80 font-bold">العب مع وسائل المساعدة واختبر سرعتك وذكائك</p>
        </button>

        <button
          onClick={() => setMode('multi')}
          className="bg-white dark:bg-[#1a1a1a] neo-border p-8 flex flex-col items-center justify-center min-h-[280px] text-center hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-all active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group"
        >
          <div className="w-24 h-24 neo-bg-blue border-4 border-black dark:border-white rounded-2xl flex items-center justify-center text-black mb-8 group-hover:scale-110 group-hover:-rotate-6 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Users size={48} strokeWidth={2.5} />
          </div>
          <h3 className="font-black text-black dark:text-white text-3xl mb-3">أونلاين مع الأصدقاء</h3>
          <p className="text-base text-black/80 dark:text-white/80 font-bold">أنشئ غرفة أو انضم وتحدى أصدقائك في نفس الأسئلة</p>
        </button>
      </div>
    </div>
  );
}
