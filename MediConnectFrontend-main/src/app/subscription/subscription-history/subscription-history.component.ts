import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SubscriptionService } from '../services/subscription.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { AnyUser } from '../../../core/user';
import { SubscriptionResponse } from '../models/subscription.models';
import { environment } from '../../../environments/environment';
import { AudioTourService } from '../services/audio-tour.service';

@Component({
    selector: 'app-subscription-history',
    standalone: true,
    imports: [CommonModule, DatePipe, FormsModule, RouterLink],
    templateUrl: './subscription-history.component.html',
    styleUrls: ['./subscription-history.component.css']
})
export class SubscriptionHistoryComponent implements OnInit {

    private readonly subscriptionService = inject(SubscriptionService);
    private readonly authFacade = inject(AuthFacade);
    private readonly router = inject(Router);
    public readonly audioTourService = inject(AudioTourService);

    user: AnyUser | null = null;
    history: SubscriptionResponse[] = [];
    filteredHistory: SubscriptionResponse[] = [];
    searchTerm = '';
    activeSubscription: SubscriptionResponse | null = null;
    loading = false;
    error = '';

    ngOnInit(): void {
        this.audioTourService.registerTour('subscription-history', [
            'This page lists your subscription timeline, including active, cancelled, and expired records.',
            'Use it to review billing cycles, status changes, and invoice access for past subscriptions.'
        ]);
        // Set immediate context for audio tour to prevent timeout
        console.log('[SubscriptionHistory] Setting immediate page context in ngOnInit');
        this.audioTourService.setPageContext('subscription-history',
            'Subscription history page loading... Checking your past subscription records.'
        );
        this.authFacade.currentUser$.subscribe(user => {
            this.user = user;
            if (!user) {
                this.router.navigate(['/auth/login']);
                return;
            }
            this.loadHistory();
        });
    }

    loadHistory() {
        if (!this.user) return;

        this.loading = true;
        this.error = '';
        this.history = [];
        this.filteredHistory = [];
        this.activeSubscription = null;

        this.subscriptionService.getActive(this.user.id).subscribe({
            next: (sub) => this.activeSubscription = sub,
            error: () => console.log('No active subscription found')
        });

        this.subscriptionService.getHistory(this.user.id).subscribe({
            next: (history) => {
                this.history = history;
                this.filteredHistory = [...history];
                this.loading = false;
                // After data is loaded, set page context for audio tour
                this.audioTourService.setPageContext('subscription-history',
                  `Subscription history page showing ${this.history.length} past subscriptions. Most recent: ${this.history[0]?.planName ?? 'none'}.`
                );
            },
            error: () => {
                this.error = 'Failed to load subscription history.';
                this.loading = false;
            }
        });
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'ACTIVE':    return 'status-active';
            case 'CANCELLED': return 'status-cancelled';
            case 'EXPIRED':   return 'status-expired';
            default:          return 'status-unknown';
        }
    }

    getInvoiceViewUrl(invoiceId: number): string {
        return `${environment.apiUrl}/api/invoices/view/${invoiceId}`;
    }

    getInvoiceDownloadUrl(invoiceId: number): string {
        return `${environment.apiUrl}/api/invoices/download/${invoiceId}`;
    }

    filterHistory(): void {
        const term = this.searchTerm.toLowerCase();
        this.filteredHistory = this.history.filter((h) =>
            h.planName?.toLowerCase().includes(term) ||
            h.status?.toLowerCase().includes(term)
        );
    }

    startFullAudioTour(): void {
        this.audioTourService.startFullTour();
    }

    describeThisPage(): void {
        this.audioTourService.startTourForCurrentPage();
    }
}

