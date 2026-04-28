import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AdminSearchCriteria, AdminSearchPage, AdminUserResult, AdminService } from '../../../core/services/admin.service';
import { DoctorStatusBadgeComponent } from '../../../app/components/shared/doctor-status-badge/doctor-status-badge.component';
import { ToastService } from '../../auth/toast/toast.service';

interface ActiveChip {
  key: keyof AdminSearchCriteria;
  label: string;
  value: string;
}

const SPEC_LABELS: Record<string, string> = {
  GENERAL_PRACTICE: 'Médecine générale',
  CARDIOLOGY: 'Cardiologie',
  DERMATOLOGY: 'Dermatologie',
  PEDIATRICS: 'Pédiatrie',
  NEUROLOGY: 'Neurologie',
  ORTHOPEDICS: 'Orthopédie',
  PSYCHIATRY: 'Psychiatrie',
  RADIOLOGY: 'Radiologie',
  OTHER: 'Autre',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
  SUSPENDED: 'Suspendu',
};

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

@Component({
  selector: 'app-user-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, DoctorStatusBadgeComponent],
  template: `
    <div class="max-w-screen-2xl mx-auto px-4 md:px-6 py-6 space-y-4">

      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-stone-900">
            {{ defaultUserType === 'DOCTOR' ? 'Médecins' : defaultUserType === 'PATIENT' ? 'Patients' : 'Utilisateurs' }}
          </h1>
          <p class="text-sm text-stone-500 mt-0.5">
            {{ page()?.totalElements ?? 0 }} résultat{{ (page()?.totalElements ?? 0) !== 1 ? 's' : '' }}
          </p>
        </div>
      </div>

      <!-- Search bar + quick filters -->
      <div class="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-3">
        <div class="flex flex-col sm:flex-row gap-3">
          <!-- Search input -->
          <div class="relative flex-1">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
            <input [formControl]="searchCtrl"
                   type="text"
                   placeholder="Rechercher par nom, email, RPPS…"
                   class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"/>
          </div>

          <!-- Quick filters row -->
          <div class="flex gap-2 flex-wrap">
            <!-- User type (hidden when defaultUserType is fixed) -->
            <select *ngIf="!defaultUserType" [formControl]="typeCtrl"
                    class="rounded-xl border border-stone-200 text-sm text-stone-700 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400">
              <option value="">Tous les types</option>
              <option value="DOCTOR">Médecin</option>
              <option value="PATIENT">Patient</option>
              <option value="ADMINISTRATOR">Admin</option>
            </select>

            <!-- Specialty (only for doctors) -->
            <select *ngIf="showDoctorFilters()" [formControl]="specCtrl"
                    class="rounded-xl border border-stone-200 text-sm text-stone-700 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400">
              <option value="">Toutes les spécialités</option>
              <option *ngFor="let s of specialties" [value]="s.value">{{ s.label }}</option>
            </select>

            <!-- Status (only for doctors) -->
            <select *ngIf="showDoctorFilters()" [formControl]="statusCtrl"
                    class="rounded-xl border border-stone-200 text-sm text-stone-700 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400">
              <option value="">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="APPROVED">Approuvé</option>
              <option value="REJECTED">Refusé</option>
              <option value="SUSPENDED">Suspendu</option>
            </select>

            <!-- Advanced toggle -->
            <button (click)="advancedOpen.set(!advancedOpen())"
                    class="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                    [class.border-sky-400]="advancedOpen()"
                    [class.text-sky-600]="advancedOpen()">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-.293.707L13 13.414V19a1 1 0 0 1-.553.894l-4 2A1 1 0 0 1 7 21v-7.586L3.293 6.707A1 1 0 0 1 3 6V4z"/>
              </svg>
              Filtres avancés
              <span *ngIf="advancedActiveCount() > 0"
                    class="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] font-bold">
                {{ advancedActiveCount() }}
              </span>
            </button>
          </div>
        </div>

        <!-- Advanced filters panel -->
        <div *ngIf="advancedOpen()" class="border-t border-stone-100 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <!-- Age range -->
          <div>
            <label class="block text-xs font-semibold text-stone-500 mb-1.5">Âge</label>
            <div class="flex items-center gap-2">
              <input [formControl]="ageMinCtrl" type="number" min="0" max="120" placeholder="Min"
                     class="w-full rounded-xl border border-stone-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"/>
              <span class="text-stone-400 text-sm">–</span>
              <input [formControl]="ageMaxCtrl" type="number" min="0" max="120" placeholder="Max"
                     class="w-full rounded-xl border border-stone-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"/>
            </div>
          </div>

          <!-- Blood type (only for patients) -->
          <div *ngIf="showPatientFilters()">
            <label class="block text-xs font-semibold text-stone-500 mb-1.5">Groupe sanguin</label>
            <div class="flex flex-wrap gap-1.5">
              <button *ngFor="let bt of bloodTypes"
                      (click)="toggleBloodType(bt)"
                      class="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors"
                      [class.bg-sky-500]="selectedBloodTypes().includes(bt)"
                      [class.text-white]="selectedBloodTypes().includes(bt)"
                      [class.border-sky-500]="selectedBloodTypes().includes(bt)"
                      [class.bg-white]="!selectedBloodTypes().includes(bt)"
                      [class.text-stone-600]="!selectedBloodTypes().includes(bt)"
                      [class.border-stone-200]="!selectedBloodTypes().includes(bt)">
                {{ bt }}
              </button>
            </div>
          </div>

          <!-- Signup date range -->
          <div>
            <label class="block text-xs font-semibold text-stone-500 mb-1.5">Inscrit entre</label>
            <div class="flex items-center gap-2">
              <input [formControl]="sinceCtrl" type="date"
                     class="w-full rounded-xl border border-stone-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"/>
              <span class="text-stone-400 text-sm">–</span>
              <input [formControl]="untilCtrl" type="date"
                     class="w-full rounded-xl border border-stone-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"/>
            </div>
          </div>

          <!-- Active status -->
          <div>
            <label class="block text-xs font-semibold text-stone-500 mb-1.5">Statut du compte</label>
            <select [formControl]="activeCtrl"
                    class="w-full rounded-xl border border-stone-200 text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400">
              <option value="">Tous</option>
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
          </div>

          <!-- 2FA status -->
          <div>
            <label class="block text-xs font-semibold text-stone-500 mb-1.5">Double authentification</label>
            <select [formControl]="twoFaCtrl"
                    class="w-full rounded-xl border border-stone-200 text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400">
              <option value="">Tous</option>
              <option value="true">Activée</option>
              <option value="false">Désactivée</option>
            </select>
          </div>

          <!-- Reset advanced -->
          <div class="flex items-end">
            <button (click)="resetAdvanced()"
                    class="px-4 py-2 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      <!-- Active filter chips -->
      <div *ngIf="activeChips().length > 0" class="flex flex-wrap gap-2">
        <span *ngFor="let chip of activeChips()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold">
          {{ chip.label }}
          <button (click)="removeChip(chip)" class="hover:text-sky-900">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </span>
        <button (click)="resetAll()" class="text-xs text-stone-500 hover:text-stone-800 underline underline-offset-2">
          Tout effacer
        </button>
      </div>

      <!-- Results table -->
      <div class="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">

        <!-- Loading skeleton -->
        <div *ngIf="loading()" class="p-6 space-y-3">
          <div *ngFor="let _ of [1,2,3,4,5]" class="flex items-center gap-4 animate-pulse">
            <div class="w-9 h-9 rounded-xl bg-stone-100 flex-shrink-0"></div>
            <div class="flex-1 space-y-2">
              <div class="h-3 bg-stone-100 rounded w-1/3"></div>
              <div class="h-2.5 bg-stone-100 rounded w-1/4"></div>
            </div>
            <div class="h-3 bg-stone-100 rounded w-1/4"></div>
            <div class="h-6 bg-stone-100 rounded-full w-20"></div>
            <div class="h-3 bg-stone-100 rounded w-16"></div>
            <div class="h-7 bg-stone-100 rounded-lg w-12"></div>
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="!loading() && users().length === 0" class="flex flex-col items-center justify-center py-16 text-center">
          <svg class="w-12 h-12 text-stone-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
          </svg>
          <p class="text-stone-500 font-medium">Aucun résultat</p>
          <p class="text-stone-400 text-sm mt-1">Essayez de modifier vos critères de recherche.</p>
        </div>

        <!-- Table -->
        <div *ngIf="!loading() && users().length > 0" class="overflow-x-auto">
          <div class="min-w-[900px]">

            <!-- Header -->
            <div class="grid px-5 py-3 text-xs font-semibold text-stone-500 border-b border-stone-100"
                 [style.grid-template-columns]="gridCols()">
              <div>Utilisateur</div>
              <div>Email</div>
              <div *ngIf="showDoctorFilters()">Spécialité</div>
              <div *ngIf="showDoctorFilters()">Statut</div>
              <div *ngIf="!defaultUserType">Type</div>
              <div>Inscrit le</div>
              <div class="text-right">Action</div>
            </div>

            <!-- Rows -->
            <div *ngFor="let u of users()"
                 class="grid items-center gap-4 px-5 py-3.5 border-b border-stone-50 last:border-0 hover:bg-stone-50/60 transition-colors"
                 [ngClass]="{ 'opacity-60': !u.isActive }"
                 [style.grid-template-columns]="gridCols()">

              <!-- Avatar + name -->
              <div class="min-w-0 flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                  <img *ngIf="u.profilePicture" [src]="u.profilePicture" alt="" class="w-full h-full object-cover"/>
                  <span *ngIf="!u.profilePicture" class="text-xs font-bold text-stone-600">{{ initials(u) }}</span>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-stone-900 truncate">
                    {{ u.userType === 'DOCTOR' ? 'Dr. ' : '' }}{{ u.firstName }} {{ u.lastName }}
                  </p>
                  <p class="text-xs truncate" [class.text-emerald-600]="u.isActive" [class.text-stone-400]="!u.isActive">
                    {{ u.isActive ? 'Actif' : 'Inactif' }}
                    <span *ngIf="u.twoFactorEnabled" class="ml-1 text-sky-500">· 2FA</span>
                  </p>
                </div>
              </div>

              <!-- Email -->
              <div class="text-sm text-stone-600 truncate">{{ u.email }}</div>

              <!-- Specialty (doctors) -->
              <div *ngIf="showDoctorFilters()" class="text-sm text-stone-600 truncate">
                {{ specLabel(u.specialization) }}
              </div>

              <!-- Verification status (doctors) -->
              <div *ngIf="showDoctorFilters()">
                <app-doctor-status-badge [status]="u.verificationStatus" />
              </div>

              <!-- User type badge (mixed list) -->
              <div *ngIf="!defaultUserType">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      [class.bg-sky-50]="u.userType === 'DOCTOR'"
                      [class.text-sky-700]="u.userType === 'DOCTOR'"
                      [class.bg-violet-50]="u.userType === 'PATIENT'"
                      [class.text-violet-700]="u.userType === 'PATIENT'"
                      [class.bg-amber-50]="u.userType === 'ADMINISTRATOR'"
                      [class.text-amber-700]="u.userType === 'ADMINISTRATOR'">
                  {{ typeLabel(u.userType) }}
                </span>
              </div>

              <!-- Signed up date -->
              <div class="text-sm text-stone-500">{{ u.createdAt | date:'dd/MM/yyyy' }}</div>

              <!-- View link -->
              <div class="flex justify-end">
                <a [routerLink]="profileLink(u)"
                   class="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700 transition-colors">
                  Voir
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div *ngIf="page() && page()!.totalPages > 1"
           class="flex items-center justify-between gap-4 py-1">
        <div class="flex items-center gap-2">
          <span class="text-sm text-stone-500">Lignes par page :</span>
          <select [formControl]="pageSizeCtrl"
                  class="rounded-lg border border-stone-200 text-sm px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400">
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <div class="flex items-center gap-1">
          <button (click)="setPage(0)" [disabled]="currentPage() === 0"
                  class="px-2 py-1.5 rounded-lg text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed">
            «
          </button>
          <button (click)="setPage(currentPage() - 1)" [disabled]="currentPage() === 0"
                  class="px-2 py-1.5 rounded-lg text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed">
            ‹
          </button>

          <ng-container *ngFor="let p of pageRange()">
            <button (click)="setPage(p)"
                    class="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                    [class.bg-sky-500]="p === currentPage()"
                    [class.text-white]="p === currentPage()"
                    [class.hover:bg-stone-100]="p !== currentPage()"
                    [class.text-stone-700]="p !== currentPage()">
              {{ p + 1 }}
            </button>
          </ng-container>

          <button (click)="setPage(currentPage() + 1)" [disabled]="currentPage() >= (page()?.totalPages ?? 1) - 1"
                  class="px-2 py-1.5 rounded-lg text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed">
            ›
          </button>
          <button (click)="setPage((page()?.totalPages ?? 1) - 1)" [disabled]="currentPage() >= (page()?.totalPages ?? 1) - 1"
                  class="px-2 py-1.5 rounded-lg text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed">
            »
          </button>
        </div>

        <span class="text-sm text-stone-500">
          Page {{ currentPage() + 1 }} / {{ page()?.totalPages ?? 1 }}
        </span>
      </div>

    </div>
  `,
})
export class UserSearchComponent implements OnInit, OnDestroy {

