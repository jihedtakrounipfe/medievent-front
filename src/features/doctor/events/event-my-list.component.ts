import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService, MedicalEvent, Participant } from '../../../core/services/event.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-event-my-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
<div class="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900">
  
  <!-- Dashboard Header -->
  <div class="bg-white border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between py-8 gap-4">
        <div>
          <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">Vos Événements</h1>
          <p class="mt-2 text-sm text-gray-500">Gérez vos conférences, webinaires et ateliers.</p>
        </div>
        <a routerLink="/doctor/events/create" 
           class="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors">
           <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
           Nouvel événement
        </a>
      </div>
    </div>
  </div>

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
    
    <!-- Key Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
       <div class="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex items-center">
          <div class="p-3 rounded-xl bg-teal-50 text-teal-600 mr-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Total Événements</p>
            <p class="text-2xl font-bold text-gray-900">{{ events().length }}</p>
          </div>
       </div>
       <div class="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex items-center">
          <div class="p-3 rounded-xl bg-blue-50 text-blue-600 mr-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Inscriptions</p>
            <p class="text-2xl font-bold text-gray-900">{{ totalParticipants() }}</p>
          </div>
       </div>
       <div class="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex items-center">
          <div class="p-3 rounded-xl bg-indigo-50 text-indigo-600 mr-4">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">À venir</p>
            <p class="text-2xl font-bold text-gray-900">{{ upcomingCount() }}</p>
          </div>
       </div>
    </div>

    <!-- Management Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div *ngFor="let ev of events()" class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full relative group">
        
        <!-- Delete Button Overlay — outside the routerLink wrapper so it never triggers navigation -->
        <button (click)="delete(ev.id!)" 
                class="absolute top-4 right-4 z-10 w-8 h-8 bg-white/90 backdrop-blur text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:text-white transition-all shadow-sm border border-gray-100"
                title="Supprimer l'événement">
           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>

        <!-- Card Content — the only area that navigates -->
        <div class="flex flex-col h-full cursor-pointer" [routerLink]="['/events', ev.id]">

        <!-- Card Image Area -->
        <div class="h-48 w-full bg-gray-100 relative">
          <img *ngIf="ev.bannerUrl" [src]="ev.bannerUrl" class="w-full h-full object-cover" alt="Banner"/>
          <div *ngIf="!ev.bannerUrl" class="w-full h-full bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center">
            <svg class="w-16 h-16 text-teal-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          
          <div class="absolute top-4 left-4 z-[50]">
             <span [class]="isOnline(ev) ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-gray-100 text-gray-800 border-gray-200'" 
                   class="px-2 py-1 rounded-md text-[10px] font-bold border shadow-sm flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full" [ngClass]="isOnline(ev) ? 'bg-indigo-600 animate-pulse' : 'bg-gray-500'"></span>
                {{ isOnline(ev) ? 'En ligne' : 'Présentiel' }}
             </span>
          </div>
        </div>

        <!-- Card Content Body -->
        <div class="p-6 flex-1 flex flex-col">
          <div class="flex items-center text-xs text-gray-500 mb-3 font-medium">
             <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             {{ ev.eventDate | date:'dd MMM yyyy à HH:mm' }}
          </div>

          <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
            {{ ev.title }}
          </h3>
          
          <p class="text-sm text-gray-500 line-clamp-2 mb-6 flex-1">
            {{ ev.description }}
          </p>

          <div class="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
            <div *ngIf="ev.status === 'COMPLETED' || canJoinRoom(ev)" class="flex items-center text-sm">
               <span class="font-bold text-gray-900 mr-1">{{ ev.status === 'COMPLETED' ? ev.finalParticipantCount || 0 : ev.confirmedCount || 0 }}</span>
               <span class="text-gray-500">participants</span>
            </div>
            
            <div class="flex gap-2">
              <button *ngIf="!isOnline(ev)" (click)="$event.stopPropagation(); openParticipantsModal(ev)" 
                      class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                Participants
              </button>
              <button (click)="$event.stopPropagation()" *ngIf="ev.status !== 'COMPLETED'" [routerLink]="['/doctor/events/edit', ev.id]" 
                      class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                Modifier
              </button>
              <button *ngIf="isOnline(ev) && ev.status !== 'COMPLETED'" (click)="$event.stopPropagation(); openInviteModal(ev)" 
                      class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                Inviter
              </button>
              <button *ngIf="ev.status !== 'COMPLETED'" (click)="$event.stopPropagation(); completeEvent(ev)" 
                      class="inline-flex items-center px-3 py-1.5 border border-emerald-200 shadow-sm text-xs font-medium rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white transition-colors" title="Marquer la session comme terminée">
                <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Terminer
              </button>
              <button *ngIf="canJoinRoom(ev) && !isFinished(ev)" [routerLink]="['/events', ev.id, 'room']" (click)="$event.stopPropagation()" 
                      class="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5 group/btn">
                 <span class="w-1.5 h-1.5 rounded-full bg-red-600 group-hover/btn:bg-white animate-pulse"></span>
                 Live
              </button>
              <div *ngIf="isOnline(ev) && ev.status !== 'COMPLETED' && !canJoinRoom(ev) && !isFinished(ev)" class="px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-[10px] font-bold flex items-center gap-1">
                 Bientôt
              </div>
              <div *ngIf="ev.status === 'COMPLETED'" class="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5">
                 Terminée
              </div>
              <div *ngIf="isFinished(ev) && ev.status !== 'COMPLETED'" class="px-3 py-1.5 bg-gray-50 text-gray-400 border border-gray-200 rounded-lg text-xs font-bold flex items-center gap-1.5" title="La conférence n'a pas été lancée dans les temps">
                 Expirée
              </div>
            </div>
          </div>
        </div>
        <!-- end card body (navigable area) -->
        </div>
        <!-- end card outer -->
      </div>
    </div>

    <!-- Empty State -->
    <div *ngIf="events().length === 0" class="py-24 text-center bg-white rounded-2xl border border-gray-200 shadow-sm mt-8">
       <div class="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
       </div>
       <h3 class="text-lg font-medium text-gray-900 mb-1">Aucun événement</h3>
       <p class="text-gray-500 mb-6">Vous n'avez pas encore planifié de conférence.</p>
       <a routerLink="/doctor/events/create" class="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700">
         Créer mon premier événement
       </a>
    </div>
  </div>
