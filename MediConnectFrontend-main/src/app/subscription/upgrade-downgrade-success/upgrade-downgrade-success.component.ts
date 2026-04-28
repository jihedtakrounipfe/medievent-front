import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AudioTourService } from '../services/audio-tour.service';

interface SuccessState {
    creditApplied?: number;
    remainingCredit?: number;
    planName?: string;
    billingCycle?: string;
    newPlan?: string;
    subscription?: Record<string, unknown>;
}

@Component({
    selector: 'app-upgrade-downgrade-success',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './upgrade-downgrade-success.component.html'
})
export class UpgradeDowngradeSuccessComponent implements OnInit {
    successState: SuccessState | null = null;
    private router = inject(Router);
  public readonly audioTourService = inject(AudioTourService);
    get hasCreditApplied(): boolean {
        const credit = this.successState?.creditApplied;
        return typeof credit === 'number' && credit > 0;
    }

    get creditAppliedValue(): number {
        return this.successState?.creditApplied ?? 0;
    }

    ngOnInit(): void {
        const nav = this.router.getCurrentNavigation();
        const state = nav?.extras?.state ?? history.state;

        this.successState = state as SuccessState;

        if (!this.successState) {
            setTimeout(() => this.router.navigate(['/subscription']), 2000);
        }
    }

    goToDashboard(): void {
        this.router.navigate(['/subscription']);
    }

    browsePlans(): void {
        this.router.navigate(['/plans']);
    }

    describeThisPage(): void {
        this.audioTourService.startTourForCurrentPage();
    }
}

