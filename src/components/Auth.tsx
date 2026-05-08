import React, { useState } from 'react';
import { signInWithGoogle } from '../lib/firebase';
import { LogIn, Loader2, ArrowLeft, Sparkles, BookOpen, Target, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Step = 'welcome' | 'about' | 'features' | 'auth';

interface Props {
  onGuest: () => void;
}

export default function Auth({ onGuest }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول بجوجل');
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
            <div className="flex justify-center">
              <div className="w-24 h-24 neo-bg-blue border-2 border-black dark:border-white rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                <Sparkles className="text-black w-12 h-12" />
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-black text-black dark:text-white tracking-tight">أهلاً بك في عراقي أكاديمي</h1>
              <p className="text-lg text-black/80 dark:text-white/80 font-bold leading-relaxed">
                منصتك التعليمية الأولى للتفوق والنجاح في كافة المراحل الدراسية.
              </p>
            </div>
            <div className="space-y-4 pt-4">
              <button
                onClick={nextStep}
                className="w-full py-4 neo-bg-teal border-2 border-black dark:border-white text-black rounded-xl font-black text-xl flex items-center justify-center gap-2 hover:-translate-y-1 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                ابدأ الآن
                <ArrowLeft className="w-6 h-6" strokeWidth={3} />
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
              <div className="w-20 h-20 neo-bg-green border-2 border-black dark:border-white rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                <BookOpen className="text-black w-10 h-10" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-black dark:text-white">فكرة التطبيق</h2>
              <p className="text-lg text-black/80 dark:text-white/80 font-bold leading-relaxed">
                نهدف إلى تبسيط المناهج العراقية من خلال تنظيم المحاضرات، الملازم، والاختبارات الذكية في مكان واحد، لتوفير وقتك وجهدك.
              </p>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                onClick={prevStep}
                className="flex-1 py-4 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white rounded-xl font-black text-lg hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                رجوع
              </button>
              <button
                onClick={nextStep}
                className="flex-[2] py-4 neo-bg-teal border-2 border-black dark:border-white text-black rounded-xl font-black text-lg flex items-center justify-center gap-2 hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                التالي
                <ArrowLeft className="w-5 h-5" strokeWidth={3} />
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
              <div className="w-20 h-20 neo-bg-yellow border-2 border-black dark:border-white rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                <Target className="text-black w-10 h-10" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black text-black dark:text-white">لماذا تختارنا؟</h2>
              <div className="grid grid-cols-1 gap-4 text-right">
                {[
                  'تنظيم دقيق لكل فصل دراسي',
                  'اختبارات "قلب البطاقة" الذكية',
                  'تتبع تقدمك في كل مادة',
                  'وصول سريع لأفضل الملازم'
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                    <CheckCircle2 className="text-emerald-500 w-6 h-6 flex-shrink-0" strokeWidth={3} />
                    <span className="text-black dark:text-white font-black">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                onClick={prevStep}
                className="flex-1 py-4 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white rounded-xl font-black text-lg hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                رجوع
              </button>
              <button
                onClick={nextStep}
                className="flex-[2] py-4 neo-bg-pink border-2 border-black dark:border-white text-black rounded-xl font-black text-lg flex items-center justify-center gap-2 hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                انضم إلينا
                <ArrowLeft className="w-5 h-5" strokeWidth={3} />
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
              <h2 className="text-4xl font-black text-black dark:text-white">
                تسجيل الدخول
              </h2>
              <p className="mt-2 text-black/80 dark:text-white/80 font-bold">
                مرحباً بعودتك يا بطل
              </p>
            </div>

            <div className="space-y-4 pt-4">
              {error && (
                <div className="text-black font-bold text-sm neo-bg-red p-4 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {error}
                </div>
              )}

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center py-4 px-4 border-2 border-black dark:border-white rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] text-black dark:text-white bg-white dark:bg-black hover:neo-bg-yellow dark:hover:neo-bg-yellow hover:text-black transition-all hover:-translate-y-1 active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:grayscale font-black text-xl gap-4 group"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-8 w-8" />
                ) : (
                  <>
                    <svg className="w-8 h-8 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>الدخول بواسطة جوجل</span>
                  </>
                )}
              </button>
            </div>
            
            <button
              onClick={prevStep}
              className="w-full py-4 text-black/60 dark:text-white/60 font-bold text-sm hover:text-black dark:hover:text-white transition-colors mt-4"
            >
              رجوع للخطوات السابقة
            </button>
          </motion.div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center p-4 font-sans min-h-screen dark:bg-[#1a1a1a]" dir="rtl">
      <div className="w-full max-w-md bg-white dark:bg-black p-8 neo-border overflow-hidden">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>
    </div>
  );
}
