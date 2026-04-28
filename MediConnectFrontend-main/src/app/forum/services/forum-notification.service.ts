import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Notification, PageResponse } from '../models/forum-notification';

@Injectable({
  providedIn: 'root'
})
export class ForumNotificationService {
  private apiUrl = 'http://localhost:8080/mediconnect/api/forum';
  private _unreadCount$ = new BehaviorSubject<number>(0);

  constructor(private http: HttpClient) {}

  /** Observable du nombre de notifications non lues */
  get unreadCount$(): Observable<number> {
    return this._unreadCount$.asObservable();
  }

  list(page: number = 0, size: number = 20): Observable<PageResponse<Notification>> {
    return this.http.get<PageResponse<Notification>>(
      `${this.apiUrl}/notifications?page=${page}&size=${size}`
    );
  }

  markAsRead(id: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/notifications/${id}/read`, {})
      // on pourrait mettre à jour le compteur local ici via tap
      // .pipe(tap(() => this.refreshUnreadCount()));
      
      // left simple for now
      ;
  }

  /**
   * Ajoute une notification (locale ou via API)
   */
  add(notification: Partial<Notification>): void {
    // Pour l'instant, on log simplement la notification
    // En production, vous devriez l'envoyer à l'API ou la stocker en local
    console.log('📢 Notification ajoutée:', notification);
    
    // Optionnel: mettre à jour le compteur local
    // this._unreadCount$.next(this._unreadCount$.value + 1);
  }

  /** refresh count from backend (to be called lors de l'init ou d'un évènement websocket) */
  refreshUnreadCount(): void {
    this.http
      .get<{ unread: number }>(`${this.apiUrl}/notifications/unread-count`)
      .subscribe({ next: res => this._unreadCount$.next(res.unread), error: () => {} });
  }
}
