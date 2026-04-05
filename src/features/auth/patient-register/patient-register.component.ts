import {
  Component, EventEmitter, Output,
  inject, signal
} from '@angular/core';
import {
  CommonModule
} from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder,
  Validators, AbstractControl, ValidationErrors
} from '@angular/forms';
import { AuthFacade }    from '../../../core/services/auth.facade';
import { ToastService }  from '../toast/toast.service';
import { Gender }        from '../../../core/user';
import { FileUploadService } from '../../../app/services/file-upload.service';
import { ImageUploadComponent } from '../../../app/components/image-upload/image-upload.component';
import { PhoneInputComponent } from '../../../app/components/phone-input/phone-input.component';
import { finalize, of, switchMap } from 'rxjs';

// ── Custom validators ──────────────────────────────────────────────────────
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

function passwordStrength(ctrl: AbstractControl): ValidationErrors | null {
  if (!ctrl.value) return null;
  return PASSWORD_REGEX.test(ctrl.value) ? null : { weakPassword: true };
}

function passwordMatch(group: AbstractControl): ValidationErrors | null {
  const pwd    = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pwd && confirm && pwd !== confirm ? { mismatch: true } : null;
}

function ageValidator(minAge: number) {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    if (!ctrl.value) return null;
    const dob  = new Date(ctrl.value);
    const today = new Date();
    const age  = today.getFullYear() - dob.getFullYear();
    return age < minAge ? { tooYoung: { minAge } } : null;
  };
}

