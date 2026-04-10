import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Mic,
  MicOff,
  Sparkles, 
  Send, 
  Loader2, 
  Calendar, 
  FileText, 
  MessageSquare,
  X,
  Bot,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  grade: string;
  userName: string;
  onClose: () => void;
  onPinSchedule?: (schedule: string) => void;
  initialPrompt?: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function AITutor({ grade, userName, onClose, onPinSchedule, initialPrompt }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'model', 
      text: `أهلاً بك يا ${userName}! أنا مساعدك الذكي في عراقي أكاديمي. كيف يمكنني مساعدتك اليوم؟ يمكنني ترتيب جدول دراسي لك، تلخيص موضوع معين، أو الإجابة على أسئلتك.` 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [needsKey, setNeedsKey] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = (reader.result as string).split(',')[1];
          handleSendAudio(base64Audio);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("يرجى السماح بالوصول للميكروفون لاستخدام ميزة التسميع.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSendAudio = async (base64Audio: string) => {
    setLoading(true);
    const newMessages = [...messages, { role: 'user', text: "🎤 [رسالة صوتية - تسميع]" } as Message];
    setMessages(newMessages);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [
          ...messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          })),
          {
            role: 'user',
            parts: [
              { text: "هذا تسجيل صوتي لي وأنا أشرح موضوعاً أو أسمّع مادة. يرجى الاستماع وتقييم شرحي، وتوضيح النقاط الصحيحة، وتصحيح الأخطاء، وذكر المعلومات الناقصة، ثم اسألني سؤالاً للتأكد من فهمي." },
              { inlineData: { mimeType: "audio/webm", data: base64Audio } }
            ]
          }
        ],
        config: {
          systemInstruction: getSystemInstruction(),
        }
      });

      const aiText = response.text || "عذراً، لم أتمكن من سماعك بوضوح. يرجى المحاولة مرة أخرى.";
      setMessages([...newMessages, { role: 'model', text: aiText }]);
    } catch (error) {
      console.error("AI Audio Error:", error);
      setMessages([...newMessages, { role: 'model', text: "عذراً، واجهت مشكلة في معالجة الصوت. يرجى المحاولة مرة أخرى." }]);
    } finally {
      setLoading(false);
    }
  };

  const getSystemInstruction = () => {
    return `أنت مدرس أكاديمي عراقي ذكي وودود في منصة "عراقي أكاديمي". 
    تساعد الطلاب في المنهج العراقي. 
    الطالب الحالي في الصف: ${grade}. 
    اسم الطالب: ${userName}.
    مهامك الأساسية:
    1. ترتيب جداول دراسية ذكية بناءً على "التحاضير" والواجبات التي يذكرها الطالب. **مهم جداً: عندما تقوم بإنشاء جدول دراسي، يجب أن تقوم بتنسيقه باستخدام Markdown Table (جدول ماركداون) حصراً لكي يظهر كجدول حقيقي في الواجهة.**
    2. تلخيص المواضيع المعقدة بأسلوب "سالفة" عراقية مبسطة.
    3. الإجابة على الأسئلة العلمية بدقة وشرحها بأسلوب ممتع.
    4. ميزة "سمّع لي" (Reverse Teaching): عندما يرسل الطالب تسجيلاً صوتياً أو نصاً يشرح فيه موضوعاً، استمع له بعناية. حدد ما قاله بشكل صحيح، صحح الأخطاء بلطف، اذكر المعلومات الناقصة، ثم اطرح سؤالاً ذكياً للتأكد منMastery.
    استخدم لهجة عراقية بيضاء محببة عند الشرح، والتزم باللغة العربية الفصحى في المعلومات العلمية.`;
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || loading) return;

    const newMessages = [...messages, { role: 'user', text: textToSend } as Message];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: newMessages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: getSystemInstruction(),
        }
      });

      const aiText = response.text || "عذراً، حدث خطأ في معالجة الطلب.";
      setMessages([...newMessages, { role: 'model', text: aiText }]);
    } catch (error: any) {
      console.error("AI Error:", error);
      if (error?.message?.includes("NOT_FOUND") || error?.message?.includes("Requested entity was not found")) {
        setNeedsKey(true);
      }
      setMessages([...newMessages, { role: 'model', text: "عذراً، واجهت مشكلة في الاتصال. يرجى المحاولة مرة أخرى." }]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { id: 'schedule', icon: <Calendar size={18} />, text: 'ترتيب جدول تحاضير', prompt: 'ساعدني أرتب جدول دراسي، هاي التحاضير اللي عندي لباجر وللأسبوع: ' },
    { id: 'recite', icon: <Mic size={18} />, text: 'سمّع لي (شرح صوتي)', prompt: 'أريد أن أشرح لك موضوعاً لتقييم فهمي له. سأبدأ بالتسجيل الصوتي الآن...' },
    { id: 'summary', icon: <FileText size={18} />, text: 'تلخيص موضوع', prompt: 'أريد تلخيصاً مبسطاً لأحد المواضيع الصعبة في منهجي.' },
    { id: 'q', icon: <MessageSquare size={18} />, text: 'سؤال سريع', prompt: 'عندي سؤال علمي في المنهج، هل يمكنك مساعدتي؟' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="font-bold text-lg">المساعد الذكي</h2>
              <p className="text-xs opacity-80">مدعوم بالذكاء الاصطناعي</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {needsKey && (
              <button 
                onClick={async () => {
                  await (window as any).aistudio.openSelectKey();
                  setNeedsKey(false);
                }}
                className="text-[10px] bg-yellow-400 text-slate-900 px-2 py-1 rounded-lg font-bold hover:bg-yellow-300 transition-colors"
              >
                تحديث المفتاح
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50"
        >
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                m.role === 'model' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {m.role === 'model' ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm relative group ${
                m.role === 'model' 
                  ? 'bg-white text-slate-800 rounded-tr-none' 
                  : 'bg-blue-600 text-white rounded-tl-none'
              }`}>
                <div className="prose prose-sm max-w-none prose-slate">
                  <Markdown remarkPlugins={[remarkGfm]}>{m.text}</Markdown>
                </div>
                
                {m.role === 'model' && m.text.includes('|') && onPinSchedule && (
                  <button
                    onClick={() => onPinSchedule(m.text)}
                    className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                  >
                    <Calendar size={14} />
                    تثبيت هذا الجدول في الواجهة الرئيسية
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tr-none shadow-sm">
                <Loader2 className="animate-spin text-blue-600" size={20} />
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {messages.length === 1 && (
          <div className="px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar border-t border-slate-100 bg-white">
            {quickActions.map(action => (
              <button
                key={action.id}
                onClick={() => handleSend(action.prompt)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-xl text-sm font-medium transition-all border border-slate-100 whitespace-nowrap"
              >
                {action.icon}
                {action.text}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-6 bg-white border-t border-slate-100">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="relative flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? `جاري التسجيل... ${recordingTime} ثانية` : "اكتب سؤالك هنا..."}
              disabled={isRecording}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 pr-5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm disabled:bg-red-50 disabled:border-red-100 disabled:text-red-500"
            />
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-100' 
                  : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
              type="submit"
              disabled={!input.trim() || loading || isRecording}
              className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none"
            >
              <Send size={20} className="rotate-180" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
