import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { appointmentRedirectGuard } from './appointment-redirect.guard';

describe('appointmentRedirectGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => appointmentRedirectGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
