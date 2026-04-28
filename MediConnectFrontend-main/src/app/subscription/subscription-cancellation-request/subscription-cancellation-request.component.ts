import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionService } from '../services/subscription.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { AnyUser } from '../../../core/user';
import { SubscriptionResponse, UserCredit, CancellationRequest } from '../models/subscription.models';
import { AudioTourService } from '../services/audio-tour.service';

@Component({
  selector: 'app-subscription-cancellation-request',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  template: `
    <div class="min-h-full bg-gray-50 py-12">
      <div class="mx-auto w-full max-w-2xl px-8">
        <div class="mb-10 text-center">
          <p class="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-rose-600">Offboarding</p>
          <h2 class="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">Cancel Service</h2>
          <p class="mt-4 text-base text-gray-600">We're sorry to see you go. Please review your cancellation details below.</p>
        </div>

        <div class="overflow-hidden rounded-[2.5rem] bg-white shadow-xl ring-1 ring-gray-900/5">
          <div class="p-10 sm:p-12">
            @if (error) {
              <div class="mb-8 rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-200">
                <div class="flex items-center gap-3 text-rose-800">
                  <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <p class="text-sm font-bold">{{ error }}</p>
                </div>
              </div>
            }

            @if (currentSubscription) {
              <div class="mb-10 space-y-6">
                <div class="rounded-3xl bg-gray-50 p-8 ring-1 ring-gray-200">
                  <p class="mb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Current Subscription</p>
                  <div class="grid grid-cols-2 gap-y-6">
                    <div>
                      <p class="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Active Tier</p>
                      <p class="text-lg font-black text-gray-900">{{ currentSubscription.planName }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Billing Cycle</p>
                      <p class="text-lg font-black text-gray-900">{{ currentSubscription.billingCycle }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Expires On</p>
                      <p class="text-lg font-black text-gray-900">{{ currentSubscription.endDate }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Time Left</p>
                      <p class="text-lg font-black text-gray-900">{{ daysRemaining }} Days</p>
                    </div>
                  </div>
                </div>

                @if (userCredit && userCredit.balance > 0) {
                  <div class="rounded-3xl bg-emerald-50 p-6 ring-1 ring-emerald-200">
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="text-[10px] font-black uppercase tracking-widest text-emerald-700">Wallet Balance</p>
                        <p class="mt-1 text-2xl font-black text-emerald-900">{{ userCredit.balance | number: '1.2-2' }} TND</p>
                      </div>
                      <div class="h-10 w-10 rounded-full bg-emerald-100 p-2 text-emerald-600">
                         <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </div>
                    </div>
                  </div>
                }
              </div>

              <form (ngSubmit)="submitCancellation()" class="space-y-8">
                <div>
                  <label class="mb-3 block text-sm font-black text-gray-900 uppercase tracking-tight" for="reason">Why are you leaving?</label>
                  <textarea
                    id="reason"
                    [(ngModel)]="cancellationReason"
                    name="reason"
                    placeholder="Tell us why you're cancelling so we can improve..."
                    maxlength="500"
                    rows="4"
                    class="w-full rounded-2xl border-gray-200 bg-gray-50 p-4 text-sm font-medium transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                  ></textarea>
                  <p class="mt-2 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ cancellationReason.length }}/500</p>
                </div>

                <div class="rounded-2xl bg-rose-50 p-6 ring-1 ring-rose-200">
                  <div class="flex gap-4">
                    <div class="h-10 w-10 shrink-0 rounded-full bg-white p-2 text-rose-600 shadow-sm">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </div>
                    <div>
                      <p class="text-sm font-black text-rose-950">Crucial Access Loss</p>
                      <p class="mt-1 text-xs font-medium text-rose-800/80 leading-relaxed">
                        By confirming, you will lose access to all premium features on the expiration date. 
                        Historical records will be preserved, but new activity will be restricted.
                      </p>
                    </div>
                  </div>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    (click)="goBack()"
                    [disabled]="processing"
                    class="rounded-2xl border border-gray-200 bg-white py-5 text-sm font-black text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Keep Subscription
                  </button>
                  <button
                    type="submit"
                    [disabled]="processing"
                    class="rounded-2xl bg-rose-600 py-5 text-sm font-black text-white shadow-xl transition hover:bg-rose-700 hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    @if (processing) {
                      <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></span>
                    } @else {
                      Confirm Cancellation
                    }
                  </button>
                </div>
              </form>
            }

            @if (!currentSubscription && !loading) {
              <div class="flex flex-col items-center justify-center py-12 text-center">
                <div class="rounded-3xl bg-gray-50 p-8 text-gray-400">
                  <svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <h3 class="mt-8 text-2xl font-black text-gray-900">No Active Plan</h3>
                <p class="mt-4 text-gray-500 max-w-sm">You don't have an active subscription that can be cancelled.</p>
                <button (click)="goBack()" class="mt-10 rounded-full bg-gray-900 px-10 py-4 text-sm font-black text-white shadow-lg transition hover:bg-gray-800">
                  Back to Dashboard
                </button>
              </div>
            }

            @if (loading) {
              <div class="flex flex-col items-center justify-center py-20 text-center">
                <div class="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-teal-600"></div>
                <p class="mt-6 text-sm font-bold text-gray-500 uppercase tracking-widest">Retrieving contract data...</p>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SubscriptionCancellationRequestComponent implements OnInit {
  user: AnyUser | null = null;
  currentSubscription: SubscriptionResponse | null = null;
  userCredit: UserCredit | null = null;
  cancellationReason = '';
  loading = false;
  processing = false;
  error = '';
  daysRemaining = 0;

  private router = inject(Router);
  private subscriptionService = inject(SubscriptionService);
  private authFacade = inject(AuthFacade);
  public readonly audioTourService = inject(AudioTourService);

  ngOnInit(): void {
    this.audioTourService.registerTour('subscription-cancellation-request', [
      'This cancellation page lets you submit a request to stop your subscription.',
      'It summarizes your remaining active plan, wallet credit, and reason for leaving.',
      'Confirming the cancellation will send the request to our backend and update your history.'
    ]);
    this.audioTourService.setPageContext('subscription-cancellation-request',
      'Subscription cancellation page loading. Please review the request details before confirming.'
    );
    this.authFacade.currentUser$.subscribe(user => {
      this.user = user;
      if (!user) {
        this.router.navigate(['/auth/login']);
        return;
      }

      this.loadCurrentSubscription();
      this.loadUserCredit();
    });
  }

  private loadCurrentSubscription(): void {
    if (!this.user) return;
    this.loading = true;
    this.subscriptionService.getActive(this.user.id).subscribe({
      next: (subscription) => {
        this.currentSubscription = subscription;
        this.calculateDaysRemaining();
        this.loading = false;
        this.audioTourService.setPageContext('subscription-cancellation-request',
          `Cancellation page loaded for ${subscription.planName} with ${this.daysRemaining} days remaining.`
        );
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.error = 'No active subscription found.';
          this.audioTourService.setPageContext('subscription-cancellation-request',
            'Cancellation page loaded but no active subscription was found.'
          );
        } else {
          this.error = 'Failed to load your subscription.';
          this.audioTourService.setPageContext('subscription-cancellation-request',
            'Cancellation page failed to load subscription details. Please try again later.'
          );
        }
        this.loading = false;
      }
    });
  }

  private loadUserCredit(): void {
    if (!this.user) return;
    this.subscriptionService.getCredit(this.user.id).subscribe({
      next: (credit) => {
        this.userCredit = credit;
      },
      error: (err: HttpErrorResponse) => {
        if (err.status !== 404) {
          console.warn('Failed to load user credit:', err);
        }
      }
    });
  }

  private calculateDaysRemaining(): void {
    if (!this.currentSubscription) return;

    const endDate = new Date(this.currentSubscription.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    this.daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    this.daysRemaining = Math.max(0, this.daysRemaining);
  }

  submitCancellation(): void {
    if (!this.currentSubscription || !this.user) {
      this.error = 'Missing subscription information.';
      return;
    }

    this.processing = true;
    this.error = '';

    const request: CancellationRequest = {
      subscriptionId: this.currentSubscription.id,
      reason: this.cancellationReason.trim() || undefined
    };

    this.subscriptionService.cancelSubscription(this.user.id, request).subscribe({
      next: (response) => {
        this.processing = false;
        this.router.navigate(['/subscription/cancelled'], {
          state: {
            creditGenerated: response.creditGenerated,
            message: response.message,
            cancelledSubscription: response.subscription
          }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.processing = false;
        this.error = err.error?.message || 'Failed to cancel subscription. Please try again.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/subscription']);
  }
}

