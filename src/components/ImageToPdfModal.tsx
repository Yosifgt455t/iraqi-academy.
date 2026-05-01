import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ImagePlus, FileDown, Trash2, Loader2, Download, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface Props {
  onClose: () => void;
}

interface SelectedImage {
  id: string;
  file: File;
  preview: string;
}

export default function ImageToPdfModal({ onClose }: Props) {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfName, setPdfName] = useState('ملف_جديد');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newImages = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file)
    }));

    setImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      // Clean up object URL for the removed image
      const removed = prev.find(img => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const generatePdf = async () => {
    if (!images.length || isGenerating) return;

    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      
      for (let i = 0; i < images.length; i++) {
        if (i > 0) doc.addPage();
        
        const img = images[i];
        const imageData = await getImageDataUrl(img.file);
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Add image with aspect ratio maintenance
        doc.addImage(imageData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      doc.save(`${pdfName || 'iraqi_academy'}.pdf`);
      onClose();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء إنشاء الملف. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getImageDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-md overflow-hidden shadow-blue-500/10"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <FileDown size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">تحويل الصور إلى PDF</h2>
              <p className="text-xs text-slate-500">اختر صورك وحولها لملف واحد بسهولة</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Settings if images exist */}
          {images.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
              <label className="text-sm font-bold text-slate-700 block">اسم الملف الجديد:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pdfName}
                  onChange={(e) => setPdfName(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  placeholder="مثال: ملخص الفيزياء"
                />
                <span className="flex items-center text-slate-400 text-sm font-medium">.pdf</span>
              </div>
            </div>
          )}

          {images.length === 0 ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-video border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-4 hover:bg-blue-50 hover:border-blue-300 transition-all group"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                <ImagePlus size={32} />
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-700">اضغط هنا لاختيار الصور</p>
                <p className="text-sm text-slate-400 mt-1">يمكنك اختيار أكثر من صورة معاً</p>
              </div>
            </button>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((img, index) => (
                <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm bg-slate-100">
                  <img src={img.preview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => removeImage(img.id)}
                      className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full font-bold">
                    {index + 1}
                  </div>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-all text-slate-400 hover:text-blue-600 shadow-inner"
              >
                <ImagePlus size={24} />
                <span className="text-xs font-bold">إضافة المزيد</span>
              </button>
            </div>
          )}
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            multiple
            className="hidden"
          />

          {images.length > 0 && (
            <div className="flex gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100 italic">
              <AlertCircle size={20} className="text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                سيتم ترتيب الصور في ملف الـ PDF وفقاً لتسلسل اختيارك الموضح أعلاه.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={generatePdf}
            disabled={images.length === 0 || isGenerating}
            className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-sm shadow-blue-500/20 hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>جاري إنشاء ملف الـ PDF...</span>
              </>
            ) : (
              <>
                <Download size={20} />
                <span>تحميل ملف الـ PDF ({images.length} صورة)</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
