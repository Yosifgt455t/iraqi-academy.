import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Loader2, ArrowRight, ArrowLeft, Sparkles, BookOpen, Target, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Step = 'welcome' | 'about' | 'features' | 'auth';

interface Props {
  onGuest: () => void;
}

export default function Auth({ onGuest }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // Only login allowed
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Transform username to a dummy email for Supabase Auth
      const internalEmail = `${username.trim().toLowerCase()}@iraqi.academy`;

      // Check if Supabase is properly configured
      if (supabase.auth.getSession === undefined || import.meta.env.VITE_SUPABASE_URL?.includes('placeholder')) {
        throw new Error('يرجى ضبط إعدادات Supabase في الإعدادات (Secrets) أولاً.');
      }

      // Add a timeout to the request
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('انتهت مهلة الاتصال. تأكد من جودة الإنترنت أو إعدادات سوبا بيس.')), 10000)
      );

      if (isSignUp) {
        // Sign up disabled as requested
        return;
      } else {
        const { error } = await Promise.race([
          supabase.auth.signInWithPassword({ email: internalEmail, password }),
          timeoutPromise
        ]) as any;
        if (error) throw error;
      }
    } catch (err: any) {
      if (err.message === 'User already registered') {
        setError('اسم المستخدم هذا محجوز بالفعل. جرب واحداً آخر.');
      } else if (err.message === 'Invalid login credentials') {
        setError('خطأ في اسم المستخدم أو كلمة المرور.');
      } else {
        setError(err.message || 'حدث خطأ ما');
      }
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 'welcome') setStep('about');
    else if (step === 'about') setStep('features');
    else if (step === 'features') setStep('auth');
  };

  const prevStep = () => {
    if (step === 'about') setStep('welcome');
    else if (step === 'features') setStep('about');
    else if (step === 'auth') setStep('features');
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center space-y-8"
          >
            <div className="flex justify-center mb-2">
              <div className="bg-blue-50 text-blue-800 px-5 py-3 rounded-2xl text-sm font-bold border border-blue-100 flex flex-col items-center gap-1 shadow-sm">
                <span>اعداد الطالب: يوسف حكيم</span>
                <span>اشراف: م.م احمد قاسم ناصر</span>
                <span className="text-xs text-blue-600 mt-1">ثانوية الميمونة للمتفوقين والمتفوقات</span>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Sparkles className="text-white w-12 h-12" />
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">أهلاً بك في عراقي أكاديمي</h1>
              <p className="text-lg text-slate-600 leading-relaxed">
                منصتك التعليمية الأولى للتفوق والنجاح في كافة المراحل الدراسية.
              </p>
            </div>
            <div className="space-y-4">
              <button
                onClick={nextStep}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
              >
                ابدأ الآن
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={onGuest}
                className="w-full py-2 text-slate-500 font-medium hover:text-blue-600 transition-colors"
              >
                تخطي تسجيل الدخول
              </button>
            </div>
          </motion.div>
        );

      case 'about':
        return (
          <motion.div
            key="about"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center space-y-8"
          >
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                <BookOpen className="text-emerald-600 w-10 h-10" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-slate-900">فكرة التطبيق</h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                نهدف إلى تبسيط المناهج العراقية من خلال تنظيم المحاضرات، الملازم، والاختبارات الذكية في مكان واحد، لتوفير وقتك وجهدك.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={prevStep}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                رجوع
              </button>
              <button
                onClick={nextStep}
                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
              >
                التالي
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      case 'features':
        return (
          <motion.div
            key="features"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center space-y-8"
          >
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                <Target className="text-amber-600 w-10 h-10" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-slate-900">لماذا تختارنا؟</h2>
              <div className="grid grid-cols-1 gap-4 text-right">
                {[
                  'تنظيم دقيق لكل فصل دراسي',
                  'اختبارات "قلب البطاقة" الذكية',
                  'تتبع تقدمك في كل مادة',
                  'وصول سريع لأفضل الملازم'
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <CheckCircle2 className="text-emerald-500 w-5 h-5 flex-shrink-0" />
                    <span className="text-slate-700 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={prevStep}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                رجوع
              </button>
              <button
                onClick={nextStep}
                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
              >
                انضم إلينا
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        );

      case 'auth':
        return (
          <motion.div
            key="auth"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-900">
                تسجيل الدخول
              </h2>
              <p className="mt-2 text-slate-600">
                مرحباً بعودتك يا بطل
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleAuth}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">اسم المستخدم</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: hasanfalih"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-left"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">كلمة المرور</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 font-bold text-lg"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-6 w-6" />
                ) : (
                  <>
                    <LogIn className="ml-2 h-5 w-5" />
                    تسجيل الدخول
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-4 space-y-4">
              <div className="pt-2">
                <button
                  onClick={onGuest}
                  className="text-sm text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-4"
                >
                  الاستمرار كزائر (بدون حساب)
                </button>
              </div>
            </div>
            
            <button
              onClick={prevStep}
              className="w-full py-2 text-slate-400 text-xs hover:text-slate-600 transition-colors"
            >
              رجوع للخطوات السابقة
            </button>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans" dir="rtl">
      <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>
    </div>
  );
}
