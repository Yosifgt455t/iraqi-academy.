import React, { useState, useMemo } from 'react';
import { X, Calculator, Plus, Trash2, Award, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onClose: () => void;
}

const DEFAULT_SUBJECTS = [
  'التربية الإسلامية',
  'اللغة العربية',
  'اللغة الإنجليزية',
  'الرياضيات',
  'الفيزياء',
  'الكيمياء',
  'الأحياء',
  'التربية الفنية',
  'الرياضة',
];

const OPTIONAL_SUBJECTS = [
  'الحاسوب',
  'اللغة الكردية',
  'اللغة الفرنسية',
];

export default function ExemptionCalculatorModal({ onClose }: Props) {
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [activeOptionalSubjects, setActiveOptionalSubjects] = useState<Record<string, boolean>>({});

  const handleGradeChange = (subject: string, value: string) => {
    // Only allow valid numbers up to 100
    if (value === '' || (Number(value) >= 0 && Number(value) <= 100)) {
      setGrades((prev) => ({ ...prev, [subject]: value }));
    }
  };

  const toggleOptionalSubject = (subject: string) => {
    setActiveOptionalSubjects((prev) => {
      const newState = { ...prev, [subject]: !prev[subject] };
      // Clear grade when disabling
      if (!newState[subject]) {
         setGrades((g) => {
           const newGrades = { ...g };
           delete newGrades[subject];
           return newGrades;
         });
      }
      return newState;
    });
  };

  const activeSubjectsList = useMemo(() => {
    const list = [...DEFAULT_SUBJECTS];
    OPTIONAL_SUBJECTS.forEach((subj) => {
      if (activeOptionalSubjects[subj]) {
        list.push(subj);
      }
    });
    return list;
  }, [activeOptionalSubjects]);

  const results = useMemo(() => {
    const validGrades = activeSubjectsList.map((subj) => {
      const g = parseFloat(grades[subj] || '0');
      return { subject: subj, grade: isNaN(g) ? 0 : g };
    });

    // Individual Exemption (الإعفاء الفردي)
    const individualExemptions = validGrades.filter((g) => g.grade >= 90).map((g) => g.subject);

    // General Exemption (الإعفاء العام)
    const totalSum = validGrades.reduce((sum, g) => sum + g.grade, 0);
    const average = validGrades.length > 0 ? (totalSum / validGrades.length) : 0;
    
    // Condition: average >= 85 AND all grades >= 75
    const isGeneralExemption = validGrades.length > 0 && average >= 85 && validGrades.every((g) => g.grade >= 75);

    return {
      average: average.toFixed(2),
      isGeneralExemption,
      individualExemptions,
      allFilled: activeSubjectsList.every(s => grades[s] && grades[s].trim() !== '')
    };
  }, [activeSubjectsList, grades]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-xl w-full max-w-xl overflow-hidden shadow-md flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Calculator size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">حاسبة الإعفاء</h3>
              <p className="text-sm text-slate-500">احسب معدلك واعرف إذا كنت معفى!</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          
          {/* Optional Subjects Checkboxes */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Info size={16} className="text-indigo-500" />
              المواد الإضافية والاختيارية
            </label>
            <p className="text-xs text-slate-500">حدد المواد التي تدرسها فقط ليتم حسابها في المعدل.</p>
            <div className="flex flex-wrap gap-2">
              {OPTIONAL_SUBJECTS.map((subj) => (
                <button
                  key={subj}
                  onClick={() => toggleOptionalSubject(subj)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
                    activeOptionalSubjects[subj] 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${activeOptionalSubjects[subj] ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                      {activeOptionalSubjects[subj] && <span className="text-[10px]">✓</span>}
                    </div>
                    {subj}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Grades Inputs */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-sm font-bold text-slate-700">سعي المواد (من 100)</label>
              <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                {activeSubjectsList.length} مواد
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeSubjectsList.map((subject) => (
                <div key={subject} className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
                  <span className="text-sm font-medium text-slate-700 flex-1 truncate">{subject}</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={grades[subject] || ''}
                    onChange={(e) => handleGradeChange(subject, e.target.value)}
                    className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-center text-sm font-bold outline-none focus:border-indigo-500 shadow-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Results Area */}
          {results.allFilled && activeSubjectsList.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-indigo-600 text-white p-6 rounded-xl shadow-sm shadow-indigo-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-indigo-500/50 pb-4">
                <span className="font-medium text-indigo-100">المعدل العام</span>
                <span className="text-3xl font-bold">{results.average}%</span>
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-full ${results.isGeneralExemption ? 'bg-green-400 text-green-900' : 'bg-indigo-500/50 text-indigo-200'}`}>
                    <Award size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold">الإعفاء العام</h4>
                    <p className="text-sm text-indigo-100">
                      {results.isGeneralExemption 
                        ? 'مبروك! أنت معفى إعفاءً عاماً.' 
                        : 'لم تحقق شرط الإعفاء العام (معدل 85 فأعلى، ولا تقل أي مادة عن 75).'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 mt-4">
                  <div className={`p-1.5 rounded-full mt-1 ${results.individualExemptions.length > 0 ? 'bg-amber-400 text-amber-900' : 'bg-indigo-500/50 text-indigo-200'}`}>
                    <Award size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold">الإعفاء الفردي</h4>
                    {results.individualExemptions.length > 0 ? (
                      <div>
                        <p className="text-sm text-indigo-100 mb-2">تهانينا! أنت معفى في هذه المواد (90 فأعلى):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {results.individualExemptions.map(subj => (
                            <span key={subj} className="bg-amber-400/20 text-amber-50 border border-amber-400/40 px-2 py-1 rounded-md text-xs font-medium">
                              {subj}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-indigo-100">
                        لا يوجد إعفاء فردي، شد حيلك أكثر! (يحتاج 90 فأعلى لكل مادة)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
