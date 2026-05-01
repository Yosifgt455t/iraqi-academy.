import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  Book,
  Layers,
  Youtube,
  FileText,
  HelpCircle,
  ExternalLink,
  Loader2,
  LogOut,
  Settings as Wrench,
  ChevronRight,
  Database,
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
  School,
  Eye,
  EyeOff,
  GraduationCap,
  MessageSquare
} from "lucide-react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db, auth, setMaintenanceMode } from "../lib/firebase";
import { onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { getAdmins, addAdmin, removeAdmin } from "../services/adminService";
import { Grade } from "../types";
import { useClasses } from "../hooks/useClasses";

interface Subject {
  id: string;
  name: string;
  grades?: Grade[];
}

interface Chapter {
  id: string;
  name: string;
  subjectIds: string[];
}

interface Material {
  id: string;
  title: string;
  type: "Video" | "PDF" | "Ministerial";
  url: string;
  chapterIds: string[];
  order_index?: number;
  teacherId?: string;
}

export interface MinisterialQuestion {
  id: string;
  chapterIds?: string[];
  question: string;
  answer: string;
  year: string;
  order_index?: number;
}

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  chapterIds: string[];
}

interface AdminDashboardProps {
  user: any;
  onBack: () => void;
}

interface Teacher {
  id: string;
  name: string;
  subjectId: string;
  avatar?: string;
}

