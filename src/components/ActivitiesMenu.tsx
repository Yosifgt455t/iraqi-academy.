import { Trophy, Users, BookOpen, Crown, MessagesSquare, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onBack: () => void;
  onSelect: (view: 'community' | 'leaderboard' | 'reviews' | 'study_friend') => void;
}

export default function ActivitiesMenu({ onBack, onSelect }: Props) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <header className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-3 bg-white dark:bg-black rounded-xl neo-border text-black dark:text-white flex-shrink-0 hover:neo-bg-pink hover:text-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
        >
          <ArrowRight size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-black dark:text-white tracking-tight">الأنشطة والفعاليات</h1>
          <p className="font-bold text-slate-700 dark:text-slate-300">استكشف وتفاعل مع مجتمع عراقي أكاديمي</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => onSelect('study_friend')}
          className="bg-white dark:bg-[#1a1a1a] border-4 border-emerald-500 p-6 flex flex-col items-start justify-between min-h-[160px] text-right hover:-translate-y-2 relative overflow-hidden group md:col-span-2 shadow-[6px_6px_0px_0px_#10b981]"
        >
          <div className="absolute left-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity text-emerald-500">
            <Users size={180} className="translate-y-8 -translate-x-8" />
          </div>
          <div className="w-14 h-14 bg-emerald-500 border-2 border-black rounded-xl flex items-center justify-center text-black mb-4 group-hover:scale-110 transition-transform relative z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black">
            <Users size={28} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-black dark:text-white text-2xl group-hover:text-emerald-500 transition-colors">ادرس مع صديقك 🤝</h3>
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase animate-pulse">جديد</span>
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">ميزة المذاكرة المشتركة الحية! شارك صديقك المحاضرات والملخصات وتفاعل مع كأنه جالس بجانبك تماماً.</p>
          </div>
        </button>

        <button
          onClick={() => onSelect('community')}
          className="bg-white dark:bg-[#1a1a1a] neo-border p-6 flex flex-col items-start justify-between min-h-[160px] text-right neo-hover relative overflow-hidden group"
        >
          <div className="w-14 h-14 neo-bg-teal border-2 border-black dark:border-white rounded-xl flex items-center justify-center text-black mb-4 group-hover:scale-110 transition-transform relative z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <MessagesSquare size={28} />
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-black dark:text-white text-2xl group-hover:text-amber-500 transition-colors">المجتمع الأكاديمي</h3>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">ناقش الدروس وتواصل مع زملائك في بيئة دراسية تفاعلية</p>
          </div>
        </button>

        <button
          onClick={() => onSelect('leaderboard')}
          className="bg-white dark:bg-[#1a1a1a] neo-border p-6 flex flex-col items-start justify-between min-h-[160px] text-right neo-hover relative overflow-hidden group"
        >
          <div className="w-14 h-14 neo-bg-yellow border-2 border-black dark:border-white rounded-xl flex items-center justify-center text-black mb-4 group-hover:scale-110 transition-transform relative z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Crown size={28} />
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-black dark:text-white text-2xl group-hover:text-amber-500 transition-colors">لوحة المتصدرين</h3>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">تعرف على المتفوقين وتنافس للوصول إلى المراتب الأولى</p>
          </div>
        </button>

        <button
          onClick={() => onSelect('reviews')}
          className="bg-white dark:bg-[#1a1a1a] neo-border p-6 flex flex-col items-start justify-between min-h-[160px] text-right neo-hover relative overflow-hidden group md:col-span-2"
        >
          <div className="w-14 h-14 neo-bg-blue border-2 border-black dark:border-white rounded-xl flex items-center justify-center text-black mb-4 group-hover:scale-110 transition-transform relative z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <BookOpen size={28} />
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-black dark:text-white text-2xl group-hover:text-amber-500 transition-colors">المراجعة الشاملة</h3>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-2">تصفح الملخصات والملازم الذهبية للتحضير للامتحانات</p>
          </div>
        </button>
      </div>
    </div>
  );
}
