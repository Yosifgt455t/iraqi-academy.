import React, { useState, useEffect } from 'react';
import { X, Calendar, BookOpen, Sparkles, Check, ChevronDown, User, AlertCircle, Bookmark } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAIClient, shouldSwitchKey } from '../services/aiService';
import { Type, Schema } from '@google/genai';
import { Subject, Teacher, Profile } from '../types';

interface Props {
  user: any;
  userProfile: Profile | null;
  onClose: () => void;
  onScheduleCreated: (schedule: any) => void;
}

interface SubjectItem {
  id: string;
  name: string;
  selected: boolean;
  sessionsPerWeek: number;
  selectedTeacherId: string;
}

export default function ScheduleMakerModal({ user, userProfile, onClose, onScheduleCreated }: Props) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectItems, setSubjectItems] = useState<SubjectItem[]>([]);
  const [studentNotes, setStudentNotes] = useState('');
  const [errorText, setErrorText] = useState('');

  // Fetch subjects and teachers
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [subjectsSnap, teachersSnap] = await Promise.all([
          getDocs(collection(db, 'subjects')),
          getDocs(collection(db, 'teachers'))
        ]);

        const loadedSubjects = subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
        const loadedTeachers = teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));

        // Filter subjects based on student's grade
        const userGrade = userProfile?.grade || '';
        const filteredSubjects = loadedSubjects.filter(sub => {
          if (!userGrade) return true;
          if (sub.grades && sub.grades.includes(userGrade)) return true;
          if (sub.grade === userGrade) return true;
          return false;
        });

        // Map filtered subjects to form inputs
        const initialItems = filteredSubjects.map(sub => {
          // Find first teacher for this subject
          const matchTeacher = loadedTeachers.find(t => t.subjectId === sub.id);
          return {
            id: sub.id,
            name: sub.name,
            selected: true,
            sessionsPerWeek: 3, // Default sessions per week
            selectedTeacherId: matchTeacher ? matchTeacher.id : 'any' // default to first teacher
          };
        });

        setSubjects(filteredSubjects);
        setTeachers(loadedTeachers);
        setSubjectItems(initialItems);
      } catch (err) {
        console.error("Error fetching scheduling data:", err);
        setErrorText("حدث خطأ أثناء تحميل البيانات من قاعدة البيانات. يرجى المحاولة لاحقاً.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile?.grade]);

  const handleToggleSubject = (id: string) => {
    setSubjectItems(prev =>
      prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item)
    );
  };

  const handleSessionsChange = (id: string, val: number) => {
    const safeVal = Math.max(1, Math.min(7, val));
    setSubjectItems(prev =>
      prev.map(item => item.id === id ? { ...item, sessionsPerWeek: safeVal } : item)
    );
  };

  const handleTeacherChange = (id: string, teacherId: string) => {
    setSubjectItems(prev =>
      prev.map(item => item.id === id ? { ...item, selectedTeacherId: teacherId } : item)
    );
  };

  // Extract from AI-generated JSON and match real lecture links from Materials DB
  const enrichScheduleWithRealMaterials = async (generatedSchedule: any) => {
    try {
      const materialsSnap = await getDocs(collection(db, 'materials'));
      const materialsList = materialsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Track how many lessons of each (subjectID, teacherID) pair we've allocated so far
      const pairCounters: Record<string, number> = {};
      const completedIds = userProfile?.completed_materials || [];

      const processedSchedule = {
        ...generatedSchedule,
        schedule: generatedSchedule.schedule.map((day: any) => {
          return {
            ...day,
            lessons: (day.lessons || []).map((lesson: any) => {
              const pairKey = `${lesson.subjectId}_${lesson.teacherId}`;
              const currentIndex = pairCounters[pairKey] || 0;

              // Find and sort materials for this teacher & subject pair
              const matches = materialsList.filter((m: any) => {
                const isSubjectMatch = m.subjectId === lesson.subjectId || m.subjectIds?.includes(lesson.subjectId);
                const isTeacherMatch = m.teacherId === lesson.teacherId;
                return isSubjectMatch && isTeacherMatch;
              });

              // Sort by order_index to present them in exact curriculum flow
              matches.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

              // Filter out already completed materials so they proceed in sequence (e.g. 4, 5, 6)
              const remainingMatches = matches.filter((m: any) => !completedIds.includes(m.id));
              const activeMatches = remainingMatches.length > 0 ? remainingMatches : matches;

              let matchedMaterial = null;
              if (activeMatches.length > 0) {
                // Assign a material cycling through them sequentially
                matchedMaterial = activeMatches[currentIndex % activeMatches.length];
                pairCounters[pairKey] = currentIndex + 1;
              }

              return {
                ...lesson,
                id: `${day.dayIndex}_${lesson.subjectId}_${currentIndex}`,
                materialId: matchedMaterial ? matchedMaterial.id : '',
                lectureTitle: matchedMaterial ? matchedMaterial.title : lesson.lectureTitle,
                materialUrl: matchedMaterial ? matchedMaterial.url : '',
                materialType: matchedMaterial ? matchedMaterial.type : '',
                completed: false
              };
            })
          };
        })
      };

      return processedSchedule;
    } catch (err) {
      console.error("Error enriching schedule with DB materials:", err);
      return generatedSchedule;
    }
  };

  const handleCreateSchedule = async () => {
    const selectedItems = subjectItems.filter(s => s.selected);
    if (selectedItems.length === 0) {
      setErrorText("يرجى اختيار مادة واحدة على الأقل لصنع الجدول");
      return;
    }

    setErrorText('');
    setGenerating(true);

    try {
      // Build a clear descriptive summary of choices
      const subjectsListText = selectedItems.map(item => {
        const tObj = teachers.find(t => t.id === item.selectedTeacherId);
        const tName = tObj ? tObj.name : 'أي مدرس متاح على المنصة';
        return `- مادة ${item.name} (معرف: ${item.id}): دراستها ${item.sessionsPerWeek} مرات بالأسبوع مع الأستاذ ${tName} (معرف: ${item.selectedTeacherId})`;
      }).join('\n');

      const ai = getAIClient();

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "اسم الجدول الدراسي بالكامل" },
          schedule: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                dayIndex: { type: Type.INTEGER, description: "رقم اليوم التسلسلي من 0 (اليوم الأول للدراسة/يوم الصنع) إلى 6 (اليوم السابع)" },
                dayName: { type: Type.STRING, description: "اسم يوم الأسبوع بالعربية المقابل لليوم التسلسلي (مثلاً إذا كان يوم الصنع هو السبت، فاليوم 0 هو السبت، و1 هو الأحد، وهكذا)" },
                lessons: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      subjectId: { type: Type.STRING, description: "معرف المادة الفعلي من المدخلات" },
                      subjectName: { type: Type.STRING, description: "اسم المادة" },
                      teacherId: { type: Type.STRING, description: "معرف الأستاذ الفعلي من المدخلات" },
                      teacherName: { type: Type.STRING, description: "اسم الأستاذ" },
                      lectureTitle: { type: Type.STRING, description: "اسم المحاضرة أو الدرس المقترح من المنهج العراقي" },
                      time: { type: Type.STRING, description: "تحديد وقت افتراضي مثلاً (ظهرًا، عصرًا أو الساعة 5 مساءً)" }
                    },
                    required: ["subjectId", "subjectName", "teacherId", "teacherName", "lectureTitle", "time"]
                  }
                }
              },
              required: ["dayIndex", "dayName", "lessons"]
            }
          }
        },
        required: ["title", "schedule"]
      };

      const currentDayIndex = new Date().getDay();
      const daysAr = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const currentDayName = daysAr[currentDayIndex];

      const prompt = `أنت خبير تربوي عراقي متخصص في توجيه طلاب السادس الإعدادي والثالث المتوسط.
المطلوب منك توليد جدول دراسي أسبوعي كامل ومتزن ومنظم يتوزع على 7 أيام دراسية كاملة بناءً على المواد الدراسية وعدد الحصص الأسبوعية المفضلة والمدرسين المحددين:
${subjectsListText}

تنبيه هام جداً لدقة الجدول:
يوم صنع الجدول (اليوم الأول الممثل بالرقم 0) هو: ${currentDayName}.
يجب عليك توزيع الحصص الأسبوعية المطلوبة بالكامل وبشكل مريح على الأيام السبعة المتتالية بدءاً من اليوم الأول 0 (${currentDayName}) فصاعداً، بطريقة متسلسلة ومتوازنة بحيث يستفيد الطالب من الجدول كاملاً كل أسبوع دون ترك أي يوم فارغ، فالرقم 0 هو اليوم الأول للدورة الدراسية الحالية، و1 هو اليوم الثاني، وهكذا حتى اليوم السابع 6.

ملاحظات الطالب وتوجيهاته الإضافية لترتيب الجدول:
"${studentNotes || 'لا توجد ملاحظات خاصة'}"

يجب أن تعود النتائج بصيغة JSON متوافقة تماماً مع الـ Schema الممنوحة لك.
تأكد من استخدام معرفات المواد (subjectId) ومعرفات المدرسين (teacherId) تماماً كما تم مدها بالمدخلات ليكون الجدول قابلاً للربط التلقائي.`;

      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });

      const jsonText = result.text;
      const rawSchedule = JSON.parse(jsonText);

      // Match actual platform materials and stamp the creation date
      const enriched = await enrichScheduleWithRealMaterials(rawSchedule);
      const finalSchedule = {
        ...enriched,
        createdAt: new Date().toISOString()
      };

      // Save to Firebase under the user's document
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        custom_schedule: JSON.stringify(finalSchedule)
      });

      // Save to localStorage for robust immediate access
      localStorage.setItem(`custom_schedule_${user.id}`, JSON.stringify(finalSchedule));

      // Callback
      onScheduleCreated(finalSchedule);
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      if (shouldSwitchKey(err)) {
        setErrorText("نفدت حصة مفتاح الذكاء الاصطناعي الحالي، تم تبديل المفتاح تلقائياً. يرجى المحاولة مرة أخرى.");
      } else {
        setErrorText("حدث خطأ أثناء الذكاء الاصطناعي في صنع الجدول. يرجى التأكد من استقرار الإنترنت والمحاولة مرة أخرى.");
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#121212] w-full max-w-2xl rounded-2xl border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b-4 border-black dark:border-white flex items-center justify-between bg-yellow-100 dark:bg-yellow-950/20 text-black dark:text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl flex items-center justify-center text-black dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Calendar size={24} strokeWidth={2.5} />
            </div>
            <div className="text-right">
              <h3 className="font-black text-xl text-black dark:text-white">صانع الجدول الدراسي الذكي</h3>
              <p className="text-xs font-bold text-black/60 dark:text-white/60">وزّع حصصك على الأيام واقترن بمدرسيك المفضلين بالذكاء الاصطناعي</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl text-black dark:text-white hover:bg-rose-100 dark:hover:bg-rose-950 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-right" dir="rtl">
          {errorText && (
            <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 p-4 rounded-xl border-2 border-rose-500 font-bold flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-sm">{errorText}</p>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-black dark:border-white border-t-yellow-500" />
              <p className="text-slate-600 dark:text-slate-400 font-bold">جاري تحميل المواد والمدرسين من المنصة...</p>
            </div>
          ) : generating ? (
            <div className="py-12 flex flex-col items-center justify-center gap-5">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-black dark:border-white border-t-blue-600" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-500 font-black" size={24} />
              </div>
              <div className="space-y-2 text-center">
                <h4 className="font-black text-xl text-black dark:text-white">جاري توليد جدولك بذكاء...</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">يقوم الذكاء الاصطناعي الآن بتفصيل المهام وربطها بالمحاضرات المتوفرة</p>
              </div>
            </div>
          ) : (
            <>
              {/* Step Title */}
              <div className="bg-slate-50 dark:bg-slate-900 border-2 border-black dark:border-white p-4 rounded-xl flex items-center gap-3">
                <Bookmark size={20} className="text-yellow-600" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  حدد عدد مرات تكرار كل مادة في الأسبوع، واقترن بأساتذتك المفضلين لتلقي محاضراتهم في الأيام المناسبة.
                </p>
              </div>

              {/* Subjects Table/List */}
              <div className="space-y-3">
                <h4 className="font-black text-lg text-black dark:text-white flex items-center gap-2">
                  <BookOpen size={20} />
                  اختر المواد المشمولة بالجدول:
                </h4>

                <div className="space-y-4">
                  {subjectItems.map((item) => {
                    const subjectTeachers = teachers.filter(t => t.subjectId === item.id);
                    return (
                      <div 
                        key={item.id} 
                        className={`p-4 rounded-xl border-2 border-black dark:border-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          item.selected 
                            ? 'bg-slate-50 dark:bg-slate-950/50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' 
                            : 'bg-white dark:bg-black opacity-60'
                        }`}
                      >
                        {/* Selector checkbox & Name */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleSubject(item.id)}
                            className={`w-6 h-6 rounded-lg border-2 border-black dark:border-white flex items-center justify-center transition-colors ${
                              item.selected ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-black'
                            }`}
                          >
                            {item.selected && <Check size={14} strokeWidth={3} />}
                          </button>
                          <span className="font-black text-lg text-black dark:text-white">{item.name}</span>
                        </div>

                        {/* Controls (Enabled only when subject is selected) */}
                        {item.selected && (
                          <div className="flex flex-wrap items-center gap-4">
                            {/* Days number input */}
                            <div className="flex items-center gap-2 border-2 border-black dark:border-white rounded-lg px-2 py-1 bg-white dark:bg-black">
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تكرار حصة:</span>
                              <input 
                                type="number" 
                                min="1" 
                                max="7"
                                value={item.sessionsPerWeek}
                                onChange={(e) => handleSessionsChange(item.id, parseInt(e.target.value) || 1)}
                                className="w-12 bg-transparent outline-none font-black text-center text-black dark:text-white"
                              />
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">أسبوعياً</span>
                            </div>

                            {/* Teacher select dropdown */}
                            <div className="relative flex items-center gap-2 border-2 border-black dark:border-white rounded-lg px-2 py-1 bg-white dark:bg-black">
                              <User size={14} className="text-slate-400" />
                              <select
                                value={item.selectedTeacherId}
                                onChange={(e) => handleTeacherChange(item.id, e.target.value)}
                                className="bg-transparent outline-none font-bold text-xs text-black dark:text-white pr-2 cursor-pointer"
                              >
                                <option value="any" className="text-black bg-white">أي مدرس بالمنصة</option>
                                {subjectTeachers.map(teacher => (
                                  <option key={teacher.id} value={teacher.id} className="text-black bg-white">
                                    الأستاذ {teacher.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes input */}
              <div className="space-y-2 pt-2">
                <label className="font-black text-lg text-black dark:text-white flex items-center gap-2">
                  <span>📝 ملاحظات وتوجيهات الطالب (اختياري)</span>
                </label>
                <textarea
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  placeholder="مثال: يرجى وضع الرياضيات والفيزياء في المساء فقط لأني أكون أكثر تركيزًا، أو أريد تخصيص يوم الجمعة لمراجعة شاملة للامتحانات..."
                  maxLength={400}
                  className="w-full h-24 bg-white dark:bg-black border-2 border-black dark:border-white rounded-xl p-3 text-sm font-bold text-black dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:ring-4 focus:ring-yellow-400/20 focus:border-yellow-400 transition-all text-right"
                  dir="rtl"
                />
              </div>

              {/* Generate Trigger */}
              <div className="pt-4 border-t-2 border-dashed border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={handleCreateSchedule}
                  disabled={subjectItems.filter(s => s.selected).length === 0}
                  className="w-full sm:w-auto px-8 py-4 bg-yellow-400 text-black border-4 border-black dark:border-white hover:bg-yellow-500 transition-all font-black rounded-xl text-lg flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 active:translate-y-0 active:shadow-none"
                >
                  <Sparkles size={20} className="fill-current" />
                  اصنع جدولي بالذكاء الاصطناعي ✨
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
