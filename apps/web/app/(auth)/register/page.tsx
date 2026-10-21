import type { Metadata } from 'next';
import { AuthHeading } from '@/components/opm/auth-heading';
import { AuthNav } from '@/components/opm/auth-nav';
import { RegisterForm } from '@/components/opm/register-form';
import { SIGN_UP_SUBTITLE, SIGN_UP_TAB, SIGN_UP_TITLE } from '@/constants/auth';
import { CALLBACK_URL_PARAM } from '@/constants/routes';

export const metadata: Metadata = { title: SIGN_UP_TAB };

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { [CALLBACK_URL_PARAM]?: string };
}) {
  return (
    <>
      <AuthHeading title={SIGN_UP_TITLE} subtitle={SIGN_UP_SUBTITLE} />
      <AuthNav active="register" callbackUrl={searchParams[CALLBACK_URL_PARAM]} />
      <RegisterForm />
    </>
  );
}
