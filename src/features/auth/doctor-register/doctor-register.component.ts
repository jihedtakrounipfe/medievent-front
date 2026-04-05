import {
  Component, EventEmitter, Output,
  inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder,
  Validators, AbstractControl, ValidationErrors
} from '@angular/forms';
import { AuthFacade }       from '../../../core/services/auth.facade';
import { ToastService }     from '../toast/toast.service';
import { Gender, Specialization }   from '../../../core/user';
import { FileUploadService } from '../../../app/services/file-upload.service';
import { ImageUploadComponent } from '../../../app/components/image-upload/image-upload.component';
import { PhoneInputComponent } from '../../../app/components/phone-input/phone-input.component';
import { finalize, of, switchMap } from 'rxjs';

// ── Custom validators ──────────────────────────────────────────────────────
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const RPPS_REGEX     = /^\d{11}$/;

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
  selector: 'app-doctor-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImageUploadComponent, PhoneInputComponent],
  template: `
    <div class="w-full">
      <div class="mb-4">
        <h2 class="text-2xl font-bold text-stone-900 tracking-tight">Créer un compte médecin</h2>
        <p class="text-sm text-stone-500 mt-1">Inscription professionnelle</p>
      </div>

      <div class="flex items-center justify-between mb-4">
        <div class="text-sm font-semibold text-stone-700">Étape {{ step() }} sur 2</div>
        <div class="flex items-center gap-2">
          <div class="w-16 h-1.5 rounded-full" [class.bg-teal-500]="step() >= 1" [class.bg-stone-200]="step() < 1"></div>
          <div class="w-16 h-1.5 rounded-full" [class.bg-teal-500]="step() >= 2" [class.bg-stone-200]="step() < 2"></div>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="space-y-3.5">

        <app-image-upload
          (selected)="selectedFile.set($event)"
          (uploaded)="uploadedUrl.set($event)"
        />

        @if (step() === 1) {
          <div class="rounded-2xl border border-stone-200 bg-white p-4 space-y-4">
            <div>
              <p class="text-sm font-semibold text-stone-900">Informations personnelles</p>
              <p class="text-xs text-stone-500 mt-0.5">Vous pourrez compléter votre profil après inscription</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                <label class="block text-xs font-medium text-stone-700">Date de naissance (optionnel)</label>
                <input type="date" formControlName="dateOfBirth" class="field-input"/>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                <label class="block text-xs font-medium text-stone-700">Adresse personnelle (optionnel)</label>
                <input type="text" formControlName="address" placeholder="Ex: Rue, ville" class="field-input"/>
              </div>
            </div>
          </div>

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

          <div class="flex items-center justify-end">
            <button type="button" (click)="goNext()"
                    class="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 font-semibold text-sm">
              Suivant →
            </button>
          </div>
        } @else {
          <div class="rounded-2xl border border-stone-200 bg-white p-4 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-stone-900">Informations professionnelles</p>
                <p class="text-xs text-stone-500 mt-0.5">Ces informations sont nécessaires pour la vérification</p>
              </div>
              <button type="button" (click)="step.set(1)" class="text-sm font-semibold text-teal-700 hover:text-teal-800">
                ← Retour
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-stone-700">
                  Numéro RPPS
                  <span class="text-stone-400 font-normal ml-1">(11 chiffres)</span>
                </label>
                <input type="text" formControlName="rppsNumber" maxlength="11" placeholder="10012345678"
                       class="field-input" [class.field-input--error]="showError('rppsNumber')" />
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
                <input type="text" formControlName="licenseNumber" class="field-input" placeholder="Ex: 12345" />
              </div>
              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-stone-700">Durée de consultation (minutes)</label>
                <input type="number" min="10" max="120" formControlName="consultationDuration" class="field-input" placeholder="30" />
                @if (showError('consultationDuration')) { <p class="field-error">Entre 10 et 120 minutes</p> }
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-stone-700">Tarif de consultation (TND)</label>
                <input type="number" min="0" step="0.001" formControlName="consultationFee" class="field-input" placeholder="Ex: 70.000" />
              </div>
              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-stone-700">Adresse du cabinet (optionnel)</label>
                <input type="text" formControlName="officeAddress" class="field-input" placeholder="Ex: 15 Rue de la Liberté, Tunis" />
              </div>
            </div>

            <div class="flex items-start gap-2.5 p-3 bg-sky-50 border border-sky-100 rounded-xl text-xs text-sky-800">
              <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/>
              </svg>
              <span>Votre compte sera soumis à vérification par notre équipe. Vous recevrez un e-mail de confirmation une fois votre compte approuvé.</span>
            </div>
          </div>
        }

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
            Créer mon compte médecin
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
    select.field-input { @apply appearance-none; }
  `],
})
export class DoctorRegisterComponent {
  @Output() success   = new EventEmitter<void>();
  @Output() goToLogin = new EventEmitter<void>();
  @Output() verificationRequested = new EventEmitter<string>();

