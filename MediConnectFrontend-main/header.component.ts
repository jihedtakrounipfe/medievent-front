import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { ForumNotificationService } from '../../forum/services/forum-notification.service';

interface Notification {
  id: string;
  type: 'COMMENT' | 'UPVOTE' | 'DOCTOR_RESPONSE' | 'PINNED' | 'BADGE';
  message: string;
  read: boolean;
  createdAt: Date;
}

@Component({
  selector: 'app-header',
  template: \
    <header class="app-header">

      <!-- LOGO -->
      <div class="header-logo" (click)="goTo('/forum')">
        <div class="logo-mark">
          <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <span class="logo-text">Medi<span class="logo-accent">Connect</span></span>
      </div>

      <!-- BURGER (mobile) -->
      <button class="burger" (click)="toggleNav()" aria-label="Menu">
        <span [ngClass]="{open: isOpen}"></span>
        <span [ngClass]="{open: isOpen}"></span>
        <span [ngClass]="{open: isOpen}"></span>
      </button>

      <!-- NAV LINKS -->
      <nav class="header-nav" [ngClass]="{open: isOpen}">
        <a class="nav-link" (click)="goTo('/forum'); toggleNav()"
           [class.active]="router.url === '/forum'">
          Accueil
        </a>
        <a class="nav-link" (click)="goTo('/forum/liste'); toggleNav()"
           [class.active]="router.url.startsWith('/forum/liste')">
          Discussions
        </a>
        <a class="nav-link nav-cta" (click)="goTo('/forum/nouveau'); toggleNav()">
          <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Créer
        </a>
      </nav>

      <!-- RIGHT ZONE AVEC NOTIFICATIONS DROPDOWN -->
      <div class="header-right">
        <!-- NOTIFICATIONS AVEC DROPDOWN -->
        <div class="notifications-wrapper">
          <button class="notif-btn" (click)="toggleNotifications()" aria-label="Notifications">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            <span *ngIf="unreadCount" class="notif-badge">{{ unreadCount }}</span>
          </button>

          <!-- DROPDOWN NOTIFICATIONS -->
          <div class="notifications-dropdown" *ngIf="showNotifications">
            <div class="dropdown-header">
              <h3>Notifications</h3>
              <span class="mark-read" (click)="markAllAsRead()">Tout marquer comme lu</span>
            </div>
            
            <div class="dropdown-content">
              <div *ngIf="notificationsLoading" class="loading-spinner">
                <div class="spinner"></div>
              </div>
              
              <div *ngIf="!notificationsLoading && notifications.length === 0" class="empty-state">
                Aucune notification
              </div>
              
              <div *ngFor="let notif of notifications" 
                   class="notification-item" 
                   [class.unread]="!notif.read"
                   (click)="markAsRead(notif, )">
                <div class="notif-icon">{{ getNotificationIcon(notif.type) }}</div>
                <div class="notif-content">
                  <div class="notif-message">{{ notif.message }}</div>
                  <div class="notif-time">{{ getTimeAgo(notif.createdAt) }}</div>
                </div>
                <div *ngIf="!notif.read" class="unread-dot"></div>
              </div>
            </div>
            
            <div class="dropdown-footer" (click)="viewAllNotifications()">
              Voir toutes les notifications
            </div>
          </div>
        </div>
        
        <div class="user-avatar">U</div>
      </div>

    </header>
  \,
  styles: [\
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=DM+Sans:wght@400;500;600&display=swap');

    .app-header {
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      height: 64px;
      background: #ffffff;
      border-bottom: 1px solid #e5e2dd;
      box-shadow: 0 1px 4px rgba(0,0,0,.04);
      display: flex; align-items: center;
      padding: 0 28px; gap: 16px;
      font-family: 'DM Sans', sans-serif;
    }

    /* LOGO */
    .header-logo {
      display: flex; align-items: center; gap: 10px;
      cursor: pointer; flex-shrink: 0; text-decoration: none;
    }
    .logo-mark {
      width: 34px; height: 34px; border-radius: 9px;
      background: linear-gradient(135deg, #0d9488, #0891b2);
      display: flex; align-items: center; justify-content: center;
      color: #fff; flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(13,148,136,.25);
    }
    .logo-mark svg { width: 17px; height: 17px; }
    .logo-text {
      font-family: 'Fraunces', serif;
      font-size: 17px; font-weight: 700;
      color: #0d1117; letter-spacing: -.3px;
    }
    .logo-accent { color: #0d9488; }

    /* NAV */
    .header-nav {
      display: flex; align-items: center; gap: 4px;
      margin: 0 auto;
    }
    .nav-link {
      display: inline-flex; align-items: center; gap: 6px;
      height: 36px; padding: 0 14px;
      border: none; background: transparent;
      color: #6b7280; font-size: 13.5px; font-weight: 500;
      border-radius: 8px; cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      text-decoration: none;
      transition: all .15s; position: relative;
    }
    .nav-link:hover { background: #f5f4f2; color: #0d1117; }
    .nav-link.active { color: #0d9488; font-weight: 600; }
    .nav-link.active::after {
      content: '';
      position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%);
      width: 20px; height: 2px;
      background: #0d9488; border-radius: 2px;
    }
    .nav-cta {
      background: #0d9488; color: #fff !important;
      padding: 0 16px; font-weight: 600;
      box-shadow: 0 2px 8px rgba(13,148,136,.25);
      margin-left: 8px;
    }
    .nav-cta svg { width: 13px; height: 13px; }
    .nav-cta:hover {
      background: #0f766e !important;
      box-shadow: 0 4px 12px rgba(13,148,136,.35) !important;
      transform: translateY(-1px);
    }

    /* RIGHT */
    .header-right {
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
      margin-left: auto;
    }
    
    /* NOTIFICATIONS DROPDOWN */
    .notifications-wrapper {
      position: relative;
    }
    
    .notif-btn {
      position: relative; width: 36px; height: 36px;
      background: #f5f4f2; border: 1px solid #e5e2dd;
      border-radius: 9px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #6b7280; transition: all .15s;
    }
    .notif-btn svg { width: 17px; height: 17px; }
    .notif-btn:hover { background: #ede9e3; color: #0d1117; }
    .notif-badge {
      position: absolute; top: -4px; right: -4px;
      background: #0d9488; color: #fff;
      font-size: 9px; font-weight: 700;
      width: 16px; height: 16px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff;
    }
    
    .notifications-dropdown {
      position: absolute;
      top: 45px;
      right: 0;
      width: 320px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1), 0 5px 10px rgba(0,0,0,0.05);
      border: 1px solid #e5e2dd;
      z-index: 10000;
      overflow: hidden;
    }

    .dropdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #e5e2dd;
      background: #fafaf9;
    }

    .dropdown-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #0d1117;
    }

    .mark-read {
      font-size: 12px;
      color: #0d9488;
      cursor: pointer;
    }

    .mark-read:hover {
      text-decoration: underline;
    }

    .dropdown-content {
      max-height: 350px;
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid #f0efed;
      cursor: pointer;
      transition: background 0.15s;
    }

    .notification-item:hover {
      background: #f5f4f2;
    }

    .notification-item.unread {
      background: #f0fdfa;
    }

    .notif-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #f5f4f2;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    .notif-content {
      flex: 1;
      min-width: 0;
    }

    .notif-message {
      font-size: 13px;
      color: #0d1117;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 2px;
    }

    .notif-time {
      font-size: 11px;
      color: #9ca3af;
    }

    .unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #0d9488;
      flex-shrink: 0;
    }

    .loading-spinner {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 30px;
    }

    .spinner {
      width: 30px;
      height: 30px;
      border: 3px solid #e5e2dd;
      border-top-color: #0d9488;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      padding: 30px;
      text-align: center;
      color: #9ca3af;
      font-size: 14px;
    }

    .dropdown-footer {
      padding: 10px 16px;
      text-align: center;
      border-top: 1px solid #e5e2dd;
      font-size: 12px;
      color: #0d9488;
      cursor: pointer;
      background: #fafaf9;
    }

    .dropdown-footer:hover {
      background: #f5f4f2;
      text-decoration: underline;
    }
    
    .user-avatar {
      width: 36px; height: 36px; border-radius: 9px;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      color: #fff; font-size: 13px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .15s;
      box-shadow: 0 2px 6px rgba(37,99,235,.2);
      font-family: 'DM Sans', sans-serif;
    }
    .user-avatar:hover { transform: translateY(-1px); }

    /* BURGER */
    .burger {
      display: none; flex-direction: column;
      justify-content: space-between;
      width: 22px; height: 16px;
      background: transparent; border: none;
      cursor: pointer; padding: 0; margin-left: auto;
    }
    .burger span {
      display: block; height: 2px;
      background: #6b7280; border-radius: 2px;
      transition: transform .3s, opacity .3s;
    }
    .burger span.open:nth-child(1) { transform: translateY(7px) rotate(45deg); }
    .burger span.open:nth-child(2) { opacity: 0; }
    .burger span.open:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

    @media (max-width: 768px) {
      .header-nav {
        position: fixed; top: 64px; left: 0; right: 0;
        background: #fff; border-bottom: 1px solid #e5e2dd;
        flex-direction: column; padding: 12px 16px;
        display: none; box-shadow: 0 4px 16px rgba(0,0,0,.08);
      }
      .header-nav.open { display: flex; }
      .nav-link { width: 100%; justify-content: flex-start; }
      .nav-link.active::after { display: none; }
      .burger { display: flex; }
      .header-right { margin-left: 0; }
      
      .notifications-dropdown {
        position: fixed;
        top: 64px;
        right: 10px;
        left: 10px;
        width: auto;
      }
    }
  \],
  standalone: false
})
export class HeaderComponent implements OnInit {
  isOpen = false;
  unreadCount = 0;
  showNotifications = false;
  notifications: Notification[] = [];
  notificationsLoading = false;

  mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'COMMENT',
      message: 'Jean Dupont a commenté votre post "Douleurs thoraciques"',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 5)
    },
    {
      id: '2',
      type: 'UPVOTE',
      message: 'Votre commentaire a reçu 5 upvotes',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30)
    },
    {
      id: '3',
      type: 'DOCTOR_RESPONSE',
      message: 'Dr. Marie Lambert a répondu à votre question',
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
    }
  ];

  constructor(
    public router: Router,
    private notificationService: ForumNotificationService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.loadMockNotifications();
  }

  goTo(path: string) { 
    this.router.navigate([path]); 
    this.isOpen = false;
    this.showNotifications = false;
  }
  
  toggleNav() { this.isOpen = !this.isOpen; }
  
  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.loadMockNotifications();
    }
  }

  loadMockNotifications() {
    this.notificationsLoading = false;
    this.notifications = this.mockNotifications;
    this.updateUnreadCount();
  }

  updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  markAsRead(notification: Notification, event: Event) {
    event.stopPropagation();
    if (notification.read) return;
    
    notification.read = true;
    this.updateUnreadCount();
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.updateUnreadCount();
  }

  viewAllNotifications() {
    this.router.navigate(['/forum/notifications']);
    this.showNotifications = false;
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      'COMMENT': '💬',
      'UPVOTE': '⬆️',
      'DOCTOR_RESPONSE': '👨‍⚕️',
      'PINNED': '📌',
      'BADGE': '🏆'
    };
    return icons[type] || '🔔';
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'à l\'instant';
    if (minutes < 60) return il y a  min;
    if (hours < 24) return il y a  h;
    if (days === 1) return 'hier';
    return il y a  jours;
  }

  @HostListener('document:click', [''])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showNotifications = false;
    }
  }
}
