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
    <div class="min-h-screen bg-stone-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      <!-- Abstract Background Decorations -->
      <div class="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 blur-[120px] rounded-full -mr-48 -mt-48"></div>
      <div class="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full -ml-48 -mb-48"></div>

      <div class="w-full max-w-md z-10">
        <!-- Logo & Header -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl shadow-2xl shadow-teal-900/50 mb-4 animate-bounce-slow">
            <span class="text-white text-3xl font-bold">M</span>
          </div>
          <h1 class="text-2xl font-bold text-white tracking-tight">MediConnect <span class="text-teal-500">Pro</span></h1>
          <p class="text-stone-400 text-xs mt-1 uppercase tracking-widest font-semibold">Portail d'Administration Sécurisé</p>
        </div>

        <!-- Glassmorphism Card -->
        <div class="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
            
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Identifiant Admin</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input type="email" formControlName="email" placeholder="admin&#64;mediconnect.tn"
                       class="admin-input focus:ring-teal-500/20" />
              </div>
            </div>

            <div class="space-y-1.5">
              <div class="flex items-center justify-between ml-1">
                <label class="block text-xs font-bold text-stone-400 uppercase tracking-wider">Clé de Sécurité</label>
                <a routerLink="/auth/forgot-password" class="text-[10px] text-teal-500 hover:text-teal-400 font-bold uppercase transition-colors">Oublié?</a>
              </div>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input [type]="showPwd() ? 'text' : 'password'" formControlName="password" placeholder="••••••••"
                       class="admin-input focus:ring-teal-500/20 pr-12" />
                <button type="button" (click)="showPwd.set(!showPwd())"
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400">
                   <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path *ngIf="!showPwd()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                     <path *ngIf="showPwd()" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                   </svg>
                </button>
              </div>
            </div>

            <div class="flex items-center gap-2 px-1">
              <input type="checkbox" id="trust" class="w-4 h-4 rounded bg-white/5 border-white/10 text-teal-600 focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer" />
              <label for="trust" class="text-xs text-stone-500 cursor-pointer hover:text-stone-400 transition-colors">Maintenir la session pour 24h</label>
            </div>

            <button type="submit" [disabled]="loading()"
                    class="w-full py-3.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-wait text-white font-bold rounded-2xl shadow-xl shadow-teal-900/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 uppercase tracking-widest text-sm">
              {{ loading() ? 'Vérification...' : 'Accéder au Portail' }}
            </button>
          </form>
        </div>

        <!-- Footer Note -->
        <p class="text-center text-[10px] text-stone-600 mt-8 uppercase tracking-[0.2em]">
          Système protégé par MediConnect Security Stack &copy; 2026
        </p>
      </div>
    </div>
  `,
  styles: [`
    .admin-input {
      @apply w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl 
             text-white placeholder-stone-600 outline-none transition-all
             focus:border-teal-500/50 focus:bg-white/[0.08];
    }
    
    @keyframes bounce-slow {
      0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
      50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
    }
    .animate-bounce-slow { animation: bounce-slow 3s infinite; }
  `]
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
