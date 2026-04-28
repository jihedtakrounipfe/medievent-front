import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EMPTY, finalize, of, switchMap } from 'rxjs';
import { AdminAuditPanelComponent } from '../../../app/components/admin/admin-audit-panel.component';
import {
  AdminService,
  AuditLogEntry,
  UserAuditSummary,
} from '../../../core/services/admin.service';
import { UserService } from '../../../core/services/user.service';
import { AppUser, AnyUser, UserType } from '../../../core/user';
import { ToastService } from '../../auth/toast/toast.service';

@Component({
  selector: 'app-admin-user-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminAuditPanelComponent],
  template: `
    <div class="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
      <div class="flex items-center justify-between gap-4 mb-5">
        <div>
          <a [routerLink]="backRoute()" class="text-sm text-teal-700 hover:text-teal-800 font-semibold">
            {{ backLabel() }}
          </a>
          <h1 class="text-2xl font-bold text-stone-900 mt-1">{{ pageTitle() }}</h1>
        </div>

        <div class="flex items-center gap-2" *ngIf="user() as u">
          <button
            *ngIf="(u.userType === 'PATIENT' || u.userType === 'DOCTOR') && u.isActive"
            (click)="toggle(false)"
            class="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm font-semibold">
            Bloquer
          </button>
          <button
            *ngIf="(u.userType === 'PATIENT' || u.userType === 'DOCTOR') && !u.isActive"
            (click)="toggle(true)"
            class="px-3 py-2 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 text-sm font-semibold">
            Debloquer
          </button>
        </div>
      </div>

      <div *ngIf="loading()" class="space-y-4">
        <div *ngFor="let _ of [1,2,3]" class="h-32 rounded-3xl bg-stone-100 animate-pulse"></div>
      </div>

      <ng-container *ngIf="user() as u">
        <div class="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden mb-5">
          <div class="p-6 border-b border-stone-100 flex flex-col md:flex-row md:items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center overflow-hidden">
              <ng-container *ngIf="u.profilePicture; else initialsTpl">
                <img [src]="u.profilePicture" class="w-full h-full object-cover" alt="Photo du profil" />
              </ng-container>
              <ng-template #initialsTpl>
                <span class="text-white text-xl font-bold">{{ initials(u) }}</span>
              </ng-template>
            </div>

            <div class="min-w-0 flex-1">
              <p class="text-2xl font-bold text-stone-900 truncate">{{ displayName(u) }}</p>
              <p class="text-sm text-stone-500 truncate mt-1">{{ u.email }}</p>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700">
                  {{ typeLabel(u.userType) }}
                </span>
                <span
                  class="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  [ngClass]="u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-200 text-stone-700'">
                  {{ u.isActive ? 'Actif' : 'Inactif' }}
                </span>
                <span
                  class="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  [ngClass]="u.twoFactorEnabled ? 'bg-sky-50 text-sky-700' : 'bg-stone-100 text-stone-500'">
                  {{ u.twoFactorEnabled ? '2FA activee' : '2FA inactive' }}
                </span>
              </div>
            </div>
          </div>

          <div class="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div class="rounded-2xl border border-stone-200 p-4">
              <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Informations</p>
              <div class="mt-3 space-y-2 text-sm">
                <div class="flex justify-between gap-4"><span class="text-stone-500">Telephone</span><span class="text-stone-800">{{ u.phone || '—' }}</span></div>
                <div class="flex justify-between gap-4"><span class="text-stone-500">Adresse</span><span class="text-stone-800 text-right">{{ address() }}</span></div>
                <div class="flex justify-between gap-4"><span class="text-stone-500">Date de naissance</span><span class="text-stone-800">{{ birthDate() }}</span></div>
                <div class="flex justify-between gap-4"><span class="text-stone-500">Genre</span><span class="text-stone-800">{{ genderLabel() }}</span></div>
              </div>
            </div>

            <div class="rounded-2xl border border-stone-200 p-4" *ngIf="u.userType === 'PATIENT'">
              <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Patient</p>
              <div class="mt-3 space-y-2 text-sm">
                <div class="flex justify-between gap-4"><span class="text-stone-500">Groupe sanguin</span><span class="text-stone-800">{{ patientBloodType() }}</span></div>
                <div class="flex justify-between gap-4"><span class="text-stone-500">Biometrie</span><span class="text-stone-800">{{ biometricStatus() }}</span></div>
                <div class="flex justify-between gap-4"><span class="text-stone-500">Contact d'urgence</span><span class="text-stone-800 text-right">{{ patientEmergencyContact() }}</span></div>
              </div>
            </div>

            <div class="rounded-2xl border border-stone-200 p-4">
              <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Compte</p>
              <div class="mt-3 space-y-2 text-sm">
                <div class="flex justify-between gap-4"><span class="text-stone-500">Inscrit le</span><span class="text-stone-800">{{ u.createdAt | date:'dd/MM/yyyy HH:mm' }}</span></div>
                <div class="flex justify-between gap-4"><span class="text-stone-500">Derniere modification</span><span class="text-stone-800">{{ u.updatedAt ? (u.updatedAt | date:'dd/MM/yyyy HH:mm') : '—' }}</span></div>
                <div class="flex justify-between gap-4"><span class="text-stone-500">Type</span><span class="text-stone-800">{{ typeLabel(u.userType) }}</span></div>
              </div>
            </div>
          </div>
        </div>

        <app-admin-audit-panel
          [summary]="auditSummary()"
          [summaryLoading]="auditSummaryLoading()"
          [logs]="auditLogs()"
          [logsLoading]="auditLogsLoading()"
          [currentPage]="auditPage()"
          [totalPages]="auditTotalPages()"
          [totalElements]="auditTotalElements()"
          (pageChange)="loadAuditPage($event)">
        </app-admin-audit-panel>
      </ng-container>
    </div>
  `,
})
export class AdminUserDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  loading = signal(true);
  auditSummaryLoading = signal(false);
  auditLogsLoading = signal(false);

  user = signal<AppUser | null>(null);
  full = signal<AnyUser | null>(null);
  auditSummary = signal<UserAuditSummary | null>(null);
  auditLogs = signal<AuditLogEntry[]>([]);
  auditPage = signal(0);
  auditTotalPages = signal(0);
  auditTotalElements = signal(0);

  constructor() {
    const id = this.userId();
    if (!id) {
      void this.router.navigate(['/admin/patients']);
      return;
    }
    this.load(id);
  }

  private userId(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  load(id: number): void {
    this.loading.set(true);
    this.userService.getUserById(id).pipe(
      switchMap(u => {
        if (u.userType === 'DOCTOR') {
          void this.router.navigate(['/admin/doctors', id]);
          return EMPTY;
        }

        this.user.set(u);
        this.loadAuditSummary();
        this.loadAuditPage(0);

        if (u.userType === 'PATIENT') return this.userService.getPatientById(id);
        return of(u as unknown as AnyUser);
      }),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: profile => this.full.set(profile as AnyUser),
      error: () => {
        this.toast.error('Impossible de charger le profil.');
        void this.router.navigate(['/admin/patients']);
      },
    });
  }

  loadAuditSummary(): void {
    const id = this.userId();
    if (!id) return;
    this.auditSummaryLoading.set(true);
    this.adminService.getUserAuditSummary(id).pipe(
      finalize(() => this.auditSummaryLoading.set(false)),
    ).subscribe({
      next: summary => this.auditSummary.set(summary),
      error: () => this.auditSummary.set(null),
    });
  }

  loadAuditPage(page: number): void {
    const id = this.userId();
    if (!id) return;
    this.auditLogsLoading.set(true);
    this.adminService.getUserAuditLogs(id, page, 10).pipe(
      finalize(() => this.auditLogsLoading.set(false)),
    ).subscribe({
      next: response => {
        this.auditLogs.set(response.content);
        this.auditPage.set(response.number);
        this.auditTotalPages.set(response.totalPages);
        this.auditTotalElements.set(response.totalElements);
      },
      error: () => {
        this.auditLogs.set([]);
        this.auditPage.set(0);
        this.auditTotalPages.set(0);
        this.auditTotalElements.set(0);
      },
    });
  }

  toggle(active: boolean): void {
    const u = this.user();
    if (!u) return;

    const request$ =
      u.userType === 'PATIENT'
        ? (active ? this.userService.activatePatient(u.id) : this.userService.deactivatePatient(u.id))
        : u.userType === 'DOCTOR'
          ? (active ? this.userService.activateDoctor(u.id) : this.userService.deactivateDoctor(u.id))
          : null;

    if (!request$) return;

    request$.subscribe({
      next: () => {
        this.user.update(current => current ? { ...current, isActive: active } : current);
        this.toast.success(active ? 'Compte debloque.' : 'Compte bloque.');
        this.loadAuditSummary();
        this.loadAuditPage(this.auditPage());
      },
      error: () => this.toast.error('Action impossible.'),
    });
  }

  pageTitle(): string {
    const user = this.user();
    if (user?.userType === 'PATIENT') return 'Profil patient';
    return 'Profil utilisateur';
  }

  backRoute(): string {
    const user = this.user();
    if (user?.userType === 'PATIENT') return '/admin/patients';
    return '/admin/dashboard';
  }

  backLabel(): string {
    const user = this.user();
    if (user?.userType === 'PATIENT') return '← Retour a la liste des patients';
    return '← Retour au tableau de bord';
  }

  displayName(u: AppUser): string {
    const name = `${(u.firstName ?? '').trim()} ${(u.lastName ?? '').trim()}`.trim();
    return name || u.email || 'Utilisateur';
  }

  initials(u: AppUser): string {
    const first = (u.firstName ?? '').trim();
    const last = (u.lastName ?? '').trim();
    const pair = `${first ? first[0] : ''}${last ? last[0] : ''}`.toUpperCase();
    if (pair) return pair;
    return ((u.email ?? 'U').trim()[0] || 'U').toUpperCase();
  }

  typeLabel(type: UserType): string {
    switch (type) {
      case 'PATIENT': return 'Patient';
      case 'DOCTOR': return 'Medecin';
      case 'ADMINISTRATOR': return 'Admin';
      case 'INSTITUTION': return 'Institution';
      default: return 'Utilisateur';
    }
  }

  address(): string {
    const profile = this.full() as any;
    return profile?.address || '—';
  }

  birthDate(): string {
    const profile = this.full() as any;
    return profile?.dateOfBirth || '—';
  }

  genderLabel(): string {
    const profile = this.full() as any;
    if (profile?.gender === 'MALE') return 'Homme';
    if (profile?.gender === 'FEMALE') return 'Femme';
    return '—';
  }

  patientBloodType(): string {
    const profile = this.full() as any;
    return profile?.bloodType || '—';
  }

  biometricStatus(): string {
    const profile = this.full() as any;
    return profile?.biometricEnrolled ? 'Activee' : 'Inactive';
  }

  patientEmergencyContact(): string {
    const profile = this.full() as any;
    const name = (profile?.emergencyContactName || '').trim();
    const phone = (profile?.emergencyContactPhone || '').trim();
    const value = [name, phone].filter(Boolean).join(' • ');
    return value || '—';
  }
}
