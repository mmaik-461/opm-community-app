import Link from 'next/link';
import { Compass } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  NOT_FOUND_CODE,
  NOT_FOUND_HOME_LABEL,
  NOT_FOUND_MESSAGE,
  NOT_FOUND_TITLE,
  PRIMARY_BUTTON_CLASS,
} from '@/constants/ui';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-zinc-900 text-white">
        <Compass className="size-7" aria-hidden />
      </div>
      <p className="mt-6 text-sm font-semibold tracking-widest text-zinc-500">{NOT_FOUND_CODE}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{NOT_FOUND_TITLE}</h1>
      <p className="mt-3 text-sm text-zinc-600">{NOT_FOUND_MESSAGE}</p>
      <Link
        href={ROUTES.home}
        className={cn(buttonVariants({ size: 'lg' }), PRIMARY_BUTTON_CLASS, 'mt-8')}
      >
        {NOT_FOUND_HOME_LABEL}
      </Link>
    </main>
  );
}
