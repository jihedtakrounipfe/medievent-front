import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';




export interface Appointment {
  idAppointment?: number;
  typeRdv: string;
  specialite?: string;
  medecin?: string;
  laboratoire?: string;
  date: string;
  heure: string;
  motif: string;
  symptome?: string;
  typeAnalyse?: string;
  status?: string;
}
export interface DoctorResponse {
  id: number;
  firstName: string;
  lastName: string;
  specialization: string;
  verificationStatus: string;
  consultationFee?: number;
  rating?: number;
  officeAddress?: string;
  profilePicture?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {

  private baseUrl = 'http://localhost:8080/mediconnect/appointment';
  private dashUrl = 'http://localhost:8080/mediconnect/api/dashboard';

  constructor(private http: HttpClient) {}

  // ─── Helper : récupère les headers avec Bearer token ─
  private getAuthHeaders(): HttpHeaders {
    const keycloak = (window as any).keycloak;
    const token = keycloak?.token;
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  getDoctorsBySpecialization(specialite: string): Observable<DoctorResponse[]> {
  const specializationMap: { [key: string]: string } = {
    'Cardiologie':       'CARDIOLOGY',
    'Dermatologie':      'DERMATOLOGY',
    'Pédiatrie':         'PEDIATRICS',
    'Gynécologie':       'GYNECOLOGY',
    'Médecine Générale': 'GENERAL_PRACTICE',
    'Ophtalmologie':     'OPHTHALMOLOGY'
  };

  const enumValue = specializationMap[specialite];
  return this.http.get<{ content: DoctorResponse[] }>(
    `http://localhost:8080/mediconnect/api/v1/doctors`,
    {
      params: { specialization: enumValue },
      headers: this.getAuthHeaders()
    }
  ).pipe(
    map(response => response.content)
  );
}
  // ─── ADD ─────────────────────────────────────────────
  addRdv(app: Appointment): Observable<any> {
    const springData = {
      typeRdv: app.typeRdv === 'medecin' ? 'DOCTOR' : 'LAB',
      specialite: app.specialite || null,
      medecin: app.medecin || null,
      laboratoire: app.laboratoire || null,
      date: app.date,
      heure: app.heure,
      motif: app.motif,
      status: 'PENDING'
    };
    return this.http.post(`${this.baseUrl}/ajouterRdv`, springData, {
      headers: this.getAuthHeaders()
    });
  }

  // ─── GET tous ────────────────────────────────────────
  getAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/afficherAppointments`, {
      headers: this.getAuthHeaders()
    });
  }

  // ─── GET patient connecté ────────────────────────────
  getPatientAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.baseUrl}/patient/appointments`, {
      headers: this.getAuthHeaders()
    });
  }

  // ─── UPDATE ──────────────────────────────────────────
  updateAppointment(app: Appointment): Observable<any> {
    const springData = {
      idAppointment: app.idAppointment,
      typeRdv: app.typeRdv === 'medecin' ? 'DOCTOR' : 'LAB',
      specialite: app.specialite || null,
      medecin: app.medecin || null,
      laboratoire: app.laboratoire || null,
      date: app.date,
      heure: app.heure,
      motif: app.motif,
      status: app.status || 'PENDING'
    };
    return this.http.put(`${this.baseUrl}/updateAppointement`, springData, {
      headers: this.getAuthHeaders()
    });
  }

  // ─── DELETE ──────────────────────────────────────────
  deleteAppointment(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/deleteAppointment/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // ─── CHECK AVAILABILITY ──────────────────────────────
  checkDoctorAvailability(medecin: string, date: string, heure: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/check-availability`, {
      params: { medecin, date, heure },
      headers: this.getAuthHeaders()
    });
  }

  // ─── DASHBOARD ───────────────────────────────────────
  getDashboard(medecin: string): Observable<any> {
    return this.http.get(`${this.dashUrl}/${encodeURIComponent(medecin)}`, {
      headers: this.getAuthHeaders()
    });
  }

  getMonthlyTrend(medecin: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.dashUrl}/${encodeURIComponent(medecin)}/trend`, {
      headers: this.getAuthHeaders()
    });
  }

  getNoShowHeatmap(medecin: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.dashUrl}/${encodeURIComponent(medecin)}/heatmap`, {
      headers: this.getAuthHeaders()
    });
  }

  getWeekAvailability(medecin: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.dashUrl}/${encodeURIComponent(medecin)}/availability`, {
      headers: this.getAuthHeaders()
    });
  }
 

getHolidaysTN(year: number): Observable<string[]> {
  return this.http.get<any[]>(
    `https://date.nager.at/api/v3/PublicHolidays/${year}/TN`
  ).pipe(
    map(holidays => holidays.map(h => h.date)) // format YYYY-MM-DD
  );
}
}