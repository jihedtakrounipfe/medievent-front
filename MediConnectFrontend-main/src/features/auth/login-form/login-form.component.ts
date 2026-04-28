import {
  AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output,
  ViewChild, inject, signal
} from '@angular/core';
import { CommonModule }        from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router }              from '@angular/router';
import { AuthService }         from '../../../core/services/auth.service';
import { AuthFacade }          from '../../../core/services/auth.facade';
import { ToastService }        from '../toast/toast.service';
import { ForgotPasswordComponent }   from '../forgot-password/forgot-password.component';
import { MfaVerificationComponent }  from '../mfa-verification/mfa-verification.component';
import type { MfaSubmitEvent }       from '../mfa-verification/mfa-verification.component';
import { RecaptchaComponent } from '../../../app/components/shared/recaptcha/recaptcha.component';
import type { AuthResponse, GoogleLoginResponse, MfaMethodType, MfaState } from '../../../core/user';
import { environment }         from '../../../environments/environment';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ForgotPasswordComponent, MfaVerificationComponent, RecaptchaComponent],
  template: `
    <!-- ── GOOGLE: Account Linking Modal ──────────────────────────────────── -->
    @if (showLinkingModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
          <h3 class="text-lg font-bold text-gray-900 mb-1">Lier votre compte Google</h3>
          <p class="text-sm text-gray-500 mb-4">
            Un compte MediConnect existe déjà avec <strong>{{ linkingEmail() }}</strong>.<br>
            Confirmez votre mot de passe pour lier votre compte Google.
          </p>
          <div class="space-y-3">
            <input
              type="password"
              [value]="linkingPwdForm.get('password')?.value"
              (input)="onLinkingPwdInput($event)"
              placeholder="Mot de passe actuel"
              class="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-teal-400"/>
            @if (linkingError()) {
              <p class="text-xs text-red-500">{{ linkingError() }}</p>
            }
            <p class="text-xs text-amber-600 bg-amber-50 rounded-lg p-3 border border-amber-200">
              Après cette opération, votre ancien mot de passe sera remplacé. Utilisez "Mot de passe oublié" si besoin.
            </p>
          </div>
          <div class="flex gap-3 mt-5 justify-end">
            <button type="button" (click)="cancelLinking()"
                    class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Annuler</button>
            <button type="button" (click)="confirmLinking()" [disabled]="googleLoading()"
                    class="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm rounded-xl font-medium cursor-pointer disabled:opacity-60">
              @if (googleLoading()) { Liaison… } @else { Lier et se connecter }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Forgot-password flow (replaces login form) -->
    @if (showForgotFlow()) {
      <app-forgot-password
        (back)="showForgotFlow.set(false)"
        (done)="onForgotDone()"
      />

    <!-- ── MFA exhaustion screen ─────────────────────────────────────────── -->
    } @else if (step() === 'exhausted') {
      <div class="w-full text-center space-y-5 py-4">
        <div class="flex items-center justify-center mb-1">
          <svg class="w-12 h-12 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900">Toutes les tentatives épuisées</h2>
        <p class="text-sm text-gray-500 leading-relaxed">
          Trop de tentatives de vérification ont échoué.<br>
          Pour des raisons de sécurité, vos méthodes MFA ont été réinitialisées.
        </p>
        <div class="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 text-left">
          <strong>Que faire ?</strong><br>
          Reconnectez-vous avec vos identifiants habituels. Si vous ne pouvez pas accéder à votre compte, utilisez
          <strong>« Mot de passe oublié »</strong>.
        </div>
        <button type="button" (click)="backToLogin()"
                class="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm rounded-xl cursor-pointer">
          Retour à la connexion
        </button>
      </div>

    <!-- ── Unified MFA step (standard + Google) ──────────────────────────── -->
    } @else if (step() === 'mfa') {
      <app-mfa-verification
        [sessionToken]="mfaState()!.mfaSessionToken"
        [enabledMethods]="mfaState()!.enabledMethods"
        [primaryMethod]="mfaState()!.primaryMethod"
        [attemptsRemaining]="mfaState()!.attemptsRemaining"
        [loading]="mfaLoading()"
        [errorMessage]="mfaError()"
        [failedMethod]="mfaFailedMethod()"
        [email]="pendingEmail()"
        (submit)="onMfaSubmit($event)"
        (back)="backToLogin()"
      />

    } @else {

    <!-- ── STEP 1: Email + Password ──────────────────────────────────────── -->
    <div class="w-full">
      <!-- Title -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 tracking-tight">Bienvenue</h2>
        <p class="text-sm text-gray-500 mt-1">Connectez-vous à votre compte MediConnect</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="space-y-4">

        <!-- Email -->
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
              @if (form.get('email')?.errors?.['required']) { L'adresse e-mail est obligatoire }
              @else if (form.get('email')?.errors?.['email']) { Veuillez saisir une adresse e-mail valide }
            </p>
          }
        </div>

        <!-- Password -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="block text-sm font-medium text-gray-700">Mot de passe</label>
            <button type="button" (click)="showForgotFlow.set(true)"
                    class="text-xs text-teal-600 hover:text-teal-700 font-medium cursor-pointer">
              Mot de passe oublié ?
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
              Le mot de passe est obligatoire
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

        <div class="space-y-2">
          <app-recaptcha
            [siteKey]="recaptchaSiteKey"
            (resolved)="onCaptchaResolved($event)"
          />
          @if (captchaError()) {
            <p class="text-xs text-red-500">Please complete the captcha.</p>
          }
        </div>

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
            Connexion...
          } @else if (isLocked()) {
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            Compte temporairement bloqué
          } @else {
            Se connecter
          }
        </button>

        @if (showGoogle) {
          <!-- Divider -->
          <div class="relative my-1">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-100"></div>
            </div>
            <div class="relative flex justify-center text-xs">
              <span class="bg-white px-3 text-gray-400">ou continuer avec</span>
            </div>
          </div>

          <!-- Google Sign-In button rendered by GSI library -->
          <div #googleBtnRef class="w-full flex justify-center min-h-[44px]"></div>
        }

        <!-- Switch to signup -->
        <p class="text-center text-sm text-gray-500 pt-1">
          Pas encore de compte ?
          <button
            type="button"
            (click)="goToSignup.emit()"
            class="text-teal-600 hover:text-teal-700 font-semibold ml-1 cursor-pointer">
            Créez-en un compte gratuitement
          </button>
        </p>

      </form>
    </div>

    } <!-- end @else -->
  `,
})
export class LoginFormComponent implements AfterViewInit, OnDestroy {
  @Input() showGoogle = false;
  @Input() showForgotPassword = false;

