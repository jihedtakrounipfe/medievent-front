import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  SubscriptionRequest,
  SubscriptionResponse,
  PatientPlan,
  DoctorPlan,
  PlanChatRequest,
  PlanChatResponse,
  UserCredit,
  UpgradeDowngradeRequest,
  UpgradeDowngradeResponse,
  CancellationRequest,
  CancellationResponse,
  CancellationStatsResponse
} from '../models/subscription.models';

export interface StudentVerificationStatus {
  id?: number;
  userId?: number;
  requestFound?: boolean;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  expiresAt?: string | null;
  expiresOn?: string | null;
  discountExpiresAt?: string | null;
  validUntil?: string | null;
  daysRemaining?: number | null;
  expiresInDays?: number | null;
  progressPercentage?: number;
  progressStep?: string;
  progressMessage?: string;
  nextAction?: string;
  nextPagePath?: string;
  rejectionReason?: string | null;
  confidenceScore?: number | null;
}

export interface PromoCodeValidation {
  valid: boolean;
  discount?: number;
  discountValue?: number;
  discountAmount?: number;
  finalPrice?: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  message?: string | null;
}

export interface PromoCodeRecord {
  id: number;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  maxUsesTotal?: number | null;
  currentUseCount?: number | null;
  planType: 'PATIENT' | 'DOCTOR' | 'BOTH';
  planName?: string;
  billingCycle: 'MONTHLY' | 'YEARLY' | 'BOTH';
}

export interface CreditHistoryEntry {
  id?: number;
  createdAt?: string;
  date?: string;
  timestamp?: string;
  description?: string;
  reason?: string;
  type?: string;
  amount?: number;
  balanceAfter?: number;
  remainingBalance?: number;
  fromPlan?: string;
  toPlan?: string;
}

export interface CheckoutPriceSummary {
  baseAmount?: number;
  studentDiscountAmount?: number;
  promoDiscountAmount?: number;
  totalDiscountAmount?: number;
  creditUsed?: number;
  finalAmount?: number;
  creditRemaining?: number;
}

export interface CheckoutSessionRequest {
  userId: number;
  patientPlanId: number | null;
  doctorPlanId: number | null;
  billingCycle: string;
  planPrice: number;
  currentSubscriptionId?: number | null;
  isPlanChange?: boolean;
  promoCode?: string | null;
  basePrice?: number;
  finalPrice?: number;
  amountDue?: number;
  appliedCreditAmount?: number;
  discountValue?: number;
  discountAmount?: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
}

export interface CheckoutSessionResponse {
  url?: string;
  sessionId?: string;          // 'CREDIT_APPLIED_NO_CHECKOUT' if credit covers it
  creditUsed?: number;
  creditRemaining?: number;
  priceSummary?: CheckoutPriceSummary;
}


