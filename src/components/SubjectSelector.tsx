import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Subject, Grade } from '../types';
import { Book, Atom, Calculator, FlaskConical, Languages, Loader2, ChevronLeft } from 'lucide-react';

interface Props {
  grade: Grade;
  onSelect: (subject: Subject) => void;
}

const iconMap: Record<string, any> = {
  'الفيزياء': Atom,
  'الرياضيات': Calculator,
  'الكيمياء': FlaskConical,
  'الأحياء': Book,
  'اللغة العربية': Languages,
};

export default function SubjectSelector({ grade, onSelect }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .eq('grade', grade);
        
        if (error) throw error;
        setSubjects(data || []);
      } catch (err) {
        console.error('Error fetching subjects:', err);
        // Mock for safety
        setSubjects([
          { id: '1', name: 'الفيزياء', grade },
          { id: '2', name: 'الرياضيات', grade },
          { id: '3', name: 'الكيمياء', grade },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, [grade]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 text-center">اختر المادة الدراسية</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {subjects.map((subject) => {
          const Icon = iconMap[subject.name] || Book;
          return (
            <button
              key={subject.id}
              onClick={() => onSelect(subject)}
              className="flex items-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all group text-right"
            >
              <div className="p-4 bg-blue-50 text-blue-600 rounded-xl ml-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Icon size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900">{subject.name}</h3>
                <p className="text-sm text-slate-500">تصفح الفصول والمصادر</p>
              </div>
              <ChevronLeft className="text-slate-300 group-hover:text-blue-500" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
