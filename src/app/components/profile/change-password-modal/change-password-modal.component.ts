import {
  Component, EventEmitter, Output, OnDestroy,
  inject, signal, computed
} from '@angular/core';
import { CommonModule }        from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subscription }        from 'rxjs';
import { AuthService }         from '../../../../core/services/auth.service';
import { ToastService }        from '../../../../features/auth/toast/toast.service';

/**
 * In-app password change modal.
 * No Keycloak redirect — stays entirely within MediConnect.
 *
 * Emits (closed) when the user cancels or after a successful change.
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
            <div class="text-xs text-stone-500">Modifiez votre mot de passe de connexion</div>
          </div>
        </div>

        <!-- Error banner (wrong current password) -->
        @if (serverError()) {
          <div class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
            <svg class="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p class="text-xs text-red-700 font-medium">{{ serverError() }}</p>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="space-y-4">

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
                [class.border-stone-200]="!fieldErr('currentPassword')"
                [class.bg-stone-50]="!fieldErr('currentPassword')"
                [class.border-red-300]="fieldErr('currentPassword')"
                [class.bg-red-50]="fieldErr('currentPassword')"
              />
              <button type="button" (click)="showCurrent.set(!showCurrent())"
                      class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 transition-colors">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  @if (showCurrent()) {
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
                         a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
                         M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29
                         M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7
                         a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  } @else {
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  }
                </svg>
              </button>
            </div>
            @if (fieldErr('currentPassword')) {
              <p class="text-xs text-red-500">{{ form.get('currentPassword')?.errors?.['required'] ? 'Le mot de passe actuel est requis.' : 'Champ requis.' }}</p>
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
                [class.border-stone-200]="!fieldErr('newPassword')"
                [class.bg-stone-50]="!fieldErr('newPassword')"
                [class.border-red-300]="fieldErr('newPassword')"
                [class.bg-red-50]="fieldErr('newPassword')"
              />
              <button type="button" (click)="showNew.set(!showNew())"
                      class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 transition-colors">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  @if (showNew()) {
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
                         a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
                         M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29
                         M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7
                         a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  } @else {
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  }
                </svg>
              </button>
            </div>

            <!-- Strength bar -->
            @if (form.get('newPassword')?.value) {
              <div class="space-y-1.5 mt-2">
                <div class="flex gap-1">
                  @for (i of [0, 1, 2, 3]; track i) {
                    <div class="flex-1 h-1.5 rounded-full transition-colors"
                         [class.bg-red-400]="strength() === 1 && i === 0"
                         [class.bg-amber-400]="strength() === 2 && i <= 1"
                         [class.bg-teal-400]="strength() >= 3 && i <= 2"
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
              <li class="flex items-center gap-1.5 text-xs" [class.text-emerald-600]="hasMinLength()" [class.text-stone-400]="!hasMinLength()">
                <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                Au moins 8 caractères
              </li>
              <li class="flex items-center gap-1.5 text-xs" [class.text-emerald-600]="hasUppercase()" [class.text-stone-400]="!hasUppercase()">
                <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                Au moins une majuscule
              </li>
              <li class="flex items-center gap-1.5 text-xs" [class.text-emerald-600]="hasLowercase()" [class.text-stone-400]="!hasLowercase()">
                <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
                Au moins une minuscule
              </li>
              <li class="flex items-center gap-1.5 text-xs" [class.text-emerald-600]="hasDigit()" [class.text-stone-400]="!hasDigit()">
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
                [class.border-stone-200]="!fieldErr('confirmPassword') && !passwordMismatch()"
                [class.bg-stone-50]="!fieldErr('confirmPassword') && !passwordMismatch()"
                [class.border-red-300]="fieldErr('confirmPassword') || passwordMismatch()"
                [class.bg-red-50]="fieldErr('confirmPassword') || passwordMismatch()"
              />
              <button type="button" (click)="showConfirm.set(!showConfirm())"
                      class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 transition-colors">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  @if (showConfirm()) {
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
                         a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
                         M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29
                         M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7
                         a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  } @else {
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  }
                </svg>
              </button>
            </div>
            @if (passwordMismatch()) {
              <p class="text-xs text-red-500">Les mots de passe ne correspondent pas.</p>
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
                    [disabled]="loading() || !canSubmit()"
                    class="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white
                           text-sm font-semibold transition-colors disabled:opacity-50
                           flex items-center justify-center gap-2">
              @if (loading()) {
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
    </div>
  `,
})
export class ChangePasswordModalComponent implements OnDestroy {
  @Output() closed  = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  private fb    = inject(FormBuilder);
  private auth  = inject(AuthService);
  private toast = inject(ToastService);

  loading     = signal(false);
  serverError = signal<string | null>(null);
  showCurrent = signal(false);
  showNew     = signal(false);
  showConfirm = signal(false);

  /** Reactive password value signal — updated on every keystroke via valueChanges */
  private newPwdValue = signal('');
  private sub?: Subscription;

  form = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword:     ['', [Validators.required, Validators.minLength(8),
                           Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
    confirmPassword: ['', [Validators.required]],
  });

  constructor() {
    // Keep newPwdValue signal in sync with the form control
    this.sub = this.form.get('newPassword')!.valueChanges.subscribe(v => {
      this.newPwdValue.set(v ?? '');
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  // ── Password requirement checks (computed from the signal) ───────────────

  hasMinLength  = computed(() => this.newPwdValue().length >= 8);
  hasUppercase  = computed(() => /[A-Z]/.test(this.newPwdValue()));
  hasLowercase  = computed(() => /[a-z]/.test(this.newPwdValue()));
  hasDigit      = computed(() => /\d/.test(this.newPwdValue()));

  strength = computed<number>(() => {
    let score = 0;
    if (this.hasMinLength()) score++;
    if (this.hasUppercase()) score++;
    if (this.hasLowercase()) score++;
    if (this.hasDigit())     score++;
    return score;
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
    const confirm = this.form.get('confirmPassword');
    return !!(confirm?.touched && confirm?.value !== this.newPwdValue());
  });

  canSubmit = computed<boolean>(() => {
    const { currentPassword, confirmPassword } = this.form.value;
    return !!(
      currentPassword &&
      this.strength() === 4 &&
      confirmPassword &&
      confirmPassword === this.newPwdValue()
    );
  });

  fieldErr(name: string): boolean {
    const ctrl = this.form.get(name);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  onBackdropClick(): void {
    if (!this.loading()) this.closed.emit();
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.passwordMismatch() || this.loading()) return;

    this.serverError.set(null);
    this.loading.set(true);

    const { currentPassword, newPassword, confirmPassword } = this.form.value;

    this.auth.changePassword({
      currentPassword: currentPassword!,
      newPassword:     newPassword!,
      confirmPassword: confirmPassword!,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Mot de passe modifié avec succès', 'Sécurité');
        this.success.emit();
        this.closed.emit();
      },
      error: (err: any) => {
        this.loading.set(false);
        const apiErr  = err?.error?.error ?? '';
        const message = err?.error?.message ?? 'Erreur lors de la modification du mot de passe.';

        if (apiErr === 'INVALID_CURRENT_PASSWORD') {
          this.serverError.set(message);
        } else {
          this.toast.error(message, 'Erreur');
        }
      },
    });
  }
}
