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
  ChangePasswordRequest,
  DoctorRegisterRequest,
  Google2FAVerifyRequest,
  GoogleLinkConfirmRequest,
  GoogleLoginRequest,
  GoogleLoginResponse,
  GoogleRegisterRequest,
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
    return this.http.post<void>(`${this.base}/logout`, { refreshToken });
  }

  // ── Password Change — two-step (authenticated) ───────────────────────────────

  /**
   * Step 1a: Request the server to email a 6-digit verification code.
   * Returns masked email so the UI can display it.
   */
  sendPasswordChangeCode(): Observable<{ message: string; maskedEmail: string }> {
    return this.http.post<{ message: string; maskedEmail: string }>(
      `${this.base}/password-change/send-code`, {}
    );
  }

  /**
   * Step 1b: Submit the 6-digit code.
   * Returns a short-lived verificationToken (UUID, valid 5 min).
   */
  verifyPasswordChangeCode(code: string): Observable<{ verificationToken: string; expiresIn: number }> {
    return this.http.post<{ verificationToken: string; expiresIn: number }>(
      `${this.base}/password-change/verify-code`, { code }
    );
  }

  /** Step 2: Change password using the verificationToken from step 1b. */
  changePassword(payload: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/change-password`, payload);
  }

  // ── Password Reset ────────────────────────────────────────────────────────────

  /** Step 1: Request a 6-digit reset code by email */
  forgotPassword(payload: PasswordResetRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/forgot-password`, payload);
  }

  /** Step 2: Submit code + new password to complete the reset */
  resetPassword(payload: PasswordResetConfirmRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/reset-password`, payload)
      .pipe(tap(res => this.persistTokens(res)));
  }

  /** @deprecated use forgotPassword() */
  requestPasswordReset(payload: PasswordResetRequest): Observable<{ message: string }> {
    return this.forgotPassword(payload);
  }

  /** @deprecated use resetPassword() */
  confirmPasswordReset(payload: PasswordResetConfirmRequest): Observable<AuthResponse> {
    return this.resetPassword(payload);
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

  // ── Google Sign-In (GSI) ──────────────────────────────────────────────────────

  /** Step 1: Send Google ID token to backend — returns status (success, newUser, 2FA, or linking) */
  googleLogin(payload: GoogleLoginRequest): Observable<GoogleLoginResponse> {
    return this.http.post<GoogleLoginResponse>(`${this.base}/google-login`, payload)
      .pipe(tap(res => { if (res.success) this.persistGoogleTokens(res); }));
  }

  /** Step 2a: Complete registration for a new Google user */
  googleRegister(payload: GoogleRegisterRequest): Observable<GoogleLoginResponse> {
    return this.http.post<GoogleLoginResponse>(`${this.base}/google-register`, payload)
      .pipe(tap(res => { if (res.success && res.accessToken) this.persistGoogleTokens(res); }));
  }

  /** Step 2b: Confirm account linking — existing user provides current password */
  googleLink(payload: GoogleLinkConfirmRequest): Observable<GoogleLoginResponse> {
    return this.http.post<GoogleLoginResponse>(`${this.base}/google-link`, payload)
      .pipe(tap(res => { if (res.success) this.persistGoogleTokens(res); }));
  }

  /** Step 2c: Submit 2FA code for a Google login */
  google2FAVerify(payload: Google2FAVerifyRequest): Observable<GoogleLoginResponse> {
    return this.http.post<GoogleLoginResponse>(`${this.base}/google-2fa-verify`, payload)
      .pipe(tap(res => { if (res.success) this.persistGoogleTokens(res); }));
  }

  /** Step 2d: Submit face image for a Google login */
  googleFaceVerify(payload: { email: string; faceImage?: string; useEmailFallback?: boolean }): Observable<GoogleLoginResponse> {
    return this.http.post<GoogleLoginResponse>(`${this.base}/google-face-verify`, payload)
      .pipe(tap(res => { if (res.success) this.persistGoogleTokens(res); }));
  }

  private persistGoogleTokens(res: GoogleLoginResponse): void {
    if (res.accessToken)  this.storage.setAccessToken(res.accessToken);
    if (res.refreshToken) this.storage.setRefreshToken(res.refreshToken);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private persistTokens(res: AuthResponse): void {
    if (res.accessToken) this.storage.setAccessToken(res.accessToken);
    if (res.refreshToken) this.storage.setRefreshToken(res.refreshToken);
    if (res.user) this.storage.setUser(res.user);
  }
}
