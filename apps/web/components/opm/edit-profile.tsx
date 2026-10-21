'use client';

import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { Profile } from '@opm/shared-types';
import { EDIT_PROFILE_SAVED_MESSAGE, SAVED_NOTICE_DURATION_MS } from '@/constants/profile-edit';
import { EditProfileDialog } from './edit-profile-dialog';
import { useUser } from './user-context';

interface Props {
  profile: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The edit dialog plus a floating "saved" notice; opened from the account menu. */
export function EditProfile({ profile, open, onOpenChange }: Props) {
  const { replaceProfile } = useUser();
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), SAVED_NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  return (
    <>
      <EditProfileDialog
        open={open}
        onOpenChange={onOpenChange}
        profile={profile}
        onSaved={(updated) => {
          replaceProfile(updated);
          setSaved(true);
        }}
      />
      {/* Kept out of the header so a save never reflows it. */}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50">
        {saved && (
          <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 shadow-md">
            <CheckCircle2 className="size-4" aria-hidden />
            {EDIT_PROFILE_SAVED_MESSAGE}
          </p>
        )}
      </div>
    </>
  );
}
