import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, MessageCircle, Mail, Globe, MapPin } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactUsModal({ isOpen, onClose }: Props) {
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
          <div className="p-6 border-b-4 border-black dark:border-white bg-[#FFEEA7] dark:bg-[#ca8a04] shrink-0 sticky top-0 z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black dark:text-white">
                <Phone size={24} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-black text-black dark:text-white">تواصل معنا</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl text-black dark:text-white hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all flex item-center"
            >
              <X size={24} strokeWidth={2.5} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative bg-slate-50 dark:bg-slate-900 text-black dark:text-white">
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '32px 32px' }} />
            
            <div className="space-y-6 relative z-10">
              <p className="text-lg font-bold leading-relaxed">
                يسعدنا تواصلكم معنا لأي استفسارات أو ملاحظات أو اقتراحات لتطوير المنصة.
              </p>
              
              <div className="grid gap-4">
                <a href="https://t.me/yosifhkem" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-white dark:bg-[#1a1a1a] rounded-xl border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all">
                  <div className="w-12 h-12 neo-bg-blue border-2 border-black rounded-lg flex items-center justify-center text-black shrink-0">
                    <MessageCircle size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="font-black text-lg">تيليجرام</h4>
                    <p className="font-bold opacity-80">yosifhkem@</p>
                  </div>
                </a>
                
                <a href="https://www.instagram.com/yosifhkem?igsh=MWNtdmEzMm52dWp0bQ==" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-white dark:bg-[#1a1a1a] rounded-xl border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all">
                  <div className="w-12 h-12 neo-bg-pink border-2 border-black rounded-lg flex items-center justify-center text-black shrink-0">
                    <div className="w-6 h-6 border-2 border-black rounded-md flex items-center justify-center relative"><div className="w-2 h-2 bg-black rounded-full"></div><div className="w-1 h-1 bg-black rounded-full absolute top-0.5 right-0.5"></div></div>
                  </div>
                  <div>
                    <h4 className="font-black text-lg">انستغرام</h4>
                    <p className="font-bold opacity-80">yosifhkem@</p>
                  </div>
                </a>

                <div className="flex items-center gap-4 p-4 bg-white dark:bg-[#1a1a1a] rounded-xl border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  <div className="w-12 h-12 neo-bg-teal border-2 border-black rounded-lg flex items-center justify-center text-black shrink-0">
                    <Mail size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="font-black text-lg">البريد الإلكتروني</h4>
                    <p className="font-bold opacity-80">yosifhkem009@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-white dark:bg-[#1a1a1a] rounded-xl border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  <div className="w-12 h-12 neo-bg-green border-2 border-black rounded-lg flex items-center justify-center text-black shrink-0">
                    <MapPin size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="font-black text-lg">العنوان</h4>
                    <p className="font-bold opacity-80">العراق</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
