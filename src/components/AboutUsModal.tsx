import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, GraduationCap, Heart, Star } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutUsModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-black w-full max-w-lg rounded-2xl neo-border shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] overflow-hidden flex flex-col max-h-[85vh]"
          dir="rtl"
        >
          <div className="p-4 sm:p-6 border-b-4 border-black dark:border-white bg-[#A7F3D0] dark:bg-[#059669] shrink-0 sticky top-0 z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black dark:text-white">
                <Info className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-black dark:text-white">من نحن</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl text-black dark:text-white hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all flex item-center"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
            </button>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 relative bg-slate-50 dark:bg-slate-900 text-black dark:text-white">
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '32px 32px' }} />
            
            <div className="space-y-8 relative z-10 text-center py-4">
              <div className="w-24 h-24 bg-white border-4 border-black dark:border-white rounded-3xl flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] rotate-3 neo-bg-blue !text-black">
                <GraduationCap size={48} strokeWidth={2.5} />
              </div>
              
              <div>
                <h3 className="text-3xl font-black mb-4">منصة عراقي أكاديمي</h3>
                <p className="text-xl font-bold bg-white dark:bg-black border-2 border-black dark:border-white p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] leading-relaxed">
                  أنا طالب عراقي أعمل بمفردي على هذه المنصة لمساعدة الطلاب في مسيرتهم الدراسية.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#1a1a1a] p-4 border-2 border-black dark:border-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex flex-col items-center gap-2">
                  <Heart size={32} className="text-red-500" fill="currentColor" strokeWidth={2.5} />
                  <span className="font-black">صنع بحب</span>
                </div>
                <div className="bg-white dark:bg-[#1a1a1a] p-4 border-2 border-black dark:border-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex flex-col items-center gap-2">
                  <Star size={32} className="text-yellow-400" fill="currentColor" strokeWidth={2.5} />
                  <span className="font-black">محتوى مميز</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
