import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubscriptionService } from '../services/subscription.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { AnyUser } from '../../../core/user';
import { AudioTourService } from '../services/audio-tour.service';
import {
    SubscriptionResponse,
    PatientPlan,
    DoctorPlan,
    BillingCycle,
    UpgradeDowngradeRequest,
    UpgradeDowngradeResponse,
    UserCredit
} from '../models/subscription.models';

type BasePlan = PatientPlan | DoctorPlan;

interface PlanComparison {
    current: SubscriptionResponse;
    newPlan: BasePlan;
    currentPrice: number;
    newPrice: number;
    daysRemaining: number;
    unusedValue: number;
    amountDue: number;
    isUpgrade: boolean;
    creditApplied: number;
}

@Component({
    selector: 'app-upgrade-downgrade',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './upgrade-downgrade.component.html'
})
export class UpgradeDowngradeComponent implements OnInit {
    user: AnyUser | null = null;
    currentSubscription: SubscriptionResponse | null = null;
    userCredit: UserCredit | null = null;
    availablePlans: BasePlan[] = [];
    selectedNewPlan: BasePlan | null = null;
    newBillingCycle: BillingCycle = 'MONTHLY';

    loading = false;
    plansLoading = false;
    processing = false;
    error = '';
    message = '';
    comparison: PlanComparison | null = null;

    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private subscriptionService = inject(SubscriptionService);
    private authFacade = inject(AuthFacade);
    public readonly audioTourService = inject(AudioTourService);

    ngOnInit(): void {
        this.audioTourService.registerTour('upgrade-downgrade', [
            'This page helps you switch from your current plan to another available plan.',
            'It compares current and new pricing, applies remaining value and available credit, and shows amount due.',
            'If credit fully covers the change, no external payment is required.'
        ]);
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
                this.loadPlansForPlanType();
                this.loading = false;
            },
            error: (err: HttpErrorResponse) => {
                if (err.status === 404) {
                    this.error = 'No active subscription found. Please subscribe to a plan first.';
                    setTimeout(() => this.router.navigate(['/plans']), 2000);
                } else {
                    this.error = 'Failed to load your subscription.';
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

    private loadPlansForPlanType(): void {
        if (!this.currentSubscription) return;

        this.plansLoading = true;
        const planType = this.currentSubscription.planType;

        const plansObservable: Observable<BasePlan[]> = planType === 'PATIENT'
            ? (this.subscriptionService.getPatientPlans() as Observable<BasePlan[]>)
            : (this.subscriptionService.getDoctorPlans() as Observable<BasePlan[]>);

        plansObservable.subscribe({
            next: (plans: BasePlan[]) => {
                // Filter out the current plan by name and keep only active plans
                this.availablePlans = plans.filter(p => p.name !== this.currentSubscription?.planName && p.isActive);
                this.plansLoading = false;
                this.audioTourService.setPageContext('upgrade-downgrade',
                  `Upgrade/downgrade tool loaded for your current ${this.currentSubscription?.planName ?? 'plan'}. ${this.availablePlans.length} replacement plans are available.`
                );
            },
            error: () => {
                this.error = 'Failed to load available plans.';
                this.plansLoading = false;
            }
        });
    }

    selectNewPlan(plan: BasePlan): void {
        this.selectedNewPlan = plan;
        this.newBillingCycle = this.currentSubscription?.billingCycle ?? 'MONTHLY';
        this.calculateComparison();
    }

    describeThisPage(): void {
        this.audioTourService.startTourForCurrentPage();
    }

    formatPrice(price: number | undefined): string {
        if (!price) return '0.00';
        return price.toFixed(2);
    }

    getSelectedPlanPrice(cycle: BillingCycle): number {
        if (!this.selectedNewPlan) return 0;
        return cycle === 'YEARLY' ? this.selectedNewPlan.priceYearly : this.selectedNewPlan.priceMonthly;
    }

    getAbsoluteAmount(amount: number): number {
        return Math.abs(amount);
    }

    calculateComparison(): void {
        if (!this.currentSubscription || !this.selectedNewPlan) return;

        const daysRemaining = this.calculateDaysRemaining();
        const currentPrice = this.currentSubscription.billingCycle === 'YEARLY'
            ? (this.currentSubscription.planPrice ?? 0)
            : (this.currentSubscription.planPrice ?? 0);

        const newPrice = this.getSelectedPlanPrice(this.newBillingCycle);

        // Calculate unused value from current plan
        const totalDaysInCycle = this.currentSubscription.billingCycle === 'YEARLY' ? 365 : 30;
        const unusedValue = (daysRemaining / totalDaysInCycle) * currentPrice;

        // Calculate amount due
        let amountDue = newPrice - unusedValue;
        const creditToApply = this.userCredit ? Math.min(this.userCredit.balance, Math.max(0, amountDue)) : 0;
        amountDue = Math.max(0, amountDue - creditToApply);

        const isUpgrade = newPrice > currentPrice;

        this.comparison = {
            current: this.currentSubscription,
            newPlan: this.selectedNewPlan,
            currentPrice,
            newPrice,
            daysRemaining,
            unusedValue,
            amountDue,
            isUpgrade,
            creditApplied: creditToApply
        };
    }

    private calculateDaysRemaining(): number {
        if (!this.currentSubscription) return 0;

        const endDate = new Date(this.currentSubscription.endDate);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return Math.max(0, diffDays);
    }

    confirmUpgradeDowngrade(): void {
        if (!this.selectedNewPlan || !this.currentSubscription || !this.user) {
            this.error = 'Missing required information.';
            return;
        }

        this.processing = true;
        this.error = '';

        const request: UpgradeDowngradeRequest = {
            newPlanId: this.selectedNewPlan.id,
            newBillingCycle: this.newBillingCycle
        };

        this.subscriptionService.upgradeDowngrade(this.user.id, request).subscribe({
            next: (response: UpgradeDowngradeResponse) => {
                this.processing = false;

                // Check if credit covered the entire upgrade/downgrade
                if (response?.sessionId === 'CREDIT_APPLIED_NO_CHECKOUT') {
                    this.router.navigate(['/upgrade-downgrade/success'], {
                        state: {
                            creditApplied: response?.creditApplied ?? 0,
                            newPlan: this.selectedNewPlan?.name,
                            newBillingCycle: this.newBillingCycle,
                            subscription: response?.newSubscription
                        }
                    });
                    return;
                }

                // Payment required, redirect to Stripe
                if (response?.url) {
                    window.location.href = response.url;
                    return;
                }

                this.error = 'Failed to process upgrade/downgrade.';
            },
            error: (err: HttpErrorResponse) => {
                this.processing = false;
                this.error = err?.error?.message || 'Failed to process upgrade/downgrade.';
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/subscription']);
    }

}

