import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService, MedicalEvent, ParticipantStatus, Participant } from '../../../core/services/event.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, of, Subscription } from 'rxjs';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- MAIN DETAIL VIEW -->
    <div *ngIf="!notFound()" class="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900">
      
      <!-- Back Nav -->
      <div class="bg-white border-b border-gray-200">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button (click)="goBack()" class="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Retour aux événements
          </button>
          <div class="flex gap-2">
            <span *ngIf="isOnline(event())" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <svg class="mr-1.5 h-2 w-2 text-blue-500" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
              En Ligne
            </span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
              {{ formatLabel(event()?.specialization || 'Général') }}
            </span>
          </div>
        </div>
      </div>      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <!-- Hero Banner -->
        <div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mb-8 group">
          <div class="h-80 sm:h-96 w-full bg-gray-100 relative overflow-hidden">
            <img *ngIf="event()?.bannerUrl" [src]="event()?.bannerUrl" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Event Banner">
            <div *ngIf="!event()?.bannerUrl" class="w-full h-full bg-gradient-to-br from-teal-600 via-teal-700 to-indigo-900 flex items-center justify-center">
              <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              <svg class="w-32 h-32 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <div class="absolute top-6 left-6 flex gap-2">
               <span *ngIf="isOnline(event())" class="px-4 py-1.5 rounded-full text-xs font-bold bg-white/90 backdrop-blur-md text-blue-600 shadow-lg flex items-center gap-2">
                 <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                 Virtual Infrastructure
               </span>
               <span class="px-4 py-1.5 rounded-full text-xs font-bold bg-white/90 backdrop-blur-md text-teal-600 shadow-lg uppercase tracking-wider">
                 {{ formatLabel(event()?.specialization || 'Général') }}
               </span>
            </div>
          </div>
          <div class="p-10 relative">
            <div class="absolute -top-12 right-10 flex items-center gap-3">
               <div class="bg-white p-4 rounded-2xl shadow-xl border border-gray-50 flex flex-col items-center min-w-[80px]">
                  <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ event()?.eventDate | date:'MMM' }}</span>
                  <span class="text-2xl font-black text-gray-900 leading-none mt-1">{{ event()?.eventDate | date:'dd' }}</span>
               </div>
            </div>
            <h1 class="text-4xl font-black text-gray-950 mb-4 tracking-tight leading-tight">{{ event()?.title }}</h1>
            <p class="text-lg text-gray-500 max-w-3xl leading-relaxed">{{ event()?.description }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          <!-- Main Details -->
          <div class="lg:col-span-2 space-y-10">
            
            <!-- Agenda -->
            <div *ngIf="event()?.agenda" class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-10 relative overflow-hidden">
              <div class="absolute top-0 right-0 p-8 opacity-[0.03]">
                 <svg class="w-40 h-40" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
              </div>
              <h2 class="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                <span class="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                </span>
                Programme Détaillé
              </h2>
              <div class="prose prose-teal max-w-none text-gray-600 whitespace-pre-line text-base leading-loose">
                {{ event()?.agenda }}
              </div>
            </div>

            <!-- Leaflet Map -->
            <div *ngIf="!isOnline(event())" class="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden relative group">
               <div class="p-10 pb-6">
                 <h2 class="text-2xl font-black text-gray-900 flex items-center gap-3">
                   <span class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                     <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   </span>
                   Lieu de l'événement
                 </h2>
                 <a [href]="'https://www.google.com/maps/dir/?api=1&destination=' + encode(event()?.location!)" target="_blank" 
                    class="group/loc inline-flex items-center gap-2 mt-2 text-gray-500 hover:text-indigo-600 transition-colors">
                    <p class="font-medium underline decoration-gray-200 underline-offset-4 group-hover/loc:decoration-indigo-300 transition-all">{{ event()?.location }}</p>
                    <svg class="w-4 h-4 opacity-0 group-hover/loc:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                 </a>
               </div>
               
               <div id="map" class="h-[550px] w-full z-10"></div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="lg:col-span-1">
            <div class="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/30 border border-gray-100 p-8 sticky top-24">
              
              <div class="space-y-8">
                <div>
                   <label class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] block mb-4">Chronologie</label>
                   <div class="flex items-start gap-4">
                      <div class="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                         <p class="text-sm font-bold text-gray-900">{{ event()?.eventDate | date:'EEEE dd MMMM' }}</p>
                         <p class="text-xs text-gray-500 mt-0.5">Ouverture à {{ event()?.eventDate | date:'HH:mm' }}</p>
                      </div>
                   </div>
                </div>

                <div>
                   <label class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] block mb-4">Intervenant Principal</label>
                   <div class="flex items-start gap-4">
                      <div class="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-sm">
                         {{ (event()?.speakerName || event()?.organizerName || 'D').charAt(0) }}
                      </div>
                      <div>
                         <p class="text-sm font-bold text-gray-900">Dr. {{ event()?.speakerName || event()?.organizerName }}</p>
                         <p class="text-xs text-gray-500 mt-0.5 italic">Expertise {{ formatLabel(event()?.specialization || 'Médicale') }}</p>
                      </div>
                   </div>
                </div>

                <div *ngIf="event()?.speakerBio" class="p-5 bg-stone-50 rounded-2xl border border-stone-100">
                   <p class="text-xs text-gray-500 leading-relaxed italic">"{{ event()?.speakerBio }}"</p>
                </div>
              </div>

              <div class="mt-10 pt-10 border-t border-gray-100">
                 <!-- Action Buttons -->
                 <div *ngIf="!isOrganizer(event())" class="space-y-4">
                   
                   <!-- Physical Event Registration -->
                   <ng-container *ngIf="!isOnline(event())">
                      <button *ngIf="!participationStatus()" (click)="join()" [disabled]="actionLoading()" 
                              class="w-full py-4 px-6 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-teal-900/20 transition-all active:scale-[0.98] uppercase tracking-widest">
                        {{ actionLoading() ? "TRAITEMENT..." : "RÉSERVER MA PLACE" }}
                      </button>

                      <div *ngIf="participationStatus()" class="space-y-3">
                         <div class="w-full py-4 px-6 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-2xl border border-emerald-100 flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                            INSCRIPTION CONFIRMÉE
                         </div>
                         <button (click)="cancel()" [disabled]="actionLoading()"
                                 class="w-full py-3 text-[10px] font-bold text-gray-400 hover:text-rose-500 uppercase tracking-widest transition-colors">
                           Se désister
                         </button>
                      </div>
                   </ng-container>

                   <!-- Online Event Status (When not yet time to join) -->
                   <div *ngIf="isOnline(event()) && !canEnterRoom()" class="w-full py-4 px-6 bg-blue-50 text-blue-700 text-[10px] font-black rounded-2xl border border-blue-100 flex items-center justify-center gap-2 uppercase tracking-widest">
                      <span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                      Accès Virtuel Libre
                   </div>
                 </div>

                 <!-- Live Access -->
                 <div *ngIf="isOrganizer(event()) || (canEnterRoom() && isOnline(event()))">
                    <a *ngIf="isOnline(event())" [routerLink]="['/events', event()?.id, 'room']"
                       class="w-full flex justify-center items-center py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-900/20 transition-all uppercase tracking-widest">
                       ENTRER DANS LA SALLE
                    </a>
                    <p *ngIf="isOrganizer(event()) && !isOnline(event())" class="text-center text-[10px] font-bold text-teal-600 uppercase tracking-widest">
                       Organisateur de la Session
                    </p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 404 NOT FOUND STATE -->
    <div *ngIf="notFound()" class="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div class="max-w-md w-full text-center space-y-8 bg-white p-10 rounded-3xl shadow-sm border border-gray-200">
        <div class="text-6xl mb-4">🏥</div>
        <h2 class="text-2xl font-bold text-gray-900">Événement Introuvable</h2>
        <p class="text-gray-500">L'événement que vous recherchez n'existe plus ou a été retiré.</p>
        <a routerLink="/events" class="inline-flex items-center justify-center w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors cursor-pointer">
          Retour au catalogue
        </a>
      </div>
    </div>
  `,
  styles: [`
    #map { z-index: 10 !important; border-radius: 0 0 2.5rem 2.5rem; }
    .leaflet-container { border-bottom: 1px solid #f3f4f6; }
    .leaflet-routing-container { display: none !important; }
  `]
})
export class EventDetailComponent implements OnInit {
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private eventService = inject(EventService);
  private authFacade   = inject(AuthFacade);
  private sanitizer    = inject(DomSanitizer);

  event               = signal<MedicalEvent | null>(null);
  notFound            = signal(false);
  requestedId         = '';
  actionLoading       = signal(false);
  participationStatus = signal<ParticipantStatus | undefined>(undefined);
  waitlistRank        = signal<number | undefined>(undefined);
  participants        = signal<Participant[]>([]);
  
  private map: any;

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      this.requestedId = params['id'];
      if (id) this.loadEvent(id);
      else this.notFound.set(true);
    });
  }

  loadEvent(id: number) {
    this.eventService.getEventById(id).subscribe({
      next: (ev) => {
        this.notFound.set(false);
        this.event.set(ev);
        this.checkParticipation();
        if (!this.isOnline(ev)) {
          setTimeout(() => this.initMap(), 500);
        }
      },
      error: () => this.notFound.set(true)
    });
  }

  private initMap() {
    const loc = this.event()?.location;
    if (!loc || (window as any).L === undefined) return;

    const L = (window as any).L;
    
    // Ensure Routing plugin is loaded
    if (!L.Routing) {
      setTimeout(() => this.initMap(), 200);
      return;
    }

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loc)}`)
      .then(res => res.json())
      .then(data => {
        if (data.length === 0) return;
        const destCoords = L.latLng(data[0].lat, data[0].lon);
        
        if (this.map) this.map.remove();
        this.map = L.map('map', { scrollWheelZoom: false }).setView(destCoords, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);

        const startRouting = (start: any) => {
          L.Routing.control({
            waypoints: [start, destCoords],
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            show: false,
            collapsible: true,
            lineOptions: {
              styles: [{ color: '#0d9488', opacity: 0.8, weight: 6 }]
            },
            createMarker: (i: number, wp: any) => {
              return L.marker(wp.latLng, {
                icon: L.icon({
                  iconUrl: i === 0 ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png' : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41]
                })
              }).bindPopup(i === 0 ? "Départ" : `<b>${this.event()?.title}</b><br>${loc}`);
            }
          }).addTo(this.map);
        };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => startRouting(L.latLng(pos.coords.latitude, pos.coords.longitude)),
            () => startRouting(L.latLng(36.8065, 10.1815)) // Fallback to Tunis
          );
        } else {
          startRouting(L.latLng(36.8065, 10.1815));
        }
      })
      .catch(err => console.error('Map init failed:', err));
  }

  private showOnlyMarker(coords: any, loc: string) {
    const L = (window as any).L;
    L.marker(coords, {
      icon: L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
      })
    }).addTo(this.map).bindPopup(`<b>${this.event()?.title}</b><br>${loc}`).openPopup();
  }

  loadParticipants(id: number) {
    this.eventService.getEventParticipants(id).subscribe(p => this.participants.set(p));
  }

  checkParticipation() {
    const ev = this.event();
    if (!ev?.id) return;
    const userExists = this.authFacade.currentUser;
    if (!userExists) return;

    this.eventService.getMyParticipations().pipe(
      catchError(() => of([]))
    ).subscribe(list => {
      const found = list.find(p => p.event.id === ev.id);
      this.participationStatus.set(found?.status);
      this.waitlistRank.set(found?.waitingListPosition);
    });
  }

  getOccupationPercent(): number {
    const ev = this.event();
    if (!ev || !ev.confirmedCount || !ev.maxParticipants) return 0;
    return Math.round((ev.confirmedCount * 100) / ev.maxParticipants);
  }

  isOrganizer(ev: MedicalEvent | null | undefined): boolean {
    if (!ev) return false;
    const user = this.authFacade.currentUser;
    return !!user && ev.organizerId === user.id;
  }

  isOnline(ev: MedicalEvent | null | undefined): boolean {
    if (!ev) return false;
    const loc = (ev?.location || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return /online|live|virtuel|webinaire|zoom|teams|meet|distance|digitale/.test(loc) || loc.includes('salle');
  }

  canEnterRoom(): boolean {
    const ev = this.event();
    if (!ev || !ev.eventDate) return false;
    if (this.isOrganizer(ev)) return true; // Organizers can always access
    if (ev.targetAudience === 'PUBLIC' && this.isOnline(ev)) return true;
    if (this.participationStatus() === 'CONFIRMED') return true;
    const now = new Date();
    const eventTime = new Date(ev.eventDate);
    const diff = (eventTime.getTime() - now.getTime()) / (1000 * 60);
    return diff <= 60 && diff >= -480;
  }

  join() {
    const ev = this.event();
    if (!ev?.id) return;
    this.actionLoading.set(true);
    this.eventService.joinEvent(ev.id).subscribe({
      next: () => { this.checkParticipation(); this.actionLoading.set(false); },
      error: () => this.actionLoading.set(false)
    });
  }

  cancel() {
    const ev = this.event();
    if (!ev?.id || !confirm('Annuler votre participation ?')) return;
    this.actionLoading.set(true);
    this.eventService.cancelParticipation(ev.id).subscribe({
      next: () => { this.checkParticipation(); this.actionLoading.set(false); },
      error: () => this.actionLoading.set(false)
    });
  }

  getMapUrl(location: string): SafeResourceUrl {
    const encoded = encodeURIComponent(location);
    // Explicitly using iwloc=B and layout parameters to force the RED Marker to drop exactly on the address.
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://maps.google.com/maps?width=100%25&height=600&hl=fr&q=${encoded}&t=&z=15&ie=UTF8&iwloc=B&output=embed`);
  }

  formatLabel(s: string): string {
    if (!s) return '';
    return s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  encode(s: string): string { return encodeURIComponent(s); }
  goBack() { this.router.navigate(['/events']); }
}

