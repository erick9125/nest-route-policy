import { describe, expect, it } from 'vitest';
import { TenantEvaluator } from '../../src/core/evaluation/tenant-evaluator.js';
import { fakePrincipal } from '../../src/testing/fake-principal.js';

describe('TenantEvaluator', () => {
  const evaluator = new TenantEvaluator();

  it('allows when principal and resource share a tenant', () => {
    const result = evaluator.evaluate(fakePrincipal({ tenantId: 'tenant-a' }), {
      tenantId: 'tenant-a',
    });
    expect(result.allowed).toBe(true);
  });

  it('denies when tenants differ', () => {
    const result = evaluator.evaluate(fakePrincipal({ tenantId: 'tenant-a' }), {
      tenantId: 'tenant-b',
    });
    expect(result.allowed).toBe(false);
    expect(result.violation?.type).toBe('TENANT_MISMATCH');
  });

  it('denies when the principal has no tenant', () => {
    const result = evaluator.evaluate(fakePrincipal(), { tenantId: 'tenant-a' });
    expect(result.allowed).toBe(false);
  });

  it('denies when the resource has no tenant', () => {
    const result = evaluator.evaluate(fakePrincipal({ tenantId: 'tenant-a' }), {});
    expect(result.allowed).toBe(false);
  });
});
