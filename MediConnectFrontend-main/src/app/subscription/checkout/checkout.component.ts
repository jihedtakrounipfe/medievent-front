import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { SubscriptionService, PromoCodeValidation, CheckoutSessionRequest, CheckoutSessionResponse, PromoCodeRecord, CheckoutPriceSummary, CheckoutSummaryRequest, StudentVerificationStatus } from '../services/subscription.service';
import { SubscriptionResponse, PatientPlan, DoctorPlan, UserCredit } from '../models/subscription.models';
import { AuthFacade } from '../../../core/services/auth.facade';
import { AnyUser } from '../../../core/user';
import { AudioTourService } from '../services/audio-tour.service';

interface CheckoutError {
  error?: {
    message?: string;
  };
}

interface CheckoutSelection {
  planId?: number;
  role?: 'PATIENT' | 'DOCTOR';
  billingCycle?: 'MONTHLY' | 'YEARLY';
  planName?: string;
  priceMonthly?: number;
  priceYearly?: number;
  isPlanChange?: boolean;
  currentSubscriptionId?: number | null;
  currentPlanName?: string | null;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent implements OnInit, OnDestroy {
  user: AnyUser | null = null;
  selection: CheckoutSelection | null = null;
  checkoutLoading = false;
  studentStatusLoading = false;
  verificationLoading = false;
  verificationSubmitting = false;
  creditLoading = false;
  summaryLoading = false;
  error = '';
  verificationError = '';
  verificationMessage = '';

  userCredit: UserCredit | null = null;
  priceSummary: CheckoutPriceSummary | null = null;

  verificationForm = {
    fullName: '',
    universityName: '',
    studentIdNumber: '',
    facultyEmail: '',
  };

  selectedDocument: File | null = null;
  verificationStatus: StudentVerificationStatus | null = null;
  activeSubscription: SubscriptionResponse | null = null;
  canPay = true;
  cycleSelectFocused = false;
  isDraggingFile = false;
  uploadProgress = 0;
  // Student verification status for UI logic
  studentStatus: 'APPROVED' | 'PENDING' | 'REJECTED' | 'EXPIRED' | 'NOT_SUBMITTED' = 'NOT_SUBMITTED';
  uploadInProgress = false;
  attemptedVerificationSubmit = false;
  promoCode = '';
  appliedPromo: PromoCodeValidation | null = null;
  promoLoading = false;
  promoError = '';
  touchedFields: Record<string, boolean> = {
    fullName: false,
    universityName: false,
    studentIdNumber: false,
    facultyEmail: false,
    document: false,
  };
  private uploadTimer: ReturnType<typeof setInterval> | null = null;

  readonly router = inject(Router);
  private subscriptionService = inject(SubscriptionService);
  private authFacade = inject(AuthFacade);
  public readonly audioTourService = inject(AudioTourService);
  

  ngOnInit(): void {
    this.audioTourService.registerTour('checkout', [
      'This checkout page finalizes your selected plan and billing cycle.',
      'It includes backend-calculated summary amounts, promo discounts, and any credit applied.',
      'Confirm the final amount to continue to payment, or complete with credit when the total is zero.'
    ]);
    this.audioTourService.setPageContext('checkout',
      'Checkout page loading. It will show the selected plan, pricing summary, and any student discount or credit available.'
    );
    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras?.state ?? history.state) as CheckoutSelection | undefined;

    if (state && state.planId) {
      this.selection = state;
      sessionStorage.setItem('checkoutSelection', JSON.stringify(state));
    } else {
      const cached = sessionStorage.getItem('checkoutSelection');
      this.selection = cached ? (JSON.parse(cached) as CheckoutSelection) : null;
    }

    if (!this.selection || !this.selection.planId) {
      this.router.navigate(['/plans']);
      return;
    }

    this.hydrateMissingPlanPrices();

    this.authFacade.currentUser$.subscribe(user => {
      this.user = user;
      if (!user) {
        this.router.navigate(['/auth/login']);
        return;
      }

      this.loadStudentStatus(user.id);

      this.subscriptionService.getActive(user.id).subscribe({
        next: (active) => {
          this.activeSubscription = active;
          if (!this.isPlanChangeFlow) {
           this.router.navigate(['/subscription/active']);
           return;
          }

          if (this.selection?.currentSubscriptionId && this.selection.currentSubscriptionId !== active.id) {
            this.error = 'Your active subscription changed. Please restart the plan change from the Active Subscription page.';
            return;
          }

          this.selection = {
            ...this.selection,
            currentSubscriptionId: active.id,
            currentPlanName: active.planName,
          };
          
          sessionStorage.setItem('checkoutSelection', JSON.stringify(this.selection));

          this.loadUserCredit(user.id);
          
          this.loadPriceSummary();

          if (this.requiresStudentVerification) {
            this.canPay = false;
            this.loadVerificationStatus();
          }
        },
        error: (err: HttpErrorResponse) => {
          if (err.status !== 404) {
            this.error = 'Failed to validate active subscription status.';
            return;
          }

          if (this.isPlanChangeFlow) {
            this.error = 'No active subscription was found to change. Please choose a new plan normally.';
             this.priceSummary = null;
             this.summaryLoading = false;
            return;
          }

          // Load user credit
          this.loadUserCredit(user.id);
          this.loadPriceSummary();

          if (this.requiresStudentVerification) {
            this.canPay = false;
            this.loadVerificationStatus();
          }
        }
      });
    });
  }

