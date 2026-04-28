import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Appointment } from '../services/appointment.service';
import { map, Observable } from 'rxjs';
import { QueueService } from '../services/queue.service';
@Component({
  selector: 'app-doctor-queue',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  template: `
    <div class="queue-dashboard">

      <div class="queue-header">
        <h3>
          <i class="fas fa-users"></i>
          File d'attente — {{ waitingCount$ | async }} patient(s)
        </h3>
        <button class="btn btn-primary" (click)="callNext()">
          <i class="fas fa-arrow-right"></i> Appeler le suivant
        </button>
      </div>

      <!-- Patient en cours -->
      <div class="in-progress-card"
           *ngIf="inProgressApp$ | async as app">
        <i class="fas fa-stethoscope"></i>
        <span>En consultation : <strong>
          {{ app.patient.firstName }} {{ app.patient.lastName }}
        </strong></span>
        <span class="time-badge">{{ app.heure | slice:0:5 }}</span>
      </div>

      <!-- Liste d'attente -->
      <div class="queue-list">
        <div class="queue-item"
             *ngFor="let app of waitingApps$ | async; let i = index"
             [class.urgent]="app.urgencyLevel === 'URGENT'">

          <span class="position-badge">{{ i + 1 }}</span>

          <div class="patient-info">
            <strong>{{ app.patient.firstName }} {{ app.patient.lastName }}</strong>
            <small>{{ app.heure | slice:0:5 }} — {{ app.specialite }}</small>
            <small *ngIf="app.motif">{{ app.motif }}</small>
          </div>

          <div class="right-info">
            <span class="wait-time">~{{ (i + 1) * 15 }} min</span>
            <span class="urgent-tag"
                  *ngIf="app.urgencyLevel === 'URGENT'">
              <i class="fas fa-exclamation-triangle"></i> URGENT
            </span>
          </div>

        </div>

        <div class="empty-queue"
             *ngIf="(waitingApps$ | async)?.length === 0
                 && (inProgressApp$ | async) === null">
          <i class="fas fa-check-circle"></i>
          <p>Aucun patient en attente</p>
        </div>
      </div>

    </div>
  `
})
export class DoctorQueueComponent implements OnInit, OnDestroy {

  @Input() medecinName!: string;

  waitingApps$!: Observable<Appointment[]>;
  inProgressApp$!: Observable<Appointment | null>;
  waitingCount$!: Observable<number>;

  constructor(private queueService: QueueService) {}

  ngOnInit(): void {
    // Chargement initial
    this.queueService.loadQueue(this.medecinName).subscribe(queue => {
      this.queueService['queueSubject'].next(queue);
    });

    // Connexion WebSocket
    this.queueService.connectAsDoctor(this.medecinName);

    // Streams dérivés
    this.waitingApps$ = this.queueService.queue$.pipe(
      map(queue => queue.filter(a => a.status === 'CONFIRMED'))
    );
    this.inProgressApp$ = this.queueService.queue$.pipe(
      map(queue => queue.find(a => a.status === 'IN_PROGRESS') ?? null)
    );
    this.waitingCount$ = this.waitingApps$.pipe(
      map(list => list.length)
    );
  }

  callNext(): void {
    this.queueService.callNextPatient(this.medecinName);
  }

  ngOnDestroy(): void {
    this.queueService.disconnect();
  }
}
