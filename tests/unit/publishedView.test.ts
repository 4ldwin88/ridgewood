import { describe, expect, it } from 'vitest';
import { readPublishedView, revisionPayload, sitePublication } from '../../src/domain/documents/publishedView';

describe('published evidence', () => {
  it('never substitutes mutable source data for missing publication evidence', () => {
    expect(revisionPayload('published', { siteControl: 'Changed' }, null)).toEqual({});
    expect(revisionPayload('superseded', { siteControl: 'Changed' }, { siteControl: 'Original' })).toEqual({ siteControl: 'Original' });
    expect(revisionPayload('draft', { siteControl: 'Working' }, null)).toEqual({ siteControl: 'Working' });
  });
  it('preserves labels, order and project identity in the publication payload', () => {
    const original = { siteIdentity: 'Original site', siteControl: 'Owned' };
    const snapshot = structuredClone(sitePublication(original, 'Original project'));
    original.siteIdentity = 'New site';
    const view = readPublishedView(snapshot)!;
    expect(view.projectName).toBe('Original project');
    expect(view.fields[0]).toEqual({ key: 'siteIdentity', label: 'Site / location', value: 'Original site' });
  });
  it('does not reinterpret unsupported or malformed presentation metadata', () => {
    expect(readPublishedView({ _presentation: { version: 2, fields: [] } })).toBeNull();
    expect(readPublishedView({ _presentation: { version: 1, title: 'x', projectName: 'y', fields: [null] } })).toBeNull();
  });
});
