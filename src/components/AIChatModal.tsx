import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, BrainCircuit, Loader2, Mic, MicOff } from 'lucide-react';
import { getAIClient } from '../services/aiService';
import { LiveServerMessage, Modality } from "@google/genai";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  chapterAiContext: string;
  chapterName: string;
}

export default function AIChatModal({ isOpen, onClose, chapterAiContext, chapterName }: Props) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null); // To store the live session
  
  // Track audio queue and playback
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopLive();
    };
  }, []);

  const base64ToArrayBuffer = (base64: string) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const playAudioQueue = async () => {
    if (!audioContextRef.current || isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    const float32Data = audioQueueRef.current.shift()!;
    
    const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000); // 24kHz is typical output
    audioBuffer.getChannelData(0).set(float32Data);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      playAudioQueue();
    };
    source.start();
  };

  const startLive = async () => {
    try {
      setIsLiveActive(true);
      const ai = getAIClient();
      
      // Request mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
      mediaStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      // Deprecated but works universally without hosting an AudioWorklet script
      const scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
      scriptNodeRef.current = scriptNode;

      // Connect session
      sessionRef.current = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-dialog", // User requested this exact model
        callbacks: {
          onopen: () => {
            console.log("Live session opened.");
            // Send introductory system instruction message if needed, or it's in config
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              // Convert PCM 16-bit to Float32
              const arrayBuffer = base64ToArrayBuffer(base64Audio);
              const int16Array = new Int16Array(arrayBuffer);
              const float32Array = new Float32Array(int16Array.length);
              for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
              }
              audioQueueRef.current.push(float32Array);
              playAudioQueue();
            }
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
            }
            if (message.serverContent?.modelTurn) {
              // You can extract transcriptions here if available, or just rely on voice
            }
          },
          onerror: (err: any) => console.error("Live session error", err),
          onclose: () => {
            console.log("Live session closed.");
            stopLive();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `أنت معلم مختص وبارع. يُطلب منك الإجابة على أسئلة الطالب مباشرةً بناءً على "المادة العلمية المرفقة" فقط. يمنع منعاً باتاً الإجابة بمعلومات من خارج هذا المصدر. المادة العلمية: ${chapterAiContext || "لا توجد مادة مرفقة."}`
        }
      });

      // Capture audio
      scriptNode.onaudioprocess = (e) => {
        if (!sessionRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert Int16 to Base64
        const buffer = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < buffer.byteLength; i++) {
          binary += String.fromCharCode(buffer[i]);
        }
        const base64Data = window.btoa(binary);

        sessionRef.current.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(scriptNode);
      scriptNode.connect(audioContext.destination);

      setMessages([{ role: 'ai', text: 'تم تنشيط المحادثة المباشرة! تحدث الآن...' }]);

    } catch (err) {
      console.error(err);
      setIsLiveActive(false);
      stopLive();
      setMessages([{ role: 'ai', text: 'حدث خطأ أثناء تنشيط المحادثة المباشرة.' }]);
    }
  };

  const stopLive = () => {
    setIsLiveActive(false);
    if (scriptNodeRef.current) scriptNodeRef.current.disconnect();
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    scriptNodeRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;
  };

  const toggleLive = () => {
    if (isLiveActive) stopLive();
    else startLive();
  };

  const sendMessage = async () => {
    if (!input.trim() || isLiveActive) return; // Keep standard chat if not live
    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    
    try {
      const ai = getAIClient();
      const prompt = `أنت مساعد تعليمي ذكي للطالب. هذه هي المادة العلمية للفصل:
      ${chapterAiContext || "لا يوجد محتوى إضافي"}
      
      السؤال: ${userMessage}`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt
      });

      setMessages(prev => [...prev, { role: 'ai', text: response.text || "عذراً، لا يمكن الإجابة." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "خطأ بالاتصال." }]);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-white dark:bg-black w-full max-w-2xl rounded-2xl neo-border shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] overflow-hidden flex flex-col max-h-[85vh] min-h-[500px]"
      >
        <div className="p-4 border-b-4 border-black dark:border-white bg-[#A7F3D0] shrink-0 flex items-center justify-between">
            <h2 className="text-xl font-black text-black">Gemini Live المنهج: {chapterName}</h2>
            <button onClick={onClose}><X /></button>
        </div>
        
        <div className="flex-1 flex flex-col p-8 items-center justify-center text-center">
             <motion.button 
                onClick={toggleLive}
                animate={isLiveActive ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
                transition={{ repeat: isLiveActive ? Infinity : 0, duration: 2 }}
                className={`w-32 h-32 rounded-full flex items-center justify-center border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all mb-8 ${isLiveActive ? 'bg-red-500 text-white' : 'neo-bg-yellow text-black'}`}
             >
                 {isLiveActive ? <MicOff size={48} /> : <Mic size={48} />}
             </motion.button>

             <h3 className="text-2xl font-black mb-2">{isLiveActive ? "جاري الاستماع... تحدث الآن!" : "اضغط لبدء محادثة صوتية مباشرة المباشرة"}</h3>
             <p className="text-slate-500 font-bold max-w-md mx-auto">سيقوم الذكاء الاصطناعي بالإجابة على أسئلتك شفهياً وبشكل مباشر من المنهج المرفق فقط.</p>
             
             {messages.slice(-1).map((m, i) => (
                 <div key={i} className="mt-8 p-4 bg-slate-100 rounded-xl neo-border font-bold text-center w-full max-w-sm">
                     {m.text}
                 </div>
             ))}
        </div>

      </motion.div>
    </div>
  );
}
