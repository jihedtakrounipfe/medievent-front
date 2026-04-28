import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { SubAdminService } from '../services/sub-admin.service';
import { CreatePromoCodeRequest, PromoCode } from '../models/sub-admin.models';
import { AuthFacade } from '../../../core/services/auth.facade';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog.component';

@Component({
  selector: 'app-sub-admin-promo-codes',
  standalone: true,
  imports: [CommonModule, FormsModule,ConfirmationDialogComponent],
  templateUrl: './sub-admin-promo-codes.component.html',
  styleUrls: ['./sub-admin-promo-codes.component.css']
})
export class SubAdminPromoCodesComponent implements OnInit {
  promoCodes: PromoCode[] = [];
  searchTerm = '';
  showCreateModal = false;
  showDetailModal = false;
  selectedCode: PromoCode | null = null;
  loading = false;
  togglingCodeId: string | null = null;
  message = '';
  error = '';
success = '';
formErrors: Record<string, string> = {};
  sortField: 'code' | 'discountValue' | 'endDate' | 'currentUseCount' = 'endDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  currentPage = 1;
  readonly pageSize = 8;
  planNameOptions: string[] = ['ALL'];
  private patientPlanNames: string[] = ['ALL'];
  private doctorPlanNames: string[] = ['ALL'];

  // Confirmation dialog state
  showConfirmDialog = false;
  confirmDialogTitle = '';
  confirmDialogMessage = '';
  confirmDialogText = '';
  isDangerousAction = false;
  pendingAction: 'save' | 'update' | 'delete' | null = null;

  formData: PromoCode = {
    id: '',
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 0,
    startDate: '',
    endDate: '',
    isActive: true,
    maxUsesTotal: 100,
    maxUsesPerUser: 1,
    currentUseCount: 0,
    planType: 'PATIENT',
    planName: 'ALL',
    billingCycle: 'MONTHLY',
    minPurchaseAmount: 0,
    createdByAdmin: '',
    createdAt: '',
    updatedAt: ''
  };

  private adminService = inject(SubAdminService);
  private authFacade = inject(AuthFacade);

  ngOnInit() {
    this.loadPromoCodes();
    this.loadPlanNames();
  }

  loadPlanNames() {
    forkJoin({
      patientPlans: this.adminService.getAllPatientPlans(),
      doctorPlans: this.adminService.getAllDoctorPlans()
    }).subscribe({
      next: ({ patientPlans, doctorPlans }) => {
        this.patientPlanNames = ['ALL', ...patientPlans.filter((plan) => plan.isActive).map((plan) => plan.name)];
        this.doctorPlanNames = ['ALL', ...doctorPlans.filter((plan) => plan.isActive).map((plan) => plan.name)];
        this.updatePlanNameOptions();
      },
      error: () => {
        this.patientPlanNames = ['ALL'];
        this.doctorPlanNames = ['ALL'];
        this.updatePlanNameOptions();
      }
    });
  }

  loadPromoCodes() {
    this.loading = true;
    this.adminService.getPromoCodes().subscribe({
      next: (data) => {
        this.promoCodes = data;
        this.loading = false;
      },
      error: () => {
        this.message = 'Failed to load promo codes';
        this.loading = false;
      }
    });
  }

  get filtered(): PromoCode[] {
  let result = this.promoCodes;

  if (this.activeFilter === 'active') result = result.filter(c => c.isActive);
  if (this.activeFilter === 'inactive') result = result.filter(c => !c.isActive);
  if (this.activeFilter === 'birthday') result = result.filter(c => c.code.startsWith('BDAY-'));
  if (this.searchTerm.trim()) {
    const term = this.searchTerm.toLowerCase();
    result = result.filter(c =>
      c.code.toLowerCase().includes(term) ||
      c.description.toLowerCase().includes(term) ||
      c.planName.toLowerCase().includes(term)
    );
  }
  return result;
}

