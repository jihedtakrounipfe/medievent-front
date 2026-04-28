import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SubscriptionResponse, UserCredit } from '../models/subscription.models';
import { AuthFacade } from '../../../core/services/auth.facade';
import { AnyUser } from '../../../core/user';
import { CreditStateService } from '../services/credit-state.service';
import { AudioTourService } from '../services/audio-tour.service';

@Component({
    selector: 'app-subscription-cancelled',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './subscription-cancelled.component.html'
})
export class SubscriptionCancelledComponent implements OnInit {
    user: AnyUser | null = null;
    cancelledSubscription: SubscriptionResponse | null = null;
    userCredit: UserCredit | null = null;

    private router = inject(Router);
    private authFacade = inject(AuthFacade);
    private creditStateService = inject(CreditStateService);

    ngOnInit(): void {
        this.authFacade.currentUser$.subscribe(user => {
            this.user = user;
            if (!user) {
                this.router.navigate(['/auth/login']);
                return;
            }
            // Get data from navigation state
            const navigation = this.router.getCurrentNavigation();
            const state = navigation?.extras.state;
            if (state) {
                this.cancelledSubscription = state['cancelledSubscription'] || null;
            }
            // Load user credit
            this.creditStateService.refresh(user.id);
            this.creditStateService.credit$.subscribe(credit => {
                this.userCredit = credit;
            });
        });
    }

    browsePlans(): void {
        this.router.navigate(['/plans']);
    }

    viewDashboard(): void {
        this.router.navigate(['/subscription']);
    }

    resubscribe(): void {
        this.router.navigate(['/plans']);
    }
}

