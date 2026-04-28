import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  TotpStatus,
  TotpSetupInitResponse,
  TotpSetupVerifyResponse,
  TotpRegenerateCodesResponse,
} from '../user/partials/auth.partial';

@Injectable({ providedIn: 'root' })
export class TotpService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/totp`;

  getStatus(): Observable<TotpStatus> {
    return this.http.get<TotpStatus>(`${this.base}/status`);
  }

  initiateSetup(): Observable<TotpSetupInitResponse> {
    return this.http.post<TotpSetupInitResponse>(`${this.base}/setup/initiate`, {});
  }

  verifySetup(code: string): Observable<TotpSetupVerifyResponse> {
    return this.http.post<TotpSetupVerifyResponse>(`${this.base}/setup/verify`, { code });
  }

  cancelSetup(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/setup/cancel`, {});
  }

  disable(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/disable`, {});
  }

  regenerateCodes(): Observable<TotpRegenerateCodesResponse> {
    return this.http.post<TotpRegenerateCodesResponse>(`${this.base}/recovery/regenerate`, {});
  }
}
