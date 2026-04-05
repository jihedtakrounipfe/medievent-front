import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { Doctor, VerificationStatus } from '../../../core/user';
import { ToastService } from '../../auth/toast/toast.service';

@Component({
  selector: 'app-admin-doctors',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
                  <span *ngIf="!d.profilePicture" class="text-xs font-bold text-stone-600">
                    {{ initials(d.firstName, d.lastName) }}
                  </span>
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
                <span class="px-2 py-1 rounded-full text-[11px] font-semibold" [ngClass]="statusBadgeClass(d.verificationStatus)">
                  {{ statusLabel(d.verificationStatus) }}
                </span>
              </div>
              <div class="flex items-center justify-end gap-2">
                <button *ngIf="d.verificationStatus === 'PENDING'" (click)="openApprove(d)"
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
                <button *ngIf="d.verificationStatus === 'REJECTED'" (click)="openApprove(d)"
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

      <div *ngIf="approveTarget() as d" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
        <div class="w-full max-w-lg rounded-2xl bg-white border border-stone-200 shadow-xl p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-bold text-stone-900">Approuver le compte médecin</h2>
            </div>
            <button (click)="closeModals()" class="text-stone-500 hover:text-stone-700 text-xl leading-none">×</button>
          </div>

          <div class="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl border border-stone-200 bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                <img *ngIf="d.profilePicture" [src]="d.profilePicture" alt="" class="w-full h-full object-cover"/>
                <span *ngIf="!d.profilePicture" class="text-sm font-bold text-stone-600">
                  {{ initials(d.firstName, d.lastName) }}
                </span>
              </div>
              <div class="min-w-0">
                <div class="text-sm text-stone-900 font-semibold truncate">Dr. {{ d.firstName }} {{ d.lastName }}</div>
                <div class="text-xs text-stone-600 truncate">{{ d.email }}</div>
              </div>
            </div>
            <div class="mt-3 text-xs text-stone-700">
              <div><span class="font-semibold">Spécialisation :</span> {{ specializationLabel(d.specialization) }}</div>
              <div class="mt-1"><span class="font-semibold">Numéro RPPS :</span> {{ d.rppsNumber || '—' }}</div>
            </div>
            <div class="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2">
              En approuvant ce compte, le médecin aura un accès complet à la plateforme, y compris les dossiers patients.
            </div>
          </div>

          <div class="mt-5 flex items-center justify-end gap-2">
            <button (click)="closeModals()" class="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-800">
              Annuler
            </button>
            <button (click)="confirmApprove(d)" [disabled]="modalLoading()" class="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2">
              <svg *ngIf="modalLoading()" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Confirmer l'approbation
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="rejectTarget() as d" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
        <div class="w-full max-w-lg rounded-2xl bg-white border border-stone-200 shadow-xl p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-bold text-stone-900">Refuser le compte médecin</h2>
            </div>
            <button (click)="closeModals()" class="text-stone-500 hover:text-stone-700 text-xl leading-none">×</button>
          </div>

          <div class="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl border border-stone-200 bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                <img *ngIf="d.profilePicture" [src]="d.profilePicture" alt="" class="w-full h-full object-cover"/>
                <span *ngIf="!d.profilePicture" class="text-sm font-bold text-stone-600">
                  {{ initials(d.firstName, d.lastName) }}
                </span>
              </div>
              <div class="min-w-0">
                <div class="text-sm text-stone-900 font-semibold truncate">Dr. {{ d.firstName }} {{ d.lastName }}</div>
                <div class="text-xs text-stone-600 truncate">{{ d.email }}</div>
              </div>
            </div>
            <div class="mt-3 text-xs text-stone-700">
              <div><span class="font-semibold">Spécialisation :</span> {{ specializationLabel(d.specialization) }}</div>
              <div class="mt-1"><span class="font-semibold">Numéro RPPS :</span> {{ d.rppsNumber || '—' }}</div>
            </div>
          </div>

          <textarea
            class="mt-4 w-full min-h-[110px] rounded-xl border border-stone-200 p-3 text-sm outline-none focus:ring-2 focus:ring-rose-200"
            placeholder="Veuillez indiquer la raison du refus..."
            [value]="reason()"
            (input)="reason.set(($any($event.target).value || '').toString())"
          ></textarea>
          <div class="mt-2 text-xs text-stone-500">Minimum 10 caractères</div>
          <div class="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2">
            Le médecin sera notifié par e-mail de cette décision avec le motif indiqué.
          </div>
          <div *ngIf="reasonError()" class="mt-2 text-sm text-rose-700">{{ reasonError() }}</div>

          <div class="mt-5 flex items-center justify-end gap-2">
            <button (click)="closeModals()" class="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-800">
              Annuler
            </button>
            <button (click)="confirmReject(d)" [disabled]="modalLoading() || reason().trim().length < 10"
                    class="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2">
              <svg *ngIf="modalLoading()" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Confirmer le refus
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="suspendTarget() as d" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
        <div class="w-full max-w-lg rounded-2xl bg-white border border-stone-200 shadow-xl p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-bold text-stone-900">Suspendre le compte médecin</h2>
            </div>
            <button (click)="closeModals()" class="text-stone-500 hover:text-stone-700 text-xl leading-none">×</button>
          </div>

          <div class="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl border border-stone-200 bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
                <img *ngIf="d.profilePicture" [src]="d.profilePicture" alt="" class="w-full h-full object-cover"/>
                <span *ngIf="!d.profilePicture" class="text-sm font-bold text-stone-600">
                  {{ initials(d.firstName, d.lastName) }}
                </span>
              </div>
              <div class="min-w-0">
                <div class="text-sm text-stone-900 font-semibold truncate">Dr. {{ d.firstName }} {{ d.lastName }}</div>
                <div class="text-xs text-stone-600 truncate">{{ d.email }}</div>
              </div>
            </div>
          </div>

          <textarea
            class="mt-4 w-full min-h-[110px] rounded-xl border border-stone-200 p-3 text-sm outline-none focus:ring-2 focus:ring-stone-200"
            placeholder="Motif de la suspension..."
            [value]="reason()"
            (input)="reason.set(($any($event.target).value || '').toString())"
          ></textarea>
          <div class="mt-2 text-xs text-stone-500">Minimum 10 caractères</div>
          <div class="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2">
            Le médecin perdra immédiatement l'accès aux dossiers patients.
          </div>
          <div *ngIf="reasonError()" class="mt-2 text-sm text-rose-700">{{ reasonError() }}</div>

          <div class="mt-5 flex items-center justify-end gap-2">
            <button (click)="closeModals()" class="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-800">
              Annuler
            </button>
            <button (click)="confirmSuspend(d)" [disabled]="modalLoading() || reason().trim().length < 10"
                    class="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2">
              <svg *ngIf="modalLoading()" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Confirmer la suspension
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminDoctorsComponent {
  private userService = inject(UserService);
  private toast = inject(ToastService);

  loading = signal(false);
  doctors = signal<Doctor[]>([]);
  approveTarget = signal<Doctor | null>(null);
  rejectTarget = signal<Doctor | null>(null);
  suspendTarget = signal<Doctor | null>(null);
  reason = signal('');
  reasonError = signal<string | null>(null);
  modalLoading = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.userService.getDoctorsForAdmin().pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: res => this.doctors.set(res),
      error: () => this.toast.error('Impossible de charger les médecins.'),
    });
  }

  initials(firstName?: string, lastName?: string): string {
    const a = (firstName || '').trim().slice(0, 1).toUpperCase();
    const b = (lastName || '').trim().slice(0, 1).toUpperCase();
    return (a + b) || 'DR';
  }

  specializationLabel(value: unknown): string {
    const v = String(value || '').toUpperCase();
    if (v === 'GENERAL_PRACTICE') return 'Médecine générale';
    if (v === 'CARDIOLOGY') return 'Cardiologie';
    if (v === 'DERMATOLOGY') return 'Dermatologie';
    if (v === 'PEDIATRICS') return 'Pédiatrie';
    if (v === 'NEUROLOGY') return 'Neurologie';
    if (v === 'ORTHOPEDICS') return 'Orthopédie';
    if (v === 'PSYCHIATRY') return 'Psychiatrie';
    if (v === 'RADIOLOGY') return 'Radiologie';
    if (v === 'OTHER') return 'Autre';
    return v ? v : '—';
  }

  openApprove(d: Doctor): void {
    this.closeModals();
    this.approveTarget.set(d);
  }

  openReject(d: Doctor): void {
    this.closeModals();
    this.rejectTarget.set(d);
    this.reason.set('');
    this.reasonError.set(null);
  }

  openSuspend(d: Doctor): void {
    this.closeModals();
    this.suspendTarget.set(d);
    this.reason.set('');
    this.reasonError.set(null);
  }

  closeModals(): void {
    this.approveTarget.set(null);
    this.rejectTarget.set(null);
    this.suspendTarget.set(null);
    this.reasonError.set(null);
    this.modalLoading.set(false);
  }

  confirmApprove(d: Doctor): void {
    this.modalLoading.set(true);
    this.userService.approveDoctor(d.id).subscribe({
      next: updated => {
        this.toast.success(`Le compte du Dr. ${d.firstName} ${d.lastName} a été approuvé`);
        this.doctors.update(list => list.map(x => x.id === d.id ? { ...x, verificationStatus: updated.verificationStatus } : x));
        this.closeModals();
      },
      error: () => {
        this.modalLoading.set(false);
        this.toast.error('Action impossible.');
      },
    });
  }

  confirmReject(d: Doctor): void {
    const reason = this.reason().trim();
    if (reason.length < 10) {
      this.reasonError.set('Le motif doit contenir au moins 10 caractères.');
      return;
    }
    this.modalLoading.set(true);
    this.userService.rejectDoctor(d.id, reason).subscribe({
      next: updated => {
        this.toast.success(`Le compte du Dr. ${d.firstName} ${d.lastName} a été refusé`);
        this.doctors.update(list => list.map(x => x.id === d.id ? { ...x, verificationStatus: updated.verificationStatus } : x));
        this.closeModals();
      },
      error: () => {
        this.modalLoading.set(false);
        this.toast.error('Action impossible.');
      },
    });
  }

  confirmSuspend(d: Doctor): void {
    const reason = this.reason().trim();
    if (reason.length < 10) {
      this.reasonError.set('Le motif doit contenir au moins 10 caractères.');
      return;
    }
    this.modalLoading.set(true);
    this.userService.suspendDoctor(d.id, reason).subscribe({
      next: updated => {
        this.toast.success(`Le compte du Dr. ${d.firstName} ${d.lastName} a été suspendu`);
        this.doctors.update(list => list.map(x => x.id === d.id ? { ...x, verificationStatus: updated.verificationStatus } : x));
        this.closeModals();
      },
      error: () => {
        this.modalLoading.set(false);
        this.toast.error('Action impossible.');
      },
    });
  }

  statusLabel(status: VerificationStatus | undefined): string {
    if (status === 'PENDING') return 'En attente';
    if (status === 'APPROVED') return 'Approuvé';
    if (status === 'REJECTED') return 'Refusé';
    if (status === 'SUSPENDED') return 'Suspendu';
    return String(status || '—');
  }

  statusBadgeClass(status: VerificationStatus | undefined): string {
    if (status === 'PENDING') return 'bg-amber-50 text-amber-800';
    if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700';
    if (status === 'REJECTED') return 'bg-rose-50 text-rose-700';
    if (status === 'SUSPENDED') return 'bg-stone-200 text-stone-700';
    return 'bg-stone-200 text-stone-700';
  }

  confirmReactivate(d: Doctor): void {
    this.userService.reactivateDoctor(d.id).subscribe({
      next: updated => {
        this.toast.success(`Le compte du Dr. ${d.firstName} ${d.lastName} a été réactivé`);
        this.doctors.update(list => list.map(x => x.id === d.id ? { ...x, verificationStatus: updated.verificationStatus } : x));
      },
      error: () => this.toast.error('Action impossible.'),
    });
  }
}
