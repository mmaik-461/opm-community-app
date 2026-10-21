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
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    </div>
  );
}
