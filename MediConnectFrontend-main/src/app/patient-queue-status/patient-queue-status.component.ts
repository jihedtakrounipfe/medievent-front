import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

// ─── Interface ────────────────────────────────────────────────────────────────
interface QueuePosition {
  position: number;
  before: number;
  doneBefore: number;  // ✅ Ajouter
  isMyTurn: boolean;
  myHeure: string;
  status: string;
  message: string;
}

@Component({
  selector: 'app-patient-queue-status',
  standalone: true,
  imports: [CommonModule],
  template: `
  <!-- Message RDV pas aujourd'hui ou pas confirmé -->
  <div class="queue-info-msg" *ngIf="data?.message && data?.message !== 'ok' && !loading">
    <i class="fas fa-info-circle"></i>
    <p>{{ data?.message }}</p>
  </div>

  <!-- Chargement -->
  <div class="queue-loading" *ngIf="loading">
    <i class="fas fa-spinner fa-spin"></i>
    <p>Chargement de votre position...</p>
  </div>

  <!-- Erreur -->
  <div class="queue-error-msg" *ngIf="error && !loading">
    <i class="fas fa-exclamation-circle"></i>
    <p>{{ error }}</p>
    <button (click)="loadPosition()">Réessayer</button>
  </div>

  <!-- RDV TERMINÉ -->
<div class="queue-done" *ngIf="data?.status === 'DONE' || data?.status === 'COMPLETED'">
  <div class="done-icon">✅</div>
  <strong>Votre consultation est terminée !</strong>
  <p>Merci de votre visite. Bonne journée !</p>
</div>
  <!-- C'EST TON TOUR -->
  <div class="your-turn-banner" *ngIf="data?.isMyTurn && !loading">
    <div class="turn-icon">🎉</div>
    <strong>C'est votre tour !</strong>
    <p>Veuillez vous présenter au cabinet du {{ medecinName }}</p>
  </div>

  <!-- POSITION NORMALE -->
  <div *ngIf="data && !data.isMyTurn && data.position !== -1 && !loading && data?.message === 'ok'">
    <div class="position-header">
      <div class="position-circle">
        <span class="position-number">{{ data.position }}</span>
      </div>
      <div class="position-text">
        <strong>Votre position</strong>
        <span>dans la file d'attente</span>
      </div>
    </div>

    <div class="before-info">
      <i class="fas fa-users"></i>
      <span>
        <strong>{{ data.before }}</strong>
        {{ data.before === 1 ? 'personne' : 'personnes' }}
        avant vous
      </span>
    </div>
    <!-- Patients déjà vus avant toi -->
<div class="done-info">
  <i class="fas fa-check-circle"></i>
  <span>
    <strong>{{ data.doneBefore }}</strong>
    {{ data.doneBefore === 1 ? 'patient déjà vu' : 'patients déjà vus' }}
    avant vous aujourd'hui
  </span>
</div>

    <div class="wait-estimate">
      <i class="fas fa-clock"></i>
      <span>Attente estimée : <strong>~{{ data.before * 15 }} min</strong></span>
    </div>

    <div class="my-heure">
      <i class="fas fa-calendar-check"></i>
      <span>Votre RDV : <strong>{{ data.myHeure }}</strong></span>
    </div>
  </div>

  <!-- Rafraîchissement auto -->
  <div class="refresh-info" *ngIf="data && !loading && data?.message === 'ok'">
    <i class="fas fa-sync-alt"></i>
    <small>Mise à jour automatique toutes les 30 secondes</small>
  </div>
`,
 styles: [`
  /* ... vos styles existants ... */

  .queue-done {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-radius: 14px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  text-align: center;
}

.done-icon {
  font-size: 2.5rem;
}
 .queue-panel {
      background: #fff;
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      margin-top: 0.75rem;
      text-align: center;
    }

    .queue-loading {
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
    }

    .queue-error-msg {
      color: #dc2626;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .queue-error-msg button {
      padding: 0.4rem 1rem;
      border: 1px solid #dc2626;
      background: white;
      color: #dc2626;
      border-radius: 8px;
      cursor: pointer;
    }

    .your-turn-banner {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border-radius: 14px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
    }

    .turn-icon { font-size: 2.5rem; }

    .your-turn-banner strong {
      font-size: 1.3rem;
    }

    .your-turn-banner p {
      font-size: 0.875rem;
      opacity: 0.9;
      margin: 0;
    }

    .position-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .position-circle {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #0ea5e9);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .position-number {
      font-size: 2rem;
      font-weight: 800;
      color: white;
    }

    .position-text {
      text-align: left;
      display: flex;
      flex-direction: column;
    }

    .position-text strong {
      font-size: 1rem;
      color: #1e293b;
    }

    .position-text span {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .before-info, .wait-estimate, .my-heure {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      padding: 0.6rem 1rem;
      background: #f8fafc;
      border-radius: 10px;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      color: #475569;
    }

    .before-info i { color: #308bac; }
    .wait-estimate i { color: #0ea5e9; }
    .my-heure i { color: #10b981; }
.done-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.6rem 1rem;
  background: #f8fafc;
  border-radius: 10px;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #475569;
}

.done-info i { color: #10b981; }
    .refresh-info {
      margin-top: 1rem;
      color: #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }
.queue-done strong {
  font-size: 1.1rem;
}

.queue-done p {
  font-size: 0.875rem;
  opacity: 0.9;
  margin: 0;
}
  .queue-info-msg {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    color: #0369a1;
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
`]
})
export class PatientQueueStatusComponent implements OnInit, OnDestroy {

  @Input() idAppointment!: number;
  @Input() medecinName!: string;
  @Input() patientId!: number;

  data: QueuePosition | null = null;
  loading: boolean = true;
  error: string = '';

  private pollSub!: Subscription;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPosition();

    // ✅ Polling toutes les 30 secondes
    this.pollSub = interval(30000).pipe(
      switchMap(() => this.http.get<QueuePosition>(
`http://localhost:8080/mediconnect/queue/position/${this.idAppointment}`
      ))
    ).subscribe({
      next: (data) => this.data = data,
      error: () => {}
    });
  }

  loadPosition(): void {
    this.loading = true;
    this.error = '';
    this.http.get<QueuePosition>(
`http://localhost:8080/mediconnect/queue/position/${this.idAppointment}`
    ).subscribe({
      next: (data) => {
        this.data = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger votre position. Vérifiez que votre RDV est confirmé.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}