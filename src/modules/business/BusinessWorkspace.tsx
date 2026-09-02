import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Opportunity } from '../../domain/opportunity/opportunity';
import { supabaseOpportunityRepository } from '../../infrastructure/opportunities/supabaseOpportunityRepository';
import { developmentObservability } from '../../infrastructure/observability/supabaseDevelopmentObservability';

const stages = ['Opportunity', 'Qualification', 'Predevelopment', 'Authorization', 'Project'];
const sectors = ['Residential', 'Mixed-use', 'Commercial', 'Industrial', 'Institutional', 'Other'];
const sources = ['Referral', 'Existing relationship', 'Inbound', 'Partner', 'Broker / agent', 'Direct outreach', 'Other'];
const qualification = [
  ['Fit', 'Does this opportunity fit Ridgewood’s strategy and capabilities?'],
  ['Client / partner', 'Do we understand who is involved and who can make decisions?'],
  ['Site', 'Do we understand the site or location well enough to proceed?'],
  ['Commercial', 'Is there a credible commercial path worth investigating?'],
] as const;
const predevelopment = [
  ['Development & site', 'Site, planning, approvals and development constraints'],
  ['Product & program', 'What is being built and for whom'],
  ['Design & consultants', 'Required design disciplines and consultant team'],
  ['Commercial feasibility', 'Budget, economics, funding and commercial assumptions'],
  ['Schedule & phasing', 'Timing, milestones and phasing assumptions'],
  ['Risk & evidence', 'Material unknowns, risks and supporting evidence'],
  ['Delivery strategy', 'Procurement, construction and delivery approach'],
] as const;

type View = { kind: 'pipeline' } | { kind: 'opportunity'; id: string };

function normalizeError(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const value = e as Record<string, unknown>;
    return [value.message, value.details, value.hint].filter((part) => typeof part === 'string' && part).join(' · ') || fallback;
  }
  return fallback;
}

function normalize(value?: string) { return (value ?? '').trim().toLocaleLowerCase(); }

