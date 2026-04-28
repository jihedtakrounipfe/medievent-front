import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Enable2FARequest, TwoFactorStatus } from '../user/partials/auth.partial';

@Injectable({ providedIn: 'root' })
export class TwoFactorService {

  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/auth/2fa`;

  getStatus(): Observable<TwoFactorStatus> {
    return this.http.get<TwoFactorStatus>(`${this.base}/status`);
  }

  enable(request: Enable2FARequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/enable`, request);
  }

  disable(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/disable`, {});
  }
}
