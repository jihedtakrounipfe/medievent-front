import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ImageUploadComponent } from '../../app/components/image-upload/image-upload.component';
import { PhoneInputComponent } from '../../app/components/phone-input/phone-input.component';
import { AuthFacade } from '../../core/services/auth.facade';
import { UserService } from '../../core/services/user.service';
import { AnyUser, Doctor, Gender, Patient, Specialization, VerificationStatus, isDoctor, isPatient } from '../../core/user';
import { ToastService } from '../auth/toast/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImageUploadComponent, PhoneInputComponent],
  template: `
    <div class="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-stone-900">Mon profil</h1>
        <p class="text-sm text-stone-500 mt-0.5">Mettre à jour vos informations</p>
      </div>

      <div *ngIf="loading()" class="text-sm text-stone-500">Chargement...</div>

      <div *ngIf="!loading() && user() as u">
        @if (isPatientProfile()) {
          <form [formGroup]="patientForm" (ngSubmit)="savePatient()" class="space-y-4">
            <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-5">
              <h2 class="text-base font-bold text-stone-900">Photo de profil</h2>
              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div class="flex items-center gap-4">
                  <div class="w-16 h-16 rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden flex items-center justify-center">
                    <img *ngIf="patientForm.value.profilePicture" [src]="patientForm.value.profilePicture" alt="" class="w-full h-full object-cover">
                    <span *ngIf="!patientForm.value.profilePicture" class="text-sm font-bold text-stone-600">MC</span>
                  </div>
                  <div class="text-sm text-stone-700">
                    <div class="font-semibold">Photo actuelle</div>
                    <div class="text-xs text-stone-500">JPG/PNG, max 5MB</div>
                  </div>
                </div>
                <app-image-upload (uploaded)="onProfilePictureUploaded($event)" />
              </div>
            </div>

            <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-5">
              <h2 class="text-base font-bold text-stone-900">Informations personnelles</h2>
              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Prénom</label>
                  <input class="field-input" formControlName="firstName" type="text">
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Nom</label>
                  <input class="field-input" formControlName="lastName" type="text">
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Numéro de téléphone</label>
                  <app-phone-input formControlName="phone" />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Date de naissance</label>
                  <input class="field-input" formControlName="dateOfBirth" type="date">
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Genre</label>
                  <select class="field-input" formControlName="gender">
                    <option value="">—</option>
                    <option [value]="Gender.MALE">Homme</option>
                    <option [value]="Gender.FEMALE">Femme</option>
                    <option [value]="Gender.OTHER">Autre</option>
                    <option [value]="Gender.PREFER_NOT_TO_SAY">Préfère ne pas dire</option>
                  </select>
                </div>
                <div class="space-y-1.5 md:col-span-2">
                  <label class="block text-xs font-medium text-stone-700">Adresse</label>
                  <input class="field-input" formControlName="address" type="text">
                </div>
              </div>
            </div>

            <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-5">
              <h2 class="text-base font-bold text-stone-900">Informations médicales</h2>
              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Groupe sanguin</label>
                  <select class="field-input" formControlName="bloodType">
                    <option value="">—</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                  </select>
                </div>
                <div class="space-y-1.5 md:col-span-2">
                  <label class="block text-xs font-medium text-stone-700">Allergies</label>
                  <textarea class="field-input" rows="3" formControlName="allergies"></textarea>
                </div>
              </div>
            </div>

            <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-5">
              <h2 class="text-base font-bold text-stone-900">Contact d'urgence</h2>
              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Nom du contact d'urgence</label>
                  <input class="field-input" formControlName="emergencyContactName" type="text">
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Téléphone du contact d'urgence</label>
                  <app-phone-input formControlName="emergencyContactPhone" />
                </div>
              </div>
            </div>

            <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-5">
              <h2 class="text-base font-bold text-stone-900">Sécurité</h2>
              <div class="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div class="text-sm text-stone-700">Adresse e-mail</div>
                  <div class="text-sm font-semibold text-stone-900">{{ u.email }}</div>
                </div>
                <button type="button" (click)="openKeycloakAccount()"
                        class="px-4 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-800">
                  Changer le mot de passe
                </button>
              </div>
            </div>

            <div class="flex items-center justify-end">
              <button type="submit" [disabled]="saving() || patientForm.invalid || patientForm.pristine"
                      class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2">
                <svg *ngIf="saving()" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Enregistrer les modifications
              </button>
            </div>
          </form>
        } @else if (isDoctorProfile()) {
          <div class="flex items-center gap-2 mb-4">
            <button type="button" (click)="doctorTab.set('personal')" class="px-4 py-2 rounded-xl text-sm font-semibold"
                    [class.bg-teal-600]="doctorTab() === 'personal'" [class.text-white]="doctorTab() === 'personal'"
                    [class.bg-white]="doctorTab() !== 'personal'" [class.text-stone-800]="doctorTab() !== 'personal'"
                    [class.border]="doctorTab() !== 'personal'" [class.border-stone-200]="doctorTab() !== 'personal'">
              Informations personnelles
            </button>
            <button type="button" (click)="doctorTab.set('professional')" class="px-4 py-2 rounded-xl text-sm font-semibold"
                    [class.bg-teal-600]="doctorTab() === 'professional'" [class.text-white]="doctorTab() === 'professional'"
                    [class.bg-white]="doctorTab() !== 'professional'" [class.text-stone-800]="doctorTab() !== 'professional'"
                    [class.border]="doctorTab() !== 'professional'" [class.border-stone-200]="doctorTab() !== 'professional'">
              Informations professionnelles
            </button>
          </div>

          <form *ngIf="doctorTab() === 'personal'" [formGroup]="doctorPersonalForm" (ngSubmit)="saveDoctorPersonal()" class="space-y-4">
            <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-5">
              <h2 class="text-base font-bold text-stone-900">Photo de profil</h2>
              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div class="flex items-center gap-4">
                  <div class="w-16 h-16 rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden flex items-center justify-center">
                    <img *ngIf="doctorPersonalForm.value.profilePicture" [src]="doctorPersonalForm.value.profilePicture" alt="" class="w-full h-full object-cover">
                    <span *ngIf="!doctorPersonalForm.value.profilePicture" class="text-sm font-bold text-stone-600">DR</span>
                  </div>
                  <div class="text-sm text-stone-700">
                    <div class="font-semibold">Photo actuelle</div>
                    <div class="text-xs text-stone-500">JPG/PNG, max 5MB</div>
                  </div>
                </div>
                <app-image-upload (uploaded)="onProfilePictureUploaded($event)" />
              </div>
            </div>

            <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-5">
              <h2 class="text-base font-bold text-stone-900">Informations personnelles</h2>
              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Prénom</label>
                  <input class="field-input" formControlName="firstName" type="text">
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Nom</label>
                  <input class="field-input" formControlName="lastName" type="text">
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Numéro de téléphone</label>
                  <app-phone-input formControlName="phone" />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Adresse personnelle</label>
                  <input class="field-input" formControlName="address" type="text">
                </div>
              </div>
            </div>

            <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-5">
              <h2 class="text-base font-bold text-stone-900">Contact d'urgence</h2>
              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Nom du contact d'urgence</label>
                  <input class="field-input" formControlName="emergencyContactName" type="text">
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Téléphone du contact d'urgence</label>
                  <app-phone-input formControlName="emergencyContactPhone" />
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end">
              <button type="submit" [disabled]="saving() || doctorPersonalForm.invalid || doctorPersonalForm.pristine"
                      class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2">
                <svg *ngIf="saving()" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Enregistrer les modifications
              </button>
            </div>
          </form>

          <form *ngIf="doctorTab() === 'professional'" [formGroup]="doctorProfessionalForm" (ngSubmit)="saveDoctorProfessional()" class="space-y-4">
            <div class="rounded-3xl border border-stone-200 bg-white shadow-sm p-5">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="text-base font-bold text-stone-900">Informations professionnelles</h2>
                  <p class="text-sm text-stone-500 mt-1">Statut :
                    <span class="font-semibold" [ngClass]="verificationBadgeClass(doctor()?.verificationStatus)">
                      {{ verificationLabel(doctor()?.verificationStatus) }}
                    </span>
                  </p>
                </div>
              </div>

              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Numéro RPPS (lecture seule)</label>
                  <div class="field-input bg-stone-50 text-stone-700">{{ doctor()?.rppsNumber }}</div>
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Spécialisation</label>
                  <select class="field-input" formControlName="specialization">
                    <option value="">—</option>
                    <option [value]="Specialization.GENERAL_PRACTICE">Médecine générale</option>
                    <option [value]="Specialization.CARDIOLOGY">Cardiologie</option>
                    <option [value]="Specialization.DERMATOLOGY">Dermatologie</option>
                    <option [value]="Specialization.PEDIATRICS">Pédiatrie</option>
                    <option [value]="Specialization.NEUROLOGY">Neurologie</option>
                    <option [value]="Specialization.ORTHOPEDICS">Orthopédie</option>
                    <option [value]="Specialization.PSYCHIATRY">Psychiatrie</option>
                    <option [value]="Specialization.RADIOLOGY">Radiologie</option>
                    <option [value]="Specialization.OTHER">Autre</option>
                  </select>
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Numéro d'ordre</label>
                  <input class="field-input" formControlName="licenseNumber" type="text">
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Durée de consultation (minutes)</label>
                  <input class="field-input" formControlName="consultationDuration" type="number" min="10" max="120">
                </div>
                <div class="space-y-1.5">
                  <label class="block text-xs font-medium text-stone-700">Tarif de consultation (TND)</label>
                  <input class="field-input" formControlName="consultationFee" type="number" min="0" step="0.001">
                </div>
                <div class="space-y-1.5 md:col-span-2">
                  <label class="block text-xs font-medium text-stone-700">Adresse du cabinet</label>
                  <input class="field-input" formControlName="officeAddress" type="text">
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end">
              <button type="submit" [disabled]="saving() || doctorProfessionalForm.invalid || doctorProfessionalForm.pristine"
                      class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2">
                <svg *ngIf="saving()" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Enregistrer les modifications
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    .field-input {
      @apply w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white
             text-sm text-stone-900 placeholder-stone-400 outline-none transition-all
             focus:border-teal-500 focus:ring-2 focus:ring-teal-200;
    }
    select.field-input { @apply appearance-none; }
  `],
})
export class ProfileComponent {
  private auth = inject(AuthFacade);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  loading = signal(true);
  saving = signal(false);
  user = signal<AnyUser | null>(null);
  patient = signal<Patient | null>(null);
  doctor = signal<Doctor | null>(null);
  doctorTab = signal<'personal' | 'professional'>('personal');

