import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Grade } from '../types';

export interface GradeContent {
  id: Grade;
  label: string;
  description?: string;
  isHidden?: boolean;
}

export interface StageContent {
  id: string;
  label: string;
  iconName: string; // 'School', 'Library', 'GraduationCap'
  color: string;
  grades: GradeContent[];
  orderIndex: number;
  isHidden?: boolean;
}

const DEFAULT_STAGES: StageContent[] = [
  {
    id: 'primary',
    label: 'المرحلة الابتدائية',
    iconName: 'School',
    color: 'emerald',
    orderIndex: 0,
    grades: [
      { id: 'primary_1', label: 'الأول الابتدائي' },
      { id: 'primary_2', label: 'الثاني الابتدائي' },
      { id: 'primary_3', label: 'الثالث الابتدائي' },
      { id: 'primary_4', label: 'الرابع الابتدائي' },
      { id: 'primary_5', label: 'الخامس الابتدائي' },
      { id: 'primary_6', label: 'السادس الابتدائي' },
    ]
  },
  {
    id: 'middle',
    label: 'المرحلة المتوسطة',
    iconName: 'Library',
    color: 'purple',
    orderIndex: 1,
    grades: [
      { id: 'middle_1', label: 'الأول المتوسط' },
      { id: 'middle_2', label: 'الثاني المتوسط' },
      { id: 'middle_3', label: 'الثالث المتوسط', description: 'مرحلة وزارية' },
    ]
  },
  {
    id: 'secondary',
    label: 'المرحلة الإعدادية',
    iconName: 'GraduationCap',
    color: 'blue',
    orderIndex: 2,
    grades: [
      { id: 'secondary_4_sci', label: 'الرابع العلمي' },
      { id: 'secondary_4_lit', label: 'الرابع الأدبي' },
      { id: 'secondary_5_sci', label: 'الخامس العلمي' },
      { id: 'secondary_5_lit', label: 'الخامس الأدبي' },
      { id: 'secondary_6_sci', label: 'السادس العلمي', description: 'مرحلة وزارية' },
      { id: 'secondary_6_lit', label: 'السادس الأدبي', description: 'مرحلة وزارية' },
    ]
  }
];

export function useClasses() {
  const [stages, setStages] = useState<StageContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'classes'), async (snap) => {
      if (snap.empty) {
        // Initialization should strictly only happen if user is an admin
        // This check prevents permission-denied errors for regular users/guests
        import('../services/adminService').then(async ({ checkIsAdmin }) => {
          const isAdmin = await checkIsAdmin(auth.currentUser?.email);
          if (isAdmin) {
            for (const stage of DEFAULT_STAGES) {
              try {
                await setDoc(doc(db, 'classes', stage.id), stage);
              } catch (e) {
                console.error("Failed to initialize class:", stage.id, e);
              }
            }
          }
        });
      } else {
        const fetched: StageContent[] = [];
        snap.forEach(d => {
          fetched.push({ id: d.id, ...d.data() } as StageContent);
        });
        fetched.sort((a, b) => a.orderIndex - b.orderIndex);
        setStages(fetched);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error in useClasses snapshot listener:", error);
      setLoading(false);
      // Fallback to defaults if we can't read from DB
      setStages(DEFAULT_STAGES);
    });

    return () => unsub();
  }, []);

  const addGrade = async (stageId: string, grade: GradeContent) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return;
    const newGrades = [...stage.grades, grade];
    await setDoc(doc(db, 'classes', stageId), { ...stage, grades: newGrades });
  };

  const removeGrade = async (stageId: string, gradeId: string) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return;
    const newGrades = stage.grades.filter(g => g.id !== gradeId);
    await setDoc(doc(db, 'classes', stageId), { ...stage, grades: newGrades });
  };

  const allGrades = stages.flatMap(s => s.grades);

  const getGradeName = (gradeId: string) => {
    return allGrades.find(g => g.id === gradeId)?.label || gradeId;
  };

  const toggleStageVisibility = async (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return;
    await setDoc(doc(db, 'classes', stageId), { ...stage, isHidden: !stage.isHidden });
  };

  const toggleGradeVisibility = async (stageId: string, gradeId: string) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return;
    const newGrades = stage.grades.map(g => 
      g.id === gradeId ? { ...g, isHidden: !g.isHidden } : g
    );
    await setDoc(doc(db, 'classes', stageId), { ...stage, grades: newGrades });
  };

  return { stages, loading, addGrade, removeGrade, toggleStageVisibility, toggleGradeVisibility, allGrades, getGradeName };
}
