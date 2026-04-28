import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { SubscriptionService } from '../services/subscription.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { AnyUser } from '../../../core/user';
import { AudioTourService } from '../services/audio-tour.service';

@Component({
  selector: 'app-student-verification-apply',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-verification-apply.component.html',
  styleUrls: ['./student-verification-apply.component.css'],
})
export class StudentVerificationApplyComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly authFacade = inject(AuthFacade);
  public readonly audioTourService = inject(AudioTourService);

  user: AnyUser | null = null;
  form = {
    fullName: '',
    universityName: '',
    studentIdNumber: '',
    facultyEmail: '',
  };

  selectedDocument: File | null = null;
  selectedImagePreview: string | null = null;
  dragActive = false;
  uploading = false;
  error = '';
  inlineStatusError = '';
  touchedFields: Record<string, boolean> = {
    fullName: false,
    universityName: false,
    studentIdNumber: false,
    facultyEmail: false,
    document: false,
  };

  ngOnInit(): void {
    this.audioTourService.registerTour('student-verification-apply', [
      'This page is used to submit your student verification request.',
      'Fill in your identity details and upload a valid student proof document.',
      'After submission, your request is reviewed and you can track status on the verification page.'
    ]);
    this.authFacade.currentUser$.subscribe(user => {
      this.user = user;
      if (!user) {
        this.router.navigate(['/auth/login']);
        return;
      }

      this.subscriptionService.getStudentVerificationStatus().subscribe({
  next: (status) => {
    if (status.status === 'APPROVED') {
      this.router.navigate(['/subscription/student-verification']);
      return;
    }
    if (status.status === 'PENDING') {
      this.inlineStatusError = 'You already have a student verification under review.';
    }
  },
  error: () => {
    this.inlineStatusError = '';
  },
});
    });
  }

  get hasBlockingVerification(): boolean {
    return !!this.inlineStatusError;
  }

  get isSubmitDisabled(): boolean {
    return this.uploading || this.hasBlockingVerification;
  }

  get documentLabel(): string {
    return this.selectedDocument ? this.selectedDocument.name : 'Drop your student card here or click to browse';
  }

  touchField(field: keyof StudentVerificationApplyComponent['touchedFields']): void {
    this.touchedFields[field] = true;
  }

  showFieldError(field: keyof StudentVerificationApplyComponent['touchedFields']): boolean {
    return (this.touchedFields[field]) && !this.isFieldValid(field);
  }

  isFieldValid(field: keyof StudentVerificationApplyComponent['touchedFields']): boolean {
    const fullName = this.form.fullName.trim();
    const universityName = this.form.universityName.trim();
    const facultyEmail = this.form.facultyEmail.trim();

    switch (field) {
      case 'fullName':
        return fullName.length > 0;
      case 'universityName':
        return universityName.length > 0;
      case 'studentIdNumber':
        return true;
      case 'facultyEmail':
        return facultyEmail.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(facultyEmail);
      case 'document':
        return !!this.selectedDocument && this.selectedDocument.size <= 5 * 1024 * 1024;
      default:
        return false;
    }
  }

  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.handleSelectedFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;
  }

  onDrop(event: DragEvent, input: HTMLInputElement): void {
    event.preventDefault();
    this.dragActive = false;
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (!file) {
      return;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    this.handleSelectedFile(file);
  }

  removeDocument(input: HTMLInputElement): void {
    input.value = '';
    this.selectedDocument = null;
    this.selectedImagePreview = null;
    this.touchField('document');
  }

  getDocumentSize(): string {
    if (!this.selectedDocument) return '';
    const sizeInMb = this.selectedDocument.size / (1024 * 1024);
    return `${sizeInMb.toFixed(2)} MB`;
  }

  goToStatus(): void {
    this.router.navigate(['/subscription/student-verification']);
  }

  submit(): void {
    this.touchField('fullName');
    this.touchField('universityName');
    this.touchField('facultyEmail');
    this.touchField('document');

    if (this.hasBlockingVerification) {
      return;
    }

    if (!this.user) {
      this.error = 'Please log in first.';
      return;
    }

    if (!this.isFieldValid('fullName') || !this.isFieldValid('universityName')) {
      this.error = 'Please complete the required fields.';
      return;
    }

    if (!this.isFieldValid('facultyEmail')) {
      this.error = 'Please provide a valid faculty email or leave it empty.';
      return;
    }

    if (!this.isFieldValid('document')) {
      this.error = this.selectedDocument
        ? 'Document must be 5MB or smaller.'
        : 'Please upload your student card or proof document.';
      return;
    }

    this.uploading = true;
    this.error = '';

    this.subscriptionService.submitStudentVerification(
      this.user.id,
      this.form.fullName.trim(),
      this.form.universityName.trim(),
      this.form.studentIdNumber.trim() || null,
      this.form.facultyEmail.trim() || null,
      this.selectedDocument!
    ).subscribe({
      next: () => {
        this.uploading = false;
        this.router.navigate(['/subscription/student-verification']);
      },
      error: (err: HttpErrorResponse) => {
        this.uploading = false;
        const message = err.error?.message || 'Failed to submit verification.';

        if (message.includes('PENDING') || message.includes('APPROVED')) {
          this.inlineStatusError = message;
          return;
        }

        this.error = message;
      }
    });
  }

  private handleSelectedFile(file: File | null): void {
    this.selectedDocument = file;
    this.selectedImagePreview = null;
    this.touchField('document');

    if (!file) {
      return;
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedImagePreview = typeof reader.result === 'string' ? reader.result : null;
      };
      reader.readAsDataURL(file);
    }
  }

  startFullAudioTour(): void {
    this.audioTourService.startFullTour();
  }

  describeThisPage(): void {
    this.audioTourService.startTourForCurrentPage();
  }
}

