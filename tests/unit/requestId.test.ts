import { describe, expect, it } from 'vitest';
import { createRequestId } from '../../src/infrastructure/project-state/requestId';

describe('command request IDs', () => {
  it('uses secure random bytes when randomUUID is unavailable in HTTP previews', () => {
    const source = { getRandomValues: crypto.getRandomValues.bind(crypto) };
    const first = createRequestId(source);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(createRequestId(source)).not.toBe(first);
  });
  it('propagates entropy failures instead of issuing a weak ID', () => {
    expect(() => createRequestId({ getRandomValues: () => { throw new Error('No entropy'); } })).toThrow('No entropy');
  });
});
