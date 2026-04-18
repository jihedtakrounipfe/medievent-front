import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DoctorRegisterComponent } from '../doctor-register/doctor-register.component';
import { PatientRegisterComponent } from '../patient-register/patient-register.component';
import { SignupRolePickerComponent } from '../signup-role-picker/signup-role-picker.component';
import { EmailVerificationModalComponent } from '../email-verification-modal/email-verification-modal.component';

type SignupStep = 'ROLE' | 'PATIENT' | 'DOCTOR';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [
    CommonModule,
    SignupRolePickerComponent,
    PatientRegisterComponent,
    DoctorRegisterComponent,
    EmailVerificationModalComponent,
  ],
  template: `
    <div class="min-h-[calc(100vh-7rem)] flex items-center justify-center px-4 py-10"
         style="background: linear-gradient(160deg,#f0fdfa 0%,#ffffff 50%,#f0fdfa 100%)">
      <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div class="h-1.5 w-full bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600"></div>

        <div class="px-7 pt-6 pb-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-teal-500 rounded-xl flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
                <path d="M20 6v28M6 20h28" stroke="white" stroke-width="5" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="font-bold text-gray-900 text-lg tracking-tight">MediConnect</span>
          </div>

          @if (step() !== 'ROLE') {
            <button
              type="button"
              (click)="step.set('ROLE')"
              class="flex items-center gap-1 text-xs text-gray-400 hover:text-teal-600
                     transition-colors cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
          }
        </div>

        <div class="px-7 pb-7 pt-2">
          @if (step() === 'ROLE') {
            <app-signup-role-picker
              (roleSelected)="step.set($event)"
              (goToLogin)="router.navigate(['/auth/login'])"
            />
          }

          @if (step() === 'PATIENT') {
            <app-patient-register
              (verificationRequested)="openVerification($event)"
              (goToLogin)="router.navigate(['/auth/login'])"
            />
          }

          @if (step() === 'DOCTOR') {
            <app-doctor-register
              (verificationRequested)="openVerification($event)"
              (goToLogin)="router.navigate(['/auth/login'])"
            />
          }
        </div>
      </div>
    </div>

    <app-email-verification-modal
      *ngIf="verificationEmail()"
      [email]="verificationEmail()!"
      (verified)="onVerified()"
      (closed)="closeVerification()"
    />
  `,
})
export class SignupPageComponent {
  router = inject(Router);
  step = signal<SignupStep>('ROLE');
  verificationEmail = signal<string | null>(null);

  openVerification(email: string): void {
    this.verificationEmail.set(email);
  }

  closeVerification(): void {
    this.verificationEmail.set(null);
  }

  onVerified(): void {
    this.closeVerification();
    this.router.navigate(['/auth/login']);
  }
}
