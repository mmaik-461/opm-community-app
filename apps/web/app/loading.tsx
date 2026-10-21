import { ContentSkeleton } from '@/components/opm/content-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { LOADING_LABEL } from '@/constants/ui';

export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="min-h-screen">
      <span className="sr-only">{LOADING_LABEL}</span>
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ContentSkeleton />
      </div>
    </div>
  );
}
