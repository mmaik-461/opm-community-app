'use client';

import * as React from 'react';
import { LogOut, Pencil, User } from 'lucide-react';
import { ProfileStatus } from '@opm/shared-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EDIT_PROFILE_LABEL } from '@/constants/profile-edit';
import { DEV_SWITCH_LABEL, ROLE_LABEL, SIGN_OUT_LABEL, STATUS_LABEL } from '@/constants/user-menu';
import { accountMenuLabel, initials } from '@/utils/profile';
import { EditProfile } from './edit-profile';
import { useUser } from './user-context';

const AVATAR_BUTTON_CLASS =
  'rounded-full outline-none transition-colors hover:ring-2 hover:ring-zinc-300 focus-visible:ring-2 focus-visible:ring-zinc-500 data-[state=open]:ring-2 data-[state=open]:ring-zinc-400';

/** The one place for account actions: identity, edit profile, (dev) switch user and sign out. */
export function UserMenu() {
  const { profiles, currentUser, setCurrentUserId, devLoginEnabled, signOut, loading } = useUser();
  const [editing, setEditing] = React.useState(false);

  if (loading) return <Skeleton className="size-9 rounded-full" />;

  const status = currentUser && currentUser.status !== ProfileStatus.ACTIVE && currentUser.status;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          className={AVATAR_BUTTON_CLASS}
          aria-label={accountMenuLabel(currentUser)}
        >
          <Avatar className="size-9 border border-zinc-200">
            {currentUser?.avatarUrl && <AvatarImage src={currentUser.avatarUrl} alt="" />}
            <AvatarFallback className="bg-zinc-900 text-xs font-medium text-white">
              {currentUser ? (
                initials(currentUser.fullName)
              ) : (
                <User className="size-4" aria-hidden />
              )}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="max-h-none w-72 overflow-visible">
          {currentUser && (
            <>
              <DropdownMenuLabel className="space-y-1.5 px-2 py-2">
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {currentUser.fullName}
                </p>
                {currentUser.email && (
                  <p className="truncate text-xs font-normal text-zinc-500">{currentUser.email}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px] tracking-wide uppercase">
                    {ROLE_LABEL[currentUser.role]}
                  </Badge>
                  {status && (
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-50 text-[10px] tracking-wide text-amber-800 uppercase"
                    >
                      {STATUS_LABEL[status]}
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Pencil aria-hidden /> {EDIT_PROFILE_LABEL}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {devLoginEnabled && (
            <>
              <DropdownMenuLabel className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                {DEV_SWITCH_LABEL}
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={currentUser?.id ?? ''}
                onValueChange={setCurrentUserId}
                className="max-h-48 overflow-y-auto"
              >
                {profiles.map((p) => (
                  <DropdownMenuRadioItem key={p.id} value={p.id}>
                    <span className="truncate">
                      {p.fullName} <span className="text-zinc-500">({p.cohort})</span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onSelect={() => void signOut()}>
            <LogOut aria-hidden /> {SIGN_OUT_LABEL}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {currentUser && (
        <EditProfile profile={currentUser} open={editing} onOpenChange={setEditing} />
      )}
    </>
  );
}
