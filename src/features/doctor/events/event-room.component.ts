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
<div class="room-root">
  <!-- Top Glass Header -->
  <header class="room-header">
    <div class="brand-zone">
      <div class="logo-orb">
        <div class="orb-inner"></div>
      </div>
      <div class="brand-text">
        <h1 class="room-title">{{ eventTitle() || 'Conférence MediConnect' }}</h1>
        <div class="room-meta">
          <span class="live-status" [class.is-live]="streamActive()">
            <span class="pulse-dot"></span>
            {{ streamActive() ? 'SESSION EN DIRECT' : 'EN ATTENTE DU PRATICIEN' }}
          </span>
          <span class="sep">/</span>
          <span class="room-id">ID: {{ eventId }}</span>
        </div>
      </div>
    </div>

    <div class="session-stats-modern" *ngIf="streamActive()">
      <div class="stat-box">
        <div class="stat-icon-container">👥</div>
        <div class="stat-content">
          <span class="stat-value">{{ participants().length }}</span>
          <span class="stat-label uppercase tracking-widest text-[8px]">In-Studio</span>
        </div>
      </div>
      <div class="stat-divider-vertical"></div>
      <div class="stat-box">
        <div class="stat-icon-container animate-pulse-slow">📡</div>
        <div class="stat-content">
          <span class="stat-value text-emerald-400">Stable</span>
          <span class="stat-label uppercase tracking-widest text-[8px]">Stream</span>
        </div>
      </div>
    </div>

    <div class="header-actions">
      <button (click)="leave()" class="btn-quit-premium">
        <span>QUITTER</span>
      </button>
      <button *ngIf="isHost && streamActive()" (click)="endSession()" class="btn-terminate-premium">
         STOP SESSION
      </button>
    </div>
  </header>

  <main class="room-content">
    <!-- Immersive Stage -->
    <div class="video-stage">
      <!-- Main Scene -->
      <div class="scene-container" [class.screen-layout]="screenSharing()">
        <video #mainVideo autoplay playsinline class="main-canvas"></video>
        <div class="vignette-overlay"></div>
        <div id="reactions-layer" class="reactions-portal"></div>
      </div>

      <!-- Preparation / Waiting State (MISSION CONTROL REDESIGN) -->
      <div *ngIf="!streamActive()" class="stage-overlay mission-control-overlay">
        <div class="cockpit-container">
          <div class="cockpit-header">
             <div class="pulse-status">
                <span class="pulse-dot-large"></span>
                PRE-FLIGHT CHECK
             </div>
             <p class="cockpit-id">Session: {{ eventId }}</p>
          </div>

          <div class="calibration-grid">
             <div class="cal-item" [class.cal-ok]="cameraReady()">
                <span class="cal-icon">{{ cameraReady() ? '✓' : '⚡' }}</span>
                <div class="cal-info">
                   <p class="cal-label">OPTICS</p>
                   <p class="cal-status">{{ cameraReady() ? 'CALIBRATED' : 'SCANNING...' }}</p>
                </div>
             </div>
             <div class="cal-item cal-ok">
                <span class="cal-icon">✓</span>
                <div class="cal-info">
                   <p class="cal-label">SIGNAL</p>
                   <p class="cal-status">STABLE 5.0ms</p>
                </div>
             </div>
          </div>

          <div class="hero-center animate-pulse-slow">
            <h2 class="cockpit-title">{{ isHost ? 'Prêt pour le Direct ?' : 'Préparation du Flux...' }}</h2>
            <p class="cockpit-desc">
              {{ isHost ? 'Votre configuration est optimale. Les auditeurs attendent votre signal de diffusion.' : 'Communication établie. Le praticien initialise son studio. Préparez-vous.' }}
            </p>
          </div>
          
          <div class="cockpit-actions" *ngIf="isHost">
             <button *ngIf="cameraReady()" (click)="startDiffusion()" class="btn-ignition">
                <span class="btn-inner">INITIALISER LA DIFFUSION</span>
                <div class="btn-flare"></div>
             </button>
             <div *ngIf="!cameraReady()" class="calibration-waiting">
                <span class="spinner-pro"></span> 
                {{ camError() || 'Calibrage des systèmes en cours...' }}
             </div>
          </div>

          <div class="cockpit-footer">
             <div class="waiting-counter">
                <span class="count-value">{{ participants().length }}</span>
                <span class="count-label">AUDITEURS EN ATTENTE</span>
             </div>
          </div>
        </div>
      </div>

      <!-- Floating HUD Controls (PROFESSIONAL SVG) -->
      <div class="room-hud" *ngIf="streamActive()">
        <div class="hud-pill shadow-2xl">
          <!-- Primary Controls -->
          <div class="hud-section" *ngIf="isHost">
            <div class="host-label-hud">
               <span class="host-dot"></span>
               HOST
            </div>
            <button (click)="toggleMic()" class="control-btn" [class.off]="!micEnabled()" title="Microphone">
              <svg *ngIf="micEnabled()" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
              <svg *ngIf="!micEnabled()" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
            </button>
            <button (click)="toggleVideo()" class="control-btn" [class.off]="!videoEnabled()" title="Caméra">
              <svg *ngIf="videoEnabled()" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"></path><rect width="14" height="12" x="2" y="6" rx="2" ry="2"></rect></svg>
              <svg *ngIf="!videoEnabled()" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 6 4V4l-6 4"></path><path d="m7 2 1 2"></path><path d="m2 7 2 1"></path><path d="m2 2 20 20"></path><path d="M7 21v-4.5"></path><path d="M11 21v-4.5"></path><path d="M15 21v-4.5"></path></svg>
            </button>
            <div class="hud-divider"></div>
            <button (click)="toggleScreenShare()" class="control-btn" [class.active]="screenSharing()" title="Partage d'écran">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            </button>
            <button (click)="simulateRecording()" class="control-btn rec-btn" [class.is-rec]="isRecording()" title="Enregistrer">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>

          <!-- Participant Controls -->
          <div class="hud-section" *ngIf="!isHost">
            <button (click)="toggleFullscreen()" class="control-btn" title="Plein écran">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
            </button>
            <button (click)="raiseHand()" class="control-btn" [class.active-hand]="handRaised()" title="Lever la main">
               <span>✋</span>
            </button>
          </div>

          <div class="hud-divider"></div>

          <!-- Reaction Hub -->
          <div class="hud-section reaction-group">
            <button (click)="sendReaction('❤️')" class="emoji-btn">❤️</button>
            <button (click)="sendReaction('👏')" class="emoji-btn">👏</button>
            <button (click)="sendReaction('🔥')" class="emoji-btn">🔥</button>
            <button (click)="sendReaction('💡')" class="emoji-btn">💡</button>
          </div>
        </div>
      </div>

      <!-- Host PIP -->
      <div *ngIf="isHost && streamActive()" class="pip-frame-premium shadow-2xl glass" [class.pip-expanded]="!screenSharing()">
        <video #pipVideo autoplay muted playsinline class="pip-video-feed"></video>
        <div class="pip-tag-premium">
          <span class="live-dot"></span> MÉDECIN (VOUS)
        </div>
      </div>
    </div>

    <!-- Sidebar Chat (Ultra Modern) -->
    <aside class="room-sidebar-premium">
      <div class="sidebar-container glass">
        <div class="sidebar-top-tab">
          <div class="tab-header">
            <h3>DISCUSSION EN DIRECT</h3>
            <span class="live-count-badge">{{ participants().length }}</span>
          </div>
          <p class="tab-subtitle">Posez vos questions au praticien</p>
        </div>

        <div #chatContainer class="chat-feed-modern">
          <div *ngFor="let msg of messages()" class="modern-msg" [class.is-mine]="isMe(msg)" [class.is-doctor]="msg.role === 'DOCTOR'">
            <div class="msg-meta">
              <span class="msg-author">{{ msg.sender }}</span>
              <span class="msg-badge" *ngIf="msg.role === 'DOCTOR'">DOCTEUR</span>
            </div>
            
            <div (click)="setReply(msg)" class="msg-block shadow-sm">
              <div *ngIf="msg.replyTo" class="msg-reply-hint">
                <span class="reply-name">&#64;{{ msg.replyToSender }}</span>
                <p class="reply-snippet">{{ msg.replyTo }}</p>
              </div>
              <p class="msg-content-text">{{ msg.content }}</p>
            </div>
            
            <span class="msg-timestamp">{{ msg.timestamp | date:'HH:mm' }}</span>
          </div>
        </div>

        <div class="chat-bottom-compose">
          <div *ngIf="replyingTo()" class="replying-to-bar glass-medium">
            <div class="reply-details">
              <span class="reply-to-author">Rép. à <b>{{ replyingTo()?.sender }}</b></span>
            </div>
            <button (click)="replyingTo.set(null)" class="reply-close">×</button>
          </div>
          
          <div class="input-modern-wrapper glass shadow-inner">
            <input [(ngModel)]="currentMsg" (keyup.enter)="sendChat()" placeholder="Exprimez-vous...">
            <button (click)="sendChat()" class="btn-send-modern" [disabled]="!currentMsg.trim()">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>
      </div>
    </aside>
  </main>
