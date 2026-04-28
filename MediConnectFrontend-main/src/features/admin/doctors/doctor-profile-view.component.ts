import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminAuditPanelComponent } from '../../../app/components/admin/admin-audit-panel.component';
import { DoctorApprovalModalComponent } from '../../../app/components/admin/doctor-approval-modal/doctor-approval-modal.component';
import {
  DoctorRejectionModalComponent,
  RejectPayload,
} from '../../../app/components/admin/doctor-rejection-modal/doctor-rejection-modal.component';
import {
  DoctorSuspensionModalComponent,
  SuspendPayload,
} from '../../../app/components/admin/doctor-suspension-modal/doctor-suspension-modal.component';
import { DoctorStatusBadgeComponent } from '../../../app/components/shared/doctor-status-badge/doctor-status-badge.component';
import {
  AdminService,
  AuditLogEntry,
  UserAuditSummary,
} from '../../../core/services/admin.service';
import { UserService } from '../../../core/services/user.service';
import { Doctor, VerificationStatus } from '../../../core/user';
import { ToastService } from '../../auth/toast/toast.service';

const SPEC_LABELS: Record<string, string> = {
  CARDIOLOGY: 'Cardiologie',
  DERMATOLOGY: 'Dermatologie',
  GENERAL_PRACTICE: 'Medecine generale',
  NEUROLOGY: 'Neurologie',
  ORTHOPEDICS: 'Orthopedie',
  OTHER: 'Autre',
  PEDIATRICS: 'Pediatrie',
  PSYCHIATRY: 'Psychiatrie',
  RADIOLOGY: 'Radiologie',
};

