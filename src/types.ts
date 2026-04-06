export type Grade = 
  | 'primary_1' | 'primary_2' | 'primary_3' | 'primary_4' | 'primary_5' | 'primary_6'
  | 'middle_1' | 'middle_2' | 'middle_3'
  | 'secondary_4_sci' | 'secondary_4_lit'
  | 'secondary_5_sci' | 'secondary_5_lit'
  | 'secondary_6_sci' | 'secondary_6_lit';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
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
  type: 'PDF' | 'Video' | 'Ministerial';
  url: string;
}

export interface Flashcard {
  id: string;
  chapter_id: string;
  question: string;
  answer: string;
}
