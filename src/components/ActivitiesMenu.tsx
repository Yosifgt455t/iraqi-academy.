import { Trophy, Users, BookOpen, Crown, MessagesSquare, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onBack: () => void;
  onSelect: (view: 'community' | 'leaderboard' | 'reviews' | 'quiz') => void;
}

export default function ActivitiesMenu({ onBack, onSelect }: Props) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <header className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-3 bg-white dark:bg-[#18181B] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowRight size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">الأنشطة والفعاليات</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">استكشف وتفاعل مع مجتمع عراقي أكاديمي</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => onSelect('community')}
          className="premium-card flex flex-col items-start justify-between min-h-[160px] text-right group hover:-translate-y-1 transition-transform relative overflow-hidden"
        >
          <div className="w-14 h-14 bg-[#F9FAFB] dark:bg-slate-800 rounded-2xl flex items-center justify-center text-[#71717A] dark:text-slate-400 mb-4 group-hover:text-amber-500 transition-colors relative z-10">
            <MessagesSquare size={28} />
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-slate-900 dark:text-white text-xl">المجتمع الأكاديمي</h3>
            <p className="text-sm text-[#71717A] dark:text-slate-400 font-medium mt-1">ناقش الدروس وتواصل مع زملائك في بيئة دراسية تفاعلية</p>
          </div>
        </button>

        <button
          onClick={() => onSelect('leaderboard')}
          className="premium-card flex flex-col items-start justify-between min-h-[160px] text-right group hover:-translate-y-1 transition-transform relative overflow-hidden"
        >
          <div className="w-14 h-14 bg-[#F9FAFB] dark:bg-slate-800 rounded-2xl flex items-center justify-center text-[#71717A] dark:text-slate-400 mb-4 group-hover:text-amber-400 transition-colors relative z-10">
            <Crown size={28} />
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-slate-900 dark:text-white text-xl">لوحة المتصدرين</h3>
            <p className="text-sm text-[#71717A] dark:text-slate-400 font-medium mt-1">تعرف على المتفوقين وتنافس للوصول إلى المراتب الأولى</p>
          </div>
        </button>

        <button
          onClick={() => onSelect('reviews')}
          className="premium-card flex flex-col items-start justify-between min-h-[160px] text-right group hover:-translate-y-1 transition-transform relative overflow-hidden"
        >
          <div className="w-14 h-14 bg-[#F9FAFB] dark:bg-slate-800 rounded-2xl flex items-center justify-center text-[#71717A] dark:text-slate-400 mb-4 group-hover:text-blue-500 transition-colors relative z-10">
            <BookOpen size={28} />
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-slate-900 dark:text-white text-xl">المراجعة الشاملة</h3>
            <p className="text-sm text-[#71717A] dark:text-slate-400 font-medium mt-1">تصفح الملخصات والملازم الذهبية للتحضير للامتحانات</p>
          </div>
        </button>

        <button
          onClick={() => onSelect('quiz')}
          className="premium-card flex flex-col items-start justify-between min-h-[160px] text-right group hover:-translate-y-1 transition-transform relative overflow-hidden ring-2 ring-transparent group-hover:ring-emerald-500"
        >
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 group-hover:bg-emerald-500 group-hover:text-white transition-colors relative z-10">
            <Trophy size={28} />
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-slate-900 dark:text-white text-xl">من سيربح المليون</h3>
            <p className="text-sm text-[#71717A] dark:text-slate-400 font-medium mt-1">تحدى نفسك أو أصدقائك في مسابقة ثقافية وعلمية ممتعة</p>
          </div>
        </button>
      </div>
    </div>
  );
}
