// src/app/services/noshow-ai.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NoshowPrediction {
  noshow_risk:  number;
  present_prob: number;
  risk_level:   'Faible' | 'Modéré' | 'Élevé';
  risk_color:   'green' | 'amber' | 'red';
  top_factors:  { name: string; importance: number }[];
}

export interface NoshowRequest {
  day_of_week:     number;   // 0=Lun … 6=Dim
  hour:            number;   // 8-17
  specialite:      string;
  days_until_appt: number;
  previous_noshow: number;
}

@Injectable({ providedIn: 'root' })
export class NoshowAiService {

  private readonly API = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  predict(payload: NoshowRequest): Observable<NoshowPrediction> {
    return this.http.post<NoshowPrediction>(`${this.API}/predict-noshow`, payload);
  }
}