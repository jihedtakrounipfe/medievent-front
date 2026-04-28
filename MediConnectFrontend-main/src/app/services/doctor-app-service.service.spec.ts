import { TestBed } from '@angular/core/testing';

import { DoctorAppServiceService } from './doctor-app-service.service';

describe('DoctorAppServiceService', () => {
  let service: DoctorAppServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DoctorAppServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
