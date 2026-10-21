'use client';

import * as React from 'react';
import { Loader2, Network } from 'lucide-react';
import { signIn } from 'next-auth/react';
import type { Profile } from '@opm/shared-types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AUTH_TAB_SIGN_IN,
  AUTH_TAB_SIGN_UP,
  CREDENTIALS_PROVIDER_ID,
  DEV_LOGIN_FAILED_MESSAGE,
  DEV_LOGIN_HEADING,
  DEV_LOGIN_HINT,
  DEV_PROVIDER_ID,
  SIGN_IN_FAILED_MESSAGE,
  SIGN_IN_SUBTITLE,
  SIGN_IN_TAB,
  SIGN_IN_TITLE,
  SIGN_UP_TAB,
} from '@/constants/auth';
import { LABEL_CLASS, PRIMARY_BUTTON_CLASS } from '@/constants/ui';
import { fetchDevProfiles } from '@/lib/api';
import { FormField } from './form-field';
import { RegisterForm } from './register-form';

function CredentialsForm() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await signIn(CREDENTIALS_PROVIDER_ID, { email, password, redirect: false });
    if (res?.error) setError(SIGN_IN_FAILED_MESSAGE);
    setSubmitting(false);
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

function DevQuickLogin() {
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    fetchDevProfiles(controller.signal)
      .then(setProfiles)
      .catch(() => {
        if (!controller.signal.aborted) setError(DEV_LOGIN_FAILED_MESSAGE);
      });
    return () => controller.abort();
  }, []);

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
              onClick={() => void signIn(DEV_PROVIDER_ID, { profileId: p.id, redirect: false })}
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

export function SignIn({ devLoginEnabled }: { devLoginEnabled: boolean }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Network className="size-5" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">{SIGN_IN_TITLE}</h1>
      </div>
      <p className="text-sm text-zinc-600">{SIGN_IN_SUBTITLE}</p>
      <Tabs defaultValue={AUTH_TAB_SIGN_IN}>
        <TabsList className="w-full">
          <TabsTrigger value={AUTH_TAB_SIGN_IN}>{SIGN_IN_TAB}</TabsTrigger>
          <TabsTrigger value={AUTH_TAB_SIGN_UP}>{SIGN_UP_TAB}</TabsTrigger>
        </TabsList>
        <TabsContent value={AUTH_TAB_SIGN_IN} className="pt-4">
          <CredentialsForm />
        </TabsContent>
        <TabsContent value={AUTH_TAB_SIGN_UP} className="pt-4">
          <RegisterForm />
        </TabsContent>
      </Tabs>
      {devLoginEnabled && <DevQuickLogin />}
    </main>
  );
}
