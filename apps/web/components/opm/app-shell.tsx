'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Directory } from './directory';
import { Header } from './header';
import { Matchmaker } from './matchmaker';
import { UserProvider, useUser } from './user-context';

function Content() {
  const { error, reload } = useUser();
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {error && (
        <div
          role="alert"
          className="mb-8 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center"
        >
          <AlertTriangle className="size-5 shrink-0 text-red-600" aria-hidden />
          <div className="flex-1 text-sm text-red-900">
            <p className="font-semibold">Couldn&apos;t load the alumni community</p>
            <p className="text-red-800">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={reload}>
            <RefreshCw /> Retry
          </Button>
        </div>
      )}
      <TabsContent value="matchmaker">
        <Matchmaker />
      </TabsContent>
      <TabsContent value="directory">
        <Directory />
      </TabsContent>
    </main>
  );
}

export function AppShell() {
  return (
    <UserProvider>
      <Tabs defaultValue="matchmaker" className="gap-0">
        <Header />
        <Content />
      </Tabs>
    </UserProvider>
  );
}
