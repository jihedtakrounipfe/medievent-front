import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoginFormComponent } from '../login-form/login-form.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, LoginFormComponent],
  template: `
    <div class="min-h-[calc(100vh-7rem)] flex items-center justify-center px-4 py-10"
         style="background: linear-gradient(160deg,#f0fdfa 0%,#ffffff 50%,#f0fdfa 100%)">
      <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div class="h-1.5 w-full bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600"></div>

        <div class="px-7 pt-6 pb-2 flex items-center gap-2">
          <div class="w-8 h-8 bg-teal-500 rounded-xl flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
              <path d="M20 6v28M6 20h28" stroke="white" stroke-width="5" stroke-linecap="round"/>
            </svg>
          </div>
          <span class="font-bold text-gray-900 text-lg tracking-tight">MediConnect</span>
        </div>

        <div class="px-7 pb-7 pt-2">
          <app-login-form
            [showGoogle]="false"
            [showForgotPassword]="true"
            (goToSignup)="router.navigate(['/auth/signup'])"
          />
        </div>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  router = inject(Router);
}

