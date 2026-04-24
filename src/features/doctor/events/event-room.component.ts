import {
  Component, inject, OnInit, OnDestroy,
  ViewChild, ElementRef, signal, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthFacade } from '../../../core/services/auth.facade';
import { EventService, Participant } from '../../../core/services/event.service';
import { environment } from '../../../environments/environment';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

declare var Peer: any;

interface ChatMessage {
  senderId?: number;
  sender: string;
  content: string;
  timestamp: string;
  role: string;
  replyTo?: string;
  replyToSender?: string;
}

@Component({
  selector: 'app-virtual-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="h-screen bg-gray-950 font-sans text-gray-100 flex flex-col overflow-hidden">
  <!-- Top Header -->
  <header class="h-16 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-50">
    <div class="flex items-center gap-4">
      <div class="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500">
         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
      </div>
      <div>
        <h1 class="text-sm font-bold text-gray-100 tracking-wide">{{ eventTitle() || 'Conférence MediConnect' }}</h1>
        <div class="flex items-center gap-2 text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">
          <span class="flex items-center gap-1.5" [class.text-emerald-500]="streamActive()">
            <span class="w-1.5 h-1.5 rounded-full" [ngClass]="streamActive() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'"></span>
            {{ streamActive() ? 'En Direct' : 'En Attente' }}
          </span>
          <span>&bull;</span>
          <span>ID: {{ eventId }}</span>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-6" *ngIf="streamActive()">
      <div class="flex items-center gap-2 text-xs font-medium text-gray-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
        {{ participants().length }} Inscrits
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button (click)="leave()" class="px-4 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors border border-gray-800">
        Quitter
      </button>
      <button *ngIf="isModerator() && streamActive()" (click)="endSession()" class="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors">
         Terminer
      </button>
    </div>
  </header>

  <main class="flex-1 flex min-h-0 relative">
    <!-- Video Stage -->
    <div class="flex-1 relative flex flex-col p-4 sm:p-6 bg-[#0a0a0c]">
      <div class="flex-1 relative rounded-2xl overflow-hidden bg-black border border-gray-800 shadow-2xl flex items-center justify-center">
        
        <!-- Video Grid -->
        <div class="absolute inset-0 grid gap-2 p-2 transition-all duration-500" 
             [ngClass]="{
               'grid-cols-1': remoteStreams().length === 1 || (remoteStreams().length === 0 && !isHost),
               'grid-cols-2': remoteStreams().length === 2,
               'grid-cols-2 md:grid-cols-3': remoteStreams().length > 2
             }">
          
          <!-- Empty State (No presenters) -->
          <div *ngIf="remoteStreams().length === 0 && !isHost" class="col-span-full flex items-center justify-center text-gray-500 italic">
             Aucun présentateur n'est actuellement en direct.
          </div>

          <!-- Remote Speaker Videos -->
          <div *ngFor="let rs of remoteStreams()" class="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-800 group shadow-lg">
             <video [srcObject]="rs.stream" autoplay playsinline [muted]="true" class="w-full h-full object-contain"></video>
             <div class="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                INTERVENANT
             </div>
             <!-- Exclude Button -->
             <button *ngIf="isModerator() && !isPermanentSpeaker(rs.peerId)" (click)="excludeParticipant(rs.peerId)" class="absolute top-4 right-4 bg-red-600 hover:bg-red-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all active:scale-90 z-10" title="Exclure l'intervenant">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
             </button>
          </div>
        </div>

        <!-- Local Video PiP (Fixed floating window for presenter) -->
        <div *ngIf="isHost && streamActive()" class="absolute bottom-4 right-4 w-48 sm:w-64 aspect-video rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-50 bg-gray-900 group">
           <video #mainVideo autoplay muted playsinline class="w-full h-full object-cover -scale-x-100"></video>
           <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
              <span class="text-[10px] font-bold text-white uppercase tracking-wider">Votre Retour</span>
           </div>
        </div>

        <!-- Moderator Controls: Pending Hand Raises -->
        <div *ngIf="isModerator() && pendingHandRaises().length > 0" class="absolute top-20 right-4 z-50 flex flex-col gap-3 w-80">
           <div *ngFor="let req of pendingHandRaises()" class="bg-gray-900/95 backdrop-blur-lg border border-teal-500/30 rounded-2xl p-4 shadow-2xl ring-1 ring-white/10 animate-[slideIn_0.3s_ease-out]">
              <div class="flex items-center gap-3 mb-3">
                 <div class="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-xl">✋</div>
                 <div class="flex flex-col min-w-0">
                    <span class="text-sm font-bold text-white truncate">{{ req.name }}</span>
                    <span class="text-[10px] text-teal-400 font-bold uppercase tracking-wider">Demande la parole</span>
                 </div>
              </div>
              <div class="flex gap-2">
                 <button (click)="acceptHand(req.peerId)" class="flex-1 bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold py-2 rounded-xl transition-all shadow-lg shadow-teal-900/20 active:scale-95">Accepter</button>
                 <button (click)="rejectHand(req.peerId)" class="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] font-bold py-2 rounded-xl transition-all active:scale-95">Refuser</button>
              </div>
           </div>
        </div>

        <!-- Subtitles Overlay -->
        <div *ngIf="isTranscribing() && currentTranscription()" 
             class="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-6 pointer-events-none">
          <div class="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-4 text-center">
             <p class="text-lg md:text-xl font-medium text-white drop-shadow-md leading-relaxed" [dir]="isRTL() ? 'rtl' : 'ltr'">
                {{ currentTranscription() }}
             </p>
          </div>
        </div>

        <!-- Waiting State Overlay -->
        <div *ngIf="!streamActive()" class="absolute inset-0 z-20 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm">
          <div class="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center shadow-xl">
            <div class="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-6 text-2xl" [class.text-emerald-500]="cameraReady()" [class.text-amber-500]="!cameraReady()">
               {{ cameraReady() ? '✓' : '⚙️' }}
            </div>
            <h2 class="text-xl font-bold text-white mb-2">{{ isHost ? 'Prêt pour le direct ?' : 'Préparation du flux' }}</h2>
            <p class="text-sm text-gray-400 mb-8 leading-relaxed">
              {{ isHost ? 'Votre caméra et votre microphone sont calibrés. Vous pouvez démarrer la diffusion.' : 'Le praticien configure son espace de diffusion. La conférence va bientôt démarrer.' }}
            </p>
            
            <div *ngIf="isHost">
              <button *ngIf="cameraReady() && isModerator()" (click)="startDiffusion()" class="w-full py-3 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(13,148,136,0.3)]">
                Démarrer la diffusion
              </button>
              <div *ngIf="!isModerator()" class="flex flex-col items-center gap-3">
                 <div class="animate-pulse text-amber-500 font-bold text-sm">En attente du lancement par l'organisateur...</div>
                 <p class="text-[10px] text-gray-500">Votre caméra est prête, vous apparaîtrez dès que le direct commencera.</p>
              </div>
              <div *ngIf="isModerator() && !cameraReady()" class="flex items-center justify-center gap-3 text-sm font-bold text-amber-500">
                <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Calibrage en cours...
              </div>
            </div>
            
            <div class="mt-6 pt-6 border-t border-gray-800 flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-widest">
               <span>Auditeurs en attente</span>
               <span class="text-white bg-gray-800 px-2.5 py-0.5 rounded-md">{{ participants().length }}</span>
            </div>
          </div>
        </div>

        <!-- HUD Controls -->
        <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-2xl shadow-xl" *ngIf="streamActive() || isHost">
          <ng-container *ngIf="isHost">
            <button (click)="toggleMic()" [class.text-red-500]="!micEnabled()" [class.bg-red-500_10]="!micEnabled()" class="w-12 h-12 rounded-xl flex items-center justify-center text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
              <svg *ngIf="micEnabled()" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
              <svg *ngIf="!micEnabled()" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
            </button>
            <button (click)="toggleVideo()" [class.text-red-500]="!videoEnabled()" [class.bg-red-500_10]="!videoEnabled()" class="w-12 h-12 rounded-xl flex items-center justify-center text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
              <svg *ngIf="videoEnabled()" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              <svg *ngIf="!videoEnabled()" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
            </button>
            <div class="w-px h-8 bg-gray-800 mx-2"></div>
            <button (click)="toggleScreenShare()" [class.text-teal-400]="screenSharing()" [class.bg-teal-500_10]="screenSharing()" class="w-12 h-12 rounded-xl flex items-center justify-center text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
               <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            </button>
            <ng-container *ngIf="isModerator()">
              <div class="w-px h-8 bg-gray-800 mx-1"></div>
              <button (click)="showInviteModal.set(true)" class="w-12 h-12 rounded-xl flex items-center justify-center text-teal-500 hover:bg-teal-500/10 transition-colors" title="Inviter un confrère">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
              </button>
            </ng-container>
          </ng-container>

          <!-- Transcription Control (Host & Spectator) -->
          <div class="w-px h-8 bg-gray-800 mx-2"></div>
          
          <div class="relative group h-12 flex items-center">
             <button (click)="toggleTranscription()" 
                     [class.text-teal-400]="isTranscribing()" 
                     [ngClass]="{'bg-teal-500/10': isTranscribing()}"
                     class="w-12 h-12 rounded-xl flex items-center justify-center text-gray-300 hover:bg-gray-800 transition-all">
                <span class="text-xs font-bold border-2 border-current px-1 rounded-md leading-none pt-0.5">CC</span>
             </button>

             <!-- Language Selector (Hover Popup) -->
             <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pb-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[100]">
                <div class="bg-gray-900 border border-gray-800 rounded-xl p-2 shadow-2xl flex flex-col gap-1 min-w-[140px]">
                   <button *ngFor="let lang of languages" 
                           (click)="setLanguage(lang.code)"
                           class="px-3 py-2 text-[10px] font-bold text-left rounded-lg transition-colors flex items-center justify-between"
                           [ngClass]="{'bg-teal-500/10': subtitleLanguage() === lang.code}"
                           [class.text-teal-400]="subtitleLanguage() === lang.code"
                           [class.text-gray-400]="subtitleLanguage() !== lang.code"
                           [class.hover:bg-gray-800]="subtitleLanguage() !== lang.code">
                      {{ lang.label }}
                      <span *ngIf="subtitleLanguage() === lang.code" class="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                   </button>
                </div>
             </div>
          </div>

          <ng-container *ngIf="!isHost">
            <button (click)="toggleFullscreen()" class="w-12 h-12 rounded-xl flex items-center justify-center text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
               <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
            </button>
            <button (click)="raiseHand()" [class.text-amber-500]="handRaised()" class="w-12 h-12 rounded-xl flex items-center justify-center text-gray-300 hover:bg-gray-800 transition-colors">
               <span class="text-xl">✋</span>
            </button>
          </ng-container>
        </div>

      </div>
    </div>

    <!-- Invitation Modal -->
    <div *ngIf="showInviteModal()" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div class="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-white">Inviter un Présentateur</h3>
            <p class="text-xs text-gray-500 mt-1">Recherchez un confrère pour l'inviter à intervenir.</p>
          </div>
          <button (click)="showInviteModal.set(false)" class="text-gray-500 hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div class="p-6">
          <div class="relative mb-6">
            <input [(ngModel)]="doctorSearchQuery" (input)="searchDoctors()" type="text" placeholder="Nom du docteur..." class="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-teal-500 transition-colors">
          </div>

          <div class="space-y-3 max-h-60 overflow-y-auto pr-2">
            <div *ngFor="let doc of foundDoctors()" class="flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors group">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 font-bold border border-teal-500/20">
                  {{ doc.firstName?.charAt(0) }}{{ doc.lastName?.charAt(0) }}
                </div>
                <div>
                  <h4 class="text-sm font-bold text-gray-200">Dr. {{ doc.firstName }} {{ doc.lastName }}</h4>
                  <p class="text-[10px] text-gray-500 uppercase tracking-wider">{{ doc.specialization || 'Médecin' }}</p>
                </div>
              </div>
              <button (click)="inviteDoctor(doc.id)" class="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold rounded-lg transition-all">
                Inviter
              </button>
            </div>
            <div *ngIf="doctorSearchQuery.length >= 2 && foundDoctors().length === 0" class="text-center py-8">
              <p class="text-xs text-gray-500">Aucun docteur trouvé.</p>
            </div>
          </div>

          <div *ngIf="inviteStatus()" [ngClass]="inviteStatus()?.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'" class="mt-4 p-3 rounded-xl border text-xs font-bold text-center">
            {{ inviteStatus()?.msg }}
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Sidebar -->
    <aside class="w-80 border-l border-gray-800 bg-gray-950 flex flex-col shrink-0">
      <div class="p-5 border-b border-gray-800">
        <h3 class="text-xs font-bold text-gray-100 uppercase tracking-widest flex items-center justify-between">
          Discussion
          <span class="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-[10px]">{{ messages().length }}</span>
        </h3>
      </div>

      <div #chatContainer class="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
        <div *ngFor="let msg of messages()" class="flex flex-col max-w-[90%] text-sm" [class.ml-auto]="isMe(msg)" [class.items-end]="isMe(msg)">
          <div class="flex items-center gap-2 mb-1.5" [class.flex-row-reverse]="isMe(msg)">
            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{{ msg.sender }}</span>
            <span *ngIf="msg.role === 'DOCTOR'" class="text-[8px] font-bold bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded border border-teal-500/20">DOC</span>
            <span *ngIf="msg.role === 'PARTICIPANT'" class="text-[8px] font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">PART</span>
          </div>
          <div (click)="setReply(msg)" class="group cursor-pointer rounded-2xl px-4 py-2.5 relative border"
               [ngClass]="{
                 'bg-teal-600 border-teal-500 text-white rounded-tr-sm': isMe(msg),
                 'bg-gray-900 border-gray-800 text-gray-300 rounded-tl-sm hover:border-gray-700': !isMe(msg) && msg.role !== 'DOCTOR',
                 'bg-teal-500/10 border-teal-500/30 text-gray-200 rounded-tl-sm': !isMe(msg) && msg.role === 'DOCTOR'
               }">
            <div *ngIf="msg.replyTo" class="mb-2 p-2 bg-black/20 rounded-xl border-l-2 border-current opacity-80 text-xs">
              <span class="font-bold mr-1">&#64;{{ msg.replyToSender }}</span>
              <span class="truncate block opacity-75">{{ msg.replyTo }}</span>
            </div>
            <p class="leading-relaxed">{{ msg.content }}</p>
          </div>
          <span class="text-[9px] text-gray-600 font-medium mt-1 mx-1" [class.text-right]="isMe(msg)">{{ msg.timestamp | date:'HH:mm' }}</span>
        </div>
      </div>

      <div class="p-4 border-t border-gray-800 bg-gray-950">
        <div *ngIf="replyingTo()" class="mb-3 px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between text-xs">
          <span class="text-gray-400">En réponse à <b class="text-gray-200">{{ replyingTo()?.sender }}</b></span>
          <button (click)="replyingTo.set(null)" class="text-gray-500 hover:text-gray-300">✕</button>
        </div>
        <div class="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl p-1.5 focus-within:border-gray-600 transition-colors">
          <input [(ngModel)]="currentMsg" (keyup.enter)="sendChat()" type="text" placeholder="Envoyer un message..." class="flex-1 bg-transparent border-none text-sm text-gray-100 placeholder-gray-600 px-3 py-2 focus:outline-none focus:ring-0">
          <button (click)="sendChat()" [disabled]="!currentMsg.trim()" class="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 flex items-center justify-center disabled:opacity-50 hover:bg-gray-700 hover:text-white transition-colors">
             <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
          </button>
        </div>
      </div>
    </aside>
  </main>
