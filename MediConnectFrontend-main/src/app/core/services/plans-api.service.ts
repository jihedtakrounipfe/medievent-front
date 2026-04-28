import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { inject } from '@angular/core';

export type PlanName = 'FREE' | 'BASIC' | 'PREMIUM' | 'STUDENT' | 'SILVER' | 'GOLD';

export interface PatientPlan {
  id?: string;
  name: PlanName;
  priceMonthly: number;
  priceYearly: number;
  maxAppointmentsPerMonth: number | null;
  hasDocumentUpload: boolean;
  hasMedicationReminder: boolean;
  hasLabResults: boolean;
  hasSelfTestReadings: boolean;
  hasForum: boolean;
  hasAI: boolean;
  hasHealthEvents: boolean;
  isActive?: boolean;
}

export interface DoctorPlan {
  id?: string;
  name: PlanName;
  priceMonthly: number;
  priceYearly: number;
  maxConsultationsPerMonth: number | null;
  hasCalendarSync: boolean;
  hasSearchVisibility: boolean;
  hasBasicAnalytics: boolean;
  hasAdvancedAnalytics: boolean;
  hasForumBadge: boolean;
  hasConsultationPrerequisites: boolean;
  hasAI: boolean;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PlansApiService {
  private base = 'http://localhost:8080/api';
  private http = inject(HttpClient);

  // User-facing (active only)
  getActivePatientPlans(): Observable<PatientPlan[]> {
    return this.http.get<PatientPlan[]>(`${this.base}/plans/patient/getAll`);
  }

  getActiveDoctorPlans(): Observable<DoctorPlan[]> {
    return this.http.get<DoctorPlan[]>(`${this.base}/plans/doctor/getAll`);
  }

  // Admin CRUD
  getAllPatientPlansAdmin(): Observable<PatientPlan[]> {
    return this.http.get<PatientPlan[]>(`${this.base}/admin/plans/patient/getAll`);
  }

  createPatientPlan(plan: PatientPlan): Observable<PatientPlan> {
    return this.http.post<PatientPlan>(`${this.base}/admin/plans/patient/create`, plan);
  }

  updatePatientPlan(id: string, plan: PatientPlan): Observable<PatientPlan> {
    return this.http.put<PatientPlan>(`${this.base}/admin/plans/patient/update/${id}`, plan);
  }

  togglePatientPlan(id: string): Observable<void> {
    return this.http.put<void>(`${this.base}/admin/plans/patient/toggle/${id}`, {});
  }

  getAllDoctorPlansAdmin(): Observable<DoctorPlan[]> {
    return this.http.get<DoctorPlan[]>(`${this.base}/admin/plans/doctor/getAll`);
  }

  createDoctorPlan(plan: DoctorPlan): Observable<DoctorPlan> {
    return this.http.post<DoctorPlan>(`${this.base}/admin/plans/doctor/create`, plan);
  }

  updateDoctorPlan(id: string, plan: DoctorPlan): Observable<DoctorPlan> {
    return this.http.put<DoctorPlan>(`${this.base}/admin/plans/doctor/update/${id}`, plan);
  }

  toggleDoctorPlan(id: string): Observable<void> {
    return this.http.put<void>(`${this.base}/admin/plans/doctor/toggle/${id}`, {});
  }
}
