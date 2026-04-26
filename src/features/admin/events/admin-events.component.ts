import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService, MedicalEvent } from '../../../core/services/event.service';


@Component({
  selector: 'app-admin-events',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex items-end justify-between border-b border-stone-100 pb-8">
        <div>
          <h2 class="text-3xl font-black text-stone-900 tracking-tight">Gouvernance des Événements</h2>
          <p class="text-stone-400 text-sm mt-1 font-medium italic">Supervision et modération de l'activité du catalogue</p>
        </div>
        <button (click)="loadEvents()" class="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white text-[10px] font-bold rounded-xl hover:bg-stone-800 transition-all shadow-xl shadow-stone-200">
          ACTUALISER
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      <!-- Overview Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-teal-600 p-6 rounded-[2rem] shadow-xl shadow-teal-900/10">
          <p class="text-[9px] font-bold text-teal-100 uppercase tracking-widest opacity-80">Catalogue Actif</p>
          <p class="text-3xl font-black text-white mt-1">{{ events().length }}</p>
        </div>
        <div class="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm">
          <p class="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Responsables Engagés</p>
          <p class="text-3xl font-black text-stone-900 mt-1">{{ uniqueOrganizersCount() }}</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-4 border-b border-stone-200">
        <button (click)="currentTab.set('ACTIVE')" [class.border-stone-900]="currentTab() === 'ACTIVE'" [class.text-stone-900]="currentTab() === 'ACTIVE'" class="pb-4 px-2 border-b-2 font-bold text-sm transition-colors border-transparent text-stone-400 hover:text-stone-600">
          Calendrier Principal ({{ activeEvents().length }})
        </button>
        <button (click)="currentTab.set('ARCHIVE')" [class.border-stone-900]="currentTab() === 'ARCHIVE'" [class.text-stone-900]="currentTab() === 'ARCHIVE'" class="pb-4 px-2 border-b-2 font-bold text-sm transition-colors border-transparent text-stone-400 hover:text-stone-600">
          Archives Terminées ({{ archivedEvents().length }})
        </button>
      </div>

      <!-- Main Activity Table -->
      <div class="bg-white rounded-[2.5rem] border border-stone-100 shadow-sm overflow-hidden animate-fade-in">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-stone-50/50 border-b border-stone-100">
                <th class="px-8 py-5 text-[9px] font-bold text-stone-400 uppercase tracking-[0.2em]">Détails Événement</th>
                <th class="px-8 py-5 text-[9px] font-bold text-stone-400 uppercase tracking-[0.2em]">Date & Heure</th>
                <th class="px-8 py-5 text-[9px] font-bold text-stone-400 uppercase tracking-[0.2em]">Responsable</th>
                <th class="px-8 py-5 text-[9px] font-bold text-stone-400 uppercase tracking-[0.2em]">Confidentialité</th>
                <th class="px-8 py-5 text-[9px] font-bold text-stone-400 uppercase tracking-[0.2em]">Statut Temporel</th>
                <th class="px-8 py-5 text-[9px] font-bold text-stone-400 uppercase tracking-[0.2em] text-right">Contrôle</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-50">
              <tr *ngFor="let ev of currentEvents()" class="hover:bg-stone-50/30 transition-colors group">
                <td class="px-8 py-6">
                  <div class="flex flex-col">
                    <span class="font-black text-stone-900 text-sm tracking-tight">{{ ev.title }}</span>
                    <span class="text-[10px] font-bold text-stone-400 mt-1 flex items-center gap-1.5">
                       <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                       {{ ev.location }}
                    </span>
                  </div>
                </td>
                <td class="px-8 py-6">
                  <div class="flex flex-col text-xs font-bold text-stone-600 tracking-tight">
                    <span>{{ ev.eventDate | date:'dd MMM yyyy' }}</span>
                    <span class="text-[10px] text-stone-400 font-medium">{{ ev.eventDate | date:'HH:mm' }}</span>
                  </div>
                </td>
                <td class="px-8 py-6">
                   <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-500">
                         {{ ev.organizerName?.charAt(0) }}
                      </div>
                      <span class="text-xs font-bold text-stone-600">{{ ev.organizerName }}</span>
                   </div>
                </td>
                <td class="px-8 py-6">
                  <span [class]="ev.targetAudience === 'DOCTORS_ONLY' ? 'border-indigo-100 text-indigo-600 bg-indigo-50' : 'border-blue-100 text-blue-600 bg-blue-50'" 
                        class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border">
                    {{ ev.targetAudience === 'DOCTORS_ONLY' ? 'RESTEINT' : 'OUVERT' }}
                  </span>
                </td>
                <td class="px-8 py-6">
                  <span [class]="getTimelineStatus(ev).classes" 
                        class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border">
                    {{ getTimelineStatus(ev).label }}
                  </span>
                </td>
                <td class="px-8 py-6 text-right">
                  <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button (click)="delete(ev.id!)" class="p-2.5 bg-stone-50 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Supprimer définitivement">
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          
          <!-- Empty State -->
          <div *ngIf="currentEvents().length === 0" class="py-24 text-center">
            <div class="w-20 h-20 bg-stone-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-stone-300">
               <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <p class="text-stone-400 text-sm font-bold tracking-tight">{{ currentTab() === 'ARCHIVE' ? 'Aucune archive disponible' : 'Catalogue Vierge' }}</p>
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
  uniqueOrganizersCount = computed(() => {
    const names = this.events().map(e => e.organizerName).filter(Boolean);
    return new Set(names).size;
  });

  currentTab = signal<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
  
  activeEvents = computed(() => {
    const now = new Date();
    return this.events().filter(ev => {
      // COMPLETED events stay in main view for only 20 minutes after their start time
      // (or after they are marked completed, but we use eventDate as reference)
      if (ev.status === 'COMPLETED') {
        const eventTime = new Date(ev.eventDate);
        const minutesSinceEvent = (now.getTime() - eventTime.getTime()) / (1000 * 60);
        return minutesSinceEvent < 20;
      }
      return true;
    });
  });

  archivedEvents = computed(() => {
    const now = new Date();
    return this.events().filter(ev => {
      // COMPLETED events move to archive after 20 minutes
      if (ev.status === 'COMPLETED') {
        const eventTime = new Date(ev.eventDate);
        const minutesSinceEvent = (now.getTime() - eventTime.getTime()) / (1000 * 60);
        return minutesSinceEvent >= 20;
      }
      // We also archive old expired events that weren't explicitly marked COMPLETED
      const eventTime = new Date(ev.eventDate);
      const minutesSinceEvent = (now.getTime() - eventTime.getTime()) / (1000 * 60);
      return minutesSinceEvent > 480; // 8 hours
    });
  });
  
  currentEvents = computed(() => this.currentTab() === 'ACTIVE' ? this.activeEvents() : this.archivedEvents());

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.eventService.getAllEventsForAdmin().subscribe(res => {
      this.events.set(res);
    });
  }

  getTimelineStatus(ev: MedicalEvent): { label: string, classes: string } {
    if (ev.status === 'COMPLETED') {
      return { label: 'TERMINÉ', classes: 'border-emerald-100 text-emerald-600 bg-emerald-50' };
    }

    if (!ev.eventDate) {
      return { label: 'PROGRAMMÉ', classes: 'border-blue-100 text-blue-600 bg-blue-50' };
    }

    const now = new Date();
    const eventTime = new Date(ev.eventDate);
    const diff = (eventTime.getTime() - now.getTime()) / (1000 * 60);

    if (diff > 15) {
      return { label: 'À VENIR', classes: 'border-indigo-100 text-indigo-600 bg-indigo-50' };
    } else if (diff <= 15 && diff >= -480) {
      return { label: 'EN COURS / LIVE', classes: 'border-red-200 text-red-600 bg-red-50' };
    } else {
      return { label: 'EXPIRÉ', classes: 'border-stone-200 text-stone-500 bg-stone-50' };
    }
  }

  delete(id: number) {
    if (confirm('Supprimer définitivement cet événement ?')) {
      this.eventService.deleteEventForAdmin(id).subscribe(() => this.loadEvents());
    }
  }
}
