import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  limit, 
  orderBy,
  serverTimestamp, 
  arrayUnion 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Users, 
  Plus, 
  Search, 
  Send, 
  Smile, 
  LogOut, 
  Share2, 
  BookOpen, 
  Clock, 
  ArrowRight, 
  Play, 
  Pause, 
  FileText, 
  Check, 
  Video, 
  Copy, 
  Sparkles, 
  Notebook, 
  Loader2, 
  Bell, 
  CheckCircle2, 
  BookOpenCheck,
  ChevronLeft,
  Mic,
  MicOff,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Subject, Chapter, Teacher, Material } from '../types';

interface Props {
  user: any;
  userProfile: any;
  onBack: () => void;
}

interface StudyRoom {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatarUrl?: string;
  inviteeId?: string;
  inviteeName?: string;
  inviteeAvatarUrl?: string;
  status: 'pending' | 'active' | 'closed';
  createdAt: any;
  
  // Real-time synchronization
  activeSubjectId?: string;
  activeSubjectName?: string;
  activeTeacherId?: string;
  activeTeacherName?: string;
  activeChapterId?: string;
  activeChapterName?: string;
  
  activeMaterialId?: string;
  activeMaterialTitle?: string;
  activeMaterialType?: 'Video' | 'PDF' | 'VK' | 'Ministerial';
  activeMaterialUrl?: string;
  
  // Synchronized controls
  videoPlaying?: boolean;
  pdfPage?: number;
  lastActionBy?: string;
  lastActionByName?: string;
  lastActionTime?: number;
  
  // Real-time notebook
  sharedNotes?: string;
  
  // Reactions queue / tick
  latestReaction?: {
    emoji: string;
    senderId: string;
    timestamp: number;
  };

  // VoIP Real-time voice states
  hostVoiceActive?: boolean;
  inviteeVoiceActive?: boolean;
  webrtcOffer?: { sdp: string; type: any };
  webrtcAnswer?: { sdp: string; type: any };
}

