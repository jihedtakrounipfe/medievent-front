import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { DoctorApprovalModalComponent } from '../../../app/components/admin/doctor-approval-modal/doctor-approval-modal.component';
import { RejectPayload, DoctorRejectionModalComponent } from '../../../app/components/admin/doctor-rejection-modal/doctor-rejection-modal.component';
import { SuspendPayload, DoctorSuspensionModalComponent } from '../../../app/components/admin/doctor-suspension-modal/doctor-suspension-modal.component';
import { DoctorStatusBadgeComponent } from '../../../app/components/shared/doctor-status-badge/doctor-status-badge.component';
import { UserService } from '../../../core/services/user.service';
import { Doctor, VerificationStatus } from '../../../core/user';
import { ToastService } from '../../auth/toast/toast.service';

@Component({
  selector: 'app-admin-doctors',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DoctorStatusBadgeComponent,
    DoctorApprovalModalComponent,
    DoctorRejectionModalComponent,
    DoctorSuspensionModalComponent,
  ],
  template: `
    <div class="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h1 class="text-2xl font-bold text-stone-900">Médecins</h1>
          <p class="text-sm text-stone-500 mt-0.5">Liste des médecins</p>
        </div>
        <button (click)="load()" class="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-800">
          Rafraîchir
        </button>
      </div>

      <div class="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <div class="min-w-[920px]">
            <div class="grid px-5 py-3 text-xs font-semibold text-stone-500 border-b border-stone-100"
                 style="grid-template-columns: 2.5rem 1.2fr 1fr 10rem 8rem 9rem 16rem">
              <div>#</div>
              <div>Nom</div>
              <div>Email</div>
              <div>Spécialisation</div>
              <div>RPPS</div>
              <div class="text-center">Statut</div>
              <div class="text-right">Actions</div>
            </div>

            <div *ngIf="loading()" class="px-5 py-6 text-sm text-stone-500">Chargement...</div>

            <div *ngFor="let d of doctors(); let i = index"
                 class="grid items-center gap-4 px-5 py-3.5 border-b border-stone-50 last:border-0"
                 [ngClass]="{ 'bg-stone-50/70': !d.isActive }"
                 style="grid-template-columns: 2.5rem 1.2fr 1fr 10rem 8rem 9rem 16rem">
              <div class="text-sm text-stone-400">{{ i + 1 }}</div>
              <div class="min-w-0 flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                  <img *ngIf="d.profilePicture" [src]="d.profilePicture" alt="" class="w-full h-full object-cover"/>
                  <span *ngIf="!d.profilePicture" class="text-xs font-bold text-stone-600">{{ initials(d) }}</span>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-stone-900 truncate">Dr. {{ (d.firstName || '') + ' ' + (d.lastName || '') }}</p>
                  <p class="text-xs text-stone-500 truncate">{{ d.isActive ? 'Actif' : 'Inactif' }}</p>
                </div>
              </div>
              <div class="text-sm text-stone-700 truncate">{{ d.email }}</div>
              <div class="text-sm text-stone-700 truncate">{{ specializationLabel(d.specialization) }}</div>
              <div class="text-sm text-stone-700 truncate">{{ d.rppsNumber || '—' }}</div>
              <div class="flex justify-center">
                <app-doctor-status-badge [status]="d.verificationStatus" />
              </div>
              <div class="flex items-center justify-end gap-2">
                <button *ngIf="d.verificationStatus === 'PENDING'" (click)="approveTarget.set(d)"
                        class="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold">
                  Approuver
                </button>
                <button *ngIf="d.verificationStatus === 'PENDING'" (click)="openReject(d)"
                        class="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold">
                  Refuser
                </button>
                <button *ngIf="d.verificationStatus === 'APPROVED'" (click)="openSuspend(d)"
                        class="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold">
                  Suspendre
                </button>
                <button *ngIf="d.verificationStatus === 'REJECTED'" (click)="approveTarget.set(d)"
                        class="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold">
                  Approuver
                </button>
                <button *ngIf="d.verificationStatus === 'SUSPENDED'" (click)="confirmReactivate(d)"
                        class="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold">
                  Réactiver
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <app-doctor-approval-modal
      [doctor]="approveTarget()"
      [loading]="modalLoading()"
      (confirm)="confirmApprove($event)"
      (cancel)="closeModals()" />

    <app-doctor-rejection-modal
      [doctor]="rejectTarget()"
      [loading]="modalLoading()"
      (confirm)="confirmReject($event)"
      (cancel)="closeModals()" />

    <app-doctor-suspension-modal
      [doctor]="suspendTarget()"
      [loading]="modalLoading()"
      (confirm)="confirmSuspend($event)"
      (cancel)="closeModals()" />
  `,
})
export class AdminDoctorsComponent {
  private userService = inject(UserService);
  private toast       = inject(ToastService);

