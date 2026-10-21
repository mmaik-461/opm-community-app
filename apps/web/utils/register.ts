import { PASSWORD_RULES, type PasswordRule, type RegisterDto } from '@opm/shared-types';
import {
  PASSWORD_MISMATCH_MESSAGE,
  PASSWORD_WEAK_MESSAGE,
  type EMPTY_REGISTER_VALUES,
} from '@/constants/auth';

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

export interface PasswordCheck extends Pick<PasswordRule, 'id' | 'label'> {
  met: boolean;
}

export function checkPassword(password: string): PasswordCheck[] {
  return PASSWORD_RULES.map(({ id, label, test }) => ({ id, label, met: test(password) }));
}

/** First problem blocking submission, or null when the passwords are acceptable. */
export function passwordError(password: string, confirmPassword: string): string | null {
  if (checkPassword(password).some((check) => !check.met)) return PASSWORD_WEAK_MESSAGE;
  return passwordsMatch(password, confirmPassword) ? null : PASSWORD_MISMATCH_MESSAGE;
}

export const passwordsMatch = (password: string, confirmPassword: string): boolean =>
  password === confirmPassword;
