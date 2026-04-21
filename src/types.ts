export type Grade = 
  | 'primary_1' | 'primary_2' | 'primary_3' | 'primary_4' | 'primary_5' | 'primary_6'
  | 'middle_1' | 'middle_2' | 'middle_3'
  | 'secondary_4_sci' | 'secondary_4_lit'
  | 'secondary_5_sci' | 'secondary_5_lit'
  | 'secondary_6_sci' | 'secondary_6_lit';

export interface Profile {
  id: string;
  username: string;
  full_name?: string;
  grade: Grade | null;
  completed_materials?: string[];
}

export interface Subject {
  id: string;
  name: string;
  grade?: Grade; // Legacy
  grades?: Grade[]; // Support multiple grades
  icon?: string;
}

export interface Chapter {
  id: string;
  subjectId?: string; // Legacy
  subjectIds?: string[]; // Support multiple subjects
  name: string;
  orderIndex?: number;
}

export interface Material {
  id: string;
  chapterId?: string; // Legacy
  chapterIds?: string[]; // Support multiple chapters
  subjectId?: string;
  title: string;
  type: 'PDF' | 'Video' | 'Ministerial';
  url: string;
  isUploaded?: boolean;
}

export interface Flashcard {
  id: string;
  chapter_id?: string; // Legacy
  chapterIds?: string[]; // Support multiple chapters
  question: string;
  answer: string;
}
