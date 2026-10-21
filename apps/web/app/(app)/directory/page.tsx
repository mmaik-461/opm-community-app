import type { Metadata } from 'next';
import { Directory } from '@/components/opm/directory';
import { NAV_ITEMS } from '@/constants/routes';

export const metadata: Metadata = { title: NAV_ITEMS[1].label };

export default function DirectoryPage() {
  return <Directory />;
}