</div>
  `,
  styles: [`
    :host { 
        --primary: #0d9488; 
        --primary-glow: rgba(13, 148, 136, 0.4);
        --danger: #ef4444;
        --dark-bg: #030303;
        --card-bg: rgba(15, 15, 18, 0.85);
        --glass-border: rgba(255, 255, 255, 0.08);
    }

    .room-root { height: 100vh; display: flex; flex-direction: column; background: var(--dark-bg); font-family: 'Outfit', sans-serif; color: #f8fafc; overflow: hidden; }

    /* Header */
    .room-header { height: 85px; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; background: rgba(3,3,3,0.8); backdrop-filter: blur(25px); border-bottom: 1px solid var(--glass-border); z-index: 100; }
    .brand-zone { display: flex; align-items: center; gap: 20px; }
    .logo-orb { width: 44px; height: 44px; background: var(--primary); border-radius: 14px; position: relative; overflow: hidden; }
    .orb-inner { position: absolute; inset: 10px; border: 3px solid #000; border-radius: 8px; }
    .room-title { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; margin: 0; background: linear-gradient(to right, #fff, #999); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .room-meta { font-size: 10px; font-weight: 800; color: #444; display: flex; gap: 8px; margin-top: 4px; }
    .live-status { display: flex; align-items: center; gap: 8px; color: #f59e0b; }
    .live-status.is-live { color: #10b981; }
    .pulse-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
    .is-live .pulse-dot { animation: pulse-ring 2s infinite; }

    .session-stats { display: flex; align-items: center; gap: 30px; background: rgba(255,255,255,0.03); padding: 10px 28px; border-radius: 100px; border: 1px solid var(--glass-border); }
    .stat-item { display: flex; align-items: center; gap: 10px; }
    .stat-value { font-size: 15px; font-weight: 950; font-family: tabular-nums; }
    .stat-label { font-size: 9px; font-weight: 800; opacity: 0.3; text-transform: uppercase; letter-spacing: 1px; }

    .btn-quit-premium { padding: 12px 28px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #999; border-radius: 18px; font-size: 12px; font-weight: 900; cursor: pointer; transition: 0.3s; }
    .btn-quit-premium:hover { background: var(--danger); color: #fff; border-color: transparent; box-shadow: 0 10px 30px rgba(239, 68, 68, 0.4); transform: translateY(-2px); }
    .btn-terminate-premium { padding: 12px 28px; background: var(--danger); border: none; color: #fff; border-radius: 18px; font-size: 12px; font-weight: 950; cursor: pointer; transition: 0.3s; box-shadow: 0 15px 35px rgba(239, 68, 68, 0.3); margin-left: 15px; }

    /* Content Layout */
    .room-content { flex: 1; display: flex; padding: 25px; gap: 25px; min-height: 0; }
    .video-stage { flex: 1; position: relative; background: #000; border-radius: 45px; overflow: hidden; box-shadow: 0 60px 120px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.03); }
    .main-canvas { width: 100%; height: 100%; object-fit: cover; transition: filter 0.5s ease; }
    .vignette-overlay { position: absolute; inset: 0; box-shadow: inset 0 0 200px rgba(0,0,0,0.9); pointer-events: none; }

    /* Preparation Overlay */
    .stage-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 60; }
    .glass-heavy { background: rgba(3, 3, 3, 0.7); backdrop-filter: blur(30px); }
    .hero-card { background: var(--card-bg); padding: 50px; border-radius: 40px; border: 1px solid var(--glass-border); text-align: center; max-width: 500px; transform: translateY(0); animation: slide-up-hero 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
    .hero-icon-container { width: 100px; height: 100px; margin: 0 auto 30px; position: relative; display: flex; align-items: center; justify-content: center; }
    .hero-emoji { font-size: 50px; z-index: 2; }
    .hero-ring { position: absolute; inset: 0; border: 2px solid var(--primary); border-radius: 50%; animation: pulse-ring 2s infinite; opacity: 0.5; }
    .hero-title { font-size: 28px; font-weight: 900; margin-bottom: 15px; }
    .hero-desc { color: #94a3b8; line-height: 1.6; margin-bottom: 35px; }
    .hero-actions { display: flex; flex-direction: column; align-items: center; gap: 20px; position: relative; z-index: 70; }
    
    .btn-launch-glow { 
        padding: 18px 45px; background: var(--primary); color: #000; border: none; border-radius: 20px; 
        font-size: 16px; font-weight: 950; cursor: pointer; transition: 0.4s;
        box-shadow: 0 20px 40px var(--primary-glow);
        position: relative; overflow: hidden;
        pointer-events: auto !important;
    }
    .btn-launch-glow:hover { transform: translateY(-5px) scale(1.05); box-shadow: 0 30px 60px var(--primary-glow); }
    .btn-launch-glow::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transform: translateX(-100%); transition: 0.6s; }
    .btn-launch-glow:hover::after { transform: translateX(100%); }

    .status-warning { display: flex; align-items: center; gap: 12px; color: #94a3b8; font-size: 14px; font-weight: 700; }
    .spinner { width: 20px; height: 20px; border: 2px solid rgba(13, 148,136, 0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }

    @keyframes slide-up-hero { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }

    /* Mission Control Modern Redesign */
    .mission-control-overlay { 
        background: radial-gradient(circle at center, #0a0a0c 0%, #000 100%);
        display: flex; align-items: center; justify-content: center; z-index: 200;
    }
    .cockpit-container { 
        width: 80%; max-width: 900px; background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.05); border-radius: 40px;
        padding: 60px; backdrop-filter: blur(40px);
        box-shadow: 0 100px 200px rgba(0,0,0,0.8);
        text-align: center; position: relative; overflow: hidden;
    }
    .cockpit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 50px; opacity: 0.5; }
    .session-stats-modern { display: flex; align-items: center; gap: 20px; background: rgba(255,255,255,0.03); padding: 8px 25px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.05); }
    .stat-box { display: flex; align-items: center; gap: 12px; }
    .stat-icon-container { width: 32px; height: 32px; background: rgba(255,255,255,0.05); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .stat-content { display: flex; flex-direction: column; }
    .stat-value { font-size: 15px; font-weight: 950; color: #fff; line-height: 1; }
    .stat-label { font-size: 7px; color: #555; margin-top: 2px; }
    .stat-divider-vertical { width: 1px; height: 20px; background: rgba(255,255,255,0.1); }

    .pulse-status { display: flex; align-items: center; gap: 10px; font-size: 10px; font-weight: 950; color: #fff; letter-spacing: 2px; }
    .pulse-dot-large { width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 15px #3b82f6; animation: pulse-ring 2s infinite; }
    .cockpit-id { font-size: 10px; font-weight: 900; color: #fff; opacity: 0.5; }

    .calibration-grid { display: grid; grid-cols: 2; display: flex; justify-content: center; gap: 30px; margin-bottom: 60px; }
    .cal-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 15px 25px; border-radius: 20px; display: flex; align-items: center; gap: 15px; min-width: 200px; transition: 0.5s; opacity: 0.4; filter: grayscale(1); }
    .cal-item.cal-ok { opacity: 1; filter: grayscale(0); border-color: rgba(59, 130, 246, 0.3); background: rgba(59, 130, 246, 0.05); }
    .cal-icon { font-size: 18px; font-weight: 950; color: #3b82f6; }
    .cal-label { font-size: 8px; font-weight: 950; color: #fff; opacity: 0.4; letter-spacing: 1px; margin: 0; }
    .cal-status { font-size: 11px; font-weight: 950; color: #fff; margin: 2px 0 0 0; }

    .hero-center { margin-bottom: 60px; }
    .cockpit-title { font-size: 44px; font-weight: 950; color: #fff; margin-bottom: 20px; letter-spacing: -1px; }
    .cockpit-desc { font-size: 16px; color: #666; max-width: 600px; margin: 0 auto; line-height: 1.6; }

    .btn-ignition { 
        position: relative; padding: 25px 60px; background: #fff; color: #000; 
        border-radius: 24px; font-size: 16px; font-weight: 950; border: none; cursor: pointer;
        transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1); overflow: hidden;
        box-shadow: 0 40px 80px rgba(255,255,255,0.15);
    }
    .btn-ignition:hover { transform: scale(1.05) translateY(-5px); box-shadow: 0 50px 100px rgba(255,255,255,0.25); }
    .btn-flare { position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent); skew-x: -25deg; animation: flare 3s infinite; }
    @keyframes flare { 0% { left: -100%; } 20% { left: 150%; } 100% { left: 150%; } }

    .calibration-waiting { display: flex; align-items: center; gap: 15px; color: #444; font-size: 14px; font-weight: 800; justify-content: center; }
    .spinner-pro { width: 22px; height: 22px; border: 2px solid rgba(255,255,255,0.05); border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }

    .cockpit-footer { margin-top: 60px; border-top: 1px solid rgba(255,255,255,0.05); pt: 40px; }
    .waiting-counter { display: flex; flex-direction: column; align-items: center; gap: 5px; }
    .count-value { font-size: 32px; font-weight: 950; color: #fff; font-family: tabular-nums; }
    .count-label { font-size: 9px; font-weight: 950; color: #444; letter-spacing: 2px; }

    .animate-pulse-slow { animation: pulse-slow 4s infinite ease-in-out; }
    @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }

    /* HUD Pill Redesign (SAAS PROFESSIONAL) */
    .room-hud { position: absolute; bottom: 45px; left: 50%; transform: translateX(-50%); z-index: 50; }
    .hud-pill { background: rgba(10, 10, 15, 0.75); backdrop-filter: blur(40px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 100px; padding: 8px 12px; display: flex; align-items: center; gap: 4px; }
    .hud-section { display: flex; gap: 8px; padding: 0 12px; }
    .control-btn { width: 50px; height: 50px; border-radius: 50%; border: none; background: rgba(255,255,255,0.03); color: #cbd5e1; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center; }
    .control-btn:hover { background: rgba(255,255,255,0.08); color: #fff; transform: translateY(-3px); }
    .control-btn.off { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
    .control-btn.active { background: rgba(13, 148, 136, 0.15); color: #2dd4bf; border: 1px solid rgba(13, 148, 136, 0.2); }
    .control-btn.is-rec { color: #ef4444; animation: pulse-red 1.5s infinite; }
    .control-btn.active-hand { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
    .hud-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.1); margin: 0 10px; }
    .emoji-btn { font-size: 24px; background: none; border: none; cursor: pointer; transition: 0.3s; padding: 0 12px; filter: grayscale(0.2); }
    .emoji-btn:hover { transform: scale(1.4) translateY(-12px); filter: grayscale(0); }

    /* PIP Redesign */
    .pip-frame-premium { position: absolute; top: 35px; right: 35px; width: 220px; border-radius: 28px; overflow: hidden; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 40px 80px rgba(0,0,0,0.6); transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
    .pip-frame-premium.pip-expanded { width: 330px; }
    .pip-video-feed { width: 100%; display: block; transform: scaleX(-1); }
    .pip-tag-premium { position: absolute; bottom: 15px; left: 15px; background: rgba(0,0,0,0.7); backdrop-filter: blur(12px); padding: 5px 12px; border-radius: 12px; font-size: 10px; font-weight: 950; display: flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.05); }
    .live-dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px #10b981; }

    /* Sidebar Redesign */
    .room-sidebar-premium { width: 420px; display: flex; flex-direction: column; }
    .sidebar-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; border-radius: 45px; background: var(--card-bg); border: 1px solid var(--glass-border); }
    .sidebar-top-tab { padding: 35px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .tab-header h3 { font-size: 13px; font-weight: 950; color: #555; letter-spacing: 1.5px; margin: 0; }
    .live-count-badge { background: rgba(13, 148, 136, 0.1); color: #2dd4bf; font-size: 11px; font-weight: 950; padding: 5px 15px; border-radius: 100px; }
    .tab-subtitle { font-size: 14px; color: #777; margin: 0; font-weight: 600; }

    .host-label-hud { 
        display: flex; align-items: center; gap: 8px; padding: 0 15px; 
        background: rgba(13, 148, 136, 0.1); border: 1px solid rgba(13, 148, 136, 0.2); 
        border-radius: 12px; color: var(--primary); font-size: 9px; font-weight: 950; 
        letter-spacing: 1px; margin-right: 5px; 
    }
    .host-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); }

    .chat-feed-modern { flex: 1; overflow-y: auto; padding: 30px; display: flex; flex-direction: column; gap: 24px; scrollbar-width: none; }
    .modern-msg { display: flex; flex-direction: column; max-width: 88%; animation: float-up 0.5s ease-out; }
    .modern-msg.is-mine { align-self: flex-end; }
    .msg-meta { margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
    .msg-author { font-size: 12px; font-weight: 800; color: #666; }
    .msg-badge { background: var(--primary); color: #000; font-size: 9px; font-weight: 950; padding: 2px 8px; border-radius: 6px; }
    .msg-block { padding: 16px 20px; border-radius: 24px; background: rgba(255,255,255,0.04); color: #cbd5e1; font-size: 15px; line-height: 1.6; cursor: pointer; transition: 0.3s; position: relative; }
    .is-mine .msg-block { background: var(--primary); color: #000; font-weight: 600; border-bottom-right-radius: 6px; }
    .is-doctor .msg-block { border: 1.5px solid var(--primary); background: rgba(13, 148, 136, 0.05); }
    .msg-timestamp { font-size: 10px; color: #444; margin-top: 6px; font-weight: 700; align-self: flex-end; }

    .msg-reply-hint { background: rgba(0,0,0,0.15); padding: 10px 14px; border-radius: 15px; margin-bottom: 10px; border-left: 3px solid rgba(255,255,255,0.3); }
    .reply-name { font-size: 11px; font-weight: 950; opacity: 0.6; }
    .reply-snippet { font-size: 12px; margin: 4px 0 0; opacity: 0.7; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

    .chat-bottom-compose { padding: 30px; background: rgba(0,0,0,0.25); }
    .replying-to-bar { margin-bottom: 15px; padding: 12px 20px; border-radius: 20px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(13, 148, 136, 0.25); background: rgba(13, 148, 136, 0.05); }
    .reply-to-author { font-size: 12px; color: var(--primary-glow); }
    .reply-close { background: none; border: none; color: #ef4444; font-size: 20px; cursor: pointer; }
    .input-modern-wrapper { display: flex; gap: 12px; padding: 8px; border-radius: 28px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); }
    .input-modern-wrapper input { flex: 1; background: transparent; border: none; padding: 12px 20px; color: #fff; font-size: 15px; outline: none; }
    .btn-send-modern { width: 55px; height: 55px; border-radius: 22px; background: var(--primary); color: #000; border: none; cursor: pointer; transition: 0.4s; display: flex; align-items: center; justify-content: center; }
    .btn-send-modern:disabled { opacity: 0.2; transform: scale(0.9); }
    .btn-send-modern:hover:not(:disabled) { transform: rotate(10deg) scale(1.1); box-shadow: 0 10px 25px var(--primary-glow); }

    /* Animations */
    @keyframes pulse-ring { 0% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); } 100% { transform: scale(0.8); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
    @keyframes pulse-red { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; transform: scale(0.95); } }
    @keyframes float-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `]
})
export class VirtualRoomComponent implements OnInit, OnDestroy {
  constructor() { console.log('--- ENTERPRISE ROOM READY ---'); }
  @ViewChild('mainVideo') mainVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('pipVideo')  pipVideoRef!:  ElementRef<HTMLVideoElement>;
  @ViewChild('chatContainer') chatContainer!: ElementRef<HTMLDivElement>;

  eventTitle = signal(''); streamActive = signal(false); myPeerId = signal('');
  participants = signal<Participant[]>([]); messages = signal<ChatMessage[]>([]);
  cameraReady = signal(false); camError = signal(''); currentMsg = '';
  micEnabled = signal(true); videoEnabled = signal(true); screenSharing = signal(false);
  isRecording = signal(false); handRaised = signal(false); replyingTo = signal<ChatMessage | null>(null);

  isHost = false; eventId: string | null = null; me: any = null;
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
    this.authFacade.currentUser$.subscribe(user => { if (user) { this.me = user; if (this.eventId) this.resolveRole(); } });
    this.initChat();
  }
  ngOnDestroy() { this.cleanup(); }

  private resolveRole() {
    this.eventService.getActiveEvents().subscribe({
      next: events => {
        const ev = events.find(e => e.id === Number(this.eventId));
        if (ev) {
          this.eventTitle.set(ev.title);
          const u = this.me;
          this.isHost = (u?.email?.toLowerCase() === (ev as any).organizerEmail?.toLowerCase()) || (u?.id == ev.organizerId);
        }
        this.startParticipantPolling(); this.loadPeerJS();
      }
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
  raiseHand() { this.handRaised.set(!this.handRaised()); this.sendChatInternal(this.handRaised() ? '✋ A levé la main' : '🤚 A baissé la main', true); }
  sendReaction(emoji: string) { this.sendChatInternal('[REACT] ' + emoji, true); this.showFloatingReaction(emoji); }

  private showFloatingReaction(emoji: string) {
     const l = document.getElementById('reactions-layer'); if (!l) return;
     const d = document.createElement('div'); d.innerText = emoji; d.className = 'float-up-animation';
     d.style.position = 'absolute'; d.style.left = (50 + (Math.random()*20 - 10)) + '%'; d.style.bottom = '100px'; d.style.fontSize = '55px';
     l.appendChild(d); setTimeout(() => d.remove(), 2500);
  }

  private initChat() {
    const s = new SockJS(`${environment.apiUrl}/ws-mediconnect`);
    this.stompClient = new Client({ webSocketFactory: () => s, reconnectDelay: 5000 });
    this.stompClient.onConnect = () => {
      this.stompClient?.subscribe(`/topic/chat/${this.eventId}`, (p) => {
        const m = JSON.parse(p.body);
        this.zone.run(() => { if (m.content.startsWith('[REACT]')) this.showFloatingReaction(m.content.split(' ')[1]); else { this.messages.update(old => [...old, m]); this.scrollToBottom(); } });
      });
    };
    this.stompClient.activate();
  }

  sendChat() { if (!this.currentMsg.trim() || !this.stompClient?.connected) return; this.sendChatInternal(this.currentMsg); this.currentMsg = ''; this.replyingTo.set(null); }
  private sendChatInternal(c: string, sys = false) {
    const n = `${this.me?.firstName || ''} ${this.me?.lastName || ''}`.trim() || 'Anonyme';
    const m: ChatMessage = { sender: n, content: c, role: this.isHost ? 'DOCTOR' : 'PATIENT', timestamp: new Date().toISOString() };
    if (!sys && this.replyingTo()) { m.replyTo = this.replyingTo()?.content; m.replyToSender = this.replyingTo()?.sender; }
    this.stompClient?.publish({ destination: `/app/chat/${this.eventId}/send`, body: JSON.stringify(m) });
  }
  isMe(msg: ChatMessage) { return msg.sender === `${this.me?.firstName || ''} ${this.me?.lastName || ''}`.trim(); }
  private scrollToBottom() { setTimeout(() => { if (this.chatContainer) this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight; }, 100); }
  setReply(m: ChatMessage) { this.replyingTo.set(m); }

  private loadPeerJS() {
    if ((window as any).Peer) { this.initPeer(); return; }
    const s = document.createElement('script'); s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    s.onload = () => this.initPeer(); document.head.appendChild(s);
  }
  private initPeer() {
    this.peer = new Peer(undefined, { debug: 0 });
    this.peer.on('open', (id: string) => this.zone.run(() => {
      console.log('[PEERJS] Opened with ID:', id);
      this.myPeerId.set(id);
      if (this.isHost) {
        console.log('[PEERJS] User is HOST, starting camera...');
        this.startHostCamera();
      } else {
        console.log('[PEERJS] User is SPECTATOR, registering...');
        this.eventService.registerSpectator(this.eventId!, id).subscribe({
            next: () => console.log('[PEERJS] Spectator registered successfully'),
            error: err => console.error('[PEERJS] Spectator registration failed:', err)
        });
      }
    }));
    this.peer.on('error', (err: any) => console.error('[PEERJS] Global Peer Error:', err));
    this.peer.on('call', (c: any) => this.zone.run(() => { 
      c.answer(); 
      this.activeConnections.add(c);
      c.on('stream', (s: MediaStream) => this.zone.run(() => { 
        this.streamActive.set(true);
        // Wait for Angular to render the DOM before setting srcObject
        setTimeout(() => {
          if (this.mainVideoRef?.nativeElement) {
            this.mainVideoRef.nativeElement.srcObject = s;
            this.mainVideoRef.nativeElement.play().catch(() => {});
          }
        }, 200);
      })); 
      c.on('close', () => this.activeConnections.delete(c));
    }));
  }
  private async startHostCamera() { 
    try { 
      console.log('[MEDIA] Requesting camera/mic...');
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); 
      console.log('[MEDIA] Camera access granted');
      this.cameraReady.set(true); 
      this.localStream.getTracks().forEach(t => this.broadcastStream.addTrack(t));
    } catch (e: any) { 
      console.warn('[MEDIA] Camera access failed, using mocks:', e);
      this.camError.set('Caméra indisponible - Mode Simulation'); 
      this.localStream = this.createMockStream();
      this.cameraReady.set(true);
      this.localStream.getTracks().forEach(t => this.broadcastStream.addTrack(t));
    } 
  }

  private createMockStream(): MediaStream {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0d9488';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '30px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Caméra Indisponible', canvas.width / 2, canvas.height / 2);
    }
    const canvasStream = canvas.captureStream(15);
    
    // Create silent audio track
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      const audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }
    } catch (err) {
      console.warn('AudioContext not supported, simulation without audio track');
    }
    
    // Simple animation to keep the stream alive
    let dotCount = 0;
    setInterval(() => {
        if (ctx) {
            ctx.fillStyle = '#0d9488';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            dotCount = (dotCount + 1) % 4;
            const dots = '.'.repeat(dotCount);
            ctx.fillText('Mode Simulation' + dots, canvas.width / 2, canvas.height / 2);
        }
    }, 1000);

    return canvasStream;
  }
  
  startDiffusion() { 
    console.log('[DIFFUSION] Start requested. eventId:', this.eventId, 'peerId:', this.myPeerId());
    if (!this.localStream) { console.error('[DIFFUSION] No local stream'); alert('Stream local introuvable !'); return; }
    if (!this.eventId || !this.myPeerId()) { console.error('[DIFFUSION] Missing params'); alert('Paramètres de session manquants !'); return; }
    
    console.log('[DIFFUSION] Registering host on backend...');
    this.eventService.registerHost(this.eventId, this.myPeerId()).subscribe({
      next: () => {
        console.log('[DIFFUSION] Backend registration successful');
        this.zone.run(() => {
          this.streamActive.set(true);
          console.log('[DIFFUSION] Session active. Updating UI...');
          
          // Wait for Angular to render *ngIf elements
          setTimeout(() => {
            if (this.mainVideoRef?.nativeElement) {
              this.mainVideoRef.nativeElement.srcObject = this.localStream;
              this.mainVideoRef.nativeElement.play().catch(() => {});
            }
            if (this.pipVideoRef?.nativeElement) {
              this.pipVideoRef.nativeElement.srcObject = this.localStream;
              this.pipVideoRef.nativeElement.play().catch(() => {});
            }
          }, 200);
          
          this.triggerBroadcast();
          this.startPollingSpectators();
        });
      },
      error: (err) => {
        const errorMsg = err.error?.message || err.message || 'Erreur inconnue';
        alert("Échec du démarrage : " + errorMsg);
        console.error('[DIFFUSION] Error:', err);
      }
    });
  }

  private startPollingSpectators() { this.pollTimer = setInterval(() => this.triggerBroadcast(), 4000); }

  private triggerBroadcast() {
    this.eventService.getSpectators(this.eventId!).subscribe(d => { 
      const spectators = (d.spectators || []) as string[];
      spectators.forEach(sid => { 
        if (!this.calledPeers.has(sid)) { 
          this.calledPeers.add(sid); 
          const call = this.peer.call(sid, this.broadcastStream); 
          if (call) {
            this.activeConnections.add(call);
            call.on('close', () => { this.activeConnections.delete(call); this.calledPeers.delete(sid); });
          }
        } 
      }); 
    });
  }

  private startParticipantPolling() { this.participantPollTimer = setInterval(() => { if (this.eventId) this.eventService.getEventParticipants(Number(this.eventId)).subscribe(l => this.participants.set(l)); }, 8000); }
  leave() { 
    if (!this.isHost && this.eventId && this.myPeerId()) this.eventService.unregisterSpectator(this.eventId, this.myPeerId()).subscribe(); 
    this.cleanup(); 
    const target = this.isHost ? '/doctor/events/my' : '/events';
    this.router.navigate([target]); 
  }
  endSession() { 
    if (this.eventId) this.eventService.unregisterHost(this.eventId).subscribe(); 
    this.cleanup(); 
    this.router.navigate(['/doctor/events/my']); 
  }
  private cleanup() { clearInterval(this.pollTimer); clearInterval(this.participantPollTimer); this.localStream?.getTracks().forEach(t => t.stop()); this.screenStream?.getTracks().forEach(t => t.stop()); this.peer?.destroy(); this.stompClient?.deactivate(); }
}
