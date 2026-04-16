import { Component, Input, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TwoFactorService } from '../../../../core/services/two-factor.service';
import { ToastService } from '../../../../features/auth/toast/toast.service';
import { ChangePasswordModalComponent } from '../change-password-modal/change-password-modal.component';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  imports: [CommonModule, ChangePasswordModalComponent],
  template: `
    <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-5 space-y-5">
      <h2 class="text-base font-bold text-stone-900">Sécurité</h2>

      <!-- Password section -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-stone-100">
        <div>
          <div class="text-sm font-semibold text-stone-800">Mot de passe</div>
          <div class="text-xs text-stone-500 mt-0.5">Adresse e-mail&nbsp;: {{ email }}</div>
        </div>
        <button type="button" (click)="openChangePasswordModal()"
                class="px-4 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-800 transition-colors">
          Changer le mot de passe
        </button>
      </div>

      <!-- 2FA loading skeleton -->
      @if (loading2fa()) {
        <div class="space-y-2">
          <div class="h-20 rounded-2xl bg-stone-100 animate-pulse"></div>
        </div>
      }

      <!-- 2FA section — email only -->
      @if (!loading2fa()) {
        <div class="space-y-3">
          <div>
            <div class="text-sm font-semibold text-stone-800">Authentification à deux facteurs (2FA)</div>
            <div class="text-xs text-stone-500 mt-0.5">
              Ajoutez une couche de sécurité supplémentaire à votre compte.
            </div>
          </div>

          <!-- Email 2FA card -->
          <div class="rounded-2xl border border-stone-200 bg-white p-4 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <!-- Email icon -->
              <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   [class.bg-teal-50]="is2FAEnabled()"
                   [class.bg-stone-100]="!is2FAEnabled()">
                <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                     [class.text-teal-600]="is2FAEnabled()" [class.text-stone-400]="!is2FAEnabled()">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>

              <!-- Info -->
              <div class="min-w-0">
                <div class="text-sm font-semibold text-stone-800">Vérification par e-mail</div>
                <div class="text-xs text-stone-500 mt-0.5">
                  Un code à 6 chiffres est envoyé à votre adresse e-mail à chaque connexion.
                </div>
                <!-- Status badge -->
                <div class="mt-1.5 inline-flex items-center gap-1.5">
                  @if (is2FAEnabled()) {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                      Activé
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-500">
                      <span class="w-1.5 h-1.5 rounded-full bg-stone-400 inline-block"></span>
                      Désactivé
                    </span>
                  }
                </div>
              </div>
            </div>

            <!-- Action button -->
            @if (is2FAEnabled()) {
              <button type="button"
                      [disabled]="actionLoading()"
                      (click)="openDisableModal()"
                      class="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 bg-white
                             hover:bg-rose-50 text-xs font-semibold transition-colors
                             disabled:opacity-50 flex-shrink-0">
                Désactiver
              </button>
            } @else {
              <button type="button"
                      [disabled]="actionLoading()"
                      (click)="openEnableModal()"
                      class="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white
                             text-xs font-semibold transition-colors disabled:opacity-50 flex-shrink-0">
                Activer
              </button>
            }
          </div>
        </div>
      }
    </div>

    <!-- Change password modal -->
    @if (showPasswordModal()) {
      <app-change-password-modal
        (closed)="showPasswordModal.set(false)"
        (success)="showPasswordModal.set(false)"
      />
    }

    <!-- Enable 2FA confirmation modal -->
    @if (showEnableModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background: rgba(0,0,0,0.4);"
           (click)="closeModals()">
        <div class="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 space-y-4"
             (click)="$event.stopPropagation()">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div class="text-sm font-bold text-stone-900">Activer la 2FA</div>
              <div class="text-xs text-stone-500">Vérification par e-mail</div>
            </div>
          </div>
          <p class="text-sm text-stone-600">
            À votre prochaine connexion, un code de vérification à 6 chiffres sera envoyé à votre adresse e-mail.
          </p>
          <div class="flex gap-2 pt-1">
            <button type="button" (click)="closeModals()"
                    class="flex-1 py-2 rounded-xl border border-stone-200 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors">
              Annuler
            </button>
            <button type="button" (click)="confirmEnable()" [disabled]="actionLoading()"
                    class="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              @if (actionLoading()) { Activation… } @else { Confirmer l'activation }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Disable 2FA confirmation modal -->
    @if (showDisableModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4"
           style="background: rgba(0,0,0,0.4);"
           (click)="closeModals()">
        <div class="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6 space-y-4"
             (click)="$event.stopPropagation()">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <div class="text-sm font-bold text-stone-900">Désactiver la 2FA</div>
              <div class="text-xs text-stone-500">Vérification par e-mail</div>
            </div>
          </div>
          <p class="text-sm text-stone-600">
            Êtes-vous sûr de vouloir désactiver l'authentification à deux facteurs ?
            <strong>Votre compte sera moins sécurisé.</strong>
          </p>
          <div class="flex gap-2 pt-1">
            <button type="button" (click)="closeModals()"
                    class="flex-1 py-2 rounded-xl border border-stone-200 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors">
              Annuler
            </button>
            <button type="button" (click)="confirmDisable()" [disabled]="actionLoading()"
                    class="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              @if (actionLoading()) { Désactivation… } @else { Désactiver la 2FA }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class SecuritySettingsComponent implements OnInit {
  @Input() email = '';
  /** DB-cached 2FA status — initial display while the API call completes */
  @Input() set twoFactorEnabled(val: boolean) { this.is2FAEnabled.set(val); }

  private twoFactorService = inject(TwoFactorService);
  private toast            = inject(ToastService);

  loading2fa    = signal(false);
  actionLoading = signal(false);
  /** The authoritative, locally maintained 2FA enabled state */
  is2FAEnabled  = signal(false);

  showPasswordModal = signal(false);
  showEnableModal   = signal(false);
  showDisableModal  = signal(false);

  ngOnInit(): void {
    this.loadStatus();
  }

  openChangePasswordModal(): void {
    this.showPasswordModal.set(true);
  }

  openEnableModal(): void {
    this.showEnableModal.set(true);
  }

  openDisableModal(): void {
    this.showDisableModal.set(true);
  }

  closeModals(): void {
    this.showEnableModal.set(false);
    this.showDisableModal.set(false);
  }

  confirmEnable(): void {
    this.actionLoading.set(true);
    this.twoFactorService.enable({ method: 'EMAIL' }).subscribe({
      next: () => {
        this.is2FAEnabled.set(true);      // ← immediate local update
        this.actionLoading.set(false);
        this.closeModals();
        this.toast.success('Authentification à deux facteurs activée.', '2FA');
      },
      error: (err: Error) => {
        this.actionLoading.set(false);
        this.toast.error(err.message ?? 'Erreur lors de l\'activation.', '2FA');
      },
    });
  }

  confirmDisable(): void {
    this.actionLoading.set(true);
    this.twoFactorService.disable().subscribe({
      next: () => {
        this.is2FAEnabled.set(false);     // ← immediate local update
        this.actionLoading.set(false);
        this.closeModals();
        this.toast.success('Authentification à deux facteurs désactivée.', '2FA');
      },
      error: (err: Error) => {
        this.actionLoading.set(false);
        this.toast.error(err.message ?? 'Erreur lors de la désactivation.', '2FA');
      },
    });
  }

  private loadStatus(): void {
    this.loading2fa.set(true);
    this.twoFactorService.getStatus().subscribe({
      next: (s) => {
        this.is2FAEnabled.set(s.enabled);
        this.loading2fa.set(false);
      },
      error: () => {
        // Non-critical: keep the DB-cached value from @Input
        this.loading2fa.set(false);
      },
    });
  }
}
