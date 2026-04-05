import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../auth/toast/toast.service';

type Stats = { totalUsers: number; totalPatients: number; totalDoctors: number; activeUsers: number };

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h1 class="text-2xl font-bold text-stone-900">Tableau de bord</h1>
          <p class="text-sm text-stone-500 mt-0.5">Statistiques globales</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <a routerLink="/admin/patients" class="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-800">
            Patients
          </a>
          <a routerLink="/admin/doctors" class="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-800">
            Médecins
          </a>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Total utilisateurs</p>
              <p class="text-3xl font-bold text-stone-900 mt-1">{{ stats()?.totalUsers ?? '—' }}</p>
              <p class="text-xs text-stone-500 mt-1">Actifs: {{ stats()?.activeUsers ?? '—' }}</p>
            </div>
            <div class="w-16 h-16">
              <svg viewBox="0 0 36 36" class="w-16 h-16">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#e7e5e4" stroke-width="3"/>
                <path [attr.stroke-dasharray]="dash(stats()?.activeUsers, stats()?.totalUsers)"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#14b8a6" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Patients</p>
              <p class="text-3xl font-bold text-stone-900 mt-1">{{ stats()?.totalPatients ?? '—' }}</p>
              <p class="text-xs text-stone-500 mt-1">Part: {{ percent(stats()?.totalPatients, stats()?.totalUsers) }}%</p>
            </div>
            <div class="w-16 h-16">
              <svg viewBox="0 0 36 36" class="w-16 h-16">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#e7e5e4" stroke-width="3"/>
                <path [attr.stroke-dasharray]="dash(stats()?.totalPatients, stats()?.totalUsers)"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#0d9488" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Médecins</p>
              <p class="text-3xl font-bold text-stone-900 mt-1">{{ stats()?.totalDoctors ?? '—' }}</p>
              <p class="text-xs text-stone-500 mt-1">Part: {{ percent(stats()?.totalDoctors, stats()?.totalUsers) }}%</p>
            </div>
            <div class="w-16 h-16">
              <svg viewBox="0 0 36 36" class="w-16 h-16">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#e7e5e4" stroke-width="3"/>
                <path [attr.stroke-dasharray]="dash(stats()?.totalDoctors, stats()?.totalUsers)"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-5 bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-stone-800">Actions rapides</p>
          <button (click)="load()" class="text-sm text-teal-700 hover:text-teal-800 font-semibold">Rafraîchir</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <a routerLink="/admin/patients" class="p-4 rounded-2xl border border-stone-200 hover:bg-stone-50">
            <p class="text-sm font-semibold text-stone-900">Gérer patients</p>
            <p class="text-xs text-stone-500 mt-1">Lister, consulter, bloquer / débloquer</p>
          </a>
          <a routerLink="/admin/doctors" class="p-4 rounded-2xl border border-stone-200 hover:bg-stone-50">
            <p class="text-sm font-semibold text-stone-900">Gérer médecins</p>
            <p class="text-xs text-stone-500 mt-1">Lister, consulter, bloquer / débloquer</p>
          </a>
          <a routerLink="/admin/users" class="p-4 rounded-2xl border border-stone-200 hover:bg-stone-50">
            <p class="text-sm font-semibold text-stone-900">Recherche globale</p>
            <p class="text-xs text-stone-500 mt-1">Trouver un compte rapidement</p>
          </a>
        </div>
      </div>
    </div>
  `,
})
export class AdminDashboardComponent {
  private userService = inject(UserService);
  private toast = inject(ToastService);

  loading = signal(false);
  stats = signal<Stats | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.userService.getAdminStats().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: s => this.stats.set(s),
      error: () => this.toast.error('Impossible de charger les statistiques.'),
    });
  }

  percent(value?: number, total?: number): number {
    if (!value || !total) return 0;
    return Math.round((value / total) * 100);
  }

  dash(value?: number, total?: number): string {
    const p = this.percent(value, total);
    return `${p}, 100`;
  }
}
