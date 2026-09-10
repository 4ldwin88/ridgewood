export type PublishedField = { key: string; label: string; value: unknown };
export type PublishedView = { version: 1; title: string; projectName: string; fields: PublishedField[] };
export const SITE_FIELDS = [
  ['siteIdentity', 'Site / location'], ['siteControl', 'Site control'],
  ['planningStatus', 'Planning / zoning'], ['approvalStatus', 'Approvals'],
  ['constraints', 'Known constraints'], ['servicing', 'Servicing reviewed / available'],
  ['accessStatus', 'Site access'], ['dueDiligence', 'Due diligence completed'],
  ['overallReadiness', 'Overall development readiness (assessment only)'],
  ['notes', 'Exceptions / blockers / project-specific notes'],
] as const;

export function sitePublication(data: Record<string, unknown>, projectName: string): Record<string, unknown> {
  const fields = SITE_FIELDS.map(([key, label]) => ({ key, label, value: data[key] ?? null }));
  return { ...data, _presentation: { version: 1, title: 'Development & Site Review', projectName, fields } satisfies PublishedView };
}

export function readPublishedView(snapshot: Record<string, unknown>): PublishedView | null {
  const value = snapshot._presentation;
  if (!value || typeof value !== 'object') return null;
  const view = value as Partial<PublishedView>;
  if (view.version !== 1 || typeof view.title !== 'string' || typeof view.projectName !== 'string' || !Array.isArray(view.fields)) return null;
  if (!view.fields.every(field => field && typeof field.key === 'string' && typeof field.label === 'string' && Object.hasOwn(field, 'value'))) return null;
  return view as PublishedView;
}

export function revisionPayload(state: string, source: Record<string, unknown> | null, snapshot: Record<string, unknown> | null) {
  // Missing publication evidence must not fall back to an editable draft or current project facts.
  return state === 'draft' ? source ?? {} : snapshot ?? {};
}
