import { Specialization, UserType, VerificationStatus } from '../enums';
import { AppUser }                                       from './app-user.model';

export interface Doctor extends AppUser {
  userType:             UserType.DOCTOR;
  rppsNumber:           string;
  specialization?:      Specialization;
  licenseNumber?:       string;
  consultationDuration?: number;   // default 30 min
  consultationFee?: number;
  officeAddress?:       string;
  verificationStatus?:  VerificationStatus;
  googleCalendarLinked: boolean;
  institutionId?:       number;
  dateOfBirth?: string;

}
