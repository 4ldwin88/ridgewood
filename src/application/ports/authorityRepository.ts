import type { AuthorityDelegation, UserPositionAssignment } from '../../domain/user/authority';

export interface AuthorityRepository {
  listPositions(workspaceId: string, userId: string): Promise<UserPositionAssignment[]>;
  listDelegations(workspaceId: string, userId: string): Promise<AuthorityDelegation[]>;
}
