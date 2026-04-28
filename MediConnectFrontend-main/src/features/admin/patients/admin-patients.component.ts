import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Observable, Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import {
  AdminService,
  AdminUserResult,
} from '../../../core/services/admin.service';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../auth/toast/toast.service';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

@Component({
  selector: 'app-admin-patients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h1 class="text-2xl font-bold text-stone-900">Patients</h1>
          <p class="text-sm text-stone-500 mt-0.5">Liste des patients avec filtres dedies</p>
        </div>
        <button (click)="load()" class="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-800">
          Rafraichir
        </button>
      </div>

      <div class="bg-white rounded-3xl border border-stone-200 shadow-sm p-4 mb-5">
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <div class="xl:col-span-2">
            <input
              type="search"
              [formControl]="searchCtrl"
              placeholder="Nom, email..."
              class="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-teal-400" />
          </div>

          <div>
            <select [formControl]="bloodTypeCtrl" class="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-teal-400">
              <option value="">Tous les groupes</option>
              <option *ngFor="let bloodType of bloodTypes" [value]="bloodType">{{ bloodType }}</option>
            </select>
          </div>

          <div>
            <select [formControl]="statusCtrl" class="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-teal-400">
              <option value="">Tous les statuts</option>
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
          </div>

          <div>
            <select [formControl]="twoFactorCtrl" class="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-teal-400">
              <option value="">Toutes les 2FA</option>
              <option value="true">2FA activee</option>
              <option value="false">2FA inactive</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <input
              type="number"
              min="0"
              [formControl]="ageMinCtrl"
              placeholder="Age min"
              class="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-teal-400" />
            <input
              type="number"
              min="0"
              [formControl]="ageMaxCtrl"
              placeholder="Age max"
              class="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm outline-none focus:bg-white focus:border-teal-400" />
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 mt-4">
          <p class="text-xs text-stone-500">{{ totalElements() }} patient(s) correspondant(s)</p>
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
          <div class="min-w-[980px]">
            <div class="grid px-5 py-3 text-xs font-semibold text-stone-500 border-b border-stone-100"
                 style="grid-template-columns: 3rem 1.3fr 1fr 7rem 7rem 7rem 7rem 10rem">
              <div>#</div>
              <div>Patient</div>
              <div>Email</div>
              <div>Groupe</div>
              <div>Age</div>
              <div>2FA</div>
              <div class="text-center">Etat</div>
              <div class="text-right">Actions</div>
            </div>

            <div *ngIf="loading()" class="px-5 py-6 text-sm text-stone-500">Chargement...</div>

            <div *ngIf="!loading() && patients().length === 0" class="px-5 py-10 text-sm text-stone-400">
              Aucun patient ne correspond aux filtres courants.
            </div>

            <div *ngFor="let patient of patients(); let index = index"
                 class="grid items-center gap-4 px-5 py-3.5 border-b border-stone-50 last:border-0"
                 [ngClass]="{ 'bg-stone-50/70': !patient.isActive }"
                 style="grid-template-columns: 3rem 1.3fr 1fr 7rem 7rem 7rem 7rem 10rem">
              <div class="text-sm text-stone-400">{{ rowNumber(index) }}</div>

              <div class="min-w-0 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs overflow-hidden">
                  <img *ngIf="patient.profilePicture" [src]="patient.profilePicture" alt="" class="w-full h-full object-cover" />
                  <span *ngIf="!patient.profilePicture">{{ initials(patient) }}</span>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-stone-900 truncate">{{ fullName(patient) }}</p>
                  <p class="text-xs text-stone-500 truncate">{{ patient.phone || '—' }}</p>
                </div>
              </div>

              <div class="text-sm text-stone-700 truncate">{{ patient.email }}</div>
              <div class="text-sm text-stone-700">{{ patient.bloodType || '—' }}</div>
              <div class="text-sm text-stone-700">{{ patient.age ?? '—' }}</div>
              <div class="text-sm" [ngClass]="patient.twoFactorEnabled ? 'text-emerald-700' : 'text-stone-400'">
                {{ patient.twoFactorEnabled ? 'Activee' : 'Inactive' }}
              </div>

              <div class="flex justify-center">
                <span class="px-2 py-1 rounded-full text-[11px] font-semibold"
                      [ngClass]="patient.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-200 text-stone-700'">
                  {{ patient.isActive ? 'Actif' : 'Inactif' }}
                </span>
              </div>

              <div class="flex items-center justify-end gap-2">
                <button (click)="view(patient)" class="px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-800">
                  Voir
                </button>
                <button
                  *ngIf="patient.isActive"
                  (click)="toggle(patient, false)"
                  class="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold">
                  Bloquer
                </button>
                <button
                  *ngIf="!patient.isActive"
                  (click)="toggle(patient, true)"
                  class="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-semibold">
                  Debloquer
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
  `,
})
export class AdminPatientsComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  loading = signal(false);
  patients = signal<AdminUserResult[]>([]);
  currentPage = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);
  readonly pageSize = 20;
  readonly bloodTypes = BLOOD_TYPES;

  searchCtrl = this.fb.control('');
  bloodTypeCtrl = this.fb.control('');
  statusCtrl = this.fb.control('');
  twoFactorCtrl = this.fb.control('');
  ageMinCtrl = this.fb.control<number | null>(null);
  ageMaxCtrl = this.fb.control<number | null>(null);

  hasFilters = computed(() =>
    !!(
      this.searchCtrl.value ||
      this.bloodTypeCtrl.value ||
      this.statusCtrl.value ||
      this.twoFactorCtrl.value ||
      this.ageMinCtrl.value != null ||
      this.ageMaxCtrl.value != null
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

    this.watchControl(this.bloodTypeCtrl.valueChanges);
    this.watchControl(this.statusCtrl.valueChanges);
    this.watchControl(this.twoFactorCtrl.valueChanges);
    this.watchControl(this.ageMinCtrl.valueChanges);
    this.watchControl(this.ageMaxCtrl.valueChanges);
  }

  load(page = this.currentPage()): void {
    this.loading.set(true);
    this.adminService.searchUsers({
      userType: 'PATIENT',
      q: this.searchCtrl.value?.trim() || undefined,
      bloodType: this.bloodTypeCtrl.value || undefined,
      ageMin: this.ageMinCtrl.value ?? undefined,
      ageMax: this.ageMaxCtrl.value ?? undefined,
      isActive: this.toBoolean(this.statusCtrl.value),
      is2FAEnabled: this.toBoolean(this.twoFactorCtrl.value),
      page,
      size: this.pageSize,
      sort: 'createdAt,desc',
    }).subscribe({
      next: response => {
        this.patients.set(response.content);
        this.currentPage.set(response.number);
        this.totalPages.set(response.totalPages);
        this.totalElements.set(response.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Impossible de charger les patients.');
      },
    });
  }

  goTo(page: number): void {
    if (page < 0 || page >= this.totalPages()) return;
    this.load(page);
  }

  clearFilters(): void {
    this.searchCtrl.setValue('');
    this.bloodTypeCtrl.setValue('');
    this.statusCtrl.setValue('');
    this.twoFactorCtrl.setValue('');
    this.ageMinCtrl.setValue(null);
    this.ageMaxCtrl.setValue(null);
  }

  view(patient: AdminUserResult): void {
    void this.router.navigate(['/admin/patients', patient.id]);
  }

  toggle(patient: AdminUserResult, active: boolean): void {
    const request$ = active
      ? this.userService.activatePatient(patient.id)
      : this.userService.deactivatePatient(patient.id);

    request$.subscribe({
      next: () => {
        this.toast.success(active ? 'Patient debloque.' : 'Patient bloque.');
        this.patients.update(list => list.map(item => item.id === patient.id ? { ...item, isActive: active } : item));
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

  initials(patient: AdminUserResult): string {
    return `${(patient.firstName || '').slice(0, 1)}${(patient.lastName || '').slice(0, 1)}`.toUpperCase() || 'PT';
  }

  fullName(patient: AdminUserResult): string {
    return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.email;
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