  loading       = signal(false);
  doctors       = signal<Doctor[]>([]);
  approveTarget = signal<Doctor | null>(null);
  rejectTarget  = signal<Doctor | null>(null);
  suspendTarget = signal<Doctor | null>(null);
  modalLoading  = signal(false);

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.userService.getDoctorsForAdmin().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: res => this.doctors.set(res),
      error: ()  => this.toast.error('Impossible de charger les médecins.'),
    });
  }

  initials(d: Doctor): string {
    return ((d.firstName || '').slice(0, 1) + (d.lastName || '').slice(0, 1)).toUpperCase() || 'DR';
  }

  specializationLabel(value: unknown): string {
    const v = String(value || '').toUpperCase();
    const map: Record<string, string> = {
      GENERAL_PRACTICE: 'Médecine générale', CARDIOLOGY: 'Cardiologie',
      DERMATOLOGY: 'Dermatologie', PEDIATRICS: 'Pédiatrie',
      NEUROLOGY: 'Neurologie', ORTHOPEDICS: 'Orthopédie',
      PSYCHIATRY: 'Psychiatrie', RADIOLOGY: 'Radiologie', OTHER: 'Autre',
    };
    return map[v] || (v ? v : '—');
  }

  openReject(d: Doctor): void {
    this.closeModals();
    this.rejectTarget.set(d);
  }

  openSuspend(d: Doctor): void {
    this.closeModals();
    this.suspendTarget.set(d);
  }

  closeModals(): void {
    this.approveTarget.set(null);
    this.rejectTarget.set(null);
    this.suspendTarget.set(null);
    this.modalLoading.set(false);
  }

  confirmApprove(d: Doctor): void {
    this.modalLoading.set(true);
    this.userService.approveDoctor(d.id).subscribe({
      next: updated => {
        this.toast.success(`Le compte du Dr. ${d.firstName} ${d.lastName} a été approuvé`);
        this.updateDoctor(d.id, updated.verificationStatus);
        this.closeModals();
      },
      error: () => { this.modalLoading.set(false); this.toast.error('Action impossible.'); },
    });
  }

  confirmReject({ doctor: d, reason }: RejectPayload): void {
    this.modalLoading.set(true);
    this.userService.rejectDoctor(d.id, reason).subscribe({
      next: updated => {
        this.toast.success(`Le compte du Dr. ${d.firstName} ${d.lastName} a été refusé`);
        this.updateDoctor(d.id, updated.verificationStatus);
        this.closeModals();
      },
      error: () => { this.modalLoading.set(false); this.toast.error('Action impossible.'); },
    });
  }

  confirmSuspend({ doctor: d, reason }: SuspendPayload): void {
    this.modalLoading.set(true);
    this.userService.suspendDoctor(d.id, reason).subscribe({
      next: updated => {
        this.toast.success(`Le compte du Dr. ${d.firstName} ${d.lastName} a été suspendu`);
        this.updateDoctor(d.id, updated.verificationStatus);
        this.closeModals();
      },
      error: () => { this.modalLoading.set(false); this.toast.error('Action impossible.'); },
    });
  }

  confirmReactivate(d: Doctor): void {
    this.userService.reactivateDoctor(d.id).subscribe({
      next: updated => {
        this.toast.success(`Le compte du Dr. ${d.firstName} ${d.lastName} a été réactivé`);
        this.updateDoctor(d.id, updated.verificationStatus);
      },
      error: () => this.toast.error('Action impossible.'),
    });
  }

  private updateDoctor(id: number, verificationStatus: VerificationStatus | undefined): void {
    if (!verificationStatus) return;
    this.doctors.update(list => list.map(x => x.id === id ? { ...x, verificationStatus } : x));
  }
}
