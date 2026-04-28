import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { EmergencyContactData, EmergencyContactFormComponent } from '../../app/components/profile/emergency-contact-form/emergency-contact-form.component';
import { MedicalInfoData, MedicalInfoFormComponent } from '../../app/components/profile/medical-info-form/medical-info-form.component';
import { PersonalInfoData, PersonalInfoFormComponent } from '../../app/components/profile/personal-info-form/personal-info-form.component';
import { ProfileHeaderComponent } from '../../app/components/profile/profile-header/profile-header.component';
import { ProfessionalInfoData, ProfessionalInfoFormComponent } from '../../app/components/profile/professional-info-form/professional-info-form.component';
import { SecuritySettingsComponent } from '../../app/components/profile/security-settings/security-settings.component';
import { DoctorStatusBadgeComponent } from '../../app/components/shared/doctor-status-badge/doctor-status-badge.component';
import { AuthFacade } from '../../core/services/auth.facade';
import { UserService } from '../../core/services/user.service';
import { AnyUser, Doctor, Patient, isDoctor, isPatient } from '../../core/user';
import { ToastService } from '../auth/toast/toast.service';

type ProfileSection =
  | 'personal-info'
  | 'medical-info'
  | 'emergency-contact'
  | 'professional-info'
  | 'security'
  | 'photo';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ProfileHeaderComponent,
    PersonalInfoFormComponent,
    MedicalInfoFormComponent,
    EmergencyContactFormComponent,
    SecuritySettingsComponent,
    ProfessionalInfoFormComponent,
    DoctorStatusBadgeComponent,
  ],
  template: `
    <div class="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-stone-900">Mon profil</h1>
        <p class="text-sm text-stone-500 mt-0.5">Gérer vos informations et paramètres</p>
      </div>

      @if (loading()) {
        <div class="text-sm text-stone-500 py-12 text-center">Chargement...</div>
      }

      @if (!loading() && user()) {
        <div class="flex rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden"
             style="min-height: 600px">

          <!-- ── Sidebar ────────────────────────────────────────────────────── -->
          <aside class="w-[240px] flex-shrink-0 border-r border-stone-100 bg-stone-50/60 py-4">

            <!-- Profil group -->
            <div class="px-3 mb-1">
              <p class="text-[11px] font-bold uppercase tracking-widest text-stone-400 px-2 pb-2">Profil</p>
              <button type="button"
                      (click)="activeSection.set('personal-info')"
                      [ngClass]="navClass('personal-info')">
                Informations personnelles
              </button>
              @if (isPatientProfile()) {
                <button type="button"
                        (click)="activeSection.set('medical-info')"
                        [ngClass]="navClass('medical-info')">
                  Informations médicales
                </button>
                <button type="button"
                        (click)="activeSection.set('emergency-contact')"
                        [ngClass]="navClass('emergency-contact')">
                  Contact d'urgence
                </button>
              }
              @if (isDoctorProfile()) {
                <button type="button"
                        (click)="activeSection.set('emergency-contact')"
                        [ngClass]="navClass('emergency-contact')">
                  Contact d'urgence
                </button>
              }
            </div>

            <!-- Professionnel group (doctor only) -->
            @if (isDoctorProfile()) {
              <div class="px-3 mt-5 mb-1">
                <p class="text-[11px] font-bold uppercase tracking-widest text-stone-400 px-2 pb-2">Professionnel</p>
                <button type="button"
                        (click)="activeSection.set('professional-info')"
                        [ngClass]="navClass('professional-info')">
                  Informations professionnelles
                </button>
              </div>
            }

            <!-- Sécurité group -->
            <div class="px-3 mt-5 mb-1">
              <p class="text-[11px] font-bold uppercase tracking-widest text-stone-400 px-2 pb-2">Sécurité</p>
              <button type="button"
                      (click)="activeSection.set('security')"
                      [ngClass]="navClass('security')">
                Mot de passe & Authentification
              </button>
            </div>

            <!-- Compte group -->
            <div class="px-3 mt-5 mb-1">
              <p class="text-[11px] font-bold uppercase tracking-widest text-stone-400 px-2 pb-2">Compte</p>
              <button type="button"
                      (click)="activeSection.set('photo')"
                      [ngClass]="navClass('photo')">
                Photo de profil
              </button>
            </div>

          </aside>

          <!-- ── Content area ───────────────────────────────────────────────── -->
          <main class="flex-1 p-8 min-w-0 overflow-auto">

            @if (activeSection() === 'personal-info') {
              <div class="max-w-[600px]">
                <h2 class="text-xl font-bold text-stone-900 mb-1">Informations personnelles</h2>
                <p class="text-sm text-stone-500 mb-6">Vos coordonnées et informations de base</p>
                @if (isPatientProfile()) {
                  <app-personal-info-form
                    [data]="patientPersonalData()"
                    [saving]="saving()"
                    [showDateOfBirth]="true"
                    (save)="onSavePatientPersonal($event)" />
                } @else if (isDoctorProfile()) {
                  <app-personal-info-form
                    [data]="doctorPersonalData()"
                    [saving]="saving()"
                    [showDateOfBirth]="false"
                    (save)="onSaveDoctorPersonal($event)" />
                }
              </div>
            }

            @if (activeSection() === 'medical-info' && isPatientProfile()) {
              <div class="max-w-[600px]">
                <h2 class="text-xl font-bold text-stone-900 mb-1">Informations médicales</h2>
                <p class="text-sm text-stone-500 mb-6">Votre groupe sanguin et allergies connues</p>
                <app-medical-info-form
                  [data]="patientMedicalData()"
                  [saving]="saving()"
                  (save)="onSavePatientMedical($event)" />
              </div>
            }

            @if (activeSection() === 'emergency-contact') {
              <div class="max-w-[600px]">
                <h2 class="text-xl font-bold text-stone-900 mb-1">Contact d'urgence</h2>
                <p class="text-sm text-stone-500 mb-6">Personne à contacter en cas d'urgence médicale</p>
                @if (isPatientProfile()) {
                  <app-emergency-contact-form
                    [data]="patientEmergencyData()"
                    [saving]="saving()"
                    (save)="onSavePatientEmergency($event)" />
                } @else if (isDoctorProfile()) {
                  <app-emergency-contact-form
                    [data]="doctorEmergencyData()"
                    [saving]="saving()"
                    (save)="onSaveDoctorEmergency($event)" />
                }
              </div>
            }

            @if (activeSection() === 'professional-info' && isDoctorProfile()) {
              <div class="max-w-[600px]">
                <div class="flex items-start justify-between gap-3 mb-1">
                  <h2 class="text-xl font-bold text-stone-900">Informations professionnelles</h2>
                  <app-doctor-status-badge [status]="doctor()?.verificationStatus" />
                </div>
                <p class="text-sm text-stone-500 mb-6">Vos coordonnées professionnelles et disponibilités</p>
                <app-professional-info-form
                  [data]="doctorProfessionalData()"
                  [rppsNumber]="doctor()?.rppsNumber"
                  [saving]="saving()"
                  (save)="onSaveDoctorProfessional($event)" />
              </div>
            }

            @if (activeSection() === 'security') {
              <div class="max-w-[700px]">
                <h2 class="text-xl font-bold text-stone-900 mb-1">Sécurité</h2>
                <p class="text-sm text-stone-500 mb-6">Gérer votre mot de passe et les méthodes d'authentification</p>
                <app-security-settings
                  [email]="user()!.email"
                  [twoFactorEnabled]="user()!.twoFactorEnabled ?? false"
                  [initialFaceEnabled]="user()!.faceEnabled ?? false"
                  [initialFaceEnrolled]="user()!.faceEnrolled ?? false" />
              </div>
            }

            @if (activeSection() === 'photo') {
              <div class="max-w-[500px]">
                <h2 class="text-xl font-bold text-stone-900 mb-1">Photo de profil</h2>
                <p class="text-sm text-stone-500 mb-6">Votre photo est visible par les médecins et patients</p>
                <app-profile-header
                  [photoUrl]="isPatientProfile() ? patient()?.profilePicture : doctor()?.profilePicture"
                  [initials]="isPatientProfile() ? 'PT' : 'DR'"
                  (photoUploaded)="onPhotoUploaded($event)" />
              </div>
            }

          </main>
        </div>
      }
    </div>
  `,
})
export class ProfileComponent {
  private auth        = inject(AuthFacade);
  private route       = inject(ActivatedRoute);
  private userService = inject(UserService);
  private toast       = inject(ToastService);

