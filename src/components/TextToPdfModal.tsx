import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Download, Loader2, Type, AlignLeft } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  onClose: () => void;
}

export default function TextToPdfModal({ onClose }: Props) {
  const [text, setText] = useState('');
  const [pdfName, setPdfName] = useState('نص_جديد');
  const [isGenerating, setIsGenerating] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const printRef = useRef<HTMLDivElement>(null);

  const generatePdf = async () => {
    if (!text.trim() || isGenerating || !printRef.current) return;

    setIsGenerating(true);
    try {
      const element = printRef.current;
      
      // We'll capture the hidden element using html2canvas
      // This ensures Arabic shaping and RTL are handled by the browser
      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // If content is longer than one page, jsPDF can split it, 
      // but for simple text, let's just add it.
      // For very long text, we'd need to loop over canvas slices.
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      pdf.save(`${pdfName || 'iraqi_academy'}.pdf`);
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF. تأكد من إعطاء الصلاحيات اللازمة.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl overflow-hidden">
      {/* Hidden element for rendering */}
      <div className="fixed left-[-9999px] top-0">
        <div 
          ref={printRef}
          style={{ 
            width: '794px', // A4 width in px at 96 DPI
            padding: '40px',
            background: '#ffffff',
            color: '#000000',
            direction: 'rtl',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            fontSize: `${fontSize * 1.5}px`, // Adjusted for rendering
            fontFamily: 'serif',
            lineHeight: '1.6'
          }}
        >
          {text}
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Type size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">تحويل النص إلى PDF</h2>
              <p className="text-xs text-slate-500">اكتب نصوصك أو الصقها وحولها لملف احترافي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors shadow-sm"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 block">اسم الملف:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pdfName}
                onChange={(e) => setPdfName(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                placeholder="اسم الملف..."
              />
              <span className="flex items-center text-slate-400 text-sm font-medium">.pdf</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700 block">النص:</label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">حجم الخط:</span>
                <select 
                  value={fontSize} 
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none"
                >
                  <option value={10}>صغير</option>
                  <option value={14}>متوسط</option>
                  <option value={18}>كبير</option>
                  <option value={24}>كبير جداً</option>
                </select>
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-64 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm resize-none"
              placeholder="اكتب هنا كل ما تريد تحويله..."
              dir="rtl"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={generatePdf}
            disabled={!text.trim() || isGenerating}
            className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 disabled:bg-slate-300 disabled:shadow-none transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>جاري إنشاء ملف الـ PDF...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>تحميل ملف الـ PDF</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
