// Auth-related DTOs & request/response shapes.
// These are transport objects — not domain models.

import type { AppUser } from '../models/app-user.model';
import type { AnyUser } from '../models';
import { Gender, Specialization } from '../enums';


// ── Login ────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginWith2FARequest extends LoginRequest {
  totpCode: string;
}

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number; // seconds
  user?: AnyUser;
  message?: string;
  requires2FA?: boolean;
}


// ── Registration ─────────────────────────────────────────────────────────

export interface PatientRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth: string; // ISO date
  gender?: Gender;
  bloodType?: string;
  allergies?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  profilePicture?: string;
}

export interface DoctorRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string; // ISO date
  gender?: Gender;
  address?: string;
  rppsNumber: string;
  specialization: Specialization;
  licenseNumber?: string;
  officeAddress?: string;
  consultationDuration?: number;
  consultationFee?: number;
  profilePicture?: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}


// ── Password Reset ───────────────────────────────────────────────────────

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}


// ── Token ────────────────────────────────────────────────────────────────

export interface RefreshTokenRequest {
  refreshToken: string;
}


// ── Biometric ────────────────────────────────────────────────────────────

export interface BiometricEnrollRequest {
  photos: string[]; // base64-encoded frames (3–5)
}


// ── Profile Update ───────────────────────────────────────────────────────

// Remove read-only identity fields from AppUser
type EditableUserFields = Omit<
  AppUser,
  'id' | 'keycloakId' | 'userType' | 'createdAt' | 'updatedAt'
>;

// Make remaining fields optional
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  profilePicture?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodType?: string;
  allergies?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  specialization?: Specialization;
  licenseNumber?: string;
  consultationDuration?: number;
  consultationFee?: number;
  officeAddress?: string;
}
