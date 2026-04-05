import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Doctor } from '../../../../core/user';

export interface RejectPayload { doctor: Doctor; reason: string; }

@Component({
  selector: 'app-doctor-rejection-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="doctor" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div class="w-full max-w-lg rounded-2xl bg-white border border-stone-200 shadow-xl p-5">
        <div class="flex items-start justify-between gap-3">
          <h2 class="text-lg font-bold text-stone-900">Refuser le compte médecin</h2>
          <button (click)="onCancel()" class="text-stone-500 hover:text-stone-700 text-xl leading-none">×</button>
        </div>

        <div class="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl border border-stone-200 bg-white overflow-hidden flex items-center justify-center flex-shrink-0">
              <img *ngIf="doctor.profilePicture" [src]="doctor.profilePicture" alt="" class="w-full h-full object-cover"/>
              <span *ngIf="!doctor.profilePicture" class="text-sm font-bold text-stone-600">{{ initials(doctor) }}</span>
            </div>
            <div class="min-w-0">
              <div class="text-sm text-stone-900 font-semibold truncate">Dr. {{ doctor.firstName }} {{ doctor.lastName }}</div>
              <div class="text-xs text-stone-600 truncate">{{ doctor.email }}</div>
            </div>
          </div>
        </div>

        <textarea
          class="mt-4 w-full min-h-[110px] rounded-xl border border-stone-200 p-3 text-sm outline-none focus:ring-2 focus:ring-rose-200"
          placeholder="Veuillez indiquer la raison du refus..."
          [value]="reason()"
          (input)="reason.set($any($event.target).value)"
        ></textarea>
        <div class="mt-2 text-xs text-stone-500">Minimum 10 caractères</div>
        <div class="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2">
          Le médecin sera notifié par e-mail de cette décision avec le motif indiqué.
        </div>
        <div *ngIf="reasonError()" class="mt-2 text-sm text-rose-700">{{ reasonError() }}</div>

        <div class="mt-5 flex items-center justify-end gap-2">
          <button (click)="onCancel()" class="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-800">
            Annuler
          </button>
          <button (click)="onConfirm()" [disabled]="loading || reason().trim().length < 10"
                  class="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2">
            <svg *ngIf="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Confirmer le refus
          </button>
        </div>
      </div>
    </div>
  `,
})
export class DoctorRejectionModalComponent {
  @Input() doctor: Doctor | null = null;
  @Input() loading = false;
  @Output() confirm = new EventEmitter<RejectPayload>();
  @Output() cancel  = new EventEmitter<void>();

  reason      = signal('');
  reasonError = signal<string | null>(null);

  onConfirm(): void {
    const r = this.reason().trim();
    if (r.length < 10) { this.reasonError.set('Le motif doit contenir au moins 10 caractères.'); return; }
    if (!this.doctor) return;
    this.confirm.emit({ doctor: this.doctor, reason: r });
  }

  onCancel(): void {
    this.reason.set('');
    this.reasonError.set(null);
    this.cancel.emit();
  }

  initials(d: Doctor): string {
    return ((d.firstName || '').slice(0, 1) + (d.lastName || '').slice(0, 1)).toUpperCase() || 'DR';
  }
}
