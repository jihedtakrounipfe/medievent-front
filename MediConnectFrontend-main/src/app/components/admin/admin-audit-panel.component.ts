import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  AuditActionStat,
  AuditLogEntry,
  UserAuditSummary,
} from '../../../core/services/admin.service';

const AUDIT_LABELS: Record<string, string> = {
  ACCOUNT_ACTIVATED: 'Compte active',
  ACCOUNT_CREATED: 'Compte cree',
  ACCOUNT_DEACTIVATED: 'Compte desactive',
  BIOMETRIC_ENROLL: 'Enrolement biometrie',
  BIOMETRIC_REVOKE: 'Biometrie revoquee',
  BIOMETRIC_VERIFY: 'Verification biometrie',
  DOCTOR_VERIFICATION_APPROVED: 'Compte approuve',
  DOCTOR_VERIFICATION_PENDING: 'Verification en attente',
  DOCTOR_VERIFICATION_REJECTED: 'Compte refuse',
  DOCTOR_VERIFICATION_SUSPENDED: 'Compte suspendu',
  EMAIL_VERIFICATION_FAILED: 'Verification email echouee',
  EMAIL_VERIFICATION_SENT: 'Verification email envoyee',
  EMAIL_VERIFICATION_SUCCESS: 'Verification email reussie',
  FACE_DISABLED: 'Face ID desactive',
  FACE_ENABLED: 'Face ID active',
  FACE_RECONFIGURED: 'Face ID reconfigure',
  GOOGLE_LINK_SUCCESS: 'Compte Google lie',
  GOOGLE_LOGIN_SUCCESS: 'Connexion Google reussie',
  LOGIN_2FA_FAILED: '2FA echouee',
  LOGIN_2FA_REQUESTED: '2FA demandee',
  LOGIN_2FA_SUCCESS: '2FA validee',
  LOGIN_FAILED: 'Connexion echouee',
  LOGIN_SUCCESS: 'Connexion reussie',
  LOGOUT: 'Deconnexion',
  MFA_ALL_EXHAUSTED: 'Methodes MFA epuisees',
  MFA_EXHAUSTED_RESET_SUCCESS: 'MFA reinitialisee',
  MFA_METHOD_EXHAUSTED: 'Methode MFA epuisee',
  MFA_METHOD_SWITCHED: 'Methode MFA changee',
  PASSWORD_CHANGE_CODE_SENT: 'Code changement mot de passe envoye',
  PASSWORD_CHANGE_CODE_VERIFIED: 'Code changement mot de passe verifie',
  PASSWORD_CHANGE_FAILED: 'Changement mot de passe echoue',
  PASSWORD_CHANGE_SUCCESS: 'Mot de passe modifie',
  PASSWORD_RESET_REQUESTED: 'Reinitialisation mot de passe demandee',
  PASSWORD_RESET_SUCCESS: 'Mot de passe reinitialise',
  PROFILE_PICTURE_CHANGED: 'Photo de profil changee',
  PROFILE_UPDATED: 'Profil mis a jour',
  SIGNUP_DOCTOR: 'Inscription medecin',
  SIGNUP_PATIENT: 'Inscription patient',
  TOTP_VERIFIED: 'Code TOTP verifie',
};

