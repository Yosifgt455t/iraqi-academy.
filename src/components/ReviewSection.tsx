import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ReviewSubject, ReviewMaterial, Grade } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  ArrowRight, 
  Loader2, 
  Search, 
  Youtube, 
  ExternalLink, 
  Layers,
  ChevronLeft,
  BookOpen
} from 'lucide-react';

interface Props {
  grade: Grade;
  onBack: () => void;
}

export default function ReviewSection({ grade, onBack }: Props) {
  const [subjects, setSubjects] = useState<ReviewSubject[]>([]);
  const [materials, setMaterials] = useState<ReviewMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<ReviewSubject | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Subjects for this grade
        const subjectsQuery = query(
          collection(db, 'review_subjects'),
          where('gradeIds', 'array-contains', grade)
        );
        const subjectsSnap = await getDocs(subjectsQuery);
        const fetchedSubjects = subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ReviewSubject);
        setSubjects(fetchedSubjects);

        if (fetchedSubjects.length > 0) {
          const subjectIds = fetchedSubjects.map(s => s.id);
          let allMaterialsList: ReviewMaterial[] = [];

          for (let i = 0; i < subjectIds.length; i += 30) {
            const chunk = subjectIds.slice(i, i + 30);
            const materialsQuery = query(
              collection(db, 'review_materials'),
              where('reviewSubjectId', 'in', chunk)
            );
            const materialsSnap = await getDocs(materialsQuery);
            materialsSnap.docs.forEach(doc => allMaterialsList.push({ id: doc.id, ...doc.data() } as ReviewMaterial));
          }
          setMaterials(allMaterialsList);
        }
        
      } catch (err) {
        console.error('Error fetching review data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [grade]);

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentMaterials = selectedSubject 
    ? materials.filter(m => m.reviewSubjectId === selectedSubject.id)
    : [];

  const filteredMaterials = currentMaterials.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubjectClick = (sub: ReviewSubject) => {
    setSelectedSubject(sub);
    setSearchQuery('');
  };

  const handleBackToSubjects = () => {
    setSelectedSubject(null);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={selectedSubject ? handleBackToSubjects : onBack}
              className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowRight size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                {selectedSubject ? selectedSubject.name : "المراجعة المركزة"}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                {selectedSubject ? `ملفات ومحاضرات ${selectedSubject.name}` : "ملخصات ومراجعات شاملة لضمان النجاح"}
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder={selectedSubject ? "ابحث عن ملف..." : "ابحث عن مادة..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 pr-12 pl-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 font-bold shadow-sm text-slate-900 dark:text-white"
            />
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <p className="text-slate-500 dark:text-slate-400 font-black">جاري تحميل المحتوى...</p>
          </div>
        ) : !selectedSubject ? (
          /* SUBJECTS GRID */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredSubjects.map((sub, index) => (
                <motion.button
                  key={sub.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSubjectClick(sub)}
                  className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none flex flex-col items-center gap-4 group hover:border-blue-200 dark:hover:border-blue-800 transition-all text-center"
                >
                  <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-inner">
                    <Layers size={40} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">{sub.name}</h3>
                    <p className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full font-black uppercase inline-block">
                      {materials.filter(m => m.reviewSubjectId === sub.id).length} مادة
                    </p>
                  </div>
                  <div className="w-full pt-4 mt-auto border-t border-slate-50 dark:border-slate-800 flex items-center justify-center gap-2 text-slate-400 font-bold text-sm">
                    <span>عرض التفاصيل</span>
                    <ChevronLeft size={16} />
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
            {filteredSubjects.length === 0 && (
              <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-slate-500 font-black">لا توجد مواد مراجعة متاحة حالياً</p>
              </div>
            )}
          </div>
        ) : (
          /* MATERIALS LIST */
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredMaterials.map((mat, index) => (
                <motion.div
                  key={mat.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                      mat.type === 'PDF' 
                        ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                        : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {mat.type === 'PDF' ? <FileText size={28} /> : <Youtube size={28} />}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white">{mat.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                        {mat.type === 'PDF' ? 'ملف بصيغة PDF' : 'محاضرة فيديو'}
                      </p>
                    </div>
                  </div>
                  
                  <a
                    href={mat.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-sm hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all shadow-sm"
                  >
                    <span>فتح</span>
                    <ExternalLink size={16} />
                  </a>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredMaterials.length === 0 && (
              <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                 <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="text-slate-300" size={40} />
                  </div>
                <p className="text-slate-500 font-black">لا توجد ملفات أو محاضرات في هذا القسم حالياً</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
