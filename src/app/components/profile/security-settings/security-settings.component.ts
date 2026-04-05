import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-security-settings',
  standalone: true,
  template: `
    <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-5">
      <h2 class="text-base font-bold text-stone-900">Sécurité</h2>
      <div class="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div class="text-sm text-stone-700">Adresse e-mail</div>
          <div class="text-sm font-semibold text-stone-900">{{ email }}</div>
        </div>
        <button type="button" (click)="changePassword()"
                class="px-4 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-800">
          Changer le mot de passe
        </button>
      </div>
    </div>
  `,
})
export class SecuritySettingsComponent {
  @Input() email = '';

  changePassword(): void {
    window.location.href = 'http://localhost:9090/realms/mediconnect-main/account/#/security/signingin';
  }
}
