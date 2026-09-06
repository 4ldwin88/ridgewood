import type { ProjectStateDocumentRevision } from '../../infrastructure/documents/supabaseDocumentRepository';

const auditValue=(value:unknown)=>{if(value===undefined)return '—';if(Array.isArray(value))return value.length?value.join(', '):'None';if(value===null||value==='')return '—';if(typeof value==='object')return JSON.stringify(value);return String(value)};
const auditField=(field:string)=>field.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());

export function GovernedPublishedSummary({revision}:{revision:ProjectStateDocumentRevision}){
 return <div className="published-summary"><strong>Published revision {revision.revisionNumber}</strong><small>{revision.publishedAt?new Date(revision.publishedAt).toLocaleString():''} · Published by {revision.publishedBy||'Unknown actor'} · {revision.changeNote||'Initial publication'}</small></div>;
}

export function GovernedRevisionHistory({history,open,onToggle}:{history:ProjectStateDocumentRevision[];open:boolean;onToggle:()=>void}){
 if(!history.length)return null;
 return <div className="revision-history"><button type="button" className="text-button" onClick={onToggle}>{open?'Hide':'Show'} revision history ({history.length})</button>{open?history.map(r=><article key={r.revisionId}><strong>Revision {r.revisionNumber}</strong><span>{r.state}</span><small>{r.publishedAt?new Date(r.publishedAt).toLocaleString():''} · Published by {r.publishedBy||'Unknown actor'} · {r.changeNote||'Initial publication'}</small>{r.changes.length?<details><summary>{r.changes.length} field change{r.changes.length===1?'':'s'}</summary><ul>{r.changes.map(change=><li key={change.field}><strong>{auditField(change.field)}</strong>: {auditValue(change.before)} → {auditValue(change.after)}</li>)}</ul></details>:r.revisionNumber>1?<small>No field-level changes detected.</small>:null}</article>):null}</div>;
}