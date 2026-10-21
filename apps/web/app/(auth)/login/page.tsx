import type { Metadata } from 'next';
import { AuthHeading } from '@/components/opm/auth-heading';
import { AuthNav } from '@/components/opm/auth-nav';
import { CredentialsForm, DevQuickLogin } from '@/components/opm/login-form';
import { SIGN_IN_SUBTITLE, SIGN_IN_TAB, SIGN_IN_TITLE } from '@/constants/auth';
import { CALLBACK_URL_PARAM } from '@/constants/routes';
import { isDevLoginEnabled } from '@/utils/auth';

export const metadata: Metadata = { title: SIGN_IN_TAB };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { [CALLBACK_URL_PARAM]?: string };
}) {
  return (
    <>
      <AuthHeading title={SIGN_IN_TITLE} subtitle={SIGN_IN_SUBTITLE} />
      <AuthNav active="login" callbackUrl={searchParams[CALLBACK_URL_PARAM]} />
      <CredentialsForm />
      {isDevLoginEnabled() && <DevQuickLogin />}
    </>
  );
}
