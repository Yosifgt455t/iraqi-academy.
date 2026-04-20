import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  orderBy,
  limit,
  updateDoc
} from 'firebase/firestore';
import { Grade, Subject, Chapter, Material, Flashcard } from '../types';
import { 
  Plus, Trash2, Book, Layers, FileText, HelpCircle, 
  ChevronRight, AlertCircle, CheckCircle2, Loader2, X,
  ExternalLink, LayoutGrid, Settings, ArrowRight, Upload, Youtube,
  ArrowLeft, Search, Filter, Database, Edit, Save, Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onBack: () => void;
}

const GRADES = [
  { id: 'primary_1', name: 'الأول الابتدائي' },
  { id: 'primary_2', name: 'الثاني الابتدائي' },
  { id: 'primary_3', name: 'الثالث الابتدائي' },
  { id: 'primary_4', name: 'الرابع الابتدائي' },
  { id: 'primary_5', name: 'الخامس الابتدائي' },
  { id: 'primary_6', name: 'السادس الابتدائي' },
  { id: 'middle_1', name: 'الأول المتوسط' },
  { id: 'middle_2', name: 'الثاني المتوسط' },
  { id: 'middle_3', name: 'الثالث المتوسط' },
  { id: 'secondary_4_sci', name: 'الرابع العلمي' },
  { id: 'secondary_4_lit', name: 'الرابع الأدبي' },
  { id: 'secondary_5_sci', name: 'الخامس العلمي' },
  { id: 'secondary_5_lit', name: 'الخامس الأدبي' },
  { id: 'secondary_6_sci', name: 'السادس العلمي' },
  { id: 'secondary_6_lit', name: 'السادس الأدبي' },
];

