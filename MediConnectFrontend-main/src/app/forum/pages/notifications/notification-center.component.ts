import { Component, OnInit } from '@angular/core';
import { ForumNotificationService } from '../../services/forum-notification.service';
import { Notification } from '../../models/forum-notification';

@Component({
  selector: 'app-notification-center',
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.css'],
  standalone: false
})
export class NotificationCenterComponent implements OnInit {
  notifications: Notification[] = [];
  isLoading = true;
  error = '';

  constructor(private notifService: ForumNotificationService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.notifService.list(0, 50).subscribe({
      next: (page) => {
        this.notifications = page.content;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement notifications', err);
        this.error = 'Impossible de charger les notifications';
        this.isLoading = false;
      }
    });
  }

  markRead(n: Notification): void {
    if (n.read) return;
    this.notifService.markAsRead(n.id).subscribe({
      next: () => {
        n.read = true;
        this.notifService.refreshUnreadCount();
      },
      error: (err) => console.error('Erreur lecture notification', err)
    });
  }
}
