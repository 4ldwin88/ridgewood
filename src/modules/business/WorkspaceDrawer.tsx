import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, useId, type ReactNode } from 'react';

type WorkState = { dirty: boolean; busy: boolean };
type DrawerEvent = 'opened' | 'closed' | 'close_blocked' | 'discard_confirmed';
const WorkContext = createContext<((id: string, state: WorkState | null) => void) | null>(null);
const positions = new Map<string, number>();

export function useDrawerWorkState(dirty: boolean, busy: boolean) {
  const report = useContext(WorkContext);
  const id = useId();
  useLayoutEffect(() => { report?.(id, { dirty, busy }); }, [report, id, dirty, busy]);
  useLayoutEffect(() => () => report?.(id, null), [report, id]);
}

export function WorkspaceDrawer({ title, contextKey, onClose, onEvent, children, busy = false, closeLabel = 'Close form' }: {
  title: string; contextKey: string; onClose: () => void;
  onEvent?: (event: DrawerEvent) => void; children: ReactNode; busy?: boolean; closeLabel?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onClose, onEvent, busy });
  const work = useRef<WorkState>({ dirty: false, busy: false });
  const [state, setState] = useState<WorkState>(work.current);
  const [expanded, setExpanded] = useState(false);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => { callbacks.current = { onClose, onEvent, busy }; }, [onClose, onEvent, busy]);
  const workStates = useRef(new Map<string, WorkState>());
  const reportWork = useCallback((id: string, value: WorkState | null) => {
    if (value) workStates.current.set(id, value); else workStates.current.delete(id);
    const values = [...workStates.current.values()];
    const next = { dirty: values.some(value => value.dirty), busy: values.some(value => value.busy) };
    work.current = next;
    setState(next);
  }, []);

  function close() {
    if (work.current.busy || callbacks.current.busy) { callbacks.current.onEvent?.('close_blocked'); return; }
    if (work.current.dirty) {
      if (!window.confirm('Close and discard changes since the last save? Your saved draft will remain available.')) {
        callbacks.current.onEvent?.('close_blocked'); return;
      }
      callbacks.current.onEvent?.('discard_confirmed');
    }
    callbacks.current.onEvent?.('closed');
    callbacks.current.onClose();
  }

  useEffect(() => {
    const element = dialog.current!;
    const content = body.current!;
    const trigger = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    content.scrollTop = positions.get(contextKey) ?? 0;
    callbacks.current.onEvent?.('opened');
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (work.current.dirty || work.current.busy || callbacks.current.busy) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      positions.set(contextKey, content.scrollTop);
      element.close();
      document.body.style.overflow = previous;
      window.removeEventListener('beforeunload', beforeUnload);
      trigger?.focus();
    };
  }, [contextKey]);

  return <dialog ref={dialog} className={`workspace-drawer${expanded ? ' workspace-drawer--expanded' : ''}`}
    aria-label={title} aria-busy={state.busy || busy} onCancel={event => { event.preventDefault(); close(); }}>
    <header className="workspace-drawer__header">
      <div><p className="eyebrow">Project workspace</p><h2>{title}</h2></div>
      <div className="form-actions">
        <button type="button" onClick={() => setExpanded(value => !value)} aria-pressed={expanded}>{expanded ? 'Restore width' : 'Expand'}</button>
        <button type="button" onClick={close} disabled={state.busy || busy} aria-label={closeLabel}>Close</button>
      </div>
    </header>
    <button type="button" className="workspace-drawer__edge" aria-label="Swipe right to close form" disabled={state.busy || busy}
      onClick={event => { if (event.detail === 0) close(); }}
      onPointerDown={event => { gesture.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerCancel={() => { gesture.current = null; }}
      onPointerUp={event => {
        const start = gesture.current; gesture.current = null;
        if (start && event.clientX - start.x > 70 && Math.abs(event.clientY - start.y) < 45) close();
      }}>›</button>
    <div className="workspace-drawer__body" ref={body} onInputCapture={() => {
      // Forms with explicit work-state reporting own their saved baseline.
      // Other input surfaces conservatively protect typed work from dismissal.
      if (workStates.current.size === 0) {
        const next = { ...work.current, dirty: true };
        work.current = next; setState(next);
      }
    }}>
      <WorkContext.Provider value={reportWork}>{children}</WorkContext.Provider>
    </div>
  </dialog>;
}
