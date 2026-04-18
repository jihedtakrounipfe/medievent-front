import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup-role-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      <!-- Title -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 tracking-tight">Créer un compte</h2>
        <p class="text-sm text-gray-500 mt-1">Vous vous inscrivez en tant que :</p>
      </div>

      <!-- Role cards -->
      <div class="grid grid-cols-2 gap-3 mb-6">

        <!-- Patient -->
        <button
          type="button"
          (click)="selected.set('PATIENT')"
          (dblclick)="confirm()"
          class="relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2
                 transition-all duration-200 cursor-pointer text-left group"
          [class.border-teal-400]="selected() === 'PATIENT'"
          [class.bg-teal-50]="selected() === 'PATIENT'"
          [class.ring-4]="selected() === 'PATIENT'"
          [class.ring-teal-100]="selected() === 'PATIENT'"
          [class.border-gray-200]="selected() !== 'PATIENT'"
          [class.bg-gray-50]="selected() !== 'PATIENT'"
          [class.hover:border-gray-300]="selected() !== 'PATIENT'"
          [class.hover:bg-white]="selected() !== 'PATIENT'">

          <!-- Check badge -->
          @if (selected() === 'PATIENT') {
            <div class="absolute top-2.5 right-2.5 w-5 h-5 bg-teal-500 rounded-full
                        flex items-center justify-center">
              <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          }

          <!-- Icon -->
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors"
               [class.bg-teal-100]="selected() === 'PATIENT'"
               [class.bg-white]="selected() !== 'PATIENT'">
            <svg class="w-7 h-7 transition-colors"
                 [class.text-teal-600]="selected() === 'PATIENT'"
                 [class.text-gray-400]="selected() !== 'PATIENT'"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>

          <div class="text-center">
            <p class="font-semibold text-sm text-gray-900">Patient</p>
            <p class="text-xs text-gray-500 mt-0.5 leading-snug">Book appointments & manage your health</p>
          </div>
        </button>

        <!-- Doctor -->
        <button
          type="button"
          (click)="selected.set('DOCTOR')"
          (dblclick)="confirm()"
          class="relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2
                 transition-all duration-200 cursor-pointer text-left group"
          [class.border-teal-400]="selected() === 'DOCTOR'"
          [class.bg-teal-50]="selected() === 'DOCTOR'"
          [class.ring-4]="selected() === 'DOCTOR'"
          [class.ring-teal-100]="selected() === 'DOCTOR'"
          [class.border-gray-200]="selected() !== 'DOCTOR'"
          [class.bg-gray-50]="selected() !== 'DOCTOR'"
          [class.hover:border-gray-300]="selected() !== 'DOCTOR'"
          [class.hover:bg-white]="selected() !== 'DOCTOR'">

          @if (selected() === 'DOCTOR') {
            <div class="absolute top-2.5 right-2.5 w-5 h-5 bg-teal-500 rounded-full
                        flex items-center justify-center">
              <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          }

          <div class="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors"
               [class.bg-teal-100]="selected() === 'DOCTOR'"
               [class.bg-white]="selected() !== 'DOCTOR'">
            <svg class="w-7 h-7 transition-colors"
                 [class.text-teal-600]="selected() === 'DOCTOR'"
                 [class.text-gray-400]="selected() !== 'DOCTOR'"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586
                   a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>

          <div class="text-center">
            <p class="font-semibold text-sm text-gray-900">Médecin</p>
            <p class="text-xs text-gray-500 mt-0.5 leading-snug">Manage patients & consultations</p>
          </div>
        </button>
      </div>

      <!-- Info note for doctor -->
      @if (selected() === 'DOCTOR') {
        <div class="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100
                    rounded-xl mb-4 text-xs text-amber-700">
          <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>Les comptes médecins nécessitent une vérification du numéro RPPS et sont examinés par notre équipe avant activation.</span>
        </div>
      }

      <!-- CTA -->
      <button
        type="button"
        (click)="confirm()"
        [disabled]="!selected()"
        class="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-600 active:bg-teal-700
               text-white font-semibold text-sm rounded-xl transition-all
               disabled:opacity-40 disabled:cursor-not-allowed
               shadow-sm shadow-teal-200 hover:shadow-teal-300 cursor-pointer">
        Continuer en tant que {{ selected() === 'PATIENT' ? 'Patient' : selected() === 'DOCTOR' ? 'Médecin' : '...' }}
      </button>

      <p class="text-center text-sm text-gray-500 mt-4">
        Already have an account?
        <button type="button" (click)="goToLogin.emit()" class="text-teal-600 hover:text-teal-700 font-semibold ml-1 cursor-pointer">
          Sign in
        </button>
      </p>
    </div>
  `,
})
export class SignupRolePickerComponent {
  @Output() roleSelected = new EventEmitter<'PATIENT' | 'DOCTOR'>();
  @Output() goToLogin = new EventEmitter<void>();

  selected = signal<'PATIENT' | 'DOCTOR' | null>(null);

  confirm(): void {
    if (this.selected()) {
      this.roleSelected.emit(this.selected()!);
    }
  }
}
