import type { RegisterDto } from '@opm/shared-types';
import type { EMPTY_REGISTER_VALUES } from '@/constants/auth';

export type RegisterFormValues = typeof EMPTY_REGISTER_VALUES;

export function currentYear(now: Date = new Date()): number {
  return now.getFullYear();
}

/** Trims the form and drops the optional diploma number when left blank. */
export function buildRegisterPayload(values: RegisterFormValues): RegisterDto {
  const diplomaNumber = values.diplomaNumber.trim();
  return {
    email: values.email.trim(),
    password: values.password,
    fullName: values.fullName.trim(),
    city: values.city.trim(),
    industry: values.industry.trim(),
    graduationYear: Number(values.graduationYear),
    ...(diplomaNumber && { diplomaNumber }),
  };
}
