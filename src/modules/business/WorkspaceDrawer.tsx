import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, useId, type PointerEvent, type ReactNode } from 'react';

type WorkState = { dirty: boolean; busy: boolean };
type DrawerEvent = 'opened' | 'closed' | 'close_blocked' | 'discard_confirmed';
const WorkContext = createContext<((id: string, state: WorkState | null) => void) | null>(null);
const SavedCloseContext=createContext<(()=>Promise<void>)|null>(null);
export function useDrawerSavedClose(){return useContext(SavedCloseContext);}
const CloseContext = createContext<(() => void) | null>(null);
export function useDrawerClose() { return useContext(CloseContext); }
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
  const gesture = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const [dragX, setDragX] = useState(0);
  const suppressClick = useRef(false);
  useLayoutEffect(() => { callbacks.current = { onClose, onEvent, busy }; }, [onClose, onEvent, busy]);
  const workStates = useRef(new Map<string, WorkState>());
  const reportWork = useCallback((id: string, value: WorkState | null) => {
    if (value) workStates.current.set(id, value); else workStates.current.delete(id);
    const values = [...workStates.current.values()];
    const next = { dirty: values.some(value => value.dirty), busy: values.some(value => value.busy) };
    work.current = next;
    setState(next);
  }, []);

  const savedClose=useCallback(async()=>{await new Promise(resolve=>setTimeout(resolve,250));callbacks.current.onClose();},[]);

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

  function startGesture(event: PointerEvent<HTMLElement>) {
    if (!event.isPrimary || event.button !== 0 || work.current.busy || callbacks.current.busy) return;
    if ((event.target as HTMLElement).closest('button') && !event.currentTarget.classList.contains('workspace-drawer__edge')) return;
    gesture.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveGesture(event: PointerEvent<HTMLElement>) {
    const start = gesture.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX-start.x, dy = Math.abs(event.clientY-start.y);
    if (dy > 30 && dy > Math.abs(dx)) { gesture.current=null; setDragX(0); return; }
    setDragX(Math.max(0,dx));
  }
  function endGesture(event: PointerEvent<HTMLElement>) {
    const start = gesture.current;
    gesture.current=null; setDragX(0);
    if (!start || start.pointerId !== event.pointerId) return;
    const dx=event.clientX-start.x, dy=Math.abs(event.clientY-start.y);
    suppressClick.current=Math.abs(dx)>10||dy>10;
    if (dx>=64 && dx>dy*1.5) close();
  }
  function cancelGesture(){ gesture.current=null; setDragX(0); }
  const gestureHandlers={onPointerDown:startGesture,onPointerMove:moveGesture,onPointerUp:endGesture,onPointerCancel:cancelGesture,onLostPointerCapture:cancelGesture};

  return <dialog ref={dialog} className={`workspace-drawer${expanded ? ' workspace-drawer--expanded' : ''}${dragX ? ' is-dragging' : ''}`}
    style={{transform:dragX?`translateX(${dragX}px)`:undefined}}
    aria-label={title} aria-busy={state.busy || busy}
    // Native close-watcher cancel events can become non-cancelable after a prior
    // close request. Route the keyboard action through the same work guard first.
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } }}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }}>
    <header className="workspace-drawer__header" {...gestureHandlers}>
      <div><p className="eyebrow">Project workspace</p><h2>{title}</h2><small className="drawer-state" role="status">{state.busy||busy?'Saving…':state.dirty?'Unsaved changes':'Swipe header right to close'}</small></div>
      <div className="form-actions">
        <button className="drawer-expand" type="button" onClick={() => setExpanded(value => !value)} aria-pressed={expanded}>{expanded ? 'Restore width' : 'Expand'}</button>
        <button type="button" onClick={close} disabled={state.busy || busy} aria-label={closeLabel}>Close <span aria-hidden="true">×</span></button>
      </div>
    </header>
    <button type="button" className="workspace-drawer__edge" aria-label="Swipe right to close form" disabled={state.busy || busy}
      {...gestureHandlers}
      onClick={() => { if (!suppressClick.current) close(); suppressClick.current=false; }}><span aria-hidden="true">›</span></button>
    <div className="workspace-drawer__body" ref={body} onInputCapture={() => {
      if (workStates.current.size === 0) {
        const next = { ...work.current, dirty: true };
        work.current = next; setState(next);
      }
    }}>
      <CloseContext.Provider value={close}><SavedCloseContext.Provider value={savedClose}><WorkContext.Provider value={reportWork}>{children}</WorkContext.Provider></SavedCloseContext.Provider></CloseContext.Provider>
    </div>
    {import.meta.env.VITE_DEV_FEEDBACK_ENABLED!=='false'&&title!=='Development note'?<button className="dev-notes-trigger dev-notes-floating" type="button" aria-label="Open development notes" onClick={()=>window.dispatchEvent(new CustomEvent('ridgewood:dev-note',{detail:title}))}>+</button>:null}
  </dialog>;
}
