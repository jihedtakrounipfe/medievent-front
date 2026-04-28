import {
  Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaceVerificationComponent } from '../face-verification/face-verification.component';
import type { MfaMethodType } from '../../../core/user';

export interface MfaSubmitEvent {
  method:        MfaMethodType;
  code?:         string;
  faceImage?:    string;
  recoveryCode?: string;
}

@Component({
  selector: 'app-mfa-verification',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaceVerificationComponent],
  template: `
    <div class="w-full space-y-5">

      <!-- Header + back -->
      <div>
        <button type="button" (click)="back.emit()"
                class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 py-2 mb-4 transition-colors cursor-pointer">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Retour
        </button>
        <h2 class="text-2xl font-bold text-gray-900 tracking-tight">Vérification en deux étapes</h2>
        <p class="text-sm text-gray-500 mt-1">Choisissez une méthode pour terminer la connexion.</p>
      </div>

      <!-- ── FACE ─────────────────────────────────────────────────────────── -->
      @if (activeMethod() === 'FACE') {
        <app-face-verification
          [loading]="loading"
          [errorMessage]="failedMethod === 'FACE' ? errorMessage : null"
          [attempts]="3 - attemptsLeft('FACE')"
          [showBack]="false"
          (verify)="submit.emit({ method: 'FACE', faceImage: $event })"
          (useEmailFallback)="switchToNextAvailable('FACE')"
          (back)="back.emit()"
        />
        <div class="flex flex-col items-center gap-2 pt-1">
          @for (m of otherMethods('FACE'); track m) {
            <button type="button" (click)="switchMethod(m)"
                    class="text-sm text-teal-600 hover:text-teal-700 py-1 cursor-pointer transition-colors">
              {{ switchMethodLabel(m) }}
            </button>
          }
        </div>
      }

      <!-- ── TOTP ─────────────────────────────────────────────────────────── -->
      @if (activeMethod() === 'TOTP' && !showRecovery()) {
        <div class="space-y-4">
          <p class="text-sm text-gray-500">
            Entrez le code à 6 chiffres affiché dans votre application d'authentification.
          </p>

          @if (failedMethod === 'TOTP' && errorMessage) {
            <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {{ errorMessage }}
            </div>
          }

          @if (attemptsLeft('TOTP') < 3 && attemptsLeft('TOTP') > 0) {
            <p class="text-xs text-slate-400">Tentative {{ 4 - attemptsLeft('TOTP') }} sur 3</p>
          }

          <form [formGroup]="totpForm" (ngSubmit)="onTotpSubmit()" class="space-y-3">
            <input type="text" formControlName="code"
                   placeholder="123456" maxlength="6" inputmode="numeric" autocomplete="one-time-code"
                   class="w-full px-4 py-2.5 rounded-xl border text-sm text-center tracking-widest
                          font-mono placeholder-gray-400 outline-none bg-gray-50 border-gray-200"/>
            <button type="submit" [disabled]="loading"
                    class="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold
                           text-sm rounded-xl disabled:opacity-60 cursor-pointer">
              @if (loading) { Vérification… } @else { Vérifier }
            </button>
          </form>

          <div class="flex flex-col items-center gap-2 pt-1">
            <button type="button" (click)="showRecovery.set(true)"
                    class="text-sm text-teal-600 hover:text-teal-700 py-1 cursor-pointer transition-colors">
              Utiliser un code de récupération
            </button>
            @for (m of otherMethods('TOTP'); track m) {
              <button type="button" (click)="switchMethod(m)"
                      class="text-sm text-teal-600 hover:text-teal-700 py-1 cursor-pointer transition-colors">
                {{ switchMethodLabel(m) }}
              </button>
            }
          </div>
        </div>
      }

      <!-- ── RECOVERY (sub-panel within TOTP) ─────────────────────────────── -->
      @if (activeMethod() === 'TOTP' && showRecovery()) {
        <div class="space-y-4">
          <p class="text-sm text-gray-500">
            Entrez l'un de vos codes de récupération à 10 caractères (format&nbsp;: ABCD1234EF).
          </p>

          @if (failedMethod === 'RECOVERY' && errorMessage) {
            <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {{ errorMessage }}
            </div>
          }

          <form [formGroup]="recoveryForm" (ngSubmit)="onRecoverySubmit()" class="space-y-3">
            <input type="text" formControlName="code"
                   placeholder="ABCD1234EF" maxlength="10" autocomplete="off"
                   style="text-transform: uppercase"
                   class="w-full px-4 py-2.5 rounded-xl border text-sm text-center tracking-widest
                          font-mono placeholder-gray-400 outline-none bg-gray-50 border-gray-200"/>
            <button type="submit" [disabled]="loading"
                    class="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold
                           text-sm rounded-xl disabled:opacity-60 cursor-pointer">
              @if (loading) { Vérification… } @else { Utiliser ce code }
            </button>
          </form>

          <div class="flex flex-col items-center gap-2 pt-1">
            <button type="button" (click)="showRecovery.set(false)"
                    class="text-sm text-teal-600 hover:text-teal-700 py-1 cursor-pointer transition-colors">
              Retour au code TOTP
            </button>
          </div>
        </div>
      }

      <!-- ── EMAIL ────────────────────────────────────────────────────────── -->
      @if (activeMethod() === 'EMAIL') {
        <div class="space-y-4">
          <p class="text-sm text-gray-500">
            Un code à 6 chiffres a été envoyé à <strong>{{ maskedEmail }}</strong>.
          </p>

          @if (failedMethod === 'EMAIL' && errorMessage) {
            <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {{ errorMessage }}
            </div>
          }

          @if (attemptsLeft('EMAIL') < 3 && attemptsLeft('EMAIL') > 0) {
            <p class="text-xs text-slate-400">Tentative {{ 4 - attemptsLeft('EMAIL') }} sur 3</p>
          }

          <form [formGroup]="emailForm" (ngSubmit)="onEmailSubmit()" class="space-y-3">
            <input type="text" formControlName="code"
                   placeholder="123456" maxlength="6" inputmode="numeric" autocomplete="one-time-code"
                   class="w-full px-4 py-2.5 rounded-xl border text-sm text-center tracking-widest
                          font-mono placeholder-gray-400 outline-none bg-gray-50 border-gray-200"/>
            <button type="submit" [disabled]="loading"
                    class="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold
                           text-sm rounded-xl disabled:opacity-60 cursor-pointer">
              @if (loading) { Vérification… } @else { Vérifier le code }
            </button>
          </form>

          <div class="flex flex-col items-center gap-2 pt-1">
            <button type="button" (click)="resendEmail()" [disabled]="loading"
                    class="text-sm text-teal-600 hover:text-teal-700 py-1 cursor-pointer transition-colors disabled:opacity-50">
              Renvoyer le code
            </button>
            @for (m of otherMethods('EMAIL'); track m) {
              <button type="button" (click)="switchMethod(m)"
                      class="text-sm text-teal-600 hover:text-teal-700 py-1 cursor-pointer transition-colors">
                {{ switchMethodLabel(m) }}
              </button>
            }
          </div>
        </div>
      }

    </div>
  `,
})
export class MfaVerificationComponent implements OnChanges {
  @Input() sessionToken       = '';
  @Input() enabledMethods:    MfaMethodType[] = [];
  @Input() primaryMethod:     MfaMethodType   = 'EMAIL';
  @Input() attemptsRemaining: Record<string, number> = {};
  @Input() loading            = false;
  @Input() errorMessage:      string | null = null;
  @Input() failedMethod:      MfaMethodType | null = null;
  @Input() email              = '';

