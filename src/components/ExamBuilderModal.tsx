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

import { EnglishExamData, EnglishExamPdf, EnglishExamEditor, defaultEnglishExam } from './EnglishExamUI';

interface Props {
  onClose: () => void;
}

interface Question {
  type: 'standard' | 'fill_in' | 'matching';
  text: string;
  branches: string[];
  fillInWords?: string;
  matchingList1?: string;
  matchingList2?: string;
  sectionTitle?: string;
  marks?: string;
  customLabel?: string;
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
    watermark: '',
    language: 'ar' as 'ar' | 'en'
  });

  const [questions, setQuestions] = useState<Question[]>([{ 
    type: 'standard', text: '', branches: [], fillInWords: '', matchingList1: '', matchingList2: '' 
  }]);
  
  const [engExam, setEngExam] = useState<EnglishExamData>(defaultEnglishExam);

  const printRef = useRef<HTMLDivElement>(null);

  const addQuestion = () => setQuestions([...questions, { type: 'standard', text: '', branches: [], fillInWords: '', matchingList1: '', matchingList2: '' }]);
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

  const updateQuestionProp = (index: number, prop: keyof Question, val: string | 'standard' | 'fill_in' | 'matching') => {
    const newQs = [...questions];
    newQs[index] = { ...newQs[index], [prop]: val };
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
  const englishLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
  const isEn = formData.language === 'en';

  const generatePdf = async () => {
    if (isGenerating || !printRef.current) return;
    setIsGenerating(true);

    try {
      const element = printRef.current;
      const originalContainerHeight = element.style.height;
      const originalMinHeight = element.style.minHeight;
      const contentHeight = element.scrollHeight;
      
      const a4Height = 1123;
      const targetMinHeight = isEn ? a4Height * 2 : a4Height;
      const newTotalHeight = Math.max(contentHeight, targetMinHeight);
      
      // Temporarily fix height so footer sticks to bottom
      element.style.minHeight = `${newTotalHeight}px`;
      element.style.height = `${newTotalHeight}px`;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      // restore original heights
      element.style.height = originalContainerHeight;
      element.style.minHeight = originalMinHeight;
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 1) {
        position = position - pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(isEn ? `Exam_${formData.subject || 'Questions'}.pdf` : `اسئلة_${formData.subject || 'امتحان'}.pdf`);
      onClose();
    } catch (error) {
      console.error('PDF error:', error);
      alert(isEn ? 'An error occurred while generating the PDF.' : 'حدث خطأ أثناء إنشاء ملف الأسئلة.');
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
          id="print-container"
          className={`px-[40px] py-[30px] ${isEn ? 'text-left' : 'text-right'} flex flex-col items-stretch relative`}
          style={{ 
            backgroundColor: '#ffffff',
            color: '#000000',
            width: '794px', 
            minHeight: '1123px',
            direction: isEn ? 'ltr' : 'rtl',
            fontFamily: isEn ? "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" : "Arial, Tahoma, sans-serif"
          }}
        >
          {/* PDF Header Section */}
          <div className="border-b-2 pb-1 mb-2 shrink-0" dir={isEn ? "ltr" : "rtl"} style={{ borderColor: '#000000' }}>
            <div className="flex justify-between items-start text-xs font-bold">
              <div className={isEn ? "text-left space-y-0.5" : "text-right space-y-0.5"}>
                <p>{isEn ? 'Subject:' : 'المادة:'} {formData.subject}</p>
                <p>{isEn ? 'Time:' : 'الوقت:'} {formData.examTime}</p>
              </div>
              <div className="text-center space-y-0 flex-1 px-4">
                <p className="text-lg font-bold">{isEn ? 'Republic of Iraq' : 'جمهورية العراق'}</p>
                <p className="text-base font-bold">{isEn ? 'Ministry of Education' : 'وزارة التربية'}</p>
                <p className="text-sm font-bold">{formData.schoolName}</p>
                <p className="text-[10px] font-sans">{formData.academicYear}</p>
              </div>
              <div className={isEn ? "text-right space-y-0.5" : "text-left space-y-0.5"}>
                <p>{isEn ? 'Exam:' : 'الامتحان:'} {formData.examType}</p>
              </div>
            </div>
          </div>

          {/* PDF Body Section */}
          {isEn ? (
            <EnglishExamPdf exam={engExam} />
          ) : (
            <div 
              className="flex flex-col flex-1 overflow-hidden"
              dir="rtl"
              style={{ 
                minHeight: '850px',
                fontFamily: "Arial, Tahoma, sans-serif",
                fontWeight: 400,
                textAlign: 'right',
                justifyContent: 'flex-start',
                lineHeight: '1.4'
              }}
            >
              <div className="text-center mb-2">
                <h1 className="text-lg font-bold underline inline-block px-4">
                  الأسئلة الامتحانية
                </h1>
              </div>

              <div className="space-y-0 text-[16.5px]">
                {questions.map((q, idx) => (
                  <React.Fragment key={idx}>
                    <div className="py-0.5 space-y-1.5 shrink-0">
                      {/* Section Title */}
                      {q.sectionTitle && (
                        <div className="font-bold text-[17px] italic mt-1 mb-0.5">
                          {q.sectionTitle}
                        </div>
                      )}

                      {/* Main text exists - Display main text first */}
                      {q.text && (
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <span className="text-lg font-bold shrink-0">
                              {q.customLabel ? q.customLabel : `س${idx + 1}/`}
                            </span>
                            <p className="leading-[1.4] flex-1 font-semibold whitespace-pre-line">
                              {q.text}
                            </p>
                          </div>
                          {q.marks && (
                            <div className="font-bold italic whitespace-nowrap ml-4 text-[17px] shrink-0">
                              {q.marks}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Specific Types Rendering */}
                      {q.type === 'fill_in' && q.fillInWords && (
                        <div className="border-[2px] rounded-lg p-2 mx-8 mb-3 text-center font-bold text-lg tracking-wider" dir="ltr" style={{ borderColor: '#000000' }}>
                          {q.fillInWords.split(',').map(w => w.trim()).filter(Boolean).join('   ,   ')}
                        </div>
                      )}

                      {q.type === 'matching' && (
                        <div className="flex gap-8 justify-center mb-3 px-12" dir="rtl">
                          <div className="min-w-[200px] flex-1 text-right">
                            <p className="font-bold mb-1 italic">القائمة A :</p>
                            {(q.matchingList1 || '').split('\n').filter(Boolean).map((item, i) => (
                              <div key={i} className="mb-1 flex gap-2 font-semibold justify-start">
                                <span className="w-6 shrink-0">{i + 1}.</span> <span>{item}</span>
                              </div>
                            ))}
                          </div>
                          <div className="min-w-[200px] flex-1 text-right">
                            <p className="font-bold mb-1 italic">القائمة B :</p>
                            {(q.matchingList2 || '').split('\n').filter(Boolean).map((item, i) => (
                              <div key={i} className="mb-1 flex gap-2 font-semibold justify-start">
                                <span className="w-6 shrink-0">{(englishLabels[i] || 'a').toLowerCase()}.</span> <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Branches logic */}
                      {q.branches.length > 0 ? (
                        <div className={q.text ? "mr-10 space-y-1" : "space-y-1"}>
                          {q.branches.map((branch, bIdx) => (
                            <div key={bIdx} className="flex items-start gap-4">
                              {!q.text && bIdx === 0 && (
                                <span className="text-base font-bold shrink-0">
                                  {q.customLabel ? q.customLabel : `س${idx + 1}/`}
                                </span>
                              )}
                              <span className={!q.text && bIdx === 0 ? "text-[16.5px] font-bold shrink-0 mr-2" : "text-[16.5px] font-bold shrink-0"}>
                                {`${arabicLabels[bIdx] || 'أ'}/`}
                              </span>
                              <p className="text-[16.5px] leading-[1.3] flex-1 font-semibold">
                                {branch || '......................................................................................................................'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* No main text and no branches - Empty line */
                        !q.text && (
                          <div className="flex items-start gap-4">
                            <span className="text-base font-bold shrink-0">
                              {q.customLabel ? q.customLabel : `س${idx + 1}/`}
                            </span>
                            <p className="text-[16.5px] leading-[1.3] flex-1 font-semibold">
                              ......................................................................................................................
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
            </div>
          )}

          {/* PDF Footer Section */}
          <div className="shrink-0 mt-auto" dir={isEn ? "ltr" : "rtl"}>
            <div className={`mt-4 border-t pt-2 flex justify-between items-end ${isEn ? '' : ''}`} style={{ borderColor: 'rgba(0,0,0,0.2)' }}>
              <div className="text-[10px] font-bold leading-tight flex flex-col font-sans" style={{ color: '#94a3b8', textAlign: isEn ? 'left' : 'right' }}>
                <span>{isEn ? 'Created by Iraqi Academy App' : 'صُنع بواسطة تطبيق عراقي أكاديمي'}</span>
                <span style={{ fontSize: '9px', direction: 'ltr' }}>https://iraqi-academy.vercel.app</span>
              </div>
              <div className={isEn ? "text-left" : "text-right"}>
                <p className="text-xs font-bold mb-0.5">{isEn ? 'Teacher:' : 'مدرس المادة:'}</p>
                <p className="text-base font-bold">{isEn ? '' : 'الأستاذ '} {formData.teacherName}</p>
              </div>
            </div>
            
            <div className={`text-center mt-3 mb-1 ${isEn ? '' : 'font-[Milligram Arabic Trial,sans-serif]'}`}>
              <p className="text-xs italic font-bold border inline-block px-6 py-1 rounded-full" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                {isEn ? 'Best wishes for your success' : 'مع تمنياتنا لكم بالنجاح والموفقية'}
              </p>
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
              <h2 className="text-xl font-bold text-slate-900">{isEn ? 'Professional Exam Builder' : 'صانع الأسئلة الاحترافي'}</h2>
              <p className="text-xs text-slate-500">{isEn ? 'For teachers to organize exam questions' : 'خاص بالمدرسين لتنظيم الأسئلة الامتحانية'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors z-20">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-slate-50/30">
          <div className="p-6 flex flex-col gap-8 flex-1">
            {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" dir={isEn ? "ltr" : "rtl"}>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <School size={12} /> {isEn ? 'School Name' : 'اسم المدرسة'}
                  </label>
                  <input
                    type="text"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({...formData, schoolName: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm focus:border-blue-500"
                    placeholder={isEn ? "e.g., High School" : "مدرسة المتميزين مثلاً"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <BookOpen size={12} /> {isEn ? 'Subject' : 'المادة'}
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm focus:border-blue-500"
                    placeholder={isEn ? "Mathematics" : "الرياضيات"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <User size={12} /> {isEn ? 'Teacher Name' : 'اسم المدرس'}
                  </label>
                  <input
                    type="text"
                    value={formData.teacherName}
                    onChange={(e) => setFormData({...formData, teacherName: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm focus:border-blue-500"
                    placeholder={isEn ? "Mr. Smith" : "أ. حسن علي"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Calendar size={12} /> {isEn ? 'Academic Year' : 'العام الدراسي'}
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
                    <Clock size={12} /> {isEn ? 'Exam Time' : 'وقت الامتحان'}
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
                    <Layout size={12} /> {isEn ? 'Exam Type' : 'نوع الامتحان'}
                  </label>
                  <select
                    value={formData.examType}
                    onChange={(e) => setFormData({...formData, examType: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none focus:border-blue-500"
                  >
                    {isEn ? (
                      <>
                        <option>First Month</option>
                        <option>Second Month</option>
                        <option>Midterm</option>
                        <option>Final</option>
                        <option>Daily/Quiz</option>
                      </>
                    ) : (
                      <>
                        <option>شهر أول</option>
                        <option>شهر ثاني</option>
                        <option>نصف السنة</option>
                        <option>نهاية السنة</option>
                        <option>امتحان يومي</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    {isEn ? 'Exam Language' : 'لغة الامتحان'}
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({...formData, language: e.target.value as 'ar' | 'en'})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none focus:border-blue-500"
                  >
                    <option value="ar">العربية</option>
                    <option value="en">English (الانكليزية)</option>
                  </select>
                </div>
              </div>

              {/* Questions Section */}
              {isEn ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4 border-slate-100">
                    <h3 className="font-bold text-slate-900 border-r-4 border-blue-500 pl-2 text-left" dir="ltr">
                      Enter Questions and Branches
                    </h3>
                  </div>
                  <EnglishExamEditor exam={engExam} setExam={setEngExam} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4 border-slate-100">
                    <h3 className="font-bold text-slate-900 border-r-4 border-blue-500 pr-2">
                      أدخل الأسئلة والفروع
                    </h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={addQuestion}
                        className="flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                      >
                        <Plus size={14} /> إضافة سؤال جديد
                      </button>
                    </div>
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
                            <div className="flex-1 space-y-3">
                              <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
                                <div className="flex items-center gap-2" dir="rtl">
                                  <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                    {q.branches.length > 0 ? `سؤال ${idx + 1} (منطوق السؤال أو الملاحظة)` : `سؤال ${idx + 1}`}
                                  </span>
                                </div>
                                <button 
                                  onClick={() => removeQuestion(idx)}
                                  disabled={questions.length === 1}
                                  className="p-1 px-2 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-0"
                                >
                                  حذف السؤال كاملًا
                                </button>
                              </div>

                              {/* Additional Optional Formattings */}
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3" dir="rtl">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 block">
                                    الدرجة (اختياري)
                                  </label>
                                  <input
                                    type="text"
                                    value={q.marks || ''}
                                    onChange={(e) => updateQuestionProp(idx, 'marks', e.target.value)}
                                    placeholder="مثلاً: (١٠ درجات)"
                                    className="w-full sm:w-1/3 bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500 text-xs"
                                    dir="rtl"
                                  />
                                </div>
                              </div>

                              <textarea
                                value={q.text}
                                onChange={(e) => updateQuestionProp(idx, 'text', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none transition-all focus:bg-white"
                                rows={q.text.length > 80 ? 3 : 2}
                                placeholder="اكتب منطوق السؤال هنا..."
                                dir="rtl"
                              />
                            </div>
                          </div>

                          {/* Branches Section */}
                          <div className="mr-6 space-y-3 pl-2 border-r-2 border-blue-100 pr-4" dir="rtl">
                            {q.branches.map((branch, bIdx) => (
                              <div key={bIdx} className="flex gap-3 group animate-in fade-in slide-in-from-right-1 duration-200">
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 rounded">
                                      {`فرع ${arabicLabels[bIdx] || 'أ'}`}
                                    </span>
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
                                    dir="rtl"
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
              )}
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
                  <span>{isEn ? 'Processing...' : 'جاري المعالجة...'}</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>{isEn ? 'Save as PDF' : 'حفظ كملف PDF'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
