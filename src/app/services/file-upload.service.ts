import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private readonly base = `${environment.apiUrl}/api/files`;

  constructor(private http: HttpClient) {}

  uploadImage(file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string }>(`${this.base}/upload`, form);
  }

  uploadImageEvents(file: File): Observable<HttpEvent<{ url: string }>> {
    const form = new FormData();
    form.append('file', file);
    const req = new HttpRequest('POST', `${this.base}/upload`, form, {
      reportProgress: true,
      responseType: 'json',
    });
    return this.http.request<{ url: string }>(req);
  }
}

