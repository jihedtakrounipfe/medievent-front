import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { QueueService } from '../../../services/queue.service';
import { PatientQueueStatusComponent } from '../../../patient-queue-status/patient-queue-status.component';

@Component({
  selector: 'app-info-appointment',
  standalone: true,
  imports: [CommonModule, PatientQueueStatusComponent],
  templateUrl: './info-appointment.component.html',
  styleUrl: './info-appointment.component.css'
})
export class InfoAppointmentComponent implements OnInit, OnDestroy {
  userName: string = 'Chargement...';
  userId: string = '';
  currentPatientId: number = 0;
  appointmentCount: number = 0;

  confirmedAppointment: any = null;
  showQueue: boolean = false;

  private sub!: Subscription;

  constructor(
    private http: HttpClient,
    private queueService: QueueService
  ) {}

  ngOnInit(): void {
    this.loadPatientProfile();
    this.loadAppointmentCount();
  this.loadLastConfirmedAppointment();  

    // Écoute si un nouveau RDV est confirmé depuis booking
    this.sub = this.queueService.confirmedAppointment$.subscribe(appt => {
      if (appt) {
        this.confirmedAppointment = appt;
        this.showQueue = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggleQueue(): void {
    this.showQueue = !this.showQueue;
  }

  private loadPatientProfile(): void {
    this.http.get<any>('http://localhost:8080/mediconnect/api/v1/patients/me').subscribe({
      next: (data) => {
        this.userName = `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();
        this.userId = data.id ?? '';
        this.currentPatientId = data.id ?? 0;
      },
      error: (err) => {
        console.error('Erreur chargement profil patient', err);
        this.userName = 'Utilisateur';
      }
    });
  }

  private loadLastConfirmedAppointment(): void {
    this.http.get<any[]>(
      'http://localhost:8080/mediconnect/appointment/afficherAppointments'
    ).subscribe({
      next: (appointments) => {
        // ✅ Prend le premier RDV CONFIRMED
        const confirmed = appointments.find(a => a.status === 'CONFIRMED');
        if (confirmed) {
          this.confirmedAppointment = {
            idAppointment: confirmed.idAppointment,
            medecin: confirmed.medecin,
          };
          this.queueService.setConfirmedAppointment(this.confirmedAppointment);
        }
      },
      error: (err) => console.error('Erreur chargement RDV confirmé', err)
    });
  }

  private loadAppointmentCount(): void {
    this.http.get<any[]>(
      'http://localhost:8080/mediconnect/appointment/afficherAppointments'
    ).subscribe({
      next: (appointments) => {
        this.appointmentCount = appointments.length;
      },
      error: (err) => {
        console.error('Erreur chargement rendez-vous', err);
        this.appointmentCount = 0;
      }
    });
  }
}