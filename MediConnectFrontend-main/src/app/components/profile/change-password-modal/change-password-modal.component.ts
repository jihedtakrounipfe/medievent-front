import {
  Component, EventEmitter, Output, OnDestroy,
  inject, signal, computed
} from '@angular/core';
import { CommonModule }        from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { AuthService }         from '../../../../core/services/auth.service';
import { ToastService }        from '../../../../features/auth/toast/toast.service';

/**
 * Two-step in-app password change modal.
 *
 * Step 1 — Identity verification via email code.
 * Step 2 — Enter current + new passwords using the verification token from step 1.
 *
 * Fixes the submit button bug by using SEPARATE FormGroups per step — the step-2
 * button only checks passwordForm.invalid, never the step-1 codeForm.
 */
@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
         style="background: rgba(0,0,0,0.45);"
         (click)="onBackdropClick()">

      <div class="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 space-y-5"
           (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <div>
            <div class="text-base font-bold text-stone-900">Changer le mot de passe</div>
            <div class="text-xs text-stone-500">
              {{ currentStep() === 1 ? 'Étape 1 sur 2 — Vérification d\'identité' : 'Étape 2 sur 2 — Nouveau mot de passe' }}
            </div>
          </div>
        </div>

        <!-- Step progress bar -->
        <div class="flex gap-1.5">
          <div class="flex-1 h-1 rounded-full"
               [class.bg-teal-500]="currentStep() >= 1"
               [class.bg-stone-200]="currentStep() < 1"></div>
          <div class="flex-1 h-1 rounded-full"
               [class.bg-teal-500]="currentStep() >= 2"
               [class.bg-stone-200]="currentStep() < 2"></div>
        </div>

        <!-- ─────────────────── STEP 1 ─────────────────── -->
        @if (currentStep() === 1) {
          <div class="space-y-4">
            <p class="text-sm text-stone-600">
              Pour des raisons de sécurité, nous devons vérifier votre identité avant de modifier votre mot de passe.
            </p>

            @if (!codeSent()) {
              <!-- Before code is sent -->
              @if (maskedEmail()) {
                <div class="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3">
                  <p class="text-xs text-teal-700">Un code de vérification sera envoyé à :</p>
                  <p class="text-sm font-semibold text-teal-800 mt-0.5">{{ maskedEmail() }}</p>
                </div>
              }

              @if (serverError()) {
                <div class="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                  <p class="text-xs text-red-700 font-medium">{{ serverError() }}</p>
                </div>
              }

              <div class="flex gap-3">
                <button type="button" (click)="closed.emit()"
                        class="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold
                               text-stone-700 hover:bg-stone-50 transition-colors">
                  Annuler
                </button>
                <button type="button"
                        (click)="onSendCode()"
                        [disabled]="codeLoading()"
                        class="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white
                               text-sm font-semibold transition-colors disabled:opacity-50
                               flex items-center justify-center gap-2">
                  @if (codeLoading()) {
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Envoi…
                  } @else {
                    Envoyer le code
                  }
                </button>
              </div>
            } @else {
              <!-- After code is sent -->
              <div class="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3">
                <p class="text-xs text-teal-700">Code envoyé à :</p>
                <p class="text-sm font-semibold text-teal-800 mt-0.5">{{ maskedEmail() }}</p>
              </div>

              @if (serverError()) {
                <div class="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                  <p class="text-xs text-red-700 font-medium">{{ serverError() }}</p>
                </div>
              }

              <!-- Code input -->
              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-stone-700">Code de vérification</label>
                <input
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  [formControl]="codeForm.controls.code"
                  placeholder="• • • • • •"
                  autocomplete="one-time-code"
                  class="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50
                         text-stone-900 text-center text-xl font-mono tracking-[0.5em]
                         outline-none transition-all focus:border-teal-400 focus:bg-white"
                  [class.border-red-300]="codeForm.controls.code.touched && codeForm.controls.code.invalid"
                  [class.bg-red-50]="codeForm.controls.code.touched && codeForm.controls.code.invalid"
                />

                <!-- Countdown -->
                @if (countdownSeconds() > 0) {
                  <p class="text-xs text-stone-500 text-center">
                    Le code expire dans
                    <span class="font-semibold text-teal-600">{{ formatCountdown() }}</span>
                  </p>
                } @else {
                  <p class="text-xs text-red-500 text-center">Le code a expiré.</p>
                }

                <!-- Resend -->
                <div class="text-center">
                  @if (resendCooldown() > 0) {
                    <span class="text-xs text-stone-400">Renvoyer le code (disponible dans {{ resendCooldown() }}s)</span>
                  } @else {
                    <button type="button" (click)="onSendCode()"
                            [disabled]="codeLoading()"
                            class="text-xs text-teal-600 hover:text-teal-700 font-medium underline transition-colors
                                   disabled:opacity-50">
                      Renvoyer le code
                    </button>
                  }
                </div>
              </div>

              <div class="flex gap-3">
                <button type="button" (click)="closed.emit()"
                        class="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold
                               text-stone-700 hover:bg-stone-50 transition-colors">
                  Annuler
                </button>
                <button type="button"
                        (click)="onVerifyCode()"
                        [disabled]="verifyLoading() || codeForm.invalid"
                        class="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white
                               text-sm font-semibold transition-colors disabled:opacity-50
                               flex items-center justify-center gap-2">
                  @if (verifyLoading()) {
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Vérification…
                  } @else {
                    Vérifier
                  }
                </button>
              </div>
            }
          </div>
        }

        <!-- ─────────────────── STEP 2 ─────────────────── -->
        @if (currentStep() === 2) {
          <div class="space-y-4">

            <!-- Identity verified badge -->
            <div class="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 flex items-center gap-2">
              <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
              <span class="text-xs font-semibold text-emerald-700">Identité vérifiée</span>
            </div>

            <!-- Server error banner -->
            @if (serverError()) {
              <div class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
                <svg class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p class="text-xs text-red-700 font-medium">{{ serverError() }}</p>
              </div>
            }

            <form [formGroup]="passwordForm" (ngSubmit)="onSubmitPassword()" novalidate class="space-y-4">

              <!-- Current Password -->
              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-stone-700">Mot de passe actuel</label>
                <div class="relative">
                  <input
                    [type]="showCurrent() ? 'text' : 'password'"
                    formControlName="currentPassword"
                    placeholder="••••••••"
                    autocomplete="current-password"
                    class="w-full pl-4 pr-11 py-2.5 rounded-xl border text-sm text-stone-900
                           placeholder-stone-300 outline-none transition-all"
                    [class.border-stone-200]="!pwdErr('currentPassword')"
                    [class.bg-stone-50]="!pwdErr('currentPassword')"
                    [class.border-red-300]="pwdErr('currentPassword')"
                    [class.bg-red-50]="pwdErr('currentPassword')"
                  />
                  <button type="button" (click)="showCurrent.set(!showCurrent())"
                          class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                      @if (showCurrent()) { <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/> }
                      @else { <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/> <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/> }
                    </svg>
                  </button>
                </div>
                @if (pwdErr('currentPassword')) {
                  <p class="text-xs text-red-500">Le mot de passe actuel est requis.</p>
                }
              </div>

              <!-- New Password -->
              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-stone-700">Nouveau mot de passe</label>
                <div class="relative">
                  <input
                    [type]="showNew() ? 'text' : 'password'"
                    formControlName="newPassword"
                    placeholder="••••••••"
                    autocomplete="new-password"
                    class="w-full pl-4 pr-11 py-2.5 rounded-xl border text-sm text-stone-900
                           placeholder-stone-300 outline-none transition-all"
                    [class.border-stone-200]="!pwdErr('newPassword')"
                    [class.bg-stone-50]="!pwdErr('newPassword')"
                    [class.border-red-300]="pwdErr('newPassword')"
                    [class.bg-red-50]="pwdErr('newPassword')"
                  />
                  <button type="button" (click)="showNew.set(!showNew())"
                          class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                      @if (showNew()) { <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/> }
                      @else { <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/> <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/> }
                    </svg>
                  </button>
                </div>

                <!-- Strength bar -->
                @if (passwordForm.get('newPassword')?.value) {
                  <div class="space-y-1.5 mt-2">
                    <div class="flex gap-1">
                      @for (i of [0, 1, 2, 3]; track i) {
                        <div class="flex-1 h-1.5 rounded-full transition-colors"
                             [class.bg-red-400]="strength() === 1 && i === 0"
                             [class.bg-amber-400]="strength() === 2 && i <= 1"
                             [class.bg-teal-400]="strength() === 3 && i <= 2"
                             [class.bg-emerald-500]="strength() === 4"
                             [class.bg-stone-200]="i >= strength()"></div>
                      }
                    </div>
                    <p class="text-xs"
                       [class.text-red-500]="strength() === 1"
                       [class.text-amber-600]="strength() === 2"
                       [class.text-teal-600]="strength() === 3"
                       [class.text-emerald-600]="strength() === 4">
                      {{ strengthLabel() }}
                    </p>
                  </div>
                }

                <!-- Requirements checklist -->
                <ul class="space-y-0.5 mt-1">
                  <li class="flex items-center gap-1.5 text-xs"
                      [class.text-emerald-600]="hasMinLength()" [class.text-stone-400]="!hasMinLength()">
                    <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    Au moins 8 caractères
                  </li>
                  <li class="flex items-center gap-1.5 text-xs"
                      [class.text-emerald-600]="hasUppercase()" [class.text-stone-400]="!hasUppercase()">
                    <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    Au moins une majuscule
                  </li>
                  <li class="flex items-center gap-1.5 text-xs"
                      [class.text-emerald-600]="hasLowercase()" [class.text-stone-400]="!hasLowercase()">
                    <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    Au moins une minuscule
                  </li>
                  <li class="flex items-center gap-1.5 text-xs"
                      [class.text-emerald-600]="hasDigit()" [class.text-stone-400]="!hasDigit()">
                    <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    Au moins un chiffre
                  </li>
                </ul>
              </div>

              <!-- Confirm Password -->
              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-stone-700">Confirmer le nouveau mot de passe</label>
                <div class="relative">
                  <input
                    [type]="showConfirm() ? 'text' : 'password'"
                    formControlName="confirmPassword"
                    placeholder="••••••••"
                    autocomplete="new-password"
                    class="w-full pl-4 pr-11 py-2.5 rounded-xl border text-sm text-stone-900
                           placeholder-stone-300 outline-none transition-all"
                    [class.border-stone-200]="!passwordMismatch()"
                    [class.bg-stone-50]="!passwordMismatch()"
                    [class.border-red-300]="passwordMismatch()"
                    [class.bg-red-50]="passwordMismatch()"
                  />
                  <button type="button" (click)="showConfirm.set(!showConfirm())"
                          class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                      @if (showConfirm()) { <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/> }
                      @else { <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/> <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/> }
                    </svg>
                  </button>
                </div>
                @if (passwordMismatch()) {
                  <p class="text-xs text-red-500">Les mots de passe ne correspondent pas.</p>
                }
                @if (!passwordMismatch() && passwordForm.get('confirmPassword')?.value &&
                     passwordForm.get('confirmPassword')?.value === passwordForm.get('newPassword')?.value) {
                  <p class="text-xs text-emerald-600 flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    Les mots de passe correspondent
                  </p>
                }
              </div>

              <!-- Actions -->
              <div class="flex gap-3 pt-1">
                <button type="button" (click)="closed.emit()"
                        class="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold
                               text-stone-700 hover:bg-stone-50 transition-colors">
                  Annuler
                </button>
                <button type="submit"
                        [disabled]="submitLoading() || passwordForm.invalid || passwordMismatch()"
                        class="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white
                               text-sm font-semibold transition-colors disabled:opacity-50
                               flex items-center justify-center gap-2">
                  @if (submitLoading()) {
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Enregistrement…
                  } @else {
                    Enregistrer
                  }
                </button>
              </div>

            </form>
          </div>
        }

      </div>
    </div>
  `,
})
export class ChangePasswordModalComponent implements OnDestroy {
  // Note: OnInit not needed — initialization is done in constructor (newPwdSub).
  @Output() closed  = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  private fb    = inject(FormBuilder);
  private auth  = inject(AuthService);
  private toast = inject(ToastService);

  // ── Wizard state ────────────────────────────────────────────────────────────

  currentStep    = signal<1 | 2>(1);
  verificationToken = signal<string | null>(null);
  maskedEmail    = signal<string>('');

  // Step 1
  codeSent       = signal(false);
  codeLoading    = signal(false);
  verifyLoading  = signal(false);
  countdownSeconds = signal(0);
  resendCooldown = signal(0);

  // Step 2
  submitLoading  = signal(false);
  serverError    = signal<string | null>(null);
  showCurrent    = signal(false);
  showNew        = signal(false);
  showConfirm    = signal(false);

  // ── Step 1 form (code only) ──────────────────────────────────────────────────

  codeForm = this.fb.group({
    code: ['', [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(6),
      Validators.pattern('^[0-9]{6}$')
    ]]
  });

  // ── Step 2 form (passwords only) ────────────────────────────────────────────
  // Uses SEPARATE FormGroup — button disabled state only reads passwordForm.invalid.
  // This is the fix for the "submit button always disabled" bug.

  passwordForm = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword:     ['', [Validators.required, Validators.minLength(8),
                             this.passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  );

  // ── Reactive computed signals for new password ───────────────────────────────

  hasMinLength  = computed(() => this.newPwdValue().length >= 8);
  hasUppercase  = computed(() => /[A-Z]/.test(this.newPwdValue()));
  hasLowercase  = computed(() => /[a-z]/.test(this.newPwdValue()));
  hasDigit      = computed(() => /\d/.test(this.newPwdValue()));

  strength = computed<number>(() => {
    return [this.hasMinLength(), this.hasUppercase(), this.hasLowercase(), this.hasDigit()]
      .filter(Boolean).length;
  });

  strengthLabel = computed<string>(() => {
    switch (this.strength()) {
      case 0: case 1: return 'Très faible';
      case 2: return 'Faible';
      case 3: return 'Moyen';
      case 4: return 'Fort';
      default: return '';
    }
  });

  passwordMismatch = computed<boolean>(() => {
    const confirm = this.passwordForm.get('confirmPassword');
    if (!confirm?.touched || !confirm.value) return false;
    return confirm.value !== this.newPwdValue();
  });

  // ── Reactive new-password signal (kept in sync via valueChanges subscription) ──

  private newPwdValue = signal('');
  private newPwdSub?: Subscription;

  constructor() {
    this.newPwdSub = this.passwordForm.get('newPassword')!.valueChanges
      .subscribe(v => this.newPwdValue.set(v ?? ''));
  }

  // ── Timers ────────────────────────────────────────────────────────────────────

  private countdownSub?: Subscription;
  private resendSub?: Subscription;

  ngOnDestroy(): void {
    this.newPwdSub?.unsubscribe();
    this.countdownSub?.unsubscribe();
    this.resendSub?.unsubscribe();
  }

  // ── Step 1 actions ───────────────────────────────────────────────────────────

  onSendCode(): void {
    this.serverError.set(null);
    this.codeLoading.set(true);

    this.auth.sendPasswordChangeCode().subscribe({
      next: (res) => {
        this.codeLoading.set(false);
        this.codeSent.set(true);
        this.maskedEmail.set(res.maskedEmail);
        this.codeForm.reset();
        this.startCountdown(10 * 60);  // 10-minute expiry
        this.startResendCooldown(60);  // 60s before allow resend
      },
      error: (err: any) => {
        this.codeLoading.set(false);
        const msg = err?.error?.message ?? 'Impossible d\'envoyer le code. Veuillez réessayer.';
        this.serverError.set(msg);
      },
    });
  }

  onVerifyCode(): void {
    if (this.codeForm.invalid || this.verifyLoading()) return;
    this.serverError.set(null);
    this.verifyLoading.set(true);

    const code = this.codeForm.value.code!;
    this.auth.verifyPasswordChangeCode(code).subscribe({
      next: (res) => {
        this.verifyLoading.set(false);
        this.verificationToken.set(res.verificationToken);
        this.countdownSub?.unsubscribe();
        this.resendSub?.unsubscribe();
        this.currentStep.set(2);
      },
      error: (err: any) => {
        this.verifyLoading.set(false);
        const msg = err?.error?.message ?? 'Code invalide ou expiré.';
        this.serverError.set(msg);
      },
    });
  }

  // ── Step 2 actions ───────────────────────────────────────────────────────────

  onSubmitPassword(): void {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid || this.passwordMismatch() || this.submitLoading()) return;

    this.serverError.set(null);
    this.submitLoading.set(true);

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    this.auth.changePassword({
      verificationToken: this.verificationToken()!,
      currentPassword:   currentPassword!,
      newPassword:       newPassword!,
      confirmPassword:   confirmPassword!,
    }).subscribe({
      next: () => {
        this.submitLoading.set(false);
        this.toast.success('Mot de passe modifié avec succès', 'Sécurité');
        this.success.emit();
        this.closed.emit();
      },
      error: (err: any) => {
        this.submitLoading.set(false);
        const apiErr  = err?.error?.error ?? '';
        const message = err?.error?.message ?? 'Erreur lors de la modification du mot de passe.';

        if (apiErr === 'INVALID_CURRENT_PASSWORD' || message.includes('mot de passe actuel')) {
          this.serverError.set(message);
        } else if (apiErr === 'INVALID_TOKEN' || message.includes('Token')) {
          // Token expired — send user back to step 1
          this.serverError.set('Le token de vérification a expiré. Veuillez recommencer depuis l\'étape 1.');
          setTimeout(() => {
            this.currentStep.set(1);
            this.codeSent.set(false);
            this.verificationToken.set(null);
            this.serverError.set(null);
          }, 2500);
        } else {
          this.toast.error(message, 'Erreur');
        }
      },
    });
  }

  // ── Backdrop ──────────────────────────────────────────────────────────────────

  onBackdropClick(): void {
    if (!this.codeLoading() && !this.verifyLoading() && !this.submitLoading()) {
      this.closed.emit();
    }
  }

  // ── Field error helpers ───────────────────────────────────────────────────────

  pwdErr(name: string): boolean {
    const ctrl = this.passwordForm.get(name);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private startCountdown(seconds: number): void {
    this.countdownSub?.unsubscribe();
    this.countdownSeconds.set(seconds);
    this.countdownSub = interval(1000).subscribe(() => {
      const current = this.countdownSeconds();
      if (current <= 0) {
        this.countdownSub?.unsubscribe();
      } else {
        this.countdownSeconds.set(current - 1);
      }
    });
  }

  private startResendCooldown(seconds: number): void {
    this.resendSub?.unsubscribe();
    this.resendCooldown.set(seconds);
    this.resendSub = interval(1000).subscribe(() => {
      const current = this.resendCooldown();
      if (current <= 0) {
        this.resendSub?.unsubscribe();
      } else {
        this.resendCooldown.set(current - 1);
      }
    });
  }

  formatCountdown(): string {
    const s = this.countdownSeconds();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  // ── Validators ────────────────────────────────────────────────────────────────

  private passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasDigit = /[0-9]/.test(value);
    if (!hasUpper || !hasLower || !hasDigit) {
      return { weakPassword: true };
    }
    return null;
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPass = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (newPass && confirm && newPass !== confirm) {
      return { passwordMismatch: true };
    }
    return null;
  }
}
