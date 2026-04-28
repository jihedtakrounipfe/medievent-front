import { TestBed } from '@angular/core/testing';

import { AiContentService } from './forum/services/ai-content.service';

describe('AiContentService', () => {
  let service: AiContentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiContentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
