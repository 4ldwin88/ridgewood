import { useEffect, useMemo, useState } from 'react';
import type { ProjectState } from '../../domain/project-state/projectState';
import { projectStageLabel } from '../../domain/project-state/projectState';
import { supabaseProjectStateRepository } from '../../infrastructure/project-state/supabaseProjectStateRepository';
import { PredevelopmentFormsWorkspace } from '../business/PredevelopmentFormsWorkspace';

export function FormsWorkspace() {
  const [items, setItems] = useState<ProjectState[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabaseProjectStateRepository.list().then((next) => {
      if (!active) return;
      setItems(next);
      const eligible = next.find((item) => ['predevelopment', 'authorization', 'project_authorization_setup'].includes(item.stage));
      if (eligible) setSelectedId(eligible.id);
      setLoading(false);
    }).catch((caught: unknown) => {
      if (!active) return;
      setError(caught instanceof Error ? caught.message : 'Unable to load Project States for forms.');
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const selected = useMemo(() => items.find((item) => item.id === selectedId), [items, selectedId]);
  const formEligible = selected && ['predevelopment', 'authorization', 'project_authorization_setup'].includes(selected.stage);

  return <div className="business-grid">
    <section className="panel">
      <p className="eyebrow">Project State forms</p>
      <h2>Forms workspace</h2>
      <p>Forms are working records attached to the same durable Project State used by the business lifecycle.</p>
      {loading ? <p>Loading Project States…</p> : <label>Project State<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">Select a Project State</option>{items.map((item) => <option key={item.id} value={item.id}>{item.name} · {projectStageLabel(item.stage)}</option>)}</select></label>}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {selected ? <div className="guided-checklist"><article><strong>{selected.name}</strong><span>{selected.status === 'active' ? projectStageLabel(selected.stage) : selected.status}</span><small>Project State {selected.id}</small></article></div> : null}
      {selected && !formEligible ? <p className="guidance">Predevelopment forms activate after Qualification advances. The record remains visible here, but draft creation is disabled until then.</p> : null}
    </section>
    {selected && formEligible ? <PredevelopmentFormsWorkspace projectStateId={selected.id} disabled={selected.status !== 'active'} /> : <section className="panel"><h3>Development & Site Review</h3><p>Select a Project State in Predevelopment or later to work with its forms.</p></section>}
  </div>;
}
