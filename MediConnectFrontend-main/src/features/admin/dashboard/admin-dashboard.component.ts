import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import {
  AdminAuditStats,
  AdminService,
  AuditActionStat,
  AuditCategoryStat,
  MostActiveAccount,
} from '../../../core/services/admin.service';
import { ToastService } from '../../auth/toast/toast.service';

const AUDIT_LABELS: Record<string, string> = {
  ACCOUNT_ACTIVATED: 'Compte active',
  ACCOUNT_CREATED: 'Compte cree',
  ACCOUNT_DEACTIVATED: 'Compte desactive',
  EMAIL_VERIFICATION_SUCCESS: 'Email verifie',
  LOGIN_2FA_SUCCESS: 'Connexion 2FA',
  LOGIN_FAILED: 'Connexion echouee',
  LOGIN_SUCCESS: 'Connexion reussie',
  LOGOUT: 'Deconnexion',
  PASSWORD_CHANGE_SUCCESS: 'Mot de passe modifie',
  PROFILE_UPDATED: 'Profil mis a jour',
  SIGNUP_DOCTOR: 'Inscription medecin',
  SIGNUP_PATIENT: 'Inscription patient',
};

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h1 class="text-2xl font-bold text-stone-900">Tableau de bord</h1>
          <p class="text-sm text-stone-500 mt-0.5">Audit global et comptes les plus actifs</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <a routerLink="/admin/patients" class="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-800">
            Patients
          </a>
          <a routerLink="/admin/doctors" class="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-800">
            Medecins
          </a>
          <button (click)="load()" class="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold">
            Rafraichir
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
          <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Utilisateurs</p>
          <p class="text-3xl font-bold text-stone-900 mt-2">{{ stats()?.totalUsers ?? 0 }}</p>
          <p class="text-xs text-stone-500 mt-2">Actifs: {{ stats()?.activeUsers ?? 0 }}</p>
        </div>

        <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
          <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Patients</p>
          <p class="text-3xl font-bold text-stone-900 mt-2">{{ stats()?.totalPatients ?? 0 }}</p>
          <p class="text-xs text-stone-500 mt-2">Part: {{ percent(stats()?.totalPatients, stats()?.totalUsers) }}%</p>
        </div>

        <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
          <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Medecins</p>
          <p class="text-3xl font-bold text-stone-900 mt-2">{{ stats()?.totalDoctors ?? 0 }}</p>
          <p class="text-xs text-stone-500 mt-2">Part: {{ percent(stats()?.totalDoctors, stats()?.totalUsers) }}%</p>
        </div>

        <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
          <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Audit logs</p>
          <p class="text-3xl font-bold text-stone-900 mt-2">{{ stats()?.totalAuditLogs ?? 0 }}</p>
          <p class="text-xs text-stone-500 mt-2">{{ auditSuccessRate() }}% de succes</p>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-5 gap-5 mb-5">
        <div class="xl:col-span-3 bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 class="text-sm font-bold text-stone-800 uppercase tracking-wide">Top actions audit</h2>
              <p class="text-xs text-stone-500 mt-1">Evenements les plus frequents de la table mc_audit_log</p>
          </div>
            <span class="text-xs text-stone-400">{{ topActions().length }} action(s)</span>
          </div>

          <div *ngIf="loading()" class="space-y-3">
            <div *ngFor="let _ of [1,2,3,4,5]" class="animate-pulse">
              <div class="h-3 bg-stone-100 rounded-full w-28 mb-2"></div>
              <div class="h-2 bg-stone-100 rounded-full"></div>
            </div>
          </div>

          <div *ngIf="!loading() && topActions().length > 0" class="space-y-4">
            <div *ngFor="let action of topActions()">
              <div class="flex items-center justify-between gap-3 mb-1.5">
                <p class="text-sm font-semibold text-stone-800 truncate">{{ auditLabel(action.action) }}</p>
                <p class="text-sm font-bold text-stone-900">{{ action.count }}</p>
              </div>
              <div class="h-2 rounded-full bg-stone-100 overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500" [style.width.%]="barWidth(action.count, topActionMax())"></div>
              </div>
              <div class="flex items-center justify-between text-[11px] text-stone-500 mt-1.5">
                <span>{{ action.successCount }} succes</span>
                <span>{{ action.failedCount }} echec{{ action.failedCount === 1 ? '' : 's' }}</span>
              </div>
            </div>
          </div>

          <p *ngIf="!loading() && topActions().length === 0" class="text-sm text-stone-400">
            Aucun agregat d'action disponible.
          </p>
        </div>

        <div class="xl:col-span-2 bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
          <div class="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 class="text-sm font-bold text-stone-800 uppercase tracking-wide">Succes global</h2>
              <p class="text-xs text-stone-500 mt-1">Reussite vs echec sur tous les audits</p>
            </div>
            <span class="text-xs text-stone-400">{{ stats()?.totalAuditLogs ?? 0 }} log(s)</span>
          </div>

          <div class="flex flex-col items-center">
            <div class="relative w-44 h-44">
              <svg viewBox="0 0 36 36" class="w-44 h-44 -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e7e5e4"
                  stroke-width="3.2" />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#10b981"
                  stroke-width="3.2"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="dash(auditSuccessRate())" />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p class="text-3xl font-bold text-stone-900">{{ auditSuccessRate() }}%</p>
                <p class="text-xs text-stone-500 mt-1">succes</p>
              </div>
            </div>

            <div class="w-full mt-6 space-y-3">
              <div>
                <div class="flex items-center justify-between text-sm mb-1">
                  <span class="font-semibold text-emerald-700">Succes</span>
                  <span class="text-stone-600">{{ stats()?.successfulAuditLogs ?? 0 }}</span>
                </div>
                <div class="h-2 rounded-full bg-emerald-50 overflow-hidden">
                  <div class="h-full rounded-full bg-emerald-500" [style.width.%]="auditSuccessRate()"></div>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between text-sm mb-1">
                  <span class="font-semibold text-rose-700">Echecs</span>
                  <span class="text-stone-600">{{ stats()?.failedAuditLogs ?? 0 }}</span>
                </div>
                <div class="h-2 rounded-full bg-rose-50 overflow-hidden">
                  <div class="h-full rounded-full bg-rose-500" [style.width.%]="auditFailureRate()"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div class="xl:col-span-2 bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
          <div class="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 class="text-sm font-bold text-stone-800 uppercase tracking-wide">Categories d'audit</h2>
              <p class="text-xs text-stone-500 mt-1">Repartition des families d'evenements</p>
            </div>
          </div>

          <div class="space-y-3" *ngIf="categoryBreakdown().length > 0; else noCategoryTpl">
            <div *ngFor="let category of categoryBreakdown()" class="rounded-2xl border border-stone-200 p-4">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-semibold text-stone-800">{{ category.category || 'SYSTEM' }}</p>
                <p class="text-lg font-bold text-stone-900">{{ category.count }}</p>
              </div>
              <div class="h-2 rounded-full bg-stone-100 overflow-hidden mt-3">
                <div class="h-full rounded-full bg-stone-800" [style.width.%]="percent(category.count, stats()?.totalAuditLogs)"></div>
              </div>
            </div>
          </div>

          <ng-template #noCategoryTpl>
            <p class="text-sm text-stone-400">Aucune categorie disponible.</p>
          </ng-template>
        </div>

        <div class="xl:col-span-3 bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-stone-100 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-bold text-stone-800 uppercase tracking-wide">Comptes les plus actifs</h2>
              <p class="text-xs text-stone-500 mt-1">Utilisateurs avec le plus d'actions journalisees</p>
            </div>
            <span class="text-xs text-stone-400">{{ mostActiveAccounts().length }} compte(s)</span>
          </div>

          <div *ngIf="mostActiveAccounts().length === 0" class="px-6 py-8 text-sm text-stone-400">
            Aucun compte actif n'a encore genere de trace exploitable.
          </div>

          <div *ngIf="mostActiveAccounts().length > 0" class="divide-y divide-stone-50">
            <div *ngFor="let account of mostActiveAccounts()" class="px-6 py-4 flex flex-col md:flex-row md:items-center gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <a
                    [routerLink]="routeForAccount(account)"
                    class="text-sm font-semibold text-stone-900 hover:text-teal-700 truncate">
                    {{ fullName(account) }}
                  </a>
                  <span class="px-2 py-0.5 rounded-full bg-stone-100 text-[10px] font-semibold text-stone-600">
                    {{ account.userType || 'UTILISATEUR' }}
                  </span>
                </div>
                <p class="text-xs text-stone-500 truncate mt-1">{{ account.userEmail }}</p>
              </div>

              <div class="grid grid-cols-3 gap-3 md:w-[22rem]">
                <div class="rounded-2xl bg-stone-50 px-3 py-2 text-center">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Actions</p>
                  <p class="text-lg font-bold text-stone-900 mt-1">{{ account.actionCount }}</p>
                </div>
                <div class="rounded-2xl bg-emerald-50 px-3 py-2 text-center">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Succes</p>
                  <p class="text-lg font-bold text-emerald-700 mt-1">{{ account.successCount }}</p>
                </div>
                <div class="rounded-2xl bg-rose-50 px-3 py-2 text-center">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-rose-700">Echecs</p>
                  <p class="text-lg font-bold text-rose-700 mt-1">{{ account.failedCount }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminDashboardComponent {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  loading = signal(false);
  stats = signal<AdminAuditStats | null>(null);

  topActions = computed(() => this.stats()?.topActions ?? []);
  categoryBreakdown = computed(() => this.stats()?.categoryBreakdown ?? []);
  mostActiveAccounts = computed(() => this.stats()?.mostActiveAccounts ?? []);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminService.getAuditDashboardStats().pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: stats => this.stats.set(stats),
      error: () => this.toast.error('Impossible de charger les statistiques admin.'),
    });
  }

  percent(value?: number, total?: number): number {
    if (!value || !total) return 0;
    return Math.round((value / total) * 100);
  }

  dash(percent: number): string {
    return `${Math.max(0, Math.min(100, percent))}, 100`;
  }

  auditSuccessRate(): number {
    return this.percent(this.stats()?.successfulAuditLogs, this.stats()?.totalAuditLogs);
  }

  auditFailureRate(): number {
    return this.percent(this.stats()?.failedAuditLogs, this.stats()?.totalAuditLogs);
  }

  topActionMax(): number {
    return this.topActions().reduce((max, action) => Math.max(max, action.count ?? 0), 0);
  }

  barWidth(value: number, max: number): number {
    if (!max) return 0;
    return Math.max(8, Math.round((value / max) * 100));
  }

  auditLabel(action: string): string {
    return AUDIT_LABELS[action] || action.replace(/_/g, ' ');
  }

  fullName(account: MostActiveAccount): string {
    const name = `${account.firstName ?? ''} ${account.lastName ?? ''}`.trim();
    return name || account.userEmail || `Compte #${account.userId}`;
  }

  routeForAccount(account: MostActiveAccount): (string | number)[] {
    if (account.userType === 'DOCTOR') return ['/admin/doctors', account.userId];
    if (account.userType === 'PATIENT') return ['/admin/patients', account.userId];
    return ['/admin/users', account.userId];
  }
}
