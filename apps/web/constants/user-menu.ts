import type { ProfileStatus, Role } from '@opm/shared-types';

export const ACCOUNT_MENU_LABEL = 'Account menu';
export const DEV_SWITCH_LABEL = 'Acting as (Dev)';
export const SIGN_OUT_LABEL = 'Sign out';

export const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Admin', MEMBER: 'Member' };

/** ACTIVE is the normal state and is not shown. */
export const STATUS_LABEL: Record<Exclude<ProfileStatus, 'ACTIVE'>, string> = {
  PENDING_VERIFICATION: 'Pending verification',
  REJECTED: 'Rejected',
};
