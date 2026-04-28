import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, map, catchError, throwError } from 'rxjs';
import { ForumPost, PageResponse, PostCategory, ForumAttachment } from '../models/forum-post';

export interface PostReactionSummary {
  counts: Record<string, number>;
  userReaction: string | null;
}

export interface ReactionSyncEvent {
  postId: string;
  counts: Record<string, number>;
  userReaction: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ForumPostService {

  private apiUrl = 'http://localhost:8080/mediconnect/api/forum';
  private reactionSyncSubject = new Subject<ReactionSyncEvent>();
  readonly reactionSync$ = this.reactionSyncSubject.asObservable();
  private readonly reactionApiByEmoji: Record<string, string> = {
    '👍': 'LIKE',
    '❤️': 'LOVE',
    '😂': 'LAUGH',
    '😮': 'WOW',
    '😢': 'SAD',
    '😡': 'ANGRY'
  };
  private readonly emojiByReactionApi: Record<string, string> = {
    LIKE: '👍',
    LOVE: '❤️',
    LAUGH: '😂',
    WOW: '😮',
    SAD: '😢',
    ANGRY: '😡'
  };

  constructor(private http: HttpClient) {}

  // Récupérer tous les posts avec pagination
  getAll(page: number = 0, size: number = 10): Observable<PageResponse<ForumPost>> {
    return this.http.get<PageResponse<any>>(`${this.apiUrl}/posts?page=${page}&size=${size}`).pipe(
      map(response => ({
        ...response,
        content: response.content.map(post => this.normalizePost(post))
      }))
    );
  }

  // Récupérer un post par son ID
  getById(id: string): Observable<ForumPost> {
    return this.http.get<any>(`${this.apiUrl}/posts/${id}`).pipe(
      map(post => this.normalizePost(post))
    );
  }

  // Créer un nouveau post SANS fichier
  create(post: Partial<ForumPost>): Observable<ForumPost> {
    const request = {
      title: post.title,
      content: post.content,
      category: post.category,
      authorId: 1
    };
    return this.http.post<ForumPost>(`${this.apiUrl}/posts`, request);
  }

  // Créer un post AVEC fichier
  createWithAttachment(formData: FormData): Observable<ForumPost> {
    return this.http.post<ForumPost>(`${this.apiUrl}/posts/with-attachment`, formData);
  }

  // Mettre à jour un post SANS fichier
  update(id: string, post: Partial<ForumPost>): Observable<ForumPost> {
    const request = {
      title: post.title,
      content: post.content,
      category: post.category
    };
    return this.http.put<ForumPost>(`${this.apiUrl}/posts/${id}`, request);
  }

  // ✅ Mettre à jour un post AVEC fichiers
  updateWithFiles(id: string, formData: FormData): Observable<ForumPost> {
    return this.http.put<ForumPost>(`${this.apiUrl}/posts/${id}`, formData);
  }

  // Supprimer un post
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/posts/${id}`);
  }

  // Rechercher des posts
  search(query: string, page: number = 0, size: number = 10): Observable<PageResponse<ForumPost>> {
    return this.http.get<PageResponse<any>>(`${this.apiUrl}/posts/search?q=${query}&page=${page}&size=${size}`).pipe(
      map(response => ({
        ...response,
        content: response.content.map(post => this.normalizePost(post))
      }))
    );
  }

  // Récupérer les posts par catégorie
  getByCategory(category: PostCategory, page: number = 0, size: number = 10): Observable<PageResponse<ForumPost>> {
    return this.http.get<PageResponse<any>>(`${this.apiUrl}/posts/category/${category}?page=${page}&size=${size}`).pipe(
      map(response => ({
        ...response,
        content: response.content.map(post => this.normalizePost(post))
      }))
    );
  }
// forum-post.service.ts
deleteAttachment(postId: string, attachmentId: string): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/posts/${postId}/attachments/${attachmentId}`);
}

