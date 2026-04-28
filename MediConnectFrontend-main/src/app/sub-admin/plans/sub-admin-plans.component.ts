import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { SubAdminService } from '../services/sub-admin.service';
import { AdminDoctorPlan, AdminPatientPlan, AdminSubscriptionRecord } from '../models/sub-admin.models';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog.component';
import { PlanDeletionWarningDialogComponent } from '../../shared/components/plan-deletion-warning-dialog.component';

@Component({
  selector: 'app-sub-admin-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationDialogComponent, PlanDeletionWarningDialogComponent],
  templateUrl: './sub-admin-plans.component.html',
})
export class SubAdminPlansComponent implements OnInit {

  activeTab: 'patient' | 'doctor' = 'patient';
  searchTerm = '';
  patientPlans: AdminPatientPlan[] = [];
  doctorPlans: AdminDoctorPlan[] = [];
  loading = false;
  error = '';
  success = '';
  showPlanModal = false;
  modalMode: 'create' | 'edit' = 'create';
  currentPage = 1;
  readonly pageSize = 6;

  patientForm: AdminPatientPlan = {
    id: '',
    name: '',
    priceMonthly: 0,
    priceYearly: 0,
    maxAppointmentsPerMonth: null,
    hasAI: false,
    hasForum: false,
    has24Support: false,
    hasVideoConsultations: false,
    hasHealthRecords: false,
    isActive: true,
  };

  doctorForm: AdminDoctorPlan = {
    id: '',
    name: 'SILVER',
    priceMonthly: 0,
    priceYearly: 0,
    maxConsultationsPerMonth: null,
    hasAI: false,
    hasAdvancedAnalytics: false,
    hasAppointmentScheduling: false,
    hasPatientManagement: false,
    hasTelemedicine: false,
    isActive: true,
  };

  patientMaxAppointmentsInput: number | null = null;
  doctorMaxConsultationsInput: number | null = null;

  formErrors: Record<string, string> = {};

  // Confirmation Dialog Properties
  showConfirmDialog = false;
  confirmDialogTitle = '';
  confirmDialogMessage = '';
  confirmDialogText = 'Confirm';
  isDangerousAction = false;
  pendingAction = '';
  pendingDeleteId : number | string = '';
  pendingDeleteName = '';
  pendingDeleteType: 'patient' | 'doctor' = 'patient';

  // Plan Deletion Warning Properties
  showDeletionWarning = false;
  planSubscriptions: AdminSubscriptionRecord[] = [];

  @ViewChild(ConfirmationDialogComponent) confirmationDialog?: ConfirmationDialogComponent;

