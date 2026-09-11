import { test, expect } from '@playwright/test';

test('drawer protects edits and displays immutable snapshot through revision workflow', async ({ page }) => {
  type Revision = { id: string; revision_number: number; state: string; source_data: Record<string, unknown>; published_source_snapshot: Record<string, unknown> | null; published_at: string | null; published_by: string | null; created_at: string; archived_at: null };
  const revisions: Revision[] = [];
  const record = { id: 'doc-1', title: 'Development & Site Review', document_type: 'predevelopment_development_site', category_key: 'development_site', package_key: 'predevelopment', updated_at: '2026-09-10T00:00:00Z', document_revisions: revisions };
  // No request in this fixture is allowed to reach a hosted Supabase project.
  await page.route('**/*.supabase.co/**', async route => {
    const request = route.request(); const url = request.url();
    const body = request.postDataJSON() ?? {};
    let result: unknown = [];
    if (url.includes('/document_records')) result = revisions.length ? [record] : [];
    else if (url.includes('/rpc/create_project_state_document_draft')) {
      revisions.push({ id: 'rev-1', revision_number: 1, state: 'draft', source_data: body.initial_data, published_source_snapshot: null, published_at: null, published_by: null, created_at: '2026-09-10T00:00:00Z', archived_at: null }); result = 'rev-1';
    } else if (url.includes('/rpc/update_project_state_document_draft')) {
      const revision = revisions.find(item => item.id === body.target_revision_id)!;
      if (revision.state !== 'draft') return route.fulfill({ status: 403, json: { message: 'not_draft' } });
      revision.source_data = body.source_data_input; result = null;
    } else if (url.includes('/rpc/publish_project_state_document_revision')) {
      const revision = revisions.find(item => item.id === body.target_revision_id)!;
      revisions.filter(item => item.state === 'published').forEach(item => { item.state = 'superseded'; });
      revision.state = 'published'; revision.published_source_snapshot = structuredClone(revision.source_data);
      revision.published_at = '2026-09-10T01:00:00Z'; revision.published_by = 'synthetic-actor'; result = null;
    } else if (url.includes('/rpc/create_project_state_document_revision')) {
      const source = revisions.find(item => item.id === body.target_published_revision_id)!;
      revisions.push({ ...source, id: 'rev-2', revision_number: 2, state: 'draft', source_data: structuredClone(source.published_source_snapshot!), published_source_snapshot: null, published_at: null, published_by: null }); result = 'rev-2';
    }
    await route.fulfill({ status: 200, json: result });
  });
  await page.goto('/tests/fixtures/forms/index.html');
  await page.getByRole('button', { name: 'Open site review' }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await page.getByRole('button', { name: 'Owned', exact: true }).click();
  page.once('dialog', dialog => dialog.dismiss());
  await page.keyboard.press('Escape');
  await expect(drawer).toBeVisible();
  await page.getByRole('button', { name: 'Conforming / permitted', exact: true }).click();
  await page.getByRole('group', { name: 'Approvals (Required)', exact: true }).getByRole('button', { name: 'Not assessed', exact: true }).click();
  await page.getByRole('button', { name: 'Suitable', exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();

  await expect(drawer).not.toBeVisible();
  await page.getByRole('button', { name: 'Open site review' }).click();
  await expect(page.getByRole('button', { name: /Owned/ })).toHaveAttribute('aria-pressed', 'true');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await page.getByRole('button', { name: 'Open site review' }).click();
  await expect(page.getByRole('article', { name: 'Published document revision 1' })).toBeVisible();
  await expect(drawer).toBeVisible();
  await expect(page.getByText('Project at publication: Synthetic project')).toBeVisible();
  await page.getByRole('button', { name: 'Create revision', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Client controlled', exact: true }).click();
  await page.getByRole('button', { name: 'Show revision history (1)' }).click();
  await page.getByRole('button', { name: 'View document', exact: true }).click();
  const document = page.getByRole('article', { name: 'Published document revision 1' });
  await expect(document.getByText('Owned', { exact: true })).toBeVisible();
  await expect(document.getByText('Client controlled', { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(drawer).toHaveCSS('width', '374px');
});
