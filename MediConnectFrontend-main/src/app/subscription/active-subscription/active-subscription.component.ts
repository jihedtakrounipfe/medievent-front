import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SubscriptionService } from '../services/subscription.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { AnyUser, isPatient } from '../../../core/user';
import { CancellationRequest, SubscriptionResponse, UserCredit } from '../models/subscription.models';
import { PlanChatComponent } from '../plan-chat/plan-chat.component';
import { CreditDetailsModalComponent } from '../../shared/components/credit-details-modal.component';
import { environment } from '../../../environments/environment';
import { CreditStateService } from '../services/credit-state.service';
import { AudioTourService } from '../services/audio-tour.service';

@Component({
  selector: 'app-active-subscription',
  standalone: true,
  imports: [CommonModule, FormsModule, PlanChatComponent, CreditDetailsModalComponent, RouterLink],
  templateUrl: './active-subscription.component.html',
})
export class ActiveSubscriptionComponent implements OnInit {
  private subscriptionService = inject(SubscriptionService);
  private authFacade = inject(AuthFacade);
  private creditStateService = inject(CreditStateService);
  public readonly audioTourService = inject(AudioTourService);
  private router = inject(Router);


  user: AnyUser | null = null;
  subscription: SubscriptionResponse | null = null;
  userCredit: UserCredit | null = null;
  loading = false;
  creditLoading = false;
  error = '';
  creditError = '';
  message = '';
  showCreditModal = false;
  showCancelModal = false;
  cancellationReason = '';
  cancellationReasonError = '';
  cancelError = '';
  cancelling = false;
  private activeRetryCount = 0;
  private readonly maxActiveRetries = 5;
  readonly maxCancellationReasonLength = 500;

  ngOnInit(): void {
    this.audioTourService.registerTour('active-subscription', [
      'This page summarizes your active subscription, billing cycle progress, and renewal settings.',
      'You can manage plan changes, billing actions, and cancellation from this screen.',
      'If credit exists, it appears here and can be reviewed in full on the credit page.'
    ]);
    this.authFacade.currentUser$.subscribe(user => {
      this.user = user;
      if (!user) {
        this.router.navigate(['/auth/login']);
        return;
      }
      this.loadActive();
      this.loadCredit(user.id);
    });
  }
  startFullAudioTour(): void {
  this.audioTourService.startFullTour();
}

  loadActive(): void {
  this.loading = true;
  this.subscriptionService.getActive(this.user!.id).subscribe({
    next: (data) => {
      this.subscription = data;
      this.loading = false;
      this.audioTourService.setPageContext('active-subscription',
        `Active subscription page. Current plan: ${data.planName}, status: ${data.status}, billing: ${data.billingCycle}, renews on: ${data.endDate}.`
      );
    },
    error: () => {
      this.subscription = null;
      this.error = '';
      this.loading = false;
      this.audioTourService.setPageContext('active-subscription',
        'Active subscription page. No active subscription found. You can view plans and subscribe from the plans page.'
      );
    }
  });
}

  loadCredit(userId: number): void {
    this.creditLoading = true;
    this.subscriptionService.getCredit(userId).subscribe({
      next: (data) => {
        this.userCredit = data;
        this.creditStateService.setCredit(data);
        this.creditLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        // Credit may not exist, which is OK
        if (err.status !== 404) {
          this.creditError = 'Failed to load credit information.';
        }
        if (err.status === 404) {
          this.creditStateService.setCredit(null);
        }
        this.creditLoading = false;
      }
    });
  }

  get hasPositiveCredit(): boolean {
    return (this.userCredit?.balance ?? 0) > 0;
  }

  goToCreditPage(): void {
    this.router.navigate(['/credit']);
  }

