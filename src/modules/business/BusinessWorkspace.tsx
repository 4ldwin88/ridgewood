import { FormEvent, useEffect, useState } from 'react';
import type { Opportunity } from '../../domain/opportunity/opportunity';
import { supabaseOpportunityRepository } from '../../infrastructure/opportunities/supabaseOpportunityRepository';
import { developmentObservability } from '../../infrastructure/observability/supabaseDevelopmentObservability';

const stages = ['Opportunity', 'Qualification', 'Predevelopment', 'Authorization', 'Project'];
const sectors = ['Residential', 'Mixed-use', 'Commercial', 'Industrial', 'Institutional', 'Other'];
const sources = ['Existing relationship', 'Referral', 'Inbound', 'Partner', 'Direct outreach', 'Other'];

export function BusinessWorkspace() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try { setItems(await supabaseOpportunityRepository.list()); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load opportunities.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get('name') ?? '').trim();
    if (!name) return;
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
      formElement.reset();
      void developmentObservability.capture({ eventName: 'command_succeeded', pagePath: '/business', metadata: { command: 'CreateOpportunity', opportunityId: created.id } });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Opportunity could not be created.';
      setError(message);
      void developmentObservability.capture({ eventName: 'command_rejected', pagePath: '/business', metadata: { command: 'CreateOpportunity', reason: message } });
    } finally { setCreating(false); }
  }

  return <div className="business-grid">
    <section className="panel">
      <div className="section-heading"><div><h2>New opportunity</h2><p>Start with what you know. Everything except the name can be added later.</p></div></div>
      <div className="stage-row">{stages.map((stage) => <span key={stage}>{stage}</span>)}</div>
      <form className="opportunity-form" onSubmit={create} onFocus={() => void developmentObservability.capture({eventName:'form_started',pagePath:'/business',metadata:{form:'CreateOpportunity'}})}>
        <label className="wide">Opportunity name<input name="name" required autoFocus placeholder="e.g. Fairy Lake" /></label>
        <label>Site / location <small>(optional)</small><input name="location" placeholder="City, address or site" /></label>
        <label>Sector <small>(optional)</small><select name="sector" defaultValue=""><option value="">Not selected</option>{sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</select></label>
        <label>Source <small>(optional)</small><select name="source" defaultValue=""><option value="">Not selected</option>{sources.map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
        <label className="wide">Next step <small>(optional)</small><input name="nextAction" placeholder="Immediate follow-up, if known" /></label>
        <details className="wide"><summary>Add context</summary><label>Summary <small>(optional)</small><textarea name="summary" rows={3} placeholder="Anything useful to know at this stage" /></label></details>
        <div className="wide form-actions"><button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create opportunity'}</button></div>
      </form>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </section>
    <section className="panel">
      <h2>Pipeline</h2>
      {loading ? <p>Loading opportunities…</p> : items.length === 0 ? <p>No opportunities yet. Create the first potential project above.</p> : <div className="opportunity-list">{items.map((item) => <article className="opportunity-card" key={item.id}><div><strong>{item.name}</strong><small>{item.location || 'Location unknown'}</small></div><span>{item.lifecycleState.replace('_',' ')}</span><p>{item.summary || 'No summary recorded yet.'}</p>{item.nextAction ? <small>Next: {item.nextAction}</small> : null}</article>)}</div>}
    </section>
  </div>;
}
