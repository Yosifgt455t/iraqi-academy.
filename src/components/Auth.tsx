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

            <div className="space-y-4">
              {error && (
                <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center py-4 px-4 border border-slate-200 rounded-xl shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 font-bold text-lg gap-3"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-6 w-6" />
                ) : (
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
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
                    <span>التسجيل بواسطة جوجل</span>
                  </>
                )}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400">أو</span>
                </div>
              </div>

              <button
                onClick={onGuest}
                className="w-full py-4 px-4 border border-transparent rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all font-bold text-lg"
              >
                الاستمرار كزائر
              </button>
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
