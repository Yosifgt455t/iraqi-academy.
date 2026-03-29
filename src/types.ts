export type Grade = '5th' | '6th';

export interface Profile {
  id: string;
  email: string;
  grade: Grade | null;
  completed_materials?: string[];
}

export interface Subject {
  id: string;
  name: string;
  grade: Grade;
  icon?: string;
}

export interface Chapter {
  id: string;
  subject_id: string;
  name: string;
  order_index: number;
}

export interface Material {
  id: string;
  chapter_id: string;
  title: string;
  type: 'PDF' | 'Video';
  url: string;
}

export interface Flashcard {
  id: string;
  chapter_id: string;
  question: string;
  answer: string;
}
