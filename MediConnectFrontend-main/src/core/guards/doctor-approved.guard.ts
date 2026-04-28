import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthFacade } from '../services/auth.facade';
import { AnyUser } from '../user';

export const doctorApprovedGuard: CanActivateFn = () => {
  const facade = inject(AuthFacade);
  const router = inject(Router);

  const current = facade.currentUser;
  if (!current) return router.createUrlTree(['/auth/login']);
  if (current.userType !== 'DOCTOR') return router.createUrlTree(['/profile']);

  return facade.refreshCurrentUser().pipe(
    map((u: AnyUser) => {
      if (u.userType !== 'DOCTOR') return router.createUrlTree(['/profile']);

      const isVerified = !!(u as unknown as { isVerified?: boolean }).isVerified;
      const status = (u as unknown as { verificationStatus?: string }).verificationStatus;

      if (!isVerified) return router.createUrlTree(['/profile']);
      if (status === 'APPROVED') return true;
      if (status === 'PENDING') return router.createUrlTree(['/doctor/pending-approval']);
      return router.createUrlTree(['/doctor/rejected'], { queryParams: { status: status ?? '' } });
    }),
    catchError(() => of(router.createUrlTree(['/profile']))),
  );
};