  get isPremiumPlan(): boolean {
  return this.selection?.role === 'PATIENT'
    && (this.selection?.planName || '').toUpperCase().includes('PREMIUM');
}

  // Helper for price display logic
 get showStudentDiscount(): boolean {
  return this.selection?.role === 'PATIENT'
    && this.isPremiumPlan
    && this.studentStatus === 'APPROVED';
}

  get studentDiscountedPrice(): number | null {
    if (!this.selectedPrice) return null;
    return Math.round(this.selectedPrice * 0.5 * 100) / 100;
  }

  get showPromoCodeSection(): boolean {
  return true;
  }
  applyForStudentVerification(): void {
  if (this.selection) {
    sessionStorage.setItem('checkoutSelection', JSON.stringify(this.selection));
  }
  if (this.studentStatus === 'PENDING') {
    this.router.navigate(['/subscription/student-verification']);
  } else {
    this.router.navigate(['/subscription/student-verification/apply']);
  }
}

get isPromoCodeDisabled(): boolean {
  return this.studentStatus === 'APPROVED';
}
  get hasAnyDiscount(): boolean {
    if (!this.priceSummary) return false;
    return (this.priceSummary.studentDiscountAmount ?? 0) > 0
      || (this.priceSummary.promoDiscountAmount ?? 0) > 0
      || (this.priceSummary.creditUsed ?? 0) > 0;
  }

  get showPremiumStudentApplyLink(): boolean {
  return this.selection?.role === 'PATIENT'
    && this.isPremiumPlan
    && !this.studentStatusLoading
    && (this.studentStatus === 'NOT_SUBMITTED' || this.studentStatus === 'REJECTED' || this.studentStatus === 'EXPIRED');
}

get showPremiumStudentPendingBanner(): boolean {
  return this.selection?.role === 'PATIENT'
    && this.isPremiumPlan
    && !this.studentStatusLoading
    && this.studentStatus === 'PENDING';
}

  private loadUserCredit(userId: number): void {
    this.creditLoading = true;
    this.subscriptionService.getCredit(userId).subscribe({
      next: (credit) => {
        this.userCredit = credit;
        this.creditLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        // Credit may not exist, which is OK
        if (err.status !== 404) {
          console.warn('Failed to load user credit:', err);
        }
        this.creditLoading = false;
      }
    });
  }

