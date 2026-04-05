import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DoctorStatusBadgeComponent } from '../../shared/doctor-status-badge/doctor-status-badge.component';
import { Specialization, VerificationStatus } from '../../../../core/user';

export interface ProfessionalInfoData {
  specialization?: string;
  licenseNumber?: string;
  consultationDuration?: number;
  consultationFee?: number | null;
  officeAddress?: string;
}

@Component({
  selector: 'app-professional-info-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DoctorStatusBadgeComponent],
  template: `
    <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-5">
      <div class="flex items-start justify-between gap-3">
        <h2 class="text-base font-bold text-stone-900">Informations professionnelles</h2>
        <app-doctor-status-badge [status]="verificationStatus" />
      </div>

      <form [formGroup]="form" (ngSubmit)="onSave()" class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-stone-700">Numéro RPPS (lecture seule)</label>
          <div class="field-input bg-stone-50 text-stone-700">{{ rppsNumber || '—' }}</div>
        </div>
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-stone-700">Spécialisation</label>
          <select class="field-input" formControlName="specialization">
            <option value="">—</option>
            <option [value]="Specialization.GENERAL_PRACTICE">Médecine générale</option>
            <option [value]="Specialization.CARDIOLOGY">Cardiologie</option>
            <option [value]="Specialization.DERMATOLOGY">Dermatologie</option>
            <option [value]="Specialization.PEDIATRICS">Pédiatrie</option>
            <option [value]="Specialization.NEUROLOGY">Neurologie</option>
            <option [value]="Specialization.ORTHOPEDICS">Orthopédie</option>
            <option [value]="Specialization.PSYCHIATRY">Psychiatrie</option>
            <option [value]="Specialization.RADIOLOGY">Radiologie</option>
            <option [value]="Specialization.OTHER">Autre</option>
          </select>
        </div>
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-stone-700">Numéro d'ordre</label>
          <input class="field-input" formControlName="licenseNumber" type="text">
        </div>
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-stone-700">Durée de consultation (minutes)</label>
          <input class="field-input" formControlName="consultationDuration" type="number" min="10" max="120">
        </div>
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-stone-700">Tarif de consultation (TND)</label>
          <input class="field-input" formControlName="consultationFee" type="number" min="0" step="0.001">
        </div>
        <div class="space-y-1.5 md:col-span-2">
          <label class="block text-xs font-medium text-stone-700">Adresse du cabinet</label>
          <input class="field-input" formControlName="officeAddress" type="text">
        </div>
        <div class="md:col-span-2 flex justify-end mt-1">
          <button type="submit" [disabled]="saving || form.invalid || form.pristine"
                  class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2">
            <svg *ngIf="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .field-input {
      @apply w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white
             text-sm text-stone-900 placeholder-stone-400 outline-none transition-all
             focus:border-teal-500 focus:ring-2 focus:ring-teal-200;
    }
    select.field-input { @apply appearance-none; }
  `],
})
export class ProfessionalInfoFormComponent implements OnChanges {
  @Input() data: ProfessionalInfoData | null = null;
  @Input() rppsNumber: string | undefined;
  @Input() verificationStatus: VerificationStatus | undefined;
  @Input() saving = false;
  @Output() save = new EventEmitter<ProfessionalInfoData>();

  private fb = inject(FormBuilder);
  Specialization = Specialization;

  form = this.fb.group({
    specialization:       [''],
    licenseNumber:        [''],
    consultationDuration: [30 as number | null, [Validators.min(10), Validators.max(120)]],
    consultationFee:      [null as number | null, [Validators.min(0)]],
    officeAddress:        [''],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.form.patchValue({
        specialization:       this.data.specialization       || '',
        licenseNumber:        this.data.licenseNumber        || '',
        consultationDuration: this.data.consultationDuration ?? 30,
        consultationFee:      this.data.consultationFee      ?? null,
        officeAddress:        this.data.officeAddress        || '',
      }, { emitEvent: false });
      this.form.markAsPristine();
    }
  }

  onSave(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.form.pristine) return;
    const v = this.form.value;
    this.save.emit({
      specialization:       v.specialization       || undefined,
      licenseNumber:        (v.licenseNumber || '').trim() || undefined,
      consultationDuration: v.consultationDuration == null ? undefined : Number(v.consultationDuration),
      consultationFee:      v.consultationFee      == null ? undefined : Number(v.consultationFee),
      officeAddress:        (v.officeAddress || '').trim() || undefined,
    });
  }
}
