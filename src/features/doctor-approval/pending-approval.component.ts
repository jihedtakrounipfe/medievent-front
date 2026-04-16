import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthFacade } from '../../core/services/auth.facade';

@Component({
  selector: 'app-pending-approval',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-xl mx-auto px-4 py-16">
      <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-8">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 text-xl font-bold">
            …
          </div>
          <div class="min-w-0">
            <h1 class="text-xl font-bold text-stone-900">Votre compte est en cours de vérification</h1>
            <p class="text-sm text-stone-600 mt-2">
              Votre compte est en cours de vérification par notre équipe. Vous recevrez un e-mail à
              <span class="font-semibold text-stone-800">{{ email }}</span>
              dès que votre compte sera approuvé.
            </p>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-end gap-2">
          <button (click)="logout()" class="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold">
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PendingApprovalComponent {
  private facade = inject(AuthFacade);
  email = this.facade.currentUser?.email ?? '';

  logout(): void {
    this.facade.logout();
  }
}