  @Input() defaultUserType?: string;

  private adminService = inject(AdminService);
  private toast        = inject(ToastService);
  private router       = inject(Router);
  private destroy$     = new Subject<void>();

  // ── Signals ────────────────────────────────────────────────────────────────
  loading             = signal(false);
  users               = signal<AdminUserResult[]>([]);
  page                = signal<AdminSearchPage | null>(null);
  currentPage         = signal(0);
  advancedOpen        = signal(false);
  selectedBloodTypes  = signal<string[]>([]);
  activeChips         = signal<ActiveChip[]>([]);

  // ── Form controls ──────────────────────────────────────────────────────────
  searchCtrl   = new FormControl('');
  typeCtrl     = new FormControl('');
  specCtrl     = new FormControl('');
  statusCtrl   = new FormControl('');
  ageMinCtrl   = new FormControl<number | null>(null);
  ageMaxCtrl   = new FormControl<number | null>(null);
  sinceCtrl    = new FormControl('');
  untilCtrl    = new FormControl('');
  activeCtrl   = new FormControl('');
  twoFaCtrl    = new FormControl('');
  pageSizeCtrl = new FormControl('20');

  // ── Constants ──────────────────────────────────────────────────────────────
  readonly bloodTypes = BLOOD_TYPES;
  readonly specialties = Object.entries(SPEC_LABELS).map(([value, label]) => ({ value, label }));

