import type { Metadata } from 'next';
import { Matchmaker } from '@/components/opm/matchmaker';
import { NAV_ITEMS } from '@/constants/routes';

export const metadata: Metadata = { title: NAV_ITEMS[0].label };

export default function MatchmakerPage() {
  return <Matchmaker />;
}
