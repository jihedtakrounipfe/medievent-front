import { AdminLevel, UserType } from '../enums';
import { AppUser }              from './app-user.model';

export interface Administrator extends AppUser {
  userType:          UserType.ADMINISTRATOR;
  adminLevel?:       AdminLevel;
  department?:       string;
  twoFactorEnforced?: boolean;
  biometricRequired?: boolean;
  lastLoginIp?:      string;
}
