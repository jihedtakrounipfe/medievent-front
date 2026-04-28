import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FaceRecognitionService } from '../../../../core/services/face-recognition.service';
import { TotpService } from '../../../../core/services/totp.service';
import { TwoFactorService } from '../../../../core/services/two-factor.service';
import { ToastService } from '../../../../features/auth/toast/toast.service';
import { ChangePasswordModalComponent } from '../change-password-modal/change-password-modal.component';
import { FaceEnrollmentComponent } from '../face-enrollment/face-enrollment.component';

type TotpModalStep = 'qr' | 'codes';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule, ChangePasswordModalComponent, FaceEnrollmentComponent],
  template: `
    <div class="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm space-y-5">
      <h2 class="text-base font-bold text-stone-900">Securite</h2>

      <div class="flex flex-col gap-3 border-b border-stone-100 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div class="text-sm font-semibold text-stone-800">Mot de passe</div>
          <div class="mt-0.5 text-xs text-stone-500">Adresse e-mail : {{ email }}</div>
        </div>
        <button type="button" (click)="showPasswordModal.set(true)"
                class="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50">
          Changer le mot de passe
        </button>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">

        <!-- Email 2FA card -->
        <div class="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl"
                 [class.bg-teal-50]="is2FAEnabled()" [class.bg-stone-100]="!is2FAEnabled()">
              <span class="text-lg" [class.text-teal-600]="is2FAEnabled()" [class.text-stone-400]="!is2FAEnabled()">&#64;</span>
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold text-stone-800">Verification par e-mail</div>
              <div class="mt-0.5 text-xs text-stone-500">Recevez un code a 6 chiffres lors de la connexion.</div>
              <div class="mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                   [class.bg-emerald-50]="is2FAEnabled()" [class.text-emerald-700]="is2FAEnabled()"
                   [class.bg-stone-100]="!is2FAEnabled()" [class.text-stone-500]="!is2FAEnabled()">
                {{ is2FAEnabled() ? 'Active' : 'Desactivee' }}
              </div>
            </div>
          </div>
          <button type="button" [disabled]="actionLoading()" (click)="toggle2FA()"
                  class="w-full rounded-xl px-3 py-2 text-sm font-semibold"
                  [class.bg-rose-600]="is2FAEnabled()" [class.text-white]="is2FAEnabled()"
                  [class.hover:bg-rose-700]="is2FAEnabled()"
                  [class.bg-teal-600]="!is2FAEnabled()" [class.text-white]="!is2FAEnabled()"
                  [class.hover:bg-teal-700]="!is2FAEnabled()">
            {{ is2FAEnabled() ? 'Desactiver' : 'Activer' }}
          </button>
        </div>

        <!-- TOTP card -->
        <div class="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl"
                 [class.bg-teal-50]="totpEnabled()" [class.bg-stone-100]="!totpEnabled()">
              <svg class="w-5 h-5" [class.text-teal-600]="totpEnabled()" [class.text-stone-400]="!totpEnabled()"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 11V7a5 5 0 0110 0v4M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z"/>
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold text-stone-800">Application d'authentification</div>
              <div class="mt-0.5 text-xs text-stone-500">Code genere par Google Authenticator ou similaire.</div>
              <div class="mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                   [class.bg-emerald-50]="totpEnabled()" [class.text-emerald-700]="totpEnabled()"
                   [class.bg-stone-100]="!totpEnabled()" [class.text-stone-500]="!totpEnabled()">
                {{ totpEnabled() ? 'Active' : 'Desactivee' }}
              </div>
              @if (totpEnabled() && totpRecoveryCodesLeft() !== null) {
                <div class="mt-1 text-xs text-stone-400">
                  {{ totpRecoveryCodesLeft() }} code(s) de recuperation restant(s)
                </div>
              }
            </div>
          </div>

          @if (totpEnabled()) {
            <div class="flex gap-2">
              <button type="button" (click)="startTotpSetup()" [disabled]="actionLoading()"
                      class="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                Reconfigurer
              </button>
              <button type="button" (click)="disableTotp()" [disabled]="actionLoading()"
                      class="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700">
                Desactiver
              </button>
            </div>
            <button type="button" (click)="regenerateTotpCodes()" [disabled]="actionLoading()"
                    class="w-full rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100">
              Regenerer les codes de recuperation
            </button>
          } @else {
            <button type="button" (click)="startTotpSetup()" [disabled]="actionLoading() || !canStartTotpSetup()"
                    class="w-full rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
              Configurer l'application
            </button>
            @if (!canStartTotpSetup()) {
              <div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Activez d'abord la verification par e-mail pour configurer TOTP.
              </div>
            }
          }
        </div>

        <!-- Face recognition card -->
        <div class="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl"
                 [class.bg-teal-50]="faceEnabled()" [class.bg-stone-100]="!faceEnabled()">
              <span class="text-lg" [class.text-teal-600]="faceEnabled()" [class.text-stone-400]="!faceEnabled()">◉</span>
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold text-stone-800">Reconnaissance faciale</div>
              <div class="mt-0.5 text-xs text-stone-500">Verifiez votre identite par reconnaissance faciale lors de la connexion.</div>
              <div class="mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                   [class.bg-emerald-50]="faceEnabled()" [class.text-emerald-700]="faceEnabled()"
                   [class.bg-stone-100]="!faceEnabled()" [class.text-stone-500]="!faceEnabled()">
                {{ faceEnabled() ? 'Activee' : 'Desactivee' }}
              </div>
            </div>
          </div>

          @if (faceEnabled() && faceEnrolled()) {
            <div class="flex gap-2">
              <button type="button" (click)="showFaceEnrollment.set(true)"
                      class="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                Reconfigurer
              </button>
              <button type="button" (click)="disableFace()" [disabled]="actionLoading()"
                      class="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700">
                Desactiver
              </button>
            </div>
          } @else {
            <button type="button" (click)="enableFace()" [disabled]="actionLoading() || !canEnableFace()"
                    class="w-full rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
              {{ faceEnrolled() ? 'Activer' : 'Activer et enregistrer' }}
            </button>
            @if (!canEnableFace()) {
              <div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Activez d'abord la verification par e-mail avant d'utiliser la reconnaissance faciale.
              </div>
            }
          }
        </div>

      </div>
    </div>

    <!-- Change password modal -->
    @if (showPasswordModal()) {
      <app-change-password-modal (closed)="showPasswordModal.set(false)" (success)="showPasswordModal.set(false)" />
    }

    <!-- Face enrollment modal -->
    @if (showFaceEnrollment()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
        <div class="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-xl space-y-4">
          <div>
            <h3 class="text-lg font-bold text-stone-900">Enregistrer votre visage</h3>
            <p class="mt-1 text-sm text-stone-500">
              Capturez plusieurs angles de votre visage pour l'enregistrement biometrique.
            </p>
          </div>
          <app-face-enrollment
            (completed)="onEnrollmentCompleted()"
            (cancelled)="showFaceEnrollment.set(false)" />
          <button type="button" (click)="showFaceEnrollment.set(false)"
                  class="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50">
            Fermer
          </button>
        </div>
      </div>
    }

    <!-- TOTP setup modal -->
    @if (showTotpModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
        <div class="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-xl space-y-5">

          @if (totpModalStep() === 'qr') {
            <div>
              <h3 class="text-lg font-bold text-stone-900">Configurer l'application</h3>
              <p class="mt-1 text-sm text-stone-500">
                Scannez ce QR code avec Google Authenticator, Authy, ou toute autre application TOTP.
              </p>
            </div>

            @if (totpQrUri()) {
              <div class="flex justify-center">
                <img [src]="totpQrUri()" alt="QR Code TOTP"
                     class="w-48 h-48 rounded-2xl border border-stone-200 p-2" />
              </div>
            }

            @if (totpSecret()) {
              <div class="rounded-xl bg-stone-50 border border-stone-200 px-4 py-3">
                <p class="text-xs text-stone-500 mb-1">Ou saisissez ce code manuellement :</p>
                <p class="font-mono text-sm text-stone-800 tracking-widest break-all select-all">{{ totpSecret() }}</p>
              </div>
            }

            <div class="space-y-2">
              <label class="text-sm font-semibold text-stone-700">
                Code de verification (6 chiffres)
              </label>
              <input type="text" inputmode="numeric" maxlength="6"
                     autocomplete="one-time-code"
                     [value]="totpVerifyCode()"
                     (input)="totpVerifyCode.set($any($event.target).value)"
                     placeholder="123456"
                     class="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm
                            text-center tracking-widest font-mono placeholder-stone-400
                            outline-none bg-stone-50 focus:border-teal-400" />
              @if (totpVerifyError()) {
                <p class="text-xs text-rose-600">{{ totpVerifyError() }}</p>
              }
            </div>

            <div class="flex gap-3">
              <button type="button" (click)="cancelTotpSetup()" [disabled]="totpVerifyLoading()"
                      class="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                Annuler
              </button>
              <button type="button" (click)="verifyTotpSetup()" [disabled]="totpVerifyLoading()"
                      class="flex-1 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                @if (totpVerifyLoading()) { Verification... } @else { Verifier }
              </button>
            </div>
          }

          @if (totpModalStep() === 'codes') {
            <div>
              <h3 class="text-lg font-bold text-stone-900">Codes de recuperation</h3>
              <p class="mt-1 text-sm text-stone-500">
                Sauvegardez ces codes dans un endroit sur. Chaque code ne peut etre utilise qu'une seule fois.
              </p>
            </div>

            <div class="rounded-xl bg-stone-50 border border-stone-200 p-4 grid grid-cols-2 gap-2">
              @for (code of totpRecoveryCodes(); track code) {
                <span class="font-mono text-sm text-stone-800 tracking-wider text-center py-1
                             rounded-lg bg-white border border-stone-100 select-all">
                  {{ code }}
                </span>
              }
            </div>

            <div class="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
              Ces codes ne seront plus affiches. Notez-les maintenant.
            </div>

            <button type="button" (click)="closeTotpModal()"
                    class="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
              J'ai sauvegarde mes codes
            </button>
          }

        </div>
      </div>
    }
  `,
})
export class SecuritySettingsComponent implements OnInit {
  @Input() email = '';
  @Input() set twoFactorEnabled(val: boolean) { this.is2FAEnabled.set(val); }
  @Input() set initialFaceEnabled(val: boolean) { this.faceEnabled.set(val); }
  @Input() set initialFaceEnrolled(val: boolean) { this.faceEnrolled.set(val); }

