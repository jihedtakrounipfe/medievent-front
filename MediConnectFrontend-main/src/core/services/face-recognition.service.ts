import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FaceStatus } from '../user';

@Injectable({ providedIn: 'root' })
export class FaceRecognitionService {
  private readonly base = `${environment.apiUrl}/api/face`;

  constructor(private http: HttpClient) {}

  getStatus(): Observable<FaceStatus> {
    return this.http.get<FaceStatus>(`${this.base}/status`);
  }

  enable(): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/enable`, {});
  }

  disable(): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/disable`, {});
  }

  enroll(image: Blob): Observable<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('image', image, 'face-enrollment.jpg');
    return this.http.post<{ success: boolean; message: string }>(`${this.base}/enroll`, formData);
  }
}
