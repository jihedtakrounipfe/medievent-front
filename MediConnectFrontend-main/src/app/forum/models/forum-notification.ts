export type NotificationType =
  | 'COMMENT'
  | 'UPVOTE'
  | 'DOCTOR_ANSWER'
  | 'POST_PINNED'
  | 'OTHER';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  postId?: string;
  commentId?: string;
  read: boolean;
  createdAt: Date;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
