import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { SubscriptionService } from '../services/subscription.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { DoctorPlan, PatientPlan } from '../models/subscription.models';
import { AudioTourService } from '../services/audio-tour.service';
import { AnyUser, isPatient } from '../../../core/user';

type BasePlan = PatientPlan | DoctorPlan;

type DecoratedPlan = BasePlan & {
  features: string[];
  bestFor: string;
  summary: string;
  whenToChoose: string;
  mainLimit: string;
};

@Component({
  selector: 'app-plans-guide',
  standalone: true,
  imports: [CommonModule, SlicePipe, RouterLink],
  template: `
    <div class="min-h-full bg-gray-50 py-12">
      <div class="mx-auto w-full max-w-5xl px-8">
        @if (user$ | async; as user) {
          <div class="mb-16 text-center">
            <p class="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-teal-600">Decision Support</p>
            <h1 class="text-4xl font-black tracking-tight text-gray-900 sm:text-6xl leading-tight">Plan Selection Guide</h1>
            <p class="mt-4 text-base text-gray-600 max-w-2xl mx-auto">
              A comprehensive breakdown of every plan available for 
              <span class="font-bold text-gray-900 uppercase tracking-tighter">{{ (isPatient(user) ? 'PATIENT' : 'DOCTOR') }}s</span>.
            </p>
            <button (click)="startFullAudioTour()" 
                    class="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              🎧🚀 Start Audio Tour
            </button>
            <button (click)="describeThisPage()" 
                    class="mt-6 ml-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
              🎧 Describe This Page
            </button>
          </div>

          <div class="space-y-8">
            @for (plan of plans; track plan.id; let i = $index) {
              <div class="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-sm ring-1 ring-gray-200 transition hover:shadow-xl hover:ring-teal-100">
                <div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-50/50 blur-3xl transition group-hover:bg-teal-100/50"></div>
                
                <div class="relative grid gap-8 lg:grid-cols-3">
                  <!-- Plan Title & Intent -->
                  <div class="lg:col-span-1">
                    <div class="flex items-center gap-3">
                      <h2 class="text-3xl font-black text-gray-900">{{ plan.name }}</h2>
                      <span class="rounded-full bg-gray-900 px-3 py-0.5 text-[10px] font-black text-white uppercase tracking-widest">
                        Tier {{ i + 1 }}
                      </span>
                    </div>
                    <p class="mt-4 text-sm font-bold italic text-teal-600 leading-relaxed">{{ plan.whenToChoose }}</p>
                    <p class="mt-4 text-sm text-gray-500 leading-relaxed">{{ plan.summary }}</p>
                  </div>

                  <!-- Features Grid -->
                  <div class="lg:col-span-1">
                     <p class="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Included Perks</p>
                     <ul class="grid gap-3">
                        @for (feature of (plan.features | slice:0:6); track feature) {
                          <li class="flex items-start gap-3 text-sm text-gray-600 font-medium">
                            <svg class="mt-1 h-4 w-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                            {{ feature }}
                          </li>
                        }
                     </ul>
                  </div>

                  <!-- Pricing & CTA -->
                  <div class="flex flex-col items-start justify-between lg:col-span-1 lg:items-end">
                    <div class="text-left lg:text-right">
                       <p class="text-3xl font-black text-gray-900">{{ plan.priceMonthly }} <span class="text-sm font-bold text-gray-400">TND / mo</span></p>
                       <p class="mt-1 text-sm font-bold text-emerald-600">{{ plan.priceYearly }} TND yearly</p>
                    </div>
                    <button (click)="goToPlans()" class="mt-8 rounded-2xl bg-gray-900 px-8 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-1 hover:bg-gray-800">
                       Select this tier
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Comparison Table -->
          @if (plans.length > 0) {
            <div class="mt-20 overflow-hidden rounded-[2.5rem] bg-white shadow-sm ring-1 ring-gray-200">
              <div class="bg-gray-50 px-10 py-6 border-b border-gray-100">
                 <h3 class="text-lg font-black text-gray-900">Side-by-Side Comparison</h3>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left">
                  <thead>
                    <tr class="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <th class="px-10 py-4">Plan Name</th>
                      <th class="px-10 py-4">Best For</th>
                      <th class="px-10 py-4">Main Limit</th>
                      <th class="px-10 py-4 text-right">Price (Mo)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    @for (plan of plans; track plan.id) {
                      <tr class="transition hover:bg-gray-50/50">
                        <td class="px-10 py-6 font-black text-gray-900">{{ plan.name }}</td>
                        <td class="px-10 py-6 text-sm text-gray-500 font-medium">{{ plan.bestFor }}</td>
                        <td class="px-10 py-6">
                           <span class="rounded-lg bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-100">
                             {{ plan.mainLimit }}
                           </span>
                        </td>
                        <td class="px-10 py-6 text-right font-black text-gray-900">{{ plan.priceMonthly }} TND</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class PlansGuideComponent implements OnInit {
  protected readonly isPatient = isPatient;
  private subscriptionService = inject(SubscriptionService);
  private authFacade = inject(AuthFacade);
  private router = inject(Router);
  public readonly audioTourService = inject(AudioTourService);

  user$ = this.authFacade.currentUser$;
  plans: DecoratedPlan[] = [];

  ngOnInit(): void {
    this.audioTourService.registerTour('plans-guide', [
      'This guide provides an editorial comparison of all plans in one place.',
      'Each row summarizes what a plan includes, when to choose it, and its pricing.',
      'Use the comparison table to review best fit and limits before making a final choice.'
    ]);

    this.user$.subscribe(user => {
      if (!user) {
        this.router.navigate(['/plans']);
        return;
      }

      const role = isPatient(user) ? 'PATIENT' : 'DOCTOR';
      const call: Observable<BasePlan[]> = role === 'PATIENT'
        ? this.subscriptionService.getPatientPlans()
        : this.subscriptionService.getDoctorPlans();

      call.subscribe({
        next: (data) => {
          this.plans = data.map((plan) => this.decoratePlan(plan, role));
          this.audioTourService.setPageContext('plans-guide',
            `Plans Guide showing ${this.plans.length} plans: ${this.plans.map(p => p.name + ' at ' + p.priceMonthly + ' DT per month').join(', ')}`
          );
        },
        error: () => {
          this.plans = [];
        }
      });
    });
  }

  goToPlans(): void {
    this.router.navigate(['/plans']);
  }

  startFullAudioTour(): void {
    this.audioTourService.startFullTour();
  }

  describeThisPage(): void {
    this.audioTourService.startTourForCurrentPage();
  }

  private decoratePlan(plan: BasePlan, role: string): DecoratedPlan {
    const features = this.extractFeatures(plan, role);
    return {
      ...plan,
      features,
      bestFor: this.getBestFor(plan.name, role),
      summary: this.getSummary(plan.name, role),
      whenToChoose: this.getWhenToChoose(plan.name, role),
      mainLimit: this.getMainLimit(plan, role),
    };
  }

  private extractFeatures(plan: BasePlan, role: string): string[] {
    const features: string[] = [];
    if (role === 'PATIENT') {
      const patientPlan = plan as PatientPlan;
      if (patientPlan.maxAppointmentsPerMonth === null) features.push('Unlimited appointments');
      else features.push(`Up to ${patientPlan.maxAppointmentsPerMonth} appointments / month`);
      if (patientPlan.hasDocumentUpload) features.push('Document upload');
      if (patientPlan.hasMedicationReminder) features.push('Medication reminders');
      if (patientPlan.hasLabResults) features.push('Lab results access');
      if (patientPlan.hasSelfTestReadings) features.push('Self-test readings');
      if (patientPlan.hasForum) features.push('Community forum access');
      if (patientPlan.hasHealthEvents) features.push('Health events');
      if (patientPlan.hasAI) features.push('AI assistant');
    } else {
      const doctorPlan = plan as DoctorPlan;
      if (doctorPlan.maxConsultationsPerMonth === null) features.push('Unlimited consultations');
      else features.push(`Up to ${doctorPlan.maxConsultationsPerMonth} consultations / month`);
      if (doctorPlan.hasSearchVisibility) features.push('Search visibility');
      if (doctorPlan.hasCalendarSync) features.push('Calendar sync');
      if (doctorPlan.hasBasicAnalytics) features.push('Basic analytics');
      if (doctorPlan.hasAdvancedAnalytics) features.push('Advanced analytics');
      if (doctorPlan.hasForumBadge) features.push('Forum badge');
      if (doctorPlan.hasConsultationPrerequisites) features.push('Consultation prerequisites');
      if (doctorPlan.hasAI) features.push('AI assistant');
    }
    return features;
  }

  private getBestFor(planName: string, role: string): string {
    const key = String(planName).toUpperCase();
    if (role === 'DOCTOR') {
      if (key === 'GOLD') return 'Growing practices needing advanced insights';
      return 'Doctors who need reliable digital practice tools';
    }

    if (key === 'PREMIUM') return 'Frequent care and specialist follow-up';
    if (key === 'STUDENT') return 'Verified students with budget focus';
    return 'Occasional healthcare needs';
  }

  private getSummary(planName: string, role: string): string {
    const key = String(planName).toUpperCase();
    if (role === 'DOCTOR') {
      if (key === 'GOLD') return 'Full growth toolkit with advanced analytics and AI support.';
      return 'Core professional plan for daily consultations and visibility.';
    }

    if (key === 'PREMIUM') return 'Comprehensive care tools for recurring needs.';
    if (key === 'STUDENT') return 'Affordable essentials with student pricing.';
    return 'Simple starter plan for light usage.';
  }

  private getWhenToChoose(planName: string, role: string): string {
    const key = String(planName).toUpperCase();
    if (role === 'DOCTOR') {
      if (key === 'GOLD') return 'Choose GOLD when you need deeper analytics, AI support, and premium workflow features.';
      return 'Choose SILVER when you want strong day-to-day operations without advanced extras.';
    }

    if (key === 'PREMIUM') return 'Choose PREMIUM if you book often, track many documents, and want richer follow-up tools.';
    if (key === 'STUDENT') return 'Choose STUDENT if you are verified and need the lowest price for essential coverage.';
    return 'Choose BASIC if your visits are occasional and you only need the core essentials.';
  }

  private getMainLimit(plan: BasePlan, role: string): string {
    if (role === 'DOCTOR' && 'maxConsultationsPerMonth' in plan) {
      return plan.maxConsultationsPerMonth === null
        ? 'Unlimited consultations'
        : `${plan.maxConsultationsPerMonth}/month`;
    }

    if ('maxAppointmentsPerMonth' in plan) {
      return plan.maxAppointmentsPerMonth === null
        ? 'Unlimited appointments'
        : `${plan.maxAppointmentsPerMonth}/month`;
    }

    return role === 'DOCTOR'
      ? 'Unlimited consultations'
      : 'Unlimited appointments';
  }
}

