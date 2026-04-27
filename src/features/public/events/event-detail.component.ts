import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService, MedicalEvent, ParticipantStatus, Participant } from '../../../core/services/event.service';
import { AuthFacade } from '../../../core/services/auth.facade';
import { NotificationService } from '../../../core/services/notification.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, of, Subscription, Subject, takeUntil } from 'rxjs';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- MAIN DETAIL VIEW -->
    <div *ngIf="!notFound()" class="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900 no-print">
      
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
      </div>

      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <!-- Hero Banner -->
        <div class="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mb-8 group no-print">
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
          <div class="lg:col-span-2 space-y-10 no-print">
            
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
          <div class="lg:col-span-1 no-print">
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
                 <!-- Notifications (Mailing Feedback) -->
                 <div *ngIf="notificationMsg()" class="mb-6 p-4 rounded-xl border flex items-start gap-3 text-xs font-bold transition-all animate-ticket"
                      [ngClass]="notificationMsg()?.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'">
                    <svg *ngIf="notificationMsg()?.type === 'success'" class="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                    <svg *ngIf="notificationMsg()?.type === 'warning'" class="w-5 h-5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                    <span class="leading-relaxed">{{ notificationMsg()?.text }}</span>
                 </div>

                 <!-- Action Buttons -->
                 <div *ngIf="!isOrganizer(event())" class="space-y-4">
                   
                   <!-- Physical Event Registration -->
                   <ng-container *ngIf="!isOnline(event())">
                      <button *ngIf="!participationStatus()" (click)="join()" [disabled]="actionLoading()" 
                              class="w-full py-4 px-6 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-teal-900/20 transition-all active:scale-[0.98] uppercase tracking-widest">
                        {{ actionLoading() ? "TRAITEMENT..." : "RÉSERVER MA PLACE" }}
                      </button>

                      <div *ngIf="participationStatus() === 'CONFIRMED'" class="space-y-3">
                         <div class="w-full py-4 px-6 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-2xl border border-emerald-100 flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                            PARTICIPATION CONFIRMÉE
                         </div>
                         <button (click)="openTicket()" 
                                 class="w-full py-4 px-6 bg-gray-900 text-white text-xs font-bold rounded-2xl shadow-xl shadow-gray-400/20 transition-all active:scale-[0.98] uppercase tracking-widest flex items-center justify-center gap-2 no-print">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" /></svg>
                            VOIR MON PASS
                         </button>
                         <button (click)="cancel()" [disabled]="actionLoading()"
                                 class="w-full py-3 text-[10px] font-bold text-gray-400 hover:text-rose-500 uppercase tracking-widest transition-colors no-print">
                           Se désister
                         </button>
                      </div>

                      <div *ngIf="participationStatus() === 'PENDING_INVITE' || participationStatus() === 'WAITING_LIST'" class="space-y-3">
                         <div class="w-full py-4 px-6 bg-amber-50 text-amber-700 text-xs font-bold rounded-2xl border border-amber-100 flex flex-col items-center justify-center gap-1">
                            <div class="flex items-center gap-2">
                               <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                               LISTE D'ATTENTE
                            </div>
                            <span *ngIf="waitlistRank()" class="text-[9px] opacity-70">Position: {{ waitlistRank() }}</span>
                         </div>
                         <button (click)="cancel()" [disabled]="actionLoading()"
                                 class="w-full py-3 text-[10px] font-bold text-gray-400 hover:text-rose-500 uppercase tracking-widest transition-colors no-print">
                           Annuler la demande
                         </button>
                      </div>
                   </ng-container>

                   <!-- Finished Event -->
                    <div *ngIf="event()?.status === 'COMPLETED'" class="w-full py-4 px-6 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-2xl border border-emerald-100 flex items-center justify-center gap-2 uppercase tracking-widest">
                       <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                       ÉVÉNEMENT TERMINÉ
                    </div>
                    <div *ngIf="isFinished() && event()?.status !== 'COMPLETED'" class="w-full py-4 px-6 bg-gray-100 text-gray-400 text-[10px] font-black rounded-2xl border border-gray-200 flex items-center justify-center gap-2 uppercase tracking-widest">
                       <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       ÉVÉNEMENT EXPIRÉ
                    </div>

                   <!-- Online Event Status (When not yet time to join) -->
                   <div *ngIf="isOnline(event()) && event()?.status !== 'COMPLETED' && !canEnterRoom() && !isFinished()" class="w-full py-4 px-6 bg-amber-50 text-amber-700 text-[10px] font-black rounded-2xl border border-amber-100 flex items-center justify-center gap-2 uppercase tracking-widest">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      SALLE FERMÉE - ACCÈS DÈS 15 MN AVANT
                   </div>

                   <!-- Subscribe Button (Online events, not yet started, not organizer) -->
                   <ng-container *ngIf="isOnline(event()) && !isFinished() && !isOrganizer(event())">
                     <button *ngIf="!subscribedToLive()" (click)="subscribeToLive()" 
                             class="w-full flex items-center justify-center gap-2 py-3 px-6 bg-white border-2 border-indigo-200 text-indigo-600 text-xs font-bold rounded-2xl hover:border-indigo-400 hover:bg-indigo-50 transition-all uppercase tracking-widest">
                       <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                       ME NOTIFIER AU DÉMARRAGE
                     </button>
                     <button *ngIf="subscribedToLive()" (click)="unsubscribeFromLive()" 
                             class="w-full flex items-center justify-center gap-2 py-3 px-6 bg-indigo-600 text-white text-xs font-bold rounded-2xl hover:bg-indigo-700 transition-all uppercase tracking-widest">
                       <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                       NOTIF ACTIVÉE ✓
                     </button>
                   </ng-container>
                 </div>

                 <!-- Live Access -->
                 <div *ngIf="!isFinished() && (isOrganizer(event()) || (canEnterRoom() && isOnline(event())))">
                    <a *ngIf="isOnline(event())" [routerLink]="['/events', event()?.id, 'room']"
                       [ngClass]="hostIsLive() ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'"
                       class="w-full flex justify-center items-center py-4 px-6 text-white text-xs font-bold rounded-2xl shadow-lg transition-all uppercase tracking-widest gap-2">
                       <span *ngIf="hostIsLive()" class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                       {{ hostIsLive() ? 'LE DIRECT A COMMENCÉ - REJOINDRE' : 'ENTRER DANS LA SALLE' }}
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

    <!-- TICKET MODAL -->
    <div *ngIf="showTicket()" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm no-print-backdrop">
      <div class="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col relative animate-ticket">
        
        <!-- Ticket Close -->
        <button (click)="showTicket.set(false)" class="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400 z-10 no-print">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div id="printable-ticket" class="p-0 bg-white">
          <!-- Ticket Top -->
          <div class="bg-teal-600 p-8 text-white relative overflow-hidden">
            <div class="absolute top-0 right-0 p-8 opacity-10">
               <svg class="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <p class="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">PASS DE PARTICIPATION</p>
            <h3 class="text-2xl font-black tracking-tight leading-tight">{{ event()?.title }}</h3>
          </div>

          <!-- Ticket Content -->
          <div class="p-10 space-y-8 bg-white">
            <div class="grid grid-cols-2 gap-8">
               <div>
                  <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">PARTICIPANT</p>
                  <p class="text-sm font-black text-gray-900">{{ authFacade.currentUser?.firstName }} {{ authFacade.currentUser?.lastName }}</p>
               </div>
               <div>
                  <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">DATE & HEURE</p>
                  <p class="text-sm font-black text-gray-900">{{ event()?.eventDate | date:'dd MMM yyyy, HH:mm' }}</p>
               </div>
            </div>

            <div>
               <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">LIEU / ACCÈS</p>
               <p class="text-sm font-black text-gray-900 truncate">{{ event()?.location }}</p>
            </div>

            <!-- QR Code Area -->
            <div class="flex flex-col items-center justify-center pt-6 border-t border-dashed border-gray-200">
               <div class="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm mb-4">
                  <img [src]="ticketQrCode()" class="w-40 h-40" alt="QR Code">
               </div>
               <p class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Scanner pour vérification</p>
            </div>
          </div>

          <!-- Ticket Footer -->
          <div class="px-10 py-6 bg-gray-50 flex items-center justify-between border-t border-gray-100">
             <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-black text-xs">M</div>
                <span class="text-xs font-black text-gray-900 tracking-tighter">MediConnect</span>
             </div>
             <p class="text-[9px] font-bold text-gray-400">ID: #{{ event()?.id }}-{{ authFacade.currentUser?.id }}</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="p-6 bg-white flex gap-3 no-print">
          <button (click)="showTicket.set(false)" class="flex-1 px-6 py-3 border border-gray-200 text-[10px] font-black rounded-xl hover:bg-gray-50 transition-all uppercase tracking-widest">
             Fermer
          </button>
          <button (click)="printTicket()" class="flex-1 px-6 py-3 bg-teal-600 text-white text-[10px] font-black rounded-xl hover:bg-teal-500 transition-all uppercase tracking-widest shadow-lg shadow-teal-900/10 flex items-center justify-center gap-2">
             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
             Imprimer le Pass
          </button>
        </div>
      </div>
    </div>

    <!-- 404 NOT FOUND STATE -->
    <div *ngIf="notFound()" class="min-h-screen bg-gray-50 flex items-center justify-center p-6 no-print">
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

    @media print {
      /* Hide all layout noise */
      app-navbar, app-footer, app-admin-navbar, app-admin-footer, .no-print, .no-print-backdrop { 
        display: none !important; 
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      html, body { 
        height: auto !important;
        background: white !important; 
        padding: 0 !important;
        margin: 0 !important;
        visibility: hidden !important;
      }

      /* Show ONLY the ticket */
      #printable-ticket {
        visibility: visible !important;
        display: block !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 40px !important;
        border: none !important;
        border-radius: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-shadow: none !important;
      }

      #printable-ticket * {
        visibility: visible !important;
      }

      /* Clean up page breaks */
      * { -webkit-print-color-adjust: exact !important; }
      @page { size: auto; margin: 0; }
    }

    .animate-ticket { animation: ticketSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes ticketSlideUp {
      from { opacity: 0; transform: translateY(40px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `]
})
export class EventDetailComponent implements OnInit, OnDestroy {
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private eventService = inject(EventService);
  public authFacade    = inject(AuthFacade);
  private sanitizer    = inject(DomSanitizer);
  private notifService = inject(NotificationService);

  event               = signal<MedicalEvent | null>(null);
  notFound            = signal(false);
  requestedId         = '';
  actionLoading       = signal(false);
  notificationMsg     = signal<{text: string, type: 'success' | 'warning'} | null>(null);
  participationStatus = signal<ParticipantStatus | undefined>(undefined);
  waitlistRank        = signal<number | undefined>(undefined);
  participants        = signal<Participant[]>([]);
  
  showTicket          = signal(false);
  ticketQrCode        = signal('');
  
  hostIsLive          = signal(false);
  subscribedToLive    = signal(false);
  private liveCheckInterval: any;
  private liveNotifSent = false; // prevent duplicate notifications per session
  private destroy$ = new Subject<void>(); // for unsubscribing route params

  private map: any;

  ngOnInit() {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      // Clean up previous event's interval before loading new one
      if (this.liveCheckInterval) { clearInterval(this.liveCheckInterval); this.liveCheckInterval = null; }
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
        if (ev.id) {
          this.eventService.checkSubscriptionStatus(ev.id).subscribe(res => {
            this.subscribedToLive.set(res.subscribed);
          });
        }
        this.checkParticipation();
        if (!this.isOnline(ev)) {
          setTimeout(() => this.initMap(), 500);
        } else {
          this.checkLiveStatus();
          this.liveCheckInterval = setInterval(() => this.checkLiveStatus(), 5000);
        }
      },
      error: () => this.notFound.set(true)
    });
  }

  private isFirstLiveCheck = true;

  checkLiveStatus() {
     const ev = this.event();
     if (!ev?.id) return;
     this.eventService.getSignal(ev.id.toString()).subscribe({
        next: (res) => {
          const wasLive = this.hostIsLive();
          this.hostIsLive.set(res.isLive);

          // Trigger in-app notification when live just started for subscribed users
          // We only notify if it TRANSITIONS to live, not if it's already live when we enter
          if (res.isLive && !wasLive && !this.isFirstLiveCheck && !this.liveNotifSent && this.subscribedToLive()) {
            this.liveNotifSent = true;
            this.notifService.push({
              title: '🔴 Direct commencé !',
              message: `"${ev.title}" est en direct maintenant. Cliquez pour rejoindre.`,
              eventId: ev.id,
              type: 'live_started'
            });
          }
          this.isFirstLiveCheck = false;
        },
        error: () => {}
     });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.liveCheckInterval) clearInterval(this.liveCheckInterval);
  }

  subscribeToLive() {
    const ev = this.event();
    if (!ev?.id) return;
    this.eventService.subscribeToLive(ev.id).subscribe({
      next: () => {
        this.subscribedToLive.set(true);
        this.notificationMsg.set({ text: '🔔 Vous serez notifié dès que la session commence !', type: 'success' });
        setTimeout(() => this.notificationMsg.set(null), 4000);
      },
      error: (err) => {
        console.error('🔥 BACKEND ERROR DETAILS:', err.error);
      }
    });
  }

  unsubscribeFromLive() {
    const ev = this.event();
    if (!ev?.id) return;
    this.eventService.unsubscribeFromLive(ev.id).subscribe({
      next: () => {
        this.subscribedToLive.set(false);
        this.notificationMsg.set({ text: 'Notification désactivée.', type: 'warning' });
        setTimeout(() => this.notificationMsg.set(null), 3000);
      }
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
    return /online|live|virtuel|webinaire|zoom|teams|meet|distance|digitale/.test(loc);
  }

  canEnterRoom(): boolean {
    const ev = this.event();
    if (!ev || !ev.eventDate) return false;
    if (ev.status === 'COMPLETED') return false;

    // Organizers can always enter to prepare the room
    if (this.isOrganizer(ev)) return true;

    // If the host is already live, bypass the time check completely!
    if (this.hostIsLive() && this.isOnline(ev)) {
        if (ev.targetAudience === 'PUBLIC') return true;
        if (this.participationStatus() === 'CONFIRMED') return true;
    }

    const now = new Date();
    const eventTime = new Date(ev.eventDate);
    const diff = (eventTime.getTime() - now.getTime()) / (1000 * 60);
    
    // Check if we are within the allowed time window (15 mins before to 8 hours after)
    const timeOk = diff <= 15 && diff >= -480;

    // For others, they must be confirmed/public AND within the time window
    if (!timeOk) return false;

    if (ev.targetAudience === 'PUBLIC' && this.isOnline(ev)) return true;
    if (this.participationStatus() === 'CONFIRMED') return true;

    return false;
  }

  isFinished(): boolean {
    const ev = this.event();
    if (!ev || !ev.eventDate) return false;
    if (ev.status === 'COMPLETED') return true;
    const now = new Date();
    const eventTime = new Date(ev.eventDate);
    const diff = (eventTime.getTime() - now.getTime()) / (1000 * 60);
    return diff < -480; // Event finished after 8 hours
  }

  join() {
    const ev = this.event();
    if (!ev?.id) return;
    this.actionLoading.set(true);
    this.eventService.joinEvent(ev.id).subscribe({
      next: () => { 
        this.checkParticipation(); 
        this.actionLoading.set(false); 
        this.notificationMsg.set({
          text: "Demande de participation enregistrée ! Vous recevrez un email de confirmation de votre statut.", 
          type: 'success'
        });
        setTimeout(() => this.notificationMsg.set(null), 5000);
      },
      error: () => this.actionLoading.set(false)
    });
  }

  cancel() {
    const ev = this.event();
    if (!ev?.id || !confirm('Voulez-vous vraiment annuler votre participation ?')) return;
    this.actionLoading.set(true);
    this.eventService.cancelParticipation(ev.id).subscribe({
      next: () => { 
        this.checkParticipation(); 
        this.actionLoading.set(false);
        this.notificationMsg.set({
          text: "Participation annulée. Si vous étiez confirmé, un email d'annulation vous sera envoyé.", 
          type: 'warning'
        });
        setTimeout(() => this.notificationMsg.set(null), 5000);
      },
      error: () => this.actionLoading.set(false)
    });
  }

  formatLabel(s: string): string {
    if (!s) return '';
    return s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  async openTicket() {
    const ev = this.event();
    const user = this.authFacade.currentUser;
    if (!ev || !user) return;

    // Generate QR Content: simple verification payload
    const qrData = JSON.stringify({
      eventId: ev.id,
      userId: user.id,
      title: ev.title,
      date: ev.eventDate,
      ts: Date.now()
    });

    try {
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      this.ticketQrCode.set(dataUrl);
      this.showTicket.set(true);
    } catch (err) {
      console.error('Failed to generate QR code', err);
    }
  }

  printTicket() {
    window.print();
  }

  encode(s: string): string { return encodeURIComponent(s); }
  goBack() { this.router.navigate(['/events']); }
}
