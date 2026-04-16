import {
  Component, EventEmitter, Input, OnDestroy, Output,
  inject, signal
} from '@angular/core';
import { CommonModule }        from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService }         from '../../../core/services/auth.service';
import { AuthFacade }          from '../../../core/services/auth.facade';
import { ToastService }        from '../toast/toast.service';
import { ForgotPasswordComponent } from '../forgot-password/forgot-password.component';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ForgotPasswordComponent],
  template: `
    <!-- Forgot-password flow (replaces login form) -->
    @if (showForgotFlow()) {
      <app-forgot-password
        (back)="showForgotFlow.set(false)"
        (done)="onForgotDone()"
      />
    } @else if (step() === '2fa') {

    <!-- ── STEP 2: Email OTP ───────────────────────────────────────────── -->
    <div class="w-full">
      <div class="mb-6">
        <button type="button" (click)="backToLogin()"
                class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors cursor-pointer">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Retour
        </button>
        <h2 class="text-2xl font-bold text-gray-900 tracking-tight">Vérification en deux étapes</h2>
        <p class="text-sm text-gray-500 mt-1">
          Un code à 6 chiffres a été envoyé à <strong>{{ pendingEmail() }}</strong>.
          Entrez-le ci-dessous pour terminer la connexion.
        </p>
      </div>

      <form [formGroup]="otpForm" (ngSubmit)="onOtpSubmit()" novalidate class="space-y-4">

        <!-- OTP input -->
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-700">Code de vérification</label>
          <input
            type="text"
            formControlName="otpCode"
            placeholder="123456"
            maxlength="6"
            inputmode="numeric"
            autocomplete="one-time-code"
            class="w-full px-4 py-2.5 rounded-xl border text-sm text-gray-900 text-center
                   tracking-widest font-mono placeholder-gray-400 outline-none transition-all"
            [class.border-gray-200]="!otpErr()"
            [class.bg-gray-50]="!otpErr()"
            [class.border-red-300]="otpErr()"
            [class.bg-red-50]="otpErr()"
          />
          @if (otpErr()) {
            <p class="text-xs text-red-500">Le code est requis (6 chiffres).</p>
          }
          @if (otpServerError()) {
            <p class="text-xs text-red-500">{{ otpServerError() }}</p>
          }
        </div>

        <!-- Submit -->
        <button
          type="submit"
          [disabled]="otpLoading()"
          class="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-600 active:bg-teal-700
                 text-white font-semibold text-sm rounded-xl transition-all
                 disabled:opacity-60 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2 shadow-sm cursor-pointer mt-2">
          @if (otpLoading()) {
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Vérification…
          } @else {
            Vérifier le code
          }
        </button>

        <p class="text-center text-xs text-gray-400 pt-1">
          Vous n'avez pas reçu le code ?
          <button type="button" (click)="resendOtp()" [disabled]="otpLoading()"
                  class="text-teal-600 hover:text-teal-700 font-medium cursor-pointer disabled:opacity-50">
            Renvoyer
          </button>
        </p>

      </form>
    </div>

    } @else {

    <!-- ── STEP 1: Email + Password ──────────────────────────────────────── -->
    <div class="w-full">
      <!-- Title -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
        <p class="text-sm text-gray-500 mt-1">Sign in to your MediConnect account</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="space-y-4">

        <!-- Email -->
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-700">Email address</label>
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
              placeholder="you@example.com"
              autocomplete="email"
              class="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm text-gray-900
                     placeholder-gray-400 outline-none transition-all"
              [class.border-gray-200]="!showError('email')"
              [class.bg-gray-50]="!showError('email')"
              [class.focus:border-teal-400]="!showError('email')"
              [class.focus:bg-white]="!showError('email')"
              [class.focus:ring-2]="!showError('email')"
              [class.focus:ring-teal-100]="!showError('email')"
              [class.border-red-300]="showError('email')"
              [class.bg-red-50]="showError('email')"
            />
          </div>
          @if (showError('email')) {
            <p class="text-xs text-red-500 flex items-center gap-1">
              <svg class="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              @if (form.get('email')?.errors?.['required']) { Email address is required }
              @else if (form.get('email')?.errors?.['email']) { Please enter a valid email address }
            </p>
          }
        </div>

        <!-- Password -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="block text-sm font-medium text-gray-700">Password</label>
            <button type="button" (click)="showForgotFlow.set(true)"
                    class="text-xs text-teal-600 hover:text-teal-700 font-medium cursor-pointer">
              Forgot password?
            </button>
          </div>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <input
              [type]="showPwd() ? 'text' : 'password'"
              formControlName="password"
              placeholder="••••••••"
              autocomplete="current-password"
              class="w-full pl-10 pr-11 py-2.5 rounded-xl border text-sm text-gray-900
                     placeholder-gray-400 outline-none transition-all"
              [class.border-gray-200]="!showError('password')"
              [class.bg-gray-50]="!showError('password')"
              [class.focus:border-teal-400]="!showError('password')"
              [class.focus:bg-white]="!showError('password')"
              [class.focus:ring-2]="!showError('password')"
              [class.focus:ring-teal-100]="!showError('password')"
              [class.border-red-300]="showError('password')"
              [class.bg-red-50]="showError('password')"
            />
            <button
              type="button"
              (click)="showPwd.set(!showPwd())"
              class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400
                     hover:text-gray-600 transition-colors cursor-pointer">
              @if (showPwd()) {
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
                       a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
                       M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29
                       M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7
                       a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              } @else {
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5
                       c4.478 0 8.268 2.943 9.542 7
                       -1.274 4.057-5.064 7-9.542 7
                       -4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              }
            </button>
          </div>
          @if (showError('password')) {
            <p class="text-xs text-red-500 flex items-center gap-1">
              <svg class="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              Password is required
            </p>
          }
        </div>

        <!-- Lockout banner -->
        @if (isLocked()) {
          <div class="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
            <svg class="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <p class="text-xs text-amber-700 font-medium">
              Trop de tentatives. Réessayez dans
              <span class="font-bold tabular-nums">{{ formatCountdown(countdown()) }}</span>
            </p>
          </div>
        }

        <!-- Submit -->
        <button
          type="submit"
          [disabled]="loading() || isLocked()"
          class="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-600 active:bg-teal-700
                 text-white font-semibold text-sm rounded-xl transition-all
                 disabled:opacity-60 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2 shadow-sm
                 shadow-teal-200 hover:shadow-teal-300 cursor-pointer mt-2">
          @if (loading()) {
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Signing in...
          } @else if (isLocked()) {
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            Compte temporairement bloqué
          } @else {
            Sign In
          }
        </button>

        @if (showGoogle) {
          <!-- Divider -->
          <div class="relative my-1">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-100"></div>
            </div>
            <div class="relative flex justify-center text-xs">
              <span class="bg-white px-3 text-gray-400">or continue with</span>
            </div>
          </div>

          <!-- Google -->
          <button
            type="button"
            (click)="onGoogleLogin()"
            class="w-full py-2.5 px-4 bg-white border border-gray-200 hover:border-gray-300
                   hover:bg-gray-50 text-gray-700 font-medium text-sm rounded-xl
                   transition-all flex items-center justify-center gap-2.5 cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.7 29.3 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.9 0 20-7.9 20-21 0-1.3-.1-2.7-.4-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.3 18.9 12 24 12c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.9 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 45c5.2 0 10-1.9 13.6-5l-6.3-5.2C29.5 36.6 26.9 37 24 37c-5.2 0-9.6-3.3-11.3-8H6.3C9.7 40.1 16.3 45 24 45z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.3 5.2C41.1 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
            Continue with Google
          </button>
        }

        <!-- Switch to signup -->
        <p class="text-center text-sm text-gray-500 pt-1">
          Don't have an account?
          <button
            type="button"
            (click)="goToSignup.emit()"
            class="text-teal-600 hover:text-teal-700 font-semibold ml-1 cursor-pointer">
            Create one
          </button>
        </p>

      </form>
    </div>

    } <!-- end @else -->
  `,
})
export class LoginFormComponent implements OnDestroy {
  @Input() showGoogle = false;
  @Input() showForgotPassword = false;

