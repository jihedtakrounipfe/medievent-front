import type { Patient } from './patient.model';
import type { Doctor } from './doctor.model';
import type { Administrator } from './administrator.model';
import type { Institution } from './institution.model';
import { UserType } from '../enums';

export type AnyUser =
  | Patient
  | Doctor
  | Administrator
  | Institution;

export function isPatient(user: AnyUser): user is Patient {
  return user.userType === UserType.PATIENT;
}

export function isDoctor(user: AnyUser): user is Doctor {
  return user.userType === UserType.DOCTOR;
}

export function isAdministrator(user: AnyUser): user is Administrator {
  return user.userType === UserType.ADMINISTRATOR;
}

export function isInstitution(user: AnyUser): user is Institution {
  return user.userType === UserType.INSTITUTION;
}