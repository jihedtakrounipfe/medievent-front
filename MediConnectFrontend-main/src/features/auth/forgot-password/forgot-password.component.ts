import {
  Component, EventEmitter, Output,
  inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { ToastService } from '../toast/toast.service';

/**
 * Two-step forgot-password flow embedded as a standalone component.
 * Step 1 — Enter email to receive a 6-digit code.
 * Step 2 — Enter code + new password to complete the reset.
 *
 * Emits (back) when user wants to return to the login form.
 * Emits (done) after a successful password reset.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="w-full">

      <!-- Header -->
      <div class="mb-6">
        <button type="button" (click)="back.emit()"
                class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 mb-4 transition-colors cursor-pointer">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Retour à la connexion
        </button>

        @if (step() === 1) {
          <h2 class="text-2xl font-bold text-gray-900 tracking-tight">Mot de passe oublié</h2>
          <p class="text-sm text-gray-500 mt-1">
            Saisissez votre adresse e-mail et nous vous enverrons un code de vérification.
          </p>
        } @else {
          <h2 class="text-2xl font-bold text-gray-900 tracking-tight">Vérification du code</h2>
          <p class="text-sm text-gray-500 mt-1">
            Entrez le code à 6 chiffres envoyé à <strong>{{ emailForm.value.email }}</strong>
            ainsi que votre nouveau mot de passe.
          </p>
        }
      </div>

      <!-- ── STEP 1: Email ────────────────────────────────── -->
      @if (step() === 1) {
        <form [formGroup]="emailForm" (ngSubmit)="submitEmail()" novalidate class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-700">Adresse e-mail</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <input
                type="email"
                formControlName="email"
                placeholder="vous@exemple.com"
                autocomplete="email"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm text-gray-900
                       placeholder-gray-400 outline-none transition-all"
                [class.border-gray-200]="!emailErr('email')"
                [class.bg-gray-50]="!emailErr('email')"
                [class.border-red-300]="emailErr('email')"
                [class.bg-red-50]="emailErr('email')"
              />
            </div>
            @if (emailErr('email')) {
              <p class="text-xs text-red-500">Adresse e-mail invalide.</p>
            }
          </div>

          <button
            type="submit"
            [disabled]="loadingStep1()"
            class="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm
                   rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2 shadow-sm cursor-pointer mt-2">
            @if (loadingStep1()) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Envoi en cours…
            } @else {
              Envoyer le code
            }
          </button>
        </form>
      }

      <!-- ── STEP 2: Code + New Password ─────────────────── -->
      @if (step() === 2) {
        <form [formGroup]="resetForm" (ngSubmit)="submitReset()" novalidate class="space-y-4">

          <!-- Code -->
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-700">Code de vérification</label>
            <input
              type="text"
              formControlName="code"
              placeholder="123456"
              maxlength="6"
              class="w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 text-center
                     tracking-widest font-mono placeholder-gray-400 outline-none transition-all"
              [class.border-gray-200]="!resetErr('code')"
              [class.bg-gray-50]="!resetErr('code')"
              [class.border-red-300]="resetErr('code')"
              [class.bg-red-50]="resetErr('code')"
            />
            @if (resetErr('code')) {
              <p class="text-xs text-red-500">Le code est requis (6 chiffres).</p>
            }
          </div>

          <!-- New Password -->
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-700">Nouveau mot de passe</label>
            <div class="relative">
              <input
                [type]="showPwd() ? 'text' : 'password'"
                formControlName="newPassword"
                placeholder="••••••••"
                class="w-full pl-4 pr-11 py-2.5 rounded-xl border text-sm text-gray-900
                       placeholder-gray-400 outline-none transition-all"
                [class.border-gray-200]="!resetErr('newPassword')"
                [class.bg-gray-50]="!resetErr('newPassword')"
                [class.border-red-300]="resetErr('newPassword')"
                [class.bg-red-50]="resetErr('newPassword')"
              />
              <button type="button" (click)="showPwd.set(!showPwd())"
                      class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer">
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
            @if (resetErr('newPassword')) {
              <p class="text-xs text-red-500">Minimum 8 caractères.</p>
            }
          </div>

          <!-- Confirm Password -->
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
            <input
              [type]="showPwd() ? 'text' : 'password'"
              formControlName="confirmPassword"
              placeholder="••••••••"
              class="w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900
                     placeholder-gray-400 outline-none transition-all"
              [class.border-gray-200]="!resetErr('confirmPassword') && !passwordMismatch()"
              [class.bg-gray-50]="!resetErr('confirmPassword') && !passwordMismatch()"
              [class.border-red-300]="resetErr('confirmPassword') || passwordMismatch()"
              [class.bg-red-50]="resetErr('confirmPassword') || passwordMismatch()"
            />
            @if (passwordMismatch()) {
              <p class="text-xs text-red-500">Les mots de passe ne correspondent pas.</p>
            }
          </div>

          <button
            type="submit"
            [disabled]="loadingStep2()"
            class="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm
                   rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2 shadow-sm cursor-pointer mt-2">
            @if (loadingStep2()) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Réinitialisation…
            } @else {
              Réinitialiser le mot de passe
            }
          </button>

          <p class="text-center text-xs text-gray-400 pt-1">
            Vous n'avez pas reçu le code ?
            <button type="button" (click)="resend()" class="text-teal-600 hover:text-teal-700 font-medium cursor-pointer">
              Renvoyer
            </button>
          </p>
        </form>
      }

    </div>
  `,
})
export class ForgotPasswordComponent {
  @Output() back = new EventEmitter<void>();
  @Output() done = new EventEmitter<void>();

  private fb      = inject(FormBuilder);
  private auth    = inject(AuthService);
  private facade  = inject(AuthFacade);
  private toast   = inject(ToastService);

  step          = signal<1 | 2>(1);
  loadingStep1  = signal(false);
  loadingStep2  = signal(false);
  showPwd       = signal(false);

  emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  resetForm = this.fb.group({
    code:            ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    newPassword:     ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  emailErr(field: string): boolean {
    const c = this.emailForm.get(field);
    return !!(c?.invalid && c?.touched);
  }

  resetErr(field: string): boolean {
    const c = this.resetForm.get(field);
    return !!(c?.invalid && c?.touched);
  }

  passwordMismatch(): boolean {
    const { newPassword, confirmPassword } = this.resetForm.value;
    return !!(this.resetForm.get('confirmPassword')?.touched && newPassword !== confirmPassword);
  }

  submitEmail(): void {
    this.emailForm.markAllAsTouched();
    if (this.emailForm.invalid) return;

    this.loadingStep1.set(true);
    this.auth.forgotPassword({ email: this.emailForm.value.email! }).subscribe({
      next: () => {
        this.loadingStep1.set(false);
        this.toast.success(
          'Si l\'adresse existe, un code a été envoyé.',
          'Code envoyé'
        );
        this.step.set(2);
      },
      error: () => {
        this.loadingStep1.set(false);
        // Still advance to step 2 to avoid user enumeration
        this.step.set(2);
      },
    });
  }

  submitReset(): void {
    this.resetForm.markAllAsTouched();
    if (this.resetForm.invalid) return;
    if (this.passwordMismatch()) return;

    this.loadingStep2.set(true);
    this.auth.resetPassword({
      email:           this.emailForm.value.email!,
      code:            this.resetForm.value.code!,
      newPassword:     this.resetForm.value.newPassword!,
      confirmPassword: this.resetForm.value.confirmPassword!,
    }).subscribe({
      next: (res) => {
        this.loadingStep2.set(false);
        this.toast.success(res.message ?? 'Mot de passe réinitialisé.', 'Succès');
        if (res.accessToken && res.user) {
          this.facade.finalizeLogin(res, { section: 'security' });
        }
        this.done.emit();
      },
      error: (err) => {
        this.loadingStep2.set(false);
        const msg = err?.error?.message ?? 'Code invalide ou expiré.';
        this.toast.error(msg, 'Erreur');
      },
    });
  }

  resend(): void {
    this.step.set(1);
    this.resetForm.reset();
  }
}
