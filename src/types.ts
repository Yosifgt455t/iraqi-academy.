export type Grade = string;

export interface Profile {
  id: string;
  username: string;
  full_name?: string;
  grade: Grade | null;
  completed_materials?: string[];
  xp?: number;
  level?: number;
  streak?: {
    count: number;
    lastUpdate: string;
  };
  photoURL?: string;
}

export interface ForumPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  title: string;
  content: string;
  subjectId?: string;
  likes: number;
  likedBy?: string[];
  commentCount: number;
  createdAt: string;
}

export interface ForumComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  createdAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  category?: string;
  createdAt: string;
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
  teacherId?: string;
  title: string;
  type: 'PDF' | 'Video' | 'Ministerial';
  url: string;
  isUploaded?: boolean;
  order_index?: number;
}

export interface Teacher {
  id: string;
  name: string;
  subjectId: string;
  avatar?: string;
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

export interface ReviewSubject {
  id: string;
  name: string;
  gradeIds: Grade[];
  icon?: string;
  createdAt: string;
}

export interface ReviewMaterial {
  id: string;
  reviewSubjectId: string;
  title: string;
  type: 'PDF' | 'Video';
  url: string;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: number;
  subjectId?: string;
}
