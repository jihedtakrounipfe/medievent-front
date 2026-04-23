// src/app/core/services/auth.facade.ts
// Facade Pattern: single entry point for components.
// Manages reactive state (BehaviorSubject) + orchestrates AuthService + UserService.

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  catchError,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import {
  AnyUser,
  AuthResponse,
  AppUser,
  DoctorRegisterRequest,
  LoginRequest,
  LoginWith2FARequest,
  PatientRegisterRequest,
  VerifyEmailRequest,
  isAdministrator,
  isDoctor,
  isPatient,
} from '../user';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class AuthFacade {

  // ── State ─────────────────────────────────────────────────────────────────────
private _currentUser$ = new BehaviorSubject<AnyUser | null>(null);

 
  private _loading$ = new BehaviorSubject<boolean>(false);
  private _error$   = new BehaviorSubject<string | null>(null);

  // ── Public Observables ────────────────────────────────────────────────────────

  readonly currentUser$: Observable<AnyUser | null> = this._currentUser$.asObservable();
  readonly loading$:     Observable<boolean>         = this._loading$.asObservable();
  readonly error$:       Observable<string | null>   = this._error$.asObservable();

  readonly isLoggedIn$: Observable<boolean> = this.currentUser$.pipe(
    map(user => !!user),
  );

  readonly isPatient$:       Observable<boolean> = this.currentUser$.pipe(map(u => !!u && isPatient(u)));
  readonly isDoctor$:        Observable<boolean> = this.currentUser$.pipe(map(u => !!u && isDoctor(u)));
  readonly isAdministrator$: Observable<boolean> = this.currentUser$.pipe(map(u => !!u && isAdministrator(u)));

  // ── Snapshot Getters (for guards & interceptors) ──────────────────────────────

  get currentUser(): AnyUser | null { return this._currentUser$.value; }
  get isLoggedIn():  boolean        { return !!this._currentUser$.value; }

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private storage:     StorageService,
    private router:      Router,
  ) {
      const storedUser = this.storage.getUser<AnyUser>();
  if (storedUser) {
    this._currentUser$.next(storedUser);
  }
  }
  

  // ── Auth Actions ──────────────────────────────────────────────────────────────

  login(payload: LoginRequest): Observable<AnyUser> {
    this.setLoading(true);
    this.clearError();
    return this.authService.login(payload).pipe(
      switchMap(res => {
        const user = res.user;
        if (!user) {
          return throwError(() => new Error(res.message ?? 'Login failed. Please try again.'));
        }
        this.setUser(user);
        this.redirectAfterLogin(user);
        return of(user);
      }),
      catchError(err => this.handleError(err)),
    );
  }

  loginWith2FA(payload: LoginWith2FARequest): Observable<AnyUser> {
    this.setLoading(true);
    this.clearError();
    return this.authService.loginWith2FA(payload).pipe(
      switchMap(res => {
        const user = res.user;
        if (!user) {
          return throwError(() => new Error(res.message ?? '2FA login failed. Please try again.'));
        }
        this.setUser(user);
        this.redirectAfterLogin(user);
        return of(user);
      }),
      catchError(err => this.handleError(err)),
    );
  }

  /**
   * Apply a successful AuthResponse (with tokens + user) to facade state.
   * Used by the login form after completing the 2FA second step directly
   * via AuthService, bypassing the standard facade.login() flow.
   */
  finalizeLogin(res: AuthResponse): AnyUser | null {
    const user = res.user as AnyUser | undefined;
    if (!user) return null;
    this.setUser(user);
    this.redirectAfterLogin(user);
    return user;
  }

  loginWithGoogle(): void {
    this.authService.initiateGoogleLogin();
  }

  handleGoogleCallback(code: string): Observable<AnyUser> {
    this.setLoading(true);
    return this.authService.handleOAuthCallback(code).pipe(
      switchMap(res => {
        const user = res.user;
        if (!user) {
          return throwError(() => new Error(res.message ?? 'Google login failed. Please try again.'));
        }
        this.setUser(user);
        this.redirectAfterLogin(user);
        return of(user);
      }),
      catchError(err => this.handleError(err)),
    );
  }

  registerPatient(payload: PatientRegisterRequest): Observable<AuthResponse> {
    this.setLoading(true);
    this.clearError();
    return this.authService.registerPatient(payload).pipe(
      tap(() => this.setLoading(false)),
      catchError(err => this.handleError(err)),
    );
  }

  registerDoctor(payload: DoctorRegisterRequest): Observable<AuthResponse> {
    this.setLoading(true);
    this.clearError();
    return this.authService.registerDoctor(payload).pipe(
      tap(() => this.setLoading(false)),
      catchError(err => this.handleError(err)),
    );
  }

  verifyEmail(payload: VerifyEmailRequest): Observable<AuthResponse> {
    this.setLoading(true);
    this.clearError();
    return this.authService.verifyEmail(payload).pipe(
      tap(() => this.setLoading(false)),
      catchError(err => this.handleError(err)),
    );
  }

  resendVerification(email: string): Observable<AuthResponse> {
    this.setLoading(true);
    this.clearError();
    return this.authService.resendVerification(email).pipe(
      tap(() => this.setLoading(false)),
      catchError(err => this.handleError(err)),
    );
  }

  logout(redirectPath: string = '/auth/login'): void {
    this.authService.logout().subscribe({
      complete: () => this.clearSession(redirectPath),
      error:    ()  => this.clearSession(redirectPath), // clear locally even if API fails
    });
  }

  refreshCurrentUser(): Observable<AnyUser> {
    return this.userService.getMe().pipe(
      switchMap((u: AppUser) => {
        if (u.userType === 'PATIENT') return this.userService.getPatientMe();
        if (u.userType === 'DOCTOR') return this.userService.getDoctorMe();
        return of(u as unknown as AnyUser);
      }),
      tap(user => this.setUser(user)),
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private setUser(user: AnyUser): void {
    this.storage.setUser(user);
    this._currentUser$.next(user);
    this.setLoading(false);
  }

  private clearSession(redirectPath?: string): void {
    this.storage.clearAll();
    this._currentUser$.next(null);
    if (redirectPath) this.router.navigate([redirectPath]);
  }

  private redirectAfterLogin(user: AnyUser): void {
    if (isAdministrator(user)) { this.router.navigate(['/admin/dashboard']); return; }
    if (user.userType === 'PATIENT') { this.router.navigate(['/']); return; }
    if (user.userType === 'DOCTOR') { this.router.navigate(['/doctor/profile']); return; }
    this.router.navigate(['/profile']);
  }

  private setLoading(state: boolean): void { this._loading$.next(state); }
  private clearError():                void { this._error$.next(null); }

  private handleError(err: unknown): Observable<never> {
    this.setLoading(false);
    const message = this.extractErrorMessage(err);
    this._error$.next(message);
    return throwError(() => new Error(message));
  }

  private extractErrorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const e = (err as { error?: { message?: string } }).error;
      if (e?.message) return e.message;
    }
    return 'Une erreur inattendue est survenue. Veuillez réessayer.';
  }
}
