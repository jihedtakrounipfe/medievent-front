// src/app/core/services/auth.service.ts
// Single Responsibility: handles all HTTP calls for auth endpoints.
// Does NOT manage application state — that is AuthFacade's job.

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AnyUser,
  AuthResponse,
  BiometricEnrollRequest,
  DoctorRegisterRequest,
  LoginRequest,
  LoginWith2FARequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  PatientRegisterRequest,
  RefreshTokenRequest,
  VerifyEmailRequest,
} from '../user';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly base = `${environment.apiUrl}/api/auth`;

  constructor(
    private http:    HttpClient,
    private storage: StorageService,
  ) {}

  // ── Login ───────────────────────────────────────────────────────────────────

  /** Standard email/password login — returns JWT pair + user */
  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/login`, payload)
      .pipe(tap(res => this.persistTokens(res)));
  }

  /** Login with TOTP 2FA code — used for doctors & admins */
  loginWith2FA(payload: LoginWith2FARequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/login/2fa`, payload)
      .pipe(tap(res => this.persistTokens(res)));
  }

  // ── Registration ─────────────────────────────────────────────────────────────

  /** Patient self-registration → email verification triggered by Keycloak */
  registerPatient(payload: PatientRegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register/patient`, payload);
  }

  /** Doctor registration → goes to PENDING status awaiting admin approval */
  registerDoctor(payload: DoctorRegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register/doctor`, payload);
  }

  // ── Token Management ─────────────────────────────────────────────────────────

  /** Refresh the access token using the stored refresh token */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.storage.getRefreshToken();
    const payload: RefreshTokenRequest = { refreshToken: refreshToken ?? '' };
    return this.http
      .post<AuthResponse>(`${this.base}/refresh`, payload)
      .pipe(tap(res => this.persistTokens(res)));
  }

  /** Logout — invalidates the Keycloak session & revokes Google OAuth tokens */
  logout(): Observable<void> {
    const refreshToken = this.storage.getRefreshToken();
    return this.http
      .post<void>(`${this.base}/logout`, { refreshToken })
      .pipe(tap(() => this.storage.clearAll()));
  }

  // ── Password Reset ────────────────────────────────────────────────────────────

  /** Trigger password reset email via Keycloak */
  requestPasswordReset(payload: PasswordResetRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/password-reset`, payload);
  }

  /** Confirm new password with the token from the reset email */
  confirmPasswordReset(payload: PasswordResetConfirmRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/password-reset/confirm`, payload);
  }

  // ── Email Verification ────────────────────────────────────────────────────────

  verifyEmail(payload: VerifyEmailRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/verify-email`, payload);
  }

  resendVerification(email: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/resend-verification`, { email });
  }

  // ── Biometric Auth ────────────────────────────────────────────────────────────

  enrollBiometric(payload: BiometricEnrollRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/biometric/enroll`, payload);
  }

  /** Authenticate using facial recognition as a 2nd factor */
  loginWithFace(email: string, photoBase64: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/login/face`, { email, photo: photoBase64 })
      .pipe(tap(res => this.persistTokens(res)));
  }

  /** Revoke biometric data (RGPD right to erasure) */
  revokeBiometric(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/biometric`);
  }

  // ── Google OAuth2 ─────────────────────────────────────────────────────────────

  /**
   * Redirects the browser to Keycloak's Google IdP broker.
   * Keycloak handles the PKCE flow and calendar.events scope.
   */
  initiateGoogleLogin(): void {
    const params = new URLSearchParams({
      kc_idp_hint:   'google',
      redirect_uri:  environment.oauthRedirectUri,
      response_type: 'code',
      client_id:     environment.keycloakClientId,
    });
    window.location.href = `${environment.keycloakUrl}/auth?${params}`;
  }

  /** Exchange the authorization code (returned by Keycloak) for JWT tokens */
  handleOAuthCallback(code: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/oauth/callback`, { code })
      .pipe(tap(res => this.persistTokens(res)));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private persistTokens(res: AuthResponse): void {
    if (res.accessToken) this.storage.setAccessToken(res.accessToken);
    if (res.refreshToken) this.storage.setRefreshToken(res.refreshToken);
    if (res.user) this.storage.setUser(res.user);
  }
}