  private readonly adminService = inject(SubAdminService);

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      patients: this.adminService.getAllPatientPlans(),
      doctors: this.adminService.getAllDoctorPlans(),
    }).subscribe({
      next: ({ patients, doctors }) => {
        this.patientPlans = patients;
        this.doctorPlans = doctors;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load plans.';
        this.loading = false;
      }
    });
  }

  savePatientPlan(): void {
    this.error = '';
    this.success = '';
    this.patientForm.name = String(this.patientForm.name || '').trim().toUpperCase();
    if (!this.patientForm.name) {
      this.error = 'Plan name is required.';
      return;
    }
    this.patientForm.maxAppointmentsPerMonth = this.patientMaxAppointmentsInput;

    const request: AdminPatientPlan = { ...this.patientForm };
    const isEdit = !!request.id;
    const call = isEdit
      ? this.adminService.updatePatientPlan(String(request.id), request)
      : this.adminService.createPatientPlan(request);

    this.loading = true;
    call.subscribe({
      next: () => {
        this.success = isEdit ? 'Patient plan updated.' : 'Patient plan created.';
        this.closePlanModal();
        this.resetPatientForm();
        this.loadAll();
      },
      error: () => {
        this.error = isEdit ? 'Failed to update patient plan.' : 'Failed to create patient plan.';
        this.loading = false;
      }
    });
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    if (this.activeTab === 'patient') {
      this.resetPatientForm();
    } else {
      this.resetDoctorForm();
    }
    this.showPlanModal = true;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  changeTab(tab: 'patient' | 'doctor'): void {
    this.activeTab = tab;
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

  openPatientEditModal(plan: AdminPatientPlan): void {
    this.modalMode = 'edit';
    this.activeTab = 'patient';
    this.patientForm = { ...plan };
    this.patientMaxAppointmentsInput = plan.maxAppointmentsPerMonth;
    this.showPlanModal = true;
  }

  openDoctorEditModal(plan: AdminDoctorPlan): void {
    this.modalMode = 'edit';
    this.activeTab = 'doctor';
    this.doctorForm = { ...plan };
    this.doctorMaxConsultationsInput = plan.maxConsultationsPerMonth;
    this.showPlanModal = true;
  }

  closePlanModal(): void {
    this.showPlanModal = false;
  }

  saveActiveTabPlan(): void {
    if (!this.isFormValid()) {
      this.error = 'Please complete all required fields before saving.';
      return;
    }

    this.showConfirmDialog = true;
    this.isDangerousAction = false;
    this.pendingDeleteId = '';
    this.pendingDeleteName = '';
    this.pendingDeleteType = this.activeTab;

    if (this.activeTab === 'patient') {
      this.pendingAction = this.modalMode === 'create' ? 'createPatient' : 'updatePatient';
      this.confirmDialogTitle = this.modalMode === 'create' ? 'Create Patient Plan' : 'Update Patient Plan';
      this.confirmDialogMessage = this.modalMode === 'create'
        ? 'Are you sure you want to create this patient plan?'
        : 'Are you sure you want to save changes to this patient plan?';
      this.confirmDialogText = this.modalMode === 'create' ? 'Create' : 'Save';
      return;
    }

    this.pendingAction = this.modalMode === 'create' ? 'createDoctor' : 'updateDoctor';
    this.confirmDialogTitle = this.modalMode === 'create' ? 'Create Doctor Plan' : 'Update Doctor Plan';
    this.confirmDialogMessage = this.modalMode === 'create'
      ? 'Are you sure you want to create this doctor plan?'
      : 'Are you sure you want to save changes to this doctor plan?';
    this.confirmDialogText = this.modalMode === 'create' ? 'Create' : 'Save';
  }

  resetPatientForm(): void {
    this.patientForm = {
      id: '',
      name: '',
      priceMonthly: 0,
      priceYearly: 0,
      maxAppointmentsPerMonth: null,
      hasAI: false,
      hasForum: false,
      has24Support: false,
      hasVideoConsultations: false,
      hasHealthRecords: false,
      isActive: true,
    };
    this.patientMaxAppointmentsInput = null;
  }

  saveDoctorPlan(): void {
    this.error = '';
    this.success = '';
    this.doctorForm.name = String(this.doctorForm.name || '').trim().toUpperCase();
    if (!this.doctorForm.name) {
      this.error = 'Plan name is required.';
      return;
    }
    this.doctorForm.maxConsultationsPerMonth = this.doctorMaxConsultationsInput;

    const request: AdminDoctorPlan = { ...this.doctorForm };
    const isEdit = !!request.id;
    const call = isEdit
      ? this.adminService.updateDoctorPlan(String(request.id), request)
      : this.adminService.createDoctorPlan(request);

    this.loading = true;
    call.subscribe({
      next: () => {
        this.success = isEdit ? 'Doctor plan updated.' : 'Doctor plan created.';
        this.closePlanModal();
        this.resetDoctorForm();
        this.loadAll();
      },
      error: () => {
        this.error = isEdit ? 'Failed to update doctor plan.' : 'Failed to create doctor plan.';
        this.loading = false;
      }
    });
  }

  resetDoctorForm(): void {
    this.doctorForm = {
      id: '',
      name: 'SILVER',
      priceMonthly: 0,
      priceYearly: 0,
      maxConsultationsPerMonth: null,
      hasAI: false,
      hasAdvancedAnalytics: false,
      hasAppointmentScheduling: false,
      hasPatientManagement: false,
      hasTelemedicine: false,
      isActive: true,
    };
    this.doctorMaxConsultationsInput = null;
  }

  togglePatientPlan(id: number | string): void {
    this.adminService.togglePatientPlan(String(id)).subscribe({
      next: () => { this.success = 'Plan updated.'; this.loadAll(); },
      error: () => { this.error = 'Failed to toggle plan.'; }
    });
  }

  toggleDoctorPlan(id: number | string): void {
    this.adminService.toggleDoctorPlan(String(id)).subscribe({
      next: () => { this.success = 'Plan updated.'; this.loadAll(); },
      error: () => { this.error = 'Failed to toggle plan.'; }
    });
  }

  deletePatientPlan(id: number | string, name: string): void {
    this.showConfirmDialog = true;
    this.confirmDialogTitle = 'Delete Patient Plan';
    this.confirmDialogMessage = `Are you sure you want to delete the patient plan "${name}"? This action cannot be undone.`;
    this.confirmDialogText = 'Delete';
    this.isDangerousAction = true;
    this.pendingAction = 'deletePatient';
    this.pendingDeleteId = id;
    this.pendingDeleteName = name;
    this.pendingDeleteType = 'patient';
  }

  deleteDoctorPlan(id: number | string, name: string): void {
    this.showConfirmDialog = true;
    this.confirmDialogTitle = 'Delete Doctor Plan';
    this.confirmDialogMessage = `Are you sure you want to delete the doctor plan "${name}"? This action cannot be undone.`;
    this.confirmDialogText = 'Delete';
    this.isDangerousAction = true;
    this.pendingAction = 'deleteDoctor';
    this.pendingDeleteId = id;
    this.pendingDeleteName = name;
    this.pendingDeleteType = 'doctor';
  }

  onConfirmationConfirmed(): void {
    this.showConfirmDialog = false;

    switch (this.pendingAction) {
      case 'createPatient':
      case 'updatePatient':
        this.savePatientPlan();
        break;
      case 'createDoctor':
      case 'updateDoctor':
        this.saveDoctorPlan();
        break;
      case 'deletePatient':
        this.proceedWithDeletePatientPlan();
        break;
      case 'deleteDoctor':
        this.proceedWithDeleteDoctorPlan();
        break;
    }

    this.pendingAction = '';
  }

  onConfirmationCancelled(): void {
    this.showConfirmDialog = false;
    this.pendingAction = '';
    this.pendingDeleteId = '';
    this.pendingDeleteName = '';
  }

  closeDeletionWarning(): void {
    this.showDeletionWarning = false;
    this.pendingDeleteId = '';
    this.pendingDeleteName = '';
    this.pendingDeleteType = 'patient';
    this.planSubscriptions = [];
  }

  proceedWithDeactivatePlan(): void {
    this.showDeletionWarning = false;

    if (this.pendingDeleteType === 'patient') {
      this.adminService.togglePatientPlan(String(this.pendingDeleteId)).subscribe({
        next: () => {
          this.success = 'Patient plan deactivated instead of deleted.';
          this.pendingDeleteId = '';
          this.pendingDeleteName = '';
          this.planSubscriptions = [];
          this.loadAll();
        },
        error: () => {
          this.error = 'Failed to deactivate patient plan.';
        }
      });
    } else {
      this.adminService.toggleDoctorPlan(String(this.pendingDeleteId)).subscribe({
        next: () => {
          this.success = 'Doctor plan deactivated instead of deleted.';
          this.pendingDeleteId = '';
          this.pendingDeleteName = '';
          this.planSubscriptions = [];
          this.loadAll();
        },
        error: () => {
          this.error = 'Failed to deactivate doctor plan.';
        }
      });
    }
  }

  private proceedWithDeletePatientPlan(): void {
  const id = String(this.pendingDeleteId);

  this.adminService.getSubscriptionsByPlan(id, 'patient').subscribe({
    next: (subscriptions) => {
      if (subscriptions.length > 0) {
        // has subscribers — show warning dialog
        this.showDeletionWarning = true;
        this.planSubscriptions = subscriptions;
        return;
      }
      // no subscribers — proceed with delete
      this.adminService.deletePatientPlan(id).subscribe({
        next: () => {
          this.success = 'Patient plan deleted.';
          this.currentPage = 1;
          this.loadAll();
        },
        error: (err) => {
          // backend rejected delete (payment records etc) — show warning
          this.showDeletionWarning = true;
          this.planSubscriptions = [];
          this.error = '';
        }
      });
    },
    error: () => {
      this.error = 'Failed to check plan subscriptions.';
    }
  });
}

private proceedWithDeleteDoctorPlan(): void {
  const id = String(this.pendingDeleteId);

  this.adminService.getSubscriptionsByPlan(id, 'doctor').subscribe({
    next: (subscriptions) => {
      if (subscriptions.length > 0) {
        this.showDeletionWarning = true;
        this.planSubscriptions = subscriptions;
        return;
      }
      this.adminService.deleteDoctorPlan(id).subscribe({
        next: () => {
          this.success = 'Doctor plan deleted.';
          this.currentPage = 1;
          this.loadAll();
        },
        error: (err) => {
          this.showDeletionWarning = true;
          this.planSubscriptions = [];
          this.error = '';
        }
      });
    },
    error: () => {
      this.error = 'Failed to check plan subscriptions.';
    }
  });
}

  get filteredPatientPlans(): AdminPatientPlan[] {
    if (!this.searchTerm.trim()) return this.patientPlans;
    const term = this.searchTerm.toLowerCase();
    return this.patientPlans.filter(plan =>
      plan.name.toLowerCase().includes(term)
    );
  }

  get filteredDoctorPlans(): AdminDoctorPlan[] {
    if (!this.searchTerm.trim()) return this.doctorPlans;
    const term = this.searchTerm.toLowerCase();
    return this.doctorPlans.filter(plan =>
      plan.name.toLowerCase().includes(term)
    );
  }

  get displayedPatientPlans(): AdminPatientPlan[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredPatientPlans.slice(start, start + this.pageSize);
  }

  get displayedDoctorPlans(): AdminDoctorPlan[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDoctorPlans.slice(start, start + this.pageSize);
  }

  get totalItems(): number {
    return this.activeTab === 'patient' ? this.filteredPatientPlans.length : this.filteredDoctorPlans.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  validatePatientForm(): void {
    this.formErrors = {};

    if (!this.patientForm.name || this.patientForm.name.trim() === '') {
      this.formErrors['patientName'] = 'Plan name is required';
    }

    if (this.patientForm.priceMonthly === null || this.patientForm.priceMonthly === undefined || this.patientForm.priceMonthly <= 0) {
      this.formErrors['patientPriceMonthly'] = 'Monthly price is required';
    }

    if (this.patientForm.priceYearly === null || this.patientForm.priceYearly === undefined || this.patientForm.priceYearly <= 0) {
      this.formErrors['patientPriceYearly'] = 'Yearly price is required';
    }
  }

  validateDoctorForm(): void {
    this.formErrors = {};

    if (!this.doctorForm.name || this.doctorForm.name.trim() === '') {
      this.formErrors['doctorName'] = 'Plan name is required';
    }

    if (this.doctorForm.priceMonthly === null || this.doctorForm.priceMonthly === undefined || this.doctorForm.priceMonthly <= 0) {
      this.formErrors['doctorPriceMonthly'] = 'Monthly price is required';
    }

    if (this.doctorForm.priceYearly === null || this.doctorForm.priceYearly === undefined || this.doctorForm.priceYearly <= 0) {
      this.formErrors['doctorPriceYearly'] = 'Yearly price is required';
    }
  }

  isFormValid(): boolean {
    if (this.activeTab === 'patient') {
      this.validatePatientForm();
      return Object.keys(this.formErrors).length === 0;
    } else {
      this.validateDoctorForm();
      return Object.keys(this.formErrors).length === 0;
    }
  }

  getFormCompletion(): number {
    if (this.activeTab === 'patient') {
      return this.getPatientFormCompletion();
    } else {
      return this.getDoctorFormCompletion();
    }
  }

  private getPatientFormCompletion(): number {
    let completed = 0;
    const total = 5;

    if (this.patientForm.name && this.patientForm.name.trim()) completed++;
    if (this.patientForm.priceMonthly !== null && this.patientForm.priceMonthly >= 0) completed++;
    if (this.patientForm.priceYearly !== null && this.patientForm.priceYearly >= 0) completed++;
    if (this.patientMaxAppointmentsInput !== null) completed++;
    if (this.patientForm.hasAI || this.patientForm.hasForum) completed++;

    return Math.round((completed / total) * 100);
  }

  private getDoctorFormCompletion(): number {
    let completed = 0;
    const total = 5;

    if (this.doctorForm.name && this.doctorForm.name.trim()) completed++;
    if (this.doctorForm.priceMonthly !== null && this.doctorForm.priceMonthly >= 0) completed++;
    if (this.doctorForm.priceYearly !== null && this.doctorForm.priceYearly >= 0) completed++;
    if (this.doctorMaxConsultationsInput !== null) completed++;
    if (this.doctorForm.hasAI || this.doctorForm.hasAdvancedAnalytics) completed++;

    return Math.round((completed / total) * 100);
  }

  getPatientSectionProgress(section: string): number {
    switch (section) {
      case 'info':
        return this.patientForm.name && this.patientForm.name.trim() ? 1 : 0;
      case 'pricing': {
        let count = 0;
        if (this.patientForm.priceMonthly !== null && this.patientForm.priceMonthly >= 0) count++;
        if (this.patientForm.priceYearly !== null && this.patientForm.priceYearly >= 0) count++;
        return count;
      }
      default:
        return 0;
    }
  }

  getDoctorSectionProgress(section: string): number {
    switch (section) {
      case 'info':
        return this.doctorForm.name && this.doctorForm.name.trim() ? 1 : 0;
      case 'pricing': {
        let count = 0;
        if (this.doctorForm.priceMonthly !== null && this.doctorForm.priceMonthly >= 0) count++;
        if (this.doctorForm.priceYearly !== null && this.doctorForm.priceYearly >= 0) count++;
        return count;
      }
      default:
        return 0;
    }
  }

  getPatientFeaturesCount(): number {
    return (this.patientForm.hasAI ? 1 : 0) + (this.patientForm.hasForum ? 1 : 0) + (this.patientForm.has24Support ? 1 : 0) + (this.patientForm.hasVideoConsultations ? 1 : 0) + (this.patientForm.hasHealthRecords ? 1 : 0);
  }

  getDoctorFeaturesCount(): number {
    return (this.doctorForm.hasAI ? 1 : 0) + (this.doctorForm.hasAdvancedAnalytics ? 1 : 0) + (this.doctorForm.hasAppointmentScheduling ? 1 : 0) + (this.doctorForm.hasPatientManagement ? 1 : 0) + (this.doctorForm.hasTelemedicine ? 1 : 0);
  }

  get patientPresetPlans(): AdminPatientPlan[] {
    return this.patientPlans
      .slice()
      .sort((a, b) => Number(b.isActive) - Number(a.isActive));
  }

  get doctorPresetPlans(): AdminDoctorPlan[] {
    return this.doctorPlans
      .slice()
      .sort((a, b) => Number(b.isActive) - Number(a.isActive));
  }

  applyPatientPreset(preset: AdminPatientPlan): void {
    this.patientForm = {
      ...preset,
      id: '',
    };
    this.patientMaxAppointmentsInput = preset.maxAppointmentsPerMonth;

    this.validatePatientForm();
  }

  applyDoctorPreset(preset: AdminDoctorPlan): void {
    this.doctorForm = {
      ...preset,
      id: '',
    };
    this.doctorMaxConsultationsInput = preset.maxConsultationsPerMonth;

    this.validateDoctorForm();
  }

  getPatientFeature(key: string): boolean {
  return (this.patientForm as any)[key];
}
setPatientFeature(key: string, value: boolean): void {
  (this.patientForm as any)[key] = value;
}
getDoctorFeature(key: string): boolean {
  return (this.doctorForm as any)[key];
}
setDoctorFeature(key: string, value: boolean): void {
  (this.doctorForm as any)[key] = value;
}
}
