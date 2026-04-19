import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Calculator, 
  ListTodo, 
  ChevronLeft,
  ChevronDown,
  FileDown,
  FileEdit,
  Type,
  Languages
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenAI: () => void;
  onOpenCalculator: () => void;
  onOpenTodo: () => void;
  onOpenImageToPdf: () => void;
  onOpenTextToPdf: () => void;
  onOpenFileTranslator: () => void;
  onOpenExamBuilder: () => void;
}

export default function ToolsModal({ 
  isOpen, 
  onClose, 
  onOpenAI, 
  onOpenCalculator, 
  onOpenTodo, 
  onOpenImageToPdf, 
  onOpenTextToPdf,
  onOpenFileTranslator,
  onOpenExamBuilder
}: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-[101] flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-8 bg-blue-600 rounded-full" />
                الأدوات الأكاديمية
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Scroll Hint (Top) */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 pb-2 text-blue-500 border-b border-dashed border-blue-100"
              >
                <span className="text-[10px] font-bold">اسحب للأسفل لاستكشاف كافة الأدوات</span>
                <motion.div
                  animate={{ y: [0, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <ChevronDown size={12} />
                </motion.div>
              </motion.div>

              <button
                onClick={() => { onOpenAI(); onClose(); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all group"
              >
                <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <Sparkles size={24} />
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">تجريبي</span>
                    <h3 className="font-bold text-slate-900">المساعد الذكي (AI)</h3>
                  </div>
                  <p className="text-xs text-slate-500">رتب جدولك، لخص موادك، واسأل أي سؤال</p>
                </div>
                <ChevronLeft size={18} className="text-slate-300 group-hover:text-blue-600 group-hover:-translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => { onOpenExamBuilder(); onClose(); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all group"
              >
                <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
                  <FileEdit size={24} />
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">جديد</span>
                    <h3 className="font-bold text-slate-900">صانع الأسئلة (للمدرسين)</h3>
                  </div>
                  <p className="text-xs text-slate-500">صمم نسخة أسئلة امتحانية احترافية بدقيقة</p>
                </div>
                <ChevronLeft size={18} className="text-slate-300 group-hover:text-blue-600 group-hover:-translate-x-1 transition-all" />
              </button>

              <div
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 opacity-60 cursor-not-allowed"
              >
                <div className="w-12 h-12 bg-slate-400 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
                  <Languages size={24} />
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">قريباً</span>
                    <h3 className="font-bold text-slate-400">مترجم الملفات الذكي</h3>
                  </div>
                  <p className="text-xs text-slate-400">ترجمة الملازم والصور للعربية بدقة</p>
                </div>
                <ChevronLeft size={18} className="text-slate-300" />
              </div>

              <button
                onClick={() => { onOpenImageToPdf(); onClose(); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-orange-50 hover:border-orange-200 transition-all group"
              >
                <div className="w-12 h-12 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-200">
                  <FileDown size={24} />
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">جديد</span>
                    <h3 className="font-bold text-slate-900">تحويل الصور لـ PDF</h3>
                  </div>
                  <p className="text-xs text-slate-500">حول صور ملخصاتك إلى ملف واحد بسهولة</p>
                </div>
                <ChevronLeft size={18} className="text-slate-300 group-hover:text-orange-600 group-hover:-translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => { onOpenTextToPdf(); onClose(); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
              >
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                  <Type size={24} />
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">جديد</span>
                    <h3 className="font-bold text-slate-900">تحويل النص لـ PDF</h3>
                  </div>
                  <p className="text-xs text-slate-500">اكتب ملخصك وحوله لملف PDF جاهز</p>
                </div>
                <ChevronLeft size={18} className="text-slate-300 group-hover:text-emerald-600 group-hover:-translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => { onOpenCalculator(); onClose(); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
              >
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Calculator size={24} />
                </div>
                <div className="flex-1 text-right">
                  <h3 className="font-bold text-slate-900">حاسبة الإعفاء</h3>
                  <p className="text-xs text-slate-500">احسب درجاتك وتعرف على فرص إعفاءك</p>
                </div>
                <ChevronLeft size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:-translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => { onOpenTodo(); onClose(); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-teal-50 hover:border-teal-200 transition-all group"
              >
                <div className="w-12 h-12 bg-teal-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-teal-200">
                  <ListTodo size={24} />
                </div>
                <div className="flex-1 text-right">
                  <h3 className="font-bold text-slate-900">قائمة المهام اليومية</h3>
                  <p className="text-xs text-slate-500">سجل محاضراتك وأهدافك لليوم</p>
                </div>
                <ChevronLeft size={18} className="text-slate-300 group-hover:text-teal-600 group-hover:-translate-x-1 transition-all" />
              </button>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <p className="text-center text-xs text-slate-400">نحن هنا لمساعدتك على التفوق دائماً ✨</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
