// Auth-related DTOs & request/response shapes.
// These are transport objects — not domain models.

import type { AppUser } from '../models/app-user.model';
import type { AnyUser } from '../models';
import { Gender, Specialization } from '../enums';


// ── MFA types ─────────────────────────────────────────────────────────────

export type MfaMethodType = 'FACE' | 'TOTP' | 'EMAIL' | 'RECOVERY';

export interface MfaState {
  mfaSessionToken: string;
  enabledMethods:  MfaMethodType[];
  primaryMethod:   MfaMethodType;
  attemptsRemaining: Record<MfaMethodType, number>;
  recoveryCodesRemaining?: number;
  message?: string;
}

// ── Login ────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;

  // New multi-method MFA fields
  mfaSessionToken?: string;
  mfaMethod?: MfaMethodType;
  mfaCode?: string;
  recoveryCode?: string;

  // Legacy fields — kept for backward compatibility
  /** @deprecated use mfaCode */
  otpCode?: string;
  /** @deprecated use mfaMethod=FACE + mfaCode */
  faceImage?: string;
  /** @deprecated use mfaMethod=EMAIL */
  useEmailFallback?: boolean;

  /** Required on credential step; omitted on MFA follow-up steps */
  recaptchaToken?: string;
}

export interface LoginWith2FARequest extends LoginRequest {
  totpCode: string;
}

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  user?: AnyUser;
  message?: string;

  // New multi-method MFA fields
  requiresMfa?: boolean;
  mfaSessionToken?: string;
  enabledMethods?: MfaMethodType[];
  primaryMethod?: MfaMethodType;
  attemptsRemaining?: Record<MfaMethodType, number>;
  allMethodsExhausted?: boolean;
  recoveryCodesRemaining?: number;
  failedMethod?: MfaMethodType;

  // Legacy fields
  /** @deprecated use requiresMfa */
  requires2FA?: boolean;
  /** @deprecated use requiresMfa + primaryMethod='FACE' */
  requiresFace?: boolean;
  /** @deprecated use enabledMethods + primaryMethod */
  faceFallback?: boolean;
  /** @deprecated use attemptsRemaining['FACE'] */
  faceAttemptsRemaining?: number;
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
  recaptchaToken: string;
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
  recaptchaToken: string;
}


// ── 2FA ──────────────────────────────────────────────────────────────────────

export interface TwoFactorMethod {
  type: 'TOTP' | 'EMAIL' | 'SMS';
  label: string;
  configured: boolean;
  available: boolean;
}

export interface TwoFactorStatus {
  enabled: boolean;
  methods: TwoFactorMethod[];
}

export interface FaceStatus {
  faceEnabled: boolean;
  faceEnrolled: boolean;
}

export interface Enable2FARequest {
  method: 'TOTP' | 'EMAIL';
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}


// ── Password Change (in-app, authenticated — two-step) ────────────────────

export interface ChangePasswordRequest {
  /** Short-lived UUID token received after completing step 1 (verify-code). */
  verificationToken: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ── Password Reset ───────────────────────────────────────────────────────

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}


// ── Token ────────────────────────────────────────────────────────────────

export interface RefreshTokenRequest {
  refreshToken: string;
}


// ── Biometric ────────────────────────────────────────────────────────────

export interface BiometricEnrollRequest {
  photos: string[]; // base64-encoded frames (3–5)
}


// ── Google Login ──────────────────────────────────────────────────────────

export interface GoogleUserInfo {
  email:      string;
  firstName:  string;
  lastName:   string;
  pictureUrl: string;
  googleId:   string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface GoogleLoginResponse {
  success:          boolean;
  isNewUser:        boolean;
  requiresLinking:  boolean;
  email?:           string;
  googleProfile?:   GoogleUserInfo;
  accessToken?:     string;
  refreshToken?:    string;
  tokenType?:       string;
  expiresIn?:       number;
  userType?:        string;
  message?:         string;

  // New multi-method MFA fields
  requiresMfa?:           boolean;
  mfaSessionToken?:       string;
  enabledMethods?:        MfaMethodType[];
  primaryMethod?:         MfaMethodType;
  attemptsRemaining?:     Record<MfaMethodType, number>;
  allMethodsExhausted?:   boolean;
  recoveryCodesRemaining?: number;
  failedMethod?:          MfaMethodType;

  // Legacy fields
  /** @deprecated use requiresMfa */
  requires2FA?:           boolean;
  /** @deprecated use requiresMfa + primaryMethod='FACE' */
  requiresFace?:          boolean;
  /** @deprecated */
  faceFallback?:          boolean;
  /** @deprecated */
  faceAttemptsRemaining?: number;
}

export interface GoogleLinkConfirmRequest {
  email:           string;
  currentPassword: string;
  googleId:        string;
}

export interface Google2FAVerifyRequest {
  email:   string;
  otpCode: string;
}

export interface GoogleRegisterRequest {
  email:               string;
  firstName:           string;
  lastName:            string;
  pictureUrl?:         string;
  googleId:            string;
  role:                'PATIENT' | 'DOCTOR';
  password?:           string;
  phone?:              string;
  address?:            string;
  dateOfBirth?:        string;
  gender?:             Gender;
  rppsNumber?:         string;
  specialization?:     Specialization;
  licenseNumber?:      string;
  consultationDuration?: number;
  consultationFee?:    number;
  officeAddress?:      string;
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


// ── TOTP ──────────────────────────────────────────────────────────────────

export interface TotpStatus {
  totpEnabled:            boolean;
  totpEnrolled:           boolean;
  recoveryCodesRemaining: number;
}

export interface TotpSetupInitResponse {
  secret:        string;
  qrCodeDataUri: string;
}

export interface TotpSetupVerifyRequest {
  code: string;
}

export interface TotpSetupVerifyResponse {
  recoveryCodes: string[];
}

export interface TotpRegenerateCodesResponse {
  recoveryCodes: string[];
}