  // ── Derived helpers ────────────────────────────────────────────────────────
  showDoctorFilters = () => (this.defaultUserType ?? this.typeCtrl.value) === 'DOCTOR';
  showPatientFilters = () => (this.defaultUserType ?? this.typeCtrl.value) === 'PATIENT';

  gridCols(): string {
    if (this.showDoctorFilters())  return '1.5fr 1.2fr 10rem 9rem 8rem 5rem';
    if (this.showPatientFilters()) return '1.5fr 1.2fr 8rem 8rem 5rem';
    return '1.5fr 1.2fr 7rem 8rem 5rem';
  }

  advancedActiveCount(): number {
    let n = 0;
    if (this.ageMinCtrl.value != null)         n++;
    if (this.ageMaxCtrl.value != null)         n++;
    if (this.selectedBloodTypes().length > 0)  n++;
    if (this.sinceCtrl.value)                  n++;
    if (this.untilCtrl.value)                  n++;
    if (this.activeCtrl.value)                 n++;
    if (this.twoFaCtrl.value)                  n++;
    return n;
  }

  pageRange(): number[] {
    const total  = this.page()?.totalPages ?? 1;
    const cur    = this.currentPage();
    const start  = Math.max(0, cur - 2);
    const end    = Math.min(total - 1, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    if (this.defaultUserType) {
      this.typeCtrl.setValue(this.defaultUserType, { emitEvent: false });
    }

    // Debounced search
    this.searchCtrl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => this.resetAndSearch());

    // Instant-response dropdowns
    [this.typeCtrl, this.specCtrl, this.statusCtrl, this.ageMinCtrl, this.ageMaxCtrl,
     this.sinceCtrl, this.untilCtrl, this.activeCtrl, this.twoFaCtrl].forEach(ctrl =>
      ctrl.valueChanges.pipe(debounceTime(200), takeUntil(this.destroy$))
                        .subscribe(() => this.resetAndSearch())
    );

    // Page size change → reset to page 0
    this.pageSizeCtrl.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.resetAndSearch());