  get sorted(): PromoCode[] {
    const rows = [...this.filtered];
    rows.sort((a, b) => {
      const first = this.getSortValue(a);
      const second = this.getSortValue(b);
      if (first < second) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (first > second) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return rows;
  }

  get paginated(): PromoCode[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sorted.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  toggleSort(field: 'code' | 'discountValue' | 'endDate' | 'currentUseCount'): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = field === 'code' ? 'asc' : 'desc';
    }
    this.currentPage = 1;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  openCreateModal() {
    this.resetForm();
    this.showCreateModal = true;
  }

  savePromoCode() {
  this.formErrors = {};
  if (!this.formData.code?.trim()) this.formErrors['code'] = 'Code is required';
  if (!this.formData.discountValue || this.formData.discountValue <= 0) this.formErrors['discountValue'] = 'Discount value is required';
  if (!this.formData.startDate) this.formErrors['startDate'] = 'Start date is required';
  if (!this.formData.endDate) this.formErrors['endDate'] = 'End date is required';
  if (!this.formData.planType) this.formErrors['planType'] = 'Plan type is required';
  if (!this.formData.billingCycle) this.formErrors['billingCycle'] = 'Billing cycle is required';

  if (Object.keys(this.formErrors).length > 0) return;

  this.showConfirmDialog = true;
  this.confirmDialogTitle = 'Create Promo Code';
  this.confirmDialogMessage = `Are you sure you want to create "${this.formData.code.trim().toUpperCase()}"?`;
  this.confirmDialogText = 'Create';
  this.isDangerousAction = false;
  this.pendingAction = 'save';
}



  private proceedWithSavePromoCode() {
    const payload: CreatePromoCodeRequest = {
      code: this.formData.code.trim().toUpperCase(),
      description: this.formData.description || '',
      discountType: this.formData.discountType,
      discountValue: this.formData.discountValue,
      startDate: this.formData.startDate,
      endDate: this.formData.endDate,
      isActive: this.formData.isActive,
      maxUsesTotal: this.formData.maxUsesTotal,
      maxUsesPerUser: this.formData.maxUsesPerUser,
      planType: this.formData.planType || 'PATIENT',
      planName: this.formData.planName || 'ALL',
      billingCycle: this.formData.billingCycle || 'MONTHLY',
      minPurchaseAmount: this.formData.minPurchaseAmount ?? 0,
    };

    const adminId = this.authFacade.currentUser?.id;

    if (!adminId) {
      this.message = 'No authenticated admin session found.';
      return;
    }

    this.loading = true;
    this.adminService.createPromoCode(payload, adminId.toString()).subscribe({
      next: () => {
        this.message = 'Promo code created!';
        this.showCreateModal = false;
        this.loadPromoCodes();
      },
      error: (error: HttpErrorResponse) => {
        this.message = this.extractErrorMessage(error, 'Failed to create code');
        this.loading = false;
      }
    });
  }

  openEditModal(code: PromoCode) {
    this.formData = { ...code };
    this.selectedCode = code;
    this.updatePlanNameOptions(true);
    this.showCreateModal = true;
  }

  updatePromoCode() {
    if (!this.selectedCode) {
      this.message = 'No promo code selected for update';
      return;
    }

    if (!this.formData.code) {
      this.message = 'Code is required';
      return;
    }

    // Show confirmation dialog for update
    this.showConfirmDialog = true;
    this.confirmDialogTitle = 'Update Promo Code';
    this.confirmDialogMessage = `Are you sure you want to update the promo code "${this.formData.code.trim().toUpperCase()}"?`;
    this.confirmDialogText = 'Update';
    this.isDangerousAction = false;
    this.pendingAction = 'update';
  }

  private proceedWithUpdatePromoCode() {
    this.loading = true;
    if (!this.selectedCode) return;

    this.formData.code = this.formData.code.trim().toUpperCase();

    this.adminService.updatePromoCode(this.selectedCode.id, this.formData).subscribe({
      next: () => {
        this.message = 'Promo code updated!';
        this.showCreateModal = false;
        this.loadPromoCodes();
      },
      error: (error: HttpErrorResponse) => {
        this.message = this.extractErrorMessage(error, 'Failed to update code');
        this.loading = false;
      }
    });
  }

  viewDetails(code: PromoCode) {
    this.selectedCode = code;
    this.showDetailModal = true;
  }

  openDeleteConfirm(code: PromoCode) {
    this.selectedCode = code;

    // Show confirmation dialog for delete
    this.showConfirmDialog = true;
    this.confirmDialogTitle = 'Delete Promo Code';
    this.confirmDialogMessage = `Are you sure you want to delete the promo code "${code.code}"? This action cannot be undone.`;
    this.confirmDialogText = 'Delete';
    this.isDangerousAction = true;
    this.pendingAction = 'delete';
  }

  private proceedWithDeletePromoCode() {
    this.loading = true;
    if (!this.selectedCode) return;

    this.adminService.deletePromoCode(this.selectedCode.id).subscribe({
      next: () => {
        this.message = 'Promo code deleted!';
        this.loadPromoCodes();
      },
      error: (error: HttpErrorResponse) => {
        this.message = this.extractErrorMessage(error, 'Failed to delete code');
        this.loading = false;
      }
    });
  }

  toggleCode(code: PromoCode) {
    this.togglingCodeId = code.id;
    this.adminService.togglePromoCode(code.id).subscribe({
      next: () => {
        this.message = code.isActive ? 'Promo code disabled.' : 'Promo code enabled.';
        this.togglingCodeId = null;
        this.loadPromoCodes();
      },
      error: (error: HttpErrorResponse) => {
        this.message = this.extractErrorMessage(error, 'Failed to toggle code');
        this.togglingCodeId = null;
      }
    });
  }

  onConfirmationConfirmed() {
    this.showConfirmDialog = false;

    switch (this.pendingAction) {
      case 'save':
        this.proceedWithSavePromoCode();
        break;
      case 'update':
        this.proceedWithUpdatePromoCode();
        break;
      case 'delete':
        this.proceedWithDeletePromoCode();
        break;
    }

    this.pendingAction = null;
  }

  onConfirmationCancelled() {
    this.showConfirmDialog = false;
    this.pendingAction = null;
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const backendMessage =
      error?.error?.message ||
      error?.error?.error ||
      (typeof error?.error === 'string' ? error.error : null);

    if (backendMessage) {
      return backendMessage;
    }

    if (error?.status) {
      return `${fallback} (HTTP ${error.status})`;
    }

    return fallback;
  }

  resetForm() {
    this.formData = {
      id: '',
      code: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: 0,
      startDate: '',
      endDate: '',
      isActive: true,
      maxUsesTotal: 100,
      maxUsesPerUser: 1,
      currentUseCount: 0,
      planType: 'PATIENT',
      planName: 'ALL',
      billingCycle: 'MONTHLY',
      minPurchaseAmount: 0,
      createdByAdmin: '',
      createdAt: '',
      updatedAt: ''
    };
    this.updatePlanNameOptions();
    this.selectedCode = null;
  }

  onPlanTypeChange() {
    this.updatePlanNameOptions();
  }

  private updatePlanNameOptions(keepCurrent = false) {
    if (this.formData.planType === 'DOCTOR') {
      this.planNameOptions = [...this.doctorPlanNames];
    } else if (this.formData.planType === 'PATIENT') {
      this.planNameOptions = [...this.patientPlanNames];
    } else {
      this.planNameOptions = ['ALL'];
    }

    if (
      keepCurrent &&
      this.formData.planName &&
      !this.planNameOptions.includes(this.formData.planName)
    ) {
      this.planNameOptions = [this.formData.planName, ...this.planNameOptions];
      return;
    }

    if (!this.planNameOptions.includes(this.formData.planName)) {
      this.formData.planName = this.planNameOptions[0] || '';
    }
  }

  closeModal() {
    this.showCreateModal = false;
    this.showDetailModal = false;
    this.showConfirmDialog = false;
    this.resetForm();
  }

  isEditing() {
    return this.selectedCode !== null;
  }

  getDiscountDisplay(code: PromoCode): string {
    return code.discountType === 'PERCENTAGE'
      ? `${code.discountValue}% OFF`
      : `${code.discountValue} DO OFF`;
  }
  get displayedCodes(): PromoCode[] { return this.paginated; }


  getDaysUntilExpiry(endDate: string): number {
    const end = new Date(endDate);
    const today = new Date();
    const diffMs = end.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  getExpiryStatus(code: PromoCode): string {
    const days = this.getDaysUntilExpiry(code.endDate);
    if (days < 0) return 'expired';
    if (days <= 7) return 'expiring-soon';
    return 'valid';
  }

  getUsagePercentage(code: PromoCode): number {
    if (code.maxUsesTotal === 0) return 0;
    return (code.currentUseCount / code.maxUsesTotal) * 100;
  }

  copyPromoCode(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.message = `'${code}' copied to clipboard!`;
      setTimeout(() => { this.message = ''; }, 3000);
    });
  }

  private getSortValue(code: PromoCode): number | string {
    if (this.sortField === 'discountValue') {
      return code.discountValue;
    }
    if (this.sortField === 'currentUseCount') {
      return code.currentUseCount;
    }
    if (this.sortField === 'endDate') {
      return new Date(code.endDate).getTime();
    }
    return code.code;
  }


activeFilter: 'all' | 'active' | 'inactive' | 'birthday' = 'all';
setFilter(f: 'all' | 'active' | 'inactive' | 'birthday') { this.activeFilter = f; this.currentPage = 1; }
getActiveCount() { return this.promoCodes.filter(c => c.isActive).length; }
getBirthdayCount() { return this.promoCodes.filter(c => c.code.startsWith('BDAY-')).length; }
getInactiveCount() { return this.promoCodes.filter(c => !c.isActive).length; }
getFormCompletion(): number {
  const fields = [this.formData.code, this.formData.discountValue > 0, this.formData.startDate, this.formData.endDate];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

}
