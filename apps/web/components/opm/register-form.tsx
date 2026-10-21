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
  PASSWORD_MISMATCH_MESSAGE,
  SIGN_UP_SIGN_IN_FAILED_MESSAGE,
  SIGN_UP_SUBMIT_LABEL,
} from '@/constants/auth';
import { PRIMARY_BUTTON_CLASS } from '@/constants/ui';
import { usePostSignIn } from '@/hooks/use-post-sign-in';
import { registerAlumnus } from '@/lib/api';
import { errorMessage } from '@/utils/errors';
import {
  buildRegisterPayload,
  currentYear,
  passwordError,
  passwordsMatch,
  type RegisterFormValues,
} from '@/utils/register';
import { FormField } from './form-field';
import { PasswordChecklist } from './password-checklist';
import { PasswordField } from './password-field';

export function RegisterForm() {
  const [values, setValues] = React.useState<RegisterFormValues>(EMPTY_REGISTER_VALUES);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [attempted, setAttempted] = React.useState(false);
  const afterSignIn = usePostSignIn();
  const passwordIssue = attempted ? passwordError(values.password, values.confirmPassword) : null;
  const mismatch =
    values.confirmPassword !== '' && !passwordsMatch(values.password, values.confirmPassword);

  const bind = (key: keyof RegisterFormValues) => ({
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value })),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (passwordError(values.password, values.confirmPassword)) return;
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
      else afterSignIn();
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
      <PasswordField
        id="sign-up-password"
        label="Password"
        toggleSubject="password"
        autoComplete="new-password"
        aria-describedby="sign-up-password-rules"
        required
        {...bind('password')}
      >
        <PasswordChecklist id="sign-up-password-rules" password={values.password} />
      </PasswordField>
      <PasswordField
        id="sign-up-confirm-password"
        label="Confirm password"
        toggleSubject="confirm password"
        autoComplete="new-password"
        error={mismatch ? PASSWORD_MISMATCH_MESSAGE : null}
        required
        {...bind('confirmPassword')}
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
      {passwordIssue && !mismatch && (
        <p role="alert" className="text-sm text-red-700">
          {passwordIssue}
        </p>
      )}
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
