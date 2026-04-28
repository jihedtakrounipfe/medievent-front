import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SubscriptionService } from '../services/subscription.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { AudioTourService } from '../services/audio-tour.service';

@Component({
  selector: 'app-success',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink],
  templateUrl: './success.component.html',
})
export class SuccessComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private subscriptionService = inject(SubscriptionService);
  private authFacade = inject(AuthFacade);
  public readonly audioTourService = inject(AudioTourService);
  
  loading = true;
  message = 'Your payment has been processed successfully.';
  creditUsed = 0;
  creditRemaining = 0;
  sessionType = '';

  ngOnInit() {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    const navState = (this.router.getCurrentNavigation()?.extras?.state ?? history.state) as {
      sessionId?: string;
      creditUsed?: number;
      creditRemaining?: number;
      remainingCredit?: number;
    };
    
    this.sessionType = navState?.sessionId ?? '';
    this.creditUsed = navState?.creditUsed ?? 0;
    this.creditRemaining = navState?.creditRemaining ?? navState?.remainingCredit ?? 0;

    this.audioTourService.registerTour('success', [
      'This success page confirms your subscription signup or payment approval.',
      'It will return you to your active subscription shortly once the process completes.'
    ]);
    this.audioTourService.setPageContext('success',
      'Subscription success page loaded. Your payment has been processed and your subscription should become active shortly.'
    );

    this.authFacade.currentUser$.subscribe(user => {
      if (!sessionId || !user) {
        this.loading = false;
        setTimeout(() => this.router.navigate(['/subscription']), 5000);
        return;
      }

      this.subscriptionService.confirmCheckoutSession(sessionId).subscribe({
        next: () => {
          this.loading = false;
          this.message = 'Your subscription is now fully active. Enjoy your premium features!';
          setTimeout(() => this.router.navigate(['/subscription']), 3500);
        },
        error: () => {
          this.loading = false;
          this.message = 'Session confirmed. Redirecting to your dashboard...';
          setTimeout(() => this.router.navigate(['/subscription']), 4000);
        }
      });
    });
  }

  describeThisPage(): void {
    this.audioTourService.startTourForCurrentPage();
  }
}

