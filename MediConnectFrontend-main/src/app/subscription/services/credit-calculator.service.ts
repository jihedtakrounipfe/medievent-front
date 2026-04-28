import { Injectable } from '@angular/core';
import { BillingCycle } from '../models/subscription.models';

/**
 * CreditCalculatorService
 * 
 * Handles all credit-related calculations for:
 * - Determining unused value from current plan
 * - Calculating amount due for upgrades
 * - Calculating credit generated from downgrades
 * - Calculating days remaining in subscription
 * 
 * Formula Reference:
 * daysRemaining = floor((endDate - now) / milliseconds_per_day)
 * dailyRate = amountPaid / daysInBillingPeriod
 * unusedValue = dailyRate × daysRemaining
 * amountDue = newPlanPrice - unusedValue
 */
@Injectable({ providedIn: 'root' })
export class CreditCalculatorService {

    /**
     * Calculate days remaining until subscription ends
     * @param endDate Subscription end date (YYYY-MM-DD)
     * @returns Number of days remaining (minimum 0)
     */
    calculateDaysRemaining(endDate: string): number {
        try {
            const subscriptionEndDate = new Date(endDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const timeDiff = subscriptionEndDate.getTime() - today.getTime();
            const daysRemaining = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

            return Math.max(0, daysRemaining);
        } catch {
            return 0;
        }
    }

    /**
     * Get number of days in the current billing period
     * @param billingCycle MONTHLY or YEARLY
     * @returns Number of days (30 for monthly, 365 for yearly)
     */
    getDaysInBillingPeriod(billingCycle: BillingCycle): number {
        return billingCycle === 'MONTHLY' ? 30 : 365;
    }

    /**
     * Calculate daily rate of subscription
     * @param amountPaid Total amount paid for this period
     * @param billingCycle MONTHLY or YEARLY
     * @returns Daily subscription cost
     */
    calculateDailyRate(amountPaid: number, billingCycle: BillingCycle): number {
        const daysInPeriod = this.getDaysInBillingPeriod(billingCycle);
        return amountPaid / daysInPeriod;
    }

    /**
     * Calculate unused value from current subscription
     * This is the credit that will be generated on downgrade or upgrade
     * 
     * @param amountPaid Amount paid for current period
     * @param billingCycle Current billing cycle
     * @param endDate Current subscription end date
     * @returns Unused value (credit amount to be applied)
     */
    calculateUnusedValue(
        amountPaid: number,
        billingCycle: BillingCycle,
        endDate: string
    ): number {
        const daysRemaining = this.calculateDaysRemaining(endDate);
        const dailyRate = this.calculateDailyRate(amountPaid, billingCycle);
        const unusedValue = dailyRate * daysRemaining;

        // Round to 2 decimal places for currency
        return Math.round(unusedValue * 100) / 100;
    }

    /**
     * Calculate amount due for upgrading to a new plan
     * 
     * Example:
     * - Current plan cost: 4.99 TND (MONTHLY)
     * - Current subscription days paid: 30
     * - Days remaining: 21
     * - Unused value: (4.99 / 30) × 21 = 3.49 TND
     * - New plan cost: 9.99 TND
     * - Amount due: 9.99 - 3.49 = 6.50 TND
     * 
     * @param newPlanPrice Price of new plan
     * @param currentAmountPaid Amount paid for current plan
     * @param currentBillingCycle Current billing cycle
     * @param currentEndDate Current subscription end date
     * @returns Amount user needs to pay (can be negative if downgrading)
     */
    calculateAmountDue(
        newPlanPrice: number,
        currentAmountPaid: number,
        currentBillingCycle: BillingCycle,
        currentEndDate: string
    ): number {
        const unusedValue = this.calculateUnusedValue(
            currentAmountPaid,
            currentBillingCycle,
            currentEndDate
        );

        const amountDue = newPlanPrice - unusedValue;

        // Round to 2 decimal places for currency
        return Math.round(amountDue * 100) / 100;
    }

    /**
     * Determine action type based on amount due
     * @param amountDue Amount due from calculation
     * @returns 'payment_required' | 'free_upgrade' | 'credit_generated'
     */
    getUpgradeActionType(amountDue: number): 'payment_required' | 'free_upgrade' | 'credit_generated' {
        if (amountDue > 0) return 'payment_required';
        if (amountDue === 0) return 'free_upgrade';
        return 'credit_generated';
    }

    /**
     * Format credit amount for display with currency
     * @param amount Credit amount
     * @param currency Currency code (default: TND)
     * @returns Formatted string like "3.50 TND"
     */
    formatCredit(amount: number, currency = 'TND'): string {
        const formatted = amount.toFixed(2);
        return `${formatted} ${currency}`;
    }

    /**
     * Get human-readable message for upgrade scenario
     * @param amountDue Amount due
     * @param currentPlanName Current plan name
     * @param newPlanName New plan name
     * @returns User-friendly message
     */
    getUpgradeMessage(
        amountDue: number,
        currentPlanName: string,
        newPlanName: string
    ): string {
        const actionType = this.getUpgradeActionType(amountDue);

        switch (actionType) {
            case 'payment_required':
                return `Upgrade from ${currentPlanName} to ${newPlanName}. Amount due: ${this.formatCredit(amountDue)}`;

            case 'free_upgrade':
                return `Upgrade from ${currentPlanName} to ${newPlanName} at no additional cost!`;

            case 'credit_generated': {
                const creditAmount = Math.abs(amountDue);
                return `Downgrade from ${currentPlanName} to ${newPlanName}. You'll receive ${this.formatCredit(creditAmount)} credit.`;
            }
        }
    }
}

