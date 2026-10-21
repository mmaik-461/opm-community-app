'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CALLBACK_URL_PARAM } from '@/constants/routes';
import { safeCallbackUrl } from '@/utils/routes';

/** Returns a function that leaves the auth pages for the page the visitor originally wanted. */
export function usePostSignIn(): () => void {
  const router = useRouter();
  const callbackUrl = safeCallbackUrl(useSearchParams().get(CALLBACK_URL_PARAM));
  return React.useCallback(() => {
    router.replace(callbackUrl);
    // Server components (layout, session) must be re-read now that the cookie exists.
    router.refresh();
  }, [router, callbackUrl]);
}
