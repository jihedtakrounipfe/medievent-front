// ── Enums ──────────────────────────────────────────────────────────────────
export type PlanType = 'PATIENT' | 'DOCTOR';
export type PlanName = 'BASIC' | 'PREMIUM' | 'STUDENT' | 'SILVER' | 'GOLD';
export type BillingCycle = 'MONTHLY' | 'YEARLY';
export type PaymentProvider = 'KONNECT' | 'PAYMEE' | 'STRIPE';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

// ── SubscriptionRequest → matches your @RequestBody ───────────────────────
export interface SubscriptionRequest {
  userId: number;           // Numeric Long ID
  planType: PlanType;
  planId: number;           // Numeric ID of PatientPlan or DoctorPlan
  billingCycle: BillingCycle;
  paymentProvider: PaymentProvider;
  autoRenew?: boolean;          // defaults to true on backend
  appliedCreditAmount?: number;      // new: credit applied to subscription
}

// ── Credit System ──────────────────────────────────────────────────────────
export interface UserCredit {
  id?: number;                       // Credit record ID
  userId?: number;                   // User ID (from backend)
  balance: number;                   // Available credit balance
  expiresAt: string;                 // "YYYY-MM-DD" when credit expires
  createdAt?: string;                // "YYYY-MM-DD" when credit was earned
  updatedAt?: string;                // "YYYY-MM-DD" last update time
  appliedToCheckout?: number;        // Amount applied at checkout
}

export interface UpgradeDowngradeRequest {
  newPlanId: number;           // Numeric ID of new plan
  newBillingCycle: BillingCycle;     // MONTHLY or YEARLY
}

export interface UpgradeDowngradeResponse {
  sessionId?: string;                // "CREDIT_APPLIED_NO_CHECKOUT" if credit covers it
  url?: string;                      // Stripe checkout URL if payment needed
  amountDue?: number;                // Amount to pay if amountDue > 0
  creditApplied?: number;            // Credit applied to upgrade
  newSubscription?: SubscriptionResponse;
  message?: string;
}

// ── CANCELLATION SYSTEM ────────────────────────────────────────────────────
export interface CancellationRequest {
  subscriptionId: number;            // Numeric ID of subscription to cancel
  reason?: string;                   // Optional reason text (backend classifies)
}

export interface CancellationResponse {
  message: string;                   // "Subscription cancelled" message
  subscription?: SubscriptionResponse; // Updated subscription with status CANCELLED
  creditGenerated?: number;          // Credit created from cancellation (if admin cancelled)
}

export interface CancellationStatsResponse {
  categoryCounts: Record<string, number>; // { PRICE: 5, FEATURES: 3, UX: 2, OTHER: 1 }
}

// ── SubscriptionResponse → matches your @Builder DTO ──────────────────────
export interface SubscriptionResponse {
  id: number;
  userId: number;
  planType: PlanType;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  autoRenew: boolean;
  startDate: string;           // "YYYY-MM-DD"
  endDate: string;           // "YYYY-MM-DD"
  cancelledAt: string | null;
  paymentProvider: PaymentProvider;
  paymentRef: string | null;
  paymentUrl: string | null;
  invoiceId?: number | null;
  lastPaymentAt: string;
  createdAt: string | null;    // can be null (known bug)

  // Plan info
  planName: PlanName;
  planPrice?: number;                // NEW: Monthly or yearly price of current plan
  daysRemaining?: number;            // NEW: Days until expiration
  unusedValue?: number;              // NEW: Proportional credit from remaining days
  amountPaid?: number;               // NEW: Amount paid for current period

  // Patient-only fields
  maxAppointmentsPerMonth: number | null;  // null = unlimited
  hasDocumentUpload: boolean;
  hasMedicationReminder: boolean;
  hasLabResults: boolean;
  hasSelfTestReadings: boolean;
  hasForum: boolean;
  hasHealthEvents: boolean;

  // Doctor-only fields
  maxConsultationsPerMonth: number | null;  // null = unlimited
  hasCalendarSync: boolean;
  hasSearchVisibility: boolean;
  hasBasicAnalytics: boolean;
  hasAdvancedAnalytics: boolean;
  hasForumBadge: boolean;
  hasConsultationPrerequisites: boolean;

  // Shared
  hasAI: boolean;
}

// ── Plan entities returned by /api/plans/* ────────────────────────────────
export interface PatientPlan {
  id: number;
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
  isActive: boolean;
}

export interface DoctorPlan {
  id: number;
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
  isActive: boolean;
}

// ── Chat ──────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface PlanChatRequest {
  userId: number;
  messages: ChatMessage[];
}

export interface PlanChatResponse {
  message: string;
  recommendationReady: boolean;
  recommendedPlan: string | null;
  reasoning: string | null;
  confidenceScore: number | null;
}