@Component({
  selector: 'app-doctor-profile-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    AdminAuditPanelComponent,
    DoctorApprovalModalComponent,
    DoctorRejectionModalComponent,
    DoctorSuspensionModalComponent,
    DoctorStatusBadgeComponent,
  ],
  providers: [DatePipe],
  template: `
    <app-doctor-approval-modal
      [doctor]="approveTarget()"
      [loading]="actionLoading()"
      (confirm)="doApprove($event)"
      (cancel)="closeModals()" />

    <app-doctor-rejection-modal
      [doctor]="rejectTarget()"
      [loading]="actionLoading()"
      (confirm)="doReject($event)"
      (cancel)="closeModals()" />

    <app-doctor-suspension-modal
      [doctor]="suspendTarget()"
      [loading]="actionLoading()"
      (confirm)="doSuspend($event)"
      (cancel)="closeModals()" />

    @if (showDeactivateModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-2">Desactiver le compte</h3>
          <p class="text-sm text-gray-500 mb-5">Le medecin ne pourra plus se connecter tant que le compte reste bloque.</p>
          <div class="flex gap-3 justify-end">
            <button (click)="showDeactivateModal.set(false)" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Annuler</button>
            <button
              (click)="doDeactivate()"
              [disabled]="actionLoading()"
              class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm rounded-xl font-medium cursor-pointer disabled:opacity-60">
              @if (actionLoading()) { Traitement... } @else { Desactiver }
            </button>
          </div>
        </div>
      </div>
    }

    @if (showReactivateModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-2">Reactiver le compte</h3>
          <p class="text-sm text-gray-500 mb-5">Le compte sera de nouveau autorise a se connecter.</p>
          <div class="flex gap-3 justify-end">
            <button (click)="showReactivateModal.set(false)" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Annuler</button>
            <button
              (click)="doReactivate()"
              [disabled]="actionLoading()"
              class="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-xl font-medium cursor-pointer disabled:opacity-60">
              @if (actionLoading()) { Traitement... } @else { Reactiver }
            </button>
          </div>
        </div>
      </div>
    }

    @if (showDeleteModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-2">Supprimer le compte</h3>
          <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
            <p class="text-sm text-amber-700 font-medium">Cette action est irreversible.</p>
          </div>
          <p class="text-sm text-gray-600 mb-2">
            Tapez <strong class="text-gray-900">{{ doctor()?.email }}</strong> pour confirmer :
          </p>
          <input
            type="text"
            [(ngModel)]="deleteConfirmEmail"
            placeholder="Adresse email du medecin"
            class="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-rose-400 mb-5" />
          <div class="flex gap-3 justify-end">
            <button (click)="showDeleteModal.set(false); deleteConfirmEmail = ''" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Annuler</button>
            <button
              (click)="doDelete()"
              [disabled]="actionLoading() || deleteConfirmEmail !== doctor()?.email"
              class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm rounded-xl font-medium cursor-pointer disabled:opacity-60">
              @if (actionLoading()) { Suppression... } @else { Supprimer }
            </button>
          </div>
        </div>
      </div>
    }

    <div class="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
      <a
        routerLink="/admin/doctors"
        class="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:text-teal-800 font-medium mb-5 transition-colors">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Retour a la liste des medecins
      </a>

      @if (loading()) {
        <div class="space-y-4">
          @for (_ of [1,2,3]; track $index) {
            <div class="h-32 rounded-3xl bg-stone-100 animate-pulse"></div>
          }
        </div>
      }

      @if (doctor(); as d) {
        <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 mb-5">
          <div class="flex flex-col md:flex-row md:items-start gap-5">
            <div class="w-20 h-20 rounded-2xl border-2 border-teal-100 bg-teal-50 flex items-center justify-center overflow-hidden flex-shrink-0">
              @if (d.profilePicture) {
                <img [src]="d.profilePicture" alt="Photo" class="w-full h-full object-cover" />
              } @else {
                <span class="text-2xl font-bold text-teal-600">{{ initials(d) }}</span>
              }
            </div>

            <div class="flex-1 min-w-0">
              <h1 class="text-2xl font-bold text-stone-900">Dr. {{ d.firstName }} {{ d.lastName }}</h1>
              <p class="text-sm text-stone-500 mt-0.5">{{ d.email }}</p>
              @if (d.specialization) {
                <p class="text-sm text-teal-700 font-medium mt-1">{{ specLabel(d.specialization) }}</p>
              }
              <div class="flex flex-wrap items-center gap-3 mt-3">
                <app-doctor-status-badge [status]="d.verificationStatus" />
                @if (!d.isActive) {
                  <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600">Compte inactif</span>
                }
                @if (d.createdAt) {
                  <span class="text-xs text-stone-400">Inscrit le {{ d.createdAt | date:'dd MMM yyyy' }}</span>
                }
              </div>
            </div>

            <div class="flex flex-wrap gap-2 flex-shrink-0">
              @if (d.verificationStatus === 'PENDING') {
                <button (click)="approveTarget.set(d)" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors cursor-pointer">
                  Approuver
                </button>
                <button (click)="rejectTarget.set(d)" class="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-colors cursor-pointer">
                  Refuser
                </button>
              }
              @if (d.verificationStatus === 'APPROVED') {
                <button (click)="suspendTarget.set(d)" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors cursor-pointer">
                  Suspendre
                </button>
                <button (click)="showDeactivateModal.set(true)" class="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-sm font-semibold transition-colors cursor-pointer">
                  Desactiver le compte
                </button>
              }
              @if (d.verificationStatus === 'REJECTED') {
                <button (click)="approveTarget.set(d)" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors cursor-pointer">
                  Approuver
                </button>
                <button (click)="showDeleteModal.set(true)" class="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-colors cursor-pointer">
                  Supprimer le compte
                </button>
              }
              @if (d.verificationStatus === 'SUSPENDED') {
                <button (click)="showReactivateModal.set(true)" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors cursor-pointer">
                  Reactiver
                </button>
                <button (click)="showDeleteModal.set(true)" class="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-colors cursor-pointer">
                  Supprimer le compte
                </button>
              }
            </div>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-5 mb-5">
          <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
            <h2 class="text-sm font-bold text-stone-700 uppercase tracking-wide mb-4">Informations personnelles</h2>
            <dl class="space-y-3">
              <div class="flex gap-3"><dt class="w-32 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Nom</dt><dd class="text-sm text-stone-900">{{ d.lastName }}</dd></div>
              <div class="flex gap-3"><dt class="w-32 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Prenom</dt><dd class="text-sm text-stone-900">{{ d.firstName }}</dd></div>
              <div class="flex gap-3"><dt class="w-32 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Email</dt><dd class="text-sm text-stone-900 break-all">{{ d.email }}</dd></div>
              <div class="flex gap-3"><dt class="w-32 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Telephone</dt><dd class="text-sm text-stone-900">{{ d.phone || '—' }}</dd></div>
              <div class="flex gap-3"><dt class="w-32 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Genre</dt><dd class="text-sm text-stone-900">{{ genderLabel(d.gender) }}</dd></div>
              <div class="flex gap-3"><dt class="w-32 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Adresse</dt><dd class="text-sm text-stone-900">{{ d.address || '—' }}</dd></div>
            </dl>
          </div>

          <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
            <h2 class="text-sm font-bold text-stone-700 uppercase tracking-wide mb-4">Informations professionnelles</h2>
            <dl class="space-y-3">
              <div class="flex gap-3"><dt class="w-32 text-xs font-medium text-stone-400 shrink-0 pt-0.5">RPPS</dt><dd class="text-sm text-stone-900 font-mono">{{ d.rppsNumber || '—' }}</dd></div>
              <div class="flex gap-3"><dt class="w-32 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Specialite</dt><dd class="text-sm text-stone-900">{{ specLabel(d.specialization) }}</dd></div>
              <div class="flex gap-3"><dt class="w-32 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Numero d'ordre</dt><dd class="text-sm text-stone-900 font-mono">{{ d.licenseNumber || '—' }}</dd></div>
              <div class="flex gap-3"><dt class="w-32 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Duree consult.</dt><dd class="text-sm text-stone-900">{{ d.consultationDuration ? d.consultationDuration + ' min' : '—' }}</dd></div>
              <div class="flex gap-3"><dt class="w-32 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Tarif</dt><dd class="text-sm text-stone-900">{{ d.consultationFee != null ? (d.consultationFee | number:'1.3-3') + ' TND' : '—' }}</dd></div>
              <div class="flex gap-3"><dt class="w-32 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Cabinet</dt><dd class="text-sm text-stone-900">{{ d.officeAddress || '—' }}</dd></div>
            </dl>
          </div>

          <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
            <h2 class="text-sm font-bold text-stone-700 uppercase tracking-wide mb-4">Securite et compte</h2>
            <dl class="space-y-3">
              <div class="flex gap-3"><dt class="w-36 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Statut</dt><dd><app-doctor-status-badge [status]="d.verificationStatus" /></dd></div>
              <div class="flex gap-3"><dt class="w-36 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Compte actif</dt><dd class="text-sm" [class.text-emerald-600]="d.isActive" [class.text-rose-600]="!d.isActive">{{ d.isActive ? 'Oui' : 'Non' }}</dd></div>
              <div class="flex gap-3"><dt class="w-36 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Email verifie</dt><dd class="text-sm" [class.text-emerald-600]="d.isVerified" [class.text-rose-600]="!d.isVerified">{{ d.isVerified ? 'Oui' : 'Non' }}</dd></div>
              <div class="flex gap-3"><dt class="w-36 text-xs font-medium text-stone-400 shrink-0 pt-0.5">2FA</dt><dd class="text-sm" [class.text-emerald-600]="d.twoFactorEnabled" [class.text-stone-400]="!d.twoFactorEnabled">{{ d.twoFactorEnabled ? 'Activee' : 'Inactive' }}</dd></div>
              <div class="flex gap-3"><dt class="w-36 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Google lie</dt><dd class="text-sm" [class.text-emerald-600]="d.googleId" [class.text-stone-400]="!d.googleId">{{ d.googleId ? 'Oui' : 'Non' }}</dd></div>
              <div class="flex gap-3"><dt class="w-36 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Google Calendar</dt><dd class="text-sm" [class.text-emerald-600]="d.googleCalendarLinked" [class.text-stone-400]="!d.googleCalendarLinked">{{ d.googleCalendarLinked ? 'Lie' : 'Non lie' }}</dd></div>
            </dl>
          </div>

          <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-6">
            <h2 class="text-sm font-bold text-stone-700 uppercase tracking-wide mb-4">Metadonnees</h2>
            <dl class="space-y-3">
              <div class="flex gap-3"><dt class="w-36 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Note moyenne</dt><dd class="text-sm text-stone-900">{{ d.rating != null ? d.rating + ' / 5' : '—' }}</dd></div>
              <div class="flex gap-3"><dt class="w-36 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Inscrit le</dt><dd class="text-sm text-stone-900">{{ d.createdAt | date:'dd/MM/yyyy HH:mm' }}</dd></div>
              <div class="flex gap-3"><dt class="w-36 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Derniere modif.</dt><dd class="text-sm text-stone-900">{{ d.updatedAt | date:'dd/MM/yyyy HH:mm' }}</dd></div>
              <div class="flex gap-3"><dt class="w-36 text-xs font-medium text-stone-400 shrink-0 pt-0.5">Derniere IP</dt><dd class="text-sm text-stone-900 font-mono">{{ lastIp() || '—' }}</dd></div>
            </dl>
          </div>
        </div>

        <app-admin-audit-panel
          [summary]="auditSummary()"
          [summaryLoading]="auditSummaryLoading()"
          [logs]="auditLogs()"
          [logsLoading]="auditLogsLoading()"
          [currentPage]="auditPage()"
          [totalPages]="auditTotalPages()"
          [totalElements]="auditTotalElements()"
          (pageChange)="loadAuditPage($event)">
        </app-admin-audit-panel>
      }
    </div>
  `,
})
export class DoctorProfileViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  loading = signal(true);
  auditSummaryLoading = signal(true);
  auditLogsLoading = signal(true);
  actionLoading = signal(false);

  doctor = signal<Doctor | null>(null);
  auditSummary = signal<UserAuditSummary | null>(null);
  auditLogs = signal<AuditLogEntry[]>([]);
  auditPage = signal(0);
  auditTotalPages = signal(0);
  auditTotalElements = signal(0);
  lastIp = signal<string | null>(null);

  approveTarget = signal<Doctor | null>(null);
  rejectTarget = signal<Doctor | null>(null);
  suspendTarget = signal<Doctor | null>(null);
  showDeactivateModal = signal(false);
  showReactivateModal = signal(false);
  showDeleteModal = signal(false);
  deleteConfirmEmail = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      void this.router.navigate(['/admin/doctors']);
      return;
    }

    this.loadDoctor(id);
    this.loadAuditSummary();
    this.loadAuditPage(0);
  }

  private doctorId(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  private loadDoctor(id: number): void {
    this.userService.getDoctorById(id).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: doctor => this.doctor.set(doctor),
      error: () => {
        this.toast.error('Impossible de charger le profil du medecin.');
        void this.router.navigate(['/admin/doctors']);
      },
    });
  }

  loadAuditSummary(): void {
    const id = this.doctorId();
    if (!id) return;

    this.auditSummaryLoading.set(true);
    this.adminService.getUserAuditSummary(id).pipe(
      finalize(() => this.auditSummaryLoading.set(false)),
    ).subscribe({
      next: summary => this.auditSummary.set(summary),
      error: () => this.auditSummary.set(null),
    });
  }

  loadAuditPage(page: number): void {
    const id = this.doctorId();
    if (!id) return;

    this.auditLogsLoading.set(true);
    this.adminService.getUserAuditLogs(id, page, 10).pipe(
      finalize(() => this.auditLogsLoading.set(false)),
    ).subscribe({
      next: response => {
        this.auditLogs.set(response.content);
        this.auditPage.set(response.number);
        this.auditTotalPages.set(response.totalPages);
        this.auditTotalElements.set(response.totalElements);
        const recentIp = response.content.find(log => log.success && log.ipAddress)?.ipAddress ?? null;
        this.lastIp.set(recentIp);
      },
      error: () => {
        this.auditLogs.set([]);
        this.auditPage.set(0);
        this.auditTotalPages.set(0);
        this.auditTotalElements.set(0);
        this.lastIp.set(null);
      },
    });
  }

  closeModals(): void {
    this.approveTarget.set(null);
    this.rejectTarget.set(null);
    this.suspendTarget.set(null);
    this.showDeactivateModal.set(false);
    this.showReactivateModal.set(false);
    this.showDeleteModal.set(false);
    this.actionLoading.set(false);
  }

  doApprove(doctor: Doctor): void {
    this.actionLoading.set(true);
    this.userService.approveDoctor(doctor.id).subscribe({
      next: updated => {
        this.doctor.update(current => current ? { ...current, verificationStatus: updated.verificationStatus } : current);
        this.toast.success(`Dr. ${doctor.firstName} ${doctor.lastName} a ete approuve.`);
        this.refreshAudit();
        this.closeModals();
      },
      error: () => {
        this.actionLoading.set(false);
        this.toast.error('Action impossible.');
      },
    });
  }

  doReject({ doctor, reason }: RejectPayload): void {
    this.actionLoading.set(true);
    this.userService.rejectDoctor(doctor.id, reason).subscribe({
      next: updated => {
        this.doctor.update(current => current ? { ...current, verificationStatus: updated.verificationStatus } : current);
        this.toast.success(`Dr. ${doctor.firstName} ${doctor.lastName} a ete refuse.`);
        this.refreshAudit();
        this.closeModals();
      },
      error: () => {
        this.actionLoading.set(false);
        this.toast.error('Action impossible.');
      },
    });
  }

  doSuspend({ doctor, reason }: SuspendPayload): void {
    this.actionLoading.set(true);
    this.userService.suspendDoctor(doctor.id, reason).subscribe({
      next: updated => {
        this.doctor.update(current => current ? { ...current, verificationStatus: updated.verificationStatus } : current);
        this.toast.success(`Dr. ${doctor.firstName} ${doctor.lastName} a ete suspendu.`);
        this.refreshAudit();
        this.closeModals();
      },
      error: () => {
        this.actionLoading.set(false);
        this.toast.error('Action impossible.');
      },
    });
  }

  doReactivate(): void {
    const doctor = this.doctor();
    if (!doctor) return;

    this.actionLoading.set(true);
    this.userService.reactivateDoctor(doctor.id).subscribe({
      next: updated => {
        this.doctor.update(current => current ? { ...current, verificationStatus: updated.verificationStatus } : current);
        this.toast.success(`Dr. ${doctor.firstName} ${doctor.lastName} a ete reactive.`);
        this.refreshAudit();
        this.closeModals();
      },
      error: () => {
        this.actionLoading.set(false);
        this.toast.error('Action impossible.');
      },
    });
  }

  doDeactivate(): void {
    const doctor = this.doctor();
    if (!doctor) return;

    this.actionLoading.set(true);
    this.userService.deactivateDoctor(doctor.id).subscribe({
      next: () => {
        this.doctor.update(current => current ? { ...current, isActive: false } : current);
        this.toast.success(`Le compte du Dr. ${doctor.firstName} ${doctor.lastName} a ete desactive.`);
        this.refreshAudit();
        this.closeModals();
      },
      error: () => {
        this.actionLoading.set(false);
        this.toast.error('Action impossible.');
      },
    });
  }

  doDelete(): void {
    const doctor = this.doctor();
    if (!doctor || this.deleteConfirmEmail !== doctor.email) return;

    this.actionLoading.set(true);
    this.adminService.deleteUser(doctor.id).subscribe({
      next: () => {
        this.toast.success('Le compte a ete supprime definitivement.');
        void this.router.navigate(['/admin/doctors']);
      },
      error: () => {
        this.actionLoading.set(false);
        this.toast.error('Suppression impossible.');
      },
    });
  }

  initials(doctor: Doctor): string {
    return ((doctor.firstName || '').slice(0, 1) + (doctor.lastName || '').slice(0, 1)).toUpperCase() || 'DR';
  }

  specLabel(value: unknown): string {
    return SPEC_LABELS[String(value || '').toUpperCase()] || String(value || '—');
  }

  genderLabel(value: unknown): string {
    if (value === 'MALE') return 'Homme';
    if (value === 'FEMALE') return 'Femme';
    return '—';
  }

  private refreshAudit(): void {
    this.loadAuditSummary();
    this.loadAuditPage(0);
  }

  doctorStatus(status?: string): VerificationStatus | undefined {
    return status as VerificationStatus | undefined;
  }
}
