import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthFacade } from '../../core/services/auth.facade';

@Component({
  selector: 'app-doctor-rejected',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-xl mx-auto px-4 py-16">
      <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-8">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-700 text-xl font-bold">
            !
          </div>
          <div class="min-w-0">
            <h1 class="text-xl font-bold text-stone-900">{{ title }}</h1>
            <p class="text-sm text-stone-600 mt-2">{{ message }}</p>
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
export class RejectedComponent {
  private route = inject(ActivatedRoute);
  private facade = inject(AuthFacade);

  private status = (this.route.snapshot.queryParamMap.get('status') || '').toUpperCase();

  title = this.status === 'SUSPENDED' ? 'Votre compte a été suspendu' : 'Votre compte a été refusé';
  message = this.status === 'SUSPENDED'
    ? 'Votre accès a été suspendu. Veuillez contacter le support.'
    : 'Votre compte a été refusé. Veuillez contacter le support.';

  logout(): void {
    this.facade.logout();
  }
}