export default function AdminDashboard({ user, onBack }: AdminDashboardProps) {
  const {
    stages,
    allGrades,
    addGrade,
    removeGrade,
    toggleStageVisibility,
    toggleGradeVisibility,
  } = useClasses();
  const [activeTab, setActiveTab] = useState<
    | "classes"
    | "subjects"
    | "chapters"
    | "materials"
    | "flashcards"
    | "ministerial"
    | "teachers"
    | "reviews"
    | "quiz"
    | "news"
    | "database"
    | "settings"
  >("subjects");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [ministerialQuestions, setMinisterialQuestions] = useState<any[]>([]);
  const [reviewSubjects, setReviewSubjects] = useState<any[]>([]);
  const [reviewMaterials, setReviewMaterials] = useState<any[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);

  const ADMIN_EMAIL = "jwjwjwjueue@gmail.com";
  const isSuperAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // News form
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsImage, setNewsImage] = useState('');
  const [newsCategory, setNewsCategory] = useState('عام');

  // Form states
  const [subjectName, setSubjectName] = useState("");
  const [selectedGrades, setSelectedGrades] = useState<Grade[]>([]);

  const [chapterName, setChapterName] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const [materialTitle, setMaterialTitle] = useState("");
  const [materialType, setMaterialType] = useState<
    "Video" | "PDF" | "Ministerial"
  >("Video");
  const [materialUrl, setMaterialUrl] = useState("");
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);

  const [materialOrderIndex, setMaterialOrderIndex] = useState<number>(0);

  const [flashcardQuestion, setFlashcardQuestion] = useState("");
  const [flashcardAnswer, setFlashcardAnswer] = useState("");

  const [minQuestText, setMinQuestText] = useState("");
  const [minQuestAnswer, setMinQuestAnswer] = useState("");
  const [minQuestYear, setMinQuestYear] = useState("");

  const [minQuestOrderIndex, setMinQuestOrderIndex] = useState<number>(0);

  // Review states
  const [reviewSubName, setReviewSubName] = useState("");
  const [reviewSubGrades, setReviewSubGrades] = useState<Grade[]>([]);
  
  const [reviewMatTitle, setReviewMatTitle] = useState("");
  const [reviewMatType, setReviewMatType] = useState<"PDF" | "Video">("PDF");
  const [reviewMatUrl, setReviewMatUrl] = useState("");
  const [selectedReviewSubId, setSelectedReviewSubId] = useState("");

  // Quiz states
  const [quizQuestion, setQuizQuestion] = useState("");
  const [quizOptions, setQuizOptions] = useState(["", "", "", ""]);
  const [quizCorrectAnswer, setQuizCorrectAnswer] = useState(0);
  const [quizDifficulty, setQuizDifficulty] = useState(1);
  const [quizSubjectId, setQuizSubjectId] = useState("");
  
  const [teacherName, setTeacherName] = useState("");
  const [teacherSubjectId, setTeacherSubjectId] = useState("");
  const [teacherAvatar, setTeacherAvatar] = useState("");
  const [materialTeacherId, setMaterialTeacherId] = useState("");

  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filtering states for forms
  const [formGradeFilter, setFormGradeFilter] = useState<Grade | "">("");
  const [formSubjectFilter, setFormSubjectFilter] = useState<string | "">("");
  const [listTeacherFilter, setListTeacherFilter] = useState<string>("");

  const filteredSubjectsForForms = useMemo(() => {
    return subjects.filter(
      (sub) => !formGradeFilter || sub.grades?.includes(formGradeFilter as Grade),
    );
  }, [subjects, formGradeFilter]);

  const filteredChaptersForForms = useMemo(() => {
    return chapters.filter(
      (chap) =>
        selectedSubjectIds.length === 0 ||
        (chap as any).subjectId === selectedSubjectIds[0] || // Simplified or just check first
        (chap as any).subjectIds?.some((sid: any) => selectedSubjectIds.includes(sid)),
    );
  }, [chapters, selectedSubjectIds]);

  const filteredMaterialsForForms = useMemo(() => {
    return materials.filter(
      (mat) =>
        selectedSubjectIds.length === 0 ||
        (mat as any).subjectId === selectedSubjectIds[0] ||
        (mat as any).subjectIds?.some((sid: any) => selectedSubjectIds.includes(sid)),
    );
  }, [materials, selectedSubjectIds]);

  useEffect(() => {
    fetchMaintenanceStatus();
  }, []);

  useEffect(() => {
    // Fetch base dependencies needed across multiple tabs
    if (["subjects", "chapters", "materials", "flashcards", "ministerial", "quiz", "database"].includes(activeTab)) {
      fetchSubjects();
    }
    if (["chapters", "materials", "flashcards", "ministerial", "quiz", "database"].includes(activeTab)) {
      fetchChapters();
    }

    if (activeTab === "materials") {
      fetchMaterials();
      fetchTeachers();
    }
    if (activeTab === "flashcards") fetchFlashcards();
    if (activeTab === "ministerial") fetchMinisterialQuestions();
    if (activeTab === "teachers") fetchTeachers();
    if (activeTab === "reviews") {
      fetchReviewSubjects();
      fetchReviewMaterials();
    }
    if (activeTab === "quiz") fetchQuizQuestions();
    if (activeTab === "news") fetchNews();
    if (activeTab === "database") {
      fetchMaterials();
      fetchFlashcards();
      fetchMinisterialQuestions();
      fetchReviewSubjects();
      fetchReviewMaterials();
      fetchQuizQuestions();
    }
  }, [activeTab]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins();
    }
  }, [isSuperAdmin]);

  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState<string | null>(null);

  const fetchMinisterialQuestions = async () => {
    try {
      const snap = await getDocs(collection(db, "ministerial_questions"));
      setMinisterialQuestions(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    } catch (err) {
      console.error("Error fetching ministerial questions:", err);
    }
  };

  const fetchAdmins = async () => {
    if (!isSuperAdmin) return;
    const list = await getAdmins();
    setAdminEmails(list);
  };

  const fetchTeachers = async () => {
    try {
      const snap = await getDocs(collection(db, "teachers"));
      setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));
    } catch (err) {
      console.error("Error fetching teachers:", err);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) return;
    setLoading(true);
    try {
      await addAdmin(newAdminEmail);
      setNewAdminEmail("");
      await fetchAdmins();
      showToast("success", "تمت إضافة المسؤول بنجاح");
    } catch (err) {
      showToast("error", "فشل إجراء إضافة المسؤول");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (confirmDeleteEmail !== email) {
      setConfirmDeleteEmail(email);
      setTimeout(() => setConfirmDeleteEmail(null), 3000);
      return;
    }

    setLoading(true);
    try {
      await removeAdmin(email);
      await fetchAdmins();
      setConfirmDeleteEmail(null);
      showToast("success", "تم سحب الصلاحيات بنجاح");
    } catch (err) {
      console.error("Remove admin error:", err);
      showToast("error", "فشل في سحب الصلاحيات");
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceStatus = async () => {
    try {
      const { getDoc } = await import("firebase/firestore");
      const docRef = doc(db, "settings", "maintenance");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setIsMaintenanceActive(docSnap.data().active === true);
      } else {
        setIsMaintenanceActive(false);
      }
    } catch (err) {
      console.error("Error fetching maintenance status:", err);
    }
  };

  const showToast = (type: "success" | "error", message: string) => {
    if (type === "success") setSuccess(message);
    else setError(message);
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 3000);
  };

  const fetchSubjects = async () => {
    const q = query(collection(db, "subjects"), orderBy("name"));
    const snapshot = await getDocs(q);
    setSubjects(
      snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Subject),
    );
  };

  const fetchChapters = async () => {
    const snapshot = await getDocs(collection(db, "chapters"));
    setChapters(
      snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Chapter),
    );
  };

  const fetchMaterials = async () => {
    const snapshot = await getDocs(collection(db, "materials"));
    setMaterials(
      snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Material),
    );
  };

  const fetchNews = async () => {
    try {
      const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching news:", err);
    }
  };

  const fetchFlashcards = async () => {
    const snapshot = await getDocs(collection(db, "flashcards"));
    setFlashcards(
      snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Flashcard),
    );
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isBulkMode) {
        const lines = bulkInput.split("\n").filter((l) => l.trim().length > 0);
        for (const line of lines) {
          await addDoc(collection(db, "subjects"), {
            name: line.trim(),
            grades: selectedGrades,
          });
        }
        showToast("success", `تمت إضافة ${lines.length} مواد بنجاح`);
        setBulkInput("");
      } else {
        if (editingId) {
          await updateDoc(doc(db, "subjects", editingId), {
            name: subjectName,
            grades: selectedGrades,
          });
          showToast("success", "تم تعديل المادة بنجاح");
        } else {
          await addDoc(collection(db, "subjects"), {
            name: subjectName,
            grades: selectedGrades,
          });
          showToast("success", "تمت إضافة المادة بنجاح");
        }
      }
      setSubjectName("");
      setSelectedGrades([]);
      setEditingId(null);
      fetchSubjects();
    } catch (err) {
      showToast("error", "فشل الإجراء");
    } finally {
      setLoading(false);
    }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubjectIds.length === 0) return;
    setLoading(true);
    try {
      if (isBulkMode) {
        const lines = bulkInput.split("\n").filter((l) => l.trim().length > 0);
        for (const line of lines) {
          await addDoc(collection(db, "chapters"), {
            name: line.trim(),
            subjectIds: selectedSubjectIds,
          });
        }
        showToast("success", `تمت إضافة ${lines.length} فصول بنجاح`);
        setBulkInput("");
      } else {
        if (editingId) {
          await updateDoc(doc(db, "chapters", editingId), {
            name: chapterName,
            subjectIds: selectedSubjectIds,
          });
          showToast("success", "تم تعديل الفصل بنجاح");
        } else {
          await addDoc(collection(db, "chapters"), {
            name: chapterName,
            subjectIds: selectedSubjectIds,
          });
          showToast("success", "تمت إضافة الفصل بنجاح");
        }
      }
      setChapterName("");
      setEditingId(null);
      fetchChapters();
    } catch (err) {
      showToast("error", "فشل الإجراء");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "news", editingId), {
          title: newsTitle,
          content: newsContent,
          imageUrl: newsImage,
          category: newsCategory,
          updatedAt: new Date().toISOString()
        });
        showToast("success", "تم تعديل الخبر بنجاح");
      } else {
        await addDoc(collection(db, "news"), {
          title: newsTitle,
          content: newsContent,
          imageUrl: newsImage,
          category: newsCategory,
          createdAt: new Date().toISOString()
        });
        showToast("success", "تمت إضافة الخبر بنجاح");
      }
      setNewsTitle("");
      setNewsContent("");
      setNewsImage("");
      setNewsCategory("عام");
      setEditingId(null);
      fetchNews();
    } catch (err) {
      showToast("error", "فشل إضافة الخبر");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedChapterIds.length === 0) return;
    setLoading(true);
    try {
      if (isBulkMode) {
        const lines = bulkInput
          .split("\n")
          .filter((l) => l.trim().includes("|"));
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const [title, url, type] = line.split("|").map((s) => s.trim());
          if (title && url) {
            await addDoc(collection(db, "materials"), {
              title,
              url,
              type: type || "Video",
              chapterIds: selectedChapterIds,
              teacherId: materialTeacherId,
              order_index: materialOrderIndex + i,
            });
          }
        }
        showToast("success", `تمت إضافة ${lines.length} محاضرات بنجاح`);
        setBulkInput("");
      } else {
        if (editingId) {
          await updateDoc(doc(db, "materials", editingId), {
            title: materialTitle,
            type: materialType,
            url: materialUrl,
            chapterIds: selectedChapterIds,
            teacherId: materialTeacherId,
            order_index: materialOrderIndex,
          });
          showToast("success", "تم تعديل المحتوى بنجاح");
        } else {
          await addDoc(collection(db, "materials"), {
            title: materialTitle,
            type: materialType,
            url: materialUrl,
            chapterIds: selectedChapterIds,
            teacherId: materialTeacherId,
            order_index: materialOrderIndex,
          });
          showToast("success", "تمت إضافة المحتوى بنجاح");
        }
      }
      setMaterialTitle("");
      setMaterialUrl("");
      setMaterialOrderIndex(0);
      setEditingId(null);
      fetchMaterials();
    } catch (err) {
      showToast("error", "فشل الإجراء");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedChapterIds.length === 0) return;
    setLoading(true);
    try {
      if (isBulkMode) {
        const lines = bulkInput
          .split("\n")
          .filter((l) => l.trim().includes("|"));
        for (const line of lines) {
          const [q, a] = line.split("|").map((s) => s.trim());
          if (q && a) {
            await addDoc(collection(db, "flashcards"), {
              question: q,
              answer: a,
              chapterIds: selectedChapterIds,
            });
          }
        }
        showToast("success", `تمت إضافة ${lines.length} بطاقات بنجاح`);
        setBulkInput("");
      } else {
        if (editingId) {
          await updateDoc(doc(db, "flashcards", editingId), {
            question: flashcardQuestion,
            answer: flashcardAnswer,
            chapterIds: selectedChapterIds,
          });
          showToast("success", "تم تعديل البطاقة بنجاح");
        } else {
          await addDoc(collection(db, "flashcards"), {
            question: flashcardQuestion,
            answer: flashcardAnswer,
            chapterIds: selectedChapterIds,
          });
          showToast("success", "تمت إضافة البطاقة بنجاح");
        }
        setFlashcardQuestion("");
        setFlashcardAnswer("");
      }
      setEditingId(null);
      fetchFlashcards();
    } catch (err) {
      showToast("error", "فشل الإجراء");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMinisterialQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedChapterIds.length === 0) return;
    setLoading(true);
    try {
      if (isBulkMode) {
        const lines = bulkInput
          .split("\n")
          .filter((l) => l.trim().includes("|"));
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const parts = line.split("|").map((s) => s.trim());
          if (parts.length >= 3) {
            const [q, a, y] = parts;
            await addDoc(collection(db, "ministerial_questions"), {
              question: q,
              answer: a,
              year: y,
              chapterIds: selectedChapterIds,
              order_index: minQuestOrderIndex + i,
            });
          }
        }
        showToast("success", `تمت إضافة ${lines.length} أسئلة بنجاح`);
        setBulkInput("");
      } else {
        if (editingId) {
          await updateDoc(doc(db, "ministerial_questions", editingId), {
            question: minQuestText,
            answer: minQuestAnswer,
            year: minQuestYear,
            chapterIds: selectedChapterIds,
            order_index: minQuestOrderIndex,
          });
          showToast("success", "تم تعديل السؤال بنجاح");
        } else {
          await addDoc(collection(db, "ministerial_questions"), {
            question: minQuestText,
            answer: minQuestAnswer,
            year: minQuestYear,
            chapterIds: selectedChapterIds,
            order_index: minQuestOrderIndex,
          });
          showToast("success", "تمت إضافة السؤال بنجاح");
        }
        setMinQuestText("");
        setMinQuestAnswer("");
        setMinQuestYear("");
      }
      setMinQuestOrderIndex(0);
      setEditingId(null);
      fetchMinisterialQuestions();
    } catch (err) {
      showToast("error", "فشل الإجراء");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        name: teacherName,
        subjectId: teacherSubjectId,
        avatar: teacherAvatar || ""
      };

      if (editingId) {
        await updateDoc(doc(db, "teachers", editingId), data);
        showToast("success", "تم تعديل المدرس بنجاح");
      } else {
        await addDoc(collection(db, "teachers"), data);
        showToast("success", "تمت إضافة المدرس بنجاح");
      }
      setTeacherName("");
      setTeacherSubjectId("");
      setTeacherAvatar("");
      setEditingId(null);
      fetchTeachers();
    } catch (err) {
      showToast("error", "فشل الإجراء");
    } finally {
      setLoading(false);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{coll: string, id: string, refresh: () => void} | null>(null);

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const { coll, id, refresh } = deleteConfirm;
    try {
      await deleteDoc(doc(db, coll, id));
      showToast("success", "تم الحذف بنجاح");
      refresh();
    } catch (err: any) {
      console.error("Delete error:", err);
      showToast("error", err.message || "فشل الحذف");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleDelete = (
    coll: string,
    id: string,
    refresh: () => void,
  ) => {
    setDeleteConfirm({ coll, id, refresh });
  };

  const fetchReviewSubjects = async () => {
    try {
      const q = query(collection(db, "review_subjects"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setReviewSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching review subjects:", err);
    }
  };

  const fetchReviewMaterials = async () => {
    try {
      const q = query(collection(db, "review_materials"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setReviewMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching review materials:", err);
    }
  };

  const fetchQuizQuestions = async () => {
    try {
      const snap = await getDocs(collection(db, "quiz_questions"));
      setQuizQuestions(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    } catch (err) {
      console.error("Error fetching quiz questions:", err);
    }
  };

  const handleAddReviewSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewSubGrades.length === 0) return showToast("error", "اختر صفاً واحداً على الأقل");
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "review_subjects", editingId), {
          name: reviewSubName,
          gradeIds: reviewSubGrades,
        });
        showToast("success", "تم تعديل المادة بنجاح");
      } else {
        await addDoc(collection(db, "review_subjects"), {
          name: reviewSubName,
          gradeIds: reviewSubGrades,
          createdAt: new Date().toISOString()
        });
        showToast("success", "تمت إضافة المادة بنجاح");
      }
      setReviewSubName("");
      setReviewSubGrades([]);
      setEditingId(null);
      fetchReviewSubjects();
    } catch (err) {
      showToast("error", "فشل الإجراء");
    } finally {
      setLoading(false);
    }
  };

  const handleAddReviewMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewSubId) return showToast("error", "اختر مادة أولاً");
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "review_materials", editingId), {
          title: reviewMatTitle,
          type: reviewMatType,
          url: reviewMatUrl,
          reviewSubjectId: selectedReviewSubId
        });
        showToast("success", "تم تعديل الملف بنجاح");
      } else {
        await addDoc(collection(db, "review_materials"), {
          title: reviewMatTitle,
          type: reviewMatType,
          url: reviewMatUrl,
          reviewSubjectId: selectedReviewSubId,
          createdAt: new Date().toISOString()
        });
        showToast("success", "تمت إضافة الملف بنجاح");
      }
      setReviewMatTitle("");
      setReviewMatUrl("");
      setEditingId(null);
      fetchReviewMaterials();
    } catch (err) {
      showToast("error", "فشل الإجراء");
    } finally {
      setLoading(false);
    }
  };

  const resetReviewForm = () => {
    setReviewSubName("");
    setReviewSubGrades([]);
    setReviewMatTitle("");
    setReviewMatType("PDF");
    setReviewMatUrl("");
    setSelectedReviewSubId("");
    setEditingId(null);
  };

  const handleAddQuizQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        question: quizQuestion,
        options: quizOptions,
        correctAnswer: quizCorrectAnswer,
        difficulty: quizDifficulty,
        subjectId: quizSubjectId,
      };

      if (editingId) {
        await updateDoc(doc(db, "quiz_questions", editingId), data);
        showToast("success", "تم تعديل السؤال بنجاح");
      } else {
        await addDoc(collection(db, "quiz_questions"), data);
        showToast("success", "تمت إضافة السؤال بنجاح");
      }
      resetQuizForm();
      fetchQuizQuestions();
    } catch (err) {
      showToast("error", "فشل الإجراء");
    } finally {
      setLoading(false);
    }
  };

  const resetQuizForm = () => {
    setQuizQuestion("");
    setQuizOptions(["", "", "", ""]);
    setQuizCorrectAnswer(0);
    setQuizDifficulty(1);
    setQuizSubjectId("");
    setEditingId(null);
  };

  const handleToggleMaintenance = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      await setMaintenanceMode(!isMaintenanceActive);
      setIsMaintenanceActive(!isMaintenanceActive);
      showToast(
        "success",
        `تم ${!isMaintenanceActive ? "تفعيل" : "إيقاف"} وضع الصيانة بنجاح`,
      );
    } catch (err) {
      showToast("error", "فشل تغيير وضع الصيانة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#FDFDFD] font-['Inter'] selection:bg-blue-100 selection:text-blue-900"
      dir="rtl"
    >
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-slate-100 p-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
            <Database size={16} />
          </div>
          <h2 className="font-black text-slate-900 text-sm">لوحة الإدارة</h2>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
        >
          {isMobileMenuOpen ? (
            <Plus className="rotate-45" size={24} />
          ) : (
            <div className="space-y-1.5">
              <div className="w-6 h-0.5 bg-current rounded-full" />
              <div className="w-4 h-0.5 bg-current rounded-full" />
              <div className="w-6 h-0.5 bg-current rounded-full" />
            </div>
          )}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <div className="flex flex-col lg:flex-row min-h-screen">
        <aside
          className={`
          ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
          lg:w-72 bg-white border-l border-slate-100 p-6 flex flex-col gap-8 fixed lg:sticky top-[65px] lg:top-0 right-0 h-[calc(100vh-65px)] lg:h-screen w-full lg:z-20 z-40 transition-transform duration-300 ease-in-out overflow-y-auto
        `}
        >
          <div className="hidden lg:flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <Database size={20} />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-lg leading-tight">
                لوحة الإدارة
              </h2>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                Master Panel v2
              </p>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <button
              onClick={() => {
                onBack();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-4 rounded-2xl text-blue-600 hover:bg-blue-50 transition-all duration-300 font-black text-sm mb-2"
            >
              <ArrowRight size={20} />
              العودة للمنصة الرئيسية
            </button>
            {[
              { id: "classes", icon: School, label: "إدارة الصفوف" },
              { id: "subjects", icon: Book, label: "إدارة المواد" },
              { id: "chapters", icon: Layers, label: "إدارة الفصول" },
              { id: "materials", icon: Youtube, label: "المحاضرات وملفات" },
              {
                id: "flashcards",
                icon: HelpCircle,
                label: "البطاقات التعليمية",
              },
              {
                id: "ministerial",
                icon: ShieldAlert,
                label: "الأسئلة الوزارية",
              },
              {
                id: "teachers",
                icon: GraduationCap,
                label: "إدارة المدرسين",
              },
              {
                id: "reviews",
                icon: FileText,
                label: "المراجعات المركزة",
              },
              {
                id: "quiz",
                icon: HelpCircle,
                label: "مسابقة المليون",
              },
              {
                id: "news",
                icon: MessageSquare,
                label: "أخر الأخبار",
              },
              { id: "database", icon: Database, label: "النسخ الاحتياطي" },
              { id: "settings", icon: Wrench, label: "إعدادات النظام" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setEditingId(null);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between px-4 py-4 rounded-2xl transition-all duration-300 font-black text-sm group ${
                  activeTab === item.id
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-100 translate-x-1"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    size={20}
                    className={
                      activeTab === item.id
                        ? "text-white"
                        : "text-slate-400 group-hover:text-slate-900"
                    }
                  />
                  {item.label}
                </div>
                {activeTab === item.id && <ChevronLeft size={16} />}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 px-3 mb-6">
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-xs">
                {user?.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 truncate">
                  {user?.email}
                </p>
                <p className="text-[10px] text-slate-400 font-bold">المسؤول</p>
              </div>
            </div>
            <button
              onClick={() => signOut(auth)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-sm hover:bg-red-100 transition-colors"
            >
              <LogOut size={18} />
              تسجيل الخروج
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-10">
          <div className="max-w-5xl mx-auto space-y-8 md:space-y-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <div className="w-6 h-1 bg-blue-600 rounded-full" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">
                    System Overview
                  </span>
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                  {activeTab === "classes" && "إدارة الصفوف والظهور"}
                  {activeTab === "subjects" && "إدارة المواد"}
                  {activeTab === "chapters" && "إدارة الفصول"}
                  {activeTab === "materials" && "إدارة المحاضرات"}
                  {activeTab === "flashcards" && "إدارة البطاقات"}
                  {activeTab === "ministerial" && "إدارة الأسئلة الوزارية"}
                  {activeTab === "reviews" && "إدارة المراجعات المركزة"}
                  {activeTab === "quiz" && "إدارة مسابقة المليون"}
                  {activeTab === "news" && "إدارة أخر الأخبار"}
                  {activeTab === "database" && "النسخ الاحتياطي"}
                  {activeTab === "settings" && "إعدادات النظام"}
                </h1>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl">
                <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-black">
                    حالة النظام
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-black text-slate-700">
                      متصل الآن
                    </span>
                  </div>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div
                className={
                  activeTab === "database" || activeTab === "settings"
                    ? "lg:col-span-12"
                    : "lg:col-span-7"
                }
              >
                {activeTab === "database" ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm shadow-slate-100/50">
                    <div className="space-y-6">
                      <div className="p-6 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                          <Database size={28} />
                        </div>
                        <div>
                          <h3 className="font-black text-blue-900 text-lg">
                            النسخ الاحتياطي السحابي
                          </h3>
                          <p className="text-blue-700/70 text-sm font-medium leading-relaxed">
                            تتم مزامنة جميع البيانات تلقائياً مع خوادم Firebase
                            بشكل لحظي.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <h4 className="text-[10px] text-slate-400 font-black mb-1 uppercase">
                            إجمالي المواد
                          </h4>
                          <p className="text-3xl font-black text-slate-900">
                            {subjects.length}
                          </p>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <h4 className="text-[10px] text-slate-400 font-black mb-1 uppercase">
                            إجمالي المحاضرات
                          </h4>
                          <p className="text-3xl font-black text-slate-900">
                            {materials.length}
                          </p>
                        </div>
                      </div>

                      <div className="p-6 rounded-xl bg-slate-900 text-white space-y-4">
                        <div className="flex items-center gap-3">
                          <ShieldAlert className="text-amber-400" />
                          <h4 className="font-black">منطقة حساسة</h4>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">
                          هذا القسم مخصص لمراقبة سلامة البيانات ونزاهتها. لا تقم
                          بتغيير الإعدادات إلا إذا كنت تعرف ما تفعله.
                        </p>
                        <button
                          disabled
                          className="w-full py-4 bg-slate-800 rounded-2xl font-black text-sm opacity-50 cursor-not-allowed"
                        >
                          بدء تصدير البيانات (JSON)
                        </button>
                      </div>
                    </div>
                  </div>
                ) : activeTab === "settings" ? (
                  <div className="space-y-8">
                    <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm shadow-slate-100/50 overflow-hidden relative">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-slate-900 mb-1">
                            <Wrench className="text-amber-600" size={24} />
                            <h3 className="text-xl font-black">
                              وضع صيانة المنصة
                            </h3>
                          </div>
                          <p className="text-slate-500 font-medium leading-relaxed max-w-lg">
                            عند تفعيل هذا الوضع، ستتوقف المنصة عن العمل لجميع
                            المستخدمين والزوار، ولن يتمكن من الدخول سوى المدير
                            الرئيسي.
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <span
                            className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tighter ${
                              isMaintenanceActive
                                ? "bg-red-100 text-red-600"
                                : "bg-emerald-100 text-emerald-600"
                            }`}
                          >
                            {isMaintenanceActive ? "نشط الآن" : "متوقف"}
                          </span>
                          <button
                            onClick={handleToggleMaintenance}
                            disabled={loading || !isSuperAdmin}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              isMaintenanceActive
                                ? "bg-blue-600"
                                : "bg-slate-200"
                            } ${!isSuperAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                isMaintenanceActive
                                  ? "-translate-x-8"
                                  : "-translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      {!isSuperAdmin && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                          <ShieldAlert size={20} />
                          <p className="text-sm font-bold">
                            هذه الإعدادات متاحة فقط للمطور الرئيسي.
                          </p>
                        </div>
                      )}
                      <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50" />
                    </div>

                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex items-center gap-4">
                      <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm">
                        <LayoutGrid size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-blue-900">
                          إشعار النظام
                        </h4>
                        <p className="text-blue-700 text-sm font-medium leading-relaxed">
                          يرجى الحذر عند استخدام هذه الميزات. تأكد من إيقاف وضع
                          الصيانة بعد انتهاء أعمالك.
                        </p>
                      </div>
                    </div>

                    {isSuperAdmin && (
                      <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm shadow-slate-100/50 space-y-6">
                        <div className="flex items-center gap-3 border-r-4 border-purple-500 pr-3">
                          <ShieldAlert className="text-purple-600" size={24} />
                          <h3 className="text-xl font-black text-slate-900">
                            إدارة فريق العمل
                          </h3>
                        </div>

                        <div className="flex gap-3">
                          <input
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            className="flex-1 p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-purple-100 font-bold"
                            placeholder="إيميل المسؤول الجديد..."
                          />
                          <button
                            onClick={handleAddAdmin}
                            disabled={loading || !newAdminEmail}
                            className="px-8 bg-purple-600 text-white rounded-xl font-black hover:bg-purple-700 transition-all disabled:opacity-50"
                          >
                            {loading ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              "إضافة"
                            )}
                          </button>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">
                            المدراء الحاليون
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {adminEmails.map((email) => (
                              <div
                                key={email}
                                className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-purple-600 font-black text-xs">
                                    {email[0].toUpperCase()}
                                  </div>
                                  <span className="text-sm font-bold text-slate-700 truncate">
                                    {email}
                                  </span>
                                </div>
                                {email !== ADMIN_EMAIL && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleRemoveAdmin(email);
                                    }}
                                    disabled={loading}
                                    className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-95 touch-manipulation ${
                                      confirmDeleteEmail === email
                                        ? "bg-red-600 text-white animate-pulse"
                                        : "text-red-500 hover:bg-red-50 bg-red-50/50"
                                    }`}
                                    title={
                                      confirmDeleteEmail === email
                                        ? "انقر مرة أخرى للتأكيد"
                                        : "سحب الصلاحيات"
                                    }
                                  >
                                    {confirmDeleteEmail === email ? (
                                      <ShieldAlert size={20} />
                                    ) : (
                                      <Trash2 size={20} />
                                    )}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm shadow-slate-100/50"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black text-slate-900 border-r-4 border-blue-500 pr-3">
                          {editingId ? "تعديل البيانات" : "إضافة بيانات جديدة"}
                        </h3>
                        <button
                          onClick={() => setIsBulkMode(!isBulkMode)}
                          className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-100 transition-colors"
                        >
                          {isBulkMode ? "الوضع العادي" : "وضع الإضافة الجماعية"}
                        </button>
                      </div>

                      {activeTab === "classes" && (
                        <div className="space-y-6">
                          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <h3 className="font-black text-slate-800 text-lg mb-4">
                              إضافة صف جديد
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">
                                  المرحلة الأساسية
                                </label>
                                <select
                                  id="stageSelect"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-bold"
                                >
                                  {stages.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">
                                  معرف الصف (بالانجليزي حروف صغيرة، مثلا:
                                  primary_1)
                                </label>
                                <input
                                  id="gradeId"
                                  placeholder="مثال: primary_1"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">
                                  اسم الصف (يظهر للطلاب)
                                </label>
                                <input
                                  id="gradeLabel"
                                  placeholder="مثال: الأول الابتدائي"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">
                                  وصف إضافي (اختياري)
                                </label>
                                <input
                                  id="gradeDesc"
                                  placeholder="مثال: مرحلة وزارية"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-bold"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const sid = (
                                  document.getElementById(
                                    "stageSelect",
                                  ) as HTMLSelectElement
                                ).value;
                                const gid = (
                                  document.getElementById(
                                    "gradeId",
                                  ) as HTMLInputElement
                                ).value;
                                const glabel = (
                                  document.getElementById(
                                    "gradeLabel",
                                  ) as HTMLInputElement
                                ).value;
                                const gdesc = (
                                  document.getElementById(
                                    "gradeDesc",
                                  ) as HTMLInputElement
                                ).value;
                                if (!gid || !glabel) {
                                  alert("يرجى ملء معرف الصف والاسم");
                                  return;
                                }
                                addGrade(sid, {
                                  id: gid,
                                  label: glabel,
                                  description: gdesc,
                                });
                                (
                                  document.getElementById(
                                    "gradeId",
                                  ) as HTMLInputElement
                                ).value = "";
                                (
                                  document.getElementById(
                                    "gradeLabel",
                                  ) as HTMLInputElement
                                ).value = "";
                                (
                                  document.getElementById(
                                    "gradeDesc",
                                  ) as HTMLInputElement
                                ).value = "";
                              }}
                              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 shadow-sm shadow-blue-100"
                            >
                              <Plus size={20} />
                              إضافة الصف
                            </button>
                          </div>

                          <div className="space-y-6">
                            <h3 className="font-black text-slate-800 text-xl">
                              الصفوف الحالية (إدارة الظهور)
                            </h3>
                            {stages.map((stage) => (
                              <div
                                key={stage.id}
                                className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden ${stage.isHidden ? "opacity-75 grayscale" : ""}`}
                              >
                                <div
                                  className={`absolute top-0 right-0 w-2 h-full bg-${stage.color}-500`}
                                />
                                <div className="flex items-center justify-between mb-4 pr-4">
                                  <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                    {stage.label}
                                    {stage.isHidden && (
                                      <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                                        مخفي
                                      </span>
                                    )}
                                  </h4>
                                  <button
                                    onClick={() => toggleStageVisibility(stage.id)}
                                    className={`p-2 rounded-lg transition-colors ${stage.isHidden ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                                    title={
                                      stage.isHidden ? "إظهار المرحلة" : "إخفاء المرحلة"
                                    }
                                  >
                                    {stage.isHidden ? (
                                      <EyeOff size={18} />
                                    ) : (
                                      <Eye size={18} />
                                    )}
                                  </button>
                                </div>
                                {stage.grades.length === 0 ? (
                                  <p className="text-sm text-slate-400 font-medium italic pr-4">
                                    لا توجد صفوف في هذا القسم، سيتم إخفاؤه عن
                                    الطلاب.
                                  </p>
                                ) : (
                                  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 pr-4">
                                    {stage.grades.map((g) => (
                                      <div
                                        key={g.id}
                                        className={`flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 ${g.isHidden ? "opacity-60" : ""}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="flex flex-col">
                                            <p className="font-bold text-slate-800 text-sm">
                                              {g.label}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-mono mt-1">
                                              {g.id}
                                            </p>
                                          </div>
                                          {g.isHidden && (
                                            <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">
                                              مخفي
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() =>
                                              toggleGradeVisibility(stage.id, g.id)
                                            }
                                            className={`p-2 rounded-lg transition-all ${g.isHidden ? "text-red-600" : "text-slate-400 hover:text-slate-600"}`}
                                            title={
                                              g.isHidden ? "إظهار الصف" : "إخفاء الصف"
                                            }
                                          >
                                            {g.isHidden ? (
                                              <EyeOff size={16} />
                                            ) : (
                                              <Eye size={16} />
                                            )}
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (
                                                confirm(
                                                  `هل أنت متأكد من حذف ${g.label}؟ هذا قد يسبب مشاكل في حال وجود طلاب بهذا الصف.`,
                                                )
                                              ) {
                                                removeGrade(stage.id, g.id);
                                              }
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeTab === "subjects" && (
                        <form onSubmit={handleAddSubject} className="space-y-6">
                          <div>
                            <label className="block text-sm font-black text-slate-700 mb-2">
                              {isBulkMode
                                ? "أسماء المواد (كل مادة في سطر)"
                                : "اسم المادة"}
                            </label>
                            {isBulkMode ? (
                              <textarea
                                value={bulkInput}
                                onChange={(e) => setBulkInput(e.target.value)}
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold min-h-[150px]"
                                placeholder="اللغة العربية\nاللغة الإنجليزية"
                              />
                            ) : (
                              <input
                                value={subjectName}
                                onChange={(e) => setSubjectName(e.target.value)}
                                required={!isBulkMode}
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                placeholder="مثال: اللغة العربية"
                              />
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-black text-slate-700 mb-4">
                              اختر المراحل الدراسية (تعدد اختيار)
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {[
                                { id: "primary_1", label: "الأول الابتدائي" },
                                { id: "primary_2", label: "الثاني الابتدائي" },
                                { id: "primary_3", label: "الثالث الابتدائي" },
                                { id: "primary_4", label: "الرابع الابتدائي" },
                                { id: "primary_5", label: "الخامس الابتدائي" },
                                { id: "primary_6", label: "السادس الابتدائي" },
                                { id: "middle_1", label: "الأول المتوسط" },
                                { id: "middle_2", label: "الثاني المتوسط" },
                                { id: "middle_3", label: "الثالث المتوسط" },
                                {
                                  id: "secondary_4_sci",
                                  label: "الرابع العلمي",
                                },
                                {
                                  id: "secondary_4_lit",
                                  label: "الرابع الأدبي",
                                },
                                {
                                  id: "secondary_5_sci",
                                  label: "الخامس العلمي",
                                },
                                {
                                  id: "secondary_5_lit",
                                  label: "الخامس الأدبي",
                                },
                                {
                                  id: "secondary_6_sci",
                                  label: "السادس العلمي",
                                },
                                {
                                  id: "secondary_6_lit",
                                  label: "السادس الأدبي",
                                },
                              ].map((g) => (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedGrades((prev) =>
                                      prev.includes(g.id as Grade)
                                        ? prev.filter((x) => x !== g.id)
                                        : [...prev, g.id as Grade],
                                    );
                                  }}
                                  className={`p-3 rounded-2xl text-[10px] font-black border transition-all ${
                                    selectedGrades.includes(g.id as Grade)
                                      ? "bg-blue-600 border-blue-600 text-white shadow-lg"
                                      : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                                  }`}
                                >
                                  {g.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button
                            disabled={loading}
                            className="w-full py-5 bg-blue-600 text-white rounded-xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-100"
                          >
                            {loading ? (
                              <Loader2 className="animate-spin" size={24} />
                            ) : (
                              <Plus size={24} />
                            )}
                            {editingId
                              ? "حفظ التعديلات"
                              : isBulkMode
                                ? "إضافة الكل"
                                : "إضافة المادة للقائمة"}
                          </button>
                        </form>
                      )}

                      {activeTab === "chapters" && (
                        <form onSubmit={handleAddChapter} className="space-y-6">
                          <div className="space-y-4">
                            <label className="block text-sm font-black text-slate-700 mb-2">
                              1. تصفية حسب المرحلة الدراسية
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {allGrades.map((g) => (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() =>
                                    setFormGradeFilter(g.id as Grade)
                                  }
                                  className={`py-2 px-3 rounded-xl text-[9px] font-bold border transition-all ${
                                    formGradeFilter === g.id
                                      ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                  }`}
                                >
                                  {g.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="block text-sm font-black text-slate-700 mb-4 font-black">
                              2. اربط الفصل بالمادة (تعدد اختيار)
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {filteredSubjectsForForms.map((sub) => (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSubjectIds((prev) =>
                                      prev.includes(sub.id)
                                        ? prev.filter((id) => id !== sub.id)
                                        : [...prev, sub.id],
                                    );
                                  }}
                                  className={`p-3 rounded-2xl text-[10px] font-black border transition-all ${
                                    selectedSubjectIds.includes(sub.id)
                                      ? "bg-blue-600 border-blue-600 text-white shadow-lg"
                                      : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                                  }`}
                                >
                                  {sub.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-black text-slate-700 mb-2">
                              {isBulkMode
                                ? "عناوين الفصول (كل فصل في سطر)"
                                : "عنوان الفصل"}
                            </label>
                            {isBulkMode ? (
                              <textarea
                                value={bulkInput}
                                onChange={(e) => setBulkInput(e.target.value)}
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold min-h-[150px]"
                                placeholder="الفصل الأول\nالفصل الثاني"
                              />
                            ) : (
                              <input
                                value={chapterName}
                                onChange={(e) => setChapterName(e.target.value)}
                                required={!isBulkMode}
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                placeholder="مثال: الفصل الأول"
                              />
                            )}
                          </div>

                          <button
                            disabled={
                              loading || selectedSubjectIds.length === 0
                            }
                            className="w-full py-5 bg-blue-600 text-white rounded-xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-100"
                          >
                            {loading ? (
                              <Loader2 className="animate-spin" size={24} />
                            ) : (
                              <Plus size={24} />
                            )}
                            {editingId
                              ? "حفظ التعديلات"
                              : isBulkMode
                                ? "إضافة الكل"
                                : "تثبيت الفصل الجديد"}
                          </button>
                        </form>
                      )}

                      {activeTab === "materials" && (
                        <form
                          onSubmit={handleAddMaterial}
                          className="space-y-6"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700 bg-slate-100/50 p-2 rounded-lg inline-block">
                                1. تصفية حسب المرحلة
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                {allGrades.map((g) => (
                                  <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => {
                                      setFormGradeFilter(g.id as Grade);
                                      setFormSubjectFilter("");
                                    }}
                                    className={`py-2 px-1 rounded-xl text-[8px] font-black border transition-all ${
                                      formGradeFilter === g.id
                                        ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                                        : "bg-white border-slate-200 text-slate-400"
                                    }`}
                                  >
                                    {g.label
                                      .replace("الابتدائي", "ب")
                                      .replace("المتوسط", "م")}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700 bg-blue-100/50 p-2 rounded-lg inline-block">
                                2. تصفية حسب المادة
                              </label>
                              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1 border border-slate-50 rounded-2xl">
                                {filteredSubjectsForForms.map((sub) => (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() =>
                                      setFormSubjectFilter(sub.id)
                                    }
                                    className={`py-3 px-2 rounded-xl text-[10px] font-black border transition-all ${
                                      formSubjectFilter === sub.id
                                        ? "bg-blue-600 border-blue-600 text-white shadow-md"
                                        : "bg-white border-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {sub.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="block text-sm font-black text-slate-700 mb-4 font-black bg-emerald-100/50 p-2 rounded-lg inline-block">
                              3. حدد الفصول المستهدفة (تعدد اختيار)
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border border-slate-100 rounded-xl bg-slate-50 custom-scrollbar text-right">
                              {chapters
                                .filter(
                                  (c) =>
                                    !formSubjectFilter ||
                                    (c as any).subjectIds?.includes(formSubjectFilter) ||
                                    (c as any).subjectId === formSubjectFilter,
                                )
                                .map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedChapterIds((prev) =>
                                        prev.includes(c.id)
                                          ? prev.filter((id) => id !== c.id)
                                          : [...prev, c.id],
                                      );
                                    }}
                                    className={`p-3 rounded-2xl text-[10px] font-black border transition-all text-right ${
                                      selectedChapterIds.includes(c.id)
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-white border-slate-100 text-slate-500 hover:bg-slate-100"
                                    }`}
                                  >
                                    {c.name}
                                  </button>
                                ))}
                            </div>
                          </div>

                          {isBulkMode ? (
                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700">
                                الإضافة الجماعية للمحاضرات (العنوان | الرابط |
                                النوع)
                              </label>
                              <textarea
                                value={bulkInput}
                                onChange={(e) => setBulkInput(e.target.value)}
                                className="w-full p-6 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold min-h-[200px]"
                                placeholder={
                                  "المحاضرة 1 | https://url | Video\nملف الشرح | https://url | PDF"
                                }
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-black text-slate-700 mb-2">
                                  عنوان المحتوى
                                </label>
                                <input
                                  value={materialTitle}
                                  onChange={(e) =>
                                    setMaterialTitle(e.target.value)
                                  }
                                  required={!isBulkMode}
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                  placeholder="اسم المحاضرة أو الملف"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-black text-slate-700 mb-2">
                                  نوع الملف
                                </label>
                                <select
                                  value={materialType}
                                  onChange={(e) =>
                                    setMaterialType(e.target.value as any)
                                  }
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                >
                                  <option value="Video">يوتيوب (Video)</option>
                                  <option value="PDF">ملف (PDF)</option>
                                </select>
                              </div>
                              <div className="md:col-span-1">
                                <label className="block text-sm font-black text-slate-700 mb-2">
                                  المدرس المسؤول
                                </label>
                                <select
                                  value={materialTeacherId}
                                  onChange={(e) =>
                                    setMaterialTeacherId(e.target.value)
                                  }
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                >
                                  <option value="">اختر المدرس (اختياري)</option>
                                  {teachers
                                    .filter(t => !formSubjectFilter || t.subjectId === formSubjectFilter || t.id === materialTeacherId)
                                    .map(t => (
                                      <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                              </div>
                              <div className="md:col-span-1">
                                <label className="block text-sm font-black text-slate-700 mb-2">
                                  رابط المحتوى (URL)
                                </label>
                                <input
                                  value={materialUrl}
                                  onChange={(e) =>
                                    setMaterialUrl(e.target.value)
                                  }
                                  required={!isBulkMode}
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                  placeholder="https://..."
                                />
                              </div>
                              <div className="md:col-span-1">
                                <label className="block text-sm font-black text-slate-700 mb-2">
                                  ترتيب ظهور المحاضرة (اختياري)
                                </label>
                                <input
                                  type="number"
                                  value={materialOrderIndex}
                                  onChange={(e) =>
                                    setMaterialOrderIndex(
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                  placeholder="مثال: 1, 2, 3..."
                                  min="0"
                                />
                              </div>
                            </div>
                          )}

                          <button
                            disabled={
                              loading || selectedChapterIds.length === 0
                            }
                            className="w-full py-5 bg-blue-600 text-white rounded-xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-100"
                          >
                            {loading ? (
                              <Loader2 className="animate-spin" size={24} />
                            ) : (
                              <Plus size={24} />
                            )}
                            {editingId
                              ? "حفظ التعديلات"
                              : isBulkMode
                                ? "إضافة الكل"
                                : "إرسال وحفظ المحتوى"}
                          </button>
                        </form>
                      )}

                      {activeTab === "ministerial" && (
                        <form
                          onSubmit={handleAddMinisterialQuestion}
                          className="space-y-6"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700 bg-slate-100/50 p-2 rounded-lg inline-block">
                                1. تصفية حسب المرحلة
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                {allGrades.map((g) => (
                                  <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => {
                                      setFormGradeFilter(g.id as Grade);
                                      setFormSubjectFilter("");
                                    }}
                                    className={`py-2 px-1 rounded-xl text-[8px] font-black border transition-all ${
                                      formGradeFilter === g.id
                                        ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                                        : "bg-white border-slate-200 text-slate-400"
                                    }`}
                                  >
                                    {g.label
                                      .replace("الابتدائي", "ب")
                                      .replace("المتوسط", "م")}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700 bg-blue-100/50 p-2 rounded-lg inline-block">
                                2. تصفية حسب المادة
                              </label>
                              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1 border border-slate-50 rounded-2xl">
                                {subjects
                                  .filter(
                                    (sub) =>
                                      !formGradeFilter ||
                                      sub.grades?.includes(
                                        formGradeFilter as Grade,
                                      ),
                                  )
                                  .map((sub) => (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() =>
                                        setFormSubjectFilter(sub.id)
                                      }
                                      className={`py-3 px-2 rounded-xl text-[10px] font-black border transition-all ${
                                        formSubjectFilter === sub.id
                                          ? "bg-blue-600 border-blue-600 text-white shadow-md"
                                          : "bg-white border-slate-100 text-slate-500"
                                      }`}
                                    >
                                      {sub.name}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="block text-sm font-black text-slate-700 mb-4 font-black bg-amber-100/50 p-2 rounded-lg inline-block">
                              3. اربط السؤال بالفصول (تعدد اختيار)
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border border-slate-100 rounded-xl bg-slate-50 custom-scrollbar text-right">
                              {chapters
                                .filter(
                                  (c) =>
                                    !formSubjectFilter ||
                                    c.subjectIds?.includes(formSubjectFilter),
                                )
                                .map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedChapterIds((prev) =>
                                        prev.includes(c.id)
                                          ? prev.filter((id) => id !== c.id)
                                          : [...prev, c.id],
                                      );
                                    }}
                                    className={`p-3 rounded-2xl text-[10px] font-black border transition-all text-right ${
                                      selectedChapterIds.includes(c.id)
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "bg-white border-slate-100 text-slate-500 hover:bg-slate-100"
                                    }`}
                                  >
                                    {c.name}
                                  </button>
                                ))}
                            </div>
                          </div>

                          {isBulkMode ? (
                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700">
                                الإضافة الجماعية (سؤال | جواب | السنة)
                              </label>
                              <textarea
                                value={bulkInput}
                                onChange={(e) => setBulkInput(e.target.value)}
                                className="w-full p-6 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold min-h-[200px]"
                                placeholder={
                                  "السؤال الأول | الجواب الأول | 2023 الدور الأول\nالسؤال الثاني | الجواب الثاني | 2022 الدور الثاني"
                                }
                              />
                              <div className="space-y-4">
                                <label className="block text-sm font-black text-slate-700">
                                  ترتيب الظهور المبدئي (سيتم تصاعده مع كل سؤال)
                                </label>
                                <input
                                  type="number"
                                  value={minQuestOrderIndex}
                                  onChange={(e) =>
                                    setMinQuestOrderIndex(
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                  placeholder="مثال: 1, 2, 3..."
                                  min="0"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div className="space-y-4">
                                <label className="block text-sm font-black text-slate-700">
                                  ترتيب ظهور السؤال (اختياري)
                                </label>
                                <input
                                  type="number"
                                  value={minQuestOrderIndex}
                                  onChange={(e) =>
                                    setMinQuestOrderIndex(
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                  placeholder="مثال: 1, 2, 3..."
                                  min="0"
                                />
                              </div>
                              <div className="space-y-4">
                                <label className="block text-sm font-black text-slate-700">
                                  نص السؤال الوزاري
                                </label>
                                <textarea
                                  required={!isBulkMode}
                                  value={minQuestText}
                                  onChange={(e) =>
                                    setMinQuestText(e.target.value)
                                  }
                                  placeholder="اكتب السؤال هنا..."
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold min-h-[100px]"
                                />
                              </div>
                              <div className="space-y-4">
                                <label className="block text-sm font-black text-slate-700">
                                  السنة والدور
                                </label>
                                <input
                                  type="text"
                                  required={!isBulkMode}
                                  value={minQuestYear}
                                  onChange={(e) =>
                                    setMinQuestYear(e.target.value)
                                  }
                                  placeholder="مثال: 2023 الدور الأول"
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                />
                              </div>
                              <div className="space-y-4">
                                <label className="block text-sm font-black text-slate-700">
                                  الجواب النموذجي
                                </label>
                                <textarea
                                  required={!isBulkMode}
                                  value={minQuestAnswer}
                                  onChange={(e) =>
                                    setMinQuestAnswer(e.target.value)
                                  }
                                  placeholder="اكتب الجواب هنا..."
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold h-32"
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex gap-4">
                            {editingId && !isBulkMode && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null);
                                  setMinQuestText("");
                                  setMinQuestAnswer("");
                                  setMinQuestYear("");
                                  setMinQuestOrderIndex(0);
                                }}
                                className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-xl font-black flex items-center justify-center gap-2"
                              >
                                إلغاء
                              </button>
                            )}
                            <button
                              disabled={
                                loading || selectedChapterIds.length === 0
                              }
                              className="flex-[2] py-5 bg-blue-600 text-white rounded-xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-100"
                            >
                              {loading ? (
                                <Loader2 className="animate-spin" size={24} />
                              ) : (
                                <Plus size={24} />
                              )}
                              {editingId
                                ? "حفظ التعديلات"
                                : isBulkMode
                                  ? "إضافة الكل"
                                  : "إضافة السؤال"}
                            </button>
                          </div>
                        </form>
                      )}

                      {activeTab === "teachers" && (
                        <form onSubmit={handleAddTeacher} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-black text-slate-700 mb-2">اسم المدرس</label>
                              <input
                                required
                                value={teacherName}
                                onChange={(e) => setTeacherName(e.target.value)}
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                placeholder="مثال: أ. محمد العراقي"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-black text-slate-700 mb-2">المادة (التخصص)</label>
                              <select
                                required
                                value={teacherSubjectId}
                                onChange={(e) => setTeacherSubjectId(e.target.value)}
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                              >
                                <option value="">اختر المادة</option>
                                {subjects.map(sub => (
                                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-black text-slate-700 mb-2">رابط صورة المدرس (اختياري)</label>
                              <input
                                value={teacherAvatar}
                                onChange={(e) => setTeacherAvatar(e.target.value)}
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                placeholder="https://..."
                              />
                            </div>
                          </div>

                          <button
                            disabled={loading}
                            className="w-full py-5 bg-blue-600 text-white rounded-xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-100"
                          >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                            {editingId ? "حفظ التعديلات" : "إضافة المدرس"}
                          </button>
                        </form>
                      )}

                      {activeTab === "reviews" && (
                        <div className="space-y-12">
                          {/* Create Review Subject */}
                          <form onSubmit={handleAddReviewSubject} className="space-y-6 pb-8 border-b border-slate-100">
                            <h3 className="text-lg font-black text-slate-900 border-r-4 border-blue-600 pr-3">1. إنشاء موضوع مراجعة</h3>
                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700">تصفية حسب المرحلة (للمراجعة)</label>
                              <div className="grid grid-cols-3 gap-2">
                                {allGrades.map((g) => (
                                  <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => {
                                      setReviewSubGrades(prev => 
                                        prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]
                                      );
                                    }}
                                    className={`py-2 px-1 rounded-xl text-[8px] font-black border transition-all ${
                                      reviewSubGrades.includes(g.id)
                                        ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                                        : "bg-white border-slate-200 text-slate-400"
                                    }`}
                                  >
                                    {g.label.replace("الابتدائي", "ب").replace("المتوسط", "م")}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700">اسم المادة (مثال: مراجعة الفيزياء)</label>
                              <input
                                required
                                value={reviewSubName}
                                onChange={(e) => setReviewSubName(e.target.value)}
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                placeholder="ادخل اسم مادة المراجعة..."
                              />
                            </div>

                            <button
                              disabled={loading}
                              className="w-full py-5 bg-slate-900 text-white rounded-xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50"
                            >
                              {loading ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                              {editingId ? "حفظ التعديلات" : "إنشاء مادة مراجعة"}
                            </button>
                          </form>

                          {/* Create Review Material */}
                          <form onSubmit={handleAddReviewMaterial} className="space-y-6">
                            <h3 className="text-lg font-black text-slate-900 border-r-4 border-purple-600 pr-3">2. إضافة ملفات/محاضرات للمراجعة</h3>
                            
                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700">اختر مادة المراجعة</label>
                              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-50 rounded-2xl">
                                {reviewSubjects.map((sub) => (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => setSelectedReviewSubId(sub.id)}
                                    className={`py-3 px-2 rounded-xl text-[10px] font-black border transition-all ${
                                      selectedReviewSubId === sub.id
                                        ? "bg-purple-600 border-purple-600 text-white shadow-md"
                                        : "bg-white border-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {sub.name}
                                  </button>
                                ))}
                                {reviewSubjects.length === 0 && <p className="col-span-2 text-center text-xs text-slate-400 py-4 italic">يرجى إنشاء مادة مراجعة أولاً</p>}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <label className="block text-sm font-black text-slate-700">عنوان الملف/المحاضرة</label>
                                <input
                                  required
                                  value={reviewMatTitle}
                                  onChange={(e) => setReviewMatTitle(e.target.value)}
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                  placeholder="العنوان..."
                                />
                              </div>
                              <div className="space-y-4">
                                <label className="block text-sm font-black text-slate-700">نوع المحتوى</label>
                                <select
                                  value={reviewMatType}
                                  onChange={(e) => setReviewMatType(e.target.value as "PDF" | "Video")}
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                >
                                  <option value="PDF">ملف PDF</option>
                                  <option value="Video">محاضرة فيديو</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700">الرابط (رابط PDF أو يوتيوب)</label>
                              <input
                                required
                                value={reviewMatUrl}
                                onChange={(e) => setReviewMatUrl(e.target.value)}
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                placeholder="https://..."
                              />
                            </div>

                            <button
                              disabled={loading}
                              className="w-full py-5 bg-purple-600 text-white rounded-xl font-black flex items-center justify-center gap-2 hover:bg-purple-700 disabled:opacity-50 shadow-sm shadow-purple-100"
                            >
                              {loading ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                              {editingId ? "حفظ التعديلات" : "إضافة إلى المراجعة"}
                            </button>
                          </form>
                        </div>
                      )}

                      {activeTab === "quiz" && (
                        <form onSubmit={handleAddQuizQuestion} className="space-y-6">
                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700">اختر المادة (اختياري)</label>
                              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-50 rounded-2xl">
                                {subjects.map((sub) => (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => setQuizSubjectId(sub.id)}
                                    className={`py-3 px-2 rounded-xl text-[10px] font-black border transition-all ${
                                      quizSubjectId === sub.id
                                        ? "bg-amber-600 border-amber-600 text-white shadow-md"
                                        : "bg-white border-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {sub.name}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700">السؤال</label>
                              <textarea
                                required
                                value={quizQuestion}
                                onChange={(e) => setQuizQuestion(e.target.value)}
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold h-24"
                                placeholder="اكتب السؤال هنا..."
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              {quizOptions.map((opt, i) => (
                                <div key={i} className="space-y-2">
                                  <label className="block text-xs font-black text-slate-500">الخيار {i + 1}</label>
                                  <div className="flex gap-2 items-center">
                                    <input
                                      required
                                      value={opt}
                                      onChange={(e) => {
                                        const newOpts = [...quizOptions];
                                        newOpts[i] = e.target.value;
                                        setQuizOptions(newOpts);
                                      }}
                                      className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 font-bold text-sm"
                                    />
                                    <input
                                      type="radio"
                                      name="correct"
                                      checked={quizCorrectAnswer === i}
                                      onChange={() => setQuizCorrectAnswer(i)}
                                      className="w-5 h-5 text-green-600"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="space-y-4">
                                <label className="block text-sm font-black text-slate-700">المستوى (Difficulty 1-15)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="15"
                                  value={quizDifficulty}
                                  onChange={(e) => setQuizDifficulty(Number(e.target.value))}
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                />
                            </div>

                            <button
                              disabled={loading}
                              className="w-full py-5 bg-blue-600 text-white rounded-xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-100"
                            >
                              {loading ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                              {editingId ? "حفظ التعديلات" : "إضافة السؤال للعبة"}
                            </button>
                        </form>
                      )}

                      {activeTab === "news" && (
                        <form onSubmit={handleAddNews} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <label className="block text-sm font-black text-slate-700">عنوان الخبر</label>
                                <input
                                  required
                                  value={newsTitle}
                                  onChange={(e) => setNewsTitle(e.target.value)}
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                  placeholder="مثال: تنويه هام بخصوص الامتحانات"
                                />
                              </div>
                              <div className="space-y-4">
                                <label className="block text-sm font-black text-slate-700">التصنيف</label>
                                <input
                                  value={newsCategory}
                                  onChange={(e) => setNewsCategory(e.target.value)}
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                  placeholder="مثال: عاجل، تنويه، هام"
                                />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700">رابط الصورة (اختياري)</label>
                              <input
                                value={newsImage}
                                onChange={(e) => setNewsImage(e.target.value)}
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                placeholder="https://..."
                              />
                            </div>

                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700">محتوى الخبر</label>
                              <textarea
                                required
                                value={newsContent}
                                onChange={(e) => setNewsContent(e.target.value)}
                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold h-32"
                                placeholder="اكتب تفاصيل الخبر هنا..."
                              />
                            </div>

                            <button
                              disabled={loading}
                              className="w-full py-5 bg-blue-600 text-white rounded-xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-100"
                            >
                              {loading ? <Loader2 className="animate-spin" size={24} /> : <Plus size={24} />}
                              {editingId ? "حفظ التعديلات" : "إضافة الخبر"}
                            </button>
                        </form>
                      )}

                      {activeTab === "flashcards" && (
                        <form
                          onSubmit={handleAddFlashcard}
                          className="space-y-6"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700 bg-slate-100/50 p-2 rounded-lg inline-block">
                                1. تصفية حسب المرحلة
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                {allGrades.map((g) => (
                                  <button
                                    key={g.id}
                                    type="button"
                                    onClick={() => {
                                      setFormGradeFilter(g.id as Grade);
                                      setFormSubjectFilter("");
                                    }}
                                    className={`py-2 px-1 rounded-xl text-[8px] font-black border transition-all ${
                                      formGradeFilter === g.id
                                        ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                                        : "bg-white border-slate-200 text-slate-400"
                                    }`}
                                  >
                                    {g.label
                                      .replace("الابتدائي", "ب")
                                      .replace("المتوسط", "م")}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700 bg-purple-100/50 p-2 rounded-lg inline-block">
                                2. تصفية حسب المادة
                              </label>
                              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1 border border-slate-50 rounded-2xl">
                                {subjects
                                  .filter(
                                    (sub) =>
                                      !formGradeFilter ||
                                      sub.grades?.includes(
                                        formGradeFilter as Grade,
                                      ),
                                  )
                                  .map((sub) => (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() =>
                                        setFormSubjectFilter(sub.id)
                                      }
                                      className={`py-3 px-2 rounded-xl text-[10px] font-black border transition-all ${
                                        formSubjectFilter === sub.id
                                          ? "bg-purple-600 border-purple-600 text-white shadow-md"
                                          : "bg-white border-slate-100 text-slate-500"
                                      }`}
                                    >
                                      {sub.name}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="block text-sm font-black text-slate-700 mb-4 font-black bg-amber-100/50 p-2 rounded-lg inline-block">
                              3. اربط البطاقة بالفصول (تعدد اختيار)
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border border-slate-100 rounded-xl bg-slate-50 custom-scrollbar text-right">
                              {chapters
                                .filter(
                                  (c) =>
                                    !formSubjectFilter ||
                                    c.subjectIds?.includes(formSubjectFilter),
                                )
                                .map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedChapterIds((prev) =>
                                        prev.includes(c.id)
                                          ? prev.filter((id) => id !== c.id)
                                          : [...prev, c.id],
                                      );
                                    }}
                                    className={`p-3 rounded-2xl text-[10px] font-black border transition-all text-right ${
                                      selectedChapterIds.includes(c.id)
                                        ? "bg-purple-600 border-purple-600 text-white"
                                        : "bg-white border-slate-100 text-slate-500 hover:bg-slate-100"
                                    }`}
                                  >
                                    {c.name}
                                  </button>
                                ))}
                            </div>
                          </div>

                          {isBulkMode ? (
                            <div className="space-y-4">
                              <label className="block text-sm font-black text-slate-700">
                                الإضافة الجماعية للمسودات (سؤال | جواب)
                              </label>
                              <textarea
                                value={bulkInput}
                                onChange={(e) => setBulkInput(e.target.value)}
                                className="w-full p-6 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold min-h-[200px]"
                                placeholder={
                                  "السؤال الأول | الجواب الأول\nالسؤال الثاني | الجواب الثاني"
                                }
                              />
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div>
                                <label className="block text-sm font-black text-slate-700 mb-2">
                                  السؤال (الوجه الأول)
                                </label>
                                <input
                                  value={flashcardQuestion}
                                  onChange={(e) =>
                                    setFlashcardQuestion(e.target.value)
                                  }
                                  required={!isBulkMode}
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-black text-slate-700 mb-2">
                                  الإجابة (الوجه الثاني)
                                </label>
                                <textarea
                                  value={flashcardAnswer}
                                  onChange={(e) =>
                                    setFlashcardAnswer(e.target.value)
                                  }
                                  required={!isBulkMode}
                                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 font-bold h-32"
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex gap-4">
                            {editingId && !isBulkMode && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null);
                                  setFlashcardQuestion("");
                                  setFlashcardAnswer("");
                                }}
                                className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-xl font-black flex items-center justify-center gap-2"
                              >
                                إلغاء
                              </button>
                            )}
                            <button
                              disabled={
                                loading || selectedChapterIds.length === 0
                              }
                              className="flex-[2] py-5 bg-purple-600 text-white rounded-xl font-black flex items-center justify-center gap-2 hover:bg-purple-700 disabled:opacity-50 shadow-sm shadow-purple-100"
                            >
                              {loading ? (
                                <Loader2 className="animate-spin" size={24} />
                              ) : (
                                <Plus size={24} />
                              )}
                              {editingId
                                ? "حفظ التعديلات"
                                : isBulkMode
                                  ? "إضافة الكل"
                                  : "إضافة البطاقة"}
                            </button>
                          </div>
                        </form>
                      )}
                    </motion.div>
                  </>
                )}
              </div>

              {/* List / Preview Side */}
              {activeTab !== "database" &&
                activeTab !== "settings" &&
                activeTab !== "classes" && (
                  <div className="lg:col-span-5 space-y-6">
                    <div className="sticky top-[110px]">
                      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-black text-slate-900 border-r-4 border-blue-500 pr-3">
                            الموجودات الحالية
                          </h4>
                          <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-lg font-black text-slate-400 uppercase">
                            {activeTab === "subjects"
                              ? "أقسام المناهج"
                              : activeTab === "chapters"
                                ? "قائمة الفصول"
                                : activeTab === "materials"
                                  ? "قائمة المحاضرات"
                                  : activeTab === "teachers"
                                    ? "قائمة المدرسين"
                                    : "البطاقات المنشورة"}
                            :{" "}
                            {activeTab === "subjects"
                              ? subjects.length
                              : activeTab === "chapters"
                                ? chapters.length
                                : activeTab === "materials"
                                  ? materials.length
                                  : activeTab === "teachers"
                                    ? teachers.length
                                    : activeTab === "reviews"
                                      ? reviewSubjects.length + reviewMaterials.length
                                      : flashcards.length}
                          </span>
                        </div>

                        {activeTab === "materials" && (
                          <div className="mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <label className="block text-xs font-black text-slate-500 mb-2">تصفية حسب المدرس</label>
                            <select
                              value={listTeacherFilter}
                              onChange={(e) => setListTeacherFilter(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
                            >
                              <option value="">الكل (بدون تصفية)</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name} - {t.subject}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                          {activeTab === "ministerial" &&
                            [...ministerialQuestions]
                              .sort(
                                (a, b) =>
                                  (a.order_index ?? Number.MAX_SAFE_INTEGER) -
                                  (b.order_index ?? Number.MAX_SAFE_INTEGER),
                              )
                              .map((m) => (
                                <div
                                  key={m.id}
                                  onClick={() => {
                                    setEditingId(m.id);
                                    setMinQuestText(m.question);
                                    setMinQuestAnswer(m.answer);
                                    setMinQuestYear(m.year);
                                    setMinQuestOrderIndex(m.order_index || 0);
                                    setSelectedChapterIds(m.chapterIds || []);
                                    setIsBulkMode(false);
                                  }}
                                  className="w-full flex flex-col p-4 bg-slate-50 rounded-2xl group hover:bg-blue-600 hover:text-white transition-all border border-transparent text-right"
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3 w-full">
                                      <ShieldAlert
                                        size={18}
                                        className="group-hover:text-white text-amber-500 shrink-0"
                                      />
                                      <span className="font-bold truncate">
                                        {m.question}
                                      </span>
                                    </div>
                                    <div
 onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(
                                          "ministerial_questions",
                                          m.id,
                                          fetchMinisterialQuestions,
                                        ); }}
 className="p-2 hover:bg-white/20 rounded-lg text-slate-400 group-hover:text-white transition-all shrink-0 z-10 hover:text-white bg-red-50 hover:bg-red-500 text-red-500"
>
 <Trash2 size={16} className="pointer-events-none" />
</div>
                                  </div>
                                  <div className="mt-2 flex items-center gap-4 text-[10px] font-black uppercase">
                                    <span className="bg-white group-hover:bg-blue-700 group-hover:text-white text-slate-500 px-2 py-0.5 rounded border border-slate-100 group-hover:border-blue-500 transition-colors">
                                      {m.year}
                                    </span>
                                    {m.order_index !== undefined && (
                                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                                        ترتيب: {m.order_index}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}

                          {activeTab === "reviews" && (
                            <div className="space-y-8">
                              <div>
                                <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest mb-4">مواضيع المراجعة</h4>
                                <div className="space-y-2">
                                  {reviewSubjects.map((sub) => (
                                    <div
                                      key={sub.id}
                                      className="w-full flex items-center justify-between p-4 bg-slate-100/50 rounded-2xl group hover:border-blue-600 border border-transparent transition-all text-right"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Layers size={18} className="text-blue-500" />
                                        <div>
                                          <div className="font-bold text-slate-900">{sub.name}</div>
                                          <div className="text-[10px] text-slate-500 font-bold">
                                            {sub.gradeIds?.map((gid: string) => allGrades.find(g => g.id === gid)?.label || gid).join(' - ')}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                         <button
                                          onClick={() => {
                                            setEditingId(sub.id);
                                            setReviewSubName(sub.name);
                                            setReviewSubGrades(sub.gradeIds || []);
                                          }}
                                          className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg"
                                        >
                                          <Edit size={16} />
                                        </button>
                                        <button
                                          onClick={() => handleDelete("review_subjects", sub.id, fetchReviewSubjects)}
                                          className="p-2 hover:bg-red-50 text-red-500 rounded-lg"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest mb-4">الملفات والمحاضرات</h4>
                                <div className="space-y-2">
                                  {reviewMaterials.map((mat) => {
                                    const parent = reviewSubjects.find(s => s.id === mat.reviewSubjectId);
                                    return (
                                      <div
                                        key={mat.id}
                                        className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-purple-600 transition-all text-right shadow-sm"
                                      >
                                        <div className="flex items-center gap-3">
                                          {mat.type === 'PDF' ? <FileText size={18} className="text-purple-500" /> : <Youtube size={18} className="text-red-500" />}
                                          <div>
                                            <div className="font-bold text-slate-900">{mat.title}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">
                                              مادة: {parent?.name || 'غير معروف'}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                           <button
                                            onClick={() => {
                                              setEditingId(mat.id);
                                              setReviewMatTitle(mat.title);
                                              setReviewMatType(mat.type);
                                              setReviewMatUrl(mat.url);
                                              setSelectedReviewSubId(mat.reviewSubjectId);
                                            }}
                                            className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg"
                                          >
                                            <Edit size={16} />
                                          </button>
                                          <button
                                            onClick={() => handleDelete("review_materials", mat.id, fetchReviewMaterials)}
                                            className="p-2 hover:bg-red-50 text-red-500 rounded-lg"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                          {activeTab === "quiz" &&
                            quizQuestions.map((q) => (
                              <div
                                key={q.id}
                                onClick={() => {
                                  setEditingId(q.id);
                                  setQuizQuestion(q.question);
                                  setQuizOptions([...q.options]);
                                  setQuizCorrectAnswer(q.correctAnswer);
                                  setQuizDifficulty(q.difficulty);
                                  setQuizSubjectId(q.subjectId || "");
                                  setIsBulkMode(false);
                                }}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-blue-600 hover:text-white transition-all border border-transparent text-right"
                              >
                                <div className="flex items-center gap-3">
                                  <HelpCircle size={18} className="group-hover:text-white text-amber-500" />
                                  <span className="font-bold truncate max-w-[200px]">{q.question}</span>
                                </div>
                                <div
 onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete("quiz_questions", q.id, fetchQuizQuestions); }}
 className="p-2 hover:bg-white/20 rounded-lg text-slate-400 group-hover:text-white transition-all z-10 hover:text-white bg-red-50 hover:bg-red-500 text-red-500"
>
 <Trash2 size={16} className="pointer-events-none" />
</div>
                              </div>
                            ))}

                          {activeTab === "teachers" &&
                            teachers.map((t) => (
                              <div
                                key={t.id}
                                onClick={() => {
                                  setEditingId(t.id);
                                  setTeacherName(t.name);
                                  setTeacherSubjectId(t.subjectId);
                                  setTeacherAvatar(t.avatar || "");
                                  setIsBulkMode(false);
                                }}
                                className="w-full flex cursor-pointer items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-blue-600 hover:text-white transition-all border border-transparent text-right"
                              >
                                <div className="flex items-center gap-3">
                                  {t.avatar ? (
                                    <img src={t.avatar} className="w-8 h-8 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                                  ) : (
                                    <GraduationCap size={18} className="group-hover:text-white text-blue-500" />
                                  )}
                                  <div className="flex flex-col text-right">
                                    <span className="font-bold">{t.name}</span>
                                    <span className="text-[10px] opacity-70">
                                      {subjects.find(s => s.id === t.subjectId)?.name || "بدون مادة"}
                                    </span>
                                  </div>
                                </div>
                                <div
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDelete("teachers", t.id, fetchTeachers);
                                  }}
                                  className="p-3 bg-red-50 hover:bg-red-500 rounded-xl text-red-500 hover:text-white transition-all z-10"
                                >
                                  <Trash2 size={18} className="pointer-events-none" />
                                </div>
                              </div>
                            ))}

                          {activeTab === "subjects" &&
                            subjects.map((s) => (
                              <div
                                key={s.id}
                                onClick={() => {
                                  setEditingId(s.id);
                                  setSubjectName(s.name);
                                  setSelectedGrades(s.grades || []);
                                  setIsBulkMode(false);
                                }}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-blue-600 hover:text-white transition-all border border-transparent text-right"
                              >
                                <div className="flex items-center gap-3">
                                  <Book
                                    size={18}
                                    className="group-hover:text-white text-blue-500"
                                  />
                                  <span className="font-bold">{s.name}</span>
                                </div>
                                <div
 onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(
                                      "subjects",
                                      s.id,
                                      fetchSubjects,
                                    ); }}
 className="p-2 hover:bg-white/20 rounded-lg text-slate-400 group-hover:text-white transition-all z-10 hover:text-white bg-red-50 hover:bg-red-500 text-red-500"
>
 <Trash2 size={16} className="pointer-events-none" />
</div>
                              </div>
                            ))}

                          {activeTab === "chapters" &&
                            chapters.map((c) => (
                              <div
                                key={c.id}
                                onClick={() => {
                                  setEditingId(c.id);
                                  setChapterName(c.name);
                                  setSelectedSubjectIds(c.subjectIds || []);
                                  setIsBulkMode(false);
                                }}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-blue-600 hover:text-white transition-all border border-transparent text-right"
                              >
                                <div className="flex items-center gap-3">
                                  <Layers
                                    size={18}
                                    className="group-hover:text-white text-blue-500"
                                  />
                                  <span className="font-bold">{c.name}</span>
                                </div>
                                <div
 onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(
                                      "chapters",
                                      c.id,
                                      fetchChapters,
                                    ); }}
 className="p-2 hover:bg-white/20 rounded-lg text-slate-400 group-hover:text-white transition-all z-10 hover:text-white bg-red-50 hover:bg-red-500 text-red-500"
>
 <Trash2 size={16} className="pointer-events-none" />
</div>
                              </div>
                            ))}

                          {activeTab === "materials" &&
                            [...materials]
                              .filter((m) => {
                                if (!listTeacherFilter) return true;
                                return (m as any).teacherId === listTeacherFilter;
                              })
                              .sort(
                                (a, b) =>
                                  (a.order_index ?? Number.MAX_SAFE_INTEGER) -
                                  (b.order_index ?? Number.MAX_SAFE_INTEGER),
                              )
                              .map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => {
                                    setEditingId(m.id);
                                    setMaterialTitle(m.title);
                                    setMaterialType(m.type);
                                    setMaterialUrl(m.url);
                                    setMaterialOrderIndex(m.order_index || 0);
                                    setMaterialTeacherId((m as any).teacherId || "");
                                    setSelectedChapterIds(m.chapterIds || []);
                                    setIsBulkMode(false);
                                  }}
                                  className="w-full flex flex-col p-4 bg-slate-50 rounded-2xl group hover:bg-blue-600 hover:text-white transition-all border border-transparent text-right"
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3">
                                      {m.type === "Video" ? (
                                        <Youtube
                                          size={18}
                                          className="group-hover:text-white text-red-500"
                                        />
                                      ) : (
                                        <FileText
                                          size={18}
                                          className="group-hover:text-white text-blue-500"
                                        />
                                      )}
                                      <span className="font-bold">
                                        {m.title}
                                      </span>
                                    </div>
                                    <div
 onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(
                                          "materials",
                                          m.id,
                                          fetchMaterials,
                                        ); }}
 className="p-2 hover:bg-white/20 rounded-lg text-slate-400 group-hover:text-white transition-all z-10 hover:text-white bg-red-50 hover:bg-red-500 text-red-500"
>
 <Trash2 size={16} className="pointer-events-none" />
</div>
                                  </div>
                                  <div className="mt-2 flex items-center gap-4 text-[10px] font-black uppercase">
                                    <span className="bg-white group-hover:bg-blue-700 group-hover:text-white text-slate-500 px-2 py-0.5 rounded border border-slate-100 group-hover:border-blue-500 transition-colors">
                                      {m.type}
                                    </span>
                                    {m.order_index !== undefined && (
                                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                                        ترتيب: {m.order_index}
                                      </span>
                                    )}
                                    {(m as any).teacherId && (
                                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                                        المدرس: {teachers.find(t => t.id === (m as any).teacherId)?.name}
                                      </span>
                                    )}
                                    <span className="opacity-60 group-hover:opacity-100 italic">
                                      انقر لإجراء تعديل
                                    </span>
                                  </div>
                                </button>
                              ))}

                          {activeTab === "flashcards" &&
                            flashcards.map((f) => (
                              <button
                                key={f.id}
                                onClick={() => {
                                  setEditingId(f.id);
                                  setFlashcardQuestion(f.question);
                                  setFlashcardAnswer(f.answer);
                                  setSelectedChapterIds(f.chapterIds || []);
                                  setIsBulkMode(false);
                                }}
                                className="w-full flex flex-col p-4 bg-slate-50 rounded-2xl group hover:bg-purple-600 hover:text-white transition-all border border-transparent text-right"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-3">
                                    <HelpCircle
                                      size={18}
                                      className="group-hover:text-white text-purple-500"
                                    />
                                    <span className="font-bold truncate max-w-[200px]">
                                      {f.question}
                                    </span>
                                  </div>
                                  <div
 onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(
                                        "flashcards",
                                        f.id,
                                        fetchFlashcards,
                                      ); }}
 className="p-2 hover:bg-white/20 rounded-lg text-slate-400 group-hover:text-white transition-all z-10 hover:text-white bg-red-50 hover:bg-red-500 text-red-500"
>
 <Trash2 size={16} className="pointer-events-none" />
</div>
                                </div>
                                <p className="mt-2 text-[10px] opacity-60 italic truncate w-full">
                                  {f.answer}
                                </p>
                              </button>
                            ))}

                          {activeTab === "news" &&
                            news.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setEditingId(item.id);
                                  setNewsTitle(item.title);
                                  setNewsContent(item.content);
                                  setNewsImage(item.imageUrl || "");
                                  setNewsCategory(item.category || "عام");
                                  setIsBulkMode(false);
                                }}
                                className="w-full flex flex-col p-4 bg-white rounded-xl group hover:border-blue-600 transition-all border border-slate-100 text-right shadow-sm"
                              >
                                {item.imageUrl && (
                                  <div className="w-full h-32 rounded-2xl overflow-hidden mb-4 bg-slate-100">
                                    <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                                  </div>
                                )}
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{item.category}</span>
                                    <h4 className="font-bold text-slate-900 group-hover:text-blue-600">{item.title}</h4>
                                  </div>
                                  <div
 onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete("news", item.id, fetchNews); }}
 className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-all z-10 hover:text-white bg-red-50 hover:bg-red-500 text-red-500"
>
 <Trash2 size={16} className="pointer-events-none" />
</div>
                                </div>
                                <p className="mt-2 text-xs text-slate-500 line-clamp-2">{item.content}</p>
                              </button>
                            ))}

                          {((activeTab === "subjects" &&
                            subjects.length === 0) ||
                            (activeTab === "chapters" &&
                              chapters.length === 0) ||
                            (activeTab === "materials" &&
                              materials.length === 0) ||
                            (activeTab === "flashcards" &&
                              flashcards.length === 0) ||
                            (activeTab === "ministerial" &&
                              ministerialQuestions.length === 0)) && (
                            <div className="py-10 text-center text-slate-300 italic font-medium">
                              لا توجد بيانات مضافة هنا بعد
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 md:bottom-10 left-1/2 md:left-10 -translate-x-1/2 md:translate-x-0 px-8 py-4 bg-emerald-600 text-white rounded-xl flex items-center gap-3 shadow-md shadow-emerald-200 z-[100] w-[90%] md:w-auto text-center justify-center"
          >
            <CheckCircle2 size={24} />
            <span className="font-black">{success}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 md:bottom-10 left-1/2 md:left-10 -translate-x-1/2 md:translate-x-0 px-8 py-4 bg-red-600 text-white rounded-xl flex items-center gap-3 shadow-md shadow-red-200 z-[100] w-[90%] md:w-auto text-center justify-center"
          >
            <AlertCircle size={24} />
            <span className="font-black">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-md"
              dir="rtl"
            >
              <div className="flex items-center gap-3 mb-4 text-red-600">
                <AlertCircle size={28} />
                <h3 className="text-xl font-bold">تأكيد الحذف</h3>
              </div>
              <p className="text-slate-600 font-semibold mb-8 text-right">
                هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-6 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={executeDelete}
                  className="px-6 py-2.5 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  حذف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
