'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { Role } from '@opm/shared-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_HOME } from '@/constants/routes';
import { FORBIDDEN_BACK_LABEL, FORBIDDEN_MESSAGE, FORBIDDEN_TITLE } from '@/constants/admin';
import { AdminTabs } from './admin-tabs';
import { useUser } from './user-context';

function Forbidden() {
  return (
    <Card
      role="alert"
      className="items-center gap-3 border border-zinc-200 bg-white p-10 text-center shadow-none ring-0"
    >
      <ShieldX className="size-8 text-zinc-400" aria-hidden />
      <h2 className="text-lg font-semibold tracking-tight">{FORBIDDEN_TITLE}</h2>
      <p className="text-sm text-zinc-600">{FORBIDDEN_MESSAGE}</p>
      <Button asChild variant="outline" size="sm">
        <Link href={APP_HOME}>{FORBIDDEN_BACK_LABEL}</Link>
      </Button>
    </Card>
  );
}

/** Admin pages render inside this: members see "Access denied" and children never mount (so never fetch). */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useUser();
  // The role is only known once the profile has loaded; never flash "denied" before that.
  if (loading || !currentUser) return <Skeleton className="h-48 w-full" />;
  if (currentUser.role !== Role.ADMIN) return <Forbidden />;
  return (
    <div className="space-y-6">
      <AdminTabs />
      {children}
    </div>
  );
}
