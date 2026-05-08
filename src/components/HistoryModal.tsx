import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, PlayCircle, FileText, Loader2, Link2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  completedMaterialIds: string[];
}

export default function HistoryModal({ isOpen, onClose, completedMaterialIds }: Props) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && completedMaterialIds.length > 0) {
      fetchMaterials();
    } else {
      setMaterials([]);
    }
  }, [isOpen, completedMaterialIds]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      // Chunk the ids if more than 10 because Firestore 'in' has a limit of 10
      const recentIds = completedMaterialIds.slice(-20).reverse(); // Get latest 20
      
      const chunks = [];
      for (let i = 0; i < recentIds.length; i += 10) {
        chunks.push(recentIds.slice(i, i + 10));
      }

      let allMaterials: any[] = [];
      
      for (const chunk of chunks) {
        if (chunk.length === 0) continue;
        const q = query(
          collection(db, 'materials'),
          where(documentId(), 'in', chunk)
        );
        const snapshot = await getDocs(q);
        const chunkData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allMaterials = [...allMaterials, ...chunkData];
      }
      
      // Sort to match the order of recentIds
      allMaterials.sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));

      setMaterials(allMaterials);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-black w-full max-w-lg rounded-2xl neo-border shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] overflow-hidden flex flex-col max-h-[85vh]"
          dir="rtl"
        >
          <div className="p-6 border-b-4 border-black dark:border-white bg-[#FFB5A7] dark:bg-[#6D28D9] shrink-0 sticky top-0 z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black dark:text-white">
                <History size={24} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-black text-black dark:text-white">سجل المشاهدات</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl text-black dark:text-white hover:-translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all flex item-center"
            >
              <X size={24} strokeWidth={2.5} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative bg-slate-50 dark:bg-slate-900">
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '32px 32px' }} />
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 size={40} className="animate-spin text-black dark:text-white" />
                <p className="font-bold text-black/60 dark:text-white/60">جاري تحميل السجل...</p>
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-white border-2 border-black dark:border-white text-black/40 dark:text-white/40 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-3">
                  <History size={40} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black text-black dark:text-white mb-2">لا توجد مشاهدات سابقة</h3>
                <p className="text-black/60 dark:text-white/60 font-bold">ابدأ بمشاهدة الدروس وستظهر هنا!</p>
              </div>
            ) : (
              <div className="space-y-4 relative z-10">
                {materials.map((material) => (
                  <div key={material.id} className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 shrink-0 rounded-xl border-2 border-black dark:border-white flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                        material.type === 'video' ? 'neo-bg-pink text-black' : 
                        material.type === 'pdf' ? 'neo-bg-blue text-black' : 
                        'neo-bg-yellow text-black'
                      }`}>
                        {material.type === 'video' ? <PlayCircle size={24} strokeWidth={2.5} /> : 
                         material.type === 'pdf' ? <FileText size={24} strokeWidth={2.5} /> : 
                         <Link2 size={24} strokeWidth={2.5} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-black dark:text-white truncate text-base">{material.title}</h4>
                        <p className="text-sm font-bold text-black/60 dark:text-white/60 truncate mt-1">
                          {material.type === 'video' ? 'فيديو تعليمي' : material.type === 'pdf' ? 'ملف PDF' : 'رابط خارجي'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
