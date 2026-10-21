'use client';

import * as React from 'react';
import { CheckCircle2, Pencil } from 'lucide-react';
import type { Profile } from '@opm/shared-types';
import { Button } from '@/components/ui/button';
import {
  EDIT_PROFILE_LABEL,
  EDIT_PROFILE_SAVED_MESSAGE,
  SAVED_NOTICE_DURATION_MS,
} from '@/constants/profile-edit';
import { EditProfileDialog } from './edit-profile-dialog';
import { useUser } from './user-context';

/** Header action: an icon button that opens the edit dialog; success is announced in a floating notice. */
export function EditProfile({ profile }: { profile: Profile }) {
  const { replaceProfile } = useUser();
  const [open, setOpen] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), SAVED_NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 text-zinc-600"
        aria-label={EDIT_PROFILE_LABEL}
        title={EDIT_PROFILE_LABEL}
        onClick={() => {
          setSaved(false);
          setOpen(true);
        }}
      >
        <Pencil aria-hidden />
      </Button>
      <EditProfileDialog
        open={open}
        onOpenChange={setOpen}
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
