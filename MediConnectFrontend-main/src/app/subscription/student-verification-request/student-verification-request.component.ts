import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { SubscriptionService, StudentVerificationStatus } from '../services/subscription.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { AudioTourService } from '../services/audio-tour.service';

@Component({
  selector: 'app-student-verification-request',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-verification-request.component.html',
})
export class StudentVerificationRequestComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly authFacade = inject(AuthFacade);
  public readonly audioTourService = inject(AudioTourService);

  status: StudentVerificationStatus | null = null;
  loading = false;
  error = '';
  isAlreadySubscribed = false;
  private pollSub?: Subscription;

  ngOnInit(): void {
    this.audioTourService.registerTour('student-verification-status', [
      'This page tracks your student verification request and current review status.',
      'Approved status enables the student discount, while pending or rejected status shows next actions.',
      'Use this page to refresh status and continue to plans or checkout when ready.'
    ]);
    
    this.audioTourService.setPageContext('student-verification-status',
      'Student verification page loading... Checking your verification status.'
    );
    this.refreshStatus();
    this.pollSub = interval(15000).subscribe(() => this.refreshStatus());
    const user = this.authFacade.currentUser;
if (user) {
  this.subscriptionService.getActive(user.id).subscribe({
    next: () => this.isAlreadySubscribed = true,
    error: () => this.isAlreadySubscribed = false,
  });
}
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  get progress(): number {
    return this.status?.progressPercentage ?? 0;
  }

  get statusLabel(): string {
    return this.status?.status ?? 'PENDING';
  }

  get currentState(): 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' {
    if (!this.hasVerificationRequest) {
      return 'NOT_SUBMITTED';
    }

    return this.status?.status ?? 'PENDING';
  }

  get approvedDaysRemaining(): number {
    const daysFromStatus = this.status?.daysRemaining ?? this.status?.expiresInDays;
    if (typeof daysFromStatus === 'number' && Number.isFinite(daysFromStatus)) {
      return Math.max(0, Math.floor(daysFromStatus));
    }

    const rawExpiry = this.status?.expiresAt
      ?? this.status?.expiresOn
      ?? this.status?.discountExpiresAt
      ?? this.status?.validUntil;

    if (!rawExpiry) {
      return 0;
    }

    const expiryDate = new Date(rawExpiry);
    if (Number.isNaN(expiryDate.getTime())) {
      return 0;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const diffInDays = Math.ceil((expiryDate.getTime() - now.getTime()) / millisecondsPerDay);
    return Math.max(0, diffInDays);
  }

  get hasVerificationRequest(): boolean {
    if (!this.status) {
      return false;
    }

    if (this.status.requestFound === false) {
      return false;
    }

    return !!(this.status.id || this.status.userId || this.status.status);
  }

  refreshStatus(): void {
    const user = this.authFacade.currentUser;
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.loading = true;
    this.subscriptionService.getStudentVerificationStatus().subscribe({
      next: (res) => {
        if (res?.requestFound === false || (!res?.id && !res?.userId && !res?.status)) {
          this.status = null;
          this.error = 'There are no verification requests.';
          this.loading = false;
          this.audioTourService.setPageContext('student-verification-status',
            `Student verification status: NOT_SUBMITTED. Submit your student card to get 50% off the PREMIUM plan.`
          );
          return;
        }

        this.status = res;
        this.error = '';
        this.loading = false;
        this.audioTourService.setPageContext('student-verification-status',
          `Student verification status: ${this.currentState}. ${this.currentState === 'APPROVED' ? 'Student discount is active.' : 'Submit your student card to get 50% off the PREMIUM plan.'}`
        );
      },
      error: () => {
        this.status = null;
        this.loading = false;
        this.error = 'There are no verification requests.';
        this.audioTourService.setPageContext('student-verification-status',
          'Student verification page. Unable to load verification status. Please try refreshing.'
        );
      },
    });
  }

  goToCheckout(): void {
  if (this.isAlreadySubscribed) return;
  this.router.navigate(['/plans']);
}

  goToPlans(): void {
    this.router.navigate(['/plans']);
  }

  applyForDiscount(): void {
    this.router.navigate(['/plans']);
  }

  reSubmitVerification(): void {
    this.router.navigate(['/subscription/student-verification/apply']);
  }

  startFullAudioTour(): void {
    this.audioTourService.startFullTour();
  }

  describeThisPage(): void {
    this.audioTourService.startTourForCurrentPage();
  }
}