  private loadStudentStatus(userId: number): void {
    this.studentStatusLoading = true;

    this.subscriptionService.getStudentVerificationStatus().subscribe({
      next: (response) => {
        this.studentStatus = this.resolveStudentStatus(response);
        console.log('studentStatus:', this.studentStatus, response);
        this.studentStatusLoading = false;
      },
      error: () => {
        this.studentStatus = 'NOT_SUBMITTED';
        console.log('studentStatus:', this.studentStatus);
        this.studentStatusLoading = false;
      }
    });
  }

  private resolveStudentStatus(response: StudentVerificationStatus | string | null | undefined): 'APPROVED' | 'PENDING' | 'REJECTED' | 'EXPIRED' | 'NOT_SUBMITTED' {
    if (!response) {
      return 'NOT_SUBMITTED';
    }

    if (typeof response === 'string') {
      return response === 'APPROVED'
        || response === 'PENDING'
        || response === 'REJECTED'
        || response === 'EXPIRED'
        || response === 'NOT_SUBMITTED'
        ? response
        : 'NOT_SUBMITTED';
    }

    if (response.requestFound === false || (!response.id && !response.userId && !response.status)) {
      return 'NOT_SUBMITTED';
    }

    return response.status ?? 'NOT_SUBMITTED';
  }

