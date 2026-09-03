export interface CreateDocumentDraftInput {
  workspaceId: string;
  projectStateId: string;
  packageKey: string;
  categoryKey: string;
  documentType: string;
  title: string;
  initialData?: Record<string, unknown>;
}

/**
 * Governed document mutations intentionally have no browser Supabase adapter.
 * Their SECURITY DEFINER database commands live in the private schema and are
 * callable only from a trusted server/Edge Function boundary after application
 * authorization and, for issued actions, fresh verification.
 */
export interface DocumentCommandRepository {
  createDraft(input: CreateDocumentDraftInput): Promise<string>;
  updateDraft(revisionId: string, data: Record<string, unknown>): Promise<string>;
  createRevisionFromPublished(publishedRevisionId: string, reason?: string): Promise<string>;
}
