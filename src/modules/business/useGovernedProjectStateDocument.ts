import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createProjectStateDocumentDraft,
  createProjectStateDocumentRevision,
  discardProjectStateDocumentDraft,
  listProjectStateDocuments,
  publishProjectStateDocumentRevision,
  updateProjectStateDocumentDraft,
  type ProjectStateDocumentRecord,
} from '../../infrastructure/documents/supabaseDocumentRepository';

export type GovernedDocumentDefinition = {
  packageKey: string;
  category: string;
  documentType: string;
  title: string;
};

const message = (error: unknown) => error instanceof Error ? error.message : 'The governed document command failed.';

export function useGovernedProjectStateDocument(projectStateId: string, definition: GovernedDocumentDefinition) {
  const [record, setRecord] = useState<ProjectStateDocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const draft = useMemo(() => record?.revisions.find(r => r.state === 'draft') ?? null, [record]);
  const published = useMemo(() => record?.revisions.find(r => r.state === 'published') ?? null, [record]);
  const history = useMemo(() => record?.revisions.filter(r => r.state === 'published' || r.state === 'superseded') ?? [], [record]);

  const reload = useCallback(async () => {
    const records = await listProjectStateDocuments(projectStateId);
    setRecord(records.find(r => r.documentType === definition.documentType) ?? null);
  }, [projectStateId, definition.documentType]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listProjectStateDocuments(projectStateId)
      .then(records => { if (active) setRecord(records.find(r => r.documentType === definition.documentType) ?? null); })
      .catch(e => { if (active) setError(message(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectStateId, definition.documentType]);

  async function persist(data: Record<string, unknown>) {
    if (draft) {
      await updateProjectStateDocumentDraft(draft.revisionId, data);
      return draft.revisionId;
    }
    return createProjectStateDocumentDraft(projectStateId, { ...definition, initialData: data });
  }

  async function save(data: Record<string, unknown>) {
    setBusy('save'); setError(null); setFeedback(null);
    try { await persist(data); await reload(); setFeedback('Draft saved.'); }
    catch (e) { setError(`Draft could not be saved: ${message(e)}`); throw e; }
    finally { setBusy(null); }
  }

  async function publish(data: Record<string, unknown>, changeNote?: string) {
    setBusy('publish'); setError(null); setFeedback(null);
    try {
      const revisionId = await persist(data);
      await publishProjectStateDocumentRevision(revisionId, changeNote);
      await reload();
      setFeedback('Published revision is governed and read-only.');
    } catch (e) { setError(`Publish failed: ${message(e)}`); throw e; }
    finally { setBusy(null); }
  }

  async function createRevision() {
    if (!published) return;
    setBusy('revision'); setError(null); setFeedback(null);
    try { await createProjectStateDocumentRevision(published.revisionId); await reload(); setFeedback('Revision draft created.'); }
    catch (e) { setError(message(e)); throw e; }
    finally { setBusy(null); }
  }

  async function discard() {
    if (!draft) return;
    setBusy('discard'); setError(null); setFeedback(null);
    try { await discardProjectStateDocumentDraft(draft.revisionId); await reload(); setFeedback('Draft discarded. Published evidence was not changed.'); }
    catch (e) { setError(message(e)); throw e; }
    finally { setBusy(null); }
  }

  return { record, draft, published, history, loading, busy, error, feedback, setError, setFeedback, reload, save, publish, createRevision, discard };
}
