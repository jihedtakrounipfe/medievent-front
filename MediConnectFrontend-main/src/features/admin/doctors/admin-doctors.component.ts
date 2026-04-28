import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { DoctorApprovalModalComponent } from '../../../app/components/admin/doctor-approval-modal/doctor-approval-modal.component';
import {
  DoctorRejectionModalComponent,
  RejectPayload,
} from '../../../app/components/admin/doctor-rejection-modal/doctor-rejection-modal.component';
import {
  DoctorSuspensionModalComponent,
  SuspendPayload,
} from '../../../app/components/admin/doctor-suspension-modal/doctor-suspension-modal.component';
import { DoctorStatusBadgeComponent } from '../../../app/components/shared/doctor-status-badge/doctor-status-badge.component';
import {
  AdminService,
  AdminUserResult,
} from '../../../core/services/admin.service';
import { UserService } from '../../../core/services/user.service';
import { Doctor, UserType, VerificationStatus } from '../../../core/user';
import { ToastService } from '../../auth/toast/toast.service';

const SPECIALTIES = [
  { value: 'GENERAL_PRACTICE', label: 'Medecine generale' },
  { value: 'CARDIOLOGY', label: 'Cardiologie' },
  { value: 'DERMATOLOGY', label: 'Dermatologie' },
  { value: 'PEDIATRICS', label: 'Pediatrie' },
  { value: 'NEUROLOGY', label: 'Neurologie' },
  { value: 'ORTHOPEDICS', label: 'Orthopedie' },
  { value: 'PSYCHIATRY', label: 'Psychiatrie' },
  { value: 'RADIOLOGY', label: 'Radiologie' },
  { value: 'OTHER', label: 'Autre' },
];

