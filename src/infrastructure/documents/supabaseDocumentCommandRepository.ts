import { supabase } from '../supabase/supabaseClient';

export interface CreateDocumentDraftInput {
  workspaceId: string;
  projectId?: string;
  opportunityId?: string;
  packageKey: string;
  categoryKey: string;
  documentType: string;
  title: string;
  initialData?: Record<string, unknown>;
}

async function rpcId(name: string, args: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  if (typeof data !== 'string') throw new Error(`${name} did not return an id`);
  return data;
}

export const supabaseDocumentCommandRepository = {
  createDraft(input: CreateDocumentDraftInput) {
    return rpcId('create_document_draft_atomic', {
      target_workspace_id: input.workspaceId,
      target_project_id: input.projectId ?? null,
      target_opportunity_id: input.opportunityId ?? null,
      package_key_input: input.packageKey,
      category_key_input: input.categoryKey,
      document_type_input: input.documentType,
      title_input: input.title,
      initial_data: input.initialData ?? {},
    });
  },

  updateDraft(revisionId: string, data: Record<string, unknown>) {
    return rpcId('update_document_draft_atomic', {
      target_revision_id: revisionId,
      source_data_input: data,
    });
  },

  createRevisionFromPublished(publishedRevisionId: string, reason?: string) {
    return rpcId('create_revision_from_published_atomic', {
      target_published_revision_id: publishedRevisionId,
      reason_input: reason ?? null,
    });
  },
};