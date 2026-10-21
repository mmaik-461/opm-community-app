import { Network } from 'lucide-react';

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Network className="size-5" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <p className="text-sm text-zinc-600">{subtitle}</p>
    </>
  );
}
