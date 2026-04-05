import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Specialization } from '../../../../core/user';

export interface ProfessionalStepData {
  rppsNumber:           string;
  specialization:       string;
  licenseNumber?:       string;
  consultationDuration?: number;
  consultationFee?:     number;
  officeAddress?:       string;
}

const RPPS_REGEX = /^\d{11}$/;

@Component({
  selector: 'app-doctor-professional-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="rounded-2xl border border-stone-200 bg-white p-4 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-semibold text-stone-900">Informations professionnelles</p>
          <p class="text-xs text-stone-500 mt-0.5">Ces informations sont nécessaires pour la vérification</p>
        </div>
        <button type="button" (click)="back.emit()" class="text-sm font-semibold text-teal-700 hover:text-teal-800">
          ← Retour
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">
              Numéro RPPS
              <span class="text-stone-400 font-normal ml-1">(11 chiffres)</span>
            </label>
            <input type="text" formControlName="rppsNumber" maxlength="11" placeholder="10012345678"
                   class="field-input" [class.field-input--error]="showError('rppsNumber')"/>
            <p class="text-xs text-stone-500">Identifiant national du professionnel de santé (11 chiffres)</p>
            @if (showError('rppsNumber')) { <p class="field-error">Le numéro RPPS doit contenir 11 chiffres</p> }
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Spécialisation</label>
            <select formControlName="specialization" class="field-input" [class.field-input--error]="showError('specialization')">
              <option value="" disabled>Choisir une spécialisation</option>
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
            @if (showError('specialization')) { <p class="field-error">La spécialisation est obligatoire</p> }
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Numéro d'ordre (optionnel)</label>
            <input type="text" formControlName="licenseNumber" class="field-input" placeholder="Ex: 12345"/>
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Durée de consultation (minutes)</label>
            <input type="number" min="10" max="120" formControlName="consultationDuration" class="field-input" placeholder="30"/>
            @if (showError('consultationDuration')) { <p class="field-error">Entre 10 et 120 minutes</p> }
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Tarif de consultation (TND)</label>
            <input type="number" min="0" step="0.001" formControlName="consultationFee" class="field-input" placeholder="Ex: 70.000"/>
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Adresse du cabinet (optionnel)</label>
            <input type="text" formControlName="officeAddress" class="field-input" placeholder="Ex: 15 Rue de la Liberté, Tunis"/>
          </div>
        </div>

        <div class="flex items-start gap-2.5 p-3 bg-sky-50 border border-sky-100 rounded-xl text-xs text-sky-800">
          <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/>
          </svg>
          <span>Votre compte sera soumis à vérification par notre équipe. Vous recevrez un e-mail de confirmation une fois votre compte approuvé.</span>
        </div>

        <button type="submit" [disabled]="loading"
                class="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800
                       text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2 shadow-sm shadow-teal-200 cursor-pointer">
          @if (loading) {
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Création en cours...
          } @else {
            Créer mon compte médecin
          }
        </button>
      </form>
    </div>
  `,
  styles: [`
    .field-input {
      @apply w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white
             text-sm text-stone-900 placeholder-stone-400 outline-none transition-all
             focus:border-teal-500 focus:ring-2 focus:ring-teal-200;
    }
    .field-input--error { @apply border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100; }
    .field-error        { @apply text-xs text-rose-600 flex items-center gap-1; }
    select.field-input  { @apply appearance-none; }
  `],
})
export class DoctorProfessionalStepComponent {
  @Input() loading = false;
  @Output() submit = new EventEmitter<ProfessionalStepData>();
  @Output() back   = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  Specialization = Specialization;

  form = this.fb.group({
    rppsNumber:           ['', [Validators.required, Validators.pattern(RPPS_REGEX)]],
    specialization:       ['', [Validators.required]],
    licenseNumber:        ['', [Validators.maxLength(50)]],
    consultationDuration: [30 as number | null, [Validators.min(10), Validators.max(120)]],
    consultationFee:      [null as number | null, [Validators.min(0)]],
    officeAddress:        ['', [Validators.maxLength(500)]],
  });

  showError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.value;
    this.submit.emit({
      rppsNumber:           v.rppsNumber!,
      specialization:       v.specialization!,
      licenseNumber:        v.licenseNumber ?? undefined,
      consultationDuration: v.consultationDuration == null ? undefined : Number(v.consultationDuration),
      consultationFee:      v.consultationFee      == null ? undefined : Number(v.consultationFee),
      officeAddress:        (v.officeAddress || '').trim() || undefined,
    });
  }
}