  private readonly twoFactorService = inject(TwoFactorService);
  private readonly faceService      = inject(FaceRecognitionService);
  private readonly totpService      = inject(TotpService);
  private readonly toast            = inject(ToastService);

  actionLoading        = signal(false);
  is2FAEnabled         = signal(false);
  faceEnabled          = signal(false);
  faceEnrolled         = signal(false);
  totpEnabled          = signal(false);
  totpEnrolled         = signal(false);
  totpRecoveryCodesLeft = signal<number | null>(null);

  showPasswordModal   = signal(false);
  showFaceEnrollment  = signal(false);

  showTotpModal      = signal(false);
  totpModalStep      = signal<TotpModalStep>('qr');
  totpQrUri          = signal('');
  totpSecret         = signal('');
  totpRecoveryCodes  = signal<string[]>([]);
  totpVerifyCode     = signal('');
  totpVerifyError    = signal('');
  totpVerifyLoading  = signal(false);

  ngOnInit(): void {
    this.faceService.getStatus().subscribe({
      next: status => {
        this.faceEnabled.set(status.faceEnabled);
        this.faceEnrolled.set(status.faceEnrolled);
      },
    });
    this.totpService.getStatus().subscribe({
      next: status => {
        this.totpEnabled.set(status.totpEnabled);
        this.totpEnrolled.set(status.totpEnrolled);
        this.totpRecoveryCodesLeft.set(status.recoveryCodesRemaining);
      },
    });
  }

