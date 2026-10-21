'use client';

import { ChevronsUpDown, Check, LogOut, Network } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ROUTES } from '@/constants/routes';
import { EditProfile } from './edit-profile';
import { initials } from '@/utils/profile';
import { useUser } from './user-context';
import { PrimaryNav } from './primary-nav';

export function Header() {
  const { profiles, currentUser, setCurrentUserId, devLoginEnabled, signOut, loading } = useUser();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Network className="size-5" aria-hidden />
          </div>
          <h1 className="truncate text-sm font-semibold tracking-tight text-zinc-900 sm:text-base">
            <Link href={ROUTES.home}>OPM Community Hub</Link>
          </h1>
          <Badge className="hidden bg-zinc-900 text-[10px] font-semibold tracking-wider text-white uppercase lg:inline-flex">
            Executive
          </Badge>
        </div>

        <PrimaryNav className="hidden lg:flex" />

        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {loading ? (
            <Skeleton className="h-9 w-28 sm:w-40" />
          ) : !devLoginEnabled ? (
            <span className="max-w-[10rem] truncate text-sm sm:max-w-[14rem]">
              <span className="hidden text-zinc-500 xl:inline">Signed in as: </span>
              <span className="font-medium">{currentUser?.fullName}</span>
            </span>
          ) : (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 max-w-[10rem] gap-2 border-zinc-200 px-2 sm:max-w-[14rem]"
                  disabled={profiles.length === 0}
                  aria-label="Switch current user"
                >
                  <Avatar className="size-6">
                    {currentUser?.avatarUrl && <AvatarImage src={currentUser.avatarUrl} alt="" />}
                    <AvatarFallback className="bg-zinc-900 text-[10px] text-white">
                      {currentUser ? initials(currentUser.fullName) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-left text-sm">
                    <span className="hidden text-zinc-500 xl:inline">Acting as: </span>
                    <span className="font-medium">{currentUser?.fullName ?? 'No profiles'}</span>
                    {currentUser && (
                      <span className="hidden text-zinc-500 xl:inline">
                        {' '}
                        ({currentUser.cohort})
                      </span>
                    )}
                  </span>
                  <ChevronsUpDown className="size-3.5 shrink-0 text-zinc-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-80 w-72 overflow-y-auto">
                <DropdownMenuLabel className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
                  Switch acting user
                </DropdownMenuLabel>
                {profiles.map((p) => (
                  <DropdownMenuItem key={p.id} onSelect={() => setCurrentUserId(p.id)}>
                    <span className="flex-1 truncate">
                      {p.fullName} <span className="text-zinc-500">({p.cohort})</span>
                    </span>
                    {p.id === currentUser?.id && <Check className="size-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <div className="flex items-center gap-0.5 border-l border-zinc-200 pl-1.5 sm:pl-2">
            {currentUser && <EditProfile profile={currentUser} />}
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-zinc-600"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => void signOut()}
            >
              <LogOut aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      {/* Section links on small screens */}
      <div className="border-t border-zinc-200 px-4 py-2 lg:hidden">
        <PrimaryNav className="flex w-full" />
      </div>
    </header>
  );
}
