import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import { EmergencyContactData, EmergencyContactFormComponent } from '../../app/components/profile/emergency-contact-form/emergency-contact-form.component';
import { MedicalInfoData, MedicalInfoFormComponent } from '../../app/components/profile/medical-info-form/medical-info-form.component';
import { PersonalInfoData, PersonalInfoFormComponent } from '../../app/components/profile/personal-info-form/personal-info-form.component';
import { ProfileHeaderComponent } from '../../app/components/profile/profile-header/profile-header.component';
import { ProfessionalInfoData, ProfessionalInfoFormComponent } from '../../app/components/profile/professional-info-form/professional-info-form.component';
import { SecuritySettingsComponent } from '../../app/components/profile/security-settings/security-settings.component';
import { AuthFacade } from '../../core/services/auth.facade';
import { UserService } from '../../core/services/user.service';
import { AnyUser, Doctor, Patient, isDoctor, isPatient } from '../../core/user';
import { ToastService } from '../auth/toast/toast.service';

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
  ],
  template: `
    <div class="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-stone-900">Mon profil</h1>
        <p class="text-sm text-stone-500 mt-0.5">Mettre à jour vos informations</p>
      </div>

      <div *ngIf="loading()" class="text-sm text-stone-500">Chargement...</div>

      <div *ngIf="!loading() && user() as u">
        @if (isPatientProfile()) {
          <div class="space-y-4">
            <app-profile-header
              [photoUrl]="patient()?.profilePicture"
              initials="MC"
              (photoUploaded)="onPhotoUploaded($event)" />

            <app-personal-info-form
              [data]="patientPersonalData()"
              [saving]="saving()"
              [showDateOfBirth]="true"
              (save)="onSavePatientPersonal($event)" />

            <app-medical-info-form
              [data]="patientMedicalData()"
              [saving]="saving()"
              (save)="onSavePatientMedical($event)" />

            <app-emergency-contact-form
              [data]="patientEmergencyData()"
              [saving]="saving()"
              (save)="onSavePatientEmergency($event)" />

            <app-security-settings [email]="u.email" />
          </div>
        } @else if (isDoctorProfile()) {
          <div class="flex items-center gap-2 mb-4">
            <button type="button" (click)="doctorTab.set('personal')"
                    class="px-4 py-2 rounded-xl text-sm font-semibold"
                    [class.bg-teal-600]="doctorTab() === 'personal'"
                    [class.text-white]="doctorTab() === 'personal'"
                    [class.bg-white]="doctorTab() !== 'personal'"
                    [class.text-stone-800]="doctorTab() !== 'personal'"
                    [class.border]="doctorTab() !== 'personal'"
                    [class.border-stone-200]="doctorTab() !== 'personal'">
              Informations personnelles
            </button>
            <button type="button" (click)="doctorTab.set('professional')"
                    class="px-4 py-2 rounded-xl text-sm font-semibold"
                    [class.bg-teal-600]="doctorTab() === 'professional'"
                    [class.text-white]="doctorTab() === 'professional'"
                    [class.bg-white]="doctorTab() !== 'professional'"
                    [class.text-stone-800]="doctorTab() !== 'professional'"
                    [class.border]="doctorTab() !== 'professional'"
                    [class.border-stone-200]="doctorTab() !== 'professional'">
              Informations professionnelles
            </button>
          </div>

          @if (doctorTab() === 'personal') {
            <div class="space-y-4">
              <app-profile-header
                [photoUrl]="doctor()?.profilePicture"
                initials="DR"
                (photoUploaded)="onPhotoUploaded($event)" />

              <app-personal-info-form
                [data]="doctorPersonalData()"
                [saving]="saving()"
                [showDateOfBirth]="false"
                (save)="onSaveDoctorPersonal($event)" />

              <app-emergency-contact-form
                [data]="doctorEmergencyData()"
                [saving]="saving()"
                (save)="onSaveDoctorEmergency($event)" />
            </div>
          } @else {
            <app-professional-info-form
              [data]="doctorProfessionalData()"
              [rppsNumber]="doctor()?.rppsNumber"
              [verificationStatus]="doctor()?.verificationStatus"
              [saving]="saving()"
              (save)="onSaveDoctorProfessional($event)" />
          }
        }
      </div>
    </div>
  `,
})
export class ProfileComponent {
  private auth        = inject(AuthFacade);
  private userService = inject(UserService);
  private toast       = inject(ToastService);

  loading   = signal(true);
  saving    = signal(false);
  user      = signal<AnyUser | null>(null);
  patient   = signal<Patient | null>(null);
  doctor    = signal<Doctor | null>(null);
  doctorTab = signal<'personal' | 'professional'>('personal');

  patientPersonalData  = signal<PersonalInfoData | null>(null);
  patientMedicalData   = signal<MedicalInfoData | null>(null);
  patientEmergencyData = signal<EmergencyContactData | null>(null);
  doctorPersonalData   = signal<PersonalInfoData | null>(null);
  doctorEmergencyData  = signal<EmergencyContactData | null>(null);
  doctorProfessionalData = signal<ProfessionalInfoData | null>(null);

  constructor() { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.auth.refreshCurrentUser().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: u => { this.user.set(u); this.populateData(u); },
      error: () => this.toast.error('Impossible de charger votre profil.'),
    });
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
    this.savePatient(data, 'Contact d\'urgence mis à jour');
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
    this.saveDoctor(data, 'Contact d\'urgence mis à jour');
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

  private extractErrorMessage(err: any): string {
    if (err?.status === 0)   return 'Erreur de connexion, veuillez réessayer';
    if (err?.status === 403) return 'Accès refusé';
    const message = err?.error?.message;
    if (typeof message === 'string' && message.trim()) return message;
    return 'Erreur serveur, veuillez réessayer plus tard';
  }
}
