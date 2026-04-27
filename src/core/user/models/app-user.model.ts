import { Gender, UserType } from '../enums';

export interface AppUser {
  id:              number;
  keycloakId?:     string;
  email:           string;
  firstName:       string;
  lastName:        string;
  phone?:          string;
  userType:        UserType;
  isActive:        boolean;
  profilePicture?: string;   // Swift Object Storage URL
  createdAt?:      string;   // ISO-8601
  updatedAt?:      string;

  specialization?: string;
  officeAddress?: string;
  isVerified?: boolean;
  bloodType?: string;
  allergies?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: Gender;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  biometricEnrolled?: boolean;
  twoFactorEnabled?: boolean;
  interests?: string[];
}