export default function AdminDashboard({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<'subjects' | 'chapters' | 'materials' | 'flashcards' | 'database'>('subjects');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Lists
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  
  // Database Explorer State
  const [dbItems, setDbItems] = useState<any[]>([]);
  const [dbSearch, setDbSearch] = useState('');

  // Selection state for forms
  const [selectedGrade, setSelectedGrade] = useState<Grade | ''>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialType, setMaterialType] = useState<'PDF' | 'Video' | 'Ministerial'>('Video');
  const [materialUrl, setMaterialUrl] = useState('');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [isUrlMode, setIsUrlMode] = useState(true);
  const [flashcardQuestion, setFlashcardQuestion] = useState('');
  const [flashcardAnswer, setFlashcardAnswer] = useState('');

  // Bulk / Builder State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [builderRows, setBuilderRows] = useState<string[]>(['']); // Array of chapter names
  const [multiSelectedSubjectIds, setMultiSelectedSubjectIds] = useState<string[]>([]);

  useEffect(() => {
    fetchSubjects();
    resetForm();
  }, [selectedGrade, activeTab]);

  useEffect(() => {
    if (selectedSubjectId) fetchChapters();
    else setChapters([]);
    resetForm();
  }, [selectedSubjectId, activeTab]);

  useEffect(() => {
    if (selectedChapterId) {
      fetchMaterials();
      fetchFlashcards();
    } else {
      setMaterials([]);
      setFlashcards([]);
    }
    resetForm();
  }, [selectedChapterId, activeTab]);

  const resetForm = () => {
    setBulkInput('');
    setBuilderRows(['']);
    setMultiSelectedSubjectIds([]);
    setEditingId(null);
    setSubjectName('');
    setChapterName('');
    setMaterialTitle('');
    setMaterialUrl('');
    setMaterialFile(null);
    setFlashcardQuestion('');
    setFlashcardAnswer('');
  };

  useEffect(() => {
    if (activeTab === 'database') fetchDatabaseItems();
  }, [activeTab]);

  const fetchSubjects = async () => {
    if (!selectedGrade) {
      setSubjects([]);
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, 'subjects'), where('grade', '==', selectedGrade));
      const snap = await getDocs(q);
      setSubjects(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'chapters'), where('subjectId', '==', selectedSubjectId));
      const snap = await getDocs(q);
      setChapters(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter)).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'materials'), where('chapterId', '==', selectedChapterId), orderBy('title'));
      const snap = await getDocs(q);
      setMaterials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlashcards = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'flashcards'), where('chapterId', '==', selectedChapterId));
      const snap = await getDocs(q);
      setFlashcards(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Flashcard)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabaseItems = async () => {
    setLoading(true);
    try {
      // Fetching sample from all major collections for database explorer
      const collections = ['subjects', 'chapters', 'materials', 'flashcards'];
      let allItems: any[] = [];
      
      for (const colName of collections) {
        const snap = await getDocs(query(collection(db, colName), limit(20)));
        allItems = [...allItems, ...snap.docs.map(doc => ({ 
          id: doc.id, 
          _collection: colName, 
          ...doc.data() 
        }))];
      }
      setDbItems(allItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrade) return;

    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'subjects', editingId), {
          name: subjectName.trim(),
          grade: selectedGrade
        });
        showToast('success', 'تم التعديل بنجاح');
      } else if (isBulkMode) {
        const names = bulkInput.split('\n').filter(n => n.trim());
        for (const name of names) {
          await addDoc(collection(db, 'subjects'), {
            name: name.trim(),
            grade: selectedGrade,
            icon: 'Book'
          });
        }
        showToast('success', 'تم إضافة المواد بنجاح');
      } else {
        if (!subjectName) return;
        await addDoc(collection(db, 'subjects'), {
          name: subjectName,
          grade: selectedGrade,
          icon: 'Book'
        });
        showToast('success', 'تم إضافة المادة بنجاح');
      }
      resetForm();
      fetchSubjects();
    } catch (err) {
      showToast('error', 'فشل العملية');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'chapters', editingId), {
          name: chapterName.trim(),
          subjectId: selectedSubjectId
        });
        showToast('success', 'تم التعديل بنجاح');
      } else if (isBulkMode) {
        // Visual Builder logic
        const validChapters = builderRows.filter(r => r.trim());
        const targetSubjectIds = multiSelectedSubjectIds.length > 0 ? multiSelectedSubjectIds : [selectedSubjectId];

        if (validChapters.length === 0 || targetSubjectIds.some(id => !id)) {
          showToast('error', 'يرجى اختيار مادة واحدة على الأقل وكتابة الفصول');
          setLoading(false);
          return;
        }

        for (const subjId of targetSubjectIds) {
          for (const chapName of validChapters) {
            await addDoc(collection(db, 'chapters'), {
              subjectId: subjId,
              name: chapName.trim(),
              orderIndex: 0
            });
          }
        }
        showToast('success', 'تم إضافة الفصول بنجاح');
      } else {
        if (!chapterName || !selectedSubjectId) return;
        await addDoc(collection(db, 'chapters'), {
          subjectId: selectedSubjectId,
          name: chapterName,
          orderIndex: chapters.length + 1
        });
        showToast('success', 'تم إضافة الفصل بنجاح');
      }
      resetForm();
      if (selectedSubjectId) fetchChapters();
    } catch (err) {
      showToast('error', 'فشل العملية');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        showToast('error', 'يرجى اختيار ملف PDF فقط');
        return;
      }
      if (file.size > 800 * 1024) { 
        showToast('error', 'حجم الملف كبير جداً (يجب أن يكون أقل من 800KB لضمان الحفظ)');
        return;
      }
      setMaterialFile(file);
      setIsUrlMode(false);
      setMaterialTitle(file.name.replace('.pdf', ''));
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapterId) return;

    setLoading(true);
    try {
      if (editingId) {
        let finalUrl = materialUrl;
        if (!isUrlMode && materialFile) {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(materialFile);
          });
          finalUrl = await base64Promise;
        }

        await updateDoc(doc(db, 'materials', editingId), {
          chapterId: selectedChapterId,
          subjectId: selectedSubjectId,
          title: materialTitle,
          type: materialType,
          url: finalUrl,
          isUploaded: !isUrlMode
        });
        showToast('success', 'تم التعديل بنجاح');
      } else if (isBulkMode) {
        const lines = bulkInput.split('\n').filter(l => l.trim());
        for (const line of lines) {
          const [title, type, url] = line.split('|').map(s => s.trim());
          if (title && url) {
            await addDoc(collection(db, 'materials'), {
              chapterId: selectedChapterId,
              subjectId: selectedSubjectId,
              title,
              type: (type as any) || 'Video',
              url
            });
          }
        }
      } else {
        let finalUrl = materialUrl;

        if (!isUrlMode && materialFile) {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(materialFile);
          });
          finalUrl = await base64Promise;
        }

        if (!materialTitle || !finalUrl) {
          showToast('error', 'يرجى ملء كافة الحقول');
          setLoading(false);
          return;
        }

        await addDoc(collection(db, 'materials'), {
          chapterId: selectedChapterId,
          subjectId: selectedSubjectId,
          title: materialTitle,
          type: materialType,
          url: finalUrl,
          isUploaded: !isUrlMode
        });
      }
      resetForm();
      fetchMaterials();
      showToast('success', 'تم العملية بنجاح');
    } catch (err) {
      console.error(err);
      showToast('error', 'فشل العملية');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapterId) return;

    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'flashcards', editingId), {
          chapterId: selectedChapterId,
          question: flashcardQuestion,
          answer: flashcardAnswer
        });
        showToast('success', 'تم التعديل بنجاح');
      } else if (isBulkMode) {
        const lines = bulkInput.split('\n').filter(l => l.trim());
        for (const line of lines) {
          const [q, a] = line.split('|').map(s => s.trim());
          if (q && a) {
            await addDoc(collection(db, 'flashcards'), {
              chapterId: selectedChapterId,
              question: q,
              answer: a
            });
          }
        }
      } else {
        if (!flashcardQuestion || !flashcardAnswer) return;
        await addDoc(collection(db, 'flashcards'), {
          chapterId: selectedChapterId,
          question: flashcardQuestion,
          answer: flashcardAnswer
        });
      }
      resetForm();
      fetchFlashcards();
      showToast('success', 'تم العملية بنجاح');
    } catch (err) {
      showToast('error', 'فشل العملية');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (col: string, id: string, callback: () => void) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await deleteDoc(doc(db, col, id));
      callback();
      showToast('success', 'تم الحذف بنجاح');
    } catch (err) {
      showToast('error', 'فشل الحذف');
    }
  };

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Navbar Admi */}
      <nav className="bg-white border-b border-slate-100 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button 
            onClick={onBack}
            className="p-1.5 md:p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
          >
            <ArrowRight size={24} />
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Settings size={24} />
            </div>
            <h1 className="text-sm md:text-xl font-black text-slate-900 leading-tight">إدارة المحتوى</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <span className="hidden sm:inline-block text-[10px] md:text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">Administrator Mode</span>
           <span className="sm:hidden text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">ADMIN</span>
        </div>
      </nav>

      <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-73px)]">
        {/* Sidebar / Mobile Dropdown */}
        <aside className="w-full md:w-64 bg-slate-50 border-l border-slate-100 p-4 md:p-6 space-y-4 flex flex-col shrink-0">
          <div className="block md:hidden space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Category / التصنيف</label>
            <select 
              value={activeTab}
              onChange={(e) => {
                setActiveTab(e.target.value as any);
                setIsBulkMode(false);
                setBulkInput('');
              }}
              className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="subjects">المواد الدراسية</option>
              <option value="chapters">الفصول والوحدات</option>
              <option value="materials">المحاضرات والملفات</option>
              <option value="flashcards">البطاقات الذكية</option>
              <option value="database">قاعدة البيانات</option>
            </select>
          </div>

          <div className="hidden md:flex flex-col space-y-2">
            {[
              { id: 'subjects', icon: Book, label: 'المواد الدراسية' },
              { id: 'chapters', icon: Layers, label: 'الفصول والوحدات' },
              { id: 'materials', icon: FileText, label: 'المحاضرات والملفات' },
              { id: 'flashcards', icon: HelpCircle, label: 'البطاقات الذكية' },
              { id: 'database', icon: Database, label: 'قاعدة البيانات' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setIsBulkMode(false);
                  setBulkInput('');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${
                  activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                  : 'text-slate-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="hidden md:block mt-auto pt-4 border-t border-slate-200">
            <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-wider">نظام عراقي أكاديمي v2.5</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10">
          <div className="max-w-5xl mx-auto space-y-8 md:space-y-10">
            
            {/* Header Block */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b pb-6 border-slate-100 gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-1 md:mb-2">
                  {activeTab === 'subjects' && 'إدارة المواد'}
                  {activeTab === 'chapters' && 'إدارة الفصول'}
                  {activeTab === 'materials' && 'إدارة المحاضرات'}
                  {activeTab === 'flashcards' && 'إدارة البطاقات'}
                  {activeTab === 'database' && 'مستكشف قاعدة البيانات'}
                </h2>
                <p className="text-slate-500 font-medium italic">
                  {activeTab === 'database' ? 'عرض وتعديل كافة البيانات المخزنة في هاردوير السيرفر' : 'إضافة وتحكم بالمحتوى الدراسي حسب المرحلة'}
                </p>
              </div>
              
              {activeTab !== 'database' && (
                <button
                  onClick={() => setIsBulkMode(!isBulkMode)}
                  className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-2xl transition-all ${
                    isBulkMode 
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-100' 
                    : 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                  }`}
                >
                  <LayoutGrid size={18} />
                  {isBulkMode ? 'وضع الإضافة المفردة' : 'الإضافة المتعددة (Bulk)'}
                </button>
              )}
            </div>

            {/* Context Selectors Filter */}
            {activeTab !== 'database' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase mr-2">المرحلة الدراسية</label>
                  <select 
                    value={selectedGrade}
                    onChange={(e) => {
                      setSelectedGrade(e.target.value as Grade);
                      setSelectedSubjectId('');
                      setSelectedChapterId('');
                    }}
                    className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  >
                    <option value="">-- اختر الصف --</option>
                    {GRADES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>

                {(activeTab === 'chapters' || activeTab === 'materials' || activeTab === 'flashcards') && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase mr-2">المادة المستهدفة</label>
                    <select 
                      value={selectedSubjectId}
                      onChange={(e) => {
                        setSelectedSubjectId(e.target.value);
                        setSelectedChapterId('');
                      }}
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold disabled:opacity-40"
                      disabled={!selectedGrade}
                    >
                      <option value="">-- اختر المادة --</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                {(activeTab === 'materials' || activeTab === 'flashcards') && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase mr-2">الفصل / الوحدة</label>
                    <select 
                      value={selectedChapterId}
                      onChange={(e) => setSelectedChapterId(e.target.value)}
                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold disabled:opacity-40"
                      disabled={!selectedSubjectId}
                    >
                      <option value="">-- اختر الفصل --</option>
                      {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Main Action Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Form Side */}
              <div className={`${activeTab === 'database' ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-6`}>
                
                {activeTab === 'database' ? (
                   <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="flex-1 relative">
                          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="text"
                            placeholder="ابحث في معرف الوثيقة أو المحتوى..."
                            value={dbSearch}
                            onChange={(e) => setDbSearch(e.target.value)}
                            className="w-full pr-12 pl-4 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                          />
                        </div>
                        <button onClick={fetchDatabaseItems} className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors">
                           <Loader2 className={loading ? "animate-spin" : ""} size={24} />
                        </button>
                      </div>

                      <div className="overflow-x-auto bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <table className="w-full text-right border-collapse">
                          <thead className="bg-slate-50/80">
                            <tr>
                              <th className="p-4 text-xs font-black text-slate-400 uppercase">المجموعة</th>
                              <th className="p-4 text-xs font-black text-slate-400 uppercase">المعرف (ID)</th>
                              <th className="p-4 text-xs font-black text-slate-400 uppercase">العنوان / الاسم</th>
                              <th className="p-4 text-xs font-black text-slate-400 uppercase">إجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {dbItems.filter(item => 
                              JSON.stringify(item).toLowerCase().includes(dbSearch.toLowerCase())
                            ).map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4">
                                  <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg uppercase">
                                    {item._collection}
                                  </span>
                                </td>
                                <td className="p-4 font-mono text-[10px] text-slate-400">{item.id}</td>
                                <td className="p-4 font-bold text-slate-700">{item.name || item.title || item.question || 'N/A'}</td>
                                <td className="p-4">
                                  <button 
                                    onClick={() => handleDelete(item._collection, item.id, fetchDatabaseItems)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {dbItems.length === 0 && (
                          <div className="p-12 text-center text-slate-400 italic">
                            لا توجد بيانات متاحة للعرض حالياً
                          </div>
                        )}
                      </div>
                   </div>
                ) : (
                  <>
                    <motion.div 
                      key={activeTab + (isBulkMode ? '-bulk' : '-single')}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50"
                    >
                      {isBulkMode ? (
                        <form 
                          onSubmit={(e) => {
                            if (activeTab === 'subjects') handleAddSubject(e);
                            if (activeTab === 'chapters') handleAddChapter(e);
                            if (activeTab === 'materials') handleAddMaterial(e);
                            if (activeTab === 'flashcards') handleAddFlashcard(e);
                          }} 
                          className="space-y-6"
                        >
                          {activeTab === 'chapters' && (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="font-black text-slate-900">منشئ الفصول المتعدد (Visual Builder)</h3>
                                <div className="flex gap-2">
                                  <button 
                                    type="button"
                                    onClick={() => setBuilderRows([...builderRows, ''])}
                                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                                    title="إضافة حقل فصل"
                                  >
                                    <Plus size={18} />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                  <label className="block text-xs font-black text-slate-400 mb-3 mr-2 uppercase">1. اختر المواد المستهدفة</label>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {subjects.map(s => (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => {
                                          if (multiSelectedSubjectIds.includes(s.id)) {
                                            setMultiSelectedSubjectIds(multiSelectedSubjectIds.filter(id => id !== s.id));
                                          } else {
                                            setMultiSelectedSubjectIds([...multiSelectedSubjectIds, s.id]);
                                          }
                                        }}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                                          multiSelectedSubjectIds.includes(s.id)
                                          ? 'bg-blue-600 border-blue-600 text-white'
                                          : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'
                                        }`}
                                      >
                                        {s.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                  <label className="block text-xs font-black text-slate-400 mb-1 mr-2 uppercase">2. أسماء الفصول</label>
                                  {builderRows.map((row, idx) => (
                                    <div key={idx} className="flex gap-2">
                                      <input 
                                        type="text"
                                        placeholder={`اسم الفصل رقم ${idx + 1}`}
                                        value={row}
                                        onChange={(e) => {
                                          const newRows = [...builderRows];
                                          newRows[idx] = e.target.value;
                                          setBuilderRows(newRows);
                                        }}
                                        className="flex-1 p-3 bg-white border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none font-bold"
                                      />
                                      {builderRows.length > 1 && (
                                        <button 
                                          type="button"
                                          onClick={() => setBuilderRows(builderRows.filter((_, i) => i !== idx))}
                                          className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"
                                        >
                                          <Minus size={18} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <button 
                                    type="button"
                                    onClick={() => setBuilderRows([...builderRows, ''])}
                                    className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-400 rounded-xl hover:border-blue-400 hover:text-blue-500 transition-all font-bold text-xs"
                                  >
                                    + إضافة فصل آخر
                                  </button>
                                </div>
                              </div>

                              <button 
                                type="submit"
                                disabled={loading || multiSelectedSubjectIds.length === 0}
                                className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-blue-700 disabled:opacity-50 shadow-xl shadow-blue-100 transition-all"
                              >
                                {loading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                                تنفيذ الإضافة لـ ({multiSelectedSubjectIds.length}) مواد
                              </button>
                            </div>
                          )}

                          {activeTab !== 'chapters' && (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="font-black text-slate-900">نظام الرفع الجماعي الذكي</h3>
                                <div className="flex gap-2">
                                   <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full border border-amber-100">AI ASSISTED</span>
                                </div>
                              </div>

                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                 <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">تنسيق الإدخال:</p>
                                 <p className="text-xs font-bold text-slate-600">
                                    {activeTab === 'subjects' && 'أدخل اسم المادة في كل سطر'}
                                    {activeTab === 'materials' && (
                                      <>تنسيق المحاضرات: <span dir="ltr" className="bg-white px-1 rounded">العنوان | النوع | الرابط</span></>
                                    )}
                                    {activeTab === 'flashcards' && (
                                      <>تنسيق البطاقات: <span dir="ltr" className="bg-white px-1 rounded">السؤال | الجواب</span></>
                                    )}
                                 </p>
                              </div>

                              <textarea
                                rows={10}
                                value={bulkInput}
                                onChange={(e) => setBulkInput(e.target.value)}
                                placeholder={
                                  activeTab === 'subjects' ? "الفيزياء\nالكيمياء\nالرياضيات" :
                                  activeTab === 'materials' ? "المحاضرة 1 | Video | https://...\nملزمة 1 | PDF | https://..." :
                                  "ماهي القوة؟ | هي المؤثر الذي يغير الحالة الحركية للجسم"
                                }
                                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-mono text-sm leading-relaxed transition-all"
                              />

                              <button 
                                type="submit"
                                disabled={loading || !bulkInput.trim()}
                                className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-blue-700 disabled:opacity-50 shadow-xl shadow-blue-100 active:scale-[0.98] transition-all"
                              >
                                {loading ? <Loader2 className="animate-spin" size={24} /> : <Database size={24} />}
                                معالجة وإضافة البيانات فوراً
                              </button>
                            </div>
                          )}
                        </form>
                      ) : (
                        <>
                          {activeTab === 'subjects' && (
                            <form onSubmit={handleAddSubject} className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-slate-800">
                                  {editingId ? 'تعديل بيانات المادة' : 'إضافة مادة تعليمية جديدة'}
                                </h3>
                                {editingId && (
                                  <button 
                                    type="button"
                                    onClick={() => resetForm()}
                                    className="text-xs font-bold text-red-500 hover:underline"
                                  >
                                    إلغاء التعديل
                                  </button>
                                )}
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-xs font-black text-slate-400 mb-2 mr-2">اسم المادة</label>
                                  <input 
                                    type="text"
                                    placeholder="مثلاً: الكيمياء"
                                    value={subjectName}
                                    onChange={(e) => setSubjectName(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold"
                                  />
                                </div>
                                <button 
                                  disabled={loading || !selectedGrade}
                                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-100"
                                >
                                  {loading ? <Loader2 className="animate-spin" size={20} /> : editingId ? <Save size={20} /> : <Plus size={20} />}
                                  {editingId ? 'حفظ التعديلات' : 'إضافة للمنهاج'}
                                </button>
                              </div>
                            </form>
                          )}

                          {activeTab === 'chapters' && (
                            <form onSubmit={handleAddChapter} className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-slate-800">
                                  {editingId ? 'تعديل الفصل' : 'إضافة فصل دراسي'}
                                </h3>
                                {editingId && (
                                  <button 
                                    type="button"
                                    onClick={() => resetForm()}
                                    className="text-xs font-bold text-red-500 hover:underline"
                                  >
                                    إلغاء التعديل
                                  </button>
                                )}
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-xs font-black text-slate-400 mb-2 mr-2">اسم الفصل أو الوحدة</label>
                                  <input 
                                    type="text"
                                    placeholder="مثلاً: الفصل الأول"
                                    value={chapterName}
                                    onChange={(e) => setChapterName(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold"
                                  />
                                </div>
                                <button 
                                  disabled={loading || !selectedSubjectId}
                                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-100"
                                >
                                  {loading ? <Loader2 className="animate-spin" size={20} /> : editingId ? <Save size={20} /> : <Plus size={20} />}
                                  {editingId ? 'حفظ التعديلات' : 'إضافة الفصل'}
                                </button>
                              </div>
                            </form>
                          )}

                          {activeTab === 'materials' && (
                            <form onSubmit={handleAddMaterial} className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-slate-800">
                                  {editingId ? 'تعديل المحاضرة' : 'تفاصيل المحاضرة / الملف'}
                                </h3>
                                {editingId && (
                                  <button 
                                    type="button"
                                    onClick={() => resetForm()}
                                    className="text-xs font-bold text-red-500 hover:underline"
                                  >
                                    إلغاء التعديل
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-black text-slate-400 mb-2 mr-2">عنوان المحاضرة</label>
                                  <input 
                                    type="text"
                                    placeholder="مثلاً: المحاضرة 1"
                                    value={materialTitle}
                                    onChange={(e) => setMaterialTitle(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-black text-slate-400 mb-2 mr-2">نوع المحتوى</label>
                                  <select 
                                    value={materialType}
                                    onChange={(e) => setMaterialType(e.target.value as any)}
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold"
                                  >
                                    <option value="Video">فيديو تعليمي</option>
                                    <option value="PDF">ملزمة / تلخيص</option>
                                    <option value="Ministerial">أسئلة وزارية</option>
                                  </select>
                                </div>
                              </div>

                              <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                                <div className="flex items-center gap-4 mb-4">
                                  <button 
                                    type="button"
                                    onClick={() => setIsUrlMode(true)}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${isUrlMode ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600 hover:bg-blue-100'}`}
                                  >
                                    إضافة رابط
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => setIsUrlMode(false)}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${!isUrlMode ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600 hover:bg-blue-100'}`}
                                  >
                                    رفع ملف PDF
                                  </button>
                                </div>

                                {isUrlMode ? (
                                  <div className="relative">
                                    <input 
                                      type="url"
                                      placeholder="أدخل رابط YouTube أو Google Drive هنا..."
                                      value={materialUrl}
                                      onChange={(e) => setMaterialUrl(e.target.value)}
                                      className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold"
                                    />
                                    {materialUrl.includes('youtube.com') && <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500" size={20} />}
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <label className="flex flex-col items-center justify-center w-full h-32 bg-white border-2 border-dashed border-blue-200 rounded-2xl cursor-pointer hover:bg-blue-50 transition-colors">
                                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="text-blue-500 mb-2" size={32} />
                                        <p className="text-sm font-bold text-slate-500">{materialFile ? materialFile.name : 'اضغط لاختيار ملف PDF'}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">حجم أقصى 800KB</p>
                                      </div>
                                      <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                                    </label>
                                  </div>
                                )}
                              </div>

                              <button 
                                disabled={loading || !selectedChapterId}
                                className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 shadow-xl shadow-blue-100"
                              >
                                {loading ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                                {editingId ? 'حفظ التعديلات' : 'إرسال وحفظ المحتوى'}
                              </button>
                            </form>
                          )}

                          {activeTab === 'flashcards' && (
                            <form onSubmit={handleAddFlashcard} className="space-y-6">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-slate-800">
                                   {editingId ? 'تعديل البطاقة' : 'البطاقات التعليمية (سؤال وجواب)'}
                                </h3>
                                {editingId && (
                                  <button 
                                    type="button"
                                    onClick={() => resetForm()}
                                    className="text-xs font-bold text-red-500 hover:underline"
                                  >
                                    إلغاء التعديل
                                  </button>
                                )}
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-xs font-black text-slate-400 mb-2 mr-2">نص السؤال</label>
                                  <textarea
                                    rows={3}
                                    placeholder="أدخل السؤال هنا..."
                                    value={flashcardQuestion}
                                    onChange={(e) => setFlashcardQuestion(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold resize-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-black text-slate-400 mb-2 mr-2">الجواب النموذجي</label>
                                  <textarea
                                    rows={3}
                                    placeholder="أدخل الجواب هنا..."
                                    value={flashcardAnswer}
                                    onChange={(e) => setFlashcardAnswer(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold resize-none"
                                  />
                                </div>
                                <button 
                                  disabled={loading || !selectedChapterId}
                                  className="w-full py-5 bg-purple-600 text-white rounded-3xl font-black flex items-center justify-center gap-2 hover:bg-purple-700 disabled:opacity-50 shadow-xl shadow-purple-100"
                                >
                                  {loading ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                                  {editingId ? 'حفظ التعديلات' : 'إضافة البطاقة'}
                                </button>
                              </div>
                            </form>
                          )}
                        </>
                      )}
                    </motion.div>
                  </>
                )}
              </div>

              {/* List / Preview Side */}
              {activeTab !== 'database' && (
                <div className="lg:col-span-5 space-y-6">
                   <div className="sticky top-[110px]">
                      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                           <h4 className="font-black text-slate-900 border-r-4 border-blue-500 pr-3">الموجودات الحالية</h4>
                           <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-lg font-black text-slate-400 uppercase">
                              Count: {activeTab === 'subjects' ? subjects.length : activeTab === 'chapters' ? chapters.length : activeTab === 'materials' ? materials.length : flashcards.length}
                           </span>
                        </div>

                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                           {activeTab === 'subjects' && subjects.map(s => (
                             <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">
                               <div className="flex items-center gap-3">
                                 <Book size={18} className="text-blue-500" />
                                 <span className="font-bold text-slate-700">{s.name}</span>
                               </div>
                               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                 <button 
                                   onClick={() => {
                                     setEditingId(s.id);
                                     setSubjectName(s.name);
                                     setIsBulkMode(false);
                                   }} 
                                   className="text-blue-400 hover:text-blue-600 p-1"
                                 >
                                   <Edit size={18} />
                                 </button>
                                 <button onClick={() => handleDelete('subjects', s.id, fetchSubjects)} className="text-red-400 hover:text-red-600 p-1">
                                   <Trash2 size={18} />
                                 </button>
                               </div>
                             </div>
                           ))}

                           {activeTab === 'chapters' && chapters.map(c => (
                             <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">
                               <div className="flex items-center gap-3">
                                 <Layers size={18} className="text-blue-500" />
                                 <span className="font-bold text-slate-700">{c.name}</span>
                               </div>
                               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                 <button 
                                   onClick={() => {
                                     setEditingId(c.id);
                                     setChapterName(c.name);
                                     setIsBulkMode(false);
                                   }} 
                                   className="text-blue-400 hover:text-blue-600 p-1"
                                 >
                                   <Edit size={18} />
                                 </button>
                                 <button onClick={() => handleDelete('chapters', c.id, fetchChapters)} className="text-red-400 hover:text-red-600 p-1">
                                   <Trash2 size={18} />
                                 </button>
                               </div>
                             </div>
                           ))}

                           {activeTab === 'materials' && materials.map(m => (
                             <div key={m.id} className="flex flex-col p-4 bg-slate-50 rounded-2xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                   {m.type === 'Video' ? <Youtube size={18} className="text-red-500" /> : <FileText size={18} className="text-blue-500" />}
                                   <span className="font-bold text-slate-700">{m.title}</span>
                                 </div>
                                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                   <button 
                                     onClick={() => {
                                       setEditingId(m.id);
                                       setMaterialTitle(m.title);
                                       setMaterialType(m.type);
                                       setMaterialUrl(m.url);
                                       setIsBulkMode(false);
                                     }} 
                                     className="text-blue-400 hover:text-blue-600 p-1"
                                   >
                                     <Edit size={18} />
                                   </button>
                                   <button onClick={() => handleDelete('materials', m.id, fetchMaterials)} className="text-red-400 hover:text-red-600 p-1">
                                     <Trash2 size={18} />
                                   </button>
                                 </div>
                               </div>
                               <div className="mt-2 flex items-center gap-2">
                                  <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100 uppercase">{m.type}</span>
                                  <a href={m.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1">
                                     <ExternalLink size={10} /> معاينة الرابط
                                  </a>
                               </div>
                             </div>
                           ))}

                           {activeTab === 'flashcards' && flashcards.map(f => (
                              <div key={f.id} className="flex flex-col p-4 bg-slate-50 rounded-2xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <HelpCircle size={18} className="text-purple-500" />
                                    <span className="font-bold text-slate-700 truncate max-w-[200px]">{f.question}</span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button 
                                      onClick={() => {
                                        setEditingId(f.id);
                                        setFlashcardQuestion(f.question);
                                        setFlashcardAnswer(f.answer);
                                        setIsBulkMode(false);
                                      }} 
                                      className="text-blue-400 hover:text-blue-600 p-1"
                                    >
                                      <Edit size={18} />
                                    </button>
                                    <button onClick={() => handleDelete('flashcards', f.id, fetchFlashcards)} className="text-red-400 hover:text-red-600 p-1">
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>
                                <p className="mt-2 text-[10px] text-slate-400 italic truncate">{f.answer}</p>
                              </div>
                            ))}

                           {((activeTab === 'subjects' && subjects.length === 0) || (activeTab === 'chapters' && chapters.length === 0) || (activeTab === 'materials' && materials.length === 0) || (activeTab === 'flashcards' && flashcards.length === 0)) && (
                               <div className="py-10 text-center text-slate-300 italic font-medium">لا توجد بيانات مضافة هنا بعد</div>
                           )}
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 md:bottom-10 left-1/2 md:left-10 -translate-x-1/2 md:translate-x-0 px-8 py-4 bg-emerald-600 text-white rounded-3xl flex items-center gap-3 shadow-2xl shadow-emerald-200 z-[100] w-[90%] md:w-auto text-center justify-center"
          >
            <CheckCircle2 size={24} />
            <span className="font-black">{success}</span>
          </motion.div>
        )}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 md:bottom-10 left-1/2 md:left-10 -translate-x-1/2 md:translate-x-0 px-8 py-4 bg-red-600 text-white rounded-3xl flex items-center gap-3 shadow-2xl shadow-red-200 z-[100] w-[90%] md:w-auto text-center justify-center"
          >
            <AlertCircle size={24} />
            <span className="font-black">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