  @Output() goToSignup = new EventEmitter<void>();
  @Output() success    = new EventEmitter<void>();

  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private facade      = inject(AuthFacade);
  private toast       = inject(ToastService);
  private router      = inject(Router);

  @ViewChild(RecaptchaComponent) recaptchaRef?: RecaptchaComponent;
  @ViewChild('googleBtnRef') googleBtnRef?: ElementRef<HTMLElement>;

  loading         = signal(false);
  showPwd         = signal(false);
  showForgotFlow  = signal(false);
  isLocked        = signal(false);
  countdown       = signal(0);
  recaptchaSiteKey = environment.recaptcha.siteKey;
  captchaToken     = signal<string | null>(null);
  captchaError     = signal(false);

  /** 'credentials' | 'mfa' | 'exhausted' */
  step          = signal<'credentials' | 'mfa' | 'exhausted'>('credentials');
  pendingEmail  = signal('');

  // MFA state (set when credential step returns requiresMfa=true)
  mfaState         = signal<MfaState | null>(null);
  mfaLoading       = signal(false);
  mfaError         = signal<string | null>(null);
  mfaFailedMethod  = signal<MfaMethodType | null>(null);

  // Google login state
  googleLoading       = signal(false);
  showLinkingModal    = signal(false);
  linkingEmail        = signal('');
  linkingGoogleId     = signal('');
  linkingError        = signal<string | null>(null);

