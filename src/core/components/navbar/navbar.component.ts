import { Component, OnInit, HostListener, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthFacade } from '../../services/auth.facade';
import { NotificationService } from '../../services/notification.service';
import { AnyUser } from '../../user';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  private auth = inject(AuthFacade);
  private destroy$ = new Subject<void>();
  public notifService = inject(NotificationService);

  isScrolled        = false;
  isMobileMenuOpen  = false;
  isNotifOpen       = false;
  isUserMenuOpen    = false;
  isDoctor          = false;
  readonly user$ = this.auth.currentUser$;

  baseLinks = [
    { label: 'Accueil',     path: '/'          },
    { label: 'Discussions', path: '/forum'      },
    { label: 'Médecins',    path: '/auth/login' },
    { label: 'Rendez-vous', path: '/auth/login' },
  ];

  navLinks = [...this.baseLinks];

  @HostListener('window:scroll')
  onScroll(): void { this.isScrolled = window.scrollY > 10; }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('#notif-btn'))  this.isNotifOpen    = false;
    if (!t.closest('#user-btn'))   this.isUserMenuOpen = false;
  }

  ngOnInit(): void {
    this.auth.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.isDoctor = user?.userType === 'DOCTOR';
      const isPatient = user?.userType === 'PATIENT';
      
      if (user) {
        this.notifService.startPolling();
      } else {
        this.notifService.stopPolling();
      }

      let extraLinks: { label: string; path: string }[] = [];
      if (this.isDoctor) {
        extraLinks.push({ label: 'Agenda Global', path: '/events' });
        extraLinks.push({ label: 'Mes Conférences', path: '/doctor/events/my' });
      } else if (isPatient) {
        extraLinks.push({ label: 'Événements', path: '/events' });
      }
      
      this.navLinks = [
        ...this.baseLinks,
        ...extraLinks
      ];
    });
  }

  ngOnDestroy(): void {
    this.notifService.stopPolling();
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleMobile(): void { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  
  toggleNotif(): void {
    this.isNotifOpen = !this.isNotifOpen;
    this.isUserMenuOpen = false;
    // Mark all read when opening
    if (this.isNotifOpen) this.notifService.markAllRead();
  }

  toggleUser(): void  { this.isUserMenuOpen = !this.isUserMenuOpen; this.isNotifOpen = false; }
  closeMobile(): void { this.isMobileMenuOpen = false; }

  get unreadCount(): number { return this.notifService.unreadCount(); }

  logout(): void {
    this.isUserMenuOpen = false;
    this.isNotifOpen = false;
    this.notifService.stopPolling();
    this.notifService.clear();
    this.auth.logout();
  }

  displayName(user: AnyUser): string {
    const first = (user.firstName ?? '').trim();
    const last = (user.lastName ?? '').trim();
    const name = `${first} ${last}`.trim();
    return name || user.email || 'Utilisateur';
  }

  initials(user: AnyUser): string {
    const first = (user.firstName ?? '').trim();
    const last = (user.lastName ?? '').trim();
    const a = first ? first[0] : '';
    const b = last ? last[0] : '';
    const two = (a + b).toUpperCase();
    if (two) return two;
    const email = (user.email ?? '').trim();
    return (email ? email[0] : 'U').toUpperCase();
  }

  displayRole(user: AnyUser): string {
    switch (user.userType) {
      case 'PATIENT': return 'Patient';
      case 'DOCTOR': return 'Médecin';
      case 'ADMINISTRATOR': return 'Admin';
      case 'INSTITUTION': return 'Institution';
      default: return 'Utilisateur';
    }
  }

  timeAgo(date: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    return `Il y a ${Math.floor(diff / 3600)}h`;
  }
}
