import { useRef, useState } from 'react';
import { printPublishedDocument } from './printPublishedDocument';
import type { ProjectStateDocumentRevision } from '../../infrastructure/documents/supabaseDocumentRepository';
import { readPublishedView } from '../../domain/documents/publishedView';

const display = (value: unknown): string => value === null || value === undefined || value === '' ? 'Not recorded'
  : Array.isArray(value) ? value.length ? value.map(display).join(', ') : 'None recorded'
  : typeof value === 'object' ? JSON.stringify(value) : String(value);

export function PublishedDocumentView({ revision }: { revision: ProjectStateDocumentRevision }) {
  const view = readPublishedView(revision.data);
  const articleRef = useRef<HTMLElement>(null);
  const [zoom, setZoom] = useState(1);
  return <section className="document-viewer" aria-label="Read-only document viewer">
    <div className="document-viewer__toolbar" role="toolbar" aria-label="Document controls">
      <button type="button" aria-label="Zoom out" disabled={zoom <= 0.5} onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>−</button>
      <output aria-live="polite">{Math.round(zoom * 100)}%</output>
      <button type="button" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom(z => Math.min(3, z + 0.25))}>+</button>
      <button type="button" onClick={() => setZoom(1)}>Reset zoom</button>
      <button className="document-print" type="button" disabled={!revision.snapshotAvailable} onClick={() => { if (articleRef.current) printPublishedDocument(articleRef.current); }}>Print / Save as PDF</button>
    </div>
    <div className="document-viewer__viewport" tabIndex={0} aria-label="Scrollable publication">
    <article ref={articleRef} style={{ zoom }} className="published-document" aria-label={`Published document revision ${revision.revisionNumber}`}>
    <header><p className="eyebrow">{revision.state} · View only</p><h2>{view?.title ?? 'Published document'}</h2>
      <p>Revision {revision.revisionNumber} · {revision.publishedAt ? new Date(revision.publishedAt).toLocaleString() : 'Publication time unavailable'}</p>
      <p>Published by {revision.publishedBy ?? 'Unknown actor'}</p>
      <small>Document {revision.documentId} · Revision {revision.revisionId}</small>
      {revision.changeNote ? <p>Change note: {revision.changeNote}</p> : null}
    </header>
    {!revision.snapshotAvailable ? <p role="alert">The frozen publication snapshot is unavailable. This document cannot be verified; reload or request evidence recovery.</p> : <>
      {view ? <p>Project at publication: {view.projectName}</p> : <p className="guidance">Historical snapshot: original display labels were not captured. Stored field keys are shown without substituting current form labels.</p>}
      <dl>{(view?.fields ?? Object.entries(revision.data).filter(([key]) => key !== '_presentation').map(([key, value]) => ({ key, label: key, value }))).map(field => <div key={field.key}><dt>{field.label}</dt><dd>{display(field.value)}</dd></div>)}</dl>

    </>}
    <p className="document-footnote">Publication records this revision. It does not itself grant approval or Project Authorization.</p>
  </article></div></section>;
}
