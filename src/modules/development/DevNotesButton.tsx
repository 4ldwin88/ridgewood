import { FormEvent, useState } from 'react';
import type { DevelopmentObservability } from '../../application/ports/developmentObservability';
import { WorkspaceModal } from '../business/WorkspaceModal';

export interface DevNotesButtonProps {
  observability: DevelopmentObservability;
  pagePath: string;
  pageTitle?: string;
}

export function DevNotesButton({ observability, pagePath, pageTitle }: DevNotesButtonProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) return;
    setBusy(true);
    setStatus(null);
    try {
      await observability.submitNote({
        pagePath,
        pageTitle,
        note: trimmed,
        context: { capturedAt: new Date().toISOString() },
      });
      setNote('');
      setStatus('Saved');
      window.setTimeout(() => setOpen(false), 350);
    } catch {
      setStatus('Note could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dev-notes">
      <button className="dev-notes-trigger" type="button" aria-label="Open development notes" aria-expanded={open} onClick={() => setOpen(true)}>+</button>
      {open ? <WorkspaceModal title="Development note" onClose={() => setOpen(false)}><small>{pageTitle ?? pagePath}</small><form onSubmit={submit}><label><strong className="required-field">Required</strong><textarea autoFocus required maxLength={5000} placeholder="What happened, what felt wrong, or what should change?" value={note} onChange={(event) => setNote(event.target.value)}/></label><div className="dev-notes-actions"><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="submit" disabled={busy || !note.trim()}>{busy ? 'Saving…' : status==='Saved' ? 'Saved' : 'Submit note'}</button></div></form>{status ? <small role="status">{status}</small> : null}</WorkspaceModal> : null}
    </div>
  );
}