  private fb     = inject(FormBuilder);
  private facade = inject(AuthFacade);
  private toast  = inject(ToastService);
  private upload = inject(FileUploadService);

  Gender = Gender;
  Specialization = Specialization;
  loading        = signal(false);
  showPwd        = signal(false);
  step           = signal<1 | 2>(1);
  selectedFile = signal<File | null>(null);
  uploadedUrl = signal<string | null>(null);

  form = this.fb.group({
    firstName:      ['', [Validators.required, Validators.minLength(2)]],
    lastName:       ['', [Validators.required, Validators.minLength(2)]],
    email:          ['', [Validators.required, Validators.email]],
    rppsNumber:     ['', [Validators.required, Validators.pattern(RPPS_REGEX)]],
    phone:          [''],
    dateOfBirth:    [''],
    gender:         [''],
    address:        [''],
    specialization: ['', [Validators.required]],
    officeAddress:  ['', [Validators.maxLength(500)]],
    licenseNumber:  ['', [Validators.maxLength(50)]],
    consultationDuration: [30 as number | null, [Validators.min(10), Validators.max(120)]],
    consultationFee:      [null as number | null, [Validators.min(0)]],
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

  pwdValue(): string {
    return this.pwdGroup?.get('password')?.value ?? '';
  }

  pwdStrength(): number {
    const p = this.pwdValue();
    if (!p || p.length < 6) return 0;
    let score = 0;
    if (p.length >= 8)       score++;
    if (/[A-Z]/.test(p))     score++;
    if (/[0-9]/.test(p))     score++;
    if (/[@$!%*?&]/.test(p)) score++;
    return score;
  }

  pwdStrengthLabel(): string {
    return ['', 'Faible', 'Moyen', 'Bon', 'Fort'][this.pwdStrength()] ?? '';
  }

  goNext(): void {
    const fields = ['firstName', 'lastName', 'email'] as const;
    fields.forEach(f => this.form.get(f)?.markAsTouched());
    this.pwdGroup?.get('password')?.markAsTouched();
    this.pwdGroup?.get('confirmPassword')?.markAsTouched();

    if (this.form.get('firstName')?.invalid) return;
    if (this.form.get('lastName')?.invalid) return;
    if (this.form.get('email')?.invalid) return;
    if (this.pwdGroup?.invalid) return;

    this.step.set(2);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.step() === 1) {
      this.goNext();
      return;
    }
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
      switchMap((url) => this.facade.registerDoctor({
        firstName:      v.firstName!,
        lastName:       v.lastName!,
        email:          v.email!,
        rppsNumber:     v.rppsNumber!,
        phone:          (v.phone || '').trim() || undefined,
        dateOfBirth:    (v.dateOfBirth || '').trim() || undefined,
        gender:         (v.gender ? (v.gender as Gender) : undefined),
        address:        (v.address || '').trim() || undefined,
        specialization: v.specialization as Specialization,
        officeAddress:  v.officeAddress ?? undefined,
        licenseNumber:  v.licenseNumber ?? undefined,
        consultationDuration: v.consultationDuration == null ? undefined : Number(v.consultationDuration),
        consultationFee:      v.consultationFee == null ? undefined : Number(v.consultationFee),
        profilePicture:       url || undefined,
        password: this.pwdGroup?.get('password')?.value ?? '',
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
