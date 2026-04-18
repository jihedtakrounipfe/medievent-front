import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { VerificationStatus } from '../../../../core/user';

@Component({
  selector: 'app-doctor-status-badge',
  standalone: true,
  imports: [NgClass],
  template: `
    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" [ngClass]="badgeClass">
      {{ label }}
    </span>
  `,
})
export class DoctorStatusBadgeComponent {
  @Input() status: VerificationStatus | undefined;

  get label(): string {
    if (this.status === 'PENDING')   return 'En attente de vérification';
    if (this.status === 'APPROVED')  return 'Vérifié';
    if (this.status === 'REJECTED')  return 'Refusé';
    if (this.status === 'SUSPENDED') return 'Suspendu';
    return '—';
  }

  get badgeClass(): string {
    if (this.status === 'PENDING')   return 'bg-amber-100 text-amber-800';
    if (this.status === 'APPROVED')  return 'bg-emerald-100 text-emerald-700';
    if (this.status === 'REJECTED')  return 'bg-rose-100 text-rose-700';
    if (this.status === 'SUSPENDED') return 'bg-stone-100 text-stone-700';
    return 'bg-stone-100 text-stone-700';
  }
}