  Gender = Gender;
  Specialization = Specialization;

  patientForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    dateOfBirth: ['', [Validators.required]],
    gender: [''],
    address: [''],
    bloodType: [''],
    allergies: [''],
    emergencyContactName: [''],
    emergencyContactPhone: [''],
    profilePicture: [''],
  });

  doctorPersonalForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    address: [''],
    emergencyContactName: [''],
    emergencyContactPhone: [''],
    profilePicture: [''],
  });

  doctorProfessionalForm = this.fb.group({
    specialization: [''],
    licenseNumber: [''],
    consultationDuration: [30],
    consultationFee: [null as number | null],
    officeAddress: [''],
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.auth.refreshCurrentUser().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: u => {
        this.user.set(u);
        this.patchForms(u);
      },
      error: () => this.toast.error('Impossible de charger votre profil.'),
    });
  }

  private patchForms(u: AnyUser): void {
    if (isPatient(u)) {
      const p = u as Patient;
      this.patient.set(p);
      this.doctor.set(null);
      this.patientForm.reset({
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        phone: p.phone || '',
        dateOfBirth: p.dateOfBirth || '',
        gender: p.gender || '',
        address: p.address || '',
        bloodType: p.bloodType || '',
        allergies: p.allergies || '',
        emergencyContactName: p.emergencyContactName || '',
        emergencyContactPhone: p.emergencyContactPhone || '',
        profilePicture: p.profilePicture || '',
      }, { emitEvent: false });
      this.patientForm.markAsPristine();
      return;
    }

    if (isDoctor(u)) {
      const d = u as Doctor;
      this.doctor.set(d);
      this.patient.set(null);
      this.doctorPersonalForm.reset({
        firstName: d.firstName || '',
        lastName: d.lastName || '',
        phone: d.phone || '',
        address: d.address || '',
        emergencyContactName: d.emergencyContactName || '',
        emergencyContactPhone: d.emergencyContactPhone || '',
        profilePicture: d.profilePicture || '',
      }, { emitEvent: false });
      this.doctorPersonalForm.markAsPristine();

      this.doctorProfessionalForm.reset({
        specialization: d.specialization || '',
        licenseNumber: d.licenseNumber || '',
        consultationDuration: d.consultationDuration ?? 30,
        consultationFee: d.consultationFee ?? null,
        officeAddress: d.officeAddress || '',
      }, { emitEvent: false });
      this.doctorProfessionalForm.markAsPristine();
    }
  }

  onProfilePictureUploaded(url: string): void {
    if (!url) return;
    if (this.isPatientProfile()) this.patientForm.patchValue({ profilePicture: url });
    if (this.isDoctorProfile()) this.doctorPersonalForm.patchValue({ profilePicture: url });
  }

  savePatient(): void {
    const u = this.user() as Patient | null;
    if (!u) return;
    if (this.patientForm.invalid || this.patientForm.pristine) return;

    this.saving.set(true);
    const v = this.patientForm.value;
    this.userService.updatePatientProfile(u.id, {
      firstName: v.firstName ?? undefined,
      lastName: v.lastName ?? undefined,
      phone: (v.phone || '').trim() || undefined,
      dateOfBirth: v.dateOfBirth ?? undefined,
      gender: (v.gender || '').toString() || undefined,
      bloodType: (v.bloodType || '').trim() || undefined,
      allergies: (v.allergies || '').trim() || undefined,
      address: (v.address || '').trim() || undefined,
      emergencyContactName: (v.emergencyContactName || '').trim() || undefined,
      emergencyContactPhone: (v.emergencyContactPhone || '').trim() || undefined,
      profilePicture: (v.profilePicture || '').trim() || undefined,
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: updated => {
        this.toast.success('Profil mis à jour avec succès');
        this.auth.refreshCurrentUser().subscribe();
        this.user.set(updated);
        this.patchForms(updated);
      },
      error: err => this.toast.error(this.extractErrorMessage(err)),
    });
  }

  saveDoctorPersonal(): void {
    const u = this.user() as Doctor | null;
    if (!u) return;
    if (this.doctorPersonalForm.invalid || this.doctorPersonalForm.pristine) return;

    this.saving.set(true);
    const v = this.doctorPersonalForm.value;
    this.userService.updateDoctorProfile(u.id, {
      firstName: v.firstName ?? undefined,
      lastName: v.lastName ?? undefined,
      phone: (v.phone || '').trim() || undefined,
      address: (v.address || '').trim() || undefined,
      profilePicture: (v.profilePicture || '').trim() || undefined,
      emergencyContactName: (v.emergencyContactName || '').trim() || undefined,
      emergencyContactPhone: (v.emergencyContactPhone || '').trim() || undefined,
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: updated => {
        this.toast.success('Profil mis à jour avec succès');
        this.auth.refreshCurrentUser().subscribe();
        this.user.set(updated);
        this.patchForms(updated);
      },
      error: err => this.toast.error(this.extractErrorMessage(err)),
    });
  }

  saveDoctorProfessional(): void {
    const u = this.user() as Doctor | null;
    if (!u) return;
    if (this.doctorProfessionalForm.invalid || this.doctorProfessionalForm.pristine) return;

    this.saving.set(true);
    const v = this.doctorProfessionalForm.value;
    this.userService.updateDoctorProfile(u.id, {
      specialization: v.specialization ? String(v.specialization) : undefined,
      licenseNumber: (v.licenseNumber || '').trim() || undefined,
      consultationDuration: v.consultationDuration == null ? undefined : Number(v.consultationDuration),
      consultationFee: v.consultationFee == null ? undefined : Number(v.consultationFee),
      officeAddress: (v.officeAddress || '').trim() || undefined,
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: updated => {
        this.toast.success('Profil mis à jour avec succès');
        this.auth.refreshCurrentUser().subscribe();
        this.user.set(updated);
        this.patchForms(updated);
      },
      error: err => this.toast.error(this.extractErrorMessage(err)),
    });
  }

  isDoctorProfile(): boolean {
    const u = this.user();
    return !!u && isDoctor(u);
  }

  isPatientProfile(): boolean {
    const u = this.user();
    return !!u && isPatient(u);
  }

  verificationLabel(status?: VerificationStatus): string {
    if (status === 'PENDING') return 'En attente de vérification';
    if (status === 'APPROVED') return 'Vérifié';
    if (status === 'REJECTED') return 'Refusé';
    if (status === 'SUSPENDED') return 'Suspendu';
    return '—';
  }

  verificationBadgeClass(status?: VerificationStatus): string {
    if (status === 'PENDING') return 'text-amber-800';
    if (status === 'APPROVED') return 'text-emerald-700';
    if (status === 'REJECTED') return 'text-rose-700';
    if (status === 'SUSPENDED') return 'text-stone-700';
    return 'text-stone-700';
  }

  openKeycloakAccount(): void {
    window.open('http://localhost:9090/realms/mediconnect-main/account/', '_blank');
  }

  private extractErrorMessage(err: any): string {
    if (err?.status === 0) return 'Erreur de connexion, veuillez réessayer';
    if (err?.status === 403) return 'Accès refusé';
    const message = err?.error?.message;
    if (typeof message === 'string' && message.trim()) return message;
    return 'Erreur serveur, veuillez réessayer plus tard';
  }
}
