import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { PhoneInputComponent } from '../../phone-input/phone-input.component';
import { Gender } from '../../../../core/user';

export interface PersonalStepData {
  firstName: string;
  lastName:  string;
  email:     string;
  phone?:    string;
  dateOfBirth?: string;
  gender?:   string;
  address?:  string;
  password:  string;
}

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

function passwordStrength(ctrl: AbstractControl): ValidationErrors | null {
  if (!ctrl.value) return null;
  return PASSWORD_REGEX.test(ctrl.value) ? null : { weakPassword: true };
}

function passwordMatch(group: AbstractControl): ValidationErrors | null {
  const pwd     = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pwd && confirm && pwd !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-doctor-personal-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PhoneInputComponent],
  template: `
    <div>
      <form [formGroup]="form" (ngSubmit)="onNext()" novalidate class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Prénom</label>
            <input type="text" formControlName="firstName" placeholder="Ahmed"
                   class="field-input" [class.field-input--error]="showError('firstName')"/>
            @if (showError('firstName')) { <p class="field-error">Le prénom est obligatoire</p> }
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Nom</label>
            <input type="text" formControlName="lastName" placeholder="Ben Ali"
                   class="field-input" [class.field-input--error]="showError('lastName')"/>
            @if (showError('lastName')) { <p class="field-error">Le nom est obligatoire</p> }
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-stone-700">Adresse e-mail</label>
          <input type="email" formControlName="email" placeholder="dr.benali@cabinet.tn" autocomplete="email"
                 class="field-input" [class.field-input--error]="showError('email')"/>
          @if (showError('email')) {
            <p class="field-error">
              @if (form.get('email')?.errors?.['required']) { L'adresse e-mail est obligatoire }
              @else { Veuillez saisir une adresse e-mail valide }
            </p>
          }
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Téléphone (optionnel)</label>
            <app-phone-input formControlName="phone" placeholder="98 765 432" />
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Date de naissance (optionnel)</label>
            <input type="date" formControlName="dateOfBirth" class="field-input"/>
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Genre (optionnel)</label>
            <select formControlName="gender" class="field-input">
              <option value="">—</option>
              <option [value]="Gender.MALE">Homme</option>
              <option [value]="Gender.FEMALE">Femme</option>
              <option [value]="Gender.OTHER">Autre</option>
              <option [value]="Gender.PREFER_NOT_TO_SAY">Préfère ne pas dire</option>
            </select>
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Adresse (optionnel)</label>
            <input type="text" formControlName="address" placeholder="Ex: Rue, ville" class="field-input"/>
          </div>
        </div>

        <!-- Passwords side-by-side -->
        <div formGroupName="passwords" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Mot de passe</label>
            <div class="relative">
              <input [type]="showPwd() ? 'text' : 'password'" formControlName="password"
                     placeholder="Ex: Mediconnect2026" class="field-input pr-11"
                     [class.field-input--error]="showPwdError()"/>
              <button type="button" (click)="showPwd.set(!showPwd())"
                      class="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  @if (showPwd()) {
                    <path stroke-linecap="round" stroke-linejoin="round"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
                             a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
                             M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29
                             M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7
                             a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  } @else {
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
                             -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  }
                </svg>
              </button>
            </div>
            @if (pwdValue()) {
              <div class="space-y-1">
                <div class="flex gap-1">
                  @for (seg of [1,2,3,4]; track seg) {
                    <div class="h-1 flex-1 rounded-full transition-all"
                         [class.bg-rose-400]="pwdStrength() === 1 && seg === 1"
                         [class.bg-amber-400]="pwdStrength() === 2 && seg <= 2"
                         [class.bg-teal-400]="pwdStrength() === 3 && seg <= 3"
                         [class.bg-emerald-500]="pwdStrength() === 4 && seg <= 4"
                         [class.bg-stone-200]="seg > pwdStrength()"></div>
                  }
                </div>
                <p class="text-xs"
                   [class.text-rose-600]="pwdStrength() === 1"
                   [class.text-amber-600]="pwdStrength() === 2"
                   [class.text-teal-700]="pwdStrength() === 3"
                   [class.text-emerald-700]="pwdStrength() === 4">
                  {{ pwdStrengthLabel() }}
                </p>
              </div>
            }
            @if (showPwdError()) {
              <p class="field-error">
                @if (pwdGroup?.get('password')?.errors?.['required']) { Le mot de passe est obligatoire }
                @else { Minimum 8 caractères avec 1 majuscule et 1 chiffre }
              </p>
            }
          </div>
          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Confirmer le mot de passe</label>
            <input [type]="showPwd() ? 'text' : 'password'" formControlName="confirmPassword"
                   placeholder="••••••••" class="field-input" [class.field-input--error]="showConfirmError()"/>
            @if (showConfirmError()) {
              <p class="field-error">
                @if (pwdGroup?.errors?.['mismatch']) { Les mots de passe ne correspondent pas }
                @else { Veuillez confirmer votre mot de passe }
              </p>
            }
          </div>
        </div>

        <div class="flex items-center justify-end">
          <button type="submit" class="px-5 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 font-semibold text-sm cursor-pointer">
            Suivant
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
    .field-input--error { @apply border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100; }
    .field-error        { @apply text-xs text-rose-600 flex items-center gap-1; }
    select.field-input  { @apply appearance-none; }
  `],
})
export class DoctorPersonalStepComponent {
  @Output() next = new EventEmitter<PersonalStepData>();

