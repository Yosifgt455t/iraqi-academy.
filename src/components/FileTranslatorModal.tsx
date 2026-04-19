import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Languages, FileUp, Loader2, Download, AlertCircle, FileText, ImageIcon } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  onClose: () => void;
}

interface SelectedFile {
  file: File;
  type: 'image' | 'pdf';
  preview?: string;
}

export default function FileTranslatorModal({ onClose }: Props) {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [translatedText, setTranslatedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfName, setPdfName] = useState('ترجمة_جديدة');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type = file.type.includes('pdf') ? 'pdf' : 'image';
    const preview = type === 'image' ? URL.createObjectURL(file) : undefined;

    setSelectedFile({ file, type, preview });
    setTranslatedText('');
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const translateFile = async () => {
    if (!selectedFile || isProcessing) return;

    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = await fileToBase64(selectedFile.file);

      const prompt = `Translate all text in this ${selectedFile.type} into clear, academic Arabic. 
      If it's a summary or notes, keep the same structure and headings. 
      Do NOT add any intro or outro, just give me the translated text. 
      Format it nicely with headings if appropriate.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: selectedFile.file.type,
                  data: base64Data
                }
              }
            ]
          }
        ]
      });

      setTranslatedText(response.text || 'لم يتم العثور على نص للترجمة.');
    } catch (error) {
      console.error('Translation error:', error);
      alert('حدث خطأ أثناء الترجمة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAsPdf = async () => {
    if (!translatedText || !printRef.current) return;

    setIsProcessing(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
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
      pdf.save(`${pdfName || 'translation'}.pdf`);
    } catch (error) {
      console.error('PDF error:', error);
      alert('حدث خطأ أثناء تحميل الملف.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl overflow-hidden">
      {/* Hidden for PDF rendering */}
      <div className="fixed left-[-9999px] top-0">
        <div 
          ref={printRef}
          className="p-10 text-lg text-right"
          style={{ width: '794px', direction: 'rtl', whiteSpace: 'pre-wrap', fontFamily: 'serif', background: '#ffffff', color: '#000000' }}
        >
          {translatedText}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-violet-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-200">
              <Languages size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">مترجم الملفات الذكي</h2>
              <p className="text-xs text-slate-500">ترجمة الصور والملفات للعربية باستخدام الذكاء الاصطناعي</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!selectedFile ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[2/1] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-violet-50 hover:border-violet-300 transition-all group"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-violet-600 group-hover:text-white transition-all shadow-inner">
                <FileUp size={32} />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-700">اختر ملف أو صورة</p>
                <p className="text-sm text-slate-400 mt-1">ندعم ملفات PDF وصور الملخصات</p>
              </div>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-violet-600 shadow-sm flex-shrink-0">
                    {selectedFile.type === 'pdf' ? <FileText size={20} /> : <ImageIcon size={20} />}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-bold text-slate-700 truncate">{selectedFile.file.name}</p>
                    <p className="text-[10px] text-slate-400">{(selectedFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="text-red-500 text-xs font-bold hover:underline"
                >
                  تغيير الملف
                </button>
              </div>

              {!translatedText && (
                <button
                  onClick={translateFile}
                  disabled={isProcessing}
                  className="w-full h-14 bg-violet-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-violet-500/20 hover:bg-violet-700 disabled:bg-slate-300 transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>جاري الترجمة... قد تستغرق دقيقة</span>
                    </>
                  ) : (
                    <>
                      <Languages size={20} />
                      <span>ابدأ الترجمة الفورية للعربية</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {translatedText && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-violet-600 rounded-full" />
                  النتيجة المترجمة:
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pdfName}
                    onChange={(e) => setPdfName(e.target.value)}
                    className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] outline-none"
                    placeholder="اسم الملف"
                  />
                  <button
                    onClick={downloadAsPdf}
                    className="flex items-center gap-1 text-[10px] font-bold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors"
                  >
                    <Download size={12} />
                    تحميل PDF
                  </button>
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 text-sm text-slate-700 leading-relaxed text-right border border-slate-100" dir="rtl">
                {translatedText}
              </div>
            </div>
          )}

          <div className="flex gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <AlertCircle size={20} className="text-blue-500 flex-shrink-0" />
            <p className="text-[11px] text-blue-700 leading-relaxed italic">
              استخدم هذه الأداة لترجمة الملازم والصور الأجنبية. الذكاء الاصطناعي سيهتم بصياغة الجمل لتناسب المنهج العراقي.
            </p>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,.pdf"
          className="hidden"
        />
      </motion.div>
    </div>
  );
}
