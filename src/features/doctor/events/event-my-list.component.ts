import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService, MedicalEvent } from '../../../core/services/event.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-event-my-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 font-sans text-slate-900 pb-32">
      
      <!-- Dashboard Top Section -->
      <div class="bg-white border-b border-slate-200 pt-20 pb-16">
        <div class="max-w-7xl mx-auto px-6 lg:px-12">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-10">
            <div class="animate-fade-in">
              <span class="inline-block px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-widest mb-4">Gestionnaire de sessions</span>
              <h1 class="text-4xl lg:text-7xl font-extrabold text-slate-900 tracking-tightest leading-[1.1]">
                Vos <span class="text-blue-600">Conférences</span>.
              </h1>
            </div>

            <a routerLink="/doctor/events/create" 
               class="btn-pro btn-primary-pro py-5 px-10 animate-fade-in">
               <span class="text-xl leading-none font-light mr-2">+</span>
               Créer un événement
            </a>
          </div>
        </div>
      </div>

      <!-- Dashboard Body -->
      <div class="max-w-7xl mx-auto px-6 lg:px-12 -mt-10 relative z-20">
        
        <!-- Key Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
           <div class="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
              <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Total Événements</p>
              <p class="text-4xl font-extrabold text-slate-900">{{ events().length }}</p>
           </div>
           <div class="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
              <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Inscriptions totales</p>
              <p class="text-4xl font-extrabold text-blue-600">{{ totalParticipants() }}</p>
           </div>
           <div class="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
              <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">Sessions futures</p>
              <p class="text-4xl font-extrabold text-slate-900">{{ upcomingCount() }}</p>
           </div>
        </div>

        <!-- Management Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div *ngFor="let ev of events(); let i = index" 
               class="group bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:border-slate-300 hover:shadow-md transition-all duration-300 flex flex-col h-full animate-fade-in"
               [style.animation-delay]="(i * 0.05) + 's'">
            
            <!-- Card Image Area -->
            <div class="relative h-48 w-full overflow-hidden bg-slate-50">
              <img *ngIf="ev.bannerUrl" [src]="ev.bannerUrl" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Banner"/>
              <div *ngIf="!ev.bannerUrl" class="w-full h-full bg-slate-100 flex items-center justify-center text-4xl grayscale opacity-20">🔬</div>
              
              <!-- Badge: Presence (Top Right for visibility) - Fixed Position -->
              <div class="absolute top-4 right-4 z-[50]">
                 <span [class]="isOnline(ev) ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20' : 'bg-slate-900 text-white border-slate-800 shadow-slate-900/20'" 
                       class="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-xl flex items-center gap-1.5 transition-all">
                    <span class="w-1 h-1 rounded-full bg-white animate-pulse"></span>
                    {{ isOnline(ev) ? 'En ligne' : 'Présentiel' }}
                 </span>
              </div>
              
              <!-- Floating Delete Action -->
              <div class="absolute bottom-4 right-4 z-[50]">
                 <button (click)="$event.stopPropagation(); delete(ev.id!)" 
                         class="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all shadow-lg border border-slate-100">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>
              </div>
            </div>

            <!-- Card Content Body -->
            <div class="p-8 flex-1 flex flex-col" [routerLink]="['/events', ev.id]">
              <div class="flex items-center gap-3 mb-4">
                 <p class="text-slate-300 text-[10px] font-bold uppercase tracking-widest leading-none">{{ ev.eventDate | date:'dd MMM yyyy' }}</p>
                 <div class="h-1 w-1 bg-slate-200 rounded-full"></div>
                 <p class="text-blue-600 text-[10px] font-bold uppercase tracking-widest leading-none">{{ ev.eventDate | date:'HH:mm' }}H</p>
              </div>

              <h3 class="text-xl font-bold text-slate-900 mb-8 line-clamp-2 leading-tight tracking-tightest group-hover:text-blue-600 transition-colors cursor-pointer">
                {{ ev.title }}
              </h3>

              <div class="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                     <span class="text-xs font-bold text-slate-900">{{ ev.confirmedCount || 0 }}</span>
                     <span class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Inscrits</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <button *ngIf="isOnline(ev)" (click)="$event.stopPropagation(); openInviteModal(ev)" class="text-slate-400 text-[8px] font-black uppercase tracking-widest hover:text-blue-600 transition-colors">Inviter +</button>
                    <button *ngIf="canJoinRoom(ev)" [routerLink]="['/events', ev.id, 'room']" (click)="$event.stopPropagation()" 
                            class="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg shadow-red-600/20">
                       <span class="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse"></span>
                       REJOINDRE
                    </button>
                  </div>
                </div>
                <div class="text-slate-200 group-hover:text-slate-900 transition-colors">
                  <svg class="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="events().length === 0" class="py-40 text-center bg-white rounded-3xl border border-slate-100 shadow-sm animate-fade-in">
           <div class="text-5xl mb-6 opacity-10">📁</div>
           <p class="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Aucune session programmée</p>
           <a routerLink="/doctor/events/create" class="mt-6 inline-block text-blue-600 font-bold text-xs hover:underline decoration-2 underline-offset-4">Planifier une nouvelle conférence</a>
        </div>
      </div>
    </div>

    <!-- Invite Modal -->
    <div *ngIf="inviteModalEvent()" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden relative">
        <div class="p-10 border-b border-slate-100">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Invitation Directe</p>
          <h3 class="text-2xl font-extrabold text-slate-900 leading-tight">{{ inviteModalEvent()?.title }}</h3>
        </div>
        <div class="p-10 space-y-6">
          <div class="space-y-2">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email du destinataire</label>
            <input [(ngModel)]="inviteGuestEmail" type="email" placeholder="nom@exemple.com" 
                   class="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-900 font-medium outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all" />
          </div>
          
          <div *ngIf="inviteSuccess()" class="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] font-bold border border-emerald-100">✓ Invitation envoyée avec succès</div>
          <div *ngIf="inviteError()" class="p-3 bg-rose-50 text-rose-700 rounded-xl text-[11px] font-bold border border-rose-100">⚠ {{ inviteError() }}</div>

          <div class="flex gap-3 pt-4">
            <button (click)="closeInviteModal()" class="flex-1 py-4 btn-pro btn-outline-pro">Fermer</button>
            <button (click)="sendGuestInvite()" [disabled]="!inviteGuestEmail" class="flex-1 py-4 btn-pro btn-primary-pro disabled:opacity-30">Inviter</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tracking-tightest { letter-spacing: -0.04em; }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
  `]
})
export class EventMyListComponent implements OnInit {
  private eventService = inject(EventService);

  events = signal<MedicalEvent[]>([]);
  
  inviteModalEvent = signal<MedicalEvent | null>(null);
  inviteGuestEmail = '';
  inviteSending    = signal(false);
  inviteSuccess    = signal(false);
  inviteError      = signal('');

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.eventService.getMyEvents().subscribe(res => {
      this.events.set(res.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()));
    });
  }

  totalParticipants(): number {
    return this.events().reduce((acc, curr) => acc + (curr.confirmedCount || 0), 0);
  }

  upcomingCount(): number {
    const now = new Date();
    return this.events().filter(ev => new Date(ev.eventDate) > now).length;
  }

  delete(id: number) {
    if (confirm('Supprimer cette conférence ?')) {
      this.eventService.deleteEvent(id).subscribe(() => this.loadEvents());
    }
  }

  openInviteModal(ev: MedicalEvent) {
    this.inviteModalEvent.set(ev);
    this.inviteGuestEmail = '';
    this.inviteSuccess.set(false);
    this.inviteError.set('');
  }

  closeInviteModal() {
    this.inviteModalEvent.set(null);
  }

  sendGuestInvite() {
    const ev = this.inviteModalEvent();
    if (!ev?.id || !this.inviteGuestEmail) return;
    this.inviteSending.set(true);
    this.eventService.inviteGuestByEmail(ev.id, this.inviteGuestEmail, '').subscribe({
      next: () => {
        this.inviteSending.set(false);
        this.inviteSuccess.set(true);
        setTimeout(() => this.closeInviteModal(), 2000);
      },
      error: (err) => {
        this.inviteSending.set(false);
        this.inviteError.set(err?.error?.message || "Erreur de connexion");
      }
    });
  }

  isOnline(ev: MedicalEvent): boolean {
    const loc = (ev?.location || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return /online|live|virtuel|webinaire|zoom|teams|meet|distance|digitale/.test(loc) || loc.includes('salle');
  }

  canJoinRoom(ev: MedicalEvent): boolean {
    if (!this.isOnline(ev)) return false;
    const now = new Date();
    const eventTime = new Date(ev.eventDate);
    const diff = (eventTime.getTime() - now.getTime()) / (1000 * 60);
    // Allow starting 60 min before and up to 8 hours after
    return diff <= 60 && diff >= -480;
  }

  formatLabel(s: string): string {
    if (!s) return '';
    return s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
