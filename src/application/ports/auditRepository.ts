export interface AuditMaterial {
  type: string;
  opportunityId: string;
  occurredAt: string;
  actorId: string;
  metadata: Record<string, unknown>;
}

export interface AuditRepository {
  append(event: AuditMaterial): Promise<void>;
}
