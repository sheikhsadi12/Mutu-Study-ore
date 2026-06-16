export type NoteType = 'STATIC_A4' | 'DYNAMIC_APPLET';

export interface Note {
  id: string;
  title: string;
  description: string;
  type: NoteType;
  subject: string;
  chapter?: string;
  html_code: string;
  pdf_link?: string;
  user_id?: string;
  created_at: string;
}

export interface Comment {
  id: string;
  noteId: string;
  authorName: string;
  content: string;
  timestamp: string;
}

export interface LikeState {
  noteId: string;
  count: number;
  hasLiked: boolean;
}
