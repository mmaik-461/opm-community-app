import type { Metadata } from 'next';
import { Verifications } from '@/components/opm/verifications';
import { ADMIN_NAV_ITEM } from '@/constants/routes';

export const metadata: Metadata = { title: ADMIN_NAV_ITEM.label };

export default function AdminPage() {
  return <Verifications />;
}
