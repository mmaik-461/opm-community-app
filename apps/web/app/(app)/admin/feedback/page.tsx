import type { Metadata } from 'next';
import { FeedbackAnalytics } from '@/components/opm/feedback-analytics';
import { ADMIN_TABS } from '@/constants/routes';

export const metadata: Metadata = { title: ADMIN_TABS[1].label };

export default function AdminFeedbackPage() {
  return <FeedbackAnalytics />;
}
