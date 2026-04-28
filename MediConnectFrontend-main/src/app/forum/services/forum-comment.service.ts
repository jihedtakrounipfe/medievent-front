import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, retry, timeout, tap, map } from 'rxjs/operators';
import { ForumComment, ForumCommentRequest, CommentUserReputation, CommentUtility, CommentEditHistory } from '../models/forum-comment';
import { PageResponse } from '../models/forum-post';
import { ForumNotificationService } from './forum-notification.service';

@Injectable({
  providedIn: 'root'
})
export class ForumCommentService {

  private apiUrl = 'http://localhost:8080/mediconnect/api/forum';
  private readonly TIMEOUT = 10000;

  private userVotes = new Map<string, Set<string>>();
  private voteSubject = new BehaviorSubject<Map<string, Set<string>>>(new Map());

  private userUtilities = new Map<string, Map<string, 'helpful' | 'solution' | 'irrelevant'>>();
  private userReputations = new Map<number, CommentUserReputation>();
  private pinnedComments = new Map<string, Set<string>>();

  constructor(
    private http: HttpClient,
    private notificationService: ForumNotificationService
  ) {
    this.loadVotesFromStorage();
    this.loadUtilitiesFromStorage();
    this.loadPinnedCommentsFromStorage();
    this.loadReputationsFromStorage();
  }

  private handleError(error: HttpErrorResponse | Error) {
    let errorMessage = 'Une erreur est survenue';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      errorMessage = `Erreur serveur (${(error as HttpErrorResponse).status})`;
    }

