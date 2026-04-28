import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { SubAdminService } from '../services/sub-admin.service';
import { SubscriptionService } from '../../subscription/services/subscription.service';
import { PromoCode } from '../models/sub-admin.models';
import { CancellationStatsResponse } from '../../subscription/models/subscription.models';
Chart.register(...registerables);

interface MetricCard {
  title: string;
  value: string;
  tone: 'purple' | 'orange' | 'teal' | 'red';
  detail: string;
  trendDirection: 'up' | 'down';
  trendValue: string;
}

interface ActivityItem {
  title: string;
  subtitle: string;
  date: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
  icon: 'payment' | 'subscription' | 'verification';
}

@Component({
  selector: 'app-sub-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sub-admin-dashboard.component.html',
  styleUrls: ['./sub-admin-dashboard.component.css']
})
export class SubAdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('revenueChart') revenueChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('planChart') planChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart') statusChartRef?: ElementRef<HTMLCanvasElement>;

  loading = false;
  error = '';

  currentDate = new Date();
  adminName = 'Administrator';
  statusCounts = { active: 0, expired: 0, cancelled: 0 };

  cards: MetricCard[] = [];
  recentActivity: ActivityItem[] = [];
  cancellationStats: CancellationStatsResponse | null = null;
  cancellationBreakdown = { price: 0, features: 0, ux: 0, other: 0 };

  monthlyRevenue = 0;
  monthlySuccessPayments = 0;
  planDistribution = { free: 0, basic: 0, premium: 0, student: 0 };

  private revenueChart?: Chart;
  private planChart?: Chart;
  private statusChart?: Chart;
  private viewInitialized = false;

  private readonly adminService = inject(SubAdminService);
  private readonly subscriptionService = inject(SubscriptionService);

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.revenueChart?.destroy();
    this.planChart?.destroy();
    this.statusChart?.destroy();
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      subscriptions: this.adminService.getAllSubscriptions(),
      payments: this.adminService.getAllPayments(),
      promoCodes: this.adminService.getPromoCodes(),
      cancellationStats: this.subscriptionService.getCancellationStats()
    }).subscribe({
      next: ({ subscriptions, payments, promoCodes, cancellationStats }) => {
        const today = new Date();
        const thisMonth = today.getMonth();
        const thisYear = today.getFullYear();
        const previousMonthDate = new Date(thisYear, thisMonth - 1, 1);
        const previousMonth = previousMonthDate.getMonth();
        const previousYear = previousMonthDate.getFullYear();

        const successPayments = payments.filter((p) => p.status === 'SUCCESS');
        const monthlyPayments = successPayments.filter((p) => {
          const d = new Date(p.createdAt);
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });
        const previousMonthlyPayments = successPayments.filter((p) => {
          const d = new Date(p.createdAt);
          return d.getMonth() === previousMonth && d.getFullYear() === previousYear;
        });

        this.monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        this.monthlySuccessPayments = monthlyPayments.length;
        this.cancellationStats = cancellationStats;
        this.cancellationBreakdown = {
          price: cancellationStats.categoryCounts['PRICE'] || 0,
          features: cancellationStats.categoryCounts['FEATURES'] || 0,
          ux: cancellationStats.categoryCounts['UX'] || 0,
          other: cancellationStats.categoryCounts['OTHER'] || 0,
        };

        const activeSubscriptions = subscriptions.filter((s) => s.status === 'ACTIVE').length;
        const cancelledSubscriptions = subscriptions.filter((s) => s.status === 'CANCELLED').length;
        const expiredSubscriptions = subscriptions.filter((s) => s.status === 'EXPIRED').length;
        this.statusCounts = {
          active: activeSubscriptions,
          cancelled: cancelledSubscriptions,
          expired: expiredSubscriptions,
        };
        const activeCodes = promoCodes.filter((c) => c.isActive).length;
        const previousRevenue = previousMonthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const previousActiveCodes = promoCodes.filter((c) => c.isActive && this.isInMonth(c.updatedAt || c.createdAt, previousMonth, previousYear)).length;
        const currentChurn = this.computeChurnRate(subscriptions, thisMonth, thisYear);
        const previousChurn = this.computeChurnRate(subscriptions, previousMonth, previousYear);

        this.planDistribution = this.buildPlanDistribution(subscriptions.map((s) => String(s.planName || '').toUpperCase()));

        this.cards = [
          {
            title: 'Revenue',
            value: `${this.monthlyRevenue.toFixed(2)} TND`,
            tone: 'purple',
            detail: `${monthlyPayments.length} successful payments this month`,
            trendDirection: this.monthlyRevenue >= previousRevenue ? 'up' : 'down',
            trendValue: this.formatTrend(previousRevenue, this.monthlyRevenue),
          },
          {
            title: 'Promo Codes',
            value: `${activeCodes}`,
            tone: 'orange',
            detail: `${promoCodes.length} total codes in system`,
            trendDirection: activeCodes >= previousActiveCodes ? 'up' : 'down',
            trendValue: this.formatTrend(previousActiveCodes, activeCodes),
          },
          {
            title: 'Active Subscriptions',
            value: `${activeSubscriptions}`,
            tone: 'teal',
            detail: `${subscriptions.length} total subscriptions`,
            trendDirection: activeSubscriptions >= Math.max(0, subscriptions.length - activeSubscriptions) ? 'up' : 'down',
            trendValue: `${Math.round((activeSubscriptions / Math.max(subscriptions.length, 1)) * 100)}% active`,
          },
          {
            title: 'Churn Rate',
            value: `${currentChurn.toFixed(1)}%`,
            tone: 'red',
            detail: `${subscriptions.filter((s) => s.status === 'CANCELLED').length} cancelled subscriptions`,
            trendDirection: currentChurn <= previousChurn ? 'down' : 'up',
            trendValue: this.formatTrend(previousChurn, currentChurn),
          },
        ];

        this.recentActivity = this.buildRecentActivity(promoCodes, subscriptions.map((s) => ({
          id: s.id,
          date: s.startDate,
          status: s.status,
          planName: s.planName,
        })), payments.map((p) => ({
          id: p.stripeSessionId,
          date: p.createdAt,
          status: p.status,
          amount: p.amount,
        })));

        this.renderCharts(successPayments.map((p) => ({ amount: p.amount || 0, createdAt: p.createdAt })));
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load dashboard insights.';
        this.loading = false;
      }
    });
  }

  private buildRecentActivity(
    promoCodes: PromoCode[],
    subscriptions: { id: string; date: string; status: string; planName: string }[],
    payments: { id: string; date: string; status: string; amount: number }[]
  ): ActivityItem[] {
    const promoItems: ActivityItem[] = promoCodes.slice(0, 3).map((c) => ({
      title: `Verification update: ${c.code}`,
      subtitle: c.isActive ? 'Verification rule active' : 'Verification rule paused',
      date: c.updatedAt || c.createdAt,
      tone: c.isActive ? 'success' : 'warning',
      icon: 'verification',
    }));

    const subscriptionItems: ActivityItem[] = subscriptions.slice(0, 3).map((s) => ({
      title: `Subscription ${s.planName}`,
      subtitle: `Status: ${s.status}`,
      date: s.date,
      tone: s.status === 'ACTIVE' ? 'success' : s.status === 'CANCELLED' ? 'danger' : 'warning',
      icon: 'subscription',
    }));

    const paymentItems: ActivityItem[] = payments.slice(0, 3).map((p) => ({
      title: `Payment ${p.amount} TND`,
      subtitle: `Status: ${p.status}`,
      date: p.date,
      tone: p.status === 'SUCCESS' ? 'success' : p.status === 'FAILED' ? 'danger' : 'warning',
      icon: 'payment',
    }));

    return [...promoItems, ...subscriptionItems, ...paymentItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }

  private formatTrend(previous: number, current: number): string {
    if (previous <= 0) {
      return current > 0 ? '100%' : '0%';
    }
    const pct = ((current - previous) / previous) * 100;
    return `${Math.abs(pct).toFixed(1)}%`;
  }

  private isInMonth(dateLike: string, month: number, year: number): boolean {
    const d = new Date(dateLike);
    return d.getMonth() === month && d.getFullYear() === year;
  }

  private computeChurnRate(subscriptions: { status: string; startDate: string }[], month: number, year: number): number {
    const started = subscriptions.filter((s) => this.isInMonth(s.startDate, month, year)).length;
    const cancelled = subscriptions.filter((s) => s.status === 'CANCELLED' && this.isInMonth(s.startDate, month, year)).length;
    if (started === 0) return 0;
    return (cancelled / started) * 100;
  }

  private buildPlanDistribution(planNames: string[]): { free: number; basic: number; premium: number; student: number } {
    return planNames.reduce(
      (acc, name) => {
        if (name.includes('BASIC')) acc.basic++;
        else if (name.includes('PREMIUM') || name.includes('GOLD')) acc.premium++;
        else if (name.includes('STUDENT')) acc.student++;
        else acc.free++;
        return acc;
      },
      { free: 0, basic: 0, premium: 0, student: 0 }
    );
  }

  private renderCharts(
    paymentSeries: { amount: number; createdAt: string }[] = []
  ): void {
    if (!this.viewInitialized || !this.revenueChartRef?.nativeElement || !this.planChartRef?.nativeElement) {
      return;
    }

    this.revenueChart?.destroy();
    this.planChart?.destroy();

    const revenueCtx = this.revenueChartRef.nativeElement.getContext('2d');
    const cancellationCtx = this.planChartRef?.nativeElement.getContext('2d');
    const statusCtx = this.statusChartRef?.nativeElement.getContext('2d');
    if (!revenueCtx || !cancellationCtx || !statusCtx) return;

    const monthBuckets = this.getLastSixMonths(paymentSeries);
    const gradient = revenueCtx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(13, 110, 110, 0.42)');
    gradient.addColorStop(1, 'rgba(13, 110, 110, 0.06)');

    const revenueConfig: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: monthBuckets.labels,
        datasets: [{
          data: monthBuckets.values,
          borderColor: '#0d6e6e',
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#7a7368' } },
          y: { grid: { display: false }, ticks: { color: '#7a7368' } }
        }
      }
    };

    const cancellationConfig: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Price', 'Features', 'UX', 'Other'],
        datasets: [{
          data: [
            this.cancellationBreakdown.price,
            this.cancellationBreakdown.features,
            this.cancellationBreakdown.ux,
            this.cancellationBreakdown.other
          ],
          backgroundColor: ['#0d6e6e', '#c97d2a', '#2e7d52', '#7a7368'],
          borderWidth: 0,
          hoverOffset: 10,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#7a7368', usePointStyle: true, boxWidth: 10 }
          }
        },
        cutout: '65%',
      }
    };

    const statusConfig: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Active', 'Expired', 'Cancelled'],
        datasets: [{
          data: [this.statusCounts.active, this.statusCounts.expired, this.statusCounts.cancelled],
          backgroundColor: ['#0d6e6e', '#7a7368', '#c97d2a'],
          borderWidth: 0,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#7a7368', usePointStyle: true, boxWidth: 10 }
          }
        },
        cutout: '70%',
      }
    };

    this.revenueChart = new Chart(revenueCtx, revenueConfig);
    this.planChart = new Chart(cancellationCtx, cancellationConfig);
    this.statusChart = new Chart(statusCtx, statusConfig);
  }

  private getLastSixMonths(payments: { amount: number; createdAt: string }[]): { labels: string[]; values: number[] } {
    const now = new Date();
    const labels: string[] = [];
    const values: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      labels.push(d.toLocaleString('en-US', { month: 'short' }));
      values.push(
        payments
          .filter((p) => {
            const pd = new Date(p.createdAt);
            return pd.getMonth() === month && pd.getFullYear() === year;
          })
          .reduce((sum, p) => sum + p.amount, 0)
      );
    }
    return { labels, values };
  }
}
