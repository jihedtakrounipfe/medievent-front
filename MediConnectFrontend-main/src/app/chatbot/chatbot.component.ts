import {
  Component, ElementRef, ViewChild,
  AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkedPipe } from './marked.pipe';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  fileName?: string;
  fileType?: string;
  copied?: boolean;
  animate?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  date: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkedPipe],
  template: `
    <div class="chatbot-wrap" [class.open]="isOpen" [class.dark]="isDark">

      <!-- ── Floating button ── -->
      <button class="fab" (click)="toggleChat()" [class.active]="isOpen" aria-label="Toggle chat">
        <span class="fab-icon fab-open">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </span>
        <span class="fab-icon fab-close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </span>
        <span class="notif-dot" *ngIf="!isOpen && unreadCount > 0">{{ unreadCount }}</span>
      </button>

      <!-- ── Chat window ── -->
      <div class="chat-win" [class.visible]="isOpen">

        <!-- Header -->
        <div class="chat-head">
          <button class="head-btn hist-btn" (click)="toggleHistory()" [class.active]="showHistory" title="Historique">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
            </svg>
          </button>
          <div class="head-center">
            <div class="head-avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div class="head-info">
              <span class="head-name">Assistant Médical</span>
              <span class="head-status"><i class="pulse-dot"></i>{{ lang === 'fr' ? 'En ligne' : 'Online' }}</span>
            </div>
          </div>
          <div class="head-actions">
            <button class="head-btn" (click)="toggleLang()" title="Switch language">
              <span class="lang-flag">{{ lang === 'fr' ? '🇫🇷' : '🇬🇧' }}</span>
            </button>
            <button class="head-btn" (click)="toggleDark()" title="Dark mode">
              <svg *ngIf="!isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
              <svg *ngIf="isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </button>
            <button class="head-btn" (click)="newConversation()" [title]="lang === 'fr' ? 'Nouvelle conversation' : 'New conversation'">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <button class="head-btn close-x" (click)="toggleChat()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- History panel -->
        <div class="history-panel" [class.visible]="showHistory">
          <div class="history-header">
            <span>{{ lang === 'fr' ? '📋 Historique' : '📋 History' }}</span>
            <button class="clear-all" (click)="clearHistory()">
              {{ lang === 'fr' ? 'Tout effacer' : 'Clear all' }}
            </button>
          </div>
          <div class="history-list">
            <div
              *ngFor="let conv of conversations"
              class="history-item"
              [class.active]="conv.id === currentConvId"
              (click)="loadConversation(conv)">
              <div class="history-title">{{ conv.title }}</div>
              <div class="history-date">{{ conv.date | date:'dd/MM HH:mm' }}</div>
            </div>
            <div *ngIf="conversations.length === 0" class="history-empty">
              {{ lang === 'fr' ? 'Aucune conversation' : 'No conversations yet' }}
            </div>
          </div>
        </div>

        <!-- Messages -->
        <div class="chat-msgs" #msgContainer>

          <!-- Pending file preview -->
          <div *ngIf="pendingFile" class="file-preview-bar">
            <div class="file-preview-inner">
              <span class="file-icon">{{ getFileIcon(pendingFile.type) }}</span>
              <span class="file-name">{{ pendingFile.name }}</span>
              <button class="remove-file" (click)="removePendingFile()">✕</button>
            </div>
          </div>

          <div
            *ngFor="let msg of currentMessages"
            class="msg-row"
            [class.user]="msg.isUser"
            [class.animate]="msg.animate">

            <div class="msg-avatar" *ngIf="!msg.isUser">🩺</div>

            <div class="msg-body">
              <div *ngIf="msg.fileName" class="file-attachment">
                <span>{{ getFileIcon(msg.fileType || '') }}</span>
                <span>{{ msg.fileName }}</span>
              </div>
              <div class="bubble" [innerHTML]="msg.text | marked"></div>
              <div class="msg-meta">
                <span class="msg-time">{{ msg.timestamp | date:'HH:mm' }}</span>
                <button
                  *ngIf="!msg.isUser"
                  class="copy-btn"
                  (click)="copyMessage(msg)"
                  [class.copied]="msg.copied">
                  <svg *ngIf="!msg.copied" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  <svg *ngIf="msg.copied" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>{{ msg.copied ? (lang === 'fr' ? 'Copié !' : 'Copied!') : (lang === 'fr' ? 'Copier' : 'Copy') }}</span>
                </button>
              </div>
            </div>

            <div class="msg-avatar user-av" *ngIf="msg.isUser">👤</div>
          </div>

          <!-- Typing indicator -->
          <div *ngIf="isTyping" class="msg-row typing-row">
            <div class="msg-avatar">🩺</div>
            <div class="typing-bubble">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <!-- Suggestions -->
        <div class="suggestions-bar" *ngIf="showSuggestions && currentMessages.length <= 2">
          <button
            *ngFor="let s of getSuggestions()"
            class="suggestion-chip"
            (click)="useSuggestion(s)">
            {{ s }}
          </button>
        </div>

        <!-- Input -->
        <div class="input-area">
          <label class="attach-btn" [title]="lang === 'fr' ? 'Joindre un fichier' : 'Attach file'">
            <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/*,.pdf,.doc,.docx" hidden/>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </label>
          <textarea
            [(ngModel)]="newMessage"
            (keydown)="handleKey($event)"
            (input)="autoResize($event)"
            [placeholder]="lang === 'fr' ? 'Posez votre question médicale...' : 'Ask your medical question...'"
            rows="1"
            #msgInput>
          </textarea>
          <button class="send-btn" (click)="send()" [disabled]="!canSend()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <div class="disclaimer">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>
          </svg>
          {{ lang === 'fr' ? 'Informations générales uniquement — Consultez un médecin' : 'General information only — Consult a doctor' }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --teal:       #0d9488;
      --teal-dark:  #0f766e;
      --teal-light: #ccfbf1;
      --bg:         #ffffff;
      --bg2:        #f8fafc;
      --bg3:        #f1f5f9;
      --text:       #0f172a;
      --text2:      #475569;
      --text3:      #94a3b8;
      --border:     #e2e8f0;
      --shadow:     0 25px 50px -12px rgba(0,0,0,0.18);
      --radius:     20px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Dark mode */
    .chatbot-wrap.dark {
      --bg:    #0f172a;
      --bg2:   #1e293b;
      --bg3:   #334155;
      --text:  #f1f5f9;
      --text2: #94a3b8;
      --text3: #64748b;
      --border:#334155;
    }

    .chatbot-wrap {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      z-index: 999999 !important;
      pointer-events: auto !important;
      display: flex !important;
      flex-direction: column !important;
    }

    /* FAB */
    .fab {
      width: 62px; height: 62px; border-radius: 50%;
      background: linear-gradient(145deg, var(--teal), var(--teal-dark));
      color: #fff; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 24px rgba(13,148,136,0.35);
      transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1);
      position: relative;
    }
    .fab:hover { transform: scale(1.12); box-shadow: 0 12px 32px rgba(13,148,136,0.45); }
    .fab::before {
      content: ''; position: absolute; inset: -5px; border-radius: 50%;
      background: rgba(13,148,136,0.25); z-index: -1;
      animation: fab-pulse 2.5s infinite;
    }
    @keyframes fab-pulse {
      0%,100% { transform: scale(1); opacity: .5; }
      50%      { transform: scale(1.25); opacity: .15; }
    }
    .fab-icon { position: absolute; transition: all .3s cubic-bezier(0.34,1.56,0.64,1); }
    .fab-open  { opacity: 1; transform: rotate(0) scale(1); }
    .fab-close { opacity: 0; transform: rotate(-90deg) scale(0.5); }
    .fab.active .fab-open  { opacity: 0; transform: rotate(90deg) scale(0.5); }
    .fab.active .fab-close { opacity: 1; transform: rotate(0) scale(1); }

    .notif-dot {
      position: absolute; top: 2px; right: 2px;
      min-width: 20px; height: 20px; padding: 0 5px;
      background: #ef4444; color: #fff;
      border-radius: 999px; border: 2px solid #fff;
      font-size: 10px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      animation: blink 2s infinite;
    }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.6} }

    /* Chat window */
    .chat-win {
      position: absolute; bottom: 78px; right: 0;
      width: 390px; height: 620px;
      background: var(--bg);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      display: flex; flex-direction: column; overflow: hidden;
      opacity: 0; pointer-events: none;
      transform: scale(0.92) translateY(16px);
      transform-origin: bottom right;
      transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1);
    }
    .chat-win.visible { opacity: 1; pointer-events: all; transform: scale(1) translateY(0); }

    /* Header */
    .chat-head {
      padding: 14px 16px;
      background: linear-gradient(135deg, var(--teal), var(--teal-dark));
      display: flex; align-items: center; gap: 10px;
      color: #fff; flex-shrink: 0;
    }
    .head-center { flex:1; display:flex; align-items:center; gap:10px; }
    .head-avatar {
      width: 36px; height: 36px; border-radius: 10px;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
    }
    .head-name  { font-size: 14px; font-weight: 600; display: block; }
    .head-status{ font-size: 11px; opacity: .85; display: flex; align-items: center; gap: 5px; }
    .pulse-dot  {
      width: 7px; height: 7px; border-radius: 50%;
      background: #4ade80; display: inline-block;
      animation: fab-pulse 2s infinite;
    }
    .head-actions { display: flex; gap: 4px; }
    .head-btn {
      width: 30px; height: 30px; border-radius: 8px;
      background: rgba(255,255,255,0.15);
      border: none; cursor: pointer; color: #fff;
      display: flex; align-items: center; justify-content: center;
      transition: all .2s; font-size: 14px;
    }
    .head-btn:hover   { background: rgba(255,255,255,0.28); transform: scale(1.1); }
    .head-btn.active  { background: rgba(255,255,255,0.35); }
    .close-x:hover    { background: rgba(239,68,68,0.5) !important; }
    .lang-flag        { font-size: 16px; line-height: 1; }

    /* History */
    .history-panel {
      background: var(--bg2); border-bottom: 1px solid var(--border);
      max-height: 0; overflow: hidden;
      transition: max-height 0.35s ease; flex-shrink: 0;
    }
    .history-panel.visible { max-height: 220px; overflow-y: auto; }
    .history-header {
      padding: 10px 16px; display: flex; justify-content: space-between; align-items: center;
      font-size: 12px; font-weight: 600; color: var(--text2);
      position: sticky; top: 0; background: var(--bg2);
    }
    .clear-all { background: none; border: none; cursor: pointer; font-size: 11px; color: #ef4444; font-weight: 500; }
    .clear-all:hover { text-decoration: underline; }
    .history-item {
      padding: 9px 16px; cursor: pointer;
      border-left: 3px solid transparent; transition: all .2s;
    }
    .history-item:hover { background: var(--bg3); }
    .history-item.active { border-left-color: var(--teal); background: var(--teal-light); }
    .history-title { font-size: 13px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .history-date  { font-size: 10px; color: var(--text3); margin-top: 2px; }
    .history-empty { padding: 16px; text-align: center; font-size: 12px; color: var(--text3); }

    /* Messages */
    .chat-msgs {
      flex: 1; overflow-y: auto;
      padding: 16px 14px; display: flex; flex-direction: column; gap: 14px;
      background: var(--bg2); scroll-behavior: smooth;
    }
    .chat-msgs::-webkit-scrollbar { width: 4px; }
    .chat-msgs::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }

    .file-preview-bar {
      background: var(--bg3); border-radius: 12px;
      padding: 8px 12px; border: 1px dashed var(--teal);
    }
    .file-preview-inner { display: flex; align-items: center; gap: 8px; }
    .file-icon  { font-size: 20px; }
    .file-name  { font-size: 12px; color: var(--text2); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .remove-file {
      background: none; border: none; cursor: pointer;
      color: var(--text3); font-size: 14px; padding: 0 4px;
      transition: .2s; border-radius: 4px;
    }
    .remove-file:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

    .msg-row {
      display: flex; gap: 10px; align-items: flex-end;
      opacity: 0; transform: translateY(12px);
      animation: msg-in .3s ease forwards;
    }
    .msg-row.user { flex-direction: row-reverse; }
    @keyframes msg-in { to { opacity: 1; transform: translateY(0); } }

    .msg-avatar {
      width: 32px; height: 32px; border-radius: 10px;
      background: linear-gradient(135deg, var(--teal-light), #a7f3d0);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
    }
    .user-av { background: linear-gradient(135deg, var(--teal), var(--teal-dark)); }

    .msg-body { display: flex; flex-direction: column; gap: 4px; max-width: 82%; }

    .file-attachment {
      display: flex; align-items: center; gap: 6px;
      background: var(--bg3); border-radius: 10px;
      padding: 6px 10px; font-size: 12px; color: var(--text2);
      border: 1px solid var(--border);
    }

    .bubble {
      padding: 11px 15px; border-radius: 18px;
      font-size: 13.5px; line-height: 1.55; word-wrap: break-word;
      background: var(--bg); color: var(--text);
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border: 1px solid var(--border);
      border-bottom-left-radius: 4px;
    }
    .msg-row.user .bubble {
      background: linear-gradient(135deg, var(--teal), var(--teal-dark));
      color: #fff; border-color: transparent;
      border-bottom-right-radius: 4px; border-bottom-left-radius: 18px;
      box-shadow: 0 4px 14px rgba(13,148,136,0.3);
    }

    .msg-meta { display: flex; align-items: center; gap: 8px; padding: 0 4px; }
    .msg-row.user .msg-meta { flex-direction: row-reverse; }
    .msg-time { font-size: 10px; color: var(--text3); }

    .copy-btn {
      display: flex; align-items: center; gap: 4px;
      background: none; border: 1px solid var(--border);
      border-radius: 20px; padding: 3px 8px;
      font-size: 11px; color: var(--text3); cursor: pointer;
      transition: all .2s; opacity: 0;
    }
    .msg-row:hover .copy-btn { opacity: 1; }
    .copy-btn:hover { background: var(--bg3); color: var(--teal); border-color: var(--teal); }
    .copy-btn.copied { color: #22c55e; border-color: #22c55e; background: rgba(34,197,94,0.08); }

    /* Typing */
    .typing-bubble {
      padding: 14px 18px; background: var(--bg);
      border-radius: 18px; border-bottom-left-radius: 4px;
      border: 1px solid var(--border);
      display: flex; gap: 5px; align-items: center;
    }
    .typing-bubble span {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--text3); display: block;
      animation: dot-bounce 1.3s infinite;
    }
    .typing-bubble span:nth-child(2) { animation-delay: .15s; }
    .typing-bubble span:nth-child(3) { animation-delay: .30s; }
    @keyframes dot-bounce {
      0%,60%,100% { transform: translateY(0); opacity:.6; }
      30%          { transform: translateY(-5px); opacity:1; }
    }

    /* Suggestions */
    .suggestions-bar {
      padding: 8px 12px; display: flex; gap: 6px; flex-wrap: wrap;
      border-top: 1px solid var(--border); background: var(--bg); flex-shrink: 0;
    }
    .suggestion-chip {
      padding: 6px 13px; border-radius: 999px;
      border: 1px solid var(--border); background: var(--bg2);
      font-size: 12px; font-weight: 500; color: var(--text2);
      cursor: pointer; transition: all .2s; white-space: nowrap;
    }
    .suggestion-chip:hover {
      background: var(--teal); color: #fff; border-color: var(--teal);
      transform: translateY(-2px); box-shadow: 0 4px 12px rgba(13,148,136,0.25);
    }

    /* Input */
    .input-area {
      padding: 12px 14px; display: flex; gap: 10px; align-items: flex-end;
      background: var(--bg); border-top: 1px solid var(--border); flex-shrink: 0;
    }
    .attach-btn {
      width: 38px; height: 38px; border-radius: 10px;
      background: var(--bg2); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--text2); flex-shrink: 0; transition: all .2s;
    }
    .attach-btn:hover { background: var(--teal-light); color: var(--teal); border-color: var(--teal); }
    textarea {
      flex: 1; padding: 10px 14px;
      border: 1px solid var(--border); border-radius: 14px;
      resize: none; font-family: inherit; font-size: 13.5px; line-height: 1.5;
      min-height: 40px; max-height: 110px;
      background: var(--bg2); color: var(--text); transition: all .2s; overflow-y: auto;
    }
    textarea:focus {
      outline: none; border-color: var(--teal);
      box-shadow: 0 0 0 3px rgba(13,148,136,0.12); background: var(--bg);
    }
    textarea::placeholder { color: var(--text3); }
    .send-btn {
      width: 40px; height: 40px; border-radius: 12px;
      background: linear-gradient(135deg, var(--teal), var(--teal-dark));
      color: #fff; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all .25s;
      box-shadow: 0 4px 12px rgba(13,148,136,0.3);
    }
    .send-btn:hover:not(:disabled) { transform: scale(1.1) rotate(8deg); }
    .send-btn:disabled { opacity: .35; cursor: not-allowed; box-shadow: none; }

    /* Disclaimer */
    .disclaimer {
      padding: 8px 14px; display: flex; align-items: center; gap: 6px;
      font-size: 10.5px; color: #f87171;
      background: rgba(239,68,68,0.05);
      border-top: 1px solid rgba(239,68,68,0.1); flex-shrink: 0;
    }

    @media (max-width: 480px) {
      .chat-win { width: calc(100vw - 32px); height: 78vh; right: 16px; bottom: 74px; }
    }
  `]
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('msgContainer') private msgContainer!: ElementRef;
  @ViewChild('msgInput')     private msgInput!: ElementRef;
  @ViewChild('fileInput')    private fileInput!: ElementRef;

  isOpen          = false;
  isDark          = false;
  showHistory     = false;
  showSuggestions = true;
  isTyping        = false;
  newMessage      = '';
  lang: 'fr' | 'en' = 'fr';
  unreadCount     = 1;
  pendingFile: File | null = null;

  currentConvId   = this.genId();
  conversations: Conversation[] = [];
  currentMessages: ChatMessage[] = [{
    id: this.genId(),
    text: 'Bonjour 👋 Je suis votre assistant médical MediConnect. Comment puis-je vous aider aujourd\'hui ?',
    isUser: false,
    timestamp: new Date(),
    animate: true
  }];

  private shouldScroll = false;

  ngAfterViewChecked() {
    if (this.shouldScroll) { this.scrollBottom(); this.shouldScroll = false; }
  }
  private scrollBottom() {
    try { this.msgContainer.nativeElement.scrollTop = this.msgContainer.nativeElement.scrollHeight; } catch {}
  }
  genId() { return Math.random().toString(36).slice(2); }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.unreadCount = 0; this.showHistory = false;
      setTimeout(() => this.msgInput?.nativeElement.focus(), 120);
    }
  }
  toggleDark()    { this.isDark = !this.isDark; }
  toggleHistory() { this.showHistory = !this.showHistory; }
  toggleLang()    { this.lang = this.lang === 'fr' ? 'en' : 'fr'; }
  canSend()       { return this.newMessage.trim().length > 0 || !!this.pendingFile; }

  handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }
  autoResize(e: Event) {
    const ta = e.target as HTMLTextAreaElement;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 110) + 'px';
  }

  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.pendingFile = input.files[0];
  }
  removePendingFile() {
    this.pendingFile = null;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }
  getFileIcon(type: string): string {
    if (type.startsWith('image')) return '🖼️';
    if (type.includes('pdf'))    return '📄';
    return '📎';
  }

  send() {
    if (!this.canSend()) return;
    const userMsg: ChatMessage = {
      id: this.genId(),
      text: this.newMessage.trim() || (this.lang === 'fr' ? '*(Fichier joint)*' : '*(File attached)*'),
      isUser: true, timestamp: new Date(), animate: true,
      fileName: this.pendingFile?.name, fileType: this.pendingFile?.type
    };
    this.currentMessages.push(userMsg);
    const query = this.newMessage.trim();
    this.newMessage = ''; this.pendingFile = null;
    this.showSuggestions = false; this.isTyping = true; this.shouldScroll = true;
    if (this.msgInput) this.msgInput.nativeElement.style.height = 'auto';

    setTimeout(() => {
      this.isTyping = false;
      this.currentMessages.push({
        id: this.genId(), text: this.getResponse(query),
        isUser: false, timestamp: new Date(), animate: true
      });
      this.shouldScroll = true;
      this.saveConversation();
    }, 1200 + Math.random() * 600);
  }

  copyMessage(msg: ChatMessage) {
    const plain = msg.text.replace(/\*\*/g,'').replace(/\*/g,'').replace(/#+\s/g,'');
    navigator.clipboard.writeText(plain).then(() => {
      msg.copied = true;
      setTimeout(() => msg.copied = false, 2000);
    });
  }

  getSuggestions(): string[] {
    return this.lang === 'fr'
      ? ['🤒 Grippe', '🤕 Mal de tête', '🌡️ Fièvre', '💊 Médicaments', '👶 Santé enfant', '❤️ Maladies chroniques']
      : ['🤒 Flu', '🤕 Headache', '🌡️ Fever', '💊 Medications', '👶 Child health', '❤️ Chronic disease'];
  }
  useSuggestion(s: string) {
    this.newMessage = s.replace(/^[^\w]+ /, '');
    this.send();
  }

  saveConversation() {
    const title = this.currentMessages.find(m => m.isUser)?.text?.slice(0, 40) || 'Conversation';
    const conv: Conversation = { id: this.currentConvId, title, messages: [...this.currentMessages], date: new Date() };
    const idx = this.conversations.findIndex(c => c.id === this.currentConvId);
    if (idx >= 0) this.conversations[idx] = conv; else this.conversations.unshift(conv);
  }
  loadConversation(conv: Conversation) {
    this.currentConvId = conv.id;
    this.currentMessages = [...conv.messages];
    this.showHistory = false; this.shouldScroll = true;
  }
  newConversation() {
    this.saveConversation();
    this.currentConvId = this.genId();
    this.currentMessages = [{
      id: this.genId(),
      text: this.lang === 'fr' ? 'Bonjour 👋 Nouvelle conversation. Comment puis-je vous aider ?' : 'Hello 👋 New conversation. How can I help you?',
      isUser: false, timestamp: new Date(), animate: true
    }];
    this.showSuggestions = true; this.showHistory = false;
  }
  clearHistory() { this.conversations = []; this.showHistory = false; }

  private getResponse(msg: string): string {
    const m   = msg.toLowerCase();
    const fr  = this.lang === 'fr';

    if (m.match(/grippe|rhume|flu|cold|symptom/)) return fr
      ? `**🤒 Grippe / Rhume**\n\n- Reposez-vous suffisamment\n- Buvez beaucoup d'eau et de tisanes\n- Paracétamol pour la fièvre (pas d'aspirine chez l'enfant)\n- Évitez de sortir pour ne pas contaminer\n\n> ⚠️ Consultez un médecin si les symptômes durent plus de **5 jours** ou s'aggravent.`
      : `**🤒 Flu / Cold**\n\n- Rest as much as possible\n- Stay hydrated (water, herbal teas)\n- Paracetamol for fever (no aspirin for children)\n- Avoid contact to prevent spreading\n\n> ⚠️ See a doctor if symptoms last more than **5 days** or worsen.`;

    if (m.match(/t.te|headache|migraine|head/)) return fr
      ? `**🤕 Maux de tête**\n\n- Reposez-vous dans une pièce calme et sombre\n- Hydratez-vous bien\n- Évitez les écrans\n- Ibuprofène ou paracétamol si nécessaire\n\n> ⚠️ Consultez un médecin si la douleur est soudaine, très intense ou récurrente.`
      : `**🤕 Headache**\n\n- Rest in a quiet, dark room\n- Drink water (often linked to dehydration)\n- Avoid screens\n- Ibuprofen or paracetamol if needed\n\n> ⚠️ See a doctor if the pain is sudden, very intense or recurrent.`;

    if (m.match(/fi.vre|fever|temp.rature|temperature/)) return fr
      ? `**🌡️ Fièvre — que faire ?**\n\n| Température | Action |\n|---|---|\n| 37.5 – 38.5°C | Repos, hydratation |\n| 38.5 – 39.5°C | Paracétamol, surveiller |\n| > 39.5°C | Consulter rapidement |\n\n> ⚠️ Urgence si fièvre > **40°C** ou convulsions.`
      : `**🌡️ Fever — what to do?**\n\n| Temperature | Action |\n|---|---|\n| 37.5 – 38.5°C | Rest, hydrate |\n| 38.5 – 39.5°C | Paracetamol, monitor |\n| > 39.5°C | See a doctor soon |\n\n> ⚠️ Emergency if fever > **40°C** or convulsions occur.`;

    if (m.match(/m.dic|medication|drug|pill|dose/)) return fr
      ? `**💊 Médicaments**\n\n- Ne prenez jamais un médicament sans prescription pour une maladie grave\n- Respectez toujours les doses prescrites\n- Signalez toutes vos allergies à votre médecin\n- Ne mélangez pas alcool et médicaments\n\n> ℹ️ Pour les interactions médicamenteuses, consultez votre pharmacien.`
      : `**💊 Medications**\n\n- Never self-medicate for serious conditions\n- Always follow prescribed dosages\n- Inform your doctor of all allergies\n- Do not mix alcohol with medications\n\n> ℹ️ Ask your pharmacist about drug interactions.`;

    if (m.match(/enfant|child|b.b.|baby|kids?|nourrisson/)) return fr
      ? `**👶 Santé de l'enfant**\n\n- Fièvre > **38°C chez un nourrisson < 3 mois** → urgences immédiatement\n- Vaccins à jour : essentiels\n- Surveiller alimentation, sommeil et développement\n- En cas de doute → pédiatre\n\n> ⚠️ Ne jamais donner d'aspirine à un enfant.`
      : `**👶 Child health**\n\n- Fever > **38°C in infants < 3 months** → ER immediately\n- Keep vaccinations up to date\n- Monitor diet, sleep and development\n- When in doubt → pediatrician\n\n> ⚠️ Never give aspirin to a child.`;

    if (m.match(/diab|tension|blood pressure|cholest|chronique|chronic|hypertens/)) return fr
      ? `**❤️ Maladies chroniques**\n\n- Suivi régulier avec votre médecin traitant\n- Ne jamais arrêter votre traitement sans avis médical\n- Alimentation équilibrée et activité physique (30 min/jour)\n- Surveiller glycémie, tension...\n\n> 💡 Via **MediConnect**, suivez votre santé en temps réel avec votre médecin.`
      : `**❤️ Chronic diseases**\n\n- Regular follow-ups with your doctor\n- Never stop treatment without medical advice\n- Balanced diet + physical activity (30 min/day)\n- Monitor blood sugar, blood pressure...\n\n> 💡 With **MediConnect**, track your health in real time with your doctor.`;

    return fr
      ? `Merci pour votre question. Pour une réponse adaptée à votre situation, je vous recommande de **consulter un professionnel de santé**.\n\nVia **MediConnect**, prenez rendez-vous en moins de **2 minutes** ou démarrez une téléconsultation. 📱`
      : `Thank you for your question. For an answer tailored to your situation, please **consult a healthcare professional**.\n\nWith **MediConnect**, book an appointment in under **2 minutes** or start a video consultation. 📱`;
  }
}