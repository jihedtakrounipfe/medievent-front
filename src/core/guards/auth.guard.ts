// src/app/core/guards/auth.guard.ts
// Route guard using the new Angular functional guard API (v15+)

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthFacade } from '../services/auth.facade';
import { UserType } from '../user';

/** Requires an authenticated session */
export const authGuard: CanActivateFn = () => {
  const facade = inject(AuthFacade);
  const router = inject(Router);
  return facade.isLoggedIn$.pipe(
    map(loggedIn => loggedIn ? true : router.createUrlTree(['/auth/login'])),
  );
};

/** Redirect logged-in users away from /auth pages */
export const guestGuard: CanActivateFn = () => {
  const facade = inject(AuthFacade);
  const router = inject(Router);
  return facade.isLoggedIn$.pipe(
    map(loggedIn => loggedIn ? router.createUrlTree(['/dashboard']) : true),
  );
};

/** Factory — restrict route to specific user types */
export const roleGuard = (...allowedRoles: UserType[]): CanActivateFn => () => {
  const facade = inject(AuthFacade);
  const router = inject(Router);
  const user   = facade.currentUser;

  if (!user)                             return router.createUrlTree(['/auth/login']);
  if (!allowedRoles.includes(user.userType)) return router.createUrlTree(['/forbidden']);
  return true;
};

// ── Convenience guards ────────────────────────────────────────────────────────

export const patientGuard:       CanActivateFn = roleGuard(UserType.PATIENT);
export const doctorGuard:        CanActivateFn = roleGuard(UserType.DOCTOR, UserType.ADMINISTRATOR);
export const administratorGuard: CanActivateFn = roleGuard(UserType.ADMINISTRATOR);