    this.search();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  private resetAndSearch(): void {
    this.currentPage.set(0);
    this.search();
  }

  search(): void {
    const criteria = this.buildCriteria();
    this.loading.set(true);
    this.adminService.searchUsers(criteria).subscribe({
      next: res => {
        this.users.set(res.content);
        this.page.set(res);
        this.updateChips(criteria);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Impossible de charger les utilisateurs.');
        this.loading.set(false);
      },
    });
  }

  private buildCriteria(): AdminSearchCriteria {
    const c: AdminSearchCriteria = {
      page: this.currentPage(),
      size: Number(this.pageSizeCtrl.value ?? 20),
    };

    const q = this.searchCtrl.value?.trim();
    if (q && q.length >= 2) c.q = q;

    const type = this.defaultUserType || this.typeCtrl.value || undefined;
    if (type) c.userType = type;

    if (this.specCtrl.value)   c.specialty = this.specCtrl.value;
    if (this.statusCtrl.value) c.status    = this.statusCtrl.value;

    const ageMin = this.ageMinCtrl.value;
    const ageMax = this.ageMaxCtrl.value;
    if (ageMin != null && ageMin >= 0) c.ageMin = ageMin;
    if (ageMax != null && ageMax >= 0) c.ageMax = ageMax;

    if (this.sinceCtrl.value) c.signedUpSince = this.sinceCtrl.value;
    if (this.untilCtrl.value) c.signedUpUntil = this.untilCtrl.value;

    if (this.activeCtrl.value !== '') c.isActive     = this.activeCtrl.value === 'true';
    if (this.twoFaCtrl.value !== '')  c.is2FAEnabled = this.twoFaCtrl.value  === 'true';

    if (this.selectedBloodTypes().length > 0) {
      c.bloodType = this.selectedBloodTypes().join(',');
    }

    return c;
  }

