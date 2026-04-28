import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SubscriptionService } from '../services/subscription.service';
import { PatientPlan, DoctorPlan } from '../models/subscription.models';
import { AudioTourService } from '../services/audio-tour.service';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pricing.component.html',
})
export class PricingComponent implements OnInit {
  patientPlans: PatientPlan[] = [];
  doctorPlans: DoctorPlan[] = [];
  loading = false;
  error = '';

  private plansApi = inject(SubscriptionService);
  public readonly audioTourService = inject(AudioTourService);

  ngOnInit(): void {
    this.audioTourService.registerTour('pricing', [
      'This page provides a public overview of active patient and doctor plan pricing.',
      'Use it for quick reference before opening the full plans selection flow.'
    ]);
    this.loading = true;
    this.error = '';

    forkJoin({
      patientPlans: this.plansApi.getPatientPlans(),
      doctorPlans: this.plansApi.getDoctorPlans(),
    }).subscribe({
      next: ({ patientPlans, doctorPlans }) => {
        this.patientPlans = patientPlans;
        this.doctorPlans = doctorPlans;
        this.loading = false;
        this.audioTourService.setPageContext('pricing',
          `Pricing page loaded with ${patientPlans.length} patient plans and ${doctorPlans.length} doctor plans for quick comparison.`
        );
      },
      error: (err: unknown) => {
        console.error(err);
        this.error = 'Failed to load pricing plans.';
        this.loading = false;
      }
    });
  }

  describeThisPage(): void {
    this.audioTourService.startTourForCurrentPage();
  }
}

