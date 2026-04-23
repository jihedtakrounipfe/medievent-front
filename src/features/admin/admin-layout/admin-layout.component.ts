import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthFacade } from '../../../core/services/auth.facade';
import { UserService } from '../../../core/services/user.service';
import { EventService } from '../../../core/services/event.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-stone-50 flex font-sans">
      
      <!-- Sidebar -->
      <aside [class.sidebar-collapsed]="isSidebarCollapsed()" 
             class="fixed left-0 top-0 bottom-0 z-50 bg-white/80 backdrop-blur-xl border-r border-stone-200 transition-all duration-300 w-64 flex flex-col shadow-sm">
        
        <!-- Logo -->
        <div class="h-20 flex items-center px-6 gap-3 mb-2">
          <div class="w-10 h-10 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-100 shrink-0">
            <span class="text-white text-xl font-bold">M</span>
          </div>
          <div class="logo-text overflow-hidden transition-opacity">
            <h1 class="font-bold text-stone-900 tracking-tight text-lg">MediConnect</h1>
            <p class="text-[10px] text-teal-600 font-bold uppercase tracking-widest">Administration</p>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-3 space-y-1">
          <div class="px-3 mb-2">
            <p class="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Principal</p>
          </div>
          <a routerLink="/admin/dashboard" routerLinkActive="nav-active" 
             class="nav-link group">
            <div class="nav-icon bg-stone-100 group-hover:bg-teal-50 text-stone-500 group-hover:text-teal-600 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span class="nav-text">Tableau de bord</span>
          </a>

          <div class="px-3 mt-6 mb-2">
            <p class="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Gestion Utilisateurs</p>
          </div>
          <a routerLink="/admin/doctors" routerLinkActive="nav-active" 
             class="nav-link group">
            <div class="nav-icon bg-stone-100 group-hover:bg-teal-50 text-stone-500 group-hover:text-teal-600 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span class="nav-text">Médecins</span>
            <span *ngIf="pendingDoctors() > 0" class="ml-auto px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full">
              {{ pendingDoctors() }}
            </span>
          </a>
          <a routerLink="/admin/patients" routerLinkActive="nav-active" 
             class="nav-link group">
            <div class="nav-icon bg-stone-100 group-hover:bg-teal-50 text-stone-500 group-hover:text-teal-600 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span class="nav-text">Patients</span>
          </a>

          <div class="px-3 mt-6 mb-2">
            <p class="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Contenu Médical</p>
          </div>
          <a routerLink="/admin/events" routerLinkActive="nav-active" 
             class="nav-link group">
            <div class="nav-icon bg-stone-100 group-hover:bg-teal-50 text-stone-500 group-hover:text-teal-600 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span class="nav-text">Événements</span>
          </a>
          <a routerLink="/admin/users" routerLinkActive="nav-active" 
             class="nav-link group">
            <div class="nav-icon bg-stone-100 group-hover:bg-teal-50 text-stone-500 group-hover:text-teal-600 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span class="nav-text">Recherche Globale</span>
          </a>

          <div class="px-3 mt-6 mb-2">
            <p class="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Système</p>
          </div>
          <a routerLink="/admin/audit" routerLinkActive="nav-active" 
             class="nav-link group">
            <div class="nav-icon bg-stone-100 group-hover:bg-teal-50 text-stone-500 group-hover:text-teal-600 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span class="nav-text">Journaux d'Audit</span>
          </a>
        </nav>

        <!-- User profile footer -->
        <div class="p-4 border-t border-stone-200">
          <div class="p-2 rounded-2xl bg-stone-50 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 font-bold shrink-0">
              AD
            </div>
            <div class="overflow-hidden min-w-0">
              <p class="text-sm font-bold text-stone-900 truncate">Administrateur</p>
              <p class="text-[10px] text-stone-500 truncate">admin&#64;mediconnect.tn</p>
            </div>
            <button (click)="logout()" class="ml-auto p-1.5 text-stone-400 hover:text-rose-500 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 transition-all duration-300 pl-64 overflow-x-hidden">
        
        <!-- Top Bar -->
        <header class="h-16 bg-white/70 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40 px-6 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button (click)="isSidebarCollapsed.set(!isSidebarCollapsed())" 
                    class="p-2 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
            <div class="relative hidden sm:block">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Rechercher..." 
                     class="pl-10 pr-4 py-2 bg-stone-100 border-transparent focus:bg-white focus:border-teal-300 focus:ring-4 focus:ring-teal-50 rounded-xl text-sm transition-all w-64 outline-none" />
            </div>
          </div>

          <div class="flex items-center gap-3 relative">
            <!-- Notification Bell -->
            <button (click)="isNotificationsOpen.set(!isNotificationsOpen())" 
                    [class.bg-teal-50]="isNotificationsOpen()"
                    [class.text-teal-600]="isNotificationsOpen()"
                    class="p-2 text-stone-500 hover:bg-stone-100 hover:scale-110 active:scale-95 rounded-lg transition-all relative group">
              <svg class="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              
              <!-- Pulse Badge -->
              <span *ngIf="pendingDoctors() > 0" class="absolute top-2.5 right-2.5 flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-rose-500 border border-white"></span>
              </span>
            </button>

            <!-- Notifications Dropdown -->
            <div *ngIf="isNotificationsOpen()" 
                 class="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-stone-200 z-50 overflow-hidden fade-in">
              <div class="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <h3 class="font-bold text-stone-900 text-sm">Alertes système</h3>
                <span class="px-2 py-0.5 bg-teal-100 text-teal-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  {{ pendingDoctors() > 0 ? '2 actives' : '1 active' }}
                </span>
              </div>
              
              <div class="max-h-[400px] overflow-y-auto">
                <!-- Pending Doctors Alert Card -->
                <div *ngIf="pendingDoctors() > 0" 
                     class="group relative p-4 hover:bg-stone-50 transition-all cursor-pointer border-l-4 border-amber-400">
                  <div class="flex gap-3">
                    <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                      ⚠️
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between mb-0.5">
                        <p class="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Validation requise</p>
                        <span class="text-[9px] text-stone-400">Il y a 5 min</span>
                      </div>
                      <p class="text-xs font-bold text-stone-900 leading-snug">
                        {{ pendingDoctors() }} médecins en attente de validation
                      </p>
                    </div>
                  </div>
                  <!-- Quick Action Button -->
                  <div class="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button routerLink="/admin/doctors" class="text-[10px] font-bold text-teal-600 hover:underline">Gérer →</button>
                  </div>
                </div>

                <!-- Keycloak Sync Alert Card (Critical) -->
                <div class="group relative p-4 hover:bg-stone-50 transition-all cursor-pointer border-l-4 border-rose-500 bg-rose-50/20">
                  <div class="flex gap-3">
                    <div class="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-lg shrink-0 animate-pulse">
                      🔴
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between mb-0.5">
                        <div class="flex items-center gap-1.5">
                          <p class="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Alerte Système</p>
                          <span class="flex h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"></span>
                        </div>
                        <span class="text-[9px] text-stone-400">Il y a 12 min</span>
                      </div>
                      <p class="text-xs font-bold text-stone-900 leading-snug">Erreur de synchronisation Keycloak</p>
                      <p class="text-[10px] text-stone-500 mt-1 italic">Veuillez vérifier les logs du serveur</p>
                    </div>
                  </div>
                </div>

                <!-- Backup Success Card -->
                <div class="group relative p-4 hover:bg-stone-50 transition-all cursor-pointer border-l-4 border-teal-500">
                  <div class="flex gap-3">
                    <div class="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-lg shrink-0 group-hover:rotate-12 transition-transform">
                      ✅
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between mb-0.5">
                        <p class="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Terminé</p>
                        <span class="text-[9px] text-stone-400">Il y a 1h</span>
                      </div>
                      <p class="text-xs font-bold text-stone-900 leading-snug">Sauvegarde quotidienne réussie</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="p-3 bg-stone-50 text-center border-t border-stone-100">
                <button class="text-[10px] font-bold text-teal-600 uppercase tracking-widest hover:text-teal-700">Tout marquer comme lu</button>
              </div>
            </div>

            <div class="h-8 w-px bg-stone-200 mx-1"></div>
            <div class="flex items-center gap-2 group cursor-pointer p-1 rounded-xl hover:bg-stone-50 transition-colors">
              <div class="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                AD
              </div>
              <p class="text-sm font-semibold text-stone-700 group-hover:text-stone-900 transition-colors hidden md:block">Admin</p>
            </div>
          </div>
        </header>

        <!-- View Container -->
        <div class="p-6 fade-in">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }
    
    .sidebar-collapsed {
      width: 80px;
    }
    
    .sidebar-collapsed .logo-text,
    .sidebar-collapsed .nav-text,
    .sidebar-collapsed .nav-active .nav-text,
    .sidebar-collapsed p {
      opacity: 0;
      pointer-events: none;
      width: 0;
    }

    .nav-link {
      @apply flex items-center gap-3 px-3 py-2.5 rounded-2xl text-stone-600 hover:text-teal-700 hover:bg-teal-50/50 transition-all;
    }

    .nav-active {
      @apply bg-teal-50 text-teal-700 shadow-sm border border-teal-100/50;
    }

    .nav-icon {
      @apply w-10 h-10 rounded-xl flex items-center justify-center shrink-0;
    }

    .nav-text {
      @apply text-sm font-semibold whitespace-nowrap overflow-hidden transition-all duration-300;
    }

    .nav-active .nav-icon {
      @apply bg-teal-600 text-white shadow-md shadow-teal-100;
    }

    .fade-in {
      animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class AdminLayoutComponent {
  private auth = inject(AuthFacade);
  private userService = inject(UserService);
  private eventService = inject(EventService);
  private router = inject(Router);

  isSidebarCollapsed = signal(false);
  isNotificationsOpen = signal(false);
  pendingDoctors = signal(0); 


  constructor() {
    this.refreshStats();
  }

  refreshStats() {
    this.userService.getAdminStats().subscribe({
      next: stats => this.pendingDoctors.set(stats.pendingDoctors),
      error: () => console.error('Failed to fetch admin stats for sidebar')
    });
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.isNotificationsOpen.set(false);
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
