import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService, MedicalEvent, ParticipantStatus, MyParticipation } from '../../../core/services/event.service';
import { Router, RouterModule } from '@angular/router';
import { AuthFacade } from '../../../core/services/auth.facade';
import { catchError, of } from 'rxjs';
import { Specialization } from '../../../core/user/enums/specialization.enum';

@Component({
  selector: 'app-event-public-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 font-sans text-gray-900 pb-32">
      
      <!-- Professional Catalog Header -->
      <div class="bg-white border-b border-gray-200 pt-20 pb-16 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div class="max-w-2xl">
              <span class="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold uppercase tracking-wider mb-4 border border-teal-100">
                 <span class="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                 MediConnect Sessions
              </span>
              <h1 class="text-4xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-4 leading-tight">
                Plateforme de <span class="text-teal-600">Conférences</span>.
              </h1>
              <p class="text-gray-500 text-lg lg:text-xl font-medium leading-relaxed max-w-xl">
                Accédez aux dernières avancées et partages d'expériences du monde médical par des experts certifiés.
              </p>
            </div>
            <div class="flex items-center gap-3">
              <div class="relative w-full sm:w-64">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
                <input type="text" [(ngModel)]="searchQuery" placeholder="Rechercher..." 
                       class="h-12 w-full pl-10 pr-4 rounded-xl border border-gray-200 bg-white shadow-sm text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors">
              </div>
              
              <div class="relative h-12 w-full sm:w-48 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center text-sm font-bold text-gray-600 hover:border-teal-300 transition-colors">
                 <select [(ngModel)]="selectedSpecialization" class="h-full w-full appearance-none bg-transparent pl-4 pr-10 focus:outline-none focus:ring-0 cursor-pointer">
                    <option value="">Toutes les catégories</option>
                    <option *ngFor="let s of specializations" [value]="s">{{ formatLabel(s) }}</option>
                 </select>
                 <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg class="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Events Grid -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div *ngFor="let ev of filteredEvents(); let i = index" 
               [routerLink]="['/events', ev.id]"
               class="group bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer hover:border-teal-200 hover:shadow-lg hover:shadow-teal-100/50 transition-all duration-300 flex flex-col h-full animate-fade-in"
               [style.animation-delay]="(i * 0.05) + 's'">
            
            <!-- Banner Image -->
            <div class="relative h-56 w-full overflow-hidden bg-gray-100 border-b border-gray-100">
              <img *ngIf="ev.bannerUrl" [src]="ev.bannerUrl" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Event Thumbnail"/>
              <div *ngIf="!ev.bannerUrl" class="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300">
                <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
              
              <!-- Category Badge (Top Left) -->
              <div class="absolute top-4 left-4 z-[50]">
                 <span class="px-2.5 py-1 bg-white/95 backdrop-blur text-xs font-bold text-teal-800 rounded-md border border-teal-100 shadow-sm uppercase tracking-wider">
                    {{ formatLabel(ev.specialization || 'Général') }}
                 </span>
              </div>

              <!-- Presence Badge (Top Right) -->
              <div class="absolute top-4 right-4 z-[50]">
                 <span [class]="isOnline(ev) ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-gray-100 text-gray-800 border-gray-200'" 
                       class="px-2 py-1 rounded-md text-[10px] font-bold border shadow-sm flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full" [ngClass]="isOnline(ev) ? 'bg-indigo-600 animate-pulse' : 'bg-gray-500'"></span>
                    {{ isOnline(ev) ? 'En ligne' : 'Présentiel' }}
                 </span>
              </div>

              <!-- Status Badges for authenticated users (Only for physical events) -->
              <div class="absolute bottom-4 left-4 z-[50]" *ngIf="getParticipationStatus(ev.id!) && !isOnline(ev)">
                 <span [class]="getBadgeClass(ev.id!)" class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm border">
                    {{ getParticipationStatus(ev.id!) === 'CONFIRMED' ? '✓ Participant' : '⌛ En attente' }}
                 </span>
              </div>
            </div>

            <!-- Content Area -->
            <div class="p-6 sm:p-8 flex-1 flex flex-col">
              <div class="flex items-center text-xs text-gray-500 font-medium mb-3">
                 <svg class="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 {{ ev.eventDate | date:'dd MMM à HH:mm' }}
              </div>

              <h3 class="text-xl font-bold text-gray-900 mb-2 leading-snug group-hover:text-teal-600 transition-colors line-clamp-2">
                {{ ev.title }}
              </h3>
              
              <div *ngIf="ev.status === 'COMPLETED' || canJoinRoom(ev)" class="flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-4">
                 <svg class="w-3.5 h-3.5 mr-1 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                 {{ ev.status === 'COMPLETED' ? ev.finalParticipantCount || 0 : ev.confirmedCount || 0 }} participants
              </div>

              <div class="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 text-sm font-bold">Dr</div>
                  <div class="flex flex-col">
                    <span class="text-[10px] text-gray-500 font-medium leading-none mb-1 uppercase tracking-wider">Conférencier</span>
                    <span class="text-xs font-bold text-gray-900">Dr. {{ ev.organizerName }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <button *ngIf="canJoinRoom(ev) && !isFinished(ev)"
                          [routerLink]="['/events', ev.id, 'room']"
                          (click)="$event.stopPropagation()"
                          class="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5 group/btn">
                     <span class="w-1.5 h-1.5 rounded-full bg-red-600 group-hover/btn:bg-white animate-pulse"></span>
                     Live
                  </button>
                  <div *ngIf="isOnline(ev) && !canJoinRoom(ev) && !isFinished(ev)" class="px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-[10px] font-bold flex items-center gap-1">
                     Bientôt
                  </div>
                  <div *ngIf="ev.status === 'COMPLETED'" class="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5">
                     Terminée
                  </div>
                  <div *ngIf="isFinished(ev) && ev.status !== 'COMPLETED'" class="px-3 py-1.5 bg-gray-50 text-gray-400 border border-gray-200 rounded-lg text-xs font-bold flex items-center gap-1.5">
                     Expirée
                  </div>
                  <div class="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-teal-600 group-hover:border-teal-600 group-hover:text-white transition-all duration-300">
                    <svg class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="filteredEvents().length === 0" class="py-32 text-center bg-white rounded-2xl border border-gray-200 shadow-sm mt-8">
           <div class="text-4xl mb-4 text-gray-300">
              <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
           </div>
           <p class="text-gray-500 font-medium text-sm">Aucune conférence disponible pour le moment</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
  `]
})
export class EventPublicListComponent implements OnInit {
  private eventService = inject(EventService);
  private authFacade = inject(AuthFacade);
  
  events = signal<MedicalEvent[]>([]);
  participations = signal<Map<number, MyParticipation>>(new Map());

  searchQuery = signal('');
  selectedSpecialization = signal('');
  specializations = Object.values(Specialization);

  filteredEvents = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const spec = this.selectedSpecialization();
    return this.events().filter(e => {
      const matchQ = e.title.toLowerCase().includes(q) || (e.organizerName && e.organizerName.toLowerCase().includes(q));
      const matchSpec = spec ? e.specialization === spec : true;
      return matchQ && matchSpec;
    });
  });

  ngOnInit() {
    // Re-fetch events whenever the user state changes to ensure correct visibility
    this.authFacade.currentUser$.subscribe(() => {
      this.refreshEvents();
    });
    this.loadParticipations();
  }

  refreshEvents() {
    this.eventService.getActiveEvents().subscribe(res => {
      const user = this.authFacade.currentUser;
      // Defensive check for doctor roles (including potential subtypes)
      const userType = user?.userType?.toString() || '';
      const isDoc = userType === 'DOCTOR' || userType.startsWith('DOCTOR_');
      
      this.events.set(res.filter(e => 
        isDoc ? (e.targetAudience === 'PUBLIC' || e.targetAudience === 'DOCTORS_ONLY') 
              : e.targetAudience === 'PUBLIC'
      ));
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
    if (ev.status === 'COMPLETED') return false;
    // Only confirmed participants can join
    if (this.getParticipationStatus(ev.id!) !== 'CONFIRMED') return false;

    const now = new Date();
    const eventTime = new Date(ev.eventDate);
    const diff = (eventTime.getTime() - now.getTime()) / (1000 * 60);
    // Allow starting 15 min before and up to 8 hours after
    return diff <= 15 && diff >= -480;
  }

  isFinished(ev: MedicalEvent): boolean {
    if (ev.status === 'COMPLETED') return true;
    const now = new Date();
    const eventTime = new Date(ev.eventDate);
    const diff = (eventTime.getTime() - now.getTime()) / (1000 * 60);
    return diff < -480;
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