    console.error('❌ Erreur:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // ✅ CORRIGÉ - URL correcte
  getByPost(postId: string, opId?: number): Observable<ForumComment[]> {
    return this.http.get<ForumComment[]>(`${this.apiUrl}/posts/${postId}/comments`)
      .pipe(
        timeout(this.TIMEOUT),
        retry(1),
        map(comments => this.enrichComments(postId, comments || [], opId)),
        catchError(this.handleError)
      );
  }

  // ✅ CORRIGÉ - URL correcte avec pagination
  getByPostPaginated(postId: string, page: number = 0, size: number = 10, opId?: number): Observable<PageResponse<ForumComment>> {
    const url = `${this.apiUrl}/posts/${postId}/comments?page=${page}&size=${size}`;
    console.log(`📄 Chargement commentaires paginés: ${url}`);
    
    return this.http.get<any>(url)
      .pipe(
        timeout(this.TIMEOUT),
        retry(1),
        map(response => {
          if (Array.isArray(response)) {
            return {
              content: this.enrichComments(postId, response, opId),
              totalElements: response.length,
              totalPages: 1,
              number: page,
              size: size
            };
          }
          return {
            ...response,
            content: response?.content ? this.enrichComments(postId, response.content, opId) : []
          };
        }),
        catchError(error => {
          console.error('❌ Erreur getByPostPaginated:', error);
          return of({
            content: [],
            totalElements: 0,
            totalPages: 0,
            number: page,
            size: size
          });
        })
      );
  }

  // ✅ CORRIGÉ - Ajout du userId
  add(postId: string, request: ForumCommentRequest, currentUserId: number = 1): Observable<ForumComment> {
    if (!request.content || request.content.trim().length < 3) {
      return throwError(() => new Error('Le commentaire doit contenir au moins 3 caractères'));
    }

    const body = {
      content: request.content,
      replyToId: request.replyToId,
      userId: currentUserId
    };

    return this.http.post<ForumComment>(`${this.apiUrl}/posts/${postId}/comments`, body)
      .pipe(
        timeout(this.TIMEOUT),
        tap(() => {
          this.notificationService.refreshUnreadCount();
          if (currentUserId && !this.userReputations.has(currentUserId)) {
            this.userReputations.set(currentUserId, {
              userId: currentUserId,
              totalScore: 0,
              helpfulCount: 0,
              solutionCount: 0,
              level: 'novice'
            });
          }
        }),
        catchError(this.handleError)
      );
  }

  // ✅ CORRIGÉ - URL correcte avec userId
  upvote(postId: string, commentId: string, userId: number = 1): Observable<ForumComment> {
    if (this.hasUserVoted(postId, commentId, userId.toString())) {
      return throwError(() => new Error('Vous avez déjà voté pour ce commentaire'));
    }

    return this.http.patch<ForumComment>(`${this.apiUrl}/posts/${postId}/comments/${commentId}/upvote?userId=${userId}`, {})
      .pipe(
        timeout(this.TIMEOUT),
        tap((comment: ForumComment) => {
          this.recordUserVote(postId, commentId, userId.toString());
          this.notificationService.refreshUnreadCount();
          if (comment.author?.id) {
            this.addReputationScore(comment.author.id, 1);
          }
        }),
        catchError(this.handleError)
      );
  }

  // ✅ CORRIGÉ - URL correcte
  delete(postId: string, commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/posts/${postId}/comments/${commentId}`)
      .pipe(timeout(this.TIMEOUT), catchError(this.handleError));
  }

  // ✅ CORRIGÉ - URL correcte
  update(postId: string, commentId: string, content: string): Observable<ForumComment> {
    if (!content || content.trim().length < 3) {
      return throwError(() => new Error('Le commentaire doit contenir au moins 3 caractères'));
    }

    return this.http.put<ForumComment>(`${this.apiUrl}/posts/${postId}/comments/${commentId}`, { content })
      .pipe(
        timeout(this.TIMEOUT),
        catchError(this.handleError)
      );
  }

  // ✅ CORRIGÉ - URL correcte
  markAsAnswer(postId: string, commentId: string): Observable<ForumComment> {
    return this.http.patch<ForumComment>(`${this.apiUrl}/posts/${postId}/comments/${commentId}/mark-answer`, {})
      .pipe(
        timeout(this.TIMEOUT),
        tap((comment: ForumComment) => {
          if (comment.author?.id) {
            this.addReputationScore(comment.author.id, 5);
          }
        }),
        catchError(this.handleError)
      );
  }

  // ✅ CORRIGÉ - URL correcte
  markCommentUtility(
    postId: string,
    commentId: string,
    utilityType: 'helpful' | 'solution' | 'irrelevant',
    userId: string = 'current-user'
  ): Observable<ForumComment> {
    return this.http.patch<ForumComment>(
      `${this.apiUrl}/posts/${postId}/comments/${commentId}/utility`,
      { type: utilityType, userId }
    ).pipe(
      timeout(this.TIMEOUT),
      tap((comment: ForumComment) => {
        this.recordUtilityVote(commentId, utilityType, userId);

        if (utilityType === 'solution' && comment.author?.id) {
          this.addReputationScore(comment.author.id, 10);
        } else if (utilityType === 'helpful' && comment.author?.id) {
          this.addReputationScore(comment.author.id, 3);
        } else if (utilityType === 'irrelevant' && comment.author?.id) {
          this.addReputationScore(comment.author.id, -2);
        }
      }),
      catchError(this.handleError)
    );
  }

  getThreadedComments(postId: string, opId?: number): Observable<ForumComment[]> {
    return this.getByPost(postId, opId).pipe(
      map(comments => this.buildCommentTree(comments))
    );
  }

  private buildCommentTree(comments: ForumComment[]): ForumComment[] {
    const commentMap = new Map<string, ForumComment>();
    const roots: ForumComment[] = [];

    comments.forEach(comment => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

    comments.forEach(comment => {
      if (comment.replyToId && commentMap.has(comment.replyToId)) {
        const parent = commentMap.get(comment.replyToId)!;
        parent.replies!.push(comment);
      } else {
        roots.push(comment);
      }
    });

    return roots;
  }

  calculateCommentScore(comment: ForumComment): number {
    const now = Date.now();
    const commentAge = now - new Date(comment.createdAt).getTime();
    const dayInMs = 24 * 60 * 60 * 1000;
    const daysOld = commentAge / dayInMs;

    let score = (comment.upvotes || 0) * 1.5;

    if (comment.author.role === 'DOCTOR') {
      score += 3;
    }

    if (comment.isAnswer) {
      score += 5;
    }

    const recencyBonus = Math.max(0, 2 - (daysOld / 7));
    score += recencyBonus;

    if (comment.reputation) {
      score += comment.reputation * 0.1;
    }

    return Math.max(0, Math.round(score * 10) / 10);
  }

  rankComments(comments: ForumComment[]): ForumComment[] {
    return comments
      .map(comment => ({
        ...comment,
        computedScore: this.calculateCommentScore(comment)
      }))
      .sort((a, b) => (b.computedScore || 0) - (a.computedScore || 0));
  }

  notifyCommentReply(commentId: string, replyContent: string, replierName: string): void {
    console.log('📢 Notification - Nouvelle réponse:', {
      type: 'comment_reply',
      title: 'Nouvelle réponse',
      message: `${replierName} a répondu à votre commentaire`,
      timestamp: new Date(),
      read: false,
      relatedCommentId: commentId
    });
    this.notificationService.refreshUnreadCount();
  }

  notifyCommentMarked(commentId: string, markType: 'helpful' | 'solution', markerName: string): void {
    const message = markType === 'solution'
      ? `${markerName} a marqué votre commentaire comme solution ✅`
      : `${markerName} a marqué votre commentaire comme utile`;

    console.log('📢 Notification - Commentaire marqué:', {
      type: 'comment_marked',
      title: markType === 'solution' ? 'Solution trouvée!' : 'Commentaire utile',
      message,
      timestamp: new Date(),
      read: false,
      relatedCommentId: commentId
    });
    this.notificationService.refreshUnreadCount();
  }

  getCommentUtility(commentId: string): CommentUtility | undefined {
    return undefined;
  }

  markAuthorComments(comments: ForumComment[], authorId?: number): ForumComment[] {
    return comments.map(comment => ({
      ...comment,
      isAuthorOp: comment.author.id === authorId
    }));
  }

  getUserReputation(userId: number): CommentUserReputation | undefined {
    return this.userReputations.get(userId);
  }

  addReputationScore(userId: number, points: number): void {
    if (!this.userReputations.has(userId)) {
      this.userReputations.set(userId, {
        userId,
        totalScore: 0,
        helpfulCount: 0,
        solutionCount: 0,
        level: 'novice'
      });
    }

    const rep = this.userReputations.get(userId)!;
    rep.totalScore += points;
    rep.level = this.calculateReputationLevel(rep.totalScore);

    this.saveReputationsToStorage();
  }

  private calculateReputationLevel(score: number): 'novice' | 'contributor' | 'expert' | 'trusted' {
    if (score >= 100) return 'trusted';
    if (score >= 50) return 'expert';
    if (score >= 20) return 'contributor';
    return 'novice';
  }

  getCommentEditHistory(postId: string, commentId: string): Observable<CommentEditHistory[]> {
    return this.http.get<CommentEditHistory[]>(
      `${this.apiUrl}/posts/${postId}/comments/${commentId}/history`
    ).pipe(
      timeout(this.TIMEOUT),
      catchError(this.handleError)
    );
  }

  pinComment(postId: string, commentId: string): void {
    if (!this.pinnedComments.has(postId)) {
      this.pinnedComments.set(postId, new Set());
    }
    this.pinnedComments.get(postId)!.add(commentId);
    this.savePinnedCommentsToStorage();
  }

  unpinComment(postId: string, commentId: string): void {
    this.pinnedComments.get(postId)?.delete(commentId);
    this.savePinnedCommentsToStorage();
  }

  isCommentPinned(postId: string, commentId: string): boolean {
    return this.pinnedComments.get(postId)?.has(commentId) || false;
  }

  getPinnedComments(comments: ForumComment[], postId: string): ForumComment[] {
    const pinnedIds = this.pinnedComments.get(postId) || new Set();
    return comments
      .filter(c => pinnedIds.has(c.id))
      .map(c => ({ ...c, isPinned: true }));
  }

  private loadVotesFromStorage(): void {
    try {
      const stored = localStorage.getItem('user_votes');
      if (stored) {
        const parsed = JSON.parse(stored);
        const votesMap = new Map<string, Set<string>>();
        Object.entries(parsed).forEach(([postId, commentIds]) => {
          votesMap.set(postId, new Set(commentIds as string[]));
        });
        this.userVotes = votesMap;
        this.voteSubject.next(this.userVotes);
      }
    } catch (e) {
      console.error('Erreur chargement votes:', e);
    }
  }

  private saveVotesToStorage(): void {
    try {
      const obj: Record<string, string[]> = {};
      this.userVotes.forEach((commentIds, postId) => {
        obj[postId] = Array.from(commentIds);
      });
      localStorage.setItem('user_votes', JSON.stringify(obj));
    } catch (e) {
      console.error('Erreur sauvegarde votes:', e);
    }
  }

  private recordUserVote(postId: string, commentId: string, userId: string): void {
    const key = `${postId}_${userId}`;
    if (!this.userVotes.has(key)) {
      this.userVotes.set(key, new Set());
    }
    this.userVotes.get(key)?.add(commentId);
    this.saveVotesToStorage();
    this.voteSubject.next(this.userVotes);
  }

  hasUserVoted(postId: string, commentId: string, userId: string = 'current-user'): boolean {
    const key = `${postId}_${userId}`;
    return this.userVotes.get(key)?.has(commentId) || false;
  }

  getUserVotesForPost(postId: string, userId: string = 'current-user'): Set<string> {
    const key = `${postId}_${userId}`;
    return this.userVotes.get(key) || new Set();
  }

  private markUserVotes(postId: string, comments: ForumComment[]): ForumComment[] {
    const userVotedCommentIds = this.getUserVotesForPost(postId);
    return comments.map(comment => ({
      ...comment,
      hasUserVoted: userVotedCommentIds.has(comment.id)
    }));
  }

  private loadUtilitiesFromStorage(): void {
    try {
      const stored = localStorage.getItem('comment_utilities');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([commentId, utilities]) => {
          const utilMap = new Map();
          Object.entries(utilities as any).forEach(([userId, type]) => {
            utilMap.set(userId, type);
          });
          this.userUtilities.set(commentId, utilMap);
        });
      }
    } catch (e) {
      console.error('Erreur chargement utilities:', e);
    }
  }

  private recordUtilityVote(
    commentId: string,
    utilityType: 'helpful' | 'solution' | 'irrelevant',
    userId: string
  ): void {
    if (!this.userUtilities.has(commentId)) {
      this.userUtilities.set(commentId, new Map());
    }
    this.userUtilities.get(commentId)!.set(userId, utilityType);
    this.saveUtilitiesToStorage();
  }

  private saveUtilitiesToStorage(): void {
    try {
      const obj: Record<string, Record<string, string>> = {};
      this.userUtilities.forEach((utilities, commentId) => {
        obj[commentId] = {};
        utilities.forEach((type, userId) => {
          obj[commentId][userId] = type;
        });
      });
      localStorage.setItem('comment_utilities', JSON.stringify(obj));
    } catch (e) {
      console.error('Erreur sauvegarde utilities:', e);
    }
  }

  private loadPinnedCommentsFromStorage(): void {
    try {
      const stored = localStorage.getItem('pinned_comments');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([postId, commentIds]) => {
          this.pinnedComments.set(postId, new Set(commentIds as string[]));
        });
      }
    } catch (e) {
      console.error('Erreur chargement commentaires épinglés:', e);
    }
  }

  private savePinnedCommentsToStorage(): void {
    try {
      const obj: Record<string, string[]> = {};
      this.pinnedComments.forEach((commentIds, postId) => {
        obj[postId] = Array.from(commentIds);
      });
      localStorage.setItem('pinned_comments', JSON.stringify(obj));
    } catch (e) {
      console.error('Erreur sauvegarde commentaires épinglés:', e);
    }
  }

  private loadReputationsFromStorage(): void {
    try {
      const stored = localStorage.getItem('user_reputations');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([userIdStr, rep]) => {
          const userId = parseInt(userIdStr);
          this.userReputations.set(userId, rep as CommentUserReputation);
        });
      }
    } catch (e) {
      console.error('Erreur chargement réputations:', e);
    }
  }

  private saveReputationsToStorage(): void {
    try {
      const obj: Record<number, CommentUserReputation> = {};
      this.userReputations.forEach((rep, userId) => {
        obj[userId] = rep;
      });
      localStorage.setItem('user_reputations', JSON.stringify(obj));
    } catch (e) {
      console.error('Erreur sauvegarde réputations:', e);
    }
  }

  private enrichComments(postId: string, comments: ForumComment[], opId?: number): ForumComment[] {
    const userVotedCommentIds = this.getUserVotesForPost(postId);
    return comments.map((comment) => ({
      ...comment,
      isAuthorOp: comment.author?.id === opId,
      isPinned: this.isCommentPinned(postId, comment.id),
      hasUserVoted: userVotedCommentIds.has(comment.id),
      reputation: this.userReputations.get(comment.author?.id)?.totalScore || 0,
      computedScore: this.calculateCommentScore(comment),
      collapsed: false
    }));
  }

  getUserVotesObservable() {
    return this.voteSubject.asObservable();
  }
}