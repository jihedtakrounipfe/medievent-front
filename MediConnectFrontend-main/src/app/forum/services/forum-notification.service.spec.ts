import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ForumNotificationService } from './forum-notification.service';

describe('ForumNotificationService', () => {
  let service: ForumNotificationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ForumNotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('list should call notifications endpoint', () => {
    service.list().subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/forum/notifications?page=0&size=20');
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });
  });

  it('markAsRead should PUT correct URL', () => {
    service.markAsRead('a1').subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/forum/notifications/a1/read');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });
});