@Component({
  selector: 'app-admin-doctors',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    DoctorStatusBadgeComponent,
    DoctorApprovalModalComponent,
    DoctorRejectionModalComponent,
    DoctorSuspensionModalComponent,
  ],
  template: `
    <div class="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h1 class="text-2xl font-bold text-stone-900">Medecins</h1>
          <p class="text-sm text-stone-500 mt-0.5">Liste des medecins avec recherche ciblee</p>
        </div>
        <button (click)="load()" class="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-800">
          Rafraichir
        </button>
      </div>

      <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-4 mb-5">
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div class="xl:col-span-2">
            <input
              type="search"
              [formControl]="searchCtrl"
              placeholder="Nom, email, RPPS..."
              class="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-teal-400" />
          </div>

          <div>
            <select [formControl]="specialtyCtrl" class="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-teal-400">
              <option value="">Toutes les specialites</option>
              <option *ngFor="let specialty of specialties" [value]="specialty.value">{{ specialty.label }}</option>
            </select>
          </div>

          <div>
            <select [formControl]="verificationCtrl" class="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-teal-400">
              <option value="">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="APPROVED">Approuves</option>
              <option value="REJECTED">Refuses</option>
              <option value="SUSPENDED">Suspendus</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <select [formControl]="statusCtrl" class="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-teal-400">
              <option value="">Etat compte</option>
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
            <select [formControl]="twoFactorCtrl" class="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-teal-400">
              <option value="">2FA</option>
              <option value="true">Activee</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 mt-4">
          <p class="text-xs text-stone-500">{{ totalElements() }} medecin(s) correspondant(s)</p>
          <button
            *ngIf="hasFilters()"
            (click)="clearFilters()"
            class="px-3 py-2 rounded-xl text-sm font-semibold text-rose-700 hover:bg-rose-50">
            Effacer les filtres
          </button>
        </div>
      </div>

      <div class="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <div class="min-w-[1080px]">
            <div class="grid px-5 py-3 text-xs font-semibold text-stone-500 border-b border-stone-100"
                 style="grid-template-columns: 3rem 1.2fr 1fr 10rem 8rem 8rem 8rem 16rem">
              <div>#</div>
              <div>Nom</div>
              <div>Email</div>
              <div>Specialite</div>
              <div>RPPS</div>
              <div>2FA</div>
              <div class="text-center">Statut</div>
              <div class="text-right">Actions</div>
            </div>

            <div *ngIf="loading()" class="px-5 py-6 text-sm text-stone-500">Chargement...</div>

            <div *ngIf="!loading() && doctors().length === 0" class="px-5 py-10 text-sm text-stone-400">
              Aucun medecin ne correspond aux filtres courants.
            </div>

            <div *ngFor="let doctor of doctors(); let index = index"
                 class="grid items-center gap-4 px-5 py-3.5 border-b border-stone-50 last:border-0"
                 [ngClass]="{ 'bg-stone-50/70': !doctor.isActive }"
                 style="grid-template-columns: 3rem 1.2fr 1fr 10rem 8rem 8rem 8rem 16rem">
              <div class="text-sm text-stone-400">{{ rowNumber(index) }}</div>

              <div class="min-w-0 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                  <img *ngIf="doctor.profilePicture" [src]="doctor.profilePicture" alt="" class="w-full h-full object-cover" />
                  <span *ngIf="!doctor.profilePicture" class="text-xs font-bold text-stone-600">{{ initials(doctor) }}</span>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-stone-900 truncate">Dr. {{ fullName(doctor) }}</p>
                  <p class="text-xs text-stone-500 truncate">{{ doctor.isActive ? 'Actif' : 'Inactif' }}</p>
                </div>
              </div>

              <div class="text-sm text-stone-700 truncate">{{ doctor.email }}</div>
              <div class="text-sm text-stone-700 truncate">{{ specializationLabel(doctor) }}</div>
              <div class="text-sm text-stone-700 truncate">{{ doctor.rppsNumber || '—' }}</div>
              <div class="text-sm" [ngClass]="doctor.twoFactorEnabled ? 'text-emerald-700' : 'text-stone-400'">
                {{ doctor.twoFactorEnabled ? 'Activee' : 'Inactive' }}
              </div>

              <div class="flex justify-center">
                <app-doctor-status-badge [status]="doctorStatus(doctor.verificationStatus)" />
              </div>

              <div class="flex items-center justify-end gap-2">
                <a [routerLink]="['/admin/doctors', doctor.id]"
                   class="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700 transition-colors">
                  Profil
                </a>
                <button *ngIf="doctor.verificationStatus === 'PENDING'" (click)="approveTarget.set(toDoctor(doctor))"
                        class="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold">
                  Approuver
                </button>
                <button *ngIf="doctor.verificationStatus === 'PENDING'" (click)="openReject(doctor)"
                        class="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold">
                  Refuser
                </button>
                <button *ngIf="doctor.verificationStatus === 'APPROVED'" (click)="openSuspend(doctor)"
                        class="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold">
                  Suspendre
                </button>
                <button *ngIf="doctor.verificationStatus === 'REJECTED'" (click)="approveTarget.set(toDoctor(doctor))"
                        class="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold">
                  Approuver
                </button>
                <button *ngIf="doctor.verificationStatus === 'SUSPENDED'" (click)="confirmReactivate(doctor)"
                        class="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold">
                  Reactiver
                </button>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="totalPages() > 1" class="px-5 py-4 border-t border-stone-100 flex items-center justify-between gap-3">
          <p class="text-sm text-stone-500">
            Page <span class="font-semibold text-stone-800">{{ currentPage() + 1 }}</span>
            sur <span class="font-semibold text-stone-800">{{ totalPages() }}</span>
          </p>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              (click)="goTo(currentPage() - 1)"
              [disabled]="currentPage() === 0"
              class="px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed">
              Prec.
            </button>

            <button
              *ngFor="let page of pageNumbers()"
              type="button"
              (click)="goTo(page)"
              class="px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors"
              [class.bg-teal-600]="page === currentPage()"
              [class.text-white]="page === currentPage()"
              [class.border]="page !== currentPage()"
              [class.border-stone-200]="page !== currentPage()"
              [class.text-stone-700]="page !== currentPage()"
              [class.hover:bg-stone-50]="page !== currentPage()">
              {{ page + 1 }}
            </button>

            <button
              type="button"
              (click)="goTo(currentPage() + 1)"
              [disabled]="currentPage() >= totalPages() - 1"
              class="px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed">
              Suiv.
            </button>
          </div>
        </div>
      </div>
    </div>

    <app-doctor-approval-modal
      [doctor]="approveTarget()"
      [loading]="modalLoading()"
      (confirm)="confirmApprove($event)"
      (cancel)="closeModals()" />

    <app-doctor-rejection-modal
      [doctor]="rejectTarget()"
      [loading]="modalLoading()"
      (confirm)="confirmReject($event)"
      (cancel)="closeModals()" />

    <app-doctor-suspension-modal
      [doctor]="suspendTarget()"
      [loading]="modalLoading()"
      (confirm)="confirmSuspend($event)"
      (cancel)="closeModals()" />
  `,
})
export class AdminDoctorsComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  loading = signal(false);
  doctors = signal<AdminUserResult[]>([]);
  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  readonly pageSize = 20;
  readonly specialties = SPECIALTIES;

  approveTarget = signal<Doctor | null>(null);
  rejectTarget = signal<Doctor | null>(null);
  suspendTarget = signal<Doctor | null>(null);
  modalLoading = signal(false);

  searchCtrl = this.fb.control('');
  specialtyCtrl = this.fb.control('');
  verificationCtrl = this.fb.control('');
  statusCtrl = this.fb.control('');
  twoFactorCtrl = this.fb.control('');

  hasFilters = computed(() =>
    !!(
      this.searchCtrl.value ||
      this.specialtyCtrl.value ||
      this.verificationCtrl.value ||
      this.statusCtrl.value ||
      this.twoFactorCtrl.value
    )
  );

  constructor() {
    this.bindFilters();
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private bindFilters(): void {
    this.searchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => this.load(0));

    this.watchControl(this.specialtyCtrl.valueChanges);
    this.watchControl(this.verificationCtrl.valueChanges);
    this.watchControl(this.statusCtrl.valueChanges);
    this.watchControl(this.twoFactorCtrl.valueChanges);
  }

  load(page = this.currentPage()): void {
    this.loading.set(true);
    this.adminService.searchUsers({
      userType: UserType.DOCTOR,
      q: this.searchCtrl.value?.trim() || undefined,
      specialty: this.specialtyCtrl.value || undefined,
      status: this.verificationCtrl.value || undefined,
      isActive: this.toBoolean(this.statusCtrl.value),
      is2FAEnabled: this.toBoolean(this.twoFactorCtrl.value),
      page,
      size: this.pageSize,
      sort: 'createdAt,desc',
    }).subscribe({
      next: response => {
        this.doctors.set(response.content);
        this.currentPage.set(response.number);
        this.totalPages.set(response.totalPages);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Impossible de charger les medecins.');
      },
    });
  }

  goTo(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.load(page);
  }

  clearFilters(): void {
    this.searchCtrl.setValue('');
    this.specialtyCtrl.setValue('');
    this.verificationCtrl.setValue('');
    this.statusCtrl.setValue('');
    this.twoFactorCtrl.setValue('');
  }

  openReject(doctor: AdminUserResult): void {
    this.closeModals();
    this.rejectTarget.set(this.toDoctor(doctor));
  }

  openSuspend(doctor: AdminUserResult): void {
    this.closeModals();
    this.suspendTarget.set(this.toDoctor(doctor));
  }

  closeModals(): void {
    this.approveTarget.set(null);
    this.rejectTarget.set(null);
    this.suspendTarget.set(null);
    this.modalLoading.set(false);
  }

  confirmApprove(doctor: Doctor): void {
    this.modalLoading.set(true);
    this.userService.approveDoctor(doctor.id).subscribe({
      next: updated => {
        this.toast.success(`Le compte du Dr. ${doctor.firstName} ${doctor.lastName} a ete approuve`);
        this.updateDoctor(doctor.id, updated.verificationStatus);
        this.closeModals();
      },
      error: () => {
        this.modalLoading.set(false);
        this.toast.error('Action impossible.');
      },
    });
  }

  confirmReject({ doctor, reason }: RejectPayload): void {
    this.modalLoading.set(true);
    this.userService.rejectDoctor(doctor.id, reason).subscribe({
      next: updated => {
        this.toast.success(`Le compte du Dr. ${doctor.firstName} ${doctor.lastName} a ete refuse`);
        this.updateDoctor(doctor.id, updated.verificationStatus);
        this.closeModals();
      },
      error: () => {
        this.modalLoading.set(false);
        this.toast.error('Action impossible.');
      },
    });
  }

  confirmSuspend({ doctor, reason }: SuspendPayload): void {
    this.modalLoading.set(true);
    this.userService.suspendDoctor(doctor.id, reason).subscribe({
      next: updated => {
        this.toast.success(`Le compte du Dr. ${doctor.firstName} ${doctor.lastName} a ete suspendu`);
        this.updateDoctor(doctor.id, updated.verificationStatus);
        this.closeModals();
      },
      error: () => {
        this.modalLoading.set(false);
        this.toast.error('Action impossible.');
      },
    });
  }

  confirmReactivate(doctor: AdminUserResult): void {
    this.userService.reactivateDoctor(doctor.id).subscribe({
      next: updated => {
        this.toast.success(`Le compte du Dr. ${doctor.firstName} ${doctor.lastName} a ete reactive`);
        this.updateDoctor(doctor.id, updated.verificationStatus);
      },
      error: () => this.toast.error('Action impossible.'),
    });
  }

  pageNumbers(): number[] {
    if (this.totalPages() <= 1) return [];
    const start = Math.max(0, this.currentPage() - 2);
    const end = Math.min(this.totalPages() - 1, this.currentPage() + 2);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  rowNumber(index: number): number {
    return this.currentPage() * this.pageSize + index + 1;
  }

  initials(doctor: AdminUserResult): string {
    return `${(doctor.firstName || '').slice(0, 1)}${(doctor.lastName || '').slice(0, 1)}`.toUpperCase() || 'DR';
  }

  fullName(doctor: AdminUserResult): string {
    return `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || doctor.email;
  }

  specializationLabel(doctor: AdminUserResult): string {
    return doctor.specializationLabel || doctor.specialization || '—';
  }

  doctorStatus(status?: string): VerificationStatus | undefined {
    return status as VerificationStatus | undefined;
  }

  toDoctor(doctor: AdminUserResult): Doctor {
    return {
      id: doctor.id,
      email: doctor.email,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      userType: UserType.DOCTOR,
      isActive: doctor.isActive,
      phone: doctor.phone,
      profilePicture: doctor.profilePicture,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
      address: undefined,
      specialization: doctor.specialization as any,
      officeAddress: doctor.officeAddress,
      isVerified: doctor.isVerified,
      rppsNumber: doctor.rppsNumber || '',
      verificationStatus: this.doctorStatus(doctor.verificationStatus),
      consultationFee: doctor.consultationFee,
      twoFactorEnabled: doctor.twoFactorEnabled,
      googleCalendarLinked: false,
    };
  }

  private updateDoctor(id: number, verificationStatus: VerificationStatus | undefined): void {
    if (!verificationStatus) return;
    this.doctors.update(list =>
      list.map(doctor => doctor.id === id ? { ...doctor, verificationStatus } : doctor),
    );
  }

  private toBoolean(value: unknown): boolean | undefined {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }

  private watchControl(stream: Observable<unknown>): void {
    stream.pipe(takeUntil(this.destroy$)).subscribe(() => this.load(0));
  }
}
