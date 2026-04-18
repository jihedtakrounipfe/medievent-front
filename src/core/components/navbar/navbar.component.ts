import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthFacade } from '../../services/auth.facade';
import { AnyUser } from '../../user';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  private auth = inject(AuthFacade);

  isScrolled        = false;
  isMobileMenuOpen  = false;
  isNotifOpen       = false;
  isUserMenuOpen    = false;
  readonly user$ = this.auth.currentUser$;

  navLinks = [
    { label: 'Accueil',      path: '/'             },
    { label: 'Discussions',  path: '/forum'         },
    { label: 'Médecins',     path: '/doctors'       },
    { label: 'Rendez-vous',  path: '/appointments'  },
  ];
  notifications = [
    { icon: '📅', text: 'Rappel : RDV demain à 10h30',          time: 'Il y a 1h',  unread: true  },
    { icon: '💊', text: 'Prenez votre médicament (Metformine)',  time: 'Il y a 2h',  unread: true  },
    { icon: '📋', text: "Résultat d'analyse disponible",         time: 'Hier',       unread: false },
  ];

  @HostListener('window:scroll')
  onScroll(): void { this.isScrolled = window.scrollY > 10; }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('#notif-btn'))  this.isNotifOpen    = false;
    if (!t.closest('#user-btn'))   this.isUserMenuOpen = false;
  }

  ngOnInit(): void {}

  toggleMobile(): void    { this.isMobileMenuOpen  = !this.isMobileMenuOpen; }
  toggleNotif(): void     { this.isNotifOpen        = !this.isNotifOpen;   this.isUserMenuOpen = false; }
  toggleUser(): void      { this.isUserMenuOpen     = !this.isUserMenuOpen; this.isNotifOpen   = false; }
  closeMobile(): void     { this.isMobileMenuOpen   = false; }
  markAllRead(): void     { this.notifications.forEach(n => n.unread = false); }

  get unreadCount(): number { return this.notifications.filter(n => n.unread).length; }

  logout(): void {
    this.isUserMenuOpen = false;
    this.isNotifOpen = false;
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
}