  loading       = signal(true);
  saving        = signal(false);
  user          = signal<AnyUser | null>(null);
  patient       = signal<Patient | null>(null);
  doctor        = signal<Doctor | null>(null);
  activeSection = signal<ProfileSection>('personal-info');

  patientPersonalData    = signal<PersonalInfoData | null>(null);
  patientMedicalData     = signal<MedicalInfoData | null>(null);
  patientEmergencyData   = signal<EmergencyContactData | null>(null);
  doctorPersonalData     = signal<PersonalInfoData | null>(null);
  doctorEmergencyData    = signal<EmergencyContactData | null>(null);
  doctorProfessionalData = signal<ProfessionalInfoData | null>(null);

  constructor() {
    const requestedSection = this.route.snapshot.queryParamMap.get('section');
    if (this.isProfileSection(requestedSection)) {
      this.activeSection.set(requestedSection);
    }
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.auth.refreshCurrentUser().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: u => { this.user.set(u); this.populateData(u); },
      error: () => this.toast.error('Impossible de charger votre profil.'),
    });
  }

  navClass(section: string): Record<string, boolean> {
    const active = this.activeSection() === section;
    return {
      'w-full': true,
      'text-left': true,
      'px-3': true,
      'py-2.5': true,
      'text-sm': true,
      'rounded-lg': true,
      'transition-colors': true,
      'cursor-pointer': true,
      'border-l-2': true,
      'bg-teal-50': active,
      'text-teal-700': active,
      'font-medium': active,
      'border-teal-500': active,
      'border-transparent': !active,
      'text-stone-600': !active,
    };
  }

  private populateData(u: AnyUser): void {
    if (isPatient(u)) {
      const p = u as Patient;
      this.patient.set(p);
      this.doctor.set(null);
      this.patientPersonalData.set({
        firstName: p.firstName, lastName: p.lastName,
        phone: p.phone, dateOfBirth: p.dateOfBirth, gender: p.gender, address: p.address,
      });
      this.patientMedicalData.set({ bloodType: p.bloodType, allergies: p.allergies });
      this.patientEmergencyData.set({
        emergencyContactName: p.emergencyContactName,
        emergencyContactPhone: p.emergencyContactPhone,
      });
    } else if (isDoctor(u)) {
      const d = u as Doctor;
      this.doctor.set(d);
      this.patient.set(null);
      this.doctorPersonalData.set({
        firstName: d.firstName, lastName: d.lastName, phone: d.phone, address: d.address,
      });
      this.doctorEmergencyData.set({
        emergencyContactName: (d as any).emergencyContactName,
        emergencyContactPhone: (d as any).emergencyContactPhone,
      });
      this.doctorProfessionalData.set({
        specialization: d.specialization, licenseNumber: d.licenseNumber,
        consultationDuration: d.consultationDuration, consultationFee: d.consultationFee,
        officeAddress: d.officeAddress,
      });
    }
  }

  onPhotoUploaded(url: string): void {
    const u = this.user();
    if (!u) return;
    this.saving.set(true);
    const update$: Observable<AnyUser> = isPatient(u)
      ? this.userService.updatePatientProfile(u.id, { profilePicture: url })
      : this.userService.updateDoctorProfile(u.id, { profilePicture: url });
    update$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (updated: AnyUser) => { this.toast.success('Photo mise à jour'); this.user.set(updated); this.populateData(updated); },
      error: (err: any)        => this.toast.error(this.extractErrorMessage(err)),
    });
  }

  onSavePatientPersonal(data: PersonalInfoData): void {
    this.savePatient(data, 'Informations personnelles mises à jour');
  }

  onSavePatientMedical(data: MedicalInfoData): void {
    this.savePatient(data, 'Informations médicales mises à jour');
  }

  onSavePatientEmergency(data: EmergencyContactData): void {
    this.savePatient(data, "Contact d'urgence mis à jour");
  }

  private savePatient(payload: Record<string, any>, successMsg: string): void {
    const u = this.user() as Patient | null;
    if (!u) return;
    this.saving.set(true);
    this.userService.updatePatientProfile(u.id, payload).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: updated => { this.toast.success(successMsg); this.user.set(updated); this.populateData(updated); },
      error: err    => this.toast.error(this.extractErrorMessage(err)),
    });
  }

  onSaveDoctorPersonal(data: PersonalInfoData): void {
    this.saveDoctor(data, 'Profil mis à jour');
  }

  onSaveDoctorEmergency(data: EmergencyContactData): void {
    this.saveDoctor(data, "Contact d'urgence mis à jour");
  }

  onSaveDoctorProfessional(data: ProfessionalInfoData): void {
    this.saveDoctor(data, 'Informations professionnelles mises à jour');
  }

  private saveDoctor(payload: Record<string, any>, successMsg: string): void {
    const u = this.user() as Doctor | null;
    if (!u) return;
    this.saving.set(true);
    this.userService.updateDoctorProfile(u.id, payload).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: updated => { this.toast.success(successMsg); this.user.set(updated); this.populateData(updated); },
      error: err    => this.toast.error(this.extractErrorMessage(err)),
    });
  }

  isDoctorProfile():  boolean { return !!this.user() && isDoctor(this.user()!); }
  isPatientProfile(): boolean { return !!this.user() && isPatient(this.user()!); }

  private isProfileSection(value: string | null): value is ProfileSection {
    return value === 'personal-info'
      || value === 'medical-info'
      || value === 'emergency-contact'
      || value === 'professional-info'
      || value === 'security'
      || value === 'photo';
  }

  private extractErrorMessage(err: any): string {
    if (err?.status === 0)   return 'Erreur de connexion, veuillez réessayer';
    if (err?.status === 403) return 'Accès refusé';
    const message = err?.error?.message;
    if (typeof message === 'string' && message.trim()) return message;
    return 'Erreur serveur, veuillez réessayer plus tard';
  }
}
