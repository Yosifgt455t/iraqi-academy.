import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  AlertCircle, 
  LayoutGrid, 
  Book, 
  Layers, 
  Youtube, 
  FileText, 
  HelpCircle, 
  ExternalLink,
  Loader2,
  LogOut,
  Settings as Wrench,
  ChevronRight,
  Database,
  ArrowRight,
  ShieldAlert,
  ChevronLeft
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  where,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { setMaintenanceMode, getMaintenanceMode } from '../services/maintenanceService';
import { getAdmins, addAdmin, removeAdmin } from '../services/adminService';
import { Grade } from '../types';

interface Subject {
  id: string;
  name: string;
  grades?: Grade[];
}

interface Chapter {
  id: string;
  name: string;
  subjectIds: string[];
}

interface Material {
  id: string;
  title: string;
  type: 'Video' | 'PDF';
  url: string;
  chapterIds: string[];
}

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  chapterIds: string[];
}

interface AdminDashboardProps {
  user: any;
  onBack: () => void;
}

const GRADES_DATA = [
  { id: 'primary_1', label: 'الأول الابتدائي' },
  { id: 'primary_2', label: 'الثاني الابتدائي' },
  { id: 'primary_3', label: 'الثالث الابتدائي' },
  { id: 'primary_4', label: 'الرابع الابتدائي' },
  { id: 'primary_5', label: 'الخامس الابتدائي' },
  { id: 'primary_6', label: 'السادس الابتدائي' },
  { id: 'middle_1', label: 'الأول المتوسط' },
  { id: 'middle_2', label: 'الثاني المتوسط' },
  { id: 'middle_3', label: 'الثالث المتوسط' },
  { id: 'secondary_4_sci', label: 'الرابع العلمي' },
  { id: 'secondary_4_lit', label: 'الرابع الأدبي' },
  { id: 'secondary_5_sci', label: 'الخامس العلمي' },
  { id: 'secondary_5_lit', label: 'الخامس الأدبي' },
  { id: 'secondary_6_sci', label: 'السادس العلمي' },
  { id: 'secondary_6_lit', label: 'السادس الأدبي' },
];