  ngOnDestroy(): void {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
      this.uploadTimer = null;
    }
  }

  get requiresStudentVerification(): boolean {
    return this.selection?.role === 'PATIENT' && this.selection?.planName === 'STUDENT';
  }

  get isStudentLocked(): boolean {
    return this.requiresStudentVerification && !this.canPay;
  }

  get showPaymentSection(): boolean {
    return !this.requiresStudentVerification || this.canPay;
  }

  get selectedPrice(): number | null {
    if (!this.selection) return null;
    return this.selection.billingCycle === 'YEARLY'
      ? (this.selection.priceYearly ?? null)
      : (this.selection.priceMonthly ?? null);
  }

  get isPlanChangeFlow(): boolean {
    return !!this.selection?.isPlanChange;
  }

  get finalPrice(): number | null {
    return this.priceSummary?.finalAmount ?? null;
  }

  get payableAmount(): number | null {
    return this.priceSummary?.finalAmount ?? null;
  }

  get appliedDiscountDisplay(): string {
    if (!this.appliedPromo || !this.appliedPromo.valid) return '';
    const discountValue = this.getAppliedDiscountValue();
    return this.appliedPromo.discountType === 'PERCENTAGE'
      ? `${discountValue}%`
      : `${discountValue} TND`;
  }

  getAppliedDiscountValue(): number {
    if (!this.appliedPromo) return 0;
    if (typeof this.appliedPromo.discount === 'number') return this.appliedPromo.discount;
    if (typeof this.appliedPromo.discountValue === 'number') return this.appliedPromo.discountValue;
    return 0;
  }

  private getAppliedDiscountAmount(basePrice: number): number {
    if (!this.appliedPromo || !this.appliedPromo.valid) return 0;
    if (typeof this.appliedPromo.discountAmount === 'number') return this.appliedPromo.discountAmount;

    const discountValue = this.getAppliedDiscountValue();
    if (this.appliedPromo.discountType === 'PERCENTAGE') {
      return basePrice * discountValue / 100;
    }
    return discountValue;
  }

  applyPromoCode(): void {
    const normalizedPromo = this.promoCode.trim().toUpperCase();
    const currentPlanPrice = this.selectedPrice;

    if (!normalizedPromo) {
      this.promoError = 'Please enter a promo code';
      return;
    }

    if (!this.selection?.role || !this.selection?.billingCycle) {
      this.promoError = 'Please ensure plan and billing cycle are selected';
      return;
    }

    this.promoLoading = true;
    this.promoError = '';
    this.promoCode = normalizedPromo;

    console.log('Validating promo code:', {
      code: normalizedPromo,
      planType: this.selection.role,
      billingCycle: this.selection.billingCycle,
      planName: this.selection.planName
    });

    this.subscriptionService.validatePromoCode(
      normalizedPromo,
      this.selection.role,
      this.selection.billingCycle,
      this.selection.planName,
      currentPlanPrice ?? undefined
    ).subscribe({
      next: (validation) => {
        console.log('Validation response:', validation);
        if (validation.valid) {
          this.appliedPromo = {
            ...validation,
            discount: typeof validation.discount === 'number'
              ? validation.discount
              : (validation.discountValue ?? 0),
            discountType: validation.discountType ?? 'PERCENTAGE',
            message: validation.message ?? null,
          };
          this.promoError = '';
          this.loadPriceSummary();
        } else {
          if ((validation.message || '').toLowerCase().includes('plan price is required')) {
            this.tryLocalPromoFallback(normalizedPromo);
            return;
          }
           this.promoError = validation.message || 'Promo code is not valid for this plan';
  this.appliedPromo = null;
  this.promoCode = ''; // ← clear it so loadPriceSummary sends no promo
  this.loadPriceSummary();
        }
        this.promoLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Promo validation error:', err);
        let errorMessage = 'Failed to validate promo code';

        if (err.status === 0) {
          errorMessage = 'Network error. Is the backend running?';
        } else if (err.status === 404) {
          errorMessage = 'Promo code endpoint not found on backend';
        } else if (err.status === 400) {
          errorMessage = err.error?.message || 'Invalid promo code request';
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.message) {
          errorMessage = err.message;
        }

        if (err.status) {
          errorMessage = `${errorMessage} (HTTP ${err.status})`;
        }

        if (err.status === 400) {
          this.tryLocalPromoFallback(normalizedPromo);
          return;
        }

        this.promoError = errorMessage;
        this.appliedPromo = null;
        this.loadPriceSummary();
        this.promoLoading = false;
      }
    });
  }

  private tryLocalPromoFallback(normalizedPromo: string): void {
    if (!this.selection?.role || !this.selection?.billingCycle) {
      this.promoError = 'Failed to validate promo code';
      this.appliedPromo = null;
      this.promoLoading = false;
      return;
    }

    this.subscriptionService.getPromoCodesForValidation().subscribe({
      next: (codes) => {
        const matched = this.findMatchingPromo(codes, normalizedPromo);
        if (!matched) {
          this.promoError = 'Promo code is not valid for this plan';
          this.appliedPromo = null;
          this.promoCode = '';
          this.promoLoading = false;
          return;
        }

        this.appliedPromo = {
          valid: true,
          discount: matched.discountValue,
          discountType: matched.discountType,
          message: 'Promo applied',
        };
        this.promoError = '';
        this.loadPriceSummary();
        this.promoLoading = false;
      },
      error: () => {
        this.promoError = 'Failed to validate promo code';
        this.appliedPromo = null;
        this.loadPriceSummary();
        this.promoLoading = false;
      }
    });
  }

  private findMatchingPromo(codes: PromoCodeRecord[], normalizedPromo: string): PromoCodeRecord | null {
    const selectedPlanName = this.selection?.planName?.trim().toUpperCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return codes.find((code) => {
      if ((code.code || '').trim().toUpperCase() !== normalizedPromo) return false;
      if (!code.isActive) return false;

      const planTypeMatch = code.planType === 'BOTH' || code.planType === this.selection?.role;
      if (!planTypeMatch) return false;

      const cycleMatch = code.billingCycle === 'BOTH' || code.billingCycle === this.selection?.billingCycle;
      if (!cycleMatch) return false;

      const promoPlanName = (code.planName || '').trim().toUpperCase();
      const planNameMatch = !promoPlanName || promoPlanName === 'ALL' || promoPlanName === selectedPlanName;
      if (!planNameMatch) return false;

      if (code.startDate) {
        const start = new Date(code.startDate);
        start.setHours(0, 0, 0, 0);
        if (today < start) return false;
      }

      if (code.endDate) {
        const end = new Date(code.endDate);
        end.setHours(23, 59, 59, 999);
        if (today > end) return false;
      }

      if ((code.maxUsesTotal ?? null) !== null && (code.currentUseCount ?? 0) >= (code.maxUsesTotal ?? 0)) {
        return false;
      }

      return true;
    }) || null;
  }

  private hydrateMissingPlanPrices(): void {
    if (!this.selection?.planId || !this.selection.role) return;

    const hasMonthly = typeof this.selection.priceMonthly === 'number';
    const hasYearly = typeof this.selection.priceYearly === 'number';
    if (hasMonthly && hasYearly) return;

    if (this.selection.role === 'PATIENT') {
      this.subscriptionService.getPatientPlans().subscribe({
        next: (plans: PatientPlan[]) => {
          const selectedPlan = plans.find((plan) => plan.id === this.selection?.planId);
          if (!selectedPlan || !this.selection) return;

          this.selection.priceMonthly = selectedPlan.priceMonthly;
          this.selection.priceYearly = selectedPlan.priceYearly;
          sessionStorage.setItem('checkoutSelection', JSON.stringify(this.selection));
        },
        error: () => {
          // Keep existing values; payNow guard handles missing price with a clear message.
        }
      });
      return;
    }

    this.subscriptionService.getDoctorPlans().subscribe({
      next: (plans: DoctorPlan[]) => {
        const selectedPlan = plans.find((plan) => plan.id === this.selection?.planId);
        if (!selectedPlan || !this.selection) return;

        this.selection.priceMonthly = selectedPlan.priceMonthly;
        this.selection.priceYearly = selectedPlan.priceYearly;
        sessionStorage.setItem('checkoutSelection', JSON.stringify(this.selection));
      },
      error: () => {
        // Keep existing values; payNow guard handles missing price with a clear message.
      }
    });
  }

  removePromoCode(): void {
    this.promoCode = '';
    this.appliedPromo = null;
    this.promoError = '';
    this.loadPriceSummary();
  }

  payNow(): void {
    if (!this.user || !this.selection?.planId || !this.selection.role || !this.selection.billingCycle) {
      this.error = 'Missing checkout information. Please select a plan again.';
      return;
    }

    if (this.requiresStudentVerification && !this.canPay) {
      this.error = 'Student plan requires approved verification before payment.';
      return;
    }

    if (this.activeSubscription) {
      if (!this.isPlanChangeFlow) {
        this.error = `You already have an active ${this.activeSubscription.planName} subscription.`;
        return;
      }

      if (this.selection.currentSubscriptionId && this.selection.currentSubscriptionId !== this.activeSubscription.id) {
        this.error = 'Your active subscription changed. Please restart your plan change.';
        return;
      }
    } else if (this.isPlanChangeFlow) {
      this.error = 'No active subscription was found to change.';
      return;
    }

     

     this.checkoutLoading = true;
this.error = '';

const normalizedPromo = this.promoCode.trim() ? this.promoCode.trim().toUpperCase() : null;
const summary = this.priceSummary;

if (this.isPlanChangeFlow) {
  const upgradeRequest = {
    newPlanId: this.selection.planId,
    newBillingCycle: this.selection.billingCycle,
    promoCode: normalizedPromo,
  };

  this.subscriptionService.upgradeDowngrade(this.user.id, upgradeRequest).subscribe({
    next: (response: any) => {
      if (response?.sessionId === 'CREDIT_APPLIED_NO_CHECKOUT') {
        this.router.navigate(['/checkout/success'], {
          state: {
            sessionId: response.sessionId,
            creditUsed: response.creditApplied ?? 0,
            creditRemaining: 0,
            planName: this.selection?.planName,
            billingCycle: this.selection?.billingCycle
          }
        });
        return;
      }
      if (response?.url) {
        window.location.href = response.url;
        return;
      }
      this.error = 'Failed to get checkout URL.';
      this.checkoutLoading = false;
    },
    error: (err: CheckoutError) => {
      this.error = err?.error?.message || 'Failed to process plan change.';
      this.checkoutLoading = false;
    }
  });
  return;
}

if (!summary || typeof summary.finalAmount !== 'number') {
  this.error = 'Could not load checkout price summary. Please retry.';
  this.checkoutLoading = false;
  return;
}

const checkoutRequest: CheckoutSessionRequest = {
  userId: this.user.id,
  patientPlanId: this.selection.role === 'PATIENT' ? this.selection.planId : null,
  doctorPlanId: this.selection.role === 'DOCTOR' ? this.selection.planId : null,
  billingCycle: this.selection.billingCycle,
  planPrice: Number(summary.finalAmount.toFixed(4)),
  currentSubscriptionId: null,
  isPlanChange: false,
  promoCode: normalizedPromo,
  basePrice: Number((summary.baseAmount ?? summary.finalAmount).toFixed(4)),
  finalPrice: Number(summary.finalAmount.toFixed(4)),
  amountDue: Number(summary.finalAmount.toFixed(4)),
  appliedCreditAmount: Number((summary.creditUsed ?? 0).toFixed(4)),
  discountValue: Number((summary.totalDiscountAmount ?? 0).toFixed(4)),
  discountAmount: Number((summary.totalDiscountAmount ?? 0).toFixed(4)),
  discountType: this.appliedPromo?.valid ? this.appliedPromo.discountType : undefined,
};

this.subscriptionService.createCheckoutSession(checkoutRequest).subscribe({
  next: (response: CheckoutSessionResponse) => {
    if (response?.sessionId === 'CREDIT_APPLIED_NO_CHECKOUT') {
      this.router.navigate(['/checkout/success'], {
        state: {
          sessionId: response.sessionId,
          creditUsed: response.creditUsed ?? summary.creditUsed ?? 0,
          creditRemaining: 0,
          planName: this.selection?.planName,
          billingCycle: this.selection?.billingCycle
        }
      });
      return;
    }
    if (response?.url) {
      window.location.href = response.url;
      return;
    }
    this.error = 'Failed to get checkout URL.';
    this.checkoutLoading = false;
  },
  error: (err: CheckoutError) => {
    this.error = err?.error?.message || 'Failed to create checkout session.';
    this.checkoutLoading = false;
  },});
  }

  get payButtonLabel(): string {
    if (this.isPlanChangeFlow) {
      return this.checkoutLoading ? 'Processing...' : 'Confirm Plan Change';
  }

    const finalAmount = this.priceSummary?.finalAmount;
    if (typeof finalAmount !== 'number') return 'Continue';

    if (finalAmount === 0) {
      return 'Confirm with Credit';
    }
    return `Pay ${finalAmount.toFixed(2)} DT`;
  }

  getPlanBrief(planName?: string | null): string {
    const key = String(planName || '').trim().toUpperCase();
    if (key.includes('STUDENT')) return 'Student keeps essential care features with reduced pricing after verification.';
    if (key.includes('PREMIUM') || key.includes('GOLD')) return 'Premium focuses on advanced follow-up tools for frequent care or growth use cases.';
    if (key.includes('SILVER')) return 'Silver balances professional essentials with predictable monthly and yearly pricing.';
    if (key.includes('BASIC')) return 'Basic covers core subscription features for everyday usage at the lowest base price.';
    return 'This plan includes the core features for your selected role and billing cycle.';
  }

  onBillingCycleChanged(cycle: 'MONTHLY' | 'YEARLY'): void {
  if (!this.selection) return;
  // Create new object reference to trigger change detection
  this.selection = { ...this.selection, billingCycle: cycle };
  sessionStorage.setItem('checkoutSelection', JSON.stringify(this.selection));
  this.loadPriceSummary();
}

  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedDocument = file;
    this.touchField('document');
    if (file) {
      this.startFakeUploadProgress();
    } else {
      this.uploadProgress = 0;
      this.uploadInProgress = false;
    }
  }

  onFileDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingFile = true;
  }

  onFileDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingFile = false;
  }

  onFileDrop(event: DragEvent, input: HTMLInputElement): void {
    event.preventDefault();
    this.isDraggingFile = false;
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (!file) return;

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    this.selectedDocument = file;
    this.touchField('document');
    this.startFakeUploadProgress();
  }

  removeSelectedDocument(input: HTMLInputElement): void {
    this.selectedDocument = null;
    input.value = '';
    this.uploadProgress = 0;
    this.uploadInProgress = false;
    this.touchField('document');
  }

  getSelectedDocumentSize(): string {
    if (!this.selectedDocument) return '';
    const sizeKb = this.selectedDocument.size / 1024;
    if (sizeKb < 1024) {
      return `${sizeKb.toFixed(1)} KB`;
    }
    return `${(sizeKb / 1024).toFixed(2)} MB`;
  }

  touchField(field: keyof CheckoutComponent['touchedFields']): void {
    this.touchedFields[field] = true;
  }

  showFieldError(field: keyof CheckoutComponent['touchedFields']): boolean {
    return (this.touchedFields[field] || this.attemptedVerificationSubmit) && !this.isFieldValid(field);
  }

  isFieldValid(field: keyof CheckoutComponent['touchedFields']): boolean {
    const fullName = this.verificationForm.fullName.trim();
    const universityName = this.verificationForm.universityName.trim();
    const studentIdNumber = this.verificationForm.studentIdNumber.trim();
    const facultyEmail = this.verificationForm.facultyEmail.trim();

    switch (field) {
      case 'fullName':
        return fullName.length > 0;
      case 'universityName':
        return universityName.length > 0;
      case 'studentIdNumber':
        return studentIdNumber.length > 0;
      case 'facultyEmail':
        return facultyEmail.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(facultyEmail);
      case 'document':
        return !!this.selectedDocument;
      default:
        return false;
    }
  }

  submitVerification(): void {
    this.attemptedVerificationSubmit = true;
    this.touchField('fullName');
    this.touchField('universityName');
    this.touchField('facultyEmail');
    this.touchField('document');

    if (!this.user) {
      this.verificationError = 'Please log in first.';
      return;
    }
    if (!this.isFieldValid('fullName') || !this.isFieldValid('universityName')) {
      this.verificationError = 'Please provide full name and university/faculty.';
      return;
    }
    if (!this.isFieldValid('facultyEmail')) {
      this.verificationError = 'Please provide a valid faculty email or leave it empty.';
      return;
    }
    if (!this.isFieldValid('document')) {
      this.verificationError = 'Please upload your student document.';
      return;
    }

    this.verificationSubmitting = true;
    this.verificationError = '';
    this.verificationMessage = '';

    this.subscriptionService.submitStudentVerification(
      this.user.id,
      this.verificationForm.fullName,
      this.verificationForm.universityName,
      this.verificationForm.studentIdNumber.trim() ? this.verificationForm.studentIdNumber : null,
      this.verificationForm.facultyEmail.trim() ? this.verificationForm.facultyEmail : null,
      this.selectedDocument!
    ).subscribe({
      next: (response: HttpResponse<StudentVerificationStatus>) => {
        const status = response.body;
        if (status) {
          this.verificationStatus = status;
          this.studentStatus = status.status ?? 'NOT_SUBMITTED';
        }
        this.verificationMessage = 'Verification submitted successfully.';
        this.canPay = false;
        this.verificationSubmitting = false;
        this.uploadInProgress = false;
        this.uploadProgress = 100;
        const redirectFromBody = status?.nextPagePath;
        const redirectFromHeader = response.headers.get('X-Frontend-Redirect') ?? undefined;
        this.redirectToPendingPage(redirectFromBody ?? redirectFromHeader);
      },
      error: (err: unknown) => {
        const maybeErr = err as { error?: { message?: string } };
        this.verificationError = maybeErr.error?.message ?? 'Failed to submit verification.';
        this.verificationSubmitting = false;
      },
    });
  }

  refreshVerificationStatus(): void {
    this.loadVerificationStatus();
  }

  private loadVerificationStatus(): void {
    if (!this.user) return;

    this.verificationLoading = true;
    this.verificationError = '';

    this.subscriptionService.getStudentVerificationStatus().subscribe({
      next: (status) => {
        this.verificationStatus = status;
        this.studentStatus = status.status ?? 'NOT_SUBMITTED';
        this.canPay = status.status === 'APPROVED';
        this.verificationLoading = false;
        if (status.status === 'PENDING') {
          this.redirectToPendingPage(status.nextPagePath);
        }
      },
      error: () => {
        this.verificationStatus = null;
        this.studentStatus = 'NOT_SUBMITTED';
        this.canPay = false;
        this.verificationLoading = false;
      },
    });
  }

  backToPlans(): void {
    this.router.navigate(['/plans']);
  }

  private redirectToPendingPage(nextPagePath?: string): void {
    const target = nextPagePath && nextPagePath.startsWith('/')
      ? nextPagePath
      : '/subscription/student-verification';

    this.router.navigateByUrl(target).then((ok) => {
      if (!ok) {
        window.location.href = target;
      }
    }).catch(() => {
      window.location.href = target;
    });
  }

  private startFakeUploadProgress(): void {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
      this.uploadTimer = null;
    }

    this.uploadInProgress = true;
    this.uploadProgress = 8;

    this.uploadTimer = setInterval(() => {
      const increment = this.uploadProgress < 70 ? 14 : this.uploadProgress < 90 ? 6 : 3;
      this.uploadProgress = Math.min(100, this.uploadProgress + increment);

      if (this.uploadProgress >= 100) {
        this.uploadInProgress = false;
        if (this.uploadTimer) {
          clearInterval(this.uploadTimer);
          this.uploadTimer = null;
        }
      }
    }, 120);
  }

  private loadPriceSummary(): void {
    console.log('loadPriceSummary called:', {
    user: this.user?.id,
    planId: this.selection?.planId,
    planType: this.selection?.role,
    role: this.selection?.role,
    billingCycle: this.selection?.billingCycle
  });
    if (!this.user || !this.selection?.planId || !this.selection?.role || !this.selection?.billingCycle) return;
    
     
    this.summaryLoading = true;
    const request: CheckoutSummaryRequest = {
      userId: this.user.id,
      planId: this.selection.planId,
      planType: this.selection.role,
      billingCycle: this.selection.billingCycle,
      promoCode: this.promoCode.trim() ? this.promoCode.trim().toUpperCase() : null,
    };
    

    this.subscriptionService.getCheckoutPriceSummary(request).subscribe({
      next: (summary) => {
        this.priceSummary = summary;
        this.summaryLoading = false;
        this.audioTourService.setPageContext('checkout',
          `Checkout loaded for ${this.selection?.planName ?? 'selected plan'} with final payable amount ${summary.finalAmount?.toFixed(2) ?? '0.00'} TND.${
            this.selection?.role === 'PATIENT' && this.showStudentDiscount ? ' The student discount has been applied.' : ''
          }`
        );
      },
      error: () => {
        this.priceSummary = null;
        this.summaryLoading = false;
        this.audioTourService.setPageContext('checkout',
          'Checkout page loaded, but summary service failed. Please verify your selected plan and try again.'
        );
      }
    });
  }
}