export default function StudyWithFriend({ user, userProfile, onBack }: Props) {
  const [view, setView] = useState<'lobby' | 'session'>('lobby');
  
  // Room Code & Join inputs
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // User searching to invite
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Active Session states
  const [activeRoom, setActiveRoom] = useState<StudyRoom | null>(null);
  const [incomingInvites, setIncomingInvites] = useState<StudyRoom[]>([]);
  
  // Chat items
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  
  // Subjects / Material picking inside the session
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  
  // Selection workflow in session
  const [selSubject, setSelSubject] = useState<Subject | null>(null);
  const [selTeacher, setSelTeacher] = useState<Teacher | null>(null);
  const [selChapter, setSelChapter] = useState<Chapter | null>(null);
  const [showNavigator, setShowNavigator] = useState(false);

  // Reaction particles overlay
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string }[]>([]);
  
  // Track last reaction time locally to avoid duplicating
  const lastReactionProcessedRef = useRef<number>(0);
  const manuallyLeftRef = useRef<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Classroom Session Layout, Chat, Notes, Cinema States
  const [showChat, setShowChat] = useState(true); // default open, toggleable for huge screen
  const [showNotes, setShowNotes] = useState(false); // default closed scratchpad
  const [isCinemaMode, setIsCinemaMode] = useState(false); // cinema mode for wider player
  const [isMicOn, setIsMicOn] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  // Audio Amplitude Meter volumes (8 bars)
  const [audioLevels, setAudioLevels] = useState<number[]>([1, 1, 1, 1, 1, 1, 1, 1]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioAnimationRef = useRef<number | null>(null);

  // WebRTC references
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync YouTube play/pause on state change via postMessage
  useEffect(() => {
    if (!activeRoom || !iframeRef.current) return;
    
    const isPlaying = activeRoom.videoPlaying;
    try {
      if (isPlaying) {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          '*'
        );
      } else {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
          '*'
        );
      }
    } catch (err) {
      console.error('Error postMessage to iframe: ', err);
    }
  }, [activeRoom?.videoPlaying, activeRoom?.activeMaterialUrl]);

  // Load basic curriculum items for shared navigator
  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const subSnap = await getDocs(collection(db, 'subjects'));
        setSubjects(subSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subject)));
        
        const teachSnap = await getDocs(collection(db, 'teachers'));
        setTeachers(teachSnap.docs.map(d => ({ id: d.id, ...d.data() } as Teacher)));
        
        const chapSnap = await getDocs(collection(db, 'chapters'));
        setChapters(chapSnap.docs.map(d => ({ id: d.id, ...d.data() } as Chapter)));

        const matSnap = await getDocs(collection(db, 'materials'));
        setMaterials(matSnap.docs.map(d => ({ id: d.id, ...d.data() } as Material)));
      } catch (err) {
        console.error('Error fetching curriculum options:', err);
      }
    };
    fetchCurriculum();
  }, []);

  // Listen to incoming real-time invitations
  useEffect(() => {
    if (!user?.id) return;
    
    // Listen to pending rooms where inviteeId matches the current user
    const q = query(
      collection(db, 'study_rooms'), 
      where('inviteeId', '==', user.id),
      where('status', '==', 'pending')
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudyRoom));
      setIncomingInvites(rooms);
    });

    return () => unsub();
  }, [user?.id]);

  // Listen to active session details when inside a room
  useEffect(() => {
    if (!activeRoom?.id) return;

    const unsub = onSnapshot(doc(db, 'study_rooms', activeRoom.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StudyRoom;
        setActiveRoom({ id: docSnap.id, ...data });

        // Change View automatically to session if room becomes active
        if (data.status === 'active' && view === 'lobby') {
          setView('session');
        }

        // Handle floating reaction broadcast from peer
        if (data.latestReaction && data.latestReaction.timestamp > lastReactionProcessedRef.current) {
          lastReactionProcessedRef.current = data.latestReaction.timestamp;
          triggerFloatingReaction(data.latestReaction.emoji);
        }
      } else {
        // Room was closed / deleted
        if (!manuallyLeftRef.current) {
          setError('تم إغلاق غرفة الدراسة المشتركة');
        }
        manuallyLeftRef.current = false;
        setActiveRoom(null);
        setView('lobby');
      }
    });

    // Listen to real-time chat messages inside this room
    const chatUnsub = onSnapshot(
      query(collection(db, 'study_rooms', activeRoom.id, 'chat'), orderBy('timestamp', 'asc')),
      (snapshot) => {
        setChatMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsub();
      chatUnsub();
    };
  }, [activeRoom?.id, view]);

  // Search users by name or email
  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError('');
    try {
      const q = query(
        collection(db, 'users'),
        limit(15)
      );
      const snap = await getDocs(q);
      const allUsers = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => u.id !== user.id) // Exclude current user
        .filter((u: any) => {
          const name = (u.full_name || u.displayName || u.username || '').toLowerCase();
          const email = (u.email || '').toLowerCase();
          const term = searchQuery.toLowerCase();
          return name.includes(term) || email.includes(term);
        });

      setSearchResults(allUsers);
      if (allUsers.length === 0) {
        setError('لم نجد طالباً بهذا الاسم أو البريد الإلكتروني');
      }
    } catch (err: any) {
      console.error(err);
      setError('فشل البحث في قاعدة البيانات');
    } finally {
      setSearching(false);
    }
  };

  // Create a Study Room and invite a student (either with direct invite or code)
  const handleCreateRoom = async (targetFriendUser?: any) => {
    setLoading(true);
    setError('');
    setSuccess('');
    manuallyLeftRef.current = false;
    try {
      // 6 Character Room Code
      const randCode = Math.floor(100000 + Math.random() * 900000).toString();
      const roomId = randCode;

      const name = userProfile?.full_name || userProfile?.displayName || userProfile?.username || user.email.split('@')[0] || 'طالب';
      const avatar = user.user_metadata?.avatar_url || '';

      const roomPayload: StudyRoom = {
        id: randCode,
        hostId: user.id,
        hostName: name,
        hostAvatarUrl: avatar,
        status: targetFriendUser ? 'pending' : 'pending',
        createdAt: serverTimestamp(),
        sharedNotes: 'أهلاً بكم في مذكرتنا الدراسية المشتركة! اكتبوا ملاحظاتكم هنا بالوقت الفعلي ✍️',
        videoPlaying: false
      };

      if (targetFriendUser) {
        roomPayload.inviteeId = targetFriendUser.id;
        roomPayload.inviteeName = targetFriendUser.full_name || targetFriendUser.displayName || targetFriendUser.username || targetFriendUser.email;
        roomPayload.inviteeAvatarUrl = targetFriendUser.photoURL || '';
      }

      await setDoc(doc(db, 'study_rooms', roomId), roomPayload);
      setActiveRoom({ ...roomPayload, id: roomId });
      
      if (targetFriendUser) {
        setSuccess(`تم إرسال دعوة دراسية مبهجة للدراسة إلى ${roomPayload.inviteeName}!`);
      } else {
        setSuccess('تم إنشاء غرفة الدراسة المشتركة بنجاح! شارك الرمز لبدء الدراسة.');
      }
    } catch (err: any) {
      console.error(err);
      setError('فعل تفاصيل الغرفة حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  // Join existing room via code
  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    manuallyLeftRef.current = false;
    try {
      const codeClean = joinCode.trim();
      const roomId = codeClean;
      const docSnap = await getDoc(doc(db, 'study_rooms', roomId));

      if (!docSnap.exists()) {
        setError('رمز الغرفة غير صحيح أو منتهي الصلاحية');
        return;
      }

      const data = docSnap.data() as StudyRoom;
      if (data.status === 'closed') {
        setError('غرفة الدراسة هذه مغلقة حالياً');
        return;
      }

      const name = userProfile?.full_name || userProfile?.displayName || userProfile?.username || user.email.split('@')[0] || 'طالب';
      const avatar = user.user_metadata?.avatar_url || '';

      // Update room status to active and store invitee details
      const updateData: Partial<StudyRoom> = {
        status: 'active',
        inviteeId: user.id,
        inviteeName: name,
        inviteeAvatarUrl: avatar
      };

      await updateDoc(doc(db, 'study_rooms', roomId), updateData);
      setActiveRoom({ ...data, ...updateData, id: roomId });
      setView('session');
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ أثناء الانضمام للغرفة');
    } finally {
      setLoading(false);
    }
  };

  // Accept incoming invite
  const handleAcceptInvite = async (room: StudyRoom) => {
    setLoading(true);
    manuallyLeftRef.current = false;
    try {
      const name = userProfile?.full_name || userProfile?.displayName || userProfile?.username || user.email.split('@')[0] || 'طالب';
      const avatar = user.user_metadata?.avatar_url || '';

      const updateData: Partial<StudyRoom> = {
        status: 'active',
        inviteeId: user.id,
        inviteeName: name,
        inviteeAvatarUrl: avatar
      };

      await updateDoc(doc(db, 'study_rooms', room.id), updateData);
      setActiveRoom({ ...room, ...updateData, id: room.id });
      setView('session');
    } catch (err) {
      console.error(err);
      setError('فشل قبول الدعوة الدراسية');
    } finally {
      setLoading(false);
    }
  };

  // Decline incoming invite
  const handleDeclineInvite = async (room: StudyRoom) => {
    try {
      await updateDoc(doc(db, 'study_rooms', room.id), {
        status: 'closed'
      });
      setSuccess('تم رفض الدعوة الدراسة');
    } catch (err) {
      console.error(err);
    }
  };

  // Stop mic & cleanup loops
  const stopMic = async () => {
    setIsMicOn(false);
    
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      setMicStream(null);
    }
    
    if (audioAnimationRef.current) {
      cancelAnimationFrame(audioAnimationRef.current);
      audioAnimationRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    
    setAudioLevels([1, 1, 1, 1, 1, 1, 1, 1]);

    if (activeRoom) {
      const isHost = activeRoom.hostId === user.id;
      try {
        await updateDoc(doc(db, 'study_rooms', activeRoom.id), {
          [isHost ? 'hostVoiceActive' : 'inviteeVoiceActive']: false
        });
      } catch (e) {
        console.error('Error clearing voice active status:', e);
      }
    }
  };

  // Setup sound frequency pitch wave visualizer (8 bars)
  const setupAudioVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);
      
      audioContextRef.current = audioCtx;
      analyzerRef.current = analyser;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateLevel = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        const levels = Array.from(dataArray).slice(0, 8).map(val => Math.max(1, Math.round((val / 255) * 8)));
        setAudioLevels(levels);
        audioAnimationRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (e) {
      console.error('Error in audio visualizer setup:', e);
    }
  };

  // Toggle mic voice sharing
  const handleToggleMic = async () => {
    if (isMicOn) {
      await stopMic();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setMicStream(stream);
        setIsMicOn(true);
        setupAudioVisualizer(stream);
        
        if (activeRoom) {
          const isHost = activeRoom.hostId === user.id;
          await updateDoc(doc(db, 'study_rooms', activeRoom.id), {
            [isHost ? 'hostVoiceActive' : 'inviteeVoiceActive']: true
          });
        }
      } catch (err) {
        console.error('Error gaining audio media stream:', err);
        setError('يرجى تمكين إذن التكلم للحصول على صلاحية المايكروفون الخاص بك');
      }
    }
  };

  // Effect to manage WebRTC Peer-to-Peer Audio Signaling & Connection
  useEffect(() => {
    if (!activeRoom || !isMicOn || !micStream) {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      return;
    }

    const roomId = activeRoom.id;
    const isHost = activeRoom.hostId === user.id;
    const peerVoiceActive = isHost ? activeRoom.inviteeVoiceActive : activeRoom.hostVoiceActive;

    // Only establish WebRTC when both peers have enabled their microphones
    if (!peerVoiceActive) {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      return;
    }

    let isDestroyed = false;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peerConnectionRef.current = pc;

    // Stream tracks
    micStream.getTracks().forEach(track => pc.addTrack(track, micStream));

    // Handle incoming audio from peer
    pc.ontrack = (event) => {
      if (isDestroyed) return;
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    // Push local candidate to Firestore
    pc.onicecandidate = async (e) => {
      if (isDestroyed) return;
      if (e.candidate) {
        try {
          const colName = isHost ? 'hostCandidates' : 'inviteeCandidates';
          await addDoc(collection(db, 'study_rooms', roomId, colName), e.candidate.toJSON());
        } catch (err) {
          console.error('Error saving local candidate:', err);
        }
      }
    };

    const roomRef = doc(db, 'study_rooms', roomId);
    let isOfferReceiverUnsub: (() => void) | null = null;
    let isCandidatesUnsub: (() => void) | null = null;

    if (isHost) {
      const initiateCalling = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await updateDoc(roomRef, {
            webrtcOffer: { sdp: offer.sdp, type: offer.type }
          });
        } catch (err) {
          console.error('Error creating offer as Host:', err);
        }
      };
      initiateCalling();

      // Listen for Answer
      isOfferReceiverUnsub = onSnapshot(roomRef, async (snap) => {
        if (isDestroyed) return;
        const data = snap.data();
        if (data?.webrtcAnswer && pc.signalingState === 'have-local-offer') {
          try {
            const answer = new RTCSessionDescription(data.webrtcAnswer);
            await pc.setRemoteDescription(answer);
          } catch (err) {
            console.error('Error setting answer on Host:', err);
          }
        }
      });

      // Listen for Invitee Candidates
      isCandidatesUnsub = onSnapshot(collection(db, 'study_rooms', roomId, 'inviteeCandidates'), (snap) => {
        if (isDestroyed) return;
        snap.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            try {
              const candObj = new RTCIceCandidate(change.doc.data());
              await pc.addIceCandidate(candObj);
            } catch (err) {
              // ignore minor racing candidates failures
            }
          }
        });
      });
    } else {
      // Receiver
      isOfferReceiverUnsub = onSnapshot(roomRef, async (snap) => {
        if (isDestroyed) return;
        const data = snap.data();
        if (data?.webrtcOffer && pc.signalingState === 'stable') {
          try {
            const offer = new RTCSessionDescription(data.webrtcOffer);
            await pc.setRemoteDescription(offer);
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            await updateDoc(roomRef, {
              webrtcAnswer: { sdp: answer.sdp, type: answer.type }
            });
          } catch (err) {
            console.error('Error handling offer on Invitee:', err);
          }
        }
      });

      // Listen for Host Candidates
      isCandidatesUnsub = onSnapshot(collection(db, 'study_rooms', roomId, 'hostCandidates'), (snap) => {
        if (isDestroyed) return;
        snap.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            try {
              const candObj = new RTCIceCandidate(change.doc.data());
              await pc.addIceCandidate(candObj);
            } catch (err) {
              // ignore
            }
          }
        });
      });
    }

    return () => {
      isDestroyed = true;
      if (isOfferReceiverUnsub) isOfferReceiverUnsub();
      if (isCandidatesUnsub) isCandidatesUnsub();
      pc.close();
      if (peerConnectionRef.current === pc) {
        peerConnectionRef.current = null;
      }
    };
  }, [isMicOn, micStream, activeRoom?.hostVoiceActive, activeRoom?.inviteeVoiceActive]);

  // Handle generic track and animations destroy on overall unmount
  useEffect(() => {
    return () => {
      if (audioAnimationRef.current) cancelAnimationFrame(audioAnimationRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  // Leave / close session
  const handleLeaveSession = async () => {
    if (!activeRoom) return;
    manuallyLeftRef.current = true;
    
    // Stop microphone stream safely on exit
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      setMicStream(null);
    }
    setIsMicOn(false);

    try {
      const roomId = activeRoom.id;
      const isHost = activeRoom.hostId === user.id;

      if (isHost) {
        // Safe closure or full delete
        await deleteDoc(doc(db, 'study_rooms', roomId));
      } else {
        // Just turn state back to pending or close if guest leaves
        await updateDoc(doc(db, 'study_rooms', roomId), {
          status: 'closed'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActiveRoom(null);
      setView('lobby');
    }
  };

  // Share Material with Peer (Updates Room document)
  const handleShareMaterialWithPeer = async (material: Material) => {
    if (!activeRoom) return;
    
    // Resolve parents
    const chapObj = chapters.find(c => c.id === material.chapterId || (material.chapterIds && material.chapterIds.includes(c.id)));
    const subObj = subjects.find(s => s.id === material.subjectId);
    const teachObj = teachers.find(t => t.id === material.teacherId);

    const updates: Partial<StudyRoom> = {
      activeSubjectId: material.subjectId || '',
      activeSubjectName: subObj?.name || '',
      activeTeacherId: material.teacherId || '',
      activeTeacherName: teachObj?.name || '',
      activeChapterId: material.chapterId || (material.chapterIds ? material.chapterIds[0] : ''),
      activeChapterName: chapObj?.name || '',
      
      activeMaterialId: material.id,
      activeMaterialTitle: material.title,
      activeMaterialType: material.type,
      activeMaterialUrl: material.url,

      videoPlaying: material.type === 'Video' || material.type === 'VK' ? true : false,
      pdfPage: 1,

      lastActionBy: user.id,
      lastActionByName: userProfile?.full_name || 'صديقك',
      lastActionTime: Date.now()
    };

    try {
      await updateDoc(doc(db, 'study_rooms', activeRoom.id), updates);
      setShowNavigator(false);
    } catch (err) {
      console.error('Error sharing content:', err);
    }
  };

  // Live notes edit sync
  const handleNotesChange = async (val: string) => {
    if (!activeRoom) return;
    try {
      await updateDoc(doc(db, 'study_rooms', activeRoom.id), {
        sharedNotes: val
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Play / Pause video for both
  const handleTogglePlay = async (isPlaying: boolean) => {
    if (!activeRoom) return;
    try {
      await updateDoc(doc(db, 'study_rooms', activeRoom.id), {
        videoPlaying: isPlaying,
        lastActionBy: user.id,
        lastActionByName: userProfile?.full_name || 'صديقك',
        lastActionTime: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // PDF Page change sync
  const handlePageChange = async (newPage: number) => {
    if (!activeRoom) return;
    try {
      await updateDoc(doc(db, 'study_rooms', activeRoom.id), {
        pdfPage: newPage,
        lastActionBy: user.id,
        lastActionByName: userProfile?.full_name || 'صديقك',
        lastActionTime: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Sending rapid reaction
  const handleSendReaction = async (emoji: string) => {
    if (!activeRoom) return;
    try {
      await updateDoc(doc(db, 'study_rooms', activeRoom.id), {
        latestReaction: {
          emoji,
          senderId: user.id,
          timestamp: Date.now()
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Floating Animation trigger
  const triggerFloatingReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    setFloatingEmojis(prev => [...prev, { id, emoji }]);
    // Auto-remove particle after 2.5s
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(p => p.id !== id));
    }, 2500);
  };

  // Send instantaneous chat message
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !activeRoom) return;
    
    try {
      const msgData = {
        senderId: user.id,
        senderName: userProfile?.full_name || 'طالب',
        senderAvatar: user.user_metadata?.avatar_url || '',
        text: messageText.trim(),
        timestamp: Date.now()
      };
      setMessageText('');
      await addDoc(collection(db, 'study_rooms', activeRoom.id, 'chat'), msgData);
    } catch (err) {
      console.error(err);
    }
  };

  // Copy elements to clipboard helper
  const handleCopyToClipboard = (text: string, setCopiedFn: any) => {
    navigator.clipboard.writeText(text);
    setCopiedFn(true);
    setTimeout(() => setCopiedFn(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans relative overflow-hidden" dir="rtl">
      
      {/* Floating Reaction Particles Board */}
      <div className="fixed inset-0 pointer-events-none z-[999] overflow-hidden">
        <AnimatePresence>
          {floatingEmojis.map(particle => (
            <motion.div
              key={particle.id}
              initial={{ opacity: 1, y: '100vh', x: `${Math.random() * 80 + 10}vw`, scale: 0.8 }}
              animate={{ opacity: 0, y: '-10vh', x: `calc(${Math.random() * 40 - 20}vw + 50%)`, scale: 2.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: "easeOut" }}
              className="absolute text-5xl select-none"
            >
              {particle.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {view === 'lobby' ? (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
          
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-black pb-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={onBack}
                className="p-3 bg-white dark:bg-black rounded-xl border-2 border-black text-black dark:text-white hover:neo-bg-pink hover:text-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              >
                <ArrowRight size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-black text-black dark:text-white flex items-center gap-2">
                   <Users className="text-blue-600 animate-pulse" size={32} />
                   ادرس مع صديقك
                </h1>
                <p className="font-bold text-slate-700 dark:text-slate-300">ادرسوا المحاضرات والملخصات معاً بالوقت الفعلي بدقة متزامنة</p>
              </div>
            </div>

            {/* Profile Student ID card */}
            <div className="bg-white dark:bg-[#1a1a1a] p-3 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-right self-start sm:self-center">
              <span className="text-xs text-slate-500 font-bold block mb-1">معرّف الطالب الخاص بك (ID):</span>
              <div className="flex items-center gap-2">
                 <code className="text-sm font-black text-blue-600 bg-slate-100 dark:bg-slate-800 p-1 rounded border-2 border-dashed border-black/30 select-all" dir="ltr">
                    {user?.id ? user.id.substring(0, 8) + '...' : ''}
                 </code>
                 <button 
                   onClick={() => handleCopyToClipboard(user.id, setCopiedId)}
                   className="p-1 px-2 border border-black bg-yellow-300 text-black text-xs font-bold rounded hover:neo-bg-green transition-all"
                 >
                   {copiedId ? 'تم النسخ!' : <Copy size={14} />}
                 </button>
              </div>
            </div>
          </header>

          {/* Feedback banners */}
          {error && (
            <div className="p-4 bg-red-100 dark:bg-red-950/40 border-2 border-red-600 text-red-700 dark:text-red-400 font-bold rounded-xl animate-bounce">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-100 dark:bg-green-950/40 border-2 border-green-600 text-green-700 dark:text-green-400 font-bold rounded-xl">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Quick Actions (Create room, Join room) */}
            <div className="space-y-6">
              
              <div className="bg-white dark:bg-[#111] neo-border p-6 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_white]">
                <div className="space-y-4">
                  <h2 className="font-black text-2xl text-black dark:text-white flex items-center gap-2">
                    <Plus size={24} className="text-emerald-500" />
                    ابتدئ غرفة جديدة
                  </h2>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                    أنشئ غرفة دراسية مستقلة، ثم تواصل مع صديقك وشاركه رمز الغرفة للدراسة معاً.
                  </p>
                </div>
                
                {activeRoom && activeRoom.status === 'pending' ? (
                  <div className="mt-6 p-4 rounded-xl border-2 border-dashed border-yellow-500 bg-yellow-500/10 text-right space-y-3">
                    <span className="font-bold text-sm block text-yellow-600">بانتظار انضمام صديقك للغرفة...</span>
                    <div className="flex items-center gap-2">
                       <span className="font-extrabold text-lg text-black dark:text-white">رمز الغرفة: {activeRoom.id}</span>
                       <button
                         onClick={() => handleCopyToClipboard(activeRoom.id, setCopiedCode)}
                         className="p-1 px-2 border border-black bg-white text-black text-xs font-bold rounded hover:-translate-y-0.5 transition-all"
                       >
                         {copiedCode ? 'تم النسخ!' : 'نسخ الرمز'}
                       </button>
                    </div>
                    <button
                      onClick={handleLeaveSession}
                      className="w-full py-2 bg-red-600 text-white font-bold border-2 border-black rounded-lg text-xs"
                    >
                      إلغاء الغرفة
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleCreateRoom()}
                    disabled={loading}
                    className="mt-6 w-full py-4 border-2 border-black rounded-xl font-black text-base flex items-center justify-center gap-2 hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_white] transition-transform neo-bg-green text-black"
                  >
                    {loading ? <Loader2 className="animate-spin text-black" /> : <Plus size={20} />}
                    إنشاء غرفة مفعمة بالحيوية
                  </button>
                )}
              </div>

              <div className="bg-white dark:bg-[#111] neo-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_white]">
                <h2 className="font-black text-2xl text-black dark:text-white flex items-center gap-2 mb-2">
                  <Users size={24} className="text-blue-500" />
                  ادخل غرفة دراسية
                </h2>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4">
                  أدخل الرمز المكون من 6 أرقام المكتوب في دعوة صديقك للانتقال مباشرة إلى جلسته.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="أدخل الرمز هنا (مثال: 582490)"
                    dir="ltr"
                    className="flex-1 px-4 py-3 border-2 border-black rounded-xl font-bold bg-white dark:bg-black text-black dark:text-white focus:outline-none"
                  />
                  <button
                    onClick={handleJoinByCode}
                    disabled={loading || !joinCode}
                    className="px-6 py-3 border-2 border-black rounded-xl font-black bg-yellow-300 text-black hover:-translate-y-1 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : 'انضمام'}
                  </button>
                </div>
              </div>

            </div>

            {/* Direct Friend Inviting & Inbox */}
            <div className="space-y-6">
              
              {/* Direct Inviting section */}
              <div className="bg-white dark:bg-[#111] neo-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_white] flex flex-col justify-between">
                <div>
                   <h2 className="font-black text-2xl text-black dark:text-white flex items-center gap-2 mb-2">
                     <Search size={24} className="text-pink-500" />
                     ابحث عن صديقك ودعه
                   </h2>
                   <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4">
                     ابحث عن أصدقائك المسجلين بالموقع باستخدام أسمائهم لإرسال دعوة مباشرة لشاشاتهم.
                   </p>
                   <div className="flex gap-2 mb-4">
                     <input
                       type="text"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                       placeholder="اكتب اسم الطالب أو بريده الإلكتروني..."
                       className="flex-1 px-4 py-3 border-2 border-black rounded-xl font-bold bg-white dark:bg-black text-black dark:text-white focus:outline-none"
                     />
                     <button
                       onClick={handleSearchUsers}
                       disabled={searching}
                       className="px-4 py-3 border-2 border-black rounded-xl bg-pink-300 text-black font-black hover:-translate-y-1 transition-transform"
                     >
                       {searching ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                     </button>
                   </div>

                   {/* Search Results list */}
                   {searchResults.length > 0 && (
                     <div className="border-2 border-black rounded-xl overflow-hidden divide-y-2 divide-black max-h-48 overflow-y-auto">
                       {searchResults.map((srvUser: any) => (
                         <div key={srvUser.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#1d1d1d] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                           <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full border border-black overflow-hidden bg-white">
                               <img 
                                 src={srvUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(srvUser.full_name || srvUser.displayName || 'طالب')}`} 
                                 className="w-full h-full object-cover"
                               />
                             </div>
                             <div>
                               <span className="font-black text-sm block text-black dark:text-white">{srvUser.full_name || srvUser.displayName}</span>
                               <span className="text-xs text-slate-500 font-bold block">{srvUser.username || srvUser.email?.split('@')[0]}</span>
                             </div>
                           </div>
                           <button
                             onClick={() => handleCreateRoom(srvUser)}
                             className="px-3 py-1 bg-emerald-400 text-black border border-black rounded font-black text-xs hover:-translate-y-0.5 transition-transform"
                           >
                             دعوة
                           </button>
                         </div>
                       ))}
                     </div>
                   )}
                </div>
              </div>

              {/* Incoming Invites Panel */}
              <div className="bg-white dark:bg-[#111] neo-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_white]">
                <h2 className="font-black text-2xl text-black dark:text-white flex items-center gap-2 mb-4">
                  <Bell className="text-yellow-500 animate-wiggle" size={24} />
                  الدعوات الواردة
                  {incomingInvites.length > 0 && (
                    <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center font-black text-xs animate-pulse">
                      {incomingInvites.length}
                    </span>
                  )}
                </h2>

                {incomingInvites.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-bold">
                    لا توجد دعوات دراسة واردة حالياً
                  </div>
                ) : (
                  <div className="space-y-4">
                    {incomingInvites.map((room) => (
                      <div 
                        key={room.id}
                        className="p-4 bg-[#fdfbf7] dark:bg-slate-900 border-2 border-black rounded-xl flex items-center justify-between gap-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-white">
                             <img 
                               src={room.hostAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(room.hostName)}`}
                               className="w-full h-full object-cover"
                             />
                           </div>
                           <div>
                             <span className="font-black text-sm text-black dark:text-white block">{room.hostName} يدعوك للدراسة</span>
                             <span className="text-xs text-blue-600 font-bold">رمز الغرفة: {room.id}</span>
                           </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptInvite(room)}
                            className="p-2 border-2 border-black bg-emerald-400 text-black font-black text-xs rounded-xl hover:-translate-y-0.5 transition-transform flex items-center gap-1"
                          >
                            <CheckCircle2 size={14} /> Accept
                          </button>
                          <button
                            onClick={() => handleDeclineInvite(room)}
                            className="p-2 border-2 border-black bg-red-400 text-black font-black text-xs rounded-xl hover:-translate-y-0.5 transition-transform"
                          >
                            رفض
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      ) : (
        /* Real-Time Live Co-Study Room Session Dashboard */
        <div className={`w-full mx-auto px-4 py-6 flex flex-col xl:flex-row gap-6 animate-in zoom-in-95 duration-300 transition-all ${isCinemaMode ? 'max-w-full xl:px-8' : 'max-w-7xl'}`}>
           
           {/* Left Main Study Space */}
           <div className="flex-1 space-y-6">
             
             {/* Study Area Navigation & Presence bar */}
             <div className="bg-white dark:bg-slate-900 border-4 border-black p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_white]">
               <div className="flex items-center gap-4">
                  <button 
                    onClick={handleLeaveSession}
                    title="غادر الغرفة"
                    className="p-3 border-2 border-black bg-red-400 hover:neo-bg-pink text-black rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center"
                  >
                    <LogOut size={20} />
                  </button>
                  <div>
                    <h2 className="font-black text-xl text-black dark:text-white flex items-center gap-2">
                       جلسة دراسة متزامنة: {activeRoom?.id}
                       <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-ping" />
                    </h2>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                       تتم مزامنة أي مادة تختارها أو توقفها مع صديقك بالوقت الفعلي
                    </p>
                  </div>
               </div>

               {/* Room Members statuses */}
               <div className="flex items-center gap-3">
                 <div className="flex items-center -space-x-3 space-x-reverse">
                   <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-white relative" title={activeRoom?.hostName}>
                     <img 
                       src={activeRoom?.hostAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeRoom?.hostName || 'مستضيف')}`}
                       className="w-full h-full object-cover"
                     />
                     {activeRoom?.hostVoiceActive && (
                       <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border border-black rounded-full animate-ping z-10" />
                     )}
                   </div>
                   {activeRoom?.inviteeId && (
                     <div className="w-10 h-10 rounded-full border-2 border-black overflow-hidden bg-white relative" title={activeRoom?.inviteeName}>
                       <img 
                         src={activeRoom?.inviteeAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeRoom?.inviteeName || 'زميل')}`}
                         className="w-full h-full object-cover"
                       />
                       {activeRoom?.inviteeVoiceActive && (
                         <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border border-black rounded-full animate-ping z-10" />
                       )}
                     </div>
                   )}
                 </div>
                 <div className="text-right">
                   <span className="text-xs font-black text-slate-500 block">الحضور:</span>
                   <span className="text-sm font-black text-black dark:text-white flex items-center gap-1.5 flex-row-reverse justify-end">
                     {activeRoom?.hostName}
                     {activeRoom?.hostVoiceActive && <Mic size={13} className="text-green-500 animate-bounce" />}
                     {activeRoom?.inviteeId && (
                       <>
                         <span>+ {activeRoom?.inviteeName}</span>
                         {activeRoom?.inviteeVoiceActive && <Mic size={13} className="text-green-500 animate-bounce" />}
                       </>
                     )}
                   </span>
                 </div>
               </div>
             </div>

             {/* Dynamic Navigator and Material picker (Drop list inside Session) */}
             <div className="bg-white dark:bg-slate-900 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_white]">
               <button
                 onClick={() => setShowNavigator(!showNavigator)}
                 className="w-full flex items-center justify-between font-black text-lg text-black dark:text-white bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border-2 border-black"
               >
                 <span className="flex items-center gap-2">
                    <BookOpenCheck className="text-blue-500" />
                    تصفح وتغيير المحاضرة / الملخص معاً
                 </span>
                 <span className="text-xs px-3 py-1 bg-yellow-300 dark:bg-yellow-600 text-black border border-black rounded-lg">
                    {showNavigator ? 'إغلاق التصفح ×' : 'فتح مكتبة المواد ▾'}
                 </span>
               </button>

               <AnimatePresence>
                 {showNavigator && (
                   <motion.div
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: 'auto', opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     className="mt-4 border-t-2 border-black/10 pt-4 overflow-hidden"
                   >
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                       
                       {/* Subjects Selector */}
                       <div className="space-y-2">
                         <span className="text-xs font-bold text-slate-500">1. المادة:</span>
                         <div className="border border-black rounded-lg divide-y divide-black max-h-48 overflow-y-auto">
                           {subjects.map(s => (
                             <button
                               key={s.id}
                               onClick={() => { setSelSubject(s); setSelTeacher(null); setSelChapter(null); }}
                               className={`w-full p-2 text-right font-bold text-sm hover:bg-yellow-200 dark:hover:bg-yellow-950/20 block ${selSubject?.id === s.id ? 'bg-yellow-100 dark:bg-yellow-950/40 text-blue-600' : 'text-black dark:text-white'}`}
                             >
                               {s.name}
                             </button>
                           ))}
                         </div>
                       </div>

                       {/* Teachers Selector */}
                       <div className="space-y-2">
                         <span className="text-xs font-bold text-slate-500">2. المدرس:</span>
                         <div className="border border-black rounded-lg divide-y divide-black max-h-48 overflow-y-auto w-full">
                           {selSubject ? (
                             <>
                               <button
                                 onClick={() => setSelTeacher(null)}
                                 className={`w-full p-2 text-right font-bold text-xs hover:bg-purple-100 dark:hover:bg-purple-950/20 block ${selTeacher === null ? 'bg-purple-100 dark:bg-purple-950/40 text-blue-600' : 'text-black dark:text-white'}`}
                               >
                                 كل المدرسين (عرض الكل)
                               </button>
                               {teachers
                                 .filter(t => t.subjectId === selSubject.id)
                                 .map(t => (
                                   <button
                                     key={t.id}
                                     onClick={() => setSelTeacher(t)}
                                     className={`w-full p-2 text-right font-bold text-xs hover:bg-purple-100 dark:hover:bg-purple-950/20 flex items-center gap-2 ${selTeacher?.id === t.id ? 'bg-purple-100 dark:bg-purple-950/40 text-blue-600' : 'text-black dark:text-white'}`}
                                   >
                                     {t.avatar && (
                                       <img src={t.avatar} className="w-5 h-5 rounded-full object-cover border border-black/30 shrink-0" referrerPolicy="no-referrer" />
                                     )}
                                     <span className="truncate">أ. {t.name}</span>
                                   </button>
                                 ))
                               }
                             </>
                           ) : (
                             <div className="p-3 text-xs text-slate-400 text-center">يرجى تحديد مادة أولاً</div>
                           )}
                         </div>
                       </div>

                       {/* Chapters Selector */}
                       <div className="space-y-2">
                         <span className="text-xs font-bold text-slate-500">3. الفصل:</span>
                         <div className="border border-black rounded-lg divide-y divide-black max-h-48 overflow-y-auto">
                           {selSubject ? (
                             chapters
                               .filter(c => c.subjectId === selSubject.id || (c.subjectIds && c.subjectIds.includes(selSubject.id)))
                               .map(c => (
                                 <button
                                   key={c.id}
                                   onClick={() => setSelChapter(c)}
                                   className={`w-full p-2 text-right font-bold text-sm hover:bg-blue-100 dark:hover:bg-blue-950/20 block ${selChapter?.id === c.id ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600' : 'text-black dark:text-white'}`}
                                 >
                                   {c.name}
                                 </button>
                               ))
                           ) : (
                             <div className="p-3 text-xs text-slate-400 text-center">يرجى تحديد مادة أولاً</div>
                           )}
                         </div>
                       </div>

                       {/* Materials and Lectures Selection */}
                       <div className="space-y-2">
                         <span className="text-xs font-bold text-slate-500">4. المحاضرات المتاحة:</span>
                         <div className="border border-black rounded-lg divide-y divide-black max-h-48 overflow-y-auto">
                           {selChapter ? (
                             materials
                               .filter(m => m.chapterId === selChapter.id || (m.chapterIds && m.chapterIds.includes(selChapter.id)))
                               .filter(m => !selTeacher || m.teacherId === selTeacher.id)
                               .filter(m => m.type === 'Video' || m.type === 'VK')
                               .map(m => (
                                 <button
                                   key={m.id}
                                   onClick={() => handleShareMaterialWithPeer(m)}
                                   className="w-full p-2 text-right hover:bg-green-100 dark:hover:bg-green-950/20 flex items-center justify-between text-black dark:text-white"
                                 >
                                   <span className="font-bold text-xs truncate flex-1 block">{m.title}</span>
                                   <span className="text-[10px] font-black uppercase px-2 py-0.5 border border-black rounded-full bg-slate-100 dark:bg-slate-805 shrink-0">
                                      {m.type}
                                   </span>
                                 </button>
                               ))
                           ) : (
                             <div className="p-3 text-xs text-slate-400 text-center">يرجى تحديد فصل أولاً</div>
                           )}
                         </div>
                       </div>

                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>

             {/* Co-Studying Screen (Player OR PDF / summary viewer) */}
             <div className="bg-white dark:bg-[#121212] border-4 border-black p-4 md:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_white]">
               {activeRoom?.activeMaterialId ? (
                 <div className="space-y-4 text-right">
                   
                   {/* Material Meta details and status */}
                   <div className="flex items-center justify-between gap-4 border-b pb-3 flex-wrap">
                     <div>
                       <span className="text-xs font-black uppercase tracking-wider text-slate-500">{activeRoom.activeSubjectName} • {activeRoom.activeChapterName}{activeRoom.activeTeacherName ? ` • أ. ${activeRoom.activeTeacherName}` : ''}</span>
                       <h3 className="font-extrabold text-xl sm:text-2xl text-black dark:text-white mt-1">{activeRoom.activeMaterialTitle}</h3>
                     </div>
                     <span className="text-xs p-2 bg-blue-500 text-white font-black rounded-xl">
                        يتصفح كلّاكما حالياً: {activeRoom.activeMaterialType}
                     </span>
                   </div>

                   {/* Main viewports based on material type */}
                   {activeRoom.activeMaterialType === 'Video' || activeRoom.activeMaterialType === 'VK' ? (
                     <div className="space-y-4">
                       <div className={`w-full bg-black relative rounded-2xl border-4 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 ${isCinemaMode ? 'aspect-[21/10] h-[55vh] md:h-[70vh]' : 'aspect-video'}`}>
                         {/* Embed Iframe for Shared Youtube or VK video */}
                         <iframe
                           src={
                             activeRoom.activeMaterialUrl?.includes('youtube.com') || activeRoom.activeMaterialUrl?.includes('youtu.be')
                               ? `https://www.youtube.com/embed/${activeRoom.activeMaterialUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)?.[1]}?autoplay=1&enablejsapi=1&controls=1`
                               : activeRoom.activeMaterialUrl?.includes('vk') 
                                 ? `https://vk.com/video_ext.php?oid=${activeRoom.activeMaterialUrl.match(/video(-?\d+)_(\d+)/)?.[1] || ''}&id=${activeRoom.activeMaterialUrl.match(/video(-?\d+)_(\d+)/)?.[2] || ''}`
                                 : activeRoom.activeMaterialUrl
                           }
                           ref={iframeRef} className="w-full h-full border-none"
                           allow="autoplay; encrypted-media; picture-in-picture"
                           allowFullScreen
                         ></iframe>

                          {/* Overlay when lecture is PAUSED */}
                          {!activeRoom.videoPlaying && (
                            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center z-10 backdrop-blur-sm animate-fade-in">
                              <div className="bg-amber-400 text-black p-4 rounded-full mb-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-black animate-pulse">
                                <Pause size={32} />
                              </div>
                              <h4 className="font-black text-white text-base md:text-lg">تم إيقاف المحاضرة مؤقتاً</h4>
                              {activeRoom.lastActionByName && (
                                <p className="text-slate-300 text-xs md:text-sm mt-1 font-bold">بواسطة: {activeRoom.lastActionByName}</p>
                              )}
                              <button
                                onClick={() => handleTogglePlay(true)}
                                className="mt-4 px-5 py-2 bg-emerald-400 hover:bg-emerald-300 text-black border-2 border-black font-extrabold rounded-xl transition-all flex items-center gap-2 text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                              >
                                <Play size={14} />
                                تشغيل ومتابعة الدرس معاً
                              </button>
                            </div>
                          )}
                       </div>

                       {/* Synchronized playback controls */}
                       <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border-2 border-black">
                         <div className="flex items-center gap-2">
                           <button
                             onClick={() => handleTogglePlay(!activeRoom.videoPlaying)}
                             className={`p-3 rounded-full border-2 border-black text-black transition-all ${activeRoom.videoPlaying ? 'bg-red-400 hover:bg-red-300' : 'bg-emerald-400 hover:bg-emerald-300'}`}
                             title={activeRoom.videoPlaying ? 'إيقاف مؤقت' : 'تشغيل المحاضرة'}
                           >
                             {activeRoom.videoPlaying ? <Pause size={20} /> : <Play size={20} />}
                           </button>
                           <span className="font-extrabold text-sm ml-2 text-black dark:text-white">
                              {activeRoom.videoPlaying ? 'المحاضرة قيد التشغيل المتبادل' : 'المحاضرة متوقفة مؤقتاً'}
                           </span>
                         </div>

                         {activeRoom.lastActionByName && (
                           <span className="text-xs font-bold text-slate-500 bg-white dark:bg-slate-900 border border-black p-2 rounded-lg">
                              آخر إجراء بواسطة: {activeRoom.lastActionByName} ({activeRoom.videoPlaying ? 'تشغيل' : 'إيقاف'})
                           </span>
                         )}
                       </div>
                     </div>
                   ) : (
                     /* PDF / Summary document viewport */
                     <div className="space-y-4">
                       <div className={`w-full border-4 border-black rounded-xl overflow-hidden bg-white relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 ${isCinemaMode ? 'h-[75vh]' : 'h-[55vh] md:h-[65vh]'}`}>
                         <iframe
                           src={`${activeRoom.activeMaterialUrl}#page=${activeRoom.pdfPage || 1}`}
                           className="w-full h-full"
                           title="Shared PDF doc viewer"
                         />
                       </div>

                       {/* Synchronized PDF page layout tools */}
                       <div className="flex items-center justify-between gap-4 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border-2 border-black">
                         <div className="flex items-center gap-2">
                           <button
                             onClick={() => handlePageChange(Math.max(1, (activeRoom.pdfPage || 1) - 1))}
                             disabled={(activeRoom.pdfPage || 1) <= 1}
                             className="px-3 py-1 bg-white border border-black rounded text-black font-extrabold hover:bg-slate-200"
                           >
                             الصفحة السابقة
                           </button>
                           <span className="font-black text-lg px-3 text-black dark:text-white">الورقة: {activeRoom.pdfPage || 1}</span>
                           <button
                             onClick={() => handlePageChange((activeRoom.pdfPage || 1) + 1)}
                             className="px-3 py-1 bg-white border border-black rounded text-black font-extrabold hover:bg-slate-200"
                           >
                             الصفحة التالية
                           </button>
                         </div>
                         {activeRoom.lastActionByName && (
                           <span className="text-xs font-bold text-slate-500 bg-white dark:bg-slate-900 border border-black p-2 rounded-lg">
                              مزامنة الصفحات: {activeRoom.lastActionByName}
                           </span>
                         )}
                       </div>
                     </div>
                   )}

                    {/* Unified Premium Iraqi Academy Interaction Toolbar */}
                    <div className="bg-slate-50 dark:bg-slate-900 border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_white] flex flex-wrap items-center justify-between gap-4 mt-6 text-right">
                      
                      {/* Left Interaction Controls (VoIP mic, Toggle chat, Toggle notes, Toggle cinema mode) */}
                      <div className="flex flex-wrap items-center gap-3">
                        
                        {/* 1. VoIP Microphone Voice Toggle Button */}
                        <button
                          onClick={handleToggleMic}
                          className={`px-4 py-2.5 border-2 border-black rounded-xl font-black text-xs md:text-sm flex items-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                            isMicOn 
                              ? 'bg-green-400 hover:bg-green-300 text-black animate-pulse' 
                              : 'bg-white dark:bg-black text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-950'
                          }`}
                        >
                          {isMicOn ? (
                            <>
                              <Mic className="text-black shrink-0 animate-bounce" size={16} />
                              <span>التحدث نشط الآن (اضغط للتعطيل)</span>
                              <div className="flex items-end gap-0.5 h-3 ml-1 shrink-0">
                                {audioLevels.map((lvl, index) => (
                                  <span 
                                    key={index} 
                                    style={{ height: `${lvl * 1.5}px` }} 
                                    className="w-0.5 bg-black transition-all duration-75 block rounded-full" 
                                  />
                                ))}
                              </div>
                            </>
                          ) : (
                            <>
                              <MicOff className="text-slate-500 shrink-0" size={16} />
                              <span>تفعيل المايك للتحدث بالتزامن</span>
                            </>
                          )}
                        </button>

                        {/* 2. Room Peer Chat Toggle Button */}
                        <button
                          onClick={() => setShowChat(!showChat)}
                          className={`px-4 py-2.5 border-2 border-black rounded-xl font-black text-xs md:text-sm flex items-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                            showChat 
                              ? 'bg-yellow-300 hover:bg-yellow-250 text-black' 
                              : 'bg-white dark:bg-black text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-950'
                          }`}
                        >
                          <MessageSquare size={16} />
                          <span>المحادثة والغرفة {showChat ? 'مفتوحة' : 'مغلقة'}</span>
                        </button>

                        {/* 3. Study Notepad Toggle Button */}
                        <button
                          onClick={() => setShowNotes(!showNotes)}
                          className={`px-4 py-2.5 border-2 border-black rounded-xl font-black text-xs md:text-sm flex items-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                            showNotes 
                              ? 'bg-orange-300 hover:bg-orange-250 text-black' 
                              : 'bg-white dark:bg-black text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-950'
                          }`}
                        >
                          <Notebook size={16} />
                          <span>المفكرة الدراسية {showNotes ? 'مفتوحة' : 'مخفية'}</span>
                        </button>

                        {/* 4. Cinema mode view-size option */}
                        <button
                          onClick={() => setIsCinemaMode(!isCinemaMode)}
                          className={`px-4 py-2.5 border-2 border-black rounded-xl font-black text-xs md:text-sm flex items-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                            isCinemaMode 
                              ? 'bg-purple-400 hover:bg-purple-355 text-black' 
                              : 'bg-white dark:bg-black text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-950'
                          }`}
                        >
                          <span>🎬</span>
                          <span>وضعية الشاشة: {isCinemaMode ? 'سينمائية كبيرة' : 'افتراضية'}</span>
                        </button>

                      </div>

                      {/* Right: Direct Lecture Playback Sync / Actions status */}
                      <div className="flex items-center gap-3">
                        {activeRoom.activeMaterialType === 'Video' || activeRoom.activeMaterialType === 'VK' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTogglePlay(!activeRoom.videoPlaying)}
                              className={`px-5 py-2.5 border-2 border-black rounded-xl font-black text-xs md:text-sm flex items-center gap-2 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-black ${
                                activeRoom.videoPlaying ? 'bg-red-400 hover:bg-red-300' : 'bg-emerald-400 hover:bg-emerald-300'
                              }`}
                            >
                              {activeRoom.videoPlaying ? <Pause size={16} /> : <Play size={16} />}
                              <span>{activeRoom.videoPlaying ? 'إيقاف المحاضرة عند الاثنين' : 'تشغيل ومتابعة الدرس معاً'}</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-500 bg-white dark:bg-slate-800 border border-black p-2.5 rounded-lg">
                            مادة دراسة تفاعلية متزامنة
                          </span>
                        )}
                      </div>

                    </div>

                 </div>
               ) : (
                 <div className="text-center py-24 text-slate-400 font-bold space-y-4">
                   <BookOpen size={64} className="mx-auto block text-slate-350" />
                   <h3 className="text-lg text-black dark:text-white font-extrabold">غرفة الدراسة فارغة حالياً</h3>
                   <p className="text-sm">افتح "مكتبة المواد" من الزر أعلاه ثم اختر محاضرة أو ملخصاً لدراسته بشكل متزامن مع زميلك!</p>
                 </div>
               )}
             </div>

             {/* Synchronized shared notes space */}
             {showNotes && (
               <div className="bg-white dark:bg-slate-900 border-4 border-black p-4 md:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_white] animate-in slide-in-from-bottom duration-300">
                 <h3 className="font-black text-lg text-black dark:text-white flex items-center gap-2 mb-3">
                   <Notebook className="text-amber-500 animate-pulse" size={24} />
                   مفكرة دراسية مشتركة (تحديث مباشر كالمجلس)
                 </h3>
                 <textarea
                   value={activeRoom?.sharedNotes || ''}
                   onChange={(e) => handleNotesChange(e.target.value)}
                   placeholder="دوّنوا نقاط المحاضرة، القوانين الرياضية، والملاحظات الهامة هنا وسيراها زميلك مباشرة!"
                   className="w-full h-32 p-3 font-bold text-sm text-[#000000] dark:text-white bg-[#fdfbf7] dark:bg-slate-950 border-2 border-black rounded-xl focus:outline-none"
                 />
               </div>
             )}

           </div>

           {/* Right Chat and Reactions deck space */}
           {showChat && (
             <div className="w-full xl:w-80 space-y-6 shrink-0">
             
             {/* Live Reaction Emojis launcher deck */}
             <div className="bg-white dark:bg-slate-900 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_white]">
                <h3 className="font-black text-sm text-black dark:text-white uppercase mb-3 flex items-center gap-1">
                   <Sparkles size={16} className="text-orange-500 text-yellow-500 animate-pulse" />
                   تفاعلات حية سريعة
                </h3>
                <div className="grid grid-cols-6 gap-2">
                  {['🔥', '👏', '🤔', '🎉', '💡', '🚀', '🧠', '😂', '✍️', '😎', '📚', '💪'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleSendReaction(emoji)}
                      className="p-2 border border-black bg-white dark:bg-[#1a1a1a] hover:scale-125 transition-transform text-2xl flex items-center justify-center rounded-lg"
                      title="أرسل هذا التفاعل"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
             </div>

             {/* Dynamic Room Peer chat with student sticker themes */}
             <div className="bg-white dark:bg-slate-900 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_white] flex flex-col h-[400px]">
                <div className="p-3 border-b-2 border-black flex items-center justify-between">
                  <span className="font-black text-sm text-black dark:text-white">دردشة الغرفة الدراسية</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col custom-scrollbar">
                  {chatMessages.length === 0 ? (
                    <div className="text-center font-bold text-slate-400 py-12 text-xs">لا توجد رسائل بعد. ابدأ النقاش!</div>
                  ) : (
                    chatMessages.map((msg, i) => {
                      const isMe = msg.senderId === user.id;
                      return (
                        <div key={msg.id || i} className={`flex flex-col max-w-[85%] ${isMe ? 'self-start text-right' : 'self-end text-left'}`}>
                          <span className="text-[10px] text-slate-500 font-bold mb-0.5">{msg.senderName}</span>
                          <div className={`p-2 px-3 border border-black rounded-2xl ${isMe ? 'bg-[#fdfbf7] text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-tr-none' : 'bg-blue-100 dark:bg-blue-950/40 text-black dark:text-white rounded-tl-none'}`}>
                            <span className="font-bold text-sm block break-all leading-tight">{msg.text}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendChatMessage} className="p-2 border-t-2 border-black flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="اكتب رسالة دراسية..."
                    className="flex-1 px-3 py-2 border border-black bg-white dark:bg-black text-black dark:text-white rounded-lg focus:outline-none text-xs font-bold"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className="p-2 bg-yellow-300 hover:neo-bg-green border border-black text-black rounded-lg transition-colors flex items-center justify-center shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </form>
             </div>

           </div>
           )}

        </div>
      )}

    </div>
  );
}
