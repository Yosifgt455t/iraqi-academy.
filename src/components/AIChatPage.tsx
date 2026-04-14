import React, { useState, useRef, useEffect, memo } from 'react';
import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";
import { 
  Mic, MicOff, Sparkles, Send, Loader2, 
  MessageSquare, Plus, Trash2, Bot, User, ArrowRight, History, X,
  Paperclip, FileText, Image as ImageIcon, Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ScheduleMakerModal from './ScheduleMakerModal';

// Global state to track the current API key index across the session
let currentApiKeyIndex = 0;

const getAIClient = () => {
  const keysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
  const keys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
  
  if (keys.length === 0) return new GoogleGenAI({ apiKey: '' });
  
  if (currentApiKeyIndex >= keys.length) {
    currentApiKeyIndex = 0;
  }
  
  return new GoogleGenAI({ apiKey: keys[currentApiKeyIndex] });
};

const shouldSwitchKey = (error: any) => {
  const errMsg = error?.message?.toLowerCase() || '';
  const status = error?.status;
  if (status === 429 || errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('too many requests') || errMsg.includes('exhausted')) {
    console.warn('API limit reached. Switching to the next API key...');
    currentApiKeyIndex++;
    return true;
  }
  return false;
};

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
}

interface Props {
  userId: string;
  userName: string;
  grade: string;
  onBack: () => void;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

const ChatMessage = memo(({ m }: { m: Message }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 sm:gap-4 max-w-4xl mx-auto ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
        m.role === 'model' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
      }`}>
        {m.role === 'model' ? <Bot size={18} /> : <User size={18} />}
      </div>
      <div className={`max-w-[85%] p-4 sm:p-5 rounded-3xl text-sm leading-relaxed shadow-sm ${
        m.role === 'model' 
          ? 'bg-white text-slate-800 rounded-tr-none border border-slate-100' 
          : 'bg-blue-600 text-white rounded-tl-none'
      }`}>
        <div className={`prose prose-sm max-w-none overflow-x-auto ${m.role === 'model' ? 'prose-slate' : 'prose-invert'}`}>
          <Markdown remarkPlugins={[remarkGfm]}>{m.text}</Markdown>
        </div>
      </div>
    </motion.div>
  );
});

export default function AIChatPage({ userId, userName, grade, onBack, initialPrompt, onClearInitialPrompt }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedModel, setSelectedModel] = useState('gemini-flash-latest');
  const [showHistory, setShowHistory] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [attachments, setAttachments] = useState<{name: string, mimeType: string, base64: string}[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchChats();
  }, [userId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (initialPrompt && currentChatId && !loading) {
      // Small delay to ensure state is fully settled before sending
      const timer = setTimeout(() => {
        handleSend(initialPrompt);
        if (onClearInitialPrompt) onClearInitialPrompt();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [initialPrompt, currentChatId]);

  const fetchChats = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_chats')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);
      
      if (data && data.length > 0 && !currentChatId) {
        setCurrentChatId(data[0].id);
        setMessages(data[0].messages || []);
      } else if (data && data.length === 0) {
        startNewChat();
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
    }
  };

  const startNewChat = () => {
    setCurrentChatId(null);
    setShowHistory(false);
    setMessages([{ 
      role: 'model', 
      text: `أهلاً بك يا ${userName}! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟` 
    }]);
  };

  const selectChat = (chat: Chat) => {
    setCurrentChatId(chat.id);
    setMessages(chat.messages || []);
    setShowHistory(false);
  };

  const deleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await supabase.from('ai_chats').delete().eq('id', id);
      setChats(chats.filter(c => c.id !== id));
      if (currentChatId === id) {
        startNewChat();
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const saveChatToDb = async (newMessages: Message[], title?: string) => {
    try {
      if (currentChatId) {
        await supabase
          .from('ai_chats')
          .update({ 
            messages: newMessages,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentChatId);
          
        setChats(chats.map(c => c.id === currentChatId ? { ...c, messages: newMessages } : c));
      } else {
        const chatTitle = title || newMessages.find(m => m.role === 'user')?.text.substring(0, 30) + '...' || 'محادثة جديدة';
        const { data, error } = await supabase
          .from('ai_chats')
          .insert({
            user_id: userId,
            title: chatTitle,
            messages: newMessages
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setCurrentChatId(data.id);
          setChats([data, ...chats]);
        }
      }
    } catch (err) {
      console.error('Error saving chat:', err);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Limit file size to 4MB to prevent memory issues and lag
    const validFiles = files.filter(file => {
      if (file.size > 4 * 1024 * 1024) {
        alert(`حجم الملف ${file.name} كبير جداً! الحد الأقصى هو 4 ميجابايت لتجنب بطء التطبيق.`);
        return false;
      }
      return true;
    });

    if (!validFiles.length) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const newAttachments = await Promise.all(validFiles.map(async (file) => {
      return new Promise<{name: string, mimeType: string, base64: string}>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({ name: file.name, mimeType: file.type, base64 });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getSystemInstruction = () => {
    return `أنت مدرس أكاديمي عراقي ذكي وودود. 
    الطالب الحالي في الصف: ${grade}. اسم الطالب: ${userName}.
    مهامك:
    1. ترتيب جداول دراسية (استخدم Markdown Table حصراً).
    2. تلخيص المواضيع بأسلوب عراقي مبسط.
    3. الإجابة على الأسئلة العلمية.
    
    **قاعدة هامة جداً (RAG Mode و YouTube):**
    - إذا قام الطالب بإرفاق ملفات (صور أو مستندات PDF)، **يجب عليك استخراج الإجابة أو الشرح حصراً من هذه المرفقات**. 
    - إذا أرسل الطالب رابط يوتيوب (YouTube Link)، حاول استخراج المعلومات من الرابط وتلخيص المحاضرة أو شرحها بأفضل شكل ممكن.
    لا تستخدم معلوماتك العامة للإجابة إذا كان السؤال يتعلق بالمرفق. 
    إذا سأل الطالب سؤالاً خارج نطاق الملفات المرفقة، اعتذر بلطف وأخبره أنك مقيد بالملفات المرفقة في هذه المحادثة.
    
    استخدم لهجة عراقية بيضاء محببة عند الشرح، والتزم باللغة العربية الفصحى في المعلومات العلمية.`;
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if ((!textToSend.trim() && attachments.length === 0) || loading) return;

    let dbText = textToSend;
    if (attachments.length > 0) {
      const attachmentNames = attachments.map(a => a.name).join('، ');
      dbText = textToSend ? `${textToSend}\n\n[مرفقات: ${attachmentNames}]` : `[مرفقات: ${attachmentNames}]`;
    }

    const newMessages = [...messages, { role: 'user', text: dbText } as Message];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const userParts: any[] = [];
    if (textToSend.trim()) userParts.push({ text: textToSend });
    else if (attachments.length > 0) userParts.push({ text: "اشرح لي هذه المرفقات." });

    attachments.forEach(att => {
      userParts.push({
        inlineData: {
          data: att.base64,
          mimeType: att.mimeType
        }
      });
    });

    setAttachments([]);

    try {
      let response;
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          const ai = getAIClient();
          response = await ai.models.generateContent({
            model: selectedModel,
            contents: [
              ...messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
              })),
              {
                role: 'user',
                parts: userParts
              }
            ],
            config: {
              systemInstruction: getSystemInstruction(),
            }
          });
          break;
        } catch (err) {
          if (shouldSwitchKey(err)) {
            retries++;
            if (retries >= maxRetries) throw err;
            continue;
          }
          throw err;
        }
      }

      const aiText = response?.text || "عذراً، حدث خطأ في معالجة الطلب.";
      const finalMessages = [...newMessages, { role: 'model', text: aiText } as Message];
      setMessages(finalMessages);
      await saveChatToDb(finalMessages, textToSend);
    } catch (error) {
      console.error("AI Error:", error);
      const finalMessages = [...newMessages, { role: 'model', text: "عذراً، واجهت مشكلة في الاتصال." } as Message];
      setMessages(finalMessages);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
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
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      console.error("Microphone error:", err);
      alert("يرجى السماح بالوصول للميكروفون.");
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
    const newMessages = [...messages, { role: 'user', text: "🎤 [رسالة صوتية]" } as Message];
    setMessages(newMessages);

    try {
      let response;
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          const ai = getAIClient();
          response = await ai.models.generateContent({
            model: "gemini-flash-latest", // Force Gemini for audio
            contents: [
              ...messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
              })),
              {
                role: 'user',
                parts: [
                  { text: "هذا تسجيل صوتي لي. يرجى الاستماع وتقييم شرحي أو الإجابة على سؤالي." },
                  { inlineData: { mimeType: "audio/webm", data: base64Audio } }
                ]
              }
            ],
            config: { systemInstruction: getSystemInstruction() }
          });
          break;
        } catch (err) {
          if (shouldSwitchKey(err)) {
            retries++;
            if (retries >= maxRetries) throw err;
            continue;
          }
          throw err;
        }
      }

      const aiText = response?.text || "عذراً، لم أتمكن من سماعك بوضوح.";
      const finalMessages = [...newMessages, { role: 'model', text: aiText } as Message];
      setMessages(finalMessages);
      await saveChatToDb(finalMessages, "رسالة صوتية");
    } catch (error) {
      console.error("AI Audio Error:", error);
      setMessages([...newMessages, { role: 'model', text: "عذراً، واجهت مشكلة في معالجة الصوت." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSubmit = (prompt: string) => {
    setShowScheduleModal(false);
    handleSend(prompt);
  };

  return (
    <div className="h-[100dvh] bg-slate-50 flex flex-col relative" dir="rtl">
      {/* Header */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 shadow-sm z-30">
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ArrowRight size={20} />
          </button>
          
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
              showHistory ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            {showHistory ? <X size={20} /> : <History size={20} />}
            <span className="hidden sm:block text-sm font-medium">السجل</span>
          </button>

          <div className="hidden sm:flex w-8 h-8 bg-blue-50 rounded-xl items-center justify-center text-blue-600">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">المساعد الذكي</h2>
          </div>
        </div>
        
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="text-xs sm:text-sm bg-slate-50 text-slate-700 border border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 outline-none cursor-pointer hover:bg-slate-100 transition-colors max-w-[130px] sm:max-w-none truncate"
        >
          <option value="gemini-flash-latest">Gemini (سريع)</option>
          <option value="gemma-4-31b-it">Gemma 4 31B</option>
        </select>
      </div>

      {/* History Dropdown Overlay */}
      {showHistory && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/20 z-20" 
            onClick={() => setShowHistory(false)} 
          />
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-16 right-0 w-full sm:w-80 bg-white border-b sm:border-l sm:border-b-0 border-slate-200 shadow-xl z-30 max-h-[calc(100dvh-4rem)] flex flex-col rounded-b-2xl sm:rounded-none"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-700">سجل المحادثات</span>
              <button 
                onClick={startNewChat}
                className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2 text-sm"
              >
                <Plus size={16} />
                محادثة جديدة
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chats.map(chat => (
                <div 
                  key={chat.id}
                  onClick={() => selectChat(chat)}
                  className={`p-3 rounded-xl cursor-pointer flex items-center justify-between group transition-all ${
                    currentChatId === chat.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare size={16} className={currentChatId === chat.id ? 'text-blue-200' : 'text-slate-400'} />
                    <span className="text-sm font-medium truncate">{chat.title}</span>
                  </div>
                  <button 
                    onClick={(e) => deleteChat(e, chat.id)}
                    className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all ${
                      currentChatId === chat.id ? 'hover:bg-blue-700 text-blue-200' : 'hover:bg-red-50 text-red-500'
                    }`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {chats.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">
                  لا توجد محادثات سابقة
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50 z-10">
        {messages.map((m, i) => (
          <ChatMessage key={i} m={m} />
        ))}
        {loading && (
          <div className="flex gap-3 sm:gap-4 max-w-4xl mx-auto">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Bot size={18} />
            </div>
            <div className="bg-white p-4 sm:p-5 rounded-3xl rounded-tr-none shadow-sm border border-slate-100">
              <Loader2 className="animate-spin text-blue-600" size={20} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-6 bg-white border-t border-slate-200 z-10">
        <div className="max-w-4xl mx-auto">
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 px-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs border border-blue-100">
                  {att.mimeType.includes('image') ? <ImageIcon size={14} /> : <FileText size={14} />}
                  <span className="truncate max-w-[100px]">{att.name}</span>
                  <button type="button" onClick={() => removeAttachment(idx)} className="hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center gap-2 sm:gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
              accept="image/*,application/pdf"
            />
            <button
              type="button"
              onClick={() => setShowScheduleModal(true)}
              title="صانع الجداول"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm flex-shrink-0 bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
            >
              <Calendar size={20} className="sm:w-6 sm:h-6" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={selectedModel.includes('gemma') || isRecording}
              title={selectedModel.includes('gemma') ? "المرفقات غير مدعومة في نموذج Gemma" : "إرفاق ملف أو صورة"}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm flex-shrink-0 ${
                selectedModel.includes('gemma')
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
              }`}
            >
              <Paperclip size={20} className="sm:w-6 sm:h-6" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? `جاري التسجيل... ${recordingTime} ثانية` : "اكتب سؤالك هنا..."}
              disabled={isRecording}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm disabled:bg-red-50 disabled:border-red-100 disabled:text-red-500 shadow-inner"
            />
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={selectedModel.includes('gemma')}
              title={selectedModel.includes('gemma') ? "ميزة الصوت غير مدعومة في نموذج Gemma" : "تسجيل صوتي"}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm flex-shrink-0 ${
                selectedModel.includes('gemma')
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                  : isRecording 
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
              }`}
            >
              {isRecording ? <MicOff size={20} className="sm:w-6 sm:h-6" /> : <Mic size={20} className="sm:w-6 sm:h-6" />}
            </button>
            <button
              type="submit"
              disabled={!input.trim() || loading || isRecording}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none flex-shrink-0"
            >
              <Send size={20} className="rotate-180 sm:w-6 sm:h-6" />
            </button>
          </form>
        </div>
      </div>

      {/* Schedule Maker Modal */}
      {showScheduleModal && (
        <ScheduleMakerModal 
          onClose={() => setShowScheduleModal(false)} 
          onSubmit={handleScheduleSubmit} 
        />
      )}
    </div>
  );
}
