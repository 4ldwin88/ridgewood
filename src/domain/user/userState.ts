export type OperatingRole = 'operator' | 'manager' | 'executive';
export type UserWorkStatus = 'available' | 'limited' | 'unavailable' | 'away';

export type AppPermission =
  | 'document.create_draft'
  | 'document.create_revision'
  | 'document.publish'
  | 'proposal.submit'
  | 'proposal.approve'
  | 'proposal.deny'
  | 'project.authorize'
  | 'user.manage_roles';

export interface UserAvailability {
  timezone?: string;
  workingDays?: number[];
  startTime?: string;
  endTime?: string;
  capacityPercent?: number;
  awayUntil?: string;
}

export interface UserPreferences {
  defaultLandingPage?: string;
  compactView?: boolean;
  [key: string]: unknown;
}

export interface UserState {
  workspaceId: string;
  userId: string;
  displayName?: string;
  jobTitle?: string;
  workStatus: UserWorkStatus;
  availability: UserAvailability;
  preferences: UserPreferences;
  notificationPreferences: Record<string, unknown>;
  roles: OperatingRole[];
  permissions: AppPermission[];
  updatedAt: string;
}

/** Technical permission is necessary but never sufficient for a governed business decision. */
export function hasPermission(user: UserState, permission: AppPermission): boolean {
  return user.permissions.includes(permission);
}
