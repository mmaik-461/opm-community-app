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
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Role } from '@opm/shared-types';
import { ADMIN_TAB, ADMIN_TAB_LABEL } from '@/constants/admin';
import { CountBadge } from './count-badge';
import { EditProfile } from './edit-profile';
import { useIntros } from './intros-context';
import { initials } from '@/utils/profile';
import { useUser } from './user-context';
import { useVerifications } from './verifications-context';

export function Header() {
  const { profiles, currentUser, setCurrentUserId, devLoginEnabled, signOut, loading } = useUser();
  const { pendingIncoming } = useIntros();
  const { pending } = useVerifications();
  const isAdmin = currentUser?.role === Role.ADMIN;
  const introsBadge = <CountBadge count={pendingIncoming} />;
  const adminTab = isAdmin && (
    <TabsTrigger value={ADMIN_TAB} className="px-4">
      {ADMIN_TAB_LABEL}
      <CountBadge count={pending.length} />
    </TabsTrigger>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Network className="size-5" aria-hidden />
          </div>
          <h1 className="truncate text-sm sm:text-base font-semibold tracking-tight text-zinc-900">
            OPM Community Hub
          </h1>
          <Badge className="bg-zinc-900 text-[10px] font-semibold tracking-wider text-white uppercase">
            Executive
          </Badge>
        </div>

        <TabsList className="hidden h-9 bg-zinc-100 md:inline-flex">
          <TabsTrigger value="matchmaker" className="px-4">
            AI Matchmaker
          </TabsTrigger>
          <TabsTrigger value="directory" className="px-4">
            Alumni Directory
          </TabsTrigger>
          <TabsTrigger value="intros" className="px-4">
            My Intros
            {introsBadge}
          </TabsTrigger>
          {adminTab}
        </TabsList>

        <div className="flex items-center gap-2">
          {loading ? (
            <Skeleton className="h-9 w-32 sm:w-44" />
          ) : !devLoginEnabled ? (
            <span className="truncate text-sm">
              <span className="hidden text-zinc-500 sm:inline">Signed in as: </span>
              <span className="font-medium">{currentUser?.fullName}</span>
            </span>
          ) : (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 max-w-[11rem] gap-2 sm:max-w-[16rem] border-zinc-200 px-2"
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
                    <span className="hidden text-zinc-500 sm:inline">Acting as: </span>
                    <span className="font-medium">{currentUser?.fullName ?? 'No profiles'}</span>
                    {currentUser && (
                      <span className="hidden text-zinc-500 lg:inline">
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
          {currentUser && <EditProfile profile={currentUser} />}
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label="Sign out"
            onClick={signOut}
          >
            <LogOut aria-hidden />
          </Button>
        </div>
      </div>

      {/* Tabs on small screens */}
      <div className="border-t border-zinc-200 px-4 py-2 md:hidden">
        <TabsList
          className={`grid h-9 w-full bg-zinc-100 ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}
        >
          <TabsTrigger value="matchmaker">AI Matchmaker</TabsTrigger>
          <TabsTrigger value="directory">Alumni Directory</TabsTrigger>
          <TabsTrigger value="intros">
            My Intros
            {introsBadge}
          </TabsTrigger>
          {adminTab}
        </TabsList>
      </div>
    </header>
  );
}
