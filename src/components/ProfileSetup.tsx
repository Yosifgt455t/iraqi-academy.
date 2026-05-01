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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200"
      >
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center">
              <User className="text-white w-10 h-10" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">ما هو اسمك؟</h2>
            <p className="text-slate-500">من فضلك أدخل اسمك لنعرف كيف نناديك يا بطل.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: يوسف حكيم"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-center text-xl font-bold text-slate-800"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                <Sparkles size={20} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <span>تأكيد الاسم</span>
                  <CheckCircle2 size={20} />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-slate-400">يمكنك دائماً تغيير اسمك لاحقاً من إعدادات الحساب.</p>
        </div>
      </motion.div>
    </div>
  );
}
