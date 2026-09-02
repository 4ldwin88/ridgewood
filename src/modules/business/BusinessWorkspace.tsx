import { FormEvent, useEffect, useState } from 'react';
import type { Opportunity } from '../../domain/opportunity/opportunity';
import { supabaseOpportunityRepository } from '../../infrastructure/opportunities/supabaseOpportunityRepository';
import { developmentObservability } from '../../infrastructure/observability/supabaseDevelopmentObservability';

const stages = ['Opportunity', 'Qualification', 'Predevelopment', 'Authorization', 'Project'];

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
    const form = new FormData(event.currentTarget);
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
      event.currentTarget.reset();
      void developmentObservability.capture({ eventName: 'command_succeeded', pagePath: '/business', metadata: { command: 'CreateOpportunity', opportunityId: created.id } });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Opportunity could not be created.';
      setError(message);
      void developmentObservability.capture({ eventName: 'command_rejected', pagePath: '/business', metadata: { command: 'CreateOpportunity', reason: message } });
    } finally { setCreating(false); }
  }

  return <div className="business-grid">
    <section className="panel">
      <div className="section-heading"><div><h2>Opportunity → Project</h2><p>Capture a potential project without pretending unknown information is complete.</p></div></div>
      <div className="stage-row">{stages.map((stage) => <span key={stage}>{stage}</span>)}</div>
      <form className="opportunity-form" onSubmit={create} onFocus={() => void developmentObservability.capture({eventName:'form_started',pagePath:'/business',metadata:{form:'CreateOpportunity'}})}>
        <label>Opportunity name<input name="name" required placeholder="e.g. Fairy Lake" /></label>
        <label>Site / location<input name="location" placeholder="Unknown is acceptable" /></label>
        <label>Sector<input name="sector" placeholder="Residential, mixed-use…" /></label>
        <label>Source<input name="source" placeholder="How did this opportunity originate?" /></label>
        <label className="wide">Summary<textarea name="summary" rows={3} placeholder="What is known so far?" /></label>
        <label className="wide">Next action<input name="nextAction" placeholder="What needs to happen next?" /></label>
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
