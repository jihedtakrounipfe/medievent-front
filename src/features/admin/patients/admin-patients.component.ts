import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { Patient } from '../../../core/user';
import { ToastService } from '../../auth/toast/toast.service';

@Component({
  selector: 'app-admin-patients',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h1 class="text-2xl font-bold text-stone-900">Patients</h1>
          <p class="text-sm text-stone-500 mt-0.5">Liste des patients</p>
        </div>
        <button (click)="load()" class="px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-sm font-semibold text-stone-800">
          Rafraîchir
        </button>
      </div>

      <div class="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <div class="min-w-[760px]">
            <div class="grid px-5 py-3 text-xs font-semibold text-stone-500 border-b border-stone-100"
                 style="grid-template-columns: 2.5rem 1fr 1fr 7rem 10rem">
              <div>#</div>
              <div>Patient</div>
              <div>Email</div>
              <div class="text-center">État</div>
              <div class="text-right">Actions</div>
            </div>

            <div *ngIf="loading()" class="px-5 py-6 text-sm text-stone-500">Chargement...</div>

            <div *ngFor="let p of patients(); let i = index"
                 class="grid items-center gap-4 px-5 py-3.5 border-b border-stone-50 last:border-0"
                 [ngClass]="{ 'bg-stone-50/70': !p.isActive }"
                 style="grid-template-columns: 2.5rem 1fr 1fr 7rem 10rem">
              <div class="text-sm text-stone-400">{{ i + 1 }}</div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-stone-900 truncate">{{ (p.firstName || '') + ' ' + (p.lastName || '') }}</p>
                <p class="text-xs text-stone-500 truncate">{{ p.phone || '—' }}</p>
              </div>
              <div class="text-sm text-stone-700 truncate">{{ p.email }}</div>
              <div class="flex justify-center">
                <span class="px-2 py-1 rounded-full text-[11px] font-semibold"
                      [ngClass]="p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-200 text-stone-700'">
                  {{ p.isActive ? 'Actif' : 'Inactif' }}
                </span>
              </div>
              <div class="flex items-center justify-end gap-2">
                <button (click)="view(p)" class="px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-800">
                  Voir
                </button>
                <button *ngIf="p.isActive" (click)="toggle(p, false)"
                        class="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold">
                  Bloquer
                </button>
                <button *ngIf="!p.isActive" (click)="toggle(p, true)"
                        class="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-semibold">
                  Débloquer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminPatientsComponent {
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private router = inject(Router);

  loading = signal(false);
  patients = signal<Patient[]>([]);
  page = signal(0);
  size = signal(20);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.userService.getAllPatients(this.page(), this.size()).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: res => this.patients.set(res.content),
      error: () => this.toast.error('Impossible de charger les patients.'),
    });
  }

  view(p: Patient): void {
    this.router.navigate(['/admin/users', p.id]);
  }

  toggle(p: Patient, active: boolean): void {
    const req$ = active ? this.userService.activatePatient(p.id) : this.userService.deactivatePatient(p.id);
    req$.subscribe({
      next: () => {
        this.toast.success(active ? 'Patient débloqué.' : 'Patient bloqué.');
        this.patients.update(list => list.map(x => x.id === p.id ? { ...x, isActive: active } : x));
      },
      error: () => this.toast.error('Action impossible.'),
    });
  }
}
