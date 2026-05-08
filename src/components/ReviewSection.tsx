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
  BookOpen,
  X
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
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);

  const getPdfSource = (url: string | null | undefined) => {
    if (!url) return undefined;
    if (url.startsWith('data:')) return url;
    if (url.includes('firebasestorage.googleapis.com')) return url;
    
    // Handle Google Drive links
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    
    return url;
  };

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
    <div className="min-h-screen p-4 md:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={selectedSubject ? handleBackToSubjects : onBack}
              className="p-3 bg-white dark:bg-black rounded-xl neo-border text-black dark:text-white flex-shrink-0 hover:neo-bg-pink hover:text-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
            >
              <ArrowRight size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-black dark:text-white">
                {selectedSubject ? selectedSubject.name : "المراجعة الشاملة"}
              </h1>
              <p className="text-black/80 dark:text-white/80 font-bold mt-1">
                {selectedSubject ? `ملفات ومحاضرات ${selectedSubject.name}` : "ملخصات ومراجعات شاملة لضمان النجاح"}
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-black/50 dark:text-white/50" size={20} />
            <input
              type="text"
              placeholder={selectedSubject ? "ابحث عن ملف..." : "ابحث عن مادة..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 pr-12 pl-4 py-3 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl outline-none focus:neo-bg-yellow dark:focus:bg-black transition-colors font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40"
            />
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-black dark:text-white" size={40} />
            <p className="text-black dark:text-white font-black">جاري تحميل المحتوى...</p>
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
                  className="bg-white dark:bg-[#1a1a1a] p-6 neo-border flex flex-col items-center gap-4 group neo-hover text-center"
                >
                  <div className="w-20 h-20 neo-bg-teal dark:neo-bg-pink border-2 border-black dark:border-white rounded-xl flex items-center justify-center text-black group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                    <Layers size={40} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-black dark:text-white mb-2">{sub.name}</h3>
                    <p className="text-xs bg-white dark:bg-black text-black dark:text-white border-2 border-black dark:border-white px-3 py-1 rounded-full font-black uppercase inline-block neo-border-sm">
                      {materials.filter(m => m.reviewSubjectId === sub.id).length} مادة
                    </p>
                  </div>
                  <div className="w-full pt-4 mt-auto border-t-2 border-black/10 dark:border-white/10 flex items-center justify-center gap-2 text-black/50 dark:text-white/50 font-bold text-sm group-hover:text-black dark:group-hover:text-white transition-colors">
                    <span>عرض التفاصيل</span>
                    <ChevronLeft size={16} />
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
            {filteredSubjects.length === 0 && (
              <div className="col-span-full text-center py-20 bg-white dark:bg-black neo-border neo-bg-yellow dark:neo-bg-blue">
                <p className="text-black dark:text-white font-black text-xl">لا توجد مواد مراجعة متاحة حالياً</p>
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
                  className="bg-white dark:bg-[#1a1a1a] p-5 neo-border flex items-center justify-between group hover:bg-slate-50 transition-all neo-hover"
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-xl border-2 border-black dark:border-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] ${
                      mat.type === 'PDF' 
                        ? 'neo-bg-blue text-black' 
                        : 'neo-bg-red text-black'
                    }`}>
                      {mat.type === 'PDF' ? <FileText size={28} /> : <Youtube size={28} />}
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-black dark:text-white">{mat.title}</h3>
                      <p className="text-sm text-black/60 dark:text-white/60 font-bold mt-1">
                        {mat.type === 'PDF' ? 'ملف بصيغة PDF' : 'محاضرة فيديو'}
                      </p>
                    </div>
                  </div>
                  
                  {mat.type === 'PDF' ? (
                    <button
                      onClick={() => setSelectedPdf(mat.url)}
                      className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-black text-black dark:text-white border-2 border-black dark:border-white rounded-xl font-black text-sm hover:neo-bg-teal hover:text-white dark:hover:neo-bg-teal transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                    >
                      <span>عرض الملف</span>
                      <FileText size={16} />
                    </button>
                  ) : (
                    <a
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-black text-black dark:text-white border-2 border-black dark:border-white rounded-xl font-black text-sm hover:neo-bg-teal hover:text-white dark:hover:neo-bg-teal transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                    >
                      <span>فتح</span>
                      <ExternalLink size={16} />
                    </a>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredMaterials.length === 0 && (
              <div className="text-center py-20 bg-white dark:bg-black neo-border neo-bg-yellow dark:neo-bg-blue">
                 <div className="w-20 h-20 bg-white border-2 border-black dark:border-white text-black rounded-xl flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                    <BookOpen size={40} />
                  </div>
                <p className="text-black dark:text-white font-black text-xl">لا توجد ملفات أو محاضرات في هذا القسم حالياً</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PDF Viewer Modal */}
      <AnimatePresence>
        {selectedPdf && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] neo-border overflow-hidden w-full h-full max-h-[90dvh] flex flex-col"
            >
              <div className="p-4 flex items-center justify-between border-b-4 border-black dark:border-white neo-bg-yellow dark:neo-bg-blue">
                <h3 className="font-black text-black text-xl">عرض المراجعة الشاملة</h3>
                <div className="flex items-center gap-4">
                  <a 
                    href={selectedPdf} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 bg-white border-2 border-black text-black hover:neo-bg-pink rounded-xl transition-all flex items-center gap-2 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <ExternalLink size={18} />
                    فتح في نافذة جديدة
                  </a>
                  <button
                    onClick={() => setSelectedPdf(null)}
                    className="p-2 bg-white border-2 border-black text-black hover:neo-bg-red hover:text-white rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-slate-100 dark:bg-black overflow-hidden relative">
                <iframe
                  src={getPdfSource(selectedPdf)}
                  className="w-full h-full border-none absolute inset-0"
                  title="PDF Viewer"
                ></iframe>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
