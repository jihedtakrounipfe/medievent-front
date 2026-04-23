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
      <div *ngFor="let ev of events()" class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full cursor-pointer relative group" [routerLink]="['/events', ev.id]">
        
        <!-- Delete Button Overlay -->
        <button (click)="$event.stopPropagation(); delete(ev.id!)" 
                class="absolute top-4 right-4 z-10 w-8 h-8 bg-white/90 backdrop-blur text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:text-white transition-all shadow-sm border border-gray-100"
                title="Supprimer l'événement">
           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>

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
            <div class="flex items-center text-sm">
               <span class="font-bold text-gray-900 mr-1">{{ ev.confirmedCount || 0 }}</span>
               <span class="text-gray-500">inscrits</span>
            </div>
            
            <div class="flex gap-2">
              <button *ngIf="isOnline(ev)" (click)="$event.stopPropagation(); openInviteModal(ev)" 
                      class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                Inviter
              </button>
              <button *ngIf="canJoinRoom(ev)" [routerLink]="['/events', ev.id, 'room']" (click)="$event.stopPropagation()" 
                      class="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5 group/btn">
                 <span class="w-1.5 h-1.5 rounded-full bg-red-600 group-hover/btn:bg-white animate-pulse"></span>
                 Live
              </button>
            </div>
          </div>
        </div>

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
          <button (click)="sendGuestInvite()" [disabled]="!inviteGuestEmail" class="flex-1 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50">Envoyer l'invitation</button>
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
