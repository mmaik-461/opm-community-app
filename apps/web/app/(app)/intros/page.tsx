import type { Metadata } from 'next';
import { Intros } from '@/components/opm/intros';
import { NAV_ITEMS } from '@/constants/routes';

export const metadata: Metadata = { title: NAV_ITEMS[2].label };

export default function IntrosPage() {
  return <Intros />;
}
