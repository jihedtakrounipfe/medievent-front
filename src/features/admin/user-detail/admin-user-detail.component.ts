import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize, of, switchMap } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { AppUser, AnyUser, Doctor, Patient, UserType } from '../../../core/user';
import { ToastService } from '../../auth/toast/toast.service';

@Component({
  selector: 'app-admin-user-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
      <div class="flex items-center justify-between mb-5">
        <div>
          <a routerLink="/admin/dashboard" class="text-sm text-teal-700 hover:text-teal-800 font-semibold">← Dashboard</a>
          <h1 class="text-2xl font-bold text-stone-900 mt-1">Profil utilisateur</h1>
        </div>
        <div class="flex items-center gap-2" *ngIf="user() as u">
          <button *ngIf="u.isActive" (click)="toggle(false)"
                  class="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm font-semibold">
            Bloquer
          </button>
          <button *ngIf="!u.isActive" (click)="toggle(true)"
                  class="px-3 py-2 rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 text-sm font-semibold">
            Débloquer
          </button>
        </div>
      </div>

      <div *ngIf="loading()" class="text-sm text-stone-500">Chargement...</div>

      <div *ngIf="user() as u" class="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-stone-100 flex items-center gap-4">
          <div class="w-14 h-14 rounded-full bg-teal-600 flex items-center justify-center overflow-hidden">
            <ng-container *ngIf="u.profilePicture; else initialsTpl">
              <img [src]="u.profilePicture" class="w-14 h-14 object-cover" alt="Profile"/>
            </ng-container>
            <ng-template #initialsTpl>
              <span class="text-white text-lg font-bold">{{ initials(u) }}</span>
            </ng-template>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-lg font-bold text-stone-900 truncate">{{ displayName(u) }}</p>
            <p class="text-sm text-stone-500 truncate">{{ u.email }}</p>
            <div class="mt-2 flex items-center gap-2">
              <span class="px-2 py-1 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700">
                {{ typeLabel(u.userType) }}
              </span>
              <span class="px-2 py-1 rounded-full text-[11px] font-semibold"
                    [ngClass]="u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-200 text-stone-700'">
                {{ u.isActive ? 'Actif' : 'Inactif' }}
              </span>
            </div>
          </div>
        </div>

        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="rounded-2xl border border-stone-200 p-4">
            <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Informations</p>
            <div class="mt-3 space-y-2 text-sm">
              <div class="flex justify-between gap-4"><span class="text-stone-500">Téléphone</span><span class="text-stone-800">{{ u.phone || '—' }}</span></div>
              <div class="flex justify-between gap-4"><span class="text-stone-500">Adresse</span><span class="text-stone-800 text-right">{{ address() }}</span></div>
            </div>
          </div>

          <div class="rounded-2xl border border-stone-200 p-4" *ngIf="u.userType === 'DOCTOR'">
            <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Médecin</p>
            <div class="mt-3 space-y-2 text-sm">
              <div class="flex justify-between gap-4"><span class="text-stone-500">Spécialité</span><span class="text-stone-800">{{ doctorSpecialization(u) }}</span></div>
              <div class="flex justify-between gap-4"><span class="text-stone-500">RPPS</span><span class="text-stone-800">{{ doctorRppsNumber() }}</span></div>
              <div class="flex justify-between gap-4"><span class="text-stone-500">Cabinet</span><span class="text-stone-800 text-right">{{ doctorOfficeAddress() }}</span></div>
            </div>
          </div>

          <div class="rounded-2xl border border-stone-200 p-4" *ngIf="u.userType === 'PATIENT'">
            <p class="text-xs font-semibold text-stone-500 uppercase tracking-wide">Patient</p>
            <div class="mt-3 space-y-2 text-sm">
              <div class="flex justify-between gap-4"><span class="text-stone-500">Groupe sanguin</span><span class="text-stone-800">{{ patientBloodType(u) }}</span></div>
              <div class="flex justify-between gap-4"><span class="text-stone-500">Contact d'urgence</span><span class="text-stone-800 text-right">{{ patientEmergencyContact() }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminUserDetailComponent {
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private toast = inject(ToastService);

  loading = signal(true);
  user = signal<AppUser | null>(null);
  full = signal<AnyUser | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.load(id);
  }

  load(id: number): void {
    this.loading.set(true);
    this.userService.getUserById(id).pipe(
      switchMap(u => {
        this.user.set(u);
        if (u.userType === 'PATIENT') return this.userService.getPatientById(id);
        if (u.userType === 'DOCTOR') return this.userService.getDoctorById(id);
        return of(u as unknown as AnyUser);
      }),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (u: any) => this.full.set(u as AnyUser),
      error: () => this.toast.error('Impossible de charger le profil.'),
    });
  }

  toggle(active: boolean): void {
    const u = this.user();
    if (!u) return;
    const req$ =
      u.userType === 'PATIENT'
        ? (active ? this.userService.activatePatient(u.id) : this.userService.deactivatePatient(u.id))
        : u.userType === 'DOCTOR'
          ? (active ? this.userService.activateDoctor(u.id) : this.userService.deactivateDoctor(u.id))
          : null;

    if (!req$) return;
    req$.subscribe({
      next: () => {
        this.user.update(x => x ? { ...x, isActive: active } : x);
        this.toast.success(active ? 'Compte débloqué.' : 'Compte bloqué.');
      },
      error: () => this.toast.error('Action impossible.'),
    });
  }

  displayName(u: AppUser): string {
    const first = (u.firstName ?? '').trim();
    const last = (u.lastName ?? '').trim();
    const name = `${first} ${last}`.trim();
    return name || u.email || 'Utilisateur';
  }

  initials(u: AppUser): string {
    const first = (u.firstName ?? '').trim();
    const last = (u.lastName ?? '').trim();
    const a = first ? first[0] : '';
    const b = last ? last[0] : '';
    const two = (a + b).toUpperCase();
    if (two) return two;
    const email = (u.email ?? '').trim();
    return (email ? email[0] : 'U').toUpperCase();
  }

  typeLabel(t: UserType): string {
    switch (t) {
      case 'PATIENT': return 'Patient';
      case 'DOCTOR': return 'Médecin';
      case 'ADMINISTRATOR': return 'Admin';
      case 'INSTITUTION': return 'Institution';
      default: return 'Utilisateur';
    }
  }

  address(): string {
    const f = this.full() as any;
    return (f?.address as string) || '—';
  }

  doctorSpecialization(u: AppUser): string {
    const f = this.full() as any;
    return (f?.specialization as string) || u.specialization || '—';
  }

  doctorRppsNumber(): string {
    const f = this.full() as any;
    return (f?.rppsNumber as string) || '—';
  }

  doctorOfficeAddress(): string {
    const f = this.full() as any;
    return (f?.officeAddress as string) || '—';
  }

  patientBloodType(u: AppUser): string {
    const f = this.full() as any;
    return (f?.bloodType as string) || u.bloodType || '—';
  }

  patientEmergencyContact(): string {
    const f = this.full() as any;
    const name = (f?.emergencyContactName as string) || '';
    const phone = (f?.emergencyContactPhone as string) || '';
    const v = [name.trim(), phone.trim()].filter(Boolean).join(' — ');
    return v || '—';
  }
}
