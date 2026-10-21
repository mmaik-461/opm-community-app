'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import type { Profile } from '@opm/shared-types';
import { Button } from '@/components/ui/button';
import {
  CREDENTIALS_PROVIDER_ID,
  DEV_LOGIN_FAILED_MESSAGE,
  DEV_LOGIN_HEADING,
  DEV_LOGIN_HINT,
  DEV_PROVIDER_ID,
  SIGN_IN_FAILED_MESSAGE,
} from '@/constants/auth';
import { LABEL_CLASS, PRIMARY_BUTTON_CLASS } from '@/constants/ui';
import { usePostSignIn } from '@/hooks/use-post-sign-in';
import { fetchDevProfiles } from '@/lib/api';
import { FormField } from './form-field';

export function CredentialsForm() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const afterSignIn = usePostSignIn();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await signIn(CREDENTIALS_PROVIDER_ID, { email, password, redirect: false });
    if (res?.error) {
      setError(SIGN_IN_FAILED_MESSAGE);
      setSubmitting(false);
      return;
    }
    afterSignIn();
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      <FormField
        id="sign-in-email"
        label="Email"
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <FormField
        id="sign-in-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting} className={PRIMARY_BUTTON_CLASS}>
        {submitting && <Loader2 className="animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}

export function DevQuickLogin() {
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const afterSignIn = usePostSignIn();

  React.useEffect(() => {
    const controller = new AbortController();
    fetchDevProfiles(controller.signal)
      .then(setProfiles)
      .catch(() => {
        if (!controller.signal.aborted) setError(DEV_LOGIN_FAILED_MESSAGE);
      });
    return () => controller.abort();
  }, []);

  async function devSignIn(profileId: string) {
    const res = await signIn(DEV_PROVIDER_ID, { profileId, redirect: false });
    if (res?.error) setError(DEV_LOGIN_FAILED_MESSAGE);
    else afterSignIn();
  }

  return (
    <section aria-labelledby="dev-login-heading" className="border-t border-zinc-200 pt-6">
      <h2 id="dev-login-heading" className={LABEL_CLASS}>
        {DEV_LOGIN_HEADING}
      </h2>
      <p className="mt-1 text-xs text-zinc-500">{DEV_LOGIN_HINT}</p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <ul className="mt-3 flex max-h-56 flex-col gap-1 overflow-y-auto">
        {profiles.map((p) => (
          <li key={p.id}>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => void devSignIn(p.id)}
            >
              Continue as {p.fullName}
              <span className="text-zinc-500">({p.cohort})</span>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