@Component({
  selector: 'app-patient-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImageUploadComponent, PhoneInputComponent],
  template: `
    <div class="w-full">
      <div class="mb-5">
        <h2 class="text-2xl font-bold text-stone-900 tracking-tight">Créer un compte patient</h2>
        <p class="text-sm text-stone-500 mt-1">Créez votre profil santé sur MediConnect</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="space-y-3.5">
        <app-image-upload (selected)="selectedFile.set($event)" (uploaded)="uploadedUrl.set($event)" />

        <div class="rounded-2xl border border-stone-200 bg-white p-4 space-y-4">
          <div>
            <p class="text-sm font-semibold text-stone-900">Informations personnelles</p>
            <p class="text-xs text-stone-500 mt-0.5">Les champs marqués sont obligatoires</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-stone-700">Prénom</label>
              <input type="text" formControlName="firstName" placeholder="Karim"
                     class="field-input" [class.field-input--error]="showError('firstName')" />
              @if (showError('firstName')) { <p class="field-error">Le prénom est obligatoire</p> }
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-stone-700">Nom</label>
              <input type="text" formControlName="lastName" placeholder="Mansouri"
                     class="field-input" [class.field-input--error]="showError('lastName')" />
              @if (showError('lastName')) { <p class="field-error">Le nom est obligatoire</p> }
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Adresse e-mail</label>
            <input type="email" formControlName="email" placeholder="vous@exemple.com" autocomplete="email"
                   class="field-input" [class.field-input--error]="showError('email')" />
            @if (showError('email')) {
              <p class="field-error">
                @if (form.get('email')?.errors?.['required']) { L’adresse e-mail est obligatoire }
                @else { Veuillez saisir une adresse e-mail valide }
              </p>
            }
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-stone-700">Numéro de téléphone (optionnel)</label>
              <app-phone-input formControlName="phone" placeholder="98 765 432" />
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-stone-700">Date de naissance</label>
              <input type="date" formControlName="dateOfBirth"
                     class="field-input" [class.field-input--error]="showError('dateOfBirth')" />
              @if (showError('dateOfBirth')) {
                <p class="field-error">
                  @if (form.get('dateOfBirth')?.errors?.['required']) { La date de naissance est obligatoire }
                  @else { Date invalide }
                </p>
              }
            </div>
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
        </div>

        <!-- Password group -->
        <div formGroupName="passwords" class="space-y-3.5 rounded-2xl border border-stone-200 bg-white p-4">
          <div>
            <p class="text-sm font-semibold text-stone-900">Sécurité</p>
            <p class="text-xs text-stone-500 mt-0.5">Minimum 8 caractères, 1 majuscule, 1 chiffre</p>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-medium text-stone-700">Mot de passe</label>
            <div class="relative">
              <input
                [type]="showPwd() ? 'text' : 'password'"
                formControlName="password"
                placeholder="Ex: Mediconnect2026"
                class="field-input pr-11"
                [class.field-input--error]="showPwdError()"
              />
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
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
                         -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  }
                </svg>
              </button>
            </div>

            <!-- Password strength bar -->
            @if (pwdValue()) {
              <div class="space-y-1">
                <div class="flex gap-1">
                  @for (seg of [1,2,3,4]; track seg) {
                    <div class="h-1 flex-1 rounded-full transition-all"
                         [class.bg-red-400]="pwdStrength() === 1 && seg === 1"
                         [class.bg-amber-400]="pwdStrength() === 2 && seg <= 2"
                         [class.bg-teal-400]="pwdStrength() === 3 && seg <= 3"
                         [class.bg-emerald-500]="pwdStrength() === 4 && seg <= 4"
                         [class.bg-gray-200]="seg > pwdStrength()"></div>
                  }
                </div>
                <p class="text-xs"
                   [class.text-red-500]="pwdStrength() === 1"
                   [class.text-amber-500]="pwdStrength() === 2"
                   [class.text-teal-600]="pwdStrength() === 3"
                   [class.text-emerald-600]="pwdStrength() === 4">
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
            <input
              [type]="showPwd() ? 'text' : 'password'"
              formControlName="confirmPassword"
              placeholder="••••••••"
              class="field-input"
              [class.field-input--error]="showConfirmError()"
            />
            @if (showConfirmError()) {
              <p class="field-error">
                @if (pwdGroup?.errors?.['mismatch']) { Les mots de passe ne correspondent pas }
                @else { Veuillez confirmer votre mot de passe }
              </p>
            }
          </div>
        </div>

        <details class="rounded-2xl border border-stone-200 bg-white p-4">
          <summary class="cursor-pointer text-sm font-semibold text-stone-900">Informations supplémentaires (optionnel)</summary>
          <div class="mt-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-stone-700">Adresse (optionnel)</label>
              <input type="text" formControlName="address" placeholder="Ex: Rue, ville"
                     class="field-input" [class.field-input--error]="showError('address')" />
              @if (showError('address')) { <p class="field-error">Adresse invalide</p> }
            </div>
          </div>
        </details>

        <details class="rounded-2xl border border-stone-200 bg-white p-4">
          <summary class="cursor-pointer text-sm font-semibold text-stone-900">Contact d'urgence (optionnel)</summary>
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-stone-700">Nom du contact d'urgence</label>
              <input type="text" formControlName="emergencyContactName" placeholder="Ex: Ahmed Ben Ali"
                     class="field-input" />
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-medium text-stone-700">Téléphone du contact d'urgence</label>
              <app-phone-input formControlName="emergencyContactPhone" placeholder="98 765 432" />
            </div>
          </div>
        </details>

        <!-- Submit -->
        <button
          type="submit"
          [disabled]="loading()"
          class="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800
                 text-white font-semibold text-sm rounded-xl transition-all mt-1 disabled:opacity-60 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2 shadow-sm shadow-teal-200 cursor-pointer">
          @if (loading()) {
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Création en cours...
          } @else {
            Créer mon compte
          }
        </button>

        <p class="text-center text-xs text-stone-500">
          Vous avez déjà un compte ?
          <button type="button" (click)="goToLogin.emit()"
            class="text-teal-700 hover:text-teal-800 font-semibold ml-1 cursor-pointer">
            Se connecter
          </button>
        </p>

      </form>
    </div>
  `,
  styles: [`
    .field-input {
      @apply w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white
             text-sm text-stone-900 placeholder-stone-400 outline-none transition-all
             focus:border-teal-500 focus:ring-2 focus:ring-teal-200;
    }
    .field-input--error {
      @apply border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100;
    }
    .field-error {
      @apply text-xs text-rose-600 flex items-center gap-1;
    }
    select.field-input {
      @apply appearance-none;
    }
  `],
})
export class PatientRegisterComponent {
  @Output() success   = new EventEmitter<void>();
  @Output() goToLogin = new EventEmitter<void>();
  @Output() verificationRequested = new EventEmitter<string>();

