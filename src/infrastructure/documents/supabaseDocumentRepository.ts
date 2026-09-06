import { supabase } from '../auth/supabaseClient';

export interface DocumentFieldChange { field: string; before: unknown; after: unknown }
export interface ProjectStateDocumentRevision {
  revisionId: string;
  documentId: string;
  revisionNumber: number;
  state: string;
  title: string;
  documentType: string;
  category: string;
  packageKey: string;
  data: Record<string, unknown>;
  changeNote: string | null;
  createdAt: string;
  publishedAt: string | null;
  publishedBy: string | null;
  changes: DocumentFieldChange[];
}

export interface ProjectStateDocumentRecord {
  documentId: string;
  title: string;
  documentType: string;
  category: string;
  packageKey: string;
  updatedAt: string;
  revisions: ProjectStateDocumentRevision[];
}

type DocumentRevisionRow = {
  id: string;
  revision_number: number;
  state: string;
  source_data: Record<string, unknown> | null;
  change_reason: string | null;
  created_at: string;
  published_at: string | null;
  published_by: string | null;
};

type DocumentRecordRow = {
  id: string;
  title: string;
  document_type: string;
  category_key: string;
  package_key: string;
  updated_at: string;
  document_revisions: DocumentRevisionRow[] | null;
};

function comparable(value: unknown): string { return JSON.stringify(value ?? null); }
function fieldChanges(current: Record<string, unknown>, previous?: Record<string, unknown>): DocumentFieldChange[] {
  if (!previous) return [];
  return [...new Set([...Object.keys(previous), ...Object.keys(current)])].sort().filter((field) => comparable(previous[field]) !== comparable(current[field])).map((field) => ({ field, before: previous[field], after: current[field] }));
}

export async function listProjectStateDocuments(projectStateId: string): Promise<ProjectStateDocumentRecord[]> {
  const { data, error } = await supabase
    .from('document_records')
    .select('id,title,document_type,category_key,package_key,updated_at,document_revisions(id,revision_number,state,source_data,change_reason,created_at,published_at,published_by,archived_at)')
    .eq('project_state_id', projectStateId)
    .is('document_revisions.archived_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as DocumentRecordRow[]).map((record) => {
    const ordered = [...(record.document_revisions ?? [])].sort((a, b) => a.revision_number - b.revision_number);
    const revisions = ordered.map((revision, index) => {
      const revisionData = revision.source_data ?? {};
      const previousPublished = ordered.slice(0, index).reverse().find((candidate) => candidate.state === 'published' || candidate.state === 'superseded');
      return {
        revisionId: revision.id,
        documentId: record.id,
        revisionNumber: revision.revision_number,
        state: revision.state,
        title: record.title,
        documentType: record.document_type,
        category: record.category_key,
        packageKey: record.package_key,
        data: revisionData,
        changeNote: revision.change_reason,
        createdAt: revision.created_at,
        publishedAt: revision.published_at,
        publishedBy: revision.published_by,
        changes: fieldChanges(revisionData, previousPublished?.source_data ?? undefined),
      };
    }).sort((a, b) => b.revisionNumber - a.revisionNumber);
    return { documentId: record.id, title: record.title, documentType: record.document_type, category: record.category_key, packageKey: record.package_key, updatedAt: record.updated_at, revisions };
  });
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
  const { error } = await supabase.rpc('update_project_state_document_draft', { target_revision_id: revisionId, source_data_input: data });
  if (error) throw error;
}

export async function publishProjectStateDocumentRevision(revisionId: string, changeNote?: string): Promise<void> {
  const { error } = await supabase.rpc('publish_project_state_document_revision', { target_revision_id: revisionId, change_note_input: changeNote?.trim() || null });
  if (error) throw error;
}

export async function createProjectStateDocumentRevision(publishedRevisionId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_project_state_document_revision', { target_published_revision_id: publishedRevisionId });
  if (error) throw error;
  return data as string;
}

export async function discardProjectStateDocumentDraft(revisionId: string): Promise<void> {
  const { error } = await supabase.rpc('discard_project_state_document_draft', { target_revision_id: revisionId, reason_input: 'Draft discarded by user' });
  if (error) throw error;
}