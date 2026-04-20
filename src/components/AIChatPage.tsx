import React, { useState, useRef, useEffect, memo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, onSnapshot } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { 
  Mic, MicOff, Sparkles, Send, Loader2, 
  MessageSquare, Plus, Trash2, Bot, User, ArrowRight, History, X,
  Paperclip, FileText, Image as ImageIcon, Calendar, BookOpen, Link as LinkIcon, Youtube, Type
} from 'lucide-react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ScheduleMakerModal from './ScheduleMakerModal';
import SourcesModal, { SavedSource } from './SourcesModal';

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
  userId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt?: string;
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
      className={`flex gap-3 sm:gap-4 w-full max-w-4xl mx-auto ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
        m.role === 'model' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
      }`}>
        {m.role === 'model' ? <Bot size={18} /> : <User size={18} />}
      </div>
      <div className={`max-w-[85%] min-w-0 p-4 sm:p-5 rounded-3xl text-sm leading-relaxed shadow-sm ${
        m.role === 'model' 
          ? 'bg-white text-slate-800 rounded-tr-none border border-slate-100' 
          : 'bg-blue-600 text-white rounded-tl-none'
      }`}>
        <div className={`prose prose-sm max-w-none min-w-0 overflow-x-auto ${m.role === 'model' ? 'prose-slate' : 'prose-invert'}`}>
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
  const [activeSources, setActiveSources] = useState<SavedSource[]>([]);
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [attachments, setAttachments] = useState<{name: string, mimeType: string, base64: string}[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const removeActiveSource = (id: string) => {
    setActiveSources(prev => prev.filter(s => s.id !== id));
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (initialPrompt && currentChatId && !loading) {
      const timer = setTimeout(() => {
        handleSend(initialPrompt);
        if (onClearInitialPrompt) onClearInitialPrompt();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [initialPrompt, currentChatId]);

  useEffect(() => {
    if (!userId) return;
    
    if (userId === 'guest_user' || userId.includes('guest')) {
      const localChats = localStorage.getItem(`ai_chats_${userId}`);
      const parsedChats = localChats ? JSON.parse(localChats) : [];
      setChats(parsedChats);
      if (parsedChats.length > 0 && !currentChatId) {
        setCurrentChatId(parsedChats[0].id);
        setMessages(parsedChats[0].messages || []);
      } else if (parsedChats.length === 0) {
        startNewChat();
      }
      return;
    }

    // Subscribe to chats
    const q = query(
      collection(db, 'ai_chats'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(docs);
      
      if (docs.length > 0 && !currentChatId) {
        setCurrentChatId(docs[0].id);
        setMessages(docs[0].messages || []);
      } else if (docs.length === 0) {
        startNewChat();
      }
    });

    return () => unsubscribe();
  }, [userId]);

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
      if (userId === 'guest_user' || userId.includes('guest')) {
        const parsedChats = chats.filter(c => c.id !== id);
        setChats(parsedChats);
        localStorage.setItem(`ai_chats_${userId}`, JSON.stringify(parsedChats));
        if (currentChatId === id) {
          startNewChat();
        }
        return;
      }

      await deleteDoc(doc(db, 'ai_chats', id));
      if (currentChatId === id) {
        startNewChat();
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const saveChatToDb = async (newMessages: Message[], title?: string) => {
    try {
      if (userId === 'guest_user' || userId.includes('guest')) {
        let updatedChats = [...chats];
        if (currentChatId) {
          updatedChats = updatedChats.map(c => 
            c.id === currentChatId ? { ...c, messages: newMessages, updatedAt: new Date().toISOString() } : c
          );
          setChats(updatedChats);
        } else {
          const chatTitle = title || newMessages.find(m => m.role === 'user')?.text.substring(0, 30) + '...' || 'محادثة جديدة';
          const newChat: Chat = {
            id: Date.now().toString(),
            userId: userId,
            title: chatTitle,
            messages: newMessages,
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };
          updatedChats = [newChat, ...chats];
          setCurrentChatId(newChat.id);
          setChats(updatedChats);
        }
        localStorage.setItem(`ai_chats_${userId}`, JSON.stringify(updatedChats));
        return;
      }

      if (currentChatId) {
        await updateDoc(doc(db, 'ai_chats', currentChatId), { 
          messages: newMessages,
          title: title || chats.find(c => c.id === currentChatId)?.title || 'محادثة',
          updatedAt: new Date().toISOString()
        });
      } else {
        const chatTitle = title || newMessages.find(m => m.role === 'user')?.text.substring(0, 30) + '...' || 'محادثة جديدة';
        const docRef = await addDoc(collection(db, 'ai_chats'), {
          userId: userId,
          title: chatTitle,
          messages: newMessages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        setCurrentChatId(docRef.id);
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

  const getSystemInstruction = () => {
    return `أنت مدرس أكاديمي عراقي ذكي وودود. 
    الطالب الحالي في الصف: ${grade}. اسم الطالب: ${userName}.
    مهامك:
    1. ترتيب جداول دراسية (استخدم Markdown Table حصراً).
    2. تلخيص المواضيع بأسلوب عراقي مبسط.
    3. الإجابة على الأسئلة العلمية.
    
    **قواعد الإجابة:**
    - إذا كانت رسالة الطالب سؤالاً عاماً بدون إرفاق مصادر، أجب بشكل حر من معلوماتك العامة.
    - إذا قام الطالب بإرفاق مصادر (سواء روابط ويب، يوتيوب، ملفات PDF، أو نص)، **فيجب عليك استخراج الإجابة أو الشرح حصراً من هذه المصادر المرفقة**.
    - استخدم ميزة البحث الخاصة بك (Google Search) لفتح الروابط وفهم محتواها إذا أرفق الطالب رابطاً.
    - إذا سأل الطالب سؤالاً عن المصادر ولم تكن المعلومة موجودة فيها، وضح له أنك لم تجدها في المصدر.
    
    استخدم لهجة عراقية بيضاء محببة عند الشرح (مثل "شوف عيني"، "السالفة وما بيها").`;
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if ((!textToSend.trim() && activeSources.length === 0) || loading) return;

    let dbText = textToSend;
    if (activeSources.length > 0) {
      const sourceNames = activeSources.map(s => s.title).join('، ');
      dbText = textToSend ? `${textToSend}\n\n[مصادر مرفقة: ${sourceNames}]` : `[مصادر مرفقة: ${sourceNames}]`;
    }

    const newMessages = [...messages, { role: 'user', text: dbText } as Message];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const userParts: any[] = [];
    let fullText = textToSend.trim() || 'اشرح لي هذه المصادر المرفقة.';
    
    activeSources.forEach(source => {
      if (source.type === 'pdf') {
        userParts.push({
          inlineData: {
            data: source.content,
            mimeType: source.mimeType || 'application/pdf'
          }
        });
      } else if (source.type === 'link' || source.type === 'youtube') {
        fullText += `\n\n[رابط مرفق: ${source.title}]\n${source.content}`;
      } else if (source.type === 'text') {
        fullText += `\n\n[نص مرفق: ${source.title}]\n${source.content}`;
      }
    });
    
    userParts.unshift({ text: fullText });

    setActiveSources([]);

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
              tools: [{ googleSearch: {} }]
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
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-50 flex flex-col relative" dir="rtl">
      {/* Header */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 shadow-sm z-30 w-full">
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
                    className={`p-1.5 rounded-md transition-all ${
                      currentChatId === chat.id ? 'text-blue-200 hover:bg-blue-700' : 'text-slate-400 hover:bg-red-50 hover:text-red-500'
                    }`}
                    title="حذف المحادثة"
                  >
                    <Trash2 size={16} />
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-6 bg-slate-50/50 z-10">
        {messages.map((m, i) => (
          <ChatMessage key={i} m={m} />
        ))}
        {loading && (
          <div className="flex gap-3 sm:gap-4 w-full max-w-4xl mx-auto">
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
      <div className="p-3 sm:p-6 bg-white border-t border-slate-200 z-10 w-full">
        <div className="max-w-4xl mx-auto w-full">
          {/* Active Sources Preview */}
          {activeSources.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 px-2">
              {activeSources.map((source) => (
                <div key={source.id} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs border border-blue-100">
                  {source.type === 'youtube' && <Youtube size={14} />}
                  {source.type === 'link' && <LinkIcon size={14} />}
                  {source.type === 'pdf' && <FileText size={14} />}
                  {source.type === 'text' && <Type size={14} />}
                  <span className="truncate max-w-[100px]">{source.title}</span>
                  <button type="button" onClick={() => removeActiveSource(source.id)} className="hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowScheduleModal(true)}
              title="صانع الجداول"
              className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shadow-sm flex-shrink-0 bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
            >
              <Calendar size={18} className="sm:w-6 sm:h-6" />
            </button>
            <button
              type="button"
              onClick={() => setShowSourcesModal(true)}
              disabled={selectedModel.includes('gemma') || isRecording}
              title={selectedModel.includes('gemma') ? "المصادر غير مدعومة في نموذج Gemma" : "المصادر المحفوظة"}
              className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shadow-sm flex-shrink-0 ${
                selectedModel.includes('gemma')
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200'
              }`}
            >
              <BookOpen size={18} className="sm:w-6 sm:h-6" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? `جاري التسجيل... ${recordingTime} ثانية` : "اكتب سؤالك هنا..."}
              disabled={isRecording}
              className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm disabled:bg-red-50 disabled:border-red-100 disabled:text-red-500 shadow-inner"
            />
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={selectedModel.includes('gemma')}
              title={selectedModel.includes('gemma') ? "ميزة الصوت غير مدعومة في نموذج Gemma" : "تسجيل صوتي"}
              className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shadow-sm flex-shrink-0 ${
                selectedModel.includes('gemma')
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                  : isRecording 
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
              }`}
            >
              {isRecording ? <MicOff size={18} className="sm:w-6 sm:h-6" /> : <Mic size={18} className="sm:w-6 sm:h-6" />}
            </button>
            <button
              type="submit"
              disabled={(!input.trim() && activeSources.length === 0) || loading || isRecording}
              className="w-10 h-10 sm:w-14 sm:h-14 bg-blue-600 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none flex-shrink-0"
            >
              <Send size={18} className="rotate-180 sm:w-6 sm:h-6" />
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

      {/* Sources Modal */}
      {showSourcesModal && (
        <SourcesModal 
          userId={userId} 
          onClose={() => setShowSourcesModal(false)}
          onAttachSource={(source) => {
            if (!activeSources.find(s => s.id === source.id)) {
              setActiveSources([...activeSources, source]);
            }
          }}
        />
      )}
    </div>
  );
}
