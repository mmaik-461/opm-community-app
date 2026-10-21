'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  CREDENTIALS_PROVIDER_ID,
  DIPLOMA_NUMBER_HINT,
  EMPTY_REGISTER_VALUES,
  GRADUATION_YEAR_MIN,
  PASSWORD_MIN_LENGTH,
  SIGN_UP_PASSWORD_HINT,
  SIGN_UP_SIGN_IN_FAILED_MESSAGE,
  SIGN_UP_SUBMIT_LABEL,
} from '@/constants/auth';
import { PRIMARY_BUTTON_CLASS } from '@/constants/ui';
import { registerAlumnus } from '@/lib/api';
import { errorMessage } from '@/utils/errors';
import { buildRegisterPayload, currentYear, type RegisterFormValues } from '@/utils/register';
import { FormField } from './form-field';

export function RegisterForm() {
  const [values, setValues] = React.useState<RegisterFormValues>(EMPTY_REGISTER_VALUES);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const bind = (key: keyof RegisterFormValues) => ({
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value })),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = buildRegisterPayload(values);
      await registerAlumnus(payload);
      const res = await signIn(CREDENTIALS_PROVIDER_ID, {
        email: payload.email,
        password: payload.password,
        redirect: false,
      });
      if (res?.error) setError(SIGN_UP_SIGN_IN_FAILED_MESSAGE);
    } catch (err) {
      setError(errorMessage(err, 'Registration failed'));
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      <FormField
        id="sign-up-name"
        label="Full name"
        autoComplete="name"
        required
        {...bind('fullName')}
      />
      <FormField
        id="sign-up-email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        {...bind('email')}
      />
      <FormField
        id="sign-up-password"
        label="Password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        hint={SIGN_UP_PASSWORD_HINT}
        required
        {...bind('password')}
      />
      <FormField id="sign-up-city" label="City" required {...bind('city')} />
      <FormField id="sign-up-industry" label="Industry" required {...bind('industry')} />
      <FormField
        id="sign-up-graduation-year"
        label="Graduation year"
        type="number"
        inputMode="numeric"
        min={GRADUATION_YEAR_MIN}
        max={currentYear()}
        required
        {...bind('graduationYear')}
      />
      <FormField
        id="sign-up-diploma"
        label="Diploma ID (optional)"
        hint={DIPLOMA_NUMBER_HINT}
        {...bind('diplomaNumber')}
      />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting} className={PRIMARY_BUTTON_CLASS}>
        {submitting && <Loader2 className="animate-spin" />}
        {SIGN_UP_SUBMIT_LABEL}
      </Button>
    </form>
  );
}
