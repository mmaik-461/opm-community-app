import { ContentSkeleton } from '@/components/opm/content-skeleton';
import { LOADING_LABEL } from '@/constants/ui';

/** Shown inside the persistent header while a section streams in, so the header never flashes away. */
export default function SectionLoading() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{LOADING_LABEL}</span>
      <ContentSkeleton />
    </div>
  );
}