uploadAttachment(formData: FormData): Observable<any> {
  return this.http.post(`${this.apiUrl}/attachments`, formData);
}
  // Sauvegarder un post
  savePost(id: string, userId: number): Observable<{ saved: boolean }> {
    return this.http.post<{ saved: boolean }>(`${this.apiUrl}/posts/${id}/save`, { userId });
  }

  unsavePost(id: string, userId: number): Observable<{ saved: boolean }> {
    return this.http.delete<{ saved: boolean }>(`${this.apiUrl}/posts/${id}/save?userId=${userId}`);
  }

  getSaveStatus(id: string, userId: number): Observable<{ saved: boolean }> {
    return this.http.get<{ saved: boolean }>(`${this.apiUrl}/posts/${id}/save-status?userId=${userId}`);
  }

  // Reactions emoji
  getReactions(id: string, userId?: number): Observable<PostReactionSummary> {
    const suffix = userId != null ? `?userId=${userId}` : '';
    return this.http
      .get<PostReactionSummary>(`${this.apiUrl}/posts/${id}/reactions${suffix}`)
      .pipe(map(summary => this.normalizeReactionSummary(summary)));
  }

  setReaction(id: string, userId: number, emoji: string): Observable<PostReactionSummary> {
    const backendReaction = this.toBackendReaction(emoji);
    return this.http
      .put<PostReactionSummary>(`${this.apiUrl}/posts/${id}/reactions`, { userId, emoji: backendReaction })
      .pipe(map(summary => this.normalizeReactionSummary(summary)));
  }

  clearReaction(id: string, userId: number): Observable<PostReactionSummary> {
    const url = `${this.apiUrl}/posts/${id}/reactions`;
    return this.http.delete<PostReactionSummary>(`${url}?userId=${userId}`).pipe(
      map(summary => this.normalizeReactionSummary(summary)),
      catchError(() => this.http.delete<PostReactionSummary>(url, { body: { userId } }).pipe(
        map(summary => this.normalizeReactionSummary(summary)),
        catchError(() => this.http.put<PostReactionSummary>(url, { userId, emoji: null }).pipe(
          map(summary => this.normalizeReactionSummary(summary)),
          catchError(() => this.http.put<PostReactionSummary>(url, { userId, emoji: '' }).pipe(
            map(summary => this.normalizeReactionSummary(summary))
          ))
        ))
      ))
    );
  }

  private toBackendReaction(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return this.reactionApiByEmoji[value] || value;
  }

  private toUiReaction(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    return this.emojiByReactionApi[value] || value;
  }

  private normalizeReactionSummary(summary: PostReactionSummary): PostReactionSummary {
    const normalizedCounts: Record<string, number> = {};
    const sourceCounts = summary?.counts || {};

    Object.entries(sourceCounts).forEach(([key, count]) => {
      const uiKey = this.toUiReaction(key) || key;
      normalizedCounts[uiKey] = (normalizedCounts[uiKey] || 0) + (count || 0);
    });

    return {
      counts: normalizedCounts,
      userReaction: this.toUiReaction(summary?.userReaction || null)
    };
  }

  syncReactionState(postId: string, summary: PostReactionSummary): void {
    this.reactionSyncSubject.next({
      postId,
      counts: summary.counts || {},
      userReaction: summary.userReaction || null
    });
  }

  // Pinned posts
  getPinned(): Observable<ForumPost[]> {
    return this.http.get<any[]>(`${this.apiUrl}/posts/pinned`).pipe(
      map(posts => posts.map(post => this.normalizePost(post)))
    );
  }

  pin(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/posts/${id}/pin`, {});
  }

  unpin(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/posts/${id}/unpin`, {});
  }

  // MÉTHODE DE NORMALISATION - Transforme les données du backend en format utilisable
  private normalizePost(post: any): ForumPost {
    // Extraire les médias des attachments
    const images: string[] = [];
    const videos: string[] = [];
    const pdfs: { url: string; name: string }[] = [];

    if (post.attachments && Array.isArray(post.attachments)) {
      post.attachments.forEach((att: any) => {
        // Construire l'URL complète si nécessaire
        let fullUrl = att.url;
        if (fullUrl && fullUrl.startsWith('/uploads')) {
          fullUrl = 'http://localhost:8080/mediconnect' + fullUrl;
        }
        
        if (att.category === 'image' || att.category === 'gif') {
          images.push(fullUrl);
        } else if (att.category === 'video') {
          videos.push(fullUrl);
        } else if (att.category === 'pdf') {
          pdfs.push({ url: fullUrl, name: att.name || 'Document PDF' });
        }
      });
    }

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      isVerifiedByDoctor: post.isVerifiedByDoctor || false,
      viewCount: post.viewCount || 0,
      commentCount: post.commentCount || 0,
      pinned: post.pinned || false,
      tags: post.tags || [],
      createdAt: new Date(post.createdAt),
      author: {
        id: post.author?.id,
        initials: post.author?.initials || '??',
        fullName: post.author?.fullName || 'Anonyme',
        role: post.author?.role || 'USER'
      },
      attachments: post.attachments,
      images: images,
      videos: videos,
      pdfs: pdfs
    };
  }
}