  setPage(p: number): void {
    this.currentPage.set(p);
    this.search();
  }

  // ── Blood type multi-select ─────────────────────────────────────────────────
  toggleBloodType(bt: string): void {
    const current = this.selectedBloodTypes();
    const next = current.includes(bt) ? current.filter(x => x !== bt) : [...current, bt];
    this.selectedBloodTypes.set(next);
    this.resetAndSearch();
  }

  // ── Active chips ───────────────────────────────────────────────────────────
  private updateChips(c: AdminSearchCriteria): void {
    const chips: ActiveChip[] = [];

    if (c.q)         chips.push({ key: 'q',         label: `"${c.q}"`,                          value: c.q });
    if (c.userType && !this.defaultUserType)
                     chips.push({ key: 'userType',   label: this.typeLabel(c.userType),           value: c.userType });
    if (c.specialty) chips.push({ key: 'specialty',  label: SPEC_LABELS[c.specialty] ?? c.specialty, value: c.specialty });
    if (c.status)    chips.push({ key: 'status',     label: STATUS_LABELS[c.status] ?? c.status,  value: c.status });
    if (c.ageMin != null) chips.push({ key: 'ageMin', label: `Âge ≥ ${c.ageMin}`,               value: String(c.ageMin) });
    if (c.ageMax != null) chips.push({ key: 'ageMax', label: `Âge ≤ ${c.ageMax}`,               value: String(c.ageMax) });
    if (c.signedUpSince) chips.push({ key: 'signedUpSince', label: `Depuis ${c.signedUpSince}`,  value: c.signedUpSince });
    if (c.signedUpUntil) chips.push({ key: 'signedUpUntil', label: `Jusqu'au ${c.signedUpUntil}`, value: c.signedUpUntil });
    if (c.isActive != null)     chips.push({ key: 'isActive',     label: c.isActive ? 'Actif' : 'Inactif',         value: '' });
    if (c.is2FAEnabled != null) chips.push({ key: 'is2FAEnabled', label: c.is2FAEnabled ? '2FA activée' : '2FA désactivée', value: '' });
    if (c.bloodType) chips.push({ key: 'bloodType', label: `Groupe: ${c.bloodType.replace(/,/g, ', ')}`, value: c.bloodType });

    this.activeChips.set(chips);
  }

