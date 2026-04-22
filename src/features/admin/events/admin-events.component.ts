import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService, MedicalEvent } from '../../../core/services/event.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-stone-900">Modération des événements</h2>
          <p class="text-stone-500 text-sm">Validez ou refusez les propositions d'événements médicaux</p>
        </div>
        <div class="flex gap-2">
          <button (click)="loadEvents()" class="p-2 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-all shadow-sm">
            <svg class="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <p class="text-[10px] font-bold text-stone-400 uppercase tracking-widest">En attente</p>
          <p class="text-2xl font-bold text-amber-600">{{ pendingCount() }}</p>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <p class="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Approuvés</p>
          <p class="text-2xl font-bold text-teal-600">{{ approvedCount() }}</p>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <p class="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Total</p>
          <p class="text-2xl font-bold text-stone-900">{{ events().length }}</p>
        </div>
      </div>

      <!-- Main Table -->
      <div class="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-stone-50 border-b border-stone-200">
                <th class="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Événement</th>
                <th class="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Organisateur</th>
                <th class="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Audience</th>
                <th class="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Status</th>
                <th class="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100">
              <tr *ngFor="let ev of events()" class="hover:bg-stone-50/50 transition-colors group">
                <td class="px-6 py-4">
                  <p class="font-bold text-stone-900 text-sm">{{ ev.title }}</p>
                  <p class="text-xs text-stone-500 mt-0.5">{{ ev.eventDate | date:'medium' }} • {{ ev.location }}</p>
                </td>
                <td class="px-6 py-4 text-sm text-stone-600">{{ ev.organizerName }}</td>
                <td class="px-6 py-4">
                  <span [class]="ev.targetAudience === 'DOCTORS_ONLY' ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'" 
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {{ ev.targetAudience === 'DOCTORS_ONLY' ? 'Médecins' : 'Tout Public' }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span [class]="statusClass(ev.status!)" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {{ ev.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex justify-end gap-2" *ngIf="ev.status === 'PENDING'">
                    <button (click)="approve(ev.id!)" 
                            class="px-3 py-1.5 bg-teal-600 text-white text-[10px] font-bold rounded-lg hover:bg-teal-700 transition-all shadow-md shadow-teal-100">
                      APPROUVER
                    </button>
                    <button (click)="openReject(ev)" 
                            class="px-3 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-lg hover:bg-rose-100 transition-all">
                      REFUSER
                    </button>
                  </div>
                  <button *ngIf="ev.status !== 'PENDING'" (click)="delete(ev.id!)" class="p-2 text-stone-400 hover:text-rose-500 transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <!-- Empty State -->
          <div *ngIf="events().length === 0" class="py-20 text-center">
            <div class="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-stone-400">
              🗓️
            </div>
            <p class="text-stone-500 text-sm font-medium">Aucun événement trouvé</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Rejection Modal -->
    <div *ngIf="modalEvent()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm shadow-2xl">
      <div class="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl fade-in border border-stone-200">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              ⚠️
            </div>
            <h3 class="text-lg font-bold text-stone-900">Motif du refus</h3>
          </div>
          <p class="text-xs text-stone-500 mb-4">L'organisateur sera informé de la raison du refus.</p>
          <textarea [(ngModel)]="rejectionReason" 
                    placeholder="Expliquez pourquoi l'événement a été refusé..."
                    class="w-full h-32 p-4 bg-stone-50 border-stone-200 border rounded-2xl text-sm focus:ring-4 focus:ring-rose-50 focus:border-rose-300 transition-all outline-none resize-none"></textarea>
          
          <div class="flex gap-3 mt-6">
            <button (click)="modalEvent.set(null)" class="flex-1 py-3 text-sm font-bold text-stone-500 hover:bg-stone-50 rounded-2xl transition-all">ANNULER</button>
            <button (click)="confirmReject()" 
                    [disabled]="!rejectionReason"
                    class="flex-1 py-3 text-sm font-bold bg-rose-600 text-white rounded-2xl hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all disabled:opacity-50">
              REFUSER L'ÉVÉNEMENT
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class AdminEventsComponent implements OnInit {
  private eventService = inject(EventService);

  events = signal<MedicalEvent[]>([]);
  modalEvent = signal<MedicalEvent | null>(null);
  rejectionReason = '';

  pendingCount = signal(0);
  approvedCount = signal(0);

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.eventService.getAllEventsForAdmin().subscribe(res => {
      this.events.set(res);
      this.pendingCount.set(res.filter(e => e.status === 'PENDING').length);
      this.approvedCount.set(res.filter(e => e.status === 'APPROVED').length);
    });
  }

  approve(id: number) {
    this.eventService.approveEvent(id).subscribe(() => this.loadEvents());
  }

  openReject(ev: MedicalEvent) {
    this.modalEvent.set(ev);
    this.rejectionReason = '';
  }

  confirmReject() {
    const ev = this.modalEvent();
    if (!ev) return;
    this.eventService.rejectEvent(ev.id!, this.rejectionReason).subscribe(() => {
      this.modalEvent.set(null);
      this.loadEvents();
    });
  }

  delete(id: number) {
    if (confirm('Supprimer cet événement ?')) {
      this.eventService.deleteEventForAdmin(id).subscribe(() => this.loadEvents());
    }
  }

  statusClass(status: string): string {
    const m: any = {
      'PENDING': 'bg-amber-100 text-amber-700',
      'APPROVED': 'bg-teal-100 text-teal-700',
      'REJECTED': 'bg-rose-100 text-rose-700'
    };
    return m[status] || 'bg-stone-100 text-stone-700';
  }
}
