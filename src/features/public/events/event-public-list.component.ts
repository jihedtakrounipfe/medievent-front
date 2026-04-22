import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService, MedicalEvent, ParticipantStatus, MyParticipation } from '../../../core/services/event.service';
import { Router, RouterModule } from '@angular/router';
import { AuthFacade } from '../../../core/services/auth.facade';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-event-public-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-50 font-sans text-slate-900 pb-32">
      
      <!-- Professional Catalog Header -->
      <div class="bg-white border-b border-slate-200 pt-20 pb-16">
        <div class="max-w-7xl mx-auto px-6">
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div class="max-w-2xl">
              <span class="inline-block px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-widest mb-4">MediConnect Sessions</span>
              <h1 class="text-4xl lg:text-7xl font-extrabold text-slate-900 tracking-tightest mb-6 leading-[1.1]">
                Plateforme de <span class="text-blue-600">Conférences</span>.
              </h1>
              <p class="text-slate-500 text-lg lg:text-xl font-medium leading-relaxed">
                Accédez aux dernières avancées et partages d'expériences du monde médical par des experts certifiés.
              </p>
            </div>
            <div class="flex gap-3">
              <div class="h-12 w-12 rounded-full border border-slate-200 flex items-center justify-center text-slate-300">🔍</div>
              <div class="h-12 px-6 rounded-full border border-slate-200 flex items-center gap-3 text-sm font-bold text-slate-600">
                 Toutes les catégories
                 <svg class="h-4 w-4 opacity-40" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Events Grid -->
      <div class="max-w-7xl mx-auto px-6 mt-16">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div *ngFor="let ev of events(); let i = index" 
               [routerLink]="['/events', ev.id]"
               class="group bg-white rounded-3xl border border-slate-200 overflow-hidden cursor-pointer hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 flex flex-col h-full animate-fade-in"
               [style.animation-delay]="(i * 0.05) + 's'">
            
            <!-- Banner Image -->
            <div class="relative h-60 w-full overflow-hidden bg-slate-50">
              <img *ngIf="ev.bannerUrl" [src]="ev.bannerUrl" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Event Thumbnail"/>
              <div *ngIf="!ev.bannerUrl" class="w-full h-full bg-slate-100 flex items-center justify-center text-5xl grayscale opacity-30">🔬</div>
              
              <!-- Category Badge (Top Left) -->
              <div class="absolute top-4 left-4 flex flex-col gap-2 z-[50]">
                 <span class="w-fit px-3 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[9px] font-bold text-slate-900 border border-slate-200 uppercase tracking-widest shadow-sm">
                    {{ formatLabel(ev.specialization || 'Général') }}
                 </span>
              </div>

              <!-- Presence Badge (Top Right) -->
              <div class="absolute top-4 right-4 z-[50]">
                 <span [class]="isOnline(ev) ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-white border-slate-800'" 
                       class="px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border shadow-xl flex items-center gap-1.5">
                    <span class="w-1 h-1 rounded-full bg-white animate-pulse"></span>
                    {{ isOnline(ev) ? 'En ligne' : 'Présentiel' }}
                 </span>
              </div>

              <!-- Status Badges for authenticated users -->
              <div class="absolute bottom-4 left-4 z-[50]" *ngIf="getParticipationStatus(ev.id!)">
                 <span [class]="getBadgeClass(ev.id!)" class="px-3 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-lg">
                    {{ getParticipationStatus(ev.id!) === 'CONFIRMED' ? 'Inscrit' : 'Attente' }}
                 </span>
              </div>
            </div>

            <!-- Content Area -->
            <div class="p-8 lg:p-10 flex-1 flex flex-col">
              <div class="flex items-center gap-2 mb-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none">
                <span>{{ ev.eventDate | date:'dd MMM' }}</span>
                <span class="w-1 h-1 rounded-full bg-slate-200"></span>
                <span>{{ ev.eventDate | date:'HH:mm' }}H</span>
              </div>

              <h3 class="text-xl lg:text-2xl font-bold text-slate-900 mb-6 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2 tracking-tightest">
                {{ ev.title }}
              </h3>

              <div class="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg grayscale shadow-inner">👨‍⚕️</div>
                  <div class="flex flex-col">
                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Conférencier</span>
                    <span class="text-xs font-bold text-slate-700">Dr. {{ ev.organizerName }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <button *ngIf="canJoinRoom(ev)"
                          [routerLink]="['/events', ev.id, 'room']"
                          (click)="$event.stopPropagation()"
                          class="px-4 py-2 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 flex items-center gap-2 animate-bounce-subtle">
                     <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_white]"></span>
                     REJOINDRE LE LIVE
                  </button>
                  <div class="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                    <svg class="w-5 h-5 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="events().length === 0" class="py-40 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
           <div class="text-6xl mb-6 opacity-10">📖</div>
           <p class="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Aucune conférence disponible pour le moment</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tracking-tightest { letter-spacing: -0.04em; }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
  `]
})
export class EventPublicListComponent implements OnInit {
  private eventService = inject(EventService);
  private authFacade = inject(AuthFacade);
  
  events = signal<MedicalEvent[]>([]);
  participations = signal<Map<number, MyParticipation>>(new Map());

  ngOnInit() {
    this.refreshEvents();
    this.loadParticipations();
  }

  refreshEvents() {
    this.eventService.getActiveEvents().subscribe(res => {
      const user = this.authFacade.currentUser;
      const isDoc = user?.userType === 'DOCTOR';
      this.events.set(res.filter(e => isDoc ? (e.targetAudience === 'PUBLIC' || e.targetAudience === 'DOCTORS_ONLY') : e.targetAudience === 'PUBLIC'));
    });
  }

  loadParticipations() {
    const user = this.authFacade.currentUser;
    if (!user) return;

    this.eventService.getMyParticipations().pipe(
      catchError(() => of([])) // Handle 401 gracefully
    ).subscribe({
      next: (list) => {
        const m = new Map<number, MyParticipation>();
        list.forEach(p => { if (p.event.id) m.set(p.event.id, p); });
        this.participations.set(m);
      },
      error: (err) => console.error('Failed to load participations', err)
    });
  }

  getParticipationStatus(id: number): ParticipantStatus | undefined {
    return this.participations().get(id)?.status;
  }

  getBadgeClass(id: number): string {
    const status = this.getParticipationStatus(id);
    return status === 'CONFIRMED' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white';
  }

  canJoinRoom(ev: MedicalEvent): boolean {
    if (!this.isOnline(ev)) return false;
    // Only confirmed participants can join
    if (this.getParticipationStatus(ev.id!) !== 'CONFIRMED') return false;

    const now = new Date();
    const eventTime = new Date(ev.eventDate);
    const diff = (eventTime.getTime() - now.getTime()) / (1000 * 60);
    return diff <= 60 && diff >= -480;
  }

  isOnline(ev: MedicalEvent): boolean {
    const loc = (ev?.location || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return /online|live|virtuel|webinaire|zoom|teams|meet|distance|digitale/.test(loc) || loc.includes('salle');
  }

  formatLabel(s: string): string {
    if (!s) return '';
    return s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