  canStartTotpSetup(): boolean {
    return this.is2FAEnabled();
  }

  canEnableFace(): boolean {
    return this.is2FAEnabled() || (this.totpEnabled() && this.totpEnrolled());
  }

  toggle2FA(): void {
    this.actionLoading.set(true);
    const request$ = this.is2FAEnabled()
      ? this.twoFactorService.disable()
      : this.twoFactorService.enable({ method: 'EMAIL' });
    request$.subscribe({
      next: (res) => {
        const nextEnabled = !this.is2FAEnabled();
        this.is2FAEnabled.set(nextEnabled);
        if (!nextEnabled) {
          this.totpEnabled.set(false);
          this.totpEnrolled.set(false);
          this.totpRecoveryCodesLeft.set(null);
          this.faceEnabled.set(false);
          this.faceEnrolled.set(false);
        }
        this.actionLoading.set(false);
        this.toast.success(res.message ?? 'Parametres de securite mis a jour.', 'Securite');
      },
      error: (err: any) => {
        this.actionLoading.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur lors de la mise a jour.', 'Securite');
      },
    });
  }

  enableFace(): void {
    if (!this.canEnableFace()) {
      this.toast.warning('Activez d\'abord la verification par e-mail.', 'Securite');
      return;
    }
    this.actionLoading.set(true);
    this.faceService.enable().subscribe({
      next: () => {
        this.faceEnabled.set(true);
        this.actionLoading.set(false);
        this.showFaceEnrollment.set(true);
      },
      error: (err: any) => {
        this.actionLoading.set(false);
        this.toast.error(err?.error?.message ?? "Impossible d'activer la reconnaissance faciale.", 'Securite');
      },
    });
  }

