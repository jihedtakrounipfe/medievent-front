import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthFacade } from '../../services/auth.facade';
import { AnyUser } from '../../user';

type AdminNavItem = { icon: string; label: string; path: string; badge?: number };
type AdminNavGroup = { label: string; items: AdminNavItem[] };

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-navbar.component.html',
  styleUrls: ['./admin-navbar.component.css']
})
export class AdminNavbarComponent implements OnInit {
  private auth = inject(AuthFacade);

  isSidebarOpen  = true;   // controls sidebar collapse on desktop
  isMobileOpen   = false;  // mobile overlay
  isUserMenuOpen = false;
  isNotifsOpen   = false;

  readonly user$ = this.auth.currentUser$;

  systemAlerts = [
    { icon: '⚠️', text: '3 médecins en attente de validation',  type: 'warning', time: 'Il y a 5 min' },
    { icon: '🔴', text: 'Erreur de synchronisation Keycloak',   type: 'danger',  time: 'Il y a 12 min' },
    { icon: '✅', text: 'Sauvegarde quotidienne réussie',       type: 'success', time: 'Il y a 1h' },
  ];

  navGroups: AdminNavGroup[] = [
    {
      label: 'Tableau de bord',
      items: [
        { icon: '📊', label: 'Vue d\'ensemble',  path: '/admin/dashboard' },
      ]
    },
    {
      label: 'Utilisateurs',
      items: [
        { icon: '🧑‍⚕️', label: 'Médecins',       path: '/admin/doctors'   },
        { icon: '🧑', label: 'Patients',         path: '/admin/patients'  },
        { icon: '🔎', label: 'Recherche',        path: '/admin/users'     },
      ]
    },
  ];

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('#admin-user-btn'))   this.isUserMenuOpen = false;
    if (!t.closest('#admin-notif-btn'))  this.isNotifsOpen   = false;
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.syncLayoutVars();
  }

  private syncLayoutVars(): void {
    const root = document.documentElement;
    root.style.setProperty('--admin-topbar-height', '56px');
    root.style.setProperty('--admin-sidebar-width', this.isSidebarOpen ? '240px' : '72px');
  }

  toggleSidebar():  void {
    this.isSidebarOpen  = !this.isSidebarOpen;
    this.syncLayoutVars();
  }
  toggleMobile():   void { this.isMobileOpen   = !this.isMobileOpen;  }
  toggleUserMenu(): void { this.isUserMenuOpen = !this.isUserMenuOpen; this.isNotifsOpen = false; }
  toggleNotifs():   void { this.isNotifsOpen   = !this.isNotifsOpen;  this.isUserMenuOpen = false; }
  closeMobile():    void { this.isMobileOpen   = false; }

  get alertCount(): number { return this.systemAlerts.filter(a => a.type !== 'success').length; }

  logout(): void {
    this.isUserMenuOpen = false;
    this.isNotifsOpen = false;
    this.auth.logout();
  }

  displayName(user: AnyUser): string {
    const first = (user.firstName ?? '').trim();
    const last = (user.lastName ?? '').trim();
    const name = `${first} ${last}`.trim();
    return name || user.email || 'Admin';
  }

  initials(user: AnyUser): string {
    const first = (user.firstName ?? '').trim();
    const last = (user.lastName ?? '').trim();
    const a = first ? first[0] : '';
    const b = last ? last[0] : '';
    const two = (a + b).toUpperCase();
    if (two) return two;
    const email = (user.email ?? '').trim();
    return (email ? email[0] : 'A').toUpperCase();
  }
}