export function BusinessWorkspace() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: 'pipeline' });
  const [draftName, setDraftName] = useState('');
  const [duplicateOverride, setDuplicateOverride] = useState(false);

  async function load() {
    try { setItems(await supabaseOpportunityRepository.list()); setError(null); }
    catch (e) { setError(normalizeError(e, 'Unable to load opportunities.')); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const duplicate = useMemo(() => {
    const name = normalize(draftName);
    if (!name || duplicateOverride) return undefined;
    return items.find((item) => {
      const existing = normalize(item.name);
      return existing === name || (name.length >= 5 && existing.length >= 5 && (existing.includes(name) || name.includes(existing)));
    });
  }, [draftName, duplicateOverride, items]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    const form = new FormData(target);
    const name = String(form.get('name') ?? '').trim();
    if (!name || duplicate) return;
    setCreating(true); setError(null);
    void developmentObservability.capture({ eventName: 'command_attempted', pagePath: '/business', metadata: { command: 'CreateOpportunity' } });
    try {
      const now = new Date().toISOString();
      const created = await supabaseOpportunityRepository.create({
        id: crypto.randomUUID(), name,
        location: String(form.get('location') ?? '').trim() || undefined,
        sector: String(form.get('sector') ?? '').trim() || undefined,
        source: String(form.get('source') ?? '').trim() || undefined,
        summary: String(form.get('summary') ?? '').trim() || undefined,
        nextAction: String(form.get('nextAction') ?? '').trim() || undefined,
        priority: 'medium', lifecycleState: 'potential', commercialStage: 'unknown',
        createdAt: now, updatedAt: now,
      });
      setItems((current) => [created, ...current]);
      target.reset(); setDraftName(''); setDuplicateOverride(false);
      setView({ kind: 'opportunity', id: created.id });
      void developmentObservability.capture({ eventName: 'command_succeeded', pagePath: '/business', metadata: { command: 'CreateOpportunity', opportunityId: created.id } });
    } catch (e) {
      const message = normalizeError(e, 'Opportunity could not be created.');
      setError(message);
      void developmentObservability.capture({ eventName: 'command_rejected', pagePath: '/business', metadata: { command: 'CreateOpportunity', reason: message } });
    } finally { setCreating(false); }
  }

  if (view.kind === 'opportunity') {
    const item = items.find((candidate) => candidate.id === view.id);
    if (item) return <OpportunityWorkspace item={item} onBack={() => setView({ kind: 'pipeline' })} />;
  }

  return <div className="business-grid">
    <section className="panel">
      <div className="section-heading"><div><h2>Opportunity → Project</h2><p>Start with the minimum. Ridgewood will guide the opportunity forward after it is created.</p></div></div>
      <div className="stage-row">{stages.map((stage) => <span key={stage}>{stage}</span>)}</div>
      <form className="opportunity-form" onSubmit={create} onFocus={() => void developmentObservability.capture({eventName:'form_started',pagePath:'/business',metadata:{form:'CreateOpportunity'}})}>
        <label>Opportunity name<input name="name" required value={draftName} onChange={(e) => { setDraftName(e.target.value); setDuplicateOverride(false); }} placeholder="e.g. Fairy Lake" /></label>
        <label>Site / location <small>optional</small><input name="location" placeholder="Add if known" /></label>
        <label>Sector <small>optional</small><select name="sector" defaultValue=""><option value="">Select if known</option>{sectors.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Source <small>optional</small><select name="source" defaultValue=""><option value="">Select if known</option>{sources.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="wide">Next step <small>optional</small><input name="nextAction" placeholder="What should happen next?" /></label>
        <details className="wide"><summary>Add context</summary><label>Summary <small>optional</small><textarea name="summary" rows={3} placeholder="Only add what will help the team understand the opportunity." /></label></details>
        {duplicate ? <div className="wide duplicate-warning"><strong>Possible duplicate</strong><p>{duplicate.name}{duplicate.location ? ` · ${duplicate.location}` : ''} already exists.</p><div className="form-actions"><button type="button" onClick={() => setView({kind:'opportunity',id:duplicate.id})}>Open existing</button><button type="button" className="secondary" onClick={() => setDuplicateOverride(true)}>Create separate opportunity</button></div></div> : null}
        <div className="wide form-actions"><button type="submit" disabled={creating || Boolean(duplicate)}>{creating ? 'Creating…' : 'Create opportunity'}</button></div>
      </form>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </section>
    <section className="panel"><h2>Pipeline</h2>{loading ? <p>Loading opportunities…</p> : items.length === 0 ? <p>No opportunities yet. Create the first potential project above.</p> : <div className="opportunity-list">{items.map((item) => <button type="button" className="opportunity-card opportunity-card-button" key={item.id} onClick={() => setView({kind:'opportunity',id:item.id})}><div><strong>{item.name}</strong><small>{item.location || 'Location unknown'}</small></div><span>{item.lifecycleState.replace('_',' ')}</span><p>{item.summary || 'Open to continue qualification.'}</p>{item.nextAction ? <small>Next: {item.nextAction}</small> : <small>Open to see next steps</small>}</button>)}</div>}</section>
  </div>;
}

function OpportunityWorkspace({ item, onBack }: { item: Opportunity; onBack: () => void }) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const qualificationComplete = qualification.every(([key]) => checks[`q:${key}`]);
  const next = qualificationComplete ? 'Work through predevelopment readiness.' : 'Complete qualification.';
  return <div className="opportunity-workspace">
    <button type="button" className="text-button" onClick={onBack}>← Business pipeline</button>
    <section className="panel opportunity-hero"><div><p className="eyebrow">Opportunity</p><h2>{item.name}</h2><p>{item.location || 'Location not yet recorded'}{item.sector ? ` · ${item.sector}` : ''}</p></div><div className="next-step"><small>Recommended next step</small><strong>{next}</strong></div></section>
    <section className="panel"><h3>Path to project</h3><div className="stage-row">{stages.map((stage, index) => <span key={stage} className={index === 0 ? 'active' : ''}>{stage}</span>)}</div><p>Ridgewood keeps unknowns visible and guides this record through each gate. The same record becomes the project after authorization.</p></section>
    <section className="panel"><div className="section-heading"><div><p className="eyebrow">Step 1</p><h3>Qualification</h3><p>Decide whether this opportunity deserves predevelopment effort.</p></div><span>{Object.keys(checks).filter((key) => key.startsWith('q:') && checks[key]).length}/{qualification.length}</span></div><div className="guided-checklist">{qualification.map(([key, help]) => <label key={key}><input type="checkbox" checked={Boolean(checks[`q:${key}`])} onChange={(e) => setChecks((current) => ({...current,[`q:${key}`]:e.target.checked}))}/><span><strong>{key}</strong><small>{help}</small></span></label>)}</div>{!qualificationComplete ? <p className="guidance">Complete these checks before moving into predevelopment. Detailed findings and governed decisions will be persisted in the next workflow increment.</p> : <p className="guidance success">Qualification checklist complete. Predevelopment can begin.</p>}</section>
    <section className="panel"><div className="section-heading"><div><p className="eyebrow">Step 2</p><h3>Predevelopment</h3><p>Resolve the evidence needed to make a responsible project authorization decision.</p></div></div><div className="readiness-grid">{predevelopment.map(([name, help]) => <article key={name}><strong>{name}</strong><small>{help}</small><span>Not started</span></article>)}</div></section>
    <section className="panel"><p className="eyebrow">Step 3</p><h3>Authorization & establishment</h3><p>Ridgewood will summarize unresolved requirements, evidence and required authority here. Project establishment remains locked until the governed authorization requirements are satisfied.</p><button type="button" disabled>Authorize & establish project</button></section>
  </div>;
}
