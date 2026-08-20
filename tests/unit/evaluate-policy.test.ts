import { describe, expect, it } from 'vitest';
import { evaluatePolicy } from '../../src/testing/evaluate-policy.js';
import { fakePrincipal } from '../../src/testing/fake-principal.js';

describe('evaluatePolicy', () => {
  it('allows a principal that has the required scope', async () => {
    const result = await evaluatePolicy({
      policy: { scopes: ['invoice:read'] },
      principal: fakePrincipal({ scopes: ['invoice:read'] }),
    });
    expect(result.allowed).toBe(true);
  });

  it('denies a principal that lacks the required scope', async () => {
    const result = await evaluatePolicy({
      policy: { scopes: ['invoice:read'] },
      principal: fakePrincipal({ scopes: ['invoice:list'] }),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('missing_scope');
  });

  it('denies when no principal is given', async () => {
    const result = await evaluatePolicy({ policy: { scopes: ['invoice:read'] } });
    expect(result.reason).toBe('unauthenticated');
  });

  it('evaluates ownership against the given resource and attributes', async () => {
    const input = {
      policy: { resource: 'invoice', ownership: true },
      resource: { id: 'invoice-1' },
      resourceAttributes: { ownerId: 'user-1' },
    };

    const owner = await evaluatePolicy({ ...input, principal: fakePrincipal({ id: 'user-1' }) });
    expect(owner.allowed).toBe(true);

    const stranger = await evaluatePolicy({ ...input, principal: fakePrincipal({ id: 'user-2' }) });
    expect(stranger.reason).toBe('ownership_mismatch');
  });

  it('denies when the policy names a resource and none is given', async () => {
    const result = await evaluatePolicy({
      policy: { resource: 'invoice', tenant: true },
      principal: fakePrincipal({ tenantId: 'tenant-a' }),
    });
    expect(result.reason).toBe('resource_not_found');
  });

  it('registers the given handlers', async () => {
    const result = await evaluatePolicy({
      policy: { handlers: ['always.denies'] },
      principal: fakePrincipal(),
      handlers: [{ name: 'always.denies', evaluate: () => ({ allowed: false, reason: 'nope' }) }],
    });

    expect(result.reason).toBe('custom_policy_denied');
    expect(result.violations[0]?.message).toContain('nope');
  });

  it('applies the given defaults to the composed policy', async () => {
    const result = await evaluatePolicy({
      policy: { roles: ['admin', 'manager'] },
      principal: fakePrincipal({ roles: ['admin'] }),
      defaults: { roleMode: 'all' },
    });

    expect(result.reason).toBe('missing_role');
  });

  it('passes params, query, and body through to the context', async () => {
    const seen: Array<Record<string, unknown>> = [];

    const result = await evaluatePolicy({
      policy: { handlers: ['records.context'] },
      principal: fakePrincipal(),
      params: { id: 'invoice-1' },
      query: { include: 'lines' },
      body: { amount: 120 },
      handlers: [
        {
          name: 'records.context',
          evaluate: (context) => {
            seen.push({
              params: context.params,
              query: context.query,
              body: context.body,
            });
            return { allowed: true };
          },
        },
      ],
    });

    expect(result.allowed).toBe(true);
    expect(seen[0]).toEqual({
      params: { id: 'invoice-1' },
      query: { include: 'lines' },
      body: { amount: 120 },
    });
  });
});
