import { AppShell } from '@/components/opm/app-shell';
import { ADMIN_TAB } from '@/constants/admin';

export default function AdminPage() {
  return <AppShell initialTab={ADMIN_TAB} />;
}
