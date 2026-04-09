import { Subject, Chapter, Material } from '../types';

export const localSubjects: Subject[] = [
  { id: 's1', name: 'الرياضيات', grade: 'secondary_5_sci' },
  { id: 's2', name: 'الفيزياء', grade: 'secondary_5_sci' },
  { id: 's3', name: 'الكيمياء', grade: 'secondary_5_sci' },
  { id: 's4', name: 'الأحياء', grade: 'secondary_5_sci' },
  { id: 's5', name: 'اللغة العربية', grade: 'secondary_5_sci' },
];

export const localChapters: Record<string, Chapter[]> = {
  's1': [
    { id: 'c1', subject_id: 's1', name: 'الفصل الأول: اللوغاريتمات', order_index: 1 },
    { id: 'c2', subject_id: 's1', name: 'الفصل الثاني: المتتابعات', order_index: 2 },
  ],
  's2': [
    { id: 'c3', subject_id: 's2', name: 'الفصل الأول: المتجهات', order_index: 1 },
    { id: 'c4', subject_id: 's2', name: 'الفصل الثاني: الحركة الخطية', order_index: 2 },
  ],
  's3': [
    { id: 'c5', subject_id: 's3', name: 'الفصل الأول: التطور التاريخي للمفهوم الذري', order_index: 1 },
    { id: 'c6', subject_id: 's3', name: 'الفصل الثاني: القوى الترابطية والأشكال الهندسية', order_index: 2 },
  ],
  's4': [
    { id: 'c7', subject_id: 's4', name: 'الفصل الأول: التغذية والهضم', order_index: 1 },
    { id: 'c8', subject_id: 's4', name: 'الفصل الثاني: التنفس والتبادل الغازي', order_index: 2 },
  ],
  's5': [
    { id: 'c9', subject_id: 's5', name: 'قواعد اللغة العربية: المبتدأ والخبر', order_index: 1 },
    { id: 'c10', subject_id: 's5', name: 'الأدب والنصوص: العصر الأموي', order_index: 2 },
  ]
};

export const localMaterials: Record<string, Material[]> = {
  'c1': [
    { id: 'm1', chapter_id: 'c1', type: 'Video', title: 'مقدمة في اللوغاريتمات', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    { id: 'm2', chapter_id: 'c1', type: 'PDF', title: 'ملزمة الفصل الأول - اللوغاريتمات', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
  ],
  'c3': [
    { id: 'm3', chapter_id: 'c3', type: 'Video', title: 'شرح المتجهات - الجزء الأول', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
  ],
  'c5': [
    { id: 'm4', chapter_id: 'c5', type: 'Video', title: 'النظرية الذرية الحديثة', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
  ],
  'c7': [
    { id: 'm5', chapter_id: 'c7', type: 'Video', title: 'التغذية في النباتات', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
  ],
  'c9': [
    { id: 'm6', chapter_id: 'c9', type: 'Video', title: 'شرح المبتدأ والخبر', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
  ]
};