  linkingPwdForm = this.fb.group({ password: [''] });

  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(5)]],
  });

  ngAfterViewInit(): void {
    if (this.showGoogle) {
      this.renderGoogleButton();
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  showError(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  onCaptchaResolved(token: string | null): void {
    this.captchaToken.set(token);
    this.captchaError.set(!token);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.isLocked()) return;
    if (!this.captchaToken()) {
      this.captchaError.set(true);
      this.toast.warning('Please complete the captcha.', 'Captcha required');
      return;
    }

    this.loading.set(true);
    const { email, password } = this.form.value;

    this.authService.login({
      email: email!,
      password: password!,
      recaptchaToken: this.captchaToken()!,
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.handleAuthResponse(res, email!);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.captchaToken.set(null);
        this.captchaError.set(false);
        this.recaptchaRef?.reset();
        this.handleLoginError(err);
      },
    });
  }

  // ── New unified MFA handler ───────────────────────────────────────────────

  onMfaSubmit(event: MfaSubmitEvent): void {
    const state = this.mfaState();
    if (!state) return;

    this.mfaLoading.set(true);
    this.mfaError.set(null);
    this.mfaFailedMethod.set(null);

    this.authService.login({
      email:           this.pendingEmail(),
      password:        '__mfa_session__',  // not checked by backend on MFA step
      mfaSessionToken: state.mfaSessionToken,
      mfaMethod:       event.method,
      mfaCode:         event.code,
      faceImage:       event.faceImage,
      recoveryCode:    event.recoveryCode,
    }).subscribe({
      next: (res) => {
        this.mfaLoading.set(false);
        this.handleAuthResponse(res, this.pendingEmail());
      },
      error: (err: any) => {
        this.mfaLoading.set(false);
        const msg: string = err?.error?.message ?? 'Erreur de vérification. Veuillez réessayer.';
        this.mfaError.set(msg);
        this.mfaFailedMethod.set(event.method);
      },
    });
  }

  private handleAuthResponse(res: AuthResponse, email: string): void {
    if (res.allMethodsExhausted) {
      this.step.set('exhausted');
      return;
    }

    if (res.requiresMfa && res.mfaSessionToken) {
      this.pendingEmail.set(email);
      this.mfaState.set({
        mfaSessionToken:   res.mfaSessionToken,
        enabledMethods:    res.enabledMethods ?? [],
        primaryMethod:     res.primaryMethod ?? 'EMAIL',
        attemptsRemaining: (res.attemptsRemaining ?? {}) as Record<MfaMethodType, number>,
        message:           res.message ?? undefined,
      });
      this.mfaError.set(res.failedMethod ? (res.message ?? null) : null);
      this.mfaFailedMethod.set(res.failedMethod ?? null);
      this.step.set('mfa');
      if (res.message && !res.failedMethod) {
        this.toast.info(res.message, 'MFA');
      }
      return;
    }

    // Success
    if (res.accessToken) {
      this.facade.finalizeLogin(res);
      this.toast.success('Bienvenue sur MediConnect !', 'Connexion réussie');
      this.success.emit();
    }
  }

  backToLogin(): void {
    this.step.set('credentials');
    this.pendingEmail.set('');
    this.mfaState.set(null);
    this.mfaError.set(null);
    this.mfaFailedMethod.set(null);
    this.mfaLoading.set(false);
  }

  private handleLoginError(err: any): void {
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
  }

  private renderGoogleButton(): void {
    const clientId = environment.google?.clientId;
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') return;

    const attempt = () => {
      if (typeof (window as any).google === 'undefined') {
        setTimeout(attempt, 150);
        return;
      }
      const el = this.googleBtnRef?.nativeElement;
      if (!el) return;
      // @ts-ignore — google loaded via GSI script in index.html
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => this.handleGoogleCredential(response.credential),
      });
      // @ts-ignore
      google.accounts.id.renderButton(el, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: Math.min(el.offsetWidth || 380, 400),
      });
    };
    attempt();
  }

  private handleGoogleCredential(idToken: string): void {
    this.googleLoading.set(true);

    this.authService.googleLogin({ idToken }).subscribe({
      next: (res: GoogleLoginResponse) => {
        this.googleLoading.set(false);

        if (res.success && res.accessToken) {
          const userType = res.userType;
          this.facade.finalizeGoogleLogin(res).subscribe({
            next:  () => { this.redirectByRole(userType); this.toast.success('Bienvenue sur MediConnect !', 'Connexion réussie'); this.success.emit(); },
            error: () => { this.redirectByRole(userType); this.toast.success('Bienvenue sur MediConnect !', 'Connexion réussie'); this.success.emit(); },
          });
          return;
        }

        if (res.isNewUser) {
          this.router.navigate(['/auth/google-register'], { state: { googleProfile: res.googleProfile } });
          return;
        }

        if (res.requiresLinking) {
          this.linkingEmail.set(res.email ?? '');
          this.linkingGoogleId.set(res.googleProfile?.googleId ?? '');
          this.linkingPwdForm.reset();
          this.linkingError.set(null);
          this.showLinkingModal.set(true);
          return;
        }

        // New unified MFA flow
        if (res.requiresMfa && res.mfaSessionToken) {
          this.pendingEmail.set(res.email ?? '');
          this.mfaState.set({
            mfaSessionToken:   res.mfaSessionToken,
            enabledMethods:    res.enabledMethods ?? [],
            primaryMethod:     res.primaryMethod ?? 'EMAIL',
            attemptsRemaining: (res.attemptsRemaining ?? {}) as Record<MfaMethodType, number>,
            message:           res.message ?? undefined,
          });
          this.mfaError.set(null);
          this.mfaFailedMethod.set(null);
          this.step.set('mfa');
          if (res.message) this.toast.info(res.message, 'Vérification');
          return;
        }
      },
      error: (err: any) => {
        this.googleLoading.set(false);
        const msg = err?.error?.message ?? 'Erreur lors de la connexion avec Google.';
        this.toast.error(msg, 'Connexion Google');
      },
    });
  }

  onLinkingPwdInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.linkingPwdForm.patchValue({ password: value });
  }

  cancelLinking(): void {
    this.showLinkingModal.set(false);
    this.linkingPwdForm.reset();
    this.linkingError.set(null);
  }

  confirmLinking(): void {
    const pwd = this.linkingPwdForm.get('password')?.value ?? '';
    if (!pwd) {
      this.linkingError.set('Veuillez entrer votre mot de passe.');
      return;
    }
    this.googleLoading.set(true);
    this.linkingError.set(null);

    this.authService.googleLink({
      email:           this.linkingEmail(),
      currentPassword: pwd,
      googleId:        this.linkingGoogleId(),
    }).subscribe({
      next: (res: GoogleLoginResponse) => {
        this.googleLoading.set(false);
        this.showLinkingModal.set(false);
        if (res.success && res.accessToken) {
          const userType = res.userType;
          this.facade.finalizeGoogleLogin(res).subscribe({
            next:  () => { this.redirectByRole(userType); this.toast.success('Compte Google lié avec succès !', 'Liaison réussie'); this.success.emit(); },
            error: () => { this.redirectByRole(userType); this.toast.success('Compte Google lié avec succès !', 'Liaison réussie'); this.success.emit(); },
          });
        } else if (res.requiresMfa && res.mfaSessionToken) {
          this.pendingEmail.set(this.linkingEmail());
          this.mfaState.set({
            mfaSessionToken:   res.mfaSessionToken,
            enabledMethods:    res.enabledMethods ?? [],
            primaryMethod:     res.primaryMethod ?? 'EMAIL',
            attemptsRemaining: (res.attemptsRemaining ?? {}) as Record<MfaMethodType, number>,
          });
          this.mfaError.set(null);
          this.mfaFailedMethod.set(null);
          this.step.set('mfa');
        }
      },
      error: (err: any) => {
        this.googleLoading.set(false);
        const msg = err?.error?.message ?? 'Mot de passe incorrect.';
        this.linkingError.set(msg);
      },
    });
  }

  private redirectByRole(userType?: string): void {
    if (userType === 'ADMINISTRATOR') { this.router.navigate(['/admin/dashboard']); return; }
    if (userType === 'PATIENT') { this.router.navigate(['/patient/profile']); return; }
    if (userType === 'DOCTOR') { this.router.navigate(['/doctor/profile']); return; }
    this.router.navigate(['/profile']);
  }

  onForgotDone(): void {
    this.showForgotFlow.set(false);
    
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