@Component({
  selector: 'app-admin-audit-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
      <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
        <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Actions total</p>
        <p class="text-3xl font-bold text-stone-900 mt-2">{{ totalLogs() }}</p>
        <p class="text-xs text-stone-500 mt-2">Depuis le debut de l'activite tracee</p>
      </div>

      <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
        <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Reussites</p>
        <p class="text-3xl font-bold text-emerald-600 mt-2">{{ successfulLogs() }}</p>
        <p class="text-xs text-stone-500 mt-2">{{ successRate() }}% des actions</p>
      </div>

      <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
        <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Echecs</p>
        <p class="text-3xl font-bold text-rose-600 mt-2">{{ failedLogs() }}</p>
        <p class="text-xs text-stone-500 mt-2">{{ failureRate() }}% des actions</p>
      </div>

      <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-5">
        <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Derniere activite</p>
        <p class="text-lg font-bold text-stone-900 mt-2">
          {{ summary?.lastActivityAt ? (summary?.lastActivityAt | date:'dd/MM/yyyy HH:mm') : 'Aucune' }}
        </p>
        <p class="text-xs text-stone-500 mt-2">Base sur la plus recente entree du journal</p>
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-5 gap-5 mb-5">
      <div class="xl:col-span-3 bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 class="text-sm font-bold text-stone-800 uppercase tracking-wide">Actions les plus frequentes</h3>
            <p class="text-xs text-stone-500 mt-1">Top des evenements remontes depuis la table mc_audit_log</p>
          </div>
          <span class="text-xs text-stone-400">{{ topActions().length }} type(s)</span>
        </div>

        <div *ngIf="summaryLoading" class="space-y-3">
          <div *ngFor="let _ of [1,2,3,4]" class="animate-pulse">
            <div class="h-3 bg-stone-100 rounded-full w-32 mb-2"></div>
            <div class="h-2 bg-stone-100 rounded-full"></div>
          </div>
        </div>

        <p *ngIf="!summaryLoading && topActions().length === 0" class="text-sm text-stone-400">
          Aucune action agregee pour le moment.
        </p>

        <div *ngIf="!summaryLoading && topActions().length > 0" class="space-y-4">
          <div *ngFor="let stat of topActions()">
            <div class="flex items-center justify-between gap-3 mb-1.5">
              <p class="text-sm font-semibold text-stone-800 truncate">{{ auditLabel(stat.action) }}</p>
              <p class="text-sm font-bold text-stone-900">{{ stat.count }}</p>
            </div>
            <div class="h-2 rounded-full bg-stone-100 overflow-hidden">
              <div
                class="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                [style.width.%]="barWidth(stat.count, topActionMax())">
              </div>
            </div>
            <div class="flex items-center justify-between gap-3 mt-1.5 text-[11px] text-stone-500">
              <span>{{ stat.successCount }} succes</span>
              <span>{{ stat.failedCount }} echec{{ stat.failedCount === 1 ? '' : 's' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="xl:col-span-2 bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
        <div class="flex items-center justify-between gap-3 mb-5">
          <div>
            <h3 class="text-sm font-bold text-stone-800 uppercase tracking-wide">Succes vs echecs</h3>
            <p class="text-xs text-stone-500 mt-1">Taux global des operations journalisees</p>
          </div>
          <span class="text-xs text-stone-400">{{ totalLogs() }} entree(s)</span>
        </div>

        <div class="flex flex-col items-center justify-center">
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
                [attr.stroke-dasharray]="ringDash(successRate())" />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p class="text-3xl font-bold text-stone-900">{{ successRate() }}%</p>
              <p class="text-xs text-stone-500 mt-1">reussites</p>
            </div>
          </div>

          <div class="w-full mt-6 space-y-3">
            <div>
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="font-semibold text-emerald-700">Succes</span>
                <span class="text-stone-600">{{ successfulLogs() }}</span>
              </div>
              <div class="h-2 rounded-full bg-emerald-50 overflow-hidden">
                <div class="h-full rounded-full bg-emerald-500" [style.width.%]="successRate()"></div>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="font-semibold text-rose-700">Echecs</span>
                <span class="text-stone-600">{{ failedLogs() }}</span>
              </div>
              <div class="h-2 rounded-full bg-rose-50 overflow-hidden">
                <div class="h-full rounded-full bg-rose-500" [style.width.%]="failureRate()"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-stone-100 flex items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-bold text-stone-800 uppercase tracking-wide">Historique d'activite</h3>
          <p class="text-xs text-stone-500 mt-1">Pagination de 10 logs par page</p>
        </div>
        <span class="text-xs text-stone-400">
          {{ totalElements }} entree(s){{ totalPages > 1 ? ' • page ' + (currentPage + 1) + '/' + totalPages : '' }}
        </span>
      </div>

      <div *ngIf="logsLoading" class="px-6 py-8 flex justify-center">
        <svg class="w-5 h-5 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>

      <p *ngIf="!logsLoading && logs.length === 0" class="px-6 py-6 text-sm text-stone-400">
        Aucun evenement enregistre pour ce compte.
      </p>

      <div *ngIf="!logsLoading && logs.length > 0" class="divide-y divide-stone-50">
        <div *ngFor="let log of logs" class="px-6 py-4 flex items-start gap-4 hover:bg-stone-50/60 transition-colors">
          <div
            class="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
            [class.bg-emerald-400]="log.success"
            [class.bg-rose-400]="!log.success">
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-semibold text-stone-800">{{ auditLabel(log.action) }}</p>
              <span
                *ngIf="log.category"
                class="px-2 py-0.5 rounded-full bg-stone-100 text-[10px] font-semibold text-stone-600">
                {{ log.category }}
              </span>
            </div>
            <p *ngIf="log.details" class="text-xs text-stone-500 mt-1 break-words">{{ log.details }}</p>
            <p *ngIf="log.userAgent" class="text-[11px] text-stone-400 mt-1 break-words">{{ log.userAgent }}</p>
          </div>

          <div class="text-right flex-shrink-0">
            <p class="text-xs text-stone-500">{{ log.timestamp | date:'dd/MM/yyyy HH:mm' }}</p>
            <p *ngIf="log.ipAddress" class="text-[10px] text-stone-300 font-mono mt-0.5">{{ log.ipAddress }}</p>
          </div>
        </div>
      </div>

      <div *ngIf="totalPages > 1" class="px-6 py-4 border-t border-stone-100 flex items-center justify-between gap-3">
        <p class="text-sm text-stone-500">
          Page <span class="font-semibold text-stone-800">{{ currentPage + 1 }}</span>
          sur <span class="font-semibold text-stone-800">{{ totalPages }}</span>
        </p>

        <div class="flex items-center gap-1.5">
          <button
            type="button"
            (click)="changePage(currentPage - 1)"
            [disabled]="currentPage === 0"
            class="px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed">
            Prec.
          </button>

          <button
            *ngFor="let page of pageNumbers()"
            type="button"
            (click)="changePage(page)"
            class="px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors"
            [class.bg-teal-600]="page === currentPage"
            [class.text-white]="page === currentPage"
            [class.border]="page !== currentPage"
            [class.border-stone-200]="page !== currentPage"
            [class.text-stone-700]="page !== currentPage"
            [class.hover:bg-stone-50]="page !== currentPage">
            {{ page + 1 }}
          </button>

          <button
            type="button"
            (click)="changePage(currentPage + 1)"
            [disabled]="currentPage >= totalPages - 1"
            class="px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed">
            Suiv.
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AdminAuditPanelComponent {
  @Input() summary: UserAuditSummary | null = null;
  @Input() summaryLoading = false;
  @Input() logs: AuditLogEntry[] = [];
  @Input() logsLoading = false;
  @Input() currentPage = 0;
  @Input() totalPages = 0;
  @Input() totalElements = 0;
  @Output() pageChange = new EventEmitter<number>();

  totalLogs(): number {
    return this.summary?.totalLogs ?? 0;
  }

  successfulLogs(): number {
    return this.summary?.successfulLogs ?? 0;
  }

  failedLogs(): number {
    return this.summary?.failedLogs ?? 0;
  }

  topActions(): AuditActionStat[] {
    return this.summary?.topActions ?? [];
  }

  topActionMax(): number {
    return this.topActions().reduce((max, stat) => Math.max(max, stat.count ?? 0), 0);
  }

  successRate(): number {
    const total = this.totalLogs();
    if (!total) return 0;
    return Math.round((this.successfulLogs() / total) * 100);
  }

  failureRate(): number {
    const total = this.totalLogs();
    if (!total) return 0;
    return Math.round((this.failedLogs() / total) * 100);
  }

  ringDash(percent: number): string {
    return `${Math.max(0, Math.min(100, percent))}, 100`;
  }

  barWidth(value: number, max: number): number {
    if (!max) return 0;
    return Math.max(8, Math.round((value / max) * 100));
  }

  pageNumbers(): number[] {
    if (this.totalPages <= 1) return [];
    const start = Math.max(0, this.currentPage - 2);
    const end = Math.min(this.totalPages - 1, this.currentPage + 2);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  changePage(page: number): void {
    if (page < 0 || page >= this.totalPages || page === this.currentPage) return;
    this.pageChange.emit(page);
  }

  auditLabel(action: string): string {
    return AUDIT_LABELS[action] || action.replace(/_/g, ' ');
  }
}
