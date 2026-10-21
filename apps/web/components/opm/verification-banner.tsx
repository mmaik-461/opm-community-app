import { ShieldAlert } from 'lucide-react';
import { VERIFICATION_BANNER_MESSAGE, VERIFICATION_BANNER_TITLE } from '@/constants/auth';

export function VerificationBanner() {
  return (
    <div
      role="status"
      className="mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
    >
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
      <div className="text-sm text-amber-900">
        <p className="font-semibold">{VERIFICATION_BANNER_TITLE}</p>
        <p className="text-amber-800">{VERIFICATION_BANNER_MESSAGE}</p>
      </div>
    </div>
  );
}