export interface CheckoutSummaryRequest {
  userId: number;
  planId: number;
  planType: 'PATIENT' | 'DOCTOR';
  billingCycle: string;
  promoCode?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {

  private api = environment.apiUrl; // http://localhost:8080/api
  private http = inject(HttpClient);

  // ── PLANS ──────────────────────────────────────────────────────────────────

  getPatientPlans(): Observable<PatientPlan[]> {
    return this.http.get<PatientPlan[]>(`${this.api}/api/plans/patient/getAll`);
  }

  getDoctorPlans(): Observable<DoctorPlan[]> {
    return this.http.get<DoctorPlan[]>(`${this.api}/api/plans/doctor/getAll`);
  }

  // ── SUBSCRIPTIONS ──────────────────────────────────────────────────────────

  subscribe(request: SubscriptionRequest): Observable<SubscriptionResponse> {
    return this.http.post<SubscriptionResponse>(`${this.api}/api/subscriptions/subscribe`, request);
  }

  getActive(userId: number): Observable<SubscriptionResponse> {
    return this.http.get<SubscriptionResponse>(`${this.api}/api/subscriptions/getActive/${userId}`);
  }

  getHistory(userId: number): Observable<SubscriptionResponse[]> {
    return this.http.get<SubscriptionResponse[]>(`${this.api}/api/subscriptions/getHistory/${userId}`);
  }

  cancelSubscription(userId: number, request: CancellationRequest): Observable<CancellationResponse> {
    return this.http.put<CancellationResponse>(`${this.api}/api/subscriptions/cancel/${userId}`, request);
  }

  // ── CREDIT SYSTEM ──────────────────────────────────────────────────────────

     getCredit(userId: number): Observable<UserCredit> {
  return this.http.get<UserCredit>(`${this.api}/api/subscriptions/credit/${userId}`);
}

getCreditHistory(userId: number): Observable<CreditHistoryEntry[]> {
  return this.http.get<CreditHistoryEntry[]>(`${this.api}/api/subscriptions/credit/history/${userId}`);
}

  upgradeDowngrade(userId: number, request: UpgradeDowngradeRequest): Observable<UpgradeDowngradeResponse> {
    return this.http.post<UpgradeDowngradeResponse>(`${this.api}/api/subscriptions/upgrade-downgrade/${userId}`, request);
  }

  hasFeature(userId: number, feature: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.api}/api/subscriptions/hasFeature/${userId}/${feature}`);
  }
  // POST /api/plan-recommendation/chat
  chat(request: PlanChatRequest): Observable<PlanChatResponse> {
    return this.http.post<PlanChatResponse>(`${this.api}/api/plan-recommendation/chat`, request);
  }

  toggleAutoRenew(userId: number): Observable<void> {
    return this.http.put<void>(`${this.api}/api/subscriptions/autorenew/${userId}`, {});
  }

  // ── STRIPE PAYMENTS ────────────────────────────────────────────────────────

  createCheckoutSession(request: CheckoutSessionRequest): Observable<CheckoutSessionResponse> {
    let params = new HttpParams();

    if (request.promoCode) {
      params = params
        .set('promoCode', request.promoCode)
        .set('code', request.promoCode)
        .set('couponCode', request.promoCode);
    }

    if (typeof request.planPrice === 'number') {
      params = params.set('planPrice', String(request.planPrice));
      params = params.set('amount', String(request.planPrice));
      params = params.set('total', String(request.planPrice));
      params = params.set('netPrice', String(request.planPrice));
      params = params.set('subtotal', String(request.planPrice));
      params = params.set('finalAmount', String(request.planPrice));
    }
    if (typeof request.basePrice === 'number') {
      params = params.set('basePrice', String(request.basePrice));
      params = params.set('originalPrice', String(request.basePrice));
    }
    if (typeof request.finalPrice === 'number') {
      params = params.set('finalPrice', String(request.finalPrice));
      params = params.set('discountedPrice', String(request.finalPrice));
    }
    if (typeof request.discountValue === 'number') {
      params = params.set('discountValue', String(request.discountValue));
      params = params.set('discount', String(request.discountValue));
    }
    if (typeof request.discountAmount === 'number') {
      params = params.set('discountAmount', String(request.discountAmount));
      params = params.set('discountTotal', String(request.discountAmount));
    }
    if (request.discountType) {
      params = params.set('discountType', request.discountType);
    }
    if (request.currentSubscriptionId) {
      params = params.set('currentSubscriptionId', String(request.currentSubscriptionId));
    }
    if (typeof request.isPlanChange === 'boolean') {
      params = params.set('isPlanChange', String(request.isPlanChange));
    }

    const body = {
      ...request,
      amount: request.planPrice,
      total: request.planPrice,
      netPrice: request.planPrice,
      subtotal: request.planPrice,
      finalAmount: request.planPrice,
      originalPrice: request.basePrice ?? request.planPrice,
      discountedPrice: request.finalPrice ?? request.planPrice,
      discount: request.discountValue ?? request.discountAmount,
      discountTotal: request.discountAmount ?? request.discountValue,
      amountDue: request.amountDue ?? request.planPrice,
      appliedCreditAmount: request.appliedCreditAmount ?? 0,
      currentSubscriptionId: request.currentSubscriptionId ?? null,
      isPlanChange: request.isPlanChange ?? false,
      couponCode: request.promoCode,
    };

    return this.http.post<CheckoutSessionResponse>(`${this.api}/api/payments/create-checkout`, body, { params });
  }

  getCheckoutPriceSummary(request: CheckoutSummaryRequest): Observable<CheckoutPriceSummary> {
    // Ensure the payload uses planId, not patientPlanId/doctorPlanId
    return this.http.post<CheckoutPriceSummary>(`${this.api}/api/payments/price-summary`, request);
  }

  confirmCheckoutSession(sessionId: string): Observable<void> {
    return this.http.post<void>(`${this.api}/api/payments/confirm-session/${sessionId}`, {});
  }

  // ── STUDENT VERIFICATION ──────────────────────────────────────────────────

  getStudentVerificationStatus(): Observable<StudentVerificationStatus> {
  return this.http.get<StudentVerificationStatus>(`${this.api}/api/student-verification/status`);
}

  canPayForStudentPlan(userId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.api}/api/student-verification/can-pay/${userId}`);
  }

  submitStudentVerification(
    userId: number,
    fullName: string,
    universityName: string,
    studentIdNumber: string | null,
    facultyEmail: string | null,
    document: File
  ): Observable<HttpResponse<StudentVerificationStatus>> {
    const formData = new FormData();
    const payload = {
      userId,
      fullName,
      universityName,
      studentIdNumber,
      facultyEmail,
    };

    formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    formData.append('document', document);

    return this.http.post<StudentVerificationStatus>(`${this.api}/api/student-verification/submit`, formData, {
      observe: 'response',
    });
  }

  // ── PROMO CODES ────────────────────────────────────────────────────────────

  validatePromoCode(
    promoCode: string,
    planType: 'PATIENT' | 'DOCTOR',
    billingCycle: 'MONTHLY' | 'YEARLY',
    planName?: string,
    planPrice?: number
  ): Observable<PromoCodeValidation> {
    let params = new HttpParams()
      .set('code', promoCode.trim().toUpperCase())
      .set('planType', planType)
      .set('billingCycle', billingCycle);

    if (planName?.trim()) {
      params = params.set('planName', planName.trim().toUpperCase());
    }

    if (typeof planPrice === 'number') {
      params = params.set('planPrice', String(planPrice));
    }

    return this.http.get<PromoCodeValidation>(`${this.api}/api/promo-codes/validate`, { params });
  }

  getPromoCodesForValidation(): Observable<PromoCodeRecord[]> {
    return this.http.get<PromoCodeRecord[]>(`${this.api}/api/promo-codes/admin/all`);
  }

  // ── ADMIN ANALYTICS ────────────────────────────────────────────────────────

  getCancellationStats(): Observable<CancellationStatsResponse> {
    return this.http.get<CancellationStatsResponse>(`${this.api}/api/admin/subscriptions/cancellation-stats`);
  }
}

