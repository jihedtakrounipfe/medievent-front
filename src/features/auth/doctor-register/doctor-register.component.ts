import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PersonalStepData, DoctorPersonalStepComponent } from '../../../app/components/auth/doctor-personal-step/doctor-personal-step.component';
import { ProfessionalStepData, DoctorProfessionalStepComponent } from '../../../app/components/auth/doctor-professional-step/doctor-professional-step.component';
import { ImageUploadComponent } from '../../../app/components/image-upload/image-upload.component';
import { FileUploadService } from '../../../app/services/file-upload.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { Gender, Specialization } from '../../../core/user';
import { ToastService } from '../toast/toast.service';
import { finalize, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-doctor-register',
  standalone: true,
  imports: [CommonModule, ImageUploadComponent, DoctorPersonalStepComponent, DoctorProfessionalStepComponent],
  template: `
    <div class="w-full">
      <div class="mb-4">
        <h2 class="text-2xl font-bold text-stone-900 tracking-tight">Créer un compte médecin</h2>
        <p class="text-sm text-stone-500 mt-1">Inscription professionnelle</p>
      </div>

      <div class="flex items-center justify-between mb-4">
        <div class="text-sm font-semibold text-stone-700">Étape {{ step() }} sur 2</div>
        <div class="flex items-center gap-2">
          <div class="w-16 h-1.5 rounded-full" [class.bg-teal-500]="step() >= 1" [class.bg-stone-200]="step() < 1"></div>
          <div class="w-16 h-1.5 rounded-full" [class.bg-teal-500]="step() >= 2" [class.bg-stone-200]="step() < 2"></div>
        </div>
      </div>

      <div class="space-y-3.5">
        <app-image-upload
          (selected)="selectedFile.set($event)"
          (uploaded)="uploadedUrl.set($event)" />

        @if (step() === 1) {
          <app-doctor-personal-step (next)="onPersonalNext($event)" />
        } @else {
          <app-doctor-professional-step
            [loading]="loading()"
            (submit)="onProfessionalSubmit($event)"
            (back)="step.set(1)" />
        }

        <p class="text-center text-xs text-stone-500">
          Vous avez déjà un compte ?
          <button type="button" (click)="goToLogin.emit()"
            class="text-teal-700 hover:text-teal-800 font-semibold ml-1 cursor-pointer">
            Se connecter
          </button>
        </p>
      </div>
    </div>
  `,
})
export class DoctorRegisterComponent {
  @Output() success              = new EventEmitter<void>();
  @Output() goToLogin            = new EventEmitter<void>();
  @Output() verificationRequested = new EventEmitter<string>();

  private facade = inject(AuthFacade);
  private toast  = inject(ToastService);
  private upload = inject(FileUploadService);

  loading      = signal(false);
  step         = signal<1 | 2>(1);
  selectedFile = signal<File | null>(null);
  uploadedUrl  = signal<string | null>(null);

  private step1Data: PersonalStepData | null = null;

  onPersonalNext(data: PersonalStepData): void {
    this.step1Data = data;
    this.step.set(2);
  }

  onProfessionalSubmit(data: ProfessionalStepData): void {
    if (!this.step1Data) return;
    this.loading.set(true);

    const file        = this.selectedFile();
    const existingUrl = this.uploadedUrl();
    const profileUrl$ = file && !existingUrl
      ? this.upload.uploadImage(file).pipe(switchMap(r => of(r.url)))
      : of(existingUrl);

    profileUrl$.pipe(
      switchMap(url => this.facade.registerDoctor({
        firstName:            this.step1Data!.firstName,
        lastName:             this.step1Data!.lastName,
        email:                this.step1Data!.email,
        password:             this.step1Data!.password,
        phone:                this.step1Data!.phone,
        dateOfBirth:          this.step1Data!.dateOfBirth,
        gender:               this.step1Data!.gender as Gender | undefined,
        address:              this.step1Data!.address,
        rppsNumber:           data.rppsNumber,
        specialization:       data.specialization as Specialization,
        licenseNumber:        data.licenseNumber,
        consultationDuration: data.consultationDuration,
        consultationFee:      data.consultationFee,
        officeAddress:        data.officeAddress,
        profilePicture:       url || undefined,
      })),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: res => {
        this.toast.success(
          res.message ?? 'Code de vérification envoyé. Veuillez vérifier votre e-mail.',
          'Vérification'
        );
        this.verificationRequested.emit(this.step1Data!.email);
      },
      error: (err: Error) => {
        this.toast.error(
          err.message ?? 'Inscription impossible. Veuillez réessayer.',
          'Inscription'
        );
      },
    });
  }
}
