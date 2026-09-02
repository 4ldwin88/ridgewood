import { FormEvent, useState } from 'react';
import type { DevelopmentObservability } from '../../application/ports/developmentObservability';

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
      setStatus('Note saved.');
    } catch {
      setStatus('Note could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dev-notes">
      <button
        className="dev-notes-trigger"
        type="button"
        aria-label="Open development notes"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        +
      </button>
      {open ? (
        <aside className="dev-notes-panel" aria-label="Development note">
          <strong>Development note</strong>
          <small>{pageTitle ?? pagePath}</small>
          <form onSubmit={submit}>
            <textarea
              autoFocus
              maxLength={5000}
              placeholder="What happened, what felt wrong, or what should change?"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <div className="dev-notes-actions">
              <button type="button" onClick={() => setOpen(false)}>Close</button>
              <button type="submit" disabled={busy || !note.trim()}>{busy ? 'Saving…' : 'Submit note'}</button>
            </div>
          </form>
          {status ? <small role="status">{status}</small> : null}
        </aside>
      ) : null}
    </div>
  );
}
