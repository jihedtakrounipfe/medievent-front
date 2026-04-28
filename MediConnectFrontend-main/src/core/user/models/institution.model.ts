import { InstitutionType, UserType } from '../enums';
import { AppUser }                   from './app-user.model';

export interface Institution extends AppUser {
  userType:         UserType.INSTITUTION;
  institutionName?: string;
  siretNumber?:     string;
  institutionType?: InstitutionType;
  oauthClientId?:   string;
  address?:         string;
  apiAccessScopes?: string;   // JSON list of scopes
}