</div>
  `,
  styles: [`
    .bg-red-500_10 { background-color: rgba(239, 68, 68, 0.1); }
    .bg-teal-500_10 { background-color: rgba(20, 184, 166, 0.1); }
  `]
})
export class VirtualRoomComponent implements OnInit, OnDestroy {
  @ViewChild('mainVideo') mainVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('pipVideo')  pipVideoRef!:  ElementRef<HTMLVideoElement>;
  @ViewChild('chatContainer') chatContainer!: ElementRef<HTMLDivElement>;

  eventTitle = signal(''); streamActive = signal(false); myPeerId = signal('');
  participants = signal<Participant[]>([]); messages = signal<ChatMessage[]>([]);
  cameraReady = signal(false); camError = signal(''); currentMsg = '';
  micEnabled = signal(true); videoEnabled = signal(true); screenSharing = signal(false);
  isRecording = signal(false); handRaised = signal(false); replyingTo = signal<ChatMessage | null>(null);
  remoteStreams = signal<{peerId: string, stream: MediaStream}[]>([]);
  pendingHandRaises = signal<{peerId: string, name: string}[]>([]);
  speakerIds = signal<number[]>([]);

  // Transcription
  isTranscribing = signal(false);
  currentTranscription = signal('');
  subtitleLanguage = signal('fr-FR');
  private recognition: any = null;
  languages = [
    { code: 'fr-FR', label: 'Français' },
    { code: 'en-US', label: 'English' },
    { code: 'ar-SA', label: 'العربية' }
  ];

  isModerator = signal(false);
  showInviteModal = signal(false);
  doctorSearchQuery = '';
  foundDoctors = signal<any[]>([]);
  inviteStatus = signal<{msg: string, type: 'success' | 'error'} | null>(null);

  isHost = false; eventId: string | null = null; me = signal<any>(null);
  private peer: any = null; 
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private broadcastStream: MediaStream = new MediaStream();
  
  private pollTimer: any = null; 
  private participantPollTimer: any = null;
  private calledPeers = new Set<string>(); 
  private activeConnections = new Set<any>(); 
  private stompClient: Client | null = null;

  private authFacade = inject(AuthFacade); private eventService = inject(EventService);
  private route = inject(ActivatedRoute); private router = inject(Router); private zone = inject(NgZone);

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id');
    this.authFacade.currentUser$.subscribe(user => { if (user) { this.me.set(user); if (this.eventId) this.resolveRole(); } });
    this.initChat();
    this.initSpeech();
  }
  ngOnDestroy() { 
    this.cleanup(); 
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
  }

  private beforeUnloadHandler = () => {
    if (this.eventId && this.myPeerId()) {
      if (this.isHost) this.eventService.unregisterHost(this.eventId, this.myPeerId()).subscribe();
      else this.eventService.unregisterSpectator(this.eventId, this.myPeerId()).subscribe();
    }
  };

  private resolveRole() {
    if (!this.eventId) return;
    window.addEventListener('beforeunload', this.beforeUnloadHandler);

    this.eventService.getEventById(Number(this.eventId)).subscribe({
      next: ev => {
        if (ev) {
          this.eventTitle.set(ev.title);
          const u = this.me();
          const isOrganizer = (u?.email?.toLowerCase() === (ev as any).organizerEmail?.toLowerCase()) || (u?.id == ev.organizerId);
          const isSpeaker = ev.speakers?.some(s => s.id == u?.id || s.email?.toLowerCase() === u?.email?.toLowerCase());
          
          // Track all official speaker/organizer IDs
          const ids = (ev.speakers || []).map(s => s.id).filter((id): id is number => !!id);
          if (ev.organizerId) ids.push(ev.organizerId);
          this.speakerIds.set(Array.from(new Set(ids)));

          this.isModerator.set(isOrganizer);
          this.isHost = !!(isOrganizer || isSpeaker);
          console.log('[ROOM] Role resolved:', this.isHost ? 'HOST' : 'SPECTATOR');

          // Persistance: Check if event is already live
          this.eventService.getSignal(this.eventId!).subscribe(sig => {
             if (sig.hosts && sig.hosts.length > 0) {
                console.log('[ROOM] Conference is already LIVE, auto-rejoining...');
                this.streamActive.set(true);
                if (this.isHost) {
                   this.startHostCamera().then(() => this.startDiffusion());
                }
             }
          });
        }
        this.startParticipantPolling(); 
        this.loadPeerJS();
      },
      error: () => {
        console.error('[ROOM] Failed to fetch event details');
        this.loadPeerJS(); // Try anyway
      }
    });
  }

  // --- INVITATION LOGIC ---
  searchDoctors() {
    if (this.doctorSearchQuery.length < 2) {
      this.foundDoctors.set([]);
      return;
    }
    this.eventService.searchDoctors(this.doctorSearchQuery).subscribe({
      next: (res) => {
        this.foundDoctors.set(res.content || []);
      }
    });
  }

  inviteDoctor(docId: number) {
    if (!this.eventId) return;
    this.eventService.addSpeaker(Number(this.eventId), docId).subscribe({
      next: () => {
        this.inviteStatus.set({ msg: 'Docteur ajouté en tant que présentateur !', type: 'success' });
        setTimeout(() => this.inviteStatus.set(null), 3000);
      },
      error: (err) => {
        this.inviteStatus.set({ msg: 'Erreur: ' + (err.error?.message || 'Inconnu'), type: 'error' });
        setTimeout(() => this.inviteStatus.set(null), 3000);
      }
    });
  }

  // --- TRANSCRIPTION LOGIC ---
  private initSpeech() {
    const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Speech) return;
    this.recognition = new Speech();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.subtitleLanguage();

    this.recognition.onresult = (event: any) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
      }
      if (final.trim() && this.isHost) {
        this.sendTranscriptionToAll(final);
      }
    };
    this.recognition.onerror = () => { if (this.isTranscribing()) setTimeout(() => this.recognition.start(), 1000); };
  }

  toggleTranscription() {
    this.isTranscribing.set(!this.isTranscribing());
    if (this.isHost && this.recognition) {
      if (this.isTranscribing()) this.recognition.start();
      else this.recognition.stop();
    }
  }

  setLanguage(l: string) {
    this.subtitleLanguage.set(l);
    if (this.recognition) {
       this.recognition.lang = l;
       if (this.isTranscribing() && this.isHost) {
          this.recognition.stop();
          setTimeout(() => this.recognition.start(), 300);
       }
    }
  }

  isRTL() { return this.subtitleLanguage().startsWith('ar'); }

  private sendTranscriptionToAll(text: string) {
    this.stompClient?.publish({
      destination: `/app/chat/${this.eventId}/send`,
      body: JSON.stringify({ sender: 'SYSTEM', content: `[CC] ${text}`, role: 'DOCTOR', timestamp: new Date().toISOString() })
    });
  }

  toggleMic() { if (this.localStream) { const t = this.localStream.getAudioTracks()[0]; if (t) { t.enabled = !t.enabled; this.micEnabled.set(t.enabled); } } }
  toggleVideo() { if (this.localStream) { const t = this.localStream.getVideoTracks()[0]; if (t) { t.enabled = !t.enabled; this.videoEnabled.set(t.enabled); } } }
  
  async toggleScreenShare() {
     if (this.screenSharing()) { 
       this.stopScreenShare(); 
     } else { 
       try { 
         this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true }); 
         this.screenSharing.set(true);
         const vTrack = this.screenStream.getVideoTracks()[0];
         
         if (this.mainVideoRef) this.mainVideoRef.nativeElement.srcObject = this.screenStream;
         if (this.pipVideoRef) this.pipVideoRef.nativeElement.srcObject = this.localStream;

         this.updateBroadcastTrack(vTrack);
         vTrack.onended = () => this.stopScreenShare();
       } catch (err) { console.error('[SCREEN] Error:', err); }
     }
  }

  private dummyCanvas: HTMLCanvasElement | null = null;
  private dummyStream: MediaStream | null = null;
  private getDummyStream(): MediaStream {
    if (!this.dummyStream) {
      this.dummyCanvas = document.createElement('canvas'); 
      this.dummyCanvas.width = 1; this.dummyCanvas.height = 1;
      // Draw something so it's not completely empty
      const ctx = this.dummyCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 1, 1);
        setInterval(() => {
          ctx.fillStyle = Math.random() > 0.5 ? '#000000' : '#000001';
          ctx.fillRect(0, 0, 1, 1);
        }, 1000);
      }
      this.dummyStream = (this.dummyCanvas as any).captureStream(1);
    }
    return this.dummyStream!;
  }

  private stopScreenShare() {
    this.screenSharing.set(false);
    if (this.screenStream) { this.screenStream.getTracks().forEach(t => t.stop()); this.screenStream = null; }
    if (this.mainVideoRef) this.mainVideoRef.nativeElement.srcObject = this.localStream;
    const camTrack = this.localStream?.getVideoTracks()[0];
    if (camTrack) this.updateBroadcastTrack(camTrack);
  }

  private updateBroadcastTrack(newTrack: MediaStreamTrack) {
    this.broadcastStream.getVideoTracks().forEach(t => this.broadcastStream.removeTrack(t));
    this.broadcastStream.addTrack(newTrack);
    
    this.activeConnections.forEach((conn: any) => {
      try {
        const sender = conn.peerConnection.getSenders().find((s: any) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(newTrack);
      } catch (e) {}
    });
  }

  simulateRecording() { this.isRecording.set(!this.isRecording()); }
  toggleFullscreen() { const e = this.mainVideoRef?.nativeElement; if (e?.requestFullscreen) e.requestFullscreen(); }
  
  // --- HAND RAISE LOGIC ---
  raiseHand() {
    if (!this.eventId || !this.myPeerId()) return;
    const user = this.me();
    const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Anonyme';
    
    if (!this.handRaised()) {
      // 1. Register in persistent backend state
      this.eventService.requestToSpeak(this.eventId, this.myPeerId(), name).subscribe({
        next: () => {
          this.handRaised.set(true);
          // 2. Send instant WebSocket notification for those already in room
          const payload = JSON.stringify({ type: 'RAISE_HAND', peerId: this.myPeerId(), name });
          this.sendChatInternal(`[ACTION]${payload}`, true);
          this.sendChatInternal('✋ A demandé la parole', true);
        }
      });
    } else {
      this.handRaised.set(false);
      const payload = JSON.stringify({ type: 'LOWER_HAND', peerId: this.myPeerId() });
      this.sendChatInternal(`[ACTION]${payload}`, true);
      this.sendChatInternal('🤚 A baissé la main', true);
    }
  }

  acceptHand(peerId: string) {
    if (!this.eventId) return;
    this.eventService.handleHandRaise(this.eventId, peerId, 'ACCEPT').subscribe({
      next: () => {
        // Notify via WebSocket for immediate action
        const payload = JSON.stringify({ type: 'PROMOTED', peerId });
        this.sendChatInternal(`[ACTION]${payload}`, true);
        this.pendingHandRaises.update(old => old.filter(p => p.peerId !== peerId));
      }
    });
  }

  rejectHand(peerId: string) {
    if (!this.eventId) return;
    this.eventService.handleHandRaise(this.eventId, peerId, 'REJECT').subscribe({
      next: () => {
        const payload = JSON.stringify({ type: 'REJECT_HAND', peerId });
        this.sendChatInternal(`[ACTION]${payload}`, true);
        this.pendingHandRaises.update(old => old.filter(p => p.peerId !== peerId));
      }
    });
  }

  isPermanentSpeaker(peerId: string): boolean {
    try {
      const userId = Number(peerId.split('_')[0]);
      return this.speakerIds().includes(userId);
    } catch (e) { return false; }
  }

  excludeParticipant(peerId: string) {
     if (this.isPermanentSpeaker(peerId)) return; // Protection
     if (confirm('Voulez-vous vraiment exclure cet intervenant ?')) {
        const payload = JSON.stringify({ type: 'EXCLUDE_HAND', peerId });
        this.sendChatInternal(`[ACTION]${payload}`, true);
     }
  }

  private promoteToHost() {
    this.handRaised.set(false);
    this.isHost = true;
    console.log('[PEERJS] Promoted to HOST!');
    this.camError.set('Demande acceptée ! Passage en mode présentateur...');
    setTimeout(() => this.camError.set(''), 4000);
    
    this.eventService.unregisterSpectator(this.eventId!, this.myPeerId()!).subscribe({
       next: () => {
          this.startHostCamera().then(() => {
             this.startDiffusion();
             this.sendChatInternal('🎥 A rejoint en tant que présentateur', true);
          });
       }
    });
  }

  private demoteToSpectator() {
    if (this.isModerator()) return; // Protection: Moderator cannot be demoted
    
    this.isHost = false;
    this.streamActive.set(false);
    this.cameraReady.set(false);
    this.camError.set('Vous avez été replacé en spectateur.');
    setTimeout(() => this.camError.set(''), 4000);
    
    if (this.localStream) { this.localStream.getTracks().forEach(t => t.stop()); this.localStream = null; }
    if (this.screenStream) { this.screenStream.getTracks().forEach(t => t.stop()); this.screenStream = null; }
    this.screenSharing.set(false);
    
    this.eventService.unregisterHost(this.eventId!, this.myPeerId()!).subscribe();
    this.eventService.registerSpectator(this.eventId!, this.myPeerId()!).subscribe();
    
    this.activeConnections.forEach(c => c.close());
    this.activeConnections.clear();
    this.calledPeers.clear();
    this.remoteStreams.set([]);
    
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.sendChatInternal('🚶 Est redevenu simple participant', true);
  }

  private handleActionMessage(m: ChatMessage) {
    try {
       const actionData = JSON.parse(m.content.substring(8));
       if (actionData.type === 'RAISE_HAND') {
         if (this.isHost && actionData.peerId !== this.myPeerId()) {
            this.pendingHandRaises.update(old => {
               if (!old.find(p => p.peerId === actionData.peerId)) return [...old, { peerId: actionData.peerId, name: actionData.name }];
               return old;
            });
         }
       } else if (actionData.type === 'PROMOTED' && actionData.peerId === this.myPeerId()) {
         this.promoteToHost();
       } else if (actionData.type === 'LOWER_HAND') {
         this.pendingHandRaises.update(old => old.filter(p => p.peerId !== actionData.peerId));
       } else if (actionData.type === 'REJECT_HAND' && actionData.peerId === this.myPeerId()) {
         this.handRaised.set(false);
         this.camError.set('Demande refusée.');
         setTimeout(() => this.camError.set(''), 4000);
       } else if (actionData.type === 'EXCLUDE_HAND') {
         if (actionData.peerId === this.myPeerId()) {
            if (this.isModerator()) {
               console.warn('[ROOM] Attempted to exclude moderator - IGNORED');
               return;
            }
            this.demoteToSpectator();
         } else {
           // Clean up the excluded peer's video locally
           const connToClose = Array.from(this.activeConnections).find((c: any) => c.peer === actionData.peerId);
           if (connToClose) { (connToClose as any).close(); this.activeConnections.delete(connToClose); }
           this.calledPeers.delete(actionData.peerId);
           this.remoteStreams.update(old => old.filter(rs => rs.peerId !== actionData.peerId));
         }
       } else if (actionData.type === 'END_SESSION') {
         this.camError.set('La conférence a été terminée par l\'organisateur.');
         setTimeout(() => {
            this.cleanup();
            this.router.navigate(['/']);
         }, 3000);
       } else if (actionData.type === 'START_SESSION') {
         console.log('[ROOM] Moderator started the session. Syncing...');
         if (this.isHost && !this.streamActive()) {
            this.startHostCamera().then(() => this.startDiffusion());
         } else {
            this.streamActive.set(true);
         }
       }
    } catch(e) {}
  }

  private initChat() {
    const s = new SockJS(`${environment.apiUrl}/ws-mediconnect`);
    this.stompClient = new Client({ webSocketFactory: () => s, reconnectDelay: 5000 });
    this.stompClient.onConnect = () => {
      this.stompClient?.subscribe(`/topic/chat/${this.eventId}`, (p) => {
        const m = JSON.parse(p.body);
        this.zone.run(() => { 
          if (m.content.startsWith('[CC]')) {
            this.currentTranscription.set(m.content.replace('[CC] ', ''));
            setTimeout(() => this.currentTranscription.set(''), 4000);
          } else if (m.content.startsWith('[ACTION]')) {
            this.handleActionMessage(m);
          } else {
            this.messages.update(old => [...old, m]); 
            this.scrollToBottom(); 
          }
        });
      });
    };
    this.stompClient.activate();
  }

  sendChat() { if (!this.currentMsg.trim() || !this.stompClient?.connected) return; this.sendChatInternal(this.currentMsg); this.currentMsg = ''; this.replyingTo.set(null); }
  private sendChatInternal(c: string, sys = false) {
    const user = this.me();
    const n = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Anonyme';
    const m: ChatMessage = { 
      senderId: user?.id,
      sender: n, 
      content: c, 
      role: this.isHost ? 'DOCTOR' : 'PARTICIPANT', 
      timestamp: new Date().toISOString() 
    };
    if (!sys && this.replyingTo()) { m.replyTo = this.replyingTo()?.content; m.replyToSender = this.replyingTo()?.sender; }
    this.stompClient?.publish({ destination: `/app/chat/${this.eventId}/send`, body: JSON.stringify(m) });
  }
  isMe(msg: ChatMessage) { 
    const user = this.me();
    // Strict comparison by ID only to support test accounts with same names
    return !!(msg.senderId && user?.id && msg.senderId === user.id);
  }
  private scrollToBottom() { setTimeout(() => { if (this.chatContainer) this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight; }, 100); }
  setReply(m: ChatMessage) { this.replyingTo.set(m); }

  private loadPeerJS() {
    if ((window as any).Peer) { this.initPeer(); return; }
    const s = document.createElement('script'); s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    s.onload = () => this.initPeer(); document.head.appendChild(s);
  }
  private initPeer() {
    // Use sessionStorage to keep the same PeerID for this tab across refreshes
    let tabId = sessionStorage.getItem('medievent_tab_id');
    if (!tabId) {
      tabId = Math.random().toString(36).substring(7);
      sessionStorage.setItem('medievent_tab_id', tabId);
    }
    
    const customId = (this.me()?.id || 'anon') + "_" + this.eventId + "_" + tabId;
    console.log('[PEERJS] Initializing with ID:', customId);
    this.peer = new Peer(customId);
    this.peer.on('open', (id: string) => this.zone.run(() => {
      console.log('[PEERJS] Opened with ID:', id);
      this.myPeerId.set(id);
      if (this.isHost) {
        console.log('[PEERJS] User is HOST, starting camera...');
        this.startHostCamera();
      } else {
        console.log('[PEERJS] User is SPECTATOR, registering...');
        this.eventService.registerSpectator(this.eventId!, id).subscribe({
           next: (res) => console.log('[PEERJS] Spectator registered. Host live:', res.hostIsLive),
           error: (err) => console.error('[PEERJS] Registration failed:', err)
        });
      }
    }));
    this.peer.on('error', (err: any) => console.error('[PEERJS] Global Peer Error:', err));
    this.peer.on('call', (c: any) => this.zone.run(() => { 
      console.log('[PEERJS] Incoming call from:', c.peer);
      c.answer(this.localStream || this.getDummyStream());
      
      this.activeConnections.add(c);
      this.calledPeers.add(c.peer);

      c.on('stream', (s: MediaStream) => this.zone.run(() => { 
        if (!s) return;
        console.log('[PEERJS] Stream received from:', c.peer);
        
        this.eventService.getSignal(this.eventId!).subscribe(sig => {
          const hosts = sig.hosts || [];
          if (hosts.includes(c.peer)) {
             const myUid = this.me()?.id;
             if (myUid && c.peer.startsWith(myUid + '_')) {
               console.log('[PEERJS] Skipping self-stream from another tab');
               return;
             }
             this.streamActive.set(true);
             this.remoteStreams.update(old => {
               if (old.some(rs => rs.peerId === c.peer)) return old;
               return [...old, { peerId: c.peer, stream: s }];
             });
          }
        });
      })); 
      c.on('close', () => this.zone.run(() => {
        this.activeConnections.delete(c);
        this.calledPeers.delete(c.peer);
        this.remoteStreams.update(old => old.filter(rs => rs.peerId !== c.peer));
      }));
    }));
  }

  private mockCanvas: HTMLCanvasElement | null = null;

  private async startHostCamera() { 
    try { 
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); 
      this.cameraReady.set(true); 
    } catch (e: any) { 
      this.camError.set('Caméra indisponible - Mode Simulation'); 
      this.localStream = this.createMockStream();
      this.cameraReady.set(true);
    } 
  }

  private createMockStream(): MediaStream {
    this.mockCanvas = document.createElement('canvas'); 
    this.mockCanvas.width = 640; this.mockCanvas.height = 480;
    const ctx = this.mockCanvas.getContext('2d');
    if (ctx) {
      const draw = () => {
        if (!this.mockCanvas) return;
        ctx.fillStyle = '#0d9488'; ctx.fillRect(0, 0, this.mockCanvas.width, this.mockCanvas.height);
        ctx.fillStyle = '#ffffff'; ctx.font = '30px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Caméra Indisponible', this.mockCanvas.width / 2, this.mockCanvas.height / 2);
        // Small moving indicator to force frames
        const time = new Date().getTime();
        ctx.fillStyle = (time % 1000 < 500) ? '#ffffff' : '#0d9488';
        ctx.beginPath(); ctx.arc(this.mockCanvas.width / 2, this.mockCanvas.height / 2 + 50, 10, 0, Math.PI * 2); ctx.fill();
      };
      draw();
      setInterval(draw, 100); // 10 FPS is enough to keep the WebRTC track alive
    }
    const canvasStream = (this.mockCanvas as any).captureStream(15);
    return canvasStream;
  }
  
  startDiffusion() { 
    if (!this.localStream || !this.eventId || !this.myPeerId()) return;
    this.eventService.registerHost(this.eventId, this.myPeerId()).subscribe({
      next: () => {
        this.zone.run(() => {
          // Fresh start for connections when going live
          this.activeConnections.forEach(c => c.close());
          this.activeConnections.clear();
          this.calledPeers.clear();
          
          this.streamActive.set(true);
          setTimeout(() => {
            if (this.mainVideoRef?.nativeElement && this.localStream) { 
              this.mainVideoRef.nativeElement.srcObject = this.localStream; 
              this.mainVideoRef.nativeElement.play().catch(err => console.warn('[VIDEO] Play error:', err)); 
            }
          }, 500);

          if (this.isModerator()) {
            const payload = JSON.stringify({ type: 'START_SESSION' });
            this.sendChatInternal(`[ACTION]${payload}`, true);
          }

          this.triggerBroadcast();
          this.startPollingSpectators();
        });
      }
    });
  }

  private startPollingSpectators() { 
    this.pollTimer = setInterval(() => {
      if (this.isHost && this.streamActive()) {
        // Heartbeat for host
        this.eventService.registerHost(this.eventId!, this.myPeerId()).subscribe();
        this.triggerBroadcast();
      }
    }, 4000); 
  }

  private triggerBroadcast() {
    if (!this.eventId) return;
    this.eventService.getSpectators(this.eventId).subscribe(d => {
      this.eventService.getSignal(this.eventId!).subscribe(sig => {
        const spectators = (d.spectators || []) as string[];
        const hosts = (sig.hosts || []) as string[];
        const peers = [...spectators, ...hosts];
        
        peers.forEach(sid => {
          if (sid !== this.myPeerId() && !this.calledPeers.has(sid)) {

            console.log('[PEERJS] Host calling peer:', sid);
            this.calledPeers.add(sid);
            const call = this.peer.call(sid, this.localStream || this.getDummyStream());
            if (call) {
              this.activeConnections.add(call);
              call.on('stream', (s: MediaStream) => this.zone.run(() => {
                console.log('[PEERJS] Stream received from called peer:', sid);
                if (hosts.includes(sid)) {
                   const myUid = this.me()?.id;
                   if (myUid && sid.startsWith(myUid + '_')) return; // Skip self
                   this.streamActive.set(true);
                   this.remoteStreams.update(old => {
                    const exists = old.find(rs => rs.peerId === sid);
                    if (exists) return old;
                    return [...old, { peerId: sid, stream: s }];
                  });
                }
              }));
              call.on('close', () => { this.activeConnections.delete(call); this.calledPeers.delete(sid); });
            }
          }
        });
      });
    });
  }

  private startParticipantPolling() { 
    this.participantPollTimer = setInterval(() => { 
      if (this.eventId) {
        if (!this.isHost && this.myPeerId()) {
          this.eventService.registerSpectator(this.eventId, this.myPeerId()).subscribe();
        }
        this.eventService.getEventParticipants(Number(this.eventId)).subscribe(l => this.participants.set(l)); 
        
        if (this.isModerator()) {
          this.eventService.getPendingHandRaises(this.eventId).subscribe(res => this.pendingHandRaises.set(res));
        }
      }
    }, 8000); 
  }

  leave() { 
    if (this.isHost && this.eventId && this.myPeerId()) this.eventService.unregisterHost(this.eventId, this.myPeerId()).subscribe();
    if (!this.isHost && this.eventId && this.myPeerId()) this.eventService.unregisterSpectator(this.eventId, this.myPeerId()).subscribe(); 
    this.cleanup(); 
    this.router.navigate([this.isHost ? '/doctor/events/my' : '/events']); 
  }
  endSession() { 
    if (confirm('Voulez-vous vraiment terminer la conférence pour tous les participants ?')) {
       const payload = JSON.stringify({ type: 'END_SESSION' });
       this.sendChatInternal(`[ACTION]${payload}`, true);
       if (this.eventId && this.myPeerId()) this.eventService.unregisterHost(this.eventId, this.myPeerId()).subscribe(); 
       this.cleanup(); 
       this.router.navigate(['/']); 
    }
  }
  private cleanup() { clearInterval(this.pollTimer); clearInterval(this.participantPollTimer); this.localStream?.getTracks().forEach(t => t.stop()); this.screenStream?.getTracks().forEach(t => t.stop()); this.peer?.destroy(); this.stompClient?.deactivate(); if (this.recognition) this.recognition.stop(); }
}
