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
    <div *ngIf="!notFound()" class="min-h-screen bg-slate-50/50 pb-32 font-sans text-slate-900 animate-fade-in">
      
      <!-- Top Bar / Back button -->
      <div class="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a (click)="goBack()" class="flex items-center gap-3 text-slate-400 hover:text-slate-900 transition-all font-bold text-xs uppercase tracking-widest cursor-pointer group">
            <svg class="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Retour
          </a>
          <div class="flex items-center gap-3">
             <span *ngIf="isOnline(event())" class="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">🌐 Session Live</span>
             <span class="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">{{ formatLabel(event()?.specialization || 'Spécialité') }}</span>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-6 pt-12">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <!-- Left Column: Primary Content -->
          <div class="lg:col-span-8 space-y-12">
            
            <!-- Hero Title & Image -->
            <div class="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
              <div class="h-[450px] w-full bg-slate-100 relative group">
                <img *ngIf="event()?.bannerUrl" [src]="event()?.bannerUrl" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Banner"/>
                <div *ngIf="!event()?.bannerUrl" class="w-full h-full bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center text-6xl opacity-30">🔬</div>
                <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div class="p-12 lg:p-16">
                <h1 class="text-4xl lg:text-6xl font-black text-slate-900 leading-[1.1] mb-10 tracking-tightest">
                  {{ event()?.title }}
                </h1>
                
                <div class="flex flex-wrap items-center gap-10 pt-10 border-t border-slate-100">
                   <div class="flex items-center gap-5">
                      <div class="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shadow-inner">👨‍⚕️</div>
                      <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Conférencier Principal</p>
                        <p class="font-extrabold text-slate-900 text-lg leading-none">Dr. {{ event()?.speakerName || event()?.organizerName }}</p>
                      </div>
                   </div>
                   <div class="flex items-center gap-5">
                      <div class="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl shadow-inner">📆</div>
                      <div>
                        <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1.5">Date de Session</p>
                        <p class="font-extrabold text-slate-900 text-lg leading-none">{{ event()?.eventDate | date:'EEEE dd MMMM yyyy' }}</p>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            <!-- Description & Sections -->
            <div class="bg-white rounded-[2.5rem] border border-slate-200 p-12 lg:p-16 shadow-sm space-y-16">
               <section>
                 <span class="inline-block px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest mb-6">Présentation du sujet</span>
                 <p class="text-slate-600 text-xl lg:text-2xl leading-[1.6] font-normal">
                   {{ event()?.description }}
                 </p>
               </section>

               <section *ngIf="event()?.speakerBio">
                 <span class="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest mb-6">Expertise Intervenant</span>
                 <p class="text-slate-500 italic text-xl leading-relaxed font-serif">
                   "{{ event()?.speakerBio }}"
                 </p>
               </section>

               <section *ngIf="event()?.agenda">
                 <span class="inline-block px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest mb-6">Agenda Détaillé</span>
                 <div class="bg-slate-50 p-10 rounded-3xl border border-slate-100 whitespace-pre-line text-slate-700 font-medium text-lg leading-relaxed shadow-inner">
                   {{ event()?.agenda }}
                 </div>
               </section>
            </div>

            <!-- Location Section (PRO Clarity) -->
            <section *ngIf="!isOnline(event())" class="space-y-6 animate-fade-in">
                <!-- Massive Address Widget -->
                <div class="bg-slate-900 text-white p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                   <div class="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                   <div class="relative z-10">
                      <p class="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                         <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                         Lieu de rendez-vous
                      </p>
                      <h3 class="text-3xl lg:text-5xl font-black mb-10 leading-tight tracking-tightest">
                         {{ event()?.location }}
                      </h3>
                      <div class="flex items-center gap-6">
                        <a [href]="'https://www.google.com/maps/dir/?api=1&destination=' + encode(event()?.location!)" target="_blank" 
                           class="px-8 py-5 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/90 transition-all shadow-xl flex items-center gap-3">
                           <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                           Itinéraire Google Maps
                        </a>
                      </div>
                   </div>
                </div>

                <!-- High Quality Color Map -->
                <div class="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm h-[400px]">
                   <iframe class="w-full h-full" frameborder="0" [src]="getMapUrl(event()?.location!)" allowfullscreen></iframe>
                </div>
            </section>
          </div>

           <!-- Right Column: Actions Sidebar -->
           <div class="lg:col-span-4 h-fit lg:sticky lg:top-32">
             <!-- Action Card: Only if an action button is visible -->
             <div *ngIf="(canEnterRoom() && isOnline(event())) || (!isOrganizer(event()) && !participationStatus() && !canEnterRoom())"
                  class="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm mb-10">
               
               <div class="space-y-4">
                 <!-- Access live (Digital) -->
                 <a *ngIf="canEnterRoom() && isOnline(event())"
                    [routerLink]="['/events', event()?.id, 'room']"
                    class="flex items-center justify-center gap-3 w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg">
                   <span class="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                   {{ isOrganizer(event()) ? 'AccÃ©der au Studio' : 'Rejoindre la session' }}
                 </a>

                 <!-- Simple Registration Button -->
                 <button *ngIf="!isOrganizer(event()) && !participationStatus() && !canEnterRoom()"
                         (click)="join()"
                         [disabled]="actionLoading()"
                         class="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50">
                   {{ actionLoading() ? "Inscription..." : "S'inscrire à l'événement" }}
                 </button>
               </div>
             </div>
            
          </div>
        </div>
      </div>
    </div>

    <!-- 404 NOT FOUND STATE -->
    <div *ngIf="notFound()" class="min-h-screen bg-white flex items-center justify-center p-6 animate-fade-in">
       <div class="max-w-md w-full text-center space-y-10">
          <div class="relative inline-block">
             <div class="text-[12rem] font-black text-slate-50 leading-none tracking-tightest select-none">404</div>
             <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-7xl">ðŸ¥</span>
             </div>
          </div>
          <div class="space-y-4">
             <h2 class="text-3xl font-black text-slate-900 tracking-tight">Session Introuvable</h2>
             <p class="text-slate-500 font-medium leading-relaxed">
               L'Ã©vÃ©nement que vous recherchez (ID: {{ requestedId }}) n'existe plus ou a Ã©tÃ© retirÃ© de la plateforme.
             </p>
          </div>
          <div class="pt-6">
             <a routerLink="/events" class="inline-flex items-center gap-4 px-10 py-6 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                Catalogue de Conférences
             </a>
          </div>
       </div>
    </div>
  `,
  styles: [`
    .tracking-tightest { letter-spacing: -0.06em; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
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
  showManageModal     = signal(false);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      this.requestedId = params['id'];
      if (id) {
        this.loadEvent(id);
      } else {
        this.notFound.set(true);
      }
    });
  }

  loadEvent(id: number) {
    this.eventService.getEventById(id).subscribe({
      next: (ev) => {
        this.notFound.set(false);
        this.event.set(ev);
        this.checkParticipation();
        if (this.isOrganizer(ev)) { this.loadParticipants(ev.id!); }
      },
      error: () => {
        this.notFound.set(true);
      }
    });
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

