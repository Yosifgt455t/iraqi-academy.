import React, { useState } from 'react';
import { X, Plus, Trash2, Calendar, Clock, BookOpen, Sparkles } from 'lucide-react';

interface SubjectInput {
  name: string;
  chapters: string;
}

interface Props {
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}

export default function ScheduleMakerModal({ onClose, onSubmit }: Props) {
  const [days, setDays] = useState('7');
  const [hours, setHours] = useState('4');
  const [preferredTime, setPreferredTime] = useState('متنوع');
  const [subjects, setSubjects] = useState<SubjectInput[]>([{ name: '', chapters: '' }]);

  const handleAddSubject = () => {
    setSubjects([...subjects, { name: '', chapters: '' }]);
  };

  const handleRemoveSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleSubjectChange = (index: number, field: keyof SubjectInput, value: string) => {
    const newSubjects = [...subjects];
    newSubjects[index][field] = value;
    setSubjects(newSubjects);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validSubjects = subjects.filter(s => s.name.trim() !== '');
    if (validSubjects.length === 0) {
      alert('يرجى إضافة مادة واحدة على الأقل');
      return;
    }

    const subjectsText = validSubjects.map((s, i) => `${i + 1}. ${s.name} (${s.chapters || 'غير محدد'} فصول/مواضيع)`).join('\n');

    const prompt = `أريد منك عمل جدول دراسي مفصل ومنظم بناءً على المعلومات التالية:
- المدة المتاحة للدراسة: ${days} أيام
- عدد ساعات الدراسة يومياً: ${hours} ساعات
- وقت الدراسة المفضل: ${preferredTime}
- المواد المطلوب دراستها:
${subjectsText}

يرجى توزيع المواد والفصول على الأيام والساعات بشكل منطقي، وتضمين فترات راحة (مثل تقنية بومودورو). 
اعرض الجدول باستخدام Markdown Table ليكون واضحاً ومرتباً، مع إضافة نصائح دراسية قصيرة في النهاية تناسب طالباً عراقياً.`;

    onSubmit(prompt);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">صانع الجداول الذكي</h3>
              <p className="text-xs text-slate-500">رتب وقتك وموادك بضغطة زر</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          
          {/* Time & Days */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" />
                كم يوم عندك؟
              </label>
              <input 
                type="number" 
                min="1"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                placeholder="مثال: 7"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Clock size={16} className="text-blue-500" />
                كم ساعة باليوم؟
              </label>
              <input 
                type="number" 
                min="1"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                placeholder="مثال: 4"
              />
            </div>
          </div>

          {/* Preferred Time */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">وقت الدراسة المفضل</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {['صباحاً', 'مساءً', 'متنوع'].map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setPreferredTime(time)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-all border ${
                    preferredTime === time 
                      ? 'bg-blue-50 border-blue-200 text-blue-700' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Subjects */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <BookOpen size={16} className="text-blue-500" />
                المواد والفصول
              </label>
            </div>
            
            <div className="space-y-3">
              {subjects.map((subject, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <input 
                      type="text" 
                      value={subject.name}
                      onChange={(e) => handleSubjectChange(index, 'name', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      placeholder="اسم المادة (مثال: رياضيات)"
                    />
                  </div>
                  <div className="w-24 space-y-2">
                    <input 
                      type="number" 
                      min="1"
                      value={subject.chapters}
                      onChange={(e) => handleSubjectChange(index, 'chapters', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      placeholder="الفصول"
                    />
                  </div>
                  {subjects.length > 1 && (
                    <button 
                      onClick={() => handleRemoveSubject(index)}
                      className="p-2.5 mt-0.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button 
              onClick={handleAddSubject}
              className="w-full py-2.5 border-2 border-dashed border-slate-200 text-slate-500 rounded-xl hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus size={16} />
              إضافة مادة أخرى
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={handleSubmit}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
          >
            <Sparkles size={18} />
            توليد الجدول الآن
          </button>
        </div>

      </div>
    </div>
  );
}
