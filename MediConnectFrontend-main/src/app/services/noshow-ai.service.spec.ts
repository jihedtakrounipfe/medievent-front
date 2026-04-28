import { TestBed } from '@angular/core/testing';

import { NoshowAiService } from './noshow-ai.service';

describe('NoshowAiService', () => {
  let service: NoshowAiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NoshowAiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
