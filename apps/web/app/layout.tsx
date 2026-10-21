import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Providers } from '@/components/opm/providers';
import { authOptions } from '@/lib/auth';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: { default: 'OPM Community Hub', template: '%s · OPM Community Hub' },
  description: 'Ask the community. Get matched with the right alumni.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en" className={cn('font-sans', GeistSans.variable)}>
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
