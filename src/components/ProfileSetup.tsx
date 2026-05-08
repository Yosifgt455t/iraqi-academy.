import React, { useState } from 'react';
import { setUserProfile } from '../lib/firebase';
import { User, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  user: any;
  onComplete: (name: string) => void;
}

export default function ProfileSetup({ user, onComplete }: Props) {
  const [name, setName] = useState(user.displayName || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await setUserProfile(user.uid, {
        uid: user.uid,
        email: user.email,
        displayName: name.trim(),
        photoURL: user.photoURL,
        grade: null, // Will be set in next step
        xp: 0,
        level: 1,
        streak: { count: 0, lastUpdate: '' }
      });
      onComplete(name.trim());
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#1a1a1a] p-4 font-sans selection:bg-pink-200" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-black p-8 neo-border"
      >
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 neo-bg-blue border-2 border-black dark:border-white rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <User className="text-black w-10 h-10" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-black dark:text-white">ما هو اسمك؟</h2>
            <p className="text-black/80 dark:text-white/80 font-bold">من فضلك أدخل اسمك لنعرف كيف نناديك يا بطل.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 pt-4">
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: يوسف حكيم"
                className="w-full px-6 py-4 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl focus:outline-none transition-all text-center text-2xl font-black text-black dark:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-y-0.5"
              />
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-black dark:text-white">
                <Sparkles size={24} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-4 neo-bg-teal border-2 border-black dark:border-white text-black rounded-xl font-black text-xl flex items-center justify-center gap-3 transition-all hover:-translate-y-1 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:grayscale"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <span>تأكيد الاسم</span>
                  <CheckCircle2 size={24} />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-black/60 dark:text-white/60 font-bold mt-4">يمكنك دائماً تغيير اسمك لاحقاً من إعدادات الحساب.</p>
        </div>
      </motion.div>
    </div>
  );
}