export default function AdminDashboard({ user, onBack }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'subjects' | 'chapters' | 'materials' | 'flashcards' | 'database' | 'settings'>('subjects');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  
  const ADMIN_EMAIL = 'jwjwjwjueue@gmail.com';
  const isSuperAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // Form states
  const [subjectName, setSubjectName] = useState('');
  const [selectedGrades, setSelectedGrades] = useState<Grade[]>([]);
  
  const [chapterName, setChapterName] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialType, setMaterialType] = useState<'Video' | 'PDF'>('Video');
  const [materialUrl, setMaterialUrl] = useState('');
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  
  const [flashcardQuestion, setFlashcardQuestion] = useState('');
  const [flashcardAnswer, setFlashcardAnswer] = useState('');
  
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Filtering states for forms
  const [formGradeFilter, setFormGradeFilter] = useState<Grade | ''>('');
  const [formSubjectFilter, setFormSubjectFilter] = useState<string | ''>('');

  useEffect(() => {
    fetchSubjects();
    fetchChapters();
    fetchMaterials();
    fetchFlashcards();
    fetchMaintenanceStatus();
    if (isSuperAdmin) {
      fetchAdmins();
    }
  }, [isSuperAdmin]);

  const fetchAdmins = async () => {
    if (!isSuperAdmin) return;
    const list = await getAdmins();
    setAdminEmails(list);
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) return;
    setLoading(true);
    try {
      await addAdmin(newAdminEmail);
      setNewAdminEmail('');
      await fetchAdmins();
      showToast('success', 'تمت إضافة المسؤول بنجاح');
    } catch (err) {
      showToast('error', 'فشل إجراء إضافة المسؤول');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!window.confirm(`هل أنت متأكد من سحب الصلاحيات من ${email}؟`)) return;
    setLoading(true);
    try {
      await removeAdmin(email);
      await fetchAdmins();
      showToast('success', 'تم سحب الصلاحيات بنجاح');
    } catch (err) {
      showToast('error', 'فشل في سحب الصلاحيات');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceStatus = async () => {
    try {
      const status = await getMaintenanceMode();
      setIsMaintenanceActive(status);
    } catch (err) {
      console.error('Error fetching maintenance status:', err);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    if (type === 'success') setSuccess(message);
    else setError(message);
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 3000);
  };

  const fetchSubjects = async () => {
    const q = query(collection(db, 'subjects'), orderBy('name'));
    const snapshot = await getDocs(q);
    setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));
  };

  const fetchChapters = async () => {
    const snapshot = await getDocs(collection(db, 'chapters'));
    setChapters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter)));
  };

  const fetchMaterials = async () => {
    const snapshot = await getDocs(collection(db, 'materials'));
    setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material)));
  };

  const fetchFlashcards = async () => {
    const snapshot = await getDocs(collection(db, 'flashcards'));
    setFlashcards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Flashcard)));
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isBulkMode) {
        const lines = bulkInput.split('\n').filter(l => l.trim().length > 0);
        for (const line of lines) {
          await addDoc(collection(db, 'subjects'), { 
            name: line.trim(),
            grades: selectedGrades 
          });
        }
        showToast('success', `تمت إضافة ${lines.length} مواد بنجاح`);
        setBulkInput('');
      } else {
        if (editingId) {
          await updateDoc(doc(db, 'subjects', editingId), { 
            name: subjectName,
            grades: selectedGrades 
          });
          showToast('success', 'تم تعديل المادة بنجاح');
        } else {
          await addDoc(collection(db, 'subjects'), { 
            name: subjectName,
            grades: selectedGrades 
          });
          showToast('success', 'تمت إضافة المادة بنجاح');
        }
      }
      setSubjectName('');
      setSelectedGrades([]);
      setEditingId(null);
      fetchSubjects();
    } catch (err) {
      showToast('error', 'فشل الإجراء');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubjectIds.length === 0) return;
    setLoading(true);
    try {
      if (isBulkMode) {
        const lines = bulkInput.split('\n').filter(l => l.trim().length > 0);
        for (const line of lines) {
          await addDoc(collection(db, 'chapters'), { 
            name: line.trim(),
            subjectIds: selectedSubjectIds 
          });
        }
        showToast('success', `تمت إضافة ${lines.length} فصول بنجاح`);
        setBulkInput('');
      } else {
        if (editingId) {
          await updateDoc(doc(db, 'chapters', editingId), { 
            name: chapterName,
            subjectIds: selectedSubjectIds 
          });
          showToast('success', 'تم تعديل الفصل بنجاح');
        } else {
          await addDoc(collection(db, 'chapters'), { 
            name: chapterName,
            subjectIds: selectedSubjectIds 
          });
          showToast('success', 'تمت إضافة الفصل بنجاح');
        }
      }
      setChapterName('');
      setEditingId(null);
      fetchChapters();
    } catch (err) {
      showToast('error', 'فشل الإجراء');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedChapterIds.length === 0) return;
    setLoading(true);
    try {
      if (isBulkMode) {
        const lines = bulkInput.split('\n').filter(l => l.trim().includes('|'));
        for (const line of lines) {
          const [title, url, type] = line.split('|').map(s => s.trim());
          if (title && url) {
            await addDoc(collection(db, 'materials'), { 
              title,
              url,
              type: type || 'Video',
              chapterIds: selectedChapterIds 
            });
          }
        }
        showToast('success', `تمت إضافة ${lines.length} محاضرات بنجاح`);
        setBulkInput('');
      } else {
        if (editingId) {
          await updateDoc(doc(db, 'materials', editingId), { 
            title: materialTitle,
            type: materialType,
            url: materialUrl,
            chapterIds: selectedChapterIds 
          });
          showToast('success', 'تم تعديل المحتوى بنجاح');
        } else {
          await addDoc(collection(db, 'materials'), { 
            title: materialTitle,
            type: materialType,
            url: materialUrl,
            chapterIds: selectedChapterIds 
          });
          showToast('success', 'تمت إضافة المحتوى بنجاح');
        }
      }
      setMaterialTitle('');
      setMaterialUrl('');
      setEditingId(null);
      fetchMaterials();
    } catch (err) {
      showToast('error', 'فشل الإجراء');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedChapterIds.length === 0) return;
    setLoading(true);
    try {
      if (isBulkMode) {
        const lines = bulkInput.split('\n').filter(l => l.trim().includes('|'));
        for (const line of lines) {
          const [q, a] = line.split('|').map(s => s.trim());
          if (q && a) {
            await addDoc(collection(db, 'flashcards'), {
              question: q,
              answer: a,
              chapterIds: selectedChapterIds
            });
          }
        }
        showToast('success', `تمت إضافة ${lines.length} بطاقات بنجاح`);
        setBulkInput('');
      } else {
        if (editingId) {
          await updateDoc(doc(db, 'flashcards', editingId), { 
            question: flashcardQuestion,
            answer: flashcardAnswer,
            chapterIds: selectedChapterIds 
          });
          showToast('success', 'تم تعديل البطاقة بنجاح');
        } else {
          await addDoc(collection(db, 'flashcards'), { 
            question: flashcardQuestion,
            answer: flashcardAnswer,
            chapterIds: selectedChapterIds 
          });
          showToast('success', 'تمت إضافة البطاقة بنجاح');
        }
        setFlashcardQuestion('');
        setFlashcardAnswer('');
      }
      setEditingId(null);
      fetchFlashcards();
    } catch (err) {
      showToast('error', 'فشل الإجراء');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (coll: string, id: string, refresh: () => void) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
      await deleteDoc(doc(db, coll, id));
      showToast('success', 'تم الحذف بنجاح');
      refresh();
    } catch (err) {
      showToast('error', 'فشل الحذف');
    }
  };

  const handleToggleMaintenance = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      await setMaintenanceMode(!isMaintenanceActive);
      setIsMaintenanceActive(!isMaintenanceActive);
      showToast('success', `تم ${!isMaintenanceActive ? 'تفعيل' : 'إيقاف'} وضع الصيانة بنجاح`);
    } catch (err) {
      showToast('error', 'فشل تغيير وضع الصيانة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-['Inter'] selection:bg-blue-100 selection:text-blue-900" dir="rtl">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-slate-100 p-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
            <Database size={16} />
          </div>
          <h2 className="font-black text-slate-900 text-sm">لوحة الإدارة</h2>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
        >
          {isMobileMenuOpen ? <Plus className="rotate-45" size={24} /> : <div className="space-y-1.5"><div className="w-6 h-0.5 bg-current rounded-full" /><div className="w-4 h-0.5 bg-current rounded-full" /><div className="w-6 h-0.5 bg-current rounded-full" /></div>}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <div className="flex flex-col lg:flex-row min-h-screen">
        <aside className={`
          ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          lg:w-72 bg-white border-l border-slate-100 p-6 flex flex-col gap-8 fixed lg:sticky top-[65px] lg:top-0 right-0 h-[calc(100vh-65px)] lg:h-screen w-full lg:z-20 z-40 transition-transform duration-300 ease-in-out overflow-y-auto
        `}>
          <div className="hidden lg:flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
               <Database size={20} />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-lg leading-tight">لوحة الإدارة</h2>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Master Panel v2</p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <button
              onClick={() => {
                onBack();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-4 rounded-2xl text-blue-600 hover:bg-blue-50 transition-all duration-300 font-black text-sm mb-2"
            >
              <ArrowRight size={20} />
              العودة للمنصة الرئيسية
            </button>
            {[
              { id: 'subjects', icon: Book, label: 'إدارة المواد' },
              { id: 'chapters', icon: Layers, label: 'إدارة الفصول' },
              { id: 'materials', icon: Youtube, label: 'المحاضرات وملفات' },
              { id: 'flashcards', icon: HelpCircle, label: 'البطاقات التعليمية' },
              { id: 'database', icon: Database, label: 'النسخ الاحتياطي' },
              { id: 'settings', icon: Wrench, label: 'إعدادات النظام' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setEditingId(null);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between px-4 py-4 rounded-2xl transition-all duration-300 font-black text-sm group ${
                  activeTab === item.id 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 translate-x-1' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'} />
                  {item.label}
                </div>
                {activeTab === item.id && <ChevronLeft size={16} />}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 px-3 mb-6">
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-xs">
                {user?.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">{user?.email}</p>
                <p className="text-[10px] text-slate-400 font-bold">المسؤول</p>
              </div>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-sm hover:bg-red-100 transition-colors"
            >
              <LogOut size={18} />
              تسجيل الخروج
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-10">
          <div className="max-w-5xl mx-auto space-y-8 md:space-y-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                   <div className="w-6 h-1 bg-blue-600 rounded-full" />
                   <span className="text-[10px] font-black uppercase tracking-tighter">System Overview</span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                  {activeTab === 'subjects' && 'إدارة المواد'}
                  {activeTab === 'chapters' && 'إدارة الفصول'}
                  {activeTab === 'materials' && 'إدارة المحاضرات'}
                  {activeTab === 'flashcards' && 'إدارة البطاقات'}
                  {activeTab === 'database' && 'النسخ الاحتياطي'}
                  {activeTab === 'settings' && 'إعدادات النظام'}
                </h1>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl">
                 <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-black">حالة النظام</p>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                       <span className="text-xs font-black text-slate-700">متصل الآن</span>
                    </div>
                 </div>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className={(activeTab === 'database' || activeTab === 'settings') ? 'lg:col-span-12' : 'lg:col-span-7'}>
                {activeTab === 'database' ? (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50">
                    <div className="space-y-6">
                       <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex items-center gap-4">
                          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                             <Database size={28} />
                          </div>
                          <div>
                             <h3 className="font-black text-blue-900 text-lg">النسخ الاحتياطي السحابي</h3>
                             <p className="text-blue-700/70 text-sm font-medium leading-relaxed">تتم مزامنة جميع البيانات تلقائياً مع خوادم Firebase بشكل لحظي.</p>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                             <h4 className="text-[10px] text-slate-400 font-black mb-1 uppercase">إجمالي المواد</h4>
                             <p className="text-3xl font-black text-slate-900">{subjects.length}</p>
                          </div>
                          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                             <h4 className="text-[10px] text-slate-400 font-black mb-1 uppercase">إجمالي المحاضرات</h4>
                             <p className="text-3xl font-black text-slate-900">{materials.length}</p>
                          </div>
                       </div>

                       <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4">
                          <div className="flex items-center gap-3">
                             <ShieldAlert className="text-amber-400" />
                             <h4 className="font-black">منطقة حساسة</h4>
                          </div>
                          <p className="text-slate-400 text-sm leading-relaxed">هذا القسم مخصص لمراقبة سلامة البيانات ونزاهتها. لا تقم بتغيير الإعدادات إلا إذا كنت تعرف ما تفعله.</p>
                          <button 
                            disabled 
                            className="w-full py-4 bg-slate-800 rounded-2xl font-black text-sm opacity-50 cursor-not-allowed"
                          >
                            بدء تصدير البيانات (JSON)
                          </button>
                       </div>
                    </div>
                  </div>
                ) : activeTab === 'settings' ? (
                  <div className="space-y-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden relative">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-slate-900 mb-1">
                            <Wrench className="text-amber-600" size={24} />
                            <h3 className="text-xl font-black">وضع صيانة المنصة</h3>
                          </div>
                          <p className="text-slate-500 font-medium leading-relaxed max-w-lg">
                            عند تفعيل هذا الوضع، ستتوقف المنصة عن العمل لجميع المستخدمين والزوار، ولن يتمكن من الدخول سوى المدير الرئيسي.
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                           <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tighter ${
                             isMaintenanceActive ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                           }`}>
                             {isMaintenanceActive ? 'نشط الآن' : 'متوقف'}
                           </span>
                           <button
                             onClick={handleToggleMaintenance}
                             disabled={loading || !isSuperAdmin}
                             className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                               isMaintenanceActive ? 'bg-blue-600' : 'bg-slate-200'
                             } ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                           >
                             <span
                               className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                 isMaintenanceActive ? '-translate-x-8' : '-translate-x-1'
                               }`}
                             />
                           </button>
                        </div>
                      </div>
                      {!isSuperAdmin && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                          <ShieldAlert size={20} />
                          <p className="text-sm font-bold">هذه الإعدادات متاحة فقط للمطور الرئيسي.</p>
                        </div>
                      )}
                      <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50" />
                    </div>

                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center gap-4">
                      <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm">
                        <LayoutGrid size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-blue-900">إشعار النظام</h4>
                        <p className="text-blue-700 text-sm font-medium leading-relaxed">
                          يرجى الحذر عند استخدام هذه الميزات. تأكد من إيقاف وضع الصيانة بعد انتهاء أعمالك.
                        </p>
                      </div>
                    </div>

                    {isSuperAdmin && (
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50 space-y-6">
                        <div className="flex items-center gap-3 border-r-4 border-purple-500 pr-3">
                           <ShieldAlert className="text-purple-600" size={24} />
                           <h3 className="text-xl font-black text-slate-900">إدارة فريق العمل</h3>
                        </div>
                        
                        <div className="flex gap-3">
                           <input 
                             value={newAdminEmail}
                             onChange={(e) => setNewAdminEmail(e.target.value)}
                             className="flex-1 p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-purple-100 font-bold"
                             placeholder="إيميل المسؤول الجديد..."
                           />
                           <button 
                             onClick={handleAddAdmin}
                             disabled={loading || !newAdminEmail}
                             className="px-8 bg-purple-600 text-white rounded-3xl font-black hover:bg-purple-700 transition-all disabled:opacity-50"
                           >
                             {loading ? <Loader2 className="animate-spin" /> : 'إضافة'}
                           </button>
                        </div>

                        <div className="space-y-2">
                           <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">المدراء الحاليون</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {adminEmails.map(email => (
                                <div key={email} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                   <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-purple-600 font-black text-xs">
                                         {email[0].toUpperCase()}
                                      </div>
                                      <span className="text-sm font-bold text-slate-700 truncate">{email}</span>
                                   </div>
                                   {email !== ADMIN_EMAIL && (
                                     <button 
                                       onClick={() => handleRemoveAdmin(email)}
                                       className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                     >
                                        <Trash2 size={16} />
                                     </button>
                                   )}
                                </div>
                              ))}
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <motion.div 
                      key={activeTab}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/50"
                    >
                       <div className="flex items-center justify-between mb-8">
                          <h3 className="text-xl font-black text-slate-900 border-r-4 border-blue-500 pr-3">
                            {editingId ? 'تعديل البيانات' : 'إضافة بيانات جديدة'}
                          </h3>
                          <button
                            onClick={() => setIsBulkMode(!isBulkMode)}
                            className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-100 transition-colors"
                          >
                            {isBulkMode ? 'الوضع العادي' : 'وضع الإضافة الجماعية'}
                          </button>
                       </div>

                       {activeTab === 'subjects' && (
                         <form onSubmit={handleAddSubject} className="space-y-6">
                           <div>
                             <label className="block text-sm font-black text-slate-700 mb-2">
                               {isBulkMode ? 'أسماء المواد (كل مادة في سطر)' : 'اسم المادة'}
                             </label>
                             {isBulkMode ? (
                               <textarea 
                                 value={bulkInput}
                                 onChange={(e) => setBulkInput(e.target.value)}
                                 className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 font-bold min-h-[150px]"
                                 placeholder="اللغة العربية\nاللغة الإنجليزية"
                               />
                             ) : (
                               <input 
                                 value={subjectName}
                                 onChange={(e) => setSubjectName(e.target.value)}
                                 required={!isBulkMode}
                                 className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                 placeholder="مثال: اللغة العربية"
                               />
                             )}
                           </div>
                           
                           <div>
                             <label className="block text-sm font-black text-slate-700 mb-4">اختر المراحل الدراسية (تعدد اختيار)</label>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                               {[
                                 { id: 'primary_1', label: 'الأول الابتدائي' },
                                 { id: 'primary_2', label: 'الثاني الابتدائي' },
                                 { id: 'primary_3', label: 'الثالث الابتدائي' },
                                 { id: 'primary_4', label: 'الرابع الابتدائي' },
                                 { id: 'primary_5', label: 'الخامس الابتدائي' },
                                 { id: 'primary_6', label: 'السادس الابتدائي' },
                                 { id: 'middle_1', label: 'الأول المتوسط' },
                                 { id: 'middle_2', label: 'الثاني المتوسط' },
                                 { id: 'middle_3', label: 'الثالث المتوسط' },
                                 { id: 'secondary_4_sci', label: 'الرابع العلمي' },
                                 { id: 'secondary_4_lit', label: 'الرابع الأدبي' },
                                 { id: 'secondary_5_sci', label: 'الخامس العلمي' },
                                 { id: 'secondary_5_lit', label: 'الخامس الأدبي' },
                                 { id: 'secondary_6_sci', label: 'السادس العلمي' },
                                 { id: 'secondary_6_lit', label: 'السادس الأدبي' },
                               ].map((g) => (
                                 <button
                                   key={g.id}
                                   type="button"
                                   onClick={() => {
                                     setSelectedGrades(prev => 
                                       prev.includes(g.id as Grade) 
                                         ? prev.filter(x => x !== g.id)
                                         : [...prev, g.id as Grade]
                                     );
                                   }}
                                   className={`p-3 rounded-2xl text-[10px] font-black border transition-all ${
                                     selectedGrades.includes(g.id as Grade)
                                       ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                       : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                                   }`}
                                 >
                                   {g.label}
                                 </button>
                               ))}
                             </div>
                           </div>

                           <button 
                             disabled={loading}
                             className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 shadow-xl shadow-blue-100"
                           >
                             {loading ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                             {editingId ? 'حفظ التعديلات' : isBulkMode ? 'إضافة الكل' : 'إضافة المادة للقائمة'}
                           </button>
                         </form>
                       )}

                       {activeTab === 'chapters' && (
                         <form onSubmit={handleAddChapter} className="space-y-6">
                           <div className="space-y-4">
                             <label className="block text-sm font-black text-slate-700 mb-2">1. تصفية حسب المرحلة الدراسية</label>
                              <div className="flex flex-wrap gap-2">
                                {GRADES_DATA.map(g => (
                                  <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => setFormGradeFilter(g.id as Grade)}
                                    className={`py-2 px-3 rounded-xl text-[9px] font-bold border transition-all ${
                                      formGradeFilter === g.id
                                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                    }`}
                                  >
                                    {g.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700 mb-4 font-black">2. اربط الفصل بالمادة (تعدد اختيار)</label>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                               {subjects.filter(sub => !formGradeFilter || sub.grades?.includes(formGradeFilter as Grade)).map((sub) => (
                                 <button
                                   key={sub.id}
                                   type="button"
                                   onClick={() => {
                                     setSelectedSubjectIds(prev => 
                                       prev.includes(sub.id) 
                                         ? prev.filter(id => id !== sub.id)
                                         : [...prev, sub.id]
                                     );
                                   }}
                                   className={`p-3 rounded-2xl text-[10px] font-black border transition-all ${
                                     selectedSubjectIds.includes(sub.id)
                                       ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                       : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                                   }`}
                                 >
                                   {sub.name}
                                 </button>
                               ))}
                             </div>
                           </div>

                           <div>
                             <label className="block text-sm font-black text-slate-700 mb-2">
                               {isBulkMode ? 'عناوين الفصول (كل فصل في سطر)' : 'عنوان الفصل'}
                             </label>
                             {isBulkMode ? (
                               <textarea 
                                 value={bulkInput}
                                 onChange={(e) => setBulkInput(e.target.value)}
                                 className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 font-bold min-h-[150px]"
                                 placeholder="الفصل الأول\nالفصل الثاني"
                               />
                             ) : (
                               <input 
                                 value={chapterName}
                                 onChange={(e) => setChapterName(e.target.value)}
                                 required={!isBulkMode}
                                 className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                 placeholder="مثال: الفصل الأول"
                               />
                             )}
                           </div>

                           <button 
                             disabled={loading || selectedSubjectIds.length === 0}
                             className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 shadow-xl shadow-blue-100"
                           >
                             {loading ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                             {editingId ? 'حفظ التعديلات' : isBulkMode ? 'إضافة الكل' : 'تثبيت الفصل الجديد'}
                           </button>
                         </form>
                       )}

                       {activeTab === 'materials' && (
                         <form onSubmit={handleAddMaterial} className="space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div className="space-y-4">
                                  <label className="block text-sm font-black text-slate-700 bg-slate-100/50 p-2 rounded-lg inline-block">1. تصفية حسب المرحلة</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {GRADES_DATA.map(g => (
                                      <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => {
                                          setFormGradeFilter(g.id as Grade);
                                          setFormSubjectFilter('');
                                        }}
                                        className={`py-2 px-1 rounded-xl text-[8px] font-black border transition-all ${
                                          formGradeFilter === g.id
                                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                            : 'bg-white border-slate-200 text-slate-400'
                                        }`}
                                      >
                                        {g.label.replace('الابتدائي', 'ب').replace('المتوسط', 'م')}
                                      </button>
                                    ))}
                                  </div>
                               </div>

                               <div className="space-y-4">
                                  <label className="block text-sm font-black text-slate-700 bg-blue-100/50 p-2 rounded-lg inline-block">2. تصفية حسب المادة</label>
                                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1 border border-slate-50 rounded-2xl">
                                    {subjects
                                      .filter(sub => !formGradeFilter || sub.grades?.includes(formGradeFilter as Grade))
                                      .map(sub => (
                                        <button
                                          key={sub.id}
                                          type="button"
                                          onClick={() => setFormSubjectFilter(sub.id)}
                                          className={`py-3 px-2 rounded-xl text-[10px] font-black border transition-all ${
                                            formSubjectFilter === sub.id
                                              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                              : 'bg-white border-slate-100 text-slate-500'
                                          }`}
                                        >
                                          {sub.name}
                                        </button>
                                      ))}
                                  </div>
                               </div>
                            </div>

                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700 mb-4 font-black bg-emerald-100/50 p-2 rounded-lg inline-block">3. حدد الفصول المستهدفة (تعدد اختيار)</label>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border border-slate-100 rounded-3xl bg-slate-50 custom-scrollbar text-right">
                               {chapters.filter(c => !formSubjectFilter || c.subjectIds?.includes(formSubjectFilter)).map((c) => (
                                 <button
                                   key={c.id}
                                   type="button"
                                   onClick={() => {
                                     setSelectedChapterIds(prev => 
                                       prev.includes(c.id) 
                                         ? prev.filter(id => id !== c.id)
                                         : [...prev, c.id]
                                     );
                                   }}
                                   className={`p-3 rounded-2xl text-[10px] font-black border transition-all text-right ${
                                     selectedChapterIds.includes(c.id)
                                       ? 'bg-blue-600 border-blue-600 text-white'
                                       : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-100'
                                   }`}
                                 >
                                   {c.name} ({subjects.filter(s => c.subjectIds?.includes(s.id)).map(s => s.name).join(', ')})
                                 </button>
                               ))}
                             </div>
                           </div>

                           {isBulkMode ? (
                             <div className="space-y-4">
                               <label className="block text-sm font-black text-slate-700">الإضافة الجماعية للمحاضرات (العنوان | الرابط | النوع)</label>
                               <textarea 
                                 value={bulkInput}
                                 onChange={(e) => setBulkInput(e.target.value)}
                                 className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 font-bold min-h-[200px]"
                                 placeholder={"المحاضرة 1 | https://url | Video\nملف الشرح | https://url | PDF"}
                               />
                             </div>
                           ) : (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                 <label className="block text-sm font-black text-slate-700 mb-2">عنوان المحتوى</label>
                                 <input 
                                   value={materialTitle}
                                   onChange={(e) => setMaterialTitle(e.target.value)}
                                   required={!isBulkMode}
                                   className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                   placeholder="اسم المحاضرة أو الملف"
                                 />
                               </div>
                               <div>
                                 <label className="block text-sm font-black text-slate-700 mb-2">نوع الملف</label>
                                 <select 
                                   value={materialType}
                                   onChange={(e) => setMaterialType(e.target.value as any)}
                                   className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                 >
                                   <option value="Video">يوتيوب (Video)</option>
                                   <option value="PDF">ملف (PDF)</option>
                                 </select>
                               </div>
                               <div className="md:col-span-2">
                                 <label className="block text-sm font-black text-slate-700 mb-2">رابط المحتوى (URL)</label>
                                 <input 
                                   value={materialUrl}
                                   onChange={(e) => setMaterialUrl(e.target.value)}
                                   required={!isBulkMode}
                                   className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                   placeholder="https://..."
                                 />
                               </div>
                             </div>
                           )}

                           <button 
                             disabled={loading || selectedChapterIds.length === 0}
                             className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 shadow-xl shadow-blue-100"
                           >
                             {loading ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                             {editingId ? 'حفظ التعديلات' : isBulkMode ? 'إضافة الكل' : 'إرسال وحفظ المحتوى'}
                           </button>
                         </form>
                       )}

                       {activeTab === 'flashcards' && (
                         <form onSubmit={handleAddFlashcard} className="space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div className="space-y-4">
                                  <label className="block text-sm font-black text-slate-700 bg-slate-100/50 p-2 rounded-lg inline-block">1. تصفية حسب المرحلة</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {GRADES_DATA.map(g => (
                                      <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => {
                                          setFormGradeFilter(g.id as Grade);
                                          setFormSubjectFilter('');
                                        }}
                                        className={`py-2 px-1 rounded-xl text-[8px] font-black border transition-all ${
                                          formGradeFilter === g.id
                                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                            : 'bg-white border-slate-200 text-slate-400'
                                        }`}
                                      >
                                        {g.label.replace('الابتدائي', 'ب').replace('المتوسط', 'م')}
                                      </button>
                                    ))}
                                  </div>
                               </div>

                               <div className="space-y-4">
                                  <label className="block text-sm font-black text-slate-700 bg-purple-100/50 p-2 rounded-lg inline-block">2. تصفية حسب المادة</label>
                                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1 border border-slate-50 rounded-2xl">
                                    {subjects
                                      .filter(sub => !formGradeFilter || sub.grades?.includes(formGradeFilter as Grade))
                                      .map(sub => (
                                        <button
                                          key={sub.id}
                                          type="button"
                                          onClick={() => setFormSubjectFilter(sub.id)}
                                          className={`py-3 px-2 rounded-xl text-[10px] font-black border transition-all ${
                                            formSubjectFilter === sub.id
                                              ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                                              : 'bg-white border-slate-100 text-slate-500'
                                          }`}
                                        >
                                          {sub.name}
                                        </button>
                                      ))}
                                  </div>
                               </div>
                            </div>

                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700 mb-4 font-black bg-amber-100/50 p-2 rounded-lg inline-block">3. اربط البطاقة بالفصول (تعدد اختيار)</label>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border border-slate-100 rounded-3xl bg-slate-50 custom-scrollbar text-right">
                               {chapters.filter(c => !formSubjectFilter || c.subjectIds?.includes(formSubjectFilter)).map((c) => (
                                 <button
                                   key={c.id}
                                   type="button"
                                   onClick={() => {
                                     setSelectedChapterIds(prev => 
                                       prev.includes(c.id) 
                                         ? prev.filter(id => id !== c.id)
                                         : [...prev, c.id]
                                     );
                                   }}
                                   className={`p-3 rounded-2xl text-[10px] font-black border transition-all text-right ${
                                     selectedChapterIds.includes(c.id)
                                       ? 'bg-purple-600 border-purple-600 text-white'
                                       : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-100'
                                   }`}
                                 >
                                   {c.name}
                                 </button>
                               ))}
                             </div>
                           </div>
                           
                           {isBulkMode ? (
                             <div className="space-y-4">
                               <label className="block text-sm font-black text-slate-700">الإضافة الجماعية للمسودات (سؤال | جواب)</label>
                               <textarea 
                                 value={bulkInput}
                                 onChange={(e) => setBulkInput(e.target.value)}
                                 className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 font-bold min-h-[200px]"
                                 placeholder={"السؤال الأول | الجواب الأول\nالسؤال الثاني | الجواب الثاني"}
                               />
                             </div>
                           ) : (
                             <div className="space-y-6">
                               <div>
                                 <label className="block text-sm font-black text-slate-700 mb-2">السؤال (الوجه الأول)</label>
                                 <input 
                                   value={flashcardQuestion}
                                   onChange={(e) => setFlashcardQuestion(e.target.value)}
                                   required={!isBulkMode}
                                   className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                 />
                               </div>
                               <div>
                                 <label className="block text-sm font-black text-slate-700 mb-2">الإجابة (الوجه الثاني)</label>
                                 <textarea 
                                   value={flashcardAnswer}
                                   onChange={(e) => setFlashcardAnswer(e.target.value)}
                                   required={!isBulkMode}
                                   className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-100 font-bold h-32"
                                 />
                               </div>
                             </div>
                           )}
                           
                           <div className="flex gap-4">
                             {editingId && !isBulkMode && (
                               <button 
                                 type="button"
                                 onClick={() => {
                                   setEditingId(null);
                                   setFlashcardQuestion('');
                                   setFlashcardAnswer('');
                                 }}
                                 className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-3xl font-black flex items-center justify-center gap-2"
                               >
                                 إلغاء
                               </button>
                             )}
                             <button 
                               disabled={loading || selectedChapterIds.length === 0}
                               className="flex-[2] py-5 bg-purple-600 text-white rounded-3xl font-black flex items-center justify-center gap-2 hover:bg-purple-700 disabled:opacity-50 shadow-xl shadow-purple-100"
                             >
                               {loading ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                               {editingId ? 'حفظ التعديلات' : isBulkMode ? 'إضافة الكل' : 'إضافة البطاقة'}
                             </button>
                           </div>
                         </form>
                       )}
                    </motion.div>
                  </>
                )}
              </div>

              {/* List / Preview Side */}
              {activeTab !== 'database' && activeTab !== 'settings' && (
                <div className="lg:col-span-5 space-y-6">
                   <div className="sticky top-[110px]">
                      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                           <h4 className="font-black text-slate-900 border-r-4 border-blue-500 pr-3">الموجودات الحالية</h4>
                           <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-lg font-black text-slate-400 uppercase">
                              {activeTab === 'subjects' ? 'أقسام المناهج' : activeTab === 'chapters' ? 'قائمة الفصول' : activeTab === 'materials' ? 'قائمة المحاضرات' : 'البطاقات المنشورة'}: {activeTab === 'subjects' ? subjects.length : activeTab === 'chapters' ? chapters.length : activeTab === 'materials' ? materials.length : flashcards.length}
                           </span>
                        </div>

                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                           {activeTab === 'subjects' && subjects.map(s => (
                             <button 
                               key={s.id} 
                               onClick={() => {
                                 setEditingId(s.id);
                                 setSubjectName(s.name);
                                 setSelectedGrades(s.grades || []);
                                 setIsBulkMode(false);
                               }}
                               className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-blue-600 hover:text-white transition-all border border-transparent text-right"
                             >
                               <div className="flex items-center gap-3">
                                 <Book size={18} className="group-hover:text-white text-blue-500" />
                                 <span className="font-bold">{s.name}</span>
                               </div>
                               <div onClick={(e) => { e.stopPropagation(); handleDelete('subjects', s.id, fetchSubjects); }} className="p-2 hover:bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                 <Trash2 size={16} />
                               </div>
                             </button>
                           ))}

                           {activeTab === 'chapters' && chapters.map(c => (
                             <button 
                               key={c.id} 
                               onClick={() => {
                                 setEditingId(c.id);
                                 setChapterName(c.name);
                                 setSelectedSubjectIds(c.subjectIds || []);
                                 setIsBulkMode(false);
                               }}
                               className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-blue-600 hover:text-white transition-all border border-transparent text-right"
                             >
                               <div className="flex items-center gap-3">
                                 <Layers size={18} className="group-hover:text-white text-blue-500" />
                                 <span className="font-bold">{c.name}</span>
                               </div>
                               <div onClick={(e) => { e.stopPropagation(); handleDelete('chapters', c.id, fetchChapters); }} className="p-2 hover:bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                 <Trash2 size={16} />
                               </div>
                             </button>
                           ))}

                           {activeTab === 'materials' && materials.map(m => (
                             <button 
                               key={m.id} 
                               onClick={() => {
                                 setEditingId(m.id);
                                 setMaterialTitle(m.title);
                                 setMaterialType(m.type);
                                 setMaterialUrl(m.url);
                                 setSelectedChapterIds(m.chapterIds || []);
                                 setIsBulkMode(false);
                               }}
                               className="w-full flex flex-col p-4 bg-slate-50 rounded-2xl group hover:bg-blue-600 hover:text-white transition-all border border-transparent text-right"
                             >
                               <div className="flex items-center justify-between w-full">
                                 <div className="flex items-center gap-3">
                                   {m.type === 'Video' ? <Youtube size={18} className="group-hover:text-white text-red-500" /> : <FileText size={18} className="group-hover:text-white text-blue-500" />}
                                   <span className="font-bold">{m.title}</span>
                                 </div>
                                 <div onClick={(e) => { e.stopPropagation(); handleDelete('materials', m.id, fetchMaterials); }} className="p-2 hover:bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                   <Trash2 size={16} />
                                 </div>
                               </div>
                               <div className="mt-2 flex items-center gap-4 text-[10px] font-black uppercase">
                                  <span className="bg-white group-hover:bg-blue-700 group-hover:text-white text-slate-500 px-2 py-0.5 rounded border border-slate-100 group-hover:border-blue-500 transition-colors">{m.type}</span>
                                  <span className="opacity-60 group-hover:opacity-100 italic">انقر لإجراء تعديل</span>
                               </div>
                             </button>
                           ))}

                           {activeTab === 'flashcards' && flashcards.map(f => (
                              <button 
                                key={f.id} 
                                onClick={() => {
                                  setEditingId(f.id);
                                  setFlashcardQuestion(f.question);
                                  setFlashcardAnswer(f.answer);
                                  setSelectedChapterIds(f.chapterIds || []);
                                  setIsBulkMode(false);
                                }}
                                className="w-full flex flex-col p-4 bg-slate-50 rounded-2xl group hover:bg-purple-600 hover:text-white transition-all border border-transparent text-right"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-3">
                                    <HelpCircle size={18} className="group-hover:text-white text-purple-500" />
                                    <span className="font-bold truncate max-w-[200px]">{f.question}</span>
                                  </div>
                                  <div onClick={(e) => { e.stopPropagation(); handleDelete('flashcards', f.id, fetchFlashcards); }} className="p-2 hover:bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 size={16} />
                                  </div>
                                </div>
                                <p className="mt-2 text-[10px] opacity-60 italic truncate w-full">{f.answer}</p>
                              </button>
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