</div>

<!-- Participants Modal -->
<div *ngIf="participantsModalEvent()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
  <div class="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
    <div class="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
      <div>
        <h3 class="text-xl font-black text-gray-900 tracking-tight">Liste des Participants</h3>
        <p class="text-xs text-gray-500 mt-1 font-medium">{{ participantsModalEvent()?.title }}</p>
      </div>
      <button (click)="closeParticipantsModal()" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-400">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
    
    <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
       <!-- Stats within Modal -->
       <div class="grid grid-cols-2 gap-4 mb-8">
          <div class="bg-teal-50 p-4 rounded-2xl border border-teal-100">
             <p class="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Confirmés</p>
             <p class="text-2xl font-black text-teal-900 mt-1">{{ participants().length }}</p>
          </div>
          <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100">
             <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Capacité</p>
             <p class="text-2xl font-black text-gray-900 mt-1">{{ participantsModalEvent()?.maxParticipants || '∞' }}</p>
          </div>
       </div>

       <!-- Participants Table -->
       <div *ngIf="participants().length > 0" class="space-y-3">
          <div *ngFor="let p of participants()" class="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-teal-200 hover:shadow-sm transition-all group">
             <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-black text-gray-500 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                   {{ p.userName.charAt(0) }}
                </div>
                <div>
                   <p class="text-sm font-bold text-gray-900">{{ p.userName }}</p>
                   <p class="text-xs text-gray-500">{{ p.userEmail }}</p>
                </div>
             </div>
             <div class="flex items-center gap-3">
                <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-50 text-green-700 border border-green-100">
                   {{ p.role === 'GUEST' ? 'INVITÉ' : 'PARTICIPANT' }}
                </span>
             </div>
          </div>
       </div>

       <!-- Empty state for participants -->
       <div *ngIf="participants().length === 0" class="py-12 text-center">
          <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
             <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <p class="text-gray-500 text-sm font-bold">Aucun participant pour le moment</p>
       </div>
    </div>

    <div class="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
       <button (click)="closeParticipantsModal()" class="px-6 py-2.5 bg-gray-900 text-white text-[11px] font-black rounded-xl hover:bg-gray-800 transition-all uppercase tracking-widest shadow-lg shadow-gray-200">
          FERMER
       </button>
    </div>
  </div>
</div>