  removeChip(chip: ActiveChip): void {
    switch (chip.key) {
      case 'q':             this.searchCtrl.setValue('');    break;
      case 'userType':      this.typeCtrl.setValue('');      break;
      case 'specialty':     this.specCtrl.setValue('');      break;
      case 'status':        this.statusCtrl.setValue('');    break;
      case 'ageMin':        this.ageMinCtrl.setValue(null);  break;
      case 'ageMax':        this.ageMaxCtrl.setValue(null);  break;
      case 'signedUpSince': this.sinceCtrl.setValue('');     break;
      case 'signedUpUntil': this.untilCtrl.setValue('');     break;
      case 'isActive':      this.activeCtrl.setValue('');    break;
      case 'is2FAEnabled':  this.twoFaCtrl.setValue('');     break;
      case 'bloodType':     this.selectedBloodTypes.set([]); break;
    }
    this.resetAndSearch();
  }

  resetAdvanced(): void {
    this.ageMinCtrl.setValue(null,  { emitEvent: false });
    this.ageMaxCtrl.setValue(null,  { emitEvent: false });
    this.sinceCtrl.setValue('',     { emitEvent: false });
    this.untilCtrl.setValue('',     { emitEvent: false });
    this.activeCtrl.setValue('',    { emitEvent: false });
    this.twoFaCtrl.setValue('',     { emitEvent: false });
    this.selectedBloodTypes.set([]);
    this.resetAndSearch();
  }

  resetAll(): void {
    this.searchCtrl.setValue('',  { emitEvent: false });
    if (!this.defaultUserType) this.typeCtrl.setValue('', { emitEvent: false });
    this.specCtrl.setValue('',   { emitEvent: false });
    this.statusCtrl.setValue('', { emitEvent: false });
    this.resetAdvanced();
  }

  // ── Display helpers ────────────────────────────────────────────────────────
  initials(u: AdminUserResult): string {
    return ((u.firstName || '').slice(0, 1) + (u.lastName || '').slice(0, 1)).toUpperCase() || '?';
  }

  specLabel(v?: string): string {
    if (!v) return '—';
    return SPEC_LABELS[v.toUpperCase()] ?? v;
  }

  typeLabel(v?: string): string {
    const map: Record<string, string> = { DOCTOR: 'Médecin', PATIENT: 'Patient', ADMINISTRATOR: 'Admin' };
    return map[v ?? ''] ?? (v ?? '');
  }

  profileLink(u: AdminUserResult): string[] {
    if (u.userType === 'DOCTOR') return ['/admin/doctors', String(u.id)];
    return ['/admin/users', String(u.id)];
  }
}
