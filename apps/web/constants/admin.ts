import type { VerificationDecision } from '@opm/shared-types';

export const VERIFICATIONS_TITLE = 'Pending verifications';
export const VERIFICATIONS_SUBTITLE =
  'Review new alumni registrations. Approving unlocks AI matchmaking and intro requests.';
export const VERIFICATIONS_EMPTY_TITLE = 'No pending applications';
export const VERIFICATIONS_EMPTY_MESSAGE = 'New registrations will show up here for review.';
export const VERIFICATIONS_LOAD_FAILED = 'Failed to load verifications';
export const VERIFICATION_DECISION_FAILED = 'Could not save the decision';
export const NO_DIPLOMA_LABEL = 'Not provided';

export const VERIFICATION_COLUMNS = [
  'Name',
  'Email',
  'Graduation year',
  'Diploma ID',
  'Submitted',
] as const;

export const VERIFICATION_NOTICE: Record<VerificationDecision, string> = {
  APPROVE: 'approved. They can now use matchmaking and intros.',
  REJECT: 'rejected.',
};

export const FORBIDDEN_TITLE = 'Access denied';
export const FORBIDDEN_MESSAGE =
  'The verification panel is only available to community administrators.';
export const FORBIDDEN_BACK_LABEL = 'Back to the community';

export const ADMIN_TABS_LABEL = 'Admin sections';
