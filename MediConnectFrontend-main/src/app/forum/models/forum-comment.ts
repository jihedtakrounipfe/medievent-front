// models/forum-comment.ts
export interface CommentUtility {
  helpful: boolean;
  isSolution: boolean;
  isIrrelevant: boolean;
  userUtilityVotes?: Map<string, 'helpful' | 'solution' | 'irrelevant'>;
}

export interface CommentEditHistory {
  editedAt: Date;
  editedBy: string;
  previousContent: string;
  reason?: string;
}

export interface ForumComment {
  id: string;
  replyToId?: string; // ← Référence au commentaire parent (pour arborescence)
  replies?: ForumComment[]; // ← Réponses imbriquées
  content: string;
  postId: string;
  author: {
    id: number;
    fullName: string;
    initials: string;
    role: 'DOCTOR' | 'PATIENT';
  };
  authorId?: number;
  upvotes: number;
  downvotes?: number;
  isAnswer: boolean;
  hasUserVoted?: boolean;
  reputation?: number; // ← Score de réputation de l'auteur (0-100)
  utility?: CommentUtility; // ← Marques utility/solution/irrelevant
  editHistory?: CommentEditHistory[]; // ← Historique des modifications
  isAuthorOp?: boolean; // ← Est l'auteur original du post
  isPinned?: boolean; // ← Épinglé pour ce post
  computedScore?: number; // ← Score de ranking calculé
  collapsed?: boolean; // ← État collapse/expand (UI state)
  createdAt: Date;
  updatedAt?: Date;
}

export interface CommentUserReputation {
  userId: number;
  totalScore: number;
  helpfulCount: number;
  solutionCount: number;
  level: 'novice' | 'contributor' | 'expert' | 'trusted';
}

export interface ForumCommentRequest {
  content: string;
  replyToId?: string; // ← Pour les réponses imbriquées
}