  disableFace(): void {
    this.actionLoading.set(true);
    this.faceService.disable().subscribe({
      next: () => {
        this.faceEnabled.set(false);
        this.faceEnrolled.set(false);
        this.actionLoading.set(false);
        this.toast.success('Reconnaissance faciale desactivee.', 'Securite');
      },
      error: (err: any) => {
        this.actionLoading.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur lors de la desactivation.', 'Securite');
      },
    });
  }

  onEnrollmentCompleted(): void {
    this.faceEnabled.set(true);
    this.faceEnrolled.set(true);
    this.showFaceEnrollment.set(false);
    this.toast.success('Reconnaissance faciale activee avec succes.', 'Securite');
  }

  startTotpSetup(): void {
    if (!this.canStartTotpSetup()) {
      this.toast.warning('Activez d\'abord la verification par e-mail.', 'Securite');
      return;
    }
    this.totpVerifyCode.set('');
    this.totpVerifyError.set('');
    this.totpModalStep.set('qr');
    this.actionLoading.set(true);
    this.totpService.initiateSetup().subscribe({
      next: res => {
        this.totpQrUri.set(res.qrCodeDataUri);
        this.totpSecret.set(res.secret);
        this.actionLoading.set(false);
        this.showTotpModal.set(true);
      },
      error: (err: any) => {
        this.actionLoading.set(false);
        this.toast.error(err?.error?.message ?? "Impossible d'initier la configuration TOTP.", 'Securite');
      },
    });
  }

  verifyTotpSetup(): void {
    const code = this.totpVerifyCode().trim();
    if (!code || code.length !== 6) {
      this.totpVerifyError.set('Entrez un code a 6 chiffres.');
      return;
    }
    this.totpVerifyError.set('');
    this.totpVerifyLoading.set(true);
    this.totpService.verifySetup(code).subscribe({
      next: res => {
        this.totpEnabled.set(true);
        this.totpEnrolled.set(true);
        this.totpRecoveryCodes.set(res.recoveryCodes);
        this.totpRecoveryCodesLeft.set(res.recoveryCodes.length);
        this.totpVerifyLoading.set(false);
        this.totpModalStep.set('codes');
        this.toast.success('Application d\'authentification configuree avec succes.', 'Securite');
      },
      error: (err: any) => {
        this.totpVerifyLoading.set(false);
        this.totpVerifyError.set(err?.error?.message ?? 'Code invalide. Reessayez.');
      },
    });
  }

  cancelTotpSetup(): void {
    this.totpService.cancelSetup().subscribe();
    this.showTotpModal.set(false);
  }

  closeTotpModal(): void {
    this.showTotpModal.set(false);
    this.totpRecoveryCodes.set([]);
  }

  disableTotp(): void {
    this.actionLoading.set(true);
    this.totpService.disable().subscribe({
      next: () => {
        this.totpEnabled.set(false);
        this.totpEnrolled.set(false);
        this.totpRecoveryCodesLeft.set(null);
        this.actionLoading.set(false);
        this.toast.success('Application d\'authentification desactivee.', 'Securite');
      },
      error: (err: any) => {
        this.actionLoading.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur lors de la desactivation.', 'Securite');
      },
    });
  }

  regenerateTotpCodes(): void {
    this.actionLoading.set(true);
    this.totpService.regenerateCodes().subscribe({
      next: res => {
        this.totpRecoveryCodes.set(res.recoveryCodes);
        this.totpRecoveryCodesLeft.set(res.recoveryCodes.length);
        this.actionLoading.set(false);
        this.totpModalStep.set('codes');
        this.showTotpModal.set(true);
      },
      error: (err: any) => {
        this.actionLoading.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur lors de la regeneration des codes.', 'Securite');
      },
    });
  }
}
