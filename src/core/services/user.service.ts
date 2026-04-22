import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AnyUser, AppUser, Doctor, Patient, UpdateProfileRequest, UserType, VerificationStatus } from '../user';

@Injectable({ providedIn: 'root' })
export class UserService {

  private readonly baseV1 = `${environment.apiUrl}/api/v1`;

  constructor(private http: HttpClient) {}

  getMe(): Observable<AppUser> {
    return this.http.get<AppUser>(`${this.baseV1}/users/me`);
  }

  getUserById(id: number): Observable<AppUser> {
    return this.http.get<AppUser>(`${this.baseV1}/users/${id}`);
  }

  searchUsers(params: {
    name?: string;
    email?: string;
    userType?: UserType;
    specialization?: string;
    city?: string;
    isActive?: boolean;
    isVerified?: boolean;
    page?: number;
    size?: number;
  }): Observable<{ content: AppUser[]; totalElements: number; totalPages: number }> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<{ content: AppUser[]; totalElements: number; totalPages: number }>(
      `${this.baseV1}/users/search`,
      { params: httpParams },
    );
  }

  getPatientMe(): Observable<Patient> {
    return this.http.get<Patient>(`${this.baseV1}/patients/me`);
  }

  updatePatientMe(payload: UpdateProfileRequest): Observable<Patient> {
    return this.http.patch<Patient>(`${this.baseV1}/patients/me`, payload);
  }

  updatePatientProfile(id: number, payload: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    bloodType?: string;
    allergies?: string;
    address?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    profilePicture?: string;
  }): Observable<Patient> {
    return this.http.put<Patient>(`${this.baseV1}/patients/${id}/profile`, payload);
  }

  getDoctorMe(): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.baseV1}/doctors/me`);
  }

  updateDoctorMe(payload: UpdateProfileRequest): Observable<Doctor> {
    return this.http.patch<Doctor>(`${this.baseV1}/doctors/me`, payload);
  }

  updateDoctorProfile(id: number, payload: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    profilePicture?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    specialization?: string;
    licenseNumber?: string;
    consultationDuration?: number;
    consultationFee?: number;
    officeAddress?: string;
  }): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.baseV1}/doctors/${id}/profile`, payload);
  }

  getPatientById(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.baseV1}/patients/${id}`);
  }

  getDoctorById(id: number): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.baseV1}/doctors/${id}`);
  }

  getAllPatients(page = 0, size = 20): Observable<{ content: Patient[]; totalElements: number; totalPages: number }> {
    return this.http.get<{ content: Patient[]; totalElements: number; totalPages: number }>(
      `${this.baseV1}/patients`,
      { params: { page, size } },
    );
  }

  getAllDoctors(page = 0, size = 20): Observable<{ content: Doctor[]; totalElements: number; totalPages: number }> {
    return this.http.get<{ content: Doctor[]; totalElements: number; totalPages: number }>(
      `${this.baseV1}/doctors/all`,
      { params: { page, size } },
    );
  }

  getDoctorsForAdmin(status?: VerificationStatus): Observable<Doctor[]> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return this.http.get<Doctor[]>(
      `${this.baseV1}/doctors`,
      { params },
    );
  }

  approveDoctor(id: number): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.baseV1}/doctors/${id}/approve`, {});
  }

  rejectDoctor(id: number, reason: string): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.baseV1}/doctors/${id}/reject`, { reason });
  }

  suspendDoctor(id: number, reason: string): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.baseV1}/doctors/${id}/suspend`, { reason });
  }

  reactivateDoctor(id: number): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.baseV1}/doctors/${id}/reactivate`, {});
  }

  activatePatient(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseV1}/patients/${id}/activate`, {});
  }

  deactivatePatient(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseV1}/patients/${id}/deactivate`, {});
  }

  activateDoctor(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseV1}/doctors/${id}/activate`, {});
  }

  deactivateDoctor(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseV1}/doctors/${id}/deactivate`, {});
  }

  getAdminStats(): Observable<{ totalUsers: number; totalPatients: number; totalDoctors: number; activeUsers: number; pendingDoctors: number }> {
    return this.http.get<{ totalUsers: number; totalPatients: number; totalDoctors: number; activeUsers: number; pendingDoctors: number }>(
      `${this.baseV1}/admin/stats`,
    );
  }
}