  private fb     = inject(FormBuilder);
  private facade = inject(AuthFacade);
  private toast  = inject(ToastService);
  private upload = inject(FileUploadService);

  Gender  = Gender;
  loading = signal(false);
  showPwd = signal(false);
  selectedFile = signal<File | null>(null);
  uploadedUrl = signal<string | null>(null);

  form = this.fb.group({
    firstName:   ['', [Validators.required, Validators.minLength(2)]],
    lastName:    ['', [Validators.required, Validators.minLength(2)]],
    email:       ['', [Validators.required, Validators.email]],
    phone:       [''],
    dateOfBirth: ['', [Validators.required, ageValidator(5)]],
    gender:      [''],
    address:           ['', [Validators.maxLength(200)]],
    emergencyContactName:  ['', [Validators.maxLength(100)]],
    emergencyContactPhone: [''],
    passwords: this.fb.group({
      password:        ['', [Validators.required, passwordStrength]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: passwordMatch }),
  });

  get pwdGroup() { return this.form.get('passwords'); }

  showError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  showPwdError(): boolean {
    const ctrl = this.pwdGroup?.get('password');
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  showConfirmError(): boolean {
    const ctrl  = this.pwdGroup?.get('confirmPassword');
    const group = this.pwdGroup;
    return !!(
      (ctrl?.invalid && ctrl?.touched) ||
      (group?.errors?.['mismatch'] && ctrl?.touched)
    );
  }

  get pwdValue(): () => string {
    return () => this.pwdGroup?.get('password')?.value ?? '';
  }

  pwdStrength(): number {
    const p = this.pwdValue();
    if (!p || p.length < 6) return 0;
    let score = 0;
    if (p.length >= 8)          score++;
    if (/[A-Z]/.test(p))        score++;
    if (/[0-9]/.test(p))        score++;
    if (/[@$!%*?&]/.test(p))    score++;
    return score;
  }

  pwdStrengthLabel(): string {
    return ['', 'Faible', 'Moyen', 'Bon', 'Fort'][this.pwdStrength()] ?? '';
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.warning('Veuillez corriger les erreurs avant de continuer.', 'Formulaire incomplet');
      return;
    }

    this.loading.set(true);
    const v = this.form.value;

    const file = this.selectedFile();
    const existingUrl = this.uploadedUrl();
    const profileUrl$ = file && !existingUrl
      ? this.upload.uploadImage(file).pipe(switchMap(r => of(r.url)))
      : of(existingUrl);

    profileUrl$.pipe(
      switchMap((url) => this.facade.registerPatient({
        firstName:   v.firstName!,
        lastName:    v.lastName!,
        email:       v.email!,
        phone:       (v.phone || '').trim() || undefined,
        dateOfBirth: v.dateOfBirth!,
        gender:      (v.gender ? (v.gender as Gender) : undefined),
        address:           (v.address || '').trim() || undefined,
        emergencyContactName:  (v.emergencyContactName || '').trim() || undefined,
        emergencyContactPhone: (v.emergencyContactPhone || '').trim() || undefined,
        profilePicture:    url || undefined,
        password:    (v.passwords as { password: string }).password,
      })),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (res) => {
        this.toast.success(
          res.message ?? 'Code de vérification envoyé. Veuillez vérifier votre e-mail.',
          'Vérification'
        );
        this.verificationRequested.emit(v.email!);
      },
      error: (err: Error) => {
        this.toast.error(
          err.message ?? 'Inscription impossible. Veuillez réessayer.',
          'Inscription'
        );
      },
    });
  }
}
