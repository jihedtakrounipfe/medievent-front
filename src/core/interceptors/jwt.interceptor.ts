// src/app/core/interceptors/jwt.interceptor.ts
// Automatically attaches the Bearer token + handles 401 → refresh → retry

import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpEvent,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { StorageService } from '../services/storage.service';

// Module-level refresh state — prevents concurrent refresh storms
let isRefreshing    = false;
const refreshDone$ = new BehaviorSubject<string | null>(null);

export const jwtInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {

  const storage     = inject(StorageService);
  const authService = inject(AuthService);

  const token = storage.getAccessToken();

  // Skip auth header for public endpoints
  if (isPublicEndpoint(req.url)) {
    return next(req);
  }

  const authedReq = token ? addToken(req, token) : req;

  return next(authedReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        return handle401(req, next, authService, storage);
      }
      return throwError(() => err);
    }),
  );
};

function handle401(
  req:         HttpRequest<unknown>,
  next:        HttpHandlerFn,
  authService: AuthService,
  storage:     StorageService,
): Observable<HttpEvent<unknown>> {

  if (!isRefreshing) {
    isRefreshing = true;
    refreshDone$.next(null);

    return authService.refreshToken().pipe(
      switchMap(res => {
        const token = res.accessToken;
        if (!token) {
          throw new Error('Token refresh did not return an access token.');
        }
        isRefreshing = false;
        refreshDone$.next(token);
        return next(addToken(req, token));
      }),
      catchError(err => {
        isRefreshing = false;
        storage.clearAll();
        // AuthFacade will redirect — avoid circular injection here
        window.location.href = '/auth/login';
        return throwError(() => err);
      }),
    );
  }

  // Queue subsequent 401s until the refresh completes
  return refreshDone$.pipe(
    filter(token => token !== null),
    take(1),
    switchMap(token => next(addToken(req, token as string))),
  );
}

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isPublicEndpoint(url: string): boolean {
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/password-reset',
    '/api/auth/verify-email',
    '/api/auth/oauth/callback',
  ];
  return publicPaths.some(p => url.includes(p));
}
