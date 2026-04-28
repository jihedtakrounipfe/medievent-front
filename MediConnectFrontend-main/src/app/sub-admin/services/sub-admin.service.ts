import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  AdminDoctorPlan,
  AdminPaymentRecord,
  AdminPatientPlan,
  AdminSubscriptionRecord,
  CreatePromoCodeRequest,
  PromoCode,
} from '../models/sub-admin.models';

@Injectable({ providedIn: 'root' })
export class SubAdminService {

  private api = environment.apiUrl;

  private readonly http = inject(HttpClient);

  // ── PATIENT PLANS ──────────────────────────────────────────────────────
  getAllPatientPlans(): Observable<AdminPatientPlan[]> {
    return this.http.get<AdminPatientPlan[]>(`${this.api}/api/admin/plans/patient/getAll`);
  }

  createPatientPlan(plan: AdminPatientPlan): Observable<AdminPatientPlan> {
    return this.http.post<AdminPatientPlan>(`${this.api}/api/admin/plans/patient/create`, plan);
  }

  updatePatientPlan(id: string, plan: AdminPatientPlan): Observable<AdminPatientPlan> {
    return this.http.put<AdminPatientPlan>(`${this.api}/api/admin/plans/patient/update/${id}`, plan);
  }

  deletePatientPlan(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/api/admin/plans/patient/delete/${id}`);
  }

  togglePatientPlan(id: string): Observable<AdminPatientPlan> {
    return this.http.put<AdminPatientPlan>(`${this.api}/api/admin/plans/patient/toggle/${id}`, {});
  }

  // ── DOCTOR PLANS ───────────────────────────────────────────────────────
  getAllDoctorPlans(): Observable<AdminDoctorPlan[]> {
    return this.http.get<AdminDoctorPlan[]>(`${this.api}/api/admin/plans/doctor/getAll`);
  }

  createDoctorPlan(plan: AdminDoctorPlan): Observable<AdminDoctorPlan> {
    return this.http.post<AdminDoctorPlan>(`${this.api}/api/admin/plans/doctor/create`, plan);
  }

  updateDoctorPlan(id: string, plan: AdminDoctorPlan): Observable<AdminDoctorPlan> {
    return this.http.put<AdminDoctorPlan>(`${this.api}/api/admin/plans/doctor/update/${id}`, plan);
  }

  deleteDoctorPlan(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/api/admin/plans/doctor/delete/${id}`);
  }

  toggleDoctorPlan(id: string): Observable<AdminDoctorPlan> {
    return this.http.put<AdminDoctorPlan>(`${this.api}/api/admin/plans/doctor/toggle/${id}`, {});
  }

  // ── SUBSCRIPTIONS ──────────────────────────────────────────────────────
  getAllSubscriptions(): Observable<AdminSubscriptionRecord[]> {
    return this.http.get<AdminSubscriptionRecord[]>(`${this.api}/api/admin/subscriptions/getAll`);
  }

  getSubscriptionsByUser(userId: string): Observable<AdminSubscriptionRecord[]> {
    return this.http.get<AdminSubscriptionRecord[]>(`${this.api}/api/admin/subscriptions/getByUser/${userId}`);
  }

  cancelSubscription(id: string): Observable<AdminSubscriptionRecord> {
    return this.http.put<AdminSubscriptionRecord>(`${this.api}/api/admin/subscriptions/cancel/${id}`, {});
  }

  getSubscriptionsByPlan(planId: string, type: 'patient' | 'doctor'): Observable<AdminSubscriptionRecord[]> {
    return this.http.get<AdminSubscriptionRecord[]>(`${this.api}/api/admin/subscriptions/getByPlan/${type}/${planId}`);
  }

  // ── PAYMENTS ───────────────────────────────────────────────────────────
  getAllPayments(): Observable<AdminPaymentRecord[]> {
    return this.http.get<AdminPaymentRecord[]>(`${this.api}/api/admin/payments/getAll`);
  }

  getPaymentsByUser(userId: string): Observable<AdminPaymentRecord[]> {
    return this.http.get<AdminPaymentRecord[]>(`${this.api}/api/admin/payments/getByUser/${userId}`);
  }


  // ── PROMO CODES ────────────────────────────────────────────────────────
  getPromoCodes(): Observable<PromoCode[]> {
    return this.http.get<PromoCode[]>(`${this.api}/api/promo-codes/admin/all`);
  }

  createPromoCode(data: CreatePromoCodeRequest, adminId: string): Observable<PromoCode> {
    return this.http.post<PromoCode>(`${this.api}/api/promo-codes/admin/create?adminId=${adminId}`, data);
  }

  updatePromoCode(id: string, data: PromoCode): Observable<PromoCode> {
    return this.http.put<PromoCode>(`${this.api}/api/promo-codes/admin/update/${id}`, data);
  }

  deletePromoCode(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/api/promo-codes/admin/delete/${id}`);
  }

  togglePromoCode(id: string): Observable<void> {
    return this.http.put<void>(`${this.api}/api/promo-codes/admin/toggle/${id}`, {});
  }
}
