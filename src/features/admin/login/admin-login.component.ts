import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthFacade } from '../../../core/services/auth.facade';
import { ToastService } from '../../auth/toast/toast.service';
import { finalize } from 'rxjs';
import { UserType } from '../../../core/user';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="h-screen w-screen bg-gray-950 flex items-center justify-center p-6 relative overflow-hidden">
      <!-- Ambient background -->
      <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/5 blur-[120px] rounded-full -mr-64 -mt-64 animate-pulse"></div>
      <div class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full -ml-64 -mb-64 animate-pulse" style="animation-delay: 2s"></div>

      <div class="w-full max-w-md z-10">
        <!-- Brand -->
        <div class="text-center mb-10">
          <div class="inline-flex items-center justify-center w-14 h-14 bg-teal-600 rounded-2xl shadow-[0_0_30px_rgba(13,148,136,0.3)] mb-6">
             <span class="text-white text-2xl font-bold">M</span>
          </div>
          <h1 class="text-xl font-bold text-white tracking-tight">MediConnect <span class="text-teal-500">Admin</span></h1>
          <p class="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Restricted Infrastructure</p>
        </div>

        <!-- Form Card -->
        <div class="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] p-10 shadow-2xl">
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
            
            <div class="space-y-2">
              <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Professional Identifier</label>
              <div class="relative group">
                <input type="email" formControlName="email" placeholder="admin&#64;mediconnect.tn"
                       class="w-full pl-5 pr-4 py-4 bg-gray-950 border border-gray-800 rounded-2xl text-sm text-white placeholder-gray-700 outline-none transition-all focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5" />
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between ml-1">
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Security Key</label>
                <button type="button" class="text-[10px] text-gray-600 hover:text-teal-500 font-bold uppercase transition-colors">Forgot Key?</button>
              </div>
              <div class="relative">
                <input [type]="showPwd() ? 'text' : 'password'" formControlName="password" placeholder="••••••••"
                       class="w-full pl-5 pr-12 py-4 bg-gray-950 border border-gray-800 rounded-2xl text-sm text-white placeholder-gray-700 outline-none transition-all focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5" />
                <button type="button" (click)="showPwd.set(!showPwd())"
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                   <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path *ngIf="!showPwd()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                     <path *ngIf="showPwd()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                   </svg>
                </button>
              </div>
            </div>

            <button type="submit" [disabled]="loading()"
                    class="w-full py-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-xl shadow-teal-900/20 transition-all active:scale-[0.98] uppercase tracking-widest text-xs mt-4">
              {{ loading() ? 'Authenticating...' : 'Sign In to Portal' }}
            </button>
          </form>
        </div>

        <p class="text-center text-[10px] text-gray-700 mt-12 uppercase tracking-[0.4em] font-medium">
          MediConnect &copy; 2026 Virtual Infrastructure
        </p>
      </div>
    </div>
  `,
  styles: []
})
export class AdminLoginComponent {
  private fb = inject(FormBuilder);
  private facade = inject(AuthFacade);
  private toast = inject(ToastService);
  private router = inject(Router);

  loading = signal(false);
  showPwd = signal(false);

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.facade.login({
      email:    this.form.value.email!,
      password: this.form.value.password!
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (user) => {
        if (user.userType !== UserType.ADMINISTRATOR) {
          this.facade.logout('/admin/login');
          this.toast.error('Accès refusé. Ce portail est réservé aux administrateurs.');
          return;
        }
        this.toast.success('Accès autorisé. Bienvenue, ' + user.firstName);
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.toast.error(err.message || 'Informations d\'accès non valides.');
      }
    });
  }
}
