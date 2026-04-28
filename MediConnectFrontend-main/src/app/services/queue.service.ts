 

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable } from 'rxjs';

// Mirrors ton entité Appointment Spring
export interface Appointment {
  idAppointment: number;
  typeRdv: string;
  specialite: string;
  medecin: string;
  laboratoire: string;
  date: string;
  heure: string;
  motif: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  urgencyLevel: 'NORMAL' | 'URGENT';
  patient: {
    idUser: number;
    firstName: string;
    lastName: string;
  };
}

@Injectable({ providedIn: 'root' })
export class QueueService {

  private readonly BASE_URL = 'http://localhost:8080';
  private client!: Client;

  private queueSubject = new BehaviorSubject<Appointment[]>([]);
  private myTurnSubject = new BehaviorSubject<boolean>(false);

  queue$: Observable<Appointment[]> = this.queueSubject.asObservable();
  myTurn$: Observable<boolean> = this.myTurnSubject.asObservable();

// Après myTurn$ :
private confirmedAppointmentSubject = new BehaviorSubject<any>(null);
confirmedAppointment$: Observable<any> = this.confirmedAppointmentSubject.asObservable();

// Nouvelle méthode :
setConfirmedAppointment(appointment: any): void {
  this.confirmedAppointmentSubject.next(appointment);
}



  constructor(private http: HttpClient) {}

  // Connexion côté médecin
  connectAsDoctor(medecinName: string): void {
    this.initClient();
    this.client.onConnect = () => {
      this.client.subscribe(
        `/topic/queue/${this.slugify(medecinName)}`,
        (msg: IMessage) => {
          const queue: Appointment[] = JSON.parse(msg.body);
          this.queueSubject.next(queue);
        }
      );
    };
    this.client.activate();
  }

  // Connexion côté patient
  connectAsPatient(medecinName: string, patientId: number): void {
    this.initClient();
    this.client.onConnect = () => {
      // Voir sa position dans la file
      this.client.subscribe(
        `/topic/queue/${this.slugify(medecinName)}`,
        (msg: IMessage) => {
          const queue: Appointment[] = JSON.parse(msg.body);
          this.queueSubject.next(queue);
        }
      );
      // Notification personnelle "C'est ton tour"
      this.client.subscribe(
        `/topic/patient/${patientId}`,
        (msg: IMessage) => {
          const notif = JSON.parse(msg.body);
          if (notif.event === 'YOUR_TURN') {
            this.myTurnSubject.next(true);
          }
        }
      );
    };
    this.client.activate();
  }

  // Patient signale son arrivée (HTTP)
  notifyArrival(idAppointment: number): Observable<Appointment> {
    return this.http.post<Appointment>(
      `${this.BASE_URL}/queue/arrive/${idAppointment}`, {}
    );
  }

  // Chargement initial de la file (HTTP)
  loadQueue(medecinName: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(
      `${this.BASE_URL}/queue/doctor/${medecinName}`
    );
  }

  // Médecin appelle le suivant (STOMP)
  callNextPatient(medecinName: string): void {
    this.client.publish({
      destination: '/app/queue/next',
      body: JSON.stringify({ medecinName })
    });
  }

  disconnect(): void {
    this.myTurnSubject.next(false);
    this.client?.deactivate();
  }

  private slugify(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
  }

  private initClient(): void {
    if (this.client) this.client.deactivate();
    this.client = new Client({
      webSocketFactory: () => new SockJS(`${this.BASE_URL}/ws`),
      reconnectDelay: 3000
    });
  }
}