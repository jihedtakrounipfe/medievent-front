import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { PhoneInputComponent } from '../../phone-input/phone-input.component';

export interface EmergencyContactData {
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

@Component({
  selector: 'app-emergency-contact-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PhoneInputComponent],
  template: `
    <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-5">
      <h2 class="text-base font-bold text-stone-900">Contact d'urgence</h2>
      <form [formGroup]="form" (ngSubmit)="onSave()" class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-stone-700">Nom du contact d'urgence</label>
          <input class="field-input" formControlName="emergencyContactName" type="text">
        </div>
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-stone-700">Téléphone du contact d'urgence</label>
          <app-phone-input formControlName="emergencyContactPhone" />
        </div>
        <div class="md:col-span-2 flex justify-end mt-1">
          <button type="submit" [disabled]="saving || form.pristine"
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
  `],
})
export class EmergencyContactFormComponent implements OnChanges {
  @Input() data: EmergencyContactData | null = null;
  @Input() saving = false;
  @Output() save = new EventEmitter<EmergencyContactData>();

  private fb = inject(FormBuilder);

  form = this.fb.group({
    emergencyContactName:  [''],
    emergencyContactPhone: [''],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.form.patchValue({
        emergencyContactName:  this.data.emergencyContactName  || '',
        emergencyContactPhone: this.data.emergencyContactPhone || '',
      }, { emitEvent: false });
      this.form.markAsPristine();
    }
  }

  onSave(): void {
    if (this.form.pristine) return;
    this.save.emit(this.form.value as EmergencyContactData);
  }
}
