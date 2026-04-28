import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionService } from '../services/subscription.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { UserType, AnyUser, isPatient, isDoctor, isAdministrator } from '../../../core/user';
import { BillingCycle, DoctorPlan, PatientPlan, SubscriptionResponse } from '../models/subscription.models';
import { PlanChatComponent } from '../plan-chat/plan-chat.component';
import { AudioTourService } from '../services/audio-tour.service';
import { forkJoin } from 'rxjs';

type BasePlan = PatientPlan | DoctorPlan;
type PlanWithFeatures = BasePlan & { features: string[] };


@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, PlanChatComponent],
  templateUrl: './plans.component.html',
  styles: [
    `
      .plans-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
        justify-items: center;
        justify-content: center;
        max-width: 1200px;
        margin: 0 auto;
      }

      .plans-grid.two-plans {
        grid-template-columns: repeat(2, minmax(280px, 400px));
        justify-content: center;
      }
    `
  ]
})
export class PlansComponent implements OnInit {

  user: AnyUser | null = null;
  plans: PlanWithFeatures[] = [];
  loading = false;
  error = '';
  message = '';
  recommendedPlanName: string | null = null;
  activeSubscription: SubscriptionResponse | null = null;
  changingPlanId: number | null = null;
  studentStatus: 'APPROVED' | 'PENDING' | 'REJECTED' | 'EXPIRED' | 'NOT_SUBMITTED' = 'NOT_SUBMITTED';

  private subscriptionService = inject(SubscriptionService);
  private authFacade = inject(AuthFacade);
  private router = inject(Router);
  public readonly audioTourService = inject(AudioTourService);

  ngOnInit(): void {
    this.audioTourService.registerTour('plans', [
      'This page shows all available subscription plans for your current user role.',
      'Each plan displays key features, monthly pricing, and student discount status where relevant.',
      'Choose a plan here to continue to checkout and finalize your subscription.'
    ]);
    this.authFacade.currentUser$.subscribe(user => {
      this.user = user;
      if (!user) {
        // Redirection handled by authGuard, but safety first
        this.router.navigate(['/auth/login']);
        return;
      }
      this.loadStudentVerificationStatus();
      this.loadActiveSubscriptionLock();
      this.loadPlans();
    });
  }

  private loadStudentVerificationStatus(): void {
    if (!this.user || !isPatient(this.user)) {
      this.studentStatus = 'NOT_SUBMITTED';
      return;
    }

    this.subscriptionService.getStudentVerificationStatus().subscribe({
      next: (status) => {
        if (status.requestFound === false || (!status.id && !status.userId && !status.status)) {
          this.studentStatus = 'NOT_SUBMITTED';
          return;
        }

        this.studentStatus = status.status ?? 'NOT_SUBMITTED';
      },
      error: () => {
        this.studentStatus = 'NOT_SUBMITTED';
      }
    });
  }

