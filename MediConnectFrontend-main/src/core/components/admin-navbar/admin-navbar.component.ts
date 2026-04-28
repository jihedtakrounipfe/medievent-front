import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
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
  styleUrls: ['./admin-navbar.component.css'],
})
export class AdminNavbarComponent {
  private auth = inject(AuthFacade);

  isSidebarOpen = true;
  isMobileOpen = false;
  isUserMenuOpen = false;
  isNotifsOpen = false;

  readonly user$ = this.auth.currentUser$;

  systemAlerts = [
    { icon: '!', text: '3 medecins en attente de validation', type: 'warning', time: 'Il y a 5 min' },
    { icon: 'x', text: 'Erreur de synchronisation Keycloak', type: 'danger', time: 'Il y a 12 min' },
    { icon: 'ok', text: 'Sauvegarde quotidienne reussie', type: 'success', time: 'Il y a 1h' },
  ];

  navGroups: AdminNavGroup[] = [
    {
      label: 'Tableau de bord',
      items: [
        { icon: 'P', label: 'Vue d\'ensemble', path: '/admin/dashboard' },
      ],
    },
    {
      label: 'Utilisateurs',
      items: [
        { icon: '🧑‍⚕️', label: 'Médecins',       path: '/admin/doctors'   },
        { icon: '🧑', label: 'Patients',         path: '/admin/patients'  },
        
      ]
    },
    {
  label: 'Abonnements',
  items: [
{ icon: '📊', label: 'Statistiques', path: '/admin/sub/dashboard' },
{ icon: '📋', label: 'Plans',        path: '/admin/sub/plans'        },
{ icon: '🔖', label: 'Promo Codes',  path: '/admin/sub/promo-codes'  },
{ icon: '📑', label: 'Abonnements',  path: '/admin/sub/subscriptions'},
{ icon: '💰', label: 'Paiements',    path: '/admin/sub/payments'     },
  ]
},
  ];

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('#admin-user-btn')) this.isUserMenuOpen = false;
    if (!target.closest('#admin-notif-btn')) this.isNotifsOpen = false;
  }

  ngAfterViewInit(): void {
    this.syncLayoutVars();
  }

  private syncLayoutVars(): void {
    const root = document.documentElement;
    root.style.setProperty('--admin-topbar-height', '56px');
    root.style.setProperty('--admin-sidebar-width', this.isSidebarOpen ? '240px' : '72px');
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
    this.syncLayoutVars();
  }

  toggleMobile(): void {
    this.isMobileOpen = !this.isMobileOpen;
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isNotifsOpen = false;
  }

  toggleNotifs(): void {
    this.isNotifsOpen = !this.isNotifsOpen;
    this.isUserMenuOpen = false;
  }

  closeMobile(): void {
    this.isMobileOpen = false;
  }

  get alertCount(): number {
    return this.systemAlerts.filter(alert => alert.type !== 'success').length;
  }

  logout(): void {
    this.isUserMenuOpen = false;
    this.isNotifsOpen = false;
    this.auth.logout();
  }

  displayName(user: AnyUser): string {
    const name = `${(user.firstName ?? '').trim()} ${(user.lastName ?? '').trim()}`.trim();
    return name || user.email || 'Admin';
  }

  initials(user: AnyUser): string {
    const first = (user.firstName ?? '').trim();
    const last = (user.lastName ?? '').trim();
    const pair = `${first ? first[0] : ''}${last ? last[0] : ''}`.toUpperCase();
    if (pair) return pair;
    return ((user.email ?? 'A').trim()[0] || 'A').toUpperCase();
  }
}
