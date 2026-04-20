import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Link as LinkIcon, FileText, CheckCircle2, Type, Youtube, BookOpen, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy, onSnapshot } from 'firebase/firestore';

export type SourceType = 'link' | 'pdf' | 'text' | 'youtube';

export interface SavedSource {
  id: string;
  userId: string;
  type: SourceType;
  title: string;
  content: string; // url, text, or base64
  mimeType?: string;
  createdAt: string;
}

interface Props {
  userId: string;
  onClose: () => void;
  onAttachSource: (source: SavedSource) => void;
}

export default function SourcesModal({ userId, onClose, onAttachSource }: Props) {
  const [sources, setSources] = useState<SavedSource[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newType, setNewType] = useState<SourceType>('link');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string, base64: string, mimeType: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;

    if (userId === 'guest_user' || userId.includes('guest')) {
      const saved = localStorage.getItem(`user_sources_${userId}`);
      if (saved) setSources(JSON.parse(saved));
      setIsLoadingSources(false);
      return;
    }

    // Subscribe to sources
    const q = query(
      collection(db, 'sources'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedSource)));
      setIsLoadingSources(false);
    }, (err) => {
      console.error('Error fetching sources:', err);
      setIsLoadingSources(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleDelete = async (id: string) => {
    try {
      if (userId === 'guest_user' || userId.includes('guest')) {
        const newSources = sources.filter(s => s.id !== id);
        setSources(newSources);
        localStorage.setItem(`user_sources_${userId}`, JSON.stringify(newSources));
        return;
      }

      await deleteDoc(doc(db, 'sources', id));
    } catch (err) {
      console.error('Error deleting source:', err);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert(`حجم الملف كبير جداً! الحد الأقصى هو 8 ميجابايت.`);
      return;
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    setSelectedFile({ name: file.name, base64, mimeType: file.type });
    if (!newTitle) setNewTitle(file.name);
  };

  const handleSaveSource = async () => {
    setIsSaving(true);
    let content = newContent;
    let mimeType;
    let type = newType;

    if (type === 'pdf') {
      if (!selectedFile) {
        setIsSaving(false);
        return;
      }
      content = selectedFile.base64;
      mimeType = selectedFile.mimeType;
    } else if (type === 'link') {
      if (!content.trim()) {
        setIsSaving(false);
        return;
      }
      if (content.includes('youtube.com') || content.includes('youtu.be')) {
        type = 'youtube';
      }
    } else if (type === 'text') {
      if (!content.trim()) {
        setIsSaving(false);
        return;
      }
    }

    try {
      const sourceData = {
        userId,
        type,
        title: newTitle.trim() || 'مصدر بدون عنوان',
        content,
        mimeType,
        createdAt: new Date().toISOString()
      };

      if (userId === 'guest_user' || userId.includes('guest')) {
        const newSource = { id: Date.now().toString(), ...sourceData };
        const updatedSources = [newSource, ...sources];
        setSources(updatedSources);
        localStorage.setItem(`user_sources_${userId}`, JSON.stringify(updatedSources));
        setIsAdding(false);
        setNewTitle('');
        setNewContent('');
        setSelectedFile(null);
        return;
      }

      await addDoc(collection(db, 'sources'), sourceData);
      
      setIsAdding(false);
      setNewTitle('');
      setNewContent('');
      setSelectedFile(null);
    } catch (err) {
      console.error('Error saving source:', err);
      alert('حدث خطأ أثناء حفظ المصدر');
    } finally {
      setIsSaving(false);
    }
  };

  const getSourceIcon = (type: SourceType) => {
    switch (type) {
      case 'youtube': return <Youtube size={20} className="text-red-500" />;
      case 'link': return <LinkIcon size={20} className="text-blue-500" />;
      case 'pdf': return <FileText size={20} className="text-purple-500" />;
      case 'text': return <Type size={20} className="text-amber-500" />;
    }
  };

  const getSourceLabel = (type: SourceType) => {
    switch (type) {
      case 'youtube': return 'رابط يوتيوب';
      case 'link': return 'رابط موقع';
      case 'pdf': return 'ملف PDF';
      case 'text': return 'نص عادي';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {isAdding ? 'إضافة مصدر جديد' : 'المصادر المحفوظة'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoadingSources ? (
            <div className="flex flex-col items-center justify-center py-10 opacity-50">
              <Loader2 size={32} className="animate-spin text-blue-500 mb-2" />
              <p>جاري تحميل المصادر...</p>
            </div>
          ) : isAdding ? (
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                {(['link', 'pdf', 'text'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setNewType(t)}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${newType === t ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    {t === 'link' ? 'رابط' : t === 'pdf' ? 'ملف PDF' : 'نص'}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">عنوان المصدر (اختياري)</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="مثال: ملزمة الكيمياء الفصل الأول"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {newType === 'link' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">الرابط (URL)</label>
                  <input 
                    type="url" 
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-left"
                    dir="ltr"
                  />
                </div>
              )}

              {newType === 'text' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">النص</label>
                  <textarea 
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder="انسخ والصق النص هنا..."
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  ></textarea>
                </div>
              )}

              {newType === 'pdf' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اختيار ملف</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <FileText size={32} className="text-slate-400 mb-2" />
                    <span className="text-sm font-medium text-slate-600">
                      {selectedFile ? selectedFile.name : 'اضغط لاختيار ملف PDF'}
                    </span>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    accept="application/pdf" 
                    className="hidden" 
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {sources.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                  <BookOpen size={48} className="mx-auto mb-3" />
                  <p>لا توجد مصادر محفوظة حالياً.</p>
                </div>
              ) : (
                sources.map(source => (
                  <div key={source.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between group flex-wrap sm:flex-nowrap gap-3 sm:gap-0">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                        {getSourceIcon(source.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{source.title}</h4>
                        <p className="text-xs text-slate-500">{getSourceLabel(source.type)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button 
                        onClick={() => handleDelete(source.id)}
                        className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          onAttachSource(source);
                          onClose();
                        }}
                        className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-lg hover:bg-blue-600 hover:text-white transition-all text-sm flex items-center gap-1 w-full sm:w-auto justify-center"
                      >
                        <Plus size={16} />
                        إرفاق للمحادثة
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50">
          {isAdding ? (
            <div className="flex gap-3">
              <button 
                onClick={handleSaveSource}
                disabled={isSaving || (newType === 'pdf' ? !selectedFile : !newContent.trim())}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex flex-row items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 size={20} className="animate-spin" /> : null}
                {isSaving ? 'جاري الحفظ...' : 'حفظ المصدر'}
              </button>
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setNewTitle('');
                  setNewContent('');
                  setSelectedFile(null);
                }}
                className="px-6 bg-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-300 transition-colors"
              >
                إلغاء
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md"
            >
              <Plus size={20} />
              إضافة مصدر جديد
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
