import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PhoneInputComponent } from '../../phone-input/phone-input.component';
import { Gender } from '../../../../core/user';

export interface PersonalInfoData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
}

@Component({
  selector: 'app-personal-info-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PhoneInputComponent],
  template: `
    <div>
      <form [formGroup]="form" (ngSubmit)="onSave()" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-stone-700">Prénom</label>
          <input class="field-input" formControlName="firstName" type="text">
        </div>
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-stone-700">Nom</label>
          <input class="field-input" formControlName="lastName" type="text">
        </div>
        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-stone-700">Numéro de téléphone</label>
          <app-phone-input formControlName="phone" />
        </div>
        @if (showDateOfBirth) {
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Date de naissance</label>
            <input class="field-input" formControlName="dateOfBirth" type="date">
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Genre</label>
            <select class="field-input" formControlName="gender">
              <option value="">—</option>
              <option [value]="Gender.MALE">Homme</option>
              <option [value]="Gender.FEMALE">Femme</option>
              <option [value]="Gender.OTHER">Autre</option>
              <option [value]="Gender.PREFER_NOT_TO_SAY">Préfère ne pas dire</option>
            </select>
          </div>
        }
        <div class="space-y-1.5 md:col-span-2">
          <label class="block text-xs font-medium text-stone-700">Adresse</label>
          <input class="field-input" formControlName="address" type="text">
        </div>
        <div class="md:col-span-2 flex justify-end mt-2">
          <button type="submit" [disabled]="saving || form.invalid || form.pristine"
                  class="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2 cursor-pointer">
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
export class PersonalInfoFormComponent implements OnChanges {
  @Input() data: PersonalInfoData | null = null;
  @Input() saving = false;
  @Input() showDateOfBirth = false;
  @Output() save = new EventEmitter<PersonalInfoData>();

  private fb = inject(FormBuilder);
  Gender = Gender;

  form = this.fb.group({
    firstName:   ['', [Validators.required, Validators.minLength(2)]],
    lastName:    ['', [Validators.required, Validators.minLength(2)]],
    phone:       [''],
    dateOfBirth: [''],
    gender:      [''],
    address:     [''],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.form.patchValue({
        firstName:   this.data.firstName   || '',
        lastName:    this.data.lastName    || '',
        phone:       this.data.phone       || '',
        dateOfBirth: this.data.dateOfBirth || '',
        gender:      this.data.gender      || '',
        address:     this.data.address     || '',
      }, { emitEvent: false });
      this.form.markAsPristine();
    }
  }

  onSave(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.form.pristine) return;
    this.save.emit(this.form.value as PersonalInfoData);
  }
}