<!-- Invite Modal -->
<div *ngIf="inviteModalEvent()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
  <div class="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
      <h3 class="text-lg font-bold text-gray-900">Inviter un participant</h3>
      <button (click)="closeInviteModal()" class="text-gray-400 hover:text-gray-500">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
    <div class="p-6">
      <p class="text-sm text-gray-500 mb-4">
        Envoyer une invitation directe pour l'événement <strong>{{ inviteModalEvent()?.title }}</strong>.
      </p>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nom de l'invité</label>
          <input [(ngModel)]="inviteGuestName" type="text" placeholder="Dr. Dupont" 
                 class="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Adresse email</label>
          <input [(ngModel)]="inviteGuestEmail" type="email" placeholder="nom@exemple.com" 
                 class="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors" />
        </div>
        
        <div *ngIf="inviteSuccess()" class="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200">
          ✓ Invitation envoyée avec succès
        </div>
        <div *ngIf="inviteError()" class="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200">
          ⚠ {{ inviteError() }}
        </div>

        <div class="flex gap-3 pt-2">
          <button (click)="closeInviteModal()" class="flex-1 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50">Annuler</button>
          <button (click)="sendGuestInvite()" [disabled]="!inviteGuestEmail || inviteSending()" class="flex-1 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50">
            {{ inviteSending() ? 'Envoi...' : 'Envoyer l\\'invitation' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  `]
})
export class EventMyListComponent implements OnInit {
  private eventService = inject(EventService);

  events = signal<MedicalEvent[]>([]);
  
  inviteModalEvent = signal<MedicalEvent | null>(null);
  inviteGuestName  = '';
  inviteGuestEmail = '';
  inviteSending    = signal(false);
  inviteSuccess    = signal(false);
  inviteError      = signal('');

  participantsModalEvent = signal<MedicalEvent | null>(null);
  participants = signal<Participant[]>([]);
  loadingParticipants = signal(false);

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.eventService.getMyEvents().subscribe(res => {
      const now = new Date();

      this.events.set(
        res
          .filter(ev => {
            // COMPLETED events: show for 20 min after the scheduled event time
            // then hide (they move to admin archive)
            if (ev.status === 'COMPLETED') {
              const eventTime = new Date(ev.eventDate);
              const minutesSinceEvent = (now.getTime() - eventTime.getTime()) / (1000 * 60);
              // If it's been more than 20 min since the event was scheduled, hide it
              return minutesSinceEvent < 20;
            }
            return true;
          })
          .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
      );
    });
  }

  totalParticipants(): number {
    return this.events().reduce((acc, curr) => acc + (curr.confirmedCount || 0), 0);
  }

  upcomingCount(): number {
    const now = new Date();
    return this.events().filter(ev => new Date(ev.eventDate) > now).length;
  }

  completeEvent(ev: MedicalEvent) {
    if (!ev.id) return;
    if (confirm('Voulez-vous marquer cet événement comme terminé ?')) {
       // Estimate participant count based on confirmed participants
       const count = ev.confirmedCount || 0;
       this.eventService.completeEvent(ev.id, count).subscribe({
         next: () => {
           this.loadEvents();
           alert('Événement marqué comme terminé.');
         },
         error: () => alert('Erreur lors de la clôture de l\'événement.')
       });
    }
  }

  delete(id: number) {
    if (confirm('Voulez-vous vraiment annuler cet événement ? Un email d\'annulation sera automatiquement envoyé à tous les participants inscrits.')) {
      this.eventService.deleteEvent(id).subscribe(() => this.loadEvents());
    }
  }

  openInviteModal(ev: MedicalEvent) {
    this.inviteModalEvent.set(ev);
    this.inviteGuestName = '';
    this.inviteGuestEmail = '';
    this.inviteSuccess.set(false);
    this.inviteError.set('');
  }

  closeInviteModal() {
    this.inviteModalEvent.set(null);
  }

  openParticipantsModal(ev: MedicalEvent) {
    if (!ev.id) return;
    this.participantsModalEvent.set(ev);
    this.participants.set([]);
    this.loadingParticipants.set(true);
    this.eventService.getEventParticipants(ev.id).subscribe({
      next: (res) => {
        this.participants.set(res.filter(p => p.status === 'CONFIRMED'));
        this.loadingParticipants.set(false);
      },
      error: () => this.loadingParticipants.set(false)
    });
  }

  closeParticipantsModal() {
    this.participantsModalEvent.set(null);
  }

  sendGuestInvite() {
    const ev = this.inviteModalEvent();
    if (!ev?.id || !this.inviteGuestEmail) return;
    this.inviteSending.set(true);
    this.eventService.inviteGuestByEmail(ev.id, this.inviteGuestEmail, this.inviteGuestName).subscribe({
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
    return /online|live|virtuel|webinaire|zoom|teams|meet|distance|digitale/.test(loc);
  }

  canJoinRoom(ev: MedicalEvent): boolean {
    if (!this.isOnline(ev)) return false;
    if (ev.status === 'COMPLETED') return false;
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

  formatLabel(s: string): string {
    if (!s) return '';
    return s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
