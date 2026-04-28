export type PostCategory = 'QUESTION' | 'ADVICE' | 'AWARENESS' | 'DOCUMENT';

export interface AuthorInfo {
  id?: number;
  initials: string;
  fullName: string;
  role: 'DOCTOR' | 'USER';
}

// Interface pour les attachments
export interface ForumAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
  category: 'image' | 'video' | 'gif' | 'pdf';
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: PostCategory;
  isVerifiedByDoctor: boolean;
  viewCount: number;
  commentCount?: number;
  pinned?: boolean;
  tags?: string[];
  createdAt: Date;
  author: AuthorInfo;
  
  // NOUVEAUX CHAMPS POUR LES MÉDIAS
  attachments?: ForumAttachment[];
  images?: string[];    // URLs des images (extraites des attachments)
  videos?: string[];    // URLs des vidéos (extraites des attachments)
  pdfs?: { url: string; name: string }[];  // PDFs (extraits des attachments)
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  
}