import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthFacade } from '../../../core/services/auth.facade';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-email-verification-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      15%       { transform: translateX(-8px); }
      30%       { transform: translateX(8px); }
      45%       { transform: translateX(-6px); }
      60%       { transform: translateX(6px); }
      75%       { transform: translateX(-4px); }
      90%       { transform: translateX(4px); }
    }
    @keyframes fadeScaleIn {
      from { opacity: 0; transform: scale(0.94); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes checkmark {
      0%   { opacity: 0; transform: scale(0.5); }
      60%  { transform: scale(1.15); }
      100% { opacity: 1; transform: scale(1); }
    }
    .shake { animation: shake 0.45s ease-in-out; }
    .modal-enter { animation: fadeScaleIn 0.22s ease-out; }
    .checkmark-pop { animation: checkmark 0.4s ease-out forwards; }

    .code-input {
      font-family: 'Courier New', Courier, monospace;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 0.7em;
      text-align: center;
      width: 100%;
      padding: 14px 16px 14px 32px;
      border: 2px solid #e7e5e4;
      border-radius: 12px;
      outline: none;
      color: #1c1917;
      background: #fafaf9;
      transition: border-color 0.15s, box-shadow 0.15s;
      caret-color: #0d9488;
    }
    .code-input::placeholder { color: #d6d3d1; letter-spacing: 0.7em; }
    .code-input:focus {
      border-color: #0d9488;
      box-shadow: 0 0 0 3px rgba(13,148,136,0.15);
      background: #fff;
    }
    .code-input.error-state { border-color: #f43f5e; box-shadow: 0 0 0 3px rgba(244,63,94,0.15); }
  `],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="close()"></div>

      <!-- Card -->
      <div class="modal-enter relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        <!-- Close button -->
        <button type="button" (click)="close()"
                class="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors z-10"
                aria-label="Fermer">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <div class="px-8 pt-10 pb-8 flex flex-col items-center text-center">

          <!-- SUCCESS STATE -->
          <ng-container *ngIf="success(); else verifyBlock">
            <div class="checkmark-pop mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-teal-50">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-9 h-9 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-stone-900 mb-1">Email vérifié !</h2>
            <p class="text-sm text-stone-500">Votre compte a été activé avec succès.</p>
          </ng-container>

          <!-- VERIFY BLOCK -->
          <ng-template #verifyBlock>

            <!-- Envelope icon -->
            <div class="mb-5 flex items-center justify-center w-16 h-16 rounded-full bg-teal-50">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>

            <!-- Title & email -->
            <h2 class="text-xl font-bold text-stone-900 mb-2">Vérification de votre e-mail</h2>
            <p class="text-sm text-stone-500 mb-6">
              Un code à 6 chiffres a été envoyé à<br>
              <span class="font-semibold text-teal-700">{{ email }}</span>
            </p>

            <!-- Single code input -->
            <div class="w-full mb-1" [class.shake]="shaking()">
              <input #codeInput
                     type="text"
                     inputmode="numeric"
                     pattern="[0-9]*"
                     maxlength="6"
                     autocomplete="one-time-code"
                     placeholder="000000"
                     [value]="code()"
                     (input)="onInput($event)"
                     (keydown.enter)="onEnter()"
                     [disabled]="loading()"
                     [class.error-state]="error()"
                     class="code-input"/>
            </div>

            <!-- Error message -->
            <p *ngIf="error()" class="text-xs text-rose-600 mb-3 w-full text-left">
              {{ error() }}
            </p>

            <!-- Expiry countdown -->
            <p *ngIf="!error()" class="text-xs text-stone-400 mb-5 w-full text-left">
              Le code expire dans
              <span [class.text-rose-500]="expirySeconds() <= 60">{{ formatTime(expirySeconds()) }}</span>
            </p>
            <p *ngIf="error()" class="text-xs text-stone-400 mb-5 w-full text-left">
              Le code expire dans
              <span [class.text-rose-500]="expirySeconds() <= 60">{{ formatTime(expirySeconds()) }}</span>
            </p>

            <!-- Verify button -->
            <button type="button" (click)="verify()"
                    [disabled]="!isComplete() || loading()"
                    class="w-full py-3 rounded-xl font-semibold text-base transition-all mb-4"
                    [ngClass]="{
                      'bg-teal-600 text-white hover:bg-teal-700 cursor-pointer shadow-sm': isComplete() && !loading(),
                      'bg-stone-100 text-stone-400 cursor-not-allowed': !isComplete() && !loading(),
                      'bg-teal-500 text-white cursor-wait': loading()
                    }">
              <span *ngIf="!loading()">Vérifier</span>
              <span *ngIf="loading()" class="flex items-center justify-center gap-2">
                <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Vérification…
              </span>
            </button>

            <!-- Resend -->
            <p class="text-sm text-stone-500">
              Vous n'avez pas reçu le code ?
              <button type="button" (click)="resend()"
                      [disabled]="cooldown() > 0 || loading()"
                      class="font-semibold transition-colors ml-1"
                      [ngClass]="{
                        'text-teal-600 hover:text-teal-800': cooldown() === 0 && !loading(),
                        'text-stone-400 cursor-not-allowed': cooldown() > 0 || loading()
                      }">
                Renvoyer le code
              </button>
              <span *ngIf="cooldown() > 0" class="text-stone-400 text-xs ml-1">(disponible dans {{ cooldown() }}s)</span>
            </p>

            <!-- Cancel -->
            <button type="button" (click)="close()"
                    class="mt-4 text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2 transition-colors">
              Annuler — mon compte ne sera pas vérifié
            </button>

          </ng-template>
        </div>
      </div>
    </div>
  `,
})
export class EmailVerificationModalComponent implements OnInit, AfterViewInit, OnDestroy {
  private auth = inject(AuthFacade);
  private toast = inject(ToastService);

  @Input({ required: true }) email!: string;
  @Output() verified = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('codeInput') codeInputRef!: ElementRef<HTMLInputElement>;

  loading   = signal(false);
  error     = signal<string | null>(null);
  cooldown  = signal(0);
  code      = signal('');
  shaking   = signal(false);
  success   = signal(false);
  expirySeconds = signal(600); // 10 minutes

  private cooldownInterval?: ReturnType<typeof setInterval>;
  private expiryInterval?: ReturnType<typeof setInterval>;

  @HostListener('document:keydown.escape')
  onEsc(): void { this.close(); }

  ngOnInit(): void {
    this.expiryInterval = setInterval(() => {
      const v = this.expirySeconds();
      if (v <= 1) { this.expirySeconds.set(0); clearInterval(this.expiryInterval); return; }
      this.expirySeconds.set(v - 1);
    }, 1000);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.codeInputRef?.nativeElement?.focus(), 80);
  }

  ngOnDestroy(): void {
    clearInterval(this.cooldownInterval);
    clearInterval(this.expiryInterval);
  }

  isComplete(): boolean {
    return /^\d{6}$/.test(this.code());
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  onInput(evt: Event): void {
    const el = evt.target as HTMLInputElement;
    const clean = el.value.replace(/\D/g, '').slice(0, 6);
    this.code.set(clean);
    el.value = clean; // keep DOM in sync
    this.error.set(null);
  }

  onEnter(): void {
    if (this.isComplete() && !this.loading()) this.verify();
  }

  verify(): void {
    if (!this.isComplete()) return;
    this.loading.set(true);
    this.error.set(null);
    this.auth.verifyEmail({ email: this.email, code: this.code() }).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: () => {
        this.success.set(true);
        this.toast.success('Email vérifié !', 'Succès');
        setTimeout(() => {
          this.verified.emit(true);
          this.closed.emit();
        }, 1400);
      },
      error: (e: Error) => {
        this.error.set(e.message || 'Code invalide. Veuillez réessayer.');
        this.code.set('');
        this.triggerShake();
        setTimeout(() => this.codeInputRef?.nativeElement?.focus(), 50);
      },
    });
  }

  resend(): void {
    if (this.cooldown() > 0) return;
    this.loading.set(true);
    this.error.set(null);
    this.auth.resendVerification(this.email).pipe(
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: () => {
        this.toast.success('Nouveau code envoyé.', 'Succès');
        this.expirySeconds.set(600);
        this.startCooldown(60);
      },
      error: (e: Error) => this.error.set(e.message || 'Impossible de renvoyer le code.'),
    });
  }

  private triggerShake(): void {
    this.shaking.set(true);
    setTimeout(() => this.shaking.set(false), 500);
  }

  private startCooldown(seconds: number): void {
    this.cooldown.set(seconds);
    this.cooldownInterval = setInterval(() => {
      const v = this.cooldown();
      if (v <= 1) { this.cooldown.set(0); clearInterval(this.cooldownInterval); return; }
      this.cooldown.set(v - 1);
    }, 1000);
  }

  close(): void {
    this.closed.emit();
  }
}