  private fb = inject(FormBuilder);
  Gender  = Gender;
  showPwd = signal(false);

  form = this.fb.group({
    firstName:   ['', [Validators.required, Validators.minLength(2)]],
    lastName:    ['', [Validators.required, Validators.minLength(2)]],
    email:       ['', [Validators.required, Validators.email]],
    phone:       [''],
    dateOfBirth: [''],
    gender:      [''],
    address:     [''],
    passwords: this.fb.group({
      password:        ['', [Validators.required, passwordStrength]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: passwordMatch }),
  });

  get pwdGroup() { return this.form.get('passwords'); }

  showError(field: string):  boolean { const c = this.form.get(field); return !!(c?.invalid && c?.touched); }
  showPwdError():            boolean { const c = this.pwdGroup?.get('password'); return !!(c?.invalid && c?.touched); }
  showConfirmError():        boolean {
    const c = this.pwdGroup?.get('confirmPassword');
    return !!((c?.invalid && c?.touched) || (this.pwdGroup?.errors?.['mismatch'] && c?.touched));
  }

  pwdValue(): string { return this.pwdGroup?.get('password')?.value ?? ''; }
  pwdStrength(): number {
    const p = this.pwdValue();
    if (!p || p.length < 6) return 0;
    let s = 0;
    if (p.length >= 8)       s++;
    if (/[A-Z]/.test(p))     s++;
    if (/[0-9]/.test(p))     s++;
    if (/[@$!%*?&]/.test(p)) s++;
    return s;
  }
  pwdStrengthLabel(): string { return ['', 'Faible', 'Moyen', 'Bon', 'Fort'][this.pwdStrength()] ?? ''; }

  onNext(): void {
    ['firstName', 'lastName', 'email'].forEach(f => this.form.get(f)?.markAsTouched());
    this.pwdGroup?.get('password')?.markAsTouched();
    this.pwdGroup?.get('confirmPassword')?.markAsTouched();
    if (this.form.get('firstName')?.invalid) return;
    if (this.form.get('lastName')?.invalid)  return;
    if (this.form.get('email')?.invalid)     return;
    if (this.pwdGroup?.invalid)              return;
    const v = this.form.value;
    this.next.emit({
      firstName:   v.firstName!,
      lastName:    v.lastName!,
      email:       v.email!,
      phone:       (v.phone || '').trim() || undefined,
      dateOfBirth: (v.dateOfBirth || '').trim() || undefined,
      gender:      (v.gender || '').trim() || undefined,
      address:     (v.address || '').trim() || undefined,
      password:    (v.passwords as { password: string }).password,
    });
  }
}