  toggleAutoRenew(): void {
    this.subscriptionService.toggleAutoRenew(this.user!.id).subscribe({
      next: () => {
        if (this.subscription) {
          this.subscription.autoRenew = !this.subscription.autoRenew;
          this.message = `Auto-renew turned ${this.subscription.autoRenew ? 'ON' : 'OFF'}`;
        }
      },
      error: () => this.error = 'Failed to toggle auto-renew.'
    });
  }

  cancelSubscription(): void {
    this.cancelError = '';
    this.cancellationReasonError = '';
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    if (this.cancelling) return;
    this.showCancelModal = false;
    this.cancelError = '';
    this.cancellationReasonError = '';
    this.cancellationReason = '';
  }

  get cancellationReasonLength(): number {
    return this.cancellationReason.length;
  }

  confirmCancellation(): void {
    if (!this.user || !this.subscription || this.cancelling) return;

    const trimmedReason = this.cancellationReason.trim();
    if (trimmedReason.length > this.maxCancellationReasonLength) {
      this.cancellationReasonError = `Reason must be ${this.maxCancellationReasonLength} characters or less.`;
      return;
    }

    this.cancelling = true;
    this.cancelError = '';
    this.cancellationReasonError = '';
    this.error = '';
    this.message = '';

    const request: CancellationRequest = {
      subscriptionId: this.subscription.id,
      reason: trimmedReason || undefined,
    };

    this.subscriptionService.cancelSubscription(this.user.id, request).subscribe({
      next: (response) => {
        this.cancelling = false;
        this.showCancelModal = false;
        this.cancellationReason = '';
        this.message = response?.message || 'Subscription cancelled successfully.';
        this.subscription = response?.subscription || null;
        this.loadActive();
        setTimeout(() => this.router.navigate(['/history']), 1000);
      },
      error: (err: HttpErrorResponse) => {
        this.cancelling = false;
        const backendMessage = String(err?.error?.message || err?.error?.error || '');
        const reasonTooLong = err.status === 400 && /reason|500|length|max/i.test(backendMessage);
        if (reasonTooLong) {
          this.cancellationReasonError = `Reason must be ${this.maxCancellationReasonLength} characters or less.`;
          return;
        }
        this.cancelError = backendMessage || 'We could not cancel your subscription right now. Please try again.';
      }
    });
  }

  getInvoiceViewUrl(invoiceId: number): string {
    return `${environment.apiUrl}/api/invoices/view/${invoiceId}`;
  }

  getInvoiceDownloadUrl(invoiceId: number): string {
    return `${environment.apiUrl}/api/invoices/download/${invoiceId}`;
  }

  scrollToActions(): void {
    document.querySelector('.actions-footer')?.scrollIntoView({ behavior: 'smooth' });
  }

  changePlan(): void {
    if (!this.user) return;
    this.router.navigate(['/plans']);
  }

  changeBillingCycle(): void {
    if (!this.user) return;
    this.router.navigate(['/change-billing'], { queryParams: { userId: this.user.id } });
  }

  openCreditModal(): void {
    this.showCreditModal = true;
  }

  closeCreditModal(): void {
    this.showCreditModal = false;
  }

  get planPriceDisplay(): string {
    const value = this.subscription?.planPrice;
    if (typeof value !== 'number') return '--';
    return value % 1 === 0 ? `${value}` : value.toFixed(2);
  }

  get daysRemaining(): number {
    if (!this.subscription?.endDate) return 0;
    const end = new Date(this.subscription.endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  get billingCycleDays(): number {
    return this.subscription?.billingCycle === 'YEARLY' ? 365 : 30;
  }

  get billingProgressPercent(): number {
    const elapsed = this.billingCycleDays - this.daysRemaining;
    const ratio = (elapsed / this.billingCycleDays) * 100;
    return Math.max(0, Math.min(100, ratio));
  }

  get progressRingOffset(): number {
    const circumference = 2 * Math.PI * 34;
    return circumference - (this.billingProgressPercent / 100) * circumference;
  }

  describeThisPage(): void {
    this.audioTourService.startTourForCurrentPage();
  }
}

