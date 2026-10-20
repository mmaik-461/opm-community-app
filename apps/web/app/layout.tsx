import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Providers } from '@/components/opm/providers';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'OPM Community Hub',
  description: 'Ask the community. Get matched with the right alumni.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', GeistSans.variable)}>
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
