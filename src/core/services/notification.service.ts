import { Injectable, signal, inject } from '@angular/core';
import { catchError, of } from 'rxjs';
import { EventService } from './event.service';

export interface AppNotification {
  id: string | number;
  title: string;
  message: string;
  eventId?: number;
  type: 'live_started' | 'info';
  timestamp: Date;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private eventService = inject(EventService);

  notifications = signal<AppNotification[]>([]);

  unreadCount = signal(0);
  private pollInterval: any;

  private recalcUnread() {
    this.unreadCount.set(this.notifications().filter(n => !n.read).length);
  }

  push(notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
    // Prevent duplicate live notifications for the same event
    if (notif.eventId && this.notifications().some(n => n.eventId === notif.eventId && n.type === notif.type)) {
      return;
    }

    const newNotif: AppNotification = {
      ...notif,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false
    };
    this.notifications.update(list => [newNotif, ...list].slice(0, 50)); // keep last 50
    this.recalcUnread();
  }

  markAllRead() {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
    this.unreadCount.set(0);
  }

  markRead(id: string | number) {
    if (typeof id === 'number') {
      this.eventService.markNotificationRead(id).subscribe();
    }
    this.notifications.update(list => list.map(n => n.id === id ? { ...n, read: true } : n));
    this.recalcUnread();
  }

  clear() {
    this.eventService.clearNotifications().subscribe();
    this.notifications.set([]);
    this.unreadCount.set(0);
  }

  startPolling() {
    if (this.pollInterval) return;
    this.fetch();
    this.pollInterval = setInterval(() => this.fetch(), 10000); // every 10 seconds
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private fetch() {
    this.eventService.getMyNotifications().pipe(
      catchError((err) => {
        if (err.status === 401) {
          console.warn('[NOTIF] Session expired, stopping poll.');
          this.stopPolling();
        }
        return of([]);
      })
    ).subscribe(res => {
      console.log(`[NOTIF-DEBUG] Received ${res.length} notifications from server:`, res);
      const mapped: AppNotification[] = res.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        eventId: n.eventId,
        type: n.type,
        timestamp: new Date(n.timestamp ?? n.createdAt ?? Date.now()),
        read: n.isRead ?? n.read ?? false
      }));
      this.notifications.set(mapped);
      this.recalcUnread();
    });
  }
}
