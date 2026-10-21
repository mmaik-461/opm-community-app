'use client';

import * as React from 'react';
import { Pencil } from 'lucide-react';
import type { Profile } from '@opm/shared-types';
import { Button } from '@/components/ui/button';
import { EDIT_PROFILE_LABEL, EDIT_PROFILE_SAVED_MESSAGE } from '@/constants/profile-edit';
import { EditProfileDialog } from './edit-profile-dialog';
import { useUser } from './user-context';

/** Header action: opens the edit dialog and announces a successful save. */
export function EditProfile({ profile }: { profile: Profile }) {
  const { replaceProfile } = useUser();
  const [open, setOpen] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  return (
    <>
      <span aria-live="polite" className="sr-only text-xs text-emerald-700 lg:not-sr-only">
        {saved ? EDIT_PROFILE_SAVED_MESSAGE : ''}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-9 border-zinc-200"
        aria-label={EDIT_PROFILE_LABEL}
        onClick={() => {
          setSaved(false);
          setOpen(true);
        }}
      >
        <Pencil aria-hidden />
        <span className="hidden sm:inline">{EDIT_PROFILE_LABEL}</span>
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
    </>
  );
}