  private loadActiveSubscriptionLock(): void {
    if (!this.user) return;

    this.subscriptionService.getActive(this.user.id).subscribe({
      next: (active) => {
        this.activeSubscription = active;
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.activeSubscription = null;
        }
      }
    });
  }

  get hasActiveSubscription(): boolean {
    return !!this.activeSubscription;
  }

  loadPlans(): void {
    this.loading = true;
    this.error = '';
    this.plans = [];

    if (!this.user) return;

    if (isAdministrator(this.user)) {
      // Admin sees both
      forkJoin({
        patient: this.subscriptionService.getPatientPlans(),
        doctor: this.subscriptionService.getDoctorPlans()
      }).subscribe({
        next: ({ patient, doctor }) => {
          const allPlans = [...patient, ...doctor];
          const ordered = allPlans.sort((a, b) => this.getPlanOrder(a?.name) - this.getPlanOrder(b?.name));
          this.plans = ordered.map(plan => ({
            ...plan,
            features: this.extractFeatures(plan, (plan as PatientPlan).maxAppointmentsPerMonth !== undefined ? 'PATIENT' : 'DOCTOR')
          }));
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load plans for Admin.';
          this.loading = false;
        }
      });
      return;
    }

    const role = isPatient(this.user) ? 'PATIENT' : 'DOCTOR';
    const call: Observable<BasePlan[]> = isPatient(this.user)
      ? this.subscriptionService.getPatientPlans()
      : this.subscriptionService.getDoctorPlans();

    call.subscribe({
      next: (data) => {
        const ordered = [...data].sort((a, b) => this.getPlanOrder(a?.name) - this.getPlanOrder(b?.name));
        this.plans = ordered.map(plan => ({
          ...plan,
          features: this.extractFeatures(plan, role)
        }));
        this.loading = false;
        const loadedRole = role;
        const planList = this.plans.map((p) =>
          `${p.name} at ${p.priceMonthly} DT/month`
        ).join(', ');

        this.audioTourService.setPageContext('plans',
          `This is the Plans page for a ${loadedRole}. Available plans are: ${planList}. ${
            loadedRole === 'PATIENT' && this.studentStatus === 'APPROVED'
              ? 'Student discount of 50% is active on the PREMIUM plan.'
              : loadedRole === 'PATIENT' && this.studentStatus === 'NOT_SUBMITTED'
              ? 'Student discount is available - apply for 50% off PREMIUM.'
              : ''
          }`
        );
      },
      error: (err) => {
        console.error('Failed to load plans:', err);
        this.error = 'Failed to load plans.';
        this.loading = false;
      }
    });
  }

  private extractFeatures(plan: BasePlan, role: 'PATIENT' | 'DOCTOR'): string[] {
    const features: string[] = [];
    if (role === 'PATIENT') {
      const patientPlan = plan as PatientPlan;
      if (patientPlan.maxAppointmentsPerMonth === null) features.push('Unlimited Appointments');
      else features.push(`${patientPlan.maxAppointmentsPerMonth} Appointments/month`);
      if (patientPlan.hasDocumentUpload) features.push('Document Upload');
      if (patientPlan.hasMedicationReminder) features.push('Medication Reminders');
      if (patientPlan.hasLabResults) features.push('Lab Results');
      if (patientPlan.hasSelfTestReadings) features.push('Self-test Readings');
      if (patientPlan.hasForum) features.push('Community Forum');
      if (patientPlan.hasHealthEvents) features.push('Health Events');
      if (patientPlan.hasAI) features.push('AI Assistant');
    } else {
      const doctorPlan = plan as DoctorPlan;
      if (doctorPlan.maxConsultationsPerMonth === null) features.push('Unlimited Consultations');
      else features.push(`${doctorPlan.maxConsultationsPerMonth} Consultations/month`);
      if (doctorPlan.hasSearchVisibility) features.push('Visible in Search');
      if (doctorPlan.hasCalendarSync) features.push('Calendar Sync');
      if (doctorPlan.hasBasicAnalytics) features.push('Basic Analytics');
      if (doctorPlan.hasAdvancedAnalytics) features.push('Advanced Analytics');
      if (doctorPlan.hasForumBadge) features.push('Forum Badge');
      if (doctorPlan.hasConsultationPrerequisites) features.push('Consultation Prerequisites');
      if (doctorPlan.hasAI) features.push('AI Assistant');
    }
    return features;
  }

  selectPlan(plan: PlanWithFeatures): void {
    if (!this.user) return;

    if (this.isCurrentPlan(plan)) {
      return;
    }

    if (isAdministrator(this.user)) {
      this.message = "Admins cannot purchase plans. Please use the Admin dashboard to manage plans.";
      return;
    }

    const role = isPatient(this.user) ? 'PATIENT' : 'DOCTOR';

    this.router.navigate(['/checkout'], {
      state: {
        planId: plan.id,
        planName: plan.name,
        role: role,
        billingCycle: 'MONTHLY' as BillingCycle,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        isPlanChange: this.hasActiveSubscription,
        currentSubscriptionId: this.activeSubscription?.id ?? null,
        currentPlanName: this.activeSubscription?.planName ?? null,
      }
    });
  }

  getSelectButtonLabel(plan: PlanWithFeatures): string {
    if (!this.hasActiveSubscription) return 'Choose Plan';

    const activeName = this.activeSubscription?.planName || 'current';
    if (String(plan?.name || '').toUpperCase() === String(activeName).toUpperCase()) {
      return 'Current Plan';
    }

    return this.hasActiveSubscription ? 'Change Plan' : 'Choose Plan';
  }

  isCurrentPlan(plan: PlanWithFeatures): boolean {
    if (!this.activeSubscription || !plan?.name) return false;
    return String(plan.name).toUpperCase() === String(this.activeSubscription.planName).toUpperCase();
  }

  isChangeInProgress(plan: PlanWithFeatures): boolean {
    return !!plan?.id && this.changingPlanId === plan.id;
  }

  private getPlanOrder(name: string | null | undefined): number {
    const key = String(name || '').trim().toUpperCase();
    const order: Record<string, number> = {
      STUDENT: 1,
      BASIC: 2,
      SILVER: 3,
      PREMIUM: 4,
      GOLD: 5,
    };
    return order[key] ?? 99;
  }

  openPlansGuide(): void {
    this.router.navigate(['/plans-guide']);
  }

  onPlanRecommended(planName: string): void {
    this.recommendedPlanName = (planName || '').trim().toUpperCase();
  }

  isRecommended(plan: PlanWithFeatures): boolean {
    if (!this.recommendedPlanName || !plan?.name) {
      return false;
    }
    return String(plan.name).toUpperCase() === this.recommendedPlanName;
  }

  isGoldPlan(plan: PlanWithFeatures): boolean {
    return String(plan?.name || '').trim().toUpperCase() === 'GOLD';
  }

  isPremiumPlan(plan: PlanWithFeatures): boolean {
    return String(plan?.name || '').trim().toUpperCase() === 'PREMIUM';
  }

  isBasicPlan(plan: PlanWithFeatures): boolean {
    return String(plan?.name || '').trim().toUpperCase() === 'BASIC';
  }

  isSilverPlan(plan: PlanWithFeatures): boolean {
    return String(plan?.name || '').trim().toUpperCase() === 'SILVER';
  }

  getPremiumDisplayPrice(plan: PlanWithFeatures): number {
  return plan.priceMonthly;
}

  getPremiumState(plan: PlanWithFeatures): 'APPROVED' | 'PENDING' | 'REJECTED' | 'EXPIRED' | 'NOT_SUBMITTED' | 'DEFAULT' {
    if (!this.isPremiumPlan(plan) || !this.user || !isPatient(this.user)) {
      return 'DEFAULT';
    }

    return this.studentStatus;
  }

  goToStudentVerificationStatus(): void {
    this.router.navigate(['/subscription/student-verification']);
  }

  goToStudentVerificationApply(): void {
    this.router.navigate(['/subscription/student-verification/apply']);
  }

  startFullAudioTour(): void {
    this.audioTourService.startFullTour();
  }

  describeThisPage(): void {
    this.audioTourService.startTourForCurrentPage();
  }
}

