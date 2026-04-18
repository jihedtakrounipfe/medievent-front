import { Gender, UserType } from '../enums';
import { AppUser }          from './app-user.model';

export interface Patient extends AppUser {
  userType:             UserType.PATIENT;
  dateOfBirth:          string;
  gender?:              Gender;
  bloodType?:           string;
  allergies?:           string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  biometricEnrolled:    boolean;
  googleCalendarLinked: boolean;
}
