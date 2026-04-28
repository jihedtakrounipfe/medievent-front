import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { ToastService } from '../toast/toast.service';
import { GoogleUserInfo, GoogleRegisterRequest, Specialization } from '../../../core/user';

@Component({
  selector: 'app-google-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-teal-50 to-white flex items-center justify-center p-4">
      <div class="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">

        <!-- Header -->
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg width="32" height="32" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.7 29.3 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.9 0 20-7.9 20-21 0-1.3-.1-2.7-.4-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.3 18.9 12 24 12c3.1 0 5.9 1.1 8.1 2.9l5.7-5.7C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.9 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 45c5.2 0 10-1.9 13.6-5l-6.3-5.2C29.5 36.6 26.9 37 24 37c-5.2 0-9.6-3.3-11.3-8H6.3C9.7 40.1 16.3 45 24 45z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.3 5.2C41.1 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">Bienvenue sur MediConnect !</h1>
          <p class="text-sm text-gray-500 mt-1">Vous vous inscrivez avec <strong>{{ googleProfile()?.email }}</strong></p>
        </div>

        <!-- Step 1: Role selection -->
        @if (step() === 'role') {
          <div class="space-y-4">
            <p class="text-sm font-medium text-gray-700 text-center">Je suis :</p>
            <div class="grid grid-cols-2 gap-4">
              <button type="button"
                      (click)="selectRole('PATIENT')"
                      class="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all cursor-pointer hover:border-teal-400 hover:bg-teal-50"
                      [class.border-teal-500]="selectedRole() === 'PATIENT'"
                      [class.bg-teal-50]="selectedRole() === 'PATIENT'"
                      [class.border-gray-200]="selectedRole() !== 'PATIENT'">
                <span class="font-semibold text-gray-800">Patient</span>
                <span class="text-xs text-gray-500 text-center">Je souhaite gérer ma santé</span>
              </button>
              <button type="button"
                      (click)="selectRole('DOCTOR')"
                      class="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all cursor-pointer hover:border-teal-400 hover:bg-teal-50"
                      [class.border-teal-500]="selectedRole() === 'DOCTOR'"
                      [class.bg-teal-50]="selectedRole() === 'DOCTOR'"
                      [class.border-gray-200]="selectedRole() !== 'DOCTOR'">
                <span class="font-semibold text-gray-800">Médecin</span>
                <span class="text-xs text-gray-500 text-center">Je gère mes patients</span>
              </button>
            </div>
            <button type="button" (click)="step.set('form')" [disabled]="!selectedRole()"
                    class="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl text-sm mt-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-all">
              Continuer
            </button>
          </div>
        }

        <!-- Step 2: Profile form -->
        @if (step() === 'form') {
          <form [formGroup]="profileForm" (ngSubmit)="onSubmit()" novalidate class="space-y-4">

            <!-- Back -->
            <button type="button" (click)="step.set('role')"
                    class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600 py-2 mb-2 transition-colors cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
              Retour
            </button>

            <!-- Email (disabled) -->
            <div class="space-y-1">
              <label class="block text-xs font-medium text-gray-600">E-mail (depuis Google)</label>
              <input type="email" [value]="googleProfile()?.email ?? ''" disabled
                     class="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-100 text-sm text-gray-500 cursor-not-allowed"/>
            </div>

            <!-- First name -->
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="block text-xs font-medium text-gray-700">Prénom *</label>
                <input type="text" formControlName="firstName"
                       class="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all"
                       [class.border-gray-200]="!fe('firstName')" [class.bg-gray-50]="!fe('firstName')"
                       [class.border-red-300]="fe('firstName')" [class.bg-red-50]="fe('firstName')"/>
              </div>
              <div class="space-y-1">
                <label class="block text-xs font-medium text-gray-700">Nom *</label>
                <input type="text" formControlName="lastName"
                       class="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all"
                       [class.border-gray-200]="!fe('lastName')" [class.bg-gray-50]="!fe('lastName')"
                       [class.border-red-300]="fe('lastName')" [class.bg-red-50]="fe('lastName')"/>
              </div>
            </div>

            <!-- Phone -->
            <div class="space-y-1">
              <label class="block text-xs font-medium text-gray-700">Téléphone</label>
              <input type="tel" formControlName="phone" placeholder="+216 xx xxx xxx"
                     class="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none"/>
            </div>

            <!-- Patient-specific fields -->
            @if (selectedRole() === 'PATIENT') {
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Date de naissance</label>
                  <input type="date" formControlName="dateOfBirth"
                         class="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none"/>
                </div>
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-700">Genre</label>
                  <select formControlName="gender"
                          class="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none">
                    <option value="">— Sélectionner —</option>
                    <option value="MALE">Homme</option>
                    <option value="FEMALE">Femme</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
              </div>
            }

            <!-- Doctor-specific fields -->
            @if (selectedRole() === 'DOCTOR') {
              <div class="p-3 bg-teal-50 rounded-xl border border-teal-200 text-xs text-teal-700 mb-2">
                Votre compte sera soumis à vérification par notre équipe avant activation.
              </div>
              <div class="space-y-1">
                <label class="block text-xs font-medium text-gray-700">Numéro RPPS *</label>
                <input type="text" formControlName="rppsNumber"
                       class="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all"
                       [class.border-gray-200]="!fe('rppsNumber')" [class.bg-gray-50]="!fe('rppsNumber')"
                       [class.border-red-300]="fe('rppsNumber')" [class.bg-red-50]="fe('rppsNumber')"/>
              </div>
              <div class="space-y-1">
                <label class="block text-xs font-medium text-gray-700">Spécialisation *</label>
                <select formControlName="specialization"
                        class="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all"
                        [class.border-gray-200]="!fe('specialization')" [class.bg-gray-50]="!fe('specialization')"
                        [class.border-red-300]="fe('specialization')" [class.bg-red-50]="fe('specialization')">
                  <option value="">— Sélectionner —</option>
                  @for (s of specializations; track s.value) {
                    <option [value]="s.value">{{ s.label }}</option>
                  }
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-xs font-medium text-gray-700">Adresse du cabinet</label>
                <input type="text" formControlName="officeAddress"
                       class="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none"/>
              </div>
            }

            <!-- Optional password -->
            <div class="space-y-1">
              <label class="block text-xs font-medium text-gray-700">
                Mot de passe
                <span class="text-gray-400 font-normal">(optionnel — pour vous connecter sans Google)</span>
              </label>
              <input type="password" formControlName="password" placeholder="Min. 8 caractères"
                     class="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none"/>
              @if (fe('password')) {
                <p class="text-xs text-red-500">Le mot de passe doit contenir au moins 8 caractères.</p>
              }
            </div>

            <!-- Server error -->
            @if (serverError()) {
              <div class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                {{ serverError() }}
              </div>
            }

            <!-- Submit -->
            <button type="submit" [disabled]="loading()"
                    class="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2">
              @if (loading()) {
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Création du compte…
              } @else {
                Créer mon compte
              }
            </button>

          </form>
        }

      </div>
    </div>
  `,
})
export class GoogleRegisterComponent implements OnInit {

  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private facade      = inject(AuthFacade);
  private router      = inject(Router);
  private toast       = inject(ToastService);

  step          = signal<'role' | 'form'>('role');
  selectedRole  = signal<'PATIENT' | 'DOCTOR' | ''>('');
  loading       = signal(false);
  serverError   = signal<string | null>(null);
  googleProfile = signal<GoogleUserInfo | null>(null);

  readonly specializations = [
    { value: Specialization.GENERAL_PRACTICE, label: 'Médecine générale' },
    { value: Specialization.CARDIOLOGY,       label: 'Cardiologie' },
    { value: Specialization.DERMATOLOGY,      label: 'Dermatologie' },
    { value: Specialization.PEDIATRICS,       label: 'Pédiatrie' },
    { value: Specialization.NEUROLOGY,        label: 'Neurologie' },
    { value: Specialization.ORTHOPEDICS,      label: 'Orthopédie' },
    { value: Specialization.PSYCHIATRY,       label: 'Psychiatrie' },
    { value: Specialization.RADIOLOGY,        label: 'Radiologie' },
    { value: Specialization.OTHER,            label: 'Autre' },
  ];

  profileForm = this.fb.group({
    firstName:      ['', Validators.required],
    lastName:       ['', Validators.required],
    phone:          [''],
    dateOfBirth:    [''],
    gender:         [''],
    rppsNumber:     [''],
    specialization: [''],
    officeAddress:  [''],
    password:       ['', [Validators.minLength(8)]],
  });

  ngOnInit(): void {
    const profile = history.state?.googleProfile as GoogleUserInfo | undefined;

    if (!profile?.email) {
      this.toast.error('Session Google expirée. Veuillez réessayer.', 'Erreur');
      this.router.navigate(['/auth/login']);
      return;
    }

    this.googleProfile.set(profile);
    this.profileForm.patchValue({
      firstName: profile.firstName ?? '',
      lastName:  profile.lastName  ?? '',
    });
  }

  selectRole(role: 'PATIENT' | 'DOCTOR'): void {
    this.selectedRole.set(role);
    if (role === 'DOCTOR') {
      this.profileForm.get('rppsNumber')?.setValidators(Validators.required);
      this.profileForm.get('specialization')?.setValidators(Validators.required);
    } else {
      this.profileForm.get('rppsNumber')?.clearValidators();
      this.profileForm.get('specialization')?.clearValidators();
    }
    this.profileForm.get('rppsNumber')?.updateValueAndValidity();
    this.profileForm.get('specialization')?.updateValueAndValidity();
  }

  fe(field: string): boolean {
    const ctrl = this.profileForm.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  onSubmit(): void {
    this.profileForm.markAllAsTouched();
    if (this.profileForm.invalid) return;

    const profile = this.googleProfile();
    if (!profile) return;

    const v = this.profileForm.value;
    const payload: GoogleRegisterRequest = {
      email:      profile.email,
      firstName:  v.firstName!,
      lastName:   v.lastName!,
      pictureUrl: profile.pictureUrl,
      googleId:   profile.googleId,
      role:       this.selectedRole() as 'PATIENT' | 'DOCTOR',
      phone:      v.phone ?? undefined,
      password:   v.password ? v.password : undefined,
      dateOfBirth: v.dateOfBirth ?? undefined,
      gender:     v.gender as any ?? undefined,
      rppsNumber:     v.rppsNumber ?? undefined,
      specialization: v.specialization as any ?? undefined,
      officeAddress:  v.officeAddress ?? undefined,
    };

    this.loading.set(true);
    this.serverError.set(null);

    this.authService.googleRegister(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.userType === 'DOCTOR') {
          this.toast.success('Compte créé. En attente de vérification.', 'Inscription');
          this.router.navigate(['/doctor/pending-approval']);
        } else {
          this.facade.finalizeGoogleLogin(res);
          this.toast.success('Bienvenue sur MediConnect !', 'Inscription réussie');
          this.router.navigate(['/patient/profile']);
        }
      },
      error: (err: any) => {
        this.loading.set(false);
        this.serverError.set(err?.error?.message ?? 'Erreur lors de la création du compte.');
      },
    });
  }
}
