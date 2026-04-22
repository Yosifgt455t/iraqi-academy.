import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FileEdit, 
  Download, 
  Loader2, 
  Plus, 
  Trash2, 
  Calendar, 
  BookOpen, 
  Clock, 
  School, 
  User,
  Layout
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  onClose: () => void;
}

interface Question {
  text: string;
  branches: string[];
}

export default function ExamBuilderModal({ onClose }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    schoolName: '',
    academicYear: '2025-2026',
    subject: '',
    teacherName: '',
    examType: 'نصف السنة',
    examTime: 'ساعتان',
  });

  const [questions, setQuestions] = useState<Question[]>([{ text: '', branches: [] }]);
  const printRef = useRef<HTMLDivElement>(null);

  const addQuestion = () => setQuestions([...questions, { text: '', branches: [] }]);
  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, val: string) => {
    const newQs = [...questions];
    newQs[index].text = val;
    setQuestions(newQs);
  };

  const addBranch = (qIndex: number) => {
    const newQs = [...questions];
    const q = newQs[qIndex];
    
    // Smart Branching: If the question has text but no branches yet,
    // move the text to Branch A and create Branch B.
    if (q.branches.length === 0 && q.text.trim() !== '') {
      q.branches = [q.text, ''];
      q.text = ''; // Clear main text (now it's just a preamble if they want to add one)
    } else {
      q.branches.push('');
    }
    
    setQuestions(newQs);
  };

  const updateBranch = (qIndex: number, bIndex: number, val: string) => {
    const newQs = [...questions];
    newQs[qIndex].branches[bIndex] = val;
    setQuestions(newQs);
  };

  const removeBranch = (qIndex: number, bIndex: number) => {
    const newQs = [...questions];
    newQs[qIndex].branches = newQs[qIndex].branches.filter((_, i) => i !== bIndex);
    setQuestions(newQs);
  };

  const arabicLabels = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي', 'ك', 'ل', 'م', 'ن'];

  const generatePdf = async () => {
    if (isGenerating || !printRef.current) return;
    setIsGenerating(true);

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`اسئلة_${formData.subject || 'امتحان'}.pdf`);
      onClose();
    } catch (error) {
      console.error('PDF error:', error);
      alert('حدث خطأ أثناء إنشاء ملف الأسئلة.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl overflow-hidden">
      {/* Hidden element for PDF rendering */}
      <div className="fixed left-[-9999px] top-0 overflow-hidden" style={{ width: '794px' }}>
        <div 
          ref={printRef}
          className="bg-white px-[40px] py-[30px] text-black text-right flex flex-col items-stretch"
          style={{ 
            width: '794px', 
            minHeight: '1123px',
            direction: 'rtl',
            fontFamily: "'Noto Sans Arabic', sans-serif"
          }}
        >
          {/* PDF Header Section */}
          <div className="border-b-2 border-black pb-2 mb-4 shrink-0">
            <div className="flex justify-between items-start text-sm font-bold">
              <div className="text-right space-y-1 pt-1">
                <p>المادة: {formData.subject}</p>
                <p>الوقت: {formData.examTime}</p>
              </div>
              <div className="text-center space-y-0.5 flex-1 px-4">
                <p className="text-xl font-bold">جمهورية العراق</p>
                <p className="text-lg font-bold">وزارة التربية</p>
                <p className="text-base font-bold mt-1">{formData.schoolName}</p>
                <p className="text-xs font-sans mt-0.5">{formData.academicYear}</p>
              </div>
              <div className="text-left space-y-1 pt-1">
                <p>الامتحان: {formData.examType}</p>
              </div>
            </div>
          </div>

          {/* PDF Body Section */}
          <div 
            className="flex flex-col flex-1"
            style={{ 
              minHeight: '700px',
              fontFamily: "'Cairo', 'Milligram Arabic Trial', 'Noto Sans Arabic', sans-serif",
              fontWeight: 400,
              justifyContent: questions.length <= 4 ? 'space-around' : 'space-between'
            }}
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold underline inline-block px-4">الأسئلة الامتحانية</h1>
            </div>

            <div className="space-y-0">
              {questions.map((q, idx) => (
                <React.Fragment key={idx}>
                  <div className="py-6 space-y-4">
                    {/* Case 1: Main text exists - Display main text first */}
                    {q.text && (
                      <div className="flex items-start gap-4">
                        <span className="text-xl font-bold shrink-0">س{idx + 1}/</span>
                        <p className="text-lg leading-[1.6] flex-1">
                          {q.text}
                        </p>
                      </div>
                    )}

                    {/* Branches logic */}
                    {q.branches.length > 0 ? (
                      <div className={q.text ? "mr-12 space-y-4" : "space-y-4"}>
                        {q.branches.map((branch, bIdx) => (
                          <div key={bIdx} className="flex items-start gap-4">
                            {/* If no main text, align S1/ with Branch A */}
                            {!q.text && bIdx === 0 && (
                              <span className="text-xl font-bold shrink-0">س{idx + 1}/</span>
                            )}
                            <span className={!q.text && bIdx === 0 ? "text-lg font-bold shrink-0 mr-2" : "text-lg font-bold shrink-0"}>
                              {arabicLabels[bIdx] || 'أ'}/
                            </span>
                            <p className="text-lg leading-[1.6] flex-1">
                              {branch || '..........................................................................................................................................................................................................................................'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Case 2: No main text and no branches - Empty line with S1/ */
                      !q.text && (
                        <div className="flex items-start gap-4">
                          <span className="text-xl font-bold shrink-0">س{idx + 1}/</span>
                          <p className="text-lg leading-[1.6] flex-1">
                            ..........................................................................................................................................................................................................................................
                          </p>
                        </div>
                      )
                    )}
                  </div>
                  {idx < questions.length - 1 && (
                    <div className="border-t w-full" style={{ borderColor: 'rgba(0,0,0,0.1)' }}></div>
                  )}
                </React.Fragment>
              ))}
            </div>
            
            <div className="mt-auto"></div>
          </div>

          {/* PDF Footer Section */}
          <div className="shrink-0">
            <div className="mt-6 border-t pt-4 flex justify-between items-end" style={{ fontFamily: "'Milligram Arabic Trial', sans-serif", borderColor: 'rgba(0,0,0,0.2)' }}>
              <div className="text-[10px] italic" style={{ color: '#94a3b8' }}>أُنشئ بواسطة "عراقي أكاديمي"</div>
              <div className="text-right">
                <p className="text-sm font-bold mb-1">مدرس المادة:</p>
                <p className="text-lg font-bold">الأستاذ {formData.teacherName}</p>
              </div>
            </div>
            
            <div className="text-center mt-6 mb-2" style={{ fontFamily: "'Milligram Arabic Trial', sans-serif" }}>
              <p className="text-sm italic font-bold border inline-block px-8 py-2 rounded-full" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>مع تمنياتنا لكم بالنجاح والموفقية</p>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <FileEdit size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">صانع الأسئلة الاحترافي</h2>
              <p className="text-xs text-slate-500">خاص بالمدرسين لتنظيم الأسئلة الامتحانية</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors z-20">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-slate-50/30">
          <div className="p-6 flex flex-col gap-8 flex-1">
            {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <School size={12} /> اسم المدرسة
                  </label>
                  <input
                    type="text"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({...formData, schoolName: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm focus:border-blue-500"
                    placeholder="مدرسة المتميزين مثلاً"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <BookOpen size={12} /> المادة
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm focus:border-blue-500"
                    placeholder="الرياضيات"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <User size={12} /> اسم المدرس
                  </label>
                  <input
                    type="text"
                    value={formData.teacherName}
                    onChange={(e) => setFormData({...formData, teacherName: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm focus:border-blue-500"
                    placeholder="أ. حسن علي"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Calendar size={12} /> العام الدراسي
                  </label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Clock size={12} /> وقت الامتحان
                  </label>
                  <input
                    type="text"
                    value={formData.examTime}
                    onChange={(e) => setFormData({...formData, examTime: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Layout size={12} /> نوع الامتحان
                  </label>
                  <select
                    value={formData.examType}
                    onChange={(e) => setFormData({...formData, examType: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none focus:border-blue-500"
                  >
                    <option>شهر أول</option>
                    <option>شهر ثاني</option>
                    <option>نصف السنة</option>
                    <option>نهاية السنة</option>
                    <option>امتحان يومي</option>
                  </select>
                </div>
              </div>

              {/* Questions Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                  <h3 className="font-bold text-slate-900 border-r-4 border-blue-500 pr-2">أدخل الأسئلة والفروع</h3>
                  <button 
                    onClick={addQuestion}
                    className="flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                  >
                    <Plus size={14} /> إضافة سؤال جديد
                  </button>
                </div>
                
                <div className="space-y-4">
                  <AnimatePresence initial={false}>
                    {questions.map((q, idx) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 shadow-sm"
                      >
                        <div className="flex gap-3 group">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {q.branches.length > 0 ? `سؤال ${idx + 1} (منطوق السؤال أو الملاحظة)` : `سؤال ${idx + 1}`}
                              </span>
                              <button 
                                onClick={() => removeQuestion(idx)}
                                disabled={questions.length === 1}
                                className="p-1 px-2 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-0"
                              >
                                حذف السؤال كاملًا
                              </button>
                            </div>
                            <textarea
                              value={q.text}
                              onChange={(e) => updateQuestion(idx, e.target.value)}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none transition-all focus:bg-white"
                              rows={q.text.length > 80 ? 3 : 2}
                              placeholder="اكتب منطوق السؤال هنا..."
                            />
                          </div>
                        </div>

                        {/* Branches Section */}
                        <div className="mr-6 space-y-3 pl-2 border-r-2 border-blue-100 pr-4">
                          {q.branches.map((branch, bIdx) => (
                            <div key={bIdx} className="flex gap-3 group animate-in fade-in slide-in-from-right-1 duration-200">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 rounded">فرع {arabicLabels[bIdx] || 'أ'}</span>
                                  <button 
                                    onClick={() => removeBranch(idx, bIdx)}
                                    className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors"
                                  >
                                    حذف الفرع
                                  </button>
                                </div>
                                <textarea
                                  value={branch}
                                  onChange={(e) => updateBranch(idx, bIdx, e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none transition-all focus:bg-white"
                                  rows={branch.length > 80 ? 2 : 1}
                                  placeholder="اكتب تكملة الفرع أو السؤال الفرعي..."
                                />
                              </div>
                            </div>
                          ))}
                          
                          <button 
                            onClick={() => addBranch(idx)}
                            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors py-1 opacity-80 hover:opacity-100 bg-blue-50/50 w-full justify-center rounded-lg border border-dashed border-blue-200"
                          >
                            <Plus size={12} /> أضف فرعاً جديدًا (أ، ب، ج...)
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
          </div>

          <div className="p-6 border-t border-slate-200 bg-white flex flex-col sm:flex-row gap-4 items-center justify-end shrink-0">
            <button
              onClick={generatePdf}
              disabled={isGenerating || !formData.schoolName || !formData.subject}
              className="w-full sm:w-auto px-10 py-3.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:bg-slate-300 transition-all uppercase tracking-wide disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>جاري المعالجة...</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>حفظ كملف PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
