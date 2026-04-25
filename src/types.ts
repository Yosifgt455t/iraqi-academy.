export type Grade = string;

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
  order_index?: number;
}

export interface Flashcard {
  id: string;
  chapter_id?: string; // Legacy
  chapterIds?: string[]; // Support multiple chapters
  question: string;
  answer: string;
}

export interface MinisterialQuestion {
  id: string;
  chapterIds?: string[];
  question: string;
  answer: string;
  year: string;
  order_index?: number;
}
