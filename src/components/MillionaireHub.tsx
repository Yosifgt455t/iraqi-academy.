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
    <div className="max-w-2xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center" dir="rtl">
      <header className="flex items-center gap-4 mb-12">
        <button
          onClick={onBack}
          className="p-3 bg-white dark:bg-[#18181B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowRight size={24} />
        </button>
      </header>

      <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter">من سيربح المليون</h1>
      <p className="text-slate-500 dark:text-slate-400 font-medium mb-12">اختبر معلوماتك وتنافس للوصول إلى المليون بطريقتك الخاصة</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <button
          onClick={() => setMode('single')}
          className="premium-card flex flex-col items-center justify-center min-h-[220px] text-center group hover:-translate-y-2 transition-transform border border-emerald-100 dark:border-emerald-900/50"
        >
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
            <User size={40} />
          </div>
          <h3 className="font-black text-slate-900 dark:text-white text-2xl mb-2">لعب مفرد</h3>
          <p className="text-sm text-[#71717A] dark:text-slate-400 font-medium">العب مع وسائل المساعدة واختبر سرعتك وذكائك</p>
        </button>

        <button
          onClick={() => setMode('multi')}
          className="premium-card flex flex-col items-center justify-center min-h-[220px] text-center group hover:-translate-y-2 transition-transform border border-blue-100 dark:border-blue-900/50"
        >
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
            <Users size={40} />
          </div>
          <h3 className="font-black text-slate-900 dark:text-white text-2xl mb-2">أونلاين مع الأصدقاء</h3>
          <p className="text-sm text-[#71717A] dark:text-slate-400 font-medium">أنشئ غرفة أو انضم وتحدى أصدقائك في نفس الأسئلة</p>
        </button>
      </div>
    </div>
  );
}
