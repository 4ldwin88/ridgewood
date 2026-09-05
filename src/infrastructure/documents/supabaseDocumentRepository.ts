import { supabase } from '../auth/supabaseClient';

export interface ProjectStateDocumentDraft {
  revisionId: string;
  documentId: string;
  revisionNumber: number;
  title: string;
  documentType: string;
  category: string;
  packageKey: string;
  data: Record<string, unknown>;
  updatedAt: string;
}

export async function listProjectStateDocumentDrafts(projectStateId: string): Promise<ProjectStateDocumentDraft[]> {
  const { data, error } = await supabase
    .from('document_records')
    .select('id,title,document_type,category_key,package_key,updated_at,document_revisions(id,revision_number,state,source_data)')
    .eq('project_state_id', projectStateId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).flatMap((record: any) => (record.document_revisions ?? [])
    .filter((revision: any) => revision.state === 'draft')
    .map((revision: any) => ({
      revisionId: revision.id,
      documentId: record.id,
      revisionNumber: revision.revision_number,
      title: record.title,
      documentType: record.document_type,
      category: record.category_key,
      packageKey: record.package_key,
      data: revision.source_data ?? {},
      updatedAt: record.updated_at,
    })));
}

export async function createProjectStateDocumentDraft(projectStateId: string, input: {
  packageKey: string; category: string; documentType: string; title: string; initialData?: Record<string, unknown>;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_project_state_document_draft', {
    target_project_state_id: projectStateId,
    package_key_input: input.packageKey,
    category_key_input: input.category,
    document_type_input: input.documentType,
    title_input: input.title,
    initial_data: input.initialData ?? {},
  });
  if (error) throw error;
  return data as string;
}

export async function updateProjectStateDocumentDraft(revisionId: string, data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc('update_project_state_document_draft', {
    target_revision_id: revisionId,
    source_data_input: data,
  });
  if (error) throw error;
}
