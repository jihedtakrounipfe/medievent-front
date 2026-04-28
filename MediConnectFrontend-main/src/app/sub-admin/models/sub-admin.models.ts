export type AdminSubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
export type AdminPaymentStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

export interface AdminPatientPlan {
  id: number | string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxAppointmentsPerMonth: number | null;
  hasAI: boolean;
  hasForum: boolean;
  has24Support: boolean;
  hasVideoConsultations: boolean;
  hasHealthRecords: boolean;
  isActive: boolean;
}

export interface AdminDoctorPlan {
  id: number | string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxConsultationsPerMonth: number | null;
  hasAI: boolean;
  hasAdvancedAnalytics: boolean;
  hasAppointmentScheduling: boolean;
  hasPatientManagement: boolean;
  hasTelemedicine: boolean;
  isActive: boolean;
}

export interface AdminSubscriptionRecord {
  id: string;
  userId: string;
  planName: string;
  planType: string;
  billingCycle: string;
  startDate: string;
  endDate: string;
  paymentProvider: string;
  status: AdminSubscriptionStatus;
}

export interface AdminPaymentRecord {
  userId: string;
  amount: number;
  currency: string;
  paymentProvider?: string | null;
  stripeSessionId: string;
  status: AdminPaymentStatus;
  createdAt: string;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  maxUsesTotal: number;
  maxUsesPerUser: number;
  currentUseCount: number;
  planType: 'PATIENT' | 'DOCTOR' | 'BOTH';
  planName: string;
  billingCycle: 'MONTHLY' | 'YEARLY' | 'BOTH';
  minPurchaseAmount: number;
  createdByAdmin: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromoCodeRequest {
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  maxUsesTotal: number;
  maxUsesPerUser: number;
  planType: 'PATIENT' | 'DOCTOR' | 'BOTH';
  planName: string;
  billingCycle: 'MONTHLY' | 'YEARLY' | 'BOTH';
  minPurchaseAmount: number;
}
