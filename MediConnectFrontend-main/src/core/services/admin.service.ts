import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserType } from '../user';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AdminUserResult {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  userType: UserType;
  isActive: boolean;
  isVerified?: boolean;
  createdAt: string;
  updatedAt?: string;
  gender?: string;
  dateOfBirth?: string;
  age?: number;
  twoFactorEnabled?: boolean;
  faceEnabled?: boolean;
  faceEnrolled?: boolean;

  rppsNumber?: string;
  specialization?: string;
  specializationLabel?: string;
  verificationStatus?: string;
  officeAddress?: string;
  consultationFee?: number;

  bloodType?: string;
  biometricEnrolled?: boolean;
}

export type AdminSearchPage = PageResponse<AdminUserResult>;

export interface AuditLogEntry {
  id: number;
  action: string;
  category?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  success: boolean;
}

export interface AuditActionStat {
  action: string;
  count: number;
  successCount: number;
  failedCount: number;
}

export interface AuditCategoryStat {
  category: string;
  count: number;
}

export interface MostActiveAccount {
  userId: number;
  userEmail: string;
  firstName?: string;
  lastName?: string;
  userType?: UserType;
  actionCount: number;
  successCount: number;
  failedCount: number;
  lastActivityAt?: string;
}

export interface UserAuditSummary {
  totalLogs: number;
  successfulLogs: number;
  failedLogs: number;
  lastActivityAt?: string;
  topActions: AuditActionStat[];
}

export interface AdminAuditStats {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  activeUsers: number;
  totalAuditLogs: number;
  successfulAuditLogs: number;
  failedAuditLogs: number;
  topActions: AuditActionStat[];
  categoryBreakdown: AuditCategoryStat[];
  mostActiveAccounts: MostActiveAccount[];
}

export interface AdminSearchCriteria {
  q?: string;
  userType?: string;
  specialty?: string;
  status?: string;
  bloodType?: string;
  ageMin?: number;
  ageMax?: number;
  signedUpSince?: string;
  signedUpUntil?: string;
  isActive?: boolean;
  is2FAEnabled?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly adminUrl = `${environment.apiUrl}/api/admin/users`;
  private readonly statsUrl = `${environment.apiUrl}/api/admin/stats`;

  constructor(private http: HttpClient) {}

  searchUsers(criteria: AdminSearchCriteria): Observable<AdminSearchPage> {
    let params = new HttpParams();

    if (criteria.q) params = params.set('q', criteria.q);
    if (criteria.userType) params = params.set('userType', criteria.userType);
    if (criteria.specialty) params = params.set('specialty', criteria.specialty);
    if (criteria.status) params = params.set('status', criteria.status);
    if (criteria.bloodType) params = params.set('bloodType', criteria.bloodType);
    if (criteria.ageMin != null) params = params.set('ageMin', String(criteria.ageMin));
    if (criteria.ageMax != null) params = params.set('ageMax', String(criteria.ageMax));
    if (criteria.signedUpSince) params = params.set('signedUpSince', criteria.signedUpSince);
    if (criteria.signedUpUntil) params = params.set('signedUpUntil', criteria.signedUpUntil);
    if (criteria.isActive != null) params = params.set('isActive', String(criteria.isActive));
    if (criteria.is2FAEnabled != null) params = params.set('is2FAEnabled', String(criteria.is2FAEnabled));

    params = params.set('page', String(criteria.page ?? 0));
    params = params.set('size', String(criteria.size ?? 20));
    params = params.set('sort', criteria.sort ?? 'createdAt,desc');

    return this.http.get<AdminSearchPage>(`${this.adminUrl}/search`, { params });
  }

  getUserAuditLogs(userId: number, page = 0, size = 10): Observable<PageResponse<AuditLogEntry>> {
    return this.http.get<PageResponse<AuditLogEntry>>(`${this.adminUrl}/${userId}/audit-logs`, {
      params: { page: String(page), size: String(size) },
    });
  }

  getUserAuditSummary(userId: number): Observable<UserAuditSummary> {
    return this.http.get<UserAuditSummary>(`${this.adminUrl}/${userId}/audit-summary`);
  }

  getAuditDashboardStats(): Observable<AdminAuditStats> {
    return this.http.get<AdminAuditStats>(this.statsUrl);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${id}`);
  }
}
