'use client';

import * as React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { PROFILE_LIMITS, type Profile } from '@opm/shared-types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  BIO_ROWS,
  EDIT_PROFILE_DESCRIPTION,
  EDIT_PROFILE_FAILED_MESSAGE,
  EDIT_PROFILE_SAVE_LABEL,
  EDIT_PROFILE_SAVING_LABEL,
  EDIT_PROFILE_TITLE,
  SKILLS_HINT,
} from '@/constants/profile-edit';
import { LABEL_CLASS, PRIMARY_BUTTON_CLASS } from '@/constants/ui';
import { updateMyProfile } from '@/lib/api';
import { errorMessage } from '@/utils/errors';
import {
  buildUpdatePayload,
  hasProfileChanges,
  isProfileFormValid,
  profileToFormValues,
  type ProfileFormValues,
} from '@/utils/profile-form';
import { FormField } from './form-field';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  /** Called with the saved profile once the API has accepted the update. */
  onSaved: (profile: Profile) => void;
}

export function EditProfileDialog({ open, onOpenChange, profile, onSaved }: Props) {
  const [values, setValues] = React.useState<ProfileFormValues>(() => profileToFormValues(profile));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Start from the stored profile each time the dialog opens, discarding an abandoned draft.
  React.useEffect(() => {
    if (open) {
      setValues(profileToFormValues(profile));
      setError(null);
    }
    // Only reopening resets the draft; a background profile refresh must not wipe typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const bind = (key: keyof ProfileFormValues) => ({
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value })),
  });
  const canSave = isProfileFormValid(values) && hasProfileChanges(profile, values) && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await updateMyProfile(buildUpdatePayload(values));
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err, EDIT_PROFILE_FAILED_MESSAGE));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{EDIT_PROFILE_TITLE}</DialogTitle>
          <DialogDescription>{EDIT_PROFILE_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" aria-busy={saving}>
          <FormField
            id="edit-profile-name"
            label="Full name"
            autoComplete="name"
            maxLength={PROFILE_LIMITS.fullName}
            required
            {...bind('fullName')}
          />
          <FormField
            id="edit-profile-headline"
            label="Headline"
            maxLength={PROFILE_LIMITS.headline}
            required
            {...bind('headline')}
          />
          <div>
            <label htmlFor="edit-profile-bio" className={`${LABEL_CLASS} mb-2 block`}>
              Bio
            </label>
            <Textarea
              id="edit-profile-bio"
              rows={BIO_ROWS}
              maxLength={PROFILE_LIMITS.bio}
              className="resize-none text-sm"
              {...bind('bio')}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="edit-profile-city"
              label="City"
              maxLength={PROFILE_LIMITS.city}
              required
              {...bind('city')}
            />
            <FormField
              id="edit-profile-industry"
              label="Industry"
              maxLength={PROFILE_LIMITS.industry}
              required
              {...bind('industry')}
            />
          </div>
          <FormField
            id="edit-profile-skills"
            label="Skills"
            hint={SKILLS_HINT}
            {...bind('skills')}
          />

          {error && (
            <p role="alert" className="flex items-start gap-2 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave} className={PRIMARY_BUTTON_CLASS}>
              {saving && <Loader2 className="animate-spin" />}
              {saving ? EDIT_PROFILE_SAVING_LABEL : EDIT_PROFILE_SAVE_LABEL}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
