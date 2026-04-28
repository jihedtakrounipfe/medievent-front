// src/app/core/guards/appointment-redirect.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { StorageService } from '../../../core/services/storage.service';

export const appointmentRedirectGuard: CanActivateFn = () => {
  const storage = inject(StorageService);
  const router  = inject(Router);

  const user = storage.getUser<any>();

  console.log('user:', user);
  console.log('userType:', user?.userType);

  if (user?.userType === 'DOCTOR') {
    return router.createUrlTree(['/doctorapp']);
  }

  return true;
};