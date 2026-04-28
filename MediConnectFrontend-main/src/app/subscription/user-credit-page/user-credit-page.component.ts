import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SubscriptionService, CreditHistoryEntry } from '../services/subscription.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { AnyUser } from '../../../core/user';
import { UserCredit } from '../models/subscription.models';
import { CreditStateService } from '../services/credit-state.service';
import { AudioTourService } from '../services/audio-tour.service';

@Component({
  selector: 'app-user-credit-page',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './user-credit-page.component.html',
})
export class UserCreditPageComponent implements OnInit {
  private subscriptionService = inject(SubscriptionService);
  private authFacade = inject(AuthFacade);
  private creditStateService = inject(CreditStateService);
  public readonly audioTourService = inject(AudioTourService);
  private router = inject(Router);

  user: AnyUser | null = null;
  userCredit: UserCredit | null = null;
  creditHistory: CreditHistoryEntry[] = [];
  loading = false;
  error = '';

  ngOnInit(): void {
    this.audioTourService.registerTour('credit', [
      'This page shows your current credit balance and full credit transaction history.',
      'Credit is typically earned from downgrades, deactivations, or other billing adjustments.',
      'Available credit is automatically applied during checkout before charging payment.'
    ]);
    this.authFacade.currentUser$.subscribe(user => {
      this.user = user;
      if (!user) {
        this.router.navigate(['/auth/login']);
        return;
      }
      this.loadCreditPageData();
    });
  }

  get hasCreditBanner(): boolean {
    return (this.userCredit?.balance ?? 0) > 0;
  }

  get hasEmptyState(): boolean {
    return !this.loading && (this.userCredit?.balance ?? 0) <= 0 && this.creditHistory.length === 0;
  }

  reload(): void {
    this.loadCreditPageData();
  }

  formatHistoryDescription(entry: CreditHistoryEntry): string {
    if (entry.description) return entry.description;

    const rawType = String(entry.type || entry.reason || '').toUpperCase();
    const fromPlan = (entry.fromPlan || '').toUpperCase();
    const toPlan = (entry.toPlan || '').toUpperCase();

    if (rawType.includes('DOWNGRADE')) {
      return `Plan downgrade — ${fromPlan || 'PREVIOUS'} → ${toPlan || 'NEW'}`;
    }
    if (rawType.includes('DEACTIVATION') || rawType.includes('ADMIN')) {
      return 'Admin deactivation';
    }
    if (rawType.includes('CHECKOUT') || rawType.includes('APPLIED')) {
      return 'Applied to checkout';
    }
    if (rawType.includes('UPGRADE')) {
      return `Plan change — ${fromPlan || 'PREVIOUS'} → ${toPlan || 'NEW'}`;
    }
    return 'Credit transaction';
  }

  getHistoryDate(entry: CreditHistoryEntry): string | null {
    return entry.date || entry.createdAt || entry.timestamp || null;
  }

  getRemainingBalance(entry: CreditHistoryEntry): number {
  return (entry as any)._balance ?? entry.remainingBalance ?? entry.balanceAfter ?? 0;
}

  private loadCreditPageData(): void {
  if (!this.user) return;
  this.loading = true;
  this.error = '';

  this.subscriptionService.getCredit(this.user.id).subscribe({
    next: (credit) => {
      this.userCredit = credit;
      this.creditStateService.setCredit(credit);
      this.loadCreditHistory();
    },
    error: () => {
      this.userCredit = { balance: 0, expiresAt: '' };
      this.creditStateService.setCredit(null);
      this.loadCreditHistory();
    }
  });
}

  private loadCreditHistory(): void {
  if (!this.user) return;
  this.subscriptionService.getCreditHistory(this.user.id).subscribe({
    next: (history) => {
      // Sort oldest first, compute running balance, then reverse to show newest first
      const sorted = [...(history ?? [])].sort((a, b) =>
        new Date(a.date || a.createdAt || '').getTime() -
        new Date(b.date || b.createdAt || '').getTime()
      );
      let running = 0;
      sorted.forEach(entry => {
        running += entry.amount ?? 0;
        (entry as any)._balance = running;
      });
      this.creditHistory = sorted.reverse();
      this.loading = false;
      this.audioTourService.setPageContext('credit',
        `Current credit balance: ${this.userCredit?.balance || 0} TND, ${this.creditHistory.length} transactions`
      );
    },
    error: () => {
      this.creditHistory = [];
      this.error = '';
      this.loading = false;
    }
  });
}

  startFullAudioTour(): void {
    this.audioTourService.startFullTour();
  }

  describeThisPage(): void {
    this.audioTourService.startTourForCurrentPage();
  }
}

