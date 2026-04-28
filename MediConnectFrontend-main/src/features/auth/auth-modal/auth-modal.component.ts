import {
  Component, EventEmitter, HostListener,
  Output, signal
} from '@angular/core';
import { CommonModule }            from '@angular/common';
import { LoginFormComponent }      from '../login-form/login-form.component';
import { SignupRolePickerComponent } from '../signup-role-picker/signup-role-picker.component';
import { PatientRegisterComponent }  from '../patient-register/patient-register.component';
import { DoctorRegisterComponent }   from '../doctor-register/doctor-register.component';

export type AuthStep = 'LOGIN' | 'ROLE_PICKER' | 'PATIENT_FORM' | 'DOCTOR_FORM';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [
    CommonModule,
    LoginFormComponent,
    SignupRolePickerComponent,
    PatientRegisterComponent,
    DoctorRegisterComponent,
  ],
  template: `
    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4
             bg-black/40 backdrop-blur-sm animate-fade-in"
      (click)="onBackdropClick($event)">

      <!-- Modal panel -->
      <div
        class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md
               animate-modal-in overflow-hidden"
        role="dialog" aria-modal="true">

        <!-- Teal top bar accent -->
        <div class="h-1.5 w-full bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600"></div>

        <!-- Header -->
        <div class="flex items-center justify-between px-7 pt-6 pb-2">
          <!-- Logo -->
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-teal-500 rounded-xl flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
                <path d="M20 6v28M6 20h28" stroke="white" stroke-width="5" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="font-bold text-gray-900 text-lg tracking-tight">MediConnect</span>
          </div>

          <!-- Step indicator pills -->
          <div class="flex items-center gap-1.5">
            @if (step() !== 'LOGIN') {
              <button
                (click)="goBack()"
                class="flex items-center gap-1 text-xs text-gray-400 hover:text-teal-600
                       transition-colors cursor-pointer mr-2">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
            }
            <!-- Step dots -->
            @if (step() === 'PATIENT_FORM' || step() === 'DOCTOR_FORM') {
              <div class="flex gap-1">
                <div class="w-2 h-2 rounded-full bg-teal-500"></div>
                <div class="w-2 h-2 rounded-full bg-teal-500"></div>
              </div>
            }
            @if (step() === 'ROLE_PICKER') {
              <div class="flex gap-1">
                <div class="w-2 h-2 rounded-full bg-teal-500"></div>
                <div class="w-2 h-2 rounded-full bg-gray-200"></div>
              </div>
            }

            <!-- Close -->
            <button
              (click)="close.emit()"
              class="ml-2 p-1.5 rounded-xl text-gray-400 hover:text-gray-600
                     hover:bg-gray-100 transition-all cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Step content -->
        <div class="px-7 pb-7 pt-2">

          @if (step() === 'LOGIN') {
            <app-login-form
              [showGoogle]="true"
              (goToSignup)="step.set('ROLE_PICKER')"
              (success)="close.emit()"
            />
          }

          @if (step() === 'ROLE_PICKER') {
            <app-signup-role-picker
              (roleSelected)="onRoleSelected($event)"
            />
          }

          @if (step() === 'PATIENT_FORM') {
            <app-patient-register
              (success)="onRegisterSuccess()"
              (goToLogin)="step.set('LOGIN')"
            />
          }

          @if (step() === 'DOCTOR_FORM') {
            <app-doctor-register
              (success)="onRegisterSuccess()"
              (goToLogin)="step.set('LOGIN')"
            />
          }

        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes modal-in {
      from { opacity: 0; transform: scale(0.96) translateY(12px); }
      to   { opacity: 1; transform: scale(1)    translateY(0); }
    }
    .animate-fade-in  { animation: fade-in  0.2s ease forwards; }
    .animate-modal-in { animation: modal-in 0.28s cubic-bezier(0.16,1,0.3,1) forwards; }
  `],
})
export class AuthModalComponent {
  @Output() close = new EventEmitter<void>();

  step = signal<AuthStep>('LOGIN');

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close.emit(); }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('fixed')) {
      this.close.emit();
    }
  }

  onRoleSelected(role: 'PATIENT' | 'DOCTOR'): void {
    this.step.set(role === 'PATIENT' ? 'PATIENT_FORM' : 'DOCTOR_FORM');
  }

  onRegisterSuccess(): void {
    // After registration show login so user can sign in
    this.step.set('LOGIN');
  }

  goBack(): void {
    const prev: Record<AuthStep, AuthStep> = {
      LOGIN:        'LOGIN',
      ROLE_PICKER:  'LOGIN',
      PATIENT_FORM: 'ROLE_PICKER',
      DOCTOR_FORM:  'ROLE_PICKER',
    };
    this.step.set(prev[this.step()]);
  }
}