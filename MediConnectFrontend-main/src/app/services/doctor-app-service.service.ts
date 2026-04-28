import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'DONE';

export interface Appointment {
  idAppointment?: number;
  typeRdv?: string;
  specialite?: string;
  medecin?: string;
  date?: string;
  heure?: string;
  motif?: string;
  status?: AppointmentStatus;
  urgent?: boolean;          // ✅ AJOUTÉ
  patientNom?: string;
  patientId?: number;
    urgencyLevel?: 'URGENT' | 'NORMAL'; // ✅ remplace urgent?: boolean

}

@Injectable({
  providedIn: 'root'
})
export class DoctorAppServiceService {

  private baseUrl = 'http://localhost:8080/mediconnect/appointment';

  constructor(private http: HttpClient) {}

  getAppointmentsByDoctor(medecin: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/doctor/${medecin}`);
  }

  acceptAppointment(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/accept`, {}, { responseType: 'text' });
  }

  refuseAppointment(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/refuse`, {}, { responseType: 'text' });
  }

  cancelAppointment(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/cancel`, {}, { responseType: 'text' });
  }

  doneAppointment(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/done`, {}, { responseType: 'text' });
  }




  
 setUrgent(id: number, value: boolean): Observable<any> {
  return this.http.patch<Appointment>(
    `${this.baseUrl}/${id}/urgent?urgent=${value}`, 
    {}
    // ← supprimer responseType: 'text'
  );
}
}