  @Output() goToSignup = new EventEmitter<void>();
  @Output() success    = new EventEmitter<void>();

  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private facade      = inject(AuthFacade);
  private toast       = inject(ToastService);

  loading         = signal(false);
  showPwd         = signal(false);
  showForgotFlow  = signal(false);
  isLocked        = signal(false);
  countdown       = signal(0);

  /** 'credentials' | '2fa' */
  step          = signal<'credentials' | '2fa'>('credentials');
  pendingEmail  = signal('');
  pendingPwd    = signal('');

  otpLoading      = signal(false);
  otpServerError  = signal<string | null>(null);

  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(5)]],
  });

  otpForm = this.fb.group({
    otpCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  ngOnDestroy(): void {
    this.clearTimer();
  }

  showError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  otpErr(): boolean {
    const ctrl = this.otpForm.get('otpCode');
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isLocked()) return;

    this.loading.set(true);
    const { email, password } = this.form.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: (res) => {
        this.loading.set(false);

        if (res.requires2FA) {
          // Password validated — 2FA code was sent — show OTP step
          this.pendingEmail.set(email!);
          this.pendingPwd.set(password!);
          this.otpForm.reset();
          this.otpServerError.set(null);
          this.step.set('2fa');
          this.toast.success('Code envoyé. Vérifiez votre boîte mail.', 'Vérification 2FA');
          return;
        }

        // Direct login success (no 2FA)
        this.facade.finalizeLogin(res);
        this.toast.success('Bienvenue sur MediConnect !', 'Connexion réussie');
        this.success.emit();
      },
      error: (err: any) => {
        this.loading.set(false);

        if (err?.status === 429 || (err?.message && String(err.message).includes('429'))) {
          const remaining: number = err?.error?.remainingSeconds ?? 90;
          this.startLockout(remaining);
          return;
        }

        const msg: string = err?.error?.message ?? err?.message ?? '';
        if (msg.toLowerCase().includes('trop de tentatives') || msg.includes('remainingSeconds')) {
          const remaining: number = err?.error?.remainingSeconds ?? 90;
          this.startLockout(remaining);
          return;
        }

        this.toast.error(msg || 'Email ou mot de passe incorrect.', 'Connexion échouée');
      },
    });
  }

  onOtpSubmit(): void {
    this.otpForm.markAllAsTouched();
    if (this.otpForm.invalid || this.otpLoading()) return;

    this.otpServerError.set(null);
    this.otpLoading.set(true);

    const { otpCode } = this.otpForm.value;

    this.authService.login({
      email:    this.pendingEmail(),
      password: this.pendingPwd(),
      otpCode:  otpCode!,
    }).subscribe({
      next: (res) => {
        this.otpLoading.set(false);
        this.pendingPwd.set(''); // clear password from memory
        this.facade.finalizeLogin(res);
        this.toast.success('Bienvenue sur MediConnect !', 'Connexion réussie');
        this.success.emit();
      },
      error: (err: any) => {
        this.otpLoading.set(false);
        const msg: string = err?.error?.message ?? err?.message ?? 'Code invalide ou expiré.';
        this.otpServerError.set(msg);
      },
    });
  }

  resendOtp(): void {
    // Re-submit step 1 to regenerate and resend the code
    this.otpLoading.set(true);
    this.otpServerError.set(null);

    this.authService.login({
      email:    this.pendingEmail(),
      password: this.pendingPwd(),
    }).subscribe({
      next: (res) => {
        this.otpLoading.set(false);
        if (res.requires2FA) {
          this.otpForm.reset();
          this.toast.success('Un nouveau code a été envoyé.', '2FA');
        } else {
          // Shouldn't happen, but handle gracefully
          this.facade.finalizeLogin(res);
          this.success.emit();
        }
      },
      error: (err: any) => {
        this.otpLoading.set(false);
        const msg: string = err?.error?.message ?? 'Erreur lors du renvoi du code.';
        this.toast.error(msg, '2FA');
      },
    });
  }

  backToLogin(): void {
    this.step.set('credentials');
    this.pendingPwd.set('');
    this.otpForm.reset();
    this.otpServerError.set(null);
  }

  onGoogleLogin(): void {
    this.facade.loginWithGoogle();
  }

  onForgotDone(): void {
    this.showForgotFlow.set(false);
    this.toast.success('Vous pouvez maintenant vous connecter.', 'Mot de passe réinitialisé');
  }

  formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private startLockout(seconds: number): void {
    this.clearTimer();
    this.countdown.set(Math.ceil(seconds));
    this.isLocked.set(true);

    this.countdownTimer = setInterval(() => {
      const remaining = this.countdown() - 1;
      if (remaining <= 0) {
        this.countdown.set(0);
        this.isLocked.set(false);
        this.clearTimer();
        this.toast.success('Vous pouvez réessayer.', 'Déblocage');
      } else {
        this.countdown.set(remaining);
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }
}
