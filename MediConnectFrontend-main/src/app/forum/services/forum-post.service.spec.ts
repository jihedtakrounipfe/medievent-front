import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { ForumPostService } from './forum-post.service';

describe('ForumPostService', () => {
  let service: ForumPostService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(ForumPostService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('pin should POST to correct URL', () => {
    service.pin('123').subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/forum/posts/123/pin');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('unpin should POST to correct URL', () => {
    service.unpin('456').subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/forum/posts/456/unpin');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('clearReaction should DELETE with query string', () => {
    const response = { counts: { '👍': 1 }, userReaction: null };
    service.clearReaction('123', 1).subscribe(data => {
      expect(data).toEqual(response);
    });
    const req = httpMock.expectOne('http://localhost:8080/api/forum/posts/123/reactions?userId=1');
    expect(req.request.method).toBe('DELETE');
    req.flush(response);
  });

  it('clearReaction should fallback to DELETE body when query delete fails', () => {
    const response = { counts: { '👍': 1 }, userReaction: null };
    service.clearReaction('123', 1).subscribe(data => {
      expect(data).toEqual(response);
    });
    const firstReq = httpMock.expectOne('http://localhost:8080/api/forum/posts/123/reactions?userId=1');
    expect(firstReq.request.method).toBe('DELETE');
    firstReq.flush('error', { status: 500, statusText: 'Server Error' });

    const secondReq = httpMock.expectOne('http://localhost:8080/api/forum/posts/123/reactions');
    expect(secondReq.request.method).toBe('DELETE');
    expect(secondReq.request.body).toEqual({ userId: 1 });
    secondReq.flush(response);
  });
});