  @Output() submit = new EventEmitter<MfaSubmitEvent>();
  @Output() back   = new EventEmitter<void>();

  activeMethod = signal<MfaMethodType>('EMAIL');
  showRecovery = signal(false);

  private fb = inject(FormBuilder);

  totpForm     = this.fb.group({ code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
  emailForm    = this.fb.group({ code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
  recoveryForm = this.fb.group({ code: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]] });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['primaryMethod'] && this.primaryMethod) {
      this.activeMethod.set(this.primaryMethod);
    }
  }

  switchMethod(method: MfaMethodType): void {
    if (this.activeMethod() === method) return;
    this.showRecovery.set(false);
    this.activeMethod.set(method);
    if (method === 'EMAIL') {
      this.submit.emit({ method: 'EMAIL' });
    }
  }

  switchToNextAvailable(skip: MfaMethodType): void {
    const next = this.enabledMethods.find(m => m !== skip && this.attemptsLeft(m) > 0);
    if (next) {
      this.switchMethod(next);
    } else if (skip !== 'EMAIL') {
      // Always fall back to email as last resort (server always supports it)
      this.activeMethod.set('EMAIL');
      this.submit.emit({ method: 'EMAIL' });
    }
  }

  otherMethods(current: MfaMethodType): MfaMethodType[] {
    return this.enabledMethods.filter(m => m !== current && this.attemptsLeft(m) > 0);
  }

  switchMethodLabel(method: MfaMethodType): string {
    switch (method) {
      case 'FACE':  return 'Utiliser la reconnaissance faciale';
      case 'TOTP':  return "Utiliser l'application d'authentification";
      case 'EMAIL': return 'Utiliser un code par e-mail';
      default: return method;
    }
  }

  onTotpSubmit(): void {
    this.totpForm.markAllAsTouched();
    if (this.totpForm.invalid || this.loading) return;
    const code = (this.totpForm.value.code ?? '').trim();
    this.totpForm.reset();
    this.submit.emit({ method: 'TOTP', code });
  }

  onEmailSubmit(): void {
    this.emailForm.markAllAsTouched();
    if (this.emailForm.invalid || this.loading) return;
    const code = (this.emailForm.value.code ?? '').trim();
    this.emailForm.reset();
    this.submit.emit({ method: 'EMAIL', code });
  }

  onRecoverySubmit(): void {
    this.recoveryForm.markAllAsTouched();
    if (this.recoveryForm.invalid || this.loading) return;
    const recoveryCode = (this.recoveryForm.value.code ?? '').toUpperCase().trim();
    this.recoveryForm.reset();
    this.submit.emit({ method: 'RECOVERY', recoveryCode });
  }

  resendEmail(): void {
    this.emailForm.reset();
    this.submit.emit({ method: 'EMAIL' });
  }

  attemptsLeft(method: MfaMethodType): number {
    return this.attemptsRemaining[method] ?? 3;
  }

  get maskedEmail(): string {
    if (!this.email) return '…';
    const atIdx = this.email.indexOf('@');
    if (atIdx <= 2) return this.email;
    return `${this.email[0]}***${this.email.slice(atIdx)}`;
  }
}
