import React, { useState, useRef } from 'react';
import { updateUserProfile } from '../lib/firebase';
import { X, User, Mail, Save, Loader2, Camera, LogOut, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function AccountSettingsModal({ user, isOpen, onClose, onLogout }: Props) {
  const [name, setName] = useState(user.displayName || user.user_metadata?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user.photoURL || user.user_metadata?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('الرجاء اختيار ملف صورة صالح');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max dimensions 200x200
        const MAX_SIZE = 200;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress carefully, max 0.8 quality
          const resizedBase64 = canvas.toDataURL('image/webp', 0.8);
          setAvatarUrl(resizedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      if (user.id !== 'guest_user') {
        await updateUserProfile(user.id, {
          displayName: name.trim(),
          ...(avatarUrl && { photoURL: avatarUrl })
        });
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl overflow-hidden" dir="rtl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden relative"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                  <User size={20} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">إعدادات الحساب</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Profile Pic Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => user.id !== 'guest_user' && fileInputRef.current?.click()}>
                  <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-white shadow-xl">
                    <img 
                      src={avatarUrl || user?.photoURL || user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || user.displayName || user.user_metadata?.full_name || 'User')}&background=2563eb&color=fff`} 
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {user.id !== 'guest_user' && (
                    <>
                      <button type="button" className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all pointer-events-none">
                        <Camera size={14} />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </>
                  )}
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg text-slate-900">{name}</h3>
                  <p className="text-xs text-slate-400 font-mono tracking-wider">{user.id === 'guest_user' ? 'حساب زائر' : 'حساب رسمي'}</p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
                    <User size={12} /> الاسم الشخصي
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold"
                  />
                </div>

                {user.id !== 'guest_user' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1">
                      <Mail size={12} /> البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user.email || 'غير متاح'}
                      className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-400 font-mono"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (name.trim() === (user.displayName || user.user_metadata?.full_name) && (!avatarUrl || avatarUrl === (user.photoURL || user.user_metadata?.avatar_url)))}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-30"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : success ? (
                    <>تم الحفظ بنجاح!</>
                  ) : (
                    <>
                      <Save size={18} />
                      حفظ التغييرات
                    </>
                  )}
                </button>
              </form>

              {/* Danger Zone */}
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                <button
                  onClick={onLogout}
                  className="w-full py-3 bg-red-50 text-red-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
                >
                  <LogOut size={18} />
                  تسجيل الخروج
                </button>
              </div>
            </div>

            {/* Success Message toast-like */}
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  className="absolute bottom-6 left-6 right-6 bg-emerald-600 text-white p-3 rounded-xl text-center text-sm font-bold shadow-xl"
                >
                  تم حفظ التغييرات بنجاح ✨